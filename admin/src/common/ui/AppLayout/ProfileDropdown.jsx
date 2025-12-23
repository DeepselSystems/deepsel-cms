import { Menu, Avatar } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { getAttachmentUrl } from '../../utils/index.js';
import BackendHostURLState from '../../stores/BackendHostURLState.js';
import useAuthentication from '../../api/useAuthentication.js';

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
          leftSection={<FontAwesomeIcon icon={faUser} className="h-4 w-4" />}
        >
          {t('Edit profile')}
        </Menu.Item>
        <Menu.Item
          onClick={logout}
          color="red"
          leftSection={<FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />}
        >
          {t('Logout')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default ProfileDropdown;
