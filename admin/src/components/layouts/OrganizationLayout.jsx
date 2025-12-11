import {useTranslation} from 'react-i18next';
import {
  faUser,
  faUsersGear,
  faSliders,
  faWrench,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import AppLayout from '../../common/layouts/AppLayout.jsx';
import {faGoogle} from '@fortawesome/free-brands-svg-icons';

const navbarLinks = [
  {
    label: 'Users',
    to: '/users',
    icon: faUser,
    roleIds: ['super_admin_role', 'admin_role'],
  },
  {
    label: 'Roles',
    to: '/roles',
    icon: faUsersGear,
    roleIds: ['super_admin_role', 'admin_role'],
  },
  {
    label: 'Settings',
    // to: "/organization-settings",
    icon: faWrench,
    roleIds: ['super_admin_role', 'admin_role'],
    children: [
      {
        label: 'General',
        to: '/organization-settings',
        icon: faSliders,
        roleIds: ['super_admin_role', 'admin_role'],
      },
      {
        label: 'Scheduled Actions',
        to: '/crons',
        icon: faClock,
        roleIds: ['super_admin_role', 'admin_role'],
      },
      {
        label: 'Google Sign-In',
        to: '/google-sign-in-settings',
        icon: faGoogle,
        roleIds: ['super_admin_role', 'admin_role'],
      },
      {
        label: 'SAML SSO',
        to: '/saml-settings',
        icon: faUsersGear,
        roleIds: ['super_admin_role', 'admin_role'],
      },
    ],
  },
];
export default function OrganizationLayout() {
  const {t} = useTranslation();
  return <AppLayout navbarLinks={navbarLinks} />;
}
