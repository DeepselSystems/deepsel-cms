import copy
import logging
from typing import Dict, Any, Optional, Tuple
from jinja2 import Environment, DictLoader, select_autoescape
from sqlalchemy.orm import Session

from deepsel.models.user import UserModel
from deepsel.utils.models_pool import models_pool
from apps.cms.models.organization import CMSSettingsModel
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def load_jinja2_templates(
    organization_id: int,
    db: Session,
    lang: Optional[str] = None,
    default_lang_id: Optional[int] = None,
    user: Optional[UserModel] = None,
) -> Tuple[Dict[str, str], Dict[str, Any]]:
    """
    Load all templates for an organization with language fallback and return jinja2_templates dict and context
    """
    TemplateContentModel = models_pool["template_content"]
    TemplateModel = models_pool["template"]
    LocaleModel = models_pool["locale"]
    jinja2_templates = {}

    if lang:
        # Get requested language locale
        requested_locale = (
            db.query(LocaleModel).filter(LocaleModel.iso_code == lang).first()
        )

        if requested_locale:
            # Build locale filter - include both requested and default language
            locale_ids = [requested_locale.id]
            if default_lang_id and default_lang_id != requested_locale.id:
                locale_ids.append(default_lang_id)

            # Get all template contents for both languages in one query
            template_contents = (
                db.query(TemplateContentModel)
                .join(TemplateModel)
                .filter(
                    TemplateModel.organization_id == organization_id,
                    TemplateContentModel.locale_id.in_(locale_ids),
                )
                .all()
            )

            # Group by template_id and prioritize requested language
            template_content_map = {}
            for content in template_contents:
                template_id = content.template_id
                template_name = content.template.name

                if template_name:
                    # If we don't have this template yet, or this is the requested language, use it
                    if (
                        template_id not in template_content_map
                        or content.locale_id == requested_locale.id
                    ):
                        template_content_map[template_id] = {
                            "name": template_name,
                            "content": content.content,
                        }

            # Build jinja2_templates dict
            for template_data in template_content_map.values():
                jinja2_templates[template_data["name"]] = template_data["content"]

    # Get organization settings for context with language
    settings = CMSSettingsModel.get_public_settings(
        organization_id=organization_id,
        db=db,
        lang=lang,
    )
    context = {
        "settings": settings,
        "user": (
            dict(
                id=user.id,
                name=user.name,
                last_name=user.last_name,
                first_name=user.first_name,
            )
            if user
            else None
        ),
    }

    return jinja2_templates, context


def render_template_content(
    content: str,
    name: str,
    organization_id: int,
    db: Session,
    lang: Optional[str] = None,
    user: Optional[UserModel] = None,
) -> str:
    """
    Render a single template content using Jinja2 templating engine
    """
    OrganizationModel = models_pool["organization"]
    organization = (
        db.query(OrganizationModel)
        .filter(OrganizationModel.id == organization_id)
        .first()
    )
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    jinja2_templates, context = load_jinja2_templates(
        organization_id, db, lang, organization.default_language_id, user
    )

    # Add the current template being rendered
    jinja2_templates[name] = content

    # Set up Jinja2 environment with DictLoader
    env = Environment(
        loader=DictLoader(jinja2_templates),
        autoescape=select_autoescape(["html", "xml"]),
    )
    logger.info(f"TRYING TO LOAD: {name}")
    logger.info(f"TEMPLATE CONTENT: \n\n {jinja2_templates[name]}")
    template = env.get_template(name)
    logger.info(f"LOADED: {template}")
    try:
        rendered_content = template.render(**context)
        return rendered_content
    except Exception as e:
        logger.error(f"Error rendering template: {e}")
        raise


def render_wysiwyg_content(
    page_content: Any,
    organization_id: int,
    db: Session,
    default_lang_id: Optional[int] = None,
    user: Optional[UserModel] = None,
) -> Any:
    """
    Recursively process content object and render wysiwyg fields with Jinja2
    """
    # Extract JSON content from the page content model
    content_obj = page_content.content
    if not isinstance(content_obj, dict):
        return content_obj

    # Create a copy to avoid modifying the original
    processed_content = copy.deepcopy(content_obj)

    # Extract language from page_content
    lang = None
    if hasattr(page_content, "locale") and page_content.locale:
        lang = page_content.locale.iso_code

    # Load templates and context with language fallback
    jinja2_templates, context = load_jinja2_templates(
        organization_id, db, lang, default_lang_id, user
    )

    def process_object(obj):
        if not isinstance(obj, dict):
            return obj

        processed_obj = {}
        for key, value in obj.items():
            if isinstance(value, dict):
                # Check if this is a wysiwyg field
                if value.get("ds-type") == "wysiwyg" and "ds-value" in value:
                    try:
                        # Create a temporary template for this content
                        temp_template_name = f"temp_{hash(value['ds-value'])}"
                        temp_env = Environment(
                            loader=DictLoader(
                                {
                                    **jinja2_templates,
                                    temp_template_name: value["ds-value"],
                                }
                            ),
                            autoescape=select_autoescape(["html", "xml"]),
                        )
                        template = temp_env.get_template(temp_template_name)
                        rendered_content = template.render(**context)

                        # Update the ds-value with rendered content
                        processed_obj[key] = {**value, "ds-value": rendered_content}
                    except Exception as e:
                        logger.error(f"Error rendering wysiwyg content: {e}")
                        # Keep original content if rendering fails
                        processed_obj[key] = value
                else:
                    # Recursively process nested objects
                    processed_obj[key] = process_object(value)
            else:
                processed_obj[key] = value
        return processed_obj

    rendered = process_object(processed_content)
    return rendered
