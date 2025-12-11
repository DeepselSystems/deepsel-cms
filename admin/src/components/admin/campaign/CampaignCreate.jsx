import {useState, useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {LoadingOverlay, Radio} from '@mantine/core';
import {DateTimePicker} from '@mantine/dates';
// Removed unused imports
import useModel from '../../../common/api/useModel.jsx';
import useFetch from '../../../common/api/useFetch.js';
import NotificationState from '../../../common/stores/NotificationState.js';
import CreateFormWrapper from '../../../common/ui/CreateFormWrapper.jsx';
import H1 from '../../../common/ui/H1.jsx';
import H2 from '../../../common/ui/H2.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import TextArea from '../../../common/ui/TextArea.jsx';
import Button from '../../../common/ui/Button.jsx';
import RecordSelect from '../../../common/ui/RecordSelect.jsx';
import FileInput from '../../../common/ui/FileInput.jsx';
import PreviewDataTable from './components/PreviewDataTable.jsx';
import EmailPreview from './components/EmailPreview.jsx';

export default function CampaignCreate(props) {
  const {t} = useTranslation();
  const {modalMode, onSuccess} = props;
  const navigate = useNavigate();
  const {notify} = NotificationState((state) => state);

  const [record, setRecord] = useState({
    name: '',
    data_source: 'csv', // 'manual', 'csv', 'form_submissions'
    send_to_emails: '',
    send_type: 'immediate',
    scheduled_at: null,
    email_template_id: null,
    form_id: null,
    status: 'draft',
  });

  const [tableData, setTableData] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [dataError, setDataError] = useState(null);

  const {create, loading} = useModel('email_campaign');
  const {post: postParseCSV} = useFetch(`email_campaign/utils/parse-csv`);
  const {post: getFormSubmissions} = useFetch(
    `email_campaign/utils/get-form-submissions`
  );

  // Validation functions
  const validateCampaign = useCallback(() => {
    const errors = [];

    if (!record.name) {
      errors.push(t('Campaign name is required'));
    }

    if (!record.email_template_id) {
      errors.push(t('Email template is required'));
    }

    if (record.data_source === 'csv' && tableData.length === 0) {
      errors.push(t('Please upload CSV data'));
    }

    if (record.data_source === 'form_submissions' && !record.form_id) {
      errors.push(t('Please select a form for submissions'));
    }

    if (record.data_source === 'manual' && !record.send_to_emails) {
      errors.push(t('Please enter email addresses to send to'));
    }

    return errors;
  }, [record, tableData.length, t]);

  const handleSubmit = useCallback(
    async (e, saveAndSend = false) => {
      try {
        e.preventDefault();

        const validationErrors = validateCampaign();
        if (validationErrors.length > 0) {
          throw new Error(validationErrors[0]);
        }

        // Prepare data for backend with new structure
        const backendData = {
          ...record,
          use_table_data: record.data_source !== 'manual',
          send_immediately: saveAndSend,
        };
        delete backendData.data_source;

        // Add table data if available
        if (record.data_source !== 'manual' && tableData.length > 0) {
          backendData.table_data = tableData;
        }

        // Create the campaign with all data in one request
        const created = await create(backendData);

        // Show appropriate success message
        if (saveAndSend) {
          notify({
            message: t(
              'Campaign created and started! Processing in background - refresh page to see email progress.'
            ),
            type: 'success',
            duration: 8000,
          });
        } else {
          notify({
            message: t('Campaign created successfully!'),
            type: 'success',
          });
        }

        if (onSuccess) {
          onSuccess(created);
        } else {
          navigate(`/campaigns/${created.id}`);
        }
      } catch (error) {
        console.error(error);
        notify({
          message: error.message,
          type: 'error',
        });
      }
    },
    [
      record,
      tableData,
      create,
      notify,
      onSuccess,
      navigate,
      t,
      validateCampaign,
    ]
  );

  const handleFileUpload = useCallback(
    async (file) => {
      if (!file) {
        setCsvFile(null);
        setTableData([]);
        setDataError(null);
        return;
      }

      setCsvFile(file);
      setUploadLoading(true);
      setDataError(null);

      try {
        // FileInput component uploads file and returns file object with id
        // Now we need to parse the CSV from the attachment
        const csvData = await postParseCSV({attachment_id: file.id});
        setTableData(csvData);

        notify({
          message: t(`Loaded ${csvData.length} rows from CSV`),
          type: 'success',
        });
      } catch (error) {
        console.error(error);
        setDataError(error.message || 'Failed to parse CSV');
        notify({
          message: error.message || 'Failed to parse CSV',
          type: 'error',
        });
      } finally {
        setUploadLoading(false);
      }
    },
    [postParseCSV, notify, t]
  );

  const handleFormSubmissionLoad = useCallback(
    async (formId) => {
      setUploadLoading(true);
      setDataError(null);

      try {
        const response = await getFormSubmissions({form_id: formId});
        setTableData(response);

        notify({
          message: t(`Loaded ${response.length} form submissions`),
          type: 'success',
        });
      } catch (error) {
        console.error(error);
        setDataError(error.message || 'Failed to load form submissions');
        notify({
          message: error.message || 'Failed to load form submissions',
          type: 'error',
        });
      } finally {
        setUploadLoading(false);
      }
    },
    [getFormSubmissions, notify, t]
  );

  const handleTemplateChange = useCallback((templateId) => {
    setRecord((prevRecord) => ({...prevRecord, email_template_id: templateId}));
  }, []);

  const handleRecordChange = useCallback((updates) => {
    setRecord((prevRecord) => ({...prevRecord, ...updates}));
  }, []);

  const handleDataSourceChange = useCallback((value) => {
    setRecord((prevRecord) => ({
      ...prevRecord,
      data_source: value,
      form_id: null, // Clear form selection
      send_to_emails: '', // Clear manual emails
    }));
    setDataError(null);
    setTableData([]);
    setCsvFile(null);
  }, []);

  const sampleData = useMemo(() => {
    return tableData.length > 0 ? tableData[0] : null;
  }, [tableData]);

  const isSubmitDisabled = useMemo(() => {
    return (
      !record.email_template_id ||
      (record.data_source === 'csv' && tableData.length === 0) ||
      (record.data_source === 'form_submissions' &&
        (!record.form_id || tableData.length === 0)) ||
      (record.data_source === 'manual' && !record.send_to_emails)
    );
  }, [record, tableData.length]);

  const handleFormChange = useCallback(
    (formId) => {
      handleRecordChange({form_id: formId});
      if (formId) {
        handleFormSubmissionLoad(formId);
      } else {
        // Clear table data when no form is selected
        setTableData([]);
        setDataError(null);
      }
    },
    [handleRecordChange, handleFormSubmissionLoad]
  );

  return (
    <CreateFormWrapper
      onSubmit={(e) => handleSubmit(e, false)}
      modalMode={modalMode}
      loading={loading}
      title={t(`Create Campaign`)}
      customActions={
        <div className="flex gap-2">
          <Button
            type="button"
            className="shadow text-[14px] font-[600]"
            variant="outline"
            onClick={() => navigate('/campaigns')}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            className="shadow text-[14px] font-[600]"
            variant="outline"
          >
            {t('Save as Draft')}
          </Button>
          <Button
            type="button"
            className="shadow text-[14px] font-[600] bg-primary-main text-primary-contrastText"
            variant="filled"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSubmitDisabled}
            loading={loading}
          >
            {t('Save and Send')}
          </Button>
        </div>
      }
    >
      <LoadingOverlay visible={uploadLoading} />

      <H1>{t('Create Email Campaign')}</H1>

      {/* Basic Info */}
      <div className="mb-6 my-4">
        <H2>{t('Basic Information')}</H2>
        <div className="grid grid-cols-1 gap-4">
          <TextInput
            label={t('Campaign Name')}
            placeholder={t('Enter campaign name')}
            value={record.name}
            onChange={(e) => handleRecordChange({name: e.target.value})}
            required
          />

          <RecordSelect
            label={t('Email Template')}
            placeholder={t('Choose email template')}
            model="email_template"
            pageSize={1000}
            value={record.email_template_id}
            onChange={handleTemplateChange}
            displayField="name"
            required
          />
        </div>
      </div>

      {/* Scheduling */}
      <div className="mb-6">
        <H2>{t('Scheduling')}</H2>
        <div className="space-y-4">
          <Radio.Group
            value={record.send_type}
            onChange={(value) => handleRecordChange({send_type: value})}
            name="sendType"
          >
            <div className="flex gap-6">
              <Radio value="immediate" label={t('Send immediately')} />
              <Radio value="scheduled" label={t('Schedule send')} />
            </div>
          </Radio.Group>

          {record.send_type === 'scheduled' && (
            <DateTimePicker
              label={t('Scheduled Send Time')}
              placeholder={t('Choose date and time')}
              value={record.scheduled_at}
              onChange={(date) => handleRecordChange({scheduled_at: date})}
              minDate={new Date()}
            />
          )}
        </div>
      </div>

      {/* Data Source */}
      <div className="mb-6">
        <H2>{t('Data Source')}</H2>
        <Radio.Group
          value={record.data_source}
          onChange={handleDataSourceChange}
          name="dataSource"
          className="mb-4"
        >
          <div className="flex gap-6">
            <Radio value="manual" label={t('Manual Email List')} />
            <Radio value="csv" label={t('Upload CSV File')} />
            <Radio value="form_submissions" label={t('Form Submissions')} />
          </div>
        </Radio.Group>

        {record.data_source === 'csv' && (
          <FileInput
            label={t('Upload CSV File')}
            placeholder={t('Choose CSV file')}
            accept=".csv"
            value={csvFile}
            onChange={handleFileUpload}
            loading={uploadLoading}
          />
        )}

        {record.data_source === 'form_submissions' && (
          <RecordSelect
            label={t('Select Form')}
            placeholder={t('Choose form for submissions')}
            model="form"
            pageSize={100}
            value={record.form_id}
            onChange={handleFormChange}
            required
            renderOption={(data) => (
              <span>{data?.contents?.[0]?.title || `Form #${data?.id}`}</span>
            )}
            renderValue={(data) =>
              data?.contents?.[0]?.title || `Form #${data?.id}`
            }
          />
        )}

        {record.data_source === 'manual' && (
          <TextArea
            label={t('Send To (Email Addresses)')}
            description={t(
              'Enter email addresses, one per line or separated by commas'
            )}
            placeholder={t('john@example.com\njane@example.com\n...')}
            value={record.send_to_emails}
            onChange={(e) =>
              handleRecordChange({send_to_emails: e.target.value})
            }
            autosize
            minRows={3}
            maxRows={15}
            required
          />
        )}
      </div>

      {/* Data Preview */}
      {(record.data_source === 'csv' ||
        record.data_source === 'form_submissions') && (
        <PreviewDataTable
          data={tableData.slice(0, 5)}
          totalCount={tableData.length}
          loading={uploadLoading}
          error={dataError}
          className="mb-6"
        />
      )}

      {/* Email Preview */}
      <EmailPreview
        templateId={record.email_template_id}
        sampleData={sampleData}
        manualEmails={
          record.data_source === 'manual' ? record.send_to_emails : null
        }
        className="mb-6"
      />
    </CreateFormWrapper>
  );
}
