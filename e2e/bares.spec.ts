import { expect, test, type Page } from '@playwright/test'

const shot = (name: string) => `e2e/.shots/${name}.png`

async function finishTour(page: Page, name: string) {
  const tour = page.getByRole('complementary', { name: `Neu: ${name}!` })
  await expect(tour).toBeVisible()
  while (await tour.getByRole('button', { name: 'Weiter' }).isVisible()) await tour.getByRole('button', { name: 'Weiter' }).click()
  await tour.getByRole('button', { name: 'Verstanden' }).click()
  await expect(tour).toBeHidden()
}

test('bares für rares: appraisal, dealer bids, a deal', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByLabel('Benutzername').fill('Studiogast')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Studiogast.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+viel EP' }).click()
  await page.getByRole('button', { name: '+5 Hits' }).click()

  await page.getByRole('link', { name: /^Bares für Rares/ }).click()
  await finishTour(page, 'Bares für Rares')
  await page.getByRole('button', { name: 'Ab ins Studio' }).first().click()
  await expect(page.getByText('Expertise')).toBeVisible()
  await expect(page.getByText('Der Achtzig-Euro-Mann')).toBeVisible()
  await page.screenshot({ path: shot('bares'), animations: 'disabled' })
  await page.getByRole('button', { name: 'Deal!' }).first().click()
  await expect(page.getByText(/^Deal! .+ zahlt .+ bar auf die Hand\./)).toBeVisible()
  await expect(page.getByText('Morgen gibt es eine neue Sendung.')).toBeVisible()
})
