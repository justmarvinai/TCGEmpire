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

test('freunde: helping out a friend, coffee and cake, and starting a Sammelbestellung', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Benutzername').fill('Helfer')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Helfer.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+viel EP' }).click()
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: '+1.000 €' }).click()
  await page.getByRole('button', { name: '+Kumpel' }).click()

  await page.getByRole('link', { name: /^Spieler/ }).click()
  for (const tour of ['Spieler', 'Freundschaftsdienste', 'Privatkredit', 'Sammelbestellung']) await finishTour(page, tour)
  const kumpel = page.getByRole('listitem').filter({ hasText: 'Kumpel' })
  await kumpel.getByRole('button', { name: 'Aushelfen' }).click()
  await expect(page.getByText(/^Kumpel\d hatte nichts zu tun/)).toBeVisible()
  await kumpel.getByRole('button', { name: 'Kaffee und Kuchen' }).click()
  await expect(page.getByText(/^Kaffee und Kuchen mit Kumpel/)).toBeVisible()
  await expect(kumpel.getByRole('button', { name: 'Kaffee und Kuchen' })).toBeDisabled()

  await page.getByRole('button', { name: 'Bestellung starten' }).click()
  await expect(page.getByText('Sammelbestellung gestartet. Jetzt brauchst du Mitstreiter.')).toBeVisible()
  await expect(page.getByText('1 von 6 Displays vergeben')).toBeVisible()

  // A loan on the Bierdeckel.
  await kumpel.getByRole('button', { name: 'Kredit' }).click()
  const dialog = page.getByRole('dialog', { name: /^Kredit für Kumpel/ })
  await dialog.getByLabel('Betrag in €').fill('500')
  await dialog.getByRole('button', { name: 'Anbieten' }).click()
  await expect(page.getByText(/^Angebot an Kumpel\d geht raus/)).toBeVisible()
  await expect(page.getByText('Angeboten')).toBeVisible()
  await page.screenshot({ path: shot('friends'), animations: 'disabled' })
})

test('freunde: a box break of an own display, pack by pack', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Benutzername').fill('Breaker')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Breaker.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+viel EP' }).click()
  await page.getByRole('button', { name: '+Display' }).click()

  await page.getByRole('link', { name: /^Pack Battles/ }).click()
  for (const tour of ['Pack Battles', 'Box Breaks']) await finishTour(page, tour)
  await page.getByRole('button', { name: 'Break eröffnen' }).click()
  await expect(page.getByText('Die Packs werden verkauft …')).toBeVisible()
  await page.screenshot({ path: shot('break-open'), animations: 'disabled' })
  await page.getByRole('button', { name: 'Break starten' }).click()
  await expect(page.getByText(/^Pack 1 von \d+ · für den Gastgeber/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/^Pack 2 von \d+/).first()).toBeVisible({ timeout: 10_000 })
  await page.screenshot({ path: shot('break-running'), animations: 'disabled' })
})
