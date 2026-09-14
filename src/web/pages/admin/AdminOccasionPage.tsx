import { notFound } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRequest, useClient, useMutation, useQuery } from 'urql';
import { pipe, subscribe } from 'wonka';

import { fileUploadPublicUrl, formatCurrency, occasionFormatsSectionEmpty, userDisplayName } from '../../../shared';
import type { OccasionFormatsSection } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/base/card';
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
import type { GqlCAdminOccasionPageQuery } from '../../graphql/generated';
import {
    AdminOccasionCooksUpdateDocument,
    AdminOccasionDeleteDocument,
    AdminOccasionPageCookSearchDocument,
    AdminOccasionPagePromoCodesDocument,
    AdminOccasionPageUpdatesDocument,
    AdminOccasionTestimonialsUpdateDocument,
    AdminOccasionUpsertDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';

export { parseContentPageEditorSearch as parseAdminOccasionPageSearch } from '../../components/ContentPageEditor';

export const adminOccasionPageTitle = { de: 'Anlass bearbeiten', en: 'Edit occasion' } as const;
export const adminOccasionPageDescription = {
    de: 'Anlassseite bearbeiten.',
    en: 'Edit occasion landing page.',
} as const;

type OccasionRow = NonNullable<NonNullable<NonNullable<GqlCAdminOccasionPageQuery['currentSession']['user']>['admin']>['occasion']>;

type OccasionEditorValues = ContentPageEditorValues & {
    name: string;
    firstSectionHeadlineDe: string;
    firstSectionHeadlineEn: string;
    firstSectionBodyDe: string;
    firstSectionBodyEn: string;
    firstSectionImageFileUploadId: string | null;
    formatsSection: OccasionFormatsSection;
    promoCodeId: string | null;
};

function formatsCardFromGql(card: OccasionRow['formatsSection']['cards'][number] | undefined) {
    const empty = occasionFormatsSectionEmpty().cards[0];
    if (!card) return empty;
    return {
        imageFileUploadId: card.imageFileUploadId ?? null,
        titleDe: card.titleDe,
        titleEn: card.titleEn,
        bodyDe: card.bodyDe,
        bodyEn: card.bodyEn,
        fact1De: card.fact1De,
        fact1En: card.fact1En,
        fact2De: card.fact2De,
        fact2En: card.fact2En,
        fact3De: card.fact3De,
        fact3En: card.fact3En,
    };
}

function formatsSectionFromOccasion(occasion: OccasionRow): OccasionFormatsSection {
    const cards = occasion.formatsSection.cards;
    return {
        titleDe: occasion.formatsSection.titleDe,
        titleEn: occasion.formatsSection.titleEn,
        subtitleDe: occasion.formatsSection.subtitleDe,
        subtitleEn: occasion.formatsSection.subtitleEn,
        cards: [formatsCardFromGql(cards[0]), formatsCardFromGql(cards[1]), formatsCardFromGql(cards[2])],
    };
}

function formatsSectionForPreview(section: OccasionFormatsSection) {
    const withUrl = (card: OccasionFormatsSection['cards'][number]) => ({
        ...card,
        imageUrl: card.imageFileUploadId ? fileUploadPublicUrl(card.imageFileUploadId) : null,
    });
    return {
        titleDe: section.titleDe,
        titleEn: section.titleEn,
        subtitleDe: section.subtitleDe,
        subtitleEn: section.subtitleEn,
        cards: [withUrl(section.cards[0]), withUrl(section.cards[1]), withUrl(section.cards[2])] as const,
    };
}

function patchFormatsCard(
    section: OccasionFormatsSection,
    index: 0 | 1 | 2,
    patch: Partial<OccasionFormatsSection['cards'][number]>,
): OccasionFormatsSection {
    const cards = [...section.cards] as OccasionFormatsSection['cards'];
    cards[index] = { ...cards[index], ...patch };
    return { ...section, cards };
}

function testimonialEntryFromAdmin(row: OccasionRow['testimonials'][number]): TestimonialEntry {
    return row.testimonial.__typename === 'AdminCustomerTestimonial'
        ? { testimonialType: 'CUSTOMER', testimonialId: row.testimonial.customerTestimonialId }
        : { testimonialType: 'COOK', testimonialId: row.testimonial.cookTestimonialId };
}

function valuesFromOccasion(occasion: OccasionRow): OccasionEditorValues {
    return {
        pathName: occasion.pathName,
        name: occasion.name,
        titleDe: occasion.titleDe,
        titleEn: occasion.titleEn,
        descriptionDe: occasion.descriptionDe,
        descriptionEn: occasion.descriptionEn,
        headlineDe: occasion.headlineDe,
        headlineEn: occasion.headlineEn,
        subHeadlineDe: occasion.subHeadlineDe,
        subHeadlineEn: occasion.subHeadlineEn,
        heroImageFileUploadId: occasion.heroImageFileUploadId ?? null,
        firstSectionHeadlineDe: occasion.firstSectionHeadlineDe,
        firstSectionHeadlineEn: occasion.firstSectionHeadlineEn,
        firstSectionBodyDe: occasion.firstSectionBodyDe,
        firstSectionBodyEn: occasion.firstSectionBodyEn,
        firstSectionImageFileUploadId: occasion.firstSectionImageFileUploadId ?? null,
        formatsSection: formatsSectionFromOccasion(occasion),
        promoCodeId: occasion.promoCodeId ?? null,
        sections: contentSectionsFromGql(occasion.sections),
        publishedAt: occasion.publishedAt,
    };
}

export function AdminOccasionPage({
    data,
    occasionId,
    search,
}: {
    data: GqlCAdminOccasionPageQuery;
    occasionId: string;
    search: ContentPageEditorSearch;
}) {
    const locale = useLocale();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedOccasion = seedAdmin?.occasion ?? null;
    if (!seedOccasion) throw notFound();

    const [values, setValues] = useState<OccasionEditorValues>(() => valuesFromOccasion(seedOccasion));
    const [assignedCooks, setAssignedCooks] = useState(seedOccasion.cooks);
    const [testimonialEntries, setTestimonialEntries] = useState<TestimonialEntry[]>(() =>
        seedOccasion.testimonials.map(testimonialEntryFromAdmin),
    );
    const [busy, setBusy] = useState(false);
    const [cookSearch, setCookSearch] = useState('');
    const debouncedCookSearch = useDebouncedValue(cookSearch, 300);
    // Cook/testimonial saves emit the same occasion subscription as page upserts; skip
    // overwriting the form while the operator still has unsaved page edits.
    const pageDirtyRef = useRef(false);
    const valuesRef = useRef(values);
    valuesRef.current = values;
    const [, upsert] = useMutation(AdminOccasionUpsertDocument);
    const [, remove] = useMutation(AdminOccasionDeleteDocument);
    const [, updateCooks] = useMutation(AdminOccasionCooksUpdateDocument);
    const [, updateTestimonials] = useMutation(AdminOccasionTestimonialsUpdateDocument);
    const tab = contentPageEditorTabFromSearch(search);

    function markPageDirty() {
        pageDirtyRef.current = true;
    }

    function patchOccasionValues(partial: Partial<OccasionEditorValues>) {
        markPageDirty();
        setValues((prev) => {
            const next = { ...prev, ...partial };
            valuesRef.current = next;
            return next;
        });
    }

    function patchFormatsSection(partial: Partial<Omit<OccasionFormatsSection, 'cards'>>) {
        markPageDirty();
        setValues((prev) => {
            const next = { ...prev, formatsSection: { ...prev.formatsSection, ...partial } };
            valuesRef.current = next;
            return next;
        });
    }

    function patchFormatsCardAt(index: 0 | 1 | 2, patch: Partial<OccasionFormatsSection['cards'][number]>) {
        markPageDirty();
        setValues((prev) => {
            const next = {
                ...prev,
                formatsSection: patchFormatsCard(prev.formatsSection, index, patch),
            };
            valuesRef.current = next;
            return next;
        });
    }

    const [{ data: cookSearchData }] = useQuery({
        query: AdminOccasionPageCookSearchDocument,
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
        query: AdminOccasionPagePromoCodesDocument,
        variables: {
            criterion: { skip: 0, take: 100 },
        },
    });

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminOccasionPageUpdatesDocument, { occasionId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.occasion;
                if (!next) return;
                if (!pageDirtyRef.current) setValues(valuesFromOccasion(next));
                setAssignedCooks(next.cooks);
                setTestimonialEntries(next.testimonials.map(testimonialEntryFromAdmin));
            }),
        );
        return unsubscribe;
    }, [client, occasionId, seedAdmin]);

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
                { label: { de: 'Anlässe', en: 'Occasions' }[locale], to: '/{-$locale}/admin/occasions' },
                { label: values.name.trim() || { de: 'Anlass', en: 'Occasion' }[locale] },
            ]}
        >
            <ContentPageEditor
                uiLocale={locale}
                values={values}
                onChange={(partial) => patchOccasionValues(partial)}
                busy={busy}
                listTo="/{-$locale}/admin/occasions"
                detail={{ to: '/{-$locale}/admin/occasions/$occasionId', params: { occasionId } }}
                tab={tab}
                user={data.currentSession.user}
                featuredCooks={previewCooks}
                chefForAnyOccasion={{
                    displayName: values.name.trim() || { de: 'Anlass', en: 'Occasion' }[locale],
                    headlineDe: values.firstSectionHeadlineDe,
                    headlineEn: values.firstSectionHeadlineEn,
                    bodyDe: values.firstSectionBodyDe,
                    bodyEn: values.firstSectionBodyEn,
                    imageUrl: values.firstSectionImageFileUploadId ? fileUploadPublicUrl(values.firstSectionImageFileUploadId) : null,
                    promo: previewPromo,
                }}
                formatsSection={formatsSectionForPreview(values.formatsSection)}
                identityFields={
                    <Card className="gap-4 py-4" data-content-editor-anchor="top">
                        <CardHeader className="px-4">
                            <CardTitle>{{ de: 'Anlassname', en: 'Occasion name' }[locale]}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 px-4">
                            <label className="flex flex-col gap-1.5 text-sm">
                                <span className="font-medium">{{ de: 'Name', en: 'Name' }[locale]}</span>
                                <Input value={values.name} onChange={(e) => patchOccasionValues({ name: e.target.value })} />
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
                                            de: 'Headline, Text und Bild neben der CTA-Karte auf der Anlassseite.',
                                            en: 'Headline, body, and image beside the CTA card on the occasion page.',
                                        }[locale]
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 px-4">
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Headline (DE)', en: 'Headline (DE)' }[locale]}</span>
                                    <Input
                                        value={values.firstSectionHeadlineDe}
                                        onChange={(e) => patchOccasionValues({ firstSectionHeadlineDe: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Headline (EN)', en: 'Headline (EN)' }[locale]}</span>
                                    <Input
                                        value={values.firstSectionHeadlineEn}
                                        onChange={(e) => patchOccasionValues({ firstSectionHeadlineEn: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Text (DE)', en: 'Body (DE)' }[locale]}</span>
                                    <Textarea
                                        value={values.firstSectionBodyDe}
                                        onChange={(e) => patchOccasionValues({ firstSectionBodyDe: e.target.value })}
                                        rows={4}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Text (EN)', en: 'Body (EN)' }[locale]}</span>
                                    <Textarea
                                        value={values.firstSectionBodyEn}
                                        onChange={(e) => patchOccasionValues({ firstSectionBodyEn: e.target.value })}
                                        rows={4}
                                    />
                                </label>
                                <ContentImageField
                                    fileUploadId={values.firstSectionImageFileUploadId}
                                    uiLocale={locale}
                                    onUploadStart={markPageDirty}
                                    onChange={(firstSectionImageFileUploadId) => patchOccasionValues({ firstSectionImageFileUploadId })}
                                    label={{ de: 'Abschnittsbild', en: 'Section image' }[locale]}
                                    removeTitle={{ de: 'Abschnittsbild entfernen?', en: 'Remove section image?' }[locale]}
                                    removeDescription={
                                        {
                                            de: 'Das Abschnittsbild wird aus dem Entwurf entfernt. Speichern übernimmt die Änderung.',
                                            en: 'The section image is removed from the draft. Saving applies the change.',
                                        }[locale]
                                    }
                                />
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
                                        onValueChange={(value) => patchOccasionValues({ promoCodeId: value === '__none__' ? null : value })}
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

                        <Card className="gap-4 py-4" data-content-editor-anchor="formats">
                            <CardHeader className="px-4">
                                <CardTitle>{{ de: 'Formate', en: 'Formats' }[locale]}</CardTitle>
                                <CardDescription>
                                    {
                                        {
                                            de: 'Drei feste Format-Karten unter dem CTA-Abschnitt (Titel, Text, Bild und drei Details).',
                                            en: 'Three fixed format cards below the CTA section (title, body, image, and three details).',
                                        }[locale]
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-6 px-4">
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Titel (DE)', en: 'Title (DE)' }[locale]}</span>
                                    <Input
                                        value={values.formatsSection.titleDe}
                                        onChange={(e) => patchFormatsSection({ titleDe: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Titel (EN)', en: 'Title (EN)' }[locale]}</span>
                                    <Input
                                        value={values.formatsSection.titleEn}
                                        onChange={(e) => patchFormatsSection({ titleEn: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Untertitel (DE)', en: 'Subtitle (DE)' }[locale]}</span>
                                    <Textarea
                                        value={values.formatsSection.subtitleDe}
                                        onChange={(e) => patchFormatsSection({ subtitleDe: e.target.value })}
                                        rows={3}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{{ de: 'Untertitel (EN)', en: 'Subtitle (EN)' }[locale]}</span>
                                    <Textarea
                                        value={values.formatsSection.subtitleEn}
                                        onChange={(e) => patchFormatsSection({ subtitleEn: e.target.value })}
                                        rows={3}
                                    />
                                </label>

                                {([0, 1, 2] as const).map((index) => {
                                    const card = values.formatsSection.cards[index];
                                    return (
                                        <div key={index} className="flex flex-col gap-3 rounded-lg border p-4">
                                            <p className="text-sm font-medium">
                                                {
                                                    {
                                                        de: `Karte ${index + 1}`,
                                                        en: `Card ${index + 1}`,
                                                    }[locale]
                                                }
                                            </p>
                                            <ContentImageField
                                                fileUploadId={card.imageFileUploadId}
                                                uiLocale={locale}
                                                onUploadStart={markPageDirty}
                                                onChange={(imageFileUploadId) => patchFormatsCardAt(index, { imageFileUploadId })}
                                                label={{ de: 'Kartenbild', en: 'Card image' }[locale]}
                                                removeTitle={{ de: 'Kartenbild entfernen?', en: 'Remove card image?' }[locale]}
                                                removeDescription={
                                                    {
                                                        de: 'Das Kartenbild wird aus dem Entwurf entfernt. Speichern übernimmt die Änderung.',
                                                        en: 'The card image is removed from the draft. Saving applies the change.',
                                                    }[locale]
                                                }
                                            />
                                            <label className="flex flex-col gap-1.5 text-sm">
                                                <span className="font-medium">{{ de: 'Titel (DE)', en: 'Title (DE)' }[locale]}</span>
                                                <Input
                                                    value={card.titleDe}
                                                    onChange={(e) =>
                                                        patchFormatsCardAt(index, {
                                                            titleDe: e.target.value,
                                                        })
                                                    }
                                                />
                                            </label>
                                            <label className="flex flex-col gap-1.5 text-sm">
                                                <span className="font-medium">{{ de: 'Titel (EN)', en: 'Title (EN)' }[locale]}</span>
                                                <Input
                                                    value={card.titleEn}
                                                    onChange={(e) =>
                                                        patchFormatsCardAt(index, {
                                                            titleEn: e.target.value,
                                                        })
                                                    }
                                                />
                                            </label>
                                            <label className="flex flex-col gap-1.5 text-sm">
                                                <span className="font-medium">{{ de: 'Text (DE)', en: 'Body (DE)' }[locale]}</span>
                                                <Textarea
                                                    value={card.bodyDe}
                                                    onChange={(e) =>
                                                        patchFormatsCardAt(index, {
                                                            bodyDe: e.target.value,
                                                        })
                                                    }
                                                    rows={3}
                                                />
                                            </label>
                                            <label className="flex flex-col gap-1.5 text-sm">
                                                <span className="font-medium">{{ de: 'Text (EN)', en: 'Body (EN)' }[locale]}</span>
                                                <Textarea
                                                    value={card.bodyEn}
                                                    onChange={(e) =>
                                                        patchFormatsCardAt(index, {
                                                            bodyEn: e.target.value,
                                                        })
                                                    }
                                                    rows={3}
                                                />
                                            </label>
                                            <div className="grid gap-3 @md:grid-cols-3">
                                                {(
                                                    [
                                                        ['fact1De', 'fact1En'],
                                                        ['fact2De', 'fact2En'],
                                                        ['fact3De', 'fact3En'],
                                                    ] as const
                                                ).map(([deKey, enKey], factIndex) => (
                                                    <div key={deKey} className="flex flex-col gap-3">
                                                        <label className="flex flex-col gap-1.5 text-sm">
                                                            <span className="font-medium">
                                                                {
                                                                    {
                                                                        de: `Detail ${factIndex + 1} (DE)`,
                                                                        en: `Detail ${factIndex + 1} (DE)`,
                                                                    }[locale]
                                                                }
                                                            </span>
                                                            <Input
                                                                value={card[deKey]}
                                                                onChange={(e) =>
                                                                    patchFormatsCardAt(index, {
                                                                        [deKey]: e.target.value,
                                                                    })
                                                                }
                                                            />
                                                        </label>
                                                        <label className="flex flex-col gap-1.5 text-sm">
                                                            <span className="font-medium">
                                                                {
                                                                    {
                                                                        de: `Detail ${factIndex + 1} (EN)`,
                                                                        en: `Detail ${factIndex + 1} (EN)`,
                                                                    }[locale]
                                                                }
                                                            </span>
                                                            <Input
                                                                value={card[enKey]}
                                                                onChange={(e) =>
                                                                    patchFormatsCardAt(index, {
                                                                        [enKey]: e.target.value,
                                                                    })
                                                                }
                                                            />
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
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
                                    de: 'Leer lassen: auf der Anlassseite werden keine Köche gezeigt.',
                                    en: 'Leave empty: the occasion page shows no chefs.',
                                }[locale]
                            }
                            onSave={async (cookIds) => {
                                const result = await updateCooks({ occasionId, cookIds });
                                if (result.error || !result.data?.admin.occasionCooksUpdate.success) {
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
                                    de: 'Leer lassen: auf der Anlassseite werden keine Bewertungen gezeigt.',
                                    en: 'Leave empty: the occasion page shows no testimonials.',
                                }[locale]
                            }
                            onSave={async (entries) => {
                                const result = await updateTestimonials({ occasionId, entries });
                                if (result.error || !result.data?.admin.occasionTestimonialsUpdate.success) {
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
                                occasionId,
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
                                formatsSection: current.formatsSection,
                                promoCodeId: current.promoCodeId,
                                sections: contentSectionsToInput(current.sections),
                                publishedAt: next.publishedAt,
                            },
                        });
                        if (result.error || !result.data?.admin.occasionUpsert.success) {
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
                        const result = await remove({ occasionId });
                        if (result.error || !result.data?.admin.occasionDelete.success) {
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
