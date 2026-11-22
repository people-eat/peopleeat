import { useForm, useSelector } from '@tanstack/react-form';
import { ChevronLeftIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { t } from '../../i18n/t';
import { invoiceAddressNormalize } from '../../shared/invoiceAddressNormalize';
import type {
    GqlCCookTravelOriginAddress,
    GqlCInvoiceAddress,
    GqlCInvoiceAddressInput,
    GqlCLocationSuggestion,
} from '../graphql/generated';
import { ProfileCookFinancesInvoiceAddressUpdateDocument, ProfileCookFinancesLocationSuggestionsDocument } from '../graphql/generated';
import { useIsMobile } from '../hooks/use-mobile';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocale } from '../hooks/useLocale';
import { Button } from './base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from './base/combobox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Input } from './base/input';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './base/sheet';

type CookInvoiceAddressDialogSeed = {
    firstName: string;
    lastName: string;
};

type CookInvoiceAddressDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceAddress: GqlCInvoiceAddress | null;
    travelOrigin: Pick<GqlCCookTravelOriginAddress, 'addressLine1' | 'addressLine2' | 'city' | 'postCode' | 'country'> | null;
    seed: CookInvoiceAddressDialogSeed;
};

type TravelOriginFields = Pick<GqlCCookTravelOriginAddress, 'addressLine1' | 'addressLine2' | 'city' | 'postCode' | 'country'>;

function formValuesFromAddress(invoiceAddress: GqlCInvoiceAddress | null, seed: CookInvoiceAddressDialogSeed): GqlCInvoiceAddressInput {
    if (invoiceAddress != null) {
        return {
            companyName: invoiceAddress.companyName ?? '',
            firstName: invoiceAddress.firstName,
            lastName: invoiceAddress.lastName,
            country: invoiceAddress.country,
            city: invoiceAddress.city,
            postalCode: invoiceAddress.postalCode,
            line1: invoiceAddress.line1,
            line2: invoiceAddress.line2 ?? '',
        };
    }
    return {
        companyName: '',
        firstName: seed.firstName,
        lastName: seed.lastName,
        country: 'DE',
        city: '',
        postalCode: '',
        line1: '',
        line2: '',
    };
}

function invoiceAddressFromTravelOrigin(origin: TravelOriginFields, current: GqlCInvoiceAddressInput): GqlCInvoiceAddressInput {
    const country = origin.country.trim().toUpperCase();
    return {
        ...current,
        line1: origin.addressLine1,
        line2: origin.addressLine2 ?? '',
        city: origin.city,
        postalCode: origin.postCode,
        country: country.length === 2 ? country : current.country,
    };
}

function isInvoiceAddressComplete(value: GqlCInvoiceAddressInput): boolean {
    return (
        value.firstName.trim().length > 0 &&
        value.lastName.trim().length > 0 &&
        value.country.trim().length > 0 &&
        value.city.trim().length > 0 &&
        value.postalCode.trim().length > 0 &&
        value.line1.trim().length > 0
    );
}

/** Controlled invoice-address editor. Full-page sheet below `md`, two-column dialog from `md` up. */
export function CookInvoiceAddressDialog({ open, onOpenChange, invoiceAddress, travelOrigin, seed }: CookInvoiceAddressDialogProps) {
    const locale = useLocale();
    const isMobile = useIsMobile();
    const [, updateCook] = useMutation(ProfileCookFinancesInvoiceAddressUpdateDocument);
    const editing = invoiceAddress != null;
    const [locationSearchText, setLocationSearchText] = useState('');
    const [selectedLocation, setSelectedLocation] = useState<GqlCLocationSuggestion | null>(null);

    const form = useForm({
        defaultValues: formValuesFromAddress(invoiceAddress, seed),
        onSubmit: async ({ value }) => {
            if (!isInvoiceAddressComplete(value)) {
                toast.error(t(locale, 'common', 'stripePayment.billingIncomplete'));
                return;
            }
            const normalized = invoiceAddressNormalize(value);
            const result = await updateCook({
                input: {
                    invoiceAddress: {
                        companyName: normalized.companyName ?? '',
                        firstName: normalized.firstName,
                        lastName: normalized.lastName,
                        country: normalized.country,
                        city: normalized.city,
                        postalCode: normalized.postalCode,
                        line1: normalized.line1,
                        line2: normalized.line2,
                    },
                },
            });
            if (result.error || !result.data?.user.cook.update.success) {
                toast.error(t(locale, 'common', 'saveFailed'));
                return;
            }
            toast.success(t(locale, 'profileCook', 'actions.saved'));
            onOpenChange(false);
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const debouncedLocationSearch = useDebouncedValue(locationSearchText, 300);
    const [{ data: suggestionsData, fetching: suggestionsFetching }] = useQuery({
        query: ProfileCookFinancesLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: !open || debouncedLocationSearch.trim().length < 3 || selectedLocation?.displayText === locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    useEffect(() => {
        if (open) {
            form.reset(formValuesFromAddress(invoiceAddress, seed));
            setLocationSearchText('');
            setSelectedLocation(null);
        }
    }, [form, invoiceAddress, open, seed.firstName, seed.lastName]);

    function applyTravelOrigin() {
        if (travelOrigin == null) return;
        const next = invoiceAddressFromTravelOrigin(travelOrigin, form.store.state.values);
        form.setFieldValue('line1', next.line1);
        form.setFieldValue('line2', next.line2);
        form.setFieldValue('city', next.city);
        form.setFieldValue('postalCode', next.postalCode);
        form.setFieldValue('country', next.country);
        setLocationSearchText('');
        setSelectedLocation(null);
        toast.message(t(locale, 'profileCook', 'finances.invoiceAddress.travelOriginApplied'));
    }

    function applySuggestion(suggestion: GqlCLocationSuggestion) {
        const structured = suggestion.structuredAddress;
        if (structured == null) return;
        const next = invoiceAddressFromTravelOrigin(structured, form.store.state.values);
        form.setFieldValue('line1', next.line1);
        form.setFieldValue('line2', next.line2);
        form.setFieldValue('city', next.city);
        form.setFieldValue('postalCode', next.postalCode);
        form.setFieldValue('country', next.country);
        setSelectedLocation(suggestion);
        setLocationSearchText(suggestion.displayText);
    }

    const title = editing
        ? t(locale, 'profileCook', 'finances.invoiceAddress.editTitle')
        : t(locale, 'profileCook', 'finances.invoiceAddress.addTitle');
    const description = t(locale, 'profileCook', 'finances.invoiceAddress.dialogBody');
    const backLabel = t(locale, 'profileCook', 'finances.invoiceAddress.back');

    const identityFields = (
        <div className="grid content-start gap-4">
            {travelOrigin != null ? (
                <div className="grid gap-2">
                    <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={applyTravelOrigin}>
                        {t(locale, 'profileCook', 'finances.invoiceAddress.reuseTravelOrigin')}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'profileCook', 'finances.invoiceAddress.reuseTravelOriginHint')}
                    </p>
                </div>
            ) : null}

            <form.Field name="companyName">
                {(field) => (
                    <div className="grid gap-1.5">
                        <label htmlFor="cook-invoice-company" className="text-sm font-medium">
                            {t(locale, 'common', 'stripePayment.companyOptional')}
                        </label>
                        <Input
                            id="cook-invoice-company"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            autoComplete="organization"
                        />
                    </div>
                )}
            </form.Field>
            <form.Field name="firstName">
                {(field) => (
                    <div className="grid gap-1.5">
                        <label htmlFor="cook-invoice-first-name" className="text-sm font-medium">
                            {t(locale, 'profileCook', 'finances.invoiceAddress.firstName')}
                        </label>
                        <Input
                            id="cook-invoice-first-name"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            required
                            autoComplete="given-name"
                        />
                    </div>
                )}
            </form.Field>
            <form.Field name="lastName">
                {(field) => (
                    <div className="grid gap-1.5">
                        <label htmlFor="cook-invoice-last-name" className="text-sm font-medium">
                            {t(locale, 'profileCook', 'finances.invoiceAddress.lastName')}
                        </label>
                        <Input
                            id="cook-invoice-last-name"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            required
                            autoComplete="family-name"
                        />
                    </div>
                )}
            </form.Field>
        </div>
    );

    const addressFields = (
        <div className="grid content-start gap-4">
            <div className="grid gap-1.5">
                <span className="text-sm font-medium">{t(locale, 'profileCook', 'finances.invoiceAddress.searchAddress')}</span>
                <Combobox
                    filter={null}
                    items={suggestions.map((suggestion) => suggestion.displayText)}
                    value={selectedLocation?.displayText ?? null}
                    inputValue={locationSearchText}
                    onValueChange={(next) => {
                        if (next == null) return;
                        const match = suggestions.find((suggestion) => suggestion.displayText === next);
                        if (match) applySuggestion(match);
                    }}
                    onInputValueChange={(next) => {
                        setLocationSearchText(next);
                        if (selectedLocation && next !== selectedLocation.displayText) {
                            setSelectedLocation(null);
                        }
                    }}
                    itemToStringLabel={(item: string) => item}
                >
                    <ComboboxInput
                        className="w-full min-w-0"
                        placeholder={t(locale, 'profileCook', 'actions.searchAddress')}
                        showClear={false}
                    />
                    <ComboboxContent>
                        <ComboboxEmpty>
                            {suggestionsFetching
                                ? t(locale, 'profileCook', 'actions.searching')
                                : t(locale, 'profileCook', 'actions.noMatches')}
                        </ComboboxEmpty>
                        <ComboboxList>
                            {(item: string) => (
                                <ComboboxItem key={item} value={item}>
                                    {item}
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
                <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'finances.invoiceAddress.searchAddressHint')}</p>
            </div>

            <form.Field name="line1">
                {(field) => (
                    <div className="grid gap-1.5">
                        <label htmlFor="cook-invoice-line1" className="text-sm font-medium">
                            {t(locale, 'profileCook', 'finances.invoiceAddress.line1')}
                        </label>
                        <Input
                            id="cook-invoice-line1"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            required
                            autoComplete="address-line1"
                        />
                    </div>
                )}
            </form.Field>
            <form.Field name="line2">
                {(field) => (
                    <div className="grid gap-1.5">
                        <label htmlFor="cook-invoice-line2" className="text-sm font-medium">
                            {t(locale, 'profileCook', 'finances.invoiceAddress.line2')}
                        </label>
                        <Input
                            id="cook-invoice-line2"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            autoComplete="address-line2"
                        />
                    </div>
                )}
            </form.Field>
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                <form.Field name="postalCode">
                    {(field) => (
                        <div className="grid gap-1.5">
                            <label htmlFor="cook-invoice-postal" className="text-sm font-medium">
                                {t(locale, 'profileCook', 'finances.invoiceAddress.postalCode')}
                            </label>
                            <Input
                                id="cook-invoice-postal"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                required
                                autoComplete="postal-code"
                            />
                        </div>
                    )}
                </form.Field>
                <form.Field name="city">
                    {(field) => (
                        <div className="grid gap-1.5">
                            <label htmlFor="cook-invoice-city" className="text-sm font-medium">
                                {t(locale, 'profileCook', 'finances.invoiceAddress.city')}
                            </label>
                            <Input
                                id="cook-invoice-city"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                required
                                autoComplete="address-level2"
                            />
                        </div>
                    )}
                </form.Field>
            </div>
            <form.Field name="country">
                {(field) => (
                    <div className="grid gap-1.5">
                        <label htmlFor="cook-invoice-country" className="text-sm font-medium">
                            {t(locale, 'profileCook', 'finances.invoiceAddress.country')}
                        </label>
                        <Input
                            id="cook-invoice-country"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            required
                            maxLength={2}
                            autoComplete="country"
                            aria-describedby="cook-invoice-country-help"
                        />
                        <p id="cook-invoice-country-help" className="text-sm text-muted-foreground">
                            {t(locale, 'profileCook', 'finances.invoiceAddress.countryHelp')}
                        </p>
                    </div>
                )}
            </form.Field>
        </div>
    );

    const formBody = (
        <form
            id="cook-invoice-address-form"
            className="grid gap-6 md:grid-cols-2 md:gap-8"
            onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
            }}
        >
            {identityFields}
            {addressFields}
        </form>
    );

    const actionButtons = (
        <>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                {t(locale, 'common', 'cancel')}
            </Button>
            <Button type="submit" form="cook-invoice-address-form" disabled={isSubmitting}>
                {isSubmitting ? t(locale, 'profileCook', 'actions.saving') : t(locale, 'common', 'save')}
            </Button>
        </>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    showCloseButton={false}
                    className="h-dvh w-full max-w-none gap-0 overflow-hidden border-0 p-0 sm:max-w-none"
                >
                    <div className="flex shrink-0 items-center bg-background px-[max(0.75rem,env(safe-area-inset-left))] pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
                        <SheetClose asChild>
                            <Button type="button" variant="outline">
                                <ChevronLeftIcon />
                                {backLabel}
                            </Button>
                        </SheetClose>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pt-2 pb-4">
                        <SheetHeader className="mb-4 gap-1 p-0 text-left">
                            <SheetTitle>{title}</SheetTitle>
                            <SheetDescription>{description}</SheetDescription>
                        </SheetHeader>
                        {formBody}
                    </div>
                    <SheetFooter className="shrink-0 border-t bg-background px-[max(1.5rem,env(safe-area-inset-left))] pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row">
                        {actionButtons}
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {formBody}
                <DialogFooter>{actionButtons}</DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
