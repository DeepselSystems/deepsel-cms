from typing import Optional, List, Any
from enum import Enum

from pydantic import BaseModel, field_serializer, computed_field

from deepsel.utils.secret_utils import truncate_secret


class SEOMetadata(BaseModel):
    """SEO metadata for blog post content"""

    title: Optional[str] = None  # SEO title, defaults to blog post content title
    description: Optional[str] = None  # SEO meta description
    featured_image_id: Optional[int] = (
        None  # Featured image (attachment id) for social sharing
    )
    featured_image_name: Optional[str] = (
        None  # Featured image (attachment name) for social sharing
    )
    allow_indexing: bool = True  # Controls search engine indexing


class CMSSettingsEncryptedDataReadSSchema(BaseModel):
    openrouter_api_key: Optional[str] = None  # This value is not returned.

    # region Openrouter api key
    @field_serializer("openrouter_api_key", mode="plain")
    def serialize_openrouter_api_key(self, value):
        """Don't allow return. Instead, returns in the field "openrouter_api_key_truncated" """
        return None

    @computed_field
    @property
    def openrouter_api_key_truncated(self) -> Optional[str]:
        """Return truncated version of openrouter_api_key like 'first_part...last_part'"""
        return truncate_secret(self.openrouter_api_key)

    # endregion Openrouter api key


class FormFieldTypeEnum(Enum):
    """Form field type enum"""

    short_answer = "short_answer"
    number = "number"
    paragraph = "paragraph"
    multiple_choice = "multiple_choice"
    checkboxes = "checkboxes"
    dropdown = "dropdown"
    date = "date"
    datetime = "datetime"
    time = "time"
    files = "files"


class FormFieldConfig(BaseModel):
    """Form field configuration schema for field_config JSON column"""

    # Field-specific options
    options: Optional[List[str]] = None  # For multiple_choice, checkboxes, dropdown
    min_value: Optional[int] = None  # For number fields
    max_value: Optional[int] = None  # For number fields
    min_length: Optional[int] = None  # For text fields
    max_length: Optional[int] = None  # For text fields
    max_files: Optional[int] = None  # For file upload fields
    allowed_file_types: Optional[List[str]] = None  # For file upload fields

    # Validation rules
    validation_pattern: Optional[str] = None  # Regex pattern for validation
    validation_message: Optional[str] = None  # Custom validation error message


class FormField(BaseModel):
    """Complete form field schema including database fields and config"""

    id: Optional[int] = None  # Database ID
    field_id: str  # Unique field identifier within the form
    field_type: str  # Field type from FormFieldTypeEnum
    label: str  # Field label displayed to users
    description: Optional[str] = None  # Optional field description/help text
    required: bool = False  # Whether field is required
    placeholder: Optional[str] = None  # Placeholder text for input fields
    sort_order: int = 0  # Order of fields in the form
    field_config: Optional[FormFieldConfig] = None  # Field-specific configuration


class FormSubmissionData(BaseModel):
    """Form submission data schema"""

    field_values: dict[str, Any]  # field_id -> submitted_value mapping
    submitter_info: Optional[dict] = None  # Optional submitter metadata
