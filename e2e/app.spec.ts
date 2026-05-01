import { expect, test } from '@playwright/test';

test('renders login screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bluedeck' })).toBeVisible();
  await expect(page.getByLabel('Service')).toHaveValue('https://bsky.social');
});
