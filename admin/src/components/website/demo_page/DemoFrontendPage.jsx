import {Suspense, lazy} from 'react';
import {useTranslation} from 'react-i18next';
import WebsiteHeader from '../WebsiteHeader.jsx';
import WebsiteFooter from '../WebsiteFooter.jsx';
import useAuthentication from '../../../common/api/useAuthentication.js';

// Lazy load the AdminHeader component
const AdminHeader = lazy(() => import('../AdminHeader.jsx'));

export default function DemoFrontendPage(props) {
  const {initialPageData, isPreviewMode} = props;
  const {user} = useAuthentication();
  const {t} = useTranslation('DemoFrontendPage'); // the namespace is the string_id of the page_content record in the db

  return (
    <main className="min-h-screen flex flex-col">
      {user && !isPreviewMode && (
        <Suspense>
          <AdminHeader editPath={`/admin/pages/${initialPageData?.id}/edit`} />
        </Suspense>
      )}

      <WebsiteHeader />

      <div className="typography flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {t('hero.title', 'Hello World')}
      </div>

      <WebsiteFooter />
    </main>
  );
}
