import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';

export function AdminStubPage({ title }: { title: Record<Locale, string> }) {
    const locale = useLocale();

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-4">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{title[locale]}</h1>
                    <p className="text-muted-foreground">
                        {{ de: 'Dieser Bereich folgt in Kürze.', en: 'This section is coming soon.' }[locale]}
                    </p>
                </div>
            </main>
        </AdminPathPageChrome>
    );
}
