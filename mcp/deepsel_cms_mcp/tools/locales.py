from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def list_locales() -> dict:
        """List all available locales/languages configured in the CMS."""
        return await client.get("/locale", params={"skip": 0, "limit": 200})
