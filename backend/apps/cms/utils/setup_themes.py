"""Theme setup utility - handles cloning, syncing, reconciling, and building themes."""

import os
import shutil
import subprocess
import time
import logging
import hashlib
from deepsel.utils.models_pool import models_pool
from db import get_db_context
from .hash_utils import hash_file, hash_directory, hash_theme_files
from .state_utils import load_setup_state, save_setup_state
from .theme_imports import generate_theme_imports
from .theme_language import ensure_language_theme_exists
from .sync_utils import sync_directory
from platformdirs import user_data_dir
from traceback import print_exc
from constants import ENVIRONMENT

logger = logging.getLogger(__name__)

SOURCE_HASH_IGNORES = {"node_modules", "dist", ".astro", ".git"}
STATE_FILENAME = ".theme_state.json"


def setup_themes(force_build=False, force_sync=False):
    """
    Setup themes - idempotent function that can be called on server start or after file edits:
    0. Generate theme imports in [...slug].astro
    1. Sync client folder to client_build (only if source changed)
    2. Reconcile files from DB (DB is source of truth for edited files)
    3. Run npm install (only if dependencies changed)
    4. Run npm build (only if inputs changed, or force_build=True)

    Args:
        force_build: If True, always run build regardless of hash checks
        force_sync: If True, force sync themes folder (used when language versions are deleted)
    """
    start_time = time.time()
    logger.info("Setting up themes...")
    data_dir = user_data_dir("deepsel-cms", "deepsel")
    logger.info(f"Data dir: {data_dir}")

    user_shell = os.environ.get("SHELL", "/bin/sh")

    def run_npm(cmd, cwd, timeout=300):
        """Run npm command through user's interactive shell to inherit PATH."""
        return subprocess.run(
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

        # Directories to exclude from sync
        EXCLUDE_DIRS = {"node_modules", "dist", ".astro", ".git"}

        # Step 1: Calculate hashes for each major folder independently
        package_lock_hash = hash_file(os.path.join(client_path, "package-lock.json"))

        # Hash individual folders
        themes_src = "../themes"
        admin_src = "../admin"

        themes_hash = (
            hash_directory(path=themes_src, ignored_dirs=SOURCE_HASH_IGNORES)
            if os.path.exists(themes_src)
            else None
        )
        admin_hash = (
            hash_directory(path=admin_src, ignored_dirs=SOURCE_HASH_IGNORES)
            if os.path.exists(admin_src)
            else None
        )

        # Hash client folder
        client_hash = hash_directory(path=client_path, ignored_dirs=SOURCE_HASH_IGNORES)

        # Check what needs syncing
        need_themes_sync = (
            force_sync or previous_state.get("themes_hash") != themes_hash
        )
        need_admin_sync = previous_state.get("admin_hash") != admin_hash
        need_client_sync = previous_state.get("client_hash") != client_hash

        # Sync only changed folders
        if need_themes_sync and os.path.exists(themes_src):
            themes_dst = os.path.join(data_dir, "themes")
            os.makedirs(themes_dst, exist_ok=True)
            sync_directory(src=themes_src, dst=themes_dst, exclude_dirs=EXCLUDE_DIRS)
            logger.info("Themes folder synced successfully")
        else:
            logger.info("Themes folder unchanged; skipping sync")

        if need_admin_sync and os.path.exists(admin_src):
            admin_dst = os.path.join(data_dir, "admin")
            os.makedirs(admin_dst, exist_ok=True)
            sync_directory(src=admin_src, dst=admin_dst, exclude_dirs=EXCLUDE_DIRS)
            logger.info("Admin folder synced successfully")
        else:
            logger.info("Admin folder unchanged; skipping sync")

        # Sync root package.json and package-lock.json
        root_package_json = "../package.json"
        root_package_lock = "../package-lock.json"
        if os.path.exists(root_package_json):
            shutil.copy2(root_package_json, os.path.join(data_dir, "package.json"))
            logger.debug("Synced root package.json")
        if os.path.exists(root_package_lock):
            shutil.copy2(root_package_lock, os.path.join(data_dir, "package-lock.json"))
            logger.debug("Synced root package-lock.json")

        # Sync packages folder (dev only)
        if ENVIRONMENT == "dev":
            packages_src = "../packages"
            packages_hash = (
                hash_directory(path=packages_src, ignored_dirs=SOURCE_HASH_IGNORES)
                if os.path.exists(packages_src)
                else None
            )
            need_packages_sync = previous_state.get("packages_hash") != packages_hash

            if need_packages_sync and os.path.exists(packages_src):
                packages_dst = os.path.join(data_dir, "packages")
                os.makedirs(packages_dst, exist_ok=True)
                sync_directory(
                    src=packages_src, dst=packages_dst, exclude_dirs=EXCLUDE_DIRS
                )
                logger.info("Packages folder synced successfully")

                # Run npm ci and npm run build in each package subfolder
                for subfolder in os.listdir(packages_dst):
                    subfolder_path = os.path.join(packages_dst, subfolder)
                    if os.path.isdir(subfolder_path) and os.path.exists(
                        os.path.join(subfolder_path, "package.json")
                    ):
                        install_result = run_npm("npm install", cwd=subfolder_path)
                        if install_result.returncode != 0:
                            logger.error(
                                f"npm install failed in {subfolder}: {install_result.stderr}"
                            )
                            raise RuntimeError(
                                f"npm install failed in {subfolder}: {install_result.stderr}"
                            )
                        logger.info(f"npm install completed in {subfolder}")

                        build_result = run_npm("npm run build", cwd=subfolder_path)
                        if build_result.returncode != 0:
                            logger.error(
                                f"npm run build failed in {subfolder}: {build_result.stderr}"
                            )
                            raise RuntimeError(
                                f"npm run build failed in {subfolder}: {build_result.stderr}"
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

        # Step 2: Reconcile files from DB using SQLAlchemy models (only if themes changed)
        db_hash = "no_data"
        need_db_sync = need_themes_sync

        with get_db_context() as db:
            ThemeFileModel = models_pool.get("theme_file")
            # Query all theme files with their contents
            theme_files = db.query(ThemeFileModel).all()

            if theme_files:
                # Calculate hash from database models
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

                            # Determine file path based on language
                            if content.lang_code:
                                # Language version: ensure theme folder exists first
                                ensure_language_theme_exists(
                                    content.lang_code,
                                    theme_file.theme_name,
                                    client_build_path,
                                )
                                file_path = os.path.join(
                                    client_build_path,
                                    "themes",
                                    content.lang_code,
                                    theme_file.theme_name,
                                    theme_file.file_path,
                                )
                            else:
                                # Default version: client_build/themes/{theme}/...
                                file_path = os.path.join(
                                    client_build_path,
                                    "themes",
                                    theme_file.theme_name,
                                    theme_file.file_path,
                                )

                            # Ensure directory exists
                            os.makedirs(os.path.dirname(file_path), exist_ok=True)

                            # Write content from DB (DB is source of truth)
                            with open(file_path, "w", encoding="utf-8") as f:
                                f.write(content.content)

                            reconciled_count += 1

                    logger.info(
                        f"Reconciled {reconciled_count} theme files from database"
                    )
                else:
                    logger.info("Theme files unchanged; skipping reconciliation")
            else:
                logger.info("No theme files in database to reconcile")

        # Step 2.5: Generate theme imports for client_build (after cloning and reconciliation)
        generate_theme_imports(data_dir_path=data_dir)

        node_modules_path = os.path.join(client_build_path, "node_modules")
        need_install = (
            not os.path.exists(node_modules_path)
            or previous_state.get("package_lock_hash") != package_lock_hash
        )

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
            or need_admin_sync
            or need_client_sync
            or need_install
            or previous_state.get("build_inputs_hash") != build_inputs_hash
            or not os.path.exists(dist_path)
        )

        # Step 3: Run npm install and npm build
        if need_install:
            logger.info("Running npm install...")
            install_result = run_npm("npm install", cwd=data_dir)

            if install_result.returncode != 0:
                logger.error(f"npm install failed: {install_result.stderr}")
                raise RuntimeError(
                    f"npm install failed with exit code {install_result.returncode}: {install_result.stderr}"
                )
            else:
                logger.info("npm install completed successfully")
        else:
            logger.info("Dependencies unchanged; skipping npm install")

        if need_build:
            # Build main project
            logger.info("Running client build...")
            build_result = run_npm("npm run build", cwd=data_dir, timeout=600)

            if build_result.returncode != 0:
                logger.error(f"Client build failed: {build_result.stderr}")
                raise RuntimeError(
                    f"npm build failed with exit code {build_result.returncode}: {build_result.stderr}"
                )
            else:
                logger.info("Client build completed successfully")
        else:
            logger.info("Build artifacts up to date; skipping npm build steps")

        state_payload = {
            "themes_hash": themes_hash,
            "admin_hash": admin_hash,
            "client_hash": client_hash,
            "db_hash": db_hash,
            "package_lock_hash": package_lock_hash,
            "build_inputs_hash": build_inputs_hash,
        }
        if ENVIRONMENT == "dev":
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
