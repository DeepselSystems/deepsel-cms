import { WebsiteDataTypes, type PageData } from "@deepsel/cms-utils";
import { WebsiteDataProvider } from "@deepsel/cms-react";
import Header from "./Menu";

export default function Layout({ pageData, children }: { pageData: PageData; children: React.ReactNode }) {
  return (
    <WebsiteDataProvider websiteData={{ type: WebsiteDataTypes.Page, data: pageData }}>
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </WebsiteDataProvider>
  );
}
