import type { Meta, StoryObj } from '@storybook/react-vite';

import { perspectivesCanvasDecorator } from '../../../.storybook/decorators';
import { BookingRequestOfferAttentionBanner } from '../components/BookingRequestOfferAttentionBanner';
import { CostBreakdownPanel } from '../components/CostBreakdownPanel';
import { CustomerBookingRequestCard } from '../components/CustomerBookingRequestCard';
import { CustomerBookingRequestOfferCard } from '../components/CustomerBookingRequestOfferCard';
import { useLocale } from '../hooks/useLocale';
import { fixtureBookingRequestId, fixtureCustomerOffer, fixtureCustomerRequest, fixtureOfferId } from './fixtures/booking';
import { GallerySection, SurfaceColumn, WarmPage } from './gallery';

const meta = {
    title: 'Perspectives/Booking Desk',
    decorators: [perspectivesCanvasDecorator],
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function BookingDesk() {
    const locale = useLocale();

    return (
        <WarmPage className="flex flex-col gap-10 p-0">
            <GallerySection
                title={{ de: 'Buchungs-Schreibtisch (Kunde)', en: 'Booking desk (customer)' }[locale]}
                caption={
                    {
                        de: 'Anfrage, Angebot, Kosten und Attention in einer Dichte, wie sie im Profil vorkommt.',
                        en: 'Request, offer, cost, and attention at the density you see in the profile.',
                    }[locale]
                }
            >
                <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,20rem)_minmax(0,22rem)]">
                    <SurfaceColumn label={{ de: 'Anfrage', en: 'Request' }[locale]} contentClassName="max-w-sm">
                        <CustomerBookingRequestCard request={fixtureCustomerRequest} />
                    </SurfaceColumn>
                    <SurfaceColumn label={{ de: 'Angebot', en: 'Offer' }[locale]} contentClassName="max-w-sm">
                        <CustomerBookingRequestOfferCard
                            bookingRequestId={fixtureBookingRequestId}
                            offer={fixtureCustomerOffer}
                            interactive={false}
                        />
                    </SurfaceColumn>
                    <SurfaceColumn label={{ de: 'Kosten und Attention', en: 'Cost and attention' }[locale]} contentClassName="max-w-md">
                        <div className="grid gap-4">
                            <BookingRequestOfferAttentionBanner
                                message={
                                    {
                                        de: 'Ein Kennenlerngespräch wartet auf deine Bestätigung.',
                                        en: 'An intro call is waiting for your confirmation.',
                                    }[locale]
                                }
                                actionLabel={{ de: 'Zum Gespräch', en: 'Go to call' }[locale]}
                                actionLink={{
                                    to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                                    params: {
                                        bookingRequestId: fixtureBookingRequestId,
                                        bookingRequestOfferId: fixtureOfferId,
                                    },
                                    search: { tab: 'call' },
                                }}
                            />
                            <CostBreakdownPanel
                                locale={locale}
                                lineItems={[
                                    {
                                        title: { de: 'Menü (3 Erwachsene)', en: 'Menu (3 adults)' }[locale],
                                        amountCents: 28500,
                                    },
                                    {
                                        title: { de: 'Menü (1 Kind)', en: 'Menu (1 child)' }[locale],
                                        amountCents: 6500,
                                    },
                                    {
                                        title: { de: 'Anreise', en: 'Travel' }[locale],
                                        amountCents: 1800,
                                    },
                                    {
                                        title: { de: 'Servicegebühr', en: 'Service fee' }[locale],
                                        amountCents: 7200,
                                    },
                                ]}
                                total={{ title: { de: 'Gesamt', en: 'Total' }[locale], amountCents: 48000 }}
                                footer={
                                    {
                                        de: 'Die An- und Abreise sind im Gesamtpreis inkludiert',
                                        en: 'Travel to and from the venue is included in the total price',
                                    }[locale]
                                }
                            />
                        </div>
                    </SurfaceColumn>
                </div>
            </GallerySection>
        </WarmPage>
    );
}

export const CustomerDesk: Story = {
    render: () => <BookingDesk />,
};
