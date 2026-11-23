import { expect, test, type Page } from '@playwright/test'

const shot = (name: string) => `e2e/.shots/${name}.png`

async function finishTour(page: Page, name: string) {
  const tour = page.getByRole('complementary', { name: `Neu: ${name}!` })
  await expect(tour).toBeVisible()
  while (await tour.getByRole('button', { name: 'Weiter' }).isVisible()) await tour.getByRole('button', { name: 'Weiter' }).click()
  await tour.getByRole('button', { name: 'Verstanden' }).click()
  await expect(tour).toBeHidden()
}

test('der exit: sell the empire, buy a perk, bring a card down from the attic', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByLabel('Benutzername').fill('Tycoon')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Tycoon.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  await page.getByRole('button', { name: '+5 Hits' }).click()
  await page.getByRole('button', { name: '+100.000 €' }).click()
  await page.getByRole('button', { name: 'Level 100' }).click()

  await page.getByRole('link', { name: /^Prestige/ }).click()
  await finishTour(page, 'Der Exit')
  await expect(page.getByText('Sterne für den Exit')).toBeVisible()
  await page.getByLabel('Zum Bestätigen „Tycoon“ eintippen').fill('Tycoon')
  await page.screenshot({ path: shot('prestige'), animations: 'disabled' })
  await page.getByRole('button', { name: 'Gedrückt halten: Imperium verkaufen' }).click({ delay: 1700 })
  await expect(page.getByText(/^Verkauft! \+\d+ Sterne\. Willkommen als Kleinunternehmer\./)).toBeVisible()
  await expect(page.getByText('Kleinunternehmer').first()).toBeVisible()

  await page.getByRole('button', { name: /^Kaufen für 2 Sterne/ }).first().click()
  await expect(page.getByText(/: eine Stufe mehr\. Für immer\./)).toBeVisible()
  await page.getByRole('button', { name: 'Runterholen' }).first().click()
  await expect(page.getByText('Runtergeholt. Oma hat geschimpft, aber geholfen.')).toBeVisible()
  await page.screenshot({ path: shot('prestige-after'), animations: 'disabled', fullPage: true })
})
