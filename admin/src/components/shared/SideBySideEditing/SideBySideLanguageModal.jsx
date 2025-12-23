import { useState } from 'react';
import { Modal, Checkbox, Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import Button from '../../../common/ui/Button.jsx';
import PropTypes from 'prop-types';

const SideBySideLanguageModal = ({ opened, onClose, languages = [], onEdit }) => {
  const { t } = useTranslation();
  const [selectedLanguages, setSelectedLanguages] = useState([]);

  const handleLanguageToggle = (languageId) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(languageId)) {
        return prev.filter((id) => id !== languageId);
      } else {
        return [...prev, languageId];
      }
    });
  };

  const handleEdit = () => {
    onEdit(selectedLanguages);
    onClose();
    setSelectedLanguages([]);
  };

  const handleClose = () => {
    onClose();
    setSelectedLanguages([]);
  };

  const isEditDisabled = selectedLanguages.length < 2;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<div className="font-bold">{t('Select languages to edit side-by-side')}</div>}
      size="xl"
      radius={0}
      transitionProps={{ transition: 'fade', duration: 200 }}
    >
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-4">
          {t('Choose multiple language versions to edit simultaneously.')}
        </p>

        <div className="space-y-3 mb-6">
          {languages.map((language) => (
            <div key={language.id} className="flex items-center">
              <Checkbox
                checked={selectedLanguages.includes(language.id)}
                onChange={() => handleLanguageToggle(language.id)}
                className="mr-3"
              />
              <div className="flex items-center">
                <span className="mr-2 text-lg">{language.locale?.emoji_flag}</span>
                <div>
                  <Text size="sm" className="font-medium">
                    {language.locale?.name}
                  </Text>
                  <Text size="xs" className="text-gray-600">
                    {language.title || t('Untitled')}
                  </Text>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div>
            {isEditDisabled && (
              <Text size="sm" className="text-gray-500">
                {t('Please select at least 2 languages')}
              </Text>
            )}
          </div>
          <Group>
            <Button variant="outline" onClick={handleClose}>
              {t('Cancel')}
            </Button>
            <Button disabled={isEditDisabled} onClick={handleEdit}>
              {t('Edit')}
            </Button>
          </Group>
        </div>
      </div>
    </Modal>
  );
};

SideBySideLanguageModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  languages: PropTypes.arrayOf(PropTypes.object).isRequired,
  onEdit: PropTypes.func.isRequired,
};

export default SideBySideLanguageModal;
