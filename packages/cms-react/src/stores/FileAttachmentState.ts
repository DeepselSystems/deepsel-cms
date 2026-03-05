import { create } from 'zustand';
import debounce from 'lodash/debounce';

interface UploadSizeLimit {
  max_size: number;
  unit: string;
}

interface FileAttachmentState {
  uploadSizeLimit: UploadSizeLimit | null;
  isFetchingUploadSizeLimit: boolean;
  fetchUploadSizeLimit: (apiFunc: () => Promise<UploadSizeLimit>) => void;
}

/**
 * Debounce delay to prevent redundant upload size limit API calls (in milliseconds)
 */
const FETCH_DEBOUNCE_DELAY_MS = 250;

/**
 * Store for managing file attachment metadata, including upload size limit caching
 */
export const FileAttachmentState = create<FileAttachmentState>((setState, getState) => {
  const fetchUploadSizeLimit = async (apiFunc: () => Promise<UploadSizeLimit>) => {
    if (getState().uploadSizeLimit) {
      return getState().uploadSizeLimit;
    }

    try {
      setState({ isFetchingUploadSizeLimit: true });
      const uploadSizeLimit = await Promise.resolve(apiFunc());
      setState({ uploadSizeLimit });
    } catch (e) {
      console.error(e);
    } finally {
      setState({ isFetchingUploadSizeLimit: false });
    }
  };

  /**
   * Debounced version to avoid multiple simultaneous API calls on mount
   */
  const debouncedFetchUploadSizeLimit = debounce(fetchUploadSizeLimit, FETCH_DEBOUNCE_DELAY_MS);

  return {
    uploadSizeLimit: null,
    isFetchingUploadSizeLimit: false,
    fetchUploadSizeLimit: (apiFunc) => void debouncedFetchUploadSizeLimit(apiFunc),
  };
});
