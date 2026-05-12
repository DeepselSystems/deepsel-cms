import tailwindcss from 'tailwindcss';
import tailwindNesting from 'tailwindcss/nesting/index.js';
import autoprefixer from 'autoprefixer';
import prefixer from 'postcss-prefix-selector';
import postcss from 'postcss';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const themesDir = path.resolve(__dirname, '../themes');
const baseConfigPath = path.resolve(__dirname, 'tailwind.config.js');
const isDev = process.env.NODE_ENV !== 'production';

// Order matters:
// 1. tailwindcss/nesting flattens native CSS nesting before any selector
//    rewriting (otherwise prefixer wraps inner selectors that will never
//    match once nesting is flattened later).
// 2. tailwindcss-per-theme picks the source file's theme by inspecting
//    `/themes/<name>/` in the path and runs a nested postcss pass with
//    that theme's tailwind.config.js — so each theme emits ONLY its own
//    preset's utilities. Non-theme files fall back to ./tailwind.config.js.
// 3. prefixer now runs AFTER tailwind so it scopes everything the theme
//    emits (utilities, preflight, custom CSS) to [data-theme="<name>"].

function themeNameFromFile(filePath) {
  if (!filePath) return null;
  const norm = filePath.replace(/\\/g, '/');
  const idx = norm.indexOf('/themes/');
  if (idx === -1) return null;
  const parts = norm.slice(idx + '/themes/'.length).split('/');
  const seg1 = parts[0];
  return /^[a-z]{2}(_[A-Z]{2})?$/.test(seg1) ? parts[1] : seg1;
}

// themeName ('__base__' for non-theme files) -> Promise<postcss.Processor>.
// Promise (not resolved value) is cached to avoid a race when concurrent
// CSS files trigger the first load. In dev we skip the cache so edits to
// a theme's tailwind.config.js take effect on next file save.
const cache = new Map();
function getProcessor(themeName) {
  const key = themeName ?? '__base__';
  if (!isDev && cache.has(key)) return cache.get(key);

  const configPath = themeName
    ? path.join(themesDir, themeName, 'tailwind.config.js')
    : baseConfigPath;

  const promise = (async () => {
    try {
      const url = `${pathToFileURL(configPath).href}${isDev ? `?t=${Date.now()}` : ''}`;
      const mod = await import(url);
      return postcss([tailwindcss(mod.default)]);
    } catch (e) {
      console.warn(`[tailwind-per-theme] failed to load ${configPath}; using base`, e);
      const base = await import(pathToFileURL(baseConfigPath).href);
      return postcss([tailwindcss(base.default)]);
    }
  })();

  if (!isDev) cache.set(key, promise);
  return promise;
}

const tailwindPerTheme = {
  postcssPlugin: 'tailwindcss-per-theme',
  async Once(root) {
    const file = root.source?.input.file;
    const theme = themeNameFromFile(file);
    const processor = await getProcessor(theme);
    // Re-serialize then re-parse so the inner pass owns the AST. Pass `from`
    // so node.source.input.file on emitted rules points back to the theme's
    // main.css — that's what the outer prefixer reads.
    const sub = await processor.process(root.toString(), { from: file, to: file });
    root.removeAll();
    sub.root.each((node) => root.append(node.clone()));
  },
};

export default {
  plugins: [
    tailwindNesting(),
    tailwindPerTheme,
    prefixer({
      prefix: '__will_be_replaced__',
      transform(_prefix, selector, _prefixed, filePath) {
        if (!filePath) return selector;
        const theme = themeNameFromFile(filePath);
        if (!theme) return selector;
        const attr = `[data-theme="${theme}"]`;
        if (selector === ':root' || selector === 'html') return `html${attr}`;
        if (selector === 'body') return `${attr} body`;
        return `${attr} ${selector}`;
      },
    }),
    autoprefixer(),
  ],
};
