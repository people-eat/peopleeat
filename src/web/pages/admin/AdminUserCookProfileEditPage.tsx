import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate, useRouter } from '@tanstack/react-router';
import { SparklesIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { userDisplayName } from '../../../shared';
import { COOKING_PHILOSOPHIES, CUISINE_STYLES } from '../../../shared/cookProfile';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Separator } from '../../components/base/separator';
import { Spinner } from '../../components/base/spinner';
import { Textarea } from '../../components/base/textarea';
import { BiographySuggestionReview } from '../../components/BiographySuggestionReview';
import { CookLogoEditor } from '../../components/CookLogoEditor';
import type { GqlCAdminUserCookProfileEditPageQuery, GqlCLocationSuggestion } from '../../graphql/generated';
import {
    AdminUserCookProfileEditBiographySuggestDocument,
    AdminUserCookProfileEditBiographySummarySuggestDocument,
    AdminUserCookProfileEditLocationSuggestionsDocument,
    AdminUserCookProfileEditUpdateDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';

export const adminUserCookProfileEditPageTitle = {
    de: 'Kochprofil bearbeiten',
    en: 'Edit cook profile',
} as const;
export const adminUserCookProfileEditPageDescription = {
    de: 'Biografie, Künstlername, About-Bild, Tags und Reiseeinstellungen eines Kochs bearbeiten.',
    en: 'Edit a cook biography, stage name, About picture, tags, and travel settings.',
} as const;

export function adminUserCookProfileEditPageVariables(userId: string) {
    return { userId };
}

type AdminCookRow = NonNullable<
    NonNullable<NonNullable<NonNullable<GqlCAdminUserCookProfileEditPageQuery['currentSession']['user']>['admin']>['user']>['cook']
>;

const CUISINE_STYLE_ITEMS = [...CUISINE_STYLES];
const COOKING_PHILOSOPHY_ITEMS = [...COOKING_PHILOSOPHIES];
const TRAVEL_DISTANCE_OPTIONS = ['50', '100', '150', '200'] as const;
const COOK_PROFILE_EDIT_FORM_ID = 'admin-user-cook-profile-edit-form';

type CookFormValues = {
    stageName: string;
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
        stageName: cook.stageName ?? '',
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

export function AdminUserCookProfileEditPage({ data, userId }: { data: GqlCAdminUserCookProfileEditPageQuery; userId: string }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const router = useRouter();
    const user = data.currentSession.user?.admin?.user ?? null;
    const cook = user?.cook ?? null;
    if (!user || !cook) throw notFound();
    const cookId = cook.cookId;

    const [, cookUpdate] = useMutation(AdminUserCookProfileEditUpdateDocument);
    const [{ fetching: biographySuggestFetching }, biographySuggest] = useMutation(AdminUserCookProfileEditBiographySuggestDocument);
    const [{ fetching: summarySuggestFetching }, summarySuggest] = useMutation(AdminUserCookProfileEditBiographySummarySuggestDocument);
    const [biographySuggestion, setBiographySuggestion] = useState<string | null>(null);
    const [logoBusy, setLogoBusy] = useState(false);
    const displayName = userDisplayName(user);

    const form = useForm({
        defaultValues: formFromCook(cook),
        onSubmit: async ({ value }) => {
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
                cookId,
                input: {
                    stageName: value.stageName.trim() || null,
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
            await navigate({
                to: '/{-$locale}/admin/users/$userId',
                params: { userId },
                search: { tab: 'cook-profile' },
            });
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const locationSearchText = useSelector(form.store, (state) => state.values.locationSearchText);
    const selectedLocation = useSelector(form.store, (state) => state.values.selectedLocation);
    const biographyValue = useSelector(form.store, (state) => state.values.biography);
    const reviewingSuggestion = biographySuggestion != null;
    const aiBusy = biographySuggestFetching || summarySuggestFetching;
    const formBusy = isSubmitting || aiBusy || reviewingSuggestion || logoBusy;

    async function onLogoLink(fileUploadId: string) {
        const result = await cookUpdate({ cookId, input: { logoFileUploadId: fileUploadId } });
        if (result.error || !result.data?.admin.cookUpdate.success) {
            throw result.error ?? new Error('Could not save.');
        }
        await router.invalidate();
    }

    async function onLogoClear() {
        const result = await cookUpdate({ cookId, input: { logoFileUploadId: null } });
        if (result.error || !result.data?.admin.cookUpdate.success) {
            throw result.error ?? new Error('Could not save.');
        }
        await router.invalidate();
    }

    async function onBiographySuggest(currentBiography: string) {
        const result = await biographySuggest({ cookId, currentBiography });
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
        const result = await summarySuggest({ cookId, biography });
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

    const debouncedLocationSearch = useDebouncedValue(locationSearchText, 300);
    const [{ data: suggestionsData }] = useQuery({
        query: AdminUserCookProfileEditLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || selectedLocation?.displayText === locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    return (
        <AdminPageChrome
            crumbs={[
                { label: { de: 'Benutzer', en: 'Users' }[locale], to: '/{-$locale}/admin/users' },
                {
                    label: displayName,
                    to: '/{-$locale}/admin/users/$userId',
                    params: { userId },
                    search: { tab: 'cook-profile' },
                },
                { label: adminUserCookProfileEditPageTitle[locale] },
            ]}
            contentClassName="min-h-0 overflow-hidden gap-0"
        >
            <AdminPinnedFooterLayout
                contentClassName="@container grid w-full max-w-2xl min-w-0 content-start gap-6"
                footer={
                    <>
                        <Button type="button" variant="outline" asChild disabled={formBusy}>
                            <Link to="/{-$locale}/admin/users/$userId" params={{ userId }} search={{ tab: 'cook-profile' }}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Link>
                        </Button>
                        <Button type="submit" form={COOK_PROFILE_EDIT_FORM_ID} disabled={formBusy || !isDirty}>
                            {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                        </Button>
                    </>
                }
            >
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl/tight text-foreground">{adminUserCookProfileEditPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{adminUserCookProfileEditPageDescription[locale]}</p>
                </div>

                <form
                    id={COOK_PROFILE_EDIT_FORM_ID}
                    className="grid gap-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <form.Field name="stageName">
                        {(field) => (
                            <div className="grid gap-2">
                                <label htmlFor="admin-cook-stage-name" className="text-sm font-medium">
                                    {{ de: 'Künstlername', en: 'Stage name' }[locale]}
                                </label>
                                <p className="text-sm text-muted-foreground">
                                    {
                                        {
                                            de: 'Optional. Wenn gesetzt, bevorzugen öffentliche Flächen diesen Namen statt des Vornamens.',
                                            en: 'Optional. When set, public surfaces prefer this name over the first name.',
                                        }[locale]
                                    }
                                </p>
                                <Input
                                    id="admin-cook-stage-name"
                                    value={field.state.value}
                                    disabled={formBusy}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                />
                            </div>
                        )}
                    </form.Field>

                    <div className="grid gap-2">
                        <p className="text-sm font-medium">
                            {{ de: 'Zusätzliches Bild (About)', en: 'Additional picture (About)' }[locale]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: '16:9 Landschaftsbild für den öffentlichen About-Bereich. Speichert sofort.',
                                    en: '16:9 landscape image for the public About section. Saves immediately.',
                                }[locale]
                            }
                        </p>
                        <CookLogoEditor
                            logoUrl={cook.logo?.url ?? null}
                            disabled={formBusy}
                            onLink={onLogoLink}
                            onClear={onLogoClear}
                            onBusyChange={setLogoBusy}
                        />
                    </div>

                    <Separator />

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

                    <div className="grid gap-4 @2xl:grid-cols-2">
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

                    <div className="grid gap-4 @2xl:grid-cols-2">
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
                </form>
            </AdminPinnedFooterLayout>
        </AdminPageChrome>
    );
}
