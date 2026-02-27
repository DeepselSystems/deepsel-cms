from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def list_revisions(
        page_content_id: int | None = None,
        post_content_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> dict:
        """List revision history for a page content or blog post content record."""
        params: dict = {"skip": skip, "limit": limit}
        if page_content_id:
            params["page_content_id"] = page_content_id
        if post_content_id:
            params["post_content_id"] = post_content_id
        return await client.get("/revision", params=params)

    @mcp.tool()
    async def get_revision(id: int) -> dict:
        """Get a specific revision including old_content and new_content snapshots."""
        return await client.get(f"/revision/{id}")

    @mcp.tool()
    async def restore_revision(id: int) -> dict:
        """Restore content to the state captured in a specific revision."""
        return await client.post("/revision/restore", json={"id": id})
