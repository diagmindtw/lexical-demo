import { test, expect } from '@playwright/test'

// The full Lexical Playground "Insert" menu — every item must be present and
// insert a serializable node (or, for Date, text) into the document.

const ALL_ITEMS = [
  'hr', 'pagebreak', 'image', 'gif', 'excalidraw', 'table', 'poll',
  'columns', 'equation', 'sticky', 'collapsible', 'date', 'tweet', 'youtube', 'figma',
]

async function openMenu(page) {
  await page.locator('[data-testid=tb-insert]').click({ force: true })
  await expect(page.locator('[data-testid=tb-insert-menu]')).toBeVisible()
}

test('insert menu lists all 15 playground items', async ({ page }) => {
  await page.goto('?nosync=1')
  await openMenu(page)
  for (const key of ALL_ITEMS) {
    await expect(page.locator(`[data-testid=tb-ins-${key}]`)).toBeVisible()
  }
})

// key -> optional prompt answer(s); node type expected in serialized state (or a
// text check for 'date'). null answer = no dialog.
const CASES = [
  { key: 'hr', answer: null, type: 'horizontalrule' },
  { key: 'pagebreak', answer: null, type: 'page-break' },
  { key: 'excalidraw', answer: null, type: 'excalidraw' },
  { key: 'sticky', answer: null, type: 'sticky' },
  { key: 'collapsible', answer: null, type: 'collapsible' },
  { key: 'table', answer: null, type: 'table' },
  { key: 'equation', answer: 'x^2', type: 'equation' },
  { key: 'poll', answer: 'Best fruit?', type: 'poll' },
  { key: 'columns', answer: '3', type: 'columns' },
  { key: 'youtube', answer: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', type: 'youtube' },
  { key: 'figma', answer: 'https://www.figma.com/file/abc/Demo', type: 'figma' },
  { key: 'tweet', answer: 'https://x.com/jack/status/20', type: 'tweet' },
  { key: 'gif', answer: 'https://media.giphy.com/media/x/giphy.gif', type: 'image' },
]

for (const c of CASES) {
  test(`insert ${c.key} adds a "${c.type}" node`, async ({ page }) => {
    await page.goto('?nosync=1')
    await page.locator('.editor-input').click({ force: true })
    if (c.answer !== null) {
      page.once('dialog', (d) => d.accept(c.answer))
    }
    await openMenu(page)
    await page.locator(`[data-testid=tb-ins-${c.key}]`).click({ force: true })
    await page.waitForTimeout(250)
    const has = await page.evaluate((t) => window.__lexicalState.includes(`"type":"${t}"`), c.type)
    expect(has).toBeTruthy()
  })
}

test('insert Date writes a date string into the document', async ({ page }) => {
  await page.goto('?nosync=1')
  await page.locator('.editor-input').click({ force: true })
  await openMenu(page)
  await page.locator('[data-testid=tb-ins-date]').click({ force: true })
  await page.waitForTimeout(150)
  const text = await page.evaluate(() => window.__lexicalText)
  expect(text).toMatch(/\d{4}/) // contains a 4-digit year
})

test('poll voting increments the count and persists in node state', async ({ page }) => {
  await page.goto('?nosync=1')
  await page.locator('.editor-input').click({ force: true })
  page.once('dialog', (d) => d.accept('Q?'))
  await openMenu(page)
  await page.locator('[data-testid=tb-ins-poll]').click({ force: true })
  await expect(page.locator('.le-poll')).toBeVisible()

  // Vote on the first option.
  await page.locator('.le-poll-check').first().click()
  await page.waitForTimeout(200)
  const votes = await page.evaluate(() => {
    const st = JSON.parse(window.__lexicalState)
    let poll = null
    const walk = (n) => { if (n.type === 'poll') poll = n; (n.children || []).forEach(walk) }
    walk(st.root)
    return poll.options.reduce((a, o) => a + o.votes.length, 0)
  })
  expect(votes).toBe(1)
})

test('inserted nodes survive a serialize → parse round-trip', async ({ page }) => {
  await page.goto('?nosync=1')
  await page.locator('.editor-input').click({ force: true })
  // Insert a few no-prompt nodes.
  for (const key of ['pagebreak', 'sticky', 'excalidraw']) {
    await openMenu(page)
    await page.locator(`[data-testid=tb-ins-${key}]`).click({ force: true })
    await page.waitForTimeout(120)
  }
  const before = await page.evaluate(() => window.__lexicalState)
  // Round-trip through the editor's own parser.
  const after = await page.evaluate((json) => {
    const ed = window.__lexicalEditor
    const state = ed.parseEditorState(JSON.parse(json))
    return JSON.stringify(state.toJSON())
  }, before)
  expect(JSON.parse(after)).toEqual(JSON.parse(before))
})
