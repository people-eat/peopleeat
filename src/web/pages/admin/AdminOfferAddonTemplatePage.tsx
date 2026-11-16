import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate, useRouter } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { centsToEuros, eurosToCents } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
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
import { Switch } from '../../components/base/switch';
import { Textarea } from '../../components/base/textarea';
import { CookMealImageField } from '../../components/CookMealImageField';
import type { GqlCAdminOfferAddonTemplatePageQuery } from '../../graphql/generated';
import {
    AdminOfferAddonTemplatePageDeleteDocument,
    AdminOfferAddonTemplatePageUpdatesDocument,
    AdminOfferAddonTemplatePageUpsertDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import type { OfferAddonPricingUnit } from '../../utils/offerAddonPriceLabel';
import { offerAddonPriceFieldHelp, offerAddonPricingUnitHelp, offerAddonPricingUnitLabel } from '../../utils/offerAddonPriceLabel';

export function adminOfferAddonTemplatePageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.offerAddonTemplate.title');
}
export function adminOfferAddonTemplatePageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.offerAddonTemplate.description');
}

type TemplateRow = NonNullable<
    NonNullable<NonNullable<GqlCAdminOfferAddonTemplatePageQuery['currentSession']['user']>['admin']>['offerAddonTemplate']
>;

type TemplateFormValues = {
    titleDe: string;
    titleEn: string;
    descriptionDe: string;
    descriptionEn: string;
    pricingUnit: OfferAddonPricingUnit;
    suggestedPriceEuros: string;
    position: string;
    published: boolean;
    imageFileUploadId: string | null;
    imageUrl: string | null;
};

function formFromTemplate(template: TemplateRow): TemplateFormValues {
    return {
        titleDe: template.titleDe,
        titleEn: template.titleEn,
        descriptionDe: template.descriptionDe,
        descriptionEn: template.descriptionEn,
        pricingUnit: template.pricingUnit,
        suggestedPriceEuros: centsToEuros(template.suggestedPriceCents),
        position: String(template.position),
        published: template.publishedAt != null,
        imageFileUploadId: template.imageFileUploadId ?? null,
        imageUrl: template.imageUrl ?? null,
    };
}

export function AdminOfferAddonTemplatePage({
    data,
    offerAddonTemplateId,
}: {
    data: GqlCAdminOfferAddonTemplatePageQuery;
    offerAddonTemplateId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const router = useRouter();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedTemplate = seedAdmin?.offerAddonTemplate ?? null;
    if (!seedTemplate) throw notFound();

    const [template, setTemplate] = useState(seedTemplate);
    const [, upsert] = useMutation(AdminOfferAddonTemplatePageUpsertDocument);
    const [, remove] = useMutation(AdminOfferAddonTemplatePageDeleteDocument);
    const [imageBusy, setImageBusy] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [defaultValues] = useState(() => formFromTemplate(seedTemplate));

    // This page unmounts the list, so the list misses adminUpdates. Drop its
    // cached loader snapshot before going back.
    const leaveToList = useCallback(() => {
        router.clearCache({
            filter: (match) => match.routeId.endsWith('/admin/offer-addon-templates'),
        });
        return navigate({ to: '/{-$locale}/admin/offer-addon-templates' });
    }, [navigate, router]);

    const form = useForm({
        defaultValues,
        onSubmit: async ({ value }) => {
            const suggestedPriceCents = eurosToCents(value.suggestedPriceEuros);
            const position = Number.parseInt(value.position, 10);
            if (value.titleDe.trim().length === 0 || value.titleEn.trim().length === 0) {
                toast.error(t(locale, 'admin', 'copy.bothTitlesAreRequired'));
                return;
            }
            if (suggestedPriceCents == null || suggestedPriceCents < 0) {
                toast.error(t(locale, 'admin', 'copy.pleaseEnterAValidPrice'));
                return;
            }
            if (!Number.isInteger(position) || position < 0) {
                toast.error(t(locale, 'admin', 'copy.positionMustBe0OrGreater'));
                return;
            }
            const result = await upsert({
                input: {
                    offerAddonTemplateId,
                    titleDe: value.titleDe,
                    titleEn: value.titleEn,
                    descriptionDe: value.descriptionDe,
                    descriptionEn: value.descriptionEn,
                    pricingUnit: value.pricingUnit,
                    suggestedPriceCents,
                    imageFileUploadId: value.imageFileUploadId,
                    position,
                    publishedAt: value.published ? (template.publishedAt ?? new Date().toISOString()) : null,
                },
            });
            if (result.error || !result.data?.admin.offerAddonTemplateUpsert.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotSave'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.saved'));
            form.reset(value);
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const imageFileUploadId = useSelector(form.store, (state) => state.values.imageFileUploadId);
    const imageUrl = useSelector(form.store, (state) => state.values.imageUrl);
    const pricingUnit = useSelector(form.store, (state) => state.values.pricingUnit);

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminOfferAddonTemplatePageUpdatesDocument, { offerAddonTemplateId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.offerAddonTemplate;
                if (!next) {
                    void leaveToList();
                    return;
                }
                setTemplate(next);
            }),
        );
        return unsubscribe;
    }, [client, leaveToList, offerAddonTemplateId, seedAdmin]);

    useEffect(() => {
        if (!isDirty) {
            form.reset(formFromTemplate(template));
        }
    }, [form, isDirty, template]);

    async function onDelete() {
        setDeleting(true);
        try {
            const result = await remove({ offerAddonTemplateId });
            if (result.error || !result.data?.admin.offerAddonTemplateDelete.success) {
                throw new Error('delete failed');
            }
            toast.success(t(locale, 'admin', 'copy.deleted2'));
            await leaveToList();
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotDelete'));
            setDeleting(false);
        }
    }

    const imageRemoveDescription = t(locale, 'admin', 'copy.theImageWillBeRemovedFromThisTemplateSaveAfterwardsToApplyTh');

    const overflowMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isSubmitting || imageBusy || deleting}
                    aria-label={t(locale, 'admin', 'copy.moreActions')}
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
                    {t(locale, 'admin', 'copy.delete')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AdminPageChrome
            crumbs={[
                {
                    label: t(locale, 'admin', 'copy.offerExtras2'),
                    to: '/{-$locale}/admin/offer-addon-templates',
                },
                { label: template.titleDe },
            ]}
            contentClassName="min-h-0 overflow-hidden gap-0"
        >
            <AdminPinnedFooterLayout
                contentClassName="grid w-full max-w-2xl content-start gap-6"
                footer={
                    isDirty ? (
                        <>
                            {overflowMenu}
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting || imageBusy || deleting}
                                onClick={() => form.reset()}
                            >
                                {t(locale, 'admin', 'copy.cancel')}
                            </Button>
                            <Button type="submit" form="offer-addon-template-form" disabled={isSubmitting || imageBusy || deleting}>
                                {isSubmitting ? t(locale, 'admin', 'copy.saving2') : t(locale, 'admin', 'copy.save')}
                            </Button>
                        </>
                    ) : (
                        <>
                            {overflowMenu}
                            <Button type="button" disabled={isSubmitting || imageBusy || deleting} asChild>
                                <Link to="/{-$locale}/admin/offer-addon-templates">{t(locale, 'admin', 'copy.backToList2')}</Link>
                            </Button>
                        </>
                    )
                }
            >
                <div className="grid gap-1">
                    <h1 className="font-serif text-3xl/tight text-foreground">{adminOfferAddonTemplatePageTitle(locale)}</h1>
                    <p className="text-sm text-muted-foreground">{adminOfferAddonTemplatePageDescription(locale)}</p>
                </div>
                <form
                    id="offer-addon-template-form"
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <form.Field name="titleDe">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="addon-template-title-de" className="text-sm font-medium">
                                    {t(locale, 'admin', 'copy.titleGerman')}
                                </label>
                                <Input
                                    id="addon-template-title-de"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    required
                                    maxLength={255}
                                />
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="titleEn">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="addon-template-title-en" className="text-sm font-medium">
                                    {t(locale, 'admin', 'copy.titleEnglish')}
                                </label>
                                <Input
                                    id="addon-template-title-en"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    required
                                    maxLength={255}
                                    aria-describedby="addon-template-title-help"
                                />
                                <p id="addon-template-title-help" className="text-sm text-muted-foreground">
                                    {t(locale, 'admin', 'copy.cooksSeeTheTitleInTheirProfileLanguageWhenTheyCopyTheTemplat')}
                                </p>
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="descriptionDe">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="addon-template-description-de" className="text-sm font-medium">
                                    {t(locale, 'admin', 'copy.descriptionGerman')}
                                </label>
                                <Textarea
                                    id="addon-template-description-de"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    rows={4}
                                    aria-describedby="addon-template-description-help"
                                />
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="descriptionEn">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="addon-template-description-en" className="text-sm font-medium">
                                    {t(locale, 'admin', 'copy.descriptionEnglish')}
                                </label>
                                <Textarea
                                    id="addon-template-description-en"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    rows={4}
                                    aria-describedby="addon-template-description-help"
                                />
                                <p id="addon-template-description-help" className="text-sm text-muted-foreground">
                                    {t(locale, 'admin', 'copy.optionalTheCookCanChangeThisAfterCopyingTheGuestSeesItOnTheO')}
                                </p>
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="pricingUnit">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="addon-template-pricing-unit" className="text-sm font-medium">
                                    {t(locale, 'admin', 'copy.pricingUnit')}
                                </label>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(value) => field.handleChange(value as OfferAddonPricingUnit)}
                                >
                                    <SelectTrigger
                                        id="addon-template-pricing-unit"
                                        className="w-full max-w-xs"
                                        onBlur={field.handleBlur}
                                        aria-describedby="addon-template-pricing-unit-help"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FLAT">{offerAddonPricingUnitLabel('FLAT', locale)}</SelectItem>
                                        <SelectItem value="PER_PERSON">{offerAddonPricingUnitLabel('PER_PERSON', locale)}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p id="addon-template-pricing-unit-help" className="text-sm text-muted-foreground">
                                    {offerAddonPricingUnitHelp(locale)}
                                </p>
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="suggestedPriceEuros">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="addon-template-price" className="text-sm font-medium">
                                    {t(
                                        locale,
                                        'admin',
                                        pricingUnit === 'PER_PERSON' ? 'copy.suggestedPricePerPerson' : 'copy.suggestedPrice',
                                    )}
                                </label>
                                <Input
                                    id="addon-template-price"
                                    name={field.name}
                                    inputMode="decimal"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    required
                                    className="max-w-xs"
                                    aria-describedby="addon-template-price-help"
                                />
                                <p id="addon-template-price-help" className="text-sm text-muted-foreground">
                                    {offerAddonPriceFieldHelp(pricingUnit, locale)}
                                </p>
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="position">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="addon-template-position" className="text-sm font-medium">
                                    {t(locale, 'admin', 'copy.position')}
                                </label>
                                <Input
                                    id="addon-template-position"
                                    name={field.name}
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    required
                                    className="max-w-xs"
                                    aria-describedby="addon-template-position-help"
                                />
                                <p id="addon-template-position-help" className="text-sm text-muted-foreground">
                                    {t(locale, 'admin', 'copy.lowerNumbersAppearFirstInTheSuggestionList')}
                                </p>
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="published">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                                    <label htmlFor="addon-template-published" className="text-sm font-medium">
                                        {t(locale, 'admin', 'copy.published2')}
                                    </label>
                                    <Switch
                                        id="addon-template-published"
                                        checked={field.state.value}
                                        onCheckedChange={(checked) => field.handleChange(checked)}
                                        onBlur={field.handleBlur}
                                        aria-describedby="addon-template-published-help"
                                    />
                                </div>
                                <p id="addon-template-published-help" className="text-sm text-muted-foreground">
                                    {t(locale, 'admin', 'copy.onlyPublishedTemplatesShowUpForCooksUnderSuggestions')}
                                </p>
                            </div>
                        )}
                    </form.Field>
                    <div className="grid gap-1.5">
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'admin', 'copy.optionalCooksCopyThisPictureIntoTheirLibraryTheGuestSeesItOn')}
                        </p>
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
            </AdminPinnedFooterLayout>
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'admin', 'copy.deleteThisTemplate')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(locale, 'admin', 'copy.cooksWillNoLongerSeeThisTemplateExtrasAlreadyCopiedIntoALibr')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleting}
                            onClick={(event) => {
                                event.preventDefault();
                                void onDelete();
                            }}
                        >
                            {t(locale, 'admin', 'copy.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPageChrome>
    );
}
