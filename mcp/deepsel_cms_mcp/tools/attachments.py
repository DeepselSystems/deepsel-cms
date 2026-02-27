from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def list_attachments(skip: int = 0, limit: int = 20, search: str = "") -> dict:
        """List uploaded media files."""
        params: dict = {"skip": skip, "limit": limit}
        if search:
            params["q"] = search
        return await client.get("/attachment", params=params)

    @mcp.tool()
    async def get_attachment(id: int) -> dict:
        """Get a single attachment's metadata by ID."""
        return await client.get(f"/attachment/{id}")

    @mcp.tool()
    async def delete_attachment(id: int) -> dict:
        """Delete an attachment by ID."""
        return await client.delete(f"/attachment/{id}")

    @mcp.tool()
    async def get_attachment_url(file_name: str) -> str:
        """Get the URL to serve/download an attachment by its file name."""
        base_url = client.base_url
        return f"{base_url}/api/v1/attachment/serve/{file_name}"
