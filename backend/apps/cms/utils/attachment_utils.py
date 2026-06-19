from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from apps.core.models.attachment import AttachmentModel
    from apps.core.models.attachment_locale_version import AttachmentLocaleVersionModel


def resolve_attachment_locale_version(
    attachment: Optional["AttachmentModel"],
    target_lang: str,
) -> Optional["AttachmentLocaleVersionModel"]:
    """
    Return the AttachmentLocaleVersionModel for target_lang.
    Falls back to the first available version if no exact match.
    Returns None when the attachment has no locale versions.
    """
    if not attachment or not attachment.locale_versions:
        return None
    for v in attachment.locale_versions:
        if v.locale.iso_code == target_lang:
            return v
    return attachment.locale_versions[0]
