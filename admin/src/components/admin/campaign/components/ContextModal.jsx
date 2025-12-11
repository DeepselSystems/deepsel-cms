import {memo} from 'react';
import {Modal, Table, Badge} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import PropTypes from 'prop-types';

const ContextModal = memo(function ContextModal({
  opened,
  onClose,
  rowData,
  recipientEmail,
  status,
}) {
  const {t} = useTranslation();

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'gray';
      case 'queued':
        return 'blue';
      case 'sent':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic text-sm">null</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="text-sm font-medium">{value.toString()}</span>;
    }

    if (typeof value === 'object') {
      return (
        <code className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-700 font-mono">
          {JSON.stringify(value, null, 2)}
        </code>
      );
    }

    if (typeof value === 'string' && value.length > 150) {
      return (
        <div>
          <div className="text-sm text-gray-900 break-words">
            {value.substring(0, 150)}...
          </div>
          <div className="text-xs text-gray-500 mt-1 italic">
            {value.length} characters (truncated)
          </div>
        </div>
      );
    }

    return (
      <span className="text-sm text-gray-900 break-words">{String(value)}</span>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('Email Context')}
      size="lg"
      centered
    >
      <div className="space-y-6">
        {/* Recipient Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                {t('Send To')}
              </div>
              <div className="text-base font-medium text-gray-900">
                {recipientEmail}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                {t('Status')}
              </div>
              <div>
                <Badge
                  size="md"
                  color={getStatusColor(status)}
                  variant="filled"
                >
                  {status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Context Data */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md text-gray-900">{t('Variables')}</h3>
          </div>

          {rowData && Object.keys(rowData).length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <Table>
                <Table.Thead className="bg-gray-50">
                  <Table.Tr>
                    <Table.Th className="py-4 px-6 text-left font-semibold text-gray-700">
                      {t('Name')}
                    </Table.Th>
                    <Table.Th className="py-4 px-6 text-left font-semibold text-gray-700">
                      {t('Value')}
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Object.entries(rowData).map(([key, value], index) => (
                    <Table.Tr
                      key={key}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    >
                      <Table.Td className="py-4 px-6 align-top">
                        <code className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-sm font-mono">
                          {`{{ ${key} }}`}
                        </code>
                      </Table.Td>
                      <Table.Td className="py-4 px-6 align-top">
                        {renderValue(value)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-gray-500">
                <div className="text-base mb-2">
                  {t('No context data available')}
                </div>
                <div className="text-sm text-gray-400">
                  {t('This email row has no template variables or custom data')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
});

ContextModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  rowData: PropTypes.object,
  recipientEmail: PropTypes.string,
  status: PropTypes.string,
};

export default ContextModal;
