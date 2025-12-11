import enum
import logging
from datetime import datetime, timedelta
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship, Session

from db import Base
from db import get_db_context
from deepsel.mixins.base_model import BaseModel
from deepsel.utils.models_pool import models_pool
from deepsel.utils.send_email import send_email_with_limit, EmailRateLimitError
from .email_campaign_row import EmailCampaignRowStatus
from deepsel.models.email_out import EmailOutStatus

logger = logging.getLogger(__name__)


class EmailCampaignStatus(enum.Enum):
    DRAFT = "draft"
    QUEUED = "queued"
    SENDING = "sending"
    PAUSED = "paused"
    COMPLETED = "completed"


class EmailCampaignSendType(enum.Enum):
    IMMEDIATE = "immediate"
    SCHEDULED = "scheduled"


class EmailCampaignModel(Base, BaseModel):
    __tablename__ = "email_campaign"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    use_table_data = Column(Boolean, nullable=False, default=True)
    send_to_emails = Column(
        Text, nullable=True
    )  # For manual email list, comma-separated

    # Scheduling
    send_type = Column(
        Enum(EmailCampaignSendType),
        nullable=False,
        default=EmailCampaignSendType.IMMEDIATE,
    )
    scheduled_at = Column(DateTime, nullable=True)

    # Relations
    email_template_id = Column(Integer, ForeignKey("email_template.id"), nullable=False)
    email_template = relationship("EmailTemplateModel")

    form_id = Column(Integer, ForeignKey("form.id"), nullable=True)
    form = relationship("FormModel")

    # Status
    status = Column(
        Enum(EmailCampaignStatus), nullable=False, default=EmailCampaignStatus.DRAFT
    )

    # Progress tracking
    total_emails = Column(Integer, nullable=False, default=0)
    sent_emails = Column(Integer, nullable=False, default=0)
    failed_emails = Column(Integer, nullable=False, default=0)

    @property
    def rows(self):
        """Get campaign rows as a readonly property."""
        if not hasattr(self, "_rows"):
            from deepsel.utils.models_pool import models_pool

            EmailCampaignRowModel = models_pool.get("email_campaign_row")
            if (
                EmailCampaignRowModel
                and hasattr(self, "_sa_instance_state")
                and self._sa_instance_state.session
            ):
                self._rows = (
                    self._sa_instance_state.session.query(EmailCampaignRowModel)
                    .filter(EmailCampaignRowModel.campaign_id == self.id)
                    .all()
                )
            else:
                self._rows = []
        return self._rows

    def get_progress_percentage(self) -> float:
        """Calculate the progress percentage of the campaign."""
        if self.total_emails == 0:
            return 0.0
        return (self.sent_emails + self.failed_emails) / self.total_emails * 100.0

    def is_completed(self) -> bool:
        """Check if campaign is completed."""
        return self.sent_emails + self.failed_emails >= self.total_emails

    def _update_campaign_statistics(self, db: Session):
        """Update campaign statistics based on actual row counts."""
        EmailCampaignRowModel = models_pool["email_campaign_row"]

        # Count actual row statuses
        from sqlalchemy import func

        row_counts = (
            db.query(EmailCampaignRowModel.status, func.count(EmailCampaignRowModel.id))
            .filter(EmailCampaignRowModel.campaign_id == self.id)
            .group_by(EmailCampaignRowModel.status)
            .all()
        )

        # Reset counters
        actual_sent = 0
        actual_failed = 0
        total_rows = 0

        for status, count in row_counts:
            total_rows += count
            if status == EmailCampaignRowStatus.SENT:
                actual_sent = count
            elif status == EmailCampaignRowStatus.FAILED:
                actual_failed = count

        # Update campaign statistics if they differ
        if (
            self.sent_emails != actual_sent
            or self.failed_emails != actual_failed
            or self.total_emails != total_rows
        ):

            logger.info(f"📊 Updating campaign {self.id} statistics:")
            logger.info(f"   Total: {self.total_emails} → {total_rows}")
            logger.info(f"   Sent: {self.sent_emails} → {actual_sent}")
            logger.info(f"   Failed: {self.failed_emails} → {actual_failed}")

            self.total_emails = total_rows
            self.sent_emails = actual_sent
            self.failed_emails = actual_failed

    def _check_and_update_final_status(self, db: Session):
        """Check if campaign should be marked as completed or failed."""
        EmailCampaignRowModel = models_pool["email_campaign_row"]

        # Count rows that still need processing
        pending_count = (
            db.query(EmailCampaignRowModel)
            .filter(
                EmailCampaignRowModel.campaign_id == self.id,
                EmailCampaignRowModel.status.in_(
                    [
                        EmailCampaignRowStatus.DRAFT,
                        EmailCampaignRowStatus.PENDING,
                        EmailCampaignRowStatus.QUEUED,
                        EmailCampaignRowStatus.SENDING,
                    ]
                ),
            )
            .count()
        )

        logger.info(f"🔍 Campaign {self.id} status check:")
        logger.info(f"   Current status: {self.status}")
        logger.info(f"   Pending rows: {pending_count}")
        logger.info(
            f"   Total: {self.total_emails}, Sent: {self.sent_emails}, Failed: {self.failed_emails}"
        )

        # If no pending rows, campaign is done
        if pending_count == 0 and self.total_emails > 0:
            if self.status != EmailCampaignStatus.COMPLETED:
                old_status = self.status
                self.status = EmailCampaignStatus.COMPLETED
                db.commit()
                logger.info(
                    f"✅ Campaign {self.name} (ID: {self.id}) completed: {old_status} → COMPLETED"
                )
                logger.info(
                    f"📊 Final results: {self.sent_emails} sent, {self.failed_emails} failed out of {self.total_emails} total"
                )

        # If campaign is still sending but has rows to process, keep it in SENDING
        elif pending_count > 0 and self.status == EmailCampaignStatus.SENDING:
            logger.info(f"⏳ Campaign {self.id} still processing {pending_count} rows")

        # If no total emails, mark as completed (empty campaign)
        elif self.total_emails == 0:
            if self.status != EmailCampaignStatus.COMPLETED:
                old_status = self.status
                self.status = EmailCampaignStatus.COMPLETED
                db.commit()
                logger.info(
                    f"✅ Empty campaign {self.id} marked as completed: {old_status} → COMPLETED"
                )

    @property
    def stats(self) -> dict:
        """Get campaign statistics as a dictionary."""
        return {
            "total_emails": self.total_emails,
            "sent_emails": self.sent_emails,
            "failed_emails": self.failed_emails,
            "progress_percentage": self.get_progress_percentage(),
            "status": self.status.value,
            "is_completed": self.is_completed(),
            "pending_emails": max(
                0, self.total_emails - self.sent_emails - self.failed_emails
            ),
        }

    def _process_send_emails(self, db: Session):
        """
        Method to send emails for this campaign.
        This method is called by the cron system every 5 minutes.
        """
        logger.info(
            f"🔍 CRON DEBUG: Checking campaign {self.name} (ID: {self.id}) status: {self.status}"
        )

        if self.status != EmailCampaignStatus.SENDING:
            logger.info(
                f"⏸️ Skipping campaign {self.id} - status is {self.status}, not SENDING"
            )
            return

        logger.info(f"🚀 CRON: Processing SENDING campaign {self.name} (ID: {self.id})")
        logger.info(
            f"📊 Campaign stats - Total: {self.total_emails}, Sent: {self.sent_emails}, Failed: {self.failed_emails}"
        )

        try:
            EmailCampaignRowModel = models_pool["email_campaign_row"]
            EmailOutModel = models_pool["email_out"]

            # Get pending rows that are ready to send (with row-level locking)
            now = datetime.now()
            logger.info(f"⏰ Current time: {now}")

            # First check total PENDING rows for this campaign
            total_pending = (
                db.query(EmailCampaignRowModel)
                .filter(
                    EmailCampaignRowModel.campaign_id == self.id,
                    EmailCampaignRowModel.status == EmailCampaignRowStatus.PENDING,
                )
                .count()
            )
            logger.info(
                f"📋 Total PENDING rows for campaign {self.id}: {total_pending}"
            )

            # Check how many are ready (scheduled time <= now)
            ready_pending = (
                db.query(EmailCampaignRowModel)
                .filter(
                    EmailCampaignRowModel.campaign_id == self.id,
                    EmailCampaignRowModel.status == EmailCampaignRowStatus.PENDING,
                    EmailCampaignRowModel.scheduled_send_at <= now,
                )
                .count()
            )
            logger.info(
                f"🕐 Ready PENDING rows (scheduled_send_at <= now): {ready_pending}"
            )

            pending_rows = (
                db.query(EmailCampaignRowModel)
                .filter(
                    EmailCampaignRowModel.campaign_id == self.id,
                    EmailCampaignRowModel.status == EmailCampaignRowStatus.PENDING,
                    EmailCampaignRowModel.scheduled_send_at <= now,
                )
                .with_for_update(
                    skip_locked=True
                )  # Skip rows locked by other processes
                # Process all available rows - let DOSER handle the limits
                .all()
            )

            logger.info(f"🔄 Retrieved {len(pending_rows)} pending rows for processing")

            if not pending_rows:
                logger.info(f"⚠️ No pending rows to process for campaign {self.id}")
                # Update statistics and check final status
                self._update_campaign_statistics(db)
                self._check_and_update_final_status(db)
                return

            # Process each pending row - just mark them as queued for sending
            emails_processed = 0
            for row in pending_rows:
                try:
                    # Mark row as queued - email_out will be created by send_email_with_limit
                    row.status = EmailCampaignRowStatus.QUEUED
                    emails_processed += 1

                except Exception as e:
                    logger.error(f"Error processing campaign row {row.id}: {e}")
                    row.status = EmailCampaignRowStatus.FAILED
                    self.failed_emails += 1

            # Now try to send the queued emails (with row-level locking)
            queued_rows = (
                db.query(EmailCampaignRowModel)
                .filter(
                    EmailCampaignRowModel.campaign_id == self.id,
                    EmailCampaignRowModel.status == EmailCampaignRowStatus.QUEUED,
                )
                .with_for_update(
                    skip_locked=True
                )  # Skip rows locked by other processes
                # No limit - send all available until DOSER stops us
                .all()
            )

            for row in queued_rows:
                try:
                    # Render email content
                    from jinja2 import Template

                    subject_template = Template(self.email_template.subject)
                    content_template = Template(self.email_template.content)

                    rendered_subject = subject_template.render(**row.row_data)
                    rendered_content = content_template.render(**row.row_data)

                    # Mark row as sending
                    row.status = EmailCampaignRowStatus.SENDING

                    # Send email using the unified email sender (it creates the email_out record)
                    import asyncio
                    import concurrent.futures

                    # Handle async call within sync context using thread pool
                    def run_async_in_thread():
                        return asyncio.run(
                            send_email_with_limit(
                                db=db,
                                to=[row.recipient_email],
                                subject=rendered_subject,
                                content=rendered_content,
                                organization_id=self.organization_id,
                                scope=f"campaign_{self.id}",
                                email_campaign_id=self.id,  # Link the email_out to this campaign
                            )
                        )

                    # Run the async function in a separate thread to avoid event loop conflicts
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(run_async_in_thread)
                        result = future.result()

                    if result["success"]:
                        row.status = EmailCampaignRowStatus.SENT
                        row.email_out_id = result.get(
                            "email_id"
                        )  # Link to the created email_out
                        self.sent_emails += 1
                        logger.info(f"Email sent successfully to {row.recipient_email}")
                    else:
                        row.status = EmailCampaignRowStatus.FAILED
                        row.email_out_id = result.get(
                            "email_id"
                        )  # Link to the failed email_out
                        self.failed_emails += 1
                        logger.error(
                            f"Failed to send email to {row.recipient_email}: {result.get('error')}"
                        )

                except EmailRateLimitError as e:
                    # Rate limit hit - schedule for later
                    next_send_time = now + timedelta(
                        seconds=e.next_available_seconds + 60
                    )  # Add 1 minute buffer
                    row.scheduled_send_at = next_send_time
                    row.status = EmailCampaignRowStatus.PENDING
                    logger.warning(
                        f"Rate limit hit for campaign {self.id}, rescheduled for {next_send_time}"
                    )
                    break  # Stop processing more emails for now

                except Exception as e:
                    logger.error(f"Error sending email for row {row.id}: {e}")
                    row.status = EmailCampaignRowStatus.FAILED
                    if row.email_out_id:
                        email_out = db.get(EmailOutModel, row.email_out_id)
                        if email_out:
                            email_out.status = EmailOutStatus.FAILED
                            email_out.error = str(e)
                    self.failed_emails += 1

            db.commit()

            # After processing, update campaign statistics and check final status
            self._update_campaign_statistics(db)
            self._check_and_update_final_status(db)

        except Exception as e:
            logger.error(f"Error in cron_send_emails for campaign {self.id}: {e}")
            db.rollback()
            raise

    def _sync_email_out_status(self, db: Session):
        """Sync email_out status back to campaign rows to handle status conflicts."""
        try:
            EmailCampaignRowModel = models_pool["email_campaign_row"]
            EmailOutModel = models_pool["email_out"]

            # Find email_out records for this campaign that don't have corresponding rows linked
            unlinked_email_outs = (
                db.query(EmailOutModel)
                .filter(
                    EmailOutModel.email_campaign_id == self.id,
                    EmailOutModel.status.in_(
                        [EmailOutStatus.SENT, EmailOutStatus.FAILED]
                    ),
                )
                .all()
            )

            for email_out in unlinked_email_outs:
                # Find campaign row by recipient email that doesn't have email_out_id set
                matching_row = (
                    db.query(EmailCampaignRowModel)
                    .filter(
                        EmailCampaignRowModel.campaign_id == self.id,
                        EmailCampaignRowModel.recipient_email == email_out.recipients,
                        EmailCampaignRowModel.email_out_id.is_(None),
                    )
                    .first()
                )

                if matching_row:
                    # Link the email_out to the campaign row and sync status
                    matching_row.email_out_id = email_out.id

                    if (
                        email_out.status == EmailOutStatus.SENT
                        and matching_row.status != EmailCampaignRowStatus.SENT
                    ):
                        matching_row.status = EmailCampaignRowStatus.SENT
                        self.sent_emails += 1
                        logger.info(
                            f"Synced row {matching_row.id} to SENT status and linked email_out {email_out.id}"
                        )
                    elif (
                        email_out.status == EmailOutStatus.FAILED
                        and matching_row.status != EmailCampaignRowStatus.FAILED
                    ):
                        matching_row.status = EmailCampaignRowStatus.FAILED
                        self.failed_emails += 1
                        logger.info(
                            f"Synced row {matching_row.id} to FAILED status and linked email_out {email_out.id}"
                        )

            db.commit()

        except Exception as e:
            logger.error(f"Error syncing email_out status for campaign {self.id}: {e}")
            db.rollback()

    def _process_queued_campaigns(self, db: Session):
        """Process queued campaigns that are ready to start."""
        if self.status != EmailCampaignStatus.QUEUED:
            return

        if self.send_type != EmailCampaignSendType.SCHEDULED:
            return

        # Check if scheduled time has arrived
        now = datetime.now()
        if self.scheduled_at:
            # Ensure both datetimes are timezone-aware for comparison
            scheduled_at = self.scheduled_at

            logger.info(
                f"⏰ Campaign {self.name} (ID: {self.id}) scheduled for {scheduled_at}, current time is {now}"
            )

            if scheduled_at <= now:
                EmailCampaignRowModel = models_pool["email_campaign_row"]
                self.status = EmailCampaignStatus.SENDING

                # need re-schedule all pending rows to now
                db.query(EmailCampaignRowModel).filter(
                    EmailCampaignRowModel.campaign_id == self.id,
                    EmailCampaignRowModel.status == EmailCampaignRowStatus.PENDING,
                ).update(
                    {
                        "scheduled_send_at": now,
                    }
                )
                db.commit()
                logger.info(
                    f"🔄 Campaign {self.name} (ID: {self.id}) moved from queued to sending"
                )

    def cron_send_emails_all(self, db: Session = None):
        """
        SINGLE UNIFIED CRON JOB - handles all email campaign processing.

        This is the ONLY cron method called by the system every 1 minute.
        It handles:
        1. Processing QUEUED campaigns (checking if scheduled time arrived)
        2. Processing SENDING campaigns (actually sending emails)
        3. Updating campaign statistics and final status

        Note: model_instance is passed by cron system but not used since this is a class method.
        """
        logger.info("🔄 CRON: Starting unified campaign processing cycle")
        with get_db_context() as db:
            # Get all active campaigns that need processing (QUEUED or SENDING)
            campaigns_to_process = (
                db.query(EmailCampaignModel)
                .filter(
                    EmailCampaignModel.status.in_(
                        [EmailCampaignStatus.QUEUED, EmailCampaignStatus.SENDING]
                    ),
                    EmailCampaignModel.active == True,
                )
                .all()
            )

            logger.info(f"📋 Found {len(campaigns_to_process)} campaigns to process")

            for campaign in campaigns_to_process:
                try:
                    logger.info(
                        f"🔍 Processing campaign {campaign.id}: {campaign.name} (status: {campaign.status})"
                    )

                    # Handle QUEUED campaigns - check if they should start
                    if campaign.status == EmailCampaignStatus.QUEUED:
                        campaign._process_queued_campaigns(db)
                        # After processing, check if status changed to SENDING
                        db.refresh(campaign)

                    # Handle SENDING campaigns - actually send emails
                    if campaign.status == EmailCampaignStatus.SENDING:
                        # First sync email_out status to avoid conflicts
                        campaign._sync_email_out_status(db)

                        # Send emails (now synchronous)
                        campaign._process_send_emails(db)

                        # Refresh campaign to get latest status
                        db.refresh(campaign)

                except Exception as e:
                    logger.error(f"❌ Error processing campaign {campaign.id}: {e}")

            logger.info("🏁 CRON: Finished unified campaign processing cycle")
