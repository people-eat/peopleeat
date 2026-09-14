import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export type CookieConsentApi = {
    openSettings: () => void;
};

const CookieConsentContext = createContext<CookieConsentApi | null>(null);

export function CookieConsentProvider({ value, children }: { value: CookieConsentApi; children: ReactNode }) {
    return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

/** Opens the cookie banner from chrome such as the footer. Null outside the provider (e.g. `/server/*`). */
export function useCookieConsent(): CookieConsentApi | null {
    return useContext(CookieConsentContext);
}
