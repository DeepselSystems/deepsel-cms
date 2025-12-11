import {Link} from 'react-router-dom';
import Chip from './Chip.jsx';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import {getAttachmentUrl} from '../utils/index.js';
import {faDownload} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

export default function FileChipDisplay({attachment}) {
  const {backendHost} = BackendHostURLState();

  function downloadFile(e) {
    e.preventDefault();
    window.open(getAttachmentUrl(backendHost, attachment.name), '_blank');
  }

  return (
    <Link
      to={getAttachmentUrl(backendHost, attachment.name)}
      onClick={downloadFile}
      target={`_blank`}
      className="cursor-pointer text-primary-main"
      style={{
        fontSize: `var(--mantine-font-size-sm)`,
      }}
    >
      <Chip
        icon={
          <FontAwesomeIcon
            icon={faDownload}
            className={`mr-1 text-primary-main`}
          />
        }
        size={`xs`}
        variant="outline"
        checked={true}
      >
        {attachment.name}
      </Chip>
    </Link>
  );
}
