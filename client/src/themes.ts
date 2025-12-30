// THEME_IMPORTS_START (auto-managed)
import Interlinked404 from '../../themes/interlinked/404.astro';
import InterlinkedBlog from '../../themes/interlinked/blog.astro';
import InterlinkedIndex from '../../themes/interlinked/index.astro';
import InterlinkedSingleBlog from '../../themes/interlinked/single-blog.astro';
// THEME_IMPORTS_END

export const themeSystemKeys = {
  Page: 'index',
  BlogList: 'blog',
  BlogPost: 'single-blog',
  NotFound: '404',
};

// THEME_MAP_START (auto-managed)
export const themeMap = {
  interlinked: {
    [themeSystemKeys.Page]: InterlinkedIndex,
    [themeSystemKeys.BlogList]: InterlinkedBlog,
    [themeSystemKeys.BlogPost]: InterlinkedSingleBlog,
    [themeSystemKeys.NotFound]: Interlinked404,
  },
};
// THEME_MAP_END

export type ThemeName = keyof typeof themeMap;
