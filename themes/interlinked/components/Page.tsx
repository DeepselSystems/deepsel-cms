import type { PageData } from "@deepsel/cms-utils";
import { PageDataProvider, ContentRenderer } from "@deepsel/cms-react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";


export default function Page({ pageData }: { pageData: PageData }) {
  console.log('Page',pageData);
  return (
    <PageDataProvider pageData={pageData}>
      <Header />
      <main className="max-w-7xl mx-auto flex gap-4">
        <Sidebar />
        <ContentRenderer />
      </main>
      <Footer />
    </PageDataProvider>
  );
}
