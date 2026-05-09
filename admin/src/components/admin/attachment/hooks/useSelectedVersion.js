import { useState, useMemo } from 'react';
import { pickDefaultVersion } from '../../../../common/utils/versionSelector.js';

/**
 * @typedef UseSelectedVersionResult
 * @property {import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion|null} selectedVersion - Currently active locale version
 * @property {(version: import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion) => void} setSelectedVersion
 * @property {import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion[]} availableVersions - All locale versions for the attachment
 */

/**
 * Manages which locale version is currently displayed on an attachment card.
 *
 * Selection logic:
 *   - Defaults to the version matching defaultLocaleId (site default language)
 *   - Falls back to the version with the lowest id when no default match is found
 *   - When the user explicitly selects a version, stores its id so the selection
 *     survives versions-array reference changes (e.g. after a refetch)
 *   - If the stored id no longer exists (e.g. version deleted), auto-picks again
 *
 * @param {import('../../../../typedefs/AttachmentFile.js').AttachmentFile} attachment
 * @param {number|null} defaultLocaleId
 * @returns {UseSelectedVersionResult}
 */
export function useSelectedVersion(attachment, defaultLocaleId) {
  /** @type {import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion[]} */
  const versions = useMemo(() => attachment?.locale_versions ?? [], [attachment]);

  // null means "auto-pick via pickDefaultVersion"; set to a specific id on user selection
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  /** @type {import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion|null} */
  const selectedVersion = useMemo(() => {
    if (selectedVersionId !== null) {
      const found = versions.find((v) => v.id === selectedVersionId);
      // If the stored id still exists, use it; otherwise fall through to auto-pick
      if (found) return found;
    }
    return pickDefaultVersion(versions, defaultLocaleId);
  }, [selectedVersionId, versions, defaultLocaleId]);

  /**
   * Explicitly selects a locale version by its id.
   * @param {import('../../../../typedefs/AttachmentFile.js').AttachmentLocaleVersion} version
   */
  const setSelectedVersion = (version) => setSelectedVersionId(version.id);

  return { selectedVersion, setSelectedVersion, availableVersions: versions };
}
