import { useCallback, useMemo, useState } from 'react';
import { Modal, Tabs } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import SearchStockImages from './components/SearchStockImages.jsx';
import InternalImages from './components/InternalImages.jsx';
import useModel from '../../api/useModel.jsx';
import useEffectOnce from '../../hooks/useEffectOnce.js';
import fromPairs from 'lodash/fromPairs';

// List of modes
const Modes = {
  SelectOrUpload: 'SelectOrUpload',
  SearchStockImages: 'SearchStockImages',
};

/**
 * Label for modes
 *
 * @param mode
 * @returns {JSX.Element}
 * @constructor
 */
const ModelLabel = ({ mode }) => {
  // Translation
  const { t } = useTranslation();

  return (
    <>
      {mode === Modes.SelectOrUpload && t('Select or upload')}
      {mode === Modes.SearchStockImages && t('Free stock images')}
    </>
  );
};

/**
 * Enhanced image selector
 *
 * @typedef EnhancedImageSelectorProps
 *
 * @property {(attachment: AttachmentFile) => void} onSelect
 * @property {boolean} multiple
 * @property {Array<AttachmentFile>} selectedImages
 * @property {React.Dispatch<React.SetStateAction<Array<AttachmentFile>>>} setSelectedImages
 *
 * @returns {JSX.Element}
 * @constructor
 */
const EnhancedImageSelector = ({
  onSelect = () => {},
  multiple = false,
  selectedImages: selectedImagesProp,
  setSelectedImages: setSelectedImagesProp,
}) => {
  // Selected images
  const [internalSelectedImages, setInternalSelectedImages] = useState(
    /** @type {Array<AttachmentFile>} */ [],
  );
  const selectedImages = selectedImagesProp || internalSelectedImages;
  const setSelectedImages = setSelectedImagesProp || setInternalSelectedImages;
  const selectedImagesMap = useMemo(
    () => fromPairs(selectedImages.map((o) => [o.id, o])),
    [selectedImages],
  );

  // Use useModel to fetch attachments
  const { get: getAttachmentImages } = useModel('attachment', {
    pageSize: null,
    autoFetch: false,
    filters: [
      {
        field: 'content_type',
        operator: 'like',
        value: 'image%',
      },
    ],
  });

  // Attachment images
  const [attachmentImages, setAttachmentImages] = useState(/** @type {Array<AttachmentFile>} */ []);
  const [isImagesLoading, setIsImagesLoading] = useState(true);

  /**
   * Fetch attachment images
   * @type {(function(): void)|*}
   */
  const fetchAttachmentImages = useCallback(() => {
    setIsImagesLoading(true);
    getAttachmentImages()
      .then(({ data }) => {
        setAttachmentImages(data);
      })
      .finally(() => {
        setIsImagesLoading(false);
      });
  }, [getAttachmentImages]);

  /**
   * Handle new attachment image
   * @type {(attachment: AttachmentFile) => void}
   */
  const handleNewAttachmentImage = useCallback(
    (attachment) => {
      setAttachmentImages((prevState) => [attachment, ...prevState]);
      if (multiple) {
        setSelectedImages((prevState) => [...prevState, attachment]);
      } else {
        onSelect?.(attachment);
      }
    },
    [multiple, onSelect, setSelectedImages],
  );

  /**
   * Fetch attachment images once
   */
  useEffectOnce(() => {
    fetchAttachmentImages();
  });

  return (
    <>
      <Tabs
        defaultValue={Modes.SelectOrUpload}
        classNames={{
          list: 'mb-6',
          panel: '!h-[calc(100vh-20rem)] overflow-y-auto',
        }}
        variant="outline"
      >
        {/*region tab list*/}
        <Tabs.List>
          {Object.values(Modes).map((mode, index) => (
            <Tabs.Tab value={mode} key={index}>
              <ModelLabel mode={mode} />
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {/*endregion tab list*/}

        {/*region internal image selector*/}
        <Tabs.Panel value={Modes.SelectOrUpload}>
          <InternalImages
            multiple={multiple}
            onSelect={onSelect}
            attachmentImages={attachmentImages}
            setAttachmentImages={setAttachmentImages}
            isImagesLoading={isImagesLoading}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
          />
        </Tabs.Panel>
        {/*endregion internal image selector*/}

        {/*region external image selector*/}
        <Tabs.Panel value={Modes.SearchStockImages}>
          <SearchStockImages
            multiple={multiple}
            onNewAttachment={handleNewAttachmentImage}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            selectedImagesMap={selectedImagesMap}
          />
        </Tabs.Panel>
        {/*endregion external image selector*/}
      </Tabs>
    </>
  );
};

/**
 * Modal to selector enhanced images
 *
 * @param {boolean} opened
 * @param {(value: boolean) => void} setOpened
 * @param {EnhancedImageSelectorProps} props
 *
 * @property {(attachment: AttachmentFile) => void} onSelect
 * @property {boolean} multiple
 * @property {Array<AttachmentFile>} selectedImages
 * @property {React.Dispatch<React.SetStateAction<Array<AttachmentFile>>>} setSelectedImages
 * @returns {JSX.Element}
 * @constructor
 */
const EnhancedImageSelectorModal = ({ opened, setOpened = () => {}, ...props }) => {
  // Translation
  const { t } = useTranslation();

  return (
    <>
      <Modal
        centered
        size="100%"
        opened={opened}
        closeOnEscape={false}
        closeOnClickOutside={false}
        onClose={() => setOpened(false)}
        title={t('Enhanced Image Selector')}
      >
        <EnhancedImageSelector {...props} />
      </Modal>
    </>
  );
};

export { EnhancedImageSelector, EnhancedImageSelectorModal };
