from typing import Optional
import logging
import csv
import json
import io
import zipfile
import tempfile
import shutil
import os
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from db import get_db
from apps.deepsel.utils.get_current_user import get_current_user
from apps.deepsel.utils.models_pool import models_pool
from apps.deepsel.utils.check_delete_cascade import (
    get_delete_cascade_records_recursively,
)
from apps.deepsel.utils.get_class_info import get_class_info
from apps.deepsel.utils.install_apps import import_csv_data
from apps.deepsel.utils.api_router import create_api_router

logger = logging.getLogger(__name__)

router = create_api_router("util", tags=["Utilities"])
OrganizationModel = models_pool["organization"]
UserModel = models_pool["user"]

# Import CMS-specific models and utilities for domain detection
try:
    from apps.cms.models.organization import CMSSettingsModel
    from apps.cms.utils.domain_detection import detect_domain_from_request

    HAS_CMS = True
except ImportError:
    HAS_CMS = False

    # Fallback function if CMS is not available
    def detect_domain_from_request(request):
        """Extract host from request headers"""
        host = request.headers.get("host", "")
        return host.split(":")[0] if host else ""


class DeleteCheckResponse(BaseModel):
    to_delete: dict[str, list[str]]
    to_set_null: dict[str, list[str]]


@router.get("/delete_check/{model}/{ids}", response_model=DeleteCheckResponse)
def delete_check(
    model: str,  # table name
    ids: str,  # comma separated list of ids
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    if model == "xray":
        model = "tracking_session"
    elif model == "xray_event":
        model = "tracking_event"

    ids = ids.split(",")

    Model = models_pool.get(model, None)
    if Model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Model not found"
        )

    records = db.query(Model).filter(Model.id.in_(ids)).all()
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Record not found"
        )

    affected_records = get_delete_cascade_records_recursively(db, records)

    return {
        "to_delete": {
            k: [str(row.record) for row in v]
            for k, v in affected_records.to_delete.items()
        },
        "to_set_null": {
            k: [str(row.record) for row in v]
            for k, v in affected_records.to_set_null.items()
        },
    }


class HealthResponse(BaseModel):
    status: str = "ok"


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok")


@router.get("/model_info/{model}", response_model=dict)
def model_info(
    model: str,  # table name
    user: UserModel = Depends(get_current_user),
):
    # check if user has Admin or Super Admin role
    if not any(
        role.string_id in ["admin_role", "super_admin_role"] for role in user.roles
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this information",
        )

    Model = models_pool.get(model, None)
    if Model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Model not found"
        )

    return get_class_info(Model).model_dump()


# New route without organization_id - uses domain detection
@router.get("/public_settings")
def get_public_settings_by_domain(
    request: Request,
    lang: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get public settings for organization detected by domain"""
    # Detect organization by domain using centralized utility
    domain = detect_domain_from_request(request)

    # logger.info(f"/public_settings detect domain: {domain}")
    # Use CMS-specific domain detection if available, otherwise fallback to basic logic
    if HAS_CMS:
        org_settings = CMSSettingsModel.find_organization_by_domain(domain, db)
        # if org_settings:
        #     logger.info(
        #         f"/public_settings found org: {org_settings.id} (name: {org_settings.name}) with domains: {getattr(org_settings, 'domains', [])}"
        #     )
        if not org_settings:
            logger.error("No organizations found via CMS domain detection!")
            raise HTTPException(status_code=404, detail="No organizations configured")
    else:
        # Fallback logic for basic organization detection
        organizations = db.query(OrganizationModel).all()
        org_settings = None

        logger.info(f"Found {len(organizations)} organizations total")

        # First try exact domain match
        for org in organizations:
            logger.info(
                f"Org ID {org.id}: domains={getattr(org, 'domains', None)}, name='{getattr(org, 'name', 'Unknown')}'"
            )
            if hasattr(org, "domains") and org.domains and domain in org.domains:
                logger.info(
                    f"EXACT MATCH: Found organization {org.id} for domain '{domain}'"
                )
                org_settings = org
                break

        # Fallback to wildcard organization
        if not org_settings:
            for org in organizations:
                if hasattr(org, "domains") and org.domains and "*" in org.domains:
                    logger.info(
                        f"WILDCARD MATCH: Using organization {org.id} with wildcard domain"
                    )
                    org_settings = org
                    break

        # Final fallback - get first organization
        if not org_settings:
            org_settings = organizations[0] if organizations else None
            if org_settings:
                logger.info(
                    f"DEFAULT FALLBACK: Using first organization {org_settings.id}"
                )
            else:
                logger.error("No organizations found in database!")
                raise HTTPException(
                    status_code=404, detail="No organizations configured"
                )
    # Use CMS model for public settings if available, as it has extended functionality
    if HAS_CMS:
        return CMSSettingsModel.get_public_settings(org_settings.id, db, lang=lang)
    else:
        return OrganizationModel.get_public_settings(org_settings.id, db, lang=lang)


# Keep existing route for backward compatibility
@router.get("/public_settings/{organization_id}")
def get_public_settings(
    organization_id: int,
    lang: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return OrganizationModel.get_public_settings(organization_id, db, lang=lang)


@router.get("/backup/export")
def export_backup(
    organization_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Export backup for the specified organization.
    Returns a ZIP file containing CSVs for Pages, Blog Posts, Menus, Attachments and the attachment files.
    """
    # Check permission (admin only)
    if not any(
        role.string_id in ["admin_role", "super_admin_role"] for role in user.roles
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to export backup",
        )

    # Validate organization access
    allowed_org_ids = user.get_org_ids()
    if organization_id not in allowed_org_ids:
        # Check if super admin, they might access any org?
        # The user request said "also have to check permission for user to this org".
        # Usually super_admin has access to everything.
        # Let's check if user has super_admin_role.
        is_super_admin = any(
            role.string_id == "super_admin_role" for role in user.roles
        )
        if not is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this organization",
            )

    org_id = organization_id

    # Helper to generate string_id if missing
    def ensure_string_id(record, model_name):
        if not record.string_id:
            return f"{model_name}_{record.id}"
        return record.string_id

    # Helper to write model data to CSV in ZIP
    def write_model_csv(zip_file, model_name, records, fieldnames, extra_fields=None):
        if not records:
            return

        csv_buffer = io.StringIO()
        writer = csv.DictWriter(csv_buffer, fieldnames=fieldnames)
        writer.writeheader()

        for record in records:
            row = {}
            for field in fieldnames:
                if field == "string_id":
                    row[field] = ensure_string_id(record, model_name)
                elif extra_fields and field in extra_fields:
                    row[field] = extra_fields[field](record)
                elif hasattr(record, field):
                    val = getattr(record, field)
                    # Handle boolean values
                    if isinstance(val, bool):
                        row[field] = str(val).lower()
                    else:
                        row[field] = val
            writer.writerow(row)

        zip_file.writestr(f"{model_name}.csv", csv_buffer.getvalue())

    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # 1. Export Pages
        PageModel = models_pool["page"]
        pages = db.query(PageModel).filter_by(organization_id=org_id).all()
        # Define fields for Page CSV based on model and install_csv_data requirements
        # Note: contents is a relationship, handled separately or flattened?
        # install_csv_data usually expects simple fields.
        # For nested content like page contents, we might need a separate CSV or JSON field.
        # Looking at PageModel, contents is a relationship.
        # Let's check how PageModel handles import. It seems it expects 'contents' list in values.
        # But CSV import flattens things.
        # Wait, PageModel.create expects 'contents' list.
        # install_csv_data reads CSV rows.
        # If we want to support full restore, we might need to export related models too (PageContent).
        # OR, we can export PageContent separately if they have string_ids linking back.
        # Let's check PageContentModel.
        # Actually, for simplicity and compatibility with existing seed data which often uses JSON for complex structures
        # or separate files.
        # Let's look at `deepsel/utils/install_apps.py` again. It calls `model.install_csv_data`.
        # `orm.py`'s `install_csv_data` handles `json:field_name`.
        # So we can export `contents` as a JSON string in a column `json:contents`.
        # But `contents` is a relationship to `PageContentModel`.
        # We should probably export `PageContentModel` separately if it's a separate table.
        # Yes, `page_content` is a table.
        # So we export `page.csv` and `page_content.csv`.
        # `page_content` needs to link to `page` via `page_id` or `page/string_id`.

        # Export Page
        page_fields = [
            "string_id",
            "is_frontend_page",
            "is_homepage",
            "require_login",
            "page_custom_code",
            "published",
        ]
        write_model_csv(zip_file, "page", pages, page_fields)

        # Export PageContent
        PageContentModel = models_pool["page_content"]
        # Filter page contents where page belongs to org
        page_contents = (
            db.query(PageContentModel)
            .join(PageModel)
            .filter(PageModel.organization_id == org_id)
            .all()
        )

        # Need to link back to page using string_id
        def get_page_string_id(record):
            return ensure_string_id(record.page, "page")

        def get_locale_string_id(record):
            return record.locale.string_id if record.locale else "en"

        page_content_fields = [
            "string_id",
            "title",
            "slug",
            "json:content",
            "page/page_id",  # Link to page via page_id foreign key
            "locale/locale_id",  # Link to locale via locale_id foreign key
            "seo_metadata_title",
            "seo_metadata_description",
            "attachment/seo_metadata_featured_image_id",
            "seo_metadata_allow_indexing",
            "custom_code",
        ]

        def get_seo_featured_image_string_id(record):
            return (
                ensure_string_id(record.seo_metadata_featured_image, "attachment")
                if record.seo_metadata_featured_image
                else ""
            )

        write_model_csv(
            zip_file,
            "page_content",
            page_contents,
            page_content_fields,
            extra_fields={
                "page/page_id": get_page_string_id,
                "locale/locale_id": get_locale_string_id,
                "json:content": lambda r: json.dumps(r.content) if r.content else "[]",
                "attachment/seo_metadata_featured_image_id": get_seo_featured_image_string_id,
            },
        )

        # 2. Export Blog Posts
        BlogPostModel = models_pool["blog_post"]
        blog_posts = db.query(BlogPostModel).filter_by(organization_id=org_id).all()
        blog_post_fields = [
            "string_id",
            "slug",
            "published",
            "publish_date",
            "require_login",
            "blog_post_custom_code",
            # "author_id", # Skip author to avoid user dependency issues
        ]
        write_model_csv(zip_file, "blog_post", blog_posts, blog_post_fields)

        # Export BlogPostContent
        BlogPostContentModel = models_pool["blog_post_content"]
        blog_post_contents = (
            db.query(BlogPostContentModel)
            .join(BlogPostModel)
            .filter(BlogPostModel.organization_id == org_id)
            .all()
        )

        def get_post_string_id(record):
            return ensure_string_id(record.post, "blog_post")

        blog_post_content_fields = [
            "string_id",
            "title",
            "subtitle",
            "content",  # BlogPostContent.content is Text, not JSON
            "reading_length",
            "blog_post/post_id",  # Link to blog_post via post_id foreign key
            "locale/locale_id",  # Link to locale via locale_id foreign key
            "attachment/featured_image_id",
            "seo_metadata_title",
            "seo_metadata_description",
            "attachment/seo_metadata_featured_image_id",
            "seo_metadata_allow_indexing",
        ]

        def get_featured_image_string_id(record):
            return (
                ensure_string_id(record.featured_image, "attachment")
                if record.featured_image
                else ""
            )

        def get_blog_seo_featured_image_string_id(record):
            return (
                ensure_string_id(record.seo_metadata_featured_image, "attachment")
                if record.seo_metadata_featured_image
                else ""
            )

        write_model_csv(
            zip_file,
            "blog_post_content",
            blog_post_contents,
            blog_post_content_fields,
            extra_fields={
                "blog_post/post_id": get_post_string_id,
                "locale/locale_id": get_locale_string_id,
                "attachment/featured_image_id": get_featured_image_string_id,
                "attachment/seo_metadata_featured_image_id": get_blog_seo_featured_image_string_id,
            },
        )

        # 3. Export Menus
        MenuModel = models_pool["menu"]
        menus = db.query(MenuModel).filter_by(organization_id=org_id).all()

        # Handle parent/child relationship
        def get_parent_string_id(record):
            return ensure_string_id(record.parent, "menu") if record.parent else ""

        menu_fields = [
            "string_id",
            "position",
            "open_in_new_tab",
            "menu/parent_id",  # Parent link via parent_id foreign key
            "json:translations",  # Menu uses JSON for translations
        ]

        # Need to serialize translations dict to JSON string
        # Also add page_content_string_id alongside page_content_id for portability
        def get_translations_json(record):
            if not record.translations:
                return "{}"

            # Handle case where translations might be a string (already JSON-serialized)
            # or a dictionary
            translations_data = record.translations
            if isinstance(translations_data, str):
                try:
                    translations_data = json.loads(translations_data)
                except json.JSONDecodeError:
                    logger.error(
                        f"Failed to parse translations JSON for menu {record.id}"
                    )
                    return "{}"

            if not isinstance(translations_data, dict):
                logger.error(
                    f"Unexpected translations type for menu {record.id}: {type(translations_data)}"
                )
                return "{}"

            PageContentModel = models_pool.get("page_content")
            translations_copy = {}

            for locale, data in translations_data.items():
                translations_copy[locale] = (
                    data.copy() if isinstance(data, dict) else data
                )
                # If this translation has a page_content_id, add the string_id too
                if (
                    isinstance(translations_copy[locale], dict)
                    and "page_content_id" in translations_copy[locale]
                    and translations_copy[locale]["page_content_id"]
                ):
                    page_content_id = translations_copy[locale]["page_content_id"]
                    page_content = (
                        db.query(PageContentModel).filter_by(id=page_content_id).first()
                    )
                    if page_content and page_content.string_id:
                        # Add string_id alongside the integer ID
                        translations_copy[locale][
                            "page_content_string_id"
                        ] = page_content.string_id

            return json.dumps(translations_copy)

        write_model_csv(
            zip_file,
            "menu",
            menus,
            menu_fields,
            extra_fields={
                "menu/parent_id": get_parent_string_id,
                "json:translations": get_translations_json,
            },
        )

        # 4. Export Attachments
        AttachmentModel = models_pool["attachment"]
        attachments = db.query(AttachmentModel).filter_by(organization_id=org_id).all()

        # We need to export attachment metadata AND the files themselves
        # CSV should have `file:file_path` column pointing to file inside zip

        attachment_fields = [
            "string_id",
            "name",
            "alt_text",
            "content_type",
            "file:file_path",  # Special column for file import
        ]

        def get_zip_file_path(record):
            # We'll store files in 'attachments/' folder in zip
            # Use original filename or name
            filename = os.path.basename(record.name)
            return f"attachments/{filename}"

        write_model_csv(
            zip_file,
            "attachment",
            attachments,
            attachment_fields,
            extra_fields={"file:file_path": get_zip_file_path},
        )

        # Add attachment files to ZIP
        for attachment in attachments:
            try:
                file_data = attachment.get_data()
                filename = os.path.basename(attachment.name)
                zip_file.writestr(f"attachments/{filename}", file_data)
            except Exception as e:
                logger.error(f"Failed to export attachment {attachment.id}: {e}")
                # Continue even if one file fails? Yes.

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=backup.zip"},
    )


@router.post("/backup/import")
def import_backup(
    file: UploadFile,
    organization_id: int = Form(...),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Import backup from ZIP file.
    Extracts ZIP and imports CSVs for Pages, Blog Posts, Menus, Attachments.
    """
    # Increase CSV field size limit to handle large content fields
    # Default is 131072 (128KB), which is too small for rich page content
    csv.field_size_limit(10485760)  # 10MB limit

    # Check permission (admin only)
    if not any(
        role.string_id in ["admin_role", "super_admin_role"] for role in user.roles
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to import backup",
        )

    # Validate organization access
    allowed_org_ids = user.get_org_ids()
    if organization_id not in allowed_org_ids:
        is_super_admin = any(
            role.string_id == "super_admin_role" for role in user.roles
        )
        if not is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this organization",
            )

    org_id = organization_id

    if not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a ZIP archive",
        )

    # Create temp directory
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Save uploaded file
            zip_path = os.path.join(temp_dir, "backup.zip")
            with open(zip_path, "wb") as f:
                shutil.copyfileobj(file.file, f)

            # Extract ZIP
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(temp_dir)

            # Import order matters due to dependencies
            import_files = [
                "attachment.csv",
                "page.csv",
                "page_content.csv",
                "blog_post.csv",
                "blog_post_content.csv",
                "menu.csv",
            ]

            results = {"success": [], "errors": []}

            # Wrap entire import in a transaction for data integrity
            # If any error occurs, all changes will be rolled back
            try:
                for filename in import_files:
                    csv_path = os.path.join(temp_dir, filename)
                    if os.path.exists(csv_path):
                        logger.info(f"Importing {filename}...")

                        # Preprocess CSV to add organization_id and owner_id
                        try:
                            rows = []
                            fieldnames = []
                            with open(csv_path, "r", encoding="utf-8") as f:
                                reader = csv.DictReader(f)
                                fieldnames = (
                                    list(reader.fieldnames) if reader.fieldnames else []
                                )
                                rows = list(reader)

                            if rows:
                                if "organization_id" not in fieldnames:
                                    fieldnames.append("organization_id")
                                if "owner_id" not in fieldnames:
                                    fieldnames.append("owner_id")

                                # Add user/owner_id to fieldnames (empty) to prevent orm.py from defaulting to super_user
                                # The OR condition in orm.py requires BOTH user/owner_id AND owner_id to be present
                                if "user/owner_id" not in fieldnames:
                                    fieldnames.append("user/owner_id")

                                # For blog_post.csv, handle author_id
                                if filename == "blog_post.csv":
                                    if "author_id" not in fieldnames:
                                        fieldnames.append("author_id")
                                    if "user/author_id" not in fieldnames:
                                        fieldnames.append("user/author_id")

                                for row in rows:
                                    row["organization_id"] = org_id
                                    row["owner_id"] = user.id
                                    # Set user/owner_id to empty string (presence in fieldnames prevents super_user default)
                                    row["user/owner_id"] = ""

                                    if filename == "blog_post.csv":
                                        row["author_id"] = user.id
                                        row["user/author_id"] = ""

                                # Debug logging
                                if rows:
                                    logger.info(
                                        f"Preprocessing {filename}: user.id={user.id}, org_id={org_id}"
                                    )
                                    logger.info(
                                        f"First row after preprocessing: {rows[0]}"
                                    )
                                    logger.info(f"Fieldnames: {fieldnames}")

                                with open(
                                    csv_path, "w", encoding="utf-8", newline=""
                                ) as f:
                                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                                    writer.writeheader()
                                    writer.writerows(rows)
                        except Exception as e:
                            logger.error(f"Error preprocessing {filename}: {e}")
                            raise  # Re-raise to trigger rollback

                        # Import CSV without auto-commit to maintain transaction integrity
                        import_csv_data(
                            csv_path,
                            db,
                            demo_data=False,
                            organization_id=org_id,
                            base_dir=temp_dir,
                            force_update=True,
                            auto_commit=False,  # CRITICAL: Disable auto-commit
                        )
                        results["success"].append(filename)

                # Post-process menus to update page_content_id references
                logger.info(
                    "Post-processing menus to update page_content_id references..."
                )
                MenuModel = models_pool.get("menu")
                PageContentModel = models_pool.get("page_content")

                menus = db.query(MenuModel).filter_by(organization_id=org_id).all()
                for menu in menus:
                    if not menu.translations:
                        continue

                    updated = False
                    for locale, data in menu.translations.items():
                        # If this translation has page_content_string_id, look up the actual ID
                        if (
                            "page_content_string_id" in data
                            and data["page_content_string_id"]
                        ):
                            string_id = data["page_content_string_id"]
                            page_content = (
                                db.query(PageContentModel)
                                .filter_by(string_id=string_id, organization_id=org_id)
                                .first()
                            )

                            if page_content:
                                # Update the page_content_id with the correct ID from this database
                                menu.translations[locale][
                                    "page_content_id"
                                ] = page_content.id
                                updated = True
                                logger.debug(
                                    f"Updated menu {menu.string_id} locale {locale}: page_content_id = {page_content.id}"
                                )

                    if updated:
                        # Mark the translations field as modified so SQLAlchemy knows to update it
                        from sqlalchemy.orm.attributes import flag_modified

                        flag_modified(menu, "translations")

                logger.info("Menu post-processing complete")

                # COMMIT EVERYTHING AT ONCE - only if all imports succeeded
                db.commit()
                logger.info(
                    "Backup import completed successfully - all changes committed"
                )

            except Exception as e:
                # ROLLBACK ALL CHANGES if any error occurred
                db.rollback()
                logger.error(f"Backup import failed, rolling back all changes: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Backup import failed: {str(e)}. All changes have been rolled back.",
                )

            return results

        except Exception as e:
            logger.error(f"Backup import failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Backup import failed: {str(e)}",
            )
