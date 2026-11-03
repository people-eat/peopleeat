import type { Locale } from '../utils/locale';
import { Button } from './base/button';

/** Text link under a printed time. The button row stays for the decision. */
export function AddToCalendarLink({ locale, onClick }: { locale: Locale; onClick: () => void }) {
    return (
        <Button type="button" variant="link" size="sm" className="h-auto justify-start px-0" onClick={onClick}>
            {{ de: 'Zum Kalender hinzufügen', en: 'Add to calendar' }[locale]}
        </Button>
    );
}
