import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { Box, Image, Text, Checkbox, AspectRatio, Group, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckDouble,
  faCloudArrowUp,
  faImage,
  faImages,
  faPenToSquare,
  faX,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import fromPairs from 'lodash/fromPairs';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';

import { getAttachmentRelativeUrl } from '@deepsel/cms-utils';
import { useModel } from '../../../hooks';
import { useUpload } from '../../../hooks/useUpload';
import type { User } from '../../../types';
import type { NotifyFn } from '../../../types';
import type { AttachmentFile } from '../../ChooseAttachmentModal';

/**
 * Pixel margin for the Dropzone group minimum height
 */
const DROPZONE_MIN_HEIGHT = 100;

/**
 * Pixels before viewport entry to begin loading an image (lazy load margin)
 */
const LAZY_LOAD_ROOT_MARGIN = '50px';

/**
 * Minimum intersection ratio to trigger lazy loading
 */
const LAZY_LOAD_THRESHOLD = 0.01;

/**
 * Data attribute name used to identify images in the IntersectionObserver
 */
const LAZY_LOAD_ATTRIBUTE = 'data-image-id';

interface InternalImagesProps {
  multiple?: boolean;
  onSelect?: (attachmentImage: AttachmentFile) => void;
  attachmentImages: AttachmentFile[];
  setAttachmentImages?: React.Dispatch<React.SetStateAction<AttachmentFile[]>>;
  isImagesLoading?: boolean;
  selectedImages?: AttachmentFile[];
  setSelectedImages?: React.Dispatch<React.SetStateAction<AttachmentFile[]>>;
  backendHost: string;
  user: User | null;
  setUser: (user: User | null) => void;
  /**
   * Callback to display toast/snackbar notifications (upload errors, success).
   * Sourced from the consuming app's notification store
   * (e.g. `NotificationState.getState().notify`).
   * Passed down from EnhancedImageSelector.
   */
  notify?: NotifyFn;
}

/**
 * Internal image selector with upload, lazy loading, and edit/delete capabilities
 */
export function InternalImages({
  multiple = false,
  onSelect = () => {},
  attachmentImages,
  setAttachmentImages = () => {},
  isImagesLoading,
  selectedImages,
  setSelectedImages,
  backendHost,
  user,
  setUser,
  notify,
}: InternalImagesProps) {
  // Translation
  const { t } = useTranslation();

  // Upload query
  const { uploadFileModel } = useUpload({ backendHost, token: user?.token });
  const { deleteWithConfirm } = useModel<AttachmentFile>(
    'attachment',
    { backendHost, user, setUser },
    { pageSize: null },
  );

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingImages, setEditingImages] = useState<AttachmentFile[]>([]);

  // Track which images should be loaded
  const [loadedImages, setLoadedImages] = useState(new Set<number | string>());
  const lazyLoadObserverRef = useRef<IntersectionObserver | null>(null);

  // Loading state
  const [isUploading, setIsUploading] = useState(false);

  // Attachment images with mapping style
  const attachmentImagesMap = useMemo(
    () =>
      fromPairs(attachmentImages.map((o) => [o.id, o])) as Record<string | number, AttachmentFile>,
    [attachmentImages],
  );

  // Checkbox value
  const checkboxValue = useMemo(
    () =>
      isEditMode
        ? editingImages.map((o) => String(o.id))
        : selectedImages?.map((o) => String(o.id)) || [],
    [editingImages, isEditMode, selectedImages],
  );

  /**
   * Check if all images are selected for editing
   */
  const isSelectedAllEditing = useMemo(() => {
    return editingImages.length === attachmentImages.length;
  }, [attachmentImages.length, editingImages.length]);

  /**
   * Handle checkbox group value change for both edit mode and multi-select
   */
  const handleCheckboxChange = useCallback(
    (values: string[]) => {
      if (isEditMode) {
        setEditingImages(values.map((o) => attachmentImagesMap[Number(o)]));
      } else {
        if (multiple) {
          setSelectedImages?.(values.map((o) => attachmentImagesMap[Number(o)]));
        }
      }
    },
    [attachmentImagesMap, isEditMode, multiple, setSelectedImages],
  );

  /**
   * Ref callback for image containers — registers them with the IntersectionObserver
   */
  const imageRefCallback = (node: HTMLElement | null, imageId: string | number) => {
    if (node && lazyLoadObserverRef.current) {
      node.setAttribute(LAZY_LOAD_ATTRIBUTE, String(imageId));
      lazyLoadObserverRef.current.observe(node);
    }
  };

  /**
   * Handles file drops by uploading and prepending to the attachment list
   */
  const handleDropping = useCallback(
    async (files: File[]) => {
      if (files?.length) {
        setIsUploading(true);
        try {
          const newImageAttachments = (await uploadFileModel(
            'attachment',
            files,
          )) as AttachmentFile[];
          setAttachmentImages((prevState) => [...newImageAttachments, ...prevState]);
          notify?.({
            message: t('Uploaded successfully'),
            type: 'success',
          });
        } catch (err) {
          notify?.({
            message: (err as Error).message,
            type: 'error',
          });
          console.error(err);
        } finally {
          setIsUploading(false);
        }
      }
    },
    [notify, setAttachmentImages, t, uploadFileModel],
  );

  /**
   * Toggle select-all / deselect-all in edit mode
   */
  const handleSelectAll = useCallback(() => {
    if (isSelectedAllEditing) {
      setEditingImages([]);
    } else {
      setEditingImages(attachmentImages);
    }
  }, [attachmentImages, isSelectedAllEditing]);

  /**
   * Confirm and delete the selected editing images
   */
  const handleDelete = useCallback(() => {
    const deletingImageIds = editingImages.map((o) => o.id);
    if (deletingImageIds.length) {
      void deleteWithConfirm(deletingImageIds, () => {
        setEditingImages([]);
        setIsEditMode(false);
        setAttachmentImages((prevState) =>
          prevState.filter((o) => !deletingImageIds.includes(o.id)),
        );
      });
    }
  }, [deleteWithConfirm, editingImages, setAttachmentImages]);

  /**
   * Setup Intersection Observer for lazy loading images
   */
  useEffect(() => {
    lazyLoadObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const imageId = entry.target.getAttribute(LAZY_LOAD_ATTRIBUTE);
            if (imageId) {
              setLoadedImages((prev) => new Set([...prev, Number(imageId)]));
              lazyLoadObserverRef.current?.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: LAZY_LOAD_ROOT_MARGIN,
        threshold: LAZY_LOAD_THRESHOLD,
      },
    );

    return () => {
      lazyLoadObserverRef.current?.disconnect();
    };
  }, []);

  /**
   * Reset editing images when exiting edit mode
   */
  useEffect(() => {
    if (!isEditMode) {
      setEditingImages([]);
    }
  }, [isEditMode]);

  return (
    <>
      <Box>
        {/*region dropzone*/}
        <div className="mb-4">
          <Dropzone
            disabled={isImagesLoading || isUploading}
            onDrop={(files) => {
              void handleDropping(files);
            }}
            accept={IMAGE_MIME_TYPE}
            className="border-dashed border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-primary-main transition-colors"
          >
            <Group
              justify="center"
              gap="xl"
              style={{ minHeight: DROPZONE_MIN_HEIGHT, pointerEvents: 'none' }}
            >
              <Dropzone.Accept>
                <FontAwesomeIcon icon={faCloudArrowUp} className="text-3xl text-green-500" />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <FontAwesomeIcon icon={faXmark} className="text-3xl text-danger-main" />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <FontAwesomeIcon icon={faImage} className="text-3xl text-gray-500" />
              </Dropzone.Idle>
              <div className="text-center">
                <Text size="xl" inline className="font-medium">
                  {t('Drag files here or click to select files')}
                </Text>
                <Text size="sm" c="dimmed" inline mt={7}>
                  {t('Upload as many files as you need')}
                </Text>
              </div>
            </Group>
          </Dropzone>
        </div>
        {/*endregion dropzone*/}

        {/*region edit actions*/}
        <Box className="text-end my-4 mx-2 space-x-6">
          {isEditMode && !!editingImages?.length && (
            <UnstyledButton
              className="!text-primary-main font-bold space-x-2"
              onClick={handleDelete}
            >
              <FontAwesomeIcon icon={faX} />
              <span>{t('Delete')}</span>
            </UnstyledButton>
          )}
          {isEditMode && (
            <UnstyledButton
              className="!text-primary-main font-bold space-x-2"
              onClick={handleSelectAll}
            >
              <FontAwesomeIcon icon={faCheckDouble} />
              {isSelectedAllEditing ? (
                <span>{t('Deselect all')}</span>
              ) : (
                <span>{t('Select all')}</span>
              )}
            </UnstyledButton>
          )}
          <UnstyledButton
            className="!text-primary-main font-bold space-x-2"
            onClick={() => setIsEditMode((prevState) => !prevState)}
          >
            <FontAwesomeIcon icon={faPenToSquare} />
            <span>{t('Toggle edit')}</span>
          </UnstyledButton>
        </Box>
        {/*endregion edit actions*/}

        {/*region images checkbox*/}
        <Checkbox.Group value={checkboxValue} onChange={handleCheckboxChange}>
          <Box className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6  gap-3">
            {attachmentImages.map((attachmentImage, index) => {
              const shouldLoad = loadedImages.has(attachmentImage.id);

              return (
                <Checkbox.Card
                  key={index}
                  radius="md"
                  className="overflow-hidden"
                  withBorder={false}
                  value={String(attachmentImage.id)}
                  onClick={() => !isEditMode && onSelect?.(attachmentImage)}
                >
                  <Box
                    className="relative"
                    ref={(node) => imageRefCallback(node as HTMLElement | null, attachmentImage.id)}
                  >
                    <Box
                      className={clsx(
                        'absolute top-0 left-0 p-2',
                        !multiple && !isEditMode && 'hidden',
                      )}
                    >
                      <Checkbox.Indicator size="md" className="!cursor-pointer" />
                    </Box>
                    <AspectRatio
                      ratio={1}
                      mx="auto"
                      className={clsx(
                        'transition-all duration-200',
                        checkboxValue.includes(String(attachmentImage.id))
                          ? 'border-4 border-gray !rounded-xl overflow-hidden'
                          : 'hover:border-4 border-gray-westar !rounded-xl overflow-hidden',
                      )}
                    >
                      {shouldLoad ? (
                        <Image
                          className="!rounded-lg"
                          alt={attachmentImage.name}
                          src={getAttachmentRelativeUrl(attachmentImage.name)}
                        />
                      ) : (
                        <Box className="w-full h-full bg-gray-100 animate-pulse" />
                      )}
                    </AspectRatio>
                  </Box>
                </Checkbox.Card>
              );
            })}
          </Box>
        </Checkbox.Group>
        {/*endregion images checkbox*/}

        {/*region empty state alert*/}
        {!isImagesLoading && !attachmentImages.length && (
          <Box className="text-center space-y-3 px-6 py-16">
            <FontAwesomeIcon size="3x" icon={faImages} className="text-gray-pale-sky" />
            <Text c="dimmed" size="sm">
              {t('No images found.')}
            </Text>
          </Box>
        )}
        {/*endregion empty state alert*/}
      </Box>
    </>
  );
}
