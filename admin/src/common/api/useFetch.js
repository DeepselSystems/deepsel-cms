import { useFetch as useFetchBase } from '@deepsel/cms-react';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import UserState from '../stores/UserState.js';

export default function useFetch(url, options = {}) {
  const { backendHost } = BackendHostURLState();
  const { setUser } = UserState();

  return useFetchBase(url, { backendHost, setUser }, options);
}
