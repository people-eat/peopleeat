import { expect, test } from '@playwright/test';

import { idCreate } from '../src/shared/idCreate';
import { actorClose, actorCreate, actorCreateAnonymous } from './fixtures/actors';
import { contentPageIdentityFill, contentPagePublicVisibilityAssert, contentPagePublish, contentPageSave } from './fixtures/contentPageUi';
import { seedAdmin } from './fixtures/db';
import { berlinCityCenterSuggestion, cityCenterSuggestionsMock } from './fixtures/placesUi';
import { clickUntil } from './fixtures/ui';

/**
 * Admin creates a city page (draft; Places suggestions stubbed — no API key in
 * CI), public cannot see it, publish makes list + detail visible.
 */
test('admin creates city draft then publishes to public', async ({ browser }) => {
    const token = idCreate().slice(0, 8);
    const cityName = `E2E City ${token}`;
    // pathName is lowercased on save; public URLs must match.
    const pathName = `e2e-city-${token.toLowerCase()}`;
    const title = `E2E City Title ${token}`;
    const headline = `E2E City Headline ${token}`;

    const adminSeed = await seedAdmin();
    const admin = await actorCreate(browser, adminSeed);
    const anonymous = await actorCreateAnonymous(browser);

    try {
        await cityCenterSuggestionsMock(admin.page);

        await admin.page.goto('/en/admin/cities');
        await clickUntil(admin.page.getByRole('button', { name: 'New city' }), async () => {
            await expect(admin.page.getByRole('dialog', { name: 'New city' })).toBeVisible({ timeout: 2_000 });
        });

        const createDialog = admin.page.getByRole('dialog', { name: 'New city' });
        await createDialog.getByLabel('Name (DE)').fill(cityName);
        // Combobox list is portaled outside the dialog; pointer clicks hit the
        // dialog surface. Select the stubbed suggestion via keyboard instead.
        const centerInput = createDialog.getByPlaceholder('Search city…');
        await centerInput.fill('Berlin');
        await expect(admin.page.getByRole('option', { name: berlinCityCenterSuggestion.displayText })).toBeVisible();
        await centerInput.press('ArrowDown');
        await centerInput.press('Enter');
        await expect(createDialog.getByText(`${berlinCityCenterSuggestion.latitude.toFixed(5)}`)).toBeVisible();

        await clickUntil(createDialog.getByRole('button', { name: 'Create' }), async () => {
            await expect(admin.page).toHaveURL(/\/en\/admin\/cities\/[^/]+$/);
        });
        await expect(admin.page.getByText('Status: Draft')).toBeVisible();

        await contentPageIdentityFill(admin.page, { pathName, title, headline });
        await contentPageSave(admin.page);

        await contentPagePublicVisibilityAssert(anonymous.page, {
            listPath: '/en/cities',
            detailPath: `/en/cities/${pathName}`,
            title,
            headline,
            published: false,
        });

        await contentPagePublish(admin.page);

        await contentPagePublicVisibilityAssert(anonymous.page, {
            listPath: '/en/cities',
            detailPath: `/en/cities/${pathName}`,
            title,
            headline,
            published: true,
        });
    } finally {
        await Promise.all([actorClose(admin), actorClose(anonymous)]);
    }
});
