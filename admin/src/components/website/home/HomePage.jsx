import {Suspense, lazy} from 'react';
import WebsiteHeader from '../WebsiteHeader.jsx';
import WebsiteFooter from '../WebsiteFooter.jsx';
import useAuthentication from '../../../common/api/useAuthentication.js';
import {Box} from '@mantine/core';
import Hero from './Hero/index.jsx';
import DirectAccess from './DirectAccess/index.jsx';
import FederalAdministration from './FederalAdministration/index.jsx';
import CoreFunctions from './CoreFunctions/index.jsx';
import CookieConsentPopup from '../CookieConsentPopup.jsx';

// Lazy load the AdminHeader component
const AdminHeader = lazy(() => import('../AdminHeader.jsx'));

export default function HomePage({isPreviewMode}) {
  const {user} = useAuthentication();
  return (
    <main className="min-h-screen flex flex-col">
      {user && !isPreviewMode && (
        <Suspense>
          <AdminHeader />
        </Suspense>
      )}

      <WebsiteHeader />

      <Box className="typography flex-grow text-primary-text">
        <Hero />
        <Box className="flex flex-col-reverse md:flex-col">
          <DirectAccess />
          <FederalAdministration />
        </Box>
        <CoreFunctions />
      </Box>

      <WebsiteFooter />

      <CookieConsentPopup />
    </main>
  );
}
