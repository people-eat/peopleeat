import { Link, useRouter } from '@tanstack/react-router';
import { CheckIcon, CopyIcon, ExternalLinkIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { formatCurrency, formatDate } from '../../../shared';
import { formatMinuteOfDay } from '../../../shared/cookCallAvailability';
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
    const idleLabel = { de: 'Kopieren', en: 'Copy' }[locale];
    const ariaLabel = copied ? { de: 'Kopiert', en: 'Copied' }[locale] : idleLabel;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success({ de: 'In die Zwischenablage kopiert', en: 'Copied to clipboard' }[locale]);
        } catch {
            toast.error({ de: 'Kopieren in die Zwischenablage fehlgeschlagen', en: 'Could not copy to clipboard' }[locale]);
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
            return { de: 'Stadt', en: 'City' }[locale];
        case 'PARTNER':
            return { de: 'Partner', en: 'Partner' }[locale];
        case 'OCCASION':
            return { de: 'Anlass', en: 'Occasion' }[locale];
    }
}

function featuredLandingTo(kind: GqlCAdminCookFeaturedLandingKind, id: string) {
    switch (kind) {
        case 'CITY':
            return { to: '/{-$locale}/admin/cities/$cityId' as const, params: { cityId: id } };
        case 'PARTNER':
            return { to: '/{-$locale}/admin/partners/$partnerId' as const, params: { partnerId: id } };
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
    const empty = { de: 'Nicht angegeben', en: 'Not set' }[locale];

    useEffect(() => {
        setApproved(cook?.isApprovedByAdmin ?? false);
        setVisible(cook?.isVisible ?? false);
    }, [cook?.isApprovedByAdmin, cook?.isVisible]);

    if (!cook) {
        return (
            <p className="text-sm text-muted-foreground">
                {{ de: 'Kein Kochprofil für diesen Nutzer.', en: 'No cook profile for this user.' }[locale]}
            </p>
        );
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
                        toast.error({ de: 'Freischaltung fehlgeschlagen.', en: 'Could not update approval.' }[locale]);
                        return;
                    }
                    setApproved(next);
                    setPendingApproved(null);
                    toast.success(
                        next
                            ? { de: 'Koch freigeschaltet.', en: 'Cook approved.' }[locale]
                            : { de: 'Freischaltung entzogen.', en: 'Approval revoked.' }[locale],
                    );
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
                        toast.error({ de: 'Sichtbarkeit konnte nicht geändert werden.', en: 'Could not update visibility.' }[locale]);
                        return;
                    }
                    setVisible(nextVisible);
                    setPendingVisible(null);
                    toast.success(
                        nextVisible
                            ? { de: 'Profil öffentlich.', en: 'Profile public.' }[locale]
                            : { de: 'Profil verborgen.', en: 'Profile hidden.' }[locale],
                    );
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
                    {approved
                        ? { de: 'Freigeschaltet', en: 'Approved' }[locale]
                        : { de: 'Nicht freigeschaltet', en: 'Not approved' }[locale]}
                </Badge>
                <Badge variant={visible ? 'secondary' : 'outline'}>
                    {visible ? { de: 'Öffentlich sichtbar', en: 'Publicly visible' }[locale] : { de: 'Verborgen', en: 'Hidden' }[locale]}
                </Badge>
                {cook.canCreateOffers ? (
                    <Badge variant="outline">{{ de: 'Kann Angebote erstellen', en: 'Can create offers' }[locale]}</Badge>
                ) : null}
                {cook.stripeAccountActive ? <Badge variant="secondary">{{ de: 'Stripe aktiv', en: 'Stripe active' }[locale]}</Badge> : null}
                {cook.stripeAccountActiveWasReset ? (
                    <Badge variant="outline">{{ de: 'Stripe zurückgesetzt', en: 'Stripe reset' }[locale]}</Badge>
                ) : null}
                {hasRating ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <TestimonialRatingStars rating={Math.round(cook.rating.averageRating!)} />
                        <span>
                            {cook.rating.averageRating!.toFixed(1)} · {cook.rating.reviewCount}{' '}
                            {{ de: 'Bewertungen', en: 'reviews' }[locale]}
                        </span>
                    </span>
                ) : null}
            </div>

            <dl className="grid gap-6">
                <div className="grid gap-x-8 gap-y-5 @2xl:grid-cols-2 @6xl:grid-cols-3">
                    <DetailField label={{ de: 'Künstlername', en: 'Stage name' }[locale]} value={stageName ?? empty} />
                    <DetailField
                        label={{ de: 'Reiseadresse', en: 'Travel origin' }[locale]}
                        value={cook.exactTravelOriginAddress?.displayText?.trim() || empty}
                    />
                    <DetailField
                        label={{ de: 'Reisekosten / km', en: 'Travel expenses / km' }[locale]}
                        value={formatCurrency(cook.travelExpensesAmount, { locale })}
                    />
                    <DetailField
                        label={{ de: 'Max. Distanz', en: 'Max distance' }[locale]}
                        value={cook.maximumTravelDistance != null ? `${cook.maximumTravelDistance} km` : empty}
                    />
                    <DetailField label={{ de: 'Stripe-Status', en: 'Stripe status' }[locale]} value={cook.stripeStatus} />
                    <DetailField
                        label={{ de: 'Stripe Account', en: 'Stripe account' }[locale]}
                        value={stripeAccountId ?? empty}
                        mono
                        copyText={stripeAccountId ?? undefined}
                        actions={
                            cook.stripeAccountUrl ? (
                                <DetailActionLink
                                    href={cook.stripeAccountUrl}
                                    label={{ de: 'Im Stripe Dashboard öffnen', en: 'Open in Stripe Dashboard' }[locale]}
                                >
                                    <ExternalLinkIcon aria-hidden />
                                </DetailActionLink>
                            ) : undefined
                        }
                    />
                    <DetailField
                        label={{ de: 'Anrufplanung', en: 'Call scheduling' }[locale]}
                        value={
                            cook.callSchedulingEnabled
                                ? `${{ de: 'Aktiv', en: 'On' }[locale]} · ${cook.callDurationMinutes} min`
                                : { de: 'Inaktiv', en: 'Off' }[locale]
                        }
                    />
                    <DetailField
                        label={{ de: 'Erstellt', en: 'Created' }[locale]}
                        value={formatDate(cook.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                    />
                    <DetailField
                        label={{ de: 'Zuletzt geändert', en: 'Last modified' }[locale]}
                        value={formatDate(cook.lastModifiedAt, { locale, timeZone, dateStyle: 'medium' })}
                    />
                    <DetailField
                        label={{ de: 'Öffentliches Profil', en: 'Public profile' }[locale]}
                        value={
                            publicProfileLive ? (
                                <Link
                                    to="/{-$locale}/chefs/$cookId"
                                    params={{ cookId: cook.cookId }}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-sm text-foreground underline-offset-4 hover:underline"
                                >
                                    {{ de: 'Öffnen', en: 'Open' }[locale]}
                                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                                </Link>
                            ) : (
                                {
                                    de: 'Nicht live (Freischaltung und Sichtbarkeit erforderlich).',
                                    en: 'Not live (approval and visibility required).',
                                }[locale]
                            )
                        }
                    />
                </div>

                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {{ de: 'Zusätzliches Bild (About)', en: 'Additional picture (About)' }[locale]}
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
                        {{ de: 'Küchenstil und Philosophie', en: 'Cuisine style and philosophy' }[locale]}
                    </dt>
                    <dd>
                        {cook.cuisineStyle || cook.cookingPhilosophy ? (
                            <CookProfileTags cuisineStyle={cook.cuisineStyle} cookingPhilosophy={cook.cookingPhilosophy} size="md" />
                        ) : (
                            <p className="text-sm text-muted-foreground">{empty}</p>
                        )}
                    </dd>
                </div>
                <DetailField label={{ de: 'Biografie', en: 'Biography' }[locale]} value={cook.biography.trim() ? cook.biography : empty} />
                <DetailField
                    label={{ de: 'Biografie-Kurzfassung', en: 'Biography summary' }[locale]}
                    value={
                        cook.biographySummaryGenerating
                            ? { de: 'Wird erzeugt…', en: 'Generating…' }[locale]
                            : cook.biographySummary.trim()
                              ? cook.biographySummary
                              : empty
                    }
                />

                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {{ de: 'Wöchentliche Anrufzeiten', en: 'Weekly call windows' }[locale]}
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
                        {{ de: 'Vorgestellt auf', en: 'Featured on' }[locale]}
                    </dt>
                    <dd>
                        {featuredOn.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {{ de: 'Auf keiner Landing Page.', en: 'Not featured on any landing page.' }[locale]}
                            </p>
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

            <div className="grid gap-4 @2xl:grid-cols-2">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                    <div className="grid gap-1">
                        <p className="font-medium">
                            {approved
                                ? { de: 'Freigeschaltet', en: 'Approved' }[locale]
                                : { de: 'Nicht freigeschaltet', en: 'Not approved' }[locale]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Steuert Wallet-Onboarding und Angebotsfähigkeit.',
                                    en: 'Controls wallet onboarding and offer eligibility.',
                                }[locale]
                            }
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant={approved ? 'outline' : 'default'}
                        disabled={approvalBusy}
                        onClick={() => onPendingApproved(!approved)}
                    >
                        {approved
                            ? { de: 'Freischaltung entziehen', en: 'Revoke approval' }[locale]
                            : { de: 'Freischalten', en: 'Approve' }[locale]}
                    </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                    <div className="grid gap-1">
                        <p className="font-medium">{{ de: 'Öffentliche Sichtbarkeit', en: 'Public visibility' }[locale]}</p>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Steuert die Anzeige in der Kochsuche (zusätzlich zur Freischaltung).',
                                    en: 'Controls chef listing visibility (in addition to approval).',
                                }[locale]
                            }
                        </p>
                    </div>
                    <Switch
                        checked={visible}
                        disabled={visibilityBusy}
                        onCheckedChange={(next) => onPendingVisible(next)}
                        aria-label={{ de: 'Öffentliche Sichtbarkeit', en: 'Public visibility' }[locale]}
                    />
                </div>
            </div>

            <AlertDialog open={pendingApproved != null} onOpenChange={(open) => !open && onPendingApproved(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingApproved
                                ? { de: 'Koch freischalten?', en: 'Approve this cook?' }[locale]
                                : { de: 'Freischaltung entziehen?', en: 'Revoke approval?' }[locale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingApproved
                                ? {
                                      de: 'Der Koch kann Wallet-Onboarding starten und Angebote erstellen. Es wird eine E-Mail an den Koch gesendet.',
                                      en: 'The cook can start wallet onboarding and create offers. An email will be sent to the cook.',
                                  }[locale]
                                : {
                                      de: 'Wallet-Onboarding und Angebotsfähigkeit werden gesperrt. Es wird keine E-Mail gesendet.',
                                      en: 'Wallet onboarding and offer eligibility will be blocked. No email will be sent.',
                                  }[locale]}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={approvalBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            variant={pendingApproved ? 'default' : 'destructive'}
                            disabled={approvalBusy}
                            onClick={() => void onConfirmApproval()}
                        >
                            {pendingApproved ? { de: 'Freischalten', en: 'Approve' }[locale] : { de: 'Entziehen', en: 'Revoke' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={pendingVisible != null} onOpenChange={(open) => !open && onPendingVisible(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingVisible
                                ? { de: 'Profil öffentlich machen?', en: 'Make profile public?' }[locale]
                                : { de: 'Profil verbergen?', en: 'Hide profile?' }[locale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingVisible
                                ? {
                                      de: 'Das Profil erscheint in der Kochsuche, sobald der Koch freigeschaltet ist.',
                                      en: 'The profile appears in the chef listing once the cook is approved.',
                                  }[locale]
                                : {
                                      de: 'Das Profil verschwindet aus der Kochsuche.',
                                      en: 'The profile will disappear from the chef listing.',
                                  }[locale]}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={visibilityBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction disabled={visibilityBusy} onClick={() => void onConfirmVisibility()}>
                            {pendingVisible
                                ? { de: 'Öffentlich machen', en: 'Make public' }[locale]
                                : { de: 'Verbergen', en: 'Hide' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
