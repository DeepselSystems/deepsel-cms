import {memo, useMemo} from 'react';
import {Table, Alert, Skeleton, Center} from '@mantine/core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faFileUpload,
  faSpinner,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import {useTranslation} from 'react-i18next';
import PropTypes from 'prop-types';

const PreviewDataTable = memo(function PreviewDataTable({
  data,
  totalCount = 0,
  loading = false,
  error = null,
  showWhenEmpty = true,
  className,
}) {
  const {t} = useTranslation();

  // Memoized values - must be called unconditionally at the top level
  const displayCount = useMemo(() => data?.length || 0, [data]);
  const columns = useMemo(() => {
    return data && data.length > 0 ? Object.keys(data[0]) : [];
  }, [data]);

  // Memoized components for performance - called unconditionally
  const TableRows = useMemo(() => {
    if (!data || data.length === 0) return null;

    return data.map((row, index) => (
      <Table.Tr key={index}>
        {columns.map((column) => {
          const value = String(row[column] || '');
          const truncatedValue =
            value.length > 50 ? `${value.substring(0, 50)}...` : value;

          return (
            <Table.Td key={column} className="py-3 px-4">
              {truncatedValue}
            </Table.Td>
          );
        })}
      </Table.Tr>
    ));
  }, [data, columns]);

  const FooterMessage = useMemo(() => {
    if (totalCount <= displayCount) return null;

    return (
      <div className="border-t border-gray-200 px-4 py-3 text-sm text-gray-500 text-center">
        {t(
          'Showing first {{count}} rows. {{total}} total rows will be processed.',
          {
            count: displayCount,
            total: totalCount,
          }
        )}
      </div>
    );
  }, [totalCount, displayCount, t]);

  // Content based on state
  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="border rounded p-6">
          <Center className="flex-col gap-3 py-8">
            <FontAwesomeIcon
              icon={faSpinner}
              spin
              className="text-2xl text-blue-500"
            />
            <span className="text-gray-600">{t('Parsing data...')}</span>
          </Center>
          <div className="space-y-2 mt-4">
            <Skeleton height={40} />
            <Skeleton height={30} />
            <Skeleton height={30} />
            <Skeleton height={30} />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          color="red"
          title={t('Error parsing data')}
          icon={<FontAwesomeIcon icon={faExclamationTriangle} />}
        >
          {error}
        </Alert>
      );
    }

    if (!data || data.length === 0) {
      return showWhenEmpty ? (
        <div className="border rounded border-dashed border-gray-300 p-6">
          <Center className="flex-col gap-3 py-8 text-gray-500">
            <FontAwesomeIcon icon={faFileUpload} className="text-3xl" />
            <span className="text-center">
              {t('No data available')}
              <br />
              <span className="text-sm">
                {t(
                  'Upload a CSV file or select form submissions to preview data'
                )}
              </span>
            </span>
          </Center>
        </div>
      ) : (
        <div className="text-sm text-gray-500 mt-2">
          {t('No data to preview')}
        </div>
      );
    }

    // Success state with data
    return (
      <div className="border border-gray-200 rounded">
        <div className="overflow-x-auto max-h-80">
          <Table>
            <Table.Thead>
              <Table.Tr>
                {columns.map((column) => (
                  <Table.Th key={column} className="py-3 px-4 text-left">
                    {column}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{TableRows}</Table.Tbody>
          </Table>
        </div>
        {FooterMessage}
      </div>
    );
  }, [
    loading,
    error,
    data,
    showWhenEmpty,
    columns,
    TableRows,
    FooterMessage,
    t,
  ]);

  return (
    <div className={className || 'mt-4'}>
      <div className="text-md font-medium text-black mb-3">
        {t('Data Preview')}
      </div>
      {content}
    </div>
  );
});

// PropTypes for better development experience
PreviewDataTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  totalCount: PropTypes.number,
  loading: PropTypes.bool,
  error: PropTypes.string,
  showWhenEmpty: PropTypes.bool,
  className: PropTypes.string,
};

export default PreviewDataTable;
