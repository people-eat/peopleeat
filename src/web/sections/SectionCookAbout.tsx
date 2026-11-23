import { AppImage } from '../components/AppImage';
import { CookAboutBenefitsFallback } from '../components/CookAboutBenefitsFallback';
import { useT } from '../hooks/useT';

/** Biography + cook additional picture (or marketing benefits fallback). Hidden when the cook has no biography. */
export function SectionCookAbout({ biography, logoUrl, displayName }: { biography: string; logoUrl?: string | null; displayName: string }) {
    const { t } = useT('public');

    if (biography.trim().length === 0) {
        return null;
    }

    const hasLogo = logoUrl != null && logoUrl.length > 0;

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <div className="grid gap-10 @3xl:grid-cols-2 @3xl:items-center @3xl:gap-12">
                <div className="min-w-0">
                    <h2 className="font-serif text-3xl font-light @3xl:text-4xl">{t('chef.about')}</h2>
                    <p className="mt-8 whitespace-pre-wrap text-base/relaxed text-muted-foreground">{biography}</p>
                </div>
                {hasLogo ? (
                    <div className="mx-auto w-full max-w-md @3xl:mx-0 @3xl:max-w-none">
                        <AppImage
                            src={logoUrl}
                            alt={t('chef.aboutImageAlt', { name: displayName })}
                            className="aspect-video h-auto w-full object-contain"
                        />
                    </div>
                ) : (
                    <div className="mx-auto w-full max-w-md @3xl:mx-0 @3xl:max-w-none">
                        <CookAboutBenefitsFallback />
                    </div>
                )}
            </div>
        </section>
    );
}
