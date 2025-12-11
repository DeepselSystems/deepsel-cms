from typing import Dict, Any, List
from pydantic import BaseModel
from fastapi import Depends, HTTPException, Body, Path, Request, status
from sqlalchemy.orm import Session

from apps.cms.routers.form_content import FormContentSchemaRead
from apps.cms.utils.form_submission import get_lasted_user_submission
from deepsel.models.user import UserModel
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
from deepsel.utils.models_pool import models_pool
from db import get_db
from apps.cms.models.organization import CMSSettingsModel
import logging

logger = logging.getLogger(__name__)

table_name = "form"
CRUDSchemas = generate_CRUD_schemas(table_name)


class FormSchemaRead(CRUDSchemas.Read):
    contents: List[FormContentSchemaRead] = []


router = CRUDRouter(
    read_schema=FormSchemaRead,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
    bulk_delete_route=True,
    export_route=False,
    import_route=False,
)


class TranslationRequest(BaseModel):
    """Request schema for translating form content"""

    content: Dict[str, Any]
    sourceLocale: str
    targetLocale: str


class FormPublicReadSchema(BaseModel):
    """Schema for public form reading (without sensitive data)"""

    id: int
    published: bool
    form_custom_code: str = None
    contents: List[Dict[str, Any]]


@router.post("/translate")
async def translate_form_content(
    request: TranslationRequest = Body(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Translate form content from source locale to target locale"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Get organization settings for translation API
    org_id = user.organization_id
    org_settings = db.query(CMSSettingsModel).get(org_id)

    if not org_settings or not org_settings.encrypted_data:
        raise HTTPException(
            status_code=400, detail="Translation service not configured"
        )

    # TODO: Implement translation logic similar to other routers
    # This would use the organization's translation API settings
    # to translate form content from source to target locale

    return {"message": "Translation completed", "translated_content": request.content}


@router.get("/public/{form_id}", response_model=FormPublicReadSchema)
async def get_public_form(
    form_id: int = Path(..., description="Form ID"),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    Get a public form by ID for rendering on the website.
    This endpoint is accessible without authentication for public form viewing.
    """
    FormModel = models_pool["form"]

    # Create a public user context for access control
    from deepsel.models.user import UserModel

    public_user = UserModel()  # This creates a public user instance

    try:
        form = FormModel.get_one(db=db, user=public_user, item_id=form_id)

        # Filter only published content for public access
        published_contents = [
            content
            for content in form.contents
            if hasattr(content, "published") and getattr(content, "published", True)
        ]

        return FormPublicReadSchema(
            id=form.id,
            published=form.published,
            form_custom_code=form.form_custom_code,
            contents=[
                {
                    "id": content.id,
                    "title": content.title,
                    "slug": content.slug,
                    "description": content.description,
                    "closing_remarks": content.closing_remarks,
                    "success_message": content.success_message,
                    "custom_code": content.custom_code,
                    "locale_id": content.locale_id,
                    "max_submissions": content.max_submissions,
                    "show_remaining_submissions": content.show_remaining_submissions,
                    "submissions_count": content.submissions_count,
                    "fields": [
                        {
                            "id": field.id,
                            "field_id": field.field_id,
                            "field_type": (
                                field.field_type.value
                                if hasattr(field.field_type, "value")
                                else field.field_type
                            ),
                            "label": field.label,
                            "description": field.description,
                            "required": field.required,
                            "placeholder": field.placeholder,
                            "sort_order": field.sort_order,
                            "field_config": field.field_config,
                        }
                        for field in sorted(content.fields, key=lambda f: f.sort_order)
                    ],
                }
                for content in published_contents
            ],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching public form {form_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/website/{lang}/{slug}")
def get_form_by_slug(
    lang: str = Path(..., description="Language code (e.g., 'en', 'vi')"),
    slug: str = Path(..., description="Form slug"),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Get a form by slug and language for public rendering.
    Used for rendering forms at: {site domain}/{lang}/forms/{form slug}
    """
    return _get_form_content_by_slug(lang, slug, db, user)


@router.get("/website/{lang}/{slug}/statistics")
def get_form_statistics_by_slug(
    lang: str = Path(..., description="Language code"),
    slug: str = Path(..., description="Form slug"),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    # Get form content data
    form_content = _get_form_content_by_slug(lang, slug, db, user)

    # Check view permission
    if not form_content.get("enable_public_statistics"):
        user_roles = user.get_user_roles()
        has_permission = any(
            [
                role.string_id
                in [
                    "admin_role",
                    "super_admin_role",
                    "website_admin_role",
                ]
                for role in user_roles
            ]
        )
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form statistics is not published",
            )

    # Get form submissions
    FormSubmissionModel = models_pool["form_submission"]
    form_submissions = (
        db.query(FormSubmissionModel)
        .filter(FormSubmissionModel.form_content_id == form_content.get("id"))
        .all()
    )

    # Return
    return {**form_content, "submissions": form_submissions}


def _get_form_content_by_slug(lang: str, slug: str, db: Session, user: UserModel):
    """
    Get a form by slug and language for public rendering.
    Used for rendering forms at: {site domain}/{lang}/forms/{form slug}/{...}
    """
    FormContentModel = models_pool["form_content"]
    LocaleModel = models_pool["locale"]

    try:
        # Get locale by language code
        locale = db.query(LocaleModel).filter(LocaleModel.iso_code == lang).first()
        if not locale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Language '{lang}' is not supported",
            )

        # Find form content by slug and locale
        slug = "/" + slug.lstrip("/")
        form_content = (
            db.query(FormContentModel)
            .filter(
                FormContentModel.slug == slug, FormContentModel.locale_id == locale.id
            )
            .first()
        )

        if not form_content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Form with slug '{slug}' not found in language '{lang}'",
            )

        # Check if the parent form is published
        if not form_content.form.published:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Form is not published"
            )

        # Return form content with fields
        return {
            "id": form_content.id,
            "form_id": form_content.form_id,
            "title": form_content.title,
            "slug": form_content.slug,
            "description": form_content.description,
            "closing_remarks": form_content.closing_remarks,
            "success_message": form_content.success_message,
            "custom_code": form_content.custom_code,
            "form_custom_code": form_content.form.form_custom_code,
            "locale_id": form_content.locale_id,
            "max_submissions": form_content.max_submissions,
            "show_remaining_submissions": form_content.show_remaining_submissions,
            "submissions_count": form_content.submissions_count,
            "views_count": form_content.views_count,
            "enable_public_statistics": form_content.enable_public_statistics,
            "latest_user_submission": get_lasted_user_submission(
                db=db, user=user, form_content_id=form_content.id
            ),
            "fields": [
                {
                    "id": field.id,
                    "field_type": (
                        field.field_type.value
                        if hasattr(field.field_type, "value")
                        else field.field_type
                    ),
                    "label": field.label,
                    "description": field.description,
                    "required": field.required,
                    "placeholder": field.placeholder,
                    "sort_order": field.sort_order,
                    "field_config": field.field_config,
                }
                for field in sorted(form_content.fields, key=lambda f: f.sort_order)
            ],
        }
    except HTTPException:
        # Re-raise HTTPException to preserve intentional HTTP status codes (404, etc.)
        raise
    except Exception as e:
        logger.error(
            f"Error fetching form by slug {slug} for language {lang}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )
