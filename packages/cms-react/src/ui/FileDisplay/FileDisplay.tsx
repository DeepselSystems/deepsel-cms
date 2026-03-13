import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faDownload, faEye, faFileLines } from '@fortawesome/free-solid-svg-icons';
import { Indicator, Menu, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import clsx from 'clsx';
import {
  downloadFromAttachUrl,
  getAttachmentUrl,
  getFileExtension,
  getFileNameFromAttachUrl,
} from '@deepsel/cms-utils';
import { H2 } from '../H2';

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

interface SubDisplayProps {
  backendHost: string;
  src: string;
  width: number;
  height: number;
  onViewMenuClick?: () => void;
  showMenuOnHover?: boolean;
  dropdownPosition?: string;
}

interface OtherFileDisplayProps
  extends
    SubDisplayProps,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'width' | 'height'> {
  disabledLink?: boolean;
}

/**
 * Renders a generic file (non-image/video/PDF) as a linked file icon + filename
 */
const OtherFileDisplay = forwardRef<HTMLAnchorElement, OtherFileDisplayProps>(
  ({ backendHost, src, width, height, disabledLink = false, ...otherProps }, ref) => {
    return (
      <a
        ref={ref}
        {...otherProps}
        className="flex items-end cursor-pointer text-primary-main"
        href={disabledLink ? undefined : '#'}
        onClick={(e) => {
          if (disabledLink) return;
          e.preventDefault();
          downloadFromAttachUrl(getAttachmentUrl(backendHost, src));
        }}
      >
        <Indicator label={getFileExtension(src).toUpperCase()} zIndex="auto" size={15}>
          <FontAwesomeIcon
            icon={faFileLines as IconProp}
            style={{ width: `${width}px`, height: `${height}px` }}
          />
        </Indicator>
        <div className="ml-2 !underline">{getFileNameFromAttachUrl(src)}</div>
      </a>
    );
  },
);

OtherFileDisplay.displayName = 'OtherFileDisplay';

/**
 * Renders a PDF file with View / Download menu
 */
function PdfDisplay({
  backendHost,
  src,
  width,
  height,
  onViewMenuClick = () => {},
  showMenuOnHover = false,
  dropdownPosition = 'right-start',
}: SubDisplayProps) {
  const { t } = useTranslation();
  return (
    <Menu
      withArrow
      offset={4}
      position={dropdownPosition as React.ComponentProps<typeof Menu>['position']}
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
          leftSection={<FontAwesomeIcon icon={faEye as IconProp} className="w-6" />}
          onClick={onViewMenuClick}
        >
          {t('View')}
        </Menu.Item>
        <Menu.Item
          leftSection={<FontAwesomeIcon icon={faDownload as IconProp} className="w-5" />}
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

interface ImageDisplayProps extends SubDisplayProps {
  alt?: string;
  imgClassName?: string;
}

/**
 * Renders an image with View / Download menu
 */
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
}: ImageDisplayProps) {
  const { t } = useTranslation();
  return (
    <Menu
      withArrow
      offset={4}
      position={dropdownPosition as React.ComponentProps<typeof Menu>['position']}
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
          leftSection={<FontAwesomeIcon icon={faEye as IconProp} className="w-6" />}
          onClick={onViewMenuClick}
        >
          {t('View')}
        </Menu.Item>
        <Menu.Item
          leftSection={<FontAwesomeIcon icon={faDownload as IconProp} className="w-5" />}
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

/**
 * Renders a video with View / Download menu
 */
function VideoDisplay({
  backendHost,
  src,
  width,
  height,
  onViewMenuClick = () => {},
  showMenuOnHover = false,
  dropdownPosition = 'bottom',
}: SubDisplayProps) {
  const { t } = useTranslation();
  return (
    <Menu
      withArrow
      offset={4}
      position={dropdownPosition as React.ComponentProps<typeof Menu>['position']}
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
          leftSection={<FontAwesomeIcon icon={faEye as IconProp} className="w-6" />}
          onClick={onViewMenuClick}
        >
          {t('View')}
        </Menu.Item>
        <Menu.Item
          leftSection={<FontAwesomeIcon icon={faDownload as IconProp} className="w-5" />}
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

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface FileDisplayClassNames {
  root?: string;
  img?: string;
  placeholder?: string;
}

export interface FileDisplayProps {
  /** Optional label rendered above the display */
  label?: string;

  /** Alt text for image/video. Defaults to 'Image' */
  alt?: string;

  /** Display width in pixels. Defaults to 40 */
  width?: number;

  /** Display height in pixels. Defaults to 40 */
  height?: number;

  /** File source — attachment name or absolute URL */
  src?: string;

  /** File type hint: 'image' | 'video' | other */
  type?: string;

  /** When true, menu opens on hover instead of click */
  showMenuOnHover?: boolean;

  /** Mantine Menu position. Defaults to 'bottom' */
  dropdownPosition?: string;

  /**
   * Placeholder image URL shown when src is empty.
   * The origin defaulted to bundled document/image icons;
   * since this package ships no static assets, pass your own placeholder.
   */
  placeholder?: string;

  /** Class names for root, img, and placeholder elements */
  classNames?: FileDisplayClassNames;

  /**
   * Backend host URL.
   * Typically sourced from BackendHostURLState.
   */
  backendHost: string;
}

/**
 * Displays a file attachment with preview modal and download support.
 * Handles images, videos, PDFs, and generic files.
 *
 * Requires backendHost prop (sourced from BackendHostURLState in the consuming app).
 */
export function FileDisplay({
  label = '',
  alt = 'Image',
  width = 40,
  height = 40,
  src,
  type,
  showMenuOnHover = false,
  dropdownPosition = 'bottom',
  placeholder,
  classNames = { root: '', img: '', placeholder: '' },
  backendHost,
}: FileDisplayProps) {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure();

  const resolvedSrc = src
    ? src.startsWith('http')
      ? src
      : getAttachmentUrl(backendHost, src)
    : '';

  return (
    <div className={clsx('relative', classNames.root)}>
      {label && (
        <div
          style={{
            fontSize: 'var(--input-label-size,var(--mantine-font-size-sm))',
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
      ) : placeholder ? (
        <img
          src={placeholder}
          alt={alt}
          width={width}
          height={height}
          className={clsx('object-cover', classNames.placeholder)}
        />
      ) : null}

      <Modal opened={opened} onClose={close} fullScreen title={<H2>{t('Preview')}</H2>}>
        {type === 'image' ? (
          <img
            src={resolvedSrc}
            alt={alt}
            className="max-w-full max-h-[calc(100vh-60px-16px)] mx-auto"
          />
        ) : type === 'video' ? (
          <video
            src={resolvedSrc}
            controls
            className="max-w-full max-h-[calc(100vh-60px-16px)] mx-auto"
          />
        ) : (
          <iframe
            src={resolvedSrc}
            className="!w-full h-[calc(100vh-60px-16px)]"
            title="Document Preview"
          />
        )}
      </Modal>
    </div>
  );
}
