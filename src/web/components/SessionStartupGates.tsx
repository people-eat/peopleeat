import { useLocation } from '@tanstack/react-router';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { useQuery } from 'urql';

import { SessionStartupGatesDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { TimeZoneProvider } from '../hooks/useTimeZone';
import { ClientObservabilityBootstrap } from '../observability/ClientObservabilityBootstrap';
import { AnalyticsClarity } from './AnalyticsClarity';
import { AnalyticsGoogle } from './AnalyticsGoogle';
import { CookieBanner } from './CookieBanner';
import { CookieConsentProvider } from './CookieConsentContext';
import { LegalAcceptanceGate } from './LegalAcceptanceGate';
import { LocaleMismatchGate } from './LocaleMismatchGate';
import { SessionWebPageVisitTracker } from './SessionWebPageVisitTracker';

type ActiveGate = 'locale' | 'legal' | 'cookie' | null;

function isAdminPath(pathname: string): boolean {
    return pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/en/admin' || pathname.startsWith('/en/admin/');
}

function isPublicLegalReadablePath(pathname: string): boolean {
    return /(?:^|\/)(?:privacy-policy|terms-and-conditions)\/?$/.test(pathname);
}

// Exclusive root pipeline: locale mismatch → legal acceptance → cookie banner.
// One bootstrap query; only the highest-priority eligible surface shows.
// See docs/features/session-startup-gates.md.
export function SessionStartupGates({ children, enableCookieShell }: PropsWithChildren<{ enableCookieShell: boolean }>) {
    const routeLocale = useLocale();
    const pathname = useLocation({ select: (location) => location.pathname });
    const [{ data }, reload] = useQuery({ query: SessionStartupGatesDocument, requestPolicy: 'cache-and-network' });
    const [editorOpen, setEditorOpen] = useState(false);

    const session = data?.currentSession;
    const profileLocale = session?.user?.locale;
    const profileTimeZone = session?.user?.timeZone;
    const acceptance = session?.user?.legalAcceptance;
    const cookieSetting = session?.cookieSetting;

    const localeEligible = Boolean(profileLocale && profileLocale !== routeLocale);
    const legalEligible = Boolean(acceptance?.required) && !isPublicLegalReadablePath(pathname);
    const cookieEligible = enableCookieShell && data != null && (cookieSetting == null || editorOpen);

    const active: ActiveGate = localeEligible ? 'locale' : legalEligible ? 'legal' : cookieEligible ? 'cookie' : null;

    function closeEditor() {
        setEditorOpen(false);
    }

    function onGateResolved() {
        setEditorOpen(false);
        reload({ requestPolicy: 'network-only' });
    }

    const googleAnalyticsEnabled = cookieSetting?.googleAnalytics === true;
    const clarityEnabled = cookieSetting?.clarity === true && !isAdminPath(pathname);

    const content = (
        <TimeZoneProvider timeZone={profileTimeZone}>
            {children}
            {enableCookieShell ? (
                <>
                    <SessionWebPageVisitTracker />
                    <ClientObservabilityBootstrap />
                </>
            ) : null}
            <LocaleMismatchGate open={active === 'locale'} profileLocale={profileLocale ?? null} onResolved={onGateResolved} />
            <LegalAcceptanceGate
                open={active === 'legal'}
                sessionId={session?.sessionId ?? null}
                acceptance={acceptance ?? null}
                onResolved={onGateResolved}
            />
            {active === 'cookie' ? <CookieBanner dismissible={editorOpen} onDecided={onGateResolved} onDismiss={closeEditor} /> : null}
            {enableCookieShell ? (
                <>
                    <AnalyticsGoogle enabled={googleAnalyticsEnabled} />
                    <AnalyticsClarity enabled={clarityEnabled} />
                </>
            ) : null}
        </TimeZoneProvider>
    );

    if (!enableCookieShell) {
        return content;
    }

    return <CookieConsentProvider value={{ openSettings: () => setEditorOpen(true) }}>{content}</CookieConsentProvider>;
}
