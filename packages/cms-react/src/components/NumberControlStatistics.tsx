import React, { memo, useMemo } from 'react';
import { Box, Paper, Text, Grid, Tooltip, ActionIcon } from '@mantine/core';
import { CompositeChart, ChartTooltip } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import { FORM_FIELD_TYPE, type FormField, type FormSubmission } from '@deepsel/cms-utils';
import { useSubmissionStatisticsData } from '../hooks/useSubmissionStatisticsData.js';

const COUNT_KEY = 'Count';
const DENSITY_KEY = 'Density Plot';

/** Gaussian kernel for KDE */
function gaussianKernel(x: number, xi: number, bandwidth: number): number {
  const z = (x - xi) / bandwidth;
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

/** Kernel Density Estimation at point x */
function calculateKDE(x: number, data: number[], bandwidth: number): number {
  if (data.length === 0) return 0;
  return (
    data.reduce((acc, xi) => acc + gaussianKernel(x, xi, bandwidth), 0) / (data.length * bandwidth)
  );
}

interface StatisticItemProps {
  label: string;
  value: string | number;
  description?: string;
}

/** Single stat card (label + value + optional tooltip) */
const StatisticItem = memo(({ label, value, description }: StatisticItemProps) => (
  <Paper className="px-3 py-2 border relative">
    <Box className="flex items-start justify-between gap-2">
      <Box className="flex-1">
        <Text size="xs" c="dimmed" className="mb-0.5">
          {label}
        </Text>
        <Text size="md" fw={600}>
          {value}
        </Text>
      </Box>
      {description && (
        <Tooltip label={description} multiline maw={300} withArrow>
          <ActionIcon variant="subtle" color="gray" size="xs" className="flex-shrink-0">
            <span style={{ fontSize: 12 }}>ⓘ</span>
          </ActionIcon>
        </Tooltip>
      )}
    </Box>
  </Paper>
));
StatisticItem.displayName = 'StatisticItem';

interface NumberControlStatisticsProps {
  formField: FormField;
  formSubmissions: FormSubmission[];
  className?: string;
}

/**
 * Composite bar+density chart and statistical summary for number fields.
 */
export function NumberControlStatistics({
  formField,
  formSubmissions,
  className,
}: NumberControlStatisticsProps) {
  const { t } = useTranslation();
  const { fieldSubmissions } = useSubmissionStatisticsData(formField, formSubmissions);

  const barChartSeries = useMemo(
    () => [
      { name: COUNT_KEY, type: 'bar' as const },
      { name: DENSITY_KEY, type: 'line' as const, yAxisId: 'right', color: 'gray' },
    ],
    [],
  );

  const sortedSubmissions = useMemo(
    () =>
      fieldSubmissions
        .filter(
          (s) =>
            (s.field_snap_short as Record<string, unknown>)?.['field_type'] ===
              FORM_FIELD_TYPE.Number && !isNaN(Number(s.value)),
        )
        .sort((a, b) => Number(a.value) - Number(b.value)),
    [fieldSubmissions],
  );

  /** Group by value key */
  const groupByNumber = useMemo(() => {
    const map: Record<string, typeof sortedSubmissions> = {};
    for (const s of sortedSubmissions) {
      const key = String(s.value);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sortedSubmissions]);

  /** KDE bandwidth via Scott's rule */
  const bandwidth = useMemo(() => {
    const values = sortedSubmissions.map((s) => Number(s.value));
    const n = values.length;
    if (n === 0) return 1;
    const avg = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / n;
    return Math.pow(n, -1 / 5) * Math.sqrt(variance) * 0.8 || 1;
  }, [sortedSubmissions]);

  const kdeData = useMemo(() => {
    const values = sortedSubmissions.map((s) => Number(s.value));
    if (values.length === 0) return [];
    const uniqueValues = [...new Set(Object.keys(groupByNumber).map(parseFloat))].sort(
      (a, b) => a - b,
    );
    return uniqueValues.map((x) => ({ value: x, density: calculateKDE(x, values, bandwidth) }));
  }, [sortedSubmissions, groupByNumber, bandwidth]);

  const barChartData = useMemo(() => {
    if (sortedSubmissions.length === 0) return [];
    const kdeMap = new Map(kdeData.map((d) => [String(d.value), d.density]));
    return Object.keys(groupByNumber).map((key) => ({
      label: key,
      [COUNT_KEY]: groupByNumber[key].length,
      [DENSITY_KEY]: kdeMap.get(key) ?? 0,
    }));
  }, [groupByNumber, sortedSubmissions.length, kdeData]);

  const statistics = useMemo(() => {
    const values = sortedSubmissions.map((s) => Number(s.value));
    const n = values.length;
    if (n === 0)
      return {
        min: null,
        max: null,
        mean: null,
        median: null,
        standardDeviation: null,
        skewness: null,
        kurtosis: null,
        numberOfAnswers: 0,
      };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / n;
    const sorted = [...values].sort((a, b) => a - b);
    const median =
      n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const variance = values.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / n;
    const sd = Math.sqrt(variance);
    const skewness = sd === 0 ? 0 : values.reduce((a, v) => a + Math.pow((v - avg) / sd, 3), 0) / n;
    const kurtosis =
      sd === 0 ? 0 : values.reduce((a, v) => a + Math.pow((v - avg) / sd, 4), 0) / n - 3;

    return {
      min,
      max,
      mean: avg,
      median,
      standardDeviation: sd,
      skewness,
      kurtosis,
      numberOfAnswers: n,
    };
  }, [sortedSubmissions]);

  const statsItems = useMemo(
    () => [
      {
        label: t('Number of Answers'),
        value: statistics.numberOfAnswers,
        description: t('Total number of responses received for this field'),
      },
      {
        label: t('Min'),
        value: statistics.min ?? 'N/A',
        description: t('The smallest value in the dataset'),
      },
      {
        label: t('Max'),
        value: statistics.max ?? 'N/A',
        description: t('The largest value in the dataset'),
      },
      {
        label: t('Mean'),
        value: statistics.mean != null ? statistics.mean.toFixed(2) : 'N/A',
        description: t('Average value'),
      },
      {
        label: t('Median'),
        value: statistics.median != null ? statistics.median.toFixed(2) : 'N/A',
        description: t('The middle value when all values are sorted'),
      },
      {
        label: t('Standard Deviation'),
        value:
          statistics.standardDeviation != null ? statistics.standardDeviation.toFixed(2) : 'N/A',
        description: t('Measures spread from the mean'),
      },
      {
        label: t('Skewness'),
        value: statistics.skewness != null ? statistics.skewness.toFixed(2) : 'N/A',
        description: t('Asymmetry of the distribution'),
      },
      {
        label: t('Kurtosis'),
        value: statistics.kurtosis != null ? statistics.kurtosis.toFixed(2) : 'N/A',
        description: t('Tailedness of the distribution'),
      },
    ],
    [statistics, t],
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
      </Box>

      <Box>
        <Box component="h3" className="font-bold mb-3">
          {t('Statistical Summary')}
        </Box>
        <Grid gutter="md">
          {statsItems.map((item, i) => (
            <Grid.Col key={i} span={4}>
              <StatisticItem label={item.label} value={item.value} description={item.description} />
            </Grid.Col>
          ))}
        </Grid>
      </Box>

      <Box>
        <Box component="h3" className="font-bold mb-2 text-center my-3">
          {t('Response Count Chart')}
        </Box>
        <CompositeChart
          withLegend
          withRightYAxis
          h={300}
          maw={500}
          miw={300}
          className="mx-auto"
          tickLine="y"
          dataKey="label"
          maxBarWidth={30}
          data={barChartData}
          series={barChartSeries}
          curveType="natural"
          tooltipAnimationDuration={200}
          rightYAxisLabel={DENSITY_KEY}
          yAxisLabel={COUNT_KEY}
          tooltipProps={{
            content: ({ label, payload }) => (
              <ChartTooltip label={`${formField.label}: ${label}`} payload={payload} />
            ),
          }}
        />
      </Box>
    </Paper>
  );
}
