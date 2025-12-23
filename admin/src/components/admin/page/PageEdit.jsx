import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  faPlus,
  faTrash,
  faGear,
  faDesktop,
  faTabletAlt,
  faMobileAlt,
  faSave,
  faPenNib,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
import NavigationConfirmationState from '../../../common/stores/NavigationConfirmationState.js';
import OrganizationIdState from '../../../common/stores/OrganizationIdState.js';
import OrganizationState from '../../../common/stores/OrganizationState.js';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import RecordSelect from '../../../common/ui/RecordSelect.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import JSONPageDataEditor from './JSONPageDataEditor.jsx';
import Button from '../../../common/ui/Button.jsx';
import SlugInput from './components/SlugInput.jsx';
import HomepageSwitch from './components/HomepageSwitch.jsx';
import { HOMEPAGE_DEFAULT_SLUG } from '../../../constants/slug.js';
import PageContentSettingDrawer from './components/PageContentSettingDrawer.jsx';
import AIWriterModal from './components/AIWriterModal.jsx';
import SideBySideLanguageModal from '../../shared/SideBySideEditing/SideBySideLanguageModal.jsx';
import SideBySideEditingView from '../../shared/SideBySideEditing/SideBySideEditingView.jsx';
import { buildFullUrl } from '../../../utils/domainUtils.js';
import useBackWithRedirect from '../../../common/hooks/useBackWithRedirect.js';
import useAuthentication from '../../../common/api/useAuthentication.js';

import { mergeContentsWithServerData } from '../../../common/utils/index.js';
import useEditSession from '../../../common/hooks/useEditSession.js';
import useFetch from '../../../common/api/useFetch.js';
import ParallelEditWarning from '../../../common/ui/ParallelEditWarning.jsx';
import ConflictResolutionModal from '../../../common/ui/ConflictResolutionModal.jsx';

export default function PageEdit({ onSuccess }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { notify } = NotificationState();
  const { settings: siteSettings } = SitePublicSettingsState();
  const { organizationId } = OrganizationIdState();
  const { organizations } = OrganizationState();
  const { setShowBackButton } = ShowHeaderBackButtonState();
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
  const [aiWriterModalOpened, setAiWriterModalOpened] = useState(false);

  // Side-by-side editing state
  const [sideBySideModalOpened, setSideBySideModalOpened] = useState(false);
  const [isSideBySideMode, setIsSideBySideMode] = useState(false);
  const [selectedLanguageContents, setSelectedLanguageContents] = useState([]);

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

  // Force re-render key for JSONPageDataEditor
  const [editorRenderKey, setEditorRenderKey] = useState(0);

  // State to trigger preview updates when content changes
  const [previewTrigger, setPreviewTrigger] = useState(0);

  // State for rendered content
  const [renderedContent, setRenderedContent] = useState(null);

  // Render content API
  const { post: renderContentAPI } = useFetch('template_content/render', {
    autoFetch: false,
  });

  // Function to render wysiwyg content with Jinja2
  const renderWysiwygContent = async (contentObj, lang = null) => {
    if (!contentObj || typeof contentObj !== 'object') {
      return contentObj;
    }

    const processObject = async (obj) => {
      if (!obj || typeof obj !== 'object') {
        return obj;
      }

      const processedObj = {};

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          // Check if this is a wysiwyg field
          if (value['ds-type'] === 'wysiwyg' && value['ds-value']) {
            try {
              // Call the render API for this wysiwyg content
              const renderResponse = await renderContentAPI({
                content: value['ds-value'],
                name: `preview_${Date.now()}_${Math.random()}`,
                organization_id: organizationId,
                lang: lang,
              });

              // Update the ds-value with rendered content
              processedObj[key] = {
                ...value,
                'ds-value': renderResponse.rendered_content,
              };
            } catch (error) {
              console.error('Error rendering wysiwyg content:', error);
              // Keep original content if rendering fails
              processedObj[key] = value;
            }
          } else {
            // Recursively process nested objects
            processedObj[key] = await processObject(value);
          }
        } else {
          processedObj[key] = value;
        }
      }

      return processedObj;
    };

    return await processObject(contentObj);
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

  // Enable back button on mount and disable on unmount
  useEffect(() => {
    setShowBackButton(true);
    return () => {
      setShowBackButton(false);
      clearNavigationConfirmation();
    };
  }, [setShowBackButton, clearNavigationConfirmation]);

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

  // Generate preview URL and data for postMessage
  const previewUrl = useMemo(() => {
    if (!currentContent?.content) return null;

    const selectedLocaleCode = currentContent.locale?.iso_code;

    let baseUrl;
    if (!currentContent.slug || isCreateMode) {
      // In create mode or no slug - use dedicated preview route
      baseUrl = buildFullUrl(record, `/${selectedLocaleCode}/preview`, organizations);
    } else {
      // Build path with language prefix
      const isDefaultLanguage =
        selectedLocaleCode?.toLowerCase() ===
        siteSettings?.default_language?.iso_code?.toLowerCase();
      let path;

      if (isDefaultLanguage) {
        path = currentContent.slug;
      } else {
        const localePrefix = `/${selectedLocaleCode}`;
        const cleanSlug = currentContent.slug.startsWith('/')
          ? currentContent.slug
          : `/${currentContent.slug}`;
        path = `${localePrefix}${cleanSlug}`;
      }

      // Use the page's actual slug with correct domain
      baseUrl = buildFullUrl(record, path, organizations);
    }

    // Add preview parameters
    const url = new URL(baseUrl);
    url.searchParams.set('preview', 'true');
    if (user?.token) {
      url.searchParams.set('token', user.token);
    }
    return url.toString();
  }, [
    activeContentTab,
    currentContent,
    record,
    organizations,
    siteSettings?.default_language?.iso_code,
    isCreateMode,
    user?.token,
  ]);

  const previewData = useMemo(() => {
    if (!currentContent?.content) return null;

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
      is_frontend_page: record?.is_frontend_page || false,
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
      if (event.origin !== window.location.origin) return;

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

  // AI Writer functions
  const openAiWriterModal = () => {
    setAiWriterModalOpened(true);
  };

  const closeAiWriterModal = () => {
    setAiWriterModalOpened(false);
  };

  const handleContentInserted = () => {
    // Force re-render of JSONPageDataEditor
    setEditorRenderKey((prev) => prev + 1);
    // Trigger preview update
    setPreviewTrigger((prev) => prev + 1);
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
          onSuccess ? onSuccess(created) : navigate(`/pages/${created?.id || ''}`);
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
          navigate(`/pages/${id}`);
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

  return (!loading && record) || isCreateMode ? (
    <>
      {isSideBySideMode ? (
        <SideBySideEditingView
          selectedLanguageContents={selectedLanguageContents}
          record={record}
          setRecord={setRecord}
          onExitSideBySide={exitSideBySideMode}
          onSave={handleSubmit}
          isSaving={isSaving}
          ContentEditor={JSONPageDataEditor}
          AIWriterModalComponent={AIWriterModal}
          aiAutocompleteEnabled={aiAutocompleteEnabled}
          onAiAutocompleteChange={setAiAutocompleteEnabled}
          aiAutoCompleteAvailable={aiAutoCompleteAvailable}
          aiWritingAvailable={aiWritingAvailable}
        />
      ) : (
        <div className="h-screen w-full flex overflow-hidden">
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

            {/* Title and Controls */}
            <div className="">
              <div className="flex justify-between flex-1 flex-col">
                {activeContentTab &&
                record.contents.find((c) => String(c.id) === activeContentTab) ? (
                  <div className="space-y-2 mb-3">
                    <TextInput
                      className="flex-1 max-w-2xl"
                      placeholder={t('Title')}
                      classNames={{
                        input: 'text-3xl! font-bold! px-0! border-0! bg-transparent!',
                      }}
                      maxLength={255}
                      size="xl"
                      variant="unstyled"
                      required
                      value={activeContent?.title || ''}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        const content = record.contents.find(
                          (c) => String(c.id) === activeContentTab,
                        );
                        if (content) {
                          updateContentField(content.id, 'title', newTitle);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <h1 className="text-3xl font-bold">{t('Page')}</h1>
                )}
              </div>
            </div>

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
                            <span className="mr-1">{content.locale?.emoji_flag}</span>
                            {content.locale?.name}
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
                        <div className="flex flex-col grow gap-2"></div>
                      </div>

                      {/* Slug Input */}
                      {!record?.is_homepage && (
                        <div className="mb-4">
                          <SlugInput
                            isHomepage={!!record?.is_homepage}
                            contentId={content?._addNew ? null : content?.id}
                            localeId={content?.locale_id}
                            title={content?.title || ''}
                            value={content?.slug || ''}
                            onChange={(newSlug) => {
                              updateContentField(content.id, 'slug', newSlug);
                            }}
                          />
                        </div>
                      )}

                      {/* Dynamic JSON Content Fields */}
                      <div className="my-4">
                        {content.content &&
                        typeof content.content === 'object' &&
                        Object.keys(content.content).length > 0 ? (
                          <JSONPageDataEditor
                            key={`editor-${content.id}-${editorRenderKey}`}
                            content={content.content}
                            contentId={content.id}
                            setRecord={wrappedSetRecord}
                            autoCompleteEnabled={aiAutocompleteEnabled && aiAutoCompleteAvailable}
                          />
                        ) : (
                          <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                            <p>{t('No content fields defined yet.')}</p>
                            <p className="text-sm mt-2">
                              {t(
                                'Content fields will appear here when defined in the JSON structure.',
                              )}
                            </p>
                          </div>
                        )}
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
                    <FontAwesomeIcon icon={faDesktop} />
                  </Button>
                  <Button
                    variant={previewDevice === 'tablet' ? 'filled' : 'subtle'}
                    size="sm"
                    onClick={() => setPreviewDevice('tablet')}
                    className="px-2"
                  >
                    <FontAwesomeIcon icon={faTabletAlt} />
                  </Button>
                  <Button
                    variant={previewDevice === 'mobile' ? 'filled' : 'subtle'}
                    size="sm"
                    onClick={() => setPreviewDevice('mobile')}
                    className="px-2"
                  >
                    <FontAwesomeIcon icon={faMobileAlt} />
                  </Button>
                </div>

                {/* AI Writer, Settings, Publish Toggle, and Save - Right Side */}
                <div className="flex items-center gap-3">
                  {record?.contents?.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openSideBySideModal}
                      className="px-2"
                    >
                      {t('Edit languages side-by-side')}
                    </Button>
                  )}
                  <Tooltip
                    label={
                      'Please specify an API key and autocomplete model in Site Settings to use this feature.'
                    }
                    disabled={aiAutoCompleteAvailable}
                  >
                    <div className="inline-flex items-center">
                      <Switch
                        label={t('AI Autocomplete')}
                        checked={aiAutocompleteEnabled && aiAutoCompleteAvailable}
                        onChange={(e) => setAiAutocompleteEnabled(e.currentTarget.checked)}
                        disabled={!aiAutoCompleteAvailable}
                        size="md"
                      />
                    </div>
                  </Tooltip>
                  <Tooltip
                    label={
                      aiWritingAvailable
                        ? t('AI Writer')
                        : t(
                            'Please specify an API key and writing model in Site Settings to use this feature.',
                          )
                    }
                  >
                    <div>
                      <Button
                        variant="filled"
                        size="sm"
                        onClick={openAiWriterModal}
                        className="px-2"
                        disabled={!aiWritingAvailable}
                      >
                        <FontAwesomeIcon icon={faPenNib} className="mr-2" />
                        {t('AI Writer')}
                      </Button>
                    </div>
                  </Tooltip>
                  {!record?.is_frontend_page && (
                    <Tooltip label={t('Settings')}>
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={openSettingsDrawer}
                        className="px-2"
                      >
                        <FontAwesomeIcon icon={faGear} />
                      </Button>
                    </Tooltip>
                  )}
                  <HomepageSwitch page={record} setPage={setRecord} />
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
                    type="submit"
                    variant="filled"
                    size="sm"
                    loading={loading || isCheckingConflicts}
                  >
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {t('Save')}
                  </Button>
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
        </div>
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

      {/* AI Writer Modal */}
      <AIWriterModal
        opened={aiWriterModalOpened}
        onClose={closeAiWriterModal}
        activeContent={activeContent}
        updateContentField={updateContentField}
        onContentInserted={handleContentInserted}
      />

      {/* Settings Drawer */}
      {!!activeContent && (
        <PageContentSettingDrawer
          opened={settingsDrawerOpened}
          onClose={closeSettingsDrawer}
          pageContent={activeContent}
          updateContentField={updateContentField}
          page={record}
          updatePageField={(field, value) => setRecord({ ...record, [field]: value })}
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
