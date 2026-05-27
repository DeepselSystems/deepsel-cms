import html as _html
import json
import re

# Matches locale suffix added by the old single-file attachment system (_de, _en, _fr, _it)
_LOCALE_SUFFIX_RE = re.compile(r"_(?:de|en|fr|it)$", re.IGNORECASE)

# Matches the full enhanced-image-wrapper block produced by the rich-text editor.
# Structure: <div class="enhanced-image-wrapper" [attrs]><img src="..."><div class="enhanced-image-description">...</div></div>
#
# DESIGN: enhanced-image-description is intentionally required, not optional.
# The old TipTap extension always serialized the description div — even when the
# user left it blank it emitted <div class="enhanced-image-description"></div>.
# This has been verified against all historical content in the DB. Making the
# div optional would widen the regex to match unrelated partial/malformed markup
# and is therefore deliberately avoided.
_ENHANCED_IMAGE_BLOCK_RE = re.compile(
    r'<div\s[^>]*class="enhanced-image-wrapper"([^>]*)>'
    r'<img\s[^>]*src="/api/v1/attachment/serve/([^"]+)"[^>]*>'
    r'<div\s[^>]*class="enhanced-image-description">([^<]*)</div>'
    r"</div>",
    re.IGNORECASE,
)


def _extract_data_attr(attrs_str: str, name: str, default: str = "") -> str:
    m = re.search(rf'data-{name}="([^"]*)"', attrs_str, re.IGNORECASE)
    return m.group(1) if m else default


def replace_enhanced_image_blocks(html: str) -> str:
    """Replace each enhanced-image-wrapper block with a Jinja attachment() call."""

    def _replacer(m: re.Match) -> str:
        attrs_str = m.group(1)
        filename = m.group(2)
        description = m.group(3)

        base, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        slug = _LOCALE_SUFFIX_RE.sub("", base)

        alignment = _extract_data_attr(attrs_str, "alignment", "center")
        rounded = _extract_data_attr(attrs_str, "rounded", "true").lower() == "true"
        circle = _extract_data_attr(attrs_str, "circle", "false").lower() == "true"
        inline = _extract_data_attr(attrs_str, "inline", "false").lower() == "true"
        width_str = _extract_data_attr(attrs_str, "width", "")
        height_str = _extract_data_attr(attrs_str, "height", "")

        attrs = {
            "alignment": alignment,
            "rounded": rounded,
            "circle": circle,
            "inline": inline,
        }
        if width_str:
            try:
                attrs["width"] = int(width_str)
            except ValueError:
                pass
        if height_str:
            try:
                attrs["height"] = int(height_str)
            except ValueError:
                pass
        if description.strip():
            attrs["description"] = description.strip()

        attrs_json = json.dumps(attrs, separators=(",", ":"))
        return f"<div data-enhanced-image=\"true\">{{{{ attachment('{slug}', {attrs_json}) }}}}</div>"

    return _ENHANCED_IMAGE_BLOCK_RE.sub(_replacer, html)


# Matches the full embed-files-wrapper block produced by the rich-text editor.
# Structure: <div class="embed-files-wrapper" data-files="[...]" data-embed-files="true">
#              <div class="embed-files-container">
#                (<div class="embed-file-item">...</div>)+
#              </div>
#            </div>
_EMBED_FILES_BLOCK_RE = re.compile(
    r'<div\b[^>]*class="embed-files-wrapper"[^>]*data-files="([^"]*)"[^>]*>'
    r'<div\b[^>]*class="embed-files-container"[^>]*>'
    r'(?:<div\b[^>]*class="embed-file-item"[^>]*>.*?</div>)+'
    r"</div>"
    r"</div>",
    re.IGNORECASE | re.DOTALL,
)

_SERVE_URL_PREFIX = "/api/v1/attachment/serve/"


def replace_embed_file_blocks(html: str) -> str:
    """Replace each embed-files-wrapper block with Jinja attachment() calls."""

    def _replacer(m: re.Match) -> str:
        files = json.loads(_html.unescape(m.group(1)))

        jinja_lines = []
        for f in files:
            url = f.get("url", "") or f.get("name", "")
            filename = (
                url.split(_SERVE_URL_PREFIX)[-1] if _SERVE_URL_PREFIX in url else url
            )
            base = filename.rsplit(".", 1)[0] if "." in filename else filename
            slug = _LOCALE_SUFFIX_RE.sub("", base)
            jinja_lines.append(f"{{{{ attachment('{slug}') }}}}")

        jinja_content = "\n".join(jinja_lines)
        return f'<div data-embed-files="true">{jinja_content}</div>'

    return _EMBED_FILES_BLOCK_RE.sub(_replacer, html)


def replace_attachment_blocks(html: str) -> str:
    """Run all attachment block replacements in order.

    Only enhanced-image-wrapper and embed-files-wrapper need rewriting because
    those are the only block types that stored the deprecated
    /api/v1/attachment/serve/<filename> URL.

    embed-audio-wrapper and embed-video-wrapper were introduced together with the
    new serve-by-name endpoint and have always stored the attachment slug via
    getAttachmentRelativeUrl(attachment.name) — they are unaffected by the file
    rename that happens in the attachments migration and therefore require no
    content rewrite here.
    """
    html = replace_enhanced_image_blocks(html)
    html = replace_embed_file_blocks(html)
    return html
