import { expect, test } from '@playwright/test';

import { phoneNumberCreate } from '../src/server/test/phoneNumberCreate';
import { idCreate } from '../src/shared/idCreate';
import { actorClose, actorCreateAnonymous } from './fixtures/actors';
import { authEmailOtpComplete } from './fixtures/authUi';
import { bookingRequestFormDraftUrl } from './fixtures/bookingRequestForm';
import { clickUntil } from './fixtures/ui';

/**
 * Brand-new customer: form → auth → OTP → profile + legal → create account →
 * auto-submit booking request.
 */
test('new customer registers via OTP on form and submits booking request', async ({ browser }) => {
    const token = idCreate().slice(0, 8);
    const occasion = `E2E Create New ${token}`;
    const emailAddress = `e2e-new-${token}@example.com`;
    // Unique per run — phone is globally unique on Users (same as Vitest seeds).
    const phoneNumber = phoneNumberCreate();

    const guest = await actorCreateAnonymous(browser);

    try {
        await guest.page.goto(bookingRequestFormDraftUrl({ occasion, step: 'message' }));
        await clickUntil(guest.page.getByRole('button', { name: 'Next' }), async () => {
            await expect(guest.page.getByPlaceholder('Email address')).toBeVisible({ timeout: 2_000 });
        });

        await authEmailOtpComplete(guest.page, emailAddress);

        await expect(guest.page.getByText('Create your profile')).toBeVisible();
        await guest.page.getByPlaceholder('First name').fill('E2E');
        await guest.page.getByPlaceholder('Last name').fill(`New-${token}`);
        await guest.page.getByPlaceholder('Phone number').fill(phoneNumber);

        await guest.page.getByRole('button', { name: 'Date of birth' }).click();
        await expect(guest.page.getByRole('dialog').getByLabel('Choose the Year')).toBeVisible();
        await guest.page.getByRole('button', { name: /January 15th, 2000/ }).click();

        await guest.page.getByRole('radio', { name: 'Email' }).click();
        await guest.page.getByRole('checkbox', { name: /terms and conditions/ }).click();
        await guest.page.getByRole('checkbox', { name: /privacy policy/ }).click();

        await clickUntil(guest.page.getByRole('button', { name: 'Create account' }), async () => {
            await expect(guest.page.getByText('Booking request created.')).toBeVisible({ timeout: 5_000 });
        });
        await expect(guest.page).toHaveURL(/\/en\/booking-request\/[^/]+\/submitted$/);
        await expect(guest.page.getByText('Request submitted')).toBeVisible();

        await guest.page.goto('/en/profile/booking-requests');
        await expect(guest.page.getByRole('heading', { name: occasion })).toBeVisible();
    } finally {
        await actorClose(guest);
    }
});
