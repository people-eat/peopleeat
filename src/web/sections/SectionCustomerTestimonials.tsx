import { Link } from '@tanstack/react-router';

import { AppImage } from '../components/AppImage';
import { Button } from '../components/base/button';
import { useLocale } from '../hooks/useLocale';

type Testimonial = {
    id: string;
    name: string;
    location: string;
    people?: number;
    text: string;
    imageUrl?: string;
};

function TestimonialCard({ testimonial, peopleLabel }: { testimonial: Testimonial; peopleLabel: string }) {
    const locale = useLocale();

    return (
        <div className="flex w-full flex-col gap-4 rounded-xl bg-secondary p-6 shadow-xs transition hover:shadow-md">
            <p className="text-muted-foreground">{testimonial.text}</p>

            {testimonial.imageUrl ? (
                <AppImage
                    alt={
                        {
                            de: `Foto zum Testimonial von ${testimonial.name}`,
                            en: `Photo for testimonial by ${testimonial.name}`,
                        }[locale]
                    }
                    className="w-full rounded-lg object-cover"
                    height={200}
                    src={testimonial.imageUrl}
                    width={400}
                />
            ) : null}

            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-serif text-2xl font-normal">{testimonial.name}</h3>
                    <p className="text-sm text-muted-foreground">
                        {testimonial.location}
                        {testimonial.people ? `, ${testimonial.people} ${peopleLabel}` : null}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function SectionCustomerTestimonials() {
    const locale = useLocale();

    const testimonials: Testimonial[] = [
        {
            id: '1',
            name: 'Thomas K.',
            location: 'Frankfurt am Main',
            people: 5,
            text: {
                de: 'Ein unvergesslicher Abend dank einer perfekt organisierten Köchin! Das Engagement und die kleinen Extras haben unsere Gäste begeistert. Anfangs skeptisch, aber letztlich eine die beste Entscheidung.',
                en: 'An unforgettable evening thanks to a perfectly organized chef! The dedication and little extras delighted our guests. Skeptical at first, but ultimately one of the best decisions.',
            }[locale],
            imageUrl: '/home/testimonials-section/dinner-table-with-menu-card.webp',
        },
        {
            id: '2',
            name: 'Lydia G.',
            location: 'Bayern',
            people: 6,
            text: {
                de: 'Perfekter Ablauf von Anfang bis Ende! Unsere Wünsche wurden schon beim ersten Anruf erfragt, und die vielfältigen Menüvorschläge waren sehr hilfreich. Die Köchin hat bei unserer Feier voll abgeliefert.',
                en: 'A perfect process from start to finish! Our wishes were already asked about on the first call, and the varied menu suggestions were very helpful. The chef delivered fully at our celebration.',
            }[locale],
        },
        {
            id: '3',
            name: 'Anna P.',
            location: 'München',
            people: 8,
            text: {
                de: 'Super schönes, privates Event bei uns zu Hause. Das Essen war hervorragend! Gerne wieder.',
                en: 'A wonderful private event at our home. The food was outstanding! Happy to do it again.',
            }[locale],
            imageUrl: '/home/testimonials-section/rounded-dessert.webp',
        },
    ];

    const duplicatedTestimonials = [...testimonials, ...testimonials, ...testimonials];
    const peopleLabel = { de: 'Personen', en: 'people' }[locale];

    return (
        <section className="mx-auto flex h-[1200px] w-full max-w-7xl flex-col @lg:h-[700px] @lg:flex-row">
            <div className="flex flex-col justify-center p-8 @lg:flex-1 @lg:p-16">
                <h2 className="mb-6 font-serif text-3xl font-light @md:text-4xl">
                    {{ de: 'Was sagen unsere Kunden', en: 'What do our customers say?' }[locale]}
                </h2>
                <p className="mb-8 text-lg text-muted-foreground">
                    {
                        {
                            de: 'Du musst nicht warten und kannst direkt aus einem unserer Top-Menüs auswählen, die speziell für jede Saison zusammengestellt wurden.',
                            en: "You don't have to wait and can choose directly from one of our top menus, which have been specially put together for each season.",
                        }[locale]
                    }
                </p>
                <div className="flex gap-4">
                    <Button asChild>
                        <Link to="/{-$locale}/booking-request/form">{{ de: 'Anfrage senden', en: 'Send request' }[locale]}</Link>
                    </Button>
                </div>
            </div>

            <div className="relative flex flex-1 overflow-hidden bg-muted">
                <div className="flex w-full gap-4 px-4">
                    <div className="relative flex-1 overflow-hidden">
                        <div className="absolute inset-x-0 flex animate-testimonial-scroll flex-col gap-6 py-8 motion-reduce:animate-none">
                            {duplicatedTestimonials.map((testimonial, index) => (
                                <TestimonialCard key={`${testimonial.id}-a-${index}`} peopleLabel={peopleLabel} testimonial={testimonial} />
                            ))}
                        </div>
                    </div>

                    <div className="relative hidden flex-1 overflow-hidden @lg:block">
                        <div className="absolute inset-x-0 flex animate-testimonial-scroll-delayed flex-col gap-6 py-8 motion-reduce:animate-none">
                            {duplicatedTestimonials.map((testimonial, index) => (
                                <TestimonialCard key={`${testimonial.id}-b-${index}`} peopleLabel={peopleLabel} testimonial={testimonial} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-muted to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-muted to-transparent" />
            </div>
        </section>
    );
}
