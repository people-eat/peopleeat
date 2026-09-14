import { expect, test } from '@playwright/test';

import { idCreate } from '../src/shared/idCreate';
import { actorClose, actorCreate } from './fixtures/actors';
import { bookingRequestFormDraftUrl } from './fixtures/bookingRequestForm';
import { seedCustomer } from './fixtures/db';
import { clickUntil } from './fixtures/ui';

/**
 * Returning customer already signed in (cookie injection): submit from the
 * message step without the auth gate.
 */
test('signed-in customer submits booking request from form', async ({ browser }) => {
    const token = idCreate().slice(0, 8);
    const occasion = `E2E Create SignedIn ${token}`;

    const customerSeed = await seedCustomer({ firstName: 'E2E', lastName: `Customer-${token}` });
    const customer = await actorCreate(browser, customerSeed);

    try {
        await customer.page.goto(bookingRequestFormDraftUrl({ occasion, step: 'message' }));
        await expect(customer.page.getByRole('button', { name: 'Send request' })).toBeVisible();

        await clickUntil(customer.page.getByRole('button', { name: 'Send request' }), async () => {
            await expect(customer.page.getByText('Booking request created.')).toBeVisible({ timeout: 2_000 });
        });
        await expect(customer.page).toHaveURL(/\/en\/booking-request\/[^/]+\/submitted$/);
        await expect(customer.page.getByText('Request submitted')).toBeVisible();
        await expect(customer.page.getByText('What happens next?')).toBeVisible();

        await customer.page.reload();
        await expect(customer.page).toHaveURL(/\/en\/booking-request\/[^/]+\/submitted$/);
        await expect(customer.page.getByText('Request submitted')).toBeVisible();

        await customer.page.goto('/en/profile/booking-requests');
        await expect(customer.page.getByRole('heading', { name: occasion })).toBeVisible();
    } finally {
        await actorClose(customer);
    }
});
