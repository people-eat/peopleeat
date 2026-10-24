import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from 'urql';
import type { Locale } from '../../shared/locale';
import { FooterNewsletterSubscriptionCreateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import {
    SITE_FACEBOOK_URL,
    SITE_INSTAGRAM_URL,
    SITE_LINKEDIN_URL,
    SITE_LOGO,
    SITE_LOGO_DISPLAY,
    SITE_LOGO_SRC_SET,
    SITE_NAME,
    SITE_WHATSAPP_URL,
} from '../seo/seoConstants';
import { AppImage } from './AppImage';
import { Button } from './base/button';
import { Input } from './base/input';
import { useCookieConsent } from './CookieConsentContext';
import { LanguageSwitcher } from './LanguageSwitcher';

const COMPANY_NAME = 'peopleeat UG';

const COMPANY_LINKS = [
    { to: '/{-$locale}/about-us' as const, label: { de: 'Über uns', en: 'About us' } },
    { to: '/{-$locale}/how-to-become-a-chef' as const, label: { de: 'Koch werden', en: 'Become a chef' } },
    { to: '/{-$locale}/blog-posts' as const, label: { de: 'Blog', en: 'Blog' } },
] as const;

const DISCOVER_LINKS = [
    { to: '/{-$locale}/booking-request/form' as const, label: { de: 'Buchungsanfrage', en: 'Booking request' } },
    { to: '/{-$locale}/cities' as const, label: { de: 'Städte', en: 'Cities' } },
    { to: '/{-$locale}/partners' as const, label: { de: 'Partner', en: 'Partners' } },
    { to: '/{-$locale}/occasions' as const, label: { de: 'Anlässe', en: 'Occasions' } },
    { to: '/{-$locale}/chefs' as const, label: { de: 'Köche entdecken', en: 'Discover chefs' } },
] as const;

const SOCIAL_LINKS = [
    { href: SITE_INSTAGRAM_URL, label: 'Instagram' },
    { href: SITE_FACEBOOK_URL, label: 'Facebook' },
    { href: SITE_LINKEDIN_URL, label: 'LinkedIn' },
] as const;

const LEGAL_LINKS = [
    { to: '/{-$locale}/privacy-policy' as const, label: { de: 'Datenschutzerklärung', en: 'Privacy policy' } },
    { to: '/{-$locale}/terms-and-conditions' as const, label: { de: 'AGB', en: 'Terms and conditions' } },
    { to: '/{-$locale}/imprint' as const, label: { de: 'Impressum', en: 'Imprint' } },
] as const;

const linkClassName = 'text-sm text-muted-foreground transition-colors hover:text-foreground';

export function Footer({
    locale: localeProp,
    onLocaleChange,
}: {
    locale?: Locale;
    onLocaleChange?: (locale: Locale) => void;
} = {}) {
    const routeLocale = useLocale();
    const locale = localeProp ?? routeLocale;
    const cookieConsent = useCookieConsent();
    const currentYear = new Date().getFullYear();
    const companyNavLabel = { de: 'Unternehmen', en: 'Company' }[locale];
    const discoverNavLabel = { de: 'Entdecken', en: 'Discover' }[locale];
    const socialNavLabel = 'Social Media';
    const legalNavLabel = { de: 'Rechtliches', en: 'Legal' }[locale];
    const cookieSettingsLabel = { de: 'Cookie-Einstellungen', en: 'Cookie settings' }[locale];
    const newsletterNavLabel = { de: 'Newsletter', en: 'Newsletter' }[locale];
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [{ fetching: newsletterFetching }, newsletterSubscribe] = useMutation(FooterNewsletterSubscriptionCreateDocument);

    async function newsletterSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setNewsletterStatus('idle');
        const result = await newsletterSubscribe({ emailAddress: newsletterEmail.trim(), locale });
        if (result.error || !result.data?.sessionNewsletterSubscriptionCreate.success) {
            setNewsletterStatus('error');
            return;
        }
        setNewsletterStatus('success');
        setNewsletterEmail('');
    }

    return (
        <footer className="mx-auto w-full max-w-7xl px-8 py-12" role="contentinfo">
            <div className="grid grid-cols-2 gap-8 @4xl:grid-cols-4">
                <nav aria-label={companyNavLabel} className="col-span-1">
                    <Link
                        to="/{-$locale}"
                        className="mb-4 inline-flex shrink-0 focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                        <AppImage
                            src={SITE_LOGO}
                            srcSet={SITE_LOGO_SRC_SET}
                            alt={SITE_NAME}
                            width={SITE_LOGO_DISPLAY.width}
                            height={SITE_LOGO_DISPLAY.height}
                            className="h-7 w-auto"
                        />
                    </Link>
                    <ul className="space-y-3">
                        {COMPANY_LINKS.map((item) => (
                            <li key={item.to}>
                                <Link to={item.to} className={linkClassName}>
                                    {item.label[locale]}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <nav aria-label={discoverNavLabel} className="col-span-1">
                    <h2 className="pb-4 text-sm font-medium text-foreground">{discoverNavLabel}</h2>
                    <ul className="space-y-3">
                        {DISCOVER_LINKS.map((item) => (
                            <li key={item.to}>
                                <Link to={item.to} className={linkClassName}>
                                    {item.label[locale]}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <nav aria-label={socialNavLabel} className="col-span-2 @4xl:col-span-1">
                    <h2 className="pb-4 text-sm font-medium text-foreground">{socialNavLabel}</h2>
                    <ul className="space-y-3">
                        {SOCIAL_LINKS.map((item) => (
                            <li key={item.href}>
                                <a href={item.href} className={linkClassName} target="_blank" rel="noopener noreferrer">
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="col-span-2 flex flex-col gap-4 @4xl:col-span-1">
                    <h2 className="text-base font-medium text-foreground">{{ de: 'Hast du Fragen?', en: 'Have questions?' }[locale]}</h2>
                    <div>
                        <Button asChild>
                            <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                                {{ de: 'Kontaktiere uns', en: 'Contact us' }[locale]}
                            </a>
                        </Button>
                    </div>
                    <form className="flex flex-col gap-2" onSubmit={newsletterSubmit} aria-label={newsletterNavLabel}>
                        <h2 className="text-sm font-medium text-foreground">{newsletterNavLabel}</h2>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Tipps und Neuigkeiten zu private Dining. Jederzeit abbestellbar.',
                                    en: 'Tips and news about private dining. Unsubscribe anytime.',
                                }[locale]
                            }
                        </p>
                        <div className="flex flex-col gap-2 @sm:flex-row">
                            <Input
                                type="email"
                                name="email"
                                autoComplete="email"
                                required
                                value={newsletterEmail}
                                onChange={(event) => setNewsletterEmail(event.target.value)}
                                placeholder={{ de: 'E-Mail-Adresse', en: 'Email address' }[locale]}
                                aria-label={{ de: 'E-Mail-Adresse', en: 'Email address' }[locale]}
                            />
                            <Button type="submit" disabled={newsletterFetching}>
                                {{ de: 'Anmelden', en: 'Subscribe' }[locale]}
                            </Button>
                        </div>
                        {newsletterStatus === 'success' ? (
                            <p className="text-sm text-foreground" role="status">
                                {{ de: 'Danke, du bist angemeldet.', en: 'Thanks, you are subscribed.' }[locale]}
                            </p>
                        ) : null}
                        {newsletterStatus === 'error' ? (
                            <p className="text-sm text-destructive" role="alert">
                                {
                                    {
                                        de: 'Anmeldung fehlgeschlagen. Bitte prüfe die E-Mail-Adresse.',
                                        en: 'Subscription failed. Please check the email address.',
                                    }[locale]
                                }
                            </p>
                        ) : null}
                    </form>
                </div>
            </div>

            <div className="mt-12 border-t border-border pt-8">
                <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground @4xl:flex-row @4xl:justify-between">
                    <p>
                        © {currentYear} {COMPANY_NAME}, {{ de: 'alle Rechte vorbehalten', en: 'all rights reserved' }[locale]}.
                    </p>
                    <nav aria-label={legalNavLabel} className="flex flex-wrap items-center justify-center gap-6">
                        {LEGAL_LINKS.map((item) => (
                            <Link key={item.to} to={item.to} className="transition-colors hover:text-foreground">
                                {item.label[locale]}
                            </Link>
                        ))}
                        {cookieConsent ? (
                            <button
                                type="button"
                                className="cursor-pointer transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                onClick={() => cookieConsent.openSettings()}
                            >
                                {cookieSettingsLabel}
                            </button>
                        ) : null}
                        <LanguageSwitcher locale={locale} onLocaleChange={onLocaleChange} />
                    </nav>
                </div>
            </div>
        </footer>
    );
}
