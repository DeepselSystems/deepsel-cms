import { WebsiteDataTypes, type PageData } from "@deepsel/cms-utils";
import { WebsiteDataProvider, ContentRenderer } from "@deepsel/cms-react";
import Menu from "./Menu";
import Footer from "./Footer";
import LangSwitcher from "./LangSwitcher";
import SearchForm from "./SearchForm";

export default function Page({ pageData }: { pageData: PageData }) {
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
        <div className="page-content max-w-[1200px] w-full mx-auto py-6 px-4 grow">
          <ContentRenderer />
        </div>
        <Footer />
      </main>
    </WebsiteDataProvider>
  );
}
