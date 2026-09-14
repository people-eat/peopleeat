import { Link } from '@tanstack/react-router';

import { Button } from '../components/base/button';
import { useLocale } from '../hooks/useLocale';

export function SectionReadyToBecomeAChef({ isCook }: { isCook: boolean }) {
    const locale = useLocale();

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">
                {
                    {
                        de: (
                            <>
                                Bist du bereit zu starten?
                                <br />
                                Werde Teil des am schnellsten wachsenden Kochnetzwerks.
                            </>
                        ),
                        en: (
                            <>
                                Are you ready to get started?
                                <br />
                                Become part of the fastest-growing chef network.
                            </>
                        ),
                    }[locale]
                }
            </h2>
            <div className="mt-8 flex items-center gap-x-6">
                {isCook ? (
                    <Button asChild size="lg">
                        <Link to="/{-$locale}/profile">{{ de: 'Zu deinem Kochprofil', en: 'To your chef profile' }[locale]}</Link>
                    </Button>
                ) : (
                    <Button asChild size="lg">
                        <Link to="/{-$locale}/chef-sign-up">{{ de: 'Jetzt registrieren', en: 'Sign up now' }[locale]}</Link>
                    </Button>
                )}
            </div>
        </section>
    );
}
