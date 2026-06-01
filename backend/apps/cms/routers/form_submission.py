from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import Depends, BackgroundTasks, Form, File, UploadFile
from datetime import datetime
import json

from sqlalchemy.orm import Session

from apps.cms.utils.form_submission import send_form_submission_notification
from apps.core.models.user import UserModel
from apps.core.utils.get_current_user import get_current_user, get_current_user_optional
from db import get_db
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
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
    bulk_delete_route=True,
    export_route=False,
    import_route=False,
    update_route=False,
    create_route=False,
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: Optional[UserModel] = Depends(get_current_user_optional),
    form_id: int = Form(...),
    form_content_id: int = Form(...),
    submission_data: str = Form(...),  # JSON string
    submitter_user_agent: Optional[str] = Form(None),
    submitter_info: Optional[str] = Form(None),  # JSON string, optional
    # Files accepted but not yet processed — placeholder for D4 file upload logic
    files: list[UploadFile] = File(default=[]),
):
    """
    Create a new form submission (multipart/form-data).
    submission_data and submitter_info are JSON strings.
    files are accepted in the request but not yet processed (D4 pending).
    """
    payload = {
        "form_id": form_id,
        "form_content_id": form_content_id,
        "submission_data": json.loads(submission_data),
        "submitter_user_agent": submitter_user_agent,
        "submitter_info": json.loads(submitter_info) if submitter_info else None,
    }

    FormSubmissionModel = models_pool["form_submission"]
    instance = FormSubmissionModel.create(db, user, payload)

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
