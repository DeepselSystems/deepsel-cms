from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def list_templates(skip: int = 0, limit: int = 50) -> dict:
        """List all page templates."""
        return await client.get("/template", params={"skip": skip, "limit": limit})

    @mcp.tool()
    async def get_template(id: int) -> dict:
        """Get a single template by ID."""
        return await client.get(f"/template/{id}")

    @mcp.tool()
    async def create_template(
        name: str,
        is_404: bool = False,
        is_login: bool = False,
    ) -> dict:
        """Create a new page template."""
        return await client.post("/template", json={
            "name": name,
            "is_404": is_404,
            "is_login": is_login,
        })

    @mcp.tool()
    async def update_template(
        id: int,
        name: str | None = None,
        is_404: bool | None = None,
        is_login: bool | None = None,
    ) -> dict:
        """Update a template."""
        payload = {k: v for k, v in {
            "name": name,
            "is_404": is_404,
            "is_login": is_login,
        }.items() if v is not None}
        return await client.put(f"/template/{id}", json=payload)

    @mcp.tool()
    async def delete_template(id: int) -> dict:
        """Delete a template by ID."""
        return await client.delete(f"/template/{id}")

    @mcp.tool()
    async def list_template_contents(template_id: int | None = None, skip: int = 0, limit: int = 50) -> dict:
        """List template content records, optionally filtered by template_id."""
        params: dict = {"skip": skip, "limit": limit}
        if template_id:
            params["template_id"] = template_id
        return await client.get("/template_content", params=params)

    @mcp.tool()
    async def get_template_content(id: int) -> dict:
        """Get a single template content record by ID."""
        return await client.get(f"/template_content/{id}")

    @mcp.tool()
    async def create_template_content(
        template_id: int,
        locale_id: int,
        content: str = "",
    ) -> dict:
        """Create content for a template in a specific locale."""
        return await client.post("/template_content", json={
            "template_id": template_id,
            "locale_id": locale_id,
            "content": content,
        })

    @mcp.tool()
    async def update_template_content(id: int, content: str) -> dict:
        """Update a template content record's body."""
        return await client.put(f"/template_content/{id}", json={"content": content})
