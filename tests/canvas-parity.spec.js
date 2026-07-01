import { test, expect } from '@playwright/test'

// Drive a fixed editing script through keyboard + shortcuts and return the
// serialized Lexical EditorState (structure only — toJSON omits runtime keys
// and selection, so identical documents serialize identically).
async function runScript(page) {
  const ed = page.locator('.editor-input')
  await ed.click({ force: true })
  await page.keyboard.type('Hello canvas world')
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Control+B') // bold everything
  await page.keyboard.press('End')
  await page.keyboard.type(' tail')
  await page.keyboard.press('Control+Z') // undo the " tail"
  await page.waitForTimeout(150)
  return await page.evaluate(() => window.__lexicalState)
}

test('editor state is identical with canvas mode ON vs OFF', async ({ page }) => {
  // Canvas ON (default) — fresh page.
  await page.goto('?nosync=1')
  await expect(page.locator('[data-testid=canvas-mode-toggle]')).toBeChecked()
  const withCanvas = await runScript(page)

  // Fresh reload → plain DOM Lexical (canvas off) → identical script.
  await page.goto('?nosync=1')
  await page.locator('[data-testid=canvas-mode-toggle]').uncheck()
  await expect(page.locator('[data-testid=particle-canvas]')).toHaveCount(0)
  const withoutCanvas = await runScript(page)

  expect(JSON.parse(withCanvas)).toEqual(JSON.parse(withoutCanvas))
})

test('canvas actually paints particles for typed text', async ({ page }) => {
  await page.goto('?nosync=1')
  const ed = page.locator('.editor-input')
  await ed.click({ force: true })
  await page.keyboard.type('ABCDEFG')
  await expect(page.locator('[data-testid=particle-canvas]')).toBeVisible()

  // Font load + first paint can lag; poll until the canvas has painted.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const c = document.querySelector('[data-testid=particle-canvas]')
          if (!c) return 0
          const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
          let n = 0
          for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++
          return n
        }),
      { timeout: 6000 },
    )
    .toBeGreaterThan(50)
})

test('mouse interaction still works in canvas mode (click to place cursor)', async ({ page }) => {
  await page.goto('?nosync=1')
  const ed = page.locator('.editor-input')
  await ed.click({ force: true })
  await page.keyboard.type('ABCDEFG')
  await page.waitForTimeout(150)

  // Click near the very start of the line (canvas is pointer-events:none, so
  // the click reaches the contenteditable and the browser positions the caret).
  await ed.click({ position: { x: 3, y: 12 }, force: true })
  await page.keyboard.type('X')
  await page.waitForTimeout(100)

  const text = await page.evaluate(() => window.__lexicalText)
  expect(text.length).toBe(8) // 7 + inserted X
  expect(text).toContain('X')
  // X landed at/near the front, not appended at the end
  expect(text.endsWith('G')).toBeTruthy()
})
