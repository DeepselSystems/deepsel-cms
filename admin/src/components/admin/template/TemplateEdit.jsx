import {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {
  faPlus,
  faTrash,
  faDesktop,
  faTabletAlt,
  faMobileAlt,
  faSave,
  faCode,
  faCog,
  faQuestion,
} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {LoadingOverlay, Modal, Tabs, Tooltip, Menu} from '@mantine/core';
import {modals} from '@mantine/modals';
import {useTranslation} from 'react-i18next';
import {useNavigate, useParams} from 'react-router-dom';
import useModel from '../../../common/api/useModel.jsx';
import useMultiLangTemplateContent from '../../../common/hooks/useMultiLangTemplateContent.js';
import useResizablePanel from '../../../common/hooks/useResizablePanel.js';
import useSidebar from '../../../common/hooks/useSidebar.js';
import NotificationState from '../../../common/stores/NotificationState.js';
import ShowHeaderBackButtonState from '../../../common/stores/ShowHeaderBackButtonState.js';
import NavigationConfirmationState from '../../../common/stores/NavigationConfirmationState.js';
import OrganizationIdState from '../../../common/stores/OrganizationIdState.js';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import RecordSelect from '../../../common/ui/RecordSelect.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import Button from '../../../common/ui/Button.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import Editor from 'react-simple-code-editor';
import {highlight, languages} from 'prismjs/components/prism-core';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/themes/prism.css';
import {Preferences} from '@capacitor/preferences';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';

export default function TemplateEdit({onSuccess}) {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const {id} = useParams();
  const {notify} = NotificationState();
  const {organizationId} = OrganizationIdState();
  const {settings: siteSettings} = SitePublicSettingsState();
  const {backendHost} = BackendHostURLState();
  const {setShowBackButton} = ShowHeaderBackButtonState();
  const {setNavigationConfirmation, clearNavigationConfirmation} =
    NavigationConfirmationState();
  const {isCollapsed, temporaryCollapse, clearTemporaryOverride} = useSidebar();

  // Determine if this is create mode (no id) or edit mode (has id)
  const isCreateMode = !id;

  // Initialize record for create mode, if there is no id
  const [createRecord, setCreateRecord] = useState({
    name: '',
    contents: [],
    is_404: false,
    is_login: false,
  });

  // Single useModel query for both modes
  const query = useModel('template', {id, autoFetch: !!id});

  // Use create record for create mode, query record for edit mode
  const record = isCreateMode ? createRecord : query.record;
  const setRecord = isCreateMode ? setCreateRecord : query.setRecord;
  const {update, create, loading} = query;

  const {data: locales} = useModel('locale', {
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

    // Content manipulation functions
    updateContentField,
    handleAddContent,
    handleDeleteContent,
    handleAddContentSubmit,

    // Submission helpers
    processContentsForSubmit,
  } = useMultiLangTemplateContent({
    initialRecord: record,
    setRecord,
    locales,
  });

  /**
   * Active content, that based on active tab
   * @type {TemplateContent}
   */
  const activeContent = useMemo(
    () => record?.contents?.find((c) => String(c.id) === activeContentTab),
    [activeContentTab, record?.contents]
  );

  const {width, handleMouseDown, isResizing} = useResizablePanel({
    initialWidth: 700,
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
  const [renderedContent, setRenderedContent] = useState('');
  const [renderingError, setRenderingError] = useState(null);

  // Modal states for template helpers
  const [templatesModalOpened, setTemplatesModalOpened] = useState(false);
  const [variablesModalOpened, setVariablesModalOpened] = useState(false);

  // Query for other templates
  const templatesQuery = useModel('template', {
    autoFetch: false,
    pageSize: 100,
    filters: organizationId
      ? [
          {
            field: 'organization_id',
            operator: '=',
            value: organizationId,
          },
        ]
      : [],
  });

  // Function to confirm navigation with unsaved changes
  const confirmNavigation = useCallback(
    (callback) => {
      if (hasUnsavedChanges && !isSaving) {
        modals.openConfirmModal({
          title: (
            <div className="text-lg font-semibold">{t('Unsaved Changes')}</div>
          ),
          children: t(
            'You have unsaved changes. Are you sure you want to leave without saving?'
          ),
          labels: {confirm: t('Leave'), cancel: t('Stay')},
          onConfirm: callback,
        });
      } else {
        callback();
      }
    },
    [hasUnsavedChanges, isSaving, t]
  );

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
  }, [
    hasUnsavedChanges,
    isSaving,
    setNavigationConfirmation,
    clearNavigationConfirmation,
    confirmNavigation,
  ]);

  const currentContent = useMemo(() => {
    return record?.contents?.find((c) => String(c.id) === activeContentTab);
  }, [record, activeContentTab]);

  const hasTemplateName = Boolean(record?.name?.trim());
  const templateNameDescription = t(
    'Must start with a capital letter and contain only letters, numbers, and underscores'
  );
  const templateNamePlaceholder = t('Enter Template Name *');

  // Generate preview URL for templates (simple URL without parameters)
  const previewUrl = useMemo(() => {
    if (!currentContent?.content) return null;
    // Use dedicated template preview route directly on frontend
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';

    // Get language code from current content's locale
    const langCode = currentContent.locale?.iso_code || 'en';

    return `${protocol}//${hostname}${port}/${langCode}/previewTemplate`;
  }, [currentContent]);

  // Generate preview data to send via postMessage
  const previewData = useMemo(() => {
    if (!currentContent?.content) return null;
    const trimmedName = record?.name?.trim() || '';

    const previewName = trimmedName || `preview_${record?.id || 'temp'}`;
    const previewContent = renderedContent || currentContent.content;

    return {
      id: record?.id || 'new',
      name: previewName || 'Untitled Template',
      content: previewContent,
      rendered_content: renderedContent,
      contentName: currentContent.name,
      locale: currentContent.locale,
      isPreview: true,
      type: 'template',
      renderingError: renderingError,
    };
  }, [
    currentContent,
    record?.id,
    record?.name,
    renderedContent,
    renderingError,
  ]);

  // Listen for iframe ready signal
  useEffect(() => {
    const handleMessage = (event) => {
      // console.log('TemplateEdit: received message from iframe:', event.data);
      // Allow messages from iframe (might be different origin)
      // if (event.origin !== window.location.origin) return;

      if (event.data && event.data.type === 'IFRAME_READY') {
        // console.log('TemplateEdit: iframe is ready!');
        setIsIframeReady(true);

        // Send queued data if available
        if (queuedPreviewDataRef.current && iframeRef.current) {
          try {
            iframeRef.current.contentWindow.postMessage(
              {
                type: 'TEMPLATE_PREVIEW_DATA',
                data: queuedPreviewDataRef.current,
              },
              '*'
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

  // Send preview data to iframe via postMessage
  useEffect(() => {
    if (previewData && iframeRef.current && previewUrl) {
      // console.log('TemplateEdit: Sending preview data:', previewData);
      const sendMessage = () => {
        try {
          // console.log('TemplateEdit: Sending postMessage to iframe');
          iframeRef.current.contentWindow.postMessage(
            {
              type: 'TEMPLATE_PREVIEW_DATA',
              data: previewData,
            },
            '*'
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
          // Iframe not ready yet, queue the data
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

  // Helper functions for modals
  const openTemplatesModal = () => {
    console.log('Opening templates modal, fetching data...');
    templatesQuery.get().then(() => {
      console.log('Templates loaded:', templatesQuery.data);
    });
    setTemplatesModalOpened(true);
  };

  const openVariablesModal = () => {
    setVariablesModalOpened(true);
  };

  const insertTemplateInclude = (template) => {
    if (activeContent) {
      // Get the content that matches the current locale
      const currentLocaleId = activeContent.locale_id;
      const matchingContent = template.contents?.find(
        (content) => content.locale_id === currentLocaleId
      );
      const templateName = template.name;
      const includeText = `{% include '${templateName}' %}`;
      const currentContent = activeContent.content || '';
      const newContent = currentContent + '\n' + includeText;
      updateContentField(activeContent.id, 'content', newContent);
    }
    setTemplatesModalOpened(false);
  };

  const insertTemplateExtends = (template) => {
    if (activeContent) {
      // Get the content that matches the current locale
      const currentLocaleId = activeContent.locale_id;
      const matchingContent = template.contents?.find(
        (content) => content.locale_id === currentLocaleId
      );
      const templateName = template.name;
      const extendsText = `{% extends '${templateName}' %}`;
      const currentContent = activeContent.content || '';
      // Extends should be at the top, so prepend it
      const newContent = extendsText + '\n' + currentContent;
      updateContentField(activeContent.id, 'content', newContent);
    }
    setTemplatesModalOpened(false);
  };

  const insertVariable = (varPath) => {
    if (activeContent) {
      const variableText = `{{ ${varPath} }}`;
      const currentContent = activeContent.content || '';
      const newContent = currentContent + variableText;
      updateContentField(activeContent.id, 'content', newContent);
    }
    setVariablesModalOpened(false);
  };

  // Get public settings variables for the modal
  const publicSettingsVariables = useMemo(() => {
    if (!siteSettings) return [];

    const variables = [];

    // Basic organization info
    variables.push({name: 'Organization ID', path: 'settings.id'});
    variables.push({name: 'Organization Name', path: 'settings.name'});

    // Language settings
    if (siteSettings.default_language) {
      variables.push({
        name: 'Default Language Name',
        path: 'settings.default_language.name',
      });
      variables.push({
        name: 'Default Language Code',
        path: 'settings.default_language.iso_code',
      });
      variables.push({
        name: 'Default Language Flag',
        path: 'settings.default_language.emoji_flag',
      });
    }

    // Domain settings
    if (siteSettings.domains) {
      variables.push({name: 'Domains', path: 'settings.domains'});
    }

    // Feature flags
    variables.push({
      name: 'Show Post Author',
      path: 'settings.show_post_author',
    });
    variables.push({name: 'Show Post Date', path: 'settings.show_post_date'});
    variables.push({name: 'Show Chatbox', path: 'settings.show_chatbox'});
    variables.push({
      name: 'Auto Translate Pages',
      path: 'settings.auto_translate_pages',
    });
    variables.push({
      name: 'Auto Translate Posts',
      path: 'settings.auto_translate_posts',
    });
    variables.push({
      name: 'Auto Translate Components',
      path: 'settings.auto_translate_components',
    });

    // API keys availability
    variables.push({
      name: 'Has OpenAI API Key',
      path: 'settings.has_openai_api_key',
    });
    variables.push({
      name: 'Has OpenRouter API Key',
      path: 'settings.has_openrouter_api_key',
    });

    // Custom code
    if (siteSettings.website_custom_code) {
      variables.push({
        name: 'Website Custom Code',
        path: 'settings.website_custom_code',
      });
    }

    // Menus
    if (siteSettings.menus?.main) {
      variables.push({name: 'Main Menu', path: 'settings.menus.main'});
    }

    return variables;
  }, [siteSettings]);

  // Function to render template content
  const renderTemplateContent = useCallback(
    async (content, name, lang = null) => {
      if (!content || !name || !organizationId) return '';

      try {
        setRenderingError(null);
        const tokenResult = await Preferences.get({key: 'token'});
        const headers = {'Content-Type': 'application/json'};
        if (tokenResult?.value) {
          headers.Authorization = `Bearer ${tokenResult.value}`;
        }

        const response = await fetch(`${backendHost}/template_content/render`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content,
            name: name,
            organization_id: organizationId,
            lang: lang,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to render template');
        }

        const data = await response.json();
        return data.rendered_content;
      } catch (error) {
        console.error('Template rendering error:', error);
        setRenderingError(error.message);
        return content; // Return original content as fallback
      }
    },
    [backendHost, organizationId]
  );

  // Render content whenever it changes
  useEffect(() => {
    if (!activeContent?.content) {
      setRenderingError(null);
      setRenderedContent('');
      return;
    }

    const trimmedName = record?.name?.trim() || '';
    const previewName = trimmedName || `preview_${record?.id || 'temp'}`;
    const lang = activeContent.locale?.iso_code || null;
    renderTemplateContent(
      activeContent.content,
      previewName,
      lang
    ).then((rendered) => {
      setRenderedContent(rendered);
    });
  }, [
    activeContent?.content,
    activeContent?.locale?.iso_code,
    record?.id,
    record?.name,
    renderTemplateContent,
  ]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        // Validate that template has a name
        if (!record.name || record.name.trim() === '') {
          notify({
            message: t('Please enter a template name'),
            type: 'error',
          });
          setIsSaving(false);
          return;
        }

        // Validate template name format
        if (!/^[A-Z][a-zA-Z0-9_]*$/.test(record.name)) {
          notify({
            message: t(
              'Template name must start with a capital letter and contain only letters, numbers, and underscores'
            ),
            type: 'error',
          });
          setIsSaving(false);
          return;
        }

        // Process contents for submission (remove client-side fields)
        const processedContents = processContentsForSubmit(record.contents);

        const updatedRecord = {
          ...record,
          contents: processedContents,
        };

        if (isCreateMode) {
          // Add organization_id for new templates
          const recordWithOrganization = {
            ...updatedRecord,
            organization_id: organizationId,
          };
          const created = await create(recordWithOrganization);
          resetUnsavedChanges();
          notify({
            message: t('Template created successfully!'),
            type: 'success',
          });
          onSuccess ? onSuccess(created) : navigate(-1);
        } else {
          await update(updatedRecord);
          resetUnsavedChanges();

          notify({
            message: t('Template updated successfully!'),
            type: 'success',
          });
          // navigate(-1);
        }
      } catch (error) {
        console.error(error);
        notify({message: error.message, type: 'error'});
      } finally {
        setIsSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      record,
      processContentsForSubmit,
      isCreateMode,
      create,
      update,
      resetUnsavedChanges,
      notify,
      t,
      onSuccess,
      navigate,
      id,
      organizationId,
    ]
  );

  return (!loading && record) || isCreateMode ? (
    <>
      <div className="h-screen w-full flex overflow-hidden">
        {/* Form Section - Left Side */}
        <form
          className="overflow-y-auto px-2 pb-2"
          style={{width: `${width}px`, flexShrink: 0}}
          onSubmit={handleSubmit}
        >
          {/* Title and Controls */}
          <div className="">
            <div className="flex justify-between flex-1 flex-col">
              <div className="space-y-2 mb-3">
                <TextInput
                  className="flex-1 max-w-2xl"
                  placeholder={templateNamePlaceholder}
                  maxLength={255}
                  size="lg"
                  label={t('Template Name')}
                  description={templateNameDescription}
                  required
                  value={record?.name || ''}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setRecord((prev) => ({
                      ...prev,
                      name: newName,
                    }));
                  }}
                  error={
                    record?.name && !/^[A-Z][a-zA-Z0-9_]*$/.test(record.name)
                      ? t(
                          'Template name must start with a capital letter and contain only letters, numbers, and underscores'
                        )
                      : null
                  }
                />
              </div>
            </div>
          </div>

          {/* Content Editing Section */}
          <div>
            <LoadingOverlay
              visible={loading}
              zIndex={1000}
              overlayProps={{radius: 'sm', blur: 2}}
              loaderProps={{type: 'bars'}}
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
                        <Tabs.Tab
                          value={String(content.id)}
                          className="mr-1 mb-1"
                        >
                          <span className="mr-1">
                            {content.locale?.emoji_flag}
                          </span>
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
                    <div className="my-4 space-y-3">
                      <div className="flex gap-4 flex-wrap">
                        <Switch
                          label={t('404 Page')}
                          description={t('Mark this template as the site 404')}
                          checked={Boolean(record?.is_404)}
                          onChange={({currentTarget}) => {
                            const isChecked = currentTarget.checked;
                            setRecord((prev) => {
                              const next = {...(prev || {})};
                              next.is_404 = isChecked;
                              if (isChecked) {
                                next.is_login = false;
                              }
                              return next;
                            });
                          }}
                        />
                        <Switch
                          label={t('Login Page')}
                          description={t(
                            'Mark this template as the login page'
                          )}
                          checked={Boolean(record?.is_login)}
                          onChange={({currentTarget}) => {
                            const isChecked = currentTarget.checked;
                            setRecord((prev) => {
                              const next = {...(prev || {})};
                              next.is_login = isChecked;
                              if (isChecked) {
                                next.is_404 = false;
                              }
                              return next;
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          {t('Template Content')}{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={openTemplatesModal}
                            className="text-xs"
                          >
                            <FontAwesomeIcon icon={faCode} className="mr-1" />
                            {t('Use Templates')}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={openVariablesModal}
                            className="text-xs"
                          >
                            <FontAwesomeIcon icon={faCog} className="mr-1" />
                            {t('Use Variables')}
                          </Button>
                          <Tooltip
                            label={t(
                              'Learn more about Jinja templating syntax'
                            )}
                          >
                            <Button
                              size="xs"
                              variant="light"
                              component="a"
                              href="https://jinja.palletsprojects.com/en/3.1.x/templates/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs"
                            >
                              <FontAwesomeIcon icon={faQuestion} />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>

                      <div className="border border-gray-300 rounded-md overflow-hidden">
                        <Editor
                          className="w-full min-h-[400px]"
                          value={content.content || ''}
                          onValueChange={(code) =>
                            updateContentField(content.id, 'content', code)
                          }
                          highlight={(code) => {
                            // Use HTML/markup highlighting for templates
                            return highlight(
                              code,
                              languages.markup,
                              'markup'
                            );
                          }}
                          padding={12}
                          style={{
                            fontSize: 14,
                            backgroundColor: '#f8f9fa',
                            fontFamily:
                              '"Fira code", "Fira Mono", "Consolas", monospace',
                            lineHeight: '1.5',
                          }}
                          placeholder={t(
                            'Enter your Jinja2 template content here...\n\nExample:\n<h1>{{ title }}</h1>\n{% for item in items %}\n  <p>{{ item.name }}</p>\n{% endfor %}'
                          )}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {t(
                          'Use Jinja2 syntax for dynamic content. Variables and template tags will be highlighted.'
                        )}
                      </p>
                    </div>
                  </Tabs.Panel>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {t('Nothing here yet.')}
                </div>
              )}
            </Tabs>
          </div>
        </form>

        {/* Resize Handle */}
        <div
          className="hover:bg-blue-200 cursor-col-resize transition-colors"
          onMouseDown={handleMouseDown}
          style={{cursor: 'col-resize', flexShrink: 0, width: '4px'}}
          title="Drag to resize"
        />

        {/* Preview Panel - Right Side */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 relative flex flex-col"
          style={{minWidth: 0}}
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
                <Button
                  type="submit"
                  variant="filled"
                  size="sm"
                  loading={loading}
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
                    src={previewUrl}
                    className="w-full h-full !rounded-lg border border-gray-300 !shadow"
                    style={{
                      borderRadius: '8px',
                    }}
                    title={`Preview`}
                    sandbox="allow-same-origin allow-scripts allow-forms"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p>{t('No content selected')}</p>
                      <p className="text-sm mt-1">
                        {t('Select a language tab to preview')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Add Language Modal */}
      <Modal
        opened={addContentModalOpened}
        onClose={closeAddContentModal}
        title={<div className="font-bold">{t('Add Content')}</div>}
        size="md"
        radius={0}
        transitionProps={{transition: 'fade', duration: 200}}
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
            <Button
              variant="outline"
              onClick={closeAddContentModal}
              className="mr-2"
            >
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

      {/* Templates Modal */}
      <Modal
        opened={templatesModalOpened}
        onClose={() => setTemplatesModalOpened(false)}
        title={<div className="font-bold">{t('Available Templates')}</div>}
        size="lg"
        radius={0}
        transitionProps={{transition: 'fade', duration: 200}}
      >
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            {t('Choose how to use each template:')}
          </p>
          <div className="text-xs text-gray-500 mb-4 space-y-1">
            <div>
              <strong>{t('Include')}:</strong>{' '}
              {t('Embeds template content at current position')}
            </div>
            <div>
              <strong>{t('Extends')}:</strong>{' '}
              {t('Uses template as base layout (added at top)')}
            </div>
          </div>

          {templatesQuery.loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">{t('Loading templates...')}</div>
            </div>
          ) : templatesQuery.data?.length > 0 ? (
            (() => {
              // Get current locale from active content
              const currentLocaleId = activeContent?.locale_id;

              // Filter templates to exclude current one AND only show templates with content in the same locale
              const filteredTemplates = templatesQuery.data.filter(
                (template) => {
                  // Exclude current template
                  if (template.id === record?.id) return false;

                  // Only show templates that have content in the current locale
                  return template.contents?.some(
                    (content) => content.locale_id === currentLocaleId
                  );
                }
              );

              return filteredTemplates.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredTemplates.map((template) => {
                    // Get the content that matches the current locale
                    const matchingContent = template.contents?.find(
                      (content) => content.locale_id === currentLocaleId
                    );
                    const displayName =
                      matchingContent?.name || template.name || 'Untitled';
                    const templateName =
                      matchingContent?.name || template.name || '';

                    return (
                      <div
                        key={template.id}
                        className="p-3 border border-gray-200 rounded-md"
                      >
                        <div className="font-medium">{displayName}</div>
                        <div className="text-sm text-gray-500 font-mono mb-2">
                          {templateName}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => insertTemplateInclude(template)}
                            className="flex-1 px-3 py-2 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                          >
                            <div className="font-medium">{t('Include')}</div>
                            <div className="text-xs opacity-75">
                              {"{% include '" + templateName + "' %}"}
                            </div>
                          </button>
                          <button
                            onClick={() => insertTemplateExtends(template)}
                            className="flex-1 px-3 py-2 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors"
                          >
                            <div className="font-medium">{t('Extends')}</div>
                            <div className="text-xs opacity-75">
                              {"{% extends '" + templateName + "' %}"}
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">
                    {t('No other templates available')}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500">{t('No templates found')}</div>
            </div>
          )}
        </div>
      </Modal>

      {/* Variables Modal */}
      <Modal
        opened={variablesModalOpened}
        onClose={() => setVariablesModalOpened(false)}
        title={<div className="font-bold">{t('Available Variables')}</div>}
        size="lg"
        radius={0}
        transitionProps={{transition: 'fade', duration: 200}}
      >
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            {t('Click on a variable to insert it into your template.')}
          </p>

          {publicSettingsVariables.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {publicSettingsVariables.map((variable, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => insertVariable(variable.path)}
                >
                  <div className="font-medium">{variable.name}</div>
                  <div className="text-sm text-gray-500 font-mono">
                    {variable.path}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {t('Click to insert')}:{' '}
                    <code>{'{{ ' + variable.path + ' }}'}</code>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500">{t('No variables available')}</div>
            </div>
          )}
        </div>
      </Modal>
    </>
  ) : (
    <FormViewSkeleton />
  );
}
