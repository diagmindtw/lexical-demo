import { test, expect } from '@playwright/test'

// Regression: a document saved before the `meta` column existed comes back with
// meta:null from get.php/poll.php. onMeta(null) used to null out pageSetup and
// crash on `Cannot destructure property 'pageSize' of null`. The frontend must
// coalesce null/partial meta back to a full page-setup shape.
test('loads without crashing when backend returns meta:null', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  // Force every sync endpoint to answer with meta:null (and a harmless empty doc).
  await page.route('**/get.php*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, version: 1, content: null, meta: null }),
    }),
  )
  await page.route('**/poll.php*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, changed: false, version: 1, meta: null }),
    }),
  )
  await page.route('**/save.php*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, version: 2 }),
    }),
  )

  await page.goto('/') // sync ENABLED (no ?nosync) so the meta path actually runs
  await expect(page.locator('.editor-input')).toBeVisible()

  // Page-setup selector defaulted, editor is usable, and nothing threw.
  await expect(page.locator('[data-testid=tb-pagesize]')).toHaveValue('A4')
  const ed = page.locator('.editor-input')
  await ed.click({ force: true })
  await page.keyboard.type('ok')
  await page.waitForTimeout(100)
  expect(pageErrors, pageErrors.join('\n')).toEqual([])
})
