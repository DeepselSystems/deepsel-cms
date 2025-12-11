import {useMemo} from 'react';
import {Paper, Text, Box, Group, Badge} from '@mantine/core';
import {BarChart} from '@mantine/charts';
import {useTranslation} from 'react-i18next';
import useSubmissionStatisticsData from '../../hooks/useSubmissionStatisticsData.js';
import {FormFieldType} from '../../../../../constants/form.js';
import fromPairs from 'lodash/fromPairs';
import isArray from 'lodash/isArray';

const SupportedFormFieldTypes = [
  FormFieldType.Checkboxes,
  FormFieldType.MultipleChoice,
  FormFieldType.Dropdown,
];
const ColumnNames = {
  Count: 'Count',
};

/**
 * Selection control group statistics
 *
 * @param {FormField} formField
 * @param {Array<FormSubmission>} formSubmissions - Array of all submissions for this form content
 *
 * @returns {JSX.Element}
 * @constructor
 */
const OptionsControlStatistics = ({formField, formSubmissions}) => {
  // Translation
  const {t} = useTranslation();

  // Submissions data
  const {fieldSubmissions} = useSubmissionStatisticsData(
    formField,
    formSubmissions
  );

  /**
   * Options data with key-value pairs
   * @type {Dictionary<{id: string, label: string, value: string}> | Dictionary<any>}
   */
  const optionMap = useMemo(
    () => fromPairs(formField.field_config.options?.map((o) => [o.value, o])),
    [formField.field_config]
  );

  /**
   * Bar chart series - the structure of the data for the bar chart
   * @type {[{name: string}]}
   */
  const barChartSeries = useMemo(() => [{name: ColumnNames.Count}], []);

  /**
   * Bar chart data - the structure of the data for the bar chart
   */
  const barChartData = useMemo(
    () =>
      Object.keys(optionMap).map((optionKey) => {
        return {
          label: optionMap[optionKey].label,
          [ColumnNames.Count]: fieldSubmissions.filter((submission) =>
            SupportedFormFieldTypes.includes(
              submission.field_snap_short.field_type
            ) && isArray(submission.value)
              ? submission.value.includes(optionKey)
              : submission.value === optionKey
          ).length,
        };
      }),
    [fieldSubmissions, optionMap]
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
          <Group gap="xs" mt="lg">
            {formField?.field_config.options.map(({label}, index) => (
              <Badge key={index} variant="outline" size="sm">
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
    </>
  );
};

export default OptionsControlStatistics;
