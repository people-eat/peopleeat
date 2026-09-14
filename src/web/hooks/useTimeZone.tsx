import { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

import { DEFAULT_TIME_ZONE } from '../../shared';

const TimeZoneContext = createContext<string | null>(null);

/** Browser IANA zone on the client; marketplace default during SSR. */
export function fallbackTimeZone(): string {
    if (typeof window === 'undefined') {
        return DEFAULT_TIME_ZONE;
    }
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
    } catch {
        return DEFAULT_TIME_ZONE;
    }
}

export function TimeZoneProvider({ timeZone, children }: PropsWithChildren<{ timeZone: string | null | undefined }>) {
    return <TimeZoneContext.Provider value={timeZone ?? null}>{children}</TimeZoneContext.Provider>;
}

/**
 * Signed-in profile `Users.timeZone` when available; otherwise the browser zone
 * (or `DEFAULT_TIME_ZONE` during SSR). Pass into `formatDate` / `formatTime`.
 */
export function useTimeZone(): string {
    const profileTimeZone = useContext(TimeZoneContext);
    if (profileTimeZone) {
        return profileTimeZone;
    }
    return fallbackTimeZone();
}
