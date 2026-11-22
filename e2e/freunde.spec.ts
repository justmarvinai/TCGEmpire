import { expect, test, type Page } from '@playwright/test'

const shot = (name: string) => `e2e/.shots/${name}.png`

async function finishTour(page: Page, name: string) {
  const tour = page.getByRole('complementary', { name: `Neu: ${name}!` })
  await expect(tour).toBeVisible()
  while (await tour.getByRole('button', { name: 'Weiter' }).isVisible()) await tour.getByRole('button', { name: 'Weiter' }).click()
  await tour.getByRole('button', { name: 'Verstanden' }).click()
  await expect(tour).toBeHidden()
}

test('freunde: a pack battle against bots, round by round, with emotes and a result', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.getByLabel('Benutzername').fill('Zocker')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Zocker.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+viel EP' }).click()
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '+1.000 €' }).click()

  // Lobby: open a four-seat Klassisch battle with two packs.
  await page.getByRole('link', { name: /^Pack Battles/ }).click()
  await finishTour(page, 'Pack Battles')
  await expect(page.getByText('Keine offenen Battles. Mach eins auf, du Feigling.')).toBeVisible()
  await page.getByRole('radiogroup', { name: 'Plätze' }).getByRole('radio', { name: '4' }).click()
  await page.getByLabel('Packs pro Platz').selectOption('2')
  await page.screenshot({ path: shot('battles-lobby'), animations: 'disabled' })
  await page.getByRole('button', { name: 'Eröffnen' }).click()
  await expect(page.getByText('Wartet auf Mitspieler …')).toBeVisible()

  // Start with bots; the rounds come one after the other.
  await page.getByRole('button', { name: 'Mit Bots starten' }).click()
  await expect(page.getByText(/^Runde 1 von 2/)).toBeVisible({ timeout: 10_000 })
  await page.getByRole('group', { name: 'Emotes' }).getByRole('button', { name: '🔥' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Zocker 🔥' })).toBeVisible()
  await page.screenshot({ path: shot('battle-running'), animations: 'disabled' })
  await expect(page.getByText(/gewinnt/)).toBeVisible({ timeout: 25_000 })
  await expect(page.getByText(/^(Gewonnen!|Verloren\.)/)).toBeVisible()
  await page.screenshot({ path: shot('battle-done'), animations: 'disabled' })

  // Back in the lobby the battle is listed as played.
  await page.getByRole('link', { name: '← Zur Lobby' }).click()
  await expect(page.getByRole('button', { name: 'Ansehen' }).or(page.getByRole('link', { name: 'Ansehen' }))).toBeVisible()
})
