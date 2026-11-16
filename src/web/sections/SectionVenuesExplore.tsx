import { Link } from '@tanstack/react-router';

import { Button } from '../components/base/button';
import { Reveal } from '../components/Reveal';
import { useT } from '../hooks/useT';

export function SectionVenuesExplore() {
    const { t } = useT('public');

    return (
        <Reveal as="section" className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-16 @lg:px-6">
            <div className="flex max-w-2xl flex-col gap-3">
                <h2 className="font-serif text-3xl font-light @md:text-4xl">{t('venues.exploreTitle')}</h2>
                <p className="text-lg text-muted-foreground">{t('venues.description')}</p>
            </div>
            <Button asChild size="lg">
                <Link to="/{-$locale}/venues">{t('venues.seeAll')}</Link>
            </Button>
        </Reveal>
    );
}
