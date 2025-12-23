import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../../../common/ui/Card.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import H1 from '../../../common/ui/H1.jsx';
import useModel from '../../../common/api/useModel.jsx';
import NotificationState from '../../../common/stores/NotificationState.js';
import { useNavigate } from 'react-router-dom';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import EditFormActionBar from '../../../common/ui/EditFormActionBar.jsx';
import PasswordInput from '../../../common/ui/PasswordInput.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import FindGoodConfigModal from './components/FindGoodConfigModal.jsx';
import Button from '../../../common/ui/Button.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlask } from '@fortawesome/free-solid-svg-icons';

export default function SMTPSettings() {
  const { t } = useTranslation();
  const query = useModel('organization', {
    id: 1,
    autoFetch: true,
  });
  const { record, setRecord, update, loading } = query;
  const { notify } = NotificationState();
  const navigate = useNavigate();

  /**
   * React Ref - Find good config modal
   * @type {React.MutableRefObject<{open: *}>}
   */
  const findGoodConfigModalRef = React.useRef({
    open: () => {},
  });

  async function handleSubmit(e) {
    try {
      e.preventDefault();
      await Promise.all([update(record)]);
      notify({
        message: t('Email Settings updated successfully!'),
        type: 'success',
      });
      navigate(-1);
    } catch (error) {
      console.error(error);
      notify({
        message: error.message,
        type: 'error',
      });
    }
  }

  return (
    <>
      <form className={`max-w-screen-xl m-auto my-[20px] px-[24px]`} onSubmit={handleSubmit}>
        <EditFormActionBar loading={loading} showBack={false} />

        {record ? (
          <Card className={`shadow-none border-none`}>
            <H1>{t('Email Settings')}</H1>
            {/*Main content with left and right sections*/}
            <div className={`flex gap-16 my-2 mt-10`}>
              {/* Left section - SMTP Settings */}
              <div className={`flex gap-2 flex-col max-w-[300px]`}>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('SMTP Settings')}</h3>
                <TextInput
                  label={t('SMTP Server')}
                  value={record.mail_server}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_server: e.target.value,
                    })
                  }
                />
                <TextInput
                  label={t('SMTP Port')}
                  value={record.mail_port}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_port: e.target.value,
                    })
                  }
                />
                <TextInput
                  label={t('SMTP Username')}
                  value={record.mail_username}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_username: e.target.value,
                    })
                  }
                />
                <PasswordInput
                  label={t('SMTP Password')}
                  value={record.mail_password}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_password: e.target.value,
                    })
                  }
                />
                <TextInput
                  label={t('From Name')}
                  value={record.mail_from_name}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_from_name: e.target.value,
                    })
                  }
                />
                <TextInput
                  label={t('From Email')}
                  value={record.mail_from}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_from: e.target.value,
                    })
                  }
                  type="email"
                />
                <Switch
                  className={`my-2`}
                  label={t('Validate Certificates')}
                  checked={record.mail_validate_certs}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_validate_certs: e.currentTarget.checked,
                    })
                  }
                />
                <Switch
                  className={`my-2`}
                  label={t('Use Credentials')}
                  checked={record.mail_use_credentials}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_use_credentials: e.currentTarget.checked,
                    })
                  }
                />
                <Switch
                  className={`my-2`}
                  label={t('SSL/TLS')}
                  checked={record.mail_ssl_tls}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_ssl_tls: e.currentTarget.checked,
                    })
                  }
                />
                <Switch
                  className={`my-2`}
                  label={t('STARTTLS')}
                  checked={record.mail_starttls}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_starttls: e.currentTarget.checked,
                    })
                  }
                />

                <Button onClick={findGoodConfigModalRef.current.open}>
                  <FontAwesomeIcon icon={faFlask} className="mr-2" />
                  Find Good Configuration
                </Button>
              </div>

              {/* Right section - Send Rate Limit */}
              <div className={`flex gap-2 flex-col max-w-[300px]`}>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('Send Rate Limit')}</h3>
                <TextInput
                  label={t('Send Rate Limit - Per Hour')}
                  value={record.mail_send_rate_limit_per_hour || ''}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      mail_send_rate_limit_per_hour: e.target.value,
                    })
                  }
                  type="number"
                  min="0"
                  placeholder="200"
                  description={t('Maximum emails per hour. Set to 0 for unlimited sending.')}
                />
              </div>
            </div>
          </Card>
        ) : (
          <FormViewSkeleton />
        )}
      </form>

      {/*region modal for finding good config modal*/}
      <FindGoodConfigModal ref={findGoodConfigModalRef} />
      {/*endregion modal for finding good config modal*/}
    </>
  );
}
