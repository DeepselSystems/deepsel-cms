import {useTranslation} from 'react-i18next';
import Card from '../../../common/ui/Card.jsx';
import H1 from '../../../common/ui/H1.jsx';
import H2 from '../../../common/ui/H2.jsx';
import useModel from '../../../common/api/useModel.jsx';
import NotificationState from '../../../common/stores/NotificationState.js';
import {useNavigate} from 'react-router-dom';
import CreateFormActionBar from '../../../common/ui/CreateFormActionBar.jsx';
import {useState, useEffect} from 'react';
import {
  LoadingOverlay,
  Select,
  MultiSelect,
  Text,
  TagsInput,
} from '@mantine/core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faLanguage,
  faRobot,
  faKey,
  faNewspaper,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import TextInput from '../../../common/ui/TextInput.jsx';
import PasswordInput from '../../../common/ui/PasswordInput.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import RecordSelect from '../../../common/ui/RecordSelect.jsx';

export default function SiteCreate() {
  const {t} = useTranslation();
  const {create} = useModel('organization');
  const {notify} = NotificationState((state) => state);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Initialize record with default values
  const [record, setRecord] = useState({
    name: '',
    domains: [],
    available_languages: [],
    default_language_id: null,
    auto_translate_pages: false,
    auto_translate_posts: false,
    openrouter_api_key: '',
    ai_translation_model_id: null,
    ai_default_writing_model_id: null,
    ai_autocomplete_model_id: null,
    show_post_author: true,
    show_post_date: true,
    show_chatbox: false,
    chatbox_model_id: null,
  });

  // Fetch locales
  const {data: locales, loading: localesLoading} = useModel('locale', {
    autoFetch: true,
    pageSize: null, // Get all locales
  });

  // Format locales for Select and MultiSelect components
  const [localeOptions, setLocaleOptions] = useState([]);

  // Fetch openrouter models for default values
  const {data: openRouterModels} = useModel('openrouter_model', {
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

  // Set default values for AI models when openRouterModels are loaded
  useEffect(() => {
    if (!openRouterModels || record.ai_translation_model_id) return;

    const translationModel = openRouterModels.find(
      (model) => model.string_id === 'google/gemini-flash-1.5-8b'
    );
    const writingModel = openRouterModels.find(
      (model) => model.string_id === 'openai/gpt-5'
    );
    const autocompleteModel = openRouterModels.find(
      (model) => model.string_id === 'openai/gpt-4'
    );

    let shouldUpdate = false;
    const updates = {};

    if (!record.ai_translation_model_id && translationModel) {
      updates.ai_translation_model_id = translationModel.id;
      shouldUpdate = true;
    }

    if (!record.ai_default_writing_model_id && writingModel) {
      updates.ai_default_writing_model_id = writingModel.id;
      shouldUpdate = true;
    }

    if (!record.ai_autocomplete_model_id && autocompleteModel) {
      updates.ai_autocomplete_model_id = autocompleteModel.id;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      setRecord((prev) => ({
        ...prev,
        ...updates,
      }));
    }
  }, [openRouterModels, record.ai_translation_model_id]);

  // Handle available languages change
  const handleAvailableLanguagesChange = (selectedValues) => {
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
      .filter(Boolean);

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

      // Validate required fields
      if (!record.name.trim()) {
        throw new Error(t('Name is required'));
      }

      if (record.domains.length === 0) {
        throw new Error(t('At least one domain is required'));
      }

      // Make sure default language is included in available languages
      if (
        record.default_language_id &&
        record.available_languages &&
        !record.available_languages.some(
          (lang) => lang.id === record.default_language_id
        )
      ) {
        // Find the locale object for the default language
        const defaultLocale = locales.find(
          (l) => l.id === record.default_language_id
        );
        if (defaultLocale) {
          const defaultLangObject = {
            id: defaultLocale.id,
            name: defaultLocale.name,
            iso_code: defaultLocale.iso_code,
            emoji_flag: defaultLocale.emoji_flag,
          };
          const updatedAvailableLanguages = [
            ...record.available_languages,
            defaultLangObject,
          ];

          await create({
            ...record,
            available_languages: updatedAvailableLanguages,
          });
        } else {
          await create(record);
        }
      } else {
        await create(record);
      }

      notify({
        message: t('Website created successfully!'),
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

  return (
    <form
      className={`max-w-screen-xl m-auto my-[20px] px-[24px]`}
      onSubmit={handleSubmit}
    >
      <CreateFormActionBar loading={loading || localesLoading} />

      <Card className={`shadow-none border-none`}>
        <H1>{t('Create New Website')}</H1>

        <div className={`mt-6 flex flex-col gap-4`}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faGlobe} className="text-gray-600" />
            <H2>{t('Basic Information')}</H2>
          </div>

          <TextInput
            label={t('Website Name')}
            description={t('The name of your website')}
            placeholder={t('Enter website name')}
            value={record.name}
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
              'Enter the domains for this website (e.g., example.com, subdomain.example.com). Press Enter to add each domain.'
            )}
            placeholder={t('Enter domain and press Enter')}
            value={record.domains || []}
            onChange={handleDomainsChange}
            className="mb-4"
            required
            clearable
            splitChars={[',', ' ']}
            maxDropdownHeight={200}
          />
        </div>

        <div className={`mt-8 flex flex-col gap-4`}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faLanguage} className="text-gray-600" />
            <H2>{t('Languages')}</H2>
          </div>

          <div className="relative">
            <LoadingOverlay visible={localesLoading} />

            <MultiSelect
              label={t('Available Languages')}
              description={t(
                'Select languages that will be available on your site'
              )}
              placeholder={t('Select languages')}
              data={localeOptions}
              value={
                record?.available_languages?.map((lang) =>
                  lang.id.toString()
                ) || []
              }
              onChange={handleAvailableLanguagesChange}
              className="mb-4"
              required
              searchable
              clearable
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
            />
          </div>
        </div>

        <div className={`mt-8 flex flex-col gap-4`}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faRobot} className="text-gray-600" />
            <H2>{t('AI Writing')}</H2>
          </div>

          <Text color="dimmed" size="sm" className="mb-2">
            {t(
              'Configure AI-powered content generation and translation features. Requires an OpenRouter API key to function.'
            )}
          </Text>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Switch
                label={t('Auto-translate Pages')}
                description={t(
                  'Automatically translate page content when adding new languages'
                )}
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
                  'Automatically translate blog post content when adding new languages'
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
                <FontAwesomeIcon
                  icon={faKey}
                  className="text-gray-500"
                  size="sm"
                />
                <Text size="sm" weight={500}>
                  {t('API Keys')}
                </Text>
              </div>

              <PasswordInput
                label={t('OpenRouter API Key')}
                description={t(
                  'API key for AI-powered translation and content generation features'
                )}
                placeholder={t('Enter OpenRouter API key')}
                value={record.openrouter_api_key || ''}
                onChange={(e) =>
                  setRecord({
                    ...record,
                    openrouter_api_key: e.target.value,
                  })
                }
                className="mb-4"
              />
              <RecordSelect
                model="openrouter_model"
                displayField="string_id"
                pageSize={1000}
                searchFields={['string_id', 'name']}
                label={t('Translation model')}
                description={t(
                  'AI model used for translating content between languages'
                )}
                placeholder={t('Select a AI model')}
                value={record?.ai_translation_model_id}
                onChange={(value) =>
                  setRecord({
                    ...record,
                    ai_translation_model_id: value,
                  })
                }
              />

              <RecordSelect
                model="openrouter_model"
                displayField="string_id"
                pageSize={1000}
                searchFields={['string_id', 'name']}
                label={t('Default writing model')}
                description={t('Default AI model for generating new content')}
                placeholder={t('Select a AI model')}
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
                pageSize={1000}
                searchFields={['string_id', 'name']}
                label={t('Autocomplete model')}
                description={t(
                  'AI model used for text autocomplete and suggestions'
                )}
                placeholder={t('Select a AI model')}
                value={record?.ai_autocomplete_model_id}
                onChange={(value) =>
                  setRecord({
                    ...record,
                    ai_autocomplete_model_id: value,
                  })
                }
              />
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
              'Enable the website AI assistant in a popup chat box to help users with their queries and provide support.'
            )}
          </Text>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Switch
                label={t('Enabled')}
                description={t(
                  'Show AI assistant chat widget on website pages'
                )}
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
                placeholder={t('Select a AI model')}
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
            <H2>{t('Blog Post Settings')}</H2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
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
      </Card>
    </form>
  );
}
