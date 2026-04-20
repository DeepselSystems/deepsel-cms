import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingOverlay, MultiSelect, Select, TagsInput } from '@mantine/core';
import { IconLanguage, IconWorld } from '@tabler/icons-react';
import H2 from '../../../../common/ui/H2.jsx';
import TextInput from '../../../../common/ui/TextInput.jsx';
import useModel from '../../../../common/api/useModel.jsx';
import SiteSettingsSection from './SiteSettingsSection.jsx';

export default function SiteSettingsGeneral() {
  const { t } = useTranslation();
  const { data: locales, loading: localesLoading } = useModel('locale', {
    autoFetch: true,
    pageSize: null,
  });

  const localeOptions = useMemo(
    () =>
      (locales || []).map((locale) => ({
        value: locale.id.toString(),
        label: `${locale.emoji_flag} ${locale.name}`,
        emoji_flag: locale.emoji_flag,
      })),
    [locales],
  );

  return (
    <SiteSettingsSection
      title={t('General')}
      extraLoading={localesLoading}
      onSubmit={async ({ record, update }) => {
        let payload = { ...record };
        if (
          record.default_language_id &&
          record.available_languages &&
          !record.available_languages.some((lang) => lang.id === record.default_language_id)
        ) {
          const defaultLocale = locales?.find((l) => l.id === record.default_language_id);
          if (defaultLocale) {
            payload = {
              ...payload,
              available_languages: [
                ...record.available_languages,
                {
                  id: defaultLocale.id,
                  name: defaultLocale.name,
                  iso_code: defaultLocale.iso_code,
                },
              ],
            };
          }
        }
        await update(payload);
        window.location.reload();
      }}
    >
      {({ record, setRecord }) => (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <IconWorld size={16} className="text-gray-600" />
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
              onChange={(domains) =>
                setRecord({
                  ...record,
                  domains: domains.length > 0 ? domains : [],
                })
              }
              className="mb-4"
              required
              clearable
              splitChars={[',', ' ']}
              maxDropdownHeight={200}
              size="md"
              radius="md"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <IconLanguage size={16} className="text-gray-600" />
              <H2>{t('Languages')}</H2>
            </div>

            <div className="relative flex flex-col gap-4">
              <LoadingOverlay visible={localesLoading} />

              <MultiSelect
                label={t('Available Languages')}
                description={t('Select languages that will be available on your site')}
                placeholder={t('Select languages')}
                data={localeOptions}
                value={record?.available_languages?.map((lang) => lang.id.toString()) || []}
                onChange={(selectedValues) => {
                  const selectedLanguages = selectedValues
                    .map((id) => {
                      const localeId = parseInt(id);
                      const locale = locales?.find((l) => l.id === localeId);
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
                }}
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
                onChange={(value) =>
                  setRecord({
                    ...record,
                    default_language_id: value ? parseInt(value) : null,
                  })
                }
                className="mb-4"
                required
                searchable
                clearable
                size="md"
                radius="md"
              />
            </div>
          </div>
        </div>
      )}
    </SiteSettingsSection>
  );
}
