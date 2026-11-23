import { expect, test } from '@playwright/test'

test('hilfe: rules and a searchable TCG-Lexikon', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('neuling@example.com')
  await page.getByLabel('Benutzername').fill('Neuling')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Neuling.' })).toBeVisible()
  await page.getByRole('link', { name: /^Hilfe & Lexikon/ }).click()
  await expect(page.getByText('Ein Konto pro Person')).toBeVisible()
  await page.getByLabel('Begriff suchen …').fill('slab')
  await expect(page.getByText('Die versiegelte Plastikhülle mit der Note.', { exact: false })).toBeVisible()
  await expect(page.getByText('Bulk', { exact: true })).toBeHidden()
  await page.screenshot({ path: 'e2e/.shots/help.png', animations: 'disabled' })
})
