import { useTranslation } from 'react-i18next';
import useModel from '../api/useModel.jsx';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { faEllipsis, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Menu, Tooltip } from '@mantine/core';

function Notification({ notification, onDelete }) {
  const { t } = useTranslation();
  const time = dayjs.utc(notification.created_at).local().format('MMMM D, YYYY h:mm A');
  const relativeTime = dayjs.utc(notification.created_at).local().fromNow();
  return (
    <div className={`p-2`}>
      <div className={`text-xs text-gray-main flex items-center justify-between`}>
        <Tooltip label={time}>
          <div className={`cursor-default`}>{t(relativeTime)}</div>
        </Tooltip>

        <Menu shadow="md" width={100}>
          <Menu.Target>
            <button>
              <FontAwesomeIcon icon={faEllipsis} />
            </button>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              color="red"
              leftSection={<FontAwesomeIcon icon={faTrash} />}
              onClick={() => onDelete(notification.id)}
            >
              {t('Delete')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
      <Link to={notification.link} className={`block`}>
        {notification.content}
      </Link>
    </div>
  );
}

export default function NotificationList() {
  const { t } = useTranslation();
  const {
    data: notifications,
    del,
    get,
  } = useModel('notification', {
    autoFetch: true,
  });

  async function onDelete(id) {
    await del(id);
    await get();
  }

  return (
    <div>
      {notifications?.length > 0 ? (
        notifications.map((notification) => (
          <Notification key={notification.id} notification={notification} onDelete={onDelete} />
        ))
      ) : (
        <div className={`text-sm p-3 text-gray-main`}>{t('Nothing here yet.')}</div>
      )}
    </div>
  );
}
