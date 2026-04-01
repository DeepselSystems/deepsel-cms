// THEME_IMPORTS_START (auto-managed)
import StarterReact404 from '../../themes/starter_react/404.astro';
import StarterReactBlog from '../../themes/starter_react/Blog.astro';
import StarterReactPage from '../../themes/starter_react/page.astro';
import StarterReactSearch from '../../themes/starter_react/search.astro';
import StarterReactSingleBlog from '../../themes/starter_react/single-blog.astro';
// THEME_IMPORTS_END

export const themeSystemKeys = {
  Home: 'index',
  Page: 'page',
  BlogList: 'blog',
  BlogPost: 'single-blog',
  SearchResults: 'search',
  NotFound: '404',
};

// THEME_MAP_START (auto-managed)
export const themeMap = {
  starter_react: {
    [themeSystemKeys.Page]: StarterReactPage,
    [themeSystemKeys.BlogList]: StarterReactBlog,
    [themeSystemKeys.BlogPost]: StarterReactSingleBlog,
    [themeSystemKeys.SearchResults]: StarterReactSearch,
    [themeSystemKeys.NotFound]: StarterReact404,
  },
};
// THEME_MAP_END

export type ThemeName = keyof typeof themeMap;
