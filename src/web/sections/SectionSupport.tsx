import { Button } from '../components/base/button';
import { Reveal } from '../components/Reveal';
import { useLocale } from '../hooks/useLocale';
import { SITE_WHATSAPP_URL } from '../seo/seoConstants';

export function SectionSupport() {
    const locale = useLocale();

    return (
        <Reveal as="section" className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-8 px-8 py-16">
            <h2 className="font-serif text-3xl font-light @md:text-4xl">
                {
                    {
                        de: 'Du benötigst Hilfe? Kontaktiere uns direkt!',
                        en: 'Do you need help? Contact us directly!',
                    }[locale]
                }
            </h2>
            <Button asChild variant="outline" size="lg">
                <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    {{ de: 'Kontaktiere uns', en: 'Contact us' }[locale]}
                </a>
            </Button>
        </Reveal>
    );
}
