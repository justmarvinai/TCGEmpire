import { expect, test, type Page } from '@playwright/test'

const shot = (name: string) => `e2e/.shots/${name}.png`

/** Mutti's tour of a feature: click through to the end, then it is gone. */
async function finishTour(page: Page, name: string) {
  const tour = page.getByRole('complementary', { name: `Neu: ${name}!` })
  await expect(tour).toBeVisible()
  while (await tour.getByRole('button', { name: 'Weiter' }).isVisible()) await tour.getByRole('button', { name: 'Weiter' }).click()
  await tour.getByRole('button', { name: 'Verstanden' }).click()
  await expect(tour).toBeHidden()
}

test('flip: Cardmarket, Kleinanzeigen, toplists, Stammtisch, players, trade and the admin console', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Benutzername').fill('Flipper')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Flipper.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  await page.getByRole('button', { name: '+viel EP' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+1.000 €' }).click()

  // Cardmarket: every card has a Marktwert and a page with its chart.
  await page.getByRole('link', { name: /^Cardmarket/ }).click()
  await finishTour(page, 'Cardmarket')
  await page.getByLabel('Karte oder Produkt suchen …').fill('Glurak')
  await page.getByRole('link', { name: 'Glurak', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Glurak/ })).toBeVisible()
  await expect(page.getByText('Letzte Verkäufe')).toBeVisible()
  await page.screenshot({ path: shot('cardmarket-item'), animations: 'disabled' })

  // Kleinanzeigen: NPC ads to haggle over.
  await page.getByRole('link', { name: /^Kleinanzeigen/ }).click()
  await finishTour(page, 'Kleinanzeigen')
  await expect(page.getByRole('button', { name: 'Anbieten' }).first()).toBeVisible()

  // Toplisten: NPC rivals and the distance to the next place.
  await page.getByRole('link', { name: /^Toplisten/ }).click()
  await finishTour(page, 'Toplisten')
  await expect(page.getByText(/^Platz \d+$/)).toBeVisible()
  await expect(page.getByText('NPC', { exact: true }).first()).toBeVisible()
  await page.getByRole('tab', { name: 'Level' }).click()
  await page.getByLabel('NPCs zeigen').uncheck()
  await expect(page.getByText('Genieß es, lange bleibt das nicht so.')).toBeVisible()
  await page.screenshot({ path: shot('toplists'), animations: 'disabled' })

  // Stammtisch: say something.
  await page.getByRole('link', { name: /^Stammtisch/ }).click()
  await finishTour(page, 'Stammtisch')
  await page.getByLabel('Schreib was. Oder lass es.').fill('Moin Stammtisch!')
  await page.getByRole('button', { name: 'Senden' }).click()
  await expect(page.getByText('Moin Stammtisch!')).toBeVisible()
  await page.screenshot({ path: shot('stammtisch'), animations: 'disabled' })

  // Spieler and Tausch: alone on the server, but the allowance is there.
  await page.getByRole('link', { name: /^Spieler/ }).click()
  await finishTour(page, 'Spieler')
  await expect(page.getByText('Freibetrag heute').first()).toBeVisible()
  await page.getByRole('link', { name: /^Tausch/ }).click()
  await finishTour(page, 'Tausch und Geschenke')
  await expect(page.getByText('Angebote an dich')).toBeVisible()

  // The first account is the admin.
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  await page.getByRole('link', { name: /Admin-Konsole/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: /Admin-Konsole/ })).toBeVisible()
  await page.getByRole('button', { name: 'Jetzt auffüllen' }).first().click()
  await expect(page.getByText('Aufgefüllt. Die Schlange bildet sich.')).toBeVisible()
  await page.screenshot({ path: shot('admin'), animations: 'disabled' })

  // Phone width, once per milestone.
  await page.getByRole('link', { name: /^Toplisten/ }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: shot('toplists-390'), fullPage: true, animations: 'disabled' })
})
