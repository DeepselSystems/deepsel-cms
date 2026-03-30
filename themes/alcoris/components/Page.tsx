import { type PageData } from "@deepsel/cms-utils";
import { ContentRenderer } from "@deepsel/cms-react";
import Layout from "./Layout";

export default function Page({ pageData }: { pageData: PageData }) {
  return (
    <Layout pageData={pageData}>
      <div className="page-content mx-auto max-w-[1248px] px-6 lg:px-24 py-10 lg:py-20">
        <ContentRenderer />
      </div>
    </Layout>
  );
}
