import { EnhancedImageSelector as BaseEnhancedImageSelector } from '@deepsel/cms-react';
import BackendHostURLState from '../../stores/BackendHostURLState.js';
import UserState from '../../stores/UserState.js';
import NotificationState from '../../stores/NotificationState.js';

export function EnhancedImageSelector(props) {
  const { backendHost } = BackendHostURLState();
  const { user, setUser } = UserState();
  const { notify } = NotificationState();
  return (
    <BaseEnhancedImageSelector
      backendHost={backendHost}
      user={user}
      setUser={setUser}
      notify={notify}
      {...props}
    />
  );
}

export function EnhancedImageSelectorModal(props) {
  return <EnhancedImageSelector {...props} />;
}
