// THEME_IMPORTS_START (auto-managed)
import StarterReact404 from '../../themes/starter_react/404.astro';
import StarterReactBlog from '../../themes/starter_react/Blog.astro';
import StarterReactIndex from '../../themes/starter_react/Index.astro';
import StarterReactSingleBlog from '../../themes/starter_react/single-blog.astro';
// THEME_IMPORTS_END

export const themeSystemKeys = {
  Page: 'index',
  BlogList: 'blog',
  BlogPost: 'single-blog',
  NotFound: '404',
};

// THEME_MAP_START (auto-managed)
export const themeMap = {
  'starter_react': {
    [themeSystemKeys.Page]: StarterReactIndex,
    [themeSystemKeys.BlogList]: StarterReactBlog,
    [themeSystemKeys.BlogPost]: StarterReactSingleBlog,
    [themeSystemKeys.NotFound]: StarterReact404,
  },
};
// THEME_MAP_END

export type ThemeName = keyof typeof themeMap;
