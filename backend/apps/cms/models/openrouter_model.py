from sqlalchemy import Column, Integer, String, JSON, Text
from db import Base
from apps.core.mixins.base_model import BaseModel
from apps.cms.mixins.openrouter_model import OpenRouterModelMixin


class OpenRouterModelModel(Base, OpenRouterModelMixin, BaseModel):
    __tablename__ = "openrouter_model"

    id = Column(Integer, primary_key=True)
    canonical_slug = Column(String, nullable=False)
    hugging_face_id = Column(String)
    name = Column(String, nullable=False)
    description = Column(Text)
    context_length = Column(Integer)
    created = Column(Integer)  # Unix timestamp from API

    # Architecture
    architecture = Column(JSON)  # Store full architecture object

    # Pricing
    pricing = Column(JSON)  # Store full pricing object

    # Top provider info
    top_provider = Column(JSON)  # Store full top_provider object

    # Per request limits
    per_request_limits = Column(JSON)  # Can be null

    # Supported parameters
    supported_parameters = Column(JSON)  # Array of supported parameters
