import { expect, test } from '@playwright/test'
import { finishTour } from './tours.ts'

const shot = (name: string) => `e2e/.shots/${name}.png`

test('first account registers, sees the shell, signs out and back in', async ({ page }) => {
  await page.goto('/')

  // Fresh server: the first account sets the invite code and becomes admin.
  await expect(page.getByRole('tab', { name: 'Neu hier' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Du bist der erste Account')).toBeVisible()
  await page.screenshot({ path: shot('auth'), animations: 'disabled' })

  await page.getByLabel('E-Mail').fill('testmogul@example.com')
  await page.getByLabel('Benutzername').fill('Testmogul')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()

  await expect(page.getByRole('heading', { name: 'Moin, Testmogul.' })).toBeVisible()
  await expect(page.getByText('400,00 €').first()).toBeVisible()
  await page.getByRole('button', { name: 'Pokémon', exact: true }).waitFor()
  // Mama's tutorial blocks the page until it is done (rip.spec walks it); this test checks the shell without it.
  await page.goto('/dev/ui')
  await page.getByRole('button', { name: 'Tutorial aus' }).click()
  await page.getByRole('link', { name: 'Übersicht' }).click()
  // Level and admin crown live in the avatar menu.
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  await expect(page.getByRole('img', { name: 'Admin' })).toBeVisible()
  await expect(page.getByText('Level 1', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText('NEU IM GESCHÄFT: Testmogul')).toBeVisible()
  await page.screenshot({ path: shot('home'), animations: 'disabled' })

  // Locked and not-yet-built features are visible, not hidden.
  await expect(page.getByTitle('Firma: Ab Level 20')).toBeVisible()
  await page.getByRole('link', { name: /^Toplisten/ }).click() // NEU until its tour is done
  await finishTour(page, 'Toplisten')
  await expect(page.getByText(/^Platz \d+$/)).toBeVisible()

  // Every stat explains itself.
  await page.getByRole('button', { name: 'Ruf, Pfandbons und Preisniveau' }).click()
  await expect(page.getByText('Alles, was das Spiel bepreist oder auszahlt')).toBeVisible()
  await page.keyboard.press('Escape')

  // Sign out, wrong password, sign in again.
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  await page.getByRole('button', { name: 'Abmelden' }).click()
  await expect(page.getByRole('tab', { name: 'Anmelden' })).toHaveAttribute('aria-selected', 'true')
  await page.getByLabel('E-Mail oder Benutzername').fill('testmogul')
  await page.getByLabel('Passwort').fill('falsch123')
  await page.getByRole('button', { name: 'Rein da' }).click()
  await expect(page.getByRole('alert')).toContainText('Name oder Passwort falsch')
  // the e-mail works as well, in any case
  await page.getByLabel('E-Mail oder Benutzername').fill('TestMogul@Example.com')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByRole('button', { name: 'Rein da' }).click()
  // Signed in again, still on the page where we left.
  await expect(page.getByText(/^Platz \d+$/)).toBeVisible()
  await page.getByRole('link', { name: 'Übersicht' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Testmogul.' })).toBeVisible()
})

test('component showcase renders and local dev tools move money and levels', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('E-Mail').fill('baumeister@example.com')
  await page.getByLabel('Benutzername').fill('Baumeister')
  await page.getByLabel('Passwort').fill('passwort1')
  await page.getByLabel('Einladungscode').fill('geheim123')
  await page.getByRole('button', { name: 'Imperium gründen' }).click()
  await expect(page.getByRole('heading', { name: 'Moin, Baumeister.' })).toBeVisible()

  await page.goto('/dev/ui')
  await expect(page.getByRole('heading', { name: 'Baukasten' })).toBeVisible()
  await page.getByRole('button', { name: '+1.000 €' }).click()
  await expect(page.getByText('1.400 €')).toBeVisible()
  await page.getByRole('button', { name: '+viel EP' }).click()
  await page.getByRole('dialog', { name: 'LEVEL UP!' }).getByRole('button', { name: 'Weiter' }).click()
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  await expect(page.getByText(/^Level (1[0-9]|[2-9][0-9])$/)).toBeVisible()
  await page.keyboard.press('Escape')
  // The page scrolls inside the shell: use a tall window to capture the whole showcase.
  await page.setViewportSize({ width: 1440, height: 2700 })
  await page.screenshot({ path: shot('dev-ui'), animations: 'disabled' })
})
