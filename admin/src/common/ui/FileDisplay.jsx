import { faFileLines } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Indicator, Menu, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { faDownload, faEye } from '@fortawesome/free-solid-svg-icons';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import documentIcon from '../../assets/images/document.png';
import imageIcon from '../../assets/images/placeholder.png';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import {
  downloadFromAttachUrl,
  getAttachmentUrl,
  getFileExtension,
  getFileNameFromAttachUrl,
} from '../utils/index.js';
import H2 from './H2.jsx';
import clsx from 'clsx';

function PdfDisplay({
  backendHost,
  src,
  width,
  height,
  onViewMenuClick = () => {},
  showMenuOnHover = false,
  dropdownPosition = 'right-start',
}) {
  const { t } = useTranslation();
  return (
    <Menu
      withArrow
      offset={4}
      position={dropdownPosition}
      trigger={showMenuOnHover ? 'hover' : 'click'}
    >
      <Menu.Target>
        <OtherFileDisplay
          disabledLink
          width={width}
          height={height}
          backendHost={backendHost}
          src={src}
        />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<FontAwesomeIcon icon={faEye} className="w-6" />}
          onClick={onViewMenuClick}
        >
          {t('View')}
        </Menu.Item>
        <Menu.Item
          leftSection={<FontAwesomeIcon icon={faDownload} className="w-5" />}
          component="a"
          onClick={() => downloadFromAttachUrl(getAttachmentUrl(backendHost, src))}
          download={getFileNameFromAttachUrl(src)}
        >
          {t('Download')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

const OtherFileDisplay = forwardRef((props, ref) => {
  const { backendHost, src, width, height, disabledLink = false, ...otherProps } = props;

  return (
    <a
      ref={ref}
      {...otherProps}
      className="flex items-end cursor-pointer text-primary-main"
      href={
        disabledLink ? null : src?.startsWith('http') ? src : getAttachmentUrl(backendHost, src)
      }
      target="_blank"
      rel={'noreferrer'}
      download
    >
      <Indicator label={getFileExtension(src).toUpperCase()} zIndex="auto" size={15}>
        <FontAwesomeIcon
          icon={faFileLines}
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        />
      </Indicator>
      <div className="ml-2 !underline">{getFileNameFromAttachUrl(src)}</div>
    </a>
  );
});

OtherFileDisplay.displayName = 'OtherFileDisplay';

function ImageDisplay({
  backendHost,
  src,
  width,
  height,
  alt,
  onViewMenuClick = () => {},
  showMenuOnHover = false,
  dropdownPosition = 'bottom',
  imgClassName = '',
}) {
  const { t } = useTranslation();
  return (
    <Menu
      withArrow
      offset={4}
      position={dropdownPosition}
      trigger={showMenuOnHover ? 'hover' : 'click'}
    >
      <Menu.Target>
        <img
          src={src?.startsWith('http') ? src : getAttachmentUrl(backendHost, src)}
          alt={alt}
          width={width}
          height={height}
          className={clsx('cursor-pointer', imgClassName)}
        />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<FontAwesomeIcon icon={faEye} className="w-6" />}
          onClick={onViewMenuClick}
        >
          {t('View')}
        </Menu.Item>
        <Menu.Item
          leftSection={<FontAwesomeIcon icon={faDownload} className="w-5" />}
          component="a"
          onClick={() => downloadFromAttachUrl(getAttachmentUrl(backendHost, src))}
          download={getFileNameFromAttachUrl(src)}
        >
          {t('Download')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function VideoDisplay({
  backendHost,
  src,
  width,
  height,
  onViewMenuClick = () => {},
  showMenuOnHover = false,
  dropdownPosition = 'bottom',
}) {
  const { t } = useTranslation();
  return (
    <Menu
      withArrow
      offset={4}
      position={dropdownPosition}
      trigger={showMenuOnHover ? 'hover' : 'click'}
    >
      <Menu.Target>
        <video
          src={src?.startsWith('http') ? src : getAttachmentUrl(backendHost, src)}
          width={width}
          height={height}
          className="cursor-pointer"
          controls
        />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<FontAwesomeIcon icon={faEye} className="w-6" />}
          onClick={onViewMenuClick}
        >
          {t('View')}
        </Menu.Item>
        <Menu.Item
          leftSection={<FontAwesomeIcon icon={faDownload} className="w-5" />}
          component="a"
          onClick={() => downloadFromAttachUrl(getAttachmentUrl(backendHost, src))}
          download={getFileNameFromAttachUrl(src)}
        >
          {t('Download')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default function FileDisplay(props) {
  const {
    label = '',
    alt = 'Image',
    width = 40,
    height = 40,
    src,
    type,
    showMenuOnHover = false,
    dropdownPosition = 'bottom',
    classNames = {
      root: '',
      img: '',
      placeholder: '',
    },
  } = props;
  const { t } = useTranslation();

  let { placeholder } = props;
  if (!placeholder) {
    placeholder = type === 'image' ? imageIcon : documentIcon;
  }
  const { backendHost } = BackendHostURLState((state) => state);
  const [opened, { open, close }] = useDisclosure();

  return (
    <div className={clsx('relative', classNames.root)}>
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

      {src ? (
        type === 'image' ? (
          <ImageDisplay
            imgClassName={classNames.img}
            width={width}
            height={height}
            backendHost={backendHost}
            src={src}
            alt={alt}
            onViewMenuClick={open}
            showMenuOnHover={showMenuOnHover}
            dropdownPosition={dropdownPosition}
          />
        ) : type === 'video' ? (
          <VideoDisplay
            width={width}
            height={height}
            backendHost={backendHost}
            src={src}
            onViewMenuClick={open}
            showMenuOnHover={showMenuOnHover}
            dropdownPosition={dropdownPosition}
          />
        ) : getFileExtension(src).toLowerCase() === 'pdf' ? (
          <PdfDisplay
            width={width}
            height={height}
            backendHost={backendHost}
            src={src}
            onViewMenuClick={open}
            showMenuOnHover={showMenuOnHover}
            dropdownPosition={dropdownPosition}
          />
        ) : (
          <OtherFileDisplay width={width} height={height} backendHost={backendHost} src={src} />
        )
      ) : (
        <img
          src={placeholder}
          alt={alt}
          width={width}
          height={height}
          className={clsx('object-cover', classNames.placeholder)}
        />
      )}

      <Modal opened={opened} onClose={close} fullScreen title={<H2>{t('Preview')}</H2>}>
        {type === 'image' ? (
          <img
            src={src?.startsWith('http') ? src : getAttachmentUrl(backendHost, src)}
            alt={alt}
            className="max-w-full max-h-[calc(100vh-60px-16px)] mx-auto"
          />
        ) : type === 'video' ? (
          <video
            src={src?.startsWith('http') ? src : getAttachmentUrl(backendHost, src)}
            controls
            className="max-w-full max-h-[calc(100vh-60px-16px)] mx-auto"
          />
        ) : (
          <iframe
            src={src?.startsWith('http') ? src : getAttachmentUrl(backendHost, src)}
            className="!w-full h-[calc(100vh-60px-16px)]"
            title="Document Preview"
          />
        )}
      </Modal>
    </div>
  );
}
