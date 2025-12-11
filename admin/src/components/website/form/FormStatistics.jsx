import {useMemo} from 'react';
import {Helmet} from 'react-helmet';
import WebsiteHeader from '../WebsiteHeader.jsx';
import {Box, Text} from '@mantine/core';
import {FormFieldType} from '../../../constants/form.js';
import OptionsControlStatistics from './components/form-statistics/OptionsControlStatistics.jsx';
import {useTranslation} from 'react-i18next';
import NumberControlStatistics from './components/form-statistics/NumberControlStatistics.jsx';
import H1 from '../../../common/ui/H1.jsx';
import Divider from '../../../common/ui/Divider.jsx';
import SpecialTemplateRenderer from '../SpecialTemplateRenderer.jsx';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';

/**
 * Render form statistics page
 *
 * @param props
 * @param {FormContent} props.initialPageData
 * @returns {JSX.Element}
 * @constructor
 */
const FormStatistics = (props) => {
  const formContent = props.initialPageData;
  const {settings: siteSettings} = SitePublicSettingsState();
  const notFound = useMemo(
    () => !formContent || !!formContent.notFound,
    [formContent]
  );

  // Translation
  const {t} = useTranslation();

  /**
   *
   * @param {FormField} formField
   * @returns {JSX.Element}
   */
  const renderFormFieldStatistics = (formField) => {
    switch (formField.field_type) {
      case FormFieldType.Checkboxes:
      case FormFieldType.MultipleChoice:
      case FormFieldType.Dropdown:
        return (
          <OptionsControlStatistics
            formField={formField}
            formSubmissions={formContent.submissions}
          />
        );
      case FormFieldType.Number:
        return (
          <NumberControlStatistics
            formField={formField}
            formSubmissions={formContent.submissions}
          />
        );
      default:
        return <></>;
    }
  };

  if (notFound) {
    return (
      <SpecialTemplateRenderer
        templateKey="not_found"
        siteSettingsOverride={siteSettings}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>{formContent?.title ? formContent.title : 'Blog Post'}</title>
      </Helmet>
      <main className="min-h-screen flex flex-col">
        {/*region header*/}
        <WebsiteHeader />
        {/*endregion header*/}

        {/*region content*/}
        <Box className="container px-3 xl:px-6 mx-auto max-w-xl xl:max-w-2xl 2xl:max-w-3xl space-y-4 py-10 xl:py-20">
          {/*region statistics page info*/}
          <Box className="space-y-2">
            <H1 className="">{t('Form Statistics')}</H1>
            <Text className="text-gray-pale-sky">
              {t('View detailed statistics and analytics for form submissions')}
            </Text>
          </Box>
          {/*endregion statistics page info*/}

          <Divider />

          {/*region form title*/}
          <Box className="space-y-3 pt-9">
            <Box
              component="h2"
              className="text-black break-words text-center font-bold text-2xl"
            >
              {formContent.title}
            </Box>
            {formContent.description && (
              <Box component="p" className="text-sm text-gray-pale-sky">
                {formContent.description}
              </Box>
            )}
          </Box>
          {/*endregion form title*/}

          {/*region statistics overview*/}
          <Box className="grid grid-cols-2 gap-4">
            <Box className="bg-gray-50 rounded-lg p-4 space-y-2">
              <Box className="text-center font-bold text-gray-pale-sky">
                {t('Number of views')}
              </Box>
              <Text size="xl" fw={700} className="text-black text-center">
                {formContent.views_count || 0}
              </Text>
            </Box>
            <Box className="bg-gray-50 rounded-lg p-4 space-y-2">
              <Box className="text-center font-bold text-gray-pale-sky">
                {t('Number of submissions')}
              </Box>
              <Text size="xl" fw={700} className="text-black text-center">
                {formContent.submissions_count || 0}
              </Text>
            </Box>
          </Box>
          {/*endregion statistics overview*/}

          {/*region field content*/}
          <Box className="space-y-4">
            {formContent.fields.map((field, index) => (
              <Box key={index}>
                <Box>{renderFormFieldStatistics(field)}</Box>
              </Box>
            ))}
          </Box>
          {/*endregion field content*/}
        </Box>
        {/*endregion content*/}
      </main>
    </>
  );
};

export default FormStatistics;
