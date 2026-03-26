import React, { memo } from 'react';
import { Box, Checkbox, Image } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import type { StockImage } from '../hooks/useStockImages';

interface StockImageItemProps {
  withCheckbox?: boolean;
  stockImage: StockImage;
  onClick?: () => void;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Renders a single stock image card with optional checkbox for multi-select
 */
export const StockImageItem = memo<StockImageItemProps>(function StockImageItem({
  withCheckbox = false,
  stockImage,
  onClick = () => {},
  checked = false,
  onCheckedChange,
}) {
  // Translation
  const { t } = useTranslation();

  return (
    <>
      <Box className="relative rounded shadow-md overflow-hidden cursor-pointer">
        <Image
          onClick={onClick}
          loading="lazy"
          className="w-full"
          fit="contain"
          src={stockImage.preview_src}
          alt={stockImage.title}
          title={stockImage.title}
        />
        <Box className="absolute top-0 left-0 mr-7 px-1 py-0.5 text-[0.5rem] bg-gray text-white bg-opacity-80">
          <span>{t('Powered by ')}</span> <b>{stockImage.provider}</b>
        </Box>

        {withCheckbox && stockImage._attachment && (
          <Box className="absolute top-0 right-0 p-1">
            <Checkbox
              checked={checked}
              onChange={({ target: { checked } }) => {
                onCheckedChange?.(checked);
              }}
            />
          </Box>
        )}
      </Box>
    </>
  );
});

StockImageItem.displayName = 'StockImageItem';
