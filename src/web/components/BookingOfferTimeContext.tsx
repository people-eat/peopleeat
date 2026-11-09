import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { BookingWhenPeer } from '../../shared';

export type BookingOfferTimeContextValue = {
    callPeers: readonly BookingWhenPeer[];
};

const BookingOfferTimeContext = createContext<BookingOfferTimeContextValue | null>(null);

export function BookingOfferTimeProvider({ callPeers, children }: { callPeers: readonly BookingWhenPeer[]; children: ReactNode }) {
    return <BookingOfferTimeContext.Provider value={{ callPeers }}>{children}</BookingOfferTimeContext.Provider>;
}

export function useBookingOfferTimeContext(): BookingOfferTimeContextValue | null {
    return useContext(BookingOfferTimeContext);
}
