import { expect, test } from '@playwright/test';

import { idCreate } from '../src/shared/idCreate';
import { actorClose, actorCreate, actorCreateAnonymous } from './fixtures/actors';
import { contentPageIdentityFill, contentPagePublicVisibilityAssert, contentPagePublish, contentPageSave } from './fixtures/contentPageUi';
import { seedAdmin } from './fixtures/db';
import { clickUntilUrl } from './fixtures/ui';

/**
 * Admin creates a partner page (draft), public cannot see it, publish makes list
 * + detail visible.
 */
test('admin creates partner draft then publishes to public', async ({ browser }) => {
    const token = idCreate().slice(0, 8);
    // pathName is lowercased on save; public URLs must match.
    const pathName = `e2e-partner-${token.toLowerCase()}`;
    const title = `E2E Partner Title ${token}`;
    const headline = `E2E Partner Headline ${token}`;

    const adminSeed = await seedAdmin();
    const admin = await actorCreate(browser, adminSeed);
    const anonymous = await actorCreateAnonymous(browser);

    try {
        await admin.page.goto('/en/admin/partners');
        await clickUntilUrl(
            admin.page,
            admin.page.getByRole('button', { name: 'New partner' }),
            /\/en\/admin\/partners\/?$/,
            /\/en\/admin\/partners\/[^/]+$/,
        );
        await expect(admin.page.getByText('Status: Draft')).toBeVisible();

        await contentPageIdentityFill(admin.page, { pathName, title, headline });
        await contentPageSave(admin.page);

        await contentPagePublicVisibilityAssert(anonymous.page, {
            listPath: '/en/partners',
            detailPath: `/en/partners/${pathName}`,
            title,
            headline,
            published: false,
        });

        await contentPagePublish(admin.page);

        await contentPagePublicVisibilityAssert(anonymous.page, {
            listPath: '/en/partners',
            detailPath: `/en/partners/${pathName}`,
            title,
            headline,
            published: true,
        });
    } finally {
        await Promise.all([actorClose(admin), actorClose(anonymous)]);
    }
});
