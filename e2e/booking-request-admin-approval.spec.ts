import { expect, test } from '@playwright/test';

import { idCreate } from '../src/shared/idCreate';
import { actorClose, actorCreate } from './fixtures/actors';
import { berlinAddress, cookNotifyEmailsFind, seedAdmin, seedBookingRequest, seedCook, seedCustomer } from './fixtures/db';
import { clickUntil } from './fixtures/ui';

/**
 * Large-group publication gate through the admin UI:
 * - cooks do not see a blocked request; admin does
 * - admin opens the approve dialog, deselects one cook, confirms
 * - selected cook is emailed and sees the pool; non-selected does not
 * - admin notifies the other cook from the offers tab → they see it too
 */
test('admin publication approve notifies selected cooks only, then manual notify', async ({ browser }) => {
    // Arrange
    const token = idCreate().slice(0, 8);
    const occasion = `E2E Approve ${token}`;
    const selectedFirstName = 'E2E';
    const selectedLastName = `CookSel-${token}`;
    const otherFirstName = 'E2E';
    const otherLastName = `CookOth-${token}`;
    const selectedDisplayName = `${selectedFirstName} ${selectedLastName}`;
    const otherDisplayName = `${otherFirstName} ${otherLastName}`;

    const customerSeed = await seedCustomer({ firstName: 'E2E', lastName: `Customer-${token}` });
    const cookSelectedSeed = await seedCook({
        firstName: selectedFirstName,
        lastName: selectedLastName,
        emailPrefix: 'e2e-cook-sel',
        travelOrigin: berlinAddress,
        maximumTravelDistance: 100,
    });
    const cookOtherSeed = await seedCook({
        firstName: otherFirstName,
        lastName: otherLastName,
        emailPrefix: 'e2e-cook-oth',
        travelOrigin: {
            ...berlinAddress,
            latitude: 52.525,
            longitude: 13.41,
        },
        maximumTravelDistance: 100,
    });
    const adminSeed = await seedAdmin();
    const { bookingRequestId } = await seedBookingRequest({
        customerUserId: customerSeed.userId,
        occasion,
        publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
        participantCount: 12,
        exactEventAddress: {
            ...berlinAddress,
            latitude: 52.53,
            longitude: 13.41,
        },
    });

    const cookSelected = await actorCreate(browser, cookSelectedSeed);
    const cookOther = await actorCreate(browser, cookOtherSeed);
    const admin = await actorCreate(browser, adminSeed);

    try {
        // Assert — neither cook sees the blocked request
        await cookSelected.page.goto('/en/profile/booking-request-pool');
        await expect(cookSelected.page.getByRole('heading', { name: occasion })).toHaveCount(0);

        await cookOther.page.goto('/en/profile/booking-request-pool');
        await expect(cookOther.page.getByRole('heading', { name: occasion })).toHaveCount(0);

        // Assert — admin sees the blocked request
        await admin.page.goto(`/en/admin/booking-requests/${bookingRequestId}`);
        await expect(admin.page.locator('#main-content').getByText(occasion)).toBeVisible();
        await expect(admin.page.getByText('Admin review')).toBeVisible();

        // Act — approve via dialog, notifying only the selected cook
        const approveDialog = admin.page.getByRole('dialog', { name: 'Approve publication' });
        await clickUntil(admin.page.getByRole('button', { name: 'Approve publication' }), async () => {
            await expect(approveDialog).toBeVisible({ timeout: 2_000 });
        });
        // Other e2e cooks may share Berlin radius — clear, then pick exactly one.
        await approveDialog.getByRole('button', { name: 'Clear' }).click();
        await approveDialog.getByRole('checkbox', { name: selectedDisplayName }).click();
        await expect(approveDialog.getByRole('checkbox', { name: selectedDisplayName })).toBeChecked();
        await expect(approveDialog.getByRole('checkbox', { name: otherDisplayName })).not.toBeChecked();
        await approveDialog.getByRole('button', { name: 'Approve (1)' }).click();

        await expect(admin.page.getByText('Admin-approved')).toBeVisible();
        await expect(admin.page.getByText('Request approved.')).toBeVisible();

        // Assert — email sent only to the selected cook
        await expect
            .poll(async () => (await cookNotifyEmailsFind(bookingRequestId)).map((row) => row.toEmail).sort())
            .toEqual([cookSelectedSeed.emailAddress]);

        // Assert — selected cook sees it; other cook still does not
        await cookSelected.page.goto('/en/profile/booking-request-pool');
        await expect(cookSelected.page.getByRole('heading', { name: occasion })).toBeVisible();

        await cookOther.page.goto('/en/profile/booking-request-pool');
        await expect(cookOther.page.getByRole('heading', { name: occasion })).toHaveCount(0);

        // Act — admin manually notifies the other cook from the offers tab (confirm dialog, then toast)
        await admin.page.goto(`/en/admin/booking-requests/${bookingRequestId}?tab=offers`);
        const otherCookCard = admin.page.locator('li').filter({ hasText: otherDisplayName });
        await expect(otherCookCard).toBeVisible();
        const notifyConfirmDialog = admin.page.getByRole('alertdialog');
        await clickUntil(otherCookCard.getByRole('button', { name: 'Suggest to this cook too' }), async () => {
            await expect(notifyConfirmDialog).toBeVisible({ timeout: 2_000 });
            await expect(notifyConfirmDialog.getByRole('heading', { name: `Suggest this request to ${otherDisplayName}?` })).toBeVisible();
        });
        await clickUntil(notifyConfirmDialog.getByRole('button', { name: 'Suggest' }), async () => {
            await expect(admin.page.getByText('Chef notified.')).toBeVisible({ timeout: 2_000 });
        });

        // Assert — both cooks have notify emails; other cook now sees the pool row
        await expect
            .poll(async () => (await cookNotifyEmailsFind(bookingRequestId)).map((row) => row.toEmail).sort())
            .toEqual([cookOtherSeed.emailAddress, cookSelectedSeed.emailAddress].sort());

        await cookOther.page.goto('/en/profile/booking-request-pool');
        await expect(cookOther.page.getByRole('heading', { name: occasion })).toBeVisible();
    } finally {
        await Promise.all([actorClose(cookSelected), actorClose(cookOther), actorClose(admin)]);
    }
});
