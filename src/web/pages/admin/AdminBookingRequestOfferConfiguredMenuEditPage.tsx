import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { userDisplayName } from '../../../shared';
import { idCreate } from '../../../shared/idCreate';
import {
    AdminConfiguredMenuCoursesEditor,
    adminConfiguredMenuDraftValidate,
    createEmptyConfiguredMenuCourse,
} from '../../components/AdminConfiguredMenuCoursesEditor';
import type { AdminConfiguredMenuCourseDraft } from '../../components/AdminConfiguredMenuCoursesEditor';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import type {
    GqlCAdminBookingRequestOfferConfiguredMenuEditPageOfferFragment,
    GqlCAdminBookingRequestOfferConfiguredMenuEditPageQuery,
} from '../../graphql/generated';
import { AdminBookingRequestOfferConfiguredMenuUpdateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { adminStubRouteBySlug, adminStubRouteTitle } from './adminCatalog';

const listRoute = adminStubRouteBySlug('booking-requests');

type FormValues = {
    title: string;
    description: string;
    courses: AdminConfiguredMenuCourseDraft[];
};

const EMPTY_FORM_VALUES: FormValues = { title: '', description: '', courses: [] };

export function adminBookingRequestOfferConfiguredMenuEditPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.bookingRequestOfferConfiguredMenuEdit.title');
}
export function adminBookingRequestOfferConfiguredMenuEditPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.bookingRequestOfferConfiguredMenuEdit.description');
}

export function adminBookingRequestOfferConfiguredMenuEditPageVariables(bookingRequestId: string, bookingRequestOfferId: string) {
    return { bookingRequestId, bookingRequestOfferId };
}

function formFromConfiguredMenu(
    configuredMenu: NonNullable<GqlCAdminBookingRequestOfferConfiguredMenuEditPageOfferFragment['configuredMenu']>,
): FormValues {
    return {
        title: configuredMenu.title,
        description: configuredMenu.description,
        courses:
            configuredMenu.courses.length > 0
                ? configuredMenu.courses.map((course) => ({
                      key: idCreate(),
                      title: course.title,
                      meals:
                          course.meals.length > 0
                              ? course.meals.map((meal) => ({
                                    key: idCreate(),
                                    mealTitle: meal.mealTitle,
                                    mealDescription: meal.mealDescription,
                                    mealImageUrl: meal.mealImageUrl ?? '',
                                }))
                              : createEmptyConfiguredMenuCourse().meals,
                  }))
                : [createEmptyConfiguredMenuCourse()],
    };
}

export function AdminBookingRequestOfferConfiguredMenuEditPage({
    data,
    bookingRequestId,
    bookingRequestOfferId,
}: {
    data: GqlCAdminBookingRequestOfferConfiguredMenuEditPageQuery;
    bookingRequestId: string;
    bookingRequestOfferId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const formId = useId();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedOffer = seedAdmin?.bookingRequestOffer ?? null;
    const seedRequest = seedAdmin?.bookingRequest ?? null;
    if (!seedOffer || seedOffer.bookingRequestOfferId !== bookingRequestOfferId || seedOffer.bookingRequestId !== bookingRequestId) {
        throw notFound();
    }
    if (!seedRequest) throw notFound();

    const configuredMenu = seedOffer.configuredMenu;
    const [, updateConfiguredMenu] = useMutation(AdminBookingRequestOfferConfiguredMenuUpdateDocument);
    const [showValidation, setShowValidation] = useState(false);
    // Seed once: draft keys use random UUIDs, so rebuilding defaultValues every render
    // makes TanStack Form treat the form as continuously changing.
    const [defaultValues] = useState(() => (configuredMenu ? formFromConfiguredMenu(configuredMenu) : EMPTY_FORM_VALUES));

    const form = useForm({
        defaultValues,
        onSubmit: async ({ value }) => {
            setShowValidation(true);
            if (value.title.trim() === '') {
                toast.error(t(locale, 'admin', 'copy.pleaseEnterAMenuTitle'));
                return;
            }
            const coursesError = adminConfiguredMenuDraftValidate(value.courses, locale);
            if (coursesError) {
                toast.error(coursesError);
                return;
            }

            try {
                const result = await updateConfiguredMenu({
                    bookingRequestOfferId,
                    configuredMenu: {
                        title: value.title.trim(),
                        description: value.description.trim(),
                        courses: value.courses.map((course) => ({
                            title: course.title.trim(),
                            meals: course.meals.map((meal) => ({
                                mealTitle: meal.mealTitle.trim(),
                                mealDescription: meal.mealDescription.trim(),
                                mealImageUrl: meal.mealImageUrl.trim() === '' ? null : meal.mealImageUrl.trim(),
                            })),
                        })),
                    },
                });
                if (!result.data?.admin.bookingRequestOfferConfiguredMenuUpdate.success) {
                    throw new Error('update failed');
                }
                toast.success(t(locale, 'admin', 'copy.configuredMenuUpdated'));
                await navigate({
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                    params: { bookingRequestId, bookingRequestOfferId },
                    search: { tab: 'menu' },
                });
            } catch {
                toast.error(t(locale, 'admin', 'copy.updateFailed'));
            }
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const titleValue = useSelector(form.store, (state) => state.values.title);
    const coursesValue = useSelector(form.store, (state) => state.values.courses);
    const coursesValidationError = showValidation ? adminConfiguredMenuDraftValidate(coursesValue, locale) : null;

    const offerHref = {
        to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId' as const,
        params: { bookingRequestId, bookingRequestOfferId },
        search: { tab: 'menu' as const },
    };

    return (
        <AdminPageChrome
            crumbs={[
                { label: adminStubRouteTitle(listRoute.slug, locale), to: '/{-$locale}/admin/booking-requests' },
                {
                    label: seedRequest.occasion.trim() || t(locale, 'admin', 'copy.request'),
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
                    params: { bookingRequestId },
                },
                { label: adminBookingRequestOfferConfiguredMenuEditPageTitle(locale) },
            ]}
        >
            <AdminPinnedFooterLayout
                contentClassName="grid w-full content-start gap-8"
                footer={
                    configuredMenu ? (
                        <>
                            <Button type="button" variant="outline" disabled={isSubmitting} asChild>
                                <Link to={offerHref.to} params={offerHref.params} search={offerHref.search}>
                                    {t(locale, 'admin', 'copy.cancel')}
                                </Link>
                            </Button>
                            <Button type="submit" form="admin-configured-menu-edit-form" disabled={isSubmitting}>
                                {isSubmitting ? t(locale, 'admin', 'copy.saving2') : t(locale, 'admin', 'copy.save')}
                            </Button>
                        </>
                    ) : (
                        <Button type="button" variant="outline" asChild>
                            <Link to={offerHref.to} params={offerHref.params} search={offerHref.search}>
                                {t(locale, 'admin', 'copy.backToOffer')}
                            </Link>
                        </Button>
                    )
                }
            >
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl/tight text-foreground">
                        {adminBookingRequestOfferConfiguredMenuEditPageTitle(locale)}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {userDisplayName(seedOffer.cook.user)} · {adminBookingRequestOfferConfiguredMenuEditPageDescription(locale)}
                    </p>
                </div>

                {configuredMenu == null ? (
                    <StatusAlert tone="info" title={t(locale, 'admin', 'copy.noConfiguredMenu')}>
                        {t(locale, 'admin', 'copy.thisOfferHasNoFrozenMenuYetOnceTheCustomerSelectsMealsYouCan')}
                    </StatusAlert>
                ) : (
                    <form
                        id="admin-configured-menu-edit-form"
                        className="grid max-w-2xl gap-6"
                        onSubmit={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void form.handleSubmit();
                        }}
                    >
                        <form.Field name="title">
                            {(field) => {
                                const titleError = showValidation && field.state.value.trim() === '';
                                return (
                                    <div className="grid gap-1.5">
                                        <label htmlFor={`${formId}-title`} className="text-sm font-medium">
                                            {t(locale, 'admin', 'copy.menuTitle')}
                                        </label>
                                        <Input
                                            id={`${formId}-title`}
                                            value={field.state.value}
                                            disabled={isSubmitting}
                                            aria-invalid={titleError || undefined}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                        />
                                        {titleError ? (
                                            <p className="text-sm text-destructive">{t(locale, 'admin', 'copy.pleaseEnterAMenuTitle')}</p>
                                        ) : null}
                                    </div>
                                );
                            }}
                        </form.Field>

                        <form.Field name="description">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <label htmlFor={`${formId}-description`} className="text-sm font-medium">
                                        {t(locale, 'admin', 'copy.description')}
                                    </label>
                                    <Textarea
                                        id={`${formId}-description`}
                                        value={field.state.value}
                                        disabled={isSubmitting}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                    />
                                </div>
                            )}
                        </form.Field>

                        {showValidation && titleValue.trim() !== '' && coursesValidationError ? (
                            <StatusAlert tone="error" title={t(locale, 'admin', 'copy.pleaseCheckYourInputs')}>
                                {coursesValidationError}
                            </StatusAlert>
                        ) : null}

                        <div className="grid gap-2">
                            <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                                {t(locale, 'admin', 'copy.courses')}
                            </h2>
                            <form.Field name="courses">
                                {(field) => (
                                    <AdminConfiguredMenuCoursesEditor
                                        courses={field.state.value}
                                        onChange={(next) => field.handleChange(next)}
                                        disabled={isSubmitting}
                                        showValidation={showValidation}
                                    />
                                )}
                            </form.Field>
                        </div>
                    </form>
                )}
            </AdminPinnedFooterLayout>
        </AdminPageChrome>
    );
}
