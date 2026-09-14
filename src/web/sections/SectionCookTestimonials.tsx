import { StarIcon, UserIcon } from 'lucide-react';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';

export type SectionCookTestimonial = {
    customerTestimonialId: string;
    authorName: string;
    location: string | null;
    occasion: string | null;
    body: string;
    rating: number | null;
    imageUrls: ReadonlyArray<string>;
};

/**
 * Customer testimonials for a public cook profile.
 * Hidden when omitted (`undefined`, cook preview) or when the list is empty.
 */
export function SectionCookTestimonials({ testimonials }: { testimonials?: ReadonlyArray<SectionCookTestimonial> }) {
    const locale = useLocale();

    if (testimonials == null || testimonials.length === 0) {
        return null;
    }

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <h2 className="font-serif text-3xl font-light @3xl:text-4xl">
                {{ de: 'Das sagen unsere Kunden', en: 'What our customers say' }[locale]}
            </h2>
            <ul className="mt-10 grid grid-cols-1 gap-10 @2xl:grid-cols-2 @5xl:grid-cols-3">
                {testimonials.map((testimonial) => {
                    const role = [testimonial.occasion, testimonial.location].filter(Boolean).join(' · ');
                    return (
                        <li key={testimonial.customerTestimonialId}>
                            <figure className="flex h-full flex-col gap-6">
                                {testimonial.rating != null ? (
                                    <div className="flex items-center gap-1" aria-hidden>
                                        {Array.from({ length: 5 }, (_, index) => (
                                            <StarIcon
                                                key={index}
                                                className={cn(
                                                    'size-4',
                                                    index < testimonial.rating! ? 'fill-accent text-accent' : 'text-muted-foreground/40',
                                                )}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                                <blockquote className="flex-1 text-base/relaxed text-foreground">
                                    <p>{testimonial.body}</p>
                                </blockquote>
                                <figcaption className="flex items-center gap-3">
                                    <span className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                                        <UserIcon aria-hidden className="size-5" />
                                    </span>
                                    <div className="text-sm">
                                        <div className="font-medium text-foreground">{testimonial.authorName}</div>
                                        {role ? <div className="text-muted-foreground">{role}</div> : null}
                                    </div>
                                </figcaption>
                            </figure>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
