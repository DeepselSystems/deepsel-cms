import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from apps.deepsel.utils.stock_image import (
    search_pexels_provider,
    StockImageProviderEnum,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Stock image"], prefix="/stock-image")


class _SearchStockImagesRequest(BaseModel):
    """
    Request model for searching stock images
    """

    provider: str
    query_str: str = Field(...)
    page: int = Field(
        default=1,
        ge=1,
    )
    per_page: int = Field(
        default=24,
        ge=1,
        le=80,
    )


@router.post("/search")
def search_stock_images(request: _SearchStockImagesRequest):
    """
    Fetch JSON data from stock image providers

    Args:
        request: Search request containing query_str, page, and per_page

    Returns:
        dict: JSON response
    """
    if request.provider == StockImageProviderEnum.Pexels.value:
        return search_pexels_provider(
            query_str=request.query_str,
            page=request.page,
            per_page=request.per_page,
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid provider")
