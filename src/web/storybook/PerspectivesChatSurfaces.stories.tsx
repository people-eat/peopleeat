import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { perspectivesCanvasDecorator, withFeatureToggles } from '../../../.storybook/decorators';
import { BookingRequestOfferChat } from '../components/BookingRequestOfferChat';
import { fixtureOfferChatTranscript } from './fixtures/chat';
import { fixtureCook, fixtureCustomer } from './fixtures/people';
import { RoleColumn } from './gallery';

const meta = {
    title: 'Perspectives/Chat Surfaces',
    decorators: [perspectivesCanvasDecorator, withFeatureToggles(['BOOKING_REQUEST_OFFER_CHAT_REACTIONS'])],
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const chatPaneClassName = 'h-[480px] max-w-md overflow-hidden rounded-xl border border-border';

const onSend = fn(async () => true);

export const OfferChatRoles: Story = {
    render: () => (
        <div className="grid gap-8 xl:grid-cols-3">
            <RoleColumn label="Customer" contentClassName={chatPaneClassName}>
                <BookingRequestOfferChat
                    messages={fixtureOfferChatTranscript}
                    canSend
                    onSend={onSend}
                    onReactMessage={async () => true}
                    peers={[{ display: fixtureCook.display, profilePictureUrl: fixtureCook.profilePictureUrl }]}
                    viewerRole="customer"
                    className="h-full"
                />
            </RoleColumn>
            <RoleColumn label="Cook" contentClassName={chatPaneClassName}>
                <BookingRequestOfferChat
                    messages={fixtureOfferChatTranscript}
                    canSend
                    onSend={onSend}
                    onReactMessage={async () => true}
                    peers={[
                        {
                            display: fixtureCustomer.display,
                            profilePictureUrl: fixtureCustomer.profilePictureUrl,
                        },
                    ]}
                    viewerRole="cook"
                    className="h-full"
                />
            </RoleColumn>
            <RoleColumn label="Admin" contentClassName={chatPaneClassName}>
                <BookingRequestOfferChat
                    messages={fixtureOfferChatTranscript}
                    canSend={false}
                    onSend={onSend}
                    peers={[
                        {
                            display: fixtureCustomer.display,
                            profilePictureUrl: fixtureCustomer.profilePictureUrl,
                            userId: fixtureCustomer.userId,
                        },
                        {
                            display: fixtureCook.display,
                            profilePictureUrl: fixtureCook.profilePictureUrl,
                            userId: fixtureCook.userId,
                        },
                    ]}
                    viewerRole="admin"
                    className="h-full"
                />
            </RoleColumn>
        </div>
    ),
};
