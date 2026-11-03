import { HeadContent, Scripts, useLocation, useMatch } from '@tanstack/react-router';
import type { PropsWithChildren } from 'react';
import { Provider as GraphQLClientProvider } from 'urql';

import { urqlClient } from '../graphql/client';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { isWorkspaceNoDocumentScrollPath, pathWithoutLocale } from '../utils/locale';
import type { Locale } from '../utils/locale';
import { Toaster } from './base/sonner';
import { TooltipProvider } from './base/tooltip';
import { NavigationProgress } from './NavigationProgress';
import { SessionStartupGates } from './SessionStartupGates';

// peopleeat is light-only. This runs before paint so an OS dark preference cannot flash a dark shell.
const LIGHT_THEME_INIT_SCRIPT = `(function(){try{var root=document.documentElement;root.classList.remove('dark');root.classList.add('light');root.setAttribute('data-theme','light');root.style.colorScheme='light';}catch(e){}})();`;

// Page-width container for Header / Footer / SectionHero. Nested previews own a nearer `@container`.
const DOCUMENT_BODY_CLASS = '@container font-sans antialiased wrap-anywhere overflow-x-clip';

function isBrowserCapturePath(pathname: string): boolean {
    return pathname.startsWith('/server/');
}

function useDocumentLocale(): Locale {
    const routeLocale = useLocale();
    // `/server/*` routes have no `{-$locale}` param. Language comes from the captured gift card.
    // A new capture route that carries its own locale needs a match here.
    const receiptLocale = useMatch({
        from: '/server/gift-cards/$giftCardId/receipt',
        shouldThrow: false,
        select: (match) => match.loaderData?.giftCard.locale,
    });
    const voucherLocale = useMatch({
        from: '/server/gift-cards/$giftCardId/voucher',
        shouldThrow: false,
        select: (match) => match.loaderData?.giftCard.locale,
    });
    return receiptLocale ?? voucherLocale ?? routeLocale;
}

export function RootDocument({ children }: PropsWithChildren) {
    const pathname = useLocation({ select: (location) => location.pathname });
    const browserCapture = isBrowserCapturePath(pathname);
    const locale = useDocumentLocale();
    const workspaceNoDocumentScroll = isWorkspaceNoDocumentScrollPath(pathWithoutLocale(pathname));

    return (
        <html lang={locale} className={cn(workspaceNoDocumentScroll && 'workspace-no-document-scroll')} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: LIGHT_THEME_INIT_SCRIPT }} />
                <HeadContent />
            </head>
            <body
                className={cn(
                    DOCUMENT_BODY_CLASS,
                    // `!` beats `body { @apply bg-background }` so PDF margins stay white.
                    browserCapture && 'bg-white!',
                )}
            >
                {browserCapture ? children : <AppChrome locale={locale}>{children}</AppChrome>}
                <Scripts />
            </body>
        </html>
    );
}

function AppChrome({ children, locale }: PropsWithChildren<{ locale: Locale }>) {
    return (
        <>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-sm focus:ring-[3px] focus:ring-ring/50 focus:outline-none"
            >
                {{ de: 'Zum Inhalt springen', en: 'Skip to content' }[locale]}
            </a>
            <NavigationProgress />
            <TooltipProvider>
                <GraphQLClientProvider value={urqlClient}>
                    <SessionStartupGates enableCookieShell>{children}</SessionStartupGates>
                </GraphQLClientProvider>
            </TooltipProvider>
            <Toaster position="bottom-center" richColors />
        </>
    );
}
