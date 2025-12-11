import React from 'react';
import {useTranslation} from 'react-i18next';
import {Drawer} from '@mantine/core';
import Switch from '../../../../common/ui/Switch.jsx';
import SeoMetadataForm from '../../../../common/ui/SeoMetadata/SeoMetadataForm.jsx';
import SocialCardPreview from '../../../../common/ui/SeoMetadata/SocialCardPreview.jsx';
import SERPPreviewCardPreview from '../../../../common/ui/SeoMetadata/SERPPreviewCardPreview.jsx';
import H3 from '../../../../common/ui/H3.jsx';
import Editor from 'react-simple-code-editor';
import {highlight, languages} from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-jsx';
import 'prismjs/themes/prism.css';

/**
 * Seo metadata form modal
 *
 * @type {React.ForwardRefExoticComponent<
 * React.PropsWithoutRef<{
 *   readonly pageContent: PageContent
 *   readonly updateContentField: (contentId: number, filed: string, newValue) => void
 *   readonly opened: boolean
 *   readonly onClose: () => void
 * }> &
 * React.RefAttributes<{unknow}>>}
 */
const PageContentSettingDrawer = React.forwardRef(
  (
    {pageContent, updateContentField, opened, onClose, page, updatePageField},
    ref
  ) => {
    // Translation
    const {t} = useTranslation();

    /**
     * Handle ref
     */
    React.useImperativeHandle(ref, () => ({
      // Not thing yet
    }));

    return (
      <>
        <Drawer
          opened={opened}
          onClose={onClose}
          title={<h2 className="font-bold text-xl">{t('Settings')}</h2>}
          size="md"
          position="right"
          transitionProps={{transition: 'slide-left', duration: 200}}
        >
          <div className="mb-4 space-y-6">
            {/* Page Settings Section */}
            <div className="space-y-3">
              <H3>{t('Page Settings')}</H3>

              <Switch
                classNames={{
                  body: 'flex-col-reverse gap-2',
                  label: 'px-0',
                  description: 'px-0 mt-0',
                }}
                checked={page?.require_login || false}
                size="lg"
                label={t('Require Login')}
                description={t(
                  'When enabled, users must be logged in to view this page'
                )}
                onChange={(e) =>
                  updatePageField('require_login', e.currentTarget.checked)
                }
              />
            </div>

            <SeoMetadataForm
              pageContent={pageContent}
              updateContentField={updateContentField}
            />

            {(pageContent.seo_metadata_title ||
              pageContent.seo_metadata_description) && (
              <>
                <SocialCardPreview pageContent={pageContent} />
                <SERPPreviewCardPreview pageContent={pageContent} />
              </>
            )}

            {/* Custom Code Section */}
            <div className="space-y-3">
              <H3>{t('Custom Code')}</H3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Language-specific custom code')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {t(
                    'This code will be injected only for this language version of the page, after the content.'
                  )}
                </p>
                <div
                  className="border border-gray-300 rounded"
                  style={{height: '150px'}}
                >
                  <Editor
                    className="w-full h-full"
                    value={pageContent.custom_code || ''}
                    onValueChange={(code) =>
                      updateContentField(pageContent.id, 'custom_code', code)
                    }
                    highlight={(code) =>
                      highlight(code, languages.markup, 'html')
                    }
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
                  {t('Page custom code (all languages)')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {t(
                    'This code will be injected in all language versions of this page, after the content.'
                  )}
                </p>
                <div
                  className="border border-gray-300 rounded"
                  style={{height: '150px'}}
                >
                  <Editor
                    className="w-full h-full"
                    value={page?.page_custom_code || ''}
                    onValueChange={(code) =>
                      updatePageField('page_custom_code', code)
                    }
                    highlight={(code) =>
                      highlight(code, languages.markup, 'html')
                    }
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
          </div>
        </Drawer>
      </>
    );
  }
);

PageContentSettingDrawer.displayName = 'PageContentSettingDrawer';
export default PageContentSettingDrawer;
