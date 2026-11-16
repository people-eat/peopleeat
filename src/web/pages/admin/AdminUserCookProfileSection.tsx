import { Link, useRouter } from '@tanstack/react-router';
import { CheckIcon, CopyIcon, ExternalLinkIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatCurrency, formatDate } from '../../../shared';
import { formatMinuteOfDay } from '../../../shared/cookCallAvailability';
import { AdminCookStripeFinances } from '../../components/AdminCookStripeFinances';
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
import { Switch } from '../../components/base/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
import { CookDefaultOfferMessageReadout } from '../../components/CookDefaultOfferMessageFields';
import { CookPresenceLinksReadout } from '../../components/CookPresenceLinksEditor';
import { CookProfileTags } from '../../components/CookProfileTags';
import { TestimonialRatingStars } from '../../components/TestimonialRatingStars';
import type { GqlCAdminCookFeaturedLandingKind, GqlCAdminUserPageQuery } from '../../graphql/generated';
import { AdminCookApprovalUpdateDocument, AdminUserCookUpdateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';

type AdminUserRow = NonNullable<NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['user']>;
type AdminCookRow = NonNullable<AdminUserRow['cook']>;

function CopyValueButton({ text }: { text: string }) {
    const locale = useLocale();
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleLabel = t(locale, 'admin', 'copy.copy');
    const ariaLabel = copied ? t(locale, 'admin', 'copy.copied') : idleLabel;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(t(locale, 'admin', 'copy.copiedToClipboard'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotCopyToClipboard'));
        }
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
    }, [text, locale]);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={ariaLabel}
                    onClick={() => void onCopy()}
                    className="opacity-70 hover:opacity-100"
                >
                    {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{ariaLabel}</TooltipContent>
        </Tooltip>
    );
}

function DetailActionLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-xs" asChild className="opacity-70 hover:opacity-100">
                    <a href={href} target="_blank" rel="noreferrer" aria-label={label}>
                        {children}
                    </a>
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

function DetailField({
    label,
    value,
    mono,
    copyText,
    actions,
}: {
    label: string;
    value: ReactNode;
    mono?: boolean;
    copyText?: string;
    actions?: ReactNode;
}) {
    const hasActions = copyText != null || actions != null;
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="flex min-w-0 items-start gap-1">
                <div
                    className={
                        mono
                            ? 'min-w-0 flex-1 font-mono text-sm break-all text-foreground'
                            : 'min-w-0 flex-1 text-sm whitespace-pre-wrap text-foreground'
                    }
                >
                    {value}
                </div>
                {hasActions ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                        {actions}
                        {copyText != null ? <CopyValueButton text={copyText} /> : null}
                    </div>
                ) : null}
            </dd>
        </div>
    );
}

function weekdayLabel(dayOfWeek: number, locale: Locale): string {
    const labels =
        locale === 'de'
            ? ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
            : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return labels[dayOfWeek] ?? String(dayOfWeek);
}

function featuredLandingKindLabel(kind: GqlCAdminCookFeaturedLandingKind, locale: Locale): string {
    switch (kind) {
        case 'CITY':
            return t(locale, 'admin', 'copy.city');
        case 'PARTNER_VENUE':
            return t(locale, 'admin', 'copy.venue');
        case 'OCCASION':
            return t(locale, 'admin', 'copy.occasion');
    }
}

function featuredLandingTo(kind: GqlCAdminCookFeaturedLandingKind, id: string) {
    switch (kind) {
        case 'CITY':
            return { to: '/{-$locale}/admin/cities/$cityId' as const, params: { cityId: id } };
        case 'PARTNER_VENUE':
            return { to: '/{-$locale}/admin/partner-venues/$partnerVenueId' as const, params: { partnerVenueId: id } };
        case 'OCCASION':
            return { to: '/{-$locale}/admin/occasions/$occasionId' as const, params: { occasionId: id } };
    }
}

export function AdminUserCookProfileSection({ user }: { user: AdminUserRow }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const router = useRouter();
    const cook = user.cook;
    const [, approvalUpdate] = useMutation(AdminCookApprovalUpdateDocument);
    const [, cookUpdate] = useMutation(AdminUserCookUpdateDocument);
    const [approvalBusy, setApprovalBusy] = useState(false);
    const [approved, setApproved] = useState(cook?.isApprovedByAdmin ?? false);
    const [pendingApproved, setPendingApproved] = useState<boolean | null>(null);
    const [visible, setVisible] = useState(cook?.isVisible ?? false);
    const [visibilityBusy, setVisibilityBusy] = useState(false);
    const [pendingVisible, setPendingVisible] = useState<boolean | null>(null);
    const empty = t(locale, 'admin', 'copy.notSet');

    useEffect(() => {
        setApproved(cook?.isApprovedByAdmin ?? false);
        setVisible(cook?.isVisible ?? false);
    }, [cook?.isApprovedByAdmin, cook?.isVisible]);

    if (!cook) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noCookProfileForThisUser')}</p>;
    }

    return (
        <AdminUserCookProfileBody
            cook={cook}
            approved={approved}
            visible={visible}
            approvalBusy={approvalBusy}
            visibilityBusy={visibilityBusy}
            pendingApproved={pendingApproved}
            pendingVisible={pendingVisible}
            empty={empty}
            locale={locale}
            timeZone={timeZone}
            onPendingApproved={setPendingApproved}
            onPendingVisible={setPendingVisible}
            onConfirmApproval={async () => {
                if (pendingApproved == null) return;
                const next = pendingApproved;
                setApprovalBusy(true);
                try {
                    const result = await approvalUpdate({ cookId: cook.cookId, isApprovedByAdmin: next });
                    if (result.error || !result.data?.admin.cookApprovalUpdate.success) {
                        toast.error(t(locale, 'admin', 'copy.couldNotUpdateApproval'));
                        return;
                    }
                    setApproved(next);
                    setPendingApproved(null);
                    toast.success(next ? t(locale, 'admin', 'copy.cookApproved') : t(locale, 'admin', 'copy.approvalRevoked'));
                    await router.invalidate();
                } finally {
                    setApprovalBusy(false);
                }
            }}
            onConfirmVisibility={async () => {
                if (pendingVisible == null) return;
                const nextVisible = pendingVisible;
                setVisibilityBusy(true);
                try {
                    const result = await cookUpdate({ cookId: cook.cookId, input: { isVisible: nextVisible } });
                    if (result.error || !result.data?.admin.cookUpdate.success) {
                        toast.error(t(locale, 'admin', 'copy.couldNotUpdateVisibility'));
                        return;
                    }
                    setVisible(nextVisible);
                    setPendingVisible(null);
                    toast.success(nextVisible ? t(locale, 'admin', 'copy.profilePublic') : t(locale, 'admin', 'copy.profileHidden'));
                    await router.invalidate();
                } finally {
                    setVisibilityBusy(false);
                }
            }}
        />
    );
}

function AdminUserCookProfileBody({
    cook,
    approved,
    visible,
    approvalBusy,
    visibilityBusy,
    pendingApproved,
    pendingVisible,
    empty,
    locale,
    timeZone,
    onPendingApproved,
    onPendingVisible,
    onConfirmApproval,
    onConfirmVisibility,
}: {
    cook: AdminCookRow;
    approved: boolean;
    visible: boolean;
    approvalBusy: boolean;
    visibilityBusy: boolean;
    pendingApproved: boolean | null;
    pendingVisible: boolean | null;
    empty: string;
    locale: Locale;
    timeZone: string;
    onPendingApproved: (next: boolean | null) => void;
    onPendingVisible: (next: boolean | null) => void;
    onConfirmApproval: () => void | Promise<void>;
    onConfirmVisibility: () => void | Promise<void>;
}) {
    const stripeAccountId = cook.stripeAccountId?.trim() || null;
    const stageName = cook.stageName?.trim() || null;
    const publicProfileLive = approved && visible;
    const hasRating = cook.rating.reviewCount > 0 && cook.rating.averageRating != null;
    const callRules = cook.callAvailabilityRules;
    const featuredOn = cook.featuredOn;

    return (
        <div className="@container grid w-full min-w-0 gap-8">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={approved ? 'default' : 'outline'}>
                    {approved ? t(locale, 'admin', 'copy.approved') : t(locale, 'admin', 'copy.notApproved')}
                </Badge>
                <Badge variant={visible ? 'secondary' : 'outline'}>
                    {visible ? t(locale, 'admin', 'copy.publiclyVisible') : t(locale, 'admin', 'copy.hidden')}
                </Badge>
                {cook.canCreateOffers ? <Badge variant="outline">{t(locale, 'admin', 'copy.canCreateOffers')}</Badge> : null}
                {cook.stripeAccountActive ? <Badge variant="secondary">{t(locale, 'admin', 'copy.stripeActive')}</Badge> : null}
                {cook.stripeAccountActiveWasReset ? <Badge variant="outline">{t(locale, 'admin', 'copy.stripeReset')}</Badge> : null}
                {hasRating ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <TestimonialRatingStars rating={Math.round(cook.rating.averageRating!)} />
                        <span>
                            {cook.rating.averageRating!.toFixed(1)} · {cook.rating.reviewCount}{' '}
                            {cook.rating.reviewCount === 1 ? t(locale, 'admin', 'copy.review') : t(locale, 'admin', 'copy.reviews')}
                        </span>
                    </span>
                ) : null}
            </div>

            <dl className="grid gap-6">
                <div className="grid gap-x-8 gap-y-5 @2xl:grid-cols-2 @6xl:grid-cols-3">
                    <DetailField label={t(locale, 'admin', 'copy.stageName')} value={stageName ?? empty} />
                    <DetailField
                        label={t(locale, 'admin', 'copy.travelOrigin')}
                        value={cook.exactTravelOriginAddress?.displayText?.trim() || empty}
                    />
                    <DetailField
                        label={t(locale, 'admin', 'copy.travelExpensesKm')}
                        value={formatCurrency(cook.travelExpensesAmount, { locale })}
                    />
                    <DetailField
                        label={t(locale, 'admin', 'copy.maxDistance')}
                        value={cook.maximumTravelDistance != null ? `${cook.maximumTravelDistance} km` : empty}
                    />
                    <DetailField label={t(locale, 'admin', 'copy.stripeStatus')} value={cook.stripeStatus} />
                    <DetailField
                        label={t(locale, 'admin', 'copy.stripeAccount')}
                        value={stripeAccountId ?? empty}
                        mono
                        copyText={stripeAccountId ?? undefined}
                        actions={
                            cook.stripeAccountUrl ? (
                                <DetailActionLink href={cook.stripeAccountUrl} label={t(locale, 'admin', 'copy.openInStripeDashboard')}>
                                    <ExternalLinkIcon aria-hidden />
                                </DetailActionLink>
                            ) : undefined
                        }
                    />
                    <DetailField
                        label={t(locale, 'admin', 'copy.callScheduling')}
                        value={
                            cook.callSchedulingEnabled
                                ? `${t(locale, 'admin', 'copy.on')} · ${cook.callDurationMinutes} min`
                                : t(locale, 'admin', 'copy.off')
                        }
                    />
                    <DetailField
                        label={t(locale, 'admin', 'copy.created')}
                        value={formatDate(cook.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                    />
                    <DetailField
                        label={t(locale, 'admin', 'copy.lastModified')}
                        value={formatDate(cook.lastModifiedAt, { locale, timeZone, dateStyle: 'medium' })}
                    />
                    <DetailField
                        label={t(locale, 'admin', 'copy.publicUrl')}
                        value={`/chefs/${cook.pathName}`}
                        copyText={`/chefs/${cook.pathName}`}
                    />
                    {cook.previousPathNames.length > 0 ? (
                        <DetailField
                            label={t(locale, 'admin', 'copy.previousPaths')}
                            value={cook.previousPathNames.map((name) => `/chefs/${name}`).join(', ')}
                        />
                    ) : null}
                    <DetailField
                        label={t(locale, 'admin', 'copy.publicProfile')}
                        value={
                            publicProfileLive ? (
                                <Link
                                    to="/{-$locale}/chefs/$pathName"
                                    params={{ pathName: cook.pathName }}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-sm text-foreground underline-offset-4 hover:underline"
                                >
                                    {t(locale, 'admin', 'copy.open2')}
                                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                                </Link>
                            ) : (
                                t(locale, 'admin', 'copy.notLiveApprovalAndVisibilityRequired')
                            )
                        }
                    />
                </div>

                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'admin', 'copy.additionalPictureAbout')}
                    </dt>
                    <dd>
                        {cook.logo?.url ? (
                            <img
                                src={cook.logo.url}
                                alt=""
                                className="aspect-video max-w-xs rounded-lg border border-border object-cover"
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">{empty}</p>
                        )}
                    </dd>
                </div>

                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'admin', 'copy.cuisineStyleAndPhilosophy')}
                    </dt>
                    <dd>
                        {cook.cuisineStyle || cook.cookingPhilosophy ? (
                            <CookProfileTags cuisineStyle={cook.cuisineStyle} cookingPhilosophy={cook.cookingPhilosophy} size="md" />
                        ) : (
                            <p className="text-sm text-muted-foreground">{empty}</p>
                        )}
                    </dd>
                </div>
                <DetailField label={t(locale, 'admin', 'copy.biography')} value={cook.biography.trim() ? cook.biography : empty} />
                <DetailField
                    label={t(locale, 'admin', 'copy.biographySummary')}
                    value={
                        cook.biographySummaryGenerating
                            ? t(locale, 'admin', 'copy.generating')
                            : cook.biographySummary.trim()
                              ? cook.biographySummary
                              : empty
                    }
                />

                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'admin', 'copy.weeklyCallWindows')}
                    </dt>
                    <dd>
                        {callRules.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{empty}</p>
                        ) : (
                            <ul className="grid gap-1 text-sm text-foreground">
                                {callRules.map((rule) => (
                                    <li key={rule.cookCallAvailabilityRuleId}>
                                        {weekdayLabel(rule.dayOfWeek, locale)} · {formatMinuteOfDay(rule.startMinuteOfDay)}–
                                        {formatMinuteOfDay(rule.endMinuteOfDay)}
                                        {locale === 'de' ? ' Uhr' : ''}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </dd>
                </div>

                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'admin', 'copy.featuredOn')}
                    </dt>
                    <dd>
                        {featuredOn.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.notFeaturedOnAnyLandingPage')}</p>
                        ) : (
                            <ul className="grid gap-2">
                                {featuredOn.map((landing) => {
                                    const link = featuredLandingTo(landing.kind, landing.id);
                                    const title = locale === 'de' ? landing.titleDe : landing.titleEn || landing.titleDe;
                                    return (
                                        <li key={`${landing.kind}-${landing.id}`}>
                                            <Link
                                                to={link.to}
                                                params={link.params}
                                                className="inline-flex flex-wrap items-center gap-2 text-sm text-foreground underline-offset-4 hover:underline"
                                            >
                                                <Badge variant="outline">{featuredLandingKindLabel(landing.kind, locale)}</Badge>
                                                <span>{title}</span>
                                                <span className="text-muted-foreground">/{landing.pathName}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </dd>
                </div>
            </dl>

            <section className="grid gap-3">
                <div className="grid gap-1">
                    <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'admin', 'copy.defaultOfferNote')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.prefillsWhenTheCookCreatesAnOfferGuestsSeeItAsTheFirstChatMe')}
                    </p>
                </div>
                <CookDefaultOfferMessageReadout value={cook.defaultOfferMessage ?? null} />
            </section>

            <section className="grid gap-3">
                <div className="grid gap-1">
                    <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'admin', 'copy.otherProfiles')}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.forReviewOnlyCustomersDoNotSeeTheseLinks')}</p>
                </div>
                <CookPresenceLinksReadout links={cook.presenceLinks} />
            </section>

            <AdminCookStripeFinances
                stripeStatus={cook.stripeStatus}
                stripeAccountDetails={cook.stripeAccountDetails}
                stripeWallet={cook.stripeWallet}
            />

            <div className="grid gap-4 @2xl:grid-cols-2">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                    <div className="grid gap-1">
                        <p className="font-medium">
                            {approved ? t(locale, 'admin', 'copy.approved') : t(locale, 'admin', 'copy.notApproved')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'admin', 'copy.controlsWalletOnboardingAndOfferEligibility')}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant={approved ? 'outline' : 'default'}
                        disabled={approvalBusy}
                        onClick={() => onPendingApproved(!approved)}
                    >
                        {approved ? t(locale, 'admin', 'copy.revokeApproval') : t(locale, 'admin', 'copy.approve')}
                    </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                    <div className="grid gap-1">
                        <p className="font-medium">{t(locale, 'admin', 'copy.publicVisibility')}</p>
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'admin', 'copy.controlsChefListingVisibilityInAdditionToApproval')}
                        </p>
                    </div>
                    <Switch
                        checked={visible}
                        disabled={visibilityBusy}
                        onCheckedChange={(next) => onPendingVisible(next)}
                        aria-label={t(locale, 'admin', 'copy.publicVisibility')}
                    />
                </div>
            </div>

            <AlertDialog open={pendingApproved != null} onOpenChange={(open) => !open && onPendingApproved(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingApproved ? t(locale, 'admin', 'copy.approveThisCook') : t(locale, 'admin', 'copy.revokeApproval2')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingApproved
                                ? t(locale, 'admin', 'copy.theCookCanStartWalletOnboardingAndCreateOffersAnEmailWillBeS')
                                : t(locale, 'admin', 'copy.walletOnboardingAndOfferEligibilityWillBeBlockedNoEmailWillB')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={approvalBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            variant={pendingApproved ? 'default' : 'destructive'}
                            disabled={approvalBusy}
                            onClick={() => void onConfirmApproval()}
                        >
                            {pendingApproved ? t(locale, 'admin', 'copy.approve') : t(locale, 'admin', 'copy.revoke2')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={pendingVisible != null} onOpenChange={(open) => !open && onPendingVisible(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingVisible ? t(locale, 'admin', 'copy.makeProfilePublic') : t(locale, 'admin', 'copy.hideProfile')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingVisible
                                ? t(locale, 'admin', 'copy.theProfileAppearsInTheChefListingOnceTheCookIsApproved')
                                : t(locale, 'admin', 'copy.theProfileWillDisappearFromTheChefListing')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={visibilityBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                        <AlertDialogAction disabled={visibilityBusy} onClick={() => void onConfirmVisibility()}>
                            {pendingVisible ? t(locale, 'admin', 'copy.makePublic') : t(locale, 'admin', 'copy.hide')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
