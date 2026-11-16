import type { Meta, StoryObj } from '@storybook/react-vite';
import { bookingRequestOfferStatusHue, bookingRequestOfferStatusLabel } from '../../shared/bookingRequestOfferStatus';
import { bookingRequestStatusHue, bookingRequestStatusLabel } from '../../shared/bookingRequestStatus';
import type { StatusTone } from '../components/base/status';
import { statusAlertToneClass, statusBadgeToneClass, statusIconToneClass } from '../components/base/status';
import { StatusBadge } from '../components/base/status-badge';
import { StatusIcon } from '../components/base/status-icon';
import { BookingStatusPill } from '../components/BookingStatusPill';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';
import { GallerySection, WarmPage } from './gallery';

const meta = {
    title: 'Foundations/Tokens',
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const surfaceTokens = [
    { name: 'background', className: 'bg-background border border-border' },
    { name: 'secondary', className: 'bg-secondary border border-border' },
    { name: 'card', className: 'bg-card border border-border' },
    { name: 'muted', className: 'bg-muted border border-border' },
    { name: 'primary', className: 'bg-primary text-primary-foreground' },
    { name: 'accent', className: 'bg-accent text-accent-foreground' },
    { name: 'sidebar', className: 'bg-sidebar border border-border' },
    { name: 'destructive', className: 'bg-destructive text-destructive-foreground' },
] as const;

const tones: StatusTone[] = ['info', 'success', 'warning', 'error'];

const requestStatuses = [
    'WAITING_FOR_OFFERS',
    'OFFERS_WAITING_FOR_REVIEW',
    'DEPOSIT_PAYMENT_PENDING',
    'EVENT_PENDING',
    'COMPLETED',
    'CANCELED',
] as const;

const offerStatuses = [
    'USER_NEEDS_TO_ACCEPT',
    'COOK_NEEDS_TO_ACCEPT',
    'USER_REQUESTED_MENU_CHANGES',
    'EVENT_PENDING',
    'COMPLETED',
    'COOK_DECLINED',
] as const;

function Swatch({ name, className }: { name: string; className: string }) {
    return (
        <div className="grid gap-2">
            <div className={cn('h-16 rounded-lg shadow-xs', className)} />
            <span className="font-mono text-xs text-muted-foreground">{name}</span>
        </div>
    );
}

function TokensBoard() {
    const locale = useLocale();
    const { t } = useT('common');

    return (
        <WarmPage className="mx-auto flex max-w-5xl flex-col gap-12">
            <header className="grid max-w-2xl gap-2">
                <h1 className="font-serif text-3xl font-semibold tracking-tight">{t('storybook.tokens.title')}</h1>
                <p className="text-muted-foreground">{t('storybook.tokens.intro')}</p>
            </header>

            <GallerySection title={t('storybook.tokens.surfaces')}>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {surfaceTokens.map((token) => (
                        <Swatch key={token.name} name={token.name} className={token.className} />
                    ))}
                </div>
            </GallerySection>

            <GallerySection title={t('storybook.tokens.typeScale')} caption={t('storybook.tokens.typeScaleCaption')}>
                <div className="grid gap-3 rounded-xl border border-border bg-secondary p-6 shadow-xs">
                    <p className="font-serif text-4xl font-semibold">text-4xl serif</p>
                    <p className="font-serif text-3xl font-semibold">text-3xl serif</p>
                    <p className="font-serif text-2xl font-semibold">text-2xl serif</p>
                    <p className="font-serif text-xl font-semibold">text-xl serif</p>
                    <p className="text-lg font-semibold">text-lg sans</p>
                    <p className="text-base">text-base sans</p>
                    <p className="text-sm text-muted-foreground">text-sm muted</p>
                    <p className="text-xs text-muted-foreground">text-xs muted</p>
                </div>
            </GallerySection>

            <GallerySection title={t('storybook.tokens.statusTones')}>
                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="grid gap-3">
                        <p className="text-sm font-medium text-muted-foreground">{t('storybook.tokens.iconsAndBadges')}</p>
                        <div className="flex flex-wrap items-center gap-3">
                            {tones.map((tone) => (
                                <div key={tone} className="flex items-center gap-2">
                                    <StatusIcon tone={tone} />
                                    <StatusBadge tone={tone} label={tone} />
                                </div>
                            ))}
                        </div>
                        <div className="grid gap-2">
                            {tones.map((tone) => (
                                <div
                                    key={`alert-${tone}`}
                                    className={cn('rounded-md border px-3 py-2 text-sm', statusAlertToneClass[tone])}
                                >
                                    {tone} alert surface
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-3">
                        <p className="text-sm font-medium text-muted-foreground">{t('storybook.tokens.tokenClasses')}</p>
                        <ul className="grid gap-1 font-mono text-xs text-muted-foreground">
                            {tones.map((tone) => (
                                <li key={`class-${tone}`}>
                                    {tone}: icon `{statusIconToneClass[tone].split(' ')[0]}` · badge `
                                    {statusBadgeToneClass[tone].split(' ')[0]}`
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </GallerySection>

            <GallerySection title={t('storybook.tokens.bookingPills')}>
                <div className="grid gap-4">
                    <div className="flex flex-wrap gap-2">
                        {requestStatuses.map((status) => (
                            <BookingStatusPill key={status} hue={bookingRequestStatusHue(status)}>
                                {bookingRequestStatusLabel(status, locale, 'customer')}
                            </BookingStatusPill>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {offerStatuses.map((status) => (
                            <BookingStatusPill key={status} hue={bookingRequestOfferStatusHue(status)}>
                                {bookingRequestOfferStatusLabel(status, locale, 'customer')}
                            </BookingStatusPill>
                        ))}
                    </div>
                </div>
            </GallerySection>

            <GallerySection title={t('storybook.tokens.focusAndAccent')} caption={t('storybook.tokens.focusCaption')}>
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        type="button"
                        className="rounded-md border border-input bg-secondary px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        autoFocus
                    >
                        {t('storybook.tokens.focusVisible')}
                    </button>
                    <span className="rounded-md bg-accent/15 px-3 py-2 text-sm">bg-accent/15</span>
                    <span className="rounded-md bg-muted px-3 py-2 text-sm">bg-muted (hover)</span>
                </div>
            </GallerySection>
        </WarmPage>
    );
}

export const Overview: Story = {
    render: () => <TokensBoard />,
};
