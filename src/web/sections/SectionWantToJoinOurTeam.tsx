import { SITE_CONTACT_EMAIL } from '../../shared/siteBranding';
import { Button } from '../components/base/button';
import { useLocale } from '../hooks/useLocale';

export function SectionWantToJoinOurTeam() {
    const locale = useLocale();

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <h2 className="mb-10 font-serif text-3xl font-light tracking-tight text-foreground @sm:text-4xl">
                {
                    {
                        de: (
                            <>
                                Möchtest du Teil unseres Teams werden?
                                <br />
                                Wir freuen uns auf deine Nachricht.
                            </>
                        ),
                        en: (
                            <>
                                Want to join our team?
                                <br />
                                We look forward to hearing from you.
                            </>
                        ),
                    }[locale]
                }
            </h2>
            <Button asChild size="lg">
                <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{{ de: 'Nachricht senden', en: 'Send a message' }[locale]}</a>
            </Button>
        </section>
    );
}
