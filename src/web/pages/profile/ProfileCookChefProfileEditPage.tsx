import { useForm, useSelector } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { SparklesIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { userDisplayName } from '../../../shared';
import { COOKING_PHILOSOPHIES, CUISINE_STYLES } from '../../../shared/cookProfile';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { Skeleton } from '../../components/base/skeleton';
import { Spinner } from '../../components/base/spinner';
import { Textarea } from '../../components/base/textarea';
import { BiographySuggestionReview } from '../../components/BiographySuggestionReview';
import { ProfilePictureEditor } from '../../components/ProfilePictureEditor';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookChefProfileCookFragment, GqlCProfileCookChefProfilePageQuery } from '../../graphql/generated';
import {
    ProfileCookBiographySuggestDocument,
    ProfileCookChefProfilePageUpdatesDocument,
    ProfileCookChefProfileUserUpdateDocument,
    ProfileCookUpdateDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('chef-profile');
export const profileCookChefProfileEditPageTitle = {
    de: 'Kochprofil bearbeiten',
    en: 'Edit chef profile',
} as const;
export const profileCookChefProfileEditPageDescription = route.description;

const CUISINE_STYLE_ITEMS = [...CUISINE_STYLES];
const COOKING_PHILOSOPHY_ITEMS = [...COOKING_PHILOSOPHIES];

type ChefProfileFormValues = {
    biography: string;
    cuisineStyle: string;
    cookingPhilosophy: string;
};

function formFromCook(next: GqlCProfileCookChefProfileCookFragment): ChefProfileFormValues {
    return {
        biography: next.biography,
        cuisineStyle: next.cuisineStyle ?? '',
        cookingPhilosophy: next.cookingPhilosophy ?? '',
    };
}

export function ProfileCookChefProfileEditPage({ data }: { data: GqlCProfileCookChefProfilePageQuery }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookChefProfilePageUpdatesDocument);
    const [, updateCook] = useMutation(ProfileCookUpdateDocument);
    const [{ fetching: biographySuggestFetching }, biographySuggest] = useMutation(ProfileCookBiographySuggestDocument);
    const [, userUpdate] = useMutation(ProfileCookChefProfileUserUpdateDocument);
    const biographyAiWriteEnabled = useFeatureToggleActive('COOK_BIOGRAPHY_AI_WRITE');
    const [profilePictureBusy, setProfilePictureBusy] = useState(false);
    const [biographySuggestion, setBiographySuggestion] = useState<string | null>(null);
    const [summaryRefreshPending, setSummaryRefreshPending] = useState(false);

    const cook = user?.cook ?? null;

    const form = useForm({
        defaultValues: cook
            ? formFromCook(cook)
            : {
                  biography: '',
                  cuisineStyle: '',
                  cookingPhilosophy: '',
              },
        onSubmit: async ({ value }) => {
            if (!cook) return;

            const nextCuisine = value.cuisineStyle.trim();
            const nextPhilosophy = value.cookingPhilosophy.trim();
            const biographyChanged = value.biography !== cook.biography;

            const result = await updateCook({
                input: {
                    biography: value.biography,
                    cuisineStyle: nextCuisine || null,
                    cookingPhilosophy: nextPhilosophy || null,
                },
            });
            if (result.error || !result.data?.user.cook.update.success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }

            form.reset({
                biography: value.biography,
                cuisineStyle: nextCuisine,
                cookingPhilosophy: nextPhilosophy,
            });

            if (biographyChanged) {
                if (value.biography.trim()) {
                    setSummaryRefreshPending(true);
                    toast.success(
                        {
                            de: 'Gespeichert. Kurzfassung wird aktualisiert…',
                            en: 'Saved. Updating summary…',
                        }[locale],
                    );
                } else {
                    setSummaryRefreshPending(false);
                    toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
                }
                return;
            }

            toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
            await navigate({ to: '/{-$locale}/profile/chef-profile' });
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const biographyValue = useSelector(form.store, (state) => state.values.biography);

    useEffect(() => {
        if (!cook) return;
        if (!isDirty) {
            form.reset(formFromCook(cook));
        }
    }, [form, isDirty, cook]);

    useEffect(() => {
        if (!summaryRefreshPending) return;
        if (cook?.biographySummaryGenerating) {
            // Server owns the flag for the rest of the run.
            setSummaryRefreshPending(false);
        }
    }, [cook?.biographySummaryGenerating, summaryRefreshPending]);

    if (!user || !cook) {
        return null;
    }

    async function onProfilePictureLink(fileUploadId: string) {
        const result = await userUpdate({ user: { profilePictureFileUploadId: fileUploadId } });
        if (result.error || !result.data?.user.userUpdate.success) {
            throw result.error ?? new Error('Could not save.');
        }
    }

    async function onProfilePictureClear() {
        const result = await userUpdate({ user: { profilePictureFileUploadId: null } });
        if (result.error || !result.data?.user.userUpdate.success) {
            throw result.error ?? new Error('Could not save.');
        }
    }

    const formBusy = isSubmitting || profilePictureBusy;
    const reviewingSuggestion = biographySuggestion != null;
    const summaryGenerating = summaryRefreshPending || cook.biographySummaryGenerating;

    async function onBiographySuggest(currentBiography: string) {
        const result = await biographySuggest({ currentBiography });
        const suggestion = result.data?.user.cook.biographySuggest;
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

    return (
        <ProfilePinnedFooterLayout
            contentClassName="grid min-w-0 content-start gap-8"
            footer={
                isDirty ? (
                    <>
                        <Button type="button" variant="outline" disabled={formBusy} asChild>
                            <Link to="/{-$locale}/profile/chef-profile">{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</Link>
                        </Button>
                        <Button type="submit" form="chef-profile-form" disabled={formBusy || reviewingSuggestion}>
                            {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                        </Button>
                    </>
                ) : (
                    <Button type="button" disabled={formBusy} asChild>
                        <Link to="/{-$locale}/profile/chef-profile">{{ de: 'Zur Profilansicht', en: 'Back to profile' }[locale]}</Link>
                    </Button>
                )
            }
        >
            <div className="grid gap-2">
                <h1 className="font-serif text-3xl/tight text-foreground">{profileCookChefProfileEditPageTitle[locale]}</h1>
                <p className="text-muted-foreground">{profileCookChefProfileEditPageDescription[locale]}</p>
            </div>

            <section className="grid min-w-0 gap-3">
                <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Profilbild', en: 'Profile picture' }[locale]}
                </h2>
                <ProfilePictureEditor
                    profilePictureUrl={user.profilePicture?.url ?? null}
                    displayName={userDisplayName(user)}
                    disabled={isSubmitting}
                    onLink={onProfilePictureLink}
                    onClear={onProfilePictureClear}
                    onBusyChange={setProfilePictureBusy}
                />
            </section>

            <form
                id="chef-profile-form"
                className="grid min-w-0 content-start gap-8"
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void form.handleSubmit();
                }}
            >
                <section className="grid min-w-0 gap-4">
                    <form.Field name="biography">
                        {(field) => (
                            <div className="grid min-w-0 gap-2">
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                                    <label htmlFor="chef-biography" className="text-sm font-medium">
                                        {{ de: 'Biografie', en: 'Biography' }[locale]}
                                    </label>
                                    {reviewingSuggestion || !biographyAiWriteEnabled ? null : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={formBusy || biographySuggestFetching || summaryGenerating}
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
                                        currentBiography={biographyValue}
                                        suggestedBiography={biographySuggestion}
                                        locale={locale}
                                        onAccept={onAcceptBiographySuggestion}
                                        onDiscard={() => setBiographySuggestion(null)}
                                    />
                                ) : (
                                    <Textarea
                                        id="chef-biography"
                                        name={field.name}
                                        rows={6}
                                        value={field.state.value}
                                        disabled={formBusy || biographySuggestFetching}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                    />
                                )}
                            </div>
                        )}
                    </form.Field>
                    <div className="grid min-w-0 gap-2">
                        <span className="text-sm font-medium">{{ de: 'Biografie-Kurzfassung', en: 'Biography summary' }[locale]}</span>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Wird automatisch aktualisiert, wenn du deine Biografie speicherst. Für die öffentliche Ansicht.',
                                    en: 'Updates automatically when you save your biography. Used on the public profile.',
                                }[locale]
                            }
                        </p>
                        {summaryGenerating ? (
                            <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3" aria-busy="true">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <p className="text-sm text-muted-foreground">
                                    {{ de: 'Kurzfassung wird aktualisiert…', en: 'Updating summary…' }[locale]}
                                </p>
                            </div>
                        ) : (
                            <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                                {cook.biographySummary.trim()
                                    ? cook.biographySummary
                                    : { de: 'Noch keine Kurzfassung vorhanden.', en: 'No summary yet.' }[locale]}
                            </p>
                        )}
                    </div>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-2 sm:gap-4">
                        <form.Field name="cuisineStyle">
                            {(field) => (
                                <div className="grid min-w-0 gap-2">
                                    <label htmlFor="chef-cuisine" className="text-sm font-medium">
                                        {{ de: 'Küchenstil', en: 'Cuisine style' }[locale]}
                                    </label>
                                    <CatalogCombobox
                                        id="chef-cuisine"
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
                                <div className="grid min-w-0 gap-2">
                                    <label htmlFor="chef-philosophy" className="text-sm font-medium">
                                        {{ de: 'Kochphilosophie', en: 'Cooking philosophy' }[locale]}
                                    </label>
                                    <CatalogCombobox
                                        id="chef-philosophy"
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
                </section>
            </form>
        </ProfilePinnedFooterLayout>
    );
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
