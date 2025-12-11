import {memo, useMemo} from 'react';
import {
  alpha,
  Box,
  Paper,
  Text,
  Grid,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import useSubmissionStatisticsData from '../../hooks/useSubmissionStatisticsData.js';
import {CompositeChart} from '@mantine/charts';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faInfoCircle} from '@fortawesome/free-solid-svg-icons';
import {FormFieldType} from '../../../../../constants/form.js';
import sortBy from 'lodash/sortBy';
import groupBy from 'lodash/groupBy';
import isNumber from 'lodash/isNumber';
import mean from 'lodash/mean';
import sum from 'lodash/sum';
import uniq from 'lodash/uniq';

const SupportedFormFieldTypes = [FormFieldType.Number];
const ColumnNames = {
  Count: 'Count',
  DensityPlot: 'Density Plot',
};

/**
 * Gaussian kernel function for KDE
 * @param {number} x - Point to evaluate
 * @param {number} xi - Data point
 * @param {number} bandwidth - Bandwidth parameter
 * @returns {number} Kernel value
 */
const gaussianKernel = (x, xi, bandwidth) => {
  const z = (x - xi) / bandwidth;
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
};

/**
 * Calculate Kernel Density Estimation at a given point
 * @param {number} x - Point to evaluate density at
 * @param {Array<number>} data - Array of data points
 * @param {number} bandwidth - Bandwidth parameter (controls smoothness)
 * @returns {number} Estimated density at point x
 */
const calculateKDE = (x, data, bandwidth) => {
  const n = data.length;
  if (n === 0) return 0;

  const sum = data.reduce((acc, xi) => {
    return acc + gaussianKernel(x, xi, bandwidth);
  }, 0);

  return sum / (n * bandwidth);
};

/**
 * Statistic item component to display a label and value
 *
 * @type {React.NamedExoticComponent<{
 * readonly label?: string,
 * readonly value?: string | number,
 * readonly description?: string
 * }>}
 */
const StatisticItem = memo(({label, value, description}) => {
  return (
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
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xs"
              className="flex-shrink-0"
            >
              <FontAwesomeIcon
                icon={faInfoCircle}
                size="sm"
                className="text-gray-chateau-2"
              />
            </ActionIcon>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
});
StatisticItem.displayName = 'StatisticItem';

/**
 * Chart tooltip component
 * @type {React.NamedExoticComponent<{
 * readonly label: string,
 * readonly payload: Array<{name, value, color}>
 * }>}
 */
const ChartTooltip = memo(({label, payload}) => {
  if (!payload) return null;

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md" miw={200}>
      <Box className="font-bold">{label}</Box>
      {payload.map((item) => (
        <Box
          key={item.name}
          c={alpha(item.color, 1)}
          className="flex justify-between"
        >
          <span>{item.name}: </span>
          {item.name === ColumnNames.DensityPlot ? (
            <span>
              {/* Display original KDE density value */}
              {item.value.toFixed(4)}
            </span>
          ) : (
            <span>{item.value}</span>
          )}
        </Box>
      ))}
    </Paper>
  );
});
ChartTooltip.displayName = 'ChartTooltip';

/**
 * Number control statistics
 *
 * @param {FormField} formField
 * @param {Array<FormSubmission>} formSubmissions - Array of all submissions for this form content
 *
 * @returns {JSX.Element}
 * @constructor
 */
const NumberControlStatistics = ({formField, formSubmissions}) => {
  // Translation
  const {t} = useTranslation();

  // Submissions data
  const {fieldSubmissions} = useSubmissionStatisticsData(
    formField,
    formSubmissions
  );

  /**
   * Bar chart series - the structure of the data for the bar chart
   * @type {[{name: string}]}
   */
  const barChartSeries = useMemo(
    () => [
      {name: ColumnNames.Count, type: 'bar'},
      {
        name: ColumnNames.DensityPlot,
        type: 'line',
        yAxisId: 'right',
        color: 'gray',
      },
    ],
    []
  );

  /**
   * Filter and sort by number value
   */
  const sortedFieldSubmissions = useMemo(() => {
    return sortBy(
      fieldSubmissions.filter(
        (o) =>
          SupportedFormFieldTypes.includes(o.field_snap_short.field_type) &&
          isNumber(+o.value)
      ),
      (o) => o.value
    );
  }, [fieldSubmissions]);

  /**
   * Group by number value
   */
  const groupByNumber = useMemo(() => {
    return groupBy(sortedFieldSubmissions, (o) => o.value);
  }, [sortedFieldSubmissions]);

  /**
   * Calculate bandwidth for KDE using Scott's rule
   * bandwidth = n^(-1/5) * std_dev
   */
  const bandwidth = useMemo(() => {
    const values = sortedFieldSubmissions.map((o) => +o.value);
    const n = values.length;
    if (n === 0) return 1;

    const meanValue = mean(values);
    const variance = sum(values.map((v) => Math.pow(v - meanValue, 2))) / n;
    const stdDev = Math.sqrt(variance);

    // Scott's rule with adjustment factor (similar to bw_adjust in seaborn)
    const bwAdjust = 0.8;
    return Math.pow(n, -1 / 5) * stdDev * bwAdjust;
  }, [sortedFieldSubmissions]);

  /**
   * All unique values and KDE densities
   */
  const kdeData = useMemo(() => {
    const values = sortedFieldSubmissions.map((o) => +o.value);
    if (values.length === 0) return [];

    const uniqueValues = uniq(
      Object.keys(groupByNumber).map((k) => parseFloat(k))
    ).sort((a, b) => a - b);

    return uniqueValues.map((x) => ({
      value: x,
      density: calculateKDE(x, values, bandwidth),
    }));
  }, [sortedFieldSubmissions, groupByNumber, bandwidth]);

  /**
   * Bar chart data - the structure of the data for the bar chart
   */
  const barChartData = useMemo(() => {
    if (sortedFieldSubmissions.length === 0) return [];

    // Create a map of KDE densities by value
    const kdeDensityMap = new Map(
      kdeData.map((d) => [d.value.toString(), d.density])
    );

    return Object.keys(groupByNumber).map((key) => {
      const frequency = groupByNumber[key].length;
      const kdeDensity = kdeDensityMap.get(key) || 0;

      return {
        label: key,
        [ColumnNames.Count]: frequency,
        [ColumnNames.DensityPlot]: kdeDensity,
      };
    });
  }, [groupByNumber, sortedFieldSubmissions.length, kdeData]);

  /**
   * Calculate statistical values
   */
  const statistics = useMemo(() => {
    const values = sortedFieldSubmissions.map((o) => +o.value);
    const n = values.length;

    if (n === 0) {
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
    }

    // Min and Max
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Mean
    const meanValue = mean(values);

    // Median
    const sortedValues = [...values].sort((a, b) => a - b);
    const median =
      n % 2 === 0
        ? (sortedValues[n / 2 - 1] + sortedValues[n / 2]) / 2
        : sortedValues[Math.floor(n / 2)];

    // Standard Deviation
    const variance = sum(values.map((v) => Math.pow(v - meanValue, 2))) / n;
    const standardDeviation = Math.sqrt(variance);

    // Skewness
    const skewness =
      standardDeviation === 0
        ? 0
        : sum(
            values.map((v) => Math.pow((v - meanValue) / standardDeviation, 3))
          ) / n;

    // Kurtosis
    const kurtosis =
      standardDeviation === 0
        ? 0
        : sum(
            values.map((v) => Math.pow((v - meanValue) / standardDeviation, 4))
          ) /
            n -
          3;

    return {
      min,
      max,
      mean: meanValue,
      median,
      standardDeviation,
      skewness,
      kurtosis,
      numberOfAnswers: n,
    };
  }, [sortedFieldSubmissions]);

  /**
   * Statistics data array for rendering
   */
  const statisticsData = useMemo(
    () => [
      {
        label: t('Number of Answers'),
        value: statistics.numberOfAnswers,
        description: t('Total number of responses received for this field'),
      },
      {
        label: t('Min'),
        value: statistics.min !== null ? statistics.min : 'N/A',
        description: t('The smallest value in the dataset'),
      },
      {
        label: t('Max'),
        value: statistics.max !== null ? statistics.max : 'N/A',
        description: t('The largest value in the dataset'),
      },
      {
        label: t('Mean'),
        value: statistics.mean !== null ? statistics.mean.toFixed(2) : 'N/A',
        description: t(
          'The average value calculated by summing all values and dividing by the count'
        ),
      },
      {
        label: t('Median'),
        value:
          statistics.median !== null ? statistics.median.toFixed(2) : 'N/A',
        description: t('The middle value when all values are sorted in order'),
      },
      {
        label: t('Standard Deviation'),
        value:
          statistics.standardDeviation !== null
            ? statistics.standardDeviation.toFixed(2)
            : 'N/A',
        description: t(
          'Measures how spread out the values are from the mean. Higher values indicate more variation'
        ),
      },
      {
        label: t('Skewness'),
        value:
          statistics.skewness !== null ? statistics.skewness.toFixed(2) : 'N/A',
        description: t(
          'Measures the asymmetry of the distribution. Positive values indicate a right-skewed distribution, negative values indicate left-skewed'
        ),
      },
      {
        label: t('Kurtosis'),
        value:
          statistics.kurtosis !== null ? statistics.kurtosis.toFixed(2) : 'N/A',
        description: t(
          'Measures the "tailedness" of the distribution. Positive values indicate heavier tails, negative values indicate lighter tails'
        ),
      },
    ],
    [statistics, t]
  );

  return (
    <>
      <Paper className="p-4 bg-gray-50 rounded-lg border space-y-4">
        <Box>
          <Text
            component="h2"
            size="xl"
            fw={700}
            className="text-black break-words"
          >
            {formField.label}
          </Text>
          <Text size="sm" c="dimmed">
            {formField.description}
          </Text>
        </Box>

        {/* Statistical Summary */}
        <Box>
          <Box component="h3" className="font-bold mb-3">
            {t('Statistical Summary')}
          </Box>
          <Grid gutter="md">
            {statisticsData.map((item, index) => (
              <Grid.Col key={index} span={4}>
                <StatisticItem
                  label={item.label}
                  value={item.value}
                  description={item.description}
                />
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
            tooltipAnimationDuration={200}
            rightYAxisLabel={ColumnNames.DensityPlot}
            yAxisLabel={ColumnNames.Count}
            className="mx-auto"
            tickLine="y"
            dataKey="label"
            maxBarWidth={30}
            data={barChartData}
            series={barChartSeries}
            curveType="natural"
            tooltipProps={{
              content: ({label, payload}) => (
                <ChartTooltip
                  label={`${formField.label}: ${label}`}
                  payload={payload}
                />
              ),
            }}
          />
        </Box>
      </Paper>
    </>
  );
};

export default NumberControlStatistics;
