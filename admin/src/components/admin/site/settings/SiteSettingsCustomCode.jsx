import { useTranslation } from 'react-i18next';
import { Text } from '@mantine/core';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-jsx';
import 'prismjs/themes/prism.css';
import SiteSettingsSection from './SiteSettingsSection.jsx';

export default function SiteSettingsCustomCode() {
  const { t } = useTranslation();

  return (
    <SiteSettingsSection
      title={t('Custom Code')}
      onSubmit={async ({ record, update }) => {
        await update(record);
      }}
    >
      {({ record, setRecord }) => (
        <>
          <Text c="dimmed" size="sm" className="mb-4">
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
        </>
      )}
    </SiteSettingsSection>
  );
}
