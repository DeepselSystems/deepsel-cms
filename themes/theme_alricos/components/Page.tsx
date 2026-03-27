import { type PageData } from "@deepsel/cms-utils";
import { ContentRenderer } from "@deepsel/cms-react";
import Layout from "./Layout";

export default function Page({ pageData }: { pageData: PageData }) {
  return (
    <Layout pageData={pageData}>
      <ContentRenderer />
    </Layout>
  );
}
