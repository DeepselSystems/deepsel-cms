import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BackendHostURLState from '../../../../common/stores/BackendHostURLState.js';
import NotificationState from '../../../../common/stores/NotificationState.js';
import UserState from '../../../../common/stores/UserState.js';
import { getAttachmentUrl } from '../../../../common/utils/index.js';
import useFetch from '../../../../common/api/useFetch.js';

/** Monotonically increasing counter for generating unique tempIds for pending new versions. */
let tempIdCounter = 0;
const nextTempId = () => `tmp-${++tempIdCounter}`;

/**
 * @typedef LocalVersionDraft
 * @property {string} altText - Draft alt text value
 * @property {number|null} localeId - Draft locale ID assignment
 */

/**
 * @typedef PendingFileReplacement
 * @property {File} file - New file staged to replace the existing one
 * @property {string|null} previewUrl - Blob URL for image preview (null for non-images)
 */

/**
 * @typedef PendingNewVersion
 * @property {string} tempId - Unique identifier for this pending row (not a real DB id)
 * @property {number|null} localeId - Selected locale for this new version
 * @property {File|null} file - Staged file (null = not yet chosen)
 * @property {string|null} previewUrl - Blob URL for image preview (null if no file or non-image)
 * @property {string} name - Custom name for this version; auto-filled from file.name when a file is staged
 * @property {string} altText - Alternative text for this version
 */

/**
 * @typedef UseAttachmentEditResult
 * @property {import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion[]} versions
 * @property {Set<number>} usedLocaleIds
 * @property {(version: import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion) => LocalVersionDraft} getDraft
 * @property {(versionId: number, patch: Partial<LocalVersionDraft>) => void} updateDraft
 * @property {(versionId: number, file: File) => void} stageFileReplacement
 * @property {Object.<number, PendingFileReplacement>} pendingFileReplacements
 * @property {() => void} addPendingVersion
 * @property {(tempId: string, patch: Partial<PendingNewVersion>) => void} updatePendingVersion
 * @property {(tempId: string) => void} removePendingVersion
 * @property {PendingNewVersion[]} pendingNewVersions
 * @property {boolean} hasPendingChanges
 * @property {(version: import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion) => string|null} getVersionPreviewUrl
 * @property {(version: import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion) => boolean} isVersionImage
 * @property {() => Promise<void>} saveAll
 * @property {boolean} loading
 */

/**
 * Derives a safe file extension from a File object.
 * Returns empty string when the name has no dot.
 *
 * @param {File} file
 * @returns {string}
 */
function getFileExtension(file) {
  const dotIdx = file.name.lastIndexOf('.');
  return dotIdx >= 0 ? file.name.slice(dotIdx + 1) : '';
}

/**
 * Wraps a File in a new File with a different name, preserving type and content.
 *
 * @param {File} file
 * @param {string} newName
 * @returns {File}
 */
function renameFile(file, newName) {
  return new File([file], newName, { type: file.type });
}

/**
 * Manages all draft state and API calls for EditAttachmentModal.
 *
 * All changes (metadata edits, file replacements, new versions) are staged locally
 * and only submitted to the backend when saveAll() is called via a single
 * POST /{attachment_id}/locale_versions/batch_upsert request.
 *
 * @param {{ attachment: import('../../../../typedefs/AttachmentFile.js').AttachmentFile, onSaved?: (updated: import('../../../../typedefs/AttachmentFile.js').AttachmentFile) => void }} params
 * @returns {UseAttachmentEditResult}
 */
export function useAttachmentEdit({ attachment, onSaved }) {
  const { t } = useTranslation();
  const { backendHost } = BackendHostURLState((state) => state);
  const { notify } = NotificationState((state) => state);
  const { user } = UserState((state) => state);
  const { post: upsert } = useFetch(`attachment/${attachment.id}/locale_versions/batch_upsert`);

  const [versions, setVersions] = useState(attachment?.locale_versions ?? []);
  /** { [versionId]: { altText, localeId } } */
  const [metaDrafts, setMetaDrafts] = useState({});
  /** { [versionId]: { file, previewUrl } } */
  const [pendingFileReplacements, setPendingFileReplacements] = useState({});
  /** [{ tempId, localeId, file, previewUrl, name, altText }] */
  const [pendingNewVersions, setPendingNewVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  /** Revoke all staged object URLs on unmount to prevent memory leaks. */
  useEffect(() => {
    return () => {
      Object.values(pendingFileReplacements).forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
      pendingNewVersions.forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    };
    // Intentionally run only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Authorization headers for fetch calls. */
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${user?.token}` }), [user?.token]);

  /**
   * Union of existing version locale IDs and pending new version locale IDs.
   * Used to exclude already-assigned locales from locale selectors.
   */
  const usedLocaleIds = useMemo(() => {
    const ids = new Set(versions.map((v) => v.locale_id).filter(Boolean));
    pendingNewVersions.forEach((pv) => {
      if (pv.localeId) ids.add(pv.localeId);
    });
    return ids;
  }, [versions, pendingNewVersions]);

  /**
   * Returns the merged draft for a version — draft fields override persisted fields.
   * @param {import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion} version
   * @returns {LocalVersionDraft}
   */
  const getDraft = (version) => ({
    altText: metaDrafts[version.id]?.altText ?? version.alt_text ?? '',
    localeId: metaDrafts[version.id]?.localeId ?? version.locale_id ?? null,
  });

  /**
   * Merges a metadata patch into the draft for one existing version.
   * @param {number} versionId
   * @param {Partial<LocalVersionDraft>} patch
   */
  const updateDraft = (versionId, patch) => {
    setMetaDrafts((prev) => ({
      ...prev,
      [versionId]: { ...prev[versionId], ...patch },
    }));
  };

  /**
   * Stages a file to replace the current file for an existing version.
   * Generates a local blob preview URL for images.
   * @param {number} versionId
   * @param {File} file
   */
  const stageFileReplacement = (versionId, file) => {
    if (pendingFileReplacements[versionId]?.previewUrl) {
      URL.revokeObjectURL(pendingFileReplacements[versionId].previewUrl);
    }
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPendingFileReplacements((prev) => ({
      ...prev,
      [versionId]: { file, previewUrl },
    }));
  };

  /** Appends an empty pending new-version row. */
  const addPendingVersion = () => {
    setPendingNewVersions((prev) => [
      ...prev,
      { tempId: nextTempId(), localeId: null, file: null, previewUrl: null, name: '', altText: '' },
    ]);
  };

  /**
   * Updates a field on a pending new version. Automatically generates a preview URL
   * when the file changes.
   * @param {string} tempId
   * @param {Partial<PendingNewVersion>} patch
   */
  const updatePendingVersion = (tempId, patch) => {
    setPendingNewVersions((prev) =>
      prev.map((pv) => {
        if (pv.tempId !== tempId) return pv;
        const next = { ...pv, ...patch };
        if ('file' in patch) {
          if (pv.previewUrl) URL.revokeObjectURL(pv.previewUrl);
          next.previewUrl = patch.file?.type.startsWith('image/')
            ? URL.createObjectURL(patch.file)
            : null;
          // Auto-fill name from the file when the user hasn't set a custom name yet
          if (patch.file && !pv.name) next.name = patch.file.name;
        }
        return next;
      }),
    );
  };

  /**
   * Removes a pending new version and revokes its preview URL.
   * @param {string} tempId
   */
  const removePendingVersion = (tempId) => {
    setPendingNewVersions((prev) => {
      const removed = prev.find((pv) => pv.tempId === tempId);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((pv) => pv.tempId !== tempId);
    });
  };

  /** True when any staged change has not yet been submitted to the backend. */
  const hasPendingChanges =
    Object.keys(metaDrafts).length > 0 ||
    Object.keys(pendingFileReplacements).length > 0 ||
    pendingNewVersions.some((pv) => pv.localeId && pv.file);

  /**
   * Returns the preview URL for an existing version.
   * Staged replacement preview takes priority over the persisted file URL.
   * Returns null for non-image files with no staged replacement.
   *
   * @param {import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion} version
   * @returns {string|null}
   */
  const getVersionPreviewUrl = (version) => {
    const staged = pendingFileReplacements[version.id];
    if (staged) return staged.previewUrl;
    if (version.content_type?.startsWith('image')) {
      return getAttachmentUrl(backendHost, version.name);
    }
    return null;
  };

  /**
   * Returns true if the content for this version should be treated as an image.
   * Checks staged file type first, then falls back to the persisted content_type.
   *
   * @param {import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion} version
   * @returns {boolean}
   */
  const isVersionImage = (version) => {
    const staged = pendingFileReplacements[version.id];
    if (staged) return staged.file.type.startsWith('image/');
    return version.content_type?.startsWith('image') ?? false;
  };

  /**
   * Submits all staged changes to the backend in a single batch request:
   *   POST /{attachment_id}/locale_versions/batch_upsert
   *
   * Items are built from three sources:
   *   - Existing versions with metadata-only changes (no file replacement)
   *   - Existing versions with a staged file replacement (may include metadata changes)
   *   - Pending new versions (locale + file required)
   *
   * Files are attached as multipart entries named "<_file_id>.<ext>" so the backend
   * can match them to their respective items.
   *
   * On partial failure (has_errors=true), all successful items are reflected in the
   * returned attachment and an error notification lists the failures. The UI state is
   * refreshed regardless so successfully saved items don't re-submit on the next save.
   */
  const saveAll = async () => {
    setLoading(true);
    try {
      const items = [];
      const files = [];

      // Existing versions — metadata only (alt_text / locale_id, no new file)
      for (const [versionIdStr, draft] of Object.entries(metaDrafts)) {
        const versionId = Number(versionIdStr);
        // Skip here if there is also a file replacement — that branch handles both together
        if (pendingFileReplacements[versionId]) continue;
        const version = versions.find((v) => v.id === versionId);
        if (!version) continue;

        const item = {
          attachment_locale_version_id: versionId,
          locale_id: draft.localeId ?? version.locale_id,
        };
        if (draft.altText !== undefined) item.alt_text = draft.altText;
        items.push(item);
      }

      // Existing versions — file replacement (merges any co-existing metadata draft)
      for (const [versionIdStr, { file }] of Object.entries(pendingFileReplacements)) {
        const versionId = Number(versionIdStr);
        const version = versions.find((v) => v.id === versionId);
        if (!version) continue;

        const draft = metaDrafts[versionId];
        const effectiveLocaleId = draft?.localeId ?? version.locale_id;
        const effectiveAltText = draft?.altText ?? version.alt_text ?? '';

        const fileId = `replace-${versionId}`;
        const ext = getFileExtension(file);
        files.push(renameFile(file, ext ? `${fileId}.${ext}` : fileId));

        items.push({
          attachment_locale_version_id: versionId,
          locale_id: effectiveLocaleId,
          alt_text: effectiveAltText,
          _file_id: fileId,
        });
      }

      // New versions
      for (const pv of pendingNewVersions) {
        if (!pv.localeId || !pv.file) continue;

        const fileId = `new-${pv.tempId}`;
        const ext = getFileExtension(pv.file);
        files.push(renameFile(pv.file, ext ? `${fileId}.${ext}` : fileId));

        items.push({
          attachment_locale_version_id: null,
          locale_id: pv.localeId,
          alt_text: pv.altText || '',
          name: pv.name || pv.file.name,
          _file_id: fileId,
        });
      }

      if (items.length === 0) return;

      const formData = new FormData();
      formData.append('items_json', JSON.stringify(items));
      files.forEach((f) => formData.append('files', f));

      const res = await fetch(
        `${backendHost}/attachment/${attachment.id}/locale_versions/batch_upsert`,
        { method: 'POST', headers: authHeaders, body: formData },
      );

      if (!res.ok) {
        const { detail } = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(detail);
      }

      const { attachment: updated, results, has_errors } = await res.json();

      if (has_errors) {
        const errorMessages = results
          .filter((r) => !r.success && r.error)
          .map((r) => r.error)
          .join('; ');
        notify({ message: errorMessages || t('Some changes failed to save'), type: 'error' });
      } else {
        notify({ message: t('Changes saved successfully'), type: 'success' });
      }

      setVersions(updated.locale_versions ?? []);
      onSaved?.(updated);
      setMetaDrafts({});
      setPendingFileReplacements({});
      setPendingNewVersions([]);
    } catch (err) {
      notify({ message: err.message, type: 'error' });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    versions,
    usedLocaleIds,
    getDraft,
    updateDraft,
    stageFileReplacement,
    pendingFileReplacements,
    addPendingVersion,
    updatePendingVersion,
    removePendingVersion,
    pendingNewVersions,
    hasPendingChanges,
    getVersionPreviewUrl,
    isVersionImage,
    saveAll,
    loading,
  };
}
