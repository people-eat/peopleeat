import type { ReactNode } from 'react';

import { cookBiographyNormalize } from '../../shared/cookBiographyContact';
import { SectionCookAbout } from '../sections/SectionCookAbout';
import { SectionCookHero } from '../sections/SectionCookHero';
import type { SectionCookHeroBookCta, SectionCookHeroCook } from '../sections/SectionCookHero';
import { SectionCookMeals } from '../sections/SectionCookMeals';
import type { SectionCookMeal } from '../sections/SectionCookMeals';
import { SectionCookMenus } from '../sections/SectionCookMenus';
import type { SectionCookMenu } from '../sections/SectionCookMenus';
import { SectionCookTestimonials } from '../sections/SectionCookTestimonials';
import type { SectionCookTestimonial } from '../sections/SectionCookTestimonials';
import { SectionQuestionsAndAnswers } from '../sections/SectionQuestionsAndAnswers';

export type ChefProfileViewModel = SectionCookHeroCook & {
    biography: string;
    logoUrl?: string | null;
    meals: SectionCookMeal[];
    menus?: SectionCookMenu[];
    // Omit entirely to hide the testimonials section (e.g. cook self-preview
    // does not load published customer reviews yet).
    testimonials?: SectionCookTestimonial[];
};

export function ChefProfileView({
    cook,
    showChefsIndexLink = true,
    onBookCtaClick,
    onBookMenuCtaClick,
    shareButton,
    bookCta,
}: {
    cook: ChefProfileViewModel;
    showChefsIndexLink?: boolean;
    onBookCtaClick?: () => void;
    onBookMenuCtaClick?: (menuId: string) => void;
    shareButton?: ReactNode;
    bookCta?: SectionCookHeroBookCta;
}) {
    const hasTestimonials = cook.testimonials != null && cook.testimonials.length > 0;
    const biography = cookBiographyNormalize(cook.biography);
    const biographySummary = cookBiographyNormalize(cook.biographySummary);

    return (
        // Own `@container` so sections reflow with this pane (full page or cook
        // public preview), not a wider ancestor.
        <div className="@container flex w-full min-w-0 flex-col gap-16 pt-2 pb-16 @3xl:gap-24 @3xl:pt-10 @3xl:pb-24">
            <SectionCookHero
                cook={{ ...cook, biographySummary }}
                showChefsIndexLink={showChefsIndexLink}
                onBookCtaClick={onBookCtaClick}
                shareButton={shareButton}
                bookCta={bookCta}
                scrollToTestimonials={hasTestimonials}
            />
            <SectionCookMenus menus={cook.menus ?? []} bookCookId={bookCta?.cookId} onBookMenuCtaClick={onBookMenuCtaClick} />
            <SectionCookMeals meals={cook.meals} />
            <SectionCookAbout biography={biography} logoUrl={cook.logoUrl} />
            <SectionCookTestimonials testimonials={cook.testimonials} />
            <SectionQuestionsAndAnswers />
        </div>
    );
}
