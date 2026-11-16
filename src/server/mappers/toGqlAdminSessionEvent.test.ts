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
    it('humanizes page visits in the viewer locale', () => {
        const event = baseEvent({
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'LANDING', path: '/' },
        });
        const german = toGqlAdminSessionEvent(event, 'de');
        const english = toGqlAdminSessionEvent(event, 'en');
        const french = toGqlAdminSessionEvent(event, 'fr');
        expect(german.description).toContain('Seite besucht');
        expect(english.description).toContain('Page visited');
        expect(french.description.length).toBeGreaterThan(0);
        expect(german.link).toBeNull();
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
            'en',
        );
        expect(mapped.description).toContain('Completed form step');
        expect(mapped.description).toContain('occasion');
    });

    it('links booking request created events', () => {
        const mapped = toGqlAdminSessionEvent(
            baseEvent({
                type: 'BOOKING_REQUEST_CREATED',
                payload: { bookingRequestId: 'br-1' },
            }),
            'en',
        );
        expect(mapped.link).toBe('/admin/booking-requests/br-1');
        expect(mapped.description).toContain('Booking request created');
    });

    it('humanizes auth OTP verify outcomes', () => {
        const signIn = toGqlAdminSessionEvent(
            baseEvent({
                type: 'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED',
                payload: { outcome: 'sign_in' },
            }),
            'en',
        );
        expect(signIn.description).toContain('sign-in');
        const registration = toGqlAdminSessionEvent(
            baseEvent({
                type: 'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED',
                payload: { outcome: 'registration_ticket' },
            }),
            'en',
        );
        expect(registration.description).toContain('registration');
    });

    it('marks legacy password sign-in keys', () => {
        const mappedDe = toGqlAdminSessionEvent(
            baseEvent({
                type: 'SIGN_IN_SUCCESSFUL',
                payload: {},
            }),
            'de',
        );
        const mappedEn = toGqlAdminSessionEvent(
            baseEvent({
                type: 'SIGN_IN_SUCCESSFUL',
                payload: {},
            }),
            'en',
        );
        expect(mappedEn.description).toContain('legacy');
        expect(mappedDe.description).toContain('Legacy');
    });

    it('links booking request canceled events', () => {
        const mapped = toGqlAdminSessionEvent(
            baseEvent({
                type: 'BOOKING_REQUEST_CANCELED',
                payload: { bookingRequestId: 'br-2' },
            }),
            'en',
        );
        expect(mapped.link).toBe('/admin/booking-requests/br-2');
        expect(mapped.description).toContain('canceled');
    });

    it('does not mark newsletter subscription as legacy', () => {
        const mapped = toGqlAdminSessionEvent(
            baseEvent({
                type: 'NEWSLETTER_SUBSCRIPTION_CREATED',
                payload: {},
            }),
            'en',
        );
        expect(mapped.description).toBe('Newsletter subscribed');
        expect(mapped.description.toLowerCase()).not.toContain('legacy');
    });

    it('links offer accept and payment lifecycle events', () => {
        const accepted = toGqlAdminSessionEvent(
            baseEvent({
                type: 'BOOKING_REQUEST_OFFER_ACCEPTED',
                payload: {
                    bookingRequestId: 'br-3',
                    bookingRequestOfferId: 'offer-1',
                    actor: 'customer',
                },
            }),
            'en',
        );
        expect(accepted.link).toBe('/admin/booking-requests/br-3');
        expect(accepted.description).toContain('customer');

        const paid = toGqlAdminSessionEvent(
            baseEvent({
                type: 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED',
                payload: { bookingRequestId: 'br-3', bookingRequestOfferId: 'offer-1' },
            }),
            'en',
        );
        expect(paid.link).toBe('/admin/booking-requests/br-3');
        expect(paid.description).toContain('succeeded');
    });
});
