from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def list_activities(
        skip: int = 0,
        limit: int = 20,
        target_model: str = "",
        target_id: int | None = None,
    ) -> dict:
        """List activity log entries. Filter by target_model (e.g. 'page', 'blog_post') and/or target_id."""
        params: dict = {"skip": skip, "limit": limit}
        if target_model:
            params["target_model"] = target_model
        if target_id:
            params["target_id"] = target_id
        return await client.get("/activity", params=params)

    @mcp.tool()
    async def get_activity(id: int) -> dict:
        """Get a specific activity log entry including change details."""
        return await client.get(f"/activity/{id}")
