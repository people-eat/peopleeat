import { useLocale } from '../hooks/useLocale';

export function SectionOurMission() {
    const locale = useLocale();

    return (
        <section className="mx-auto w-full max-w-7xl @sm:px-6 @lg:px-8">
            <div className="relative isolate overflow-hidden bg-foreground px-6 py-24 text-center shadow-2xl @sm:rounded-3xl @sm:px-16">
                <h2 className="mx-auto max-w-2xl font-serif text-3xl font-light tracking-tight text-background @sm:text-4xl">
                    {{ de: 'Unsere Mission', en: 'Our mission' }[locale]}
                </h2>
                <p className="mx-auto mt-6 max-w-4xl text-lg/8 text-background/80">
                    {
                        {
                            de: 'Unsere Mission bei peopleeat ist es, die Art des Gastgebens auf ein neues Level zu heben, indem wir Menschen den Zugang zu erstklassigen Köchen ermöglichen und unvergessliche kulinarische Erlebnisse schaffen. Wir haben uns zum Ziel gesetzt, die Freude am Essen und die Bedeutung von besonderen Anlässen im Leben zu feiern, indem wir einzigartige kulinarische Momente kreieren, die Menschen näher zusammenbringen und lebenslange Erinnerungen schaffen. Gleichzeitig möchten wir Köchen die Möglichkeit geben, ihre Leidenschaft und Kreativität zu leben. Mit unserer Plattform wollen wir Innovation, Köche und Gastfreundschaft vereinen und die Art und Weise, wie Menschen Essen genießen und Ereignisse teilen, neu definieren.',
                            en: 'Our mission at peopleeat is to take hosting to a new level by giving people access to first-class chefs and creating unforgettable culinary experiences. We set out to celebrate the joy of food and the importance of special occasions by creating unique culinary moments that bring people closer together and create lifelong memories. At the same time, we want to give chefs the opportunity to live their passion and creativity. With our platform, we aim to unite innovation, chefs, and hospitality, and redefine the way people enjoy food and share moments.',
                        }[locale]
                    }
                </p>
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
