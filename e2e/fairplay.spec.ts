import { expect, test } from '@playwright/test'
import { finishTour } from './tours.ts'

// Fair play (decision 111): limits show up before a player hits them, and the admin sees one-way flows.
const shot = (name: string) => `e2e/.shots/${name}.png`


test('fair play: gift limit, loan maximum, market band and the flows in the admin console', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('chef@example.com')
  await page.getByLabel('Benutzername').fill('Chef')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Chef.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  await page.getByRole('button', { name: '+viel EP' }).click()
  await expect(page.getByRole('link', { name: /^Spieler/ })).toBeVisible()
  await page.getByRole('button', { name: '+100.000 €' }).click()
  await page.getByRole('button', { name: '+Kumpel' }).click()
  await page.getByRole('button', { name: '+1 Stunde' }).click() // past the trade lock of a fresh account

  // A gift: the friend may only receive so much a day; the dialog says so before sending.
  await page.getByRole('link', { name: /^Spieler/ }).click()
  await finishTour(page, 'Spieler')
  await page.getByRole('button', { name: 'Schenken' }).click()
  const gift = page.getByRole('dialog', { name: 'Geschenk für Kumpel1' })
  await gift.getByLabel('Geld (€)').fill('99999')
  await expect(gift.getByText('Zu viel: Das darf Kumpel1 heute nicht mehr annehmen.')).toBeVisible()
  await expect(gift.getByRole('button', { name: 'Schenken' })).toBeDisabled()
  await page.screenshot({ path: shot('fair-gift'), animations: 'disabled' })
  await gift.getByLabel('Geld (€)').fill('100')
  await expect(gift.getByText(/^Kumpel1 kann heute noch .+ geschenkt bekommen\./)).toBeVisible()
  await gift.getByRole('button', { name: 'Schenken' }).click()
  await expect(page.getByText(/an Kumpel1 verschenkt/)).toBeVisible()

  // A loan: the maximum follows the borrower's income.
  await page.getByRole('button', { name: 'Kredit' }).click()
  const loan = page.getByRole('dialog', { name: 'Kredit für Kumpel1' })
  await expect(loan.getByText(/^Höchstens .+, das richtet sich nach dem Einkommen des Empfängers\./)).toBeVisible()
  await loan.getByRole('button', { name: 'Abbrechen' }).click()

  // The Cardmarket: players trade within a band around the Marktwert.
  await page.getByRole('link', { name: /^Cardmarket/ }).click()
  await finishTour(page, 'Cardmarket')
  await page.getByLabel('Karte oder Produkt suchen …').fill('Glurak')
  await page.getByRole('link', { name: 'Glurak', exact: true }).click()
  const band = page.getByText(/^Erlaubt: .+ bis .+ \(50–200 % vom Marktwert\)/).first()
  await expect(band).toBeVisible()
  await page.locator('section').filter({ has: band }).first().screenshot({ path: shot('fair-market') })

  // The admin sees who sends value to whom.
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  await page.getByRole('link', { name: /Admin-Konsole/ }).click()
  await page.keyboard.press('Escape')
  const flows = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Geldflüsse zwischen Spielern' }) })
  await expect(flows.getByRole('cell', { name: 'Kumpel1' })).toBeVisible()
  await expect(flows.getByText('Geschenke 100,00 €')).toBeVisible()
  await flows.screenshot({ path: shot('fair-flows') })
})
