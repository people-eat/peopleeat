import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator, STORYBOOK_TIME_ZONE } from '../../../.storybook/decorators';
import { useLocale } from '../hooks/useLocale';
import { fixtureSummaryParticipants } from '../storybook/fixtures/booking';
import { fixtureAddress, fixtureCustomer, fixtureEventDateTime, fixtureOccasion } from '../storybook/fixtures/people';
import { CookBookingRequestSummaryCard } from './CookBookingRequestSummaryCard';

const meta = {
    title: 'Booking/Cook Request Summary',
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function SummaryCardStory() {
    const locale = useLocale();

    return (
        <CookBookingRequestSummaryCard
            locale={locale}
            timeZone={STORYBOOK_TIME_ZONE}
            occasion={fixtureOccasion}
            dateTime={fixtureEventDateTime}
            participants={fixtureSummaryParticipants}
            preferences={['Vegetarische Option', 'Kein scharfes Essen']}
            eventLocation={fixtureAddress.displayText}
            eventLocationHint={
                {
                    de: 'Die genaue Adresse wird nach gemeinsamer Zusage freigegeben. Für die Reisekosten nutzen wir sie bereits.',
                    en: 'The exact address is shared after both sides accept. We already use it for travel expense calculations.',
                }[locale]
            }
            estimatedTravelDistanceKm={12.4}
            estimatedTravelExpensesCents={1800}
            message={{
                text: 'Wir freuen uns auf einen entspannten Abend mit Freunden. Bitte beachtet die Nussallergie bei Lea.',
                userDisplay: fixtureCustomer.display,
                profilePictureUrl: fixtureCustomer.profilePictureUrl,
            }}
        />
    );
}

export const Default: Story = {
    render: () => <SummaryCardStory />,
};
