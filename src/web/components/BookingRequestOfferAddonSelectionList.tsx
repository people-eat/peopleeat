import { CheckIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';
import { inlineCopy } from '../../shared';

import type { GqlCOfferAddonInclusion, GqlCOfferAddonPricingUnit } from '../graphql/generated';
import { ProfileCustomerBookingRequestOfferAddonSelectionUpdateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { offerAddonPriceLabel } from '../utils/offerAddonPriceLabel';
import { Button } from './base/button';
import { CustomerMealCard } from './CustomerMealCard';

export type BookingRequestOfferAddonSelectionItem = {
    cookOfferAddonId: string;
    title: string;
    description: string;
    imageUrl?: string | null;
    pricingUnit: GqlCOfferAddonPricingUnit;
    priceCents: number;
    inclusion: GqlCOfferAddonInclusion;
    customerSelected: boolean;
};

export function BookingRequestOfferAddonSelectionList({
    bookingRequestOfferId,
    addons,
    heading,
    description,
    compact = false,
}: {
    bookingRequestOfferId: string;
    addons: BookingRequestOfferAddonSelectionItem[];
    heading?: string;
    description?: string;
    /** Smaller section chrome for the checkout sidebar. */
    compact?: boolean;
}) {
    const locale = useLocale();
    const [, updateAddonSelection] = useMutation(ProfileCustomerBookingRequestOfferAddonSelectionUpdateDocument);
    const [pendingAddonId, setPendingAddonId] = useState<string | null>(null);

    return (
        <section className="grid gap-3">
            {heading != null ? (
                <h2 className={compact ? 'font-serif text-xl/tight text-foreground' : 'font-serif text-2xl/tight text-foreground'}>
                    {heading}
                </h2>
            ) : null}
            {description != null ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            <ul className="grid gap-2">
                {addons.map((addon) => {
                    const required = addon.inclusion === 'REQUIRED';
                    const selected = required || addon.customerSelected;
                    const pending = pendingAddonId === addon.cookOfferAddonId;
                    const disabled = required || pending || pendingAddonId != null;
                    const priceLabel = offerAddonPriceLabel(addon.priceCents, addon.pricingUnit, locale);
                    const detailParts = [addon.description.trim(), priceLabel].filter((part) => part.length > 0);
                    if (required) {
                        detailParts.push(inlineCopy({ de: 'enthalten', en: 'included' }, locale));
                    }

                    return (
                        <li key={addon.cookOfferAddonId}>
                            <CustomerMealCard
                                title={addon.title}
                                description={detailParts.join(' · ')}
                                imageUrl={addon.imageUrl}
                                selected={selected}
                                disabled={disabled && !selected}
                                dialogTitle={inlineCopy({ de: 'Zusatzleistung', en: 'Extra' }, locale)}
                                action={
                                    <Button
                                        type="button"
                                        size="icon-sm"
                                        variant={selected ? 'default' : 'outline'}
                                        disabled={disabled}
                                        aria-pressed={selected}
                                        aria-label={
                                            selected
                                                ? inlineCopy({ de: 'Auswahl entfernen', en: 'Remove selection' }, locale)
                                                : inlineCopy({ de: 'Zusatzleistung wählen', en: 'Select extra' }, locale)
                                        }
                                        onClick={() => {
                                            if (required) return;
                                            setPendingAddonId(addon.cookOfferAddonId);
                                            void updateAddonSelection({
                                                bookingRequestOfferId,
                                                selections: [{ cookOfferAddonId: addon.cookOfferAddonId, selected: !selected }],
                                            }).then((result) => {
                                                setPendingAddonId(null);
                                                if (result.error || !result.data?.user.bookingRequestOfferAddonSelectionUpdate.success) {
                                                    toast.error(
                                                        inlineCopy(
                                                            {
                                                                de: 'Die Auswahl konnte nicht gespeichert werden.',
                                                                en: 'Could not save that choice.',
                                                            },
                                                            locale,
                                                        ),
                                                    );
                                                }
                                            });
                                        }}
                                    >
                                        {selected ? <CheckIcon className="size-4" /> : <PlusIcon className="size-4" />}
                                    </Button>
                                }
                            />
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
