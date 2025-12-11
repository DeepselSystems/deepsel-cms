import {useState, useEffect, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate, useParams} from 'react-router-dom';
import {Alert, LoadingOverlay, Radio} from '@mantine/core';
import {DateTimePicker} from '@mantine/dates';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import useModel from '../../../common/api/useModel.jsx';
import NotificationState from '../../../common/stores/NotificationState.js';
import EditFormActionBar from '../../../common/ui/EditFormActionBar.jsx';
import H1 from '../../../common/ui/H1.jsx';
import H2 from '../../../common/ui/H2.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import TextArea from '../../../common/ui/TextArea.jsx';
import RecordSelect from '../../../common/ui/RecordSelect.jsx';
import FileInput from '../../../common/ui/FileInput.jsx';
import EmailPreview from './components/EmailPreview.jsx';
import PreviewDataTable from './components/PreviewDataTable.jsx';
import useFetch from '../../../common/api/useFetch.js';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export default function CampaignEdit() {
  const {t} = useTranslation();
  const {id} = useParams();
  const navigate = useNavigate();
  const {notify} = NotificationState((state) => state);

  const [record, setRecord] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dataError, setDataError] = useState(null);

  const query = useModel('email_campaign', {
    id,
    autoFetch: true,
  });
  const {record: campaignData, loading, update} = query;

  const {post: postParseCSV} = useFetch(`email_campaign/utils/parse-csv`);
  const {post: getFormSubmissions} = useFetch(
    `email_campaign/utils/get-form-submissions`
  );

  useEffect(() => {
    if (campaignData) {
      // Convert backend data to frontend format
      const frontendData = {
        ...campaignData,
        data_source: campaignData.use_table_data
          ? campaignData.form_id
            ? 'form_submissions'
            : 'csv'
          : 'manual',
        // Convert scheduled_at string to Date object for consistent handling
        scheduled_at: campaignData.scheduled_at
          ? dayjs.utc(campaignData.scheduled_at)
          : null,
      };
      setRecord(frontendData);

      // Load existing table data for preview
      if (
        campaignData.use_table_data &&
        campaignData.rows &&
        campaignData.rows.length > 0
      ) {
        const existingTableData = campaignData.rows.map((row) => row.row_data);
        setTableData(existingTableData);
      } else {
        // Clear table data for manual campaigns
        setTableData([]);
      }
    }
  }, [campaignData]);

  const handleFileUpload = async (file) => {
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
  };

  const handleFormSubmissionLoad = useCallback(
    async (formId) => {
      if (!formId) {
        setTableData([]);
        setDataError(null);
        return;
      }

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
        setTableData([]);
      } finally {
        setUploadLoading(false);
      }
    },
    [getFormSubmissions, notify, t]
  );

  const handleFormChange = (formId) => {
    setRecord({...record, form_id: formId});
    if (formId) {
      handleFormSubmissionLoad(formId);
    } else {
      setTableData([]);
      setDataError(null);
    }
  };

  const handleDataSourceChange = (value) => {
    setRecord({
      ...record,
      data_source: value,
      form_id: null, // Clear form selection
      send_to_emails: '', // Clear manual emails
    });
    setTableData([]);
    setDataError(null);
    setCsvFile(null);
  };

  const handleSubmit = async (e) => {
    try {
      e.preventDefault();

      if (!record) return;

      // Validation
      if (!record.name) {
        throw new Error(t('Campaign name is required'));
      }

      if (!record.email_template_id) {
        throw new Error(t('Email template is required'));
      }

      // Convert frontend data to backend format - exclude rows and other read-only fields
      const {
        rows: _rows,
        created_at: _created_at,
        updated_at: _updated_at,
        organization_id: _organization_id,
        stats: _stats,
        data_source: _data_source,
        ...updateFields
      } = record;
      const backendData = {
        ...updateFields,
        use_table_data: record.data_source !== 'manual',
      };

      // Add table data - either new CSV data or existing campaign rows data
      if (record.data_source !== 'manual') {
        if (tableData.length > 0) {
          // Use new CSV data if uploaded
          backendData.table_data = tableData;
        } else if (campaignData?.rows?.length > 0) {
          // Use existing campaign rows data if no new CSV uploaded
          backendData.table_data = campaignData.rows.map((row) => row.row_data);
        }
      }

      await update(backendData);

      notify({
        message: t('Campaign updated successfully!'),
        type: 'success',
      });

      // Refetch the campaign data to get the latest rows
      await query.getOne(id);

      navigate(`/campaigns/${id}`);
    } catch (error) {
      console.error(error);
      notify({
        message: error.message,
        type: 'error',
      });
    }
  };

  const canEdit = () => {
    return record && (record.status === 'draft' || record.status === 'paused');
  };

  if (loading || !record) {
    return (
      <div className="relative h-96">
        <LoadingOverlay visible />
      </div>
    );
  }

  if (!canEdit()) {
    return (
      <Alert
        color="yellow"
        title={t('Cannot Edit')}
        icon={<FontAwesomeIcon icon={faTriangleExclamation} />}
      >
        {t('Campaign can only be edited when in Draft or Paused status.')}
      </Alert>
    );
  }

  return (
    <main className="m-auto p-10">
      <form onSubmit={handleSubmit}>
        <EditFormActionBar
          title={t('Edit Campaign')}
          onSave={handleSubmit}
          onCancel={() => navigate(`/campaigns/${id}`)}
          loading={loading}
        />

        <div className="mt-6 space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <H1>{t('Edit Campaign')}</H1>

            <div className="mt-6 space-y-6">
              {/* Basic Info */}
              <div>
                <H2>{t('Basic Information')}</H2>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <TextInput
                    label={t('Campaign Name')}
                    placeholder={t('Enter campaign name')}
                    value={record.name || ''}
                    onChange={(e) =>
                      setRecord({...record, name: e.target.value})
                    }
                    required
                  />

                  <RecordSelect
                    label={t('Email Template')}
                    placeholder={t('Choose email template')}
                    model="email_template"
                    value={record.email_template_id}
                    onChange={(templateId) =>
                      setRecord({...record, email_template_id: templateId})
                    }
                    displayField="name"
                    required
                  />
                </div>
              </div>

              {/* Scheduling Settings */}
              <div>
                <H2>{t('Scheduling Settings')}</H2>
                <div className="space-y-4 mt-4">
                  <Radio.Group
                    value={record.send_type}
                    onChange={(value) =>
                      setRecord({...record, send_type: value})
                    }
                    name="sendType"
                    disabled={record.status !== 'draft'}
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
                      value={
                        record.scheduled_at
                          ? dayjs.utc(record.scheduled_at)
                          : null
                      }
                      onChange={(date) =>
                        setRecord({...record, scheduled_at: date})
                      }
                      minDate={new Date()}
                    />
                  )}
                </div>
              </div>

              {/* Data Source Settings */}
              <div>
                <H2>{t('Data Source Settings')}</H2>

                <div className="space-y-4 mt-4">
                  <Radio.Group
                    value={record.data_source}
                    onChange={handleDataSourceChange}
                    name="dataSource"
                    disabled={record.status !== 'draft'}
                  >
                    <div className="flex gap-6">
                      <Radio value="manual" label={t('Manual Email List')} />
                      <Radio value="csv" label={t('Upload CSV File')} />
                      <Radio
                        value="form_submissions"
                        label={t('Form Submissions')}
                      />
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
                      disabled={record.status !== 'draft'}
                    />
                  )}

                  {record.data_source === 'manual' && (
                    <TextArea
                      label={t('Send To (Email Addresses)')}
                      description={t(
                        'Enter email addresses, one per line or separated by commas'
                      )}
                      placeholder={t('john@example.com\njane@example.com\n...')}
                      value={record.send_to_emails || ''}
                      onChange={(e) =>
                        setRecord({...record, send_to_emails: e.target.value})
                      }
                      minRows={10}
                    />
                  )}

                  {record.data_source === 'form_submissions' && (
                    <div>
                      <RecordSelect
                        label={t('Select Form')}
                        placeholder={t('Choose form for submissions')}
                        model="form"
                        value={record.form_id}
                        onChange={handleFormChange}
                        disabled={record.status !== 'draft'}
                        required
                        renderOption={(data) => (
                          <span>
                            {data?.contents?.[0]?.title || `Form #${data?.id}`}
                          </span>
                        )}
                        renderValue={(data) =>
                          data?.contents?.[0]?.title || `Form #${data?.id}`
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Data Preview */}
            {tableData.length > 0 && record.data_source != 'manual' && (
              <div>
                <PreviewDataTable
                  data={tableData.slice(0, 5)}
                  totalCount={tableData.length}
                  loading={uploadLoading}
                  error={dataError}
                  className="mt-4"
                />
              </div>
            )}

            {/* Email Preview */}
            {record.email_template_id && (
              <div>
                <EmailPreview
                  templateId={record.email_template_id}
                  sampleData={tableData.length > 0 ? tableData[0] : null}
                  manualEmails={
                    record.data_source === 'manual'
                      ? record.send_to_emails
                      : null
                  }
                  className="mt-4"
                />
              </div>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
