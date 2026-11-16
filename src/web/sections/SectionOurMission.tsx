import { useT } from '../hooks/useT';

export function SectionOurMission() {
    const { t } = useT('public');

    return (
        <section className="mx-auto w-full max-w-7xl @sm:px-6 @lg:px-8">
            <div className="relative isolate overflow-hidden bg-foreground px-6 py-24 text-center shadow-2xl @sm:rounded-3xl @sm:px-16">
                <h2 className="mx-auto max-w-2xl font-serif text-3xl font-light tracking-tight text-background @sm:text-4xl">
                    {t('about.missionTitle')}
                </h2>
                <p className="mx-auto mt-6 max-w-4xl text-lg/8 text-background/80">{t('about.missionBody')}</p>
                <svg
                    aria-hidden="true"
                    className="absolute top-1/2 left-1/2 -z-10 h-256 w-7xl -translate-x-1/2 mask-[radial-gradient(closest-side,white,transparent)]"
                    viewBox="0 0 1024 1024"
                >
                    <circle cx={512} cy={512} fill="url(#about-us-mission-glow)" fillOpacity="0.7" r={512} />
                    <defs>
                        <radialGradient id="about-us-mission-glow">
                            <stop stopColor="var(--color-secondary)" />
                            <stop offset={1} stopColor="var(--color-accent)" />
                        </radialGradient>
                    </defs>
                </svg>
            </div>
        </section>
    );
}
