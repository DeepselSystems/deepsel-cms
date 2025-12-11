import React from 'react';
import {Box, Image} from '@mantine/core';
import H3 from '../H3.jsx';
import {useTranslation} from 'react-i18next';

/**
 * This component is using to render SERPP preview
 * @type {React.NamedExoticComponent<{
 *   readonly pageContent: PageContent | BlogPostContent
 * }>}
 */
const SERPPreviewCardPreview = React.memo(({pageContent}) => {
  // Translation
  const {t} = useTranslation();

  /** @type {string} */
  const hostEndpoint = React.useMemo(() => window.location.host, []);

  return (
    <>
      <Box className="space-y-2">
        <H3>{t('SERP Preview')}</H3>

        <Box className="rounded-lg p-3 space-y-2">
          {/*region heading*/}
          <Box className="flex gap-6 items-center">
            <Box className="h-8 w-8 flex-shrink-0">
              <Box className="w-full h-full p-1 rounded-full border flex items-center justify-center">
                <Image maw={28} mah={28} src="/favicon.ico" alt="favicon" />
              </Box>
            </Box>

            <Box>
              <Box className="text-sm text-gray-shark-2 line-clamp-1">
                {pageContent.seo_metadata_title}
              </Box>
              <Box className="text-xs text-gray-abbey">{hostEndpoint}</Box>
            </Box>
          </Box>
          {/*endregion heading*/}

          {/*region content*/}
          <Box>
            <Box className="text-xl text-blue-ultramarine line-clamp-1">
              {pageContent.seo_metadata_title}
            </Box>
            <Box className="text-sm line-clamp-2">
              {pageContent.seo_metadata_description}
            </Box>
          </Box>
          {/*endregion content*/}
        </Box>
      </Box>
    </>
  );
});

SERPPreviewCardPreview.displayName = 'SERPPreviewCardPreview';
export default SERPPreviewCardPreview;
