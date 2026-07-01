import { test, expect } from '@playwright/test'

// 1x1 transparent PNG
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
)

async function firstTextNode(page) {
  return await page.evaluate(() => {
    const st = JSON.parse(window.__lexicalState)
    let found = null
    const walk = (n) => {
      if (found) return
      if (n.type === 'text') { found = n; return }
      ;(n.children || []).forEach(walk)
    }
    walk(st.root)
    return found
  })
}

async function firstBlock(page) {
  return await page.evaluate(() => JSON.parse(window.__lexicalState).root.children[0])
}

async function typeAndSelectAll(page, text) {
  const ed = page.locator('.editor-input')
  await ed.click({ force: true })
  await page.keyboard.type(text)
  await page.keyboard.press('Control+A')
}

test('bold button applies bold format to selection', async ({ page }) => {
  await page.goto('?nosync=1')
  await typeAndSelectAll(page, 'hello')
  await page.locator('[data-testid=tb-bold]').click({ force: true })
  await page.waitForTimeout(100)
  const node = await firstTextNode(page)
  expect(node.text).toBe('hello')
  expect(node.format & 1).toBe(1) // bold bit
})

test('increase-font-size button writes an inline font-size style', async ({ page }) => {
  await page.goto('?nosync=1')
  await typeAndSelectAll(page, 'sizes')
  await page.locator('[data-testid=tb-font-inc]').click({ force: true })
  await page.locator('[data-testid=tb-font-inc]').click({ force: true })
  await page.waitForTimeout(100)
  const node = await firstTextNode(page)
  expect(node.style).toMatch(/font-size:\s*\d+px/)
})

test('block dropdown converts the block to a heading', async ({ page }) => {
  await page.goto('?nosync=1')
  const ed = page.locator('.editor-input')
  await ed.click({ force: true })
  await page.keyboard.type('a title')
  await page.locator('[data-testid=tb-block]').selectOption('h1')
  await page.waitForTimeout(100)
  const block = await firstBlock(page)
  expect(block.type).toBe('heading')
  expect(block.tag).toBe('h1')
})

test('alignment dropdown sets element format', async ({ page }) => {
  await page.goto('?nosync=1')
  const ed = page.locator('.editor-input')
  await ed.click({ force: true })
  await page.keyboard.type('centered')
  await page.locator('[data-testid=tb-align]').selectOption('center')
  await page.waitForTimeout(100)
  const block = await firstBlock(page)
  expect(block.format).toBe('center')
})

test('insert image adds an image node', async ({ page }) => {
  await page.goto('?nosync=1')
  const ed = page.locator('.editor-input')
  await ed.click({ force: true })
  await page.keyboard.type('doc')
  await page.locator('[data-testid=tb-imagefile]').setInputFiles({
    name: 'pixel.png', mimeType: 'image/png', buffer: PNG_1x1,
  })
  await page.waitForTimeout(200)
  const hasImage = await page.evaluate(() => window.__lexicalState.includes('"type":"image"'))
  expect(hasImage).toBeTruthy()
})

test('page-size selector resizes the editor frame', async ({ page }) => {
  await page.goto('?nosync=1')
  const frame = page.locator('[data-testid=editor-frame]')
  const a4 = await frame.evaluate((el) => el.getBoundingClientRect().width)
  await page.locator('[data-testid=tb-orientation]').selectOption('landscape')
  await page.waitForTimeout(100)
  const landscape = await frame.evaluate((el) => el.getBoundingClientRect().width)
  expect(landscape).toBeGreaterThan(a4) // landscape A4 wider than portrait
})
