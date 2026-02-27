from mcp.server import Server
from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def list_pages(skip: int = 0, limit: int = 20, search: str = "") -> dict:
        """List all CMS pages with optional search."""
        params = {"skip": skip, "limit": limit}
        if search:
            params["q"] = search
        return await client.get("/page", params=params)

    @mcp.tool()
    async def get_page(id: int) -> dict:
        """Get a single page by ID."""
        return await client.get(f"/page/{id}")

    @mcp.tool()
    async def create_page(
        published: bool = False,
        is_homepage: bool = False,
        is_frontend_page: bool = True,
        require_login: bool = False,
        page_custom_code: str = "",
    ) -> dict:
        """Create a new page. After creating, use create_page_content to add content/title/slug."""
        return await client.post("/page", json={
            "published": published,
            "is_homepage": is_homepage,
            "is_frontend_page": is_frontend_page,
            "require_login": require_login,
            "page_custom_code": page_custom_code,
        })

    @mcp.tool()
    async def update_page(
        id: int,
        published: bool | None = None,
        is_homepage: bool | None = None,
        is_frontend_page: bool | None = None,
        require_login: bool | None = None,
        page_custom_code: str | None = None,
    ) -> dict:
        """Update a page's settings."""
        payload = {k: v for k, v in {
            "published": published,
            "is_homepage": is_homepage,
            "is_frontend_page": is_frontend_page,
            "require_login": require_login,
            "page_custom_code": page_custom_code,
        }.items() if v is not None}
        return await client.put(f"/page/{id}", json=payload)

    @mcp.tool()
    async def delete_page(id: int) -> dict:
        """Delete a page by ID."""
        return await client.delete(f"/page/{id}")

    @mcp.tool()
    async def list_page_contents(page_id: int | None = None, locale_id: int | None = None, skip: int = 0, limit: int = 20) -> dict:
        """List page content records. Optionally filter by page_id or locale_id."""
        params: dict = {"skip": skip, "limit": limit}
        if page_id:
            params["page_id"] = page_id
        if locale_id:
            params["locale_id"] = locale_id
        return await client.get("/page_content", params=params)

    @mcp.tool()
    async def get_page_content(id: int) -> dict:
        """Get a single page content record by ID."""
        return await client.get(f"/page_content/{id}")

    @mcp.tool()
    async def create_page_content(
        page_id: int,
        locale_id: int,
        title: str,
        slug: str,
        content: str = "",
        custom_code: str = "",
        seo_metadata_title: str = "",
        seo_metadata_description: str = "",
        seo_metadata_allow_indexing: bool = True,
    ) -> dict:
        """Create content (title, body, slug, SEO) for a page in a specific locale."""
        return await client.post("/page_content", json={
            "page_id": page_id,
            "locale_id": locale_id,
            "title": title,
            "slug": slug,
            "content": content,
            "custom_code": custom_code,
            "seo_metadata_title": seo_metadata_title,
            "seo_metadata_description": seo_metadata_description,
            "seo_metadata_allow_indexing": seo_metadata_allow_indexing,
        })

    @mcp.tool()
    async def update_page_content(
        id: int,
        title: str | None = None,
        slug: str | None = None,
        content: str | None = None,
        custom_code: str | None = None,
        seo_metadata_title: str | None = None,
        seo_metadata_description: str | None = None,
        seo_metadata_allow_indexing: bool | None = None,
    ) -> dict:
        """Update a page content record."""
        payload = {k: v for k, v in {
            "title": title,
            "slug": slug,
            "content": content,
            "custom_code": custom_code,
            "seo_metadata_title": seo_metadata_title,
            "seo_metadata_description": seo_metadata_description,
            "seo_metadata_allow_indexing": seo_metadata_allow_indexing,
        }.items() if v is not None}
        return await client.put(f"/page_content/{id}", json=payload)

    @mcp.tool()
    async def delete_page_content(id: int) -> dict:
        """Delete a page content record."""
        return await client.delete(f"/page_content/{id}")

    @mcp.tool()
    async def generate_slug(title: str, locale_id: int) -> dict:
        """Auto-generate a URL slug from a title for a given locale."""
        return await client.post("/page_content/generate-slug", json={"title": title, "locale_id": locale_id})

    @mcp.tool()
    async def validate_slug(slug: str, locale_id: int, exclude_id: int | None = None) -> dict:
        """Check whether a slug is unique for a given locale."""
        payload: dict = {"slug": slug, "locale_id": locale_id}
        if exclude_id:
            payload["exclude_id"] = exclude_id
        return await client.post("/page_content/validate-slug", json=payload)
