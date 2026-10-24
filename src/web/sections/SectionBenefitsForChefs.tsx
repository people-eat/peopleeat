import { AppImage } from '../components/AppImage';
import { useLocale } from '../hooks/useLocale';

export function SectionBenefitsForChefs() {
    const locale = useLocale();

    const benefits = {
        de: [
            {
                name: 'Bleibe flexibel',
                description: 'Entscheide selbst den Ort und Radius, in dem du deinen Service anbieten möchtest.',
            },
            {
                name: 'Freiraum für deine Kreativität',
                description: 'Verwirkliche eigene Menükreationen und behalte sie jederzeit an einem Ort.',
            },
            { name: 'Schnelle Zahlungsabwicklung', description: 'Erhalte deine Bezahlung einfach und unkompliziert.' },
            { name: '24 / 7 für dich da', description: 'Wir helfen dir rund um die Uhr bei jeglichen Fragen weiter.' },
            {
                name: 'Kunden stellen ihre Anfragen direkt bei dir',
                description: 'Kunden gelangen direkt über die Profilseite zu deinen Menüvorschlägen.',
            },
            {
                name: 'Kommuniziere unkompliziert mit deinen Kunden',
                description:
                    'Sobald du die Buchungsanfrage akzeptierst, kannst du direkt mit dem Kunden via Chat alle Einzelheiten final abstimmen.',
            },
        ],
        en: [
            {
                name: 'Stay flexible',
                description: 'Choose the location and radius where you want to offer your service.',
            },
            {
                name: 'Freedom for your creativity',
                description: 'Bring your own menu creations to life and keep them all in one place.',
            },
            {
                name: 'Fast payment processing',
                description: 'Receive your payment easily and hassle-free.',
            },
            {
                name: 'Here for you 24/7',
                description: 'We support you around the clock with any questions.',
            },
            {
                name: 'Customers send requests directly to you',
                description: 'Customers can reach your menu proposals straight from your profile page.',
            },
            {
                name: 'Communicate easily with your customers',
                description: 'Once you accept the booking request, you can finalize all details directly with the customer via chat.',
            },
        ],
    }[locale];

    return (
        <section className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-x-8 gap-y-16 px-4 @sm:px-6 @lg:max-w-7xl @lg:grid-cols-2 @lg:px-8">
            <div>
                <h2 className="font-serif text-3xl font-light tracking-tight text-foreground @sm:text-6xl">
                    {{ de: 'Was du von uns erwarten kannst', en: 'What you can expect from us' }[locale]}
                </h2>
                <p className="mt-8 text-muted-foreground">
                    {
                        {
                            de: 'Wir legen sehr viel Wert darauf, dass du dich auf das fokussierst, was dir Spaß macht. Mit peopleeat genießt du unzählige Vorteile. Hier findest du ein paar davon:',
                            en: "We place great importance on you focusing on what you enjoy. With peopleeat, you'll enjoy countless benefits. Here are just a few:",
                        }[locale]
                    }
                </p>

                <dl className="mt-16 grid grid-cols-1 gap-x-6 gap-y-10 @sm:grid-cols-2 @sm:gap-y-16 @lg:gap-x-8">
                    {benefits.map((benefit) => (
                        <div className="border-t border-border pt-4" key={benefit.name}>
                            <dt className="font-medium text-foreground">{benefit.name}</dt>
                            <dd className="mt-2 text-sm text-muted-foreground">{benefit.description}</dd>
                        </div>
                    ))}
                </dl>
            </div>
            <div>
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                    <AppImage
                        alt={
                            {
                                de: 'Schwarzer Wasserkocher mit langem Ausguss und schrägem Gehäuse auf einer Marmorplatte neben Tasse und Pour-over-System.',
                                en: 'Black kettle with long pour spout and angled body on marble counter next to coffee mug and pour-over system.',
                            }[locale]
                        }
                        aria-hidden
                        className="size-full object-cover object-center"
                        height={800}
                        src="/how-to-become-a-chef/benefits-for-chefs-section/1.webp"
                        width={800}
                    />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 @sm:mt-6 @sm:gap-6 @lg:mt-8 @lg:gap-8">
                    <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                        <AppImage
                            alt={
                                {
                                    de: 'Detail der Temperatureinstellung am Wasserkocher mit digitaler Gradanzeige.',
                                    en: 'Detail of temperature setting button on kettle base with digital degree readout.',
                                }[locale]
                            }
                            aria-hidden
                            className="size-full object-cover object-center"
                            height={600}
                            src="/how-to-become-a-chef/benefits-for-chefs-section/2.webp"
                            width={600}
                        />
                    </div>
                    <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                        <AppImage
                            alt={
                                {
                                    de: 'Wasserkocher-Ausguss gießt kochendes Wasser über Kaffeemehl in eine Pour-over-Tasse.',
                                    en: 'Kettle spout pouring boiling water into coffee grounds in pour-over mug.',
                                }[locale]
                            }
                            aria-hidden
                            className="size-full object-cover object-center"
                            height={600}
                            src="/how-to-become-a-chef/benefits-for-chefs-section/3.webp"
                            width={600}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
