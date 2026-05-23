import json
from typing import Callable, Optional, TypedDict, Union, Dict, Any
from markupsafe import Markup
from sqlalchemy.orm import Session

from apps.core.utils.models_pool import models_pool

_SERVE_URL_PREFIX = "/api/v1/attachment/serve"


class ImageAttrs(TypedDict, total=False):
    width: int
    height: int
    alignment: str  # "left" | "center" | "right"
    rounded: bool
    circle: bool
    inline: bool
    description: str


class AudioAttrs(TypedDict, total=False):
    width: int  # player width in px; omit for 100% width


class VideoAttrs(TypedDict, total=False):
    poster: str  # URL of the poster image shown before playback


class FileAttrs(TypedDict, total=False):
    pass


AttachmentAttrs = Union[ImageAttrs, AudioAttrs, VideoAttrs, FileAttrs, Dict[str, Any]]


def _render_image(version, attrs: ImageAttrs) -> Markup:
    # Mirrors the HTML produced by enhanced-image-extension renderHTML() with default attrs.
    alignment = attrs.get("alignment", "center")
    rounded = attrs.get("rounded", True)
    circle = attrs.get("circle", False)
    inline = attrs.get("inline", False)
    width = attrs.get("width", 300)
    height = attrs.get("height", "")
    description = attrs.get("description", "")

    src = f"{_SERVE_URL_PREFIX}/{version.name}"
    alt = version.alt_text or ""

    if circle:
        img_style = "border-radius: 50%; aspect-ratio: 1; object-fit: cover;"
    elif rounded:
        img_style = "border-radius: 6px;"
    else:
        img_style = ""

    if alignment == "right":
        img_style += " margin-left: auto;"
    elif alignment == "left":
        img_style += " margin-right: auto;"
    elif alignment == "center":
        img_style += " margin: 0 auto;"

    if inline:
        wrapper_styles = {
            "left": "display: inline-block; float: left; margin: 0 1rem 1rem 0; width: fit-content;",
            "right": "display: inline-block; float: right; margin: 0 0 1rem 1rem; width: fit-content;",
            "center": "display: inline-block; float: left; margin: 0 1rem 1rem 0; width: fit-content;",
        }
    else:
        wrapper_styles = {
            "center": "display: block; text-align: center; margin: 0 auto; width: fit-content;",
            "left": "display: block; text-align: left; margin-left: 0; margin-right: auto; width: fit-content;",
            "right": "display: block; text-align: right; margin-left: auto; margin-right: 0; width: fit-content;",
        }
    wrapper_style = wrapper_styles.get(alignment, wrapper_styles["center"])

    img_tag = (
        f'<img src="{src}" alt="{alt}"'
        f' width="{width}"'
        + (f' height="{height}"' if height else "")
        + (f' style="{img_style}"' if img_style else "")
        + ">"
    )

    description_tag = (
        f'<div class="enhanced-image-description">{description}</div>'
        if description and description.strip()
        else ""
    )

    return Markup(
        f"<div"
        f' class="enhanced-image-wrapper"'
        f' data-enhanced-image="true"'
        f' data-alignment="{alignment}"'
        f' data-rounded="{str(rounded).lower()}"'
        f' data-circle="{str(circle).lower()}"'
        f' data-inline="{str(inline).lower()}"'
        f' data-width="{width}"'
        f' data-height="{height}"'
        f' data-description="{description}"'
        f' style="{wrapper_style}"'
        f">{img_tag}{description_tag}</div>"
    )


def _render_audio(version, attrs: AudioAttrs) -> Markup:
    # Mirrors the HTML produced by embed-audio-extension renderHTML().
    src = f"{_SERVE_URL_PREFIX}/{version.name}"
    width = attrs.get("width")
    width_style = f"width: {width}px;" if width else "width: 100%;"

    return Markup(
        f"<div"
        f' class="embed-audio-wrapper"'
        f' data-embed-audio="true"'
        f' data-audio-src="{src}"'
        + (f' data-audio-width="{width}"' if width else "")
        + f">"
        f'<div class="embed-audio-container" style="{width_style}">'
        f'<audio src="{src}" controls class="embed-audio-content">'
        f"Your browser does not support the audio tag."
        f"</audio>"
        f"</div>"
        f"</div>"
    )


def _render_video(version, attrs: VideoAttrs) -> Markup:
    # Mirrors the HTML produced by embed-video-extension renderHTML().
    src = f"{_SERVE_URL_PREFIX}/{version.name}"
    poster = attrs.get("poster", "")

    return Markup(
        f"<div"
        f' class="embed-video-wrapper"'
        f' data-embed-video="true"'
        f">"
        f'<div class="embed-video-container">'
        f'<video src="{src}" controls class="embed-video-content" style="width: 100%; height: auto;"'
        + (f' poster="{poster}"' if poster else "")
        + f">"
        f"Your browser does not support the video tag."
        f"</video>"
        f"</div>"
        f"</div>"
    )


def _render_file(version, attrs: FileAttrs) -> Markup:
    href = f"{_SERVE_URL_PREFIX}/{version.name}"
    display_name = version.name
    return Markup(
        f'<div class="embed-file-item">'
        f'<a href="{href}" download class="embed-file-content" title="{display_name}">'
        f'<span class="embed-file-icon">📄</span>'
        f'<span class="embed-file-link">{display_name}</span>'
        f"</a>"
        f"</div>"
    )


def _render_version(version, attrs: AttachmentAttrs) -> Markup:
    """Dispatch to the correct renderer based on content_type."""
    content_type = (version.content_type or "").lower()
    if content_type.startswith("image/"):
        return _render_image(version, attrs)
    if content_type.startswith("audio/"):
        return _render_audio(version, attrs)
    if content_type.startswith("video/"):
        return _render_video(version, attrs)
    return _render_file(version, attrs)


def _resolve_locale_version(attachment_obj, lang: Optional[str], db: Session):
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


def _render_gallery(
    names: tuple,
    config: dict,
    db: Session,
    organization_id: int,
    lang: Optional[str],
) -> Markup:
    """
    Render a multi-image gallery grid from a list of attachment names.
    Config keys: imagesPerRow, gap, maxWidth, rounded.
    Alt text is resolved from each attachment's locale version in the DB.
    """
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

    img_border_radius = "border-radius: 6px;" if rounded else ""

    AttachmentModel = models_pool.get("attachment")
    if not AttachmentModel:
        return Markup("<div>Gallery unavailable</div>")

    image_parts = []
    for name in names:
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

        version = _resolve_locale_version(attachment_obj, lang, db)
        if not version:
            continue

        src = f"{_SERVE_URL_PREFIX}/{version.name}"
        alt = version.alt_text or ""

        img_tag = (
            f'<img src="{src}" alt="{alt}"'
            f' class="gallery-image"'
            f' style="width: 100%; height: auto; object-fit: cover;'
            f' aspect-ratio: 1 / 1; {img_border_radius}">'
        )
        image_parts.append(f'<div class="gallery-image-container">{img_tag}</div>')

    if not image_parts:
        return Markup("<div>Gallery is empty</div>")

    return Markup(
        f'<div class="gallery-container" data-gallery="true" style="{grid_style}">'
        + "".join(image_parts)
        + "</div>"
    )


def make_attachment_func(
    db: Session,
    organization_id: int,
    lang: Optional[str],
) -> Callable[..., Markup]:
    """
    Returns a Jinja2 callable that resolves attachments by name and renders HTML.

    Single image:
        {{ attachment('my-image') }}
        {{ attachment('my-image', {'width': 500, 'alignment': 'left'}) }}

    Gallery (multiple images):
        {{ attachment('img1', 'img2', 'img3') }}
        {{ attachment('img1', 'img2', '{"imagesPerRow":3,"gap":4,"maxWidth":null,"rounded":true}') }}

    The last arg is treated as config when it is a dict or a JSON string starting with '{'.
    Gallery config keys: imagesPerRow, gap, maxWidth, rounded.
    Single-image attrs vary by content type — see each _render_* function for details.
    """

    def attachment(*args) -> Markup:
        # Separate name args from optional config (last arg as dict or JSON string).
        config: AttachmentAttrs = {}
        names = list(args)

        if names:
            last = names[-1]
            if isinstance(last, dict):
                config = last
                names = names[:-1]
            elif isinstance(last, str) and last.strip().startswith("{"):
                try:
                    config = json.loads(last)
                    names = names[:-1]
                except (json.JSONDecodeError, ValueError):
                    pass  # not valid JSON — treat as a name

        if not names:
            return Markup("<div>No attachment specified</div>")

        # Gallery mode: more than one name arg.
        if len(names) > 1:
            return _render_gallery(tuple(names), config, db, organization_id, lang)

        # Single attachment mode.
        name = names[0]
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

        version = _resolve_locale_version(attachment_obj, lang, db)
        if not version:
            return Markup("<div>File not available for this locale</div>")

        return _render_version(version, config)

    return attachment
