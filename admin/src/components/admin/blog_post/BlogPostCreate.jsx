import { useMemo, useState } from 'react';

import { faPlus, faTrash, faGear } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, LoadingOverlay, Modal, Tabs, Tooltip, Menu, Drawer } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import useModel from '../../../common/api/useModel.jsx';
import NotificationState from '../../../common/stores/NotificationState.js';
import OrganizationIdState from '../../../common/stores/OrganizationIdState.js';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import UserState from '../../../common/stores/UserState.js';
import CreateFormWrapper from '../../../common/ui/CreateFormWrapper.jsx';
import FileInput from '../../../common/ui/FileInput.jsx';
import RecordSelect from '../../../common/ui/RecordSelect.jsx';
import RichTextInput from '../../../common/ui/RichTextInput.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import { getAttachmentUrl } from '../../../common/utils/index.js';
import DateTimePickerInput from '../../../common/ui/DateTimePickerInput.jsx';
import useMultiLangContent from '../../../common/hooks/useMultiLangContent.js';
import SeoMetadataForm from '../../../common/ui/SeoMetadata/SeoMetadataForm.jsx';
import SocialCardPreview from '../../../common/ui/SeoMetadata/SocialCardPreview.jsx';
import SERPPreviewCardPreview from '../../../common/ui/SeoMetadata/SERPPreviewCardPreview.jsx';
import AuthorSelector from './components/AuthorSelector.jsx';
import SideBySideLanguageModal from '../../shared/SideBySideEditing/SideBySideLanguageModal.jsx';
import SideBySideEditingView from '../../shared/SideBySideEditing/SideBySideEditingView.jsx';
import BlogPostContentEditor from '../../shared/SideBySideEditing/BlogPostContentEditor.jsx';
import AIWriterModal from '../page/components/AIWriterModal.jsx';

export default function BlogPostCreate({ modalMode, onSuccess }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notify } = NotificationState((state) => state);
  const { organizationId } = OrganizationIdState();
  const { backendHost } = BackendHostURLState((state) => state);
  const { settings: siteSettings } = SitePublicSettingsState((state) => state);
  const { user } = UserState();

  const [aiAutocompleteEnabled, setAiAutocompleteEnabled] = useState(true);

  const isAiFeatureAvailable =
    !!siteSettings?.has_openrouter_api_key && !!siteSettings?.ai_autocomplete_model_id;
  const aiRequirementMessage = t(
    'Please specify an API key and autocomplete model in Site Settings to use this feature.',
  );

  const [record, setRecord] = useState({
    title: '',
    content: '',
    reading_length: '',
    published: false,
    slug: '',
    contents: [],
    author_id: user?.id || null,
    publish_date: new Date(),
  });

  const { create, blogPostLoading: loading } = useModel('blog_post');
  const { data: locales } = useModel('locale', {
    autoFetch: true,
    pageSize: null,
  });

  // Use the centralized multi-language content hook
  const {
    activeContentTab,
    setActiveContentTab,
    selectedLocaleId,
    setSelectedLocaleId,
    addingLanguage,
    addContentModalOpened,
    closeAddContentModal,
    settingsDrawerOpened,
    openSettingsDrawer,
    closeSettingsDrawer,
    getLanguageName,
    getLanguageFlag,
    handleAddContent,
    handleAddContentSubmit,
    handleDeleteContent,
    updateContentField,
    processContentsForSubmit,
    validateContents,
  } = useMultiLangContent({
    initialRecord: record,
    setRecord,
    locales,
    siteSettings,
    autoTranslate: true,
    contentType: 'blog_post',
  });

  /**
   * Active content, that based on active tab
   * @type {BlogPostContent}
   */
  const activeContent = useMemo(
    () => record?.contents?.find((c) => String(c.id) === activeContentTab),
    [activeContentTab, record?.contents],
  );

  // Side-by-side editing state
  const [sideBySideModalOpened, setSideBySideModalOpened] = useState(false);
  const [isSideBySideMode, setIsSideBySideMode] = useState(false);
  const [selectedLanguageContents, setSelectedLanguageContents] = useState([]);

  // Function to generate slug from title
  const generateSlug = (title) => {
    if (!title) return '/';
    const slug = title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-') // Replace multiple hyphens with a single one
      .replace(/^-|-$/g, ''); // Remove leading and trailing hyphens

    // Ensure slug starts with a forward slash
    return slug.startsWith('/') ? slug : `/${slug}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Use hook's helper to process contents for submission
      const processedContents = processContentsForSubmit(record.contents);

      // Validate contents using hook's helper
      validateContents(processedContents);

      // Generate slug if it's empty
      const updatedRecord = {
        ...record,
        contents: processedContents.map((content) => ({
          ...content,
          seo_metadata_title: content.seo_metadata_title || content.title,
        })),
      };

      // If slug is empty, generate it from the first content's title
      if (!updatedRecord.slug && updatedRecord.contents.length > 0) {
        const firstContent = updatedRecord.contents[0];
        if (firstContent.title) {
          updatedRecord.slug = generateSlug(firstContent.title);
        }
      }

      // Ensure slug starts with a forward slash even if manually entered
      if (updatedRecord.slug && !updatedRecord.slug.startsWith('/')) {
        updatedRecord.slug = `/${updatedRecord.slug}`;
      } else if (!updatedRecord.slug) {
        updatedRecord.slug = '/';
      }

      // Add organization_id for new blog posts
      const recordWithOrganization = {
        ...updatedRecord,
        organization_id: organizationId,
      };
      const created = await create(recordWithOrganization);
      notify({ message: 'Blog Post created successfully!', type: 'success' });
      onSuccess ? onSuccess(created) : navigate(-1);
    } catch (error) {
      console.error(error);
      notify({ message: error.message, type: 'error' });
    }
  };

  // Side-by-side editing functions
  const openSideBySideModal = () => {
    setSideBySideModalOpened(true);
  };

  const closeSideBySideModal = () => {
    setSideBySideModalOpened(false);
  };

  const handleSideBySideEdit = (selectedLanguageIds) => {
    const selectedContents = record.contents.filter((content) =>
      selectedLanguageIds.includes(content.id),
    );
    setSelectedLanguageContents(selectedContents);
    setIsSideBySideMode(true);
  };

  const exitSideBySideMode = () => {
    setIsSideBySideMode(false);
    setSelectedLanguageContents([]);
  };

  return (
    <>
      {isSideBySideMode ? (
        <SideBySideEditingView
          selectedLanguageContents={selectedLanguageContents}
          record={record}
          setRecord={setRecord}
          onExitSideBySide={exitSideBySideMode}
          onSave={handleSubmit}
          isSaving={loading}
          ContentEditor={BlogPostContentEditor}
          AIWriterModalComponent={AIWriterModal}
          aiAutocompleteEnabled={aiAutocompleteEnabled}
          onAiAutocompleteChange={setAiAutocompleteEnabled}
          isAiFeatureAvailable={isAiFeatureAvailable}
          aiFeatureTooltip={aiRequirementMessage}
        />
      ) : (
        <CreateFormWrapper
          onSubmit={handleSubmit}
          modalMode={modalMode}
          loading={loading}
          cardMode={false}
        >
          <div className={`flex justify-between mt-4`}>
            <div className="text-gray-500 text-sm font-bold uppercase">{t('Create Blog Post')}</div>
            <div className="flex items-center gap-2">
              {record?.contents?.length > 1 && (
                <Button variant="outline" size="md" onClick={openSideBySideModal} className="px-2">
                  {t('Edit languages side-by-side')}
                </Button>
              )}
              <Tooltip label={aiRequirementMessage} disabled={isAiFeatureAvailable}>
                <div className="inline-flex items-center">
                  <Switch
                    label={t('AI Autocomplete')}
                    checked={aiAutocompleteEnabled && isAiFeatureAvailable}
                    onChange={(e) => setAiAutocompleteEnabled(e.currentTarget.checked)}
                    disabled={!isAiFeatureAvailable}
                    size="md"
                  />
                </div>
              </Tooltip>
              <Tooltip label={t('Settings')}>
                <Button variant="subtle" size="md" onClick={openSettingsDrawer} className="px-2">
                  <FontAwesomeIcon icon={faGear} />
                </Button>
              </Tooltip>
              <Switch
                checked={record.published}
                onLabel={t('Published')}
                offLabel={t('Unpublished')}
                size="xl"
                classNames={{
                  track: 'px-2',
                }}
                onChange={(e) => setRecord({ ...record, published: e.currentTarget.checked })}
              />
            </div>
          </div>

          <div className="mt-4">
            <LoadingOverlay
              visible={false}
              zIndex={1000}
              overlayProps={{ radius: 'sm', blur: 2 }}
              loaderProps={{ type: 'bars' }}
            />

            <Tabs
              value={activeContentTab}
              onChange={setActiveContentTab}
              variant="pills"
              radius="lg"
              className="p-2"
            >
              <Tabs.List className="mb-2 flex-wrap">
                {record.contents.map((content) => (
                  <div key={content.id} className="relative group">
                    <Menu
                      shadow="md"
                      width={150}
                      position="bottom-end"
                      withArrow
                      radius="md"
                      trigger="hover"
                      openDelay={100}
                      closeDelay={400}
                    >
                      <Menu.Target>
                        <Tabs.Tab value={String(content.id)} className="mr-1 mb-1">
                          <span className="mr-1">{getLanguageFlag(content.locale_id)}</span>
                          {getLanguageName(content.locale_id)}
                        </Tabs.Tab>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          color="red"
                          leftSection={<FontAwesomeIcon icon={faTrash} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContent(content.id);
                          }}
                        >
                          {t('Remove')}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </div>
                ))}

                <Tooltip label={t('Add Language')}>
                  <Tabs.Tab
                    value="add_new"
                    onClick={(e) => {
                      e.preventDefault();
                      handleAddContent();
                    }}
                    className="bg-gray-100 hover:bg-gray-200"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </Tabs.Tab>
                </Tooltip>
              </Tabs.List>

              {record.contents.map((content) => (
                <Tabs.Panel key={content.id} value={String(content.id)}>
                  <div className="flex gap-4 my-2">
                    <div className="flex flex-col grow gap-2">
                      <TextInput
                        className="w-full"
                        placeholder={t('Title')}
                        classNames={{ input: 'text-[36px]! font-bold! px-0!' }}
                        size="xl"
                        variant="subtle"
                        required
                        value={content.title || ''}
                        onChange={(e) => updateContentField(content.id, 'title', e.target.value)}
                      />
                    </div>
                  </div>
                  {content.featured_image && (
                    <div
                      className="w-full my-4 relative group cursor-pointer"
                      onClick={openSettingsDrawer}
                    >
                      <img
                        src={getAttachmentUrl(backendHost, content.featured_image.name)}
                        alt={content.title || 'Featured image'}
                        className="w-full h-auto object-cover rounded-md max-h-[400px]"
                      />
                      <div className="absolute inset-0 backdrop-blur-sm bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-md">
                        <div className="text-white font-medium">
                          <FontAwesomeIcon icon={faGear} className="mr-2" />
                          {t('Edit Settings')}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="my-4">
                    <RichTextInput
                      content={content.content || ''}
                      onChange={(value) => updateContentField(content.id, 'content', value)}
                      classNames={{ content: 'min-h-[1000px]' }}
                      autoComplete={aiAutocompleteEnabled && isAiFeatureAvailable}
                    />
                  </div>
                </Tabs.Panel>
              ))}
            </Tabs>
          </div>
        </CreateFormWrapper>
      )}

      {/* Side-by-Side Language Selection Modal */}
      <SideBySideLanguageModal
        opened={sideBySideModalOpened}
        onClose={closeSideBySideModal}
        languages={record?.contents || []}
        onEdit={handleSideBySideEdit}
      />

      {/* Add Language Modal */}
      <Modal
        opened={addContentModalOpened}
        onClose={closeAddContentModal}
        title={<div className="font-bold">{t('Add Content')}</div>}
        size="md"
        radius={0}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            {t('Select a language to add a new content.')}
          </p>

          <RecordSelect
            model="locale"
            displayField="name"
            pageSize={1000}
            searchFields={['name', 'iso_code']}
            label={t('Language')}
            placeholder={t('Select a Language')}
            required
            value={selectedLocaleId}
            onChange={setSelectedLocaleId}
            renderOption={(option) => (
              <span>
                {option.emoji_flag} {option.name}
              </span>
            )}
            filter={{
              id: {
                $nin: record.contents.map((t) => t.locale_id).filter(Boolean),
              },
            }}
          />

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={closeAddContentModal} className="mr-2">
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleAddContentSubmit}
              disabled={!selectedLocaleId || addingLanguage}
              loading={addingLanguage}
            >
              {t('Add Language')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Settings Drawer */}
      <Drawer
        opened={settingsDrawerOpened}
        onClose={closeSettingsDrawer}
        title={<div className="font-bold">{t('Settings')}</div>}
        size="md"
        position="right"
        transitionProps={{ transition: 'slide-left', duration: 200 }}
      >
        <div className="mb-10 space-y-4">
          <AuthorSelector
            value={record.author_id}
            onChange={(value) => setRecord((prev) => ({ ...prev, author_id: value }))}
          />

          <DateTimePickerInput
            label={t('Publication Date')}
            placeholder={t('Select publication date')}
            valueFormat="DD MMM YYYY hh:mm A"
            value={record.publish_date ? new Date(record.publish_date) : new Date()}
            onChange={(date) => setRecord({ ...record, publish_date: date })}
            className="mb-4"
            clearable={false}
          />

          <TextInput
            className="w-full"
            label={t('Slug')}
            placeholder={t('Enter URL slug (will be auto-generated if left empty)')}
            value={record.slug || ''}
            onChange={(e) => setRecord({ ...record, slug: e.target.value })}
          />

          {activeContentTab && activeContentTab !== 'add_new' && (
            <>
              <div className="pt-4">
                <h3 className="font-medium mb-2">{t('Content Settings')}</h3>
                <p className="text-sm text-gray-500 mb-3">
                  {t('These settings apply to the currently selected language content.')}
                </p>

                <FileInput
                  className="w-full"
                  label={t('Featured Image')}
                  value={activeContent.featured_image?.name}
                  onChange={(file) => {
                    updateContentField(activeContent.id, 'featured_image', file);
                    updateContentField(activeContent.id, 'featured_image_id', file?.id);
                  }}
                  type="image"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-10">
          <SeoMetadataForm pageContent={activeContent} updateContentField={updateContentField} />
          {(activeContent?.seo_metadata_title || activeContent?.seo_metadata_description) && (
            <>
              <SocialCardPreview pageContent={activeContent} />
              <SERPPreviewCardPreview pageContent={activeContent} />
            </>
          )}
        </div>
      </Drawer>
    </>
  );
}
