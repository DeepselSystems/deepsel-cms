import React from 'react';
import {AspectRatio, Box, Image} from '@mantine/core';
import BackendHostURLState from '../../stores/BackendHostURLState.js';
import PlaceholderImg from '../../../assets/images/placeholder.png';
import {getAttachmentUrl} from '../../utils/index.js';
import H3 from '../H3.jsx';
import {useTranslation} from 'react-i18next';

/**
 * This component is using to render social preview
 * @type {React.NamedExoticComponent<{
 *   readonly pageContent: PageContent | BlogPostContent
 * }>}
 */
const SocialCardPreview = React.memo(({pageContent}) => {
  // Translation
  const {t} = useTranslation();

  /** @type {string} */
  const hostEndpoint = React.useMemo(() => window.location.host, []);

  // Backend host
  const {backendHost} = BackendHostURLState((state) => state);

  // Feature image src
  const featureImageSrc = React.useMemo(
    () =>
      pageContent.seo_metadata_featured_image?.name
        ? getAttachmentUrl(
            backendHost,
            encodeURIComponent(pageContent.seo_metadata_featured_image?.name)
          )
        : PlaceholderImg.src,
    [backendHost, pageContent.seo_metadata_featured_image?.name]
  );

  return (
    <>
      <Box className="space-y-2">
        <H3>{t('Social Preview')}</H3>
        <Box className="flex gap-3 rounded-lg overflow-hidden h-32">
          {/*region feature image*/}
          <div className="h-32 w-32">
            <AspectRatio ratio={1} w={200} mx="auto">
              <Image
                src={featureImageSrc}
                alt={pageContent.seo_metadata_title || 'Social image'}
              />
            </AspectRatio>
          </div>
          {/*endregion feature image*/}

          {/*region content*/}
          <Box className="flex flex-col justify-between p-2">
            <Box className="space-y-1 text-sm">
              <Box className="font-bold line-clamp-1">
                {pageContent.seo_metadata_title}
              </Box>
              <Box className="line-clamp-3">
                {pageContent.seo_metadata_description}
              </Box>
            </Box>
            <Box className="text-secondary-text">{hostEndpoint}</Box>
          </Box>
          {/*endregion content*/}
        </Box>
      </Box>
    </>
  );
});

SocialCardPreview.displayName = 'SocialCardPreview';
export default SocialCardPreview;
