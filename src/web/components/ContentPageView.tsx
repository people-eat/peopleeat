import { Suspense } from 'react';

import type { ContentSection } from '../../shared/contentSection';
import { contentLocaleText } from '../../shared/contentSection';
import type { Locale } from '../../shared/locale';
import { useT } from '../hooks/useT';
import { SectionBlogHero } from '../sections/SectionBlogHero';
import { SectionChefForAnyOccasion } from '../sections/SectionChefForAnyOccasion';
import type { SectionChefForAnyOccasionPromo } from '../sections/SectionChefForAnyOccasion';
import { SectionCities } from '../sections/SectionCities';
import type { SectionCitiesCity } from '../sections/SectionCities';
import { SectionFeaturedCooks } from '../sections/SectionFeaturedCooks';
import type { SectionFeaturedCook } from '../sections/SectionFeaturedCooks';
import { SectionHero } from '../sections/SectionHero';
import { SectionHowItWorks } from '../sections/SectionHowItWorks';
import { SectionKnownFrom } from '../sections/SectionKnownFrom';
import { SectionLastVisitedCooks } from '../sections/SectionLastVisitedCooks';
import type { SectionOccasionFormatsModel } from '../sections/SectionOccasionFormats';
import { SectionOccasionFormats } from '../sections/SectionOccasionFormats';
import { SectionPageTestimonials } from '../sections/SectionPageTestimonials';
import type { SectionPageTestimonial } from '../sections/SectionPageTestimonials';
import { SectionVenuesExplore } from '../sections/SectionVenuesExplore';
import type { ContentPageIndexLink } from './contentPageIndexLink';
import { ContentSectionsRenderer } from './ContentSectionsRenderer';
import { Footer } from './Footer';
import { Header } from './Header';
import type { PublicHeaderUser } from './Header';
import { I18nProvider } from './I18nProvider';
import type { PublicCookCardCook } from './PublicCookCard';

/** Public chrome + section copy used by `ContentPageView` (admin preview may diverge from route locale). */
const CONTENT_PAGE_I18N_NAMESPACES = ['common', 'public'] as const;

type ContentPageHeroVariant = 'fullBleed' | 'article';

export type ContentPageViewModel = {
    headlineDe: string;
    headlineEn: string;
    subHeadlineDe: string;
    subHeadlineEn: string;
    heroImageUrl: string | null | undefined;
    /** Used when `heroImageUrl` is missing (city pages ship a stock fallback). */
    heroImageFallbackUrl?: string;
    /** Dark scrim on full-bleed hero. Default true; partners may turn off. */
    heroImageOverlay?: boolean;
    /** `fullBleed` = `SectionHero` (default); `article` = blog title / lead / rounded image. */
    heroVariant?: ContentPageHeroVariant;
    sections: ContentSection[];
    featuredCooks?: ReadonlyArray<SectionFeaturedCook>;
    /** Show travel-origin city on featured cook cards. Default true; partners may turn off. */
    featuredCooksShowCity?: boolean;
    // Curated city/partner/occasion testimonials, shown after featured cooks.
    // Hidden when empty — see `SectionPageTestimonials`.
    testimonials?: ReadonlyArray<SectionPageTestimonial>;
    /** Partner / occasion / city first-section CTA (ChefForAnyOccasion). */
    chefForAnyOccasion?: {
        displayName: string;
        headlineDe: string;
        headlineEn: string;
        bodyDe: string;
        bodyEn: string;
        imageUrl?: string | null;
        imageAlt?: string;
        /** Partner-only CTA override for first-section + header; omit / null keeps the booking form. */
        ctaUrl?: string | null;
        promo?: SectionChefForAnyOccasionPromo | null;
        /** Bottom gradient on the CTA image. Default true; partners may turn off. */
        imageOverlay?: boolean;
    };
    /** Occasion three-format showcase below the CTA. Hidden when empty on public pages. */
    formatsSection?: SectionOccasionFormatsModel;
    /** Admin preview keeps the formats slot visible with placeholders. */
    formatsSectionForceShow?: boolean;
    /** City / partner detail chrome after testimonials (also on the landing page). */
    howItWorks?: boolean;
    /** Hide HowItWorks WhatsApp CTA (venue pages). */
    howItWorksHideCta?: boolean;
    /** Venue HowItWorks alternative assets. */
    howItWorksAlternativeMedia?: boolean;
    /** City list below dynamic sections. Hidden when empty / omitted. */
    cities?: ReadonlyArray<SectionCitiesCity>;
    /** When set with `cities`, only siblings in that market are listed. */
    citiesCountryCode?: SectionCitiesCity['countryCode'];
    /** Venue detail CTA to `/venues` (exploration path). */
    venuesExplore?: boolean;
    /** Press logos after the cities list (city detail + landing + venues). */
    knownFrom?: boolean;
    /** Session last-visited chef cards (blog posts). Hidden when empty / omitted. */
    lastVisitedCooks?: ReadonlyArray<PublicCookCardCook>;
    /** Back link above the hero. Omitted on admin preview and pages that already have their own. */
    indexLink?: ContentPageIndexLink;
};

export function ContentPageView({
    page,
    locale,
    onLocaleChange,
    user,
}: {
    page: ContentPageViewModel;
    locale: Locale;
    onLocaleChange?: (locale: Locale) => void;
    user: PublicHeaderUser;
}) {
    // Admin ContentPageEditor can flip `locale` to EN without navigating `/en/…`,
    // so route loaders never fetched `en/common` + `en/public`. Sections call sync
    // `t(locale, …)` and throw without this nested provider (Suspense-waits catalogs).
    return (
        <Suspense fallback={null}>
            <I18nProvider locale={locale} namespaces={CONTENT_PAGE_I18N_NAMESPACES}>
                <ContentPageViewBody page={page} locale={locale} onLocaleChange={onLocaleChange} user={user} />
            </I18nProvider>
        </Suspense>
    );
}

function ContentPageViewBody({
    page,
    locale,
    onLocaleChange,
    user,
}: {
    page: ContentPageViewModel;
    locale: Locale;
    onLocaleChange?: (locale: Locale) => void;
    user: PublicHeaderUser;
}) {
    const { t } = useT('common');
    const { t: tPublic } = useT('public');
    const heroVariant = page.heroVariant ?? 'fullBleed';
    const headline = contentLocaleText(page.headlineDe, page.headlineEn, locale).trim();
    const subheadline = contentLocaleText(page.subHeadlineDe, page.subHeadlineEn, locale).trim();
    const uploadedHero = page.heroImageUrl?.trim() || null;
    const heroSrc = uploadedHero ?? page.heroImageFallbackUrl ?? null;
    const heroAlt = uploadedHero
        ? headline
            ? t('imageAlt.photoOf', { name: headline })
            : ''
        : page.heroImageFallbackUrl
          ? tPublic('cities.heroFallbackAlt')
          : '';
    const fullBleedMedia = heroVariant === 'fullBleed' && heroSrc ? { src: heroSrc, type: 'image' as const, alt: heroAlt } : null;
    const noMediaLabel = t('m.noHeroImage');

    return (
        // Wrapper owns `@container` so Header / Footer / SectionHero / sections
        // query this pane’s width (admin split preview), not the viewport.
        <div className="@container w-full min-w-0" data-content-preview-anchor="top">
            <Header
                user={user}
                overMedia={Boolean(fullBleedMedia)}
                locale={locale}
                bookingRequestCtaUrl={page.chefForAnyOccasion?.ctaUrl}
            />
            <main id="main-content">
                <div data-content-preview-anchor="hero">
                    {heroVariant === 'article' ? (
                        <SectionBlogHero
                            headline={headline || undefined}
                            lead={subheadline || undefined}
                            imageUrl={heroSrc}
                            imageAlt={heroAlt || undefined}
                            noMediaLabel={noMediaLabel}
                            indexLink={page.indexLink}
                        />
                    ) : (
                        <SectionHero
                            headline={headline || undefined}
                            subheadline={subheadline || undefined}
                            media={fullBleedMedia}
                            noMediaLabel={noMediaLabel}
                            imageOverlay={page.heroImageOverlay}
                            indexLink={page.indexLink}
                        />
                    )}
                </div>
                {page.chefForAnyOccasion ? (
                    <div data-content-preview-anchor="first-section">
                        <SectionChefForAnyOccasion
                            locale={locale}
                            displayName={page.chefForAnyOccasion.displayName}
                            headlineDe={page.chefForAnyOccasion.headlineDe}
                            headlineEn={page.chefForAnyOccasion.headlineEn}
                            bodyDe={page.chefForAnyOccasion.bodyDe}
                            bodyEn={page.chefForAnyOccasion.bodyEn}
                            imageUrl={page.chefForAnyOccasion.imageUrl}
                            imageAlt={page.chefForAnyOccasion.imageAlt}
                            ctaUrl={page.chefForAnyOccasion.ctaUrl}
                            promo={page.chefForAnyOccasion.promo}
                            imageOverlay={page.chefForAnyOccasion.imageOverlay}
                        />
                    </div>
                ) : null}
                {page.formatsSection ? (
                    <div data-content-preview-anchor="formats">
                        <SectionOccasionFormats
                            locale={locale}
                            formatsSection={page.formatsSection}
                            forceShow={page.formatsSectionForceShow}
                        />
                    </div>
                ) : null}
                {page.featuredCooks ? (
                    <div data-content-preview-anchor="featured-cooks">
                        <SectionFeaturedCooks cooks={page.featuredCooks} locale={locale} showCity={page.featuredCooksShowCity} />
                    </div>
                ) : null}
                {page.testimonials ? (
                    <div data-content-preview-anchor="testimonials">
                        <SectionPageTestimonials testimonials={page.testimonials} locale={locale} showBookingCta />
                    </div>
                ) : null}
                {page.howItWorks ? (
                    <div data-content-preview-anchor="how-it-works">
                        <SectionHowItWorks hideCta={page.howItWorksHideCta} useAlternativeMedia={page.howItWorksAlternativeMedia} />
                    </div>
                ) : null}
                <ContentSectionsRenderer sections={page.sections} locale={locale} />
                {page.cities ? (
                    <div data-content-preview-anchor="cities">
                        <SectionCities cities={page.cities} countryCode={page.citiesCountryCode} />
                    </div>
                ) : null}
                {page.venuesExplore ? (
                    <div data-content-preview-anchor="venues-explore">
                        <SectionVenuesExplore />
                    </div>
                ) : null}
                {page.knownFrom ? (
                    <div data-content-preview-anchor="known-from">
                        <SectionKnownFrom />
                    </div>
                ) : null}
                {page.lastVisitedCooks ? (
                    <div data-content-preview-anchor="last-visited-cooks">
                        <SectionLastVisitedCooks cooks={page.lastVisitedCooks} locale={locale} />
                    </div>
                ) : null}
            </main>
            <Footer locale={locale} onLocaleChange={onLocaleChange} />
        </div>
    );
}
