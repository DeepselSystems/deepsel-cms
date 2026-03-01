export const WebsiteDataTypes = {
  Page: 'Page',
  BlogList: 'BlogList',
  BlogPost: 'BlogPost',
  SearchResults: 'SearchResults',
} as const;

export type WebsiteDataType = (typeof WebsiteDataTypes)[keyof typeof WebsiteDataTypes];
