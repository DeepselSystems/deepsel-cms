import { FileInput as BaseFileInput } from '@deepsel/cms-react';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import UserState from '../stores/UserState.js';

export default function FileInput(props) {
  const { backendHost } = BackendHostURLState();
  const { user, setUser } = UserState();
  return <BaseFileInput backendHost={backendHost} user={user} setUser={setUser} {...props} />;
}
