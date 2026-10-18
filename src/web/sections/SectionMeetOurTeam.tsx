import { useLocale } from '../hooks/useLocale';

export function SectionMeetOurTeam() {
    const locale = useLocale();

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="font-serif text-4xl font-light tracking-tight text-foreground @sm:text-6xl">
                    {{ de: 'Lerne unser Team kennen', en: 'Meet our team' }[locale]}
                </h2>
                <p className="mt-6 text-lg/8 text-muted-foreground">
                    {
                        {
                            de: 'Unser Team zeichnet sich durch vielfältige Persönlichkeiten und umfangreiche Erfahrungen aus. Uns verbindet das gemeinsame Ziel, die Art und Weise zu revolutionieren, wie Menschen Essen genießen und Ereignisse teilen. Tag für Tag arbeiten wir entschlossen daran, dieses Anliegen Realität werden zu lassen.',
                            en: 'Our team is characterized by diverse personalities and extensive experience. What unites us is a shared goal: to revolutionize the way people enjoy food and share occasions. Day after day, we work determinedly to make that vision a reality.',
                        }[locale]
                    }
                </p>
            </div>
            <div className="mt-16 flow-root @sm:mt-24">
                <div className="-m-2 rounded-xl bg-foreground/5 p-2 ring-1 ring-foreground/10 ring-inset @lg:-m-4 @lg:rounded-2xl @lg:p-4">
                    <img
                        alt={{ de: 'Das peopleeat Team', en: 'The peopleeat team' }[locale]}
                        className="rounded-md shadow-2xl ring-1 ring-foreground/10"
                        height={1442}
                        src="/about-us/meet-our-team-section/team.jpg"
                        width={2432}
                    />
                </div>
            </div>
            <div className="mx-auto max-w-6xl text-center">
                <p className="mt-20 text-lg/8 text-muted-foreground">
                    {
                        {
                            de: (
                                <>
                                    Daniel und Natalia, Co-Founder von peopleeat, bringen Erfahrungen im Bereich Sales und Financial
                                    Controlling ein (SAP SE, Raiffeisenbank).
                                    <br />
                                    <a className="font-semibold text-foreground underline underline-offset-4" href="https://cem-yilmaz.de">
                                        Cem Yilmaz
                                    </a>{' '}
                                    ist unser CTO und Senior Full-Stack Engineer mit Schwerpunkt auf skalierbaren Web-Architekturen und der
                                    Integration von AI-Services in bestehende Produkte. Neben seiner Tätigkeit bei SAP SE gründete er unter
                                    anderem{' '}
                                    <a className="underline underline-offset-4 hover:text-foreground" href="https://draw-schema.com">
                                        Draw Schema, ein Tool zur visuellen Modellierung relationaler Datenbanken
                                    </a>
                                    .
                                    <br />
                                    Dirk (links) und Chris (rechts) sind unsere Branchenexperten: Dirk bringt jahrelange Erfahrung als
                                    Küchenchef in der gehobenen Gastronomie und als Privatkoch mit. Chris bringt als Küchenmeister
                                    umfangreiche gastronomische Expertise mit. Des Weiteren ist er seit mehreren Jahren als Miet- und
                                    Privatkoch (Food-Fighter) tätig.
                                </>
                            ),
                            en: (
                                <>
                                    Daniel and Natalia, co-founders of peopleeat, bring experience in sales and financial controlling (SAP
                                    SE, Raiffeisenbank).
                                    <br />
                                    <a className="font-semibold text-foreground underline underline-offset-4" href="https://cem-yilmaz.de">
                                        Cem Yilmaz
                                    </a>{' '}
                                    is our CTO and Senior Full-Stack Engineer, focused on scalable web architectures and integrating AI
                                    services into existing products. Alongside his work at SAP SE, he founded, among other things,{' '}
                                    <a className="underline underline-offset-4 hover:text-foreground" href="https://draw-schema.com">
                                        Draw Schema, a tool for visually modeling relational databases
                                    </a>
                                    .
                                    <br />
                                    Dirk (left) and Chris (right) are our industry experts: Dirk brings years of experience as a head chef
                                    in fine dining and as a private chef. Chris, a master chef, contributes extensive culinary expertise and
                                    has also worked for several years as a rental and private chef (Food-Fighter).
                                </>
                            ),
                        }[locale]
                    }
                </p>
            </div>
        </section>
    );
}
