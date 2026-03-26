import { useUpload as useUploadBase } from '../lib/hooks';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import useAuthentication from './useAuthentication.js';

export default function useUpload() {
  const { user } = useAuthentication();
  const { backendHost } = BackendHostURLState();

  return useUploadBase({ backendHost, token: user?.token });
}
