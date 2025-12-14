import {
  faEarthAmericas,
  faNewspaper,
  faBars,
  faCog,
  faCode,
  faImage,
  faUser,
  faPalette,
} from '@fortawesome/free-solid-svg-icons';
import AppLayout from '../../common/layouts/AppLayout.jsx';

const navbarLinks = [
  {
    label: 'Pages',
    to: '/pages',
    icon: faEarthAmericas,
  },
  {
    label: 'Blog Posts',
    to: '/blog_posts',
    icon: faNewspaper,
  },
  {
    label: 'Templates',
    to: '/templates',
    icon: faCode,
    roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
  },
  {
    label: 'Themes',
    to: '/themes',
    icon: faPalette,
    roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
  },
  {
    label: 'Media',
    to: '/media',
    icon: faImage,
  },
  {
    label: 'Menus',
    to: '/menus',
    icon: faBars,
  },
  {
    label: 'Users',
    to: '/manage-users',
    icon: faUser,
    roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
  },
  {
    label: 'Site Settings',
    to: '/site-settings',
    icon: faCog,
    roleIds: ['super_admin_role', 'admin_role', 'website_admin_role'],
  },
];

export default function CMSLayout() {
  return <AppLayout navbarLinks={navbarLinks} showSiteSelector={true} />;
}
