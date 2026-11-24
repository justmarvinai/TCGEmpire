import { expect, test, type Page } from '@playwright/test'
import { finishTour } from './tours.ts'

const shot = (name: string) => `e2e/.shots/${name}.png`

/** Mama's spotlight lets only the marked element through: a click on another menu entry goes nowhere. */
async function blocked(page: Page, name: string) {
  const box = (await page.getByRole('link', { name, exact: true }).boundingBox())!
  const url = page.url()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page).toHaveURL(url)
}

/** Clicks what Mama's spotlight marks, as a player would, once it has settled on fresh data. */
async function clickSpot(page: Page) {
  const ring = page.locator('.coach-ring')
  await expect(ring).toBeVisible()
  await page.waitForTimeout(500)
  const box = (await ring.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}


/** Tear, reveal everything, look at the summary, close. */
async function ripOne(page: Page) {
  const stage = page.getByRole('dialog', { name: 'Booster öffnen' })
  await expect(stage.getByText('Klicken oder Leertaste: aufreißen')).toBeVisible()
  await page.keyboard.press('Space')
  await stage.getByRole('button', { name: 'Alles aufdecken' }).click()
  await stage.getByRole('button', { name: 'Zur Übersicht' }).last().click()
  await expect(stage.getByText('Alle Karten')).toBeVisible()
  return stage
}

test('Mama’s guided tutorial: each step marks what to click and blocks the rest, then the core loop', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('rippa@example.com')
  await page.getByLabel('Benutzername').fill('Rippa')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Rippa.' })).toBeVisible()
  const mama = page.getByRole('complementary', { name: 'Mama' })

  // 1: the favourite game; everything else is dimmed and there is no way to skip.
  await expect(mama).toContainText('Such dir eins aus')
  await expect(mama.getByRole('button', { name: /komm klar|Später/ })).toHaveCount(0)
  await blocked(page, 'Sammlung')
  await page.screenshot({ path: shot('coach-pick'), animations: 'disabled' })
  await mama.getByRole('button', { name: 'Pokémon', exact: true }).click()

  // 2: Opa's booster — first the menu entry, then the button on the page.
  await expect(mama).toContainText('Klick links auf „Booster öffnen“.')
  await blocked(page, 'Sammlung')
  await page.screenshot({ path: shot('coach-nav'), animations: 'disabled' })
  await page.locator('[data-tour="nav:/open"]').click()
  await expect(mama).toContainText('Klick auf „1× öffnen“.')
  await page.screenshot({ path: shot('coach-button'), animations: 'disabled' })
  await page.getByRole('button', { name: '1× öffnen' }).click()
  let stage = await ripOne(page)
  await expect(stage.getByText('(11)')).toBeVisible()
  await page.screenshot({ path: shot('summary'), animations: 'disabled' })
  await stage.getByRole('button', { name: 'Schließen', exact: true }).last().click()
  // The level-up waited for the stage to close; any further one is just dismissed.
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await expect(levelUp).toBeVisible()
  await levelUp.getByRole('button', { name: 'Weiter' }).click()
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  // 3: Pfandflaschen. The round runs out by itself.
  await expect(mama).toContainText('Klick links auf „Jobs“.')
  await page.locator('[data-tour="nav:/jobs"]').click()
  await expect(mama).toContainText('„Los gehts“')
  await page.locator('[data-tour="pfand"]').click()
  await expect(mama).toContainText('Klick die Flaschen an.')
  await page.screenshot({ path: shot('coach-minigame'), animations: 'disabled' })

  // 4: a booster from the kiosk.
  await expect(mama).toContainText('Klick links auf „Läden“.', { timeout: 70_000 })
  await page.locator('[data-tour="nav:/shop"]').click()
  await expect(mama).toContainText('Klick am Kiosk auf „1× kaufen“.')
  await page.locator('[data-tour="kiosk"]').first().click()
  await expect(page.getByText('Booster gekauft.')).toBeVisible()

  // 5: open it.
  await expect(mama).toContainText('Klick links auf „Booster öffnen“.')
  await page.locator('[data-tour="nav:/open"]').click()
  await page.getByRole('button', { name: '1× öffnen' }).click()
  stage = await ripOne(page)
  await stage.getByRole('button', { name: 'Schließen', exact: true }).last().click()

  // 6: sell to the Kartenladen: Mama marks the duplicates if there are any, else a card and then its sell button.
  await expect(mama).toContainText('Klick links auf „Sammlung“.')
  await page.locator('[data-tour="nav:/collection"]').click()
  await expect(page.locator('[data-tour="binder-card"]').first()).toBeVisible() // one collection over all sets (0.0.7)
  await clickSpot(page)
  const sold = page.getByText(/Karten? verkauft für/)
  await expect(sold.or(page.getByRole('dialog'))).toBeVisible()
  if (await page.getByRole('dialog').isVisible()) {
    await expect(mama).toContainText('Klick auf „Eine verkaufen“.')
    await clickSpot(page)
    await expect(sold).toBeVisible()
    await page.keyboard.press('Escape')
  }

  // 7: a quest reward, and Mama lets go.
  await expect(mama).toContainText('Klick links auf „Quests“.')
  await page.locator('[data-tour="nav:/quests"]').click()
  await expect(mama).toContainText('Klick auf „Abholen“.')
  await page.locator('[data-tour="quest-claim"]:enabled').first().click()
  await expect(page.getByText('Mama ist stolz. Ein bisschen.')).toBeVisible()
  await expect(mama).toBeHidden()

  // The quests page's own features introduce themselves, marking what they explain.
  await expect(page.getByRole('complementary', { name: 'Neu: Tagesquests!' })).toBeVisible()
  await page.screenshot({ path: shot('coach-tour'), animations: 'disabled' })
  await finishTour(page, 'Tagesquests') // then Stempelkarte
  await expect(page.getByRole('heading', { name: 'Mini-Quests' })).toBeVisible()

  // Free from here: instant reveal and the bulk sale of the last reward booster, then the level path.
  await page.locator('[data-tour="nav:/open"]').click()
  await page.getByLabel('Sofort aufdecken').check()
  await page.getByRole('button', { name: '1× öffnen' }).click()
  stage = page.getByRole('dialog', { name: 'Booster öffnen' })
  await expect(stage.getByText('Bilanz')).toBeVisible()
  // Bulk sell takes this pack's duplicates; by chance a pack can have none.
  const bulk = stage.getByRole('button', { name: /Bulk verkaufen/ })
  if (await bulk.isEnabled()) {
    await bulk.click()
    await expect(page.getByText(/Karten? verkauft für/).first()).toBeVisible()
  } else {
    await expect(bulk).toHaveText(/\(0\)/)
  }
  await stage.getByRole('button', { name: 'Schließen', exact: true }).last().click()
  await page.locator('[data-tour="nav:/quests"]').click()
  await page.getByRole('link', { name: 'Level-Pfad' }).click()
  await expect(page.getByText('Du bist hier')).toBeVisible()
})
