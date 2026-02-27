import asyncio
from mcp.server.fastmcp import FastMCP
from .client import CMSClient
from .tools import pages, blog_posts, menus, templates, attachments, themes, revisions, ai, settings, locales, activity


def create_server() -> FastMCP:
    client = CMSClient()
    mcp = FastMCP("deepsel-cms")

    pages.register(mcp, client)
    blog_posts.register(mcp, client)
    menus.register(mcp, client)
    templates.register(mcp, client)
    attachments.register(mcp, client)
    themes.register(mcp, client)
    revisions.register(mcp, client)
    ai.register(mcp, client)
    settings.register(mcp, client)
    locales.register(mcp, client)
    activity.register(mcp, client)

    return mcp


def main() -> None:
    mcp = create_server()
    mcp.run()


if __name__ == "__main__":
    main()
