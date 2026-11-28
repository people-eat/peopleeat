import { notFound } from '@tanstack/react-router';
import { SparklesIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import type { CityCountryCode } from '../../../shared';
import { cityCountryCodeLabel, cityCountryCodes, contentLocaleText, fileUploadPublicUrl, userDisplayName } from '../../../shared';
import type { CityCenterSelection } from '../../components/AdminCityCenterField';
import { AdminCityCenterField } from '../../components/AdminCityCenterField';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/base/card';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Spinner } from '../../components/base/spinner';
import { Textarea } from '../../components/base/textarea';
import type { ContentPageCmsLocale, ContentPageEditorSearch, ContentPageEditorValues } from '../../components/ContentPageEditor';
import {
    ContentImageField,
    contentPageCmsLocale,
    ContentPageEditor,
    contentPageEditorTabFromSearch,
} from '../../components/ContentPageEditor';
import type { FeaturedCookOption } from '../../components/ContentPageFeaturedCooksEditor';
import { ContentPageFeaturedCooksEditor } from '../../components/ContentPageFeaturedCooksEditor';
import type { TestimonialCandidateOption } from '../../components/ContentPageTestimonialsEditor';
import {
    adminTestimonialAssignmentFromCandidate,
    ContentPageTestimonialsEditor,
    contentPageTestimonialsForPreview,
    testimonialEntryFromAdminAssignment,
} from '../../components/ContentPageTestimonialsEditor';
import { contentSectionsFromGql, contentSectionsToInput } from '../../components/contentSectionsMap';
import type { GqlCAdminCityPageQuery, GqlCLocale } from '../../graphql/generated';
import {
    AdminCityCooksUpdateDocument,
    AdminCityCopyTranslateDocument,
    AdminCityDeleteDocument,
    AdminCityPageLocationSuggestionsDocument,
    AdminCityPageUpdatesDocument,
    AdminCityTestimonialsUpdateDocument,
    AdminCityUpsertDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { CITY_CHEF_CTA_FALLBACK_IMAGE, CITY_HERO_FALLBACK_IMAGE } from '../cityPageAssets';
import { adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import { adminTrafficRangeLastDays } from './adminTrafficSearch';
import { AdminWebPageVisitTrafficPreview } from './AdminWebPageVisitTrafficPreview';

export { parseContentPageEditorSearch as parseAdminCityPageSearch } from '../../components/ContentPageEditor';

export function adminCityPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.city.title');
}
export function adminCityPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.city.description');
}

function adminCityPageRange(now = new Date()) {
    return adminTrafficRangeLastDays(90, now);
}

export function adminCityPageVariables(cityId: string, now = new Date()) {
    const dates = adminCityPageRange(now);
    return {
        cityId,
        range: adminOverviewRangeToGraphQlVariables(dates).range,
        granularity: 'week' as const,
    };
}

type CityEditorValues = ContentPageEditorValues & {
    nameDe: string;
    nameEn: string;
    nameNl: string;
    titleNl: string;
    descriptionNl: string;
    headlineNl: string;
    subHeadlineNl: string;
    countryCode: CityCountryCode;
    latitude: number;
    longitude: number;
    firstSectionHeadlineDe: string;
    firstSectionHeadlineEn: string;
    firstSectionHeadlineNl: string;
    firstSectionBodyDe: string;
    firstSectionBodyEn: string;
    firstSectionBodyNl: string;
    firstSectionImageFileUploadId: string | null;
};

type TranslateLocale = Extract<GqlCLocale, 'en' | 'nl'>;

const CITY_CMS_LOCALES: readonly ContentPageCmsLocale[] = ['de', 'en', 'nl'];

function fieldIsEmpty(value: string): boolean {
    return value.trim().length === 0;
}

function cityNameForLocale(values: CityEditorValues, locale: Locale): string {
    return contentLocaleText(values.nameDe, values.nameEn, locale, values.nameNl).trim();
}

type CityRow = NonNullable<NonNullable<NonNullable<GqlCAdminCityPageQuery['currentSession']['user']>['admin']>['city']>;
type AdminCookCard = CityRow['cooksInTravelRadius'][number];

function valuesFromCity(city: CityRow): CityEditorValues {
    return {
        pathName: city.pathName,
        nameDe: city.nameDe,
        nameEn: city.nameEn,
        nameNl: city.nameNl,
        countryCode: city.countryCode,
        latitude: city.latitude,
        longitude: city.longitude,
        titleDe: city.titleDe,
        titleEn: city.titleEn,
        titleNl: city.titleNl,
        descriptionDe: city.descriptionDe,
        descriptionEn: city.descriptionEn,
        descriptionNl: city.descriptionNl,
        headlineDe: city.headlineDe,
        headlineEn: city.headlineEn,
        headlineNl: city.headlineNl,
        subHeadlineDe: city.subHeadlineDe,
        subHeadlineEn: city.subHeadlineEn,
        subHeadlineNl: city.subHeadlineNl,
        heroImageFileUploadId: city.heroImageFileUploadId ?? null,
        firstSectionHeadlineDe: city.firstSectionHeadlineDe,
        firstSectionHeadlineEn: city.firstSectionHeadlineEn,
        firstSectionHeadlineNl: city.firstSectionHeadlineNl,
        firstSectionBodyDe: city.firstSectionBodyDe,
        firstSectionBodyEn: city.firstSectionBodyEn,
        firstSectionBodyNl: city.firstSectionBodyNl,
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
    const [assignedTestimonials, setAssignedTestimonials] = useState(seedCity.testimonials);
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
    const [, translate] = useMutation(AdminCityCopyTranslateDocument);
    const [translatingLocale, setTranslatingLocale] = useState<TranslateLocale | null>(null);
    const tab = contentPageEditorTabFromSearch(search, { seoTab: true });
    const trafficRange = adminCityPageRange();
    const trafficSeries = seedAdmin?.webPageVisitTraffic?.series[0] ?? null;

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
                setAssignedTestimonials(next.testimonials);
            }),
        );
        return unsubscribe;
    }, [client, cityId, seedAdmin]);

    const cityName = cityNameForLocale(values, locale);

    const germanReady =
        !fieldIsEmpty(values.nameDe) &&
        !fieldIsEmpty(values.titleDe) &&
        !fieldIsEmpty(values.descriptionDe) &&
        !fieldIsEmpty(values.headlineDe) &&
        !fieldIsEmpty(values.subHeadlineDe);

    function cityCopyForLocale(target: TranslateLocale) {
        if (target === 'en') {
            return {
                name: values.nameEn,
                title: values.titleEn,
                description: values.descriptionEn,
                headline: values.headlineEn,
                subHeadline: values.subHeadlineEn,
                firstSectionHeadline: values.firstSectionHeadlineEn,
                firstSectionBody: values.firstSectionBodyEn,
            };
        }
        return {
            name: values.nameNl,
            title: values.titleNl,
            description: values.descriptionNl,
            headline: values.headlineNl,
            subHeadline: values.subHeadlineNl,
            firstSectionHeadline: values.firstSectionHeadlineNl,
            firstSectionBody: values.firstSectionBodyNl,
        };
    }

    function targetFieldsEmpty(target: TranslateLocale): boolean {
        const current = cityCopyForLocale(target);
        const firstSectionSourceReady = !fieldIsEmpty(values.firstSectionHeadlineDe) || !fieldIsEmpty(values.firstSectionBodyDe);
        return (
            fieldIsEmpty(current.name) ||
            fieldIsEmpty(current.title) ||
            fieldIsEmpty(current.description) ||
            fieldIsEmpty(current.headline) ||
            fieldIsEmpty(current.subHeadline) ||
            (firstSectionSourceReady && (fieldIsEmpty(current.firstSectionHeadline) || fieldIsEmpty(current.firstSectionBody)))
        );
    }

    async function onTranslate(target: TranslateLocale) {
        if (!germanReady || !targetFieldsEmpty(target)) return;
        setTranslatingLocale(target);
        try {
            const result = await translate({
                locale: target,
                input: {
                    nameDe: values.nameDe,
                    titleDe: values.titleDe,
                    descriptionDe: values.descriptionDe,
                    headlineDe: values.headlineDe,
                    subHeadlineDe: values.subHeadlineDe,
                    firstSectionHeadlineDe: values.firstSectionHeadlineDe,
                    firstSectionBodyDe: values.firstSectionBodyDe,
                },
            });
            const translation = result.data?.admin.cityCopyTranslate;
            if (!translation || result.error) {
                throw new Error('translate failed');
            }
            const current = cityCopyForLocale(target);
            if (target === 'en') {
                patchCityValues({
                    nameEn: fieldIsEmpty(current.name) ? translation.name : current.name,
                    titleEn: fieldIsEmpty(current.title) ? translation.title : current.title,
                    descriptionEn: fieldIsEmpty(current.description) ? translation.description : current.description,
                    headlineEn: fieldIsEmpty(current.headline) ? translation.headline : current.headline,
                    subHeadlineEn: fieldIsEmpty(current.subHeadline) ? translation.subHeadline : current.subHeadline,
                    firstSectionHeadlineEn: fieldIsEmpty(current.firstSectionHeadline)
                        ? translation.firstSectionHeadline
                        : current.firstSectionHeadline,
                    firstSectionBodyEn: fieldIsEmpty(current.firstSectionBody) ? translation.firstSectionBody : current.firstSectionBody,
                });
            } else {
                patchCityValues({
                    nameNl: fieldIsEmpty(current.name) ? translation.name : current.name,
                    titleNl: fieldIsEmpty(current.title) ? translation.title : current.title,
                    descriptionNl: fieldIsEmpty(current.description) ? translation.description : current.description,
                    headlineNl: fieldIsEmpty(current.headline) ? translation.headline : current.headline,
                    subHeadlineNl: fieldIsEmpty(current.subHeadline) ? translation.subHeadline : current.subHeadline,
                    firstSectionHeadlineNl: fieldIsEmpty(current.firstSectionHeadline)
                        ? translation.firstSectionHeadline
                        : current.firstSectionHeadline,
                    firstSectionBodyNl: fieldIsEmpty(current.firstSectionBody) ? translation.firstSectionBody : current.firstSectionBody,
                });
            }
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotTranslate'));
        } finally {
            setTranslatingLocale(null);
        }
    }
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

    const previewCooks = assignedCooks.map((row) => ({
        cookId: row.cook.cookId,
        pathName: row.cook.pathName,
        cuisineStyle: row.cook.cuisineStyle ?? null,
        cookingPhilosophy: row.cook.cookingPhilosophy ?? null,
        city: row.cook.exactTravelOriginAddress?.city ?? null,
        isPubliclyListed: row.isPubliclyListed,
        user: {
            display: userDisplayName(row.cook.user),
            profilePicture: null,
        },
    }));

    const testimonialCandidates: TestimonialCandidateOption[] = (seedAdmin?.testimonials ?? []).flatMap(
        (row): TestimonialCandidateOption[] => {
            if (row.__typename === 'AdminCustomerTestimonial') {
                return [
                    {
                        testimonialType: 'CUSTOMER',
                        testimonialId: row.customerTestimonialId,
                        displayAuthorName: row.displayAuthorName,
                        displayLocation: row.displayLocation,
                        displayOccasion: row.displayOccasion,
                        body: row.body,
                        rating: row.rating,
                        publicationStatus: row.publicationStatus,
                    },
                ];
            }
            if (row.__typename === 'AdminCookTestimonial') {
                return [
                    {
                        testimonialType: 'COOK',
                        testimonialId: row.cookTestimonialId,
                        displayAuthorName: row.displayAuthorName,
                        displayLocation: row.displayLocation,
                        displayOccasion: row.displayOccasion,
                        body: row.cookBody,
                        rating: row.rating,
                        publicationStatus: row.publicationStatus,
                    },
                ];
            }
            return [];
        },
    );

    return (
        <AdminPageChrome
            crumbs={[
                { label: t(locale, 'admin', 'copy.cities'), to: '/{-$locale}/admin/cities' },
                { label: cityName || t(locale, 'admin', 'copy.city') },
            ]}
        >
            <ContentPageEditor
                uiLocale={locale}
                values={values}
                onChange={(partial) => patchCityValues(partial)}
                busy={busy}
                cmsLocales={CITY_CMS_LOCALES}
                localeActions={(editLocale) => {
                    const target = contentPageCmsLocale(editLocale);
                    if (target !== 'en' && target !== 'nl') return null;
                    const translateEnabled = germanReady && targetFieldsEmpty(target);
                    if (!translateEnabled) return null;
                    const translating = translatingLocale === target;
                    return (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={translating || busy}
                            onClick={() => void onTranslate(target)}
                        >
                            {translating ? <Spinner className="size-4" /> : <SparklesIcon className="size-4" aria-hidden />}
                            {translating ? t(locale, 'admin', 'copy.translating') : t(locale, 'admin', 'copy.translateFromGerman')}
                        </Button>
                    );
                }}
                listTo="/{-$locale}/admin/cities"
                detail={{ to: '/{-$locale}/admin/cities/$cityId', params: { cityId } }}
                tab={tab}
                seoTab
                seoTabContent={
                    <AdminWebPageVisitTrafficPreview
                        pageviews={trafficSeries?.pageviews ?? 0}
                        seriesLabel={cityName || t(locale, 'admin', 'copy.city')}
                        buckets={trafficSeries?.buckets ?? []}
                        trafficSearch={{
                            keys: 'CITIES',
                            cityId,
                            from: trafficRange.from,
                            to: trafficRange.to,
                            granularity: 'week',
                        }}
                    />
                }
                user={data.currentSession.user}
                featuredCooks={previewCooks}
                testimonials={contentPageTestimonialsForPreview(assignedTestimonials)}
                heroImageFallbackUrl={CITY_HERO_FALLBACK_IMAGE}
                howItWorks
                cities={data.publicCity.findMany}
                citiesCountryCode={values.countryCode}
                knownFrom
                chefForAnyOccasion={{
                    displayName: cityNameForLocale(values, locale) || t(locale, 'admin', 'copy.city'),
                    headlineDe: values.firstSectionHeadlineDe,
                    headlineEn: values.firstSectionHeadlineEn,
                    headlineNl: values.firstSectionHeadlineNl,
                    bodyDe: values.firstSectionBodyDe,
                    bodyEn: values.firstSectionBodyEn,
                    bodyNl: values.firstSectionBodyNl,
                    imageUrl: values.firstSectionImageFileUploadId
                        ? fileUploadPublicUrl(values.firstSectionImageFileUploadId)
                        : CITY_CHEF_CTA_FALLBACK_IMAGE,
                    imageAlt: values.firstSectionImageFileUploadId
                        ? t(locale, 'common', 'imageAlt.photoOf', {
                              name: cityNameForLocale(values, locale) || t(locale, 'admin', 'copy.city'),
                          })
                        : t(locale, 'public', 'cities.ctaFallbackAlt'),
                }}
                identityFields={(editLocale) => {
                    const cms = contentPageCmsLocale(editLocale);
                    const nameKey = cms === 'nl' ? 'nameNl' : cms === 'en' ? 'nameEn' : 'nameDe';
                    return (
                        <Card className="gap-4 py-4" data-content-editor-anchor="top">
                            <CardHeader className="px-4">
                                <CardTitle>{t(locale, 'admin', 'copy.cityName')}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 px-4">
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{cms.toUpperCase()}</span>
                                    <Input value={values[nameKey]} onChange={(e) => patchCityValues({ [nameKey]: e.target.value })} />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">{t(locale, 'admin', 'copy.country')}</span>
                                    <Select
                                        value={values.countryCode}
                                        onValueChange={(value) => patchCityValues({ countryCode: value as CityCountryCode })}
                                        disabled={busy}
                                    >
                                        <SelectTrigger aria-label={t(locale, 'admin', 'copy.country')}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cityCountryCodes.map((code) => (
                                                <SelectItem key={code} value={code}>
                                                    {cityCountryCodeLabel(code, locale)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                    );
                }}
                extraFields={(editLocale) => {
                    const cms = contentPageCmsLocale(editLocale);
                    const headlineKey =
                        cms === 'nl' ? 'firstSectionHeadlineNl' : cms === 'en' ? 'firstSectionHeadlineEn' : 'firstSectionHeadlineDe';
                    const bodyKey = cms === 'nl' ? 'firstSectionBodyNl' : cms === 'en' ? 'firstSectionBodyEn' : 'firstSectionBodyDe';
                    return (
                        <>
                            <Card className="gap-4 py-4" data-content-editor-anchor="first-section">
                                <CardHeader className="px-4">
                                    <CardTitle>{t(locale, 'admin', 'copy.firstSection')}</CardTitle>
                                    <CardDescription>
                                        {t(locale, 'admin', 'copy.headlineBodyAndImageBesideTheCtaCardOnTheCityPage')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-3 px-4">
                                    <label className="flex flex-col gap-1.5 text-sm">
                                        <span className="font-medium">
                                            {t(
                                                locale,
                                                'admin',
                                                cms === 'nl' ? 'copy.headlineNl' : cms === 'en' ? 'copy.headlineEn' : 'copy.headlineDe',
                                            )}
                                        </span>
                                        <Input
                                            value={values[headlineKey]}
                                            onChange={(e) => patchCityValues({ [headlineKey]: e.target.value })}
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1.5 text-sm">
                                        <span className="font-medium">
                                            {t(
                                                locale,
                                                'admin',
                                                cms === 'nl' ? 'copy.bodyNl' : cms === 'en' ? 'copy.bodyEn' : 'copy.bodyDe',
                                            )}
                                        </span>
                                        <Textarea
                                            value={values[bodyKey]}
                                            onChange={(e) => patchCityValues({ [bodyKey]: e.target.value })}
                                            rows={4}
                                        />
                                    </label>
                                    <ContentImageField
                                        fileUploadId={values.firstSectionImageFileUploadId}
                                        uiLocale={locale}
                                        onUploadStart={markPageDirty}
                                        onChange={(firstSectionImageFileUploadId) => patchCityValues({ firstSectionImageFileUploadId })}
                                        label={t(locale, 'admin', 'copy.sectionImage')}
                                        removeTitle={t(locale, 'admin', 'copy.removeSectionImage')}
                                        removeDescription={t(
                                            locale,
                                            'admin',
                                            'copy.theSectionImageIsRemovedFromTheDraftSavingAppliesTheChangeWi',
                                        )}
                                    />
                                </CardContent>
                            </Card>
                            <ContentPageFeaturedCooksEditor
                                locale={locale}
                                assignedIds={assignedIds}
                                candidates={candidates}
                                busy={busy}
                                emptyHint={t(locale, 'admin', 'copy.leaveEmptyThePublicPageShowsChefsInTravelRadiusAutomatically')}
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
                                                        pathName: cookId,
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
                                assignedEntries={assignedTestimonials.map(testimonialEntryFromAdminAssignment)}
                                candidates={testimonialCandidates}
                                busy={busy}
                                emptyHint={t(locale, 'admin', 'copy.leaveEmptyThePublicPageShowsNoTestimonials')}
                                onSave={async (entries) => {
                                    const result = await updateTestimonials({ cityId, entries });
                                    if (result.error || !result.data?.admin.cityTestimonialsUpdate.success) {
                                        throw new Error('testimonials update failed');
                                    }
                                    const byKey = new Map(
                                        testimonialCandidates.map((candidate) => [
                                            `${candidate.testimonialType}:${candidate.testimonialId}`,
                                            candidate,
                                        ]),
                                    );
                                    setAssignedTestimonials(
                                        entries.map((entry, index) =>
                                            adminTestimonialAssignmentFromCandidate(
                                                entry,
                                                index,
                                                byKey.get(`${entry.testimonialType}:${entry.testimonialId}`),
                                            ),
                                        ),
                                    );
                                }}
                            />
                        </>
                    );
                }}
                onSave={async (next) => {
                    if (!center) {
                        toast.error(t(locale, 'admin', 'copy.pleaseChooseACityCenter'));
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
                                nameNl: current.nameNl,
                                countryCode: current.countryCode,
                                latitude: center.latitude,
                                longitude: center.longitude,
                                titleDe: current.titleDe,
                                titleEn: current.titleEn,
                                titleNl: current.titleNl,
                                descriptionDe: current.descriptionDe,
                                descriptionEn: current.descriptionEn,
                                descriptionNl: current.descriptionNl,
                                headlineDe: current.headlineDe,
                                headlineEn: current.headlineEn,
                                headlineNl: current.headlineNl,
                                subHeadlineDe: current.subHeadlineDe,
                                subHeadlineEn: current.subHeadlineEn,
                                subHeadlineNl: current.subHeadlineNl,
                                heroImageFileUploadId: current.heroImageFileUploadId,
                                firstSectionHeadlineDe: current.firstSectionHeadlineDe,
                                firstSectionHeadlineEn: current.firstSectionHeadlineEn,
                                firstSectionHeadlineNl: current.firstSectionHeadlineNl,
                                firstSectionBodyDe: current.firstSectionBodyDe,
                                firstSectionBodyEn: current.firstSectionBodyEn,
                                firstSectionBodyNl: current.firstSectionBodyNl,
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
