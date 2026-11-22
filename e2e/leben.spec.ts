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

test('leben: skill tree, moving out, furnishing, style, insurance, Wochenwertung and the profile', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Benutzername').fill('Lebemann')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Lebemann.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+viel EP' }).click()
  for (let i = 0; i < 20; i++) await page.getByRole('button', { name: '+1.000 €' }).click()

  // Skillbaum: the first node of the Sammler branch.
  await page.getByRole('link', { name: /^Skillbaum/ }).click()
  await finishTour(page, 'Skillbaum')
  const node = page.locator('div').filter({ has: page.getByText('Glückspfennig', { exact: true }) }).last()
  await node.getByRole('button', { name: /^Lernen/ }).click()
  await expect(page.getByText('Glückspfennig gelernt.')).toBeVisible()
  await page.screenshot({ path: shot('skills'), animations: 'disabled' })

  // Wohnen: move into the WG, put a desk in.
  await page.getByRole('link', { name: /^Wohnen/ }).click()
  await finishTour(page, 'Wohnen')
  await page.getByRole('button', { name: /^Umziehen/ }).first().click()
  await expect(page.getByText(/^Willkommen im WG-Zimmer/)).toBeVisible()
  await page.getByRole('button', { name: 'Kaufen · 400,00 €' }).first().click()
  await expect(page.getByText('Ikea-Schreibtisch steht. Der alte Kram ist auf dem Sperrmüll.')).toBeVisible()
  await page.screenshot({ path: shot('housing'), animations: 'disabled' })

  // Stil: a name colour, worn.
  await page.getByRole('link', { name: /^Stil/ }).click()
  await finishTour(page, 'Stil')
  const mint = page.locator('li').filter({ has: page.getByText('Minzgrün', { exact: true }) })
  await mint.getByRole('button', { name: /^Kaufen/ }).click()
  await mint.getByRole('button', { name: 'Anlegen' }).click()
  await expect(mint.getByRole('button', { name: 'Ablegen' })).toBeVisible()
  await page.screenshot({ path: shot('style'), animations: 'disabled' })

  // Versicherungen: parcels insured.
  await page.getByRole('link', { name: /^Versicherungen/ }).click()
  await finishTour(page, 'Versicherungen')
  await page.getByRole('button', { name: 'Abschließen' }).first().click()
  await expect(page.getByText('Versichert')).toBeVisible()

  // Toplisten: the Wochenwertung runs until Monday.
  await page.getByRole('link', { name: /^Toplisten/ }).click()
  await page.getByRole('tab', { name: 'Wochenwertung' }).click()
  await expect(page.getByText(/^Die Woche endet in/)).toBeVisible()
  await page.screenshot({ path: shot('league'), animations: 'disabled' })

  // Profil: home, trophies, Vitrine, Gästebuch.
  await page.getByRole('link', { name: /^Profil/ }).click()
  await expect(page.getByText('WG-Zimmer in Berlin-Neukölln')).toBeVisible()
  await expect(page.getByText('Pokale')).toBeVisible()
  await page.screenshot({ path: shot('profile'), animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: shot('profile-390'), animations: 'disabled' })
})
