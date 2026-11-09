import { expect, test } from '@playwright/test';

import { idCreate } from '../src/shared/idCreate';
import { actorClose, actorCreateAnonymous } from './fixtures/actors';
import { authEmailOtpComplete } from './fixtures/authUi';
import { bookingRequestFormDraftUrl } from './fixtures/bookingRequestForm';
import { seedCustomer, seedPublishedLegalDocuments } from './fixtures/db';
import { clickUntil } from './fixtures/ui';

/**
 * Returning customer on a cold session whose stored legal acceptance is older
 * than the latest published terms: form → auth → OTP → inline legal accept →
 * auto-submit via AuthIdentityGate onReady.
 */
test('returning customer accepts updated terms after OTP then submits booking request', async ({ browser }) => {
    const token = idCreate().slice(0, 8);
    const occasion = `E2E Create ReturningOtpLegal ${token}`;

    await seedPublishedLegalDocuments();
    const customerSeed = await seedCustomer({ firstName: 'E2E', lastName: `Customer-${token}`, staleLegalAcceptance: true });
    const guest = await actorCreateAnonymous(browser);

    try {
        await guest.page.goto(bookingRequestFormDraftUrl({ occasion, step: 'message' }));
        await clickUntil(guest.page.getByRole('button', { name: 'Next' }), async () => {
            await expect(guest.page.getByPlaceholder('Email address')).toBeVisible({ timeout: 2_000 });
        });

        await authEmailOtpComplete(guest.page, customerSeed.emailAddress);

        await expect(guest.page.getByText('Updated legal terms')).toBeVisible({ timeout: 15_000 });
        await expect(guest.page.getByText('E2E terms update')).toBeVisible();
        await guest.page.getByRole('button', { name: 'I agree' }).click();

        await expect(guest.page.getByText('Booking request created.')).toBeVisible({ timeout: 20_000 });
        await expect(guest.page).toHaveURL(/\/en\/booking-request\/[^/]+\/submitted$/);
        await expect(guest.page.getByText('Request submitted')).toBeVisible();

        await guest.page.goto('/en/profile/booking-requests');
        await expect(guest.page.getByRole('heading', { name: occasion })).toBeVisible();
    } finally {
        await actorClose(guest);
    }
});
