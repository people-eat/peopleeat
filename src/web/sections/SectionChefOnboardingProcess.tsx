import { useLocale } from '../hooks/useLocale';

export function SectionChefOnboardingProcess() {
    const locale = useLocale();

    const timeline = [
        {
            name: { de: 'Registrierung', en: 'Registration' }[locale],
            description: {
                de: 'Gib deine Daten im Registrierungsformular ein und fange direkt an, dein Profil zu vervollständigen.',
                en: 'Enter your details in the registration form and start completing your profile right away.',
            }[locale],
            date: { de: 'Schritt 1', en: 'Step 1' }[locale],
        },
        {
            name: { de: 'Wir melden uns bei dir', en: "We'll get back to you" }[locale],
            description: {
                de: 'Wir nehmen Kontakt mit dir auf, um alle Details zu besprechen, damit du starten kannst.',
                en: 'We will contact you to discuss all the details so you can get started.',
            }[locale],
            date: { de: 'Schritt 2', en: 'Step 2' }[locale],
        },
        {
            name: { de: 'Freischaltung', en: 'Activation' }[locale],
            description: {
                de: 'Sobald du dein Profil und ein erstes Menü fertiggestellt hast, wird dein Profil freigeschaltet.',
                en: 'Once you have completed your profile and an initial menu, your profile will be activated.',
            }[locale],
            date: { de: 'Schritt 3', en: 'Step 3' }[locale],
        },
        {
            name: { de: 'Startklar', en: 'Ready' }[locale],
            description: {
                de: 'Erhalte Buchungsanfragen; gleichzeitig unterstützen wir dich jederzeit bei jeglichen Anliegen und Kundenanfragen.',
                en: 'Receive booking requests, and we will support you at any time with any concerns and customer inquiries.',
            }[locale],
            date: { de: 'Startklar', en: 'Ready' }[locale],
        },
    ];

    return (
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 @lg:px-6">
            <div className="mx-auto max-w-2xl @lg:mx-0">
                <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">
                    {{ de: 'Beginne in nur wenigen Schritten', en: 'Get started in just a few steps' }[locale]}
                </h2>
                <p className="mt-6 text-lg/8 text-muted-foreground">
                    {
                        {
                            de: 'Egal ob Mietkoch, Privatkoch oder angestellter Koch: wir unterstützen dich im Onboarding, damit du erfolgreich starten kannst.',
                            en: "Whether you're a freelance chef, private chef, or employed chef: we support you in your onboarding so you can start successfully.",
                        }[locale]
                    }
                </p>
            </div>
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 overflow-hidden @lg:mx-0 @lg:max-w-none @lg:grid-cols-4">
                {timeline.map((item) => (
                    <div key={item.name}>
                        <time className="relative flex items-center text-sm/6 font-semibold text-foreground">
                            <svg aria-hidden="true" className="mr-4 size-1 flex-none" viewBox="0 0 4 4">
                                <circle cx={2} cy={2} fill="currentColor" r={2} />
                            </svg>
                            {item.date}
                            <div
                                aria-hidden="true"
                                className="absolute -ml-2 h-px w-screen -translate-x-full bg-foreground/10 @sm:-ml-4 @lg:static @lg:-mr-6 @lg:ml-8 @lg:w-auto @lg:flex-auto @lg:translate-x-0"
                            />
                        </time>
                        <p className="mt-6 text-lg/8 font-medium tracking-tight text-foreground">{item.name}</p>
                        <p className="mt-1 text-base/7 text-muted-foreground">{item.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
