import type { SiteSettings } from '../types';
import type { MenuItem } from '../menus/types';

export interface SlugParseResult {
  lang: string | null;
  path: string;
}

export interface Language {
  id: number;
  name: string;
  iso_code: string;
  svg_flag: string;
}

export interface SpecialTemplate {
  name: string;
  html?: string;
  component_name?: string;
}

export type Menus = MenuItem[];

export interface ContentField {
  'ds-label': string;
  'ds-type': string;
  'ds-value': string;
}

export interface Content {
  main: ContentField;
}

export interface SeoMetadata {
  title: string;
  description: string | null;
  featured_image_id: number | null;
  featured_image_name: string | null;
  allow_indexing: boolean;
}

export interface LanguageAlternative {
  slug: string;
  locale: Language;
}

export interface BlogPostAuthor {
  id: number;
  display_name?: string;
  username: string;
  image?: string;
}

export interface BlogPostListItem {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image_id?: number;
  publish_date?: string;
  author?: BlogPostAuthor;
  lang: string;
}

export interface PageData {
  id?: number;
  title?: string;
  content?: Content;
  lang: string;
  public_settings: SiteSettings;
  seo_metadata?: SeoMetadata;
  language_alternatives?: LanguageAlternative[];
  is_frontend_page?: boolean | null;
  string_id?: string | null;
  contents?: unknown;
  page_custom_code?: string | null;
  custom_code?: string | null;
  require_login?: boolean;
  // Blog-specific fields
  blog_posts?: BlogPostListItem[]; // For blog list pages (/blog)
  featured_image_id?: number; // For single blog posts
  publish_date?: string; // For single blog posts
  author?: BlogPostAuthor; // For single blog posts
  // For 404 cases
  notFound?: boolean;
  status?: number;
  detail?: string;
}
