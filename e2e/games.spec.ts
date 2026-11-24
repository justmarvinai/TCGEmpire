import { expect, test } from '@playwright/test'

const shot = (name: string) => `e2e/.shots/${name}.png`

test('four games: starter pick, Opa’s Yu-Gi-Oh! booster, licences and the binder per game', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('duellant@example.com')
  await page.getByLabel('Benutzername').fill('Duellant')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Duellant.' })).toBeVisible()

  // Mama asks for the favourite game; Opa's booster comes from it.
  await page.getByRole('button', { name: 'Yu-Gi-Oh!', exact: true }).click()
  await expect(page.getByText('Yu-Gi-Oh! also. Mama hätte was anderes genommen.')).toBeVisible()
  await page.locator('[data-tour="nav:/open"]').click() // the menu entry Mama's spotlight marks
  await expect(page.getByText('Yu-Gi-Oh! LOB Booster').first()).toBeVisible()
  await page.getByRole('button', { name: '1× öffnen' }).click()
  const stage = page.getByRole('dialog', { name: 'Booster öffnen' })
  await expect(stage.getByText('Klicken oder Leertaste: aufreißen')).toBeVisible()
  await page.keyboard.press('Space')
  await stage.getByRole('button', { name: 'Alles aufdecken' }).click()
  await stage.getByRole('button', { name: 'Zur Übersicht' }).last().click()
  await expect(stage.getByText('(9)')).toBeVisible() // nine cards in a LOB booster
  await page.screenshot({ path: shot('ygo-summary'), animations: 'disabled' })
  await stage.getByRole('button', { name: 'Schließen', exact: true }).last().click()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())
  // The rest of Mama's tutorial is rip.spec's; here it is switched off.
  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()

  // Läden: Yu-Gi-Oh! is licensed, the other games wait for their licence.
  await page.getByRole('link', { name: /^Läden/ }).click()
  await expect(page.getByRole('heading', { name: 'Händlerlizenzen' }).or(page.getByText('Händlerlizenzen').first())).toBeVisible()
  await expect(page.getByText('Lieblingsspiel')).toBeVisible()
  await expect(page.getByText('Lizenz fehlt').first()).toBeVisible()
  // A pack shows what is in it and how often (0.0.7); the kiosk pack bobs, so the click does not wait for it to rest.
  await page.getByRole('button', { name: 'Was ist in Yu-Gi-Oh! LOB Booster?' }).first().click({ force: true })
  const info = page.getByRole('dialog', { name: 'Yu-Gi-Oh! LOB Booster' })
  await expect(info.getByText('Chancen im Hit-Platz')).toBeVisible()
  await expect(info.getByRole('heading', { name: /^Grail/ })).toBeVisible()
  await page.screenshot({ path: shot('pack-info'), animations: 'disabled' })
  await page.keyboard.press('Escape')

  // Sammlung: one collection, filtered to the game; the pulled cards and the Sammelziele of the set.
  await page.getByRole('link', { name: /^Sammlung/ }).click()
  // the kiosk has the same "Spiel" filter and stays on screen while the Sammlung loads
  await expect(page.getByLabel('Set', { exact: true })).toBeVisible()
  await page.getByRole('group', { name: 'Spiel' }).getByRole('button', { name: 'Yu-Gi-Oh!' }).click()
  await expect(page.getByText('Exodia, komplett')).toBeVisible()
  await expect(page.locator('[data-tier]').first()).toBeVisible() // card art from the set's atlas
  await page.screenshot({ path: shot('ygo-binder'), animations: 'disabled' })
  // Phone width, once per milestone.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: shot('ygo-binder-390'), animations: 'disabled' })
})
