import { useNavigate } from '@tanstack/react-router';
import { GiftIcon, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { AppImage } from '../../components/AppImage';
import { Button } from '../../components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/base/dialog';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { CookOfferAddonCard } from '../../components/CookOfferAddonCard';
import type { GqlCProfileCookOfferAddonsPageQuery } from '../../graphql/generated';
import {
    ProfileCookOfferAddonsPageCloneDocument,
    ProfileCookOfferAddonsPageUpdatesDocument,
    ProfileCookOfferAddonsPageUpsertDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { offerAddonPriceLabel } from '../../utils/offerAddonPriceLabel';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('offer-addons');

export const profileCookOfferAddonsPageTitle = route.title;
export const profileCookOfferAddonsPageDescription = route.description;

const OFFER_ADDON_SORTS = ['updated-desc', 'updated-asc', 'title-asc'] as const;

type OfferAddonSort = (typeof OFFER_ADDON_SORTS)[number];

export type ProfileOfferAddonsSearch = {
    q?: string;
    sort?: Exclude<OfferAddonSort, 'updated-desc'>;
};

export function parseProfileOfferAddonsSearch(search: Record<string, unknown>): ProfileOfferAddonsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const sort = search.sort === 'updated-asc' || search.sort === 'title-asc' ? search.sort : undefined;
    return { q, sort };
}

function profileOfferAddonsSearchForUrl(next: { q?: string; sort: OfferAddonSort }): ProfileOfferAddonsSearch {
    return {
        q: next.q?.trim() || undefined,
        sort: next.sort === 'updated-desc' ? undefined : next.sort,
    };
}

export function ProfileCookOfferAddonsPage({
    data,
    search,
}: {
    data: GqlCProfileCookOfferAddonsPageQuery;
    search: ProfileOfferAddonsSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/profile/offer-addons' });
    const offerAddonsEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_ADDONS');
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookOfferAddonsPageUpdatesDocument);
    const [, upsertAddon] = useMutation(ProfileCookOfferAddonsPageUpsertDocument);
    const [, cloneTemplate] = useMutation(ProfileCookOfferAddonsPageCloneDocument);
    const [creating, setCreating] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [cloningId, setCloningId] = useState<string | null>(null);
    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);
    const sort: OfferAddonSort = search.sort ?? 'updated-desc';

    useEffect(() => {
        if (!offerAddonsEnabled) {
            void navigate({ to: '/{-$locale}/profile', replace: true });
        }
    }, [navigate, offerAddonsEnabled]);

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({
            search: profileOfferAddonsSearchForUrl({ q: nextQ, sort }),
            replace: true,
        });
    }, [debouncedQ, navigate, search.q, sort]);

    function updateSearch(next: { q?: string; sort: OfferAddonSort }) {
        void navigate({ search: profileOfferAddonsSearchForUrl(next) });
    }

    if (!offerAddonsEnabled) {
        return null;
    }

    const addons = user?.cook?.offerAddons ?? [];
    const templates = user?.cook?.offerAddonTemplates ?? [];
    const query = (search.q ?? '').trim().toLowerCase();
    const filteredAddons = addons
        .filter((addon) => {
            if (query.length === 0) return true;
            return addon.title.toLowerCase().includes(query) || addon.description.toLowerCase().includes(query);
        })
        .slice()
        .sort((a, b) => {
            switch (sort) {
                case 'title-asc':
                    return a.title.localeCompare(b.title, locale);
                case 'updated-asc':
                    return a.updatedAt.localeCompare(b.updatedAt);
                case 'updated-desc':
                default:
                    return b.updatedAt.localeCompare(a.updatedAt);
            }
        });

    async function onCreate() {
        setCreating(true);
        try {
            const result = await upsertAddon({});
            const cookOfferAddonId = result.data?.user.cook.offerAddonUpsert.referenceId;
            if (!cookOfferAddonId || result.error || !result.data?.user.cook.offerAddonUpsert.success) {
                throw new Error('create failed');
            }
            toast.success(t(locale, 'profileCook', 'offerAddons.created'));
            await navigate({
                to: '/{-$locale}/profile/offer-addons/$cookOfferAddonId/edit',
                params: { cookOfferAddonId },
            });
        } catch {
            toast.error(t(locale, 'profileCook', 'actions.createFailed'));
        } finally {
            setCreating(false);
        }
    }

    async function onClone(offerAddonTemplateId: string) {
        setCloningId(offerAddonTemplateId);
        try {
            const result = await cloneTemplate({ offerAddonTemplateId });
            const cookOfferAddonId = result.data?.user.cook.offerAddonCloneFromTemplate.referenceId;
            if (!cookOfferAddonId || result.error || !result.data?.user.cook.offerAddonCloneFromTemplate.success) {
                throw new Error('clone failed');
            }
            toast.success(t(locale, 'profileCook', 'offerAddons.suggestionAdded'));
            setSuggestionsOpen(false);
            await navigate({
                to: '/{-$locale}/profile/offer-addons/$cookOfferAddonId/edit',
                params: { cookOfferAddonId },
            });
        } catch {
            toast.error(t(locale, 'profileCook', 'offerAddons.suggestionFailed'));
        } finally {
            setCloningId(null);
        }
    }

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-2">
                    <h1 className="font-serif text-2xl/tight text-foreground">{profileCookOfferAddonsPageTitle(locale)}</h1>
                    <p className="text-muted-foreground">{profileCookOfferAddonsPageDescription(locale)}</p>
                </div>
                <Dialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
                    <DialogTrigger asChild>
                        <Button type="button" variant="outline" disabled={creating || cloningId != null}>
                            {t(locale, 'profileCook', 'offerAddons.fromSuggestions')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t(locale, 'profileCook', 'offerAddons.suggestions')}</DialogTitle>
                            <DialogDescription>{t(locale, 'profileCook', 'offerAddons.suggestionsHint')}</DialogDescription>
                        </DialogHeader>
                        {templates.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'offerAddons.noSuggestions')}</p>
                        ) : (
                            <ul className="grid max-h-96 gap-2 overflow-y-auto">
                                {templates.map((template) => {
                                    const imageUrl = template.imageUrl != null && template.imageUrl.length > 0 ? template.imageUrl : null;
                                    return (
                                        <li
                                            key={template.offerAddonTemplateId}
                                            className="flex items-start justify-between gap-3 rounded-lg border p-3"
                                        >
                                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                                <div
                                                    className={
                                                        imageUrl == null
                                                            ? 'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary text-muted-foreground'
                                                            : 'size-14 shrink-0 overflow-hidden rounded-lg'
                                                    }
                                                    aria-hidden={imageUrl == null ? true : undefined}
                                                >
                                                    {imageUrl != null ? (
                                                        <AppImage src={imageUrl} alt="" className="size-full object-cover" />
                                                    ) : (
                                                        <GiftIcon className="size-5" />
                                                    )}
                                                </div>
                                                <div className="grid min-w-0 gap-1">
                                                    <p className="font-medium text-foreground">{template.title}</p>
                                                    {template.description.trim().length > 0 ? (
                                                        <p className="line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
                                                    ) : null}
                                                    <p className="text-sm text-muted-foreground">
                                                        {offerAddonPriceLabel(template.suggestedPriceCents, template.pricingUnit, locale)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={cloningId != null}
                                                onClick={() => void onClone(template.offerAddonTemplateId)}
                                            >
                                                {cloningId === template.offerAddonTemplateId
                                                    ? t(locale, 'profileCook', 'offerAddons.adding')
                                                    : t(locale, 'profileCook', 'offerAddons.add')}
                                            </Button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <Input
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={t(locale, 'profileCook', 'offerAddons.searchPlaceholder')}
                    aria-label={t(locale, 'profileCook', 'offerAddons.searchAria')}
                    className="min-w-0 flex-1 @md:max-w-xs"
                />
                <Select value={sort} onValueChange={(value) => updateSearch({ q: search.q, sort: value as OfferAddonSort })}>
                    <SelectTrigger className="w-full @md:w-48" aria-label={t(locale, 'profileCook', 'actions.sort')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="updated-desc">{t(locale, 'profileCook', 'actions.sortRecent')}</SelectItem>
                        <SelectItem value="updated-asc">{t(locale, 'profileCook', 'actions.sortOldest')}</SelectItem>
                        <SelectItem value="title-asc">{t(locale, 'profileCook', 'actions.sortTitle')}</SelectItem>
                    </SelectContent>
                </Select>
                <Button type="button" className="shrink-0" disabled={creating || cloningId != null} onClick={() => void onCreate()}>
                    <PlusIcon className="size-4" />
                    {creating ? t(locale, 'profileCook', 'actions.creating') : t(locale, 'profileCook', 'actions.newExtra')}
                </Button>
            </div>

            {addons.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'offerAddons.empty')}</p>
            ) : filteredAddons.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'offerAddons.noneFound')}</p>
            ) : (
                <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
                    {filteredAddons.map((addon) => (
                        <li key={addon.cookOfferAddonId} className="min-w-0">
                            <CookOfferAddonCard
                                addon={addon}
                                meta={offerAddonPriceLabel(addon.priceCents, addon.pricingUnit, locale)}
                                to="/{-$locale}/profile/offer-addons/$cookOfferAddonId/edit"
                                params={{ cookOfferAddonId: addon.cookOfferAddonId }}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
