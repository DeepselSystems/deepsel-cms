import { test, expect } from "@playwright/test";
import { API_BASE_URL } from "../playwright.config";

/**
 * Smoke test for useModel.bulkDelete cache update.
 *
 * Regression: deleteWithConfirm goes through bulkDelete, which previously did
 * not filter the local originalData / data after a 200 response — so every
 * confirmed delete left a ghost row until the next refetch.
 *
 * Creates a throwaway user via the authenticated API, selects it in the
 * Users DataGrid, triggers the bulk-delete from the toolbar, confirms the
 * modal, and asserts the row leaves the DOM. End-to-end smoke; the helper
 * logic itself is unit-tested in cms-utils.
 */
test("bulk delete removes the row from the list view", async ({
  page,
  request,
}) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/users/);
  await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();

  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => c.name === "session_id");
  expect(sessionCookie, "expected session_id cookie after auth").toBeDefined();

  const stamp = Date.now();
  const username = `e2e_bulk_delete_${stamp}`;
  const email = `${username}@example.test`;

  const created = await request.post(`${API_BASE_URL}/user/`, {
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionCookie!.value}`,
      "X-Organization-Id": "1",
    },
    data: { username, name: username, email, password: "throwaway-1234" },
  });
  expect(
    created.ok(),
    `seed user creation failed: ${created.status()} ${await created.text()}`,
  ).toBe(true);

  await page.reload();

  const row = page.getByRole("row", { name: new RegExp(username) });
  await expect(row).toBeVisible();

  await row.getByRole("checkbox", { name: /select row/i }).check();

  await page.getByRole("button", { name: /^delete$/i }).click();

  const confirmDialog = page.getByRole("dialog");
  await confirmDialog.getByRole("button", { name: /^delete$/i }).click();

  await expect(row).toHaveCount(0, { timeout: 5_000 });
});
