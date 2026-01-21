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
    Generate static imports for all theme variants in client/src/themes.ts
    This is idempotent and can be called multiple times safely.
    """
    try:
        themes_dir = os.path.join(data_dir_path, "themes")
        output_file = os.path.join(data_dir_path, "client/src/themes.ts")

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

        # System keys mapping (matches themeSystemKeys in themes.ts)
        system_key_mapping = {
            "index": "Page",
            "blog": "BlogList",
            "single-blog": "BlogPost",
            "404": "NotFound",
        }

        # Generate imports + theme map entries
        imports: list[str] = []
        theme_map_entries: dict[str, dict[str, str]] = {}

        def _to_component_name(theme: str, filename: str, lang_suffix: str = "") -> str:
            theme_part = theme.capitalize().replace("-", "")
            file_base = filename[:-6] if filename.endswith(".astro") else filename
            page_part = file_base.capitalize().replace("-", "")
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
                component_name = _to_component_name(theme, astro_file)
                import_path = f"../../themes/{theme}/{astro_file}"
                imports.append(f'import {component_name} from "{import_path}";')

                # Use system key if available, otherwise use page_key
                system_key = system_key_mapping.get(page_key, page_key)
                theme_map_entries[theme][system_key] = component_name

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
                    component_name = _to_component_name(theme, astro_file, lang_suffix)
                    import_path = f"../../themes/{lang}/{theme}/{astro_file}"
                    imports.append(f'import {component_name} from "{import_path}";')

                    # For language-specific variants, use lang:systemKey format
                    system_key = system_key_mapping.get(page_key, page_key)
                    map_key = f"{lang}:{system_key}"
                    theme_map_entries[theme][map_key] = component_name

        # Generate theme map code
        theme_map_lines = ["export const themeMap = {"]
        for theme, variants in theme_map_entries.items():
            theme_map_lines.append(f"  '{theme}': {{")
            for variant, component_name in variants.items():
                # Use themeSystemKeys reference for system keys
                if variant in ["Page", "BlogList", "BlogPost", "NotFound"]:
                    theme_map_lines.append(
                        f"    [themeSystemKeys.{variant}]: {component_name},"
                    )
                else:
                    theme_map_lines.append(f"    '{variant}': {component_name},")
            theme_map_lines.append("  },")
        theme_map_lines.append("};")
        theme_map_code = "\n".join(theme_map_lines)

        # Generate themes.ts file content
        file_content = f"""// THEME_IMPORTS_START (auto-managed)
{chr(10).join(imports)}
// THEME_IMPORTS_END


export const themeSystemKeys = {{
  Page: 'index',
  BlogList: 'blog',
  BlogPost: 'single-blog',
  NotFound: '404',
}};


// THEME_MAP_START (auto-managed)
{theme_map_code}
// THEME_MAP_END

export type ThemeName = keyof typeof themeMap;
"""

        # Write or update themes.js file
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        if os.path.exists(output_file):
            with open(output_file, "r", encoding="utf-8") as f:
                existing = f.read()

            updated = _patch_themes_ts(
                content=existing,
                import_lines=imports,
                theme_map_code=theme_map_code,
            )

            if updated != existing:
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(updated)
                logger.info(f"Updated themes.ts with {len(imports)} imports")
            # else:
            # logger.info("No changes needed for themes.ts")

        else:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(file_content)
            logger.info(f"Created themes.ts with {len(imports)} imports")

    except Exception as e:
        logger.error(f"Error generating theme imports: {e}")
        import traceback

        traceback.print_exc()


def _patch_themes_ts(
    *,
    content: str,
    import_lines: list[str],
    theme_map_code: str,
) -> str:
    updated = content

    def _replace_between_markers(
        text: str, start_marker: str, end_marker: str, replacement: str
    ) -> tuple[str, bool]:
        start_idx = text.find(start_marker)
        if start_idx == -1:
            return text, False
        start_line_end = text.find("\n", start_idx)
        if start_line_end == -1:
            return text, False

        end_idx = text.find(end_marker, start_line_end + 1)
        if end_idx == -1:
            return text, False
        end_line_start = text.rfind("\n", 0, end_idx)
        if end_line_start == -1:
            end_line_start = end_idx
        else:
            end_line_start = end_line_start + 1

        new_text = text[: start_line_end + 1] + replacement + text[end_line_start:]
        return new_text, True

    new_import_block = "\n".join(import_lines) + "\n"
    updated, _ = _replace_between_markers(
        updated,
        "// THEME_IMPORTS_START (auto-managed)",
        "// THEME_IMPORTS_END",
        new_import_block,
    )

    updated, _ = _replace_between_markers(
        updated,
        "// THEME_MAP_START (auto-managed)",
        "// THEME_MAP_END",
        theme_map_code + "\n",
    )

    return updated
