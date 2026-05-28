import React, { useMemo } from 'react';
import clsx from 'clsx';
import { Paper, Text, Box, Group, Badge } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import { FORM_FIELD_TYPE, type FormField, type FormSubmission } from '@deepsel/cms-utils';
import { useSubmissionStatisticsData } from '../hooks/useSubmissionStatisticsData.js';

/** Field types rendered by this component */
const SUPPORTED_TYPES = [
  FORM_FIELD_TYPE.Checkboxes,
  FORM_FIELD_TYPE.MultipleChoice,
  FORM_FIELD_TYPE.Dropdown,
] as string[];

const COUNT_KEY = 'Count';

/** CSS slot names for FormStatisticsOptions */
export interface FormStatisticsOptionsClassNames {
  /** Root Paper wrapper */
  root?: string;
  /** Wrapper around label, description and option badges */
  header?: string;
  /** Field label text */
  label?: string;
  /** Field description text */
  description?: string;
  /** Group containing the option badges */
  optionBadges?: string;
  /** Wrapper around chart title and BarChart */
  chart?: string;
  /** Chart section title */
  chartTitle?: string;
}

interface FormStatisticsOptionsProps {
  formField: FormField;
  formSubmissions: FormSubmission[];
  className?: string;
  classNames?: FormStatisticsOptionsClassNames;
}

/**
 * Bar-chart statistics for selection-type fields (checkboxes, multiple choice, dropdown).
 */
export function FormStatisticsOptions({
  formField,
  formSubmissions,
  className,
  classNames,
}: FormStatisticsOptionsProps) {
  const { t } = useTranslation();
  const { fieldSubmissions } = useSubmissionStatisticsData(formField, formSubmissions);

  const options =
    (formField.field_config?.options as unknown as { value: string; label: string }[]) ?? [];

  const optionMap = useMemo(() => Object.fromEntries(options.map((o) => [o.value, o])), [options]);

  const barChartSeries = useMemo(() => [{ name: COUNT_KEY }], []);

  const barChartData = useMemo(
    () =>
      Object.keys(optionMap).map((key) => ({
        label: optionMap[key].label,
        [COUNT_KEY]: fieldSubmissions.filter((s) => {
          if (
            !SUPPORTED_TYPES.includes(
              String((s.field_snap_short as Record<string, unknown>)?.['field_type']),
            )
          )
            return false;
          return Array.isArray(s.value) ? (s.value as string[]).includes(key) : s.value === key;
        }).length,
      })),
    [fieldSubmissions, optionMap],
  );

  return (
    <Paper className={clsx('FormStatisticsOptions-root', 'p-4 bg-gray-50 rounded-lg border space-y-4', className, classNames?.root)}>
      <Box className={clsx('FormStatisticsOptions-header', classNames?.header)}>
        <Text component="h2" size="xl" fw={700} className={clsx('FormStatisticsOptions-label', 'text-black break-words', classNames?.label)}>
          {formField.label}
        </Text>
        {formField.description && (
          <Text size="sm" c="dimmed" className={clsx('FormStatisticsOptions-description', classNames?.description)}>
            {formField.description}
          </Text>
        )}
        <Group gap="xs" mt="lg" className={clsx('FormStatisticsOptions-optionBadges', classNames?.optionBadges)}>
          {options.map(({ label }, i) => (
            <Badge key={i} variant="outline" size="sm">
              {label}
            </Badge>
          ))}
        </Group>
      </Box>

      <Box className={clsx('FormStatisticsOptions-chart', classNames?.chart)}>
        <Box component="h3" className={clsx('FormStatisticsOptions-chartTitle', 'font-bold mb-2 text-center my-3', classNames?.chartTitle)}>
          {t('Response Count Chart')}
        </Box>
        <BarChart
          className="mx-auto"
          h={300}
          maw={500}
          miw={300}
          data={barChartData}
          series={barChartSeries}
          tickLine="y"
          dataKey="label"
          maxBarWidth={40}
        />
      </Box>
    </Paper>
  );
}
