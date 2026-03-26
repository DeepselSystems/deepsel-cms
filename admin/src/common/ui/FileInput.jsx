import { FileInput as BaseFileInput } from '../lib/ui/FileInput/FileInput';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import UserState from '../stores/UserState.js';

export default function FileInput(props) {
  const { backendHost } = BackendHostURLState();
  const { user, setUser } = UserState();
  return <BaseFileInput backendHost={backendHost} user={user} setUser={setUser} {...props} />;
}
