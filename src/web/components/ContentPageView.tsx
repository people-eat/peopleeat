import type { ContentSection } from '../../shared/contentSection';
import { contentLocaleText } from '../../shared/contentSection';
import type { Locale } from '../../shared/locale';
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
import type { SectionOccasionFormatsModel } from '../sections/SectionOccasionFormats';
import { SectionOccasionFormats } from '../sections/SectionOccasionFormats';
import { SectionPageTestimonials } from '../sections/SectionPageTestimonials';
import type { SectionPageTestimonial } from '../sections/SectionPageTestimonials';
import { ContentSectionsRenderer } from './ContentSectionsRenderer';
import { Footer } from './Footer';
import { Header } from './Header';
import type { PublicHeaderUser } from './Header';

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
    /** Hide HowItWorks WhatsApp CTA (partner pages). */
    howItWorksHideCta?: boolean;
    /** Partner HowItWorks alternative assets. */
    howItWorksAlternativeMedia?: boolean;
    /** City list below dynamic sections. Hidden when empty / omitted. */
    cities?: ReadonlyArray<SectionCitiesCity>;
    /** Press logos after the cities list (city detail + landing + partners). */
    knownFrom?: boolean;
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
    const heroVariant = page.heroVariant ?? 'fullBleed';
    const headline = contentLocaleText(page.headlineDe, page.headlineEn, locale).trim();
    const subheadline = contentLocaleText(page.subHeadlineDe, page.subHeadlineEn, locale).trim();
    const heroSrc = page.heroImageUrl ?? page.heroImageFallbackUrl ?? null;
    const fullBleedMedia =
        heroVariant === 'fullBleed' && heroSrc ? { src: heroSrc, type: 'image' as const, alt: headline || heroSrc } : null;
    const noMediaLabel = { de: 'Kein Hero-Bild', en: 'No hero image' }[locale];

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
                            imageAlt={headline || undefined}
                            noMediaLabel={noMediaLabel}
                        />
                    ) : (
                        <SectionHero
                            headline={headline || undefined}
                            subheadline={subheadline || undefined}
                            media={fullBleedMedia}
                            noMediaLabel={noMediaLabel}
                            imageOverlay={page.heroImageOverlay}
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
                        <SectionFeaturedCooks cooks={page.featuredCooks} locale={locale} />
                    </div>
                ) : null}
                {page.testimonials ? (
                    <div data-content-preview-anchor="testimonials">
                        <SectionPageTestimonials testimonials={page.testimonials} locale={locale} />
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
                        <SectionCities cities={page.cities} />
                    </div>
                ) : null}
                {page.knownFrom ? (
                    <div data-content-preview-anchor="known-from">
                        <SectionKnownFrom />
                    </div>
                ) : null}
            </main>
            <Footer locale={locale} onLocaleChange={onLocaleChange} />
        </div>
    );
}
