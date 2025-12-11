import {useTranslation} from 'react-i18next';
import {useState} from 'react';
import dayjs from 'dayjs';
import Card from '../../../common/ui/Card.jsx';
import H1 from '../../../common/ui/H1.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import useModel from '../../../common/api/useModel.jsx';
import {useParams} from 'react-router-dom';
import ReadOnlyField from '../../../common/ui/ReadOnlyField.jsx';
import ViewFormActionBar from '../../../common/ui/ViewFormActionBar.jsx';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import RecordDisplay from '../../../common/ui/RecordDisplay.jsx';
import IframeContent from '../../../common/ui/IframeContent.jsx';
import {Badge} from '@mantine/core';
import Editor from 'react-simple-code-editor';
import {highlight, languages} from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-jsx';
import 'prismjs/themes/prism.css';

export default function EmailOutboxView() {
  const {t} = useTranslation();
  const {id} = useParams();
  const query = useModel('email_out', {
    id,
    autoFetch: true,
  });

  const {record} = query;
  const [showRawContent, setShowRawContent] = useState(false);

  const getStatusText = (status) => {
    switch (status) {
      case 'sending':
        return t('Sending');
      case 'sent':
        return t('Sent Successfully');
      case 'failed':
        return t('Failed');
    }
  };

  return (
    <main className={`mx-auto p-10`}>
      <ViewFormActionBar query={query} allowEdit={false} />

      {record ? (
        <Card className="mt-6">
          <div className="flex justify-between">
            <H1>{t('Outgoing E-Mail')}</H1>
          </div>

          <div className={`mt-6 grid grid-cols-3 w-full gap-8 items-start`}>
            <ReadOnlyField label={t('Subject')} value={record.subject} />
            <ReadOnlyField
              label={t('Recipients')}
              value={record.recipients}
              className="break-words"
            />
            <ReadOnlyField
              label={t('Created at')}
              value={dayjs
                .utc(record.created_at)
                .local()
                .format('DD/MM/YYYY HH:mm')}
            />

            <ReadOnlyField
              label={t('Status')}
              value={
                <Badge
                  color={
                    record.status === 'sending'
                      ? 'yellow'
                      : record.status === 'sent'
                        ? 'green'
                        : 'red'
                  }
                >
                  {getStatusText(record.status)}
                </Badge>
              }
            />

            <div>
              {record.email_campaign ? (
                <RecordDisplay
                  label={t('Campaign')}
                  value={record.email_campaign.name}
                  linkTo={`/campaigns/${record.email_campaign.id}`}
                />
              ) : (
                <ReadOnlyField
                  label={t('Campaign')}
                  value={
                    <span className="text-gray-500">{t('Manual Email')}</span>
                  }
                />
              )}
            </div>

            {record.status === 'failed' && (
              <ReadOnlyField label={t('Error')} value={record.error} />
            )}
          </div>

          <Switch
            className="mt-8"
            label={t('View raw content')}
            checked={showRawContent}
            onChange={() => setShowRawContent(!showRawContent)}
          />
          <div
            className={`grid ${showRawContent ? 'grid-cols-2' : ''} gap-2 my-2`}
          >
            {showRawContent && (
              <div
                className={`max-h-[600px] overflow-y-auto border border-gray-border rounded`}
              >
                <Editor
                  className="w-full min-h-full"
                  value={record?.content}
                  readOnly
                  highlight={(code) => highlight(code, languages.jsx, 'jsx')}
                  padding={10}
                  style={{
                    fontSize: 12,
                    backgroundColor: '#f6f8fa',
                  }}
                />
              </div>
            )}
            <div className={`grow h-[600px]`}>
              <IframeContent
                html={record.content}
                className={`w-full h-full`}
              />
            </div>
          </div>
        </Card>
      ) : (
        <FormViewSkeleton />
      )}
    </main>
  );
}
