import { CheckIcon, CopyIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { inlineCopy } from '../../shared';

import { cookPathNameSlugify, cookPathNameTryNormalize } from '../../shared/cookPathName';
import type { Locale } from '../../shared/locale';
import { useLocale } from '../hooks/useLocale';
import { Button } from './base/button';
import { Input } from './base/input';

export type CookPathNameAvailabilityState = 'AVAILABLE' | 'INVALID' | 'TAKEN' | null;

export function CookPathNameFields({
    id,
    locale,
    value,
    onChange,
    onBlur,
    disabled,
    availability,
    checking,
}: {
    id: string;
    locale: Locale;
    value: string;
    onChange: (next: string) => void;
    onBlur?: () => void;
    disabled?: boolean;
    availability: CookPathNameAvailabilityState;
    checking: boolean;
}) {
    const status =
        checking && availability == null
            ? inlineCopy({ de: 'Prüfe Verfügbarkeit…', en: 'Checking availability…' }, locale)
            : availability === 'AVAILABLE'
              ? inlineCopy({ de: 'Dieser Pfad ist frei.', en: 'This path is available.' }, locale)
              : availability === 'TAKEN'
                ? inlineCopy({ de: 'Dieser Pfad ist bereits vergeben.', en: 'This path is already taken.' }, locale)
                : availability === 'INVALID'
                  ? inlineCopy(
                        {
                            de: 'Bitte einen gültigen Pfad eingeben (Buchstaben, Zahlen, Bindestriche).',
                            en: 'Enter a valid path (letters, numbers, hyphens).',
                        },
                        locale,
                    )
                  : null;

    return (
        <div className="grid min-w-0 gap-2">
            <label htmlFor={id} className="text-sm font-medium">
                {inlineCopy({ de: 'Öffentliche URL', en: 'Public URL' }, locale)}
            </label>
            <p className="text-sm text-muted-foreground">
                {inlineCopy(
                    {
                        de: 'Steht unter /chefs/… . Ein Wechsel behält die alte Adresse als Weiterleitung. Der Nachname in der URL ist öffentlich, auch wenn die Seite den Vornamen oder Künstlernamen zeigt.',
                        en: 'Lives at /chefs/…. Changing it keeps the old address as a redirect. The last name in the URL is public even though the page shows the first name or stage name.',
                    },
                    locale,
                )}
            </p>
            <div className="flex min-w-0 items-center gap-0">
                <span className="shrink-0 rounded-l-md border border-r-0 border-input bg-muted px-3 py-1 text-sm text-muted-foreground">
                    /chefs/
                </span>
                <Input
                    id={id}
                    value={value}
                    disabled={disabled}
                    className="rounded-l-none"
                    onBlur={() => {
                        onChange(cookPathNameTryNormalize(value) ?? cookPathNameSlugify(value));
                        onBlur?.();
                    }}
                    onChange={(event) => {
                        const next = event.target.value;
                        onChange(cookPathNameSlugify(next) || next);
                    }}
                />
            </div>
            {status ? (
                <p
                    className={
                        availability === 'TAKEN' || availability === 'INVALID'
                            ? 'text-sm text-destructive'
                            : 'text-sm text-muted-foreground'
                    }
                >
                    {status}
                </p>
            ) : null}
        </div>
    );
}

function CookPathNameCopyButton({ text }: { text: string }) {
    const locale = useLocale();
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleLabel = inlineCopy({ de: 'Kopieren', en: 'Copy' }, locale);
    const ariaLabel = copied ? inlineCopy({ de: 'Kopiert', en: 'Copied' }, locale) : idleLabel;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(inlineCopy({ de: 'In die Zwischenablage kopiert', en: 'Copied to clipboard' }, locale));
        } catch {
            toast.error(inlineCopy({ de: 'Kopieren in die Zwischenablage fehlgeschlagen', en: 'Could not copy to clipboard' }, locale));
        }
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
    }, [text, locale]);

    return (
        <Button type="button" variant="ghost" size="icon-xs" aria-label={ariaLabel} onClick={() => void onCopy()}>
            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        </Button>
    );
}

export function CookPathNameReadout({
    locale,
    pathName,
    previousPathNames,
}: {
    locale: Locale;
    pathName: string;
    previousPathNames?: readonly string[];
}) {
    const href = `/chefs/${pathName}`;
    return (
        <div className="grid min-w-0 gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {inlineCopy({ de: 'Öffentliche URL', en: 'Public URL' }, locale)}
            </dt>
            <dd className="flex min-w-0 items-center gap-1">
                <span className="text-sm text-foreground">{href}</span>
                <CookPathNameCopyButton text={href} />
            </dd>
            {previousPathNames && previousPathNames.length > 0 ? (
                <dd className="text-sm text-muted-foreground">
                    {inlineCopy(
                        {
                            de: `Frühere Pfade: ${previousPathNames.map((name) => `/chefs/${name}`).join(', ')}`,
                            en: `Previous paths: ${previousPathNames.map((name) => `/chefs/${name}`).join(', ')}`,
                        },
                        locale,
                    )}
                </dd>
            ) : null}
        </div>
    );
}
