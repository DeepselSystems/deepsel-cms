import type { SiteSettings } from '../types.js';

/** Mirrors backend FormFieldTypeEnum */
export type FormFieldType =
  | 'short_answer'
  | 'number'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'date'
  | 'datetime'
  | 'time'
  | 'files';

/** Mirrors backend FormFieldConfig */
export interface FormFieldConfig {
  options?: string[];
  min_value?: number | null;
  max_value?: number | null;
  min_length?: number | null;
  max_length?: number | null;
  max_files?: number | null;
  allowed_file_types?: string[] | null;
  validation_pattern?: string | null;
  validation_message?: string | null;
}

/** A single form field as returned by GET /form/website/{lang}/{slug} */
export interface FormField {
  id: number;
  field_type: FormFieldType;
  label: string;
  description?: string | null;
  required: boolean;
  placeholder?: string | null;
  sort_order: number;
  field_config?: FormFieldConfig | null;
}

/** A previously submitted answer for one field, returned in latest_user_submission */
export interface FormSubmissionFieldValue {
  field_id: number;
  field_snap_short?: Record<string, unknown> | null;
  value: unknown;
}

/** The full response shape of GET /form/website/{lang}/{slug} */
export interface FormData {
  /** form_content.id */
  id: number;
  form_id: number;
  title: string;
  slug: string;
  description?: string | null;
  closing_remarks?: string | null;
  success_message?: string | null;
  /** Language-specific custom code */
  custom_code?: string | null;
  /** All-language custom code on the parent form */
  form_custom_code?: string | null;
  locale_id: number;
  max_submissions?: number | null;
  show_remaining_submissions?: boolean | null;
  submissions_count: number;
  views_count: number;
  enable_public_statistics: boolean;
  latest_user_submission?: FormSubmissionFieldValue[] | null;
  fields: FormField[];
  /** Populated from fetchPublicSettings when the backend returns 404 */
  public_settings: SiteSettings;
  /** Set client-side when the backend returns 404 */
  notFound?: boolean;
}
