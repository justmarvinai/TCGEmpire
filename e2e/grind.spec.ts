import { expect, test } from '@playwright/test'

const shot = (name: string) => `e2e/.shots/${name}.png`

test('grind loop: bunker, upgrades, quests and stamps, shifts, snacks, profile and reset', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Benutzername').fill('Grinder')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Grinder.' })).toBeVisible()

  // Level-ups can happen at any point here (stamps and quests pay EP); just dismiss them.
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  // Dev tools: levels, money, no tutorial.
  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  await page.getByRole('button', { name: '+viel EP' }).click()
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '+1.000 €' }).click()
  await page.getByRole('button', { name: '+1 Stunde' }).click()

  // Geldbunker: an hour of income is waiting.
  await expect(page.getByRole('link', { name: 'Geldbunker NEU' })).toBeVisible()
  await page.getByRole('link', { name: 'Geldbunker' }).click()
  await expect(page.getByRole('heading', { name: 'Geldbunker' })).toBeVisible()

  // Mutti's tour of the new feature, once; then NEU is gone.
  const tour = page.getByRole('complementary', { name: 'Neu: Geldbunker!' })
  await expect(tour).toBeVisible()
  await page.screenshot({ path: shot('tour') })
  await tour.getByRole('button', { name: 'Weiter' }).click()
  await tour.getByRole('button', { name: 'Weiter' }).click()
  await tour.getByRole('button', { name: 'Verstanden' }).click()
  await expect(tour).toBeHidden()
  await expect(page.getByRole('link', { name: 'Geldbunker NEU' })).toBeHidden()
  await page.getByRole('button', { name: 'Abholen' }).click()
  await expect(page.getByText(/12\d,\d\d € abgeholt\. Riecht nach Geld/)).toBeVisible() // one hour at 120 €/h
  await page.screenshot({ path: shot('bunker') })

  // Upgrades: buy one.
  await page.getByRole('link', { name: 'Upgrades' }).click()
  await page.getByRole('button', { name: 'Kaufen' }).first().click()
  await expect(page.getByText(/verbessert\./)).toBeVisible()
  await page.screenshot({ path: shot('upgrades') })

  // Quests: dailies exist, stamp today.
  await page.getByRole('link', { name: 'Quests' }).click()
  await expect(page.getByRole('heading', { name: 'Tagesquests' })).toBeVisible()
  await page.getByRole('button', { name: 'Stempeln' }).click()
  await expect(page.getByRole('button', { name: 'Heute gestempelt' })).toBeVisible()
  await page.screenshot({ path: shot('quests') })

  // Jobs: start a 15-minute shift.
  await page.getByRole('link', { name: 'Jobs' }).click()
  await page.getByRole('button', { name: '15 Min' }).click()
  await expect(page.getByRole('button', { name: 'Feierabend machen' })).toBeVisible()
  await page.screenshot({ path: shot('jobs') })
  // Phone width, once per milestone.
  const size = page.viewportSize()!
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: shot('jobs-390'), fullPage: true })
  await page.setViewportSize(size)

  // Shop: a Döner gives greasy fingers.
  await page.getByRole('link', { name: 'Läden' }).click()
  await page.getByRole('button', { name: 'Kaufen', exact: true }).first().click()
  await page.getByRole('button', { name: 'Fettfinger' }).click()
  await expect(page.getByText(/Läuft bis \d\d:\d\d Uhr\./)).toBeVisible()
  await page.screenshot({ path: shot('buff'), animations: 'disabled' })
  await page.keyboard.press('Escape')

  // Profile: achievements, then the Gefahrenzone resets everything.
  await page.getByRole('link', { name: 'Profil' }).click()
  await expect(page.getByRole('heading', { name: 'Erfolge' })).toBeVisible()
  await page.screenshot({ path: shot('profile'), fullPage: true })
  await page.getByLabel('Tipp „Grinder“ zur Bestätigung').first().fill('grinder')
  const hold = page.getByRole('button', { name: /Account zurücksetzen/ })
  await hold.hover()
  await page.mouse.down()
  await page.waitForTimeout(1700)
  await page.mouse.up()
  await expect(page.getByText('Alles weg. Neues Leben, gleiche Fehler.')).toBeVisible()
  await expect(page.getByText('Level 1', { exact: true })).toBeVisible()
})
