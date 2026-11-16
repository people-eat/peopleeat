import type { Meta, StoryObj } from '@storybook/react-vite';
import { perspectivesCanvasDecorator } from '../../../.storybook/decorators';

import { BookingRequestOfferAttentionBanner } from '../components/BookingRequestOfferAttentionBanner';
import { CostBreakdownPanel } from '../components/CostBreakdownPanel';
import { CustomerBookingRequestCard } from '../components/CustomerBookingRequestCard';
import { CustomerBookingRequestOfferCard } from '../components/CustomerBookingRequestOfferCard';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
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
    const { t } = useT('common');

    return (
        <WarmPage className="flex flex-col gap-10 p-0">
            <GallerySection title={t('storybook.bookingDesk.title')} caption={t('storybook.bookingDesk.caption')}>
                <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,20rem)_minmax(0,22rem)]">
                    <SurfaceColumn label={t('storybook.bookingDesk.request')} contentClassName="max-w-sm">
                        <CustomerBookingRequestCard request={fixtureCustomerRequest} />
                    </SurfaceColumn>
                    <SurfaceColumn label={t('storybook.bookingDesk.offer')} contentClassName="max-w-sm">
                        <CustomerBookingRequestOfferCard
                            bookingRequestId={fixtureBookingRequestId}
                            offer={fixtureCustomerOffer}
                            interactive={false}
                        />
                    </SurfaceColumn>
                    <SurfaceColumn label={t('storybook.bookingDesk.costAndAttention')} contentClassName="max-w-md">
                        <div className="grid gap-4">
                            <BookingRequestOfferAttentionBanner
                                message={t('storybook.moodBoard.introCallWaiting')}
                                actionLabel={t('storybook.bookingDesk.goToCall')}
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
                                    { title: t('storybook.bookingDesk.menuAdults'), amountCents: 28500 },
                                    { title: t('storybook.bookingDesk.menuChild'), amountCents: 6500 },
                                    { title: t('storybook.bookingDesk.travel'), amountCents: 1800 },
                                    { title: t('storybook.bookingDesk.serviceFee'), amountCents: 7200 },
                                ]}
                                total={{ title: t('storybook.bookingDesk.total'), amountCents: 48000 }}
                                footer={t('storybook.bookingDesk.travelIncluded')}
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
