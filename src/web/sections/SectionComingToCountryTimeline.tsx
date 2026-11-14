import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { useLocale } from '../hooks/useLocale';

export function SectionComingToCountryTimeline({ market }: { market: ExpansionMarket }) {
    const locale = useLocale();

    const steps = [
        {
            date: { de: 'Jetzt', en: 'Now' }[locale],
            name: { de: 'Als Koch anmelden', en: 'Join as a chef' }[locale],
            description: {
                de: `Registriere dich ${market.inCountryDe} und lege Profil und erstes Menü an.`,
                en: `Register ${market.inCountryEn} and set up your profile and first menu.`,
            }[locale],
        },
        {
            date: { de: 'Onboarding', en: 'Onboarding' }[locale],
            name: { de: 'Wir begleiten dich', en: 'We support you' }[locale],
            description: {
                de: 'Wir melden uns, damit dein Profil zum Marktstart bereit ist.',
                en: 'We get in touch so your profile is ready when the market opens.',
            }[locale],
        },
        {
            date: { de: 'Anfang 2027', en: 'Early 2027' }[locale],
            name: { de: 'Gäste können buchen', en: 'Hosts can book' }[locale],
            description: {
                de: `Dann starten Buchungsanfragen ${market.inCountryDe}. Du bist bereits startklar.`,
                en: `Booking requests ${market.inCountryEn} start then. You are already ready.`,
            }[locale],
        },
    ];

    return (
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 @lg:px-6">
            <div className="mx-auto max-w-2xl @lg:mx-0">
                <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">
                    {{ de: 'So läuft der Start', en: 'How the launch works' }[locale]}
                </h2>
                <p className="mt-6 text-lg/8 text-muted-foreground">
                    {
                        {
                            de: 'Zuerst Köche, dann Gastgeber. So bleibt die Erwartung klar: Jetzt Netzwerk aufbauen, Anfang 2027 buchen.',
                            en: 'Chefs first, then hosts. The expectation stays clear: build the network now, book from early 2027.',
                        }[locale]
                    }
                </p>
            </div>
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 overflow-hidden @lg:mx-0 @lg:max-w-none @lg:grid-cols-3">
                {steps.map((item) => (
                    <div key={item.name}>
                        <p className="relative flex items-center text-sm/6 font-semibold text-foreground">
                            <svg aria-hidden="true" className="mr-4 size-1 flex-none" viewBox="0 0 4 4">
                                <circle cx={2} cy={2} fill="currentColor" r={2} />
                            </svg>
                            {item.date}
                            <span
                                aria-hidden="true"
                                className="absolute -ml-2 h-px w-screen -translate-x-full bg-foreground/10 @sm:-ml-4 @lg:static @lg:-mr-6 @lg:ml-8 @lg:w-auto @lg:flex-auto @lg:translate-x-0"
                            />
                        </p>
                        <p className="mt-6 text-lg/8 font-medium tracking-tight text-foreground">{item.name}</p>
                        <p className="mt-1 text-base/7 text-muted-foreground">{item.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
