import { expect, test } from '@playwright/test'

// Selling to the Kartenladen: all duplicates at once and a single card. The live game once sent these lists as
// JSON text, which the server refused ("Ungültige Anfrage."); local mode now passes arguments like Supabase does.
test('sell duplicates and a single card to the Kartenladen', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('haendler@example.com')
  await page.getByLabel('Benutzername').fill('Haendler')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Haendler.' })).toBeVisible()

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  await page.getByRole('button', { name: '+Duplikate' }).click() // three Pokémon commons, three of each

  await page.getByRole('link', { name: /^Sammlung/ }).click()
  await page.getByRole('group', { name: 'Spiel' }).getByRole('button', { name: 'Pokémon' }).click()
  await page.getByRole('button', { name: 'Duplikate verkaufen (6)' }).click()
  await expect(page.getByText(/^6 Karten verkauft für /)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Duplikate verkaufen (0)' })).toBeDisabled()

  await page.getByRole('button', { name: /Bisasam/ }).click()
  await page.getByRole('dialog', { name: 'Bisasam' }).getByRole('button', { name: 'Eine verkaufen' }).click()
  await expect(page.getByText(/^Eine Karte verkauft für /)).toBeVisible()
  await expect(page.getByText('Ungültige Anfrage.')).toHaveCount(0)
})
