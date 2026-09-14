import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * SSR paints controls before React attaches handlers. A single Playwright click
 * in that window hits the DOM but does nothing; humans rarely outrun hydration.
 * Retry the click until `assertion` passes (e.g. dialog visible, toast shown).
 */
export async function clickUntil(locator: Locator, assertion: () => Promise<void>, options?: { timeout?: number }): Promise<void> {
    await expect(async () => {
        await locator.click({ timeout: 5_000 });
        await assertion();
    }).toPass({ timeout: options?.timeout ?? 20_000 });
}

/**
 * Like `clickUntil`, but stop re-clicking once navigation left `stillOnUrl`.
 * Use for create CTAs that insert a row on every click (blog/partner one-shot
 * create) — plain `clickUntil` would mint duplicates while waiting for navigate.
 */
export async function clickUntilUrl(
    page: Page,
    locator: Locator,
    stillOnUrl: RegExp,
    navigatedUrl: RegExp,
    options?: { timeout?: number },
): Promise<void> {
    await expect(async () => {
        if (stillOnUrl.test(page.url())) {
            await locator.click({ timeout: 5_000 });
        }
        await expect(page).toHaveURL(navigatedUrl, { timeout: 5_000 });
    }).toPass({ timeout: options?.timeout ?? 20_000 });
}
