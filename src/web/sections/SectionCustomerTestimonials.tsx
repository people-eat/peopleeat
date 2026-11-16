import { Link } from '@tanstack/react-router';

import { AppImage } from '../components/AppImage';
import { Button } from '../components/base/button';
import { TestimonialCard } from '../components/TestimonialCard';
import { useT } from '../hooks/useT';

type Testimonial = {
    id: string;
    name: string;
    location: string;
    people?: number;
    text: string;
    imageUrl?: string;
};

function MarqueeQuoteCard({ testimonial, peopleLabel }: { testimonial: Testimonial; peopleLabel: string }) {
    const { t } = useT('public');

    return (
        <div className="flex w-full flex-col gap-4 rounded-xl bg-secondary p-6 shadow-xs transition hover:shadow-md">
            <p className="text-muted-foreground">{testimonial.text}</p>

            {testimonial.imageUrl ? (
                <AppImage
                    alt={t('home.testimonials.photoAlt', { name: testimonial.name })}
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

export function SectionCustomerTestimonials({ variant = 'marquee' }: { variant?: 'marquee' | 'cards' }) {
    const { t } = useT('public');

    const testimonials: Testimonial[] = [
        {
            id: '1',
            name: 'Thomas K.',
            location: 'Frankfurt am Main',
            people: 5,
            text: t('home.testimonials.t1'),
            imageUrl: '/home/testimonials-section/dinner-table-with-menu-card.webp',
        },
        {
            id: '2',
            name: 'Lydia G.',
            location: 'Bayern',
            people: 6,
            text: t('home.testimonials.t2'),
        },
        {
            id: '3',
            name: 'Anna P.',
            location: 'München',
            people: 8,
            text: t('home.testimonials.t3'),
            imageUrl: '/home/testimonials-section/rounded-dessert.webp',
        },
    ];

    const duplicatedTestimonials = [...testimonials, ...testimonials, ...testimonials];
    const peopleLabel = t('home.testimonials.people');

    if (variant === 'cards') {
        return (
            <section className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h2 className="font-serif text-3xl font-light @md:text-4xl">{t('home.testimonials.heading')}</h2>
                <ul className="mt-10 grid grid-cols-1 gap-10 @md:grid-cols-2 @lg:grid-cols-3">
                    {testimonials.map((testimonial) => {
                        const people = testimonial.people != null ? `${testimonial.people} ${peopleLabel}` : null;
                        const location = [testimonial.location, people].filter(Boolean).join(', ');
                        return (
                            <li key={testimonial.id}>
                                <TestimonialCard
                                    showBookingCta
                                    testimonial={{
                                        authorName: testimonial.name,
                                        location,
                                        occasion: null,
                                        body: testimonial.text,
                                        rating: null,
                                        imageUrls: testimonial.imageUrl ? [testimonial.imageUrl] : [],
                                    }}
                                />
                            </li>
                        );
                    })}
                </ul>
            </section>
        );
    }

    return (
        <section className="mx-auto flex h-[1200px] w-full max-w-7xl flex-col @lg:h-[700px] @lg:flex-row">
            <div className="flex flex-col justify-center p-8 @lg:flex-1 @lg:p-16">
                <h2 className="mb-6 font-serif text-3xl font-light @md:text-4xl">{t('home.testimonials.heading')}</h2>
                <p className="mb-8 text-lg text-muted-foreground">{t('home.testimonials.intro')}</p>
                <div className="flex gap-4">
                    <Button asChild>
                        <Link to="/{-$locale}/booking-request/form">{t('nav.sendRequest')}</Link>
                    </Button>
                </div>
            </div>

            <div className="relative flex flex-1 overflow-hidden bg-muted">
                <div className="flex w-full gap-4 px-4">
                    <div className="relative flex-1 overflow-hidden">
                        <div className="absolute inset-x-0 flex animate-testimonial-scroll flex-col gap-6 py-8 motion-reduce:animate-none">
                            {duplicatedTestimonials.map((testimonial, index) => (
                                <MarqueeQuoteCard
                                    key={`${testimonial.id}-a-${index}`}
                                    peopleLabel={peopleLabel}
                                    testimonial={testimonial}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="relative hidden flex-1 overflow-hidden @lg:block">
                        <div className="absolute inset-x-0 flex animate-testimonial-scroll-delayed flex-col gap-6 py-8 motion-reduce:animate-none">
                            {duplicatedTestimonials.map((testimonial, index) => (
                                <MarqueeQuoteCard
                                    key={`${testimonial.id}-b-${index}`}
                                    peopleLabel={peopleLabel}
                                    testimonial={testimonial}
                                />
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
