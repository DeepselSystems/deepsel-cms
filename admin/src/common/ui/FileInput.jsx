import { faFileLines, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Indicator } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import ChooseAttachmentModal from './ChooseAttachmentModal.jsx';
import { getFileNameFromAttachUrl, getAttachmentUrl } from '../utils/index.js';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import documentIcon from '../../assets/images/document.png';
import imageIcon from '../../assets/images/placeholder.png';

export default function FileInput(props) {
  const {
    label = '',
    type = 'file' | 'image',
    alt = 'Image',
    width = 80,
    height = 80,
    value,
    onChange,
    filters = [],
    showPastFiles = true,
  } = props;

  const { backendHost } = BackendHostURLState((state) => state);
  const [attachUrl, setAttachUrl] = useState(value || '');
  const [isOpen, { open, close }] = useDisclosure();

  let { placeholder } = props;
  if (!placeholder) {
    // astro assets need to use .src attribute instead of the object
    placeholder = type === 'image' ? imageIcon.src || imageIcon : documentIcon.src || documentIcon;
  }

  async function handleRemoveFile() {
    setAttachUrl('');
    if (onChange) {
      onChange(null);
    }
  }

  function handleFileChange(file) {
    setAttachUrl(file?.name);
    if (onChange) {
      onChange({
        ...file,
        attachUrl,
      });
    }
  }

  return (
    <div className={`relative`}>
      {label && (
        <div
          style={{
            fontSize: `var(--input-label-size,var(--mantine-font-size-sm))`,
            fontWeight: 500,
            marginBottom: '0.5rem',
          }}
        >
          {label}
        </div>
      )}

      {attachUrl ? (
        <Indicator
          onClick={handleRemoveFile}
          color="red"
          inline
          size={20}
          zIndex="auto"
          className={`cursor-pointer`}
          label={<FontAwesomeIcon icon={faXmark} className={`h-2.5 w-2.5`} />}
        >
          {type === 'image' ? (
            <img
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              src={getAttachmentUrl(backendHost, attachUrl)}
              alt={alt}
              width={width}
              height={height}
              className="object-cover bg-gray-200 rounded-xl"
            />
          ) : (
            <a
              className="flex items-end text-primary-main"
              href={getAttachmentUrl(backendHost, attachUrl)}
              target="_blank"
              rel={'noreferrer'}
              // download
              onClick={(e) => e.stopPropagation()}
            >
              <FontAwesomeIcon
                icon={faFileLines}
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                }}
              />
              <div className="ml-2 !underline">{getFileNameFromAttachUrl(attachUrl)}</div>
            </a>
          )}
        </Indicator>
      ) : (
        <Indicator
          onClick={open}
          inline
          size={20}
          zIndex="auto"
          className={`cursor-pointer`}
          label={<FontAwesomeIcon icon={faPlus} className={`h-2.5 w-2.5`} />}
        >
          {type === 'image' ? (
            <img
              src={placeholder}
              alt={alt}
              width={width}
              height={height}
              className="object-cover"
            />
          ) : (
            <FontAwesomeIcon
              icon={faFileLines}
              className="text-primary-main"
              style={{ width: `${width}px`, height: `${height}px` }}
            />
          )}
        </Indicator>
      )}

      <ChooseAttachmentModal
        isOpen={isOpen}
        close={close}
        onChange={handleFileChange}
        type={type}
        filters={filters}
        showPastFiles={showPastFiles}
      />
    </div>
  );
}
