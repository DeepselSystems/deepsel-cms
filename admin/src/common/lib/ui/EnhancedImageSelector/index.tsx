import React, { useCallback, useState } from 'react';
import { Modal } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { useEffectOnce, useModel } from '../../hooks';
import type { User } from '../../types';
import type { NotifyFn } from '../../types';
import type { AttachmentFile } from '../ChooseAttachmentModal';
import { InternalImages } from './components/InternalImages';

export interface EnhancedImageSelectorProps {
  onSelect?: (attachment: AttachmentFile) => void;
  multiple?: boolean;
  selectedImages?: AttachmentFile[];
  setSelectedImages?: React.Dispatch<React.SetStateAction<AttachmentFile[]>>;
  backendHost: string;
  user: User | null;
  setUser: (user: User | null) => void;
  /**
   * Callback to display toast/snackbar notifications.
   * Passed down to InternalImages and SearchStockImages sub-components.
   * Sourced from the consuming app's notification store
   * (e.g. `NotificationState.getState().notify`).
   */
  notify?: NotifyFn;
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
  notify,
}: EnhancedImageSelectorProps) {
  // Selected images — internal state if not controlled externally
  const [internalSelectedImages, setInternalSelectedImages] = useState<AttachmentFile[]>([]);
  const selectedImages = selectedImagesProp || internalSelectedImages;
  const setSelectedImages = setSelectedImagesProp || setInternalSelectedImages;

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
   * Fetch attachment images once on mount
   */
  useEffectOnce(() => {
    void fetchAttachmentImages();
  });

  return (
    <div className="!h-[calc(100vh-20rem)] overflow-y-auto">
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
        notify={notify}
      />
    </div>
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
