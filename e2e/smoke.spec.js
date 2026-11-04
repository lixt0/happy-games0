import { test, expect } from 'playwright/test';

test('home renders category navigation and a playable recommendation', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/快乐小游戏/);
  await expect(page.locator('#section-grid .section-card')).toHaveCount(4);
  await expect(page.locator('#featured-grid .featured-game')).toHaveCount(3);
  await expect(page.locator('#random-play')).toBeVisible();
  const descriptionsFit = await page.locator('.feature-copy p').evaluateAll(elements => elements.every(element => {
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
    return element.clientHeight <= lineHeight * 2.1;
  }));
  expect(descriptionsFit).toBe(true);
});

test('game page exposes score, controls and canvas without console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/flappy/');
  await expect(page.locator('canvas#canvas')).toBeVisible();
  await expect(page.locator('#score')).toHaveText('0');
  await expect(page.locator('#best')).toBeVisible();
  await page.locator('#restart').click();
  expect(errors).toEqual([]);
});

test('mobile game layout does not overflow horizontally', async ({ page }) => {
  await page.goto('/jump/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
  await expect(page.locator('.controls')).toBeVisible();
});
