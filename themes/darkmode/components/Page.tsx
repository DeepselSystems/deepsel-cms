import { usePageData } from "@deepsel/cms-react";

import Sidebar from "./Sidebar";

export default function Page(): React.ReactNode {
  const { pageData } = usePageData();

  if (!pageData) {
    return null;
  }

  const mainContent = pageData?.content?.main?.['ds-value'] || '';

  return (
    <div className="max-w-7xl mx-auto flex gap-4">
      <Sidebar />
      <main
        className="flex-1 pt-10 px-4 xl:px-2 min-w-0"
        dangerouslySetInnerHTML={{ __html: mainContent }}
      />
    </div>
  );
}
