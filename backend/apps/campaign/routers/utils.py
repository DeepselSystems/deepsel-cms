import re
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db import get_db
from deepsel.utils.get_current_user import get_current_user
from deepsel.utils.models_pool import models_pool
from deepsel.mixins.orm import PermissionAction
from apps.campaign.utils.csv_parser import parse_csv_content

router = APIRouter(prefix="/email_campaign/utils", tags=["Email Campaign Utils"])


class ParseCsvRequest(BaseModel):
    attachment_id: int


class FormSubmissionsRequest(BaseModel):
    """Request schema for getting form submissions"""

    form_id: int


@router.post("/parse-csv", response_model=List[Dict[str, Any]])
async def parse_csv_from_attachment(
    request: ParseCsvRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Parse a CSV file from an attachment and return the data.
    """
    AttachmentModel = models_pool["attachment"]

    # Get the attachment
    attachment = (
        db.query(AttachmentModel)
        .filter(
            AttachmentModel.id == request.attachment_id,
        )
        .first()
    )

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found"
        )

    # Check if user has permission to read this attachment
    allowed, scope = attachment._check_has_permission(PermissionAction.read, user)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this attachment",
        )

    # Validate file type
    if not attachment.name.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attachment must be a CSV file",
        )

    # Read file content using attachment's get_data method
    try:
        # Get binary data from attachment (handles S3, Azure, local, etc.)
        binary_data = attachment.get_data()

        # Try to decode as UTF-8 first
        try:
            content_str = binary_data.decode("utf-8")
        except UnicodeDecodeError:
            # Try Latin-1 as fallback
            try:
                content_str = binary_data.decode("latin-1")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File encoding not supported. Please ensure the CSV is UTF-8 or Latin-1 encoded.",
                )
    except HTTPException:
        # Re-raise HTTPExceptions (from get_data or encoding errors)
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading attachment file: {str(e)}",
        )

    # Parse CSV using attachment data
    return parse_csv_content(content_str)


class EmailPreviewRequestSchema(BaseModel):
    """Schema for generating email preview."""

    email_template_id: int
    sample_data: Dict[str, Any]


@router.post("/preview-email", response_model=dict)
async def preview_email(
    request: EmailPreviewRequestSchema,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Generate email preview with template rendering."""
    EmailTemplateModel = models_pool["email_template"]

    # Get the email template
    template = (
        db.query(EmailTemplateModel)
        .filter(
            EmailTemplateModel.id == request.email_template_id,
            EmailTemplateModel.organization_id == user.organization_id,
        )
        .first()
    )

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Email template not found"
        )

    try:
        # Render template content and subject with sample data
        content = template.content or ""
        subject = template.subject or ""

        # Replace template variables {{ variable_name }} with sample data values
        for key, value in request.sample_data.items():
            if value is not None:
                pattern = r"{{\s*" + re.escape(key) + r"\s*}}"
                content = re.sub(pattern, str(value), content)
                subject = re.sub(pattern, str(value), subject)

        return {
            "html_content": content,
            "subject": subject,
            "template_name": template.name,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rendering email template: {str(e)}",
        )


@router.get("/get-form-submissions/{form_id}", response_model=List[Dict[str, Any]])
async def get_form_submissions_data(
    form_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get form submission data for campaign use - extracts all submissions as dict to provide table data."""
    FormSubmissionModel = models_pool["form_submission"]
    FormModel = models_pool["form"]

    # Check if form exists and user has access
    form = (
        db.query(FormModel)
        .filter(
            FormModel.id == form_id, FormModel.organization_id == user.organization_id
        )
        .first()
    )

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Form not found"
        )

    # Get form submissions with related form content and fields for better data extraction
    submissions = (
        db.query(FormSubmissionModel)
        .filter(FormSubmissionModel.form_id == form_id)
        .limit(5000)
        .all()
    )  # Increased limit for campaign use

    if not submissions:
        return []

    # Get all form fields to understand the structure better
    form_fields = {}
    for content in form.contents:
        for field in content.fields:
            form_fields[field.id] = {
                "label": field.label,
                "field_type": field.field_type.value if field.field_type else "text",
                "locale": content.locale.iso_code if content.locale else "en",
            }

    # Convert submissions to campaign data format
    campaign_data = []
    for submission in submissions:
        row_data = {}

        # Process submission_data which contains field_id -> value mappings
        for field_id_str, value in submission.submission_data.items():
            try:
                field_id = int(field_id_str)
                field_info = form_fields.get(field_id)

                if field_info and value is not None:
                    # Use field label as key, fallback to field_id if no label
                    field_key = (
                        field_info["label"]
                        if field_info["label"]
                        else f"field_{field_id}"
                    )

                    # Process value based on field type
                    if field_info["field_type"] == "checkbox" and isinstance(
                        value, list
                    ):
                        # Join checkbox values with commas
                        row_data[field_key] = ", ".join(str(v) for v in value if v)
                    elif field_info["field_type"] == "file":
                        # For file fields, extract filename or count
                        if isinstance(value, list) and value:
                            filenames = [
                                f.get("name", "file")
                                for f in value
                                if isinstance(f, dict)
                            ]
                            row_data[field_key] = (
                                ", ".join(filenames) if filenames else "files uploaded"
                            )
                        elif isinstance(value, dict):
                            row_data[field_key] = value.get("name", "file uploaded")
                        else:
                            row_data[field_key] = "file uploaded" if value else ""
                    else:
                        # For other field types, convert to string
                        row_data[field_key] = str(value) if value is not None else ""
            except (ValueError, TypeError):
                # Skip invalid field IDs or malformed data
                continue

        # Ensure there's an email field for campaign use
        email_field = None

        # Look for email field in the processed data
        for key, value in row_data.items():
            if "email" in key.lower() and isinstance(value, str) and "@" in value:
                email_field = value.strip()
                break

        # If no email field found with label, look in raw submission data
        if not email_field:
            for field_id_str, value in submission.submission_data.items():
                try:
                    field_id = int(field_id_str)
                    field_info = form_fields.get(field_id)

                    if (
                        field_info
                        and isinstance(value, str)
                        and "@" in value
                        and (
                            "email" in field_info["label"].lower()
                            or "mail" in field_info["label"].lower()
                        )
                    ):
                        email_field = value.strip()
                        break
                except (ValueError, TypeError):
                    continue

        # Add standardized email field for campaign compatibility
        if email_field:
            row_data["email"] = email_field

            # Add submission metadata for better tracking
            row_data["submission_id"] = submission.id
            row_data["submitted_at"] = (
                submission.created_at.isoformat() if submission.created_at else None
            )

            # Add submitter info if available
            if submission.submitter_user_id and submission.submitter_user:
                row_data["submitter_name"] = getattr(
                    submission.submitter_user,
                    "full_name",
                    getattr(submission.submitter_user, "username", ""),
                )

            campaign_data.append(row_data)

    return campaign_data


@router.post("/get-form-submissions", response_model=List[Dict[str, Any]])
async def get_form_submissions_data_post(
    request: FormSubmissionsRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get form submission data for campaign use - extracts all submissions as dict to provide table data."""
    form_id = request.form_id
    FormSubmissionModel = models_pool["form_submission"]
    FormModel = models_pool["form"]

    # Check if form exists and user has access
    form = (
        db.query(FormModel)
        .filter(
            FormModel.id == form_id, FormModel.organization_id == user.organization_id
        )
        .first()
    )

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Form not found"
        )

    # Get form submissions with related form content and fields for better data extraction
    submissions = (
        db.query(FormSubmissionModel)
        .filter(FormSubmissionModel.form_id == form_id)
        .limit(5000)
        .all()
    )  # Increased limit for campaign use

    if not submissions:
        return []

    # Get all form fields to understand the structure better
    form_fields = {}
    for content in form.contents:
        for field in content.fields:
            form_fields[field.id] = {
                "label": field.label,
                "field_type": field.field_type.value if field.field_type else "text",
                "locale": content.locale.iso_code if content.locale else "en",
            }

    def normalize_field_name(field_name: str) -> str:
        """Convert field name to snake_case for consistency"""
        normalized = re.sub(r"[^\w\s]", "", field_name)  # Remove special chars
        normalized = re.sub(r"\s+", "_", normalized)  # Replace spaces with underscore
        normalized = normalized.lower().strip(
            "_"
        )  # Lowercase and strip trailing underscores
        return normalized

    def extract_field_value(value):
        """Extract actual value from complex field data structures"""
        if isinstance(value, dict):
            # If it's a dict with 'value' key, extract that
            if "value" in value:
                return str(value["value"]) if value["value"] is not None else ""
            # Otherwise convert the whole dict to string
            return str(value)
        elif isinstance(value, list):
            # For list values (like checkboxes), join with commas
            return ", ".join(str(v) for v in value if v is not None)
        elif value is not None:
            return str(value)
        else:
            return ""

    # Convert submissions to campaign data format
    campaign_data = []
    for submission in submissions:
        row_data = {}

        # Process submission_data which contains field_id -> value mappings
        for field_id_str, value in submission.submission_data.items():
            try:
                field_id = int(field_id_str)
                field_info = form_fields.get(field_id)

                if field_info and value is not None:
                    # Use field label as key, normalize it
                    field_label = (
                        field_info["label"]
                        if field_info["label"]
                        else f"field_{field_id}"
                    )
                    normalized_key = normalize_field_name(field_label)

                    # Extract actual value from complex structures
                    actual_value = extract_field_value(value)

                    # Store with normalized key
                    row_data[normalized_key] = actual_value

            except (ValueError, TypeError):
                # Skip invalid field IDs or malformed data
                continue

        # Ensure there's an email field for campaign use
        email_value = None

        # Look for email field by checking for 'email' in normalized keys
        for key, value in row_data.items():
            if "email" in key.lower() and isinstance(value, str) and "@" in value:
                email_value = value.strip()
                break

        # If no email field found, look in original field labels
        if not email_value:
            for field_id_str, value in submission.submission_data.items():
                try:
                    field_id = int(field_id_str)
                    field_info = form_fields.get(field_id)

                    if (
                        field_info
                        and field_info["label"]
                        and "email" in field_info["label"].lower()
                    ):
                        extracted_value = extract_field_value(value)
                        if isinstance(extracted_value, str) and "@" in extracted_value:
                            email_value = extracted_value.strip()
                            break
                except (ValueError, TypeError):
                    continue

        # Add standardized email field for campaign compatibility
        if email_value:
            row_data["email"] = email_value
            campaign_data.append(row_data)

    return campaign_data
