export const WebsiteDataTypes = {
  Page: 'Page',
  BlogList: 'BlogList',
  BlogPost: 'BlogPost',
} as const;

export type WebsiteDataType = (typeof WebsiteDataTypes)[keyof typeof WebsiteDataTypes];
