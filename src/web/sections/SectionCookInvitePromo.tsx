import { Link } from '@tanstack/react-router';

import { AppImage } from '../components/AppImage';
import { Button } from '../components/base/button';
import { useT } from '../hooks/useT';

const COOK_INVITE_ILLUSTRATION = {
    src: '/illustrations/cook-invite.png',
    width: 1402,
    height: 830,
} as const;

export function SectionCookInvitePromo({ isCook }: { isCook: boolean }) {
    const { t } = useT('public');

    return (
        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 @sm:px-6 @lg:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)] @lg:gap-16 @lg:px-8">
            <div>
                <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">{t('howToBecome.invitePromoHeadline')}</h2>
                <p className="mt-6 max-w-2xl text-lg/8 text-muted-foreground">{t('howToBecome.invitePromoBody')}</p>
                <div className="mt-8">
                    {isCook ? (
                        <Button asChild size="lg">
                            <Link to="/{-$locale}/profile/invite">{t('howToBecome.invitePromoCta')}</Link>
                        </Button>
                    ) : (
                        <Button asChild size="lg">
                            <Link to="/{-$locale}/chef-sign-up">{t('howToBecome.signUpNow')}</Link>
                        </Button>
                    )}
                </div>
            </div>
            <div className="justify-self-center overflow-hidden rounded-2xl bg-background @lg:justify-self-end">
                <AppImage
                    src={COOK_INVITE_ILLUSTRATION.src}
                    width={COOK_INVITE_ILLUSTRATION.width}
                    height={COOK_INVITE_ILLUSTRATION.height}
                    alt={t('howToBecome.invitePromoIllustrationAlt')}
                    className="h-auto w-full max-w-xs @lg:max-w-none"
                />
            </div>
        </section>
    );
}
