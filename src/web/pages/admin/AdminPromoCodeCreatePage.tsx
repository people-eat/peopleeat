import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { SubmitEventHandler } from 'react';
import { useMutation } from 'urql';

import { eurosToCents, formatCurrency } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Input } from '../../components/base/input';
import { AdminPromoCodeCreateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';

export const adminPromoCodeCreatePageTitle = { de: 'Promo-Code anlegen', en: 'Create promo code' } as const;
export const adminPromoCodeCreatePageDescription = {
    de: 'Neuen Rabattcode mit Wert, Mindestpreis und Ablauf anlegen.',
    en: 'Create a new discount code with amount, minimum price, and expiration.',
} as const;

const AMOUNT_PRESETS_EUROS = ['5', '10', '15', '20', '25', '30', '35', '40'] as const;
const MIN_PRICE_PRESETS_CENTS = [20_000, 25_000, 30_000, 35_000, 40_000, 45_000] as const;

function defaultExpiresAt(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setHours(23, 59, 0, 0);
    return date;
}

export function AdminPromoCodeCreatePage() {
    const locale = useLocale();
    const navigate = useNavigate();
    const [, promoCodeCreate] = useMutation(AdminPromoCodeCreateDocument);

    const [redeemCode, setRedeemCode] = useState('');
    const [amountText, setAmountText] = useState('10');
    const [minimumTotalAmountCustomerCents, setMinimumTotalAmountCustomerCents] = useState<number | 'NONE'>('NONE');
    const [expiresAt, setExpiresAt] = useState<Date>(defaultExpiresAt);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<'generic' | 'expires' | 'amount' | 'code' | null>(null);

    const onSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (busy) return;

        const trimmedCode = redeemCode.trim();
        if (trimmedCode.length === 0) {
            setError('code');
            return;
        }
        const amountCents = eurosToCents(amountText);
        if (amountCents == null || amountCents <= 0) {
            setError('amount');
            return;
        }
        if (expiresAt.getTime() <= Date.now()) {
            setError('expires');
            return;
        }

        setBusy(true);
        setError(null);
        try {
            const result = await promoCodeCreate({
                input: {
                    redeemCode: trimmedCode,
                    amountCents,
                    minimumTotalAmountCustomerCents:
                        typeof minimumTotalAmountCustomerCents === 'number' ? minimumTotalAmountCustomerCents : null,
                    expiresAt: expiresAt.toISOString(),
                },
            });
            if (result.error || !result.data?.admin.promoCodeCreate.success) {
                setError('generic');
                return;
            }
            const referenceId = result.data.admin.promoCodeCreate.referenceId;
            if (!referenceId) {
                setError('generic');
                return;
            }
            await navigate({
                to: '/{-$locale}/admin/promo-codes/$promoCodeId',
                params: { promoCodeId: referenceId },
            });
        } catch {
            setError('generic');
        } finally {
            setBusy(false);
        }
    };

    const errorMessage =
        error === 'code'
            ? { de: 'Promo-Codes brauchen einen Einlöscode.', en: 'Promo codes need a redeem code.' }[locale]
            : error === 'amount'
              ? { de: 'Promo-Codes brauchen einen positiven Wert.', en: 'Promo codes need a positive amount.' }[locale]
              : error === 'expires'
                ? {
                      de: 'Ablaufdatum und -uhrzeit müssen in der Zukunft liegen.',
                      en: 'Expiration date and time must be in the future.',
                  }[locale]
                : error === 'generic'
                  ? {
                        de: 'Anlegen fehlgeschlagen. Prüfe den Einlöscode (ggf. bereits vergeben).',
                        en: 'Could not create. Check the redeem code (it may already exist).',
                    }[locale]
                  : null;

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminPromoCodeCreatePageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{adminPromoCodeCreatePageDescription[locale]}</p>
                </div>

                <form className="grid max-w-xl gap-6" onSubmit={onSubmit}>
                    <div className="grid gap-2">
                        <label htmlFor="admin-promo-redeem-code" className="text-sm font-medium">
                            {{ de: 'Einlöscode', en: 'Redeem code' }[locale]}
                        </label>
                        <Input
                            id="admin-promo-redeem-code"
                            name="redeemCode"
                            required
                            value={redeemCode}
                            onChange={(event) => setRedeemCode(event.target.value)}
                            aria-invalid={error === 'code' || undefined}
                        />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="admin-promo-amount" className="text-sm font-medium">
                            {{ de: 'Wert (€)', en: 'Amount (€)' }[locale]}
                        </label>
                        <Input
                            id="admin-promo-amount"
                            name="amount"
                            inputMode="decimal"
                            required
                            value={amountText}
                            onChange={(event) => setAmountText(event.target.value)}
                            aria-invalid={error === 'amount' || undefined}
                        />
                        <div className="flex flex-wrap gap-2">
                            {AMOUNT_PRESETS_EUROS.map((euros) => {
                                const active = amountText === euros;
                                return (
                                    <Button
                                        key={euros}
                                        type="button"
                                        size="sm"
                                        variant={active ? 'default' : 'outline'}
                                        onClick={() => setAmountText(euros)}
                                    >
                                        {formatCurrency(Number(euros) * 100, { locale, maximumFractionDigits: 0 })}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    <fieldset className="grid gap-2">
                        <legend className="text-sm font-medium">{{ de: 'Mindestpreis', en: 'Minimum price' }[locale]}</legend>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Gesamtpreis für Kunden vor Abzügen.',
                                    en: 'Total price for the customer before deductions.',
                                }[locale]
                            }
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant={minimumTotalAmountCustomerCents === 'NONE' ? 'default' : 'outline'}
                                onClick={() => setMinimumTotalAmountCustomerCents('NONE')}
                            >
                                {{ de: 'Keiner', en: 'None' }[locale]}
                            </Button>
                            {MIN_PRICE_PRESETS_CENTS.map((cents) => {
                                const active = minimumTotalAmountCustomerCents === cents;
                                return (
                                    <Button
                                        key={cents}
                                        type="button"
                                        size="sm"
                                        variant={active ? 'default' : 'outline'}
                                        onClick={() => setMinimumTotalAmountCustomerCents(cents)}
                                    >
                                        {formatCurrency(cents, { locale, maximumFractionDigits: 0 })}
                                    </Button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="grid gap-2">
                        <span id="admin-promo-expires-label" className="text-sm font-medium">
                            {{ de: 'Ablaufdatum und -uhrzeit', en: 'Expiration date and time' }[locale]}
                        </span>
                        <DateTimePicker
                            value={expiresAt}
                            onValueChange={(date) => setExpiresAt(date)}
                            placeholder={{ de: 'Datum und Uhrzeit wählen', en: 'Pick date and time' }[locale]}
                            timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                            locale={DATE_FNS_LOCALE[locale]}
                            aria-labelledby="admin-promo-expires-label"
                            aria-invalid={error === 'expires' || undefined}
                            disabled={{ before: new Date() }}
                        />
                    </div>

                    {errorMessage ? (
                        <p className="text-sm text-destructive" role="alert">
                            {errorMessage}
                        </p>
                    ) : null}

                    <Button type="submit" disabled={busy}>
                        {{ de: 'Promo-Code anlegen', en: 'Create promo code' }[locale]}
                    </Button>
                </form>
            </main>
        </AdminPathPageChrome>
    );
}
