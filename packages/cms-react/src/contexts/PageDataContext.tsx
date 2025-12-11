import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { PageData } from '@deepsel/cms-utils';
import { PageTransition } from '../components/PageTransition';

type PageDataContextValue = {
  pageData: PageData;
  setPageData: (pageData: PageData) => void;
};

const PageDataContext = createContext<PageDataContextValue | null>(null);

type PageDataProviderProps = {
  pageData: PageData;
  children: ReactNode;
};

export function PageDataProvider({ pageData, children }: PageDataProviderProps) {
  const [pageDataState, setPageDataState] = useState(pageData);

  const value: PageDataContextValue = {
    pageData: pageDataState,
    setPageData: setPageDataState,
  };

  return (
    <PageDataContext.Provider value={value}>
      <PageTransition />
      {children}
    </PageDataContext.Provider>
  );
}

export function usePageData() {
  const ctx = useContext(PageDataContext);
  if (!ctx) {
    throw new Error('usePageData must be used inside <PageDataProvider>');
  }

  return ctx;
}
