import { useTranslation } from 'react-i18next';
import Card from '../../../common/ui/Card.jsx';
import H1 from '../../../common/ui/H1.jsx';
import useModel from '../../../common/api/useModel.jsx';
import NotificationState from '../../../common/stores/NotificationState.js';
import OrganizationIdState from '../../../common/stores/OrganizationIdState.js';
import useOrganization from '../../../common/hooks/useOrganization.js';
import { useNavigate } from 'react-router-dom';
import CreateFormActionBar from '../../../common/ui/CreateFormActionBar.jsx';
import { useState, useEffect } from 'react';
import {
  LoadingOverlay,
  MultiSelect,
  TagsInput,
  Stepper,
  Group,
} from '@mantine/core';
import Select from '../../../common/ui/Select.jsx';
import Button from '../../../common/ui/Button.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import PasswordInput from '../../../common/ui/PasswordInput.jsx';
import RecordSelect from '../../../common/ui/RecordSelect.jsx';
import { IconArrowRight, IconKey, IconLanguage, IconWorld } from '@tabler/icons-react';

export default function SiteCreate() {
  const { t } = useTranslation();
  const { create } = useModel('organization');
  const { notify } = NotificationState((state) => state);
  const { refresh: refreshOrganizations } = useOrganization();
  const setOrganizationId = OrganizationIdState((state) => state.setOrganizationId);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const [record, setRecord] = useState({
    name: '',
    domains: [],
    available_languages: [],
    default_language_id: null,
    openrouter_api_key: '',
    ai_translation_model_id: null,
    ai_default_writing_model_id: null,
    ai_autocomplete_model_id: null,
  });

  const { data: locales, loading: localesLoading } = useModel('locale', {
    autoFetch: true,
    pageSize: null,
  });

  const [localeOptions, setLocaleOptions] = useState([]);

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

    const stillIncludesDefault = selectedLanguages.some(
      (lang) => lang.id === record.default_language_id,
    );

    setRecord({
      ...record,
      available_languages: selectedLanguages,
      default_language_id: stillIncludesDefault ? record.default_language_id : null,
    });
  };

  const handleDefaultLanguageChange = (value) => {
    setRecord({
      ...record,
      default_language_id: value ? parseInt(value) : null,
    });
  };

  const handleDomainsChange = (domains) => {
    setRecord({
      ...record,
      domains: domains.length > 0 ? domains : [],
    });
  };

  const nextStep = () => setActive((current) => (current < 2 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  async function handleSubmit() {
    try {
      setLoading(true);

      if (!record.name.trim()) {
        throw new Error(t('Name is required'));
      }

      if (record.domains.length === 0) {
        throw new Error(t('At least one domain is required'));
      }

      let payload = record;
      if (
        record.default_language_id &&
        record.available_languages &&
        !record.available_languages.some((lang) => lang.id === record.default_language_id)
      ) {
        const defaultLocale = locales.find((l) => l.id === record.default_language_id);
        if (defaultLocale) {
          payload = {
            ...record,
            available_languages: [
              ...record.available_languages,
              {
                id: defaultLocale.id,
                name: defaultLocale.name,
                iso_code: defaultLocale.iso_code,
                emoji_flag: defaultLocale.emoji_flag,
              },
            ],
          };
        }
      }

      const createdOrganization = await create(payload);

      notify({
        message: t('Website created successfully!'),
        type: 'success',
      });
      await refreshOrganizations();
      if (createdOrganization?.id) {
        setOrganizationId(createdOrganization.id);
      }
      navigate('/pages');
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
    <div className={`max-w-screen-xl m-auto my-[20px] px-[24px]`}>
      <CreateFormActionBar loading={loading || localesLoading} customActions={<></>} />

      <Card className={`shadow-none border-none`}>
        <H1>{t('Create New Website')}</H1>

        <Stepper active={active} onStepClick={setActive} className="mt-6">
          <Stepper.Step
            label={t('Basic Information')}
            description={t('Name and domains')}
            icon={<IconWorld size={16} />}
          >
            <div className="mt-6 flex flex-col gap-4">
              <TextInput
                label={t('Website Name')}
                description={t('Give your website a name')}
                placeholder={t('Enter website name')}
                value={record.name}
                onChange={(e) =>
                  setRecord({
                    ...record,
                    name: e.target.value,
                  })
                }
                required
              />

              <TagsInput
                label={t('Domains')}
                description={t(
                  'Enter the domains for this website (e.g., example.com, subdomain.example.com). Press Enter to add each domain.',
                )}
                placeholder={t('Enter domain and press Enter')}
                value={record.domains || []}
                onChange={handleDomainsChange}
                required
                clearable
                size="md"
                radius="md"
                splitChars={[',', ' ']}
                maxDropdownHeight={200}
              />
            </div>
          </Stepper.Step>

          <Stepper.Step
            label={t('Languages')}
            description={t('Site languages')}
            icon={<IconLanguage size={16} />}
          >
            <div className="mt-6 relative flex flex-col gap-4">
              <LoadingOverlay visible={localesLoading} />

              <MultiSelect
                label={t('Available Languages')}
                description={t('Select languages that will be available on your site')}
                placeholder={t('Select languages')}
                data={localeOptions}
                value={record?.available_languages?.map((lang) => lang.id.toString()) || []}
                onChange={handleAvailableLanguagesChange}
                size="md"
                radius="md"
                required
                searchable
                clearable
              />

              <Select
                label={t('Default Language')}
                description={t('The default language for your site')}
                placeholder={
                  record?.available_languages?.length
                    ? t('Select default language')
                    : t('Select available languages first')
                }
                data={localeOptions.filter((option) =>
                  record?.available_languages?.some((lang) => lang.id.toString() === option.value),
                )}
                value={record?.default_language_id?.toString() || ''}
                onChange={handleDefaultLanguageChange}
                disabled={!record?.available_languages?.length}
                required
                searchable
                clearable
                size="md"
                radius="md"
              />
            </div>
          </Stepper.Step>

          <Stepper.Step
            label={t('AI Configuration')}
            description={t('Optional')}
            icon={<IconKey size={16} />}
          >
            <div className="mt-6 flex flex-col gap-4">
              <PasswordInput
                label={t('OpenRouter API Key (optional)')}
                description={t(
                  'API key for AI-powered translation and content generation features',
                )}
                placeholder={t('Enter OpenRouter API key')}
                value={record.openrouter_api_key || ''}
                onChange={(e) =>
                  setRecord({
                    ...record,
                    openrouter_api_key: e.target.value,
                  })
                }
              />

              <RecordSelect
                model="openrouter_model"
                displayField="string_id"
                pageSize={1000}
                searchFields={['string_id', 'name']}
                label={t('Translation model (optional)')}
                description={t('AI model used for translating content between languages')}
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
                label={t('Default writing model (optional)')}
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
                label={t('Autocomplete model (optional)')}
                description={t('AI model used for text autocomplete and suggestions')}
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
          </Stepper.Step>
        </Stepper>

        <Group justify="flex-end" mt="xl">
          {active > 0 && (
            <Button variant="default" onClick={prevStep} disabled={loading}>
              {t('Back')}
            </Button>
          )}
          {active < 2 ? (
            <Button onClick={nextStep} rightSection={<IconArrowRight size={16} />}>
              {t('Next step')}
            </Button>
          ) : (
            <Button
              loading={loading}
              onClick={handleSubmit}
              color="green"
              rightSection={<IconArrowRight size={16} />}
            >
              {t('Create Website')}
            </Button>
          )}
        </Group>
      </Card>
    </div>
  );
}
