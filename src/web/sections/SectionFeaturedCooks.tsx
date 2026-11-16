import { t } from '../../i18n/t';
import type { Locale } from '../../shared';
import { StatusAlert } from '../components/base/status-alert';
import { StatusBadge } from '../components/base/status-badge';
import type { PublicCookCardCook } from '../components/PublicCookCard';
import { PublicCookCard } from '../components/PublicCookCard';

export type SectionFeaturedCook = PublicCookCardCook & {
    /**
     * Admin live preview only. Public featured lists omit unlisted cooks; when
     * `false`, the card still renders with a visibility warning.
     */
    isPubliclyListed?: boolean;
};

export function SectionFeaturedCooks({
    cooks,
    locale,
    showCity = true,
}: {
    cooks: ReadonlyArray<SectionFeaturedCook>;
    locale: Locale;
    /** Show travel-origin city under the cook name. Partners may turn off. */
    showCity?: boolean;
}) {
    if (cooks.length === 0) return null;

    const hiddenCount = cooks.filter((cook) => cook.isPubliclyListed === false).length;
    const hiddenTitle = t(locale, 'public', 'chefs.hiddenCount', { count: hiddenCount });

    return (
        <section className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
            <h2 className="font-serif text-3xl font-light @md:text-4xl">{t(locale, 'public', 'chefs.featuredHeading')}</h2>
            {hiddenCount > 0 ? (
                <StatusAlert tone="warning" title={hiddenTitle} className="mt-6">
                    {t(locale, 'public', 'chefs.hiddenBody')}
                </StatusAlert>
            ) : null}
            <ul className="mt-10 grid grid-cols-1 gap-4 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
                {cooks.map((cook) => (
                    <li key={cook.cookId}>
                        <PublicCookCard
                            cook={cook}
                            showCity={showCity}
                            badge={
                                cook.isPubliclyListed === false ? (
                                    <StatusBadge tone="warning">{t(locale, 'public', 'preview.notPublic')}</StatusBadge>
                                ) : undefined
                            }
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}
