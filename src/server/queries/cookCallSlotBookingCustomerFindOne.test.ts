import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { GqlSCookCallSlotBooking } from '../graphql/generated';
import { commandSetup } from '../test/commandTestUtils';
import { cookCallSlotBookingCustomerFindOne } from './cookCallSlotBookingCustomerFindOne';

describe('cookCallSlotBookingCustomerFindOne', () => {
    it('returns the display already present on the parent', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        const parent = { userId: idCreate(), customer: { display: 'Ada' } } as GqlSCookCallSlotBooking;

        // Act
        const customer = await cookCallSlotBookingCustomerFindOne(parent, requestingSession, serverRuntime);

        // Assert
        expect(customer).toEqual({ display: 'Ada' });
    });

    it('loads the customer first name when the parent display is empty', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({ firstName: 'Nia', lastName: 'Guest' });
        const parent = { userId: user.userId, customer: { display: '' } } as GqlSCookCallSlotBooking;

        // Act
        const customer = await cookCallSlotBookingCustomerFindOne(parent, requestingSession, serverRuntime);

        // Assert
        expect(customer).toEqual({ display: 'Nia' });
    });

    it('returns an empty display when the user id is unknown', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        const parent = { userId: idCreate(), customer: { display: '' } } as GqlSCookCallSlotBooking;

        // Act
        const customer = await cookCallSlotBookingCustomerFindOne(parent, requestingSession, serverRuntime);

        // Assert
        expect(customer).toEqual({ display: '' });
    });
});
