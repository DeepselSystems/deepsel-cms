import os
import httpx
from typing import Any


class CMSClient:
    def __init__(self):
        self.base_url = os.environ.get("MCP_CMS_BASE_URL", "http://localhost:8000").rstrip("/")
        self.username = os.environ["MCP_CMS_USERNAME"]
        self.password = os.environ["MCP_CMS_PASSWORD"]
        self._token: str | None = None
        self._client = httpx.AsyncClient(timeout=30.0)

    async def _login(self) -> None:
        resp = await self._client.post(
            f"{self.base_url}/api/v1/token",
            data={"username": self.username, "password": self.password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        self._token = resp.json()["access_token"]

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._token}"}

    async def request(self, method: str, path: str, **kwargs) -> Any:
        if self._token is None:
            await self._login()

        url = f"{self.base_url}/api/v1{path}"
        resp = await self._client.request(method, url, headers=self._auth_headers(), **kwargs)

        if resp.status_code == 401:
            await self._login()
            resp = await self._client.request(method, url, headers=self._auth_headers(), **kwargs)

        resp.raise_for_status()
        if resp.content:
            return resp.json()
        return None

    async def get(self, path: str, params: dict | None = None) -> Any:
        return await self.request("GET", path, params=params)

    async def post(self, path: str, json: dict | None = None, data: dict | None = None) -> Any:
        return await self.request("POST", path, json=json, data=data)

    async def put(self, path: str, json: dict | None = None) -> Any:
        return await self.request("PUT", path, json=json)

    async def delete(self, path: str) -> Any:
        return await self.request("DELETE", path)

    async def aclose(self) -> None:
        await self._client.aclose()
