import { expect, test } from '@playwright/test'

const shot = (name: string) => `e2e/.shots/${name}.png`

// 0.0.9: sets 2 and 3 start "Angekündigt" and stay out of the game until the admin releases them.
test('the admin releases an announced set: it sells at the kiosk, opens and shows up in the Sammlung', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('chefin@example.com')
  await page.getByLabel('Benutzername').fill('Chefin')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click() // the first account is the admin
  await expect(page.getByRole('heading', { name: 'Moin, Chefin.' })).toBeVisible()
  await page.getByRole('complementary', { name: 'Mama' }).getByRole('button', { name: 'Pokémon', exact: true }).click()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())
  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  await page.getByRole('button', { name: 'Touren aus' }).click()

  // Before the release the set is nowhere: not in the Sammlung's set filter.
  await page.goto('/collection')
  const setFilter = page.getByLabel('Set')
  await expect(setFilter.locator('option', { hasText: 'Pokémon · Basis-Set' })).toHaveCount(1)
  await expect(setFilter.locator('option', { hasText: 'Pokémon · Dschungel' })).toHaveCount(0)

  // The admin console releases it.
  await page.goto('/admin')
  const jungle = page.getByRole('listitem').filter({ hasText: 'Pokémon · Dschungel' })
  await expect(jungle.locator('span', { hasText: 'Angekündigt' })).toBeVisible()
  await jungle.getByRole('combobox').selectOption('print')
  await jungle.getByRole('button', { name: 'Phase setzen' }).click()
  await expect(page.getByText('Phase gesetzt. Steht schon in der Zeitung.')).toBeVisible()
  await expect(jungle.locator('span', { hasText: 'Im Druck' })).toBeVisible()

  // Now the kiosk sells it, and it opens like any booster.
  await page.goto('/shop')
  const tile = page.getByRole('listitem').filter({ hasText: 'Dschungel Booster' })
  await expect(tile).toBeVisible()
  await page.screenshot({ path: shot('kiosk-released-set'), animations: 'disabled' })
  await tile.getByRole('button', { name: '1× kaufen' }).click()
  await expect(page.getByText('Booster gekauft.')).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Fossil Booster' })).toHaveCount(0) // still announced

  await page.goto('/open')
  await page.getByText('Dschungel Booster', { exact: true }).locator('..').getByRole('button', { name: '1× öffnen' }).click()
  const stage = page.getByRole('dialog', { name: 'Booster öffnen' })
  await page.keyboard.press('Space')
  await stage.getByRole('button', { name: 'Alles aufdecken' }).click()
  await stage.getByRole('button', { name: 'Zur Übersicht' }).last().click()
  await expect(stage.getByText('(11)')).toBeVisible()
  await page.screenshot({ path: shot('opened-released-set'), animations: 'disabled' })
  await stage.getByRole('button', { name: 'Schließen', exact: true }).last().click()

  // The Sammlung has the set now, with the cards just pulled.
  await page.goto('/collection')
  await setFilter.selectOption({ label: 'Pokémon · Dschungel' })
  await expect(page.locator('[data-tour="binder-card"]').first()).toBeVisible()
  await expect(setFilter.locator('option', { hasText: 'Pokémon · Fossil' })).toHaveCount(0)
})
