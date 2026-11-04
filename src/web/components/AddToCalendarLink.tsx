import { CalendarPlusIcon } from 'lucide-react';

import type { Locale } from '../utils/locale';
import { Button } from './base/button';

/** Time on the first line, action on the second, icon to the left. Sized to the label so the press fill stays on the cluster. */
export function AddToCalendarLink({ locale, whenLabel, onClick }: { locale: Locale; whenLabel: string; onClick: () => void }) {
    return (
        <Button
            type="button"
            variant="outline"
            className="h-auto w-fit max-w-full justify-self-start gap-3 px-3 py-2 text-left whitespace-normal"
            onClick={onClick}
        >
            <CalendarPlusIcon className="size-5" aria-hidden />
            <span className="grid min-w-0 gap-0.5">
                <span className="text-sm font-medium text-foreground">{whenLabel}</span>
                <span className="text-sm font-normal text-primary">{{ de: 'Zum Kalender hinzufügen', en: 'Add to calendar' }[locale]}</span>
            </span>
        </Button>
    );
}
