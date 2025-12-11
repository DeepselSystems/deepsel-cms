import {useState, useEffect} from 'react';
import {Modal, Button, Textarea, Group} from '@mantine/core';
import {useTranslation} from 'react-i18next';

/**
 * Modal component for editing image description
 * Allows users to add or edit optional description text for images
 */
const DescriptionModal = ({
  isOpen,
  onClose,
  onSave,
  initialDescription = '',
}) => {
  // Translation
  const {t} = useTranslation();

  // State
  const [description, setDescription] = useState(initialDescription);

  // Handle save action
  const handleSave = () => {
    onSave(description.trim());
  };

  // Handle cancel action
  const handleCancel = () => {
    setDescription(initialDescription); // Reset to initial value
    onClose();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  // Update local state when initial description changes
  useEffect(() => {
    setDescription(initialDescription);
  }, [initialDescription]);

  return (
    <Modal
      opened={isOpen}
      onClose={handleCancel}
      title={t('Edit Image Description')}
      size="md"
      centered
      closeOnClickOutside={false}
      closeOnEscape={true}
    >
      <div className="space-y-4">
        <div>
          <Textarea
            label={t('Description (Optional)')}
            placeholder={t('Enter a description for this image...')}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
            minRows={3}
            maxRows={6}
            autosize
            autoFocus
            description={t(
              'This description will appear below the image. Leave empty to hide description.'
            )}
          />
        </div>

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={handleCancel}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave} variant="filled">
            {t('Save')}
          </Button>
        </Group>
      </div>
    </Modal>
  );
};

export default DescriptionModal;
