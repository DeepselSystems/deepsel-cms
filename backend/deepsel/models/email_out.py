import logging
import enum
from typing import Optional

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema
from jinja2 import Template
from pydantic import EmailStr
from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, DateTime
from sqlalchemy.orm import Session, relationship

from db import Base
from deepsel.mixins.base_model import BaseModel
from deepsel.models.organization import OrganizationModel
from deepsel.models.user import UserModel

logger = logging.getLogger(__name__)


class EmailOutStatus(enum.Enum):
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"


class EmailOutModel(Base, BaseModel):
    __tablename__ = "email_out"

    id = Column(Integer, primary_key=True)
    subject = Column(String, nullable=False, default="")
    recipients = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    status = Column(
        Enum(EmailOutStatus), nullable=False, default=EmailOutStatus.SENDING
    )
    error = Column(Text, nullable=True)

    # Campaign support
    email_campaign_id = Column(Integer, ForeignKey("email_campaign.id"), nullable=True)
    scheduled_send_at = Column(DateTime, nullable=True)

    # Relations
    email_campaign = relationship("EmailCampaignModel")
