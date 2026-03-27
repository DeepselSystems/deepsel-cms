// THEME_IMPORTS_START (auto-managed)
import StarterReact404 from '../../themes/starter_react/404.astro';
import StarterReactBlog from '../../themes/starter_react/Blog.astro';
import StarterReactIndex from '../../themes/starter_react/Index.astro';
import StarterReactPage from '../../themes/starter_react/page.astro';
import StarterReactSearch from '../../themes/starter_react/search.astro';
import StarterReactSingleBlog from '../../themes/starter_react/single-blog.astro';
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
    [themeSystemKeys.Home]: StarterReactIndex,
    [themeSystemKeys.Page]: StarterReactPage,
    [themeSystemKeys.BlogList]: StarterReactBlog,
    [themeSystemKeys.BlogPost]: StarterReactSingleBlog,
    [themeSystemKeys.SearchResults]: StarterReactSearch,
    [themeSystemKeys.NotFound]: StarterReact404,
  },
  theme_alricos: {
    [themeSystemKeys.Page]: ThemeAlricosIndex,
    [themeSystemKeys.BlogList]: ThemeAlricosBlog,
    [themeSystemKeys.BlogPost]: ThemeAlricosSingleBlog,
    [themeSystemKeys.NotFound]: ThemeAlricos404,
    finance: ThemeAlricosFinance,
    unternehmensberatung: ThemeAlricosUnternehmensberatung,
    steuerberatung: ThemeAlricosSteuerberatung,
    personaladministration: ThemeAlricosPersonaladministration,
    kontakt: ThemeAlricosKontakt,
  },
};
// THEME_MAP_END

export type ThemeName = keyof typeof themeMap;
