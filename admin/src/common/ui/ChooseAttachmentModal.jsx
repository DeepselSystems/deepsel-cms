import { ChooseAttachmentModal as BaseChooseAttachmentModal } from '@deepsel/cms-react';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import UserState from '../stores/UserState.js';
import NotificationState from '../stores/NotificationState.js';
import FileAttachmentState from '../stores/FileAttachmentState.js';

export default function ChooseAttachmentModal(props) {
  const { backendHost } = BackendHostURLState();
  const { user, setUser } = UserState();
  const { notify } = NotificationState();
  const { uploadSizeLimit, fetchUploadSizeLimit } = FileAttachmentState();
  return (
    <BaseChooseAttachmentModal
      backendHost={backendHost}
      user={user}
      setUser={setUser}
      notify={notify}
      uploadSizeLimit={uploadSizeLimit}
      onFetchUploadSizeLimit={fetchUploadSizeLimit}
      {...props}
    />
  );
}
