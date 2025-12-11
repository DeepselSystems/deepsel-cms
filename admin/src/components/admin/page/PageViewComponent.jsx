import {useState, useEffect, useMemo} from 'react';
import {
  faExternalLinkAlt,
  faDesktop,
  faTabletAlt,
  faMobileAlt,
} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {LoadingOverlay, Tabs, Tooltip} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import {useParams} from 'react-router-dom';
import useModel from '../../../common/api/useModel.jsx';
import NotificationState from '../../../common/stores/NotificationState.js';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import OrganizationState from '../../../common/stores/OrganizationState.js';
import useAuthentication from '../../../common/api/useAuthentication.js';
import {
  buildPageUrlWithDomain,
  buildFullUrl,
} from '../../../utils/domainUtils.js';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import ViewFormActionBar from '../../../common/ui/ViewFormActionBar.jsx';
import Button from '../../../common/ui/Button.jsx';
import VisibilityControl from '../../../common/auth/VisibilityControl.jsx';
import ActivityContentRevision from '../../../common/ui/ActivityContentRevision.jsx';

export default function PageViewComponent() {
  const {t} = useTranslation();
  const {id} = useParams();
  const query = useModel('page', {id, autoFetch: true});
  const {record, update, getOne} = query;
  const {notify} = NotificationState();
  const {settings: siteSettings} = SitePublicSettingsState();
  const {organizations} = OrganizationState();
  const {user} = useAuthentication();
  const {data: locales} = useModel('locale', {
    autoFetch: true,
    pageSize: null,
  });

  const [activeContentTab, setActiveContentTab] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');

  const hasWritePermission = true;

  const getLanguageName = (locale_id) => {
    const locale = locales?.find((locale) => locale.id === locale_id);
    return locale ? locale.name : '';
  };

  const getLanguageFlag = (locale_id) => {
    const locale = locales?.find((locale) => locale.id === locale_id);
    return locale ? locale.emoji_flag : null;
  };

  // Function to build the correct URL with locale prefix for non-default languages

  // Set initial active tab if contents exist
  useEffect(() => {
    if (record?.contents?.length > 0 && !activeContentTab) {
      // Sort contents by ID (oldest first) and select the first one
      const sortedContents = [...record.contents].sort((a, b) => a.id - b.id);
      setActiveContentTab(String(sortedContents[0].id));
    }
  }, [record?.contents]); // Only depend on contents changing, not the active tab

  // Get the currently selected content using useMemo for performance
  const currentContent = useMemo(() => {
    if (!record?.contents || !activeContentTab) return null;
    return record.contents.find(
      (content) => String(content.id) === activeContentTab
    );
  }, [record?.contents, activeContentTab]);

  // Get the URL for the current content
  const currentPageUrl = useMemo(() => {
    if (!currentContent) return record?.slug || '/';
    return buildPageUrlWithDomain(
      record,
      currentContent.slug,
      currentContent.locale?.iso_code,
      siteSettings?.default_language?.iso_code,
      organizations
    );
  }, [
    currentContent,
    record,
    siteSettings?.default_language?.iso_code,
    organizations,
  ]);

  // Get the full URL for iframe preview
  const getPreviewUrl = (content) => {
    const slug = content?.slug || record?.slug || '/';
    const localeIsoCode = content?.locale?.iso_code;

    // Build path with language prefix
    const isDefaultLanguage =
      localeIsoCode?.toLowerCase() ===
      siteSettings?.default_language?.iso_code?.toLowerCase();
    let path;

    if (isDefaultLanguage) {
      path = slug;
    } else {
      const localePrefix = `/${localeIsoCode}`;
      const cleanSlug = slug.startsWith('/') ? slug : `/${slug}`;
      path = `${localePrefix}${cleanSlug}`;
    }

    // Build full URL with correct domain and add preview parameters
    const baseUrl = buildFullUrl(record, path, organizations);
    const url = new URL(baseUrl);
    url.searchParams.set('preview', 'true');
    if (user?.token) {
      url.searchParams.set('token', user.token);
    }
    return url.toString();
  };

  async function handleUpdatePublished(e) {
    await update({
      ...record,
      published: e.currentTarget.checked,
    });
    notify({
      message: t('Page updated successfully!'),
      type: 'success',
    });
  }

  return (
    <>
      <main className={`max-w-screen-xl m-auto my-[50px] px-[24px]`}>
        <ViewFormActionBar
          query={query}
          allowEditRoleIds={[
            'super_admin_role',
            'admin_role',
            'website_admin_role',
            'website_editor_role',
          ]}
          allowDeleteRoleIds={[
            'super_admin_role',
            'admin_role',
            'website_admin_role',
            'website_editor_role',
          ]}
        />

        {record ? (
          <form className="pt-4">
            <div className={`flex gap-4 mb-4 justify-between`}>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">
                  {currentContent?.title || t('Page')}
                </h1>
                <div className="text-gray-500 text-sm">
                  {currentContent?.slug || record.slug}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <VisibilityControl
                  roleIds={[
                    'super_admin_role',
                    'admin_role',
                    'website_admin_role',
                    'website_editor_role',
                  ]}
                  render={false}
                >
                  <Switch
                    checked={record.published}
                    onLabel={t('Published')}
                    offLabel={t('Unpublished')}
                    size="xl"
                    classNames={{
                      track: 'px-2',
                    }}
                    onChange={handleUpdatePublished}
                  />
                </VisibilityControl>
                {record.published && (
                  <Button
                    variant="fill"
                    size="sm"
                    title={t('Go to page')}
                    component="a"
                    href={currentPageUrl}
                    target="_blank"
                  >
                    <FontAwesomeIcon
                      icon={faExternalLinkAlt}
                      className="h-4 w-4 mr-2"
                    />
                    {t('Go to page')}
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4">
              <LoadingOverlay
                visible={false}
                zIndex={1000}
                overlayProps={{radius: 'sm', blur: 2}}
                loaderProps={{type: 'bars'}}
              />

              {record.contents?.length > 0 ? (
                <Tabs
                  value={activeContentTab}
                  onChange={setActiveContentTab}
                  variant="pills"
                  radius="lg"
                >
                  <Tabs.List className="mb-2 flex-wrap">
                    {[...record.contents]
                      .sort((a, b) => a.id - b.id)
                      .map((content) => (
                        <div key={content.id} className="relative group">
                          <Tooltip label={t('View Content')}>
                            <Tabs.Tab
                              value={String(content.id)}
                              className="mr-1 mb-1"
                            >
                              <span className="mr-1">
                                {getLanguageFlag(content.locale_id)}
                              </span>
                              {getLanguageName(content.locale_id)}
                            </Tabs.Tab>
                          </Tooltip>
                        </div>
                      ))}
                  </Tabs.List>

                  {[...record.contents]
                    .sort((a, b) => a.id - b.id)
                    .map((content) => (
                      <Tabs.Panel key={content.id} value={String(content.id)}>
                        {/* Preview Header with Device Buttons */}
                        <div className="flex-shrink-0 px-4 py-2">
                          <div className="flex items-center justify-between">
                            {/* Device Icons - Left Side */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant={
                                  previewDevice === 'desktop'
                                    ? 'filled'
                                    : 'subtle'
                                }
                                size="sm"
                                onClick={() => setPreviewDevice('desktop')}
                                className="px-2"
                              >
                                <FontAwesomeIcon icon={faDesktop} />
                              </Button>
                              <Button
                                variant={
                                  previewDevice === 'tablet'
                                    ? 'filled'
                                    : 'subtle'
                                }
                                size="sm"
                                onClick={() => setPreviewDevice('tablet')}
                                className="px-2"
                              >
                                <FontAwesomeIcon icon={faTabletAlt} />
                              </Button>
                              <Button
                                variant={
                                  previewDevice === 'mobile'
                                    ? 'filled'
                                    : 'subtle'
                                }
                                size="sm"
                                onClick={() => setPreviewDevice('mobile')}
                                className="px-2"
                              >
                                <FontAwesomeIcon icon={faMobileAlt} />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Preview Container */}
                        <div
                          className="h-full flex items-center justify-center bg-gray-100 rounded-lg"
                          style={{height: '600px'}}
                        >
                          <div
                            className="bg-white shadow-lg transition-all duration-300"
                            style={{
                              width:
                                previewDevice === 'desktop'
                                  ? '100%'
                                  : previewDevice === 'tablet'
                                    ? '1024px'
                                    : '393px',
                              height:
                                previewDevice === 'desktop'
                                  ? 'calc(100% - 0px)'
                                  : previewDevice === 'tablet'
                                    ? '852px'
                                    : '852px',
                              maxWidth: '100%',
                              maxHeight: '100%',
                              borderRadius: '8px',
                            }}
                          >
                            <iframe
                              src={getPreviewUrl(content)}
                              className="w-full h-full border border-gray-300 !shadow"
                              style={{borderRadius: '8px'}}
                              sandbox="allow-same-origin allow-scripts allow-forms allow-links allow-presentation"
                              // onLoad={(e) => {
                              //   // Send preview data once iframe is loaded
                              //   setTimeout(() => {
                              //     sendPreviewData(e.target, content);
                              //   }, 500);
                              // }}
                              ref={(iframe) => {
                                // if (iframe) {
                                //   // Listen for iframe ready signal
                                //   const handleIframeMessage = (event) => {
                                //     if (event.data?.type === 'IFRAME_READY') {
                                //       sendPreviewData(iframe, content);
                                //     }
                                //   };
                                //   window.addEventListener(
                                //     'message',
                                //     handleIframeMessage
                                //   );
                                //   // Cleanup listener when component unmounts
                                //   return () =>
                                //     window.removeEventListener(
                                //       'message',
                                //       handleIframeMessage
                                //     );
                                // }
                              }}
                            />
                          </div>
                        </div>

                        {/* Revision History Section - Always visible below preview */}
                        {content.revisions && content.revisions.length > 0 && (
                          <div className="mt-8 p-4">
                            <h3 className="text-lg font-semibold mb-4">
                              {t('Revisions')}
                            </h3>
                            <ActivityContentRevision
                              revisions={content.revisions}
                              contentType="page_content"
                              contentId={content.id}
                              currentLanguage={getLanguageName(
                                content.locale_id
                              )}
                              hasWritePermission={hasWritePermission}
                              onContentRestored={async () => {
                                await getOne(id);
                              }}
                            />
                          </div>
                        )}
                      </Tabs.Panel>
                    ))}
                </Tabs>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {t('Nothing here yet.')}
                </div>
              )}
            </div>
          </form>
        ) : (
          <FormViewSkeleton />
        )}
      </main>
    </>
  );
}
