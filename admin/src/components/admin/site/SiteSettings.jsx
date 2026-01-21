import { useTranslation } from 'react-i18next';
import Card from '../../../common/ui/Card.jsx';
import H1 from '../../../common/ui/H1.jsx';
import H2 from '../../../common/ui/H2.jsx';
import useModel from '../../../common/api/useModel.jsx';
import useAuthentication from '../../../common/api/useAuthentication.js';
import NotificationState from '../../../common/stores/NotificationState.js';
import { useNavigate } from 'react-router-dom';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import EditFormActionBar from '../../../common/ui/EditFormActionBar.jsx';
import { useState, useEffect } from 'react';
import { LoadingOverlay, Select, MultiSelect, Text, TagsInput } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLanguage,
  faRobot,
  faKey,
  faNewspaper,
  faGlobe,
  faCode,
  faDatabase,
  faDownload,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import { Button, Modal, FileInput, Group, Alert } from '@mantine/core';
import Switch from '../../../common/ui/Switch.jsx';
import RecordSelect from '../../../common/ui/RecordSelect.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import NumberInput from '../../../common/ui/NumberInput.jsx';
import OrganizationIdState from '../../../common/stores/OrganizationIdState.js';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';
import SecretInput from '../../../common/ui/SecretInput.jsx';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-jsx';
import 'prismjs/themes/prism.css';

export default function SiteSettings() {
  const { t } = useTranslation();
  const { user } = useAuthentication();
  const { organizationId } = OrganizationIdState();
  const { backendHost } = BackendHostURLState();
  const query = useModel('organization', {
    id: organizationId, // Use the selected organization ID without fallback
    autoFetch: !!organizationId, // Only auto-fetch if organizationId exists
  });
  const { record, setRecord, update, loading: orgLoading } = query;
  const { notify } = NotificationState((state) => state);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Backup & Restore state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async () => {
    try {
      if (!organizationId) {
        notify({
          message: t('No organization selected'),
          type: 'error',
        });
        return;
      }

      setExportLoading(true);

      notify({
        message: t('Starting backup download...'),
        type: 'info',
      });

      // Trigger download
      // We use window.open or a hidden link to trigger download
      // But we need to pass auth headers if it's protected.
      // Since it's an API call, we might need to use fetch/blob.

      const response = await fetch(
        `${backendHost}/util/backup/export?organization_id=${organizationId}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify({
        message: t('Backup downloaded successfully!'),
        type: 'success',
      });
    } catch (error) {
      console.error(error);
      notify({
        message: t('Failed to download backup'),
        type: 'error',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    if (!organizationId) {
      notify({
        message: t('No organization selected'),
        type: 'error',
      });
      return;
    }

    try {
      setImportLoading(true);
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('organization_id', organizationId);

      const response = await fetch(`${backendHost}/util/backup/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Import failed');
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        notify({
          message: 'Import incompleted with some errors.',
          type: 'warning',
          autoClose: 10000,
        });
      } else {
        notify({
          message: t('Backup restored successfully!'),
          type: 'success',
        });
        // Reload to show changes
        // setTimeout(() => window.location.reload(), 1000);
      }

      setImportModalOpen(false);
      setImportFile(null);
    } catch (error) {
      console.error(error);
      notify({
        message: 'Failed to import backup',
        type: 'error',
      });
    } finally {
      setImportLoading(false);
    }
  };

  // Secret keys editing state values
  const [openrouterApiKeyEditing, setOpenrouterApiKeyEditing] = useState('');

  // Fetch locales
  const { data: locales, loading: localesLoading } = useModel('locale', {
    autoFetch: true,
    pageSize: null, // Get all locales
  });

  // Format locales for Select and MultiSelect components
  const [localeOptions, setLocaleOptions] = useState([]);

  // Fetch openrouter models for default values
  const { data: openRouterModels } = useModel('openrouter_model', {
    autoFetch: true,
    pageSize: 1000,
  });

  useEffect(() => {
    if (locales) {
      const options = locales.map((locale) => ({
        value: locale.id.toString(),
        label: `${locale.emoji_flag} ${locale.name}`,
        emoji_flag: locale.emoji_flag,
      }));
      setLocaleOptions(options);
    }
  }, [locales]);

  // Set default values for AI models when record is first loaded
  useEffect(() => {
    if (!openRouterModels || !record) return;

    const translationModel = openRouterModels.find(
      (model) => model.string_id === 'google/gemini-flash-1.5-8b',
    );
    const writingModel = openRouterModels.find((model) => model.string_id === 'openai/gpt-5');
    const autocompleteModel = openRouterModels.find((model) => model.string_id === 'openai/gpt-4');

    let shouldUpdate = false;
    const updates = {};

    if (!record.ai_translation_model_id && translationModel) {
      updates.ai_translation_model_id = translationModel.id;
      shouldUpdate = true;
    }

    // if (!record.ai_default_writing_model_id && writingModel) {
    //   updates.ai_default_writing_model_id = writingModel.id;
    //   shouldUpdate = true;
    // }

    // if (!record.ai_autocomplete_model_id && autocompleteModel) {
    //   updates.ai_autocomplete_model_id = autocompleteModel.id;
    //   shouldUpdate = true;
    // }

    if (shouldUpdate) {
      setRecord((prev) => ({
        ...prev,
        ...updates,
      }));
    }
  }, [record?.id, openRouterModels]);

  // Handle available languages change
  const handleAvailableLanguagesChange = (selectedValues) => {
    // Find the corresponding locale objects for the selected values
    const selectedLanguages = selectedValues
      .map((id) => {
        const localeId = parseInt(id);
        const locale = locales.find((l) => l.id === localeId);
        return locale
          ? {
              id: locale.id,
              name: locale.name,
              iso_code: locale.iso_code,
              emoji_flag: locale.emoji_flag,
            }
          : null;
      })
      .filter(Boolean); // Remove any null values

    setRecord({
      ...record,
      available_languages: selectedLanguages,
    });
  };

  // Handle default language change
  const handleDefaultLanguageChange = (value) => {
    setRecord({
      ...record,
      default_language_id: value ? parseInt(value) : null,
    });
  };

  // Handle domains change
  const handleDomainsChange = (domains) => {
    const newDomains = domains.length > 0 ? domains : [];
    setRecord({
      ...record,
      domains: newDomains,
    });
  };

  async function handleSubmit(e) {
    try {
      e.preventDefault();
      setLoading(true);

      // Make sure default language is included in available languages
      if (
        record.default_language_id &&
        record.available_languages &&
        !record.available_languages.some((lang) => lang.id === record.default_language_id)
      ) {
        // Find the locale object for the default language
        const defaultLocale = locales.find((l) => l.id === record.default_language_id);
        if (defaultLocale) {
          const defaultLangObject = {
            id: defaultLocale.id,
            name: defaultLocale.name,
            iso_code: defaultLocale.iso_code,
          };
          const updatedAvailableLanguages = [...record.available_languages, defaultLangObject];

          await update({
            ...record,
            available_languages: updatedAvailableLanguages,
            openrouter_api_key: openrouterApiKeyEditing,
          });
        } else {
          await update({
            ...record,
            openrouter_api_key: openrouterApiKeyEditing,
          });
        }
      } else {
        await update({
          ...record,
          openrouter_api_key: openrouterApiKeyEditing,
        });
      }

      // Reload page
      window.location.reload();

      notify({
        message: t('Site Settings updated successfully!'),
        type: 'success',
      });
      navigate('/site-settings');
    } catch (error) {
      console.error(error);
      notify({
        message: error.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  // Show message if no organization is selected
  if (!organizationId) {
    return (
      <div className={`max-w-screen-xl m-auto my-[20px] px-[24px]`}>
        <Card className={`shadow-none border-none text-center p-8`}>
          <H1>{t('Site Settings')}</H1>
          <div className="mt-4 text-gray-500">
            {t('Please select a website from the dropdown above to manage its settings.')}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <form className={`max-w-screen-xl m-auto my-[20px] px-[24px]`} onSubmit={handleSubmit}>
      <EditFormActionBar loading={loading || orgLoading || localesLoading} />

      {record ? (
        <Card className={`shadow-none border-none`}>
          <H1>{t('Site Settings')}</H1>

          <div className={`mt-6 flex flex-col gap-4`}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faGlobe} className="text-gray-600" />
              <H2>{t('Basic Information')}</H2>
            </div>

            <TextInput
              label={t('Website Name')}
              description={t('The name of your website')}
              placeholder={t('Enter website name')}
              value={record.name || ''}
              onChange={(e) =>
                setRecord({
                  ...record,
                  name: e.target.value,
                })
              }
              required
              className="mb-4"
            />

            <TagsInput
              label={t('Domains')}
              description={t(
                'Enter the domains for this website (e.g., example.com, subdomain.example.com). Use * for wildcard (catch-all). Press Enter to add each domain.',
              )}
              placeholder={t('Enter domain and press Enter')}
              value={record.domains || ['*']}
              onChange={handleDomainsChange}
              className="mb-4"
              required
              clearable
              splitChars={[',', ' ']}
              maxDropdownHeight={200}
              size="md"
              radius="md"
            />
          </div>

          <div className={`mt-8 flex flex-col gap-4`}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faLanguage} className="text-gray-600" />
              <H2 className={``}>{t('Languages')}</H2>
            </div>

            <div className="relative">
              <LoadingOverlay visible={localesLoading} />

              <MultiSelect
                label={t('Available Languages')}
                description={t('Select languages that will be available on your site')}
                placeholder={t('Select languages')}
                data={localeOptions}
                value={record?.available_languages?.map((lang) => lang.id.toString()) || []}
                onChange={handleAvailableLanguagesChange}
                className="mb-4"
                required
                searchable
                clearable
                size="md"
                radius="md"
              />

              <Select
                label={t('Default Language')}
                description={t('The default language for your site')}
                placeholder={t('Select default language')}
                data={localeOptions}
                value={record?.default_language_id?.toString() || ''}
                onChange={handleDefaultLanguageChange}
                className="mb-4"
                required
                searchable
                clearable
                size="md"
                radius="md"
              />
            </div>
          </div>

          <div className={`mt-8 flex flex-col gap-4`}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faRobot} className="text-gray-600" />
              <H2>{t('AI Writing')}</H2>
            </div>

            <Text c="dimmed" size="sm" className="mb-2">
              {t(
                'Configure AI-powered content generation and translation features. Requires an OpenRouter API key to function.',
              )}
            </Text>

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Switch
                  label={t('Auto-translate Pages')}
                  description={t('Automatically translate page content when adding new languages')}
                  checked={record.auto_translate_pages || false}
                  onChange={(event) =>
                    setRecord({
                      ...record,
                      auto_translate_pages: event.currentTarget.checked,
                    })
                  }
                  className="mb-4"
                />

                <Switch
                  label={t('Auto-translate Blog Posts')}
                  description={t(
                    'Automatically translate blog post content when adding new languages',
                  )}
                  checked={record.auto_translate_posts || false}
                  onChange={(event) =>
                    setRecord({
                      ...record,
                      auto_translate_posts: event.currentTarget.checked,
                    })
                  }
                  className="mb-4"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faKey} className="text-gray-500" size="sm" />
                  <Text size="sm" weight={500}>
                    {t('API Keys')}
                  </Text>
                </div>

                <SecretInput
                  label={t('OpenRouter API Key')}
                  description={t(
                    'API key for AI-powered translation and content generation features',
                  )}
                  truncateSecret={record.openrouter_api_key_truncated}
                  editingValue={openrouterApiKeyEditing}
                  setEditingValue={(value) => setOpenrouterApiKeyEditing(value)}
                />

                <RecordSelect
                  model="openrouter_model"
                  displayField="string_id"
                  pageSize={1000}
                  searchFields={['string_id', 'name']}
                  label={t('Translation model')}
                  description={t('AI model used for translating content between languages')}
                  placeholder={t('Select an AI model')}
                  value={record?.ai_translation_model_id}
                  onChange={(value) =>
                    setRecord({
                      ...record,
                      ai_translation_model_id: value,
                    })
                  }
                  className="my-4"
                />

                <RecordSelect
                  model="openrouter_model"
                  displayField="string_id"
                  className="my-2"
                  pageSize={1000}
                  searchFields={['string_id', 'name']}
                  label={t('Default writing model')}
                  description={t('Default AI model for generating new content')}
                  placeholder={t('Select an AI model')}
                  value={record?.ai_default_writing_model_id}
                  onChange={(value) =>
                    setRecord({
                      ...record,
                      ai_default_writing_model_id: value,
                    })
                  }
                />

                <RecordSelect
                  model="openrouter_model"
                  displayField="string_id"
                  className="my-2"
                  pageSize={1000}
                  searchFields={['string_id', 'name']}
                  label={t('Autocomplete model')}
                  description={t('AI model used for text autocomplete and suggestions')}
                  placeholder={t('Select an AI model')}
                  value={record?.ai_autocomplete_model_id}
                  onChange={(value) =>
                    setRecord({
                      ...record,
                      ai_autocomplete_model_id: value,
                    })
                  }
                />

                {/* <PasswordInput
                  label={t('OpenAI API Key')}
                  description={t('Fallback for translations (GPT-4o-mini)')}
                  placeholder={t('Enter OpenAI API key')}
                  value={record.openai_api_key || ''}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      openai_api_key: e.target.value,
                    })
                  }
                  className="mb-4"
                /> */}
              </div>
            </div>
          </div>

          <div className={`mt-8 flex flex-col gap-4`}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faRobot} className="text-gray-600" />
              <H2>{t('Website AI Assistant')}</H2>
            </div>

            <Text c="dimmed" size="sm" className="ml-1">
              {t(
                'Enable the website AI assistant in a popup chat box to help users with their queries and provide support.',
              )}
            </Text>

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Switch
                  label={t('Enabled')}
                  description={t('Show AI assistant chat widget on website pages')}
                  checked={record.show_chatbox || false}
                  onChange={(event) =>
                    setRecord({
                      ...record,
                      show_chatbox: event.currentTarget.checked,
                    })
                  }
                  className="mb-4"
                />
              </div>

              <div>
                <RecordSelect
                  model="openrouter_model"
                  displayField="string_id"
                  pageSize={1000}
                  searchFields={['string_id', 'name']}
                  label={t('Chat model')}
                  description={t('AI model used for the chat assistant')}
                  placeholder={t('Select an AI model')}
                  value={record?.chatbox_model_id}
                  onChange={(value) =>
                    setRecord({
                      ...record,
                      chatbox_model_id: value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className={`mt-8 flex flex-col gap-4`}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faNewspaper} className="text-gray-600" />
              <H2>{t('Blog Settings')}</H2>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <NumberInput
                  label={t('Posts per page')}
                  description={t('Number of blog posts to display per page')}
                  value={record.blog_posts_per_page || 6}
                  onChange={(value) =>
                    setRecord({
                      ...record,
                      blog_posts_per_page: value,
                    })
                  }
                  className="mb-6 max-w-[300px]"
                />
                <Switch
                  label={t('Show Author on Posts')}
                  description={t('Display the author name on blog posts')}
                  checked={record.show_post_author || false}
                  onChange={(event) =>
                    setRecord({
                      ...record,
                      show_post_author: event.currentTarget.checked,
                    })
                  }
                  className="mb-4"
                />

                <Switch
                  label={t('Show Published Date')}
                  description={t('Display the publication date on blog posts')}
                  checked={record.show_post_date || false}
                  onChange={(event) =>
                    setRecord({
                      ...record,
                      show_post_date: event.currentTarget.checked,
                    })
                  }
                  className="mb-4"
                />
              </div>
            </div>
          </div>

          <div className={`mt-8 flex flex-col gap-4`}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCode} className="text-gray-600" />
              <H2>{t('Custom Code')}</H2>
            </div>

            <Text c="dimmed" size="sm" className="ml-1">
              {t(
                'Inject custom code (HTML, CSS, or JavaScript) on every page, inserted before the closing </body> tag.',
              )}
            </Text>

            <div>
              <div className="border border-gray-300 rounded" style={{ height: '200px' }}>
                <Editor
                  className="w-full h-full rounded shadow"
                  value={record.website_custom_code || ''}
                  onValueChange={(code) =>
                    setRecord({
                      ...record,
                      website_custom_code: code,
                    })
                  }
                  highlight={(code) => highlight(code, languages.markup, 'html')}
                  padding={10}
                  style={{
                    fontSize: 12,
                    backgroundColor: '#f6f8fa',
                    minHeight: '200px',
                  }}
                  placeholder="<!-- Enter HTML, CSS, or JavaScript code here -->"
                />
              </div>
            </div>
          </div>

          <div className={`mt-8 flex flex-col gap-4`}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faDatabase} className="text-gray-600" />
              <H2>{t('Backup & Restore')}</H2>
            </div>

            <Text c="dimmed" size="sm" className="ml-1">
              {t(
                'Export your site content (Pages, Blog Posts, Menus, Attachments) as a ZIP file or restore from a previous backup.',
              )}
            </Text>

            <div className="flex gap-4">
              <Button
                leftSection={<FontAwesomeIcon icon={faDownload} />}
                onClick={handleExport}
                variant="outline"
                loading={exportLoading}
              >
                {t('Download Backup')}
              </Button>

              <Button
                leftSection={<FontAwesomeIcon icon={faUpload} />}
                onClick={() => setImportModalOpen(true)}
                variant="outline"
                color="red"
              >
                {t('Restore Backup')}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <FormViewSkeleton />
      )}

      <Modal
        opened={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportFile(null);
        }}
        title={t('Restore Backup')}
        centered
      >
        <div className="flex flex-col gap-4">
          <Alert color="red" title={t('Warning')}>
            {t(
              'Restoring a backup will overwrite existing content with the same IDs. This action cannot be undone. Please make sure you have a current backup before proceeding.',
            )}
          </Alert>

          <FileInput
            label={t('Backup File (.zip)')}
            placeholder={t('Select backup file')}
            accept=".zip"
            value={importFile}
            onChange={setImportFile}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                setImportModalOpen(false);
                setImportFile(null);
              }}
            >
              {t('Cancel')}
            </Button>
            <Button
              color="red"
              onClick={handleImport}
              loading={importLoading}
              disabled={!importFile}
            >
              {t('Restore')}
            </Button>
          </Group>
        </div>
      </Modal>
    </form>
  );
}
