import { DEFAULT_TIME_ZONE, formatCurrency, formatDate } from '../../shared';
import type { Locale } from '../../shared/locale';

export type GiftCardVoucherPageProps = {
    giftCard: {
        giftCardId: string;
        locale: Locale;
        originalBalanceCents: number;
        redeemCode: string;
        recipientName: string;
        occasion: string;
        message: string;
        expiresAt: Date;
    };
};

export function GiftCardVoucherPage({ giftCard }: GiftCardVoucherPageProps) {
    const locale: Locale = giftCard.locale;
    const timeZone = DEFAULT_TIME_ZONE;
    const amount = formatCurrency(giftCard.originalBalanceCents, { locale });
    const expiry = formatDate(giftCard.expiresAt, { locale, timeZone, dateStyle: 'long' });

    return (
        <main
            id="main-content"
            data-voucher-ready
            className="relative mx-auto flex min-h-screen w-full max-w-[720px] flex-col justify-center bg-white px-10 py-12 text-neutral-900"
        >
            <div className="grid gap-8 border border-neutral-200 px-10 py-12">
                <header className="grid gap-3 text-center">
                    <p className="font-serif text-4xl tracking-tight">peopleeat</p>
                    <h1 className="text-lg font-medium tracking-wide text-neutral-500 uppercase">
                        {{ de: 'Geschenkkarte', en: 'Gift card' }[locale]}
                    </h1>
                </header>

                <section className="grid gap-2 text-center">
                    <p className="font-serif text-5xl tracking-tight">{amount}</p>
                    <p className="text-sm text-neutral-500">{giftCard.occasion}</p>
                </section>

                <section className="grid gap-2 text-center">
                    <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">{{ de: 'Für', en: 'For' }[locale]}</p>
                    <p className="font-serif text-2xl tracking-tight">{giftCard.recipientName}</p>
                    {giftCard.message.trim().length > 0 ? (
                        <p className="mx-auto max-w-md whitespace-pre-wrap text-sm text-neutral-600">{giftCard.message}</p>
                    ) : null}
                </section>

                <section className="grid gap-2 border-t border-neutral-200 pt-8 text-center">
                    <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
                        {{ de: 'Einlöscode', en: 'Redeem code' }[locale]}
                    </p>
                    <p className="font-mono text-2xl tracking-wider">{giftCard.redeemCode}</p>
                    <p className="text-sm text-neutral-500">{{ de: `Gültig bis ${expiry}`, en: `Valid until ${expiry}` }[locale]}</p>
                </section>

                <footer className="text-center text-xs text-neutral-500">
                    {
                        {
                            de: 'Einlösbar bei peopleeat für ein Dinner mit Privatkoch. Keine Barauszahlung.',
                            en: 'Redeemable at peopleeat for a private chef dinner. Not redeemable for cash.',
                        }[locale]
                    }
                </footer>
            </div>
        </main>
    );
}
