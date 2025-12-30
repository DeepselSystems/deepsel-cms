import { WebsiteDataTypes , type PageData} from "@deepsel/cms-utils";
import { WebsiteDataProvider, ContentRenderer } from "@deepsel/cms-react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";


export default function Page({ pageData }: { pageData: PageData }) {
  return (
    <WebsiteDataProvider websiteData={{ type: WebsiteDataTypes.Page, data: pageData }}>
      <Header />
      <main className="max-w-7xl mx-auto flex gap-4">
        <Sidebar />
        <ContentRenderer />
      </main>
      <Footer />
    </WebsiteDataProvider>
  );
}
