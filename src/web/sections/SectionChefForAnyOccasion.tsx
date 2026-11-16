import { GiftIcon } from 'lucide-react';

import { t } from '../../i18n/t';
import { contentLocaleText } from '../../shared/contentSection';
import { formatCurrency } from '../../shared/formatCurrency';
import type { Locale } from '../../shared/locale';
import { cn } from '../utils/cn';
import { SectionChefCta } from './SectionChefCta';

export type SectionChefForAnyOccasionPromo = {
    redeemCode: string;
    amountCents: number;
};

export function SectionChefForAnyOccasion({
    locale,
    displayName,
    headlineDe,
    headlineEn,
    bodyDe,
    bodyEn,
    imageUrl,
    ctaUrl,
    promo,
    imageOverlay = true,
    className,
}: {
    locale: Locale;
    /** Partner, occasion, or city name shown on the CTA card and promo banner. */
    displayName: string;
    headlineDe: string;
    headlineEn: string;
    bodyDe: string;
    bodyEn: string;
    imageUrl?: string | null;
    /** Partner-only override for the primary CTA; omit for the booking form. */
    ctaUrl?: string | null;
    promo?: SectionChefForAnyOccasionPromo | null;
    /** Bottom gradient on the CTA image. Partners may turn off. */
    imageOverlay?: boolean;
    className?: string;
}) {
    const headline = contentLocaleText(headlineDe, headlineEn, locale).trim();
    const body = contentLocaleText(bodyDe, bodyEn, locale).trim();
    const formattedAmount = promo ? formatCurrency(promo.amountCents, { locale }) : null;

    return (
        <section className={cn('mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6', className)}>
            <div className="grid grid-cols-1 items-center gap-10 @lg:grid-cols-2 @lg:gap-16">
                <div className="flex flex-col gap-8">
                    <h2 className="font-serif text-3xl font-light @md:text-4xl">
                        {headline || <span className="italic text-muted-foreground">{t(locale, 'public', 'preview.headlineMissing')}</span>}
                    </h2>
                    <p className={cn('text-lg/8', body ? 'text-muted-foreground' : 'italic text-muted-foreground')}>
                        {body || t(locale, 'public', 'preview.bodyMissing')}
                    </p>
                </div>

                <SectionChefCta
                    locale={locale}
                    displayName={displayName}
                    imageUrl={imageUrl}
                    ctaUrl={ctaUrl}
                    imageOverlay={imageOverlay}
                    noImageLabel={t(locale, 'public', 'preview.noImage')}
                    banner={
                        promo && formattedAmount ? (
                            <div className="flex w-full items-center gap-3 rounded-xl bg-[#F5EDE4] px-4 py-3">
                                <GiftIcon aria-hidden="true" className="size-6 shrink-0 text-foreground" />
                                <div className="flex flex-col">
                                    <p className="text-sm font-semibold text-foreground">
                                        {t(locale, 'public', 'chefCta.promoGift', {
                                            amount: formattedAmount,
                                            name: displayName,
                                        })}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {t(locale, 'public', 'chefCta.promoCode', { code: promo.redeemCode })}
                                    </p>
                                </div>
                            </div>
                        ) : undefined
                    }
                />
            </div>
        </section>
    );
}
