import { UserAvatar as BaseUserAvatar } from '../lib/ui/UserAvatar/UserAvatar';
import BackendHostURLState from '../stores/BackendHostURLState.js';

export default function UserAvatar(props) {
  const { backendHost } = BackendHostURLState();
  return <BaseUserAvatar backendHost={backendHost} {...props} />;
}
