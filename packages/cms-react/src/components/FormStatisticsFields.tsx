import React from 'react';
import clsx from 'clsx';
import { FORM_FIELD_TYPE, type FormField, type FormStatisticsData } from '@deepsel/cms-utils';
import { FormStatisticsOptions } from './FormStatisticsOptions.js';
import { FormStatisticsNumbers } from './FormStatisticsNumbers.js';

export interface FormStatisticsFieldsProps {
  fields: FormField[];
  submissions: FormStatisticsData['submissions'];
  className?: string;
}

/**
 * Renders per-field analytics charts for a form's submissions.
 * Does NOT render page layout, title, or overview counters — those belong in the theme.
 */
export function FormStatisticsFields({
  fields,
  submissions,
  className,
}: FormStatisticsFieldsProps) {
  return (
    <div className={clsx('space-y-4', 'form-statistics-fields', className)}>
      {fields.map((field, i) => (
        <div key={i} className="form-statistics-fields__field-item">
          {renderFieldStats(field, submissions)}
        </div>
      ))}
    </div>
  );
}

/** Renders the appropriate statistics chart for a given field type */
function renderFieldStats(field: FormField, submissions: FormStatisticsData['submissions']) {
  switch (field.field_type) {
    case FORM_FIELD_TYPE.Checkboxes:
    case FORM_FIELD_TYPE.MultipleChoice:
    case FORM_FIELD_TYPE.Dropdown:
      return <FormStatisticsOptions formField={field} formSubmissions={submissions} />;
    case FORM_FIELD_TYPE.Number:
      return <FormStatisticsNumbers formField={field} formSubmissions={submissions} />;
    default:
      return null;
  }
}
