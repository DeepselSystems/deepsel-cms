"""Unit tests for the pure HTML-rewriting helpers used by the v1.0.11 attachment
multi-lang migration. These functions take HTML in and return HTML out — no DB
or filesystem involvement — so they get covered here with plain string asserts."""

import json

from apps.core.migrations.v1_0_11_attachment_multilang._utils import (
    replace_attachment_blocks,
    replace_embed_file_blocks,
    replace_enhanced_image_blocks,
)

# ---------- replace_enhanced_image_blocks ----------


def test_enhanced_image_block_rewrites_to_jinja():
    html = (
        '<div class="enhanced-image-wrapper" data-alignment="left" data-rounded="true">'
        '<img src="/api/v1/attachment/serve/welcome_en.jpg" alt="x">'
        '<div class="enhanced-image-description">hi there</div>'
        "</div>"
    )

    out = replace_enhanced_image_blocks(html)

    assert "{{ attachment('welcome'" in out  # nosec B101
    assert "/api/v1/attachment/serve/" not in out  # nosec B101
    assert 'data-enhanced-image="true"' in out  # nosec B101

    payload_str = out.split("{{ attachment('welcome', ")[1].split(") }}")[0]
    payload = json.loads(payload_str)
    assert payload["alignment"] == "left"  # nosec B101
    assert payload["rounded"] is True  # nosec B101
    assert payload["circle"] is False  # nosec B101
    assert payload["description"] == "hi there"  # nosec B101


def test_enhanced_image_strips_known_locale_suffixes_only():
    # Each of _de _en _fr _it should be stripped from the slug
    for suffix in ("_de", "_en", "_fr", "_it"):
        html = (
            f'<div class="enhanced-image-wrapper" data-alignment="center">'
            f'<img src="/api/v1/attachment/serve/banner{suffix}.png">'
            f'<div class="enhanced-image-description"></div>'
            f"</div>"
        )
        out = replace_enhanced_image_blocks(html)
        assert "{{ attachment('banner'," in out  # nosec B101


def test_enhanced_image_leaves_unknown_suffix_alone():
    html = (
        '<div class="enhanced-image-wrapper" data-alignment="center">'
        '<img src="/api/v1/attachment/serve/banner_es.png">'
        '<div class="enhanced-image-description"></div>'
        "</div>"
    )
    out = replace_enhanced_image_blocks(html)
    assert "{{ attachment('banner_es'," in out  # nosec B101


def test_enhanced_image_extracts_numeric_dims():
    html = (
        '<div class="enhanced-image-wrapper" data-width="500" data-height="300">'
        '<img src="/api/v1/attachment/serve/x_en.jpg">'
        '<div class="enhanced-image-description"></div>'
        "</div>"
    )
    payload_str = (
        replace_enhanced_image_blocks(html)
        .split("{{ attachment('x', ")[1]
        .split(") }}")[0]
    )
    payload = json.loads(payload_str)
    assert payload["width"] == 500  # nosec B101
    assert payload["height"] == 300  # nosec B101


def test_enhanced_image_ignores_nonnumeric_dims():
    html = (
        '<div class="enhanced-image-wrapper" data-width="auto" data-height="">'
        '<img src="/api/v1/attachment/serve/x_en.jpg">'
        '<div class="enhanced-image-description"></div>'
        "</div>"
    )
    payload_str = (
        replace_enhanced_image_blocks(html)
        .split("{{ attachment('x', ")[1]
        .split(") }}")[0]
    )
    payload = json.loads(payload_str)
    assert "width" not in payload  # nosec B101
    assert "height" not in payload  # nosec B101


def test_enhanced_image_default_attributes_when_missing():
    html = (
        '<div class="enhanced-image-wrapper">'
        '<img src="/api/v1/attachment/serve/x_en.jpg">'
        '<div class="enhanced-image-description"></div>'
        "</div>"
    )
    payload_str = (
        replace_enhanced_image_blocks(html)
        .split("{{ attachment('x', ")[1]
        .split(") }}")[0]
    )
    payload = json.loads(payload_str)
    assert payload["alignment"] == "center"  # nosec B101
    assert payload["rounded"] is True  # nosec B101
    assert payload["circle"] is False  # nosec B101
    assert payload["inline"] is False  # nosec B101
    assert "description" not in payload  # nosec B101


def test_enhanced_image_multiple_blocks_in_one_doc():
    html = (
        "<p>intro</p>"
        '<div class="enhanced-image-wrapper" data-alignment="left">'
        '<img src="/api/v1/attachment/serve/a_en.jpg">'
        '<div class="enhanced-image-description"></div>'
        "</div>"
        "<p>middle</p>"
        '<div class="enhanced-image-wrapper" data-alignment="right">'
        '<img src="/api/v1/attachment/serve/b_de.jpg">'
        '<div class="enhanced-image-description"></div>'
        "</div>"
    )
    out = replace_enhanced_image_blocks(html)
    assert out.count("{{ attachment('a'") == 1  # nosec B101
    assert out.count("{{ attachment('b'") == 1  # nosec B101
    assert "intro" in out and "middle" in out  # nosec B101


def test_enhanced_image_no_match_leaves_html_untouched():
    html = '<p>some normal paragraph with <img src="/elsewhere.jpg"></p>'
    assert replace_enhanced_image_blocks(html) == html  # nosec B101


# ---------- replace_embed_file_blocks ----------


def test_embed_file_block_rewrites_to_jinja_lines():
    files = [
        {"url": "/api/v1/attachment/serve/report_en.pdf"},
        {"url": "/api/v1/attachment/serve/data_fr.csv"},
    ]
    files_json = json.dumps(files).replace('"', "&quot;")
    html = (
        f'<div class="embed-files-wrapper" data-files="{files_json}" data-embed-files="true">'
        f'<div class="embed-files-container">'
        f'<div class="embed-file-item">file one</div>'
        f'<div class="embed-file-item">file two</div>'
        f"</div></div>"
    )

    out = replace_embed_file_blocks(html)

    assert "{{ attachment('report') }}" in out  # nosec B101
    assert "{{ attachment('data') }}" in out  # nosec B101
    assert 'data-embed-files="true"' in out  # nosec B101
    assert "/api/v1/attachment/serve/" not in out  # nosec B101


def test_embed_file_uses_name_when_url_missing():
    files = [{"name": "fallback_de.txt"}]
    files_json = json.dumps(files).replace('"', "&quot;")
    html = (
        f'<div class="embed-files-wrapper" data-files="{files_json}">'
        f'<div class="embed-files-container">'
        f'<div class="embed-file-item">x</div>'
        f"</div></div>"
    )
    out = replace_embed_file_blocks(html)
    assert "{{ attachment('fallback') }}" in out  # nosec B101


def test_embed_file_no_match_leaves_html_untouched():
    html = "<p>nothing embed-related here</p>"
    assert replace_embed_file_blocks(html) == html  # nosec B101


# ---------- replace_attachment_blocks (composed) ----------


def test_replace_attachment_blocks_runs_both_replacements():
    files = [{"url": "/api/v1/attachment/serve/spec_en.pdf"}]
    files_json = json.dumps(files).replace('"', "&quot;")
    html = (
        '<div class="enhanced-image-wrapper" data-alignment="center">'
        '<img src="/api/v1/attachment/serve/hero_en.jpg">'
        '<div class="enhanced-image-description"></div>'
        "</div>"
        f'<div class="embed-files-wrapper" data-files="{files_json}">'
        '<div class="embed-files-container">'
        '<div class="embed-file-item">x</div>'
        "</div></div>"
    )
    out = replace_attachment_blocks(html)
    assert "{{ attachment('hero'" in out  # nosec B101
    assert "{{ attachment('spec') }}" in out  # nosec B101
    assert "/api/v1/attachment/serve/" not in out  # nosec B101


def test_replace_attachment_blocks_idempotent_on_already_migrated_content():
    """Running the migration twice on already-rewritten content must not corrupt it."""
    html = (
        '<div data-enhanced-image="true">{{ attachment(\'hero\', {"alignment":"left"}) }}</div>'
        "<div data-embed-files=\"true\">{{ attachment('spec') }}</div>"
    )
    first = replace_attachment_blocks(html)
    second = replace_attachment_blocks(first)
    assert first == html  # nosec B101 — no old wrappers present, nothing to rewrite
    assert second == html  # nosec B101
