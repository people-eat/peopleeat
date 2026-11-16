import { TestimonialCard } from '../components/TestimonialCard';
import { useT } from '../hooks/useT';

export type SectionCookTestimonial = {
    customerTestimonialId: string;
    authorName: string;
    authorProfilePictureUrl?: string | null;
    location: string | null;
    occasion: string | null;
    body: string;
    rating: number | null;
    imageUrls: ReadonlyArray<string>;
    createdAt?: string | null;
};

/**
 * Customer testimonials for a public cook profile.
 * Hidden when omitted (`undefined`, cook preview) or when the list is empty.
 */
export function SectionCookTestimonials({ testimonials }: { testimonials?: ReadonlyArray<SectionCookTestimonial> }) {
    const { t } = useT('public');

    if (testimonials == null || testimonials.length === 0) {
        return null;
    }

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <h2 className="font-serif text-3xl font-light @3xl:text-4xl">{t('home.testimonials.headingAlt')}</h2>
            <ul className="mt-10 grid grid-cols-1 gap-10 @2xl:grid-cols-2 @5xl:grid-cols-3">
                {testimonials.map((testimonial) => (
                    <li key={testimonial.customerTestimonialId}>
                        <TestimonialCard
                            testimonial={{
                                authorName: testimonial.authorName,
                                authorProfilePictureUrl: testimonial.authorProfilePictureUrl,
                                location: testimonial.location,
                                occasion: testimonial.occasion,
                                body: testimonial.body,
                                rating: testimonial.rating,
                                imageUrls: testimonial.imageUrls,
                                createdAt: testimonial.createdAt,
                            }}
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}
