import { AppImage } from '../components/AppImage';
import { useLocale } from '../hooks/useLocale';

export function SectionHowWeStarted() {
    const locale = useLocale();

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <div className="mx-auto grid max-w-2xl grid-cols-1 items-start gap-x-8 gap-y-16 @sm:gap-y-24 @lg:mx-0 @lg:max-w-none @lg:grid-cols-2">
                <div className="@lg:pr-4">
                    <AppImage
                        priority
                        alt={
                            {
                                de: 'Die Gründer Natalia und Daniel von peopleeat',
                                en: 'peopleeat founders Natalia and Daniel',
                            }[locale]
                        }
                        className="w-full rounded-3xl object-cover"
                        height={800}
                        src="/about-us/how-we-started-section/founders.webp"
                        width={1000}
                    />
                </div>
                <div>
                    <div className="text-base/7 text-muted-foreground @lg:max-w-lg">
                        <p className="text-sm font-semibold text-muted-foreground">
                            {{ de: 'Wie wir gestartet haben', en: 'How we got started' }[locale]}
                        </p>
                        <h1 className="mt-2 font-serif text-3xl font-light tracking-tight text-foreground @sm:text-4xl">
                            {
                                {
                                    de: 'Wir revolutionieren die Art, Gastgeber zu sein',
                                    en: 'We are revolutionizing the way people host',
                                }[locale]
                            }
                        </h1>
                        <div className="max-w-xl">
                            <p className="mt-6">
                                {
                                    {
                                        de: (
                                            <>
                                                Willkommen! Wir sind Natalia und Daniel, die Gründer von peopleeat!
                                                <br />
                                                <br />
                                                Alles begann, als Natalia vor ihrem Auszug aus ihrer Wohnung in Mannheim stand und sich
                                                Daniel dazu entschloss, dieses besondere Ereignis mit einem Abendessen, zubereitet von einem
                                                Koch, zu feiern. Als Daniel sich auf die Suche nach einem Koch machte, wurde schnell klar,
                                                dass es gar nicht so einfach ist, einen Koch in der Umgebung zu finden. So wurde die Suche
                                                zu einer überraschenden Herausforderung. Nach stundenlanger Suche fand sich schließlich ein
                                                verfügbarer Koch in München, der bereit war, die 3,5 Stunden Fahrt nach Mannheim auf sich zu
                                                nehmen. Als der Koch ankam, wurden alle Erwartungen übertroffen. Natalia und Daniel konnten
                                                die Kulinarik neu für sich entdecken, genießen und einzigartige Einblicke in die Arbeit
                                                eines Kochs erhalten. An diesem Abend wurde nicht nur der Grundstein für peopleeat gelegt,
                                                sondern auch die klare Vision, Menschen den Zugang zu erstklassigen Köchen zu ermöglichen
                                                und unvergessliche Momente mit ihren Lieben zu schaffen.
                                            </>
                                        ),
                                        en: (
                                            <>
                                                Welcome! We are Natalia and Daniel, the founders of peopleeat!
                                                <br />
                                                <br />
                                                It all started when Natalia was about to move out of her apartment in Mannheim and Daniel
                                                decided to celebrate this special moment with a dinner prepared by a chef. When Daniel set
                                                out to find a chef, it quickly became clear that finding one nearby was far from easy. The
                                                search turned into a surprising challenge. After hours of looking, they finally found an
                                                available chef in Munich who was willing to make the 3.5-hour trip to Mannheim. When the
                                                chef arrived, every expectation was exceeded. Natalia and Daniel rediscovered culinary
                                                experiences, enjoyed the evening, and gained unique insights into a chef&apos;s work. That
                                                evening not only laid the foundation for peopleeat, but also a clear vision: to give people
                                                access to first-class chefs and create unforgettable moments with their loved ones.
                                            </>
                                        ),
                                    }[locale]
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
