from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import Depends, BackgroundTasks
from datetime import datetime

from sqlalchemy.orm import Session

from apps.cms.utils.form_submission import send_form_submission_notification
from db import get_db
from deepsel.models.user import UserModel
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
import logging

from deepsel.utils.models_pool import models_pool

logger = logging.getLogger(__name__)

table_name = "form_submission"
CRUDSchemas = generate_CRUD_schemas(table_name)


class CreateSchema(CRUDSchemas.Create):
    submission_history: Optional[None] = None


router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CreateSchema,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
    bulk_delete_route=True,
    export_route=False,
    import_route=False,
    update_route=False,
)


class FormSubmissionReadSchema(BaseModel):
    """Schema for reading form submissions with additional details"""

    id: int
    form_id: int
    submission_data: Dict[str, Any]
    submitter_info: Optional[Dict[str, Any]] = None
    submitted_at: datetime
    form_title: Optional[str] = None
    form_content_title: Optional[str] = None


class FormSubmissionStatsSchema(BaseModel):
    """Schema for form submission statistics"""

    total_submissions: int
    submissions_today: int
    submissions_this_week: int
    submissions_this_month: int
    latest_submission: Optional[datetime] = None


@router.post("", response_model=CRUDSchemas.Read)
def create_form_submission(
    data: CreateSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Create a new form submission and send notification email in background.
    """
    FormSubmissionModel = models_pool["form_submission"]
    instance = FormSubmissionModel.create(db, user, data.dict())

    # Get organization from form
    organization_id = instance.form.organization_id

    # Add background task to send email notification
    background_tasks.add_task(
        send_form_submission_notification,
        db=db,
        form_submission_id=instance.id,
        organization_id=organization_id,
        user=user,
    )

    logger.info(f"Form submission {instance.id} created, notification email queued")

    return instance
