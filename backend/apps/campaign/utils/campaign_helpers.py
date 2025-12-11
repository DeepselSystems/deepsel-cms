from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from apps.campaign.models.email_campaign_row import EmailCampaignRowStatus


def find_email_column(table_data: List[Dict[str, Any]]) -> str:
    """Find email column in table data."""
    if not table_data:
        return None

    for key in table_data[0].keys():
        if "email" in key.lower():
            return key
    return None


def process_table_data(
    db: Session,
    campaign_id: int,
    table_data: List[Dict[str, Any]],
    organization_id: int,
    EmailCampaignRowModel,
    scheduled_send_at: Optional[datetime] = None,
    status: EmailCampaignRowStatus = EmailCampaignRowStatus.DRAFT,
) -> int:
    """Process table data and create campaign rows."""
    email_column = find_email_column(table_data)

    if not email_column:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email column found in table data",
        )

    rows_created = 0
    for row_data in table_data:
        email = row_data.get(email_column, "").strip()
        if email and "@" in email:
            row_kwargs = {
                "campaign_id": campaign_id,
                "row_data": row_data,
                "recipient_email": email,
                "organization_id": organization_id,
                "status": status,
            }

            # Set scheduled_send_at if provided
            if scheduled_send_at is not None:
                row_kwargs["scheduled_send_at"] = scheduled_send_at

            campaign_row = EmailCampaignRowModel(**row_kwargs)
            db.add(campaign_row)
            rows_created += 1

    return rows_created


def process_manual_emails(
    db: Session,
    campaign_id: int,
    email_list: str,
    organization_id: int,
    EmailCampaignRowModel,
    scheduled_send_at: Optional[datetime] = None,
) -> int:
    """Process manual email list and create campaign rows."""
    emails = [email.strip() for email in email_list.replace("\n", ",").split(",")]
    valid_emails = [email for email in emails if email and "@" in email]

    for email in valid_emails:
        row_kwargs = {
            "campaign_id": campaign_id,
            "row_data": {"email": email},
            "recipient_email": email,
            "organization_id": organization_id,
        }

        # Set scheduled_send_at if provided
        if scheduled_send_at is not None:
            row_kwargs["scheduled_send_at"] = scheduled_send_at

        campaign_row = EmailCampaignRowModel(**row_kwargs)
        db.add(campaign_row)

    return len(valid_emails)


def get_campaign_with_permission_check(
    db: Session, campaign_id: int, user, EmailCampaignModel
):
    """Get campaign with organization permission check."""
    campaign = (
        db.query(EmailCampaignModel)
        .filter(
            EmailCampaignModel.id == campaign_id,
            EmailCampaignModel.organization_id == user.organization_id,
        )
        .first()
    )

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found"
        )

    return campaign
