import { WebsiteDataTypes, type PageData } from "@deepsel/cms-utils";
import {
  WebsiteDataProvider,
  ContentRenderer,
  useWebsiteData,
} from "@deepsel/cms-react";
import Footer from "./Footer";
import Header from "./Menu";
import PageHome from "./PageHome";
import PageFinance from "./PageFinance";
import PageUnternehmensberatung from "./PageUnternehmensberatung";
import PageSteuerberatung from "./PageSteuerberatung";
import PagePersonaladministration from "./PagePersonaladministration";
import PageKontakt from "./PageKontakt";

const pageComponents: Record<string, React.FC> = {
  "": PageHome,
  finance: PageFinance,
  unternehmensberatung: PageUnternehmensberatung,
  steuerberatung: PageSteuerberatung,
  personaladministration: PagePersonaladministration,
  kontakt: PageKontakt,
};

/* ─── Page content dispatcher ─── */

function PageContent() {
  const { websiteData } = useWebsiteData();
  const pageData = websiteData.data as PageData;
  const slug = pageData.slug?.replace(/^\//, "") || "";
  const Component = pageComponents[slug];
  if (Component) return <Component />;
  return <ContentRenderer />;
}

/* ─── Main Page component ─── */

export default function Page({ pageData }: { pageData: PageData }) {
  return (
    <WebsiteDataProvider
      websiteData={{ type: WebsiteDataTypes.Page, data: pageData }}
    >
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1">
          <PageContent />
        </main>
        <Footer />
      </div>
    </WebsiteDataProvider>
  );
}
