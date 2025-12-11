import enum
from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, UTC

from db import Base
from deepsel.mixins.base_model import BaseModel


class EmailCampaignRowStatus(enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"


class EmailCampaignRowModel(Base, BaseModel):
    __tablename__ = "email_campaign_row"

    id = Column(Integer, primary_key=True)

    # Relations
    campaign_id = Column(Integer, ForeignKey("email_campaign.id"), nullable=False)
    campaign = relationship("EmailCampaignModel")

    email_out_id = Column(Integer, ForeignKey("email_out.id"), nullable=True)
    email_out = relationship("EmailOutModel")

    # Data
    row_data = Column(JSON, nullable=False, default={})  # Store all CSV fields as dict
    recipient_email = Column(String, nullable=False)

    # Scheduling
    scheduled_send_at = Column(DateTime, nullable=False, default=lambda: datetime.now())

    # Status tracking
    status = Column(
        Enum(EmailCampaignRowStatus),
        nullable=False,
        default=EmailCampaignRowStatus.DRAFT,
    )
