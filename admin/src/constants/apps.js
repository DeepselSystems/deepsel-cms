import {faEnvelope, faPenRuler} from '@fortawesome/free-solid-svg-icons';

export default [
  {
    label: 'CMS',
    icon: faPenRuler,
    className: 'text-blue-600 bg-white',
    to: '/pages',
    roleIds: [
      'admin_role',
      'super_admin_role',
      'website_admin_role',
      'website_author_role',
      'website_editor_role',
    ],
  },
  {
    label: 'Email',
    icon: faEnvelope,
    className: 'text-red-600 bg-white',
    to: '/campaigns',
    roleIds: ['admin_role', 'super_admin_role'],
  },
];
