import { notFound } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation, useQuery } from 'urql';
import { pipe, subscribe } from 'wonka';

import { fileUploadPublicUrl, formatCurrency, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/base/card';
import { Checkbox } from '../../components/base/checkbox';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Textarea } from '../../components/base/textarea';
import { ContentImageField, ContentPageEditor, contentPageEditorTabFromSearch } from '../../components/ContentPageEditor';
import type { ContentPageEditorSearch, ContentPageEditorValues } from '../../components/ContentPageEditor';
import { ContentPageFeaturedCooksEditor } from '../../components/ContentPageFeaturedCooksEditor';
import type { FeaturedCookOption } from '../../components/ContentPageFeaturedCooksEditor';
import { ContentPageTestimonialsEditor } from '../../components/ContentPageTestimonialsEditor';
import type { TestimonialCandidateOption, TestimonialEntry } from '../../components/ContentPageTestimonialsEditor';
import { contentSectionsFromGql, contentSectionsToInput } from '../../components/contentSectionsMap';
import type {
    GqlCAdminPartnerPageQuery,
    GqlCLocationSuggestion,
    GqlCUserBookingRequestExactEventAddressInput,
} from '../../graphql/generated';
import {
    AdminPartnerCooksUpdateDocument,
    AdminPartnerDeleteDocument,
    AdminPartnerPageCookSearchDocument,
    AdminPartnerPageLocationSuggestionsDocument,
    AdminPartnerPagePromoCodesDocument,
    AdminPartnerPageUpdatesDocument,
    AdminPartnerTestimonialsUpdateDocument,
    AdminPartnerUpsertDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';

export { parseContentPageEditorSearch as parseAdminPartnerPageSearch } from '../../components/ContentPageEditor';

export const adminPartnerPageTitle = { de: 'Partner bearbeiten', en: 'Edit partner' } as const;
export const adminPartnerPageDescription = {
    de: 'Partnerseite bearbeiten.',
    en: 'Edit partner landing page.',
} as const;

type PartnerEditorValues = ContentPageEditorValues & {
    name: string;
    firstSectionHeadlineDe: string;
    firstSectionHeadlineEn: string;
    firstSectionBodyDe: string;
    firstSectionBodyEn: string;
    firstSectionImageFileUploadId: string | null;
    firstSectionCtaUrl: string;
    heroImageOverlay: boolean;
    firstSectionImageOverlay: boolean;
    howItWorksAlternativeMedia: boolean;
    locationAddress: GqlCUserBookingRequestExactEventAddressInput | null;
    locationSearchText: string;
    promoCodeId: string | null;
};

type PartnerRow = NonNullable<NonNullable<NonNullable<GqlCAdminPartnerPageQuery['currentSession']['user']>['admin']>['partner']>;

function testimonialEntryFromAdmin(row: PartnerRow['testimonials'][number]): TestimonialEntry {
    return row.testimonial.__typename === 'AdminCustomerTestimonial'
        ? { testimonialType: 'CUSTOMER', testimonialId: row.testimonial.customerTestimonialId }
        : { testimonialType: 'COOK', testimonialId: row.testimonial.cookTestimonialId };
}

function addressFromPartner(address: NonNullable<PartnerRow['locationAddress']>): GqlCUserBookingRequestExactEventAddressInput {
    return {
        displayText: address.displayText,
        latitude: address.latitude,
        longitude: address.longitude,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        postCode: address.postCode,
        state: address.state,
        country: address.country,
    };
}

function addressFromSuggestion(suggestion: GqlCLocationSuggestion): GqlCUserBookingRequestExactEventAddressInput | null {
    const structured = suggestion.structuredAddress;
    if (!structured) return null;
    return {
        displayText: structured.displayText,
        latitude: structured.latitude,
        longitude: structured.longitude,
        addressLine1: structured.addressLine1,
        addressLine2: structured.addressLine2,
        city: structured.city,
        postCode: structured.postCode,
        state: structured.state,
        country: structured.country,
    };
}

function valuesFromPartner(partner: PartnerRow): PartnerEditorValues {
    const locationAddress = partner.locationAddress ? addressFromPartner(partner.locationAddress) : null;
    return {
        pathName: partner.pathName,
        name: partner.name,
        titleDe: partner.titleDe,
        titleEn: partner.titleEn,
        descriptionDe: partner.descriptionDe,
        descriptionEn: partner.descriptionEn,
        headlineDe: partner.headlineDe,
        headlineEn: partner.headlineEn,
        subHeadlineDe: partner.subHeadlineDe,
        subHeadlineEn: partner.subHeadlineEn,
        heroImageFileUploadId: partner.heroImageFileUploadId ?? null,
        firstSectionHeadlineDe: partner.firstSectionHeadlineDe,
        firstSectionHeadlineEn: partner.firstSectionHeadlineEn,
        firstSectionBodyDe: partner.firstSectionBodyDe,
        firstSectionBodyEn: partner.firstSectionBodyEn,
        firstSectionImageFileUploadId: partner.firstSectionImageFileUploadId ?? null,
        firstSectionCtaUrl: partner.firstSectionCtaUrl ?? '',
        heroImageOverlay: partner.heroImageOverlay,
        firstSectionImageOverlay: partner.firstSectionImageOverlay,
        howItWorksAlternativeMedia: partner.howItWorksAlternativeMedia,
        locationAddress,
        locationSearchText: locationAddress?.displayText ?? '',
        promoCodeId: partner.promoCodeId ?? null,
        sections: contentSectionsFromGql(partner.sections),
        publishedAt: partner.publishedAt,
    };
}

export function AdminPartnerPage({
    data,
    partnerId,
    search,
}: {
    data: GqlCAdminPartnerPageQuery;
    partnerId: string;
    search: ContentPageEditorSearch;
}) {
    const locale = useLocale();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedPartner = seedAdmin?.partner ?? null;
    if (!seedPartner) throw notFound();

    const [values, setValues] = useState<PartnerEditorValues>(() => valuesFromPartner(seedPartner));
    const [assignedCooks, setAssignedCooks] = useState(seedPartner.cooks);
    const [testimonialEntries, setTestimonialEntries] = useState<TestimonialEntry[]>(() =>
        seedPartner.testimonials.map(testimonialEntryFromAdmin),
    );
    const [busy, setBusy] = useState(false);
    const [cookSearch, setCookSearch] = useState('');
    const debouncedCookSearch = useDebouncedValue(cookSearch, 300);
    // Cook/testimonial saves emit the same partner subscription as page upserts; skip
    // overwriting the form while the operator still has unsaved page edits.
    const pageDirtyRef = useRef(false);
    // Latest form snapshot for onSave — ContentPageEditor only passes shared fields.
    const valuesRef = useRef(values);
    valuesRef.current = values;
    const [, upsert] = useMutation(AdminPartnerUpsertDocument);
    const [, remove] = useMutation(AdminPartnerDeleteDocument);
    const [, updateCooks] = useMutation(AdminPartnerCooksUpdateDocument);
    const [, updateTestimonials] = useMutation(AdminPartnerTestimonialsUpdateDocument);
    const tab = contentPageEditorTabFromSearch(search);

    function markPageDirty() {
        pageDirtyRef.current = true;
    }

    function patchPartnerValues(partial: Partial<PartnerEditorValues>) {
        markPageDirty();
        setValues((prev) => {
            const next = { ...prev, ...partial };
            valuesRef.current = next;
            return next;
        });
    }

    const [{ data: cookSearchData }] = useQuery({
        query: AdminPartnerPageCookSearchDocument,
        variables: {
            criterion: {
                skip: 0,
                take: 50,
                searchText: debouncedCookSearch.trim() || undefined,
                types: ['cook'],
            },
        },
    });

    const [{ data: promoCodesData }] = useQuery({
        query: AdminPartnerPagePromoCodesDocument,
        variables: {
            criterion: { skip: 0, take: 100 },
        },
    });

    const debouncedLocationSearch = useDebouncedValue(values.locationSearchText, 300);
    const [{ data: suggestionsData, fetching: suggestionsFetching }] = useQuery({
        query: AdminPartnerPageLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || values.locationAddress?.displayText === values.locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminPartnerPageUpdatesDocument, { partnerId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.partner;
                if (!next) return;
                if (!pageDirtyRef.current) setValues(valuesFromPartner(next));
                setAssignedCooks(next.cooks);
                setTestimonialEntries(next.testimonials.map(testimonialEntryFromAdmin));
            }),
        );
        return unsubscribe;
    }, [client, partnerId, seedAdmin]);

    const assignedIds = assignedCooks.map((row) => row.cook.cookId);

    const searchCandidates: FeaturedCookOption[] = useMemo(() => {
        const users = cookSearchData?.currentSession.user?.admin?.users ?? [];
        return users.flatMap((user) => {
            if (!user.cook) return [];
            const isPubliclyListed = user.status === 'ACTIVE' && user.cook.isVisible && user.cook.isApprovedByAdmin;
            return [
                {
                    cookId: user.cook.cookId,
                    displayName: userDisplayName(user),
                    city: user.cook.exactTravelOriginAddress?.city ?? null,
                    cuisineStyle: user.cook.cuisineStyle ?? null,
                    isPubliclyListed,
                    userStatus: user.status,
                },
            ];
        });
    }, [cookSearchData]);

    const candidates = useMemo(() => {
        const byId = new Map<string, FeaturedCookOption>();
        for (const row of assignedCooks) {
            byId.set(row.cook.cookId, {
                cookId: row.cook.cookId,
                displayName: userDisplayName(row.cook.user),
                city: row.cook.exactTravelOriginAddress?.city ?? null,
                cuisineStyle: row.cook.cuisineStyle ?? null,
                isPubliclyListed: row.isPubliclyListed,
                userStatus: row.cook.user.status,
            });
        }
        for (const cook of searchCandidates) {
            if (!byId.has(cook.cookId)) byId.set(cook.cookId, cook);
        }
        return [...byId.values()];
    }, [assignedCooks, searchCandidates]);

    const promoCodes = useMemo(() => {
        const rows = promoCodesData?.currentSession.user?.admin?.promoCodes ?? [];
        return rows.filter((row) => row.scopedBookingRequestId == null);
    }, [promoCodesData]);

    const previewPromo = useMemo(() => {
        if (!values.promoCodeId) return null;
        const match = promoCodes.find((row) => row.promoCodeId === values.promoCodeId);
        if (!match || new Date(match.expiresAt) <= new Date()) return null;
        return { redeemCode: match.redeemCode, amountCents: match.amountCents };
    }, [promoCodes, values.promoCodeId]);

    const previewCooks = assignedCooks
        .filter((row) => row.isPubliclyListed)
        .map((row) => ({
            cookId: row.cook.cookId,
            cuisineStyle: row.cook.cuisineStyle ?? null,
            cookingPhilosophy: row.cook.cookingPhilosophy ?? null,
            city: row.cook.exactTravelOriginAddress?.city ?? null,
            user: {
                display: userDisplayName(row.cook.user),
                profilePicture: null,
            },
        }));

    const testimonialCandidates: TestimonialCandidateOption[] = [
        ...(seedAdmin?.customerTestimonials ?? []).map((row) => ({
            testimonialType: 'CUSTOMER' as const,
            testimonialId: row.customerTestimonialId,
            displayAuthorName: row.displayAuthorName,
            displayLocation: row.displayLocation,
            displayOccasion: row.displayOccasion,
            body: row.body,
            rating: row.rating,
            publicationStatus: row.publicationStatus,
        })),
        ...(seedAdmin?.cookTestimonials ?? []).map((row) => ({
            testimonialType: 'COOK' as const,
            testimonialId: row.cookTestimonialId,
            displayAuthorName: row.displayAuthorName,
            displayLocation: row.displayLocation,
            displayOccasion: row.displayOccasion,
            body: row.body,
            rating: row.rating,
            publicationStatus: row.publicationStatus,
        })),
    ];

    return (
        <AdminPageChrome
            crumbs={[
                { label: { de: 'Partner', en: 'Partners' }[locale], to: '/{-$locale}/admin/partners' },
                { label: values.name.trim() || { de: 'Partner', en: 'Partner' }[locale] },
            ]}
        >
            <ContentPageEditor
                uiLocale={locale}
                values={values}
                onChange={(partial) => patchPartnerValues(partial)}
                busy={busy}
                listTo="/{-$locale}/admin/partners"
                detail={{ to: '/{-$locale}/admin/partners/$partnerId', params: { partnerId } }}
                tab={tab}
                user={data.currentSession.user}
                featuredCooks={previewCooks}
                heroImageOverlay={values.heroImageOverlay}
                howItWorks
                howItWorksHideCta
                howItWorksAlternativeMedia={values.howItWorksAlternativeMedia}
                knownFrom
                chefForAnyOccasion={{
                    displayName: values.name.trim() || { de: 'Partner', en: 'Partner' }[locale],
                    headlineDe: values.firstSectionHeadlineDe,
                    headlineEn: values.firstSectionHeadlineEn,
                    bodyDe: values.firstSectionBodyDe,
                    bodyEn: values.firstSectionBodyEn,
                    imageUrl: values.firstSectionImageFileUploadId ? fileUploadPublicUrl(values.firstSectionImageFileUploadId) : null,
                    ctaUrl: values.firstSectionCtaUrl.trim() || null,
                    promo: previewPromo,
                    imageOverlay: values.firstSectionImageOverlay,
                }}
                heroExtraFields={
                    <label className="flex items-start gap-2 text-sm">
                        <Checkbox
                            checked={values.heroImageOverlay}
                            onCheckedChange={(checked) => patchPartnerValues({ heroImageOverlay: checked === true })}
                            className="mt-0.5"
                        />
                        <span className="flex flex-col gap-0.5">
                            <span className="font-medium">
                                {{ de: 'Dunkles Overlay auf Hero-Bild', en: 'Dark overlay on hero image' }[locale]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {
                                    {
                                        de: 'Für bessere Lesbarkeit der Überschrift. Ausschalten, wenn das Foto bereits dunkel genug ist.',
                                        en: 'Improves headline contrast. Turn off when the photo is already dark enough.',
                                    }[locale]
                                }
                            </span>
                        </span>
                    </label>
                }
                identityFields={
                    <Card className="gap-4 py-4" data-content-editor-anchor="top">
                        <CardHeader className="px-4">
                            <CardTitle>{{ de: 'Partnername', en: 'Partner name' }[locale]}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 px-4">
                            <label className="flex flex-col gap-1.5 text-sm">
                                <span className="font-medium">{{ de: 'Name', en: 'Name' }[locale]}</span>
                                <Input value={values.name} onChange={(e) => patchPartnerValues({ name: e.target.value })} />
                            </label>
                        </CardContent>
                    </Card>
                }
                extraFields={
                    <>
                        <Card className="gap-4 py-4" data-content-editor-anchor="first-section">
                            <CardHeader className="px-4">
                                <CardTitle>{{ de: 'Erster Abschnitt', en: 'First section' }[locale]}</CardTitle>
                                <CardDescription>
                                    {
                                        {
                                            de: 'Headline, Text und Bild neben der CTA-Karte auf der Partnerseite.',
                                            en: 'Headline, body, and image beside the CTA card on the partner page.',
                                        }[locale]
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 px-4">
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Headline (DE)', en: 'Headline (DE)' }[locale]}</span>
                                    <Input
                                        value={values.firstSectionHeadlineDe}
                                        onChange={(e) => patchPartnerValues({ firstSectionHeadlineDe: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Headline (EN)', en: 'Headline (EN)' }[locale]}</span>
                                    <Input
                                        value={values.firstSectionHeadlineEn}
                                        onChange={(e) => patchPartnerValues({ firstSectionHeadlineEn: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Text (DE)', en: 'Body (DE)' }[locale]}</span>
                                    <Textarea
                                        value={values.firstSectionBodyDe}
                                        onChange={(e) => patchPartnerValues({ firstSectionBodyDe: e.target.value })}
                                        rows={4}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Text (EN)', en: 'Body (EN)' }[locale]}</span>
                                    <Textarea
                                        value={values.firstSectionBodyEn}
                                        onChange={(e) => patchPartnerValues({ firstSectionBodyEn: e.target.value })}
                                        rows={4}
                                    />
                                </label>
                                <ContentImageField
                                    fileUploadId={values.firstSectionImageFileUploadId}
                                    uiLocale={locale}
                                    onUploadStart={markPageDirty}
                                    onChange={(firstSectionImageFileUploadId) => patchPartnerValues({ firstSectionImageFileUploadId })}
                                    label={{ de: 'Abschnittsbild', en: 'Section image' }[locale]}
                                    removeTitle={{ de: 'Abschnittsbild entfernen?', en: 'Remove section image?' }[locale]}
                                    removeDescription={
                                        {
                                            de: 'Das Abschnittsbild wird aus dem Entwurf entfernt. Speichern übernimmt die Änderung.',
                                            en: 'The section image is removed from the draft. Saving applies the change.',
                                        }[locale]
                                    }
                                />
                                <label className="flex items-start gap-2 text-sm">
                                    <Checkbox
                                        checked={values.firstSectionImageOverlay}
                                        onCheckedChange={(checked) => patchPartnerValues({ firstSectionImageOverlay: checked === true })}
                                        className="mt-0.5"
                                    />
                                    <span className="flex flex-col gap-0.5">
                                        <span className="font-medium">
                                            {{ de: 'Dunkles Overlay auf CTA-Bild', en: 'Dark overlay on CTA image' }[locale]}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {
                                                {
                                                    de: 'Verlauf über dem Abschnittsbild für weiße Texte. Ausschalten, wenn nicht nötig.',
                                                    en: 'Gradient over the section image for white text. Turn off when not needed.',
                                                }[locale]
                                            }
                                        </span>
                                    </span>
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'CTA-Link', en: 'CTA link' }[locale]}</span>
                                    <Input
                                        value={values.firstSectionCtaUrl}
                                        onChange={(e) => patchPartnerValues({ firstSectionCtaUrl: e.target.value })}
                                        placeholder="/booking-request/form"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        {
                                            {
                                                de: 'Optional. Leer lassen für das Buchungsformular. Absolute http(s)-URL oder pfadrelativer Link.',
                                                en: 'Optional. Leave empty for the booking form. Absolute http(s) URL or site-relative path.',
                                            }[locale]
                                        }
                                    </span>
                                </label>
                            </CardContent>
                        </Card>

                        <Card className="gap-4 py-4" data-content-editor-anchor="location">
                            <CardHeader className="px-4">
                                <CardTitle>{{ de: 'Standort', en: 'Location' }[locale]}</CardTitle>
                                <CardDescription>
                                    {
                                        {
                                            de: 'Optional. Wird für /booking-request/plan?partnerId=… vorausgefüllt. URL-Parameter überschreiben den Ort.',
                                            en: 'Optional. Prefills /booking-request/plan?partnerId=…. URL params override the venue.',
                                        }[locale]
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 px-4">
                                <Combobox
                                    filter={null}
                                    items={suggestions.map((suggestion) => suggestion.displayText)}
                                    value={values.locationAddress?.displayText ?? null}
                                    inputValue={values.locationSearchText}
                                    onValueChange={(next) => {
                                        if (next == null) {
                                            patchPartnerValues({ locationAddress: null, locationSearchText: '' });
                                            return;
                                        }
                                        const match = suggestions.find((suggestion) => suggestion.displayText === next);
                                        if (!match) return;
                                        const address = addressFromSuggestion(match);
                                        if (!address) {
                                            toast.error(
                                                {
                                                    de: 'Bitte eine vollständige Adresse wählen.',
                                                    en: 'Please choose a full address.',
                                                }[locale],
                                            );
                                            return;
                                        }
                                        patchPartnerValues({
                                            locationAddress: address,
                                            locationSearchText: match.displayText,
                                        });
                                    }}
                                    onInputValueChange={(next) => {
                                        const clearAddress = values.locationAddress != null && next !== values.locationAddress.displayText;
                                        patchPartnerValues({
                                            locationSearchText: next,
                                            ...(clearAddress ? { locationAddress: null } : {}),
                                        });
                                    }}
                                    itemToStringLabel={(item: string) => item}
                                >
                                    <ComboboxInput
                                        className="w-full"
                                        placeholder={
                                            {
                                                de: 'Musterstraße 1, 80331 München',
                                                en: '123 Main Street, 12345 Springfield',
                                            }[locale]
                                        }
                                        showClear={values.locationAddress != null}
                                    />
                                    <ComboboxContent>
                                        <ComboboxEmpty>
                                            {suggestionsFetching
                                                ? { de: 'Suche…', en: 'Searching…' }[locale]
                                                : { de: 'Keine Treffer.', en: 'No matches.' }[locale]}
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
                            </CardContent>
                        </Card>

                        <Card className="gap-4 py-4" data-content-editor-anchor="first-section">
                            <CardHeader className="px-4">
                                <CardTitle>{{ de: 'Promo-Code', en: 'Promo code' }[locale]}</CardTitle>
                                <CardDescription>
                                    {
                                        {
                                            de: 'Optionaler Rabatt auf der CTA-Karte. Abgelaufene Codes werden öffentlich ausgeblendet.',
                                            en: 'Optional discount on the CTA card. Expired codes are hidden on the public page.',
                                        }[locale]
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 px-4">
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">
                                        {{ de: 'Zugewiesener Promo-Code', en: 'Assigned promo code' }[locale]}
                                    </span>
                                    <Select
                                        value={values.promoCodeId ?? '__none__'}
                                        onValueChange={(value) => patchPartnerValues({ promoCodeId: value === '__none__' ? null : value })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">
                                                {{ de: 'Kein Promo-Code', en: 'No promo code' }[locale]}
                                            </SelectItem>
                                            {promoCodes.map((promoCode) => {
                                                const expired = new Date(promoCode.expiresAt) <= new Date();
                                                const amount = formatCurrency(promoCode.amountCents, {
                                                    locale,
                                                    maximumFractionDigits: 0,
                                                });
                                                const expiredLabel = expired ? { de: 'abgelaufen', en: 'expired' }[locale] : undefined;
                                                return (
                                                    <SelectItem key={promoCode.promoCodeId} value={promoCode.promoCodeId}>
                                                        {promoCode.redeemCode} · {amount}
                                                        {expiredLabel ? ` (${expiredLabel})` : ''}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </label>
                            </CardContent>
                        </Card>

                        <Card className="gap-4 py-4" data-content-editor-anchor="how-it-works">
                            <CardHeader className="px-4">
                                <CardTitle>{{ de: 'So funktioniert es', en: 'How it works' }[locale]}</CardTitle>
                                <CardDescription>
                                    {
                                        {
                                            de: 'Der Abschnitt erscheint auf der Partnerseite unter den Bewertungen.',
                                            en: 'This section appears on the partner page below testimonials.',
                                        }[locale]
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 px-4">
                                <label className="flex items-start gap-2 text-sm">
                                    <Checkbox
                                        checked={values.howItWorksAlternativeMedia}
                                        onCheckedChange={(checked) => patchPartnerValues({ howItWorksAlternativeMedia: checked === true })}
                                        className="mt-0.5"
                                    />
                                    <span className="flex flex-col gap-0.5">
                                        <span className="font-medium">
                                            {{ de: 'Alternative Medien verwenden', en: 'Use alternative media' }[locale]}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {
                                                {
                                                    de: 'Andere Videos und Bilder für Partner mit speziellem Bildmaterial (z. B. Ferienhäuser).',
                                                    en: 'Different videos and images for partners with special footage (e.g. holiday homes).',
                                                }[locale]
                                            }
                                        </span>
                                    </span>
                                </label>
                            </CardContent>
                        </Card>

                        <ContentPageFeaturedCooksEditor
                            locale={locale}
                            assignedIds={assignedIds}
                            candidates={candidates}
                            busy={busy}
                            candidateSearch={cookSearch}
                            onCandidateSearchChange={setCookSearch}
                            emptyHint={
                                {
                                    de: 'Leer lassen: auf der Partnerseite werden keine Köche gezeigt.',
                                    en: 'Leave empty: the partner page shows no chefs.',
                                }[locale]
                            }
                            onSave={async (cookIds) => {
                                const result = await updateCooks({ partnerId, cookIds });
                                if (result.error || !result.data?.admin.partnerCooksUpdate.success) {
                                    throw new Error('cooks update failed');
                                }
                                setAssignedCooks(
                                    cookIds.map((cookId, position) => {
                                        const existing = assignedCooks.find((row) => row.cook.cookId === cookId);
                                        if (existing) return { ...existing, position };
                                        const searched = searchCandidates.find((cook) => cook.cookId === cookId);
                                        return {
                                            position,
                                            isPubliclyListed: searched?.isPubliclyListed ?? false,
                                            cook: {
                                                cookId,
                                                isVisible: searched?.isPubliclyListed ?? false,
                                                isApprovedByAdmin: searched?.isPubliclyListed ?? false,
                                                cuisineStyle: searched?.cuisineStyle ?? null,
                                                cookingPhilosophy: null,
                                                exactTravelOriginAddress: searched?.city
                                                    ? {
                                                          city: searched.city,
                                                          displayText: searched.city,
                                                          latitude: 0,
                                                          longitude: 0,
                                                          addressLine1: '',
                                                          addressLine2: '',
                                                          postCode: '',
                                                          state: '',
                                                          country: '',
                                                      }
                                                    : null,
                                                user: {
                                                    userId: cookId,
                                                    firstName: searched?.displayName ?? cookId.slice(0, 8),
                                                    lastName: '',
                                                    status: searched?.userStatus ?? 'ACTIVE',
                                                },
                                            },
                                        };
                                    }),
                                );
                            }}
                        />

                        <ContentPageTestimonialsEditor
                            locale={locale}
                            assignedEntries={testimonialEntries}
                            candidates={testimonialCandidates}
                            busy={busy}
                            emptyHint={
                                {
                                    de: 'Leer lassen: auf der Partnerseite werden keine Bewertungen gezeigt.',
                                    en: 'Leave empty: the partner page shows no testimonials.',
                                }[locale]
                            }
                            onSave={async (entries) => {
                                const result = await updateTestimonials({ partnerId, entries });
                                if (result.error || !result.data?.admin.partnerTestimonialsUpdate.success) {
                                    throw new Error('testimonials update failed');
                                }
                                setTestimonialEntries(entries);
                            }}
                        />
                    </>
                }
                onSave={async (next) => {
                    setBusy(true);
                    try {
                        const current = valuesRef.current;
                        const result = await upsert({
                            input: {
                                partnerId,
                                pathName: current.pathName,
                                name: current.name,
                                titleDe: current.titleDe,
                                titleEn: current.titleEn,
                                descriptionDe: current.descriptionDe,
                                descriptionEn: current.descriptionEn,
                                headlineDe: current.headlineDe,
                                headlineEn: current.headlineEn,
                                subHeadlineDe: current.subHeadlineDe,
                                subHeadlineEn: current.subHeadlineEn,
                                heroImageFileUploadId: current.heroImageFileUploadId,
                                firstSectionHeadlineDe: current.firstSectionHeadlineDe,
                                firstSectionHeadlineEn: current.firstSectionHeadlineEn,
                                firstSectionBodyDe: current.firstSectionBodyDe,
                                firstSectionBodyEn: current.firstSectionBodyEn,
                                firstSectionImageFileUploadId: current.firstSectionImageFileUploadId,
                                firstSectionCtaUrl: current.firstSectionCtaUrl.trim() || null,
                                heroImageOverlay: current.heroImageOverlay,
                                firstSectionImageOverlay: current.firstSectionImageOverlay,
                                howItWorksAlternativeMedia: current.howItWorksAlternativeMedia,
                                locationAddress: current.locationAddress,
                                promoCodeId: current.promoCodeId,
                                sections: contentSectionsToInput(current.sections),
                                // `next.publishedAt` may be newer than valuesRef when publish/schedule runs.
                                publishedAt: next.publishedAt,
                            },
                        });
                        if (result.error || !result.data?.admin.partnerUpsert.success) {
                            throw new Error('upsert failed');
                        }
                        pageDirtyRef.current = false;
                    } finally {
                        setBusy(false);
                    }
                }}
                onDelete={async () => {
                    setBusy(true);
                    try {
                        const result = await remove({ partnerId });
                        if (result.error || !result.data?.admin.partnerDelete.success) {
                            throw new Error('delete failed');
                        }
                    } finally {
                        setBusy(false);
                    }
                }}
            />
        </AdminPageChrome>
    );
}
