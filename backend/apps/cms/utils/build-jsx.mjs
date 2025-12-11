import fs from 'fs/promises';
import esbuild from 'esbuild';

// Transform bare-imports (npm packages) into destructures from window.VendorLibs.
// Examples:
//   import React from "react"
//     -> const { default: React } = window.VendorLibs["react"];
//   import { Link } from "react-router-dom"
//     -> const { Link } = window.VendorLibs["react-router-dom"];
//   import * as Icons from "@fortawesome/react-fontawesome"
//     -> const Icons = window.VendorLibs["@fortawesome/react-fontawesome"];
//   import "some-side-effect-lib"
//     -> void window.VendorLibs["some-side-effect-lib"];
function rewriteBareImportsToVendor(code) {
  // 1) side-effect imports: import "pkg";
  code = code.replace(
    /^\s*import\s+['"]([^'"]+)['"]\s*;?/mg,
    (m, pkg) => (pkg.startsWith('.') || pkg.startsWith('/')) ? m : `void window.VendorLibs["${pkg}"];`
  );

  // 2) namespace imports: import * as NS from "pkg";
  code = code.replace(
    /^\s*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]\s*;?/mg,
    (m, ns, pkg) => (pkg.startsWith('.') || pkg.startsWith('/')) ? m : `const ${ns} = window.VendorLibs["${pkg}"];`
  );

  // 3) default + named: import Default, { a as A, b } from "pkg";
  code = code.replace(
    /^\s*import\s+([A-Za-z_$][\w$]*)\s*,\s*\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]\s*;?/mg,
    (m, def, named, pkg) => {
      if (pkg.startsWith('.') || pkg.startsWith('/')) return m;
      const clean = named.trim();
      const items = clean.length ? `, ${clean}` : '';
      return `const { default: ${def}${items} } = window.VendorLibs["${pkg}"];`;
    }
  );

  // 4) named only: import { a as A, b } from "pkg";
  code = code.replace(
    /^\s*import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?/mg,
    (m, named, pkg) => (pkg.startsWith('.') || pkg.startsWith('/')) ? m : `const { ${named} } = window.VendorLibs["${pkg}"];`
  );

  // 5) default only: import React from "react";
  code = code.replace(
    /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]\s*;?/mg,
    (m, def, pkg) => (pkg.startsWith('.') || pkg.startsWith('/')) ? m : `const { default: ${def} } = window.VendorLibs["${pkg}"];`
  );

  // 6) strip type-only imports (TS): import type { X } from "pkg";
  code = code.replace(/^\s*import\s+type\s+.*?from\s+['"][^'"]+['"]\s*;?/mg, '');

  return code;
}

const DEFAULT_EXPORT_IDENTIFIER = '__DS_DEFAULT_EXPORT__';

function stripExports(code) {
  const exportMappings = new Map();
  let defaultExportLocalName = null;

  // Generic: convert any `export default` expression into a const assignment.
  code = code.replace(/export\s+default\s+/g, () => {
    if (!defaultExportLocalName) {
      defaultExportLocalName = DEFAULT_EXPORT_IDENTIFIER;
      exportMappings.set(DEFAULT_EXPORT_IDENTIFIER, DEFAULT_EXPORT_IDENTIFIER);
    }
    return `const ${DEFAULT_EXPORT_IDENTIFIER} = `;
  });

  // export function helper() {}
  code = code.replace(
    /export\s+function\s+([A-Za-z_$][\w$]*)/g,
    (match, name) => {
      exportMappings.set(name, name);
      return `function ${name}`;
    }
  );

  // export class Helper {}
  code = code.replace(
    /export\s+class\s+([A-Za-z_$][\w$]*)/g,
    (match, name) => {
      exportMappings.set(name, name);
      return `class ${name}`;
    }
  );

  // export const helper = ...
  code = code.replace(
    /export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    (match, kind, name) => {
      exportMappings.set(name, name);
      return `${kind} ${name}`;
    }
  );

  // export { Foo, Bar as Baz, Qux as default };
  code = code.replace(
    /export\s*\{([^}]*)\}\s*;?/g,
    (match, specifiers) => {
      const parts = specifiers
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

      parts.forEach((part) => {
        const [leftRaw, rightRaw] = part
          .split(/\s+as\s+/i)
          .map((p) => p?.trim());
        const left = leftRaw;
        const right = rightRaw;

        if (right && right.toLowerCase() === 'default') {
          defaultExportLocalName = left;
          exportMappings.set(left, left);
        } else if (right) {
          exportMappings.set(right, left);
        } else {
          exportMappings.set(left, left);
        }
      });

      return '';
    }
  );

  if (!defaultExportLocalName) {
    const iterator = exportMappings.values();
    const first = iterator.next();
    const firstNamed = first.done ? null : first.value;
    if (firstNamed) {
      defaultExportLocalName = firstNamed;
    } else {
      let fallbackName = null;
      const functionMatch = code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
      if (functionMatch) {
        fallbackName = functionMatch[1];
      } else {
        const constMatch = code.match(
          /(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function|\()/
        );
        if (constMatch) {
          fallbackName = constMatch[2];
        }
      }

      if (fallbackName) {
        defaultExportLocalName = fallbackName;
        if (!exportMappings.has(fallbackName)) {
          exportMappings.set(fallbackName, fallbackName);
        }
      } else {
        throw new Error(
          'React templates must export a named default component, e.g. `export default function MyComponent()`.'
        );
      }
    }
  }

  return {code, defaultExportLocalName, exportMappings};
}

const [,, entryPath, outFile, componentName] = process.argv;
if (!entryPath || !outFile) {
  console.error('Usage: node scripts/build-jsx.mjs <entry.jsx> <out.js>');
  process.exit(1);
}

const src = await fs.readFile(entryPath, 'utf8');

let processed;
try {
  processed = stripExports(src);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const {
  code: srcWithoutExports,
  exportMappings,
  defaultExportLocalName,
} = processed;

// Check if React is already imported to avoid duplicate declarations
const hasReactImport = /^\s*import\s+.*React.*from\s+['"]react['"]/m.test(
  srcWithoutExports
);
const reactBootstrap = hasReactImport ? '' : `var React = window.VendorLibs["react"];\n`;
const assignmentLines = Array.from(exportMappings.entries())
  .map(([exported, local]) => `window["${exported}"] = ${local};`)
  .filter(Boolean);

if (componentName && defaultExportLocalName) {
  assignmentLines.push(`window["${componentName}"] = ${defaultExportLocalName};`);
}

const assignmentBlock = assignmentLines.join('\n');
const rewritten =
  reactBootstrap +
  rewriteBareImportsToVendor(srcWithoutExports) +
  (assignmentBlock ? `\n${assignmentBlock}\n` : '\n');

// Build with JSX -> React.createElement to avoid react/jsx-runtime auto-imports.
await esbuild.build({
  stdin: {
    contents: rewritten,
    resolveDir: process.cwd(),
    sourcefile: entryPath,
    loader: entryPath.endsWith('.tsx') ? 'tsx' : 'jsx',
  },
  bundle: true,           // bundles only relative imports (if any)
  format: 'esm',
  platform: 'neutral',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  treeShaking: false,     // Include all code, even unused components
  outfile: outFile,
  logLevel: 'warning',
});
