import { FileChipDisplay as BaseFileChipDisplay } from '@deepsel/cms-react';
import BackendHostURLState from '../stores/BackendHostURLState.js';

export default function FileChipDisplay(props) {
  const { backendHost } = BackendHostURLState();
  return <BaseFileChipDisplay backendHost={backendHost} {...props} />;
}
