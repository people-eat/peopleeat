import type { Meta, StoryObj } from '@storybook/react-vite';

import type { GqlCChatMessageBookingRequestOfferEventType } from '../../graphql/generated';
import { chatOfferEventFixture } from '../../storybook/fixtures/chat';
import { ChatMessageBookingRequestOfferEventView } from './ChatMessageBookingRequestOfferEvent';

const milestoneTypes: GqlCChatMessageBookingRequestOfferEventType[] = [
    'COOK_CREATED',
    'USER_ACCEPTED',
    'COOK_DECLINED',
    'COOK_CALL_SLOT_CONFIRMED',
    'COOK_UPDATED_SUGGESTED_MENU',
    'ADMIN_HANDED_OVER_TO_COOK',
    'USER_CANCELLED',
];

const meta = {
    title: 'Chat/Milestones',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const OfferTimeline: Story = {
    render: () => (
        <div className="flex max-w-lg flex-col gap-4">
            {milestoneTypes.map((type, index) => (
                <ChatMessageBookingRequestOfferEventView
                    key={type}
                    message={chatOfferEventFixture(type, {
                        createdAt: `2026-10-18T14:${String(index).padStart(2, '0')}:00.000Z`,
                        payload:
                            type === 'COOK_CREATED'
                                ? { menuPriceCents: 8900 }
                                : type === 'COOK_CALL_SLOT_CONFIRMED'
                                  ? {
                                        startAt: '2026-10-20T16:00:00.000Z',
                                        endAt: '2026-10-20T16:30:00.000Z',
                                    }
                                  : type === 'COOK_DECLINED'
                                    ? { declineReason: 'Termin passt nicht' }
                                    : type === 'ADMIN_HANDED_OVER_TO_COOK'
                                      ? { cookNameBefore: 'Mara Keller', chatCopied: true }
                                      : {},
                    })}
                />
            ))}
        </div>
    ),
};

export const CookCreated: Story = {
    render: () => (
        <ChatMessageBookingRequestOfferEventView message={chatOfferEventFixture('COOK_CREATED', { payload: { menuPriceCents: 12500 } })} />
    ),
};

export const UserAccepted: Story = {
    render: () => <ChatMessageBookingRequestOfferEventView message={chatOfferEventFixture('USER_ACCEPTED')} />,
};
