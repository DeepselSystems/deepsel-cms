import {
  faWrench,
  faEnvelopeOpenText,
  faCode,
  faBullhorn,
} from '@fortawesome/free-solid-svg-icons';
import AppLayout from '../../common/layouts/AppLayout.jsx';

const navbarLinks = [
  {
    label: 'Campaigns',
    to: '/campaigns',
    icon: faBullhorn,
    roleIds: ['super_admin_role', 'admin_role'],
  },
  {
    label: 'Outbox',
    to: '/email_outbox',
    icon: faEnvelopeOpenText,
    roleIds: ['super_admin_role', 'admin_role'],
  },
  {
    label: 'Email Templates',
    to: '/email_templates',
    icon: faCode,
    roleIds: ['super_admin_role', 'admin_role'],
  },
  {
    label: 'Email Settings',
    to: '/smtp_settings',
    icon: faWrench,
    roleIds: ['super_admin_role', 'admin_role'],
  },
];
export default function EmailLayout() {
  return <AppLayout navbarLinks={navbarLinks} />;
}
