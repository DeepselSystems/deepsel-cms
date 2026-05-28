import { useState, useCallback, useEffect, useMemo } from "react";
import { Alert, Box, MantineProvider, Text } from "@mantine/core";
import { IconCircleCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  WebsiteDataProvider,
  useWebsiteData,
  RenderedForm,
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
 * Form not found component
 */
function FormNotFound() {
  return (
    <main className="min-h-screen flex flex-col">
      <HeaderBar />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center grow flex flex-col justify-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-3xl font-semibold mb-6">Form Not Found</h2>
        <p className="text-lg mb-8 text-gray-600">
          The form you are looking for doesn&apos;t exist or has been removed.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
        >
          Go Back Home
        </a>
      </div>
      <Footer />
    </main>
  );
}

/**
 * Form content component
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
            err instanceof Error ? err.message : "Failed to submit form",
          );
        })
        .finally(() => setIsSubmitting(false));
    },
    [formData.form_id, formData.id],
  );

  return (
    <main className="min-h-screen flex flex-col">
      <HeaderBar />

      <div className="py-10 xl:py-20 grow">
        <div className="container px-3 xl:px-6 mx-auto max-w-xl xl:max-w-2xl 2xl:max-w-3xl space-y-4">
          <div className="space-y-3 mb-9">
            <h1 className="text-3xl font-bold text-black break-words text-center">
              {formData.title}
            </h1>
            {formData.description && (
              <Text size="xs" c="dimmed">
                {formData.description}
              </Text>
            )}
            {formData.show_remaining_submissions &&
              submissionsRemaining !== null && (
                <Box>
                  {reachedSubmissionLimit ? (
                    <Text size="xs" c="red">
                      {t(
                        "This form has reached its submission limit and is no longer accepting responses.",
                      )}
                    </Text>
                  ) : (
                    <Text size="xs" c="dimmed">
                      {t(
                        "Limited availability: {{submissions_remaining}}/{{max_submissions}} submissions remaining.",
                        {
                          submissions_remaining: submissionsRemaining,
                          max_submissions: formData.max_submissions || 0,
                        },
                      )}
                    </Text>
                  )}
                </Box>
              )}
          </div>

          <RenderedForm
            formContent={formData}
            initialFieldsData={initialFieldsData}
            loading={isSubmitting}
            submitted={submitted}
            onSubmit={handleSubmit}
          />

          {!submitted && formData.closing_remarks && (
            <Text c="dark">{formData.closing_remarks}</Text>
          )}

          {submitted && (
            <Alert
              color="blue"
              title={
                <Box>
                  <Box component="span">{formData.success_message}</Box>
                  {formData.enable_public_statistics &&
                    typeof window !== "undefined" && (
                      <Box component="span">
                        {" "}
                        <a
                          className="underline"
                          href={`${window.location.href}/statistics`}
                        >
                          {t("Click here to see statistics for this form.")}
                        </a>
                      </Box>
                    )}
                </Box>
              }
              icon={<IconCircleCheck size={16} />}
            />
          )}

          {submitError && (
            <p className="text-red-600 text-center mt-4 text-sm">
              {submitError}
            </p>
          )}
        </div>

        <CustomCodeRenderer
          pageData={{ form_custom_code: formData.form_custom_code }}
          contentData={formData as unknown as Record<string, unknown>}
          type="form"
          isPreviewMode={false}
        />
      </div>

      <Footer />
    </main>
  );
}

/** Shared header used by both the form view and the 404 fallback */
function HeaderBar() {
  return (
    <header className="shadow px-3 backdrop-blur bg-white/90">
      <div className="flex justify-between items-center gap-6 max-w-[1200px] mx-auto">
        <a
          href="/"
          className="flex items-center gap-2 text-2xl font-bold no-underline text-black"
        >
          My Website
        </a>
        <div className="flex items-center gap-6">
          <Menu />
          <SearchForm />
          <LangSwitcher />
        </div>
      </div>
    </header>
  );
}
