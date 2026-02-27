from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def translate_page_content(page_content_id: int, target_locale_id: int) -> dict:
        """AI-translate a page's content to another locale."""
        return await client.post("/page/translate", json={
            "page_content_id": page_content_id,
            "target_locale_id": target_locale_id,
        })

    @mcp.tool()
    async def translate_blog_post_content(post_content_id: int, target_locale_id: int) -> dict:
        """AI-translate a blog post's content to another locale."""
        return await client.post("/blog_post/translate", json={
            "post_content_id": post_content_id,
            "target_locale_id": target_locale_id,
        })

    @mcp.tool()
    async def generate_page_content(page_id: int, prompt: str, locale_id: int) -> dict:
        """Use AI to generate content for a page from a prompt."""
        return await client.post("/page/ai_writing", json={
            "page_id": page_id,
            "prompt": prompt,
            "locale_id": locale_id,
        })

    @mcp.tool()
    async def list_ai_models() -> dict:
        """List all available OpenRouter AI models configured in the CMS."""
        return await client.get("/openrouter_model")
