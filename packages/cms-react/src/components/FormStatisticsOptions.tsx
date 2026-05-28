import React, { useMemo } from 'react';
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

interface FormStatisticsOptionsProps {
  formField: FormField;
  formSubmissions: FormSubmission[];
  className?: string;
}

/**
 * Bar-chart statistics for selection-type fields (checkboxes, multiple choice, dropdown).
 */
export function FormStatisticsOptions({
  formField,
  formSubmissions,
  className,
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
    <Paper className={`p-4 bg-gray-50 rounded-lg border space-y-4 ${className ?? ''}`}>
      <Box>
        <Text component="h2" size="xl" fw={700} className="text-black break-words">
          {formField.label}
        </Text>
        {formField.description && (
          <Text size="sm" c="dimmed">
            {formField.description}
          </Text>
        )}
        <Group gap="xs" mt="lg">
          {options.map(({ label }, i) => (
            <Badge key={i} variant="outline" size="sm">
              {label}
            </Badge>
          ))}
        </Group>
      </Box>

      <Box>
        <Box component="h3" className="font-bold mb-2 text-center my-3">
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
