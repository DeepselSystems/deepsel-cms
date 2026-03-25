import { HtmlComponentsModal as BaseHtmlComponentsModal } from '@deepsel/cms-react';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import UserState from '../stores/UserState.js';
import OrganizationIdState from '../stores/OrganizationIdState.js';

export default function HtmlComponentsModal(props) {
  const { backendHost } = BackendHostURLState();
  const { user, setUser } = UserState();
  const { organizationId } = OrganizationIdState();
  return (
    <BaseHtmlComponentsModal
      backendHost={backendHost}
      user={user}
      setUser={setUser}
      organizationId={organizationId}
      {...props}
    />
  );
}
