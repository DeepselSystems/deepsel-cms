import { useState, useCallback, useEffect, useMemo } from "react";
import { MantineProvider } from "@mantine/core";
import { useTranslation } from "react-i18next";
import "../i18n";
import {
  WebsiteDataProvider,
  useWebsiteData,
  FormRenderer,
  CustomCodeRenderer,
  type FormSubmitData,
} from "@deepsel/cms-react";
import { WebsiteDataTypes, type FormData } from "@deepsel/cms-utils";
import Menu from "./Menu";
import Footer from "./Footer";
import LangSwitcher from "./LangSwitcher";
import SearchForm from "./SearchForm";

/** Delay in ms before incrementing the view counter */
const INCREMENT_VIEWS_DELAY_MS = 3000;

/**
 * Main form component to render form page
 */
export default function Form({ data }: { data: FormData }) {
  return (
    <MantineProvider>
      <WebsiteDataProvider websiteData={{ type: WebsiteDataTypes.Form, data }}>
        {data.notFound ? <FormNotFound /> : <FormContent />}
      </WebsiteDataProvider>
    </MantineProvider>
  );
}

/**
 * Form not found state
 */
function FormNotFound() {
  const { t } = useTranslation();
  return (
    <main className="sr-form__page">
      <HeaderBar />
      <div className="sr-form__not-found sr-form__page-body">
        <h1>404</h1>
        <h2>{t("Form Not Found")}</h2>
        <p>
          {t("The form you are looking for doesn't exist or has been removed.")}
        </p>
        <a href="/">{t("Go Back Home")}</a>
      </div>
      <Footer />
    </main>
  );
}

/**
 * Form content component — handles submission logic and renders FormRenderer
 */
function FormContent() {
  const { websiteData } = useWebsiteData();
  const formData = websiteData.data as FormData;
  const { t } = useTranslation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** Convert latest_user_submission array → Record keyed by field_id for prefill */
  const initialFieldsData = useMemo(() => {
    if (!formData.latest_user_submission?.length) return {};
    return Object.fromEntries(
      formData.latest_user_submission.map((v) => [v.field_id, v]),
    );
  }, [formData.latest_user_submission]);

  /** Remaining submissions before the cap is hit, or null when there is no cap */
  const submissionsRemaining = useMemo(() => {
    const max = formData.max_submissions;
    if (max === null || max === undefined) return null;
    return Math.max(0, Number(max) - (formData.submissions_count || 0));
  }, [formData.max_submissions, formData.submissions_count]);

  const reachedSubmissionLimit = submissionsRemaining === 0;

  /** Increment view counter once, 3s after mount */
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch(`/api/v1/form_content/${formData.id}/increment-views`, {
        method: "PUT",
      });
    }, INCREMENT_VIEWS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [formData.id]);

  const handleSubmit = useCallback(
    (rawData: FormSubmitData): void => {
      setIsSubmitting(true);
      setSubmitError(null);

      // Strip internal tracking keys (_error, _field) before sending to backend
      const submissionData = Object.fromEntries(
        Object.entries(rawData).map(
          ([fieldId, { _error, _field, ...clean }]) => [fieldId, clean],
        ),
      );

      fetch("/api/v1/form_submission/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: formData.form_id,
          form_content_id: formData.id,
          submission_data: submissionData,
          submitter_user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      })
        .then((res) => {
          if (!res.ok) {
            return res
              .json()
              .catch(() => ({}))
              .then((body: { detail?: string }) => {
                throw new Error(body.detail ?? `HTTP ${res.status}`);
              });
          }
          setSubmitted(true);
        })
        .catch((err: unknown) => {
          setSubmitError(
            err instanceof Error ? err.message : t("Failed to submit form"),
          );
        })
        .finally(() => setIsSubmitting(false));
    },
    [formData.form_id, formData.id, t],
  );

  return (
    <main className="sr-form__page">
      <HeaderBar />

      <div className="sr-form__page-body">
        <div className="sr-form">
          <div>
            <h1 className="sr-form__title">{formData.title}</h1>

            {formData.description && (
              <p className="sr-form__description">{formData.description}</p>
            )}

            {formData.show_remaining_submissions &&
              submissionsRemaining !== null && (
                <div
                  className={
                    reachedSubmissionLimit
                      ? "sr-form__availability sr-form__availability--limit-reached"
                      : "sr-form__availability sr-form__availability--remaining"
                  }
                >
                  {reachedSubmissionLimit
                    ? t(
                        "This form has reached its submission limit and is no longer accepting responses.",
                      )
                    : t(
                        "Limited availability: {{submissions_remaining}}/{{max_submissions}} submissions remaining.",
                        {
                          submissions_remaining: submissionsRemaining,
                          max_submissions: formData.max_submissions || 0,
                        },
                      )}
                </div>
              )}
          </div>

          <FormRenderer
            formContent={formData}
            initialFieldsData={initialFieldsData}
            loading={isSubmitting}
            submitted={submitted}
            onSubmit={handleSubmit}
          />

          {submitted && (
            <div className="sr-form__success">
              <span>{formData.success_message}</span>
              {formData.enable_public_statistics &&
                typeof window !== "undefined" && (
                  <a
                    className="sr-form__success-stats-link"
                    href={`${window.location.href}/statistics`}
                  >
                    {t("Click here to see statistics for this form.")}
                  </a>
                )}
            </div>
          )}

          {!submitted && formData.closing_remarks && (
            <p className="sr-form__closing-remarks">
              {formData.closing_remarks}
            </p>
          )}

          {submitError && <p className="sr-form__error">{submitError}</p>}
        </div>
      </div>

      <Footer />

      <CustomCodeRenderer
        pageData={{ form_custom_code: formData.form_custom_code }}
        contentData={formData as unknown as Record<string, unknown>}
        type="form"
        isPreviewMode={false}
      />
    </main>
  );
}

/**
 * Header bar with navigation
 */
function HeaderBar() {
  return (
    <header className="sr-form__navbar">
      <div className="sr-form__navbar-inner">
        <Menu />
        <div className="sr-form__navbar-actions">
          <SearchForm />
          <LangSwitcher />
        </div>
      </div>
    </header>
  );
}
