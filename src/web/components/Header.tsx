import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { Locale } from '../../shared/locale';
import { useLocale } from '../hooks/useLocale';
import { SITE_LOGO, SITE_LOGO_DISPLAY, SITE_LOGO_SRC_SET, SITE_NAME } from '../seo/seoConstants';
import { cn } from '../utils/cn';
import { HeaderNav } from './HeaderNav';
import { HeaderNavMenu } from './HeaderNavMenu';
import { HeroButton } from './HeroButton';
import { PublicSessionNav } from './PublicSessionNav';

export type PublicHeaderUser =
    | {
          admin: { adminId: string } | null;
          cook?: { cookId: string } | null;
      }
    | null
    | undefined;

/** Viewport band occupied by header chrome — used for wordmark contrast. */
const HEADER_CONTRAST_BAND_PX = 80;

/** Mark full-bleed dark media so the header can invert the wordmark over it. */
const HEADER_OVER_MEDIA_ATTR = 'data-over-media';

function headerIsOverMedia(): boolean {
    const nodes = document.querySelectorAll(`[${HEADER_OVER_MEDIA_ATTR}]`);
    for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (rect.top < HEADER_CONTRAST_BAND_PX && rect.bottom > 0) {
            return true;
        }
    }
    return false;
}

export function Header({
    user,
    overMedia = false,
    locale: localeProp,
    bookingRequestCtaUrl,
}: {
    user: PublicHeaderUser;
    overMedia?: boolean;
    locale?: Locale;
    /** When set (e.g. partner `firstSectionCtaUrl`), overrides the default booking-form link. */
    bookingRequestCtaUrl?: string | null;
}) {
    const routeLocale = useLocale();
    const locale = localeProp ?? routeLocale;
    const showBookingRequestCta = !user?.cook;
    const trimmedBookingRequestCtaUrl = bookingRequestCtaUrl?.trim() || null;
    // Prefer inverted on first paint when the page opens over hero media; scroll
    // sync below corrects against every `[data-over-media]` region.
    const [invertLogo, setInvertLogo] = useState(overMedia);

    useEffect(() => {
        const sync = () => {
            setInvertLogo(headerIsOverMedia());
        };
        sync();
        window.addEventListener('scroll', sync, { passive: true });
        window.addEventListener('resize', sync);
        return () => {
            window.removeEventListener('scroll', sync);
            window.removeEventListener('resize', sync);
        };
    }, []);

    // `overMedia` uses `fixed` (not sticky): Radix modal menus lock body scroll,
    // which unsticks `position: sticky` and sends the bar back to its in-flow
    // spot at the top of the document — off-screen when the page is scrolled.
    // Fixed keeps chrome out of flow so `SectionHero` can stay `h-dvh`.
    return (
        <header
            className={cn(
                'z-10 flex w-full items-center justify-between gap-3 p-2 @6xl:gap-4 @6xl:p-4',
                overMedia ? 'fixed inset-x-0 top-0' : 'sticky top-0',
            )}
        >
            <Link
                to="/{-$locale}"
                className="inline-flex min-w-0 shrink focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
                <img
                    src={SITE_LOGO}
                    srcSet={SITE_LOGO_SRC_SET}
                    alt={SITE_NAME}
                    width={SITE_LOGO_DISPLAY.width}
                    height={SITE_LOGO_DISPLAY.height}
                    className={cn('h-6 w-auto @6xl:h-7', invertLogo && 'brightness-0 invert')}
                />
            </Link>
            <HeaderNav locale={locale} />
            <div className="flex shrink-0 items-center gap-2 @6xl:gap-4">
                <HeaderNavMenu user={user} locale={locale} />
                <PublicSessionNav user={user} locale={locale} />
                {showBookingRequestCta ? (
                    <HeroButton asChild className="px-4 text-sm @6xl:px-6 @6xl:text-md">
                        {trimmedBookingRequestCtaUrl ? (
                            <a href={trimmedBookingRequestCtaUrl}>{{ de: 'Anfrage senden', en: 'Send request' }[locale]}</a>
                        ) : (
                            <Link to="/{-$locale}/booking-request/form">{{ de: 'Anfrage senden', en: 'Send request' }[locale]}</Link>
                        )}
                    </HeroButton>
                ) : null}
            </div>
        </header>
    );
}
