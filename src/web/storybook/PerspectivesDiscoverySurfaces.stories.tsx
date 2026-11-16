import type { Meta, StoryObj } from '@storybook/react-vite';
import { perspectivesCanvasDecorator } from '../../../.storybook/decorators';

import { CookMenuCardMedia } from '../components/CookMenuCard';
import { CookProfileTags } from '../components/CookProfileTags';
import { CustomerMealCard } from '../components/CustomerMealCard';
import { PublicCookCard } from '../components/PublicCookCard';
import { useT } from '../hooks/useT';
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
    const { t } = useT('common');

    const mealTitle = t('storybook.discovery.roastDuck');
    const mealDescription = t('storybook.discovery.roastDuckDescription');

    const altCook = {
        cookId: fixtureCookAlt.cookId,
        pathName: 'jonas-keller',
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
            <GallerySection title={t('storybook.discovery.title')} caption={t('storybook.discovery.caption')}>
                <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                    <SurfaceColumn label={t('storybook.discovery.cookWithRating')} contentClassName="max-w-sm">
                        <PublicCookCard cook={fixturePublicCook} interactive={false} />
                    </SurfaceColumn>
                    <SurfaceColumn label={t('storybook.discovery.cookWithoutRating')} contentClassName="max-w-sm">
                        <PublicCookCard cook={altCook} interactive={false} />
                    </SurfaceColumn>
                    <SurfaceColumn label={t('storybook.discovery.meal')} contentClassName="max-w-xs">
                        <CustomerMealCard title={mealTitle} description={mealDescription} imageUrl={fixtureMealImage} />
                    </SurfaceColumn>
                    <SurfaceColumn label={t('storybook.discovery.mealMarketing')} contentClassName="max-w-xs">
                        <CustomerMealCard title={mealTitle} description={mealDescription} imageUrl={fixtureMealImage} variant="marketing" />
                    </SurfaceColumn>
                    <SurfaceColumn label={t('storybook.discovery.menuMedia')}>
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
