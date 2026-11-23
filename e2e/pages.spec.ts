import { expect, test, type Page } from '@playwright/test'

// Bug bash sweep: every page at level 100 renders without a script error or an error state, and at phone width
// nothing scrolls sideways. Screenshots go to e2e/.shots/pages for a quick look.
const PAGES = [
  '/', '/profile', '/help', '/shop', '/open', '/collection', '/grading', '/kleinanzeigen', '/cardmarket', '/trade', '/bares',
  '/jobs', '/bunker', '/company', '/streaming', '/quests', '/path', '/upgrades', '/skills', '/prestige', '/housing',
  '/style', '/insurance', '/luxury', '/stammtisch', '/toplists', '/players', '/battles', '/darkside', '/megaprojects',
  '/admin',
]

async function levelHundred(page: Page, name: string) {
  await page.goto('/')
  await page.getByLabel('Benutzername').fill(name)
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: `Moin, ${name}.` })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())
  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  await page.getByRole('button', { name: '+100.000 €' }).click()
  await page.getByRole('button', { name: 'Level 100' }).click()
}

/** Client-side navigation (a reload would boot the in-browser database again); waits until the page has loaded. */
async function visit(page: Page, path: string, settle = true) {
  const title = page.locator('main h1').first()
  const before = (await title.count()) ? await title.innerText() : null
  await page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  if (before !== null) await expect(title).not.toHaveText(before) // the new page is there, not the old one
  await expect(title).toBeVisible()
  if (settle) await expect(page.locator('main .skeleton')).toHaveCount(0, { timeout: 15_000 })
}

test('every page renders without errors', async ({ page }) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  await levelHundred(page, 'Kontrolle')
  for (const path of PAGES) {
    await visit(page, path)
    await expect(page.getByRole('alert'), path).toHaveCount(0)
    await page.screenshot({ path: `e2e/.shots/pages/${path === '/' ? 'home' : path.slice(1)}.png`, animations: 'disabled' })
  }
  // every sound preset plays without an error
  await visit(page, '/dev/ui', false) // shows skeletons on purpose
  const sounds = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Sound', exact: true }) }).getByRole('button')
  expect(await sounds.count()).toBeGreaterThan(20)
  for (const b of await sounds.all()) await b.click()
  await page.waitForTimeout(1500)
  expect(errors).toEqual([])
})

test('at 390 px nothing scrolls sideways and every page opens at the top', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await levelHundred(page, 'Handy')
  const wide: string[] = []
  const scrolled: string[] = []
  const main = page.locator('#scroll-root')
  for (const path of PAGES) {
    await main.evaluate((m) => m.scrollTo(0, m.scrollHeight)) // leave the last page scrolled down
    await visit(page, path)
    if (await main.evaluate((m) => m.scrollTop > 0)) scrolled.push(path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 0) wide.push(`${path} +${overflow}px`)
    await page.screenshot({ path: `e2e/.shots/pages/390-${path === '/' ? 'home' : path.slice(1)}.png`, animations: 'disabled' })
  }
  expect(wide).toEqual([])
  expect(scrolled).toEqual([])
})
