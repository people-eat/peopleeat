import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { authEmailOtps, cooks, outboundEmails, sessions, users } from '../db/schema';
import { userKlaviyoProfileSync } from '../jobs/handlers/userKlaviyoProfileSync';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import * as authOtpUtils from '../utils/authOtpUtils';
import { authEmailOtpRequest } from './authEmailOtpRequest';
import { authEmailOtpVerify } from './authEmailOtpVerify';
import { userCreate } from './userCreate';

const berlinSuggestion = {
    displayText: 'Unter den Linden 1, 10117 Berlin, Germany',
    latitude: 52.517,
    longitude: 13.388,
    structuredAddress: {
        addressLine1: 'Unter den Linden 1',
        addressLine2: '',
        city: 'Berlin',
        postCode: '10117',
        state: 'BE',
        country: 'DE',
    },
};

const cookInput = {
    exactTravelOriginAddress: 'Unter den Linden 1 Berlin',
    biography: 'I cook with love',
    cuisineStyle: 'Italienisch',
    cookingPhilosophy: 'Saisonal',
    travelExpensesAmount: 40,
    maximumTravelDistance: 100,
};

describe('userCreate', () => {
    afterEach(() => {
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockRestore();
    });

    it('creates a complete user from a verified OTP ticket and binds the session', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const email = `register-${idCreate().toLowerCase()}@example.com`;
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('424242');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: idCreate() });

        await authEmailOtpRequest({ email, locale: 'en' }, requestingSession, serverRuntime);
        await authEmailOtpVerify({ email, code: '424242' }, requestingSession, serverRuntime);

        const result = await userCreate(
            {
                input: {
                    firstName: 'Ada',
                    lastName: 'Lovelace',
                    phoneNumber: phoneNumberCreate(),
                    birthDate: '1990-01-15',
                    preferredCommunication: 'E_MAIL',
                    locale: 'en',
                    timeZone: 'Europe/Berlin',
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(requestingSession.userId).toBe(result.referenceId);
        expect(serverRuntime.jobs.enqueue).toHaveBeenCalledWith(userKlaviyoProfileSync, {
            userId: result.referenceId,
        });

        const [user] = await testDb.select().from(users).where(eq(users.emailAddress, email));
        expect(user?.firstName).toBe('Ada');
        expect(user?.lastName).toBe('Lovelace');
        expect(user?.phoneNumber).toBeTruthy();
        expect(user?.birthDate).toBe('1990-01-15');
        expect(user?.preferredCommunication).toBe('E_MAIL');
        expect(user?.locale).toBe('en');
        expect(user?.timeZone).toBe('Europe/Berlin');
        expect(user?.lastAcceptedPrivacyPolicy).toBeInstanceOf(Date);

        const [otp] = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(otp?.consumedAt).toBeInstanceOf(Date);

        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, requestingSession.sessionId));
        expect(session?.userId).toBe(user?.userId);

        const cookRows = await testDb.select().from(cooks).where(eq(cooks.cookId, result.referenceId!));
        expect(cookRows).toHaveLength(0);
    });

    it('creates cook membership when cook input is provided', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const email = `register-cook-${idCreate().toLowerCase()}@example.com`;
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('424242');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: idCreate() });
        vi.mocked(serverRuntime.places.locationSuggestions).mockResolvedValue([berlinSuggestion]);

        await authEmailOtpRequest({ email, locale: 'en' }, requestingSession, serverRuntime);
        await authEmailOtpVerify({ email, code: '424242' }, requestingSession, serverRuntime);

        const result = await userCreate(
            {
                input: {
                    firstName: 'Chef',
                    lastName: 'Ada',
                    phoneNumber: phoneNumberCreate(),
                    birthDate: '1990-01-15',
                    preferredCommunication: 'E_MAIL',
                    locale: 'en',
                    timeZone: 'Europe/Berlin',
                    cook: cookInput,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, result.referenceId!));
        expect(cook?.biography).toBe('I cook with love');
        expect(cook?.cuisineStyle).toBe('Italienisch');
        expect(cook?.cookingPhilosophy).toBe('Saisonal');
        expect(cook?.travelExpensesAmount).toBe(40);
        expect(cook?.maximumTravelDistance).toBe(100);
        expect(cook?.exactTravelOriginAddress?.city).toBe('Berlin');
    });

    it('backfills outbound email userId for signup OTP and guest gift-card rows matching the new email', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const email = `register-backfill-${idCreate().toLowerCase()}@example.com`;
        const otherEmail = `other-${idCreate().toLowerCase()}@example.com`;
        const { user: otherUser } = await commandSetup.withUser();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('424242');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: idCreate() });

        const [otpRow] = await testDb
            .insert(outboundEmails)
            .values({
                outboundEmailId: idCreate(),
                provider: 'console',
                purpose: 'AUTH_EMAIL_OTP',
                toEmail: email,
                subject: 'Your code',
                locale: 'en',
                userId: null,
            })
            .returning();
        const [giftRow] = await testDb
            .insert(outboundEmails)
            .values({
                outboundEmailId: idCreate(),
                provider: 'console',
                purpose: 'GIFT_CARD_PURCHASED',
                toEmail: email,
                subject: 'Gift card',
                locale: 'en',
                userId: null,
            })
            .returning();
        const [unrelatedRow] = await testDb
            .insert(outboundEmails)
            .values({
                outboundEmailId: idCreate(),
                provider: 'console',
                purpose: 'AUTH_EMAIL_OTP',
                toEmail: otherEmail,
                subject: 'Other code',
                locale: 'en',
                userId: null,
            })
            .returning();
        const [alreadyAttributedRow] = await testDb
            .insert(outboundEmails)
            .values({
                outboundEmailId: idCreate(),
                provider: 'console',
                purpose: 'AUTH_EMAIL_OTP',
                toEmail: email,
                subject: 'Already attributed',
                locale: 'en',
                userId: otherUser.userId,
            })
            .returning();

        await authEmailOtpRequest({ email, locale: 'en' }, requestingSession, serverRuntime);
        await authEmailOtpVerify({ email, code: '424242' }, requestingSession, serverRuntime);

        const result = await userCreate(
            {
                input: {
                    firstName: 'Ada',
                    lastName: 'Lovelace',
                    phoneNumber: phoneNumberCreate(),
                    birthDate: '1990-01-15',
                    preferredCommunication: 'E_MAIL',
                    locale: 'en',
                    timeZone: 'Europe/Berlin',
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const newUserId = result.referenceId!;

        const [otpAfter] = await testDb.select().from(outboundEmails).where(eq(outboundEmails.outboundEmailId, otpRow!.outboundEmailId));
        const [giftAfter] = await testDb.select().from(outboundEmails).where(eq(outboundEmails.outboundEmailId, giftRow!.outboundEmailId));
        const [unrelatedAfter] = await testDb
            .select()
            .from(outboundEmails)
            .where(eq(outboundEmails.outboundEmailId, unrelatedRow!.outboundEmailId));
        const [attributedAfter] = await testDb
            .select()
            .from(outboundEmails)
            .where(eq(outboundEmails.outboundEmailId, alreadyAttributedRow!.outboundEmailId));

        expect(otpAfter?.userId).toBe(newUserId);
        expect(giftAfter?.userId).toBe(newUserId);
        expect(unrelatedAfter?.userId).toBeNull();
        expect(attributedAfter?.userId).toBe(otherUser.userId);
    });

    it('creates a user without phone, birthDate, or preferredCommunication when omitted', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const email = `register-lite-${idCreate().toLowerCase()}@example.com`;
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('424242');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: idCreate() });

        await authEmailOtpRequest({ email, locale: 'en' }, requestingSession, serverRuntime);
        await authEmailOtpVerify({ email, code: '424242' }, requestingSession, serverRuntime);

        const result = await userCreate(
            {
                input: {
                    firstName: 'Ada',
                    lastName: 'Lovelace',
                    locale: 'en',
                    timeZone: 'Europe/Berlin',
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const [user] = await testDb.select().from(users).where(eq(users.emailAddress, email));
        expect(user?.firstName).toBe('Ada');
        expect(user?.phoneNumber).toBeNull();
        expect(user?.birthDate).toBeNull();
        expect(user?.preferredCommunication).toBeNull();
    });

    it('rejects registration without a verified OTP', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();

        await expect(
            userCreate(
                {
                    input: {
                        firstName: 'Ada',
                        lastName: 'Lovelace',
                        phoneNumber: '+491511111111',
                        birthDate: '1990-01-15',
                        preferredCommunication: 'SMS',
                        locale: 'en',
                        timeZone: 'Europe/Berlin',
                    },
                },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/userCreate: verified email required/);
    });

    it('rejects a birth date under the minimum age', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const email = `register-underage-${idCreate().toLowerCase()}@example.com`;
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('424242');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: idCreate() });

        await authEmailOtpRequest({ email, locale: 'en' }, requestingSession, serverRuntime);
        await authEmailOtpVerify({ email, code: '424242' }, requestingSession, serverRuntime);

        const underageBirthDate = `${new Date().getFullYear() - 10}-01-01`;

        await expect(
            userCreate(
                {
                    input: {
                        firstName: 'Too',
                        lastName: 'Young',
                        phoneNumber: phoneNumberCreate(),
                        birthDate: underageBirthDate,
                        preferredCommunication: 'E_MAIL',
                        locale: 'en',
                        timeZone: 'Europe/Berlin',
                    },
                },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/userCreate: birthDate must be at least 18 years ago/);
    });
});
