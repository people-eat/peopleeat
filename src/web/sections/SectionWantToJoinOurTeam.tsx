import { SITE_CONTACT_EMAIL } from '../../shared/siteBranding';
import { Button } from '../components/base/button';
import { useT } from '../hooks/useT';

export function SectionWantToJoinOurTeam() {
    const { t } = useT('public');

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <h2 className="mb-10 font-serif text-3xl font-light tracking-tight text-foreground @sm:text-4xl">
                {t('about.joinHeadline')}
                <br />
                {t('about.joinSubheadline')}
            </h2>
            <Button asChild size="lg">
                <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{t('about.sendMessage')}</a>
            </Button>
        </section>
    );
}
