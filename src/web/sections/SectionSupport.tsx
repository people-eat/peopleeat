import { Button } from '../components/base/button';
import { Reveal } from '../components/Reveal';
import { useT } from '../hooks/useT';
import { SITE_WHATSAPP_URL } from '../seo/seoConstants';

export function SectionSupport() {
    const { t } = useT('public');

    return (
        <Reveal as="section" className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-8 px-8 py-16">
            <h2 className="font-serif text-3xl font-light @md:text-4xl">{t('home.support.headline')}</h2>
            <Button asChild variant="outline" size="lg">
                <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    {t('home.support.cta')}
                </a>
            </Button>
        </Reveal>
    );
}
