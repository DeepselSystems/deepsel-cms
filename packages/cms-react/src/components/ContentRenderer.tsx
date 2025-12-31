import React from 'react';
import { useWebsiteData } from '../contexts/WebsiteDataContext';

export function ContentRenderer() {
  const { websiteData } = useWebsiteData();

  if (
    !websiteData ||
    !websiteData.data ||
    !('content' in websiteData.data) ||
    typeof websiteData.data.content !== 'object' ||
    !websiteData.data.content.main
  ) {
    return null;
  }

  const mainContent = websiteData.data.content.main['ds-value'] || '';

  return (
    <article
      className="flex-1 pt-10 px-4 xl:px-2 min-w-0"
      dangerouslySetInnerHTML={{ __html: mainContent }}
    />
  );
}
