import { useDisclosure } from '@mantine/hooks';
import { AppShell, Burger } from '@mantine/core';
import { Link, Outlet } from 'react-router-dom';
import useAuthentication from '../api/useAuthentication.js';
import useUserPreferences from '../api/useUserPreferences.js';
import NavigationLinks from '../ui/AppLayout/NavigationLinks.jsx';
import AppsDropdown from '../ui/AppLayout/AppsDropdown.jsx';
import ProfileDropdown from '../ui/AppLayout/ProfileDropdown.jsx';
import NotificationsDropdown from '../ui/AppLayout/NotificationsDropdown.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUsers } from '@fortawesome/free-solid-svg-icons';
import Notification from '../notification/Notification.jsx';
import Button from '../ui/Button.jsx';
import apps from '../../constants/apps.js';
import trackingSettings from '../../constants/trackingSettings.js';
import { useTranslation } from 'react-i18next';
import SidebarState from '../stores/SidebarState.js';
import ShowHeaderBackButtonState from '../stores/ShowHeaderBackButtonState.js';
import useBack from '../hooks/useBack.js';
import NavigationConfirmationState from '../stores/NavigationConfirmationState.js';
import { useEffect, useMemo } from 'react';
import LangSwitcher from '../ui/AppLayout/LangSwitcher.jsx';
import SiteSelector from '../ui/SiteSelector.jsx';
import OrganizationIdState from '../stores/OrganizationIdState.js';
import VisibilityControl from '../auth/VisibilityControl.jsx';
import { useNavigate } from 'react-router-dom';
import { faSquareArrowUpRight } from '@fortawesome/free-solid-svg-icons';

export default function AppLayout(props) {
  const {
    navbarLinks,
    navbarWidth = 220,
    headerHeight = 50,
    breakpoint = 'sm',
    showApps = true,
    showSiteSelector = false,
  } = props;
  const [opened, { toggle }] = useDisclosure();
  const { user } = useAuthentication();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    isCollapsed,
    temporaryOverride,
    setUserPreferenceCollapsed,
    setToggleFunction,
    temporaryToggle,
  } = SidebarState();
  const { showBackButton } = ShowHeaderBackButtonState();
  const { back } = useBack();
  const { confirmNavigation } = NavigationConfirmationState();
  const { organizationId, setOrganizationId } = OrganizationIdState((state) => state);

  // Check if there are any visible navigation links for the current user
  const hasVisibleNavLinks = useMemo(() => {
    if (!navbarLinks?.length || !user) {
      return false;
    }

    const userRoleIds = user?.all_roles?.map((rec) => rec.string_id) || [];

    const checkLinkVisibility = (links) => {
      return links.some((link) => {
        const isVisible = link.roleIds
          ? link.roleIds.some((roleId) => userRoleIds.includes(roleId))
          : true;

        if (isVisible) return true;

        // Check children recursively
        if (link.children?.length > 0) {
          return checkLinkVisibility(link.children);
        }

        return false;
      });
    };

    const result = checkLinkVisibility(navbarLinks);
    return result;
  }, [navbarLinks, user?.all_roles]);

  // User preference for sidebar collapse (desktop only)
  const { value: sidebarCollapsed, setValue: setSidebarCollapsed } = useUserPreferences(
    'sidebarCollapsed',
    {
      defaultValue: false,
    },
  );

  const toggleSidebarCollapse = () => {
    // If there's a temporary override active, use temporaryToggle
    // Otherwise, use normal user preference toggle
    if (temporaryOverride !== null) {
      temporaryToggle();
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Sync user preference with store
  useEffect(() => {
    setUserPreferenceCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed, setUserPreferenceCollapsed]);

  // Provide toggle function to store
  useEffect(() => {
    setToggleFunction(toggleSidebarCollapse);
  }, [setToggleFunction]);

  const adjustedApps = [
    ...apps,
    {
      label: 'Organization',
      icon: faUsers,
      className: 'bg-white text-slate-500',
      to: '/users',
      roleIds: ['super_admin_role', 'admin_role'],
    },
  ];

  return (
    <>
      <AppShell
        header={{
          height: headerHeight,
        }}
        navbar={{
          width: hasVisibleNavLinks ? navbarWidth : 0,
          breakpoint,
          collapsed: {
            mobile: !opened,
            desktop: isCollapsed,
          },
        }}
        padding="md"
      >
        <AppShell.Header withBorder={false} className="shadow">
          <div className={`flex items-center justify-between h-full px-2`}>
            <div className={`flex items-center h-full gap-2`}>
              {hasVisibleNavLinks && (
                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              )}
              {hasVisibleNavLinks && (
                <button
                  onClick={toggleSidebarCollapse}
                  className="hidden sm:flex items-center justify-center w-10 h-10 hover:bg-white/20 rounded border border-white/20 transition-colors cursor-pointer"
                  title={sidebarCollapsed ? t('Expand sidebar') : t('Collapse sidebar')}
                >
                  <img src="/images/sidebar.png" alt="Toggle sidebar" className="h-6 w-6" />
                </button>
              )}
              {showBackButton && (
                <Button
                  onClick={() => confirmNavigation(back)}
                  variant="subtle"
                  size="sm"
                  leftSection={<FontAwesomeIcon icon={faArrowLeft} />}
                >
                  {t('Back')}
                </Button>
              )}

              {/*region site selector*/}
              {showSiteSelector && (
                <VisibilityControl
                  roleIds={[
                    'super_admin_role',
                    'admin_role',
                    'website_admin_role',
                    'website_editor_role',
                    'website_author_role',
                  ]}
                >
                  <div className="flex items-center gap-2 ml-4">
                    <div className="text-sm font-semibold hidden lg:block">{t('Select Site')}</div>
                    <SiteSelector
                      inputClassNames={{ input: 'md:!min-w-52 !border-gray-200' }}
                      value={organizationId ? { id: organizationId } : null}
                      setValue={(value) => setOrganizationId(value?.id || null)}
                      onAddClick={() => navigate('/sites/new')}
                    />
                  </div>
                </VisibilityControl>
              )}
              {/*endregion site selector*/}
              <a href="/" target="_blank" className="block my-2 w-8 h-8">
                <FontAwesomeIcon
                  icon={faSquareArrowUpRight}
                  className="w-full h-full text-xl text-primary-main hover:translate-y-0.5 transition-all"
                />
              </a>
            </div>
            <div className={`flex items-center gap-4`}>
              {(trackingSettings.enableAnonUsers ? user?.signed_up === true : user) ? (
                <>
                  <LangSwitcher />

                  <AppsDropdown apps={adjustedApps} showApps={showApps} />

                  {/*notifications dropdown   */}
                  <NotificationsDropdown />

                  {/*profile dropdown*/}
                  <ProfileDropdown />
                </>
              ) : (
                <Link to={`/login`}>
                  <Button>{t('Login')}</Button>
                </Link>
              )}
            </div>
          </div>
        </AppShell.Header>

        {hasVisibleNavLinks && (
          <AppShell.Navbar
            withBorder={false}
            className="text-primary-contrastText p-2 shadow-lg flex flex-col justify-between"
            style={{
              backgroundImage: `linear-gradient(120deg, var(--color-primary-900) 0%, var(--color-primary-850) 100%)`,
            }}
          >
            <div>
              <NavigationLinks links={navbarLinks} user={user} opened={opened} toggle={toggle} />
            </div>
          </AppShell.Navbar>
        )}

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>

      <Notification />
    </>
  );
}
