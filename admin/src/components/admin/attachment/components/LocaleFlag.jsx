import { useState } from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';
import clsx from 'clsx';
import { getFlagUrlForIsoCode } from '../../../../common/utils/localeFlag.js';
import { FLAG_HEIGHT_PX, FALLBACK_FLAG_CODE } from '../../../../constants/attachment.js';

/**
 * @typedef LocaleFlagProps
 * @property {import('../../../../typedefs/AttachmentFile.js').LocaleInfo|null} locale - Locale info; null renders a "no language" fallback flag
 * @property {boolean} selected - Whether this flag is the currently active version
 * @property {(e: React.MouseEvent) => void} onClick
 * @property {number} [size] - Flag height in pixels; defaults to FLAG_HEIGHT_PX
 * @property {boolean} [disabled] - True when no locale_version exists for this language yet
 */

/**
 * Renders a single SVG country flag as a clickable chip with a locale-name tooltip.
 *
 * States:
 *   - selected: highlighted border + ring (currently previewed version)
 *   - disabled: grayed out + not-allowed cursor (language configured but no file uploaded yet)
 *   - default: hover border on mouse-over
 *
 * Error handling: if the flag image 404s, falls back to FALLBACK_FLAG_CODE (UN flag)
 * once. The errored state prevents infinite retry loops.
 *
 * @param {LocaleFlagProps} props
 */
export function LocaleFlag({ locale, selected, onClick, size = FLAG_HEIGHT_PX, disabled = false }) {
  // Track whether the flag image failed to load so we can swap to the fallback once
  const [errored, setErrored] = useState(false);

  const isoCode = errored ? FALLBACK_FLAG_CODE : (locale?.iso_code ?? null);
  const flagUrl = getFlagUrlForIsoCode(isoCode);
  const localeName = locale?.name ?? 'No language assigned';

  // Disabled flags show a hint that no file has been uploaded for this language yet
  const tooltipLabel = disabled ? `${localeName} — No file uploaded yet` : localeName;

  /** Swap to fallback flag on load error; guard prevents infinite re-trigger. */
  const handleImgError = () => {
    if (!errored) setErrored(true);
  };

  return (
    <Tooltip label={tooltipLabel} withArrow>
      <UnstyledButton
        type="button"
        aria-label={
          disabled ? `${localeName}: no file uploaded yet` : `Switch to ${localeName} version`
        }
        aria-pressed={!disabled && selected}
        aria-disabled={disabled}
        onClick={disabled ? undefined : onClick}
        className={clsx(
          'rounded overflow-hidden border-2 transition-all',
          disabled
            ? 'opacity-40 cursor-not-allowed border-transparent'
            : selected
              ? 'border-primary-main ring-2 ring-primary-main'
              : 'border-transparent hover:border-gray-300',
        )}
      >
        {/* width:auto preserves the flag's natural aspect ratio */}
        <img
          src={flagUrl}
          alt={localeName}
          style={{ height: size, width: 'auto', display: 'block' }}
          onError={handleImgError}
        />
      </UnstyledButton>
    </Tooltip>
  );
}
