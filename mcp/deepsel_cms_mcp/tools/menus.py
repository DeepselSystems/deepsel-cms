from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def list_menus(skip: int = 0, limit: int = 100) -> dict:
        """List all menu items."""
        return await client.get("/menu", params={"skip": skip, "limit": limit})

    @mcp.tool()
    async def get_menu(id: int) -> dict:
        """Get a single menu item by ID."""
        return await client.get(f"/menu/{id}")

    @mcp.tool()
    async def create_menu(
        translations: dict,
        position: int = 0,
        open_in_new_tab: bool = False,
        parent_id: int | None = None,
    ) -> dict:
        """Create a menu item. translations should be a dict like {"en": "Home", "fr": "Accueil"}."""
        payload: dict = {
            "translations": translations,
            "position": position,
            "open_in_new_tab": open_in_new_tab,
        }
        if parent_id is not None:
            payload["parent_id"] = parent_id
        return await client.post("/menu", json=payload)

    @mcp.tool()
    async def update_menu(
        id: int,
        translations: dict | None = None,
        position: int | None = None,
        open_in_new_tab: bool | None = None,
        parent_id: int | None = None,
    ) -> dict:
        """Update a menu item."""
        payload = {k: v for k, v in {
            "translations": translations,
            "position": position,
            "open_in_new_tab": open_in_new_tab,
            "parent_id": parent_id,
        }.items() if v is not None}
        return await client.put(f"/menu/{id}", json=payload)

    @mcp.tool()
    async def delete_menu(id: int) -> dict:
        """Delete a menu item by ID."""
        return await client.delete(f"/menu/{id}")
