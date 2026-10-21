import { expect, test } from '@playwright/test';

import { idCreate } from '../src/shared/idCreate';
import { actorClose, actorCreate } from './fixtures/actors';
import { berlinAddress, seedBookingRequest, seedCook, seedCookMenu, seedCustomer } from './fixtures/db';
import { clickUntil, clickUntilUrl } from './fixtures/ui';

/**
 * Cook creates an offer (menus → price → message) through the pool UI; the customer
 * sees it on their request detail. After create the request leaves the open pool and
 * the stale pool deep-link explains OfferAlreadyExists (no request PII).
 */
test('cook creates offer via UI and customer sees it', async ({ browser }) => {
    // Arrange
    const token = idCreate().slice(0, 8);
    const occasion = `E2E OfferCreate ${token}`;
    const cookFirstName = `Chef${token}`;
    const menuTitle = `E2E Menu ${token}`;

    const customerSeed = await seedCustomer({ firstName: 'E2E', lastName: `Customer-${token}` });
    const cookSeed = await seedCook({
        firstName: cookFirstName,
        lastName: `Cook-${token}`,
        emailPrefix: 'e2e-cook-offer',
        travelOrigin: berlinAddress,
        maximumTravelDistance: 100,
    });
    await seedCookMenu({ cookId: cookSeed.userId, title: menuTitle });
    const { bookingRequestId } = await seedBookingRequest({
        customerUserId: customerSeed.userId,
        occasion,
        exactEventAddress: {
            ...berlinAddress,
            latitude: 52.53,
            longitude: 13.41,
        },
    });

    const cook = await actorCreate(browser, cookSeed);
    const customer = await actorCreate(browser, customerSeed);

    try {
        // Act — cook opens pool detail → create → menus → price → message → submit
        await cook.page.goto(`/en/profile/booking-request-pool/${bookingRequestId}`);
        await expect(cook.page.locator('#main-content').getByText(occasion)).toBeVisible();

        await clickUntil(cook.page.getByRole('button', { name: 'Make offer' }), async () => {
            await expect(cook.page.getByRole('heading', { name: 'Suggest menus' })).toBeVisible({ timeout: 2_000 });
        });

        await expect(cook.page.getByText(menuTitle)).toBeVisible();
        await clickUntil(cook.page.getByRole('button', { name: 'Select' }), async () => {
            await expect(cook.page.getByRole('button', { name: 'Selected' })).toBeVisible({ timeout: 2_000 });
        });

        await clickUntilUrl(
            cook.page,
            cook.page.getByRole('button', { name: 'Continue' }),
            /\/create(?!.*[?&]step=)/,
            /[?&]step=price(?:&|$)/,
        );
        await expect(cook.page.getByRole('heading', { name: 'Choose your price' })).toBeVisible();
        await expect(cook.page.getByLabel('Menu price per person')).toBeVisible();

        await clickUntilUrl(
            cook.page,
            cook.page.getByRole('button', { name: 'Continue' }),
            /[?&]step=price(?:&|$)/,
            /[?&]step=message(?:&|$)/,
        );
        await expect(cook.page.getByRole('heading', { name: 'Personal note' })).toBeVisible();

        await clickUntil(cook.page.getByRole('button', { name: 'Make offer' }), async () => {
            await expect(cook.page.getByRole('alertdialog', { name: 'Offer sent successfully!' })).toBeVisible({
                timeout: 2_000,
            });
        });
        // Success dialog stays open until the cook chooses; assert via the inbox either way.
        await cook.page.goto('/en/profile/booking-request-offers');
        const cookOfferCard = cook.page.locator('a').filter({ hasText: occasion });
        await expect(cookOfferCard).toBeVisible();
        await expect(cookOfferCard.getByText('Customer needs to accept')).toBeVisible();

        // Assert — request left the open pool; stale deep-link explains own offer (no street PII)
        await cook.page.goto('/en/profile/booking-request-pool');
        await expect(cook.page.getByRole('heading', { name: occasion })).toHaveCount(0);

        await cook.page.goto(`/en/profile/booking-request-pool/${bookingRequestId}`);
        await expect(cook.page.getByText('You already created an offer')).toBeVisible();
        await expect(cook.page.getByRole('link', { name: 'Open offer' })).toBeVisible();
        await expect(cook.page.getByRole('heading', { name: occasion })).toHaveCount(0);
        await expect(cook.page.getByText('Street 1')).toHaveCount(0);

        // Assert — customer sees the cook’s offer card on the request (occasion is a detail field)
        await customer.page.goto(`/en/profile/booking-requests/${bookingRequestId}`);
        await expect(customer.page.locator('#main-content').getByText(occasion)).toBeVisible();
        const offerCard = customer.page.locator('a').filter({ hasText: cookFirstName });
        await expect(offerCard).toBeVisible();
        await expect(offerCard.getByText('Check offer')).toBeVisible();
    } finally {
        await Promise.all([actorClose(cook), actorClose(customer)]);
    }
});
