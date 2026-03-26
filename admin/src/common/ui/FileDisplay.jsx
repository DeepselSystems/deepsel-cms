import { FileDisplay as BaseFileDisplay } from '../lib/ui/FileDisplay/FileDisplay';
import BackendHostURLState from '../stores/BackendHostURLState.js';

export default function FileDisplay(props) {
  const { backendHost } = BackendHostURLState();
  return <BaseFileDisplay backendHost={backendHost} {...props} />;
}
