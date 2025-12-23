import { useMemo, useEffect } from 'react';
import { faPlus, faTrash, faGear } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, LoadingOverlay, Modal, Tabs, Tooltip, Menu, Drawer } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import useModel from '../../../common/api/useModel.jsx';
import NotificationState from '../../../common/stores/NotificationState.js';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import EditFormActionBar from '../../../common/ui/EditFormActionBar.jsx';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import FileInput from '../../../common/ui/FileInput.jsx';
import RecordSelect from '../../../common/ui/RecordSelect.jsx';
import RichTextInput from '../../../common/ui/RichTextInput.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import { getAttachmentUrl, mergeContentsWithServerData } from '../../../common/utils/index.js';
import DateTimePickerInput from '../../../common/ui/DateTimePickerInput.jsx';
import useMultiLangContent from '../../../common/hooks/useMultiLangContent.js';
import SeoMetadataForm from '../../../common/ui/SeoMetadata/SeoMetadataForm.jsx';
import SocialCardPreview from '../../../common/ui/SeoMetadata/SocialCardPreview.jsx';
import SERPPreviewCardPreview from '../../../common/ui/SeoMetadata/SERPPreviewCardPreview.jsx';
import AuthorSelector from './components/AuthorSelector.jsx';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-jsx';
import 'prismjs/themes/prism.css';
import H3 from '../../../common/ui/H3.jsx';
import useEditSession from '../../../common/hooks/useEditSession.js';
import useFetch from '../../../common/api/useFetch.js';
import { useState } from 'react';
import ParallelEditWarning from '../../../common/ui/ParallelEditWarning.jsx';
import ConflictResolutionModal from '../../../common/ui/ConflictResolutionModal.jsx';
import SideBySideLanguageModal from '../../shared/SideBySideEditing/SideBySideLanguageModal.jsx';
import SideBySideEditingView from '../../shared/SideBySideEditing/SideBySideEditingView.jsx';
import BlogPostContentEditor from '../../shared/SideBySideEditing/BlogPostContentEditor.jsx';
import AIWriterModal from '../page/components/AIWriterModal.jsx';

export default function BlogPostEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { notify } = NotificationState((state) => state);
  const { backendHost } = BackendHostURLState((state) => state);
  const siteSettings = SitePublicSettingsState((state) => state.settings);

  const query = useModel('blog_post', { id, autoFetch: true });
  const { record, setRecord, update, loading } = query;

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

  // Edit session management for parallel edit detection
  // Note: Using null for contentId to track blog post level editing (not individual content items)
  const { parallelEditWarning, clearParallelEditWarning } = useEditSession(
    'blog_post',
    id,
    null, // Track at blog post level, not per-content-item
  );

  // Simple conflict resolution state
  const [conflictData, setConflictData] = useState(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const [editStartTimestamp, setEditStartTimestamp] = useState(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [isResolvingConflictLoading, setIsResolvingConflictLoading] = useState(false);
  const [aiAutocompleteEnabled, setAiAutocompleteEnabled] = useState(true);
  const isAiFeatureAvailable =
    !!siteSettings?.has_openrouter_api_key && !!siteSettings?.ai_autocomplete_model_id;
  const aiRequirementMessage = t(
    'Please specify an API key and autocomplete model in Site Settings to use this feature.',
  );

  // Side-by-side editing state
  const [sideBySideModalOpened, setSideBySideModalOpened] = useState(false);
  const [isSideBySideMode, setIsSideBySideMode] = useState(false);
  const [selectedLanguageContents, setSelectedLanguageContents] = useState([]);

  // Conflict check API
  const { post: checkConflictAPI } = useFetch('conflict_resolution/check-conflict', {
    autoFetch: false,
  });

  // Simple conflict resolution functions
  const startEditSession = () => {
    setEditStartTimestamp(new Date().toISOString());
    setConflictData(null);
    setIsResolvingConflict(false);
  };

  // Helper function for re-checking conflicts without updating modal state
  const recheckConflicts = async (recordType, recordId, userContents = null) => {
    if (!editStartTimestamp) {
      throw new Error('Edit session not started. Call startEditSession() first.');
    }

    try {
      const requestData = {
        record_type: recordType,
        record_id: recordId,
        edit_start_timestamp: editStartTimestamp,
        user_contents: userContents,
      };

      const response = await checkConflictAPI(requestData);

      if (response.has_conflict) {
        return {
          hasConflict: true,
          serverRecord: response.newer_record,
          lastModifiedBy: response.last_modified_by,
          lastModifiedAt: response.last_modified_at,
          conflictExplanation: response.conflict_explanation,
        };
      }

      return { hasConflict: false };
    } catch (error) {
      console.error('Error re-checking for conflicts:', error);
      throw error;
    }
  };

  const checkForConflicts = async (recordType, recordId, userContents = null) => {
    if (!editStartTimestamp) {
      throw new Error('Edit session not started. Call startEditSession() first.');
    }

    try {
      setIsCheckingConflicts(true);

      const requestData = {
        record_type: recordType,
        record_id: recordId,
        edit_start_timestamp: editStartTimestamp,
        user_contents: userContents, // Send user's current contents for AI explanation
      };

      const response = await checkConflictAPI(requestData);

      if (response.has_conflict) {
        setConflictData({
          serverRecord: response.newer_record,
          lastModifiedBy: response.last_modified_by,
          lastModifiedAt: response.last_modified_at,
          conflictExplanation: response.conflict_explanation, // AI explanation
        });
        setIsResolvingConflict(true);
        return {
          hasConflict: true,
          serverRecord: response.newer_record,
          lastModifiedBy: response.last_modified_by,
          lastModifiedAt: response.last_modified_at,
          conflictExplanation: response.conflict_explanation,
        };
      }

      return { hasConflict: false };
    } catch (error) {
      console.error('Error checking for conflicts:', error);
      throw error;
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const cancelConflictResolution = () => {
    setConflictData(null);
    setIsResolvingConflict(false);
  };

  // Start edit session only once when record is first loaded, not on activeContent changes
  useEffect(() => {
    if (record && !editStartTimestamp) {
      startEditSession();
    }
  }, [record?.id, editStartTimestamp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Use hook's helper to process contents for submission
      const processedContents = processContentsForSubmit(record.contents);

      // Validate contents using hook's helper
      validateContents(processedContents);

      // Create the complete record that we're trying to save (with processed contents)
      const recordToSave = {
        ...record,
        contents: processedContents.map((content) => ({
          ...content,
          seo_metadata_title: content.seo_metadata_title || content.title,
        })),
      };

      // Check for conflicts before saving, send processed contents for AI explanation
      const conflictResult = await checkForConflicts('blog_post', record.id, processedContents);

      if (conflictResult.hasConflict) {
        // Conflict detected - store the record we were trying to save for the modal
        setConflictData((prev) => ({
          ...prev,
          userRecordToSave: recordToSave, // Store what user was actually trying to save
        }));

        return;
      }

      await update(recordToSave);
      notify({ message: t('Blog Post updated successfully!'), type: 'success' });
      navigate(-1);
    } catch (error) {
      console.error(error);
      notify({ message: error.message, type: 'error' });
    }
  };

  const handleConflictResolution = async (resolvedData) => {
    try {
      setIsResolvingConflictLoading(true);
      const processedContents = processContentsForSubmit(resolvedData.contents);

      // Re-check for conflicts before saving to ensure we have the latest server data
      const conflictResult = await recheckConflicts('blog_post', record.id, processedContents);

      if (conflictResult.hasConflict) {
        // Check if the server data has changed since the modal was opened
        const currentServerTimestamp = new Date(conflictResult.lastModifiedAt).getTime();
        const modalServerTimestamp = new Date(conflictData?.lastModifiedAt).getTime();

        if (currentServerTimestamp > modalServerTimestamp) {
          // Server data has changed - update modal with new data
          setConflictData((prev) => ({
            ...prev,
            serverRecord: conflictResult.serverRecord,
            lastModifiedBy: conflictResult.lastModifiedBy,
            lastModifiedAt: conflictResult.lastModifiedAt,
            conflictExplanation: conflictResult.conflictExplanation,
          }));

          notify({
            message: t(
              'Server data has been updated by another user. Please review the new changes.',
            ),
            type: 'warning',
          });
          setIsResolvingConflictLoading(false);
          return; // Stay in conflict modal with updated data
        }
      }

      // No new conflicts or same timestamp - proceed with save
      // Use server record from conflict data as base and merge with resolved contents
      // This ensures we build on top of the latest server state that caused the conflict
      const serverRecord = conflictData?.serverRecord;
      const recordToSave = serverRecord
        ? {
            ...serverRecord,
            contents: mergeContentsWithServerData(serverRecord.contents, processedContents),
          }
        : { ...record, contents: processedContents };

      await update(recordToSave);

      notify({
        message: t('Conflict resolved and blog post updated successfully!'),
        type: 'success',
      });

      // Close conflict modal
      setConflictData(null);
      setIsResolvingConflict(false);

      // Refresh the record to get the latest data
      await query.getOne(id);
      navigate(-1);
    } catch (error) {
      console.error(error);
      notify({ message: error.message, type: 'error' });
    } finally {
      setIsResolvingConflictLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
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

  const handleContinueEditing = () => {
    clearParallelEditWarning();
  };

  return !loading && record ? (
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
        <form className={`max-w-screen-xl m-auto my-[50px] px-[24px]`} onSubmit={handleSubmit}>
          <EditFormActionBar query={query} loading={loading || isCheckingConflicts} />

          {/* Parallel Edit Warning */}
          <ParallelEditWarning
            warning={parallelEditWarning}
            onDismiss={clearParallelEditWarning}
            onGoBack={handleGoBack}
            onContinueEditing={handleContinueEditing}
          />

          <div className={`flex justify-between mt-8`}>
            <div>
              <div className="text-gray-500 text-sm font-bold uppercase">
                {t('Editing Blog Post')} #{record.id}
              </div>
              <div className="text-gray-500 text-sm">{record.slug}</div>
            </div>
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
              visible={loading}
              zIndex={1000}
              overlayProps={{ radius: 'sm', blur: 2 }}
              loaderProps={{ type: 'bars' }}
            />

            <Tabs
              value={activeContentTab}
              onChange={setActiveContentTab}
              variant="pills"
              radius="lg"
            >
              <Tabs.List className="mb-2 flex-wrap">
                {record?.contents?.map((content) => (
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

              {record?.contents?.length > 0 ? (
                record.contents.map((content) => (
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
                        variant="subtle"
                        content={content.content || ''}
                        onChange={(value) => {
                          updateContentField(content.id, 'content', value);
                        }}
                        classNames={{ content: 'min-h-[1000px]' }}
                        autoComplete={aiAutocompleteEnabled && isAiFeatureAvailable}
                      />
                    </div>
                  </Tabs.Panel>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">{t('Nothing here yet.')}</div>
              )}
            </Tabs>
          </div>
        </form>
      )}

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
            placeholder={t('Enter URL slug (required)')}
            required
            value={record.slug || ''}
            onChange={(e) => setRecord({ ...record, slug: e.target.value })}
          />

          <Switch
            classNames={{
              body: 'flex-col-reverse gap-2',
              label: 'px-0',
              description: 'px-0 mt-0',
            }}
            checked={record.require_login || false}
            size="lg"
            label={t('Require Login')}
            description={t('When enabled, users must be logged in to view this blog post')}
            onChange={(e) => setRecord({ ...record, require_login: e.currentTarget.checked })}
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
                  value={activeContent?.featured_image?.name}
                  onChange={(file) => {
                    if (activeContent?.id) {
                      updateContentField(activeContent.id, 'featured_image', file);
                      updateContentField(activeContent.id, 'featured_image_id', file?.id);
                    }
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

          {/* Custom Code Section */}
          {activeContentTab && activeContentTab !== 'add_new' && (
            <div className="space-y-3">
              <H3>{t('Custom Code')}</H3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Language-specific custom code')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {t(
                    'This code will be injected only for this language version of the blog post, after the content.',
                  )}
                </p>
                <div className="border border-gray-300 rounded" style={{ height: '150px' }}>
                  <Editor
                    className="w-full h-full"
                    value={activeContent?.custom_code || ''}
                    onValueChange={(code) => {
                      if (activeContent?.id) {
                        updateContentField(activeContent.id, 'custom_code', code);
                      }
                    }}
                    highlight={(code) => highlight(code, languages.markup, 'html')}
                    padding={10}
                    style={{
                      fontSize: 12,
                      backgroundColor: '#f6f8fa',
                      minHeight: '150px',
                    }}
                    placeholder="<!-- Enter HTML, CSS, or JavaScript code here -->"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Blog post custom code (all languages)')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {t(
                    'This code will be injected in all language versions of this blog post, after the content.',
                  )}
                </p>
                <div className="border border-gray-300 rounded" style={{ height: '150px' }}>
                  <Editor
                    className="w-full h-full"
                    value={record?.blog_post_custom_code || ''}
                    onValueChange={(code) => setRecord({ ...record, blog_post_custom_code: code })}
                    highlight={(code) => highlight(code, languages.markup, 'html')}
                    padding={10}
                    style={{
                      fontSize: 12,
                      backgroundColor: '#f6f8fa',
                      minHeight: '150px',
                    }}
                    placeholder="<!-- Enter HTML, CSS, or JavaScript code here -->"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* Side-by-Side Language Selection Modal */}
      <SideBySideLanguageModal
        opened={sideBySideModalOpened}
        onClose={closeSideBySideModal}
        languages={record?.contents || []}
        onEdit={handleSideBySideEdit}
      />

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={isResolvingConflict}
        onClose={cancelConflictResolution}
        userRecord={{
          ...record,
          contents: record?.contents || [],
        }}
        serverRecord={conflictData?.serverRecord}
        lastModifiedBy={conflictData?.lastModifiedBy}
        lastModifiedAt={conflictData?.lastModifiedAt}
        conflictExplanation={conflictData?.conflictExplanation}
        onResolveConflict={handleConflictResolution}
        isLoading={isResolvingConflictLoading}
      />
    </>
  ) : (
    <FormViewSkeleton />
  );
}
