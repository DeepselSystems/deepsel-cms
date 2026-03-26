import { FileChipDisplay as BaseFileChipDisplay } from '../lib/ui/FileChipDisplay/FileChipDisplay';
import BackendHostURLState from '../stores/BackendHostURLState.js';

export default function FileChipDisplay(props) {
  const { backendHost } = BackendHostURLState();
  return <BaseFileChipDisplay backendHost={backendHost} {...props} />;
}
