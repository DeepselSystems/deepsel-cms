import { DataGridColumnMenu as BaseDataGridColumnMenu } from '@deepsel/cms-react';
import APISchemaState from '../stores/APISchemaState.js';
import NotificationState from '../stores/NotificationState.js';

export default function DataGridColumnMenu(props) {
  const { APISchema } = APISchemaState();
  const { notify } = NotificationState();
  return <BaseDataGridColumnMenu apiSchema={APISchema} notify={notify} {...props} />;
}
