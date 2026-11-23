import { expect, type Page } from '@playwright/test'

// First-visit tours block the page until they are clicked through, and several features can share a page, so a
// test clears the tour it expects and every tour that follows it there.

/** Clicks through every first-visit tour on this page. */
export async function finishTours(page: Page) {
  const any = page.getByRole('complementary', { name: /^Neu: / })
  while (await any.waitFor({ timeout: 1500 }).then(() => true, () => false)) {
    const tour = page.getByRole('complementary', { name: (await any.getAttribute('aria-label'))!, exact: true })
    const next = tour.getByRole('button', { name: 'Weiter' })
    while (await next.isVisible()) await next.click()
    await tour.getByRole('button', { name: 'Verstanden' }).click()
    await expect(tour).toBeHidden()
  }
}

/** Expects the tour of feature `name` first, then clears it and any tour after it. */
export async function finishTour(page: Page, name: string) {
  await expect(page.getByRole('complementary', { name: `Neu: ${name}!` })).toBeVisible()
  await finishTours(page)
}
