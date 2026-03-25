import { RichTextEditor as BaseRichTextEditor } from '@deepsel/cms-editor';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import UserState from '../stores/UserState.js';

export default function RichTextEditor(props) {
  const { backendHost } = BackendHostURLState();
  const { user, setUser } = UserState();
  return (
    <BaseRichTextEditor backendHost={backendHost} user={user} setUser={setUser} {...props} />
  );
}
