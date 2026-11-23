import { expect, test, type Page } from '@playwright/test'

const shot = (name: string) => `e2e/.shots/${name}.png`

async function finishTour(page: Page, name: string) {
  const tour = page.getByRole('complementary', { name: `Neu: ${name}!` })
  await expect(tour).toBeVisible()
  while (await tour.getByRole('button', { name: 'Weiter' }).isVisible()) await tour.getByRole('button', { name: 'Weiter' }).click()
  await tour.getByRole('button', { name: 'Verstanden' }).click()
  await expect(tour).toBeHidden()
}

test('firma: Gewerbeanmeldung, Passierschein A38, founding, hiring and the pipeline', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('chefin@example.com')
  await page.getByLabel('Benutzername').fill('Chefin')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Chefin.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+viel EP' }).click()
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '+100.000 €' }).click()

  await page.getByRole('link', { name: /^Firma/ }).click()
  await finishTour(page, 'Firma')
  await page.getByRole('button', { name: 'Antrag stellen' }).click()
  await expect(page.getByText(/^Der Antrag wird bearbeitet/)).toBeVisible()

  // the Bearbeitungszeit passes
  await page.goto('/dev/ui')
  await page.getByRole('button', { name: '+1 Stunde' }).click()
  await page.getByRole('link', { name: /^Firma/ }).click()
  await page.getByRole('button', { name: 'Ab ins Amt' }).click()
  const amt = page.getByRole('dialog', { name: 'Das Haus, das Verrückte macht' })
  await amt.getByRole('button', { name: 'Kantine' }).click()
  await expect(amt.getByText(/^Falsche Tür/)).toBeVisible()
  for (const door of ['Treppe zum Keller', 'Treppe in den dritten Stock', 'Zimmer 2B', 'Das Formular selbst ausfüllen']) await amt.getByRole('button', { name: door }).click()
  await expect(page.getByText('Du hast den Passierschein A38. Der Pförtner salutiert.')).toBeVisible()

  await page.getByLabel('Firmenname').fill('Glurak & Söhne')
  await page.getByLabel('Slogan').fill('Wir graden alles. Fast.')
  await page.getByRole('radiogroup', { name: 'Grundfarbe' }).getByRole('radio', { name: 'gold' }).click()
  await page.screenshot({ path: shot('company-found'), animations: 'disabled' })
  await page.getByRole('button', { name: /^Gründen/ }).click()
  await expect(page.getByText(/^Glurak & Söhne ist gegründet/)).toBeVisible()

  // money in, two people hired, the pipeline shows the bottleneck
  await page.getByRole('button', { name: 'Einzahlen' }).click()
  const dialog = page.getByRole('dialog', { name: 'Geld einlegen' })
  await dialog.getByLabel('Betrag in €').fill('20000')
  await dialog.getByRole('button', { name: 'Einzahlen' }).click()
  await expect(page.getByText(/eingelegt\. Die Firma dankt\./)).toBeVisible()
  await expect(page.getByText('Wo es hakt')).toBeVisible()
  await page.getByRole('tab', { name: 'Team' }).click()
  await page.getByRole('button', { name: 'Einstellen' }).first().click()
  await expect(page.getByText(/ist eingestellt/)).toBeVisible()
  await page.screenshot({ path: shot('company-team'), animations: 'disabled' })
  await page.getByRole('tab', { name: 'Übersicht' }).click()
  await expect(page.getByText('Fließband')).toBeVisible()
  await page.screenshot({ path: shot('company'), animations: 'disabled' })

  // Büro: a flyer campaign, the tax office, the grey zone
  await page.getByRole('tab', { name: 'Büro' }).click()
  await page.getByRole('listitem').filter({ hasText: 'Flyer im Kiosk' }).getByRole('button', { name: /^Starten/ }).click()
  await expect(page.getByText(/^Flyer im Kiosk läuft/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Formular ausfüllen' }).click()
  await expect(page.getByRole('dialog', { name: 'Umsatzsteuer-Voranmeldung' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.screenshot({ path: shot('company-office'), animations: 'disabled' })
})
