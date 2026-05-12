import React from 'react';
import { Box, Image, AspectRatio } from '@mantine/core';
import clsx from 'clsx';
import { getAttachmentUrl } from '@deepsel/cms-utils';
import { IconPhotoPlus } from '@tabler/icons-react';

import type { AttachmentFile, AttachmentLocaleVersion } from '../../ChooseAttachmentModal';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — JSX component, types inferred as any
import { VersionFlagBar } from '../../../../../components/admin/attachment/components/VersionFlagBar';

/**
 * Minimal locale language shape required by VersionFlagBar
 */
export interface OrgLanguage {
  id: number;
  name: string;
  iso_code?: string | null;
  emoji_flag?: string | null;
}

interface AttachmentCardPreviewProps {
  attachment: AttachmentFile;
  backendHost: string;
  /** Whether the image has entered the viewport (lazy load gate) */
  shouldLoad: boolean;
  /** Whether this card is in a selected/checked state — controls AspectRatio border */
  isSelected: boolean;
  /** Ref callback forwarded to the image container for IntersectionObserver registration */
  observerRef: (node: HTMLElement | null) => void;
  /** Currently previewed locale ID for this card; null defaults to site locale */
  selectedLocaleId: number | null;
  /** Called when the user clicks a flag to switch the previewed locale */
  onSelectLocale: (localeId: number) => void;
  /** Site-level default locale ID (sorts first in the flag bar) */
  defaultLocaleId: number | null;
  /** All org-configured languages passed to VersionFlagBar */
  availableLanguages: OrgLanguage[];
}

/**
 * Returns the locale version that should be displayed for an attachment.
 * Priority: explicit selection → site default locale → first available version.
 */
function resolveVersion(
  attachment: AttachmentFile,
  selectedLocaleId: number | null,
  defaultLocaleId: number | null,
): AttachmentLocaleVersion | undefined {
  const versions = attachment.locale_versions ?? [];
  if (!versions.length) return undefined;
  if (selectedLocaleId != null) {
    return versions.find((v) => v.locale_id === selectedLocaleId) ?? versions[0];
  }
  return versions.find((v) => v.locale_id === defaultLocaleId) ?? versions[0];
}

/**
 * Image preview area + locale flag bar for a single attachment card.
 *
 * Renders the file from the currently selected locale version.
 * Clicking a flag switches the preview; the flag bar is hidden when the attachment
 * has exactly one version and no missing-language placeholders to show.
 */
export function AttachmentCardPreview({
  attachment,
  backendHost,
  shouldLoad,
  isSelected,
  observerRef,
  selectedLocaleId,
  onSelectLocale,
  defaultLocaleId,
  availableLanguages,
}: AttachmentCardPreviewProps) {
  const selectedVersion = resolveVersion(attachment, selectedLocaleId, defaultLocaleId);
  const imageSrc = selectedVersion
    ? getAttachmentUrl(backendHost, selectedVersion.name)
    : undefined;

  return (
    <Box>
      <Box ref={observerRef}>
        <AspectRatio
          ratio={1}
          mx="auto"
          className={clsx(
            'transition-all duration-200',
            isSelected
              ? 'border-4 border-gray !rounded-xl overflow-hidden'
              : 'hover:border-4 border-gray-westar !rounded-xl overflow-hidden',
          )}
        >
          {shouldLoad ? (
            imageSrc ? (
              <Image className="!rounded-lg" alt={selectedVersion?.alt_text ?? ''} src={imageSrc} />
            ) : (
              <Box className="w-full h-full bg-gray-100 flex items-center justify-center">
                <IconPhotoPlus size={20} className="text-gray-300" />
              </Box>
            )
          ) : (
            <Box className="w-full h-full bg-gray-100 animate-pulse" />
          )}
        </AspectRatio>
      </Box>

      <VersionFlagBar
        versions={attachment.locale_versions ?? []}
        selectedLocaleId={selectedLocaleId ?? defaultLocaleId ?? null}
        onSelectLocale={onSelectLocale}
        defaultLocaleId={defaultLocaleId}
        availableLanguages={availableLanguages}
      />
    </Box>
  );
}
