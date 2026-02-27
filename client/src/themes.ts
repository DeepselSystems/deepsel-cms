// THEME_IMPORTS_START (auto-managed)
import Starter_react404 from '../../themes/starter_react/404.astro';
import Starter_reactBlog from '../../themes/starter_react/Blog.astro';
import Starter_reactIndex from '../../themes/starter_react/Index.astro';
import Starter_reactSingleblog from '../../themes/starter_react/single-blog.astro';
// THEME_IMPORTS_END

export const themeSystemKeys = {
  Page: 'index',
  BlogList: 'blog',
  BlogPost: 'single-blog',
  NotFound: '404',
};

// THEME_MAP_START (auto-managed)
export const themeMap = {
  starter_react: {
    [themeSystemKeys.Page]: Starter_reactIndex,
    [themeSystemKeys.BlogList]: Starter_reactBlog,
    [themeSystemKeys.BlogPost]: Starter_reactSingleblog,
    [themeSystemKeys.NotFound]: Starter_react404,
  },
};
// THEME_MAP_END

export type ThemeName = keyof typeof themeMap;
