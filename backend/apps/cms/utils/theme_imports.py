"""Keep `client/src/pages/[...slug].astro` theme wiring in sync.

This utility updates only the dynamic theme sections of the Astro page (static theme
`import` lines, the `themeMap` block, and related default fallbacks) based on what is
present in the `themes/` directory.

The rest of `[...slug].astro` is treated as developer-authored source of truth and is
left untouched to avoid accidental overwrites.
"""

import os
import logging
import re
from .language_codes import get_valid_language_codes

logger = logging.getLogger(__name__)


def generate_theme_imports(data_dir_path: str):
    """
    Generate static imports for all theme variants in [...slug].astro
    This is idempotent and can be called multiple times safely.
    """
    try:
        themes_dir = os.path.join(data_dir_path, "themes")
        output_file = os.path.join(data_dir_path, "client/src/pages/[...slug].astro")

        if not os.path.exists(themes_dir):
            logger.info(f"Themes directory not found: {themes_dir}")
            return

        # Get valid language codes from database
        valid_language_codes = get_valid_language_codes()

        # Read all folders in themes directory
        all_folders = [
            d
            for d in os.listdir(themes_dir)
            if os.path.isdir(os.path.join(themes_dir, d))
        ]

        # Separate language folders from theme folders
        lang_folders = sorted([f for f in all_folders if f in valid_language_codes])
        theme_folders = sorted(
            [f for f in all_folders if f not in valid_language_codes]
        )

        # logger.info(f"Theme folders: {theme_folders}")
        # logger.info(f"Language folders: {lang_folders}")

        # Generate imports + theme map entries
        imports: list[str] = []
        theme_map_entries: dict[str, dict[str, str]] = {}

        def _to_component_name(theme: str, page_key: str, lang_suffix: str = "") -> str:
            theme_part = theme.capitalize().replace("-", "")
            page_part = page_key.capitalize().replace("-", "")
            return f"{theme_part}{lang_suffix}{page_part}"

        # Scan all .astro files in each theme folder
        for theme in theme_folders:
            theme_path = os.path.join(themes_dir, theme)
            astro_files = sorted(
                [
                    f
                    for f in os.listdir(theme_path)
                    if f.endswith(".astro")
                    and os.path.isfile(os.path.join(theme_path, f))
                ]
            )

            if theme not in theme_map_entries:
                theme_map_entries[theme] = {}

            for astro_file in astro_files:
                page_key = astro_file[:-6].lower()  # remove .astro, lowercase
                component_name = _to_component_name(theme, page_key)
                import_path = f"../../../themes/{theme}/{astro_file}"
                imports.append(f'import {component_name} from "{import_path}";')
                theme_map_entries[theme][page_key] = component_name

        # Add language-specific theme imports
        for lang in lang_folders:
            lang_themes_dir = os.path.join(themes_dir, lang)
            if not os.path.isdir(lang_themes_dir):
                continue

            lang_themes = sorted(
                [
                    d
                    for d in os.listdir(lang_themes_dir)
                    if os.path.isdir(os.path.join(lang_themes_dir, d))
                ]
            )

            for theme in lang_themes:
                theme_path = os.path.join(lang_themes_dir, theme)
                astro_files = sorted(
                    [
                        f
                        for f in os.listdir(theme_path)
                        if f.endswith(".astro")
                        and os.path.isfile(os.path.join(theme_path, f))
                    ]
                )

                if theme not in theme_map_entries:
                    theme_map_entries[theme] = {}

                lang_suffix = lang.capitalize().replace("_", "").replace("@", "")
                for astro_file in astro_files:
                    page_key = astro_file[:-6].lower()
                    map_key = f"{lang}:{page_key}"
                    component_name = _to_component_name(theme, page_key, lang_suffix)
                    import_path = f"../../../themes/{lang}/{theme}/{astro_file}"
                    imports.append(f'import {component_name} from "{import_path}";')
                    theme_map_entries[theme][map_key] = component_name

        # Generate theme map code
        theme_map_lines = ["const themeMap: Record<string, Record<string, any>> = {"]
        for theme, variants in theme_map_entries.items():
            theme_map_lines.append(f"  '{theme}': {{")
            for variant, component_name in variants.items():
                theme_map_lines.append(f"    '{variant}': {component_name},")
            theme_map_lines.append("  },")
        theme_map_lines.append("};")
        theme_map_code = "\n".join(theme_map_lines)

        # Choose stable defaults for fallbacks (only used to keep existing file compilable)
        default_theme = theme_folders[0] if theme_folders else "interlinked"
        default_index_component = theme_map_entries.get(default_theme, {}).get(
            "index", "InterlinkedIndex"
        )
        default_404_component = theme_map_entries.get(default_theme, {}).get(
            "404", "Interlinked404"
        )

        # Patch existing Astro file instead of regenerating it (keeps it always in sync)
        if not os.path.exists(output_file):
            logger.error(f"Target Astro file not found: {output_file}")
            return

        with open(output_file, "r", encoding="utf-8") as f:
            existing = f.read()

        updated = _patch_slug_astro(
            astro_content=existing,
            import_lines=imports,
            theme_map_code=theme_map_code,
            default_theme=default_theme,
            default_index_component=default_index_component,
            default_404_component=default_404_component,
        )

        if updated != existing:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(updated)
            logger.info(
                f"Updated [...slug].astro dynamic theme sections with {len(imports)} imports"
            )
        else:
            logger.info("No changes needed for [...slug].astro dynamic theme sections")

    except Exception as e:
        logger.error(f"Error generating theme imports: {e}")
        import traceback

        traceback.print_exc()


def _patch_slug_astro(
    *,
    astro_content: str,
    import_lines: list[str],
    theme_map_code: str,
    default_theme: str,
    default_index_component: str,
    default_404_component: str,
) -> str:
    updated = astro_content

    def _replace_between_markers(
        content: str, start_marker: str, end_marker: str, replacement: str
    ) -> tuple[str, bool]:
        start_idx = content.find(start_marker)
        if start_idx == -1:
            return content, False
        start_line_end = content.find("\n", start_idx)
        if start_line_end == -1:
            return content, False

        end_idx = content.find(end_marker, start_line_end + 1)
        if end_idx == -1:
            return content, False
        end_line_start = content.rfind("\n", 0, end_idx)
        if end_line_start == -1:
            end_line_start = end_idx
        else:
            end_line_start = end_line_start + 1

        new_content = (
            content[: start_line_end + 1] + replacement + content[end_line_start:]
        )
        return new_content, True

    fm_delims = list(re.finditer(r"^---\s*$", updated, flags=re.MULTILINE))
    if len(fm_delims) >= 2:
        fm_start = fm_delims[0].end()
        fm_end = fm_delims[1].start()
        frontmatter = updated[fm_start:fm_end]
        frontmatter = re.sub(
            r'^\s*import\s+\w+\s+from\s+"\.\./\.\./\.\./themes/[^\"]+"\s*;\s*\n',
            "",
            frontmatter,
            flags=re.MULTILINE,
        )
        updated = updated[:fm_start] + frontmatter + updated[fm_end:]

    new_import_block = "\n".join(import_lines) + "\n"
    updated, used_markers = _replace_between_markers(
        updated,
        "// THEME_IMPORTS_START (auto-managed)",
        "// THEME_IMPORTS_END",
        new_import_block,
    )
    if not used_markers:
        updated = re.sub(
            r'(?:^\s*import\s+\w+\s+from\s+"\.\./\.\./\.\./themes/[^\"]+"\s*;\s*\n)+(?:^\s*\n)*(?=^\s*//\s*Import all theme variants statically.*$)',
            "",
            updated,
            flags=re.MULTILINE,
        )

        import_anchor_prefix = "// Import all theme variants statically"
        anchor_match = re.search(
            r"^\s*//\s*Import all theme variants statically.*$",
            updated,
            flags=re.MULTILINE,
        )
        if not anchor_match:
            raise ValueError(
                "Could not find theme import anchor in [...slug].astro (expected a line starting with: "
                f"{import_anchor_prefix})"
            )

        anchor_line_end = updated.find("\n", anchor_match.start())
        if anchor_line_end == -1:
            raise ValueError("Unexpected [...slug].astro format: missing newline")

        scan_pos = anchor_line_end + 1
        import_block_start = scan_pos
        while True:
            line_end = updated.find("\n", scan_pos)
            if line_end == -1:
                line_end = len(updated)
            line = updated[scan_pos:line_end]
            if line.strip() == "":
                scan_pos = line_end + 1
                continue
            if not line.startswith("import "):
                break
            scan_pos = line_end + 1

        import_block_end = scan_pos
        updated = (
            updated[:import_block_start] + new_import_block + updated[import_block_end:]
        )

    # 2) Replace selectedTheme default fallback (keeps file compilable as themes change)
    updated = re.sub(
        r"(const\s+selectedTheme\s*=\s*pageData\.public_settings\?\.selected_theme\s*\|\|\s*)'[^']*'(\s*;)",
        rf"\1'{default_theme}'\2",
        updated,
        flags=re.MULTILINE,
    )

    updated, used_theme_map_markers = _replace_between_markers(
        updated,
        "// THEME_MAP_START (auto-managed)",
        "// THEME_MAP_END",
        theme_map_code + "\n",
    )
    if not used_theme_map_markers:
        theme_map_start = re.search(
            r"^const\s+themeMap:.*=\s*\{$",
            updated,
            flags=re.MULTILINE,
        )
        if not theme_map_start:
            raise ValueError("Could not find `themeMap` start in [...slug].astro")

        after_start = updated[theme_map_start.start() :]
        end_rel = after_start.find("};")
        if end_rel == -1:
            raise ValueError(
                "Could not find end of `themeMap` block in [...slug].astro"
            )

        theme_map_end_abs = theme_map_start.start() + end_rel + len("};")
        updated = (
            updated[: theme_map_start.start()]
            + theme_map_code
            + updated[theme_map_end_abs:]
        )

    # 4) Replace fallback components so they always refer to an imported component
    updated = re.sub(
        r"(themeMap\[selectedTheme\]\?\.\['404'\]\s*\|\|\s*themeMap\[selectedTheme\]\?\.\['index'\]\s*\|\|\s*)([A-Za-z0-9_]+)(\s*;)",
        rf"\1{default_index_component}\3",
        updated,
        flags=re.MULTILINE,
    )

    updated = re.sub(
        r"(themeMap\[selectedTheme\]\?\.\['index'\]\s*\|\|\s*)([A-Za-z0-9_]+)(\s*;)",
        rf"\1{default_index_component}\3",
        updated,
        flags=re.MULTILINE,
    )

    return updated
