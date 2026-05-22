import json
from typing import Callable, List, Optional
from markupsafe import Markup
from sqlalchemy.orm import Session

from apps.core.utils.models_pool import models_pool

_SERVE_URL_PREFIX = "/api/v1/attachment/serve"


def _resolve_attachment_version(attachment_obj, lang: Optional[str], db: Session):
    """Return the best-matching locale version for lang, falling back to the first available."""
    locale_versions = getattr(attachment_obj, "locale_versions", None) or []
    if not locale_versions:
        return None

    if lang:
        LocaleModel = models_pool.get("locale")
        if LocaleModel:
            locale = db.query(LocaleModel).filter(LocaleModel.iso_code == lang).first()
            if locale:
                matched = next(
                    (v for v in locale_versions if v.locale_id == locale.id), None
                )
                if matched:
                    return matched

    return locale_versions[0]


def _render_gallery_html(
    config: dict,
    attachment_items: List[dict],
    db: Session,
    organization_id: int,
    lang: Optional[str],
) -> Markup:
    """Render gallery grid HTML from resolved attachment items."""
    images_per_row = config.get("imagesPerRow", 3)
    gap = config.get("gap", 4)
    max_width = config.get("maxWidth")
    rounded = config.get("rounded", True)

    grid_style = (
        f"display: grid;"
        f" grid-template-columns: repeat({images_per_row}, 1fr);"
        f" gap: {gap}px;"
        f" margin: 1rem 0;"
    )
    if max_width:
        grid_style += f" max-width: {max_width}px; margin: 1rem auto;"

    AttachmentModel = models_pool.get("attachment")
    if not AttachmentModel:
        return Markup("<div>Gallery unavailable</div>")

    img_border_radius = "border-radius: 6px;" if rounded else ""

    image_html_parts = []
    for item in attachment_items:
        name = item.get("name", "")
        alt_text = item.get("alt_text", "")
        caption = item.get("caption", "")

        attachment_obj = (
            db.query(AttachmentModel)
            .filter(
                AttachmentModel.name == name,
                AttachmentModel.organization_id == organization_id,
            )
            .first()
        )

        if not attachment_obj:
            continue

        version = _resolve_attachment_version(attachment_obj, lang, db)
        if not version:
            continue

        src = f"{_SERVE_URL_PREFIX}/{version.name}"
        alt = alt_text or version.alt_text or ""

        img_tag = (
            f'<img src="{src}" alt="{alt}"'
            f' class="gallery-image"'
            f' style="width: 100%; height: auto; object-fit: cover; aspect-ratio: 1 / 1; {img_border_radius}">'
        )

        caption_tag = (
            f'<div class="gallery-image-caption"'
            f' style="padding: 8px 4px; font-size: 14px; color: #666; text-align: center;">'
            f"{caption}</div>"
            if caption
            else ""
        )

        image_html_parts.append(
            f'<div class="gallery-image-container">{img_tag}{caption_tag}</div>'
        )

    if not image_html_parts:
        return Markup("<div>Gallery is empty</div>")

    images_html = "".join(image_html_parts)
    return Markup(
        f'<div class="gallery-container" data-type="gallery" style="{grid_style}">'
        f"{images_html}"
        f"</div>"
    )


def make_gallery_func(
    db: Session,
    organization_id: int,
    lang: Optional[str],
) -> Callable[..., Markup]:
    """
    Returns a Jinja2 callable that renders a gallery from the stored Jinja syntax.

    Usage in templates (emitted by the gallery TipTap extension):
        {{ gallery('galleryId', '{"imagesPerRow":3,"gap":4,"maxWidth":null,"rounded":true}', '[{"name":"img","alt_text":"","caption":""}]') }}
    """

    def gallery(gallery_id: str, config_json: str, attachments_json: str) -> Markup:
        try:
            config = json.loads(config_json) if config_json else {}
        except (json.JSONDecodeError, ValueError):
            config = {}

        try:
            attachment_items = json.loads(attachments_json) if attachments_json else []
        except (json.JSONDecodeError, ValueError):
            attachment_items = []

        return _render_gallery_html(config, attachment_items, db, organization_id, lang)

    return gallery
