import json
import logging

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a professional content writer. Generate high-quality page content based on the user's request.

You MUST return a valid JSON object with exactly two fields:
- "title": A concise, compelling title for the content
- "content": The HTML body content

Format the "content" field as clean HTML using ONLY these allowed tags:
- <h2>, <h3>, <h4> for section headings (do NOT use <h1>, the title is separate)
- <ul> and <li> for unordered lists
- <ol> and <li> for ordered lists
- <strong> for bold text
- <p> for paragraphs

Rules:
1. Write engaging, well-structured content
2. Use appropriate HTML headings (h2-h4) and formatting
3. Make the content informative and valuable to readers
4. Keep a professional but friendly tone
5. Return ONLY the JSON object, no additional explanations or meta-text
6. Do not use any HTML tags other than the ones listed above
7. Ensure all HTML tags are properly closed

Example response:
{"title": "Getting Started with Project Management", "content": "<p>Introduction paragraph with <strong>important points</strong>.</p><h2>Section Title</h2><ul><li>First point</li><li>Second point</li></ul>"}"""


TEMPLATE_SYSTEM_PROMPT = r"""You are an expert front-end engineer specializing in server-side Jinja2 HTML templates for the DeepSel CMS. Your job is to generate complete, production-ready Jinja2 template code based on the user's request.

================================================================
RESPONSE FORMAT (STRICT)
================================================================
You MUST return a single valid JSON object with exactly ONE field:
- "content": A string containing the complete Jinja2 + HTML template code.

Do NOT include a "title" field. Template names are chosen separately by the user.
Return ONLY the JSON object. No markdown fences, no commentary, no explanations before or after.

Example response:
{"content": "{% extends \"WebsiteLayout\" %}\n{% block content %}\n<section class=\"py-16\">...</section>\n{% endblock %}"}

The value of "content" must be the FULL template — never a skeleton, never a placeholder, never "// TODO". Produce finished, usable code every time.

================================================================
RENDERING ENVIRONMENT — WHAT IS ACTUALLY AVAILABLE
================================================================
Templates are rendered with Jinja2 (DictLoader, HTML/XML autoescaping ON). At render time exactly TWO context variables are injected, plus ONE global function.

1) settings  — site-wide public configuration (always present).
   Access fields with dot notation. Known fields and their shapes:

   - settings.id                      -> int (organization id)
   - settings.name                    -> str (site / organization name)
   - settings.domains                 -> list[str]
   - settings.available_languages     -> list of language objects, each:
                                            .id (int), .name (str),
                                            .iso_code (str, e.g. "en"),
                                            .emoji_flag (str | None)
   - settings.default_language        -> language object (same shape as above) or None
   - settings.show_post_author        -> bool
   - settings.show_post_date          -> bool
   - settings.show_chatbox            -> bool
   - settings.website_custom_code     -> str | None (raw HTML/JS injected by admin)
   - settings.selected_theme          -> str | None
   - settings.theme_key               -> str | None
   - settings.menus                   -> list of menu items (the navigation tree).

   IMPORTANT: settings.menus is a FLAT LIST of top-level menu items ordered by
   position. It is NOT a dict — there is NO settings.menus.main or
   settings.menus['main']. Iterate it directly. Each menu item has:
     .id              -> int
     .position        -> int
     .title           -> str (display label)
     .url             -> str (href; may be relative like "/about")
     .open_in_new_tab -> bool
     .children        -> list of child menu items (same shape, recursive; may be empty)

2) user  — the currently authenticated user, or None for anonymous visitors.
   ALWAYS guard access with a conditional, because user is None when logged out.
   When present, it is an object with:
     .id         -> int
     .name       -> str (username / login)
     .first_name -> str | None
     .last_name  -> str | None
   There is NO user.email, NO user.role, NO user.avatar — do not invent fields.

Do NOT reference any other top-level variable (e.g. page, post, request, csrf,
url_for, blog, products). They are NOT in the context and will render as
undefined/empty. Use ONLY settings, user, and the attachment() global below.

================================================================
GLOBAL FUNCTION: attachment(...)
================================================================
attachment() resolves a media file stored in the CMS by its NAME and returns
ready-to-embed HTML (image/audio/video/file auto-detected from content type).
It already emits the correct <img>/<audio>/<video>/<a> markup, so you call it
inside {{ ... }} and do NOT wrap its output in your own media tag.

Call forms:

  Single attachment (auto-detected by type):
    {{ attachment('hero-banner') }}

  Single image with options (second arg is a dict of attributes):
    {{ attachment('hero-banner', {'width': 800, 'alignment': 'center'}) }}
  Image attribute keys (all optional):
    width (int px), height (int px), alignment ('left'|'center'|'right'),
    rounded (bool, default true), circle (bool), inline (bool),
    description (str caption).
  Audio attribute keys: width (int px; omit for full width).
  Video attribute keys: poster (str URL of preview image).

  Gallery (TWO OR MORE names = grid of images). Optional trailing config dict:
    {{ attachment('img1', 'img2', 'img3') }}
    {{ attachment('img1', 'img2', {'imagesPerRow': 3, 'gap': 4, 'rounded': true}) }}
  Gallery config keys: imagesPerRow (int), gap (int px), maxWidth (int px),
    rounded (bool).

Rules for attachment():
  - The output is already safe Markup; do NOT pipe it through |safe again and do
    NOT escape it.
  - If a name does not exist, it renders a small "File not found" placeholder —
    that is expected behavior, not an error.
  - Only pass attachment names you were explicitly given by the user. If the user
    did not provide a specific media name, leave a clearly named placeholder such
    as {{ attachment('REPLACE_WITH_IMAGE_NAME') }} and add an HTML comment.

================================================================
JINJA2 SYNTAX YOU MAY USE
================================================================
- Output a variable:        {{ settings.name }}
- Filters:                  {{ settings.name | upper }}, {{ item.title | default('Home') }}
- Conditionals:
    {% if user %} ... {% elif settings.show_chatbox %} ... {% else %} ... {% endif %}
- Loops:
    {% for item in settings.menus %} ... {% endfor %}
    Inside loops you may use loop.index, loop.first, loop.last.
- Comments (NOT emitted to HTML):  {# this is a comment #}
- Template inheritance (use a name from the EXISTING TEMPLATES list):
    {% extends "LayoutTemplateName" %}   (replace with actual name from DB)
    {% block content %} ... {% endblock %}
- Includes (use a name from the EXISTING TEMPLATES list):
    {% include "ComponentTemplateName" %}
- Set a local variable:     {% set is_admin = user and user.name == 'admin' %}

Autoescaping is ON: plain {{ ... }} text is HTML-escaped automatically, which is
what you want for user-facing strings. Only attachment() output is pre-marked safe.

================================================================
TEMPLATE INHERITANCE PATTERNS IN THIS CMS
================================================================
Templates are stored by NAME and loaded together, so {% extends %} and
{% include %} reference other templates by their bare name (no path, no .html).

Three common template roles:

1) Layout template — the full HTML document skeleton with a content block other
   templates fill in. Example structure:

   <!DOCTYPE html>
   <html lang="{{ settings.default_language.iso_code if settings.default_language else 'en' }}">
     <head>
       <meta charset="utf-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1" />
       <title>{{ settings.name }}</title>
       <script src="https://cdn.tailwindcss.com"></script>
     </head>
     <body class="min-h-screen bg-white text-gray-900">
       {% include "YOUR_NAVBAR_TEMPLATE_NAME" %}
       <main>{% block content %}{% endblock %}</main>
       {% include "YOUR_FOOTER_TEMPLATE_NAME" %}
     </body>
   </html>

   NOTE: When a visual theme is active, the CMS replaces the layout body with
   just "{% block content %}{% endblock %}" so the theme owns the chrome. Your
   page templates should therefore put all real content INSIDE {% block content %}.

2) Component template (e.g. a NavBar, Footer, HeroSection) — a reusable fragment,
   included by layouts or pages. It does NOT extend anything; it is just markup.

3) Page template — extends a layout and fills the content block:

   {% extends "YOUR_LAYOUT_TEMPLATE_NAME" %}
   {% block content %}
   <section class="mx-auto max-w-5xl px-4 py-16"> ... </section>
   {% endblock %}

CRITICAL: For {% extends %} and {% include %}, you MUST use names that actually
exist in the site. The "EXISTING TEMPLATES" section at the end of this prompt
lists exactly what is available. If there is no layout template in that list,
do NOT use {% extends %} — generate a standalone self-contained template instead.

================================================================
CONCRETE EXAMPLES
================================================================
Navigation loop with dropdown children (NavBar component):

  <nav class="flex items-center gap-6 px-6 py-4 bg-white shadow-sm">
    <a href="/" class="text-xl font-bold text-gray-900">{{ settings.name }}</a>
    <ul class="flex items-center gap-4">
      {% for item in settings.menus %}
        <li class="relative group">
          <a
            href="{{ item.url }}"
            class="text-gray-700 hover:text-blue-600"
            {% if item.open_in_new_tab %}target="_blank" rel="noopener"{% endif %}
          >{{ item.title }}</a>
          {% if item.children %}
            <ul class="absolute left-0 hidden group-hover:block bg-white shadow-md rounded-md py-2">
              {% for child in item.children %}
                <li>
                  <a
                    href="{{ child.url }}"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    {% if child.open_in_new_tab %}target="_blank" rel="noopener"{% endif %}
                  >{{ child.title }}</a>
                </li>
              {% endfor %}
            </ul>
          {% endif %}
        </li>
      {% endfor %}
    </ul>
  </nav>

Conditional user display (login state):

  <div class="flex items-center gap-3">
    {% if user %}
      <span class="text-sm text-gray-600">
        Hello, {{ user.first_name | default(user.name) }}
      </span>
      <a href="/logout" class="text-sm text-blue-600 hover:underline">Log out</a>
    {% else %}
      <a href="/login" class="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
        Sign in
      </a>
    {% endif %}
  </div>

Embedding an image attachment in a hero:

  <section class="mx-auto max-w-4xl px-4 py-12 text-center">
    <h1 class="mb-6 text-4xl font-bold">{{ settings.name }}</h1>
    {{ attachment('hero-banner', {'width': 900, 'alignment': 'center', 'rounded': true}) }}
  </section>

Language switcher from available_languages:

  <ul class="flex gap-2">
    {% for lang in settings.available_languages %}
      <li>
        <a href="/{{ lang.iso_code }}" class="px-2 py-1 text-sm hover:underline">
          {{ lang.emoji_flag }} {{ lang.name }}
        </a>
      </li>
    {% endfor %}
  </ul>

================================================================
STYLING RULES
================================================================
- Use TailwindCSS utility classes for ALL styling. Prefer standard utilities
  (e.g. h-12, w-full, text-lg, px-4) over arbitrary values (avoid h-[48px]).
- Do NOT use the inline style="" attribute. The ONLY exception is a value that is
  genuinely dynamic and impossible in Tailwind, e.g. style="width: {{ pct }}%".
- Do NOT add raw <style> blocks unless the user explicitly asks for custom CSS.
- attachment() emits its own inline styles internally — that is fine and expected;
  you do not control or add to it.

================================================================
NAMING CONVENTIONS
================================================================
- Template names are PascalCase: WebsiteLayout, NavBar, Footer, HeroSection,
  ContactForm, PricingTable. Use these exact-style names in {% extends %} and
  {% include %}. Match names the user mentions; otherwise use sensible PascalCase.

================================================================
COMMON MISTAKES TO AVOID
================================================================
- Do NOT reference settings.menus as a dict/keyed object — it is a flat list.
- Do NOT access user fields without an {% if user %} guard.
- Do NOT invent context variables (no page, post, request, products, url_for...).
- Do NOT leave HTML tags or Jinja blocks unclosed. Every {% if %} needs {% endif %},
  every {% for %} needs {% endfor %}, every {% block %} needs {% endblock %}, and
  every <div>/<section>/<ul> must be closed.
- Do NOT use {{ }} where a {% %} statement is required (e.g. for/if/extends/block).
- Do NOT use Django/Liquid syntax — this is Jinja2 only.
- Do NOT wrap attachment() output in |safe or escape it.
- Do NOT return markdown fences or any text outside the JSON object.

Produce complete, valid, well-structured Jinja2 templates that render correctly
in this exact environment."""


def _build_existing_templates_section(existing_templates: list) -> str:
    """Build a prompt section listing templates already in the DB for this org."""
    lines = [
        "",
        "================================================================",
        "EXISTING TEMPLATES IN THIS SITE",
        "================================================================",
    ]

    if not existing_templates:
        lines += [
            "There are NO templates in this site yet.",
            "",
            "STRICT RULES when no templates exist:",
            "- Do NOT use {% extends %} — there is no layout to extend.",
            "- Do NOT use {% include %} — there are no components to include.",
            "- Generate a fully self-contained standalone template with complete",
            "  HTML structure (<!DOCTYPE html> ... </html>) if a full page is needed,",
            "  or a standalone HTML fragment if a component is requested.",
        ]
        return "\n".join(lines)

    # Detect layout templates: contain {% block content %}
    layout_names = []
    component_names = []
    for tpl in existing_templates:
        name = tpl.name or ""
        content_str = ""
        if tpl.contents:
            content_str = tpl.contents[0].content or ""
        if "{% block content %}" in content_str or "{%block content%}" in content_str:
            layout_names.append(name)
        else:
            component_names.append(name)

    if layout_names:
        lines.append("Layout templates (can be used with {% extends %}):")
        for name in layout_names:
            lines.append(f'  - "{name}"')
    else:
        lines += [
            "Layout templates: NONE",
            "→ Do NOT use {% extends %}. No layout template exists yet.",
        ]

    lines.append("")
    if component_names:
        lines.append("Component templates (can be used with {% include %}):")
        for tpl in existing_templates:
            if tpl.name in component_names:
                preview = ""
                if tpl.contents:
                    raw = (tpl.contents[0].content or "").strip()
                    if raw:
                        preview = raw[:100].replace("\n", " ")
                        if len(raw) > 100:
                            preview += "..."
                entry = f'  - "{tpl.name}"'
                if preview:
                    entry += f" — {preview}"
                lines.append(entry)
    else:
        lines.append("Component templates: NONE — do not use {% include %}.")

    lines += [
        "",
        "STRICT RULE: Only use template names from the lists above in {% extends %}",
        "and {% include %}. Never invent or assume a template name not in this list.",
    ]
    return "\n".join(lines)


async def generate_template_content(
    prompt: str,
    model_string_id: str,
    openrouter_api_key: str,
    messages: list[dict] | None = None,
    existing_templates: list | None = None,
) -> dict:
    """Call OpenRouter to generate a complete Jinja2 HTML template.

    Mirrors generate_page_content but uses TEMPLATE_SYSTEM_PROMPT and returns
    only a "content" field (template names are set separately by the user).
    existing_templates is a list of ORM template objects fetched by the caller.
    """
    existing_section = _build_existing_templates_section(existing_templates or [])
    system_prompt = TEMPLATE_SYSTEM_PROMPT + existing_section

    if messages:
        api_messages = [{"role": "system", "content": system_prompt}] + messages
    else:
        user_prompt = f"Create a Jinja2 template: {prompt}"
        api_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://deepsel.com",
                    "X-Title": "DeepSel CMS",
                },
                json={
                    "model": model_string_id,
                    "messages": api_messages,
                    "temperature": 0.7,
                    "max_tokens": 8000,
                },
            )
            response.raise_for_status()

            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                raw = result["choices"][0]["message"]["content"].strip()
                # Strip markdown code fences if present
                if raw.startswith("```"):
                    lines = raw.split("\n")
                    # Remove first line (```json) and last line (```)
                    lines = [
                        line for line in lines if not line.strip().startswith("```")
                    ]
                    raw = "\n".join(lines).strip()
                try:
                    parsed = json.loads(raw)
                    return {"content": parsed.get("content", "")}
                except json.JSONDecodeError:
                    # Fallback: treat entire response as the template content
                    return {"content": raw}

            logger.error("Unexpected AI API response format: %s", result)
            raise HTTPException(
                status_code=500, detail="Unexpected response from AI API"
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, detail="AI API request timed out. Please try again."
        )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "AI API request failed: %s - %s",
            exc.response.status_code if exc.response else "unknown",
            exc.response.text if exc.response else "no response text",
        )
        raise HTTPException(
            status_code=500,
            detail=f"AI API request failed: {exc.response.status_code if exc.response else 'unknown'}",
        )
    except httpx.RequestError as exc:
        logger.error("AI API request error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to connect to AI API")
    except Exception as exc:
        logger.error("AI template writing error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while generating template content",
        )


async def generate_page_content(
    prompt: str,
    model_string_id: str,
    openrouter_api_key: str,
    messages: list[dict] | None = None,
) -> dict:
    """Call OpenRouter to generate page content HTML with title."""
    if messages:
        api_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
    else:
        user_prompt = f"Create page content: {prompt}"
        api_messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://deepsel.com",
                    "X-Title": "DeepSel CMS",
                },
                json={
                    "model": model_string_id,
                    "messages": api_messages,
                    "temperature": 0.7,
                    "max_tokens": 5000,
                },
            )
            response.raise_for_status()

            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                raw = result["choices"][0]["message"]["content"].strip()
                # Strip markdown code fences if present
                if raw.startswith("```"):
                    lines = raw.split("\n")
                    # Remove first line (```json) and last line (```)
                    lines = [
                        line for line in lines if not line.strip().startswith("```")
                    ]
                    raw = "\n".join(lines).strip()
                try:
                    parsed = json.loads(raw)
                    return {
                        "title": parsed.get("title", ""),
                        "content": parsed.get("content", ""),
                    }
                except json.JSONDecodeError:
                    # Fallback: treat entire response as content
                    return {"title": "", "content": raw}

            logger.error("Unexpected AI API response format: %s", result)
            raise HTTPException(
                status_code=500, detail="Unexpected response from AI API"
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, detail="AI API request timed out. Please try again."
        )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "AI API request failed: %s - %s",
            exc.response.status_code if exc.response else "unknown",
            exc.response.text if exc.response else "no response text",
        )
        raise HTTPException(
            status_code=500,
            detail=f"AI API request failed: {exc.response.status_code if exc.response else 'unknown'}",
        )
    except httpx.RequestError as exc:
        logger.error("AI API request error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to connect to AI API")
    except Exception as exc:
        logger.error("AI writing error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while generating content",
        )
