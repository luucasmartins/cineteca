import type { Page } from '@playwright/test'

export async function irPeloMenu(page: Page, isMobile: boolean, nomeLink: string) {
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: nomeLink, exact: true }).click()
}
