// THEME_IMPORTS_START (auto-managed)
import StarterReact404 from '../../themes/starter_react/404.astro';
import StarterReactBlog from '../../themes/starter_react/Blog.astro';
import StarterReactForm from '../../themes/starter_react/form.astro';
import StarterReactFormStatistics from '../../themes/starter_react/form-statistics.astro';
import StarterReactPage from '../../themes/starter_react/page.astro';
import StarterReactSearch from '../../themes/starter_react/search.astro';
import StarterReactSingleblog from '../../themes/starter_react/single-blog.astro';
// THEME_IMPORTS_END

export const themeSystemKeys = {
  Home: 'index',
  Page: 'page',
  BlogList: 'blog',
  BlogPost: 'single-blog',
  SearchResults: 'search',
  NotFound: '404',
  Form: 'form',
  FormStatistics: 'form-statistics',
};

// THEME_MAP_START (auto-managed)
export const themeMap = {
  starter_react: {
    [themeSystemKeys.NotFound]: StarterReact404,
    [themeSystemKeys.BlogList]: StarterReactBlog,
    [themeSystemKeys.Form]: StarterReactForm,
    [themeSystemKeys.FormStatistics]: StarterReactFormStatistics,
    [themeSystemKeys.Page]: StarterReactPage,
    [themeSystemKeys.SearchResults]: StarterReactSearch,
    [themeSystemKeys.BlogPost]: StarterReactSingleblog,
  },
};
// THEME_MAP_END

export type ThemeName = keyof typeof themeMap;
