import type { SiteSettings } from '../types';
import type {
  BlogPostListItem,
  BlogPostAuthor,
  SeoMetadata,
  LanguageAlternative,
} from '../page/types';

export interface BlogListResponse {
  lang: string;
  public_settings: SiteSettings;
  blog_posts: BlogPostListItem[] | null;
  page: number;
  page_size: number;
}

export interface FetchBlogListOptions {
  lang: string;
  page?: number;
  page_size?: number;
  authToken?: string | null;
  astroRequest?: Request | null;
  backendHost?: string;
}

export interface BlogPostResponse {
  id: number;
  title: string;
  content: string;
  lang: string;
  public_settings: SiteSettings;
  seo_metadata: SeoMetadata;
  custom_code?: string | null;
  page_custom_code?: string | null;
  require_login?: boolean | null;
  featured_image_id?: number | null;
  publish_date?: string | null;
  author?: BlogPostAuthor | null;
  language_alternatives: LanguageAlternative[];
}

export interface FetchBlogPostOptions {
  lang: string;
  slug: string;
  authToken?: string | null;
  astroRequest?: Request | null;
  backendHost?: string;
}
