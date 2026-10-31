import type { Locale } from '../../shared';
import { PageTestimonialCard } from '../components/PageTestimonialCard';
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
              authorProfilePicture?: { url: string } | null;
              location: string | null;
              occasion: string | null;
              body: string;
              rating: number | null;
              imageUrls?: ReadonlyArray<string>;
          }
        | {
              __typename: 'CookTestimonial';
              cookTestimonialId: string;
              authorName: string;
              authorProfilePicture?: { url: string } | null;
              location: string | null;
              occasion: string | null;
              cookBody: string | null;
              rating: number | null;
              imageUrls?: ReadonlyArray<string>;
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

/** Curated city/partner/occasion testimonials — hidden entirely when empty. See docs/architecture/testimonials.md. */
export function SectionPageTestimonials({
    testimonials,
    locale,
    title,
    inset = true,
    columns = 3,
    className,
}: {
    testimonials: ReadonlyArray<SectionPageTestimonial>;
    locale: Locale;
    title?: string;
    /** Horizontal padding + max-width shell. Off when nested in a padded content column. */
    inset?: boolean;
    /** Grid density from `@md` up. Mobile is always one column. Use `2` beside a sticky sidebar. Default `3`. */
    columns?: 2 | 3;
    className?: string;
}) {
    if (testimonials.length === 0) return null;

    const heading = title ?? { de: 'Das sagen unsere Kunden', en: 'What our customers say' }[locale];

    return (
        <section className={cn(inset ? 'mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6' : 'w-full', className)}>
            <h2 className="font-serif text-3xl font-light @md:text-4xl">{heading}</h2>
            <ul className={cn('mt-10 grid grid-cols-1 gap-10', columns === 2 ? '@md:grid-cols-2' : '@md:grid-cols-2 @lg:grid-cols-3')}>
                {testimonials.map((entry) => {
                    const testimonial = entry.testimonial;
                    const body = testimonialBody(entry);
                    if (!body || body.trim().length === 0) return null;
                    return (
                        <li key={testimonialKey(entry)}>
                            <PageTestimonialCard
                                testimonial={{
                                    authorName: testimonial.authorName,
                                    authorProfilePictureUrl: testimonial.authorProfilePicture?.url ?? null,
                                    location: testimonial.location,
                                    occasion: testimonial.occasion,
                                    body,
                                    rating: testimonial.rating,
                                    imageUrls: testimonial.imageUrls,
                                }}
                            />
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
