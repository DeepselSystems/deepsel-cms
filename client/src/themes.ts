// THEME_IMPORTS_START (auto-managed)
import Interlinked404 from '../../themes/interlinked/404.astro';
import InterlinkedBlog from '../../themes/interlinked/blog.astro';
import InterlinkedIndex from '../../themes/interlinked/index.astro';
import InterlinkedSingleBlog from '../../themes/interlinked/single-blog.astro';
import ThemeAlricos404 from '../../themes/theme_alricos/404.astro';
import ThemeAlricosBlog from '../../themes/theme_alricos/Blog.astro';
import ThemeAlricosIndex from '../../themes/theme_alricos/Index.astro';
import ThemeAlricosSingleBlog from '../../themes/theme_alricos/single-blog.astro';
import ThemeAlricosFinance from '../../themes/theme_alricos/finance.astro';
import ThemeAlricosUnternehmensberatung from '../../themes/theme_alricos/unternehmensberatung.astro';
import ThemeAlricosSteuerberatung from '../../themes/theme_alricos/steuerberatung.astro';
import ThemeAlricosPersonaladministration from '../../themes/theme_alricos/personaladministration.astro';
import ThemeAlricosKontakt from '../../themes/theme_alricos/kontakt.astro';
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
  theme_alricos: {
    [themeSystemKeys.Page]: ThemeAlricosIndex,
    [themeSystemKeys.BlogList]: ThemeAlricosBlog,
    [themeSystemKeys.BlogPost]: ThemeAlricosSingleBlog,
    [themeSystemKeys.NotFound]: ThemeAlricos404,
    'finance': ThemeAlricosFinance,
    'unternehmensberatung': ThemeAlricosUnternehmensberatung,
    'steuerberatung': ThemeAlricosSteuerberatung,
    'personaladministration': ThemeAlricosPersonaladministration,
    'kontakt': ThemeAlricosKontakt,
  },
};
// THEME_MAP_END

export type ThemeName = keyof typeof themeMap;
