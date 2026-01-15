import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { WebsiteData } from '@deepsel/cms-utils';
import { PageTransition } from '../components/PageTransition';

type WebsiteDataContextValue = {
  websiteData: WebsiteData;
  setWebsiteData: (websiteData: WebsiteData) => void;
};

const WebsiteDataContext = createContext<WebsiteDataContextValue | null>(null);

type WebsiteDataProviderProps = {
  websiteData: WebsiteData;
  children: ReactNode;
};

export function WebsiteDataProvider({ websiteData, children }: WebsiteDataProviderProps) {
  const [websiteDataState, setWebsiteDataState] = useState(websiteData);
  const value: WebsiteDataContextValue = {
    websiteData: {
      ...websiteDataState,
      settings: websiteData.data?.public_settings, // for ease of access
    },
    setWebsiteData: (newWebsiteData: WebsiteData) => {
      setWebsiteDataState({
        ...newWebsiteData,
        settings: newWebsiteData.data?.public_settings, // for ease of access
      });
    },
  };

  return (
    <WebsiteDataContext.Provider value={value}>
      <PageTransition />
      {children}
    </WebsiteDataContext.Provider>
  );
}

export function useWebsiteData() {
  const ctx = useContext(WebsiteDataContext);
  if (!ctx) {
    throw new Error('useWebsiteData must be used inside <WebsiteDataProvider>');
  }

  return ctx;
}
