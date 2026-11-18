import { t as translate } from '../../i18n/t';
import { cookPathNameSlugify, cookPathNameTryNormalize } from '../../shared/cookPathName';
import type { Locale } from '../../shared/locale';
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
