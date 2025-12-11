import {useMemo, useState, useEffect, useRef, useCallback} from 'react';
import clsx from 'clsx';
import {
  Box,
  Image,
  Text,
  Checkbox,
  AspectRatio,
  Group,
  UnstyledButton,
} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import {getAttachmentRelativeUrl} from '../../../utils/index.js';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
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
import {Dropzone, IMAGE_MIME_TYPE} from '@mantine/dropzone';
import useUpload from '../../../api/useUpload.js';
import NotificationState from '../../../stores/NotificationState.js';
import useModel from '../../../api/useModel.jsx';

/**
 * Internal images selector
 *
 * @param {boolean} multiple
 * @param {(attachmentImage: AttachmentFile) => void} onSelect
 * @param {Array<AttachmentFile>} attachmentImages
 * @param {React.Dispatch<React.SetStateAction<Array<AttachmentFile>>>} setAttachmentImages
 * @param {boolean} isImagesLoading
 * @param {Array<AttachmentFile>} selectedImages
 * @param {React.Dispatch<React.SetStateAction<Array<AttachmentFile>>>} setSelectedImages
 *
 * @returns {JSX.Element}
 * @constructor
 */
const InternalImages = ({
  multiple = false,
  onSelect = () => {},
  attachmentImages,
  setAttachmentImages = () => {},
  isImagesLoading,
  selectedImages,
  setSelectedImages,
}) => {
  // Translation
  const {t} = useTranslation();

  // Notification
  const {notify} = NotificationState((state) => state);

  // Upload query
  const {uploadFileModel} = useUpload();
  const {deleteWithConfirm} = useModel('attachment', {
    pageSize: null,
  });

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingImages, setEditingImages] = useState(
    /** @type {Array<AttachmentFile>}*/ []
  );

  // Track which images should be loaded
  const [loadedImages, setLoadedImages] = useState(new Set());
  const lazyLoadObserverRef = useRef(null);
  const lazyLoadAttributeName = 'data-image-id';

  // Loading state
  const [isUploading, setIsUploading] = useState(false);

  // Attachment images with mapping style
  const attachmentImagesMap = useMemo(
    () => fromPairs(attachmentImages.map((o) => [o.id, o])),
    [attachmentImages]
  );

  // Checkbox value
  const checkboxValue = useMemo(
    () =>
      isEditMode
        ? editingImages.map((o) => String(o.id))
        : selectedImages?.map((o) => String(o.id)) || [],
    [editingImages, isEditMode, selectedImages]
  );

  /**
   * Check if all images are selected
   * @type {boolean}
   */
  const isSelectedAllEditing = useMemo(() => {
    return editingImages.length === attachmentImages.length;
  }, [attachmentImages.length, editingImages.length]);

  /**
   * Handle checkbox change
   * @type {(values: Array<string>) => void}
   */
  const handleCheckboxChange = useCallback(
    (values) => {
      if (isEditMode) {
        setEditingImages(values.map((o) => attachmentImagesMap[Number(o)]));
      } else {
        !!multiple &&
          setSelectedImages(values.map((o) => attachmentImagesMap[Number(o)]));
      }
    },
    [attachmentImagesMap, isEditMode, multiple, setSelectedImages]
  );

  // Observe image containers when they mount
  const imageRefCallback = (node, imageId) => {
    if (node && lazyLoadObserverRef.current) {
      node.setAttribute(lazyLoadAttributeName, imageId);
      lazyLoadObserverRef.current.observe(node);
    }
  };

  /**
   * @type {(files: Array<File>) => void}
   */
  const handleDropping = useCallback(
    async (files) => {
      if (files?.length) {
        setIsUploading(true);
        try {
          const newImageAttachments = await uploadFileModel(
            'attachment',
            files
          );
          setAttachmentImages((prevState) => [
            ...newImageAttachments,
            ...prevState,
          ]);
          notify({
            message: t('Uploaded successfully'),
            type: 'success',
          });
        } catch (err) {
          notify({
            message: err.message,
            type: 'error',
          });
          console.error(err);
        } finally {
          setIsUploading(false);
        }
      }
    },
    [notify, setAttachmentImages, t, uploadFileModel]
  );

  /**
   * Handle select all
   * @type {() => void}
   */
  const handleSelectAll = useCallback(() => {
    if (isSelectedAllEditing) {
      setEditingImages([]);
    } else {
      setEditingImages(attachmentImages);
    }
  }, [attachmentImages, isSelectedAllEditing]);

  /**
   * Handle delete image attachments
   *
   * @type {() => void}
   */
  const handleDelete = useCallback(() => {
    const deletingImageIds = editingImages.map((o) => o.id);
    deletingImageIds.length &&
      deleteWithConfirm(deletingImageIds, () => {
        setEditingImages([]);
        setIsEditMode(false);
        setAttachmentImages((prevState) =>
          prevState.filter((o) => !deletingImageIds.includes(o.id))
        );
      });
  }, [deleteWithConfirm, editingImages, setAttachmentImages]);

  /**
   * Setup Intersection Observer for lazy loading
   */
  useEffect(() => {
    lazyLoadObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const imageId = entry.target.getAttribute(lazyLoadAttributeName);
            if (imageId) {
              setLoadedImages((prev) => new Set([...prev, Number(imageId)]));
              lazyLoadObserverRef.current?.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    return () => {
      lazyLoadObserverRef.current?.disconnect();
    };
  }, []);

  /**
   * Reset editing images when exit edit mode
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
            onDrop={handleDropping}
            accept={IMAGE_MIME_TYPE}
            className="border-dashed border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-primary-main transition-colors"
          >
            <Group
              justify="center"
              gap="xl"
              style={{minHeight: 100, pointerEvents: 'none'}}
            >
              <Dropzone.Accept>
                <FontAwesomeIcon
                  icon={faCloudArrowUp}
                  className="text-3xl text-green-500"
                />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <FontAwesomeIcon
                  icon={faXmark}
                  className="text-3xl text-danger-main"
                />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <FontAwesomeIcon
                  icon={faImage}
                  className="text-3xl text-gray-500"
                />
              </Dropzone.Idle>
              <div className="text-center">
                <Text size="xl" inline className="font-medium">
                  {t('Drag files here or click to select files')}
                </Text>
                <Text size="sm" color="dimmed" inline mt={7}>
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
                    ref={(node) => imageRefCallback(node, attachmentImage.id)}
                  >
                    <Box
                      className={clsx(
                        'absolute top-0 left-0 p-2',
                        !multiple && !isEditMode && 'hidden'
                      )}
                    >
                      <Checkbox.Indicator
                        size="md"
                        className="!cursor-pointer"
                      />
                    </Box>
                    <AspectRatio
                      ratio={1}
                      mx="auto"
                      className={clsx(
                        'transition-all duration-200',
                        checkboxValue.includes(String(attachmentImage.id))
                          ? 'border-4 border-gray !rounded-xl overflow-hidden'
                          : 'hover:border-4 border-gray-westar !rounded-xl overflow-hidden'
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

        {/*region for not font alert*/}
        {!isImagesLoading && !attachmentImages.length && (
          <Box className="text-center space-y-3 px-6 py-16">
            <FontAwesomeIcon
              size="3x"
              icon={faImages}
              className="text-gray-pale-sky"
            />
            <Text c="dimmed" size="sm">
              {t('No images found.')}
            </Text>
          </Box>
        )}
        {/*endregion for not font alert*/}
      </Box>
    </>
  );
};

export default InternalImages;
