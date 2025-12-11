import {useState, useEffect, useCallback, useMemo, memo} from 'react';
import {useTranslation} from 'react-i18next';
import PropTypes from 'prop-types';
import useFetch from '../../../../common/api/useFetch.js';
import IframeContent from '../../../../common/ui/IframeContent.jsx';

const EmailPreview = memo(function EmailPreview({
  templateId,
  sampleData,
  manualEmails,
  className,
}) {
  const {t} = useTranslation();
  const [emailContent, setEmailContent] = useState('');
  const [lastPreviewData, setLastPreviewData] = useState(null);

  const {post: postPreviewEmail} = useFetch(
    'email_campaign/utils/preview-email'
  );

  // Memoized helper function
  const getFirstEmail = useCallback((emailString) => {
    if (!emailString) return null;

    // Split by comma or newline and get first email
    const emails = emailString.split(/[,\n]/).map((email) => email.trim());
    const firstValidEmail = emails.find(
      (email) => email && email.includes('@')
    );
    return firstValidEmail || null;
  }, []);

  // Optimized email preview generation with proper dependencies
  const generateEmailPreview = useCallback(async () => {
    if (!templateId) {
      setEmailContent('');
      return;
    }

    // Determine sample data source
    let previewData = null;

    if (sampleData && Object.keys(sampleData).length > 0) {
      // Use table data (CSV/form submissions)
      previewData = sampleData;
    } else if (manualEmails) {
      // Use first email from manual input
      const firstEmail = getFirstEmail(manualEmails);
      if (firstEmail) {
        previewData = {email: firstEmail};
      }
    }

    if (!previewData) {
      setEmailContent('');
      return;
    }

    // Check if data actually changed to avoid unnecessary API calls
    const currentDataKey = JSON.stringify({templateId, previewData});
    if (lastPreviewData === currentDataKey) {
      return;
    }

    try {
      const response = await postPreviewEmail({
        email_template_id: templateId,
        sample_data: previewData,
      });

      setEmailContent(response.html_content || '');
      setLastPreviewData(currentDataKey);
    } catch (error) {
      setEmailContent('');
      setLastPreviewData(null);
    }
  }, [
    templateId,
    sampleData,
    manualEmails,
    lastPreviewData,
    postPreviewEmail,
    getFirstEmail,
  ]);

  // Effect for triggering preview generation
  useEffect(() => {
    generateEmailPreview();
  }, [generateEmailPreview]);

  // Memoized content to prevent unnecessary re-renders
  const previewContent = useMemo(() => {
    if (emailContent) {
      return (
        <div className="border border-gray-200 rounded overflow-hidden">
          <IframeContent html={emailContent} className="w-full h-[480px]" />
        </div>
      );
    }

    return (
      <div className="border border-dashed border-gray-300 rounded p-6">
        <div className="text-center text-gray-500">
          {t('Select a template and add data to preview the email')}
        </div>
      </div>
    );
  }, [emailContent, t]);

  return (
    <div className={className}>
      <div className="text-md font-medium text-black mb-3">
        {t('Email Sample Preview')}
      </div>
      {previewContent}
    </div>
  );
});

// PropTypes for better development experience
EmailPreview.propTypes = {
  templateId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  sampleData: PropTypes.object,
  manualEmails: PropTypes.string,
  className: PropTypes.string,
};

export default EmailPreview;
