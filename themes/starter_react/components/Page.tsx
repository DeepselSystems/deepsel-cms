import { WebsiteDataTypes, type PageData } from "@deepsel/cms-utils";
import { WebsiteDataProvider, ContentRenderer } from "@deepsel/cms-react";
import Sidebar from "./Sidebar";
import Menu from "./Menu";
import Footer from "./Footer";
import LangSwitcher from "./LangSwitcher";
import SearchForm from "./SearchForm";

export default function Page({ pageData }: { pageData: PageData }) {
  return (
    <WebsiteDataProvider
      websiteData={{ type: WebsiteDataTypes.Page, data: pageData }}
    >
      <header className="shadow px-3 backdrop-blur bg-white/90">
          <div className="flex justify-between items-center gap-6 max-w-7xl mx-auto">
            <a href="/" className="flex items-center gap-2 text-2xl font-bold">
              React Starter Theme
            </a>
            <div className="flex items-center gap-6">
              <Menu />
              <SearchForm />
              <LangSwitcher />
            </div>
          </div>
      </header>
      <div className="max-w-7xl mx-auto flex gap-4 py-6">
        <Sidebar />
        <ContentRenderer />
      </div>
      <Footer />
    </WebsiteDataProvider>
  );
}
