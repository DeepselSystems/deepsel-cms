import {Button, Group, Menu, Avatar} from '@mantine/core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTachometerAlt,
  faUser,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import {getAttachmentUrl} from '../../common/utils/index.js';
import BackendHostURLState from '../../common/stores/BackendHostURLState.js';
import {useTranslation} from 'react-i18next';
import useAuthentication from '../../common/api/useAuthentication.js';

export default function AdminHeader({
  dashboardPath,
  editPath,
  allowEdit = true,
}) {
  const {user, logout} = useAuthentication();
  const {t} = useTranslation();
  const {backendHost} = BackendHostURLState();

  if (!user) return null;

  return (
    <div className="bg-gray-100 border-b border-gray-200 py-2">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Group>
          <Button
            component="a"
            href={dashboardPath || '/admin/pages'}
            size="xs"
            variant="subtle"
            leftSection={<FontAwesomeIcon icon={faTachometerAlt} />}
          >
            Dashboard
          </Button>
          {editPath && allowEdit && (
            <Button
              component="a"
              href={editPath}
              size="xs"
              variant="light"
              color="blue"
              leftSection={<FontAwesomeIcon icon={faEdit} />}
            >
              Edit
            </Button>
          )}
        </Group>

        <Menu shadow="md" width={200}>
          <Menu.Target>
            <div className="flex gap-2 items-center cursor-pointer font-medium text-sm">
              <Avatar
                src={
                  user?.image?.name
                    ? getAttachmentUrl(backendHost, user.image.name)
                    : null
                }
                size="sm"
                radius="xl"
              >
                {!user?.image?.name && (user?.name?.[0] || user?.username?.[0])}
              </Avatar>
              <div className="text-gray-700 hidden sm:block">
                {user.name || user.username}
              </div>
            </div>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>{t('My account')}</Menu.Label>
            <Menu.Item
              component="a"
              href={`/admin/profile/${user.id}/edit`}
              leftSection={
                <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
              }
            >
              {t('Edit profile')}
            </Menu.Item>
            <Menu.Item
              onClick={logout}
              color="red"
              leftSection={
                <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
              }
            >
              {t('Logout')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  );
}
