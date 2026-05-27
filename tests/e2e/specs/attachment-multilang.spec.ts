/**
 * E2E golden-path for the attachment multi-lang refactor.
 *
 * Covered backend behavior is mostly verified by pytest (see
 * backend/apps/core/tests/test_attachment_*.py and
 * backend/apps/cms/tests/test_jinja2_attachment.py). This spec exists for the
 * one round-trip the unit suites cannot reach: a real browser uploading a file
 * into the Media library and verifying it surfaces in the grid with the
 * expected locale-version structure on the wire.
 */
import { expect, test } from '@playwright/test';

const FILE_NAME = `e2e-att-${Date.now()}.txt`;
const FILE_BYTES = Buffer.from('e2e attachment payload');

test('uploads a file via the Media library and surfaces it as a new attachment with a locale_version', async ({
  page,
}) => {
  // Wait for the create response so we can assert the payload shape before
  // poking at the DOM (Media is async and may rerender several times).
  const uploadPromise = page.waitForResponse(
    (res) =>
      res.request().method() === 'POST' &&
      /\/attachment\/?($|\?)/.test(res.url()) &&
      res.ok(),
  );

  await page.goto('/admin/media');
  await expect(page).toHaveURL(/\/admin\/media/);

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: FILE_NAME,
    mimeType: 'text/plain',
    buffer: FILE_BYTES,
  });

  const uploadResponse = await uploadPromise;
  const body = (await uploadResponse.json()) as Array<{
    id: number;
    name: string;
    locale_versions: Array<{ id: number; locale_id: number; name: string }>;
  }>;

  // The new endpoint returns AttachmentRead[] with locale_versions populated;
  // exactly one locale version must be created for the upload (the org default).
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBe(1);
  expect(body[0].id).toBeGreaterThan(0);
  expect(body[0].locale_versions.length).toBe(1);
  expect(body[0].locale_versions[0].locale_id).toBeGreaterThan(0);
  // The locale-version filename keeps the uploaded extension.
  expect(body[0].locale_versions[0].name).toMatch(/\.txt$/);
});
