import { Link } from '@tanstack/react-router';
import { GiftIcon, UsersIcon } from 'lucide-react';

import { AppImage } from '../components/AppImage';
import { Button } from '../components/base/button';
import { Reveal } from '../components/Reveal';
import { useT } from '../hooks/useT';

const COOK_INVITE_ILLUSTRATION = {
    src: '/illustrations/cook-invite.png',
    width: 1402,
    height: 830,
} as const;

export function SectionCookInvitePromo({ isCook }: { isCook: boolean }) {
    const { t } = useT('public');

    const points = [
        { icon: UsersIcon, text: t('howToBecome.invitePromoPointShare') },
        { icon: GiftIcon, text: t('howToBecome.invitePromoPointReward') },
    ] as const;

    return (
        <Reveal as="section" className="mx-auto w-full max-w-7xl px-4 @sm:px-6 @lg:px-8">
            <div className="relative overflow-hidden rounded-2xl bg-foreground/5 ring-1 ring-foreground/10 ring-inset @lg:rounded-3xl">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-accent via-accent/70 to-transparent"
                />
                <div className="grid items-center gap-10 px-6 py-10 @sm:px-8 @sm:py-12 @lg:grid-cols-[minmax(0,1.15fr)_minmax(12rem,20rem)] @lg:gap-14 @lg:px-12 @lg:py-14">
                    <div className="min-w-0">
                        <p className="text-sm font-medium tracking-wide text-accent">{t('howToBecome.invitePromoEyebrow')}</p>
                        <h2 className="mt-3 font-serif text-3xl font-light tracking-tight text-foreground @md:text-5xl">
                            {t('howToBecome.invitePromoHeadline')}
                        </h2>
                        <p className="mt-5 max-w-xl text-lg/8 text-muted-foreground">{t('howToBecome.invitePromoBody')}</p>

                        <ul className="mt-8 grid gap-3">
                            {points.map((point) => (
                                <li key={point.text} className="flex items-start gap-3 text-sm text-foreground">
                                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                                        <point.icon className="size-4" aria-hidden />
                                    </span>
                                    <span className="pt-1.5 leading-snug text-muted-foreground">{point.text}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
                            {isCook ? (
                                <Button asChild size="lg">
                                    <Link to="/{-$locale}/profile/invite">{t('howToBecome.invitePromoCta')}</Link>
                                </Button>
                            ) : (
                                <>
                                    <Button asChild size="lg" variant="outline">
                                        <Link to="/{-$locale}/chef-sign-up">{t('howToBecome.invitePromoCtaGuest')}</Link>
                                    </Button>
                                    <p className="text-sm text-muted-foreground">{t('howToBecome.invitePromoGuestHint')}</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="relative justify-self-center @lg:justify-self-end">
                        <div aria-hidden className="absolute -inset-6 rounded-full bg-accent/10 @lg:-inset-8" />
                        <div className="relative overflow-hidden rounded-2xl bg-background/90 p-5 ring-1 ring-foreground/10 @sm:p-6">
                            <AppImage
                                src={COOK_INVITE_ILLUSTRATION.src}
                                width={COOK_INVITE_ILLUSTRATION.width}
                                height={COOK_INVITE_ILLUSTRATION.height}
                                alt={t('howToBecome.invitePromoIllustrationAlt')}
                                className="h-auto w-full max-w-[16rem] @sm:max-w-[18rem] @lg:max-w-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Reveal>
    );
}
