from mcp.server.fastmcp import FastMCP
from ..client import CMSClient


def register(mcp: FastMCP, client: CMSClient) -> None:

    @mcp.tool()
    async def list_themes() -> dict:
        """List all available themes."""
        return await client.get("/theme/list")

    @mcp.tool()
    async def select_theme(theme_name: str) -> dict:
        """Set the active theme by name."""
        return await client.post("/theme/select-theme", json={"theme_name": theme_name})

    @mcp.tool()
    async def list_theme_files(theme: str, path: str = "") -> dict:
        """Browse the file tree of a theme. path is a subdirectory within the theme."""
        url = f"/theme/files/{theme}/{path}".rstrip("/")
        return await client.get(url)

    @mcp.tool()
    async def get_theme_file(theme: str, file_path: str, lang_code: str = "") -> dict:
        """Get the content of a theme file. Optionally specify lang_code for locale variants."""
        params: dict = {"theme": theme, "file_path": file_path}
        if lang_code:
            params["lang_code"] = lang_code
        return await client.get("/theme/file", params=params)

    @mcp.tool()
    async def save_theme_file(theme: str, file_path: str, content: str, lang_code: str = "") -> dict:
        """Save content to a theme file. Optionally specify lang_code for locale variants."""
        payload: dict = {"theme": theme, "file_path": file_path, "content": content}
        if lang_code:
            payload["lang_code"] = lang_code
        return await client.post("/theme/save-file", json=payload)
