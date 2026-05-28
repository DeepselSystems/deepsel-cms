import React from 'react';
import { Box } from '@mantine/core';
import clsx from 'clsx';
import { FORM_FIELD_TYPE, type FormField, type FormStatisticsData } from '@deepsel/cms-utils';
import { FormStatisticsOptions } from './FormStatisticsOptions.js';
import { FormStatisticsNumbers } from './FormStatisticsNumbers.js';

/** CSS slot names for FormStatisticsFields */
export interface FormStatisticsFieldsClassNames {
  /** Root wrapper */
  root?: string;
  /** Each field chart wrapper */
  fieldItem?: string;
}

export interface FormStatisticsFieldsProps {
  fields: FormField[];
  submissions: FormStatisticsData['submissions'];
  className?: string;
  classNames?: FormStatisticsFieldsClassNames;
}

/**
 * Renders per-field analytics charts for a form's submissions.
 * Does NOT render page layout, title, or overview counters — those belong in the theme.
 */
export function FormStatisticsFields({
  fields,
  submissions,
  className,
  classNames,
}: FormStatisticsFieldsProps) {
  return (
    <Box className={clsx('FormStatisticsFields-root', 'space-y-4', className, classNames?.root)}>
      {fields.map((field, i) => (
        <Box key={i} className={clsx('FormStatisticsFields-fieldItem', classNames?.fieldItem)}>
          {renderFieldStats(field, submissions)}
        </Box>
      ))}
    </Box>
  );
}

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
