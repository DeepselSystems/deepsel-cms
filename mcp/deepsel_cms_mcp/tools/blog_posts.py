from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def list_blog_posts(skip: int = 0, limit: int = 20, search: str = "") -> dict:
        """List all blog posts with optional search."""
        params: dict = {"skip": skip, "limit": limit}
        if search:
            params["q"] = search
        return await client.get("/blog_post", params=params)

    @mcp.tool()
    async def get_blog_post(id: int) -> dict:
        """Get a single blog post by ID."""
        return await client.get(f"/blog_post/{id}")

    @mcp.tool()
    async def create_blog_post(
        published: bool = False,
        require_login: bool = False,
        author_id: int | None = None,
        publish_date: str | None = None,
        blog_post_custom_code: str = "",
    ) -> dict:
        """Create a new blog post. After creating, use create_blog_post_content to add title/body/slug."""
        payload: dict = {
            "published": published,
            "require_login": require_login,
            "blog_post_custom_code": blog_post_custom_code,
        }
        if author_id:
            payload["author_id"] = author_id
        if publish_date:
            payload["publish_date"] = publish_date
        return await client.post("/blog_post", json=payload)

    @mcp.tool()
    async def update_blog_post(
        id: int,
        published: bool | None = None,
        require_login: bool | None = None,
        author_id: int | None = None,
        publish_date: str | None = None,
        blog_post_custom_code: str | None = None,
    ) -> dict:
        """Update a blog post's settings."""
        payload = {k: v for k, v in {
            "published": published,
            "require_login": require_login,
            "author_id": author_id,
            "publish_date": publish_date,
            "blog_post_custom_code": blog_post_custom_code,
        }.items() if v is not None}
        return await client.put(f"/blog_post/{id}", json=payload)

    @mcp.tool()
    async def delete_blog_post(id: int) -> dict:
        """Delete a blog post by ID."""
        return await client.delete(f"/blog_post/{id}")

    @mcp.tool()
    async def list_blog_post_contents(post_id: int | None = None, locale_id: int | None = None, skip: int = 0, limit: int = 20) -> dict:
        """List blog post content records. Optionally filter by post_id or locale_id."""
        params: dict = {"skip": skip, "limit": limit}
        if post_id:
            params["post_id"] = post_id
        if locale_id:
            params["locale_id"] = locale_id
        return await client.get("/blog_post_content", params=params)

    @mcp.tool()
    async def get_blog_post_content(id: int) -> dict:
        """Get a single blog post content record by ID."""
        return await client.get(f"/blog_post_content/{id}")

    @mcp.tool()
    async def create_blog_post_content(
        post_id: int,
        locale_id: int,
        title: str,
        slug: str,
        content: str = "",
        subtitle: str = "",
        custom_code: str = "",
        seo_metadata_title: str = "",
        seo_metadata_description: str = "",
        seo_metadata_allow_indexing: bool = True,
    ) -> dict:
        """Create content (title, body, slug, SEO) for a blog post in a specific locale."""
        return await client.post("/blog_post_content", json={
            "post_id": post_id,
            "locale_id": locale_id,
            "title": title,
            "slug": slug,
            "content": content,
            "subtitle": subtitle,
            "custom_code": custom_code,
            "seo_metadata_title": seo_metadata_title,
            "seo_metadata_description": seo_metadata_description,
            "seo_metadata_allow_indexing": seo_metadata_allow_indexing,
        })

    @mcp.tool()
    async def update_blog_post_content(
        id: int,
        title: str | None = None,
        slug: str | None = None,
        content: str | None = None,
        subtitle: str | None = None,
        custom_code: str | None = None,
        seo_metadata_title: str | None = None,
        seo_metadata_description: str | None = None,
        seo_metadata_allow_indexing: bool | None = None,
    ) -> dict:
        """Update a blog post content record."""
        payload = {k: v for k, v in {
            "title": title,
            "slug": slug,
            "content": content,
            "subtitle": subtitle,
            "custom_code": custom_code,
            "seo_metadata_title": seo_metadata_title,
            "seo_metadata_description": seo_metadata_description,
            "seo_metadata_allow_indexing": seo_metadata_allow_indexing,
        }.items() if v is not None}
        return await client.put(f"/blog_post_content/{id}", json=payload)

    @mcp.tool()
    async def delete_blog_post_content(id: int) -> dict:
        """Delete a blog post content record."""
        return await client.delete(f"/blog_post_content/{id}")
