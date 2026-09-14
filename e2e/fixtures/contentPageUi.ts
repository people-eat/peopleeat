import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { clickUntil } from './ui';

/** ContentPageEditor Sonner success toast (`Saved`). Scope to the toast node so stacked toasts do not fail strict mode. */
function contentPageSavedToast(page: Page) {
    return page.locator('[data-sonner-toast]').filter({ hasText: /^Saved$/ });
}

/** Edit SEO path/title + hero headline (DE fields; editor defaults to DE content locale). */
export async function contentPageIdentityFill(page: Page, input: { pathName: string; title: string; headline: string }): Promise<void> {
    await page.getByRole('textbox', { name: 'Path (slug)' }).fill(input.pathName);
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(input.title);
    // exact: true — "Subheadline" also matches a loose "Headline" label query.
    await page.getByRole('textbox', { name: 'Headline', exact: true }).fill(input.headline);
}

export async function contentPageSave(page: Page): Promise<void> {
    // exact: true — city/partner/occasion also expose "Save chefs" / "Save testimonials".
    // Stop re-clicking once a Saved toast exists — each click upserts and stacks toasts.
    const saved = contentPageSavedToast(page);
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(async () => {
        if ((await saved.count()) === 0) {
            await saveButton.click({ timeout: 5_000 });
        }
        await expect(saved.first()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
}

export async function contentPagePublish(page: Page): Promise<void> {
    const confirm = page.getByRole('alertdialog');
    await clickUntil(page.getByRole('button', { name: 'Publish', exact: true }), async () => {
        await expect(confirm.getByRole('heading', { name: 'Publish now?' })).toBeVisible({ timeout: 2_000 });
    });
    // Status flips optimistically before upsert commits; a *new* Saved toast is the commit
    // signal. A leftover toast from contentPageSave must not count.
    const saved = contentPageSavedToast(page);
    await expect(async () => {
        if (!(await confirm.isVisible())) {
            await expect(saved.first()).toBeVisible({ timeout: 2_000 });
            return;
        }
        const before = await saved.count();
        await confirm.getByRole('button', { name: 'Publish' }).click({ timeout: 5_000 });
        await expect.poll(async () => saved.count(), { timeout: 5_000 }).toBeGreaterThan(before);
    }).toPass({ timeout: 25_000 });
    await expect(page.getByText('Status: Published')).toBeVisible();
}

/** Public list + detail: draft is absent; after publish the title/headline appear. */
export async function contentPagePublicVisibilityAssert(
    publicPage: Page,
    input: { listPath: string; detailPath: string; title: string; headline: string; published: boolean },
): Promise<void> {
    await publicPage.goto(input.detailPath);
    if (input.published) {
        await expect(publicPage.locator('#main-content').getByRole('heading', { name: input.headline })).toBeVisible();
    } else {
        await expect(publicPage.getByText('Page not found')).toBeVisible();
        await expect(publicPage.locator('#main-content').getByRole('heading', { name: input.headline })).toHaveCount(0);
    }

    await publicPage.goto(input.listPath);
    if (input.published) {
        await expect(publicPage.locator('#main-content').getByRole('heading', { name: input.title })).toBeVisible();
    } else {
        await expect(publicPage.locator('#main-content').getByRole('heading', { name: input.title })).toHaveCount(0);
    }
}
