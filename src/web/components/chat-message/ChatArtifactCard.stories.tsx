import type { Meta, StoryObj } from '@storybook/react-vite';

import { fixtureCook, fixtureMealImage, fixtureMenuImageA, fixtureMenuImageB, fixtureMenuImageC } from '../../storybook/fixtures/people';
import type { ChatArtifactCardData } from './ChatArtifactCard';
import { ChatArtifactCard } from './ChatArtifactCard';
import { ChatCardList } from './ChatCardList';

const sampleCard: ChatArtifactCardData = {
    imageUrl: fixtureMealImage,
    title: 'Herbstmenü für sechs Gäste',
    description: 'Vorspeise, Hauptgang und Dessert mit regionalen Zutaten.',
    price: '€ 89 / Person',
    href: 'https://peopleeat.com',
    buttonTitle: 'Menü ansehen',
};

const meta = {
    title: 'Chat/Cards',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const RowLayout: Story = {
    render: () => (
        <div className="max-w-md">
            <ChatArtifactCard card={sampleCard} layout="row" />
        </div>
    ),
};

export const ResponsiveLayout: Story = {
    render: () => (
        <div className="max-w-md @container">
            <ChatArtifactCard card={sampleCard} layout="responsive" />
        </div>
    ),
};

export const CardList: Story = {
    render: () => (
        <div className="max-w-4xl">
            <ChatCardList>
                <li className="min-h-0 min-w-0">
                    <ChatArtifactCard
                        layout="responsive"
                        card={{
                            imageUrl: fixtureMenuImageA,
                            title: 'Menu A',
                            description: 'Light starter and fish.',
                            price: '€ 72',
                        }}
                    />
                </li>
                <li className="min-h-0 min-w-0">
                    <ChatArtifactCard
                        layout="responsive"
                        card={{
                            imageUrl: fixtureMenuImageB,
                            title: 'Menu B',
                            description: 'Vegetarian feast.',
                            price: '€ 68',
                        }}
                    />
                </li>
                <li className="min-h-0 min-w-0">
                    <ChatArtifactCard
                        layout="responsive"
                        card={{
                            imageUrl: fixtureMenuImageC,
                            title: `${fixtureCook.display} Signature`,
                            description: 'Seasonal chef pick.',
                            price: '€ 95',
                            href: 'https://peopleeat.com',
                            buttonTitle: 'Details',
                        }}
                    />
                </li>
            </ChatCardList>
        </div>
    ),
};
