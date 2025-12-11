import {Menu} from '@mantine/core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBell} from '@fortawesome/free-solid-svg-icons';
import {useTranslation} from 'react-i18next';
import NotificationList from '../../notification/NotificationList.jsx';

const NotificationsDropdown = () => {
  const {t} = useTranslation();

  return (
    <Menu shadow="md" width={300}>
      <Menu.Target>
        {/*<Indicator label="5" color="red" size={13}>*/}
        <div>
          <FontAwesomeIcon
            icon={faBell}
            className="cursor-pointer h-3.5 w-3.5"
          />
        </div>
        {/*</Indicator>*/}
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{t('Notifications')}</Menu.Label>
        <NotificationList />
      </Menu.Dropdown>
    </Menu>
  );
};

export default NotificationsDropdown;
