import {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Modal, Text, Group, TextInput} from '@mantine/core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faImage,
  faArrowUp,
  faArrowDown,
  faTrash,
  faEdit,
} from '@fortawesome/free-solid-svg-icons';
import Button from './Button.jsx';
import Checkbox from './Checkbox.jsx';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import {getAttachmentUrl} from '../utils/index.js';
import {EnhancedImageSelector} from './EnhancedImageSelector/index.jsx';

export default function GalleryModal({
  isOpen,
  close,
  galleryId = null,
  initialConfig = {
    imagesPerRow: 3,
    gap: 4,
    maxWidth: null,
    rounded: true,
  },
  initialAttachments = [],
  onSave,
}) {
  const {t} = useTranslation();
  const {backendHost} = BackendHostURLState((state) => state);

  // State for gallery configuration
  const [config, setConfig] = useState(initialConfig);

  // State for selected attachments
  const [selectedAttachments, setSelectedAttachments] = useState([]);

  // State for editing caption
  const [editingCaption, setEditingCaption] = useState(null);
  const [newCaption, setNewCaption] = useState('');

  // Set initial values when modal opens - only on first open
  useEffect(() => {
    if (isOpen) {
      // Set initial attachments if provided
      if (initialAttachments && initialAttachments.length > 0) {
        setSelectedAttachments(initialAttachments);
      } else if (selectedAttachments.length === 0) {
        // Only reset if we don't already have selections
        setSelectedAttachments([]);
      }

      // Set initial config
      setConfig(initialConfig);
    }
  }, [isOpen]); // Only depend on isOpen to prevent resetting on every render

  // Handle reordering of images in the preview
  const moveAttachment = (index, direction) => {
    const newOrder = [...selectedAttachments];
    if (direction === 'up' && index > 0) {
      // Swap with previous item
      [newOrder[index], newOrder[index - 1]] = [
        newOrder[index - 1],
        newOrder[index],
      ];
      setSelectedAttachments(newOrder);
    } else if (direction === 'down' && index < selectedAttachments.length - 1) {
      // Swap with next item
      [newOrder[index], newOrder[index + 1]] = [
        newOrder[index + 1],
        newOrder[index],
      ];
      setSelectedAttachments(newOrder);
    }
  };

  // Handle removing an attachment from the preview
  const removeAttachment = (index) => {
    const newOrder = [...selectedAttachments];
    newOrder.splice(index, 1);
    setSelectedAttachments(newOrder);
  };

  // Handle caption update
  const handleCaptionUpdate = (attachmentId, newCaption) => {
    setSelectedAttachments((prev) =>
      prev.map((attachment, index) => {
        const currentId = attachment.id || attachment.name || index;
        return currentId === attachmentId
          ? {...attachment, caption: newCaption.trim()}
          : attachment;
      })
    );
  };

  // Handle save
  const handleSave = () => {
    // If we have a galleryId, update the gallery
    if (galleryId) {
      // This would typically call an API to update the gallery
      // For now, we'll just call the onSave callback
      onSave({
        galleryId,
        config,
        attachments: selectedAttachments,
      });
    } else {
      // Create a new gallery
      onSave({
        config,
        attachments: selectedAttachments,
      });
    }
    close();
  };

  return (
    <>
      <Modal
        opened={isOpen}
        onClose={close}
        title={
          <div className="flex items-center">
            <FontAwesomeIcon icon={faImage} className="mr-2" />
            <Text size="lg" weight={500}>
              {galleryId ? t('Edit Gallery') : t('Create Gallery')}
            </Text>
          </div>
        }
        size="100%"
      >
        <div className="pt-2">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Left side - Image selection */}
            <div className="w-full md:w-1/2">
              <EnhancedImageSelector
                multiple
                selectedImages={selectedAttachments}
                setSelectedImages={setSelectedAttachments}
              />
            </div>

            {/* Right side - Preview */}
            <div className="w-full md:w-1/2 md:sticky md:top-0">
              {/* Quick settings above preview panel */}
              <div className="mb-3 border border-gray-300 rounded-md p-3 bg-gray-50">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {t('Images per row')}:
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          className={`w-8 h-8 cursor-pointer flex items-center justify-center rounded ${config.imagesPerRow === num ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                          onClick={() =>
                            setConfig({...config, imagesPerRow: num})
                          }
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Checkbox
                      checked={config.rounded}
                      onChange={() =>
                        setConfig({...config, rounded: !config.rounded})
                      }
                      className="cursor-pointer"
                    />
                    <span className="ml-2 text-sm">{t('Rounded corners')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('Gap')}:</span>
                    <div className="flex gap-1">
                      {[2, 4, 8, 12].map((num) => (
                        <button
                          key={num}
                          className={`w-8 h-8 cursor-pointer flex items-center justify-center rounded ${config.gap === num ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                          onClick={() => setConfig({...config, gap: num})}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview panel with fixed width */}
              <div className="border border-gray-300 rounded-md p-4 h-full">
                <h3 className="text-lg font-medium mb-4">
                  {t('Gallery Preview')}
                </h3>
                <div
                  className="mx-auto w-[300px] lg:w-[500px] xl:w-[600px]"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${config.imagesPerRow}, 1fr)`,
                    gap: `${config.gap}px`,
                  }}
                >
                  {selectedAttachments.map((attachment, index) => (
                    <div key={attachment.id || attachment.name || index}>
                      {/* Image container with hover effects */}
                      <div className="relative group">
                        <img
                          src={getAttachmentUrl(backendHost, attachment.name)}
                          alt={attachment.alt_text || ''}
                          className="group-hover:blur-xs transition-all duration-200"
                          style={{
                            width: '100%',
                            height: 'auto',
                            objectFit: 'cover',
                            aspectRatio: '1 / 1',
                            borderRadius: config.rounded ? '6px' : '0',
                          }}
                        />

                        {/* Overlay with centered buttons */}
                        <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 flex items-center justify-center">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                console.log(
                                  'Edit button clicked for attachment:',
                                  attachment
                                );
                                console.log('Attachment ID:', attachment.id);
                                console.log(
                                  'Attachment keys:',
                                  Object.keys(attachment)
                                );
                                const attachmentId =
                                  attachment.id || attachment.name || index;
                                setEditingCaption(attachmentId);
                                setNewCaption(attachment.caption || '');
                              }}
                              className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white"
                              title="Edit Caption"
                            >
                              <FontAwesomeIcon
                                icon={faEdit}
                                className="text-gray-700"
                              />
                            </button>
                            <button
                              className={`w-8 h-8 rounded-full bg-white/80 flex items-center justify-center ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}
                              onClick={() => moveAttachment(index, 'up')}
                              disabled={index === 0}
                            >
                              <FontAwesomeIcon
                                icon={faArrowUp}
                                className="text-gray-700"
                              />
                            </button>
                            <button
                              className={`w-8 h-8 rounded-full bg-white/80 flex items-center justify-center ${index === selectedAttachments.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}
                              onClick={() => moveAttachment(index, 'down')}
                              disabled={
                                index === selectedAttachments.length - 1
                              }
                            >
                              <FontAwesomeIcon
                                icon={faArrowDown}
                                className="text-gray-700"
                              />
                            </button>
                            <button
                              className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white hover:text-red-500"
                              onClick={() => removeAttachment(index)}
                            >
                              <FontAwesomeIcon
                                icon={faTrash}
                                className="text-gray-700"
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Caption outside the image container */}
                      {attachment.caption && (
                        <div
                          style={{
                            padding: '8px 4px',
                            fontSize: '14px',
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: '1.4',
                            wordWrap: 'break-word',
                          }}
                        >
                          {attachment.caption}
                        </div>
                      )}
                    </div>
                  ))}
                  {selectedAttachments.length === 0 && (
                    <div
                      className="text-center p-4 bg-gray-100 text-gray-500"
                      style={{
                        gridColumn: `span ${config.imagesPerRow}`,
                        borderRadius: '6px',
                      }}
                    >
                      {t('No images selected')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Group position="right" mt="md">
          <Button variant="outline" onClick={close}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave}>{t('Save')}</Button>
        </Group>
      </Modal>

      {/* Caption editing modal */}
      <Modal
        opened={!!editingCaption}
        onClose={() => setEditingCaption(null)}
        title={t('Edit Caption')}
      >
        <TextInput
          value={newCaption}
          onChange={(e) => setNewCaption(e.target.value)}
          placeholder={t('Enter caption')}
        />
        <Group position="right" mt="md">
          <Button variant="outline" onClick={() => setEditingCaption(null)}>
            {t('Cancel')}
          </Button>
          <Button
            onClick={() => {
              handleCaptionUpdate(editingCaption, newCaption);
              setEditingCaption(null);
            }}
          >
            {t('Save')}
          </Button>
        </Group>
      </Modal>
    </>
  );
}
