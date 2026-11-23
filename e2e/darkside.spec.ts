import { expect, test } from '@playwright/test'
import { finishTour } from './tours.ts'

const shot = (name: string) => `e2e/.shots/${name}.png`


test('schattenwirtschaft: a bunker heist on a friend, a rumour, the file', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('schlitzohr@example.com')
  await page.getByLabel('Benutzername').fill('Schlitzohr')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Schlitzohr.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '+viel EP' }).click()
  await page.getByRole('button', { name: '+100.000 €' }).click()
  await page.getByRole('button', { name: '+Kumpel' }).click()
  await page.getByRole('button', { name: '+1 Stunde' }).click()

  await page.getByRole('link', { name: /^Schattenwirtschaft/ }).click()
  await finishTour(page, 'Schattenwirtschaft')
  const target = page.getByRole('listitem').filter({ hasText: 'Kumpel' }).first()
  await expect(target.getByText('Bunker knacken')).toBeVisible()
  await expect(target.getByText('Keine Firma').first()).toBeVisible()
  await page.screenshot({ path: shot('darkside'), animations: 'disabled' })

  // hold to attack: either the heist works or Wachhund Rex bites
  await target.getByRole('button', { name: 'Halten' }).first().click({ delay: 1200 })
  await expect(page.getByText(/^(Geknackt!|Abgeblitzt\.)/)).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: /Bunker knacken gegen Kumpel/ })).toBeVisible()

  // a rumour about the most valuable card
  await page.getByRole('button', { name: 'Hochjubeln' }).click()
  await expect(page.getByText(/^(Das Gerücht verbreitet sich|Abgeblitzt\.)/)).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: /Gerücht streuen gegen den Markt/ })).toBeVisible()
  await page.getByRole('listitem').filter({ hasText: /Gerücht streuen gegen den Markt/ }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: shot('darkside-log'), animations: 'disabled' })
})
