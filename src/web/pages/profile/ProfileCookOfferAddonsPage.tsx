import { Link, useNavigate } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { Button } from '../../components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/base/dialog';
import type { GqlCProfileCookOfferAddonsPageQuery } from '../../graphql/generated';
import {
    ProfileCookOfferAddonsPageCloneDocument,
    ProfileCookOfferAddonsPageUpdatesDocument,
    ProfileCookOfferAddonsPageUpsertDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cn } from '../../utils/cn';
import { offerAddonPriceLabel } from '../../utils/offerAddonPriceLabel';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('offer-addons');

export const profileCookOfferAddonsPageTitle = route.title;
export const profileCookOfferAddonsPageDescription = route.description;

export function ProfileCookOfferAddonsPage({ data }: { data: GqlCProfileCookOfferAddonsPageQuery }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const offerAddonsEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_ADDONS');
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookOfferAddonsPageUpdatesDocument);
    const [, upsertAddon] = useMutation(ProfileCookOfferAddonsPageUpsertDocument);
    const [, cloneTemplate] = useMutation(ProfileCookOfferAddonsPageCloneDocument);
    const [creating, setCreating] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [cloningId, setCloningId] = useState<string | null>(null);

    useEffect(() => {
        if (!offerAddonsEnabled) {
            void navigate({ to: '/{-$locale}/profile', replace: true });
        }
    }, [navigate, offerAddonsEnabled]);

    if (!offerAddonsEnabled) {
        return null;
    }

    const addons = (user?.cook?.offerAddons ?? []).slice().sort((a, b) => a.title.localeCompare(b.title, locale));
    const templates = user?.cook?.offerAddonTemplates ?? [];

    async function onCreate() {
        setCreating(true);
        try {
            const result = await upsertAddon({});
            const cookOfferAddonId = result.data?.user.cook.offerAddonUpsert.referenceId;
            if (!cookOfferAddonId || result.error || !result.data?.user.cook.offerAddonUpsert.success) {
                throw new Error('create failed');
            }
            toast.success({ de: 'Zusatzleistung angelegt.', en: 'Offer extra created.' }[locale]);
            await navigate({
                to: '/{-$locale}/profile/offer-addons/$cookOfferAddonId/edit',
                params: { cookOfferAddonId },
            });
        } catch {
            toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create.' }[locale]);
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
            toast.success({ de: 'Vorschlag übernommen.', en: 'Suggestion added.' }[locale]);
            setSuggestionsOpen(false);
            await navigate({
                to: '/{-$locale}/profile/offer-addons/$cookOfferAddonId/edit',
                params: { cookOfferAddonId },
            });
        } catch {
            toast.error({ de: 'Übernehmen fehlgeschlagen.', en: 'Could not add the suggestion.' }[locale]);
        } finally {
            setCloningId(null);
        }
    }

    return (
        <main id="main-content" className="grid w-full min-w-0 content-start gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-2">
                    <h1 className="font-serif text-2xl/tight text-foreground">{profileCookOfferAddonsPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{profileCookOfferAddonsPageDescription[locale]}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Dialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline" disabled={creating || cloningId != null}>
                                {{ de: 'Aus Vorschlägen', en: 'Add from suggestions' }[locale]}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{{ de: 'Vorschläge', en: 'Suggestions' }[locale]}</DialogTitle>
                                <DialogDescription>
                                    {
                                        {
                                            de: 'Übernimm eine Vorlage in deine Bibliothek. Preis und Text kannst du danach anpassen.',
                                            en: 'Copy a template into your library. You can change the price and text afterwards.',
                                        }[locale]
                                    }
                                </DialogDescription>
                            </DialogHeader>
                            {templates.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {{ de: 'Keine Vorschläge.', en: 'No suggestions.' }[locale]}
                                </p>
                            ) : (
                                <ul className="grid max-h-96 gap-2 overflow-y-auto">
                                    {templates.map((template) => (
                                        <li
                                            key={template.offerAddonTemplateId}
                                            className="flex items-start justify-between gap-3 rounded-lg border p-3"
                                        >
                                            <div className="grid min-w-0 gap-1">
                                                <p className="font-medium text-foreground">{template.title}</p>
                                                {template.description.trim().length > 0 ? (
                                                    <p className="line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
                                                ) : null}
                                                <p className="text-sm text-muted-foreground">
                                                    {offerAddonPriceLabel(template.suggestedPriceCents, template.pricingUnit, locale)}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={cloningId != null}
                                                onClick={() => void onClone(template.offerAddonTemplateId)}
                                            >
                                                {
                                                    {
                                                        de:
                                                            cloningId === template.offerAddonTemplateId
                                                                ? 'Wird hinzugefügt…'
                                                                : 'Hinzufügen',
                                                        en: cloningId === template.offerAddonTemplateId ? 'Adding…' : 'Add',
                                                    }[locale]
                                                }
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </DialogContent>
                    </Dialog>
                    <Button type="button" disabled={creating || cloningId != null} onClick={() => void onCreate()}>
                        <PlusIcon className="size-4" />
                        {
                            {
                                de: creating ? 'Wird angelegt…' : 'Eigene Zusatzleistung',
                                en: creating ? 'Creating…' : 'Custom offer extra',
                            }[locale]
                        }
                    </Button>
                </div>
            </div>

            {addons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {{ de: 'Noch keine Zusatzleistungen.', en: 'No offer extras yet.' }[locale]}
                </p>
            ) : (
                <ul className="grid gap-3">
                    {addons.map((addon) => (
                        <li key={addon.cookOfferAddonId}>
                            <Link
                                to="/{-$locale}/profile/offer-addons/$cookOfferAddonId/edit"
                                params={{ cookOfferAddonId: addon.cookOfferAddonId }}
                                className={cn(
                                    'grid gap-1 rounded-xl border bg-card p-4 text-card-foreground shadow-sm outline-none',
                                    'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                                )}
                            >
                                <span className="font-medium text-foreground">{addon.title}</span>
                                {addon.description.trim().length > 0 ? (
                                    <span className="line-clamp-2 text-sm text-muted-foreground">{addon.description}</span>
                                ) : null}
                                <span className="text-sm text-muted-foreground">
                                    {offerAddonPriceLabel(addon.priceCents, addon.pricingUnit, locale)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
