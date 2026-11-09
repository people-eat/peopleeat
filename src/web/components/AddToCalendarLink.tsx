import { CalendarPlusIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';

type AddToCalendarLinkProps = {
    locale: Locale;
    onClick: () => void;
    className?: string;
} & ({ appearance?: 'button'; whenLabel: ReactNode } | { appearance: 'action' });

/** `button` is the free-standing date cluster. `action` is a small button in a card's action row. */
export function AddToCalendarLink({ locale, onClick, className, ...rest }: AddToCalendarLinkProps) {
    if (rest.appearance === 'action') {
        return (
            <Button type="button" variant="outline" size="sm" className={cn('w-fit', className)} onClick={onClick}>
                <CalendarPlusIcon aria-hidden />
                {{ de: 'Zum Kalender hinzufügen', en: 'Add to calendar' }[locale]}
            </Button>
        );
    }

    const { whenLabel } = rest;
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
