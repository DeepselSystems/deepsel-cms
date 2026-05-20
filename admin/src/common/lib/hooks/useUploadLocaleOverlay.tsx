import React, { useCallback, useRef } from 'react';
import { IconUpload } from '@tabler/icons-react';
import { AttachmentCardOverlay } from '../ui/AttachmentCardOverlay';
import { useFetch } from './useFetch';
import type { User } from '../types';
import type { NotifyFn } from '../types';
import type { AttachmentFile } from '../ui';
import BackendHostURLState from '../../stores/BackendHostURLState';

/** Shape of the batch_upsert endpoint response */
interface BatchUpsertResult {
  attachment: AttachmentFile;
  has_errors: boolean;
}

interface UseUploadLocaleOverlayOptions {
  /** Parent attachment object */
  attachment: AttachmentFile;
  /** Currently selected locale ID — null disables the upload action */
  selectedLocaleId: number | null;
  /** Display name of the selected language — used in the button tooltip */
  selectedLangName: string | null;
  /** setUser from UserState — forwarded to useFetch for 401 handling */
  setUser: (user: User | null) => void;
  /** Optional notification callback */
  notify?: NotifyFn;
  /** Called with the updated attachment and the locale ID that was just uploaded */
  onVersionUploaded: (attachment: AttachmentFile, localeId: number) => void;
  /** Translation function from useTranslation() */
  t: (key: string, options?: Record<string, unknown>) => string;
}

interface UseUploadLocaleOverlayReturn {
  /**
   * Overlay React node to pass as the `overlay` prop to AttachmentPreview.
   * Undefined when no upload action applies (version exists or no locale selected).
   */
  uploadOverlay: React.ReactNode | undefined;
  /** Hidden <input type="file"> — must be rendered somewhere in the component tree */
  fileInputElement: React.ReactNode;
}

/**
 * Manages the complete "Upload for {lang}" feature for an attachment locale version:
 * shows the overlay action button when no file exists for the selected locale,
 * handles the hidden file input, builds the multipart request, and calls onVersionUploaded
 * with the updated attachment after a successful upload.
 *
 * Pass uploadOverlay as the overlay prop to AttachmentPreview and render
 * fileInputElement alongside the preview.
 * Pass selectedLocaleId = null to suppress the action (e.g. in select mode).
 */
export function useUploadLocaleOverlay({
  attachment,
  selectedLocaleId,
  selectedLangName,
  setUser,
  notify,
  onVersionUploaded,
  t,
}: UseUploadLocaleOverlayOptions): UseUploadLocaleOverlayReturn {
  const attachmentId = attachment.id;
  const hasAttachmentVersion = attachment.locale_versions?.some(
    (v) => v.locale_id === selectedLocaleId,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { backendHost } = BackendHostURLState();

  const { post: batchUpsert } = useFetch<never, BatchUpsertResult>('attachment', {
    backendHost,
    setUser,
  });

  const handleUpload = useCallback(
    async (file: File, localeId: number) => {
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop()! : '';
      const renamedFile = new File([file], `upload${ext}`, { type: file.type });
      const formData = new FormData();
      formData.append(
        'items_json',
        JSON.stringify([
          {
            locale_id: localeId,
            attachment_locale_version_id: null,
            _file_id: 'upload',
            name: file.name.replace(/\.[^/.]+$/, ''),
          },
        ]),
      );
      formData.append('files', renamedFile);
      try {
        const result = await batchUpsert(formData, {
          path: `attachment/${attachmentId}/locale_versions/batch_upsert`,
        });
        if (result?.attachment) {
          onVersionUploaded(result.attachment, localeId);
        }
        notify?.({ message: t('Uploaded successfully'), type: 'success' });
      } catch (err) {
        notify?.({ message: (err as Error).message, type: 'error' });
        console.error(err);
      }
    },
    [attachmentId, batchUpsert, notify, onVersionUploaded, t],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.files?.[0];
      if (!picked || selectedLocaleId == null) return;
      e.target.value = '';
      void handleUpload(picked, selectedLocaleId);
    },
    [handleUpload, selectedLocaleId],
  );

  const showUploadAction = selectedLocaleId != null && !hasAttachmentVersion;

  const uploadOverlay = showUploadAction ? (
    <AttachmentCardOverlay
      actions={[
        {
          key: 'upload-for-lang',
          icon: IconUpload,
          label: selectedLangName
            ? t('Upload for {{lang}}', { lang: selectedLangName })
            : t('Upload'),
          onClick: (e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          },
        },
      ]}
      blurred={false}
    />
  ) : undefined;

  const fileInputElement = (
    <input
      ref={fileInputRef}
      type="file"
      className="hidden"
      onChange={handleFileInputChange}
      onClick={(e) => e.stopPropagation()}
    />
  );

  return { uploadOverlay, fileInputElement };
}
