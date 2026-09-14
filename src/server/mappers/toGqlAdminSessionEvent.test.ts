import { describe, expect, it } from 'vitest';

import type { SessionEvent } from '../db/schema';
import { toGqlAdminSessionEvent } from './toGqlAdminSessionEvent';

function baseEvent(overrides: Partial<SessionEvent> & Pick<SessionEvent, 'type' | 'payload'>): SessionEvent {
    return {
        sessionEventId: 'evt-1',
        sessionId: 'session-1',
        createdAt: new Date('2026-01-01T12:00:00.000Z'),
        ...overrides,
    };
}

describe('toGqlAdminSessionEvent', () => {
    it('humanizes page visits bilingually', () => {
        const mapped = toGqlAdminSessionEvent(
            baseEvent({
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'LANDING', path: '/' },
            }),
        );
        expect(mapped.descriptionDe).toContain('Seite besucht');
        expect(mapped.descriptionEn).toContain('Page visited');
        expect(mapped.link).toBeNull();
    });

    it('humanizes funnel step completions', () => {
        const mapped = toGqlAdminSessionEvent(
            baseEvent({
                type: 'WEB_PAGE_INTERACTION',
                payload: {
                    webPageKey: 'BOOKING_REQUEST_FORM',
                    area: 'booking_request_form',
                    interaction: { type: 'step_completed', step: 'occasion' },
                },
            }),
        );
        expect(mapped.descriptionDe).toContain('abgeschlossen');
        expect(mapped.descriptionEn).toContain('Completed form step');
        expect(mapped.descriptionEn).toContain('occasion');
    });

    it('links booking request created events', () => {
        const mapped = toGqlAdminSessionEvent(
            baseEvent({
                type: 'BOOKING_REQUEST_CREATED',
                payload: { bookingRequestId: 'br-1' },
            }),
        );
        expect(mapped.link).toBe('/admin/booking-requests/br-1');
        expect(mapped.descriptionEn).toContain('Booking request created');
    });

    it('humanizes auth OTP verify outcomes', () => {
        const signIn = toGqlAdminSessionEvent(
            baseEvent({
                type: 'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED',
                payload: { outcome: 'sign_in' },
            }),
        );
        expect(signIn.descriptionEn).toContain('sign-in');
        const registration = toGqlAdminSessionEvent(
            baseEvent({
                type: 'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED',
                payload: { outcome: 'registration_ticket' },
            }),
        );
        expect(registration.descriptionEn).toContain('registration');
    });

    it('marks legacy password sign-in keys', () => {
        const mapped = toGqlAdminSessionEvent(
            baseEvent({
                type: 'SIGN_IN_SUCCESSFUL',
                payload: {},
            }),
        );
        expect(mapped.descriptionEn).toContain('legacy');
        expect(mapped.descriptionDe).toContain('Legacy');
    });

    it('links booking request canceled events', () => {
        const mapped = toGqlAdminSessionEvent(
            baseEvent({
                type: 'BOOKING_REQUEST_CANCELED',
                payload: { bookingRequestId: 'br-2' },
            }),
        );
        expect(mapped.link).toBe('/admin/booking-requests/br-2');
        expect(mapped.descriptionEn).toContain('canceled');
    });
});
