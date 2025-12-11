import {Modal, Button, Table, Text, Loader, Alert} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import useModel from '../api/useModel.jsx';
import OrganizationIdState from '../stores/OrganizationIdState.js';
import TextInput from './TextInput.jsx';

const HtmlComponentsModal = ({isOpen, onClose, onInsert, currentLocaleId}) => {
  const {t} = useTranslation();
  const {organizationId} = OrganizationIdState();

  const query = useModel('template', {
    autoFetch: isOpen,
    searchFields: ['name'],
    orderBy: {field: 'id', direction: 'desc'},
    filters: [
      ...(organizationId
        ? [
            {
              field: 'organization_id',
              operator: '=',
              value: organizationId,
            },
          ]
        : []),
      ...(currentLocaleId
        ? [
            {
              field: 'contents.locale_id',
              operator: '=',
              value: currentLocaleId,
            },
          ]
        : []),
    ],
  });

  const {data: templates, loading, error} = query;

  const handleInsertTemplate = (template) => {
    const templateName = template.name || `template_${template.id}`;
    onInsert(`{% include '${templateName}' %}`);
    onClose();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <div className="text-lg font-semibold">
          {t('Insert HTML Component')}
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Search Input */}
        <TextInput
          placeholder={t('Search templates...')}
          value={query.searchTerm || ''}
          onChange={(e) => query.setSearchTerm(e.target.value)}
          leftSection={
            <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
          }
        />

        {loading && (
          <div className="flex justify-center py-8">
            <Loader size="md" />
          </div>
        )}

        {error && (
          <Alert
            icon={<FontAwesomeIcon icon={faExclamationTriangle} />}
            title={t('Error')}
            color="red"
          >
            {error}
          </Alert>
        )}

        {!loading && !error && templates && templates.length > 0 && (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('Name')}</Table.Th>
                <Table.Th>{t('Languages')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {templates.map((template) => {
                const templateName = template.name || `template_${template.id}`;

                return (
                  <Table.Tr
                    key={template.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleInsertTemplate(template)}
                  >
                    <Table.Td>
                      <Text size="sm" weight={500}>
                        {templateName}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <div className="flex gap-1 flex-wrap">
                        {template.contents?.map((content, index) => (
                          <span
                            key={content.id || index}
                            title={content.locale?.name || 'Unknown'}
                            className="text-lg"
                          >
                            {content.locale?.emoji_flag || '🏳️'}
                          </span>
                        ))}
                      </div>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}

        {!loading && !error && (!templates || templates.length === 0) && (
          <div className="text-center py-8">
            <Text color="dimmed">{t('No templates available')}</Text>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            {t('Cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default HtmlComponentsModal;
