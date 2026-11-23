import { expect, test, type Page } from '@playwright/test'

// 0.0.6: on a phone the menu is a drawer. Mama's tutorial must lead through the menu button instead of blocking the
// screen while it points at an entry that is not on it.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

async function clickSpot(page: Page) {
  const ring = page.locator('.coach-ring')
  await expect(ring).toBeVisible()
  await page.waitForTimeout(500)
  const box = (await ring.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

test('on a phone the tutorial leads through the menu drawer', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('handy@example.com')
  await page.getByLabel('Benutzername').fill('Handy')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await page.getByRole('button', { name: 'Pokémon', exact: true }).click()

  const mama = page.getByRole('complementary', { name: 'Mama' })
  await expect(mama).toContainText('Tipp oben links auf das Menü.')
  await clickSpot(page) // the menu button
  await expect(mama).toContainText('Klick links auf „Booster öffnen“.')
  await page.waitForTimeout(600) // the drawer slides in, the ring follows
  await page.screenshot({ path: 'e2e/.shots/mobile-menu.png', animations: 'disabled' })
  await clickSpot(page) // the entry in the drawer
  await expect(page).toHaveURL(/\/open$/)
  await expect(mama).toContainText('„1× öffnen“')
})
