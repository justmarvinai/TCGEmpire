import { expect, test } from '@playwright/test'

const shot = (name: string) => `e2e/.shots/${name}.png`

test('core loop: tutorial booster, opening, summary, binder, kiosk, sell, quests', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Benutzername').fill('Rippa')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Rippa.' })).toBeVisible()

  // Mutti hands over Opa's booster.
  await page.getByRole('button', { name: 'Danke, Mama' }).click()
  await page.getByRole('button', { name: "Zeig's mir" }).click()
  await expect(page.getByRole('heading', { name: 'Booster öffnen' })).toBeVisible()
  await page.getByRole('button', { name: '1× öffnen' }).click()

  // Tear, reveal everything, finish the pack.
  const stage = page.getByRole('dialog', { name: 'Booster öffnen' })
  await expect(stage.getByText('Klicken oder Leertaste: aufreißen')).toBeVisible()
  await page.keyboard.press('Space')
  await expect(stage.getByRole('button', { name: 'Alles aufdecken' })).toBeVisible()
  await stage.getByRole('button', { name: 'Alles aufdecken' }).click()
  await stage.getByRole('button', { name: 'Zur Übersicht' }).last().click()
  await expect(stage.getByText('Alle Karten')).toBeVisible()
  await expect(stage.getByText('(11)')).toBeVisible()
  await page.screenshot({ path: shot('summary') })
  await stage.getByRole('button', { name: 'Schließen', exact: true }).last().click()

  // The level-up waited for the stage to close.
  await expect(page.getByText('LEVEL UP!')).toBeVisible()
  await page.getByRole('button', { name: 'Weiter' }).click()

  // Binder shows 11 of 90 at least.
  await page.getByRole('link', { name: 'Sammlung' }).click()
  await expect(page.getByText('/ 90')).toBeVisible()
  await page.screenshot({ path: shot('binder') })

  // Buy at the kiosk and open with instant reveal.
  await page.getByRole('link', { name: 'Läden' }).click()
  await page.getByRole('button', { name: /^1× kaufen/ }).click()
  await expect(page.getByText('Booster gekauft.')).toBeVisible()
  await page.getByRole('link', { name: 'Jetzt öffnen' }).click()
  await page.getByLabel('Sofort aufdecken').check()
  await page.getByRole('button', { name: '1× öffnen' }).click()
  await expect(stage.getByText('Bilanz')).toBeVisible()
  await stage.getByRole('button', { name: /Bulk verkaufen/ }).click()
  await expect(page.getByText(/Karten verkauft für/)).toBeVisible()
  await stage.getByRole('button', { name: 'Schließen', exact: true }).last().click()

  // Quests and the level path render.
  await page.getByRole('link', { name: 'Quests' }).click()
  await expect(page.getByRole('heading', { name: 'Mini-Quests' })).toBeVisible()
  await page.getByRole('link', { name: 'Level-Pfad' }).click()
  await expect(page.getByText('Du bist hier')).toBeVisible()
})
