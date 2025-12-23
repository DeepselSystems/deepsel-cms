import { useEffect, useState, useRef } from 'react';
import { Modal, Button, TextInput, ColorInput, NumberInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import RichTextInput from './RichTextInput';

const RichTextModal = ({ isOpen, close, richtextId, initialConfig, initialContent, onSave }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [config, setConfig] = useState({
    maxWidth: null,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    border: '1px solid #e0e0e0',
  });
  const richTextRef = useRef(null);

  useEffect(() => {
    // Initialize with provided data or defaults when the modal opens
    if (isOpen) {
      setContent(initialContent || '');
      setConfig(
        initialConfig || {
          maxWidth: null,
          backgroundColor: '#f5f5f5',
          padding: 16,
          borderRadius: 8,
          border: '1px solid #e0e0e0',
        },
      );
    }
  }, [initialContent, initialConfig, isOpen]);

  const handleSave = () => {
    // Get the HTML content from the rich text editor
    const htmlContent = richTextRef.current ? richTextRef.current.getHTML() : content;

    // Generate a new ID if this is a new richtext component
    const id = richtextId || `richtext-${uuidv4()}`;

    // Call the onSave callback with the updated data
    onSave({
      richtextId: id,
      content: htmlContent,
      config,
      updateRichText: initialContent ? true : false,
    });

    // Close the modal
    close();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={close}
      title={t('Edit Rich Text Content')}
      size="xl"
      padding="md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t('Content')}</h3>
          <div className="border border-gray-200 rounded-md">
            <RichTextInput
              ref={richTextRef}
              content={content}
              onChange={setContent}
              canAddImage={true}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t('Appearance')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberInput
              label={t('Max Width (px)')}
              placeholder={t('Auto')}
              value={config.maxWidth}
              onChange={(value) => setConfig({ ...config, maxWidth: value })}
              min={0}
              step={10}
              allowNegative={false}
              allowDecimal={false}
            />
            <ColorInput
              label={t('Background Color')}
              value={config.backgroundColor}
              onChange={(value) => setConfig({ ...config, backgroundColor: value })}
              format="hex"
              swatches={['#f5f5f5', '#ffffff', '#f0f8ff', '#fff8e1', '#f1f8e9', '#fce4ec']}
            />
            <NumberInput
              label={t('Padding (px)')}
              value={config.padding}
              onChange={(value) => setConfig({ ...config, padding: value })}
              min={0}
              max={48}
              step={2}
              allowNegative={false}
              allowDecimal={false}
            />
            <NumberInput
              label={t('Border Radius (px)')}
              value={config.borderRadius}
              onChange={(value) => setConfig({ ...config, borderRadius: value })}
              min={0}
              max={24}
              step={1}
              allowNegative={false}
              allowDecimal={false}
            />
            <TextInput
              label={t('Border')}
              value={config.border}
              onChange={(e) => setConfig({ ...config, border: e.target.value })}
              placeholder="1px solid #e0e0e0"
              className="col-span-1 md:col-span-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="default" onClick={close}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave} color="blue">
            {t('Save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RichTextModal;
