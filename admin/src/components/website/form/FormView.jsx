import {Suspense, useCallback, useMemo, useState} from 'react';
import fromPairs from 'lodash/fromPairs';
import {Box} from '@mantine/core';
import {Helmet} from 'react-helmet';
import WebsiteHeader from '../WebsiteHeader.jsx';
import AdminHeader from '../AdminHeader.jsx';
import useAuthentication from '../../../common/api/useAuthentication.js';
import RenderedForm from '../../../common/ui/Form/RenderedForm/index.jsx';
import useFetch from '../../../common/api/useFetch.js';
import usePublicIp from '../../../common/hooks/usePublicIp.js';
import NotificationState from '../../../common/stores/NotificationState.js';
import {useTranslation} from 'react-i18next';
import cloneDeep from 'lodash/cloneDeep';
import CustomCodeRenderer from '../CustomCodeRenderer.jsx';
import useFormPrefill, {getCurrentFormSlug} from './hooks/useFormPrefill.js';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import SpecialTemplateRenderer from '../SpecialTemplateRenderer.jsx';
import useEffectOnce from '../../../common/hooks/useEffectOnce.js';

/**
 * Render website pages for 'form content' with specific locale
 *
 * @param {FormContent} initialPageData
 * @returns {JSX.Element}
 * @constructor
 */
const FormView = ({initialPageData: formContent}) => {
  // Get user and permissions
  const {user} = useAuthentication();
  const allowEdit = useMemo(
    () =>
      !!['admin_role', 'super_admin_role', 'website_admin_role'].find(
        (role) => !!user?.roles.find((userRole) => userRole.string_id === role)
      ),
    [user?.roles]
  );
  const notFound = useMemo(
    () => !formContent || !!formContent.notFound,
    [formContent]
  );
  const {ip} = usePublicIp();
  const {notify} = NotificationState((state) => state);
  const {t} = useTranslation();
  const {settings: siteSettings} = SitePublicSettingsState();

  // Form prefill hook
  const {getFormPrefillData, saveFormPrefillData} = useFormPrefill();

  // Get form key from URL
  const formSlug = useMemo(() => getCurrentFormSlug(), []);

  // Increment view query
  const {put: incrementViews} = useFetch(
    `form_content/${formContent.id}/increment-views`,
    {
      autoFetch: false,
    }
  );

  /**
   * Pre-fill data for this form (priority: latest user submission > localStorage > default)
   *
   * @type {Record<number, FormSubmissionData>}
   */
  const prefillData = useMemo(
    () =>
      formContent.latest_user_submission?.submission_data ||
      getFormPrefillData(formSlug, formContent?.fields || []),
    [
      formContent.latest_user_submission?.submission_data,
      formContent?.fields,
      getFormPrefillData,
      formSlug,
    ]
  );

  // Loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form submission query
  const {post: postFormSubmission} = useFetch('form_submission', {
    autoFetch: false,
  });

  /**
   * Handle submit form
   * @type {(submissionData: Record<number, FormSubmissionData>) => void}
   */
  const handleFormSubmit = useCallback(
    (submissionData) => {
      const clonedSubmissionData = cloneDeep(submissionData);
      setIsSubmitting(true);
      const payload = {
        form_id: formContent.form_id, // it needs to map with form_content_id
        form_content_id: formContent.id,
        submission_data: fromPairs(
          Object.keys(clonedSubmissionData).map((key) => {
            // Delete internal fields before submitting to backend
            delete clonedSubmissionData[key]._error;
            delete clonedSubmissionData[key]._field;
            return [key, clonedSubmissionData[key]];
          })
        ),
        submitter_ip: ip,
        submitter_user_agent: navigator.userAgent,
        submitter_user_id: user?.id,
      };
      postFormSubmission(payload)
        .then(() => {
          setSubmitted(true);
          // Save form data to localStorage for prefill on next visit
          if (formSlug) {
            saveFormPrefillData(formSlug, clonedSubmissionData);
          }
        })
        .catch((error) => {
          console.error(error);
          notify({
            message: error || t('Failed to submit form'),
            type: 'error',
          });
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [
      formContent.form_id,
      formContent.id,
      formSlug,
      ip,
      notify,
      postFormSubmission,
      saveFormPrefillData,
      t,
      user?.id,
    ]
  );

  /**
   * Increment view query with debounce when form is loaded
   */
  useEffectOnce(() => {
    const timeoutInstance = setTimeout(() => {
      incrementViews();
    }, 3000);
    return () => {
      clearTimeout(timeoutInstance);
    };
  });

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
        {user && !notFound && (
          <Suspense
            fallback={<div className="bg-gray-100 shadow-lg py-2"></div>}
          >
            <AdminHeader
              dashboardPath={'/admin/forms'}
              allowEdit={allowEdit}
              editPath={`/admin/forms/${formContent.form_id}/edit?redirect=${location.pathname}`}
            />
          </Suspense>
        )}
        <WebsiteHeader />
        {/*endregion header*/}

        <Box className="container py-10 xl:py-20 mx-auto">
          <RenderedForm
            formContent={formContent}
            initialFieldsData={prefillData}
            loading={isSubmitting}
            submitted={submitted}
            onSubmit={handleFormSubmit}
          />
          {/* Custom Code Renderer */}
          <CustomCodeRenderer
            pageData={{
              form_custom_code: formContent?.form_custom_code,
            }}
            contentData={formContent}
            type="form"
            isPreviewMode={false}
          />
        </Box>
      </main>
    </>
  );
};

export default FormView;
