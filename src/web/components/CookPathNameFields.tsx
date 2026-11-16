import { CheckIcon, CopyIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { t as translate } from '../../i18n/t';
import { cookPathNameSlugify, cookPathNameTryNormalize } from '../../shared/cookPathName';
import type { Locale } from '../../shared/locale';
import { useT } from '../hooks/useT';
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
            ? translate(locale, 'profileCook', 'pathName.checking')
            : availability === 'AVAILABLE'
              ? translate(locale, 'profileCook', 'pathName.available')
              : availability === 'TAKEN'
                ? translate(locale, 'profileCook', 'pathName.taken')
                : availability === 'INVALID'
                  ? translate(locale, 'profileCook', 'pathName.invalid')
                  : null;

    return (
        <div className="grid min-w-0 gap-2">
            <label htmlFor={id} className="text-sm font-medium">
                {translate(locale, 'profileCook', 'pathName.publicUrl')}
            </label>
            <p className="text-sm text-muted-foreground">{translate(locale, 'profileCook', 'pathName.hint')}</p>
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
    const { t } = useT('profileCook');
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleLabel = t('actions.copy');
    const ariaLabel = copied ? t('invite.copied') : idleLabel;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(t('pathName.copiedToast'));
        } catch {
            toast.error(t('pathName.copyFailed'));
        }
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
    }, [text, t]);

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
                {translate(locale, 'profileCook', 'pathName.publicUrl')}
            </dt>
            <dd className="flex min-w-0 items-center gap-1">
                <span className="text-sm text-foreground">{href}</span>
                <CookPathNameCopyButton text={href} />
            </dd>
            {previousPathNames && previousPathNames.length > 0 ? (
                <dd className="text-sm text-muted-foreground">
                    {translate(locale, 'profileCook', 'pathName.previousPaths', {
                        paths: previousPathNames.map((name) => `/chefs/${name}`).join(', '),
                    })}
                </dd>
            ) : null}
        </div>
    );
}
