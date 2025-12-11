import React from 'react';
import { usePageData } from '../contexts/PageDataContext';

export function ContentRenderer() {
  const { pageData } = usePageData();

  if (!pageData) {
    return null;
  }

  const mainContent = pageData?.content?.main?.['ds-value'] || '';

  return (
    <article
      className="flex-1 pt-10 px-4 xl:px-2 min-w-0"
      dangerouslySetInnerHTML={{ __html: mainContent }}
    />
  );
}
