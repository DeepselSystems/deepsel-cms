import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { WebsiteDataTypes } from '@deepsel/cms-utils';
import type { PageData, BlogListData, BlogPostData, SiteSettings } from '@deepsel/cms-utils';
import { useTransition } from '../hooks/useTransition';

export type WebsiteData = {
  type: (typeof WebsiteDataTypes)[keyof typeof WebsiteDataTypes];
  data: PageData | BlogListData | BlogPostData;
  settings?: SiteSettings;
};

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
  useTransition({});

  const value: WebsiteDataContextValue = {
    websiteData: {
      ...websiteDataState,
      settings: websiteData.settings, // for ease of access
    },
    setWebsiteData: (newWebsiteData: WebsiteData) => {
      setWebsiteDataState({
        ...newWebsiteData,
        settings: newWebsiteData.settings, // for ease of access
      });
    },
  };

  return <WebsiteDataContext.Provider value={value}>{children}</WebsiteDataContext.Provider>;
}

export function useWebsiteData() {
  const ctx = useContext(WebsiteDataContext);
  if (!ctx) {
    throw new Error('useWebsiteData must be used inside <WebsiteDataProvider>');
  }

  return ctx;
}
