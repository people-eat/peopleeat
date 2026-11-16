import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { withFeatureToggles } from '../../../.storybook/decorators';
import { bookingRequestOfferStatusHue, bookingRequestOfferStatusLabel } from '../../shared/bookingRequestOfferStatus';
import { bookingRequestStatusHue, bookingRequestStatusLabel } from '../../shared/bookingRequestStatus';
import { Button } from '../components/base/button';
import { Input } from '../components/base/input';
import { NotificationBadge } from '../components/base/notification-badge';
import { Separator } from '../components/base/separator';
import { StatusAlert } from '../components/base/status-alert';
import { StatusBadge } from '../components/base/status-badge';
import { Textarea } from '../components/base/textarea';
import { BookingRequestOfferAttentionBanner } from '../components/BookingRequestOfferAttentionBanner';
import { BookingRequestOfferChat } from '../components/BookingRequestOfferChat';
import { BookingStatusPill } from '../components/BookingStatusPill';
import { CookMenuCardMedia } from '../components/CookMenuCard';
import { CookProfileTags } from '../components/CookProfileTags';
import { CustomerBookingRequestCard } from '../components/CustomerBookingRequestCard';
import { CustomerBookingRequestOfferCard } from '../components/CustomerBookingRequestOfferCard';
import { CustomerMealCard } from '../components/CustomerMealCard';
import { PublicCookCard } from '../components/PublicCookCard';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import {
    fixtureBookingRequestId,
    fixtureCustomerOffer,
    fixtureCustomerRequest,
    fixtureOfferId,
    fixturePublicCook,
} from './fixtures/booking';
import { fixtureOfferChatTranscript } from './fixtures/chat';
import {
    fixtureCook,
    fixtureMealImage,
    fixtureMenuImageA,
    fixtureMenuImageB,
    fixtureMenuImageC,
    fixtureMenuImageD,
} from './fixtures/people';
import { GallerySection, SurfaceColumn, WarmPage } from './gallery';

const meta = {
    title: 'Foundations/Mood Board',
    decorators: [withFeatureToggles(['BOOKING_REQUEST_OFFER_CHAT_REACTIONS'])],
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const onSend = fn(async () => true);

function MoodBoard() {
    const locale = useLocale();
    const { t } = useT('common');
    const [composerDemo, setComposerDemo] = useState('');

    return (
        <WarmPage className="mx-auto flex max-w-6xl flex-col gap-12">
            <header className="grid max-w-2xl gap-2">
                <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{t('storybook.moodBoard.kicker')}</p>
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">{t('storybook.moodBoard.title')}</h1>
                <p className="text-base text-muted-foreground">{t('storybook.moodBoard.intro')}</p>
            </header>

            <GallerySection title={t('storybook.moodBoard.typography')} caption={t('storybook.moodBoard.typographyCaption')}>
                <div className="grid gap-3 rounded-xl border border-border bg-secondary p-6 shadow-xs">
                    <h3 className="font-serif text-2xl font-semibold">{t('storybook.moodBoard.privateDinner')}</h3>
                    <p className="max-w-xl text-base text-foreground">{t('storybook.moodBoard.sampleBody')}</p>
                    <p className="text-sm text-muted-foreground">{t('storybook.moodBoard.helperMeta')}</p>
                </div>
            </GallerySection>

            <GallerySection title={t('storybook.moodBoard.controls')} caption={t('storybook.moodBoard.controlsCaption')}>
                <div className="flex flex-wrap items-center gap-3">
                    <Button>{t('storybook.moodBoard.acceptOffer')}</Button>
                    <Button variant="secondary">{t('save')}</Button>
                    <Button variant="outline">{t('cancel')}</Button>
                    <Button variant="ghost">{t('storybook.moodBoard.more')}</Button>
                    <Button variant="destructive">{t('storybook.moodBoard.decline')}</Button>
                </div>
                <div className="mt-4 grid max-w-sm gap-3">
                    <Input
                        placeholder={t('storybook.moodBoard.occasionPlaceholder')}
                        defaultValue={t('storybook.moodBoard.birthdayDinner')}
                    />
                    <Textarea
                        placeholder={t('storybook.moodBoard.messageToCook')}
                        value={composerDemo}
                        onChange={(event) => setComposerDemo(event.target.value)}
                        rows={3}
                    />
                </div>
            </GallerySection>

            <GallerySection title={t('storybook.moodBoard.statusAndBrand')} caption={t('storybook.moodBoard.statusCaption')}>
                <div className="grid max-w-xl gap-3">
                    <StatusAlert tone="warning" title={t('storybook.moodBoard.callWaiting')}>
                        {t('storybook.moodBoard.introCallWaiting')}
                    </StatusAlert>
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone="info" label={t('storybook.moodBoard.info')} />
                        <StatusBadge tone="success" label={t('storybook.moodBoard.ready')} />
                        <StatusBadge tone="warning" label={t('storybook.moodBoard.incomplete')} />
                        <StatusBadge tone="error" label={t('storybook.moodBoard.error')} />
                        <BookingStatusPill hue={bookingRequestStatusHue('OFFERS_WAITING_FOR_REVIEW')}>
                            {bookingRequestStatusLabel('OFFERS_WAITING_FOR_REVIEW', locale, 'customer')}
                        </BookingStatusPill>
                        <BookingStatusPill hue={bookingRequestOfferStatusHue('USER_NEEDS_TO_ACCEPT')}>
                            {bookingRequestOfferStatusLabel('USER_NEEDS_TO_ACCEPT', locale, 'customer')}
                        </BookingStatusPill>
                        <Button size="sm" variant="outline" autoFocus>
                            {t('storybook.moodBoard.focusAccent')}
                        </Button>
                        <span className="relative inline-flex size-10 items-center justify-center rounded-md border border-border bg-secondary">
                            <NotificationBadge count={2} label={t('storybook.moodBoard.unread2')} />
                        </span>
                    </div>
                    <CookProfileTags cuisineStyle={fixtureCook.cuisineStyle} cookingPhilosophy={fixtureCook.cookingPhilosophy} />
                </div>
            </GallerySection>

            <Separator />

            <GallerySection title={t('storybook.moodBoard.cardFamily')} caption={t('storybook.moodBoard.cardFamilyCaption')}>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <SurfaceColumn label={t('storybook.moodBoard.cook')} contentClassName="max-w-sm">
                        <PublicCookCard cook={fixturePublicCook} interactive={false} />
                    </SurfaceColumn>
                    <SurfaceColumn label={t('storybook.moodBoard.meal')} contentClassName="max-w-xs">
                        <CustomerMealCard
                            title={t('storybook.moodBoard.roastDuck')}
                            description={t('storybook.moodBoard.roastDuckDescription')}
                            imageUrl={fixtureMealImage}
                        />
                    </SurfaceColumn>
                    <SurfaceColumn label={t('storybook.moodBoard.menuMedia')}>
                        <CookMenuCardMedia images={[fixtureMenuImageA, fixtureMenuImageB, fixtureMenuImageC, fixtureMenuImageD]} />
                    </SurfaceColumn>
                    <SurfaceColumn label={t('storybook.moodBoard.request')} contentClassName="max-w-sm">
                        <CustomerBookingRequestCard request={fixtureCustomerRequest} />
                    </SurfaceColumn>
                </div>
                <div className="mt-6 max-w-sm">
                    <SurfaceColumn label={t('storybook.moodBoard.offer')}>
                        <CustomerBookingRequestOfferCard
                            bookingRequestId={fixtureBookingRequestId}
                            offer={fixtureCustomerOffer}
                            interactive={false}
                        />
                    </SurfaceColumn>
                </div>
            </GallerySection>

            <GallerySection title={t('storybook.moodBoard.attentionAndChat')} caption={t('storybook.moodBoard.attentionCaption')}>
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="grid gap-4">
                        <BookingRequestOfferAttentionBanner
                            message={t('storybook.moodBoard.introCallWaiting')}
                            actionLabel={t('storybook.moodBoard.goToCall')}
                            actionLink={{
                                to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                                params: {
                                    bookingRequestId: fixtureBookingRequestId,
                                    bookingRequestOfferId: fixtureOfferId,
                                },
                                search: { tab: 'call' },
                            }}
                        />
                        <div className="rounded-xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
                            {t('storybook.moodBoard.sidebarMock')}
                            <div className="mt-3 flex w-48 flex-col gap-1 rounded-lg border bg-sidebar p-2">
                                <div className="relative flex items-center gap-2 rounded-md bg-sidebar-accent p-2 text-sm text-sidebar-accent-foreground">
                                    <span>{t('storybook.moodBoard.offers')}</span>
                                    <span className="absolute right-1">
                                        <NotificationBadge count={2} label={t('storybook.moodBoard.unread2')} placement="inline" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <SurfaceColumn
                        label={t('storybook.moodBoard.offerChatCustomer')}
                        contentClassName="h-[420px] overflow-hidden rounded-xl border border-border"
                    >
                        <BookingRequestOfferChat
                            messages={fixtureOfferChatTranscript}
                            canSend
                            onSend={onSend}
                            onReactMessage={async () => true}
                            peers={[{ display: fixtureCook.display, profilePictureUrl: fixtureCook.profilePictureUrl }]}
                            viewerRole="customer"
                            className="h-full"
                        />
                    </SurfaceColumn>
                </div>
            </GallerySection>
        </WarmPage>
    );
}

export const Overview: Story = {
    render: () => <MoodBoard />,
};
