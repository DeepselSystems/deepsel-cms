// THEME_IMPORTS_START (auto-managed)
import StarterReact404 from '../../themes/starter_react/404.astro';
import StarterReactBlog from '../../themes/starter_react/Blog.astro';
import StarterReactPage from '../../themes/starter_react/page.astro';
import StarterReactSearch from '../../themes/starter_react/search.astro';
import StarterReactSingleBlog from '../../themes/starter_react/single-blog.astro';
import Alcoris404 from '../../themes/alcoris/404.astro';
import AlcorisBlog from '../../themes/alcoris/Blog.astro';
import AlcorisIndex from '../../themes/alcoris/Index.astro';
import AlcorisPage from '../../themes/alcoris/page.astro';
import AlcorisSingleBlog from '../../themes/alcoris/single-blog.astro';
import AlcorisFinance from '../../themes/alcoris/finance.astro';
import AlcorisUnternehmensberatung from '../../themes/alcoris/unternehmensberatung.astro';
import AlcorisSteuerberatung from '../../themes/alcoris/steuerberatung.astro';
import AlcorisPersonaladministration from '../../themes/alcoris/personaladministration.astro';
import AlcorisKontakt from '../../themes/alcoris/kontakt.astro';
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
  alcoris: {
    [themeSystemKeys.Home]: AlcorisIndex,
    [themeSystemKeys.Page]: AlcorisPage,
    [themeSystemKeys.BlogList]: AlcorisBlog,
    [themeSystemKeys.BlogPost]: AlcorisSingleBlog,
    [themeSystemKeys.NotFound]: Alcoris404,
    finance: AlcorisFinance,
    unternehmensberatung: AlcorisUnternehmensberatung,
    steuerberatung: AlcorisSteuerberatung,
    personaladministration: AlcorisPersonaladministration,
    kontakt: AlcorisKontakt,
  },
};
// THEME_MAP_END

export type ThemeName = keyof typeof themeMap;
