import { expect, test } from '@playwright/test';

import { idCreate } from '../src/shared/idCreate';
import { actorClose, actorCreate } from './fixtures/actors';
import { berlinAddress, seedBookingRequest, seedBookingRequestOffer, seedCook, seedCustomer } from './fixtures/db';
import { clickUntil } from './fixtures/ui';

/**
 * Customer dual-accepts a cook-accepted offer through the offer UI. Accept
 * prepares Stripe (SetupIntent when the event is ≥15 days out), so this spec
 * skips when STRIPE_SECRET_KEY is the CI placeholder (no real test secret).
 *
 * A second in-radius cook (no offer) sees the request leave the pool and gets
 * a Taken deep-link explanation with no request PII.
 */
test('customer accepts offer via UI; cook sees confirmed; other cook sees taken', async ({ browser }) => {
    test.skip(
        !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_ci_placeholder',
        'Real STRIPE_SECRET_KEY required for dual-accept (SetupIntent)',
    );

    // Arrange — seed cook-accepted offer; event far enough for SetupIntent
    const token = idCreate().slice(0, 8);
    const occasion = `E2E OfferAccept ${token}`;
    const cookFirstName = `Chef${token}`;

    const customerSeed = await seedCustomer({ firstName: 'E2E', lastName: `Customer-${token}` });
    const cookSeed = await seedCook({
        firstName: cookFirstName,
        lastName: `Cook-${token}`,
        emailPrefix: 'e2e-cook-accept',
        travelOrigin: berlinAddress,
        maximumTravelDistance: 100,
    });
    const cookOtherSeed = await seedCook({
        firstName: `Other${token}`,
        lastName: `Cook-${token}`,
        emailPrefix: 'e2e-cook-accept-other',
        travelOrigin: berlinAddress,
        maximumTravelDistance: 100,
    });
    const { bookingRequestId } = await seedBookingRequest({
        customerUserId: customerSeed.userId,
        occasion,
        dateTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        exactEventAddress: {
            ...berlinAddress,
            latitude: 52.53,
            longitude: 13.41,
        },
    });
    const { bookingRequestOfferId } = await seedBookingRequestOffer({
        bookingRequestId,
        cookId: cookSeed.userId,
    });

    const customer = await actorCreate(browser, customerSeed);
    const cook = await actorCreate(browser, cookSeed);
    const cookOther = await actorCreate(browser, cookOtherSeed);

    try {
        // Assert — other cook still sees the open pool before accept
        await cookOther.page.goto('/en/profile/booking-request-pool');
        await expect(cookOther.page.getByRole('heading', { name: occasion })).toBeVisible();

        // Act — customer opens offer → Accept → Continue
        await customer.page.goto(`/en/profile/booking-requests/${bookingRequestId}/offers/${bookingRequestOfferId}?tab=offer`);
        await expect(customer.page.getByText('Check offer')).toBeVisible();

        await clickUntil(customer.page.getByRole('button', { name: 'Accept' }), async () => {
            await expect(customer.page.getByRole('alertdialog', { name: 'Accept offer' })).toBeVisible({
                timeout: 2_000,
            });
        });
        await clickUntil(customer.page.getByRole('button', { name: 'Continue' }), async () => {
            const checkout = customer.page.getByRole('heading', { name: 'Checkout' });
            const paymentStatus = customer.page.getByText('Provide payment data');
            await expect(checkout.or(paymentStatus)).toBeVisible({ timeout: 5_000 });
        });

        // Assert — chosen cook sees dual-accept confirmed on their offer page
        await cook.page.goto(`/en/profile/booking-request-offers/${bookingRequestOfferId}`);
        await expect(cook.page.getByText('Confirmed')).toBeVisible();

        // Assert — other cook: left the pool; stale deep-link is Taken (no street / occasion)
        await cookOther.page.goto('/en/profile/booking-request-pool');
        await expect(cookOther.page.getByRole('heading', { name: occasion })).toHaveCount(0);

        await cookOther.page.goto(`/en/profile/booking-request-pool/${bookingRequestId}`);
        await expect(cookOther.page.getByText('Another chef was chosen')).toBeVisible();
        await expect(cookOther.page.getByText('This request is no longer available')).toBeVisible();
        await expect(cookOther.page.getByRole('heading', { name: occasion })).toHaveCount(0);
        await expect(cookOther.page.getByText('Street 1')).toHaveCount(0);
        await expect(cookOther.page.getByText(cookFirstName)).toHaveCount(0);
    } finally {
        await Promise.all([actorClose(customer), actorClose(cook), actorClose(cookOther)]);
    }
});
