from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def get_cms_settings() -> dict:
        """Get the current CMS organization settings (languages, theme, blog options, AI config)."""
        result = await client.get("/organization", params={"skip": 0, "limit": 1})
        items = result.get("items", result) if isinstance(result, dict) else result
        return items[0] if items else {}

    @mcp.tool()
    async def update_cms_settings(
        id: int,
        selected_theme: str | None = None,
        default_language_id: int | None = None,
        auto_translate_pages: bool | None = None,
        auto_translate_posts: bool | None = None,
        auto_translate_components: bool | None = None,
        show_post_author: bool | None = None,
        show_post_date: bool | None = None,
        blog_posts_per_page: int | None = None,
        show_chatbox: bool | None = None,
        website_custom_code: str | None = None,
    ) -> dict:
        """Update CMS organization settings by ID."""
        payload = {k: v for k, v in {
            "selected_theme": selected_theme,
            "default_language_id": default_language_id,
            "auto_translate_pages": auto_translate_pages,
            "auto_translate_posts": auto_translate_posts,
            "auto_translate_components": auto_translate_components,
            "show_post_author": show_post_author,
            "show_post_date": show_post_date,
            "blog_posts_per_page": blog_posts_per_page,
            "show_chatbox": show_chatbox,
            "website_custom_code": website_custom_code,
        }.items() if v is not None}
        return await client.put(f"/organization/{id}", json=payload)
