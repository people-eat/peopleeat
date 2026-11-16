import { useNavigate } from '@tanstack/react-router';
import { CheckIcon, CopyIcon, ShareIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { COOK_INVITE_LIVE_BOOKING_COUNT, COOK_INVITE_LIVE_PLATFORM_FEE_PERCENT_COOK } from '../../../shared';
import { AppImage } from '../../components/AppImage';
import { Button } from '../../components/base/button';
import { Card, CardContent } from '../../components/base/card';
import { StatusAlert } from '../../components/base/status-alert';
import type { GqlCProfileCookInviteCookFragment, GqlCProfileCookInvitePageQuery } from '../../graphql/generated';
import { ProfileCookInvitePageUpdatesDocument } from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('invite');
export const profileCookInvitePageTitle = route.title;
export const profileCookInvitePageDescription = route.description;

const COOK_INVITE_ILLUSTRATION = {
    src: '/illustrations/cook-invite.png',
    width: 1402,
    height: 830,
} as const;

const milestones = ['registered', 'approved', 'firstOfferCreated', 'firstEvent'] as const;

function InviteeProgress({ invitee }: { invitee: GqlCProfileCookInviteCookFragment['invitees'][number] }) {
    const locale = useLocale();
    const done = {
        registered: invitee.registered,
        approved: invitee.approved,
        firstOfferCreated: invitee.firstOfferCreated,
        firstEvent: invitee.firstEvent,
    };

    return (
        <Card className="gap-0 py-0">
            <CardContent className="grid gap-4 p-4 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-foreground">{invitee.display}</p>
                    {invitee.rewardUnlocked ? (
                        <p className="text-xs font-medium text-muted-foreground">{t(locale, 'profileCook', 'invite.rewardUnlocked')}</p>
                    ) : null}
                </div>
                <ol className="grid grid-cols-4 gap-0">
                    {milestones.map((step, index) => {
                        const complete = done[step];
                        const previousMilestone = milestones[index - 1];
                        const previousComplete = previousMilestone != null && done[previousMilestone];
                        return (
                            <li key={step} className="grid justify-items-center gap-2 text-center">
                                <div className="relative flex h-8 w-full items-center justify-center">
                                    {index > 0 ? (
                                        <span
                                            aria-hidden
                                            className={cn(
                                                'absolute top-1/2 right-[calc(50%+1.25rem)] left-[calc(-50%+1.25rem)] h-px -translate-y-1/2 bg-[repeating-linear-gradient(to_right,currentColor_0_5px,transparent_5px_14px)]',
                                                previousComplete ? 'text-green-300' : 'text-border',
                                            )}
                                        />
                                    ) : null}
                                    <span
                                        className={cn(
                                            'relative z-10 flex size-8 items-center justify-center rounded-full text-sm font-medium',
                                            complete
                                                ? 'border border-green-600 bg-green-200 text-green-600'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                        aria-hidden
                                    >
                                        {complete ? <CheckIcon className="size-4" /> : index + 1}
                                    </span>
                                </div>
                                <span className={cn('px-0.5 text-xs sm:text-sm', complete ? 'text-foreground' : 'text-muted-foreground')}>
                                    {t(locale, 'profileCook', `invite.milestones.${step}`)}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </CardContent>
        </Card>
    );
}

export function ProfileCookInvitePage({ data }: { data: GqlCProfileCookInvitePageQuery }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/profile/invite' });
    const inviteEnabled = useFeatureToggleActive('COOK_INVITE');
    const client = useClient();
    const seedCook = data.currentSession.user?.cook ?? null;
    const [cook, setCook] = useState(seedCook);
    const [copyDone, setCopyDone] = useState(false);

    useEffect(() => {
        setCook(seedCook);
    }, [seedCook]);

    useEffect(() => {
        if (!inviteEnabled) {
            void navigate({ to: '/{-$locale}/profile', replace: true });
        }
    }, [inviteEnabled, navigate]);

    useEffect(() => {
        const request = createRequest(ProfileCookInvitePageUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.userUpdates.cook;
                if (next) setCook(next);
            }),
        );
        return unsubscribe;
    }, [client]);

    const inviteUrl = useMemo(() => {
        if (cook == null || typeof window === 'undefined') return '';
        const url = new URL('/chef-sign-up', window.location.origin);
        if (locale === 'en') {
            url.pathname = '/en/chef-sign-up';
        }
        url.searchParams.set('invite', cook.cookId);
        return url.toString();
    }, [cook, locale]);

    if (!inviteEnabled || cook == null) {
        return null;
    }

    async function onCopy() {
        if (!inviteUrl) return;
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopyDone(true);
            window.setTimeout(() => setCopyDone(false), 2000);
        } catch {
            // Clipboard may be denied; leave the URL visible for manual copy.
        }
    }

    async function onShare() {
        if (!inviteUrl || typeof navigator.share !== 'function') {
            await onCopy();
            return;
        }
        try {
            await navigator.share({
                title: t(locale, 'profileCook', 'invite.shareTitle'),
                text: t(locale, 'profileCook', 'invite.shareText'),
                url: inviteUrl,
            });
        } catch {
            // User cancelled share.
        }
    }

    const illustrationAlt = t(locale, 'profileCook', 'invite.illustrationAlt');

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-3xl content-start gap-8">
            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] sm:items-center sm:gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-2xl/tight text-foreground">{profileCookInvitePageTitle(locale)}</h1>
                    <p className="text-muted-foreground">{profileCookInvitePageDescription(locale)}</p>
                </div>
                <div className="justify-self-center overflow-hidden rounded-2xl bg-background sm:justify-self-end">
                    <AppImage
                        priority
                        src={COOK_INVITE_ILLUSTRATION.src}
                        width={COOK_INVITE_ILLUSTRATION.width}
                        height={COOK_INVITE_ILLUSTRATION.height}
                        alt={illustrationAlt}
                        className="h-auto w-full max-w-xs sm:max-w-56"
                    />
                </div>
            </div>

            {!cook.isApprovedByAdmin ? (
                <StatusAlert tone="warning" title={t(locale, 'profileCook', 'invite.approvalPending')}>
                    {t(locale, 'profileCook', 'invite.approvalPendingBody')}
                </StatusAlert>
            ) : null}

            <Card className="gap-0 py-0">
                <CardContent className="grid gap-4 p-4 sm:p-6">
                    <div className="grid gap-1">
                        <p className="font-medium text-foreground">{t(locale, 'profileCook', 'invite.yourLink')}</p>
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'profileCook', 'invite.rewardHint', {
                                percent: COOK_INVITE_LIVE_PLATFORM_FEE_PERCENT_COOK,
                                count: COOK_INVITE_LIVE_BOOKING_COUNT,
                            })}
                        </p>
                    </div>
                    <p className="break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">{inviteUrl}</p>
                    {cook.inviteOpenFeeCreditRemainingBookings > 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'profileCook', 'invite.remainingBookings', {
                                count: cook.inviteOpenFeeCreditRemainingBookings,
                            })}
                        </p>
                    ) : null}
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => void onCopy()}>
                            <CopyIcon aria-hidden />
                            {copyDone ? t(locale, 'profileCook', 'invite.copied') : t(locale, 'profileCook', 'invite.copyLink')}
                        </Button>
                        <Button type="button" size="sm" onClick={() => void onShare()}>
                            <ShareIcon aria-hidden />
                            {t(locale, 'profileCook', 'invite.share')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <section className="grid gap-3" aria-labelledby="cook-invite-progress">
                <h2 id="cook-invite-progress" className="text-sm font-medium text-foreground">
                    {t(locale, 'profileCook', 'invite.invitedChefs')}
                </h2>
                {cook.invitees.length === 0 ? (
                    <StatusAlert tone="info" title={t(locale, 'profileCook', 'invite.noInvites')}>
                        {t(locale, 'profileCook', 'invite.noInvitesBody')}
                    </StatusAlert>
                ) : (
                    <ul className="grid gap-3">
                        {cook.invitees.map((invitee) => (
                            <li key={invitee.cookId}>
                                <InviteeProgress invitee={invitee} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}
