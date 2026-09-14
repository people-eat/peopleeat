import { Link } from '@tanstack/react-router';
import { CheckIcon, CopyIcon, ExternalLinkIcon, EyeIcon, Settings2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

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
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { Switch } from '../../components/base/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/base/tabs';
import { ChefProfileView } from '../../components/ChefProfileView';
import type { ChefProfileViewModel } from '../../components/ChefProfileView';
import { CookLogoEditor } from '../../components/CookLogoEditor';
import { Footer } from '../../components/Footer';
import { Header } from '../../components/Header';
import { PublicCookCard } from '../../components/PublicCookCard';
import type { GqlCProfileCookPublicPageQuery } from '../../graphql/generated';
import { ProfileCookPublicCookUpdateDocument, ProfileCookPublicPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { webPageUrlGet } from '../../seo/webPageUrlGet';
import { DEFAULT_LOCALE } from '../../utils/locale';
import type { Locale } from '../../utils/locale';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('public');
export const profileCookPublicPageTitle = route.title;
export const profileCookPublicPageDescription = route.description;

type ProfileCookPublicTab = 'preview' | 'manage';

export type ProfileCookPublicSearch = {
    tab?: 'manage';
};

export function parseProfileCookPublicSearch(search: Record<string, unknown>): ProfileCookPublicSearch {
    return { tab: search.tab === 'manage' ? 'manage' : undefined };
}

function resolvePublicTab(tab: ProfileCookPublicSearch['tab']): ProfileCookPublicTab {
    return tab === 'manage' ? 'manage' : 'preview';
}

function publicChefUrl(cookId: string, locale: Locale): string {
    const origin = webPageUrlGet();
    const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    return `${origin}${prefix}/chefs/${cookId}`;
}

function visibilityConfirmCopy({
    nextVisible,
    isApprovedByAdmin,
    locale,
}: {
    nextVisible: boolean;
    isApprovedByAdmin: boolean;
    locale: Locale;
}): { title: string; description: string; confirm: string } {
    if (nextVisible) {
        return {
            title: { de: 'Profil öffentlich machen?', en: 'Make profile public?' }[locale],
            description: isApprovedByAdmin
                ? {
                      de: 'Dein Profil erscheint in der Kochsuche und der öffentliche Link funktioniert.',
                      en: 'Your profile will appear in the chef listing and the public link will work.',
                  }[locale]
                : {
                      de: 'Deine Sichtbarkeit wird gespeichert, aber Kunden sehen dein Profil erst nach Freischaltung durch unser Team. Bis dahin ändert sich für Besucher nichts.',
                      en: 'Your visibility preference will be saved, but customers will not see your profile until our team approves you. Until then, nothing changes for visitors.',
                  }[locale],
            confirm: { de: 'Öffentlich machen', en: 'Make public' }[locale],
        };
    }

    return {
        title: { de: 'Profil verbergen?', en: 'Hide profile?' }[locale],
        description: isApprovedByAdmin
            ? {
                  de: 'Dein Profil verschwindet aus der Kochsuche und der öffentliche Link funktioniert nicht mehr.',
                  en: 'Your profile will disappear from the chef listing and the public link will stop working.',
              }[locale]
            : {
                  de: 'Die Sichtbarkeit wird ausgeschaltet. Dein Profil ist weiterhin nicht öffentlich. Freischaltung durch unser Team steht noch aus.',
                  en: 'Visibility will be turned off. Your profile stays hidden. Team approval is still pending.',
              }[locale],
        confirm: { de: 'Verbergen', en: 'Hide' }[locale],
    };
}

export function ProfileCookPublicPage({ data, search }: { data: GqlCProfileCookPublicPageQuery; search: ProfileCookPublicSearch }) {
    const locale = useLocale();
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookPublicPageUpdatesDocument);
    const [copied, setCopied] = useState(false);
    const [visibilitySaving, setVisibilitySaving] = useState(false);
    const [logoBusy, setLogoBusy] = useState(false);
    const [pendingVisible, setPendingVisible] = useState<boolean | null>(null);
    const [, updateCook] = useMutation(ProfileCookPublicCookUpdateDocument);

    const cook = user?.cook ?? null;
    if (!user || !cook) return null;

    const tab = resolvePublicTab(search.tab);
    const isLive = cook.isVisible && cook.isApprovedByAdmin;
    const cookId = cook.cookId;
    const publishedMeals = cook.meals.filter((meal) => meal.publishedAt != null);
    const publicCatalogMeals = publishedMeals.filter((meal) => meal.imageUrl != null && meal.imageUrl.length > 0);
    const publishedWithoutImageCount = publishedMeals.length - publicCatalogMeals.length;
    const view: ChefProfileViewModel = {
        displayName: user.firstName,
        profilePictureUrl: user.profilePicture?.url ?? null,
        city: cook.exactTravelOriginAddress?.city ?? null,
        cuisineStyle: cook.cuisineStyle,
        cookingPhilosophy: cook.cookingPhilosophy,
        biography: cook.biography,
        biographySummary: cook.biographySummary,
        logoUrl: cook.logo?.url ?? null,
        rating: cook.rating,
        meals: publicCatalogMeals.map((meal) => ({
            mealId: meal.mealId,
            title: meal.title,
            description: meal.description,
            imageUrl: meal.imageUrl,
        })),
    };
    const confirmCopy =
        pendingVisible == null
            ? null
            : visibilityConfirmCopy({
                  nextVisible: pendingVisible,
                  isApprovedByAdmin: cook.isApprovedByAdmin,
                  locale,
              });

    async function copyPublicLink() {
        try {
            await navigator.clipboard.writeText(publicChefUrl(cookId, locale));
            setCopied(true);
            toast.success({ de: 'Link kopiert', en: 'Link copied' }[locale]);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error({ de: 'Kopieren fehlgeschlagen', en: 'Could not copy' }[locale]);
        }
    }

    async function confirmVisibilityChange() {
        if (!cook || pendingVisible == null || visibilitySaving || pendingVisible === cook.isVisible) {
            setPendingVisible(null);
            return;
        }
        setVisibilitySaving(true);
        const result = await updateCook({ input: { isVisible: pendingVisible } });
        setVisibilitySaving(false);
        setPendingVisible(null);
        if (result.error || !result.data?.user.cook.update.success) {
            toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
            return;
        }
        toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
    }

    async function onLogoLink(fileUploadId: string) {
        const result = await updateCook({ input: { logoFileUploadId: fileUploadId } });
        if (result.error || !result.data?.user.cook.update.success) {
            throw result.error ?? new Error('Could not save.');
        }
    }

    async function onLogoClear() {
        const result = await updateCook({ input: { logoFileUploadId: null } });
        if (result.error || !result.data?.user.cook.update.success) {
            throw result.error ?? new Error('Could not save.');
        }
    }

    return (
        <main id="main-content" data-workspace-fill="" className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-0 overflow-hidden">
            <Tabs value={tab} className="flex min-h-0 flex-1 flex-col gap-0">
                <TabsList variant="line" className="shrink-0" aria-label={{ de: 'Öffentliches Profil', en: 'Public profile' }[locale]}>
                    <TabsTrigger value="preview" asChild>
                        <Link to="/{-$locale}/profile/public" search={{ tab: undefined }} replace>
                            <EyeIcon aria-hidden />
                            {{ de: 'Vorschau', en: 'Preview' }[locale]}
                        </Link>
                    </TabsTrigger>
                    <TabsTrigger value="manage" asChild>
                        <Link to="/{-$locale}/profile/public" search={{ tab: 'manage' }} replace>
                            <Settings2Icon aria-hidden />
                            {{ de: 'Verwalten', en: 'Manage' }[locale]}
                            {publishedWithoutImageCount > 0 ? (
                                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-medium">
                                    {publishedWithoutImageCount}
                                </Badge>
                            ) : null}
                        </Link>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
                    <div className="flex shrink-0 items-start gap-3 sm:items-center">
                        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                            {isLive
                                ? {
                                      de: 'So sehen Kunden dein Profil. Der Link funktioniert öffentlich.',
                                      en: 'This is how customers see your profile. The link works publicly.',
                                  }[locale]
                                : {
                                      de: 'Vorschau: noch nicht öffentlich (Sichtbarkeit oder Freigabe fehlt).',
                                      en: 'Preview: not public yet (visibility or approval missing).',
                                  }[locale]}
                        </p>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            <Button type="button" variant="outline" size="sm" disabled={!isLive} onClick={() => void copyPublicLink()}>
                                {copied ? <CheckIcon className="size-4" aria-hidden /> : <CopyIcon className="size-4" aria-hidden />}
                                {{ de: 'Link kopieren', en: 'Copy link' }[locale]}
                            </Button>
                            {isLive ? (
                                <Button type="button" variant="outline" size="sm" asChild>
                                    <Link to="/{-$locale}/chefs/$cookId" params={{ cookId }} target="_blank">
                                        <ExternalLinkIcon className="size-4" aria-hidden />
                                        {{ de: 'Öffnen', en: 'Open' }[locale]}
                                    </Link>
                                </Button>
                            ) : (
                                <Button type="button" variant="outline" size="sm" disabled>
                                    <ExternalLinkIcon className="size-4" aria-hidden />
                                    {{ de: 'Öffnen', en: 'Open' }[locale]}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border border-border bg-background">
                        <div className="@container w-full min-w-0">
                            <section className="mx-auto w-full max-w-7xl border-b border-border px-4 py-8 @lg:px-6">
                                <div className="grid gap-2">
                                    <h2 className="font-serif text-2xl font-light">
                                        {{ de: 'In der Kochsuche', en: 'In the chef listing' }[locale]}
                                    </h2>
                                    <p className="max-w-2xl text-sm text-muted-foreground">
                                        {
                                            {
                                                de: 'So erscheinst du in der Kochsuche und auf Stadt-, Partner- und Anlassseiten.',
                                                en: 'This is how you appear in the chef listing and on city, partner, and occasion pages.',
                                            }[locale]
                                        }
                                    </p>
                                </div>
                                <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                    <li>
                                        <PublicCookCard
                                            interactive={false}
                                            cook={{
                                                cookId,
                                                cuisineStyle: cook.cuisineStyle,
                                                cookingPhilosophy: cook.cookingPhilosophy,
                                                city: cook.exactTravelOriginAddress?.city ?? null,
                                                rating: cook.rating,
                                                user: {
                                                    display: user.firstName,
                                                    profilePicture: user.profilePicture ? { url: user.profilePicture.url } : null,
                                                },
                                            }}
                                        />
                                    </li>
                                </ul>
                            </section>
                            <Header user={user} locale={locale} />
                            <ChefProfileView cook={view} />
                            <Footer locale={locale} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="manage" className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain data-[state=inactive]:hidden">
                    <div className="grid min-w-0 content-start gap-3 pb-4">
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Sichtbarkeit und zusätzliches Bild steuern hier. Die Kundensicht findest du unter Vorschau.',
                                    en: 'Control visibility and the additional picture here. See Preview for the customer view.',
                                }[locale]
                            }
                        </p>

                        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                            <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-border p-3">
                                <div className="grid min-w-0 flex-1 gap-1">
                                    <span className="text-sm font-medium">
                                        {{ de: 'Öffentlich sichtbar', en: 'Publicly visible' }[locale]}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {
                                            {
                                                de: 'Erfordert zusätzlich die Freischaltung durch unser Team.',
                                                en: 'Also requires approval by our team.',
                                            }[locale]
                                        }
                                    </span>
                                </div>
                                <Switch
                                    checked={cook.isVisible}
                                    disabled={visibilitySaving || logoBusy}
                                    onCheckedChange={(checked) => setPendingVisible(checked)}
                                />
                            </div>
                            <div className="grid min-w-0 gap-2 rounded-lg border border-border p-3">
                                <span className="text-sm font-medium">{{ de: 'Zusätzliches Bild', en: 'Additional picture' }[locale]}</span>
                                <CookLogoEditor
                                    logoUrl={cook.logo?.url ?? null}
                                    disabled={visibilitySaving}
                                    onLink={onLogoLink}
                                    onClear={onLogoClear}
                                    onBusyChange={setLogoBusy}
                                />
                            </div>
                        </div>

                        {publishedWithoutImageCount > 0 ? (
                            <StatusAlert
                                tone="warning"
                                title={
                                    {
                                        de:
                                            publishedWithoutImageCount === 1
                                                ? '1 veröffentlichtes Gericht ohne Bild'
                                                : `${publishedWithoutImageCount} veröffentlichte Gerichte ohne Bild`,
                                        en:
                                            publishedWithoutImageCount === 1
                                                ? '1 published meal without a picture'
                                                : `${publishedWithoutImageCount} published meals without a picture`,
                                    }[locale]
                                }
                                action={
                                    <Button asChild size="sm" variant="outline">
                                        <Link to="/{-$locale}/profile/meals">{{ de: 'Zu den Gerichten', en: 'Go to meals' }[locale]}</Link>
                                    </Button>
                                }
                            >
                                {
                                    {
                                        de: 'Gerichte ohne Bild erscheinen nicht auf deiner öffentlichen Kochseite.',
                                        en: 'Meals without a picture do not appear on your public cook page.',
                                    }[locale]
                                }
                            </StatusAlert>
                        ) : null}
                    </div>
                </TabsContent>
            </Tabs>

            <AlertDialog
                open={pendingVisible != null}
                onOpenChange={(open) => {
                    if (!open && !visibilitySaving) setPendingVisible(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmCopy?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmCopy?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={visibilitySaving}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            variant={pendingVisible === false ? 'destructive' : 'default'}
                            disabled={visibilitySaving}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmVisibilityChange();
                            }}
                        >
                            {visibilitySaving
                                ? { de: 'Speichern…', en: 'Saving…' }[locale]
                                : (confirmCopy?.confirm ?? { de: 'Bestätigen', en: 'Confirm' }[locale])}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
