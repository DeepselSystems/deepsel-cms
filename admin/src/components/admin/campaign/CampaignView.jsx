import {useTranslation} from 'react-i18next';
import {useParams} from 'react-router-dom';
import {Badge, Progress, Alert, LoadingOverlay} from '@mantine/core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faPause,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import useModel from '../../../common/api/useModel.jsx';
import useFetch from '../../../common/api/useFetch.js';
import NotificationState from '../../../common/stores/NotificationState.js';
import ViewFormActionBar from '../../../common/ui/ViewFormActionBar.jsx';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import H1 from '../../../common/ui/H1.jsx';
import H2 from '../../../common/ui/H2.jsx';
import ReadOnlyField from '../../../common/ui/ReadOnlyField.jsx';
import Button from '../../../common/ui/Button.jsx';
import RecordDisplay from '../../../common/ui/RecordDisplay.jsx';
import CampaignRowsTable from './components/CampaignRowsTable.jsx';
import EmailPreview from './components/EmailPreview.jsx';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export default function CampaignView() {
  const {t} = useTranslation();
  const {id} = useParams();
  const {notify} = NotificationState((state) => state);

  const query = useModel('email_campaign', {
    id,
    autoFetch: true,
  });
  const {record, loading, error, getOne} = query;

  const {post: sendCampaign, loading: sendLoading} = useFetch(
    `email_campaign/${id}/send`
  );
  const {post: pauseCampaign, loading: pauseLoading} = useFetch(
    `email_campaign/${id}/pause`
  );
  const {post: resumeCampaign, loading: resumeLoading} = useFetch(
    `email_campaign/${id}/resume`
  );

  const handleCampaignAction = async (action) => {
    try {
      let result;

      if (action === 'send') {
        result = await sendCampaign({});
      } else if (action === 'pause') {
        result = await pauseCampaign({});
      } else if (action === 'resume') {
        result = await resumeCampaign({});
      }

      // Special message for send action about background processing
      if (action === 'send') {
        notify({
          message: t(
            'Campaign started! Processing in background - refresh page to see email progress.'
          ),
          type: 'success',
          duration: 8000,
        });
      } else {
        notify({
          message: result?.message || t(`Campaign ${action}ed successfully!`),
          type: 'success',
        });
      }

      // Refresh the record
      await getOne(id);
    } catch (error) {
      console.error(error);
      notify({
        message: error.message || t(`Failed to ${action} campaign`),
        type: 'error',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'gray';
      case 'queued':
        return 'orange';
      case 'pending':
        return 'cyan';
      case 'sending':
        return 'blue';
      case 'paused':
        return 'yellow';
      case 'completed':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'draft':
        return t('Draft');
      case 'queued':
        return t('Queued');
      case 'pending':
        return t('Pending');
      case 'sending':
        return t('Sending');
      case 'paused':
        return t('Paused');
      case 'completed':
        return t('Completed');
      default:
        return status;
    }
  };

  const renderActionButton = () => {
    if (!record) return null;

    if (record.status === 'draft') {
      return (
        <Button
          color="primary"
          onClick={() => handleCampaignAction('send')}
          disabled={sendLoading}
          loading={sendLoading}
          leftSection={<FontAwesomeIcon icon={faPlay} />}
        >
          {t('Send Campaign')}
        </Button>
      );
    }

    if (record.status === 'sending' || record.status === 'queued') {
      return (
        <Button
          color="yellow"
          onClick={() => handleCampaignAction('pause')}
          disabled={pauseLoading}
          loading={pauseLoading}
          leftSection={<FontAwesomeIcon icon={faPause} />}
        >
          {t('Pause Campaign')}
        </Button>
      );
    }

    if (record.status === 'paused') {
      return (
        <Button
          color="blue"
          onClick={() => handleCampaignAction('resume')}
          disabled={resumeLoading}
          loading={resumeLoading}
          leftSection={<FontAwesomeIcon icon={faPlay} />}
        >
          {t('Resume Campaign')}
        </Button>
      );
    }

    return null;
  };

  const getProgressText = () => {
    if (!record?.stats) return '0/0';
    return `${record.stats.sent_emails + record.stats.failed_emails}/${record.stats.total_emails}`;
  };

  const getProgressPercentage = () => {
    if (!record?.stats || record.stats.total_emails === 0) return 0;
    return (
      ((record.stats.sent_emails + record.stats.failed_emails) /
        record.stats.total_emails) *
      100
    );
  };

  if (loading) {
    return (
      <div className="relative h-96">
        <LoadingOverlay visible />
      </div>
    );
  }

  if (error || !record) {
    return (
      <Alert
        color="red"
        title={t('Error')}
        icon={<FontAwesomeIcon icon={faTriangleExclamation} />}
      >
        {error || t('Campaign not found')}
      </Alert>
    );
  }

  return (
    <main className="max-w-screen-xl m-auto my-[30px] px-[24px]">
      <ViewFormActionBar
        query={query}
        allowEdit={
          record && (record.status === 'draft' || record.status === 'paused')
        }
        allowDelete={record && record.status === 'draft'}
      />

      {record ? (
        <div className="mt-4 space-y-4">
          {/* Campaign Header with Name, Status & Actions */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <H1 className="mb-0">{record.name}</H1>
                <Badge size="lg" color={getStatusColor(record.status)}>
                  {getStatusText(record.status)}
                </Badge>
              </div>
              <div className="flex gap-2">{renderActionButton()}</div>
            </div>

            {/* Progress Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  {t('Progress')}
                </div>
                <div className="text-lg font-semibold flex items-center gap-2">
                  <span className="min-w-[30px]">{getProgressText()}</span>
                  <span>{t('Emails sent')}</span>
                </div>
                <Progress
                  value={getProgressPercentage()}
                  size="sm"
                  className="mt-1"
                  color={record.status === 'completed' ? 'green' : 'blue'}
                />
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">{t('Sent')}</div>
                <div className="text-lg font-semibold text-green-600">
                  {record?.stats?.sent_emails || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">{t('Failed')}</div>
                <div className="text-lg font-semibold text-red-600">
                  {record?.stats?.failed_emails || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">{t('Created')}</div>
                <div className="text-sm">
                  {dayjs.utc(record.created_at).format('DD/MM/YYYY HH:mm')}
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Information */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <H2 className="mb-3">{t('Campaign Information')}</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <RecordDisplay
                  label={t('Email Template')}
                  value={record.email_template?.name}
                  linkTo={`/email_templates/${record.email_template_id}`}
                />
              </div>

              <div>
                {record.use_table_data && record.form_id ? (
                  <RecordDisplay
                    label={t('Data Source')}
                    value={
                      record.form?.contents?.[0]?.title ||
                      `Form #${record.form_id}`
                    }
                    linkTo={`/forms/${record.form_id}`}
                  />
                ) : (
                  <ReadOnlyField
                    label={t('Data Source')}
                    value={
                      record.use_table_data
                        ? t('CSV Upload')
                        : t('Manual Email List')
                    }
                  />
                )}
              </div>

              <ReadOnlyField
                label={t('Send Type')}
                value={
                  record.send_type === 'immediate'
                    ? t('Send Immediately')
                    : t('Scheduled')
                }
              />

              {record.send_type != 'immediate' && (
                <ReadOnlyField
                  label={t('Scheduled At')}
                  value={
                    record.scheduled_at
                      ? dayjs
                          .utc(record.scheduled_at)
                          .format('DD/MM/YYYY HH:mm')
                      : '-'
                  }
                />
              )}
            </div>

            {!record.use_table_data && record.send_to_emails && (
              <div className="mt-4">
                <ReadOnlyField
                  label={t('Send To Emails')}
                  value={record.send_to_emails}
                  multiline
                />
              </div>
            )}
          </div>

          {/* Campaign Recipients */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <H2 className="mb-3">{t('Campaign Recipients')}</H2>
            <CampaignRowsTable rows={record.rows} />
          </div>

          {/* Email Preview */}
          {record.email_template && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <EmailPreview
                templateId={record.email_template_id}
                sampleData={record.rows?.[0]?.row_data}
                manualEmails={
                  !record.use_table_data ? record.send_to_emails : undefined
                }
              />
            </div>
          )}
        </div>
      ) : (
        <FormViewSkeleton />
      )}
    </main>
  );
}
