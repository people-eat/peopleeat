import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate, useRouter } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { centsToEuros, eurosToCents } from '../../../shared';
import type { Locale } from '../../../shared/locale';
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
import { Button } from '../../components/base/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Textarea } from '../../components/base/textarea';
import { CookMealImageField } from '../../components/CookMealImageField';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookOfferAddonEditPageQuery } from '../../graphql/generated';
import {
    ProfileCookOfferAddonEditPageDeleteDocument,
    ProfileCookOfferAddonEditPageUpdatesDocument,
    ProfileCookOfferAddonEditPageUpsertDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import type { OfferAddonPricingUnit } from '../../utils/offerAddonPriceLabel';
import { offerAddonPriceFieldHelp, offerAddonPricingUnitHelp, offerAddonPricingUnitLabel } from '../../utils/offerAddonPriceLabel';
import { cookNavRouteBySlug } from './cookCatalog';

const addonsRoute = cookNavRouteBySlug('offer-addons');

export function profileCookOfferAddonEditPageTitle(locale: Locale): string {
    return t(locale, 'profileCook', 'offerAddonEdit.title');
}
export function profileCookOfferAddonEditPageDescription(locale: Locale): string {
    return t(locale, 'profileCook', 'offerAddonEdit.description');
}

type AddonRow = NonNullable<
    NonNullable<NonNullable<GqlCProfileCookOfferAddonEditPageQuery['currentSession']['user']>['cook']>['offerAddon']
>;

type AddonFormValues = {
    title: string;
    description: string;
    pricingUnit: OfferAddonPricingUnit;
    priceEuros: string;
    imageFileUploadId: string | null;
    imageUrl: string | null;
};

const emptyAddonForm: AddonFormValues = {
    title: '',
    description: '',
    pricingUnit: 'FLAT',
    priceEuros: '0.00',
    imageFileUploadId: null,
    imageUrl: null,
};

function formFromAddon(addon: AddonRow): AddonFormValues {
    return {
        title: addon.title,
        description: addon.description,
        pricingUnit: addon.pricingUnit,
        priceEuros: centsToEuros(addon.priceCents),
        imageFileUploadId: addon.imageFileUploadId ?? null,
        imageUrl: addon.imageUrl ?? null,
    };
}

export function ProfileCookOfferAddonEditPage({
    data,
    cookOfferAddonId,
}: {
    data: GqlCProfileCookOfferAddonEditPageQuery;
    cookOfferAddonId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const router = useRouter();
    const offerAddonsEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_ADDONS');
    const seedUser = data.currentSession.user ?? null;
    const seedAddon = seedUser?.cook?.offerAddon ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookOfferAddonEditPageUpdatesDocument, { cookOfferAddonId });
    const addon = user?.cook?.offerAddon ?? null;
    const [, upsertAddon] = useMutation(ProfileCookOfferAddonEditPageUpsertDocument);
    const [, deleteAddon] = useMutation(ProfileCookOfferAddonEditPageDeleteDocument);
    const [imageBusy, setImageBusy] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [defaultValues] = useState(() => (seedAddon != null ? formFromAddon(seedAddon) : emptyAddonForm));

    // This page unmounts the library, so the library misses userUpdates.
    const leaveToLibrary = useCallback(() => {
        router.clearCache({
            filter: (match) => match.routeId.endsWith('/profile/offer-addons'),
        });
        return navigate({ to: addonsRoute.to });
    }, [navigate, router]);

    const form = useForm({
        defaultValues,
        onSubmit: async ({ value }) => {
            const priceCents = eurosToCents(value.priceEuros);
            if (value.title.trim().length === 0) {
                toast.error(t(locale, 'profileCook', 'offerAddonEdit.titleRequired'));
                return;
            }
            if (priceCents == null || priceCents < 0) {
                toast.error(t(locale, 'profileCook', 'offerAddonEdit.validPrice'));
                return;
            }
            const result = await upsertAddon({
                addon: {
                    cookOfferAddonId,
                    title: value.title,
                    description: value.description,
                    pricingUnit: value.pricingUnit,
                    priceCents,
                    inclusion: 'OPTIONAL',
                    imageFileUploadId: value.imageFileUploadId,
                },
            });
            if (result.error || !result.data?.user.cook.offerAddonUpsert.success) {
                toast.error(t(locale, 'common', 'saveFailed'));
                return;
            }
            toast.success(t(locale, 'profileCook', 'actions.saved'));
            await leaveToLibrary();
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const imageFileUploadId = useSelector(form.store, (state) => state.values.imageFileUploadId);
    const imageUrl = useSelector(form.store, (state) => state.values.imageUrl);
    const pricingUnit = useSelector(form.store, (state) => state.values.pricingUnit);

    useEffect(() => {
        if (!offerAddonsEnabled) {
            void navigate({ to: '/{-$locale}/profile', replace: true });
        }
    }, [navigate, offerAddonsEnabled]);

    useEffect(() => {
        if (!offerAddonsEnabled || addon == null || isDirty) return;
        form.reset(formFromAddon(addon));
    }, [addon, form, isDirty, offerAddonsEnabled]);

    async function onDelete() {
        if (addon?.bookingRequestOfferId != null) return;
        setDeleting(true);
        try {
            const result = await deleteAddon({ cookOfferAddonId });
            if (result.error || !result.data?.user.cook.offerAddonDelete.success) {
                throw new Error('delete failed');
            }
            toast.success(t(locale, 'profileCook', 'actions.deleted'));
            await leaveToLibrary();
        } catch {
            toast.error(t(locale, 'profileCook', 'actions.deleteFailed'));
            setDeleting(false);
        }
    }

    if (!offerAddonsEnabled || addon == null) {
        if (offerAddonsEnabled && user != null && addon == null) {
            throw notFound();
        }
        return null;
    }

    const canDelete = addon.bookingRequestOfferId == null;
    const imageRemoveDescription = t(locale, 'profileCook', 'offerAddonEdit.imageWillRemove');

    const overflowMenu = canDelete ? (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isSubmitting || imageBusy || deleting}
                    aria-label={t(locale, 'profileCook', 'actions.moreActions')}
                >
                    <MoreHorizontalIcon className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    variant="destructive"
                    disabled={isSubmitting || imageBusy || deleting}
                    onSelect={() => setConfirmDelete(true)}
                >
                    {t(locale, 'profileCook', 'actions.delete')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ) : null;

    return (
        <>
            <ProfilePinnedFooterLayout
                contentClassName="grid w-full max-w-2xl content-start gap-6"
                footer={
                    isDirty ? (
                        <>
                            {overflowMenu}
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 md:flex-initial"
                                disabled={isSubmitting || imageBusy || deleting}
                                asChild
                            >
                                <Link to={addonsRoute.to}>{t(locale, 'common', 'cancel')}</Link>
                            </Button>
                            <Button
                                type="submit"
                                form="offer-addon-form"
                                className="flex-1 md:flex-initial"
                                disabled={isSubmitting || imageBusy || deleting}
                            >
                                {isSubmitting ? t(locale, 'profileCook', 'actions.saving') : t(locale, 'common', 'save')}
                            </Button>
                        </>
                    ) : (
                        <>
                            {overflowMenu}
                            <Button type="button" disabled={isSubmitting || imageBusy || deleting} asChild>
                                <Link to={addonsRoute.to}>{t(locale, 'profileCook', 'offerAddonEdit.backToList')}</Link>
                            </Button>
                        </>
                    )
                }
            >
                <div className="grid gap-1">
                    <h1 className="font-serif text-2xl/tight text-foreground">{profileCookOfferAddonEditPageTitle(locale)}</h1>
                    <p className="text-sm text-muted-foreground">{profileCookOfferAddonEditPageDescription(locale)}</p>
                </div>
                <form
                    id="offer-addon-form"
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <form.Field name="title">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="offer-addon-title" className="text-sm font-medium">
                                    {t(locale, 'profileCook', 'actions.title')}
                                </label>
                                <Input
                                    id="offer-addon-title"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    required
                                    maxLength={255}
                                    aria-describedby="offer-addon-title-help"
                                />
                                <p id="offer-addon-title-help" className="text-sm text-muted-foreground">
                                    {t(locale, 'profileCook', 'offerAddonEdit.titleHelp')}
                                </p>
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="description">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="offer-addon-description" className="text-sm font-medium">
                                    {t(locale, 'profileCook', 'actions.description')}
                                </label>
                                <Textarea
                                    id="offer-addon-description"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    rows={5}
                                    aria-describedby="offer-addon-description-help"
                                />
                                <p id="offer-addon-description-help" className="text-sm text-muted-foreground">
                                    {t(locale, 'profileCook', 'offerAddonEdit.descriptionHelp')}
                                </p>
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="pricingUnit">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="offer-addon-pricing-unit" className="text-sm font-medium">
                                    {t(locale, 'profileCook', 'offerAddonEdit.pricingUnit')}
                                </label>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(value) => field.handleChange(value as OfferAddonPricingUnit)}
                                >
                                    <SelectTrigger
                                        id="offer-addon-pricing-unit"
                                        className="w-full max-w-xs"
                                        onBlur={field.handleBlur}
                                        aria-describedby="offer-addon-pricing-unit-help"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FLAT">{offerAddonPricingUnitLabel('FLAT', locale)}</SelectItem>
                                        <SelectItem value="PER_PERSON">{offerAddonPricingUnitLabel('PER_PERSON', locale)}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p id="offer-addon-pricing-unit-help" className="text-sm text-muted-foreground">
                                    {offerAddonPricingUnitHelp(locale)}
                                </p>
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="priceEuros">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="offer-addon-price" className="text-sm font-medium">
                                    {pricingUnit === 'PER_PERSON'
                                        ? t(locale, 'profileCook', 'offerAddonEdit.pricePerPerson')
                                        : t(locale, 'profileCook', 'offerAddonEdit.price')}
                                </label>
                                <Input
                                    id="offer-addon-price"
                                    name={field.name}
                                    inputMode="decimal"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    required
                                    className="max-w-xs"
                                    aria-describedby="offer-addon-price-help"
                                />
                                <p id="offer-addon-price-help" className="text-sm text-muted-foreground">
                                    {offerAddonPriceFieldHelp(pricingUnit, locale)}
                                </p>
                            </div>
                        )}
                    </form.Field>
                    <div className="grid gap-1.5">
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'offerAddonEdit.imageHelp')}</p>
                        <CookMealImageField
                            value={{ imageFileUploadId, imageUrl }}
                            disabled={isSubmitting || deleting}
                            onBusyChange={setImageBusy}
                            emptyDetail={null}
                            removeDescription={imageRemoveDescription}
                            onChange={(next) => {
                                form.setFieldValue('imageFileUploadId', next.imageFileUploadId);
                                form.setFieldValue('imageUrl', next.imageUrl);
                            }}
                        />
                    </div>
                </form>
            </ProfilePinnedFooterLayout>
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'profileCook', 'offerAddonEdit.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t(locale, 'profileCook', 'offerAddonEdit.deleteBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleting}
                            onClick={(event) => {
                                event.preventDefault();
                                void onDelete();
                            }}
                        >
                            {t(locale, 'profileCook', 'actions.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
