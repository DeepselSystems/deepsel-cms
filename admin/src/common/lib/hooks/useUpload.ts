import { useState } from 'react';

export interface UseUploadConfig {
  backendHost: string;
  /** JWT token from the authenticated user */
  token: string | undefined;
}

export interface UseUploadReturn {
  loading: boolean;
  error: string | null;
  uploadFileModel: (
    api: string,
    files: File[] | FileList,
    queryParams?: Record<string, string | number>,
  ) => Promise<unknown[]>;
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
   * @param api - API path (e.g. "attachment")
   * @param files - Files to upload
   * @param queryParams - Optional query params appended to the URL (e.g. locale_id)
   * @returns Array of uploaded attachments from the server
   */
  async function uploadFileModel(
    api: string,
    files: File[] | FileList,
    queryParams?: Record<string, string | number>,
  ): Promise<unknown[]> {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      if (typeof window !== 'undefined') {
        const organizationId = parseInt(localStorage.getItem('organizationId') || '', 10);
        if (Number.isFinite(organizationId)) {
          headers['X-Organization-Id'] = organizationId.toString();
        }
      }

      let url = `${backendHost}/${api}`;
      if (queryParams) {
        const params = new URLSearchParams(
          Object.fromEntries(Object.entries(queryParams).map(([k, v]) => [k, String(v)])),
        );
        url = `${url}?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      if (response.status !== 200) {
        const { detail } = (await response.json()) as { detail: string };
        setError(detail);
        throw new Error(detail);
      }

      return await response.json();
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
