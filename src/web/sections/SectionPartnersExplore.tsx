import { Link } from '@tanstack/react-router';

import { Button } from '../components/base/button';
import { Reveal } from '../components/Reveal';
import { useLocale } from '../hooks/useLocale';

export function SectionPartnersExplore() {
    const locale = useLocale();

    return (
        <Reveal as="section" className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-16 @lg:px-6">
            <div className="flex max-w-2xl flex-col gap-3">
                <h2 className="font-serif text-3xl font-light @md:text-4xl">
                    {{ de: 'Entdecke mehr unserer Partner', en: 'Discover more of our partners' }[locale]}
                </h2>
                <p className="text-lg text-muted-foreground">
                    {
                        {
                            de: 'Marken und Kooperationen, die mit peopleeat feiern.',
                            en: 'Brands and collaborations that celebrate with peopleeat.',
                        }[locale]
                    }
                </p>
            </div>
            <Button asChild size="lg">
                <Link to="/{-$locale}/partners">{{ de: 'Alle Partner ansehen', en: 'See all partners' }[locale]}</Link>
            </Button>
        </Reveal>
    );
}
