import { WebsiteDataTypes, type PageData } from "@deepsel/cms-utils";
import { WebsiteDataProvider } from "@deepsel/cms-react";
import Menu from "./Menu";
import Footer from "./Footer";
import LangSwitcher from "./LangSwitcher";
import SearchForm from "./SearchForm";

export default function NotFound({ pageData }: { pageData: PageData }) {
  return (
    <WebsiteDataProvider
      websiteData={{ type: WebsiteDataTypes.Page, data: pageData }}
    >
      <main className="min-h-screen flex flex-col">
        <header className="shadow px-3 backdrop-blur bg-white/90">
          <div className="flex justify-between items-center gap-6 max-w-[1200px] mx-auto">
            <a href="/" className="flex items-center gap-2 text-2xl font-bold no-underline text-black">
              My Website
            </a>
            <div className="flex items-center gap-6">
              <Menu />
              <SearchForm />
              <LangSwitcher />
            </div>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center grow flex flex-col justify-center">
          <h1 className="text-6xl font-bold mb-4">404</h1>
          <h2 className="text-3xl font-semibold mb-6">Page Not Found</h2>
          <p className="text-lg mb-8 text-gray-600">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            Go Back Home
          </a>
        </div>
        <Footer />
      </main>
    </WebsiteDataProvider>
  );
}
