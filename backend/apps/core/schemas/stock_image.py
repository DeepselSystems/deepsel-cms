from pydantic import BaseModel, Field


class SearchStockImagesRequest(BaseModel):
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
