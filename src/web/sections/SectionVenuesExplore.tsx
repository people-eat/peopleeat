import { Link } from '@tanstack/react-router';

import { Button } from '../components/base/button';
import { Reveal } from '../components/Reveal';
import { useLocale } from '../hooks/useLocale';

export function SectionVenuesExplore() {
    const locale = useLocale();

    return (
        <Reveal as="section" className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-16 @lg:px-6">
            <div className="flex max-w-2xl flex-col gap-3">
                <h2 className="font-serif text-3xl font-light @md:text-4xl">
                    {{ de: 'Weitere Locations entdecken', en: 'Discover more venues' }[locale]}
                </h2>
                <p className="text-lg text-muted-foreground">
                    {
                        {
                            de: 'Locations, in denen ihr einen Privatkoch buchen könnt.',
                            en: 'Venues where you can book a private chef.',
                        }[locale]
                    }
                </p>
            </div>
            <Button asChild size="lg">
                <Link to="/{-$locale}/venues">{{ de: 'Alle Locations ansehen', en: 'See all venues' }[locale]}</Link>
            </Button>
        </Reveal>
    );
}
