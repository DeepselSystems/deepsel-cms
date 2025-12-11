import { describe, expect, it } from 'vitest';
import { isValidLanguageCode, validLanguageCodes } from '../../src/language/isValidLanguageCode';

describe('isValidLanguageCode', () => {
  it('accepts any language explicitly listed', () => {
    expect(isValidLanguageCode(validLanguageCodes[0])).toBe(true);
    expect(isValidLanguageCode('en')).toBe(true);
    expect(isValidLanguageCode('zh_TW')).toBe(true);
  });

  it('rejects unknown or malformed codes', () => {
    expect(isValidLanguageCode('xx')).toBe(false);
    expect(isValidLanguageCode('EN')).toBe(false);
    expect(isValidLanguageCode('en-us')).toBe(false);
  });
});
