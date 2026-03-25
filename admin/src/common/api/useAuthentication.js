import { useAuthentication as useAuthenticationBase } from '@deepsel/cms-react';
import { setCookie, removeCookie } from '@deepsel/cms-utils';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import UserState from '../stores/UserState.js';
import OrganizationIdState from '../stores/OrganizationIdState.js';

export default function useAuthentication() {
  const { backendHost } = BackendHostURLState();
  const { user, setUser } = UserState();
  const { organizationId, setOrganizationId } = OrganizationIdState();

  return useAuthenticationBase({
    backendHost,
    user,
    setUser,
    organizationId,
    setOrganizationId,
    setCookie,
    removeCookie,
  });
}
