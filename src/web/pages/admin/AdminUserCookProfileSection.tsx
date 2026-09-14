import { useForm, useSelector } from '@tanstack/react-form';
import { useRouter } from '@tanstack/react-router';
import { SparklesIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { COOKING_PHILOSOPHIES, CUISINE_STYLES } from '../../../shared/cookProfile';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/base/alert-dialog';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Separator } from '../../components/base/separator';
import { Spinner } from '../../components/base/spinner';
import { Switch } from '../../components/base/switch';
import { Textarea } from '../../components/base/textarea';
import { BiographySuggestionReview } from '../../components/BiographySuggestionReview';
import type { GqlCAdminUserPageQuery, GqlCLocationSuggestion } from '../../graphql/generated';
import {
    AdminCookApprovalUpdateDocument,
    AdminUserCookBiographySuggestDocument,
    AdminUserCookBiographySummarySuggestDocument,
    AdminUserCookUpdateDocument,
    AdminUserLocationSuggestionsDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';

type AdminUserRow = NonNullable<NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['user']>;
type AdminCookRow = NonNullable<AdminUserRow['cook']>;

const CUISINE_STYLE_ITEMS = [...CUISINE_STYLES];
const COOKING_PHILOSOPHY_ITEMS = [...COOKING_PHILOSOPHIES];
const TRAVEL_DISTANCE_OPTIONS = ['50', '100', '150', '200'] as const;

type CookFormValues = {
    biography: string;
    biographySummary: string;
    cuisineStyle: string;
    cookingPhilosophy: string;
    locationSearchText: string;
    selectedLocation: GqlCLocationSuggestion | null;
    travelExpensesText: string;
    maximumTravelDistanceText: string;
};

function centsToEuroText(cents: number): string {
    return (cents / 100).toFixed(2).replace('.', ',');
}

function euroTextToCents(value: string): number | null {
    if (value.trim() === '' || /[a-zA-Z]/u.test(value) || !/^-?\d*([.,]\d{0,2})?$/u.test(value)) {
        return null;
    }
    const floatValue = Number.parseFloat(value.replace(',', '.'));
    if (Number.isNaN(floatValue)) return null;
    return Math.round(floatValue * 100);
}

function formFromCook(cook: AdminCookRow): CookFormValues {
    return {
        biography: cook.biography,
        biographySummary: cook.biographySummary,
        cuisineStyle: cook.cuisineStyle ?? '',
        cookingPhilosophy: cook.cookingPhilosophy ?? '',
        locationSearchText: cook.exactTravelOriginAddress?.displayText ?? '',
        selectedLocation: cook.exactTravelOriginAddress
            ? {
                  displayText: cook.exactTravelOriginAddress.displayText,
                  latitude: cook.exactTravelOriginAddress.latitude,
                  longitude: cook.exactTravelOriginAddress.longitude,
                  structuredAddress: cook.exactTravelOriginAddress,
              }
            : null,
        travelExpensesText: centsToEuroText(cook.travelExpensesAmount),
        maximumTravelDistanceText: String(cook.maximumTravelDistance ?? 100),
    };
}

function CatalogCombobox({
    id,
    items,
    value,
    onChange,
    placeholder,
    emptyLabel,
}: {
    id: string;
    items: string[];
    value: string;
    onChange: (next: string) => void;
    placeholder: string;
    emptyLabel: string;
}) {
    const [inputValue, setInputValue] = useState(value);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    return (
        <Combobox
            items={items}
            value={value.trim().length > 0 ? value : null}
            inputValue={inputValue}
            onValueChange={(next) => {
                if (next == null) {
                    onChange('');
                    setInputValue('');
                    return;
                }
                onChange(next);
                setInputValue(next);
            }}
            onInputValueChange={setInputValue}
            itemToStringLabel={(item: string) => item}
        >
            <ComboboxInput id={id} className="w-full min-w-0" placeholder={placeholder} showClear={value.trim().length > 0} />
            <ComboboxContent>
                <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
                <ComboboxList>
                    {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                            {item}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

export function AdminUserCookProfileSection({ user }: { user: AdminUserRow }) {
    const locale = useLocale();
    const router = useRouter();
    const cook = user.cook;
    const [, approvalUpdate] = useMutation(AdminCookApprovalUpdateDocument);
    const [, cookUpdate] = useMutation(AdminUserCookUpdateDocument);
    const [{ fetching: biographySuggestFetching }, biographySuggest] = useMutation(AdminUserCookBiographySuggestDocument);
    const [{ fetching: summarySuggestFetching }, summarySuggest] = useMutation(AdminUserCookBiographySummarySuggestDocument);
    const [approvalBusy, setApprovalBusy] = useState(false);
    const [approved, setApproved] = useState(cook?.isApprovedByAdmin ?? false);
    const [pendingApproved, setPendingApproved] = useState<boolean | null>(null);
    const [visible, setVisible] = useState(cook?.isVisible ?? false);
    const [visibilityBusy, setVisibilityBusy] = useState(false);
    const [pendingVisible, setPendingVisible] = useState<boolean | null>(null);
    const [biographySuggestion, setBiographySuggestion] = useState<string | null>(null);

    useEffect(() => {
        setApproved(cook?.isApprovedByAdmin ?? false);
        setVisible(cook?.isVisible ?? false);
    }, [cook?.isApprovedByAdmin, cook?.isVisible]);

    const form = useForm({
        defaultValues: cook
            ? formFromCook(cook)
            : {
                  biography: '',
                  biographySummary: '',
                  cuisineStyle: '',
                  cookingPhilosophy: '',
                  locationSearchText: '',
                  selectedLocation: null as GqlCLocationSuggestion | null,
                  travelExpensesText: '0,25',
                  maximumTravelDistanceText: '100',
              },
        onSubmit: async ({ value }) => {
            if (!cook) return;
            const amount = euroTextToCents(value.travelExpensesText);
            if (amount == null || amount < 25) {
                toast.error(
                    {
                        de: 'Reisekosten müssen mindestens 0,25 € betragen.',
                        en: 'Travel expenses must be at least €0.25.',
                    }[locale],
                );
                return;
            }
            const distance = Number(value.maximumTravelDistanceText);
            if (!Number.isInteger(distance) || distance < 5 || distance > 250) {
                toast.error(
                    {
                        de: 'Die maximale Reisestrecke muss zwischen 5 und 250 km liegen.',
                        en: 'Maximum travel distance must be between 5 and 250 km.',
                    }[locale],
                );
                return;
            }

            const result = await cookUpdate({
                cookId: cook.cookId,
                input: {
                    biography: value.biography,
                    biographySummary: value.biographySummary,
                    cuisineStyle: value.cuisineStyle.trim() || null,
                    cookingPhilosophy: value.cookingPhilosophy.trim() || null,
                    exactTravelOriginAddress: value.selectedLocation?.displayText ?? undefined,
                    travelExpensesAmount: amount,
                    maximumTravelDistance: distance,
                },
            });
            if (result.error || !result.data?.admin.cookUpdate.success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }
            toast.success({ de: 'Kochprofil gespeichert.', en: 'Cook profile saved.' }[locale]);
            await router.invalidate();
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const locationSearchText = useSelector(form.store, (state) => state.values.locationSearchText);
    const selectedLocation = useSelector(form.store, (state) => state.values.selectedLocation);
    const biographyValue = useSelector(form.store, (state) => state.values.biography);
    const reviewingSuggestion = biographySuggestion != null;
    const aiBusy = biographySuggestFetching || summarySuggestFetching;
    const formBusy = isSubmitting || aiBusy || reviewingSuggestion;

    async function onBiographySuggest(currentBiography: string) {
        if (!cook) return;
        const result = await biographySuggest({ cookId: cook.cookId, currentBiography });
        const suggestion = result.data?.admin.cookBiographySuggest;
        if (result.error || !suggestion) {
            toast.error(
                {
                    de: 'Biografie konnte nicht erzeugt werden.',
                    en: 'Could not generate the biography.',
                }[locale],
            );
            return;
        }
        setBiographySuggestion(suggestion);
    }

    function onAcceptBiographySuggestion() {
        if (!biographySuggestion) return;
        form.setFieldValue('biography', biographySuggestion);
        setBiographySuggestion(null);
    }

    async function onSummarySuggest(biography: string) {
        if (!cook) return;
        const result = await summarySuggest({ cookId: cook.cookId, biography });
        const suggestion = result.data?.admin.cookBiographySummarySuggest;
        if (result.error || !suggestion) {
            toast.error(
                {
                    de: 'Kurzfassung konnte nicht erzeugt werden.',
                    en: 'Could not generate the summary.',
                }[locale],
            );
            return;
        }
        form.setFieldValue('biographySummary', suggestion);
    }

    useEffect(() => {
        if (!cook) return;
        if (!isDirty) {
            form.reset(formFromCook(cook));
        }
    }, [form, isDirty, cook]);

    const debouncedLocationSearch = useDebouncedValue(locationSearchText, 300);
    const [{ data: suggestionsData }] = useQuery({
        query: AdminUserLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || selectedLocation?.displayText === locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    if (!cook) {
        return (
            <p className="text-sm text-muted-foreground">
                {{ de: 'Kein Kochprofil für diesen Nutzer.', en: 'No cook profile for this user.' }[locale]}
            </p>
        );
    }

    const cookId = cook.cookId;

    async function onConfirmApproval() {
        if (pendingApproved == null) return;
        const next = pendingApproved;
        setApprovalBusy(true);
        try {
            const result = await approvalUpdate({ cookId, isApprovedByAdmin: next });
            if (result.error || !result.data?.admin.cookApprovalUpdate.success) {
                toast.error({ de: 'Freischaltung fehlgeschlagen.', en: 'Could not update approval.' }[locale]);
                return;
            }
            setApproved(next);
            setPendingApproved(null);
            toast.success(
                next
                    ? { de: 'Koch freigeschaltet.', en: 'Cook approved.' }[locale]
                    : { de: 'Freischaltung entzogen.', en: 'Approval revoked.' }[locale],
            );
        } finally {
            setApprovalBusy(false);
        }
    }

    async function onConfirmVisibility() {
        if (pendingVisible == null) return;
        const nextVisible = pendingVisible;
        setVisibilityBusy(true);
        try {
            const result = await cookUpdate({ cookId, input: { isVisible: nextVisible } });
            if (result.error || !result.data?.admin.cookUpdate.success) {
                toast.error({ de: 'Sichtbarkeit konnte nicht geändert werden.', en: 'Could not update visibility.' }[locale]);
                return;
            }
            setVisible(nextVisible);
            setPendingVisible(null);
            toast.success(
                nextVisible
                    ? { de: 'Profil öffentlich.', en: 'Profile public.' }[locale]
                    : { de: 'Profil verborgen.', en: 'Profile hidden.' }[locale],
            );
            await router.invalidate();
        } finally {
            setVisibilityBusy(false);
        }
    }

    return (
        <div className="grid max-w-2xl gap-8">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div className="grid gap-1">
                    <p className="font-medium">
                        {approved
                            ? { de: 'Freigeschaltet', en: 'Approved' }[locale]
                            : { de: 'Nicht freigeschaltet', en: 'Not approved' }[locale]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Steuert Wallet-Onboarding und Angebotsfähigkeit.',
                                en: 'Controls wallet onboarding and offer eligibility.',
                            }[locale]
                        }
                    </p>
                </div>
                <Button
                    type="button"
                    variant={approved ? 'outline' : 'default'}
                    disabled={approvalBusy}
                    onClick={() => setPendingApproved(!approved)}
                >
                    {approved
                        ? { de: 'Freischaltung entziehen', en: 'Revoke approval' }[locale]
                        : { de: 'Freischalten', en: 'Approve' }[locale]}
                </Button>
            </div>

            <AlertDialog open={pendingApproved != null} onOpenChange={(open) => !open && setPendingApproved(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingApproved
                                ? { de: 'Koch freischalten?', en: 'Approve this cook?' }[locale]
                                : { de: 'Freischaltung entziehen?', en: 'Revoke approval?' }[locale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingApproved
                                ? {
                                      de: 'Der Koch kann Wallet-Onboarding starten und Angebote erstellen. Es wird eine E-Mail an den Koch gesendet.',
                                      en: 'The cook can start wallet onboarding and create offers. An email will be sent to the cook.',
                                  }[locale]
                                : {
                                      de: 'Wallet-Onboarding und Angebotsfähigkeit werden gesperrt. Es wird keine E-Mail gesendet.',
                                      en: 'Wallet onboarding and offer eligibility will be blocked. No email will be sent.',
                                  }[locale]}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={approvalBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            variant={pendingApproved ? 'default' : 'destructive'}
                            disabled={approvalBusy}
                            onClick={() => void onConfirmApproval()}
                        >
                            {pendingApproved ? { de: 'Freischalten', en: 'Approve' }[locale] : { de: 'Entziehen', en: 'Revoke' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div className="grid gap-1">
                    <p className="font-medium">{{ de: 'Öffentliche Sichtbarkeit', en: 'Public visibility' }[locale]}</p>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Steuert die Anzeige in der Kochsuche (zusätzlich zur Freischaltung).',
                                en: 'Controls chef listing visibility (in addition to approval).',
                            }[locale]
                        }
                    </p>
                </div>
                <Switch
                    checked={visible}
                    disabled={visibilityBusy}
                    onCheckedChange={(next) => setPendingVisible(next)}
                    aria-label={{ de: 'Öffentliche Sichtbarkeit', en: 'Public visibility' }[locale]}
                />
            </div>

            <AlertDialog open={pendingVisible != null} onOpenChange={(open) => !open && setPendingVisible(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingVisible
                                ? { de: 'Profil öffentlich machen?', en: 'Make profile public?' }[locale]
                                : { de: 'Profil verbergen?', en: 'Hide profile?' }[locale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingVisible
                                ? {
                                      de: 'Das Profil erscheint in der Kochsuche, sobald der Koch freigeschaltet ist.',
                                      en: 'The profile appears in the chef listing once the cook is approved.',
                                  }[locale]
                                : {
                                      de: 'Das Profil verschwindet aus der Kochsuche.',
                                      en: 'The profile will disappear from the chef listing.',
                                  }[locale]}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={visibilityBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction disabled={visibilityBusy} onClick={() => void onConfirmVisibility()}>
                            {pendingVisible
                                ? { de: 'Öffentlich machen', en: 'Make public' }[locale]
                                : { de: 'Verbergen', en: 'Hide' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <form
                className="grid gap-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void form.handleSubmit();
                }}
            >
                <form.Field name="biography">
                    {(field) => (
                        <div className="grid gap-2">
                            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                                <label htmlFor="admin-cook-biography" className="text-sm font-medium">
                                    {{ de: 'Biografie', en: 'Biography' }[locale]}
                                </label>
                                {reviewingSuggestion ? null : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={isSubmitting || aiBusy}
                                        onClick={() => void onBiographySuggest(field.state.value)}
                                    >
                                        {biographySuggestFetching ? (
                                            <Spinner className="size-4" />
                                        ) : (
                                            <SparklesIcon className="size-4" aria-hidden />
                                        )}
                                        {biographySuggestFetching
                                            ? { de: 'Wird erzeugt…', en: 'Generating…' }[locale]
                                            : field.state.value.trim()
                                              ? { de: 'Mit KI verbessern', en: 'Improve with AI' }[locale]
                                              : { de: 'Mit KI schreiben', en: 'Write with AI' }[locale]}
                                    </Button>
                                )}
                            </div>
                            {biographySuggestion != null ? (
                                <BiographySuggestionReview
                                    currentBiography={field.state.value}
                                    suggestedBiography={biographySuggestion}
                                    locale={locale}
                                    onAccept={onAcceptBiographySuggestion}
                                    onDiscard={() => setBiographySuggestion(null)}
                                />
                            ) : (
                                <Textarea
                                    id="admin-cook-biography"
                                    rows={6}
                                    value={field.state.value}
                                    disabled={formBusy}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                />
                            )}
                        </div>
                    )}
                </form.Field>

                <form.Field name="biographySummary">
                    {(field) => (
                        <div className="grid gap-2">
                            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                                <label htmlFor="admin-cook-biography-summary" className="text-sm font-medium">
                                    {{ de: 'Biografie-Kurzfassung', en: 'Biography summary' }[locale]}
                                </label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={formBusy || !biographyValue.trim()}
                                    onClick={() => void onSummarySuggest(biographyValue)}
                                >
                                    <SparklesIcon className="size-4" aria-hidden />
                                    {summarySuggestFetching
                                        ? { de: 'Wird erzeugt…', en: 'Generating…' }[locale]
                                        : { de: 'Kurzfassung erzeugen', en: 'Generate summary' }[locale]}
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {
                                    {
                                        de: 'Manuell bearbeitbar. Speichern überschreibt die Kurzfassung nicht automatisch.',
                                        en: 'Editable manually. Saving does not auto-regenerate the summary.',
                                    }[locale]
                                }
                            </p>
                            <Textarea
                                id="admin-cook-biography-summary"
                                rows={3}
                                value={field.state.value}
                                disabled={formBusy}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                            />
                        </div>
                    )}
                </form.Field>

                <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field name="cuisineStyle">
                        {(field) => (
                            <div className="grid gap-2">
                                <label htmlFor="admin-cook-cuisine" className="text-sm font-medium">
                                    {{ de: 'Küchenstil', en: 'Cuisine style' }[locale]}
                                </label>
                                <CatalogCombobox
                                    id="admin-cook-cuisine"
                                    items={CUISINE_STYLE_ITEMS}
                                    value={field.state.value}
                                    onChange={(next) => field.handleChange(next)}
                                    placeholder={{ de: 'Küchenstil wählen…', en: 'Select cuisine style…' }[locale]}
                                    emptyLabel={{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}
                                />
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="cookingPhilosophy">
                        {(field) => (
                            <div className="grid gap-2">
                                <label htmlFor="admin-cook-philosophy" className="text-sm font-medium">
                                    {{ de: 'Kochphilosophie', en: 'Cooking philosophy' }[locale]}
                                </label>
                                <CatalogCombobox
                                    id="admin-cook-philosophy"
                                    items={COOKING_PHILOSOPHY_ITEMS}
                                    value={field.state.value}
                                    onChange={(next) => field.handleChange(next)}
                                    placeholder={{ de: 'Philosophie wählen…', en: 'Select philosophy…' }[locale]}
                                    emptyLabel={{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}
                                />
                            </div>
                        )}
                    </form.Field>
                </div>

                <Separator />

                <div className="grid gap-2">
                    <label htmlFor="admin-cook-travel-origin" className="text-sm font-medium">
                        {{ de: 'Reiseadresse', en: 'Travel origin' }[locale]}
                    </label>
                    <Combobox
                        filter={null}
                        items={suggestions.map((suggestion) => suggestion.displayText)}
                        value={selectedLocation?.displayText ?? null}
                        inputValue={locationSearchText}
                        onValueChange={(next) => {
                            if (next == null) return;
                            const match = suggestions.find((suggestion) => suggestion.displayText === next);
                            if (match) {
                                form.setFieldValue('selectedLocation', match);
                                form.setFieldValue('locationSearchText', match.displayText);
                            }
                        }}
                        onInputValueChange={(next) => {
                            form.setFieldValue('locationSearchText', next);
                            if (selectedLocation && next !== selectedLocation.displayText) {
                                form.setFieldValue('selectedLocation', null);
                            }
                        }}
                        itemToStringLabel={(item: string) => item}
                    >
                        <ComboboxInput
                            id="admin-cook-travel-origin"
                            className="w-full min-w-0"
                            placeholder={{ de: 'Adresse suchen…', en: 'Search address…' }[locale]}
                            showClear={false}
                        />
                        <ComboboxContent>
                            <ComboboxEmpty>{{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}</ComboboxEmpty>
                            <ComboboxList>
                                {(item: string) => (
                                    <ComboboxItem key={item} value={item}>
                                        {item}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field name="travelExpensesText">
                        {(field) => (
                            <div className="grid gap-2">
                                <label htmlFor="admin-cook-travel-expenses" className="text-sm font-medium">
                                    {{ de: 'Reisekosten / km (€)', en: 'Travel expenses / km (€)' }[locale]}
                                </label>
                                <Input
                                    id="admin-cook-travel-expenses"
                                    value={field.state.value}
                                    disabled={isSubmitting}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                />
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="maximumTravelDistanceText">
                        {(field) => (
                            <div className="grid gap-2">
                                <label htmlFor="admin-cook-max-distance" className="text-sm font-medium">
                                    {{ de: 'Max. Distanz', en: 'Max distance' }[locale]}
                                </label>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(next) => field.handleChange(next)}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger id="admin-cook-max-distance">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TRAVEL_DISTANCE_OPTIONS.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option} km
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </form.Field>
                </div>

                <dl className="grid gap-3 text-sm">
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Stripe-Status', en: 'Stripe status' }[locale]}
                        </dt>
                        <dd>{cook.stripeStatus}</dd>
                    </div>
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Stripe Account', en: 'Stripe account' }[locale]}
                        </dt>
                        <dd className="font-mono break-all">{cook.stripeAccountId ?? '—'}</dd>
                    </div>
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Anrufplanung', en: 'Call scheduling' }[locale]}
                        </dt>
                        <dd>
                            {cook.callSchedulingEnabled
                                ? `${{ de: 'Aktiv', en: 'On' }[locale]} · ${cook.callDurationMinutes} min`
                                : { de: 'Inaktiv', en: 'Off' }[locale]}
                        </dd>
                    </div>
                </dl>

                <div>
                    <Button type="submit" disabled={formBusy || !isDirty}>
                        {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </div>
            </form>
        </div>
    );
}
