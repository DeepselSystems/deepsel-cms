/**
 * Constants for Jinja2 syntax highlighting
 * BE CAREFUL TO EDIT THIS - IT AFFECTS OLDER DATA
 */
export const JINJA2_ATTRIBUTES = {
  CLASS: 'jinja2-syntax',
} as const;

/**
 * Regular expressions for Jinja2 template syntax patterns
 */
export const JINJA2_PATTERNS = [
  /\{\{[^}]*\}\}/g, // {{ variable }}
  /\{%[^%]*%\}/g, // {% tag %}
  /\{#[^#]*#\}/g, // {# comment #}
];

/**
 * Check if text contains Jinja2 syntax
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains Jinja2 syntax
 */
export const containsJinja2Syntax = (text: string): boolean => {
  if (!text) return false;
  return JINJA2_PATTERNS.some((pattern) => pattern.test(text));
};

/**
 * Find all Jinja2 syntax matches in text
 * @param {string} text - Text to search
 * @returns {Array<{start: number, end: number, match: string}>} Array of match positions
 */
export const findJinja2Matches = (
  text: string,
): Array<{ start: number; end: number; match: string }> => {
  const matches: Array<{ start: number; end: number; match: string }> = [];

  JINJA2_PATTERNS.forEach((pattern) => {
    const regex = new RegExp(pattern);
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        match: match[0],
      });
    }
  });

  return matches;
};
