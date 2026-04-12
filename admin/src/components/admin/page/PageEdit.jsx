import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LoadingOverlay, Modal, Tabs, Tooltip, Menu } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import useModel from '../../../common/api/useModel.jsx';
import useMultiLangContent from '../../../common/hooks/useMultiLangContent.js';
import useResizablePanel from '../../../common/hooks/useResizablePanel.js';
import useSidebar from '../../../common/hooks/useSidebar.js';
import NotificationState from '../../../common/stores/NotificationState.js';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import ShowHeaderBackButtonState from '../../../common/stores/ShowHeaderBackButtonState.js';
import ShowSiteSelectorState from '../../../common/stores/ShowSiteSelectorState.js';
import HideHeaderItemsState from '../../../common/stores/HideHeaderItemsState.js';
import NavigationConfirmationState from '../../../common/stores/NavigationConfirmationState.js';
import OrganizationIdState from '../../../common/stores/OrganizationIdState.js';
import OrganizationState from '../../../common/stores/OrganizationState.js';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import RecordSelect from '../../../common/ui/RecordSelect.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import RichTextInput from '../../../common/ui/RichTextInput.jsx';
import Button from '../../../common/ui/Button.jsx';
import { HOMEPAGE_DEFAULT_SLUG } from '../../../constants/slug.js';
import PageContentSettingDrawer from './components/PageContentSettingDrawer.jsx';
import AIWriterSidebar from '../../../common/ui/AIWriterSidebar.jsx';
import { buildFullUrl } from '../../../utils/domainUtils.js';
import useBackWithRedirect from '../../../common/hooks/useBackWithRedirect.js';
import useAuthentication from '../../../common/api/useAuthentication.js';

import { mergeContentsWithServerData } from '../../../common/utils/index.js';
import useEditSession from '../../../common/hooks/useEditSession.js';
import useFetch from '../../../common/api/useFetch.js';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';
import ParallelEditWarning from '../../../common/ui/ParallelEditWarning.jsx';
import ConflictResolutionModal from '../../../common/ui/ConflictResolutionModal.jsx';
import {
  IconAi,
  IconCheck,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconPlus,
  IconSettings,
  IconSparkles2,
  IconSubtitlesAi,
  IconTrash,
} from '@tabler/icons-react';

export default function PageEdit({ onSuccess }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { notify } = NotificationState();
  const { settings: siteSettings } = SitePublicSettingsState();
  const { organizationId } = OrganizationIdState();
  const { organizations } = OrganizationState();
  const { setShowBackButton } = ShowHeaderBackButtonState();
  const { setHideSiteSelector } = ShowSiteSelectorState();
  const { setHideNotifications, setHideProfileDropdown, setHideGoToSite } = HideHeaderItemsState();
  const backWithRedirect = useBackWithRedirect();
  const { setNavigationConfirmation, clearNavigationConfirmation } = NavigationConfirmationState();
  const { isCollapsed, temporaryCollapse, clearTemporaryOverride } = useSidebar();
  const { user } = useAuthentication();

  // Determine if this is create mode (no id) or edit mode (has id)
  const isCreateMode = !id;

  // Initialize record for create mode, if there is no id
  const [createRecord, setCreateRecord] = useState({
    title: '',
    content: '',
    published: false,
    slug: '',
    contents: [],
    seo_metadata_allow_indexing: true,
  });

  // Single useModel query for both modes
  const query = useModel('page', { id, autoFetch: !!id });

  // Use create record for create mode, query record for edit mode
  const record = isCreateMode ? createRecord : query.record;
  const setRecord = isCreateMode ? setCreateRecord : query.setRecord;
  const { update, create, loading } = query;

  const { data: locales } = useModel('locale', {
    autoFetch: true,
    pageSize: null,
  });

  // Use the multi-language content hook
  const {
    // State
    activeContentTab,
    setActiveContentTab,
    selectedLocaleId,
    setSelectedLocaleId,
    addingLanguage,

    // Modal state and controls
    addContentModalOpened,
    closeAddContentModal,
    settingsDrawerOpened,
    openSettingsDrawer,
    closeSettingsDrawer,

    // Content manipulation functions
    updateContentField,
    handleAddContent,
    handleDeleteContent,
    handleAddContentSubmit,

    // Submission helpers
    processContentsForSubmit,
    validateContents,
  } = useMultiLangContent({
    initialRecord: record,
    setRecord,
    locales,
    siteSettings,
    autoTranslate: true,
    contentType: 'page',
  });

  /**
   * Active content, that based on active tab
   * @type {PageContent}
   */
  const activeContent = useMemo(
    () => record?.contents?.find((c) => String(c.id) === activeContentTab),
    [activeContentTab, record?.contents],
  );

  const { width, handleMouseDown, isResizing } = useResizablePanel({
    initialWidth: 400,
    minWidth: 300,
    maxWidth: window.innerWidth - 200,
  });

  const iframeRef = useRef(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const initialSidebarStateRef = useRef(null);
  const sidebarInitializedRef = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const originalRecordRef = useRef(null);
  const [isIframeReady, setIsIframeReady] = useState(false);
  const queuedPreviewDataRef = useRef(null);
  const [aiAutocompleteEnabled, setAiAutocompleteEnabled] = useState(true);
  const aiAutoCompleteAvailable =
    !!siteSettings?.has_openrouter_api_key && !!siteSettings?.ai_autocomplete_model_id;
  const aiWritingAvailable =
    !!siteSettings?.has_openrouter_api_key && !!siteSettings?.ai_default_writing_model_id;

  // AI Writer state
  const [aiWriterSidebarOpened, setAiWriterSidebarOpened] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // Edit session management for parallel edit detection
  // Note: Using null for contentId to track page level editing (not individual content items)
  const { parallelEditWarning, clearParallelEditWarning } = useEditSession(
    'page',
    id,
    null, // Track at page level, not per-content-item
  );

  // Simple conflict resolution state
  const [conflictData, setConflictData] = useState(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const [editStartTimestamp, setEditStartTimestamp] = useState(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [isResolvingConflictLoading, setIsResolvingConflictLoading] = useState(false);

  // Conflict check API
  const { post: checkConflictAPI, loading: checkingConflict } = useFetch(
    'conflict_resolution/check-conflict',
    {
      autoFetch: false,
    },
  );

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

  // State to trigger preview updates when content changes
  const [previewTrigger, setPreviewTrigger] = useState(0);

  // State for rendered content
  const [renderedContent, setRenderedContent] = useState(null);

  // Render content API
  const { post: renderContentAPI } = useFetch('template_content/render', {
    autoFetch: false,
  });

  // Function to render wysiwyg content with Jinja2
  const renderWysiwygContent = async (contentStr, lang = null) => {
    if (!contentStr || typeof contentStr !== 'string') {
      return contentStr;
    }
    if (!contentStr.includes('{{') && !contentStr.includes('{%')) {
      return contentStr;
    }
    try {
      const renderResponse = await renderContentAPI({
        content: contentStr,
        name: `preview_${Date.now()}_${Math.random()}`,
        organization_id: organizationId,
        lang: lang,
      });
      return renderResponse.rendered_content;
    } catch (error) {
      console.error('Error rendering content:', error);
      return contentStr;
    }
  };

  // Function to confirm navigation with unsaved changes
  const confirmNavigation = (callback) => {
    if (hasUnsavedChanges && !isSaving) {
      modals.openConfirmModal({
        title: <div className="text-lg font-semibold">{t('Unsaved Changes')}</div>,
        children: t('You have unsaved changes. Are you sure you want to leave without saving?'),
        labels: { confirm: t('Leave'), cancel: t('Stay') },
        onConfirm: callback,
      });
    } else {
      callback();
    }
  };

  // Redirect to theme editor if page slug conflicts with a theme-defined page
  const { backendHost } = BackendHostURLState();
  useEffect(() => {
    if (isCreateMode || !record?.contents?.length || !siteSettings?.selected_theme) return;

    const checkThemeConflict = async () => {
      try {
        const tokenResult = await (
          await import('@capacitor/preferences')
        ).Preferences.get({
          key: 'token',
        });
        const headers = {};
        if (tokenResult?.value) {
          headers.Authorization = `Bearer ${tokenResult.value}`;
        }

        const response = await fetch(
          `${backendHost}/theme/page-slugs/${siteSettings.selected_theme}`,
          { headers },
        );
        if (!response.ok) return;

        const { slugs } = await response.json();
        const conflictingContent = record.contents.find((c) => slugs.includes(c.slug));
        if (conflictingContent) {
          const filename =
            conflictingContent.slug === '/'
              ? 'Index.astro'
              : `${conflictingContent.slug.replace(/^\//, '')}.astro`;
          notify({
            message: t(
              'This page\'s slug conflicts with the theme file "{{file}}". Redirecting to theme editor.',
              { file: filename },
            ),
            type: 'info',
          });
          navigate(
            `/themes/edit/${siteSettings.selected_theme}?file=${encodeURIComponent(filename)}`,
            { replace: true },
          );
        }
      } catch (e) {
        console.error('Error checking theme conflict:', e);
      }
    };
    checkThemeConflict();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, siteSettings?.selected_theme]);

  // Capture initial sidebar state and auto-collapse on mount
  useEffect(() => {
    if (!sidebarInitializedRef.current) {
      // Capture initial state only once
      initialSidebarStateRef.current = isCollapsed;
      sidebarInitializedRef.current = true;

      // Temporarily collapse sidebar if it's currently open
      if (!isCollapsed) {
        temporaryCollapse();
      }
    }
  }, [isCollapsed, temporaryCollapse]);

  // Restore sidebar state on unmount
  useEffect(() => {
    return () => {
      // Clear temporary override to restore original user preference
      clearTemporaryOverride();
    };
  }, [clearTemporaryOverride]);

  // Enable back button and hide header items on mount, restore on unmount
  useEffect(() => {
    setShowBackButton(true);
    setHideSiteSelector(true);
    setHideNotifications(true);
    setHideProfileDropdown(true);
    setHideGoToSite(true);
    return () => {
      setShowBackButton(false);
      setHideSiteSelector(false);
      setHideNotifications(false);
      setHideProfileDropdown(false);
      setHideGoToSite(false);
      clearNavigationConfirmation();
    };
  }, [
    setShowBackButton,
    setHideSiteSelector,
    setHideNotifications,
    setHideProfileDropdown,
    setHideGoToSite,
    clearNavigationConfirmation,
  ]);

  // Set/clear navigation confirmation based on unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges && !isSaving) {
      setNavigationConfirmation(confirmNavigation);
    } else {
      clearNavigationConfirmation();
    }
  }, [hasUnsavedChanges, isSaving, setNavigationConfirmation, clearNavigationConfirmation]);

  const currentContent = useMemo(() => {
    return record?.contents?.find((c) => String(c.id) === activeContentTab);
  }, [record, activeContentTab]);

  // Effect to render content when it changes
  useEffect(() => {
    if (currentContent?.content && organizationId) {
      // Get language code from current content's locale
      const lang = currentContent.locale?.iso_code || null;
      renderWysiwygContent(currentContent.content, lang)
        .then((rendered) => {
          setRenderedContent(rendered);
        })
        .catch((error) => {
          console.error('Error rendering content for preview:', error);
          setRenderedContent(currentContent.content); // Fallback to original
        });
    } else {
      setRenderedContent(currentContent?.content || null);
    }
  }, [currentContent?.content, currentContent?.locale?.iso_code, organizationId]);

  // Generate preview URL — uses same-origin path so iframe can communicate
  // via postMessage and session cookies are sent automatically
  const previewUrl = useMemo(() => {
    const selectedLocaleCode = currentContent?.locale?.iso_code;
    if (!selectedLocaleCode) return null;

    let path;
    if (!currentContent.slug || isCreateMode) {
      path = `/preview?lang=${selectedLocaleCode}`;
    } else {
      const isDefaultLanguage =
        selectedLocaleCode?.toLowerCase() ===
        siteSettings?.default_language?.iso_code?.toLowerCase();

      if (isDefaultLanguage) {
        path = currentContent.slug;
      } else {
        const localePrefix = `/${selectedLocaleCode}`;
        const cleanSlug = currentContent.slug.startsWith('/')
          ? currentContent.slug
          : `/${currentContent.slug}`;
        path = `${localePrefix}${cleanSlug}`;
      }
    }

    // Use same-origin path — session cookie handles auth, org_id tells backend which site
    const url = new URL(path, window.location.origin);
    url.searchParams.set('preview', 'true');
    if (record?.organization_id) {
      url.searchParams.set('org_id', String(record.organization_id));
    }
    return url.toString();
  }, [
    activeContentTab,
    currentContent,
    record,
    siteSettings?.default_language?.iso_code,
    isCreateMode,
  ]);

  const previewData = useMemo(() => {
    if (!currentContent?.locale?.iso_code) return null;

    return {
      id: record?.id || currentContent.id || 'new',
      title: currentContent.title || 'Untitled',
      content: renderedContent || currentContent.content,
      lang: currentContent.locale?.iso_code || siteSettings?.default_language?.iso_code,
      published: record?.published || false,
      seo_metadata: {
        title: currentContent.seo_metadata_title,
        description: currentContent.seo_metadata_description,
        featured_image_id: currentContent.seo_metadata_featured_image_id,
        allow_indexing: currentContent.seo_metadata_allow_indexing !== false,
      },
      public_settings: siteSettings,
      is_preview: true,
      string_id: record?.string_id,
      notFound: false,
    };
  }, [currentContent, record, siteSettings, previewTrigger, renderedContent]);

  // Watch for record changes and trigger preview update
  useEffect(() => {
    if (record && record.contents) {
      setPreviewTrigger((prev) => prev + 1);
    }
  }, [record]);

  // Listen for iframe ready signal
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'IFRAME_READY') {
        setIsIframeReady(true);

        // Send queued data if available
        if (queuedPreviewDataRef.current && iframeRef.current) {
          try {
            iframeRef.current.contentWindow.postMessage(
              {
                type: 'PREVIEW_DATA',
                data: queuedPreviewDataRef.current,
              },
              window.location.origin,
            );
            queuedPreviewDataRef.current = null;
          } catch (error) {
            console.error('Error sending queued postMessage to iframe:', error);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Update iframe URL
  useEffect(() => {
    if (previewUrl && iframeRef.current) {
      // Reset iframe ready state when URL changes
      setIsIframeReady(false);

      try {
        const iframe = iframeRef.current;
        if (iframe.contentWindow && iframe.contentWindow.location) {
          iframe.contentWindow.location.replace(previewUrl);
        } else {
          // Fallback for initial load or cross-origin restrictions
          iframe.src = previewUrl;
        }
      } catch (error) {
        // Cross-origin restrictions, fallback to src
        iframeRef.current.src = previewUrl;
      }
    }
  }, [previewUrl]);

  // Debounced postMessage sending to avoid too many updates
  useEffect(() => {
    if (previewData && iframeRef.current && previewUrl) {
      const sendMessage = () => {
        try {
          iframeRef.current.contentWindow.postMessage(
            {
              type: 'PREVIEW_DATA',
              data: previewData,
            },
            '*',
          );
        } catch (error) {
          console.error('Error sending postMessage to iframe:', error);
        }
      };

      // Debounce the message sending to avoid excessive updates
      const debounceTimer = setTimeout(() => {
        if (isIframeReady) {
          // Iframe is ready, send immediately
          sendMessage();
        } else {
          // Iframe not ready yet, queue the data AND try sending with delay
          queuedPreviewDataRef.current = previewData;

          // Fallback: try sending after short delay
          setTimeout(() => {
            if (iframeRef.current && queuedPreviewDataRef.current) {
              sendMessage();
              queuedPreviewDataRef.current = null;
            }
          }, 500);
        }
      }, 300); // 300ms debounce

      return () => clearTimeout(debounceTimer);
    }
  }, [previewData, previewUrl, isIframeReady]);

  // Start edit session when record is loaded
  useEffect(() => {
    if (record && !editStartTimestamp) {
      startEditSession();
    }
  }, [record?.id, editStartTimestamp]);

  // Track changes to detect unsaved modifications
  useEffect(() => {
    if (record && Object.keys(record).length > 0) {
      if (!originalRecordRef.current) {
        // Store original record on first load
        originalRecordRef.current = JSON.parse(JSON.stringify(record));
        setHasUnsavedChanges(false);
      } else {
        // Compare current record with original
        const currentRecordStr = JSON.stringify(record);
        const originalRecordStr = JSON.stringify(originalRecordRef.current);
        setHasUnsavedChanges(currentRecordStr !== originalRecordStr);
      }
    }
  }, [record]);

  // Prevent navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !isSaving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isSaving]);

  // Reset unsaved changes flag after successful save
  const resetUnsavedChanges = useCallback(() => {
    if (record) {
      originalRecordRef.current = JSON.parse(JSON.stringify(record));
      setHasUnsavedChanges(false);
    }
  }, [record]);

  const handleContentInserted = () => {
    setPreviewTrigger((prev) => prev + 1);
    setEditorKey((k) => k + 1);
  };

  // Callback to trigger preview update when content changes in editor
  const handleContentChange = useCallback(() => {
    setPreviewTrigger((prev) => prev + 1);
  }, []);

  // Wrap setRecord to detect content changes
  const wrappedSetRecord = useCallback(
    (newRecordOrFunction) => {
      // Handle both object and function updates
      if (typeof newRecordOrFunction === 'function') {
        setRecord((prevRecord) => {
          const updatedRecord = newRecordOrFunction(prevRecord);
          // Trigger preview update after state update
          setTimeout(() => setPreviewTrigger((prev) => prev + 1), 0);
          return updatedRecord;
        });
      } else {
        setRecord(newRecordOrFunction);
        // Trigger preview update when record changes
        setPreviewTrigger((prev) => prev + 1);
      }
    },
    [setRecord],
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        // Process contents using the hook's helper
        let processedContents = processContentsForSubmit(record.contents);
        if (record.is_homepage) {
          processedContents = processedContents.map((content) => ({
            ...content,
            slug: HOMEPAGE_DEFAULT_SLUG,
          }));
        }

        const updatedRecord = {
          ...record,
          contents: processedContents.map((content) => ({
            ...content,
            seo_metadata_title: content.seo_metadata_title || content.title,
          })),
        };

        // For create mode, set default slug if needed
        if (isCreateMode) {
          updatedRecord.slug = updatedRecord.slug || '/';
        }

        // Validate contents using the hook's helper
        validateContents(processedContents);

        // Check for conflicts before saving (only in edit mode), send processed contents for AI explanation
        if (!isCreateMode) {
          const conflictResult = await checkForConflicts('page', record.id, processedContents);

          if (conflictResult.hasConflict) {
            // Conflict detected - modal will open automatically
            setIsSaving(false);
            return;
          }
        }

        if (isCreateMode) {
          // Add organization_id for new pages
          const recordWithOrganization = {
            ...updatedRecord,
            organization_id: organizationId,
          };
          const created = await create(recordWithOrganization);
          resetUnsavedChanges();
          notify({ message: t('Page created successfully!'), type: 'success' });
          if (onSuccess) onSuccess(created);
        } else {
          await update(updatedRecord);
          resetUnsavedChanges();

          // Signal that page was updated
          sessionStorage.setItem(
            'pageUpdated',
            JSON.stringify({
              pageId: id,
              timestamp: Date.now(),
            }),
          );

          notify({ message: t('Page updated successfully!'), type: 'success' });
        }
      } catch (error) {
        console.error(error);
        notify({ message: error.message, type: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      record,
      processContentsForSubmit,
      validateContents,
      isCreateMode,
      activeContent,
      checkForConflicts,
      create,
      update,
      resetUnsavedChanges,
      notify,
      t,
      onSuccess,
      navigate,
      id,
    ],
  );

  const handleConflictResolution = async (resolvedData) => {
    try {
      setIsResolvingConflictLoading(true);
      const processedContents = processContentsForSubmit(resolvedData.contents);

      // Re-check for conflicts before saving to ensure we have the latest server data
      const conflictResult = await recheckConflicts('page', record.id, processedContents);

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

      resetUnsavedChanges();
      notify({
        message: t('Conflict resolved and page updated successfully!'),
        type: 'success',
      });

      // Close conflict modal
      setConflictData(null);
      setIsResolvingConflict(false);

      // Refresh the record to get the latest data
      await query.getOne(id);
      backWithRedirect();
    } catch (error) {
      console.error(error);
      notify({ message: error.message, type: 'error' });
    } finally {
      setIsResolvingConflictLoading(false);
    }
  };

  const handleGoBack = () => {
    confirmNavigation(() => backWithRedirect());
  };

  const handleContinueEditing = () => {
    clearParallelEditWarning();
  };

  return (!loading && record) || isCreateMode ? (
    <>
      <div className="w-full flex overflow-hidden" style={{ height: 'calc(100dvh - 70px)' }}>
        {/* Form Section - Left Side */}
        <form
          className="overflow-y-auto px-2 pb-2"
          style={{ width: `${width}px`, flexShrink: 0 }}
          onSubmit={handleSubmit}
        >
          {/* Parallel Edit Warning */}
          <ParallelEditWarning
            warning={parallelEditWarning}
            onDismiss={clearParallelEditWarning}
            onGoBack={handleGoBack}
            onContinueEditing={handleContinueEditing}
          />

          {/* Content Editing Section */}
          <div>
            <LoadingOverlay
              visible={loading}
              zIndex={1000}
              overlayProps={{ radius: 'sm', blur: 2 }}
              loaderProps={{ type: 'bars' }}
            />

            <Tabs
              value={activeContentTab}
              onChange={(value) => {
                if (value === 'add_new') {
                  handleAddContent();
                  return;
                }
                setActiveContentTab(value);
              }}
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
                          <span className="mr-1">{content.locale?.emoji_flag}</span>
                          {content.locale?.name}
                        </Tabs.Tab>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={16} />}
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
                  <Tabs.Tab value="add_new" className="bg-gray-100 hover:bg-gray-200">
                    <IconPlus size={16} />
                  </Tabs.Tab>
                </Tooltip>
              </Tabs.List>

              {record?.contents?.length > 0 ? (
                record.contents.map((content) => (
                  <Tabs.Panel key={content.id} value={String(content.id)}>
                    <div className="flex gap-4 my-2">
                      <div className="flex flex-col grow gap-2"></div>
                    </div>

                    {/* Title */}
                    <TextInput
                      className="w-full"
                      classNames={{ input: 'font-bold text-[42px]' }}
                      placeholder={t('Enter a title...')}
                      size="xl"
                      variant="unstyled"
                      required
                      value={content.title || ''}
                      onChange={(e) => {
                        updateContentField(content.id, 'title', e.target.value);
                      }}
                    />

                    {/* Content Editor */}
                    <div className="my-4">
                      <RichTextInput
                        key={`editor-${content.id}-${editorKey}`}
                        variant="subtle"
                        content={content.content || ''}
                        currentLocaleId={content.locale_id}
                        onChange={(value) => {
                          updateContentField(content.id, 'content', value);
                        }}
                        classNames={{
                          root: 'border-none',
                          content: 'min-h-[1000px]',
                        }}
                        autoComplete={aiAutocompleteEnabled && aiAutoCompleteAvailable}
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

        {/* Resize Handle */}
        <div
          className="hover:bg-blue-200 cursor-col-resize transition-colors"
          onMouseDown={handleMouseDown}
          style={{ cursor: 'col-resize', flexShrink: 0, width: '4px' }}
          title="Drag to resize"
        />

        {/* Preview Panel - Right Side */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 relative flex flex-col"
          style={{ minWidth: 0 }}
        >
          {/* Preview Header */}
          <div className="flex-shrink-0 px-4 py-2">
            <div className="flex items-center justify-between">
              {/* Device Icons - Left Side */}
              <div className="flex items-center gap-1">
                <Button
                  variant={previewDevice === 'desktop' ? 'filled' : 'subtle'}
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                  className="px-2"
                >
                  <IconDeviceDesktop size={16} />
                </Button>
                <Button
                  variant={previewDevice === 'tablet' ? 'filled' : 'subtle'}
                  size="sm"
                  onClick={() => setPreviewDevice('tablet')}
                  className="px-2"
                >
                  <IconDeviceTablet size={16} />
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'filled' : 'subtle'}
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                  className="px-2"
                >
                  <IconDeviceMobile size={16} />
                </Button>
              </div>

              {/* AI, Publish Toggle, Save, and Settings - Right Side */}
              <div className="flex items-center gap-2">
                <Menu shadow="md" width={250} position="bottom-end" withArrow radius="md">
                  <Menu.Target>
                    <Button variant="subtle" size="md" className="px-2">
                      <IconAi size={40} />
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item closeMenuOnClick={false}>
                      <Tooltip
                        label={t(
                          'Please specify an API key and writing model in Site Settings to use this feature.',
                        )}
                        disabled={aiWritingAvailable}
                      >
                        <div className="inline-flex items-center">
                          <Switch
                            label={
                              <span className="inline-flex items-center gap-1">
                                <IconSparkles2 size={16} />
                                {t('AI Writer')}
                              </span>
                            }
                            checked={aiWriterSidebarOpened}
                            onChange={(e) => setAiWriterSidebarOpened(e.currentTarget.checked)}
                            disabled={!aiWritingAvailable}
                            size="md"
                          />
                        </div>
                      </Tooltip>
                    </Menu.Item>
                    <Menu.Item closeMenuOnClick={false}>
                      <Tooltip
                        label={t(
                          'Please specify an API key and autocomplete model in Site Settings to use this feature.',
                        )}
                        disabled={aiAutoCompleteAvailable}
                      >
                        <div className="inline-flex items-center">
                          <Switch
                            label={
                              <span className="inline-flex items-center gap-1">
                                <IconSubtitlesAi size={16} />
                                {t('AI Autocomplete')}
                              </span>
                            }
                            checked={aiAutocompleteEnabled && aiAutoCompleteAvailable}
                            onChange={(e) => setAiAutocompleteEnabled(e.currentTarget.checked)}
                            disabled={!aiAutoCompleteAvailable}
                            size="md"
                          />
                        </div>
                      </Tooltip>
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
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
                <Button
                  className="text-[14px] font-[600]"
                  disabled={loading || isCheckingConflicts}
                  loading={loading || isCheckingConflicts}
                  variant="subtle"
                  type="submit"
                  color="green"
                >
                  <IconCheck size={16} className="mr-1" />
                  {t('Save')}
                </Button>
                <Tooltip label={t('Settings')}>
                  <Button variant="subtle" size="md" onClick={openSettingsDrawer} className="px-2">
                    <IconSettings size={20} />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 relative">
            {/* Conditional overlay during resize to prevent iframe from capturing mouse events */}
            {isResizing && (
              <div className="absolute inset-0 z-10 bg-transparent cursor-col-resize" />
            )}
            <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
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
                {previewUrl ? (
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border border-gray-300 !shadow"
                    style={{ borderRadius: '8px' }}
                    title={`Preview`}
                    sandbox="allow-same-origin allow-scripts allow-forms allow-link allow-presentation"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p>{t('No content selected')}</p>
                      <p className="text-sm mt-1">{t('Select a language tab to preview')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
        <AIWriterSidebar
          opened={aiWriterSidebarOpened}
          onClose={() => setAiWriterSidebarOpened(false)}
          activeContent={activeContent}
          updateContentField={updateContentField}
          onContentInserted={handleContentInserted}
        />
      </div>

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
            filters={
              record?.contents?.map((content) => ({
                field: 'id',
                operator: '!=',
                value: content.locale_id,
              })) || []
            }
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
      {!!activeContent && (
        <PageContentSettingDrawer
          opened={settingsDrawerOpened}
          onClose={closeSettingsDrawer}
          pageContent={activeContent}
          updateContentField={updateContentField}
          page={record}
          setPage={setRecord}
          updatePageField={(field, value) => setRecord({ ...record, [field]: value })}
          themeName={siteSettings?.selected_theme}
        />
      )}

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={isResolvingConflict}
        onClose={cancelConflictResolution}
        userRecord={{ contents: record?.contents || [] }}
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
