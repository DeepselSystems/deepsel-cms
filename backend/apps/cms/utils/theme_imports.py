"""Utility for generating theme imports in [...slug].astro."""

import os
import logging
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
        lang_folders = [f for f in all_folders if f in valid_language_codes]
        theme_folders = [f for f in all_folders if f not in valid_language_codes]

        # logger.info(f"Theme folders: {theme_folders}")
        # logger.info(f"Language folders: {lang_folders}")

        # Generate imports
        imports = []
        theme_map_entries = {}

        # Add default theme imports (Index and 404)
        for theme in theme_folders:
            # Index component
            component_name = theme.capitalize().replace("-", "") + "Index"
            import_path = f"../../../themes/{theme}/Index.astro"
            imports.append(f'import {component_name} from "{import_path}";')

            # 404 component
            component_404_name = theme.capitalize().replace("-", "") + "404"
            import_path_404 = f"../../../themes/{theme}/404.astro"
            imports.append(f'import {component_404_name} from "{import_path_404}";')

            if theme not in theme_map_entries:
                theme_map_entries[theme] = {}
            theme_map_entries[theme]["default"] = component_name
            theme_map_entries[theme]["404"] = component_404_name

        # Add language-specific theme imports
        for lang in lang_folders:
            lang_themes_dir = os.path.join(themes_dir, lang)
            if not os.path.isdir(lang_themes_dir):
                continue

            lang_themes = [
                d
                for d in os.listdir(lang_themes_dir)
                if os.path.isdir(os.path.join(lang_themes_dir, d))
            ]

            for theme in lang_themes:
                # Create component name: ThemeLangIndex (e.g., InterlinkdDeIndex)
                component_name = (
                    theme.capitalize().replace("-", "")
                    + lang.capitalize().replace("_", "").replace("@", "")
                    + "Index"
                )
                import_path = f"../../../themes/{lang}/{theme}/Index.astro"
                imports.append(f'import {component_name} from "{import_path}";')

                if theme not in theme_map_entries:
                    theme_map_entries[theme] = {}
                theme_map_entries[theme][lang] = component_name

        # Generate theme map code
        theme_map_lines = ["const themeMap: Record<string, Record<string, any>> = {"]
        for theme, variants in theme_map_entries.items():
            theme_map_lines.append(f"  '{theme}': {{")
            for variant, component_name in variants.items():
                theme_map_lines.append(f"    '{variant}': {component_name},")
            theme_map_lines.append("  },")
        theme_map_lines.append("};")
        theme_map_code = "\n".join(theme_map_lines)

        # Get default theme and component
        default_theme = theme_folders[0] if theme_folders else "interlinked"
        default_component = theme_map_entries.get(default_theme, {}).get(
            "default", "InterlinkdIndex"
        )

        # Generate the full file content
        file_content = f"""---
import {{ fetchPageData, parseSlugForLangAndPath }} from "@deepsel/cms-utils";
import type {{ PageData }} from "@deepsel/cms-utils";
// import getAuthToken from "../utils/getAuthToken";

// Import all theme variants statically
{chr(10).join(imports)}

const {{ slug = "/" }} = Astro.params;
const {{ lang, path }} = parseSlugForLangAndPath(slug);
const isPreviewMode = Astro.url.searchParams.get('preview') === 'true';
// const authToken = getAuthToken(Astro);
// console.log('authToken', authToken);

const pageData: PageData = await fetchPageData(lang, path, isPreviewMode, null, Astro.request);

// Get theme and default language from pageData
const selectedTheme = pageData.public_settings?.selected_theme || '{default_theme}';
const defaultLanguageIsoCode = pageData.public_settings?.default_language?.iso_code || null;

// Map of theme components
{theme_map_code}

// Determine which theme component to use
let ThemeComponent;
if (pageData.notFound) {{
  // Use 404 component when page is not found
  ThemeComponent = themeMap[selectedTheme]?.['404'] || {default_component.replace('Index', '404')};
  // Set HTTP status to 404
  Astro.response.status = 404;
}} else {{
  // Use regular index component for normal pages
  const isNonDefaultLang = lang && defaultLanguageIsoCode && lang !== defaultLanguageIsoCode;
  const themeVariant = isNonDefaultLang ? lang : 'default';
  ThemeComponent = themeMap[selectedTheme]?.[themeVariant] || themeMap[selectedTheme]?.['default'] || {default_component};
}}

---

<ThemeComponent pageData={{pageData}} />
"""

        # Write the file
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(file_content)

        logger.info(f"Generated [...slug].astro with {len(imports)} theme imports")

    except Exception as e:
        logger.error(f"Error generating theme imports: {e}")
        import traceback

        traceback.print_exc()
