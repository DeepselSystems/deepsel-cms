import logging

from fastapi import APIRouter, HTTPException

from deepsel.utils.stock_image import (
    search_pexels_provider,
    StockImageProviderEnum,
)
from apps.core.schemas.stock_image import SearchStockImagesRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Stock image"], prefix="/stock-image")


@router.post("/search")
def search_stock_images(request: SearchStockImagesRequest):
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
