import { useTranslation } from 'react-i18next';
import useModel from '../../../common/api/useModel.jsx';
import NotificationState from '../../../common/stores/NotificationState.js';
import Card from '../../../common/ui/Card.jsx';
import EditFormActionBar from '../../../common/ui/EditFormActionBar.jsx';
import FormViewSkeleton from '../../../common/ui/FormViewSkeleton.jsx';
import H1 from '../../../common/ui/H1.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import PasswordInput from '../../../common/ui/PasswordInput.jsx';
import { Select } from '@mantine/core';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';

const DEFAULT_ROLE_OPTIONS = [
  { value: 'website_admin_role', label: 'Website Admin' },
  { value: 'website_editor_role', label: 'Website Editor' },
  { value: 'website_author_role', label: 'Website Author' },
];

export default function KeycloakAuthSetting() {
  const { t } = useTranslation();
  const { record, setRecord, update, loading } = useModel('organization', {
    id: 1,
    autoFetch: true,
  });
  const { notify } = NotificationState();
  const { backendHost } = BackendHostURLState((state) => state);

  async function handleSubmit(e) {
    try {
      e.preventDefault();

      if (record.is_enabled_keycloak && record.is_enabled_google_sign_in) {
        notify({
          message: t(
            'Cannot enable Keycloak authentication when Google Sign-In is enabled. Please disable Google Sign-In first.',
          ),
          type: 'error',
        });
        return;
      }

      if (!record.is_enabled_keycloak) {
        record.keycloak_server_url = '';
        record.keycloak_realm_name = '';
        record.keycloak_client_id = '';
        record.keycloak_client_secret = '';
      }

      const updatedRecord = await update(record);
      setRecord(updatedRecord);
      notify({
        message: t('Keycloak Authentication Settings updated successfully!'),
        type: 'success',
      });
    } catch (error) {
      console.error(error);
      notify({
        message: error.message,
        type: 'error',
      });
    }
  }

  return (
    <form className="max-w-screen-xl m-auto my-[20px] px-[24px]" onSubmit={handleSubmit}>
      <EditFormActionBar loading={loading} />

      {record ? (
        <Card className="shadow-none border-none">
          <H1>{t('Keycloak Authentication Setting')}</H1>
          <div className="flex gap-2 my-2 flex-col max-w-[600px]">
            <Switch
              className="my-2"
              label={t('Enable Keycloak Authentication')}
              checked={record.is_enabled_keycloak}
              onChange={(e) =>
                setRecord({
                  ...record,
                  is_enabled_keycloak: e.currentTarget.checked,
                })
              }
            />
            {record.is_enabled_keycloak && (
              <div className="mt-2 space-y-4">
                <TextInput
                  label={t('Keycloak Server URL')}
                  value={record.keycloak_server_url || ''}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      keycloak_server_url: e.target.value,
                    })
                  }
                  placeholder="https://your-keycloak-server.com"
                />
                <TextInput
                  label={t('Realm Name')}
                  value={record.keycloak_realm_name || ''}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      keycloak_realm_name: e.target.value,
                    })
                  }
                  placeholder="master"
                />
                <TextInput
                  label={t('Client ID')}
                  value={record.keycloak_client_id || ''}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      keycloak_client_id: e.target.value,
                    })
                  }
                />
                <PasswordInput
                  label={t('Client Secret')}
                  size="md"
                  value={record.keycloak_client_secret || ''}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      keycloak_client_secret: e.target.value,
                    })
                  }
                />
                <Select
                  label={t('Default Role for New Users')}
                  data={DEFAULT_ROLE_OPTIONS}
                  value={record.keycloak_default_role || 'website_editor_role'}
                  onChange={(value) =>
                    setRecord({
                      ...record,
                      keycloak_default_role: value,
                    })
                  }
                />
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    {t('Redirect URI Configuration')}
                  </h4>
                  <p className="text-blue-700 text-sm mb-2">
                    {t('Add this URL to your Keycloak client valid redirect URIs:')}
                  </p>
                  <code className="block bg-white p-2 rounded border text-sm">
                    {window.location.origin}/admin/keycloak-callback
                  </code>
                </div>
                <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-medium text-amber-900 mb-2">{t('Important Notes')}</h4>
                  <ul className="text-amber-700 text-sm space-y-1">
                    <li>
                      {'\u2022'}{' '}
                      {t(
                        'Keycloak authentication cannot be enabled simultaneously with Google Sign-In',
                      )}
                    </li>
                    <li>
                      {'\u2022'}{' '}
                      {t(
                        'Make sure your Keycloak client has the proper scopes: openid, email, profile',
                      )}
                    </li>
                    <li>
                      {'\u2022'}{' '}
                      {t('Client Access Type should be set to "confidential" in Keycloak')}
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <FormViewSkeleton />
      )}
    </form>
  );
}
