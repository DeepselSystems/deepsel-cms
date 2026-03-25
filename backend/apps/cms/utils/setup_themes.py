"""Theme setup utility - handles cloning, syncing, reconciling, and building themes."""

import importlib.util
import json
import os
import shutil

import subprocess  # nosec B404
import time
import logging
import hashlib

from deepsel.utils.install_apps import import_csv_data
from apps.core.utils.models_pool import models_pool
from db import get_db_context
from .hash_utils import hash_file, hash_directory, hash_theme_files
from .state_utils import load_setup_state, save_setup_state
from .theme_imports import generate_theme_imports
from .theme_language import ensure_language_theme_exists
from .sync_utils import sync_directory
from platformdirs import user_data_dir
from traceback import print_exc

logger = logging.getLogger(__name__)

STATE_FILENAME = ".theme_state.json"

LOCAL_PACKAGES = os.getenv("LOCAL_PACKAGES", "").lower() in ("true", "1", "yes")


def setup_themes(force_build=False, force_sync=False):
    """
    Setup themes - idempotent function that can be called on server start or after file edits:
    1. Sync client and themes folders to data dir (only if source changed)
    2. If LOCAL_PACKAGES: also sync admin/, packages/, root workspace files,
       and build local packages (for development before packages are published)
    3. Reconcile files from DB (DB is source of truth for edited files)
    4. Run npm install (only if dependencies changed)
    5. Run npm build (only if inputs changed, or force_build=True)

    Args:
        force_build: If True, always run build regardless of hash checks
        force_sync: If True, force sync themes folder (used when language versions are deleted)
    """
    start_time = time.time()
    data_dir = user_data_dir("deepsel-cms", "deepsel")
    logger.info(
        f"Setting up themes with data dir {data_dir} "
        f"(LOCAL_PACKAGES={'on' if LOCAL_PACKAGES else 'off'})"
    )

    user_shell = os.environ.get("SHELL", "/bin/sh")

    def run_npm(cmd, cwd, timeout=300):
        """Run npm command through user's interactive shell to inherit PATH."""
        return subprocess.run(  # nosec B603
            [user_shell, "-i", "-c", cmd],
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

    try:
        client_path = "../client"
        client_build_path = os.path.join(data_dir, "client")

        state_path = os.path.join(data_dir, STATE_FILENAME)
        previous_state = load_setup_state(state_path)

        if not os.path.exists(client_path):
            logger.warning(
                f"Client path {client_path} does not exist, aborting theme setup"
            )
            return

        # Create client_build if it doesn't exist
        if not os.path.exists(client_build_path):
            logger.info(f"Creating {client_build_path} directory...")
            os.makedirs(client_build_path, exist_ok=True)

        # When not using local packages, replace the root package.json
        # with a minimal workspace config (client + themes only) and
        # clean up stale admin/packages directories
        if not LOCAL_PACKAGES:
            minimal_root = {
                "name": "deepsel-cms-build",
                "private": True,
                "workspaces": ["client", "themes/*"],
                "scripts": {
                    "build": "npm run build --workspace=client",
                },
            }
            root_pkg_path = os.path.join(data_dir, "package.json")
            with open(root_pkg_path, "w") as f:
                json.dump(minimal_root, f, indent=2)
            # Don't copy root package-lock.json — it references stale
            # admin/packages workspaces that would cause npm to recreate them
            stale_lock = os.path.join(data_dir, "package-lock.json")
            if os.path.exists(stale_lock):
                os.remove(stale_lock)
            for stale_dir in ("admin", "packages"):
                stale_path = os.path.join(data_dir, stale_dir)
                if os.path.exists(stale_path):
                    shutil.rmtree(stale_path)
                    logger.info(f"Removed stale workspace directory {stale_dir}")

        # Directories to exclude from sync
        EXCLUDE_DIRS = {"node_modules", "dist", ".astro", ".git", "tsconfig.json"}

        # Calculate hashes for core folders (always needed)
        package_lock_hash = hash_file(os.path.join(client_path, "package-lock.json"))
        themes_src = "../themes"
        themes_hash = hash_directory(themes_src)
        client_hash = hash_directory(client_path)

        need_themes_sync = (
            force_sync or previous_state.get("themes_hash") != themes_hash
        )
        need_client_sync = previous_state.get("client_hash") != client_hash

        # Hashes for local package development (only computed when needed)
        admin_hash = None
        packages_hash = None
        need_admin_sync = False
        need_packages_sync = False

        if LOCAL_PACKAGES:
            admin_src = "../admin"
            packages_src = "../packages"
            admin_hash = hash_directory(admin_src)
            packages_hash = hash_directory(packages_src)
            need_admin_sync = previous_state.get("admin_hash") != admin_hash
            need_packages_sync = previous_state.get("packages_hash") != packages_hash

        # Sync themes if changed
        if need_themes_sync and os.path.exists(themes_src):
            themes_dst = os.path.join(data_dir, "themes")
            os.makedirs(themes_dst, exist_ok=True)
            sync_directory(src=themes_src, dst=themes_dst, exclude_dirs=EXCLUDE_DIRS)
            logger.info("Themes folder changes synced successfully")
        else:
            logger.info("Themes folder unchanged; skipping sync")

        # Local packages: sync admin, root workspace files, and packages
        if LOCAL_PACKAGES:
            admin_src = "../admin"
            packages_src = "../packages"

            if need_admin_sync and os.path.exists(admin_src):
                admin_dst = os.path.join(data_dir, "admin")
                os.makedirs(admin_dst, exist_ok=True)
                sync_directory(src=admin_src, dst=admin_dst, exclude_dirs=EXCLUDE_DIRS)
                logger.info("Admin folder synced successfully")
            else:
                logger.info("Admin folder unchanged; skipping sync")

            # Sync root workspace files so npm workspaces resolve locally
            root_package_json = "../package.json"
            root_package_lock = "../package-lock.json"
            if os.path.exists(root_package_json):
                shutil.copy2(root_package_json, os.path.join(data_dir, "package.json"))
                logger.debug("Synced root package.json")
            if os.path.exists(root_package_lock):
                shutil.copy2(
                    root_package_lock, os.path.join(data_dir, "package-lock.json")
                )
                logger.debug("Synced root package-lock.json")

            # Sync and build packages if changed
            if need_packages_sync and os.path.exists(packages_src):
                logger.info("Packages folder changes detected; syncing...")
                packages_dst = os.path.join(data_dir, "packages")
                os.makedirs(packages_dst, exist_ok=True)
                sync_directory(
                    src=packages_src, dst=packages_dst, exclude_dirs=EXCLUDE_DIRS
                )
                logger.info("Packages folder synced successfully")

                # Install at workspace root so inter-package deps resolve locally
                logger.info("Running workspace npm install for packages...")
                install_result = run_npm("npm install", cwd=data_dir)
                if install_result.returncode != 0:
                    error_output = install_result.stdout + "\n" + install_result.stderr
                    logger.error(f"Workspace npm install failed: {error_output}")
                    raise RuntimeError(f"Workspace npm install failed: {error_output}")
                logger.info("Workspace npm install completed")

                # Build packages in dependency order
                packages_dst = os.path.join(data_dir, "packages")
                pkg_subfolders = [
                    sf
                    for sf in os.listdir(packages_dst)
                    if os.path.isdir(os.path.join(packages_dst, sf))
                    and os.path.exists(os.path.join(packages_dst, sf, "package.json"))
                ]
                pkg_names = set()
                for sf in pkg_subfolders:
                    pkg_json_path = os.path.join(packages_dst, sf, "package.json")
                    with open(pkg_json_path, "r") as f:
                        pkg_names.add(json.load(f).get("name", ""))

                def _local_dep_count(sf):
                    """Count how many sibling packages this package depends on."""
                    pkg_json_path = os.path.join(packages_dst, sf, "package.json")
                    with open(pkg_json_path, "r") as f:
                        pkg = json.load(f)
                    all_deps = {
                        **pkg.get("dependencies", {}),
                        **pkg.get("devDependencies", {}),
                    }
                    return sum(1 for d in all_deps if d in pkg_names)

                pkg_subfolders.sort(key=_local_dep_count)

                for subfolder in pkg_subfolders:
                    subfolder_path = os.path.join(packages_dst, subfolder)
                    build_result = run_npm("npm run build", cwd=subfolder_path)
                    if build_result.returncode != 0:
                        error_output = build_result.stdout + "\n" + build_result.stderr
                        logger.error(
                            f"npm run build failed in {subfolder}: {error_output}"
                        )
                        raise RuntimeError(
                            f"npm run build failed in {subfolder}: {error_output}"
                        )
                    logger.info(f"npm run build completed in {subfolder}")
            else:
                logger.info("Packages folder unchanged; skipping sync")

        # Sync client folder
        if need_client_sync:
            sync_directory(
                src=client_path, dst=client_build_path, exclude_dirs=EXCLUDE_DIRS
            )
            logger.info("Client folder synced successfully")
        else:
            logger.info("Client folder unchanged; skipping sync")

        # Reconcile files from DB (DB is source of truth for edited files)
        with get_db_context() as db:
            ThemeFileModel = models_pool.get("theme_file")
            theme_files = db.query(ThemeFileModel).all()
            db_hash = None

            if theme_files:
                db_hash = hash_theme_files(theme_files)
                need_db_sync = (
                    need_themes_sync or previous_state.get("db_hash") != db_hash
                )

                if need_db_sync:
                    reconciled_count = 0

                    for theme_file in theme_files:
                        for content in theme_file.contents:
                            if not content.content:
                                continue

                            if content.lang_code:
                                ensure_language_theme_exists(
                                    lang_code=content.lang_code,
                                    theme_name=theme_file.theme_name,
                                    data_dir_path=data_dir,
                                )
                                file_path = os.path.join(
                                    data_dir,
                                    "themes",
                                    content.lang_code,
                                    theme_file.theme_name,
                                    theme_file.file_path,
                                )
                            else:
                                file_path = os.path.join(
                                    data_dir,
                                    "themes",
                                    theme_file.theme_name,
                                    theme_file.file_path,
                                )

                            os.makedirs(os.path.dirname(file_path), exist_ok=True)

                            with open(file_path, "w", encoding="utf-8") as f:
                                f.write(content.content)

                            reconciled_count += 1

                    logger.info(
                        f"Reconciled {reconciled_count} theme files from database"
                    )
                else:
                    logger.info("Theme edits unchanged; skipping reconciliation")
            else:
                logger.info("No theme edits in database to reconcile")

        # Generate theme imports for client_build (after sync and reconciliation)
        generate_theme_imports(data_dir_path=data_dir)

        # Determine if npm install is needed
        node_modules_path = os.path.join(data_dir, "node_modules")
        need_install = (
            not os.path.exists(node_modules_path)
            or previous_state.get("package_lock_hash") != package_lock_hash
            or need_themes_sync
        )

        # Compute composite build inputs hash
        build_inputs_hasher = hashlib.sha256()
        for value in (
            themes_hash,
            admin_hash,
            client_hash,
            db_hash,
            package_lock_hash,
        ):
            build_inputs_hasher.update((value or "none").encode("utf-8"))
        build_inputs_hash = build_inputs_hasher.hexdigest()

        dist_path = os.path.join(client_build_path, "dist")
        need_build = (
            force_build
            or need_themes_sync
            or need_client_sync
            or need_install
            or previous_state.get("build_inputs_hash") != build_inputs_hash
            or not os.path.exists(dist_path)
        )
        if LOCAL_PACKAGES:
            need_build = need_build or need_admin_sync or need_packages_sync

        # Run npm install (always at workspace root for hoisted node_modules)
        if need_install:
            logger.info("Running npm install...")
            install_result = run_npm("npm install", cwd=data_dir)

            if install_result.returncode != 0:
                error_output = install_result.stdout + "\n" + install_result.stderr
                logger.error(f"npm install failed: {error_output}")
                raise RuntimeError(
                    f"npm install failed with exit code {install_result.returncode}: {error_output}"
                )
            else:
                logger.info("npm install completed successfully")
        else:
            logger.info("Dependencies unchanged; skipping npm install")

        # Run npm build
        if need_build:
            logger.info("Running client build...")
            build_result = run_npm("npm run build", cwd=data_dir, timeout=600)

            if build_result.returncode != 0:
                error_output = build_result.stdout + "\n" + build_result.stderr
                logger.error(f"Client build failed: {error_output}")
                raise RuntimeError(
                    f"npm build failed with exit code {build_result.returncode}: {error_output}"
                )
            else:
                logger.info("Client build completed successfully")
        else:
            logger.info("Build artifacts up to date; skipping client build")

        state_payload = {
            "themes_hash": themes_hash,
            "client_hash": client_hash,
            "db_hash": db_hash,
            "package_lock_hash": package_lock_hash,
            "build_inputs_hash": build_inputs_hash,
        }
        if LOCAL_PACKAGES:
            state_payload["admin_hash"] = admin_hash
            state_payload["packages_hash"] = packages_hash

        save_setup_state(state_path, state_payload)

        logger.info(f"Theme setup completed in {time.time() - start_time:.2f} seconds")

    except subprocess.TimeoutExpired as e:
        logger.error(f"Theme setup timed out: {e}")
        raise RuntimeError(f"Theme setup timed out after {e.timeout} seconds") from e
    except Exception as e:
        logger.error(f"Error during theme setup: {e}")
        print_exc()
        raise


def load_theme_seed_data():
    """Load CSV seed data from theme data/ directories."""
    themes_dir = "../themes"
    if not os.path.exists(themes_dir):
        return

    with get_db_context() as db:
        for theme_name in sorted(os.listdir(themes_dir)):
            data_dir = os.path.join(themes_dir, theme_name, "data")
            if not os.path.isdir(data_dir):
                continue

            # Determine import order
            init_path = os.path.join(data_dir, "__init__.py")
            if os.path.exists(init_path):
                spec = importlib.util.spec_from_file_location(
                    f"theme_data_{theme_name}", init_path
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                import_order = getattr(module, "import_order", [])
            else:
                import_order = sorted(
                    f for f in os.listdir(data_dir) if f.endswith(".csv")
                )

            for csv_file in import_order:
                csv_path = os.path.join(data_dir, csv_file)
                if os.path.exists(csv_path):
                    try:
                        import_csv_data(csv_path, db)
                    except Exception as e:
                        logger.error(f"Failed to load {csv_file} for {theme_name}: {e}")

            logger.info(f"Loaded seed data for theme {theme_name}")
