import { useState } from 'react';

export interface UseUploadConfig {
  backendHost: string;
  /** JWT token from the authenticated user */
  token: string | undefined;
}

export interface UseUploadReturn {
  loading: boolean;
  error: string | null;
  uploadFileModel: (api: string, files: File[] | FileList) => Promise<unknown[]>;
}

/**
 * Hook for uploading files to the backend via multipart form data
 */
export function useUpload(config: UseUploadConfig): UseUploadReturn {
  const { backendHost, token } = config;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Uploads one or more files to the given API endpoint
   * @param api - API path (e.g. "file/upload")
   * @param files - Files to upload
   * @returns Array of parsed JSON responses, one per file
   */
  async function uploadFileModel(api: string, files: File[] | FileList): Promise<unknown[]> {
    try {
      setLoading(true);
      setError(null);

      const fileArray = Array.from(files);

      return await Promise.all(
        fileArray.map(async (file) => {
          const formData = new FormData();
          formData.append('files', file);

          const response = await fetch(`${backendHost}/${api}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (response.status !== 200) {
            const { detail } = (await response.json()) as { detail: string };
            setError(detail);
            throw new Error(detail);
          }

          return response.json();
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    error,
    uploadFileModel,
  };
}
