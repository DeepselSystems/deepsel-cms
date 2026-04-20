import { useTranslation } from 'react-i18next';
import NumberInput from '../../../../common/ui/NumberInput.jsx';
import Switch from '../../../../common/ui/Switch.jsx';
import SiteSettingsSection from './SiteSettingsSection.jsx';

export default function SiteSettingsBlog() {
  const { t } = useTranslation();

  return (
    <SiteSettingsSection
      title={t('Blog Settings')}
      onSubmit={async ({ record, update }) => {
        await update(record);
      }}
    >
      {({ record, setRecord }) => (
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
      )}
    </SiteSettingsSection>
  );
}
