from typing import Callable, Optional
from markupsafe import Markup
from sqlalchemy.orm import Session

from apps.core.utils.models_pool import models_pool

# Serve URL prefix — TODO: confirm final URL format
_SERVE_URL_PREFIX = "/api/v1/attachment/serve"


def _render_image(version) -> Markup:
    # TODO: add srcset, lazy loading, CSS classes
    return Markup(
        f'<img src="{_SERVE_URL_PREFIX}/{version.name}" alt="{version.alt_text or ""}">'
    )


def _render_audio(version) -> Markup:
    # TODO: add controls styling, fallback text
    return Markup(
        f"<audio controls>"
        f'<source src="{_SERVE_URL_PREFIX}/{version.name}" type="{version.content_type}">'
        f"</audio>"
    )


def _render_video(version) -> Markup:
    # TODO: add poster, controls styling, fallback text
    return Markup(
        f"<video controls>"
        f'<source src="{_SERVE_URL_PREFIX}/{version.name}" type="{version.content_type}">'
        f"</video>"
    )


def _render_file(version) -> Markup:
    # TODO: add icon, file size display
    return Markup(
        f'<a href="{_SERVE_URL_PREFIX}/{version.name}" download>'
        f"{version.name}"
        f"</a>"
    )


def _render_version(version) -> Markup:
    """Dispatch to the correct renderer based on content_type."""
    content_type = (version.content_type or "").lower()
    if content_type.startswith("image/"):
        return _render_image(version)
    if content_type.startswith("audio/"):
        return _render_audio(version)
    if content_type.startswith("video/"):
        return _render_video(version)
    return _render_file(version)


def make_attachment_func(
    db: Session,
    organization_id: int,
    lang: Optional[str],
) -> Callable[[str], Markup]:
    """
    Returns a Jinja2 callable that resolves an attachment by name and renders HTML.

    Usage in templates: {{ attachment('my-file-name') }}
    """

    def attachment(name: str) -> Markup:
        AttachmentModel = models_pool.get("attachment")
        if not AttachmentModel:
            return Markup(f"<div>File not found: {name}</div>")

        attachment_obj = (
            db.query(AttachmentModel)
            .filter(
                AttachmentModel.name == name,
                AttachmentModel.organization_id == organization_id,
            )
            .first()
        )

        if not attachment_obj:
            return Markup(f"<div>File not found: {name}</div>")

        locale_versions = getattr(attachment_obj, "locale_versions", None) or []

        if not locale_versions:
            return Markup("<div>File not available for this locale</div>")

        # Resolve version: match requested lang → fallback first version
        resolved_version = None
        if lang:
            LocaleModel = models_pool.get("locale")
            if LocaleModel:
                locale = (
                    db.query(LocaleModel).filter(LocaleModel.iso_code == lang).first()
                )
                if locale:
                    resolved_version = next(
                        (v for v in locale_versions if v.locale_id == locale.id),
                        None,
                    )

        if not resolved_version:
            resolved_version = locale_versions[0]

        if not resolved_version:
            return Markup("<div>File not available for this locale</div>")

        return _render_version(resolved_version)

    return attachment
