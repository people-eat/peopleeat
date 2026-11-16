import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { withFeatureToggles } from '../../../.storybook/decorators';
import { inlineCopy } from '../../shared';
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
    const [composerDemo, setComposerDemo] = useState('');

    return (
        <WarmPage className="mx-auto flex max-w-6xl flex-col gap-12">
            <header className="grid max-w-2xl gap-2">
                <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                    {inlineCopy({ de: 'PeopleEat Foundations', en: 'PeopleEat Foundations' }, locale)}
                </p>
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
                    {inlineCopy({ de: 'Stil und Stimmung auf einen Blick', en: 'Style and mood at a glance' }, locale)}
                </h1>
                <p className="text-base text-muted-foreground">
                    {inlineCopy(
                        {
                            de: 'Warme Seite, weiße Flächen, Kohle-Primäraktionen, Orange nur als Fokus und Markenakzent. Statusgelb und Buchungspillen bleiben getrennt vom Brand.',
                            en: 'Warm page, white lifts, charcoal primary actions, orange only for focus and brand emphasis. Status yellow and booking pills stay separate from the brand accent.',
                        },
                        locale,
                    )}
                </p>
            </header>

            <GallerySection
                title={inlineCopy({ de: 'Typografie', en: 'Typography' }, locale)}
                caption={inlineCopy(
                    {
                        de: 'DM Sans als Serif-Headline und Sans-UI. Eine Familie, zwei Rollen.',
                        en: 'DM Sans as serif headline and sans UI. One family, two roles.',
                    },
                    locale,
                )}
            >
                <div className="grid gap-3 rounded-xl border border-border bg-secondary p-6 shadow-xs">
                    <h3 className="font-serif text-2xl font-semibold">
                        {inlineCopy({ de: 'Privates Dinner mit Köchin', en: 'Private dinner with a cook' }, locale)}
                    </h3>
                    <p className="max-w-xl text-base text-foreground">
                        {inlineCopy(
                            {
                                de: 'Mara Keller kocht ein Herbstmenü für euer Geburtstagsdinner in München.',
                                en: 'Mara Keller cooks an autumn menu for your birthday dinner in Munich.',
                            },
                            locale,
                        )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {inlineCopy(
                            {
                                de: 'Hilfstext und Metadaten bleiben in text-sm muted.',
                                en: 'Helper text and metadata stay text-sm muted.',
                            },
                            locale,
                        )}
                    </p>
                </div>
            </GallerySection>

            <GallerySection
                title={inlineCopy({ de: 'Steuerungen', en: 'Controls' }, locale)}
                caption={inlineCopy(
                    {
                        de: 'Primär in Kohle. Fokusring in Accent. Formulare auf secondary (weiß) über dem warmen Canvas.',
                        en: 'Primary in charcoal. Focus ring in accent. Forms on secondary (white) over the warm canvas.',
                    },
                    locale,
                )}
            >
                <div className="flex flex-wrap items-center gap-3">
                    <Button>{inlineCopy({ de: 'Angebot annehmen', en: 'Accept offer' }, locale)}</Button>
                    <Button variant="secondary">{inlineCopy({ de: 'Speichern', en: 'Save' }, locale)}</Button>
                    <Button variant="outline">{inlineCopy({ de: 'Abbrechen', en: 'Cancel' }, locale)}</Button>
                    <Button variant="ghost">{inlineCopy({ de: 'Mehr', en: 'More' }, locale)}</Button>
                    <Button variant="destructive">{inlineCopy({ de: 'Absagen', en: 'Decline' }, locale)}</Button>
                </div>
                <div className="mt-4 grid max-w-sm gap-3">
                    <Input
                        placeholder={inlineCopy({ de: 'Anlass, z. B. Geburtstagsdinner', en: 'Occasion, e.g. birthday dinner' }, locale)}
                        defaultValue={inlineCopy({ de: 'Geburtstagsdinner', en: 'Birthday dinner' }, locale)}
                    />
                    <Textarea
                        placeholder={inlineCopy({ de: 'Nachricht an die Köchin…', en: 'Message to the cook…' }, locale)}
                        value={composerDemo}
                        onChange={(event) => setComposerDemo(event.target.value)}
                        rows={3}
                    />
                </div>
            </GallerySection>

            <GallerySection
                title={inlineCopy({ de: 'Status und Marke', en: 'Status and brand' }, locale)}
                caption={inlineCopy(
                    {
                        de: 'Statusbanner und Badges (Blau/Grün/Gelb/Rot) neben Buchungspillen. Orange Fokus neben Warnung, ohne dass sie konkurrieren.',
                        en: 'Status banners and badges (blue/green/yellow/red) beside booking pills. Orange focus next to warning without competing.',
                    },
                    locale,
                )}
            >
                <div className="grid max-w-xl gap-3">
                    <StatusAlert tone="warning" title={inlineCopy({ de: 'Gespräch wartet', en: 'Call waiting' }, locale)}>
                        {inlineCopy(
                            {
                                de: 'Ein Kennenlerngespräch wartet auf deine Bestätigung.',
                                en: 'An intro call is waiting for your confirmation.',
                            },
                            locale,
                        )}
                    </StatusAlert>
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone="info" label={inlineCopy({ de: 'Info', en: 'Info' }, locale)} />
                        <StatusBadge tone="success" label={inlineCopy({ de: 'Bereit', en: 'Ready' }, locale)} />
                        <StatusBadge tone="warning" label={inlineCopy({ de: 'Unvollständig', en: 'Incomplete' }, locale)} />
                        <StatusBadge tone="error" label={inlineCopy({ de: 'Fehler', en: 'Error' }, locale)} />
                        <BookingStatusPill hue={bookingRequestStatusHue('OFFERS_WAITING_FOR_REVIEW')}>
                            {bookingRequestStatusLabel('OFFERS_WAITING_FOR_REVIEW', locale, 'customer')}
                        </BookingStatusPill>
                        <BookingStatusPill hue={bookingRequestOfferStatusHue('USER_NEEDS_TO_ACCEPT')}>
                            {bookingRequestOfferStatusLabel('USER_NEEDS_TO_ACCEPT', locale, 'customer')}
                        </BookingStatusPill>
                        <Button size="sm" variant="outline" autoFocus>
                            {inlineCopy({ de: 'Fokus (Accent-Ring)', en: 'Focus (accent ring)' }, locale)}
                        </Button>
                        <span className="relative inline-flex size-10 items-center justify-center rounded-md border border-border bg-secondary">
                            <NotificationBadge count={2} label={inlineCopy({ de: '2 ungelesen', en: '2 unread' }, locale)} />
                        </span>
                    </div>
                    <CookProfileTags cuisineStyle={fixtureCook.cuisineStyle} cookingPhilosophy={fixtureCook.cookingPhilosophy} />
                </div>
            </GallerySection>

            <Separator />

            <GallerySection
                title={inlineCopy({ de: 'Kartenfamilie', en: 'Card family' }, locale)}
                caption={inlineCopy(
                    {
                        de: 'Discovery-Kacheln und Buchungskarten auf demselben warmen Canvas. Dichte und Hover sollten harmonieren.',
                        en: 'Discovery tiles and booking cards on the same warm canvas. Density and hover should feel related.',
                    },
                    locale,
                )}
            >
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <SurfaceColumn label={inlineCopy({ de: 'Köchin', en: 'Cook' }, locale)} contentClassName="max-w-sm">
                        <PublicCookCard cook={fixturePublicCook} interactive={false} />
                    </SurfaceColumn>
                    <SurfaceColumn label={inlineCopy({ de: 'Gericht', en: 'Meal' }, locale)} contentClassName="max-w-xs">
                        <CustomerMealCard
                            title={inlineCopy({ de: 'Gebratene Ente mit Rotkohl', en: 'Roast duck with red cabbage' }, locale)}
                            description={inlineCopy(
                                {
                                    de: 'Saftige Entenbrust mit Apfel-Rotkohl und Portwein-Jus.',
                                    en: 'Juicy duck breast with apple red cabbage and port jus.',
                                },
                                locale,
                            )}
                            imageUrl={fixtureMealImage}
                        />
                    </SurfaceColumn>
                    <SurfaceColumn label={inlineCopy({ de: 'Menü-Medien', en: 'Menu media' }, locale)}>
                        <CookMenuCardMedia images={[fixtureMenuImageA, fixtureMenuImageB, fixtureMenuImageC, fixtureMenuImageD]} />
                    </SurfaceColumn>
                    <SurfaceColumn label={inlineCopy({ de: 'Anfrage', en: 'Request' }, locale)} contentClassName="max-w-sm">
                        <CustomerBookingRequestCard request={fixtureCustomerRequest} />
                    </SurfaceColumn>
                </div>
                <div className="mt-6 max-w-sm">
                    <SurfaceColumn label={inlineCopy({ de: 'Angebot', en: 'Offer' }, locale)}>
                        <CustomerBookingRequestOfferCard
                            bookingRequestId={fixtureBookingRequestId}
                            offer={fixtureCustomerOffer}
                            interactive={false}
                        />
                    </SurfaceColumn>
                </div>
            </GallerySection>

            <GallerySection
                title={inlineCopy({ de: 'Aufmerksamkeit und Chat', en: 'Attention and chat' }, locale)}
                caption={inlineCopy(
                    {
                        de: 'Attention-Banner und Offer-Chat teilen Statusfarben und Composer-Chrome mit dem Rest der Plattform.',
                        en: 'Attention banner and offer chat share status colors and composer chrome with the rest of the platform.',
                    },
                    locale,
                )}
            >
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="grid gap-4">
                        <BookingRequestOfferAttentionBanner
                            message={inlineCopy(
                                {
                                    de: 'Ein Kennenlerngespräch wartet auf deine Bestätigung.',
                                    en: 'An intro call is waiting for your confirmation.',
                                },
                                locale,
                            )}
                            actionLabel={inlineCopy({ de: 'Zum Gespräch', en: 'Go to call' }, locale)}
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
                            {inlineCopy(
                                {
                                    de: 'Sidebar-Mock: Warn-Badge und ungelesene Zähler nutzen dieselbe Statussprache wie Banner und Karten.',
                                    en: 'Sidebar mock: warning badge and unread counts use the same status language as banners and cards.',
                                },
                                locale,
                            )}
                            <div className="mt-3 flex w-48 flex-col gap-1 rounded-lg border bg-sidebar p-2">
                                <div className="relative flex items-center gap-2 rounded-md bg-sidebar-accent p-2 text-sm text-sidebar-accent-foreground">
                                    <span>{inlineCopy({ de: 'Angebote', en: 'Offers' }, locale)}</span>
                                    <span className="absolute right-1">
                                        <NotificationBadge
                                            count={2}
                                            label={inlineCopy({ de: '2 ungelesen', en: '2 unread' }, locale)}
                                            placement="inline"
                                        />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <SurfaceColumn
                        label={inlineCopy({ de: 'Offer-Chat (Kunde)', en: 'Offer chat (customer)' }, locale)}
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
