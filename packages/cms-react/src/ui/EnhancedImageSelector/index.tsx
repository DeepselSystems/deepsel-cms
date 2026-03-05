import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Tabs } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import fromPairs from 'lodash/fromPairs';

import { useModel } from '../../hooks';
import { useEffectOnce } from '../../hooks';
import type { User } from '../../stores';
import type { AttachmentFile } from '../ChooseAttachmentModal';
import { InternalImages } from './components/InternalImages';
import { SearchStockImages } from './components/SearchStockImages';

/**
 * Available view modes for the image selector
 */
const Modes = {
  SelectOrUpload: 'SelectOrUpload',
  SearchStockImages: 'SearchStockImages',
} as const;

type ModeKey = (typeof Modes)[keyof typeof Modes];

interface ModelLabelProps {
  mode: ModeKey;
}

/**
 * Renders the translated tab label for a given mode
 */
function ModelLabel({ mode }: ModelLabelProps) {
  const { t } = useTranslation();

  return (
    <>
      {mode === Modes.SelectOrUpload && t('Select or upload')}
      {mode === Modes.SearchStockImages && t('Free stock images')}
    </>
  );
}

export interface EnhancedImageSelectorProps {
  onSelect?: (attachment: AttachmentFile) => void;
  multiple?: boolean;
  selectedImages?: AttachmentFile[];
  setSelectedImages?: React.Dispatch<React.SetStateAction<AttachmentFile[]>>;
  backendHost: string;
  user: User | null;
  setUser: (user: User | null) => void;
}

/**
 * Enhanced image selector with internal uploads and stock image search
 */
export function EnhancedImageSelector({
  onSelect = () => {},
  multiple = false,
  selectedImages: selectedImagesProp,
  setSelectedImages: setSelectedImagesProp,
  backendHost,
  user,
  setUser,
}: EnhancedImageSelectorProps) {
  // Selected images — internal state if not controlled externally
  const [internalSelectedImages, setInternalSelectedImages] = useState<AttachmentFile[]>([]);
  const selectedImages = selectedImagesProp || internalSelectedImages;
  const setSelectedImages = setSelectedImagesProp || setInternalSelectedImages;

  const selectedImagesMap = useMemo(
    () =>
      fromPairs(selectedImages.map((o) => [o.id, o])) as Record<string | number, AttachmentFile>,
    [selectedImages],
  );

  // Use useModel to fetch attachments filtered to images only
  const { get: getAttachmentImages } = useModel<AttachmentFile>(
    'attachment',
    { backendHost, user, setUser },
    {
      pageSize: null,
      autoFetch: false,
      filters: [
        {
          field: 'content_type',
          operator: 'like',
          value: 'image%',
        },
      ],
    },
  );

  // Attachment images
  const [attachmentImages, setAttachmentImages] = useState<AttachmentFile[]>([]);
  const [isImagesLoading, setIsImagesLoading] = useState(true);

  /**
   * Fetch attachment images from the backend
   */
  const fetchAttachmentImages = useCallback(() => {
    setIsImagesLoading(true);
    void getAttachmentImages()
      .then((result) => {
        if (result) {
          setAttachmentImages(result.data);
        }
      })
      .finally(() => {
        setIsImagesLoading(false);
      });
  }, [getAttachmentImages]);

  /**
   * Handle a newly uploaded or cloned attachment image
   */
  const handleNewAttachmentImage = useCallback(
    (attachment: AttachmentFile) => {
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
   * Fetch attachment images once on mount
   */
  useEffectOnce(() => {
    void fetchAttachmentImages();
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
          {(Object.values(Modes) as ModeKey[]).map((mode, index) => (
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
            backendHost={backendHost}
            user={user}
            setUser={setUser}
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
            backendHost={backendHost}
            user={user}
            setUser={setUser}
          />
        </Tabs.Panel>
        {/*endregion external image selector*/}
      </Tabs>
    </>
  );
}

export interface EnhancedImageSelectorModalProps extends EnhancedImageSelectorProps {
  opened: boolean;
  setOpened?: (value: boolean) => void;
}

/**
 * Modal wrapper around EnhancedImageSelector
 */
export function EnhancedImageSelectorModal({
  opened,
  setOpened = () => {},
  ...props
}: EnhancedImageSelectorModalProps) {
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
}
