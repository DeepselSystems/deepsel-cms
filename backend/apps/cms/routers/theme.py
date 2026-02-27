import logging
import os
import json
from typing import List, Optional
from fastapi import Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from platformdirs import user_data_dir
from db import get_db
from apps.deepsel.utils.get_current_user import get_current_user
from apps.deepsel.models.user import UserModel
from apps.deepsel.utils.models_pool import models_pool
from apps.deepsel.utils.api_router import create_api_router

logger = logging.getLogger(__name__)

STATE_FILENAME = ".theme_state.json"

router = create_api_router("theme", tags=["Theme"])


def get_themes_dir() -> str:
    """Return the themes directory path, using data_dir if available, else source."""
    data_dir = user_data_dir("deepsel-cms", "deepsel")
    data_themes = os.path.join(data_dir, "themes")
    if os.path.exists(data_themes):
        return data_themes
    return "../themes"


class ThemeInfo(BaseModel):
    """Schema for theme information"""

    name: str
    version: str
    folder_name: str
    description: Optional[str] = None
    image_url: Optional[str] = None


class SelectThemeRequest(BaseModel):
    """Schema for selecting a theme"""

    folder_name: str


class ThemeFileNode(BaseModel):
    """Schema for file tree node"""

    name: str
    path: str
    is_directory: bool
    children: Optional[List["ThemeFileNode"]] = None


class ThemeFileContentSchema(BaseModel):
    """Schema for theme file content"""

    id: Optional[int] = None
    content: str
    lang_code: Optional[str] = None
    locale_id: Optional[int] = None


class SaveThemeFileRequest(BaseModel):
    """Schema for saving theme file"""

    theme_name: str
    file_path: str
    contents: List[ThemeFileContentSchema]


def check_website_admin_role(current_user: UserModel = Depends(get_current_user)):
    """Check if user has website_admin_role"""
    user_roles = current_user.get_user_roles()

    has_permission = any(
        role.string_id in ["admin_role", "super_admin_role", "website_admin_role"]
        for role in user_roles
    )

    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only website admins can access themes",
        )

    return current_user


@router.get("/list", response_model=List[ThemeInfo])
def list_themes(current_user: UserModel = Depends(check_website_admin_role)):
    """
    List all available themes from the themes directory.
    Reads name and version from each theme's package.json.
    """
    themes = []
    themes_dir = get_themes_dir()

    try:
        if not os.path.exists(themes_dir):
            logger.warning(f"Themes directory not found: {themes_dir}")
            return themes

        # List all directories in themes folder
        for folder_name in os.listdir(themes_dir):
            folder_path = os.path.join(themes_dir, folder_name)

            # Skip if not a directory
            if not os.path.isdir(folder_path):
                continue

            # Look for package.json
            package_json_path = os.path.join(folder_path, "package.json")

            if os.path.exists(package_json_path):
                try:
                    with open(package_json_path, "r", encoding="utf-8") as f:
                        package_data = json.load(f)

                    # Read optional theme.json manifest for display metadata
                    description = None
                    image_url = None
                    theme_json_path = os.path.join(folder_path, "theme.json")
                    if os.path.exists(theme_json_path):
                        try:
                            with open(theme_json_path, "r", encoding="utf-8") as f:
                                theme_manifest = json.load(f)
                            description = theme_manifest.get("description")
                            image_filename = theme_manifest.get("image")
                            if image_filename and os.path.exists(
                                os.path.join(folder_path, image_filename)
                            ):
                                image_url = f"/theme/preview/{folder_name}/{image_filename}"
                        except Exception as e:
                            logger.warning(
                                f"Failed to parse theme.json in {folder_name}: {e}"
                            )

                    theme_info = ThemeInfo(
                        name=package_data.get("name", folder_name),
                        version=package_data.get("version", "unknown"),
                        folder_name=folder_name,
                        description=description,
                        image_url=image_url,
                    )
                    themes.append(theme_info)

                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse package.json in {folder_name}: {e}")
                except Exception as e:
                    logger.error(f"Error reading theme {folder_name}: {e}")

        return themes

    except Exception as e:
        logger.error(f"Error listing themes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list themes: {str(e)}",
        )


@router.get("/preview/{theme_name}/{image_filename:path}")
def get_theme_preview_image(theme_name: str, image_filename: str):
    """
    Serve a theme preview image from the theme directory.
    This endpoint is public so the dashboard can display theme images without auth.
    """
    themes_dir = get_themes_dir()
    image_path = os.path.join(themes_dir, theme_name, image_filename)

    if not os.path.exists(image_path) or not os.path.isfile(image_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preview image not found for theme '{theme_name}'",
        )

    return FileResponse(image_path)


@router.post("/select")
def select_theme(
    request: SelectThemeRequest,
    current_user: UserModel = Depends(check_website_admin_role),
    db: Session = Depends(get_db),
):
    """
    Select a theme for the organization.
    Updates the selected_theme field in CMSSettingsModel.
    """
    try:
        # Verify theme exists
        theme_path = os.path.join(get_themes_dir(), request.folder_name)
        if not os.path.exists(theme_path) or not os.path.isdir(theme_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Theme '{request.folder_name}' not found",
            )

        # Get organization from user
        organization_id = current_user.organization_id
        if not organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has no organization",
            )

        # Get CMSSettingsModel
        CMSSettingsModel = models_pool.get("organization")
        organization = (
            db.query(CMSSettingsModel)
            .filter(CMSSettingsModel.id == organization_id)
            .first()
        )

        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )

        # Update selected theme
        organization.selected_theme = request.folder_name
        db.commit()

        logger.info(
            f"User {current_user.username} selected theme '{request.folder_name}' "
            f"for organization {organization_id}"
        )

        return {
            "success": True,
            "message": f"Theme '{request.folder_name}' selected successfully",
            "selected_theme": request.folder_name,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error selecting theme: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to select theme: {str(e)}",
        )


def build_file_tree(directory_path: str, base_path: str = "") -> List[ThemeFileNode]:
    """Recursively build file tree structure"""
    nodes = []

    try:
        items = sorted(os.listdir(directory_path))

        for item in items:
            # Skip node_modules and hidden files
            if item.startswith(".") or item == "node_modules":
                continue

            item_path = os.path.join(directory_path, item)
            relative_path = os.path.join(base_path, item) if base_path else item

            if os.path.isdir(item_path):
                # Recursively get children for directories
                children = build_file_tree(item_path, relative_path)
                nodes.append(
                    ThemeFileNode(
                        name=item,
                        path=relative_path,
                        is_directory=True,
                        children=children,
                    )
                )
            else:
                nodes.append(
                    ThemeFileNode(name=item, path=relative_path, is_directory=False)
                )

    except Exception as e:
        logger.error(f"Error building file tree for {directory_path}: {e}")

    return nodes


@router.get("/files/{theme_name}", response_model=List[ThemeFileNode])
def list_theme_files(
    theme_name: str, current_user: UserModel = Depends(check_website_admin_role)
):
    """
    List all files in a theme as a tree structure
    """
    theme_path = os.path.join(get_themes_dir(), theme_name)

    if not os.path.exists(theme_path) or not os.path.isdir(theme_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Theme '{theme_name}' not found",
        )

    return build_file_tree(theme_path)


@router.get("/file/{theme_name}/{file_path:path}")
def get_theme_file(
    theme_name: str,
    file_path: str,
    current_user: UserModel = Depends(check_website_admin_role),
    db: Session = Depends(get_db),
):
    """
    Get a theme file content. Returns both filesystem content and any saved DB versions.
    """
    try:
        ThemeFileModel = models_pool.get("theme_file")

        # Read default file from filesystem
        full_path = os.path.join(get_themes_dir(), theme_name, file_path)

        if not os.path.exists(full_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: {file_path}",
            )

        with open(full_path, "r", encoding="utf-8") as f:
            default_content = f.read()

        # Check if file has DB records
        theme_file = (
            db.query(ThemeFileModel)
            .filter(
                ThemeFileModel.theme_name == theme_name,
                ThemeFileModel.file_path == file_path,
            )
            .first()
        )

        contents = []

        if theme_file:
            # Return DB contents
            for content in theme_file.contents:
                contents.append(
                    {
                        "id": content.id,
                        "content": content.content,
                        "lang_code": content.lang_code,
                        "locale_id": content.locale_id,
                        "locale": (
                            {
                                "id": content.locale.id,
                                "name": content.locale.name,
                                "iso_code": content.locale.iso_code,
                                "emoji_flag": content.locale.emoji_flag,
                            }
                            if content.locale
                            else None
                        ),
                    }
                )
        else:
            # Return filesystem content as default
            contents.append(
                {
                    "id": None,
                    "content": default_content,
                    "lang_code": None,
                    "locale_id": None,
                    "locale": None,
                }
            )

        return {"theme_name": theme_name, "file_path": file_path, "contents": contents}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting theme file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get theme file: {str(e)}",
        )


def trigger_setup_themes(force_sync=False):
    """
    Background task to run full theme setup (idempotent)

    Args:
        force_sync: If True, force sync themes folder to restore original files
    """
    try:
        from apps.cms.utils.setup_themes import setup_themes

        logger.info("Running theme setup after file save...")
        setup_themes(force_build=True, force_sync=force_sync)
        logger.info("Theme setup completed successfully")
    except Exception as e:
        logger.error(f"Error during theme setup: {e}")


@router.post("/file/save")
def save_theme_file(
    request: SaveThemeFileRequest,
    background_tasks: BackgroundTasks,
    current_user: UserModel = Depends(check_website_admin_role),
    db: Session = Depends(get_db),
):
    """
    Save theme file content. Saves to filesystem and DB.
    For language versions, creates lang folder if needed.
    """
    try:
        ThemeFileModel = models_pool.get("theme_file")
        ThemeFileContentModel = models_pool.get("theme_file_content")

        # Get or create theme file record
        theme_file = (
            db.query(ThemeFileModel)
            .filter(
                ThemeFileModel.theme_name == request.theme_name,
                ThemeFileModel.file_path == request.file_path,
            )
            .first()
        )

        if not theme_file:
            theme_file = ThemeFileModel(
                theme_name=request.theme_name,
                file_path=request.file_path,
                organization_id=current_user.organization_id,
            )
            db.add(theme_file)
            db.flush()

        # Get existing content IDs from DB
        existing_contents = (
            db.query(ThemeFileContentModel)
            .filter(ThemeFileContentModel.theme_file_id == theme_file.id)
            .all()
        )
        existing_ids = {content.id for content in existing_contents}

        # Get content IDs from request (excluding new ones)
        request_ids = {
            content_data.id
            for content_data in request.contents
            if content_data.id is not None
        }

        # Delete contents that are in DB but not in request
        ids_to_delete = existing_ids - request_ids
        has_deletions = len(ids_to_delete) > 0
        if has_deletions:
            db.query(ThemeFileContentModel).filter(
                ThemeFileContentModel.id.in_(ids_to_delete)
            ).delete(synchronize_session=False)
            logger.info(f"Deleted {len(ids_to_delete)} removed language versions")

        # Process each content version (DB remains source of truth; filesystem is updated during setup_themes)
        for content_data in request.contents:
            lang_code = content_data.lang_code

            # Save to DB only; setup_themes will reconcile filesystem copies
            if content_data.id:
                # Update existing
                db_content = (
                    db.query(ThemeFileContentModel)
                    .filter(ThemeFileContentModel.id == content_data.id)
                    .first()
                )
                if db_content:
                    db_content.content = content_data.content
                    db_content.lang_code = lang_code
                    db_content.locale_id = content_data.locale_id
            else:
                # Create new
                db_content = ThemeFileContentModel(
                    content=content_data.content,
                    lang_code=lang_code,
                    locale_id=content_data.locale_id,
                    theme_file_id=theme_file.id,
                    organization_id=current_user.organization_id,
                )
                db.add(db_content)

        db.commit()

        # Trigger full theme setup in background (idempotent)
        # If deletions occurred, force sync themes to restore original files
        # This will: generate imports, reconcile DB, install deps if needed, and build
        if has_deletions:
            background_tasks.add_task(trigger_setup_themes, force_sync=True)
        else:
            background_tasks.add_task(trigger_setup_themes)

        logger.info(f"Saved theme file: {request.theme_name}/{request.file_path}")

        return {
            "success": True,
            "message": "Theme file saved successfully. Build started in background.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving theme file: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save theme file: {str(e)}",
        )
