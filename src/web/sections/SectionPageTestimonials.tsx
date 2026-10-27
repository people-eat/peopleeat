import { StarIcon, UserIcon } from 'lucide-react';

import type { Locale } from '../../shared';
import { cn } from '../utils/cn';

// `body` is non-null on `CustomerTestimonial` but nullable on `CookTestimonial`
// — codegen aliases the latter to `cookBody` when merging the `Testimonial`
// union so the two variants don't collide on an incompatible field type.
export type SectionPageTestimonial = {
    index: number;
    testimonial:
        | {
              __typename: 'CustomerTestimonial';
              customerTestimonialId: string;
              authorName: string;
              location: string | null;
              occasion: string | null;
              body: string;
              rating: number | null;
          }
        | {
              __typename: 'CookTestimonial';
              cookTestimonialId: string;
              authorName: string;
              location: string | null;
              occasion: string | null;
              cookBody: string | null;
              rating: number | null;
          };
};

function testimonialKey(entry: SectionPageTestimonial): string {
    return entry.testimonial.__typename === 'CustomerTestimonial'
        ? entry.testimonial.customerTestimonialId
        : entry.testimonial.cookTestimonialId;
}

function testimonialBody(entry: SectionPageTestimonial): string | null {
    return entry.testimonial.__typename === 'CustomerTestimonial' ? entry.testimonial.body : entry.testimonial.cookBody;
}

/** Curated city/partner testimonials — hidden entirely when empty. See docs/architecture/testimonials.md. */
export function SectionPageTestimonials({
    testimonials,
    locale,
    title,
    inset = true,
    className,
}: {
    testimonials: ReadonlyArray<SectionPageTestimonial>;
    locale: Locale;
    title?: string;
    /** Horizontal padding + max-width shell. Off when nested in a padded content column. */
    inset?: boolean;
    className?: string;
}) {
    if (testimonials.length === 0) return null;

    const heading = title ?? { de: 'Das sagen unsere Kunden', en: 'What our customers say' }[locale];

    return (
        <section className={cn(inset ? 'mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6' : 'w-full', className)}>
            <h2 className="font-serif text-3xl font-light @md:text-4xl">{heading}</h2>
            <ul className="mt-10 grid gap-10 @sm:grid-cols-2 @lg:grid-cols-3">
                {testimonials.map((entry) => {
                    const testimonial = entry.testimonial;
                    const body = testimonialBody(entry);
                    if (!body || body.trim().length === 0) return null;
                    return (
                        <li key={testimonialKey(entry)}>
                            <figure className="flex h-full flex-col gap-6">
                                {testimonial.rating != null ? (
                                    <div className="flex items-center gap-1" aria-hidden>
                                        {Array.from({ length: 5 }, (_, index) => (
                                            <StarIcon
                                                key={index}
                                                className={cn(
                                                    'size-4',
                                                    index < testimonial.rating! ? 'fill-accent text-accent' : 'text-muted-foreground/30',
                                                )}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                                <blockquote className="flex-1 text-base/relaxed text-foreground">
                                    <p>{body}</p>
                                </blockquote>
                                <figcaption className="flex items-center gap-3">
                                    <span className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                                        <UserIcon aria-hidden className="size-5" />
                                    </span>
                                    <div className="text-sm">
                                        <div className="font-medium text-foreground">{testimonial.authorName}</div>
                                        {testimonial.location || testimonial.occasion ? (
                                            <div className="text-muted-foreground">
                                                {[testimonial.location, testimonial.occasion].filter(Boolean).join(' · ')}
                                            </div>
                                        ) : null}
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
