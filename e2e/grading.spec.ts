import { expect, test } from '@playwright/test'
import { finishTour } from './tours.ts'

const shot = (name: string) => `e2e/.shots/${name}.png`

/** Mutti's tour of a feature: click through to the end, then it is gone. */

test('grading: Vorprüfung, sending a card to CGC, the reveal, the slab and the Vitrine', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('grader@example.com')
  await page.getByLabel('Benutzername').fill('Grader')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Grader.' })).toBeVisible()
  const levelUp = page.getByRole('dialog', { name: 'LEVEL UP!' })
  await page.addLocatorHandler(levelUp, () => levelUp.getByRole('button', { name: 'Weiter' }).click())

  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  await page.getByRole('button', { name: '+viel EP' }).click()
  await page.getByRole('button', { name: '+viel EP' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+1.000 €' }).click()
  await page.getByRole('button', { name: '+5 Hits' }).click()

  // Prüfen & Einschicken: look through the Lupe, pick a card, CGC Express.
  await page.getByRole('link', { name: /^Grading/ }).click()
  await finishTour(page, 'Grading')
  await page.getByRole('button', { name: 'Mit der Lupe prüfen' }).first().click()
  await expect(page.getByText(/^Note etwa/).first()).toBeVisible()
  await page.getByRole('checkbox').first().check()
  await page.getByRole('radio', { name: /^CGC/ }).click()
  await page.getByRole('radio', { name: /^Express/ }).click()
  await page.screenshot({ path: shot('grading-check'), animations: 'disabled' })
  await page.getByRole('button', { name: '1 Karte einschicken' }).click()
  await expect(page.getByText(/^zurück in/)).toBeVisible()

  // Ten minutes later the parcel is back: tear it open, drum roll, grade. (In-app navigation: a reload could
  // drop the local database's latest writes.)
  await page.evaluate(() => {
    history.pushState({}, '', '/dev/ui')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.getByRole('button', { name: '+1 Stunde' }).click()
  await page.getByRole('link', { name: /^Grading/ }).click()
  await page.getByRole('tab', { name: /Beim Grader/ }).click()
  await page.getByRole('button', { name: 'Aufdecken', exact: true }).click()
  const reveal = page.getByRole('dialog', { name: 'Post vom Grader' })
  await reveal.getByRole('button', { name: 'Aufreißen' }).click()
  await reveal.getByRole('button', { name: /Klick zeigt die Note sofort/ }).click()
  await expect(reveal.getByText(/^Roh .* → Slab/)).toBeVisible()
  await page.screenshot({ path: shot('grading-reveal'), animations: 'disabled' })
  await reveal.getByRole('button', { name: 'Ab in die Sammlung' }).click()

  await page.getByRole('tab', { name: /Deine Slabs/ }).click()
  await expect(page.getByText(/^Pop \d+ · \d+ höher$/)).toBeVisible()
  await page.screenshot({ path: shot('grading-slabs'), animations: 'disabled' })

  // The slab goes into the Vitrine on the profile.
  await page.getByRole('link', { name: /^Profil/ }).click()
  await page.getByRole('button', { name: 'Vitrine bestücken' }).click()
  const editor = page.getByRole('dialog', { name: 'Vitrine bestücken' })
  await editor.getByRole('checkbox').first().check()
  await editor.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Vitrine neu bestückt. Sieht teuer aus.')).toBeVisible()

  // Phone width, once per milestone.
  await page.getByRole('link', { name: /^Grading/ }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: shot('grading-390'), animations: 'disabled' })
})
