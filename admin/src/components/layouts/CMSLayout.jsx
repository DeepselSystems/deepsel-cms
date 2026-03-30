import AppLayout from '../../common/layouts/AppLayout.jsx';
import {
  IconCode,
  IconMenu2,
  IconNews,
  IconPalette,
  IconPhoto,
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
    to: '/site-settings',
    icon: IconSettings,
    roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
  },
];

export default function CMSLayout() {
  return <AppLayout navbarLinks={navbarLinks} showSiteSelector={true} />;
}
