import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { Box, Text, Checkbox, Group, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import fromPairs from 'lodash/fromPairs';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { useModel } from '../../../hooks';
import { useUpload } from '../../../hooks';
import type { User } from '../../../types';
import type { NotifyFn } from '../../../types';
import type { AttachmentFile } from '../../ChooseAttachmentModal';
import { useDefaultLocale } from '../../../../hooks/useDefaultLocale';
import { AttachmentCardPreview } from './AttachmentCardPreview';
import {
  IconChecks,
  IconCloudUpload,
  IconEdit,
  IconPhoto,
  IconPhotoPlus,
  IconX,
} from '@tabler/icons-react';

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
 * Internal image selector with upload, lazy loading, and edit/delete capabilities.
 * Supports multi-lang attachments: each card shows a locale flag bar so the user
 * can switch between per-locale file versions before selecting.
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
  const { t } = useTranslation();

  const { defaultLocaleId, availableLanguages } = useDefaultLocale();

  const { uploadFileModel } = useUpload({ backendHost, token: user?.token });
  const { deleteWithConfirm } = useModel<AttachmentFile>(
    'attachment',
    { backendHost, user, setUser },
    { pageSize: null },
  );

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingImages, setEditingImages] = useState<AttachmentFile[]>([]);

  const [loadedImages, setLoadedImages] = useState(new Set<number | string>());
  const lazyLoadObserverRef = useRef<IntersectionObserver | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  /**
   * Per-card selected locale ID.
   * Key: attachment.id, Value: locale_id of the currently previewed version.
   * Absent = fall back to default locale (resolved inside AttachmentCardPreview).
   */
  const [selectedLocaleIds, setSelectedLocaleIds] = useState<Record<string | number, number>>({});

  const attachmentImagesMap = useMemo(
    () =>
      fromPairs(attachmentImages.map((o) => [o.id, o])) as Record<string | number, AttachmentFile>,
    [attachmentImages],
  );

  const checkboxValue = useMemo(
    () =>
      isEditMode
        ? editingImages.map((o) => String(o.id))
        : selectedImages?.map((o) => String(o.id)) || [],
    [editingImages, isEditMode, selectedImages],
  );

  const isSelectedAllEditing = useMemo(
    () => editingImages.length === attachmentImages.length,
    [attachmentImages.length, editingImages.length],
  );

  const handleCheckboxChange = useCallback(
    (values: string[]) => {
      if (isEditMode) {
        setEditingImages(values.map((o) => attachmentImagesMap[Number(o)]));
      } else if (multiple) {
        setSelectedImages?.(values.map((o) => attachmentImagesMap[Number(o)]));
      }
    },
    [attachmentImagesMap, isEditMode, multiple, setSelectedImages],
  );

  /**
   * Ref callback for image containers — registers them with the IntersectionObserver
   */
  const imageRefCallback = useCallback((node: HTMLElement | null, imageId: string | number) => {
    if (node && lazyLoadObserverRef.current) {
      node.setAttribute(LAZY_LOAD_ATTRIBUTE, String(imageId));
      lazyLoadObserverRef.current.observe(node);
    }
  }, []);

  /**
   * Handle file drop
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
          notify?.({ message: t('Uploaded successfully'), type: 'success' });
        } catch (err) {
          notify?.({ message: (err as Error).message, type: 'error' });
          console.error(err);
        } finally {
          setIsUploading(false);
        }
      }
    },
    [notify, setAttachmentImages, t, uploadFileModel],
  );

  /**
   * Handle select all checkbox change
   */
  const handleSelectAll = useCallback(() => {
    setEditingImages(isSelectedAllEditing ? [] : attachmentImages);
  }, [attachmentImages, isSelectedAllEditing]);

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
   * Initialize IntersectionObserver for lazy loading images
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
      { rootMargin: LAZY_LOAD_ROOT_MARGIN, threshold: LAZY_LOAD_THRESHOLD },
    );

    return () => {
      lazyLoadObserverRef.current?.disconnect();
    };
  }, []);

  /**
   * Reset editing images when edit mode is disabled
   */
  useEffect(() => {
    if (!isEditMode) setEditingImages([]);
  }, [isEditMode]);

  return (
    <>
      <Box>
        {/*region dropzone*/}
        <div className="mb-4">
          <Dropzone
            disabled={isImagesLoading || isUploading}
            onDrop={(files) => void handleDropping(files)}
            accept={IMAGE_MIME_TYPE}
            className="border-dashed border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-primary-main transition-colors"
          >
            <Group
              justify="center"
              gap="xl"
              style={{ minHeight: DROPZONE_MIN_HEIGHT, pointerEvents: 'none' }}
            >
              <Dropzone.Accept>
                <IconCloudUpload size={16} className="text-3xl text-green-500" />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={16} className="text-3xl text-danger-main" />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto size={16} className="text-3xl text-gray-500" />
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
              <IconX size={16} />
              <span>{t('Delete')}</span>
            </UnstyledButton>
          )}
          {isEditMode && (
            <UnstyledButton
              className="!text-primary-main font-bold space-x-2"
              onClick={handleSelectAll}
            >
              <IconChecks size={16} />
              <span>{isSelectedAllEditing ? t('Deselect all') : t('Select all')}</span>
            </UnstyledButton>
          )}
          <UnstyledButton
            className="!text-primary-main font-bold space-x-2"
            onClick={() => setIsEditMode((prev) => !prev)}
          >
            <IconEdit size={16} />
            <span>{t('Toggle edit')}</span>
          </UnstyledButton>
        </Box>
        {/*endregion edit actions*/}

        {/*region images grid*/}
        <Checkbox.Group value={checkboxValue} onChange={handleCheckboxChange}>
          <Box className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {attachmentImages.map((attachmentImage, index) => (
              <Checkbox.Card
                key={index}
                radius="md"
                className="overflow-hidden"
                withBorder={false}
                value={String(attachmentImage.id)}
                onClick={() => !isEditMode && onSelect?.(attachmentImage)}
              >
                {/* relative wrapper provides positioning context for the checkbox indicator */}
                <Box className="relative">
                  <Box
                    className={clsx(
                      'absolute top-0 left-0 p-2 z-10',
                      !multiple && !isEditMode && 'hidden',
                    )}
                  >
                    <Checkbox.Indicator size="md" className="!cursor-pointer" />
                  </Box>

                  <AttachmentCardPreview
                    attachment={attachmentImage}
                    shouldLoad={loadedImages.has(attachmentImage.id)}
                    isSelected={checkboxValue.includes(String(attachmentImage.id))}
                    observerRef={(node) => imageRefCallback(node, attachmentImage.id)}
                    selectedLocaleId={selectedLocaleIds[attachmentImage.id] ?? null}
                    onSelectLocale={(localeId) =>
                      setSelectedLocaleIds((prev) => ({ ...prev, [attachmentImage.id]: localeId }))
                    }
                    defaultLocaleId={defaultLocaleId}
                    availableLanguages={availableLanguages}
                  />
                </Box>
              </Checkbox.Card>
            ))}
          </Box>
        </Checkbox.Group>
        {/*endregion images grid*/}

        {/*region empty state*/}
        {!isImagesLoading && !attachmentImages.length && (
          <Box className="text-center space-y-3 px-6 py-16">
            <IconPhotoPlus size={16} className="text-gray-pale-sky" />
            <Text c="dimmed" size="sm">
              {t('No images found.')}
            </Text>
          </Box>
        )}
        {/*endregion empty state*/}
      </Box>
    </>
  );
}
