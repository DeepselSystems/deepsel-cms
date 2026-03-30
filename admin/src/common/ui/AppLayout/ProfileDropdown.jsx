import { Menu, Avatar } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAttachmentUrl } from '../../utils/index.js';
import BackendHostURLState from '../../stores/BackendHostURLState.js';
import useAuthentication from '../../api/useAuthentication.js';
import { IconArrowLeft, IconUser } from '@tabler/icons-react';

const ProfileDropdown = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { backendHost } = BackendHostURLState();
  const { user, logout } = useAuthentication();

  if (!user) return null;

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <div className="flex gap-2 items-center cursor-pointer font-[500] text-[13px]">
          <Avatar
            name={user.name || user.username || ''}
            color="initials"
            src={user?.image?.name ? getAttachmentUrl(backendHost, user.image.name) : null}
            size="md"
          />
          <div className="text-primary-main text-md font-semibold">
            {user.name || user.username || ''}
          </div>
        </div>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{t('My account')}</Menu.Label>
        <Menu.Item
          onClick={() => navigate(`/profile/${user.id}/edit`)}
          leftSection={<IconUser size={16} />}
        >
          {t('Edit profile')}
        </Menu.Item>
        <Menu.Item onClick={logout} color="red" leftSection={<IconArrowLeft size={16} />}>
          {t('Logout')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default ProfileDropdown;
