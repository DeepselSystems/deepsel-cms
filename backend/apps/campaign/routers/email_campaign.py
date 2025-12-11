from typing import List, Dict, Any, Optional, Callable
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from fastapi import Depends, HTTPException, status, BackgroundTasks
from datetime import datetime
import logging

from db import get_db
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import (
    generate_CRUD_schemas,
    generate_search_schema,
)
from deepsel.utils.get_current_user import get_current_user
from deepsel.utils.models_pool import models_pool
from apps.campaign.models.email_campaign import (
    EmailCampaignSendType,
    EmailCampaignStatus,
)
from apps.campaign.models.email_campaign_row import EmailCampaignRowStatus
from apps.campaign.utils.campaign_helpers import (
    find_email_column,
    process_table_data,
    process_manual_emails,
    get_campaign_with_permission_check,
)

logger = logging.getLogger(__name__)


# Campaign row schema for read operations
class EmailCampaignRowReadSchema(BaseModel):
    id: int
    row_data: Dict[str, Any]
    recipient_email: str
    scheduled_send_at: datetime
    status: str
    email_out_id: Optional[int] = None

    class Config:
        from_attributes = True


table_name = "email_campaign"
CRUDSchemas = generate_CRUD_schemas(table_name)

# Import existing schemas for related models
EmailTemplateSchemas = generate_CRUD_schemas("email_template")
FormSchemas = generate_CRUD_schemas("form")


# Custom read schema that extends the generated schema to include stats and rows
class EmailCampaignReadSchema(CRUDSchemas.Read):
    rows: List[EmailCampaignRowReadSchema] = Field(default_factory=list)
    stats: Dict[str, Any] = Field(default_factory=dict)


# Generate search schema using the custom read schema
EmailCampaignModel = models_pool[table_name]
SearchSchema = generate_search_schema(EmailCampaignModel, EmailCampaignReadSchema)


# Custom create schema that excludes fields with defaults and adds table_data
class EmailCampaignCreateSchema(BaseModel):
    name: str
    use_table_data: bool = True
    send_to_emails: Optional[str] = None
    send_type: EmailCampaignSendType = EmailCampaignSendType.IMMEDIATE
    scheduled_at: Optional[datetime] = None
    email_template_id: int
    form_id: Optional[int] = None
    table_data: Optional[List[Dict[str, Any]]] = None  # For CSV/form data
    send_immediately: Optional[bool] = (
        False  # True = Save and Send, False = Save as Draft
    )


# Custom update schema that handles table_data updates
class EmailCampaignUpdateSchema(BaseModel):
    name: Optional[str] = None
    use_table_data: Optional[bool] = None
    send_to_emails: Optional[str] = None
    send_type: Optional[EmailCampaignSendType] = None
    scheduled_at: Optional[datetime] = None
    email_template_id: Optional[int] = None
    form_id: Optional[int] = None
    table_data: Optional[List[Dict[str, Any]]] = None  # For CSV/form data updates

    class Config:
        from_attributes = True


# Custom router class that overrides CRUD methods
class EmailCampaignCustomRouter(CRUDRouter):
    def _update(self, *args: Any, **kwargs: Any) -> Callable:
        def route(
            item_id: self._pk_type,
            model: self.update_schema,
            background_tasks: BackgroundTasks,
            db: Session = Depends(self.db_func),
            user=Depends(get_current_user),
        ) -> self.db_model:
            """Update an email campaign with optional table data updates."""
            EmailCampaignModel = models_pool["email_campaign"]
            EmailCampaignRowModel = models_pool["email_campaign_row"]

            try:
                # Get the existing campaign with permission check
                campaign = get_campaign_with_permission_check(
                    db, item_id, user, EmailCampaignModel
                )

                # Only allow updates for DRAFT and PAUSED campaigns
                if campaign.status not in [
                    EmailCampaignStatus.DRAFT,
                    EmailCampaignStatus.PAUSED,
                ]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Campaign can only be updated when in DRAFT or PAUSED status",
                    )

                # Update basic campaign fields
                record_dict = model.dict(exclude={"table_data"}, exclude_unset=True)
                for key, value in record_dict.items():
                    if hasattr(campaign, key) and value is not None:
                        setattr(campaign, key, value)

                # Determine when emails should be scheduled to send
                scheduled_send_at = None
                if (
                    campaign.send_type == EmailCampaignSendType.SCHEDULED
                    and campaign.scheduled_at
                ):
                    scheduled_send_at = campaign.scheduled_at

                # Determine status for new rows
                if campaign.status == EmailCampaignStatus.PAUSED:
                    new_row_status = EmailCampaignRowStatus.PENDING
                else:
                    new_row_status = EmailCampaignRowStatus.DRAFT

                # Handle data updates if provided
                table_data = model.table_data
                if table_data is not None and len(table_data) > 0:
                    # Get new email addresses from table data
                    email_column = find_email_column(table_data)
                    if not email_column:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="No email column found in table data",
                        )

                    new_emails = set()
                    email_to_data = {}
                    for row_data in table_data:
                        email = row_data.get(email_column, "").strip()
                        if email and "@" in email:
                            new_emails.add(email)
                            email_to_data[email] = row_data

                    # Get existing rows
                    existing_rows = (
                        db.query(EmailCampaignRowModel)
                        .filter(EmailCampaignRowModel.campaign_id == campaign.id)
                        .all()
                    )

                    existing_emails = {row.recipient_email for row in existing_rows}

                    # Delete rows for emails not in new data
                    emails_to_delete = existing_emails - new_emails
                    if emails_to_delete:
                        db.query(EmailCampaignRowModel).filter(
                            EmailCampaignRowModel.campaign_id == campaign.id,
                            EmailCampaignRowModel.recipient_email.in_(emails_to_delete),
                        ).delete(synchronize_session=False)

                    # Create rows for new emails not already in campaign
                    emails_to_add = new_emails - existing_emails

                    for email in emails_to_add:
                        row_kwargs = {
                            "campaign_id": campaign.id,
                            "row_data": email_to_data[email],
                            "recipient_email": email,
                            "organization_id": user.organization_id,
                            "status": new_row_status,
                        }

                        if scheduled_send_at is not None:
                            row_kwargs["scheduled_send_at"] = scheduled_send_at

                        campaign_row = EmailCampaignRowModel(**row_kwargs)
                        db.add(campaign_row)

                    # Update total count
                    campaign.total_emails = (
                        db.query(EmailCampaignRowModel)
                        .filter(EmailCampaignRowModel.campaign_id == campaign.id)
                        .count()
                    )

                elif model.use_table_data is False and model.send_to_emails is not None:
                    # Handle manual email list updates
                    # Get new email addresses from manual list
                    new_emails = set()
                    emails = [
                        email.strip()
                        for email in model.send_to_emails.replace("\n", ",").split(",")
                    ]
                    for email in emails:
                        if email and "@" in email:
                            new_emails.add(email)

                    # Get existing rows
                    existing_rows = (
                        db.query(EmailCampaignRowModel)
                        .filter(EmailCampaignRowModel.campaign_id == campaign.id)
                        .all()
                    )

                    existing_emails = {row.recipient_email for row in existing_rows}

                    # Delete rows for emails not in new manual list
                    emails_to_delete = existing_emails - new_emails
                    if emails_to_delete:
                        db.query(EmailCampaignRowModel).filter(
                            EmailCampaignRowModel.campaign_id == campaign.id,
                            EmailCampaignRowModel.recipient_email.in_(emails_to_delete),
                        ).delete(synchronize_session=False)

                    # Create rows for new emails not already in campaign
                    emails_to_add = new_emails - existing_emails

                    for email in emails_to_add:
                        row_kwargs = {
                            "campaign_id": campaign.id,
                            "row_data": {"email": email},
                            "recipient_email": email,
                            "organization_id": user.organization_id,
                            "status": new_row_status,
                        }

                        if scheduled_send_at is not None:
                            row_kwargs["scheduled_send_at"] = scheduled_send_at

                        campaign_row = EmailCampaignRowModel(**row_kwargs)
                        db.add(campaign_row)

                # Recompute campaign statistics after row changes
                campaign._update_campaign_statistics(db)

                db.commit()
                db.refresh(campaign)

                return campaign

            except HTTPException:
                db.rollback()
                raise
            except IntegrityError as e:
                db.rollback()
                self._raise(e)
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error updating campaign: {str(e)}",
                )

        return route

    def _create(self, *args: Any, **kwargs: Any) -> Callable:
        def route(
            model: self.create_schema,
            background_tasks: BackgroundTasks,
            db: Session = Depends(self.db_func),
            user=Depends(get_current_user),
        ) -> self.db_model:
            """Create a new email campaign with table data processing."""
            EmailCampaignModel = models_pool["email_campaign"]
            EmailCampaignRowModel = models_pool["email_campaign_row"]

            try:
                # Extract table_data and send_immediately from the request
                table_data = model.table_data
                send_immediately = model.send_immediately

                # Remove custom fields from record data for model creation
                record_dict = model.dict(exclude={"table_data", "send_immediately"})
                record_dict["organization_id"] = user.organization_id
                record_dict["active"] = True
                record_dict["owner_id"] = user.id

                # Create the campaign
                campaign = EmailCampaignModel(**record_dict)
                db.add(campaign)
                db.flush()  # Get the ID without committing

                # Determine when emails should be scheduled to send
                scheduled_send_at = None
                if (
                    campaign.send_type == EmailCampaignSendType.SCHEDULED
                    and campaign.scheduled_at
                ):
                    scheduled_send_at = campaign.scheduled_at
                # For immediate campaigns, scheduled_send_at remains None (uses default = now)

                # Process table data if provided
                if table_data and model.use_table_data:
                    rows_created = process_table_data(
                        db,
                        campaign.id,
                        table_data,
                        user.organization_id,
                        EmailCampaignRowModel,
                        scheduled_send_at,
                    )
                    campaign.total_emails = rows_created

                elif not model.use_table_data and model.send_to_emails:
                    # Handle manual email list
                    rows_created = process_manual_emails(
                        db,
                        campaign.id,
                        model.send_to_emails,
                        user.organization_id,
                        EmailCampaignRowModel,
                        scheduled_send_at,
                    )
                    campaign.total_emails = rows_created

                # Always create as DRAFT initially
                campaign.status = EmailCampaignStatus.DRAFT

                # Commit the campaign and rows first
                db.commit()
                db.refresh(campaign)

                # If send_immediately is True, start the campaign
                if send_immediately:
                    # Update campaign rows from DRAFT to PENDING
                    rows_updated = (
                        db.query(EmailCampaignRowModel)
                        .filter(
                            EmailCampaignRowModel.campaign_id == campaign.id,
                            EmailCampaignRowModel.status
                            == EmailCampaignRowStatus.DRAFT,
                        )
                        .update({"status": EmailCampaignRowStatus.PENDING})
                    )

                    logger.info(
                        f"Updated {rows_updated} campaign rows to PENDING status for immediate send"
                    )

                    # Set campaign status based on send type
                    if campaign.send_type == EmailCampaignSendType.IMMEDIATE:
                        campaign.status = EmailCampaignStatus.SENDING
                    elif campaign.send_type == EmailCampaignSendType.SCHEDULED:
                        campaign.status = EmailCampaignStatus.QUEUED

                    db.commit()
                    db.refresh(campaign)

                    # For immediate campaigns, trigger cron processing in background
                    if campaign.send_type == EmailCampaignSendType.IMMEDIATE:
                        logger.info(
                            f"🚀 Scheduling background email processing for created campaign {campaign.id}"
                        )
                        background_tasks.add_task(
                            EmailCampaignModel().cron_send_emails_all
                        )

                return campaign

            except HTTPException:
                db.rollback()
                raise
            except IntegrityError as e:
                db.rollback()
                self._raise(e)
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error creating campaign: {str(e)}",
                )

        return route


router = EmailCampaignCustomRouter(
    read_schema=EmailCampaignReadSchema,
    search_schema=SearchSchema,
    create_schema=EmailCampaignCreateSchema,
    update_schema=EmailCampaignUpdateSchema,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)


# Campaign action endpoints
@router.post("/{campaign_id}/send")
def start_campaign(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Start/send a campaign immediately or by schedule."""
    EmailCampaignModel = models_pool["email_campaign"]
    EmailCampaignRowModel = models_pool["email_campaign_row"]

    # Get campaign with permission check
    campaign = get_campaign_with_permission_check(
        db, campaign_id, user, EmailCampaignModel
    )

    logger.info(f"🚀 CAMPAIGN SEND DEBUG: Starting campaign {campaign_id}")
    logger.info(f"📊 Campaign status: {campaign.status}")
    logger.info(f"📧 Campaign total_emails: {campaign.total_emails}")
    logger.info(f"✅ Campaign sent_emails: {campaign.sent_emails}")
    logger.info(f"❌ Campaign failed_emails: {campaign.failed_emails}")
    logger.info(f"⏰ Send type: {campaign.send_type}")
    logger.info(f"📋 Use table data: {campaign.use_table_data}")

    if campaign.status not in [EmailCampaignStatus.DRAFT, EmailCampaignStatus.PAUSED]:
        logger.error(
            f"❌ Cannot start campaign {campaign_id} - invalid status: {campaign.status.value}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start campaign with status: {campaign.status.value}",
        )

    # Check if campaign has data
    if campaign.use_table_data:
        row_count = (
            db.query(EmailCampaignRowModel)
            .filter(EmailCampaignRowModel.campaign_id == campaign_id)
            .count()
        )

        logger.info(f"📊 Found {row_count} campaign rows for campaign {campaign_id}")

        # Get detailed row status counts
        row_statuses = (
            db.query(EmailCampaignRowModel.status, func.count(EmailCampaignRowModel.id))
            .filter(EmailCampaignRowModel.campaign_id == campaign_id)
            .group_by(EmailCampaignRowModel.status)
            .all()
        )

        for row_status, count in row_statuses:
            logger.info(f"📋 Row status {row_status}: {count} rows")

        if row_count == 0:
            logger.error(f"❌ Campaign {campaign_id} has no email data to send")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign has no email data to send",
            )
    else:
        logger.info(f"📧 Using manual email list: {campaign.send_to_emails}")
        if not campaign.send_to_emails:
            logger.error(f"❌ Campaign {campaign_id} has no manual email addresses")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign has no email addresses to send to",
            )

    try:
        # Update campaign rows from DRAFT to PENDING
        logger.info(f"🔄 Updating DRAFT rows to PENDING for campaign {campaign_id}")

        # First check how many DRAFT rows exist
        draft_rows = (
            db.query(EmailCampaignRowModel)
            .filter(
                EmailCampaignRowModel.campaign_id == campaign_id,
                EmailCampaignRowModel.status == EmailCampaignRowStatus.DRAFT,
            )
            .count()
        )

        logger.info(f"📋 Found {draft_rows} DRAFT rows to update")

        # For immediate campaigns, also update scheduled_send_at to now
        # (in case rows were created with future scheduled times)

        update_data = {"status": EmailCampaignRowStatus.PENDING}
        if campaign.send_type == EmailCampaignSendType.IMMEDIATE:
            update_data["scheduled_send_at"] = datetime.now()
            logger.info(
                f"⏰ Setting scheduled_send_at to NOW for immediate campaign {campaign_id}"
            )

        rows_updated = (
            db.query(EmailCampaignRowModel)
            .filter(
                EmailCampaignRowModel.campaign_id == campaign_id,
                EmailCampaignRowModel.status == EmailCampaignRowStatus.DRAFT,
            )
            .update(update_data)
        )

        logger.info(
            f"✅ Updated {rows_updated} campaign rows to PENDING status for campaign {campaign_id}"
        )

        # Set campaign status based on send type
        old_status = campaign.status
        if campaign.send_type == EmailCampaignSendType.IMMEDIATE:
            campaign.status = EmailCampaignStatus.SENDING
            logger.info(
                f"🚀 Changed campaign {campaign_id} status: {old_status} → SENDING"
            )
        elif campaign.send_type == EmailCampaignSendType.SCHEDULED:
            campaign.status = EmailCampaignStatus.QUEUED
            logger.info(
                f"⏰ Changed campaign {campaign_id} status: {old_status} → QUEUED"
            )

        db.commit()
        db.refresh(campaign)

        logger.info(f"💾 Campaign {campaign_id} committed and refreshed")
        logger.info(f"🎯 Final campaign status: {campaign.status}")
        logger.info(f"📊 Final total_emails: {campaign.total_emails}")

        # For immediate campaigns, trigger cron processing in background
        if campaign.send_type == EmailCampaignSendType.IMMEDIATE:
            logger.info(
                f"🚀 Scheduling background email processing for campaign {campaign_id}"
            )
            background_tasks.add_task(EmailCampaignModel().cron_send_emails_all)

        return {
            "message": "Campaign started successfully",
            "status": campaign.status.value,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting campaign: {str(e)}",
        )


@router.post("/{campaign_id}/pause")
def pause_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Pause a running campaign."""
    EmailCampaignModel = models_pool["email_campaign"]

    campaign = get_campaign_with_permission_check(
        db, campaign_id, user, EmailCampaignModel
    )

    if campaign.status not in [EmailCampaignStatus.SENDING, EmailCampaignStatus.QUEUED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pause campaign with status: {campaign.status.value}",
        )

    try:
        campaign.status = EmailCampaignStatus.PAUSED
        db.commit()
        db.refresh(campaign)

        return {
            "message": "Campaign paused successfully",
            "status": campaign.status.value,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error pausing campaign: {str(e)}",
        )


@router.post("/{campaign_id}/resume")
def resume_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Resume a paused campaign."""
    EmailCampaignModel = models_pool["email_campaign"]

    campaign = get_campaign_with_permission_check(
        db, campaign_id, user, EmailCampaignModel
    )

    if campaign.status != EmailCampaignStatus.PAUSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume campaign with status: {campaign.status.value}",
        )

    try:
        # Resume to appropriate status based on send type
        if campaign.send_type == EmailCampaignSendType.IMMEDIATE:
            campaign.status = EmailCampaignStatus.SENDING
        elif campaign.send_type == EmailCampaignSendType.SCHEDULED:
            campaign.status = EmailCampaignStatus.QUEUED

        db.commit()
        db.refresh(campaign)

        return {
            "message": "Campaign resumed successfully",
            "status": campaign.status.value,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resuming campaign: {str(e)}",
        )
