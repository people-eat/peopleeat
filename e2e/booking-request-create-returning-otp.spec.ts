import { expect, test } from '@playwright/test';

import { idCreate } from '../src/shared/idCreate';
import { actorClose, actorCreateAnonymous } from './fixtures/actors';
import { authEmailOtpComplete } from './fixtures/authUi';
import { bookingRequestFormDraftUrl } from './fixtures/bookingRequestForm';
import { seedCustomer } from './fixtures/db';
import { clickUntil } from './fixtures/ui';

/**
 * Returning customer on a cold session: form → auth → email OTP for an
 * existing user → session bind → auto-submit via AuthIdentityGate onReady.
 */
test('returning customer signs in via OTP on form and submits booking request', async ({ browser }) => {
    const token = idCreate().slice(0, 8);
    const occasion = `E2E Create ReturningOtp ${token}`;

    const customerSeed = await seedCustomer({ firstName: 'E2E', lastName: `Customer-${token}` });
    const guest = await actorCreateAnonymous(browser);

    try {
        await guest.page.goto(bookingRequestFormDraftUrl({ occasion, step: 'message' }));
        await clickUntil(guest.page.getByRole('button', { name: 'Next' }), async () => {
            await expect(guest.page.getByPlaceholder('Email address')).toBeVisible({ timeout: 2_000 });
        });

        await authEmailOtpComplete(guest.page, customerSeed.emailAddress);

        await expect(guest.page.getByText('Booking request created.')).toBeVisible({ timeout: 20_000 });
        await expect(guest.page).toHaveURL(/\/en\/booking-request\/[^/]+\/submitted$/);
        await expect(guest.page.getByText('Request submitted')).toBeVisible();

        await guest.page.goto('/en/profile/booking-requests');
        await expect(guest.page.getByRole('heading', { name: occasion })).toBeVisible();
    } finally {
        await actorClose(guest);
    }
});
