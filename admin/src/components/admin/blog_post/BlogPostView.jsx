import { useState, useEffect } from 'react';

import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LoadingOverlay, Tabs, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import useModel from '../../../common/api/useModel.jsx';
import NotificationState from '../../../common/stores/NotificationState.js';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import ViewFormActionBar from '../../../common/ui/ViewFormActionBar.jsx';
import Button from '../../../common/ui/Button.jsx';
import { getAttachmentUrl } from '../../../common/utils/index.js';
import useAuthentication from '../../../common/api/useAuthentication.js';
import OrganizationState from '../../../common/stores/OrganizationState.js';
import { buildBlogPostUrlWithDomain } from '../../../utils/domainUtils.js';
import ActivityContentRevision from '../../../common/ui/ActivityContentRevision.jsx';

export default function BlogPostView() {
  const { t } = useTranslation();
  const { user } = useAuthentication();
  const { organizations } = OrganizationState();
  const { id } = useParams();
  const query = useModel('blog_post', { id, autoFetch: true });
  const { record, update, getOne } = query;
  const { notify } = NotificationState((state) => state);
  const { backendHost } = BackendHostURLState((state) => state);
  const { data: locales } = useModel('locale', {
    autoFetch: true,
    pageSize: null,
  });
  const allowEditDelete =
    !user.roles.some((role) => role.string_id === 'website_author_role') ||
    (user.roles.some((role) => role.string_id === 'website_author_role') &&
      !user.roles.some((role) =>
        ['admin_role', 'super_admin_role', 'website_admin_role', 'website_editor_role'].includes(
          role.string_id,
        ),
      ) &&
      record?.owner_id === user.id);

  const [activeContentTab, setActiveContentTab] = useState(null);

  // Check if user has write permission for blog posts
  const hasWritePermission = allowEditDelete;

  const getLanguageName = (locale_id) => {
    const locale = locales?.find((locale) => locale.id === locale_id);
    return locale ? locale.name : '';
  };

  const getLanguageFlag = (locale_id) => {
    const locale = locales?.find((locale) => locale.id === locale_id);
    return locale ? locale.emoji_flag : null;
  };

  // Set initial active tab if contents exist
  useEffect(() => {
    if (record?.contents?.length > 0 && !activeContentTab) {
      // Sort contents by ID (oldest first) and select the first one
      const sortedContents = [...record.contents].sort((a, b) => a.id - b.id);
      setActiveContentTab(String(sortedContents[0].id));
    }
  }, [record?.contents]); // Only depend on contents changing, not the active tab

  async function handleUpdatePublished(e) {
    await update({
      ...record,
      published: e.currentTarget.checked,
    });
    notify({
      message: t('Blog Post updated successfully!'),
      type: 'success',
    });
  }

  return (
    <>
      <main className={`max-w-screen-xl m-auto my-[50px] px-[24px]`}>
        <ViewFormActionBar
          query={query}
          allowEdit={allowEditDelete}
          allowDelete={allowEditDelete}
        />

        {record ? (
          <form className="pt-4">
            <div className={`flex gap-4 mb-4 justify-between`}>
              <div>
                <div className="text-gray-500 text-sm font-bold uppercase">
                  {t('Blog Post')} #{record.id}
                </div>
                <div className="text-gray-500 text-sm">{record.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                {allowEditDelete && (
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
                )}
                <Button
                  className={`p-2 rounded`}
                  variant="fill"
                  size="sm"
                  title={t('Go to post')}
                  component="a"
                  href={buildBlogPostUrlWithDomain(record, record.slug, organizations)}
                  target="_blank"
                  disabled={!record.published}
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="h-4 w-4 mr-2" />
                  {t('Go to post')}
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <LoadingOverlay
                visible={false}
                zIndex={1000}
                overlayProps={{ radius: 'sm', blur: 2 }}
                loaderProps={{ type: 'bars' }}
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
                            <Tabs.Tab value={String(content.id)} className="mr-1 mb-1">
                              <span className="mr-1">{getLanguageFlag(content.locale_id)}</span>
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
                        <div className="my-4">
                          <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
                          {content.subtitle && (
                            <p className="text-gray-500 text-sm mb-4">{content.subtitle}</p>
                          )}

                          {content.featured_image && (
                            <div className="w-full mb-6 mt-4">
                              <img
                                src={getAttachmentUrl(backendHost, content.featured_image.name)}
                                alt={content.title || 'Featured image'}
                                className="w-full h-auto object-cover rounded-md max-h-[400px]"
                              />
                            </div>
                          )}

                          <div
                            className="typography page-content"
                            dangerouslySetInnerHTML={{
                              __html: content.content || '',
                            }}
                          />

                          {/* Activity Content Revision Section */}
                          {content.revisions && content.revisions.length > 0 && (
                            <div className="mt-8 pt-6">
                              <h3 className="text-lg font-semibold mb-4">{t('Revisions')}</h3>
                              <ActivityContentRevision
                                revisions={content.revisions}
                                contentType="blog_post_content"
                                contentId={content.id}
                                currentLanguage={getLanguageName(content.locale_id)}
                                hasWritePermission={hasWritePermission}
                                onContentRestored={async () => {
                                  await getOne(id);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </Tabs.Panel>
                    ))}
                </Tabs>
              ) : (
                <div className="p-8 text-center text-gray-500">{t('Nothing here yet.')}</div>
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
