import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { authEmailOtpCodeFind } from './db';
import { clickUntil } from './ui';

/** Request an email OTP through the auth gate and enter the code from OutboundEmails. */
export async function authEmailOtpComplete(page: Page, emailAddress: string): Promise<void> {
    await page.getByPlaceholder('Email address').fill(emailAddress);
    await clickUntil(page.getByRole('button', { name: 'Continue with email' }), async () => {
        await expect(page.getByRole('dialog', { name: 'Enter code' })).toBeVisible({ timeout: 2_000 });
    });

    await expect.poll(async () => authEmailOtpCodeFind(emailAddress), { timeout: 15_000 }).toMatch(/^\d{6}$/);
    const code = await authEmailOtpCodeFind(emailAddress);
    if (code == null) {
        throw new Error(`e2e: OTP code missing for ${emailAddress}`);
    }

    await page.getByLabel('Verification code').fill(code);
    await expect(page.getByRole('dialog', { name: 'Enter code' })).toBeHidden({ timeout: 15_000 });
}
