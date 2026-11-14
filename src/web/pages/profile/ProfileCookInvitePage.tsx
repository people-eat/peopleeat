import { useNavigate } from '@tanstack/react-router';
import { CheckIcon, CopyIcon, ShareIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

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

const milestones = [
    { key: 'registered', de: 'Registriert', en: 'Registered' },
    { key: 'approved', de: 'Freigegeben', en: 'Approved' },
    { key: 'firstOfferCreated', de: 'Erstes Angebot', en: 'First offer' },
    { key: 'firstEvent', de: 'Erstes Event', en: 'First event' },
] as const;

function InviteeProgress({ invitee }: { invitee: GqlCProfileCookInviteCookFragment['invitees'][number] }) {
    const locale = useLocale();
    const done = {
        registered: invitee.registered,
        approved: invitee.approved,
        firstOfferCreated: invitee.firstOfferCreated,
        firstEvent: invitee.firstEvent,
    };

    return (
        <li className="grid gap-3 rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-foreground">{invitee.display}</p>
                {invitee.rewardUnlocked ? (
                    <p className="text-xs font-medium text-muted-foreground">
                        {{ de: 'Belohnung freigeschaltet', en: 'Reward unlocked' }[locale]}
                    </p>
                ) : null}
            </div>
            <ol className="grid gap-2 sm:grid-cols-4">
                {milestones.map((step, index) => {
                    const complete = done[step.key];
                    return (
                        <li key={step.key} className="grid gap-1">
                            <div className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                                        complete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                                    )}
                                    aria-hidden
                                >
                                    {complete ? <CheckIcon className="size-3.5" /> : index + 1}
                                </span>
                                <span className={cn('text-sm', complete ? 'text-foreground' : 'text-muted-foreground')}>
                                    {step[locale]}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </li>
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
                title: { de: 'peopleeat Koch werden', en: 'Become a peopleeat chef' }[locale],
                text: {
                    de: 'Ich lade dich ein, dich als Koch bei peopleeat zu registrieren.',
                    en: 'I am inviting you to join peopleeat as a chef.',
                }[locale],
                url: inviteUrl,
            });
        } catch {
            // User cancelled share.
        }
    }

    const illustrationAlt = {
        de: 'Zwei Köche und eine Einladung mit Pluszeichen',
        en: 'Two chefs and an invite with a plus sign',
    }[locale];

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-3xl content-start gap-8">
            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] sm:items-center sm:gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-2xl/tight text-foreground">{profileCookInvitePageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{profileCookInvitePageDescription[locale]}</p>
                </div>
                <div className="justify-self-center overflow-hidden rounded-2xl bg-black sm:justify-self-end">
                    <AppImage
                        priority
                        src={COOK_INVITE_ILLUSTRATION.src}
                        width={COOK_INVITE_ILLUSTRATION.width}
                        height={COOK_INVITE_ILLUSTRATION.height}
                        alt={illustrationAlt}
                        className="h-auto w-full max-w-xs sm:max-w-[14rem]"
                    />
                </div>
            </div>

            {!cook.isApprovedByAdmin ? (
                <StatusAlert tone="warning" title={{ de: 'Freigabe ausstehend', en: 'Approval pending' }[locale]}>
                    {
                        {
                            de: 'Du kannst den Link schon vorbereiten. Einladungen zählen, sobald dein Profil freigegeben ist.',
                            en: 'You can prepare the link now. Invites count once your profile is approved.',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            <Card className="gap-0 py-0">
                <CardContent className="grid gap-4 p-4 sm:p-6">
                    <div className="grid gap-1">
                        <p className="font-medium text-foreground">{{ de: 'Dein Einladungslink', en: 'Your invite link' }[locale]}</p>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: `Wenn die eingeladene Person freigegeben wird und ihr erstes Event abschließt, erhältst du ${COOK_INVITE_LIVE_PLATFORM_FEE_PERCENT_COOK}% Plattformgebühr auf deine nächsten ${COOK_INVITE_LIVE_BOOKING_COUNT} Buchungen.`,
                                    en: `When your invitee is approved and completes their first event, you get a ${COOK_INVITE_LIVE_PLATFORM_FEE_PERCENT_COOK}% platform fee on your next ${COOK_INVITE_LIVE_BOOKING_COUNT} bookings.`,
                                }[locale]
                            }
                        </p>
                    </div>
                    <p className="break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">{inviteUrl}</p>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => void onCopy()}>
                            <CopyIcon aria-hidden />
                            {copyDone ? { de: 'Kopiert', en: 'Copied' }[locale] : { de: 'Link kopieren', en: 'Copy link' }[locale]}
                        </Button>
                        <Button type="button" size="sm" onClick={() => void onShare()}>
                            <ShareIcon aria-hidden />
                            {{ de: 'Teilen', en: 'Share' }[locale]}
                        </Button>
                    </div>
                    {cook.inviteOpenFeeCreditRemainingBookings > 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: `${cook.inviteOpenFeeCreditRemainingBookings} vergünstigte Buchungen offen.`,
                                    en: `${cook.inviteOpenFeeCreditRemainingBookings} discounted bookings remaining.`,
                                }[locale]
                            }
                        </p>
                    ) : null}
                </CardContent>
            </Card>

            <section className="grid gap-3" aria-labelledby="cook-invite-progress">
                <h2 id="cook-invite-progress" className="text-sm font-medium text-foreground">
                    {{ de: 'Eingeladene Köche', en: 'Invited chefs' }[locale]}
                </h2>
                {cook.invitees.length === 0 ? (
                    <StatusAlert tone="info" title={{ de: 'Noch niemand eingeladen', en: 'No invites yet' }[locale]}>
                        {
                            {
                                de: 'Teile deinen Link mit Köchen, die du kennst. Hier siehst du danach ihren Fortschritt.',
                                en: 'Share your link with chefs you know. Their progress will show up here.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : (
                    <ul className="grid gap-3">
                        {cook.invitees.map((invitee) => (
                            <InviteeProgress key={invitee.cookId} invitee={invitee} />
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}
