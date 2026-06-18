import { expect, test } from '@playwright/test';

const email = () => `e2e_${Date.now()}@test.local`;
const PW = 'xK9!mq2vRt7wZ';

test('signup → auto-login → /my with unverified banner', async ({ page }) => {
  await page.goto('/en/signup');
  await page.getByLabel('Name').fill('E2E');
  await page.getByLabel('Email').fill(email());
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/en\/my/);
  await expect(page.getByText('Please verify your email')).toBeVisible();
});

test('protected /my redirects to login when logged out', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/en/my');
  await expect(page).toHaveURL(/\/en\/login/);
});

test('wrong password shows a generic error (no enumeration)', async ({ page }) => {
  await page.goto('/en/login');
  await page.getByLabel('Email').fill('nobody@test.local');
  await page.getByLabel('Password').fill('wrongpass12');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
});

test('logout returns to login', async ({ page }) => {
  await page.goto('/en/signup');
  await page.getByLabel('Name').fill('E2E');
  await page.getByLabel('Email').fill(email());
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/en\/my/);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/login/);
});
