import React from 'react';
import { Box } from '@mantine/core';
import { FORM_FIELD_TYPE, type FormField, type FormStatisticsData } from '@deepsel/cms-utils';
import { OptionsControlStatistics } from './OptionsControlStatistics.js';
import { NumberControlStatistics } from './NumberControlStatistics.js';

interface FormFieldsStatisticsProps {
  fields: FormField[];
  submissions: FormStatisticsData['submissions'];
  className?: string;
}

/**
 * Renders per-field analytics charts for a form's submissions.
 * Does NOT render page layout, title, or overview counters — those belong in the theme.
 * Accepts className for theme-level CSS overrides.
 */
export function FormFieldsStatistics({
  fields,
  submissions,
  className,
}: FormFieldsStatisticsProps) {
  return (
    <Box className={`space-y-4 ${className ?? ''}`}>
      {fields.map((field, i) => (
        <Box key={i}>{renderFieldStats(field, submissions)}</Box>
      ))}
    </Box>
  );
}

function renderFieldStats(field: FormField, submissions: FormStatisticsData['submissions']) {
  switch (field.field_type) {
    case FORM_FIELD_TYPE.Checkboxes:
    case FORM_FIELD_TYPE.MultipleChoice:
    case FORM_FIELD_TYPE.Dropdown:
      return <OptionsControlStatistics formField={field} formSubmissions={submissions} />;
    case FORM_FIELD_TYPE.Number:
      return <NumberControlStatistics formField={field} formSubmissions={submissions} />;
    default:
      return null;
  }
}
