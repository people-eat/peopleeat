import { notFound } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { contentLocaleText, fileUploadPublicUrl, userDisplayName } from '../../../shared';
import { AdminCityCenterField } from '../../components/AdminCityCenterField';
import type { CityCenterSelection } from '../../components/AdminCityCenterField';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/base/card';
import { Input } from '../../components/base/input';
import { Textarea } from '../../components/base/textarea';
import { ContentImageField, ContentPageEditor, contentPageEditorTabFromSearch } from '../../components/ContentPageEditor';
import type { ContentPageEditorSearch, ContentPageEditorValues } from '../../components/ContentPageEditor';
import { ContentPageFeaturedCooksEditor } from '../../components/ContentPageFeaturedCooksEditor';
import type { FeaturedCookOption } from '../../components/ContentPageFeaturedCooksEditor';
import { ContentPageTestimonialsEditor } from '../../components/ContentPageTestimonialsEditor';
import type { TestimonialCandidateOption, TestimonialEntry } from '../../components/ContentPageTestimonialsEditor';
import { contentSectionsFromGql, contentSectionsToInput } from '../../components/contentSectionsMap';
import type { GqlCAdminCityPageQuery } from '../../graphql/generated';
import {
    AdminCityCooksUpdateDocument,
    AdminCityDeleteDocument,
    AdminCityPageLocationSuggestionsDocument,
    AdminCityPageUpdatesDocument,
    AdminCityTestimonialsUpdateDocument,
    AdminCityUpsertDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { CITY_CHEF_CTA_FALLBACK_IMAGE, CITY_HERO_FALLBACK_IMAGE } from '../cityPageAssets';

export { parseContentPageEditorSearch as parseAdminCityPageSearch } from '../../components/ContentPageEditor';

export const adminCityPageTitle = { de: 'Stadt bearbeiten', en: 'Edit city' } as const;
export const adminCityPageDescription = {
    de: 'Stadtseite bearbeiten.',
    en: 'Edit city landing page.',
} as const;

type CityEditorValues = ContentPageEditorValues & {
    nameDe: string;
    nameEn: string;
    latitude: number;
    longitude: number;
    firstSectionHeadlineDe: string;
    firstSectionHeadlineEn: string;
    firstSectionBodyDe: string;
    firstSectionBodyEn: string;
    firstSectionImageFileUploadId: string | null;
};

type CityRow = NonNullable<NonNullable<NonNullable<GqlCAdminCityPageQuery['currentSession']['user']>['admin']>['city']>;
type AdminCookCard = CityRow['cooksInTravelRadius'][number];

function testimonialEntryFromAdmin(row: CityRow['testimonials'][number]): TestimonialEntry {
    return row.testimonial.__typename === 'AdminCustomerTestimonial'
        ? { testimonialType: 'CUSTOMER', testimonialId: row.testimonial.customerTestimonialId }
        : { testimonialType: 'COOK', testimonialId: row.testimonial.cookTestimonialId };
}

function valuesFromCity(city: CityRow): CityEditorValues {
    return {
        pathName: city.pathName,
        nameDe: city.nameDe,
        nameEn: city.nameEn,
        latitude: city.latitude,
        longitude: city.longitude,
        titleDe: city.titleDe,
        titleEn: city.titleEn,
        descriptionDe: city.descriptionDe,
        descriptionEn: city.descriptionEn,
        headlineDe: city.headlineDe,
        headlineEn: city.headlineEn,
        subHeadlineDe: city.subHeadlineDe,
        subHeadlineEn: city.subHeadlineEn,
        heroImageFileUploadId: city.heroImageFileUploadId ?? null,
        firstSectionHeadlineDe: city.firstSectionHeadlineDe,
        firstSectionHeadlineEn: city.firstSectionHeadlineEn,
        firstSectionBodyDe: city.firstSectionBodyDe,
        firstSectionBodyEn: city.firstSectionBodyEn,
        firstSectionImageFileUploadId: city.firstSectionImageFileUploadId ?? null,
        sections: contentSectionsFromGql(city.sections),
        publishedAt: city.publishedAt,
    };
}

function centerFromCity(city: CityRow): CityCenterSelection {
    return {
        latitude: city.latitude,
        longitude: city.longitude,
        displayText: city.nameDe,
    };
}

function optionFromAdminCook(cook: AdminCookCard, isPubliclyListed: boolean): FeaturedCookOption {
    return {
        cookId: cook.cookId,
        displayName: userDisplayName(cook.user),
        city: cook.exactTravelOriginAddress?.city ?? null,
        cuisineStyle: cook.cuisineStyle ?? null,
        isPubliclyListed,
        userStatus: cook.user.status,
    };
}

export function AdminCityPage({ data, cityId, search }: { data: GqlCAdminCityPageQuery; cityId: string; search: ContentPageEditorSearch }) {
    const locale = useLocale();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedCity = seedAdmin?.city ?? null;
    if (!seedCity) throw notFound();

    const [values, setValues] = useState<CityEditorValues>(() => valuesFromCity(seedCity));
    const [center, setCenter] = useState<CityCenterSelection | null>(() => centerFromCity(seedCity));
    const [assignedCooks, setAssignedCooks] = useState(seedCity.cooks);
    const [cooksInTravelRadius, setCooksInTravelRadius] = useState(seedCity.cooksInTravelRadius);
    const [testimonialEntries, setTestimonialEntries] = useState<TestimonialEntry[]>(() =>
        seedCity.testimonials.map(testimonialEntryFromAdmin),
    );
    const [busy, setBusy] = useState(false);
    // Cook/testimonial saves emit the same city subscription as page upserts; skip
    // overwriting the form while the operator still has unsaved page edits.
    const pageDirtyRef = useRef(false);
    const valuesRef = useRef(values);
    valuesRef.current = values;
    const [, upsert] = useMutation(AdminCityUpsertDocument);
    const [, remove] = useMutation(AdminCityDeleteDocument);
    const [, updateCooks] = useMutation(AdminCityCooksUpdateDocument);
    const [, updateTestimonials] = useMutation(AdminCityTestimonialsUpdateDocument);
    const tab = contentPageEditorTabFromSearch(search);

    function markPageDirty() {
        pageDirtyRef.current = true;
    }

    function patchCityValues(partial: Partial<CityEditorValues>) {
        markPageDirty();
        setValues((prev) => {
            const next = { ...prev, ...partial };
            valuesRef.current = next;
            return next;
        });
    }

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminCityPageUpdatesDocument, { cityId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.city;
                if (!next) return;
                if (!pageDirtyRef.current) {
                    setValues(valuesFromCity(next));
                    setCenter(centerFromCity(next));
                }
                setAssignedCooks(next.cooks);
                setCooksInTravelRadius(next.cooksInTravelRadius);
                setTestimonialEntries(next.testimonials.map(testimonialEntryFromAdmin));
            }),
        );
        return unsubscribe;
    }, [client, cityId, seedAdmin]);

    const cityName = { de: values.nameDe, en: values.nameEn }[locale].trim();
    const assignedIds = assignedCooks.map((row) => row.cook.cookId);
    const candidates = useMemo(() => {
        const byId = new Map<string, FeaturedCookOption>();
        for (const row of assignedCooks) {
            byId.set(row.cook.cookId, optionFromAdminCook(row.cook, row.isPubliclyListed));
        }
        for (const cook of cooksInTravelRadius) {
            if (!byId.has(cook.cookId)) {
                byId.set(cook.cookId, optionFromAdminCook(cook, true));
            }
        }
        return [...byId.values()];
    }, [assignedCooks, cooksInTravelRadius]);

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
                { label: { de: 'Städte', en: 'Cities' }[locale], to: '/{-$locale}/admin/cities' },
                { label: cityName || { de: 'Stadt', en: 'City' }[locale] },
            ]}
        >
            <ContentPageEditor
                uiLocale={locale}
                values={values}
                onChange={(partial) => patchCityValues(partial)}
                busy={busy}
                listTo="/{-$locale}/admin/cities"
                detail={{ to: '/{-$locale}/admin/cities/$cityId', params: { cityId } }}
                tab={tab}
                user={data.currentSession.user}
                featuredCooks={previewCooks}
                heroImageFallbackUrl={CITY_HERO_FALLBACK_IMAGE}
                howItWorks
                cities={data.publicCity.findMany}
                knownFrom
                chefForAnyOccasion={{
                    displayName: contentLocaleText(values.nameDe, values.nameEn, locale).trim() || { de: 'Stadt', en: 'City' }[locale],
                    headlineDe: values.firstSectionHeadlineDe,
                    headlineEn: values.firstSectionHeadlineEn,
                    bodyDe: values.firstSectionBodyDe,
                    bodyEn: values.firstSectionBodyEn,
                    imageUrl: values.firstSectionImageFileUploadId
                        ? fileUploadPublicUrl(values.firstSectionImageFileUploadId)
                        : CITY_CHEF_CTA_FALLBACK_IMAGE,
                }}
                identityFields={
                    <Card className="gap-4 py-4" data-content-editor-anchor="top">
                        <CardHeader className="px-4">
                            <CardTitle>{{ de: 'Stadtname', en: 'City name' }[locale]}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 px-4">
                            <label className="flex flex-col gap-1.5 text-sm">
                                <span className="font-medium">DE</span>
                                <Input value={values.nameDe} onChange={(e) => patchCityValues({ nameDe: e.target.value })} />
                            </label>
                            <label className="flex flex-col gap-1.5 text-sm">
                                <span className="font-medium">EN</span>
                                <Input value={values.nameEn} onChange={(e) => patchCityValues({ nameEn: e.target.value })} />
                            </label>
                            <AdminCityCenterField
                                locale={locale}
                                value={center}
                                suggestionsQuery={AdminCityPageLocationSuggestionsDocument}
                                onChange={(next) => {
                                    markPageDirty();
                                    setCenter(next);
                                    if (next) {
                                        patchCityValues({ latitude: next.latitude, longitude: next.longitude });
                                    }
                                }}
                                disabled={busy}
                            />
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
                                            de: 'Headline, Text und Bild neben der CTA-Karte auf der Stadtseite.',
                                            en: 'Headline, body, and image beside the CTA card on the city page.',
                                        }[locale]
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 px-4">
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Headline (DE)', en: 'Headline (DE)' }[locale]}</span>
                                    <Input
                                        value={values.firstSectionHeadlineDe}
                                        onChange={(e) => patchCityValues({ firstSectionHeadlineDe: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Headline (EN)', en: 'Headline (EN)' }[locale]}</span>
                                    <Input
                                        value={values.firstSectionHeadlineEn}
                                        onChange={(e) => patchCityValues({ firstSectionHeadlineEn: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Text (DE)', en: 'Body (DE)' }[locale]}</span>
                                    <Textarea
                                        value={values.firstSectionBodyDe}
                                        onChange={(e) => patchCityValues({ firstSectionBodyDe: e.target.value })}
                                        rows={4}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Text (EN)', en: 'Body (EN)' }[locale]}</span>
                                    <Textarea
                                        value={values.firstSectionBodyEn}
                                        onChange={(e) => patchCityValues({ firstSectionBodyEn: e.target.value })}
                                        rows={4}
                                    />
                                </label>
                                <ContentImageField
                                    fileUploadId={values.firstSectionImageFileUploadId}
                                    uiLocale={locale}
                                    onUploadStart={markPageDirty}
                                    onChange={(firstSectionImageFileUploadId) => patchCityValues({ firstSectionImageFileUploadId })}
                                    label={{ de: 'Abschnittsbild', en: 'Section image' }[locale]}
                                    removeTitle={{ de: 'Abschnittsbild entfernen?', en: 'Remove section image?' }[locale]}
                                    removeDescription={
                                        {
                                            de: 'Das Abschnittsbild wird aus dem Entwurf entfernt. Speichern übernimmt die Änderung. Ohne Bild gilt das Standardfoto.',
                                            en: 'The section image is removed from the draft. Saving applies the change. Without an image the default photo is used.',
                                        }[locale]
                                    }
                                />
                            </CardContent>
                        </Card>
                        <ContentPageFeaturedCooksEditor
                            locale={locale}
                            assignedIds={assignedIds}
                            candidates={candidates}
                            busy={busy}
                            emptyHint={
                                {
                                    de: 'Leer lassen: öffentliche Seite zeigt Köche im Anfahrtsradius automatisch.',
                                    en: 'Leave empty: the public page shows chefs in travel radius automatically.',
                                }[locale]
                            }
                            onSave={async (cookIds) => {
                                const result = await updateCooks({ cityId, cookIds });
                                if (result.error || !result.data?.admin.cityCooksUpdate.success) {
                                    throw new Error('cooks update failed');
                                }
                                setAssignedCooks(
                                    cookIds.map((cookId, position) => {
                                        const existing = assignedCooks.find((row) => row.cook.cookId === cookId);
                                        if (existing) return { ...existing, position };
                                        const radius = cooksInTravelRadius.find((cook) => cook.cookId === cookId);
                                        if (!radius) {
                                            return {
                                                position,
                                                isPubliclyListed: false,
                                                cook: {
                                                    cookId,
                                                    isVisible: false,
                                                    isApprovedByAdmin: false,
                                                    cuisineStyle: null,
                                                    cookingPhilosophy: null,
                                                    exactTravelOriginAddress: null,
                                                    user: {
                                                        userId: cookId,
                                                        firstName: cookId.slice(0, 8),
                                                        lastName: '',
                                                        status: 'ACTIVE' as const,
                                                    },
                                                },
                                            };
                                        }
                                        return { position, isPubliclyListed: true, cook: radius };
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
                                    de: 'Leer lassen: öffentliche Seite zeigt keine Bewertungen.',
                                    en: 'Leave empty: the public page shows no testimonials.',
                                }[locale]
                            }
                            onSave={async (entries) => {
                                const result = await updateTestimonials({ cityId, entries });
                                if (result.error || !result.data?.admin.cityTestimonialsUpdate.success) {
                                    throw new Error('testimonials update failed');
                                }
                                setTestimonialEntries(entries);
                            }}
                        />
                    </>
                }
                onSave={async (next) => {
                    if (!center) {
                        toast.error({ de: 'Bitte ein Stadtzentrum wählen.', en: 'Please choose a city center.' }[locale]);
                        throw new Error('missing center');
                    }
                    setBusy(true);
                    try {
                        const current = valuesRef.current;
                        const result = await upsert({
                            input: {
                                cityId,
                                pathName: current.pathName,
                                nameDe: current.nameDe,
                                nameEn: current.nameEn,
                                latitude: center.latitude,
                                longitude: center.longitude,
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
                                sections: contentSectionsToInput(current.sections),
                                publishedAt: next.publishedAt,
                            },
                        });
                        if (result.error || !result.data?.admin.cityUpsert.success) {
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
                        const result = await remove({ cityId });
                        if (result.error || !result.data?.admin.cityDelete.success) {
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
