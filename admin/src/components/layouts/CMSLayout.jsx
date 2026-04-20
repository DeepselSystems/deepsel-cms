import AppLayout from '../../common/layouts/AppLayout.jsx';
import {
  IconAdjustments,
  IconCode,
  IconDatabase,
  IconLock,
  IconMail,
  IconMenu2,
  IconNews,
  IconPalette,
  IconPhoto,
  IconRobot,
  IconSettings,
  IconUser,
  IconWorld,
} from '@tabler/icons-react';

const navbarLinks = [
  {
    label: 'Pages',
    to: '/pages',
    icon: IconWorld,
  },
  {
    label: 'Blog Posts',
    to: '/blog_posts',
    icon: IconNews,
  },
  {
    label: 'Templates',
    to: '/templates',
    icon: IconCode,
    roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
  },
  {
    label: 'Themes',
    to: '/themes',
    icon: IconPalette,
    roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
  },
  {
    label: 'Media',
    to: '/media',
    icon: IconPhoto,
  },
  {
    label: 'Menus',
    to: '/menus',
    icon: IconMenu2,
  },
  {
    label: 'Users',
    to: '/manage-users',
    icon: IconUser,
    roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
  },
  {
    label: 'Site Settings',
    icon: IconSettings,
    roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
    children: [
      {
        label: 'General',
        to: '/site-settings/general',
        icon: IconAdjustments,
        roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
      },
      {
        label: 'AI Settings',
        to: '/site-settings/ai',
        icon: IconRobot,
        roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
      },
      {
        label: 'Email Settings',
        to: '/smtp-settings',
        icon: IconMail,
        roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
      },
      {
        label: 'Authentication',
        to: '/site-settings/authentication',
        icon: IconLock,
        roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
      },
      {
        label: 'Backup & Restore',
        to: '/site-settings/backup',
        icon: IconDatabase,
        roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
      },
    ],
  },
];

export default function CMSLayout() {
  return <AppLayout navbarLinks={navbarLinks} showSiteSelector />;
}
