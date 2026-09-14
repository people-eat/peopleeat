import { expect, test } from '@playwright/test';

import { idCreate } from '../src/shared/idCreate';
import { actorClose, actorCreate } from './fixtures/actors';
import { berlinAddress, munichTravelOrigin, seedAdmin, seedBookingRequest, seedCook, seedCustomer } from './fixtures/db';
import { clickUntil } from './fixtures/ui';

/**
 * Multi-party visibility for a public booking request:
 * - customer sees their request
 * - in-radius cook sees it in the pool (+ deep-link)
 * - out-of-radius cook does not (list + deep-link = generic not-found)
 * - admin sees it in administration
 * - after customer cancel: in-radius deep-link explains withdrawn; out-of-radius stays not-found
 */
test('booking request pool visibility across customer, cooks, and admin', async ({ browser }) => {
    // Arrange
    const token = idCreate().slice(0, 8);
    const occasion = `E2E Pool ${token}`;

    const customerSeed = await seedCustomer({ firstName: 'E2E', lastName: `Customer-${token}` });
    const cookInSeed = await seedCook({
        firstName: 'E2E',
        lastName: `CookIn-${token}`,
        emailPrefix: 'e2e-cook-in',
        travelOrigin: berlinAddress,
        maximumTravelDistance: 100,
    });
    const cookOutSeed = await seedCook({
        firstName: 'E2E',
        lastName: `CookOut-${token}`,
        emailPrefix: 'e2e-cook-out',
        travelOrigin: munichTravelOrigin,
        maximumTravelDistance: 50,
    });
    const adminSeed = await seedAdmin();
    const { bookingRequestId } = await seedBookingRequest({
        customerUserId: customerSeed.userId,
        occasion,
        exactEventAddress: {
            ...berlinAddress,
            latitude: 52.53,
            longitude: 13.41,
        },
    });

    const customer = await actorCreate(browser, customerSeed);
    const cookIn = await actorCreate(browser, cookInSeed);
    const cookOut = await actorCreate(browser, cookOutSeed);
    const admin = await actorCreate(browser, adminSeed);

    try {
        // Act / Assert — customer sees own request
        await customer.page.goto('/en/profile/booking-requests');
        await expect(customer.page.getByRole('heading', { name: occasion })).toBeVisible();

        // Assert — in-radius cook sees request in the open pool and can open the detail
        await cookIn.page.goto('/en/profile/booking-request-pool');
        await expect(cookIn.page.getByRole('heading', { name: occasion })).toBeVisible();
        await cookIn.page.goto(`/en/profile/booking-request-pool/${bookingRequestId}`);
        await expect(cookIn.page.locator('#main-content').getByText(occasion)).toBeVisible();

        // Assert — out-of-radius cook does not see the request (list + deep-link = generic 404)
        await cookOut.page.goto('/en/profile/booking-request-pool');
        await expect(cookOut.page.getByRole('heading', { name: occasion })).toHaveCount(0);
        await cookOut.page.goto(`/en/profile/booking-request-pool/${bookingRequestId}`);
        await expect(cookOut.page.getByText('Page not found')).toBeVisible();
        await expect(cookOut.page.getByText('Request withdrawn')).toHaveCount(0);
        await expect(cookOut.page.getByText('Another chef was chosen')).toHaveCount(0);

        // Assert — admin sees the request (detail is deterministic; list may paginate)
        await admin.page.goto(`/en/admin/booking-requests/${bookingRequestId}`);
        await expect(admin.page.locator('#main-content').getByText(occasion)).toBeVisible();

        // Act — customer cancels the request through the churn → confirm flow
        await customer.page.goto(`/en/profile/booking-requests/${bookingRequestId}`);
        await clickUntil(customer.page.getByRole('button', { name: 'More actions' }), async () => {
            await expect(customer.page.getByRole('menuitem', { name: 'Cancel request' })).toBeVisible({ timeout: 2_000 });
        });
        await clickUntil(customer.page.getByRole('menuitem', { name: 'Cancel request' }), async () => {
            await expect(customer.page.getByRole('button', { name: /Cancel request anyway/ })).toBeVisible({ timeout: 2_000 });
        });
        await clickUntil(customer.page.getByRole('button', { name: /Cancel request anyway/ }), async () => {
            await expect(customer.page.getByRole('button', { name: 'Continue' })).toBeEnabled({ timeout: 2_000 });
        });
        await clickUntil(customer.page.getByRole('button', { name: 'Continue' }), async () => {
            await expect(customer.page.getByRole('alertdialog', { name: 'Really cancel this request?' })).toBeVisible({
                timeout: 2_000,
            });
        });
        await customer.page.getByPlaceholder('Reason…').fill(`E2E cancel ${token}`);
        await clickUntil(customer.page.getByRole('button', { name: 'Cancel permanently' }), async () => {
            await expect(customer.page.getByText('Request cancelled.')).toBeVisible({ timeout: 5_000 });
        });

        // Assert — in-radius cook: left the pool; deep-link explains cancel (no street / cancel reason)
        await cookIn.page.goto('/en/profile/booking-request-pool');
        await expect(cookIn.page.getByRole('heading', { name: occasion })).toHaveCount(0);
        await cookIn.page.goto(`/en/profile/booking-request-pool/${bookingRequestId}`);
        await expect(cookIn.page.getByText('Request withdrawn')).toBeVisible();
        await expect(cookIn.page.getByText('The guest withdrew this booking request')).toBeVisible();
        await expect(cookIn.page.getByRole('heading', { name: occasion })).toHaveCount(0);
        await expect(cookIn.page.getByText('Street 1')).toHaveCount(0);
        await expect(cookIn.page.getByText(`E2E cancel ${token}`)).toHaveCount(0);

        // Assert — out-of-radius cook still gets generic not-found (no cancel oracle)
        await cookOut.page.goto(`/en/profile/booking-request-pool/${bookingRequestId}`);
        await expect(cookOut.page.getByText('Page not found')).toBeVisible();
        await expect(cookOut.page.getByText('Request withdrawn')).toHaveCount(0);
    } finally {
        await Promise.all([actorClose(customer), actorClose(cookIn), actorClose(cookOut), actorClose(admin)]);
    }
});
