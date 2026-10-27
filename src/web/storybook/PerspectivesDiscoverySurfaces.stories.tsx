import type { Meta, StoryObj } from '@storybook/react-vite';

import { perspectivesCanvasDecorator } from '../../../.storybook/decorators';
import { CookMenuCardMedia } from '../components/CookMenuCard';
import { CookProfileTags } from '../components/CookProfileTags';
import { CustomerMealCard } from '../components/CustomerMealCard';
import { PublicCookCard } from '../components/PublicCookCard';
import { useLocale } from '../hooks/useLocale';
import { fixturePublicCook } from './fixtures/booking';
import {
    fixtureCook,
    fixtureCookAlt,
    fixtureMealImage,
    fixtureMenuImageA,
    fixtureMenuImageB,
    fixtureMenuImageC,
    fixtureMenuImageD,
} from './fixtures/people';
import { GallerySection, SurfaceColumn, WarmPage } from './gallery';

const meta = {
    title: 'Perspectives/Discovery Surfaces',
    decorators: [perspectivesCanvasDecorator],
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function DiscoveryCollage() {
    const locale = useLocale();

    const mealTitle = { de: 'Gebratene Ente mit Rotkohl', en: 'Roast duck with red cabbage' }[locale];
    const mealDescription = {
        de: 'Saftige Entenbrust mit Apfel-Rotkohl, Kartoffelklößen und Portwein-Jus.',
        en: 'Juicy duck breast with apple red cabbage, potato dumplings, and port jus.',
    }[locale];

    const altCook = {
        cookId: fixtureCookAlt.cookId,
        cuisineStyle: fixtureCookAlt.cuisineStyle,
        cookingPhilosophy: fixtureCookAlt.cookingPhilosophy,
        city: fixtureCookAlt.city,
        rating: undefined,
        user: {
            display: fixtureCookAlt.display,
            profilePicture: null,
        },
    };

    return (
        <WarmPage className="flex flex-col gap-10 p-0">
            <GallerySection
                title={{ de: 'Discovery-Flächen', en: 'Discovery surfaces' }[locale]}
                caption={
                    {
                        de: 'Öffentliche Kacheln nebeneinander: Dichte, Bildsprache und Tags auf dem warmen Canvas.',
                        en: 'Public tiles side by side: density, imagery, and tags on the warm canvas.',
                    }[locale]
                }
            >
                <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                    <SurfaceColumn label={{ de: 'Köchin mit Rating', en: 'Cook with rating' }[locale]} contentClassName="max-w-sm">
                        <PublicCookCard cook={fixturePublicCook} interactive={false} />
                    </SurfaceColumn>
                    <SurfaceColumn label={{ de: 'Köchin ohne Rating', en: 'Cook without rating' }[locale]} contentClassName="max-w-sm">
                        <PublicCookCard cook={altCook} interactive={false} />
                    </SurfaceColumn>
                    <SurfaceColumn label={{ de: 'Gericht', en: 'Meal' }[locale]} contentClassName="max-w-xs">
                        <CustomerMealCard title={mealTitle} description={mealDescription} imageUrl={fixtureMealImage} />
                    </SurfaceColumn>
                    <SurfaceColumn label={{ de: 'Gericht (Marketing)', en: 'Meal (marketing)' }[locale]} contentClassName="max-w-xs">
                        <CustomerMealCard title={mealTitle} description={mealDescription} imageUrl={fixtureMealImage} variant="marketing" />
                    </SurfaceColumn>
                    <SurfaceColumn label={{ de: 'Menü-Medien', en: 'Menu media' }[locale]}>
                        <div className="grid gap-3">
                            <CookMenuCardMedia images={[fixtureMenuImageA, fixtureMenuImageB, fixtureMenuImageC, fixtureMenuImageD]} />
                            <CookProfileTags cuisineStyle={fixtureCook.cuisineStyle} cookingPhilosophy={fixtureCook.cookingPhilosophy} />
                        </div>
                    </SurfaceColumn>
                </div>
            </GallerySection>
        </WarmPage>
    );
}

export const Collage: Story = {
    render: () => <DiscoveryCollage />,
};
