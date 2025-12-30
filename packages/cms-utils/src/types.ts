import type { MenuItem } from './menus/types';
import type { SpecialTemplate } from './page/types';
import type { WebsiteDataType } from './constants';
import type { PageData } from './page';
import type { BlogListData, BlogPostData } from './blog';

export type WebsiteData = {
  type: WebsiteDataType;
  data: PageData | BlogListData | BlogPostData;
  settings?: SiteSettings;
};

export interface SiteSettings {
  id: number;
  name: string;
  domains: string[];
  available_languages: Array<{
    id: number;
    name: string;
    iso_code: string;
    emoji_flag: string;
  }>;
  default_language: {
    id: number;
    name: string;
    iso_code: string;
    emoji_flag: string;
  };
  auto_translate_pages: boolean;
  auto_translate_posts: boolean;
  has_openrouter_api_key: boolean;
  ai_autocomplete_model_id: number;
  show_post_author: boolean;
  show_post_date: boolean;
  show_chatbox: boolean;
  website_custom_code: string | null;
  menus: MenuItem[];
  access_token_expire_minutes: number;
  require_2fa_all_users: boolean;
  allow_public_signup: boolean;
  is_enabled_google_sign_in: boolean;
  is_enabled_saml: boolean;
  saml_sp_entity_id: string | null;
  auto_translate_components: boolean;
  has_openai_api_key: boolean;
  ai_default_writing_model_id: number;
  special_templates: Record<string, SpecialTemplate>;
  selected_theme: string;
}
