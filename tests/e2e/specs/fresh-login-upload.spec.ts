import { test, expect } from "@playwright/test";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "../playwright.config";

/**
 * Regression: useUpload previously read `organizationId` directly from
 * localStorage. On a fresh login the Zustand store has the in-memory default
 * (`1`) but localStorage hasn't been written yet, so uploads went out without
 * `X-Organization-Id` and the backend returned 400.
 *
 * This spec uses a brand-new browser context (no saved storage state), logs
 * in via the UI, performs an upload immediately, and asserts the upload
 * request carries the header.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test("upload immediately after fresh login carries X-Organization-Id", async ({
  page,
}) => {
  await page.goto("/admin/login");
  const loginPanel = page.getByRole("tabpanel", { name: "Login" });
  await loginPanel.getByLabel("Email or Username").fill(ADMIN_USERNAME);
  await loginPanel.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await loginPanel.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL("**/admin/pages", { timeout: 15_000 });

  // Sanity: localStorage should not yet contain organizationId — that proves
  // the upload header has to come from the in-memory store value, not LS.
  const orgIdInLs = await page.evaluate(() =>
    localStorage.getItem("organizationId"),
  );
  expect(
    orgIdInLs,
    "localStorage should be empty for the org id on fresh login",
  ).toBeNull();

  await page.goto("/admin/media");
  await expect(page).toHaveURL(/\/admin\/media/);

  const uploadPromise = page.waitForRequest((req) => {
    if (req.method() !== "POST") return false;
    const url = req.url();
    return url.includes("/attachment") && !url.includes("/attachment/");
  });

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: "fresh-login-upload.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello from the e2e suite"),
  });

  const uploadReq = await uploadPromise;
  expect(
    uploadReq.headers()["x-organization-id"],
    "upload request should carry X-Organization-Id even before LS is written",
  ).toBe("1");

  const uploadResp = await uploadReq.response();
  expect(
    uploadResp?.status(),
    "upload should succeed (not 400 from missing header)",
  ).toBe(200);
});
