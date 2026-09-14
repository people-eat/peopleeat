import { Link, notFound, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { Button } from '../../components/base/button';
import { CookMenuSelectPanel, cookMenuSelectPanelMenuIsComplete } from '../../components/CookMenuSelectPanel';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookBookingRequestOfferMenusEditPageQuery } from '../../graphql/generated';
import {
    ProfileCookBookingRequestOfferMenusEditPageUpdatesDocument,
    ProfileCookBookingRequestOfferSuggestedMenusUpdateDocument,
    ProfileMenuCreateDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { returnToFromLocation } from '../../utils/returnTo';
import { cookStubRouteBySlug } from './cookCatalog';
import {
    profileCookBookingRequestOfferMenusEditPageDescription,
    profileCookBookingRequestOfferMenusEditPageTitle,
} from './profileCookBookingRequestOfferLabels';

export {
    profileCookBookingRequestOfferMenusEditPageDescription,
    profileCookBookingRequestOfferMenusEditPageTitle,
} from './profileCookBookingRequestOfferLabels';

export type ProfileCookBookingRequestOfferMenusEditSearch = {
    menus?: string;
};

export function parseProfileCookBookingRequestOfferMenusEditSearch(
    search: Record<string, unknown>,
): ProfileCookBookingRequestOfferMenusEditSearch {
    const menusRaw = typeof search.menus === 'string' ? search.menus.trim() : '';
    return { menus: menusRaw.length > 0 ? menusRaw : undefined };
}

function profileCookBookingRequestOfferMenusEditSearchForUrl(next: {
    menus: readonly string[];
}): ProfileCookBookingRequestOfferMenusEditSearch {
    return { menus: next.menus.length > 0 ? next.menus.join(',') : undefined };
}

function menuIdsFromOfferMenusEditSearch(search: ProfileCookBookingRequestOfferMenusEditSearch): string[] {
    if (search.menus == null || search.menus.length === 0) return [];
    return search.menus
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
}

function menusEditSearchEqual(a: ProfileCookBookingRequestOfferMenusEditSearch, b: ProfileCookBookingRequestOfferMenusEditSearch): boolean {
    return a.menus === b.menus;
}

function searchToSearchStr(search: ProfileCookBookingRequestOfferMenusEditSearch): string {
    const params = new URLSearchParams();
    if (search.menus != null) params.set('menus', search.menus);
    const serialized = params.toString();
    return serialized.length > 0 ? `?${serialized}` : '';
}

const offersListRoute = cookStubRouteBySlug('booking-request-offers');

function canNegotiateOffer(status: string): boolean {
    return status === 'USER_NEEDS_TO_ACCEPT' || status === 'COOK_NEEDS_TO_ACCEPT';
}

export function profileCookBookingRequestOfferMenusEditPageVariables(bookingRequestOfferId: string) {
    return { bookingRequestOfferId };
}

export function ProfileCookBookingRequestOfferMenusEditPage({
    data,
    bookingRequestOfferId,
    search,
}: {
    data: GqlCProfileCookBookingRequestOfferMenusEditPageQuery;
    bookingRequestOfferId: string;
    search: ProfileCookBookingRequestOfferMenusEditSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const location = useLocation();
    const seedUser = data.currentSession.user ?? null;
    const seedCook = seedUser?.cook ?? null;
    const seedOffer = seedCook?.bookingRequestOffer ?? null;
    if (!seedCook || !seedOffer) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCookBookingRequestOfferMenusEditPageUpdatesDocument, { bookingRequestOfferId });
    const cook = user?.cook ?? null;
    const offer = cook?.bookingRequestOffer ?? null;

    const [, updateMenus] = useMutation(ProfileCookBookingRequestOfferSuggestedMenusUpdateDocument);
    const [, createMenu] = useMutation(ProfileMenuCreateDocument);
    const [selectedMenuIds, setSelectedMenuIds] = useState(() => {
        const fromSearch = menuIdsFromOfferMenusEditSearch(search);
        if (fromSearch.length > 0 || search.menus != null) return fromSearch;
        return seedOffer.suggestedMenus.map((menu) => menu.copyOfMenuId).filter((id): id is string => id != null);
    });
    const [creatingMenu, setCreatingMenu] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user == null) return;
        if (offer == null) {
            void navigate({ to: offersListRoute.to });
            return;
        }
        if (!canNegotiateOffer(offer.status)) {
            void navigate({
                to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId',
                params: { bookingRequestOfferId },
                search: { tab: 'offer' },
            });
        }
    }, [bookingRequestOfferId, navigate, offer, user]);

    useEffect(() => {
        if (cook == null) return;
        setSelectedMenuIds((current) => {
            const next = current.filter((menuId) => {
                const menu = cook.menus.find((row) => row.menuId === menuId);
                if (menu == null) return false;
                return cookMenuSelectPanelMenuIsComplete(
                    menu.courses.map((course) => ({
                        title: course.title,
                        mealOptionCount: course.mealOptions.length,
                    })),
                );
            });
            return next.length === current.length ? current : next;
        });
    }, [cook]);

    useEffect(() => {
        const next = profileCookBookingRequestOfferMenusEditSearchForUrl({ menus: selectedMenuIds });
        if (menusEditSearchEqual(next, search)) return;
        void navigate({
            to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId/edit-menus',
            params: { bookingRequestOfferId },
            search: next,
            replace: true,
        });
    }, [bookingRequestOfferId, navigate, search, selectedMenuIds]);

    if (cook == null || offer == null) {
        return null;
    }

    const inventoryMenus = cook.menus.map((menu) => ({
        menuId: menu.menuId,
        title: menu.title,
        description: menu.description,
        courseMealOptionImages: menu.courseMealOptionImages,
        courses: menu.courses.map((course) => ({
            title: course.title,
            mealOptionCount: course.mealOptions.length,
        })),
    }));

    const savedMenuIdsKey = offer.suggestedMenus
        .map((menu) => menu.copyOfMenuId)
        .filter((id): id is string => id != null)
        .slice()
        .sort()
        .join(',');
    const selectedCompleteMenuIdsKey = selectedMenuIds
        .filter((menuId) => {
            const menu = inventoryMenus.find((row) => row.menuId === menuId);
            return menu != null && cookMenuSelectPanelMenuIsComplete(menu.courses);
        })
        .slice()
        .sort()
        .join(',');
    const isDirty = selectedCompleteMenuIdsKey !== savedMenuIdsKey;

    async function onSave() {
        if (saving || creatingMenu) return;
        setSaving(true);
        try {
            const result = await updateMenus({
                input: {
                    bookingRequestOfferId,
                    suggestedMenuIds: selectedMenuIds.filter((menuId) => {
                        const menu = inventoryMenus.find((row) => row.menuId === menuId);
                        return menu != null && cookMenuSelectPanelMenuIsComplete(menu.courses);
                    }),
                },
            });
            if (!result.data?.user.cook.bookingRequestOfferSuggestedMenusUpdate.success) {
                throw new Error('menus update failed');
            }
            toast.success({ de: 'Menüs aktualisiert.', en: 'Menus updated.' }[locale]);
            await navigate({
                to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId',
                params: { bookingRequestOfferId },
                search: { tab: 'offer' },
            });
        } catch {
            toast.error({ de: 'Menüupdate fehlgeschlagen.', en: 'Could not update menus.' }[locale]);
        } finally {
            setSaving(false);
        }
    }

    function returnToMenusEdit(menus: readonly string[]): string {
        return returnToFromLocation({
            pathname: location.pathname,
            searchStr: searchToSearchStr(profileCookBookingRequestOfferMenusEditSearchForUrl({ menus })),
        });
    }

    async function navigateToMenuEdit(menuId: string, menusForReturn: readonly string[]) {
        await navigate({
            to: '/{-$locale}/profile/menus/$menuId/edit',
            params: { menuId },
            search: { returnTo: returnToMenusEdit(menusForReturn) },
        });
    }

    const busy = saving || creatingMenu;

    async function onCreateMenu() {
        if (busy) return;
        setCreatingMenu(true);
        try {
            const result = await createMenu({});
            const menuId = result.data?.user.cook.menuCreate.referenceId;
            if (!menuId || result.error) throw new Error('create failed');
            const menusForReturn = selectedMenuIds.includes(menuId) ? selectedMenuIds : [...selectedMenuIds, menuId];
            toast.success({ de: 'Menü angelegt.', en: 'Menu created.' }[locale]);
            await navigateToMenuEdit(menuId, menusForReturn);
        } catch {
            toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create.' }[locale]);
            setCreatingMenu(false);
        }
    }

    async function onEditMenu(menuId: string) {
        if (busy) return;
        const menu = inventoryMenus.find((row) => row.menuId === menuId);
        const preselectOnReturn = selectedMenuIds.includes(menuId) || (menu != null && !cookMenuSelectPanelMenuIsComplete(menu.courses));
        const menusForReturn = preselectOnReturn && !selectedMenuIds.includes(menuId) ? [...selectedMenuIds, menuId] : selectedMenuIds;
        await navigateToMenuEdit(menuId, menusForReturn);
    }

    return (
        <ProfilePinnedFooterLayout
            className="@container"
            contentClassName="grid content-start gap-6"
            footer={
                isDirty ? (
                    <>
                        <Button type="button" variant="outline" disabled={busy} asChild>
                            <Link
                                to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                params={{ bookingRequestOfferId }}
                                search={{ tab: 'offer' }}
                            >
                                {{ de: 'Verwerfen', en: 'Discard' }[locale]}
                            </Link>
                        </Button>
                        <Button type="button" disabled={busy} onClick={() => void onSave()}>
                            {{ de: saving ? 'Wird gespeichert…' : 'Speichern', en: saving ? 'Saving…' : 'Save' }[locale]}
                        </Button>
                    </>
                ) : (
                    <Button type="button" disabled={busy} asChild>
                        <Link
                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                            params={{ bookingRequestOfferId }}
                            search={{ tab: 'offer' }}
                        >
                            {{ de: 'Zum Angebot', en: 'Back to offer' }[locale]}
                        </Link>
                    </Button>
                )
            }
        >
            <div className="grid gap-1">
                <h1 className="font-serif text-2xl text-foreground">{profileCookBookingRequestOfferMenusEditPageTitle[locale]}</h1>
                <p className="text-sm text-muted-foreground">{profileCookBookingRequestOfferMenusEditPageDescription[locale]}</p>
            </div>

            <CookMenuSelectPanel
                menus={inventoryMenus}
                selectedMenuIds={selectedMenuIds}
                onToggle={(menuId) => {
                    const menu = inventoryMenus.find((row) => row.menuId === menuId);
                    if (menu == null || !cookMenuSelectPanelMenuIsComplete(menu.courses)) return;
                    setSelectedMenuIds((current) =>
                        current.includes(menuId) ? current.filter((id) => id !== menuId) : [...current, menuId],
                    );
                }}
                onCreateMenu={() => void onCreateMenu()}
                onEditMenu={(menuId) => void onEditMenu(menuId)}
                createMenuDisabled={busy}
                editMenuDisabled={busy}
            />
        </ProfilePinnedFooterLayout>
    );
}
