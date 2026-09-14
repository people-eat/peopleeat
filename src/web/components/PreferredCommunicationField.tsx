import { MailIcon, MessageCircleIcon, PhoneIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { GqlCUserPreferredCommunication } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';

function WhatsAppIcon({ className }: { className?: string }) {
    return (
        <svg aria-hidden className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

const preferredCommunicationOptions: {
    value: GqlCUserPreferredCommunication;
    de: string;
    en: string;
    icon: ReactNode;
}[] = [
    { value: 'SMS', de: 'Nachricht', en: 'Message', icon: <MessageCircleIcon className="size-5 shrink-0" /> },
    { value: 'WHATS_APP', de: 'WhatsApp', en: 'WhatsApp', icon: <WhatsAppIcon className="size-5 shrink-0" /> },
    { value: 'CALL', de: 'Anruf', en: 'Call', icon: <PhoneIcon className="size-5 shrink-0" /> },
    { value: 'E_MAIL', de: 'E-Mail', en: 'Email', icon: <MailIcon className="size-5 shrink-0" /> },
];

export function PreferredCommunicationField({
    value,
    onValueChange,
    disabled = false,
    required = false,
    showTitle = true,
    showSubtitle = true,
    invalid = false,
    errorMessage,
    className,
}: {
    value: GqlCUserPreferredCommunication | '';
    onValueChange: (value: GqlCUserPreferredCommunication) => void;
    disabled?: boolean;
    required?: boolean;
    showTitle?: boolean;
    showSubtitle?: boolean;
    invalid?: boolean;
    errorMessage?: string;
    className?: string;
}) {
    const locale = useLocale();
    const errorId = errorMessage ? 'preferred-communication-error' : undefined;

    return (
        <div className={cn('grid gap-4', className)}>
            {showTitle || showSubtitle ? (
                <div className="grid gap-1.5">
                    {showTitle ? (
                        <p className="text-sm font-medium text-foreground">
                            {{ de: 'Wie erreichen wir dich am liebsten?', en: 'How should we reach you?' }[locale]}
                            {required ? <span className="text-destructive"> *</span> : null}
                        </p>
                    ) : null}
                    {showSubtitle ? (
                        <p className="text-sm/relaxed text-muted-foreground">
                            {
                                {
                                    de: 'Updates zu deinem Abend bekommst du per E-Mail und, wenn wir deine Nummer haben, per WhatsApp. Bei Fragen meldet sich unser Concierge direkt bei dir.',
                                    en: 'You will receive updates about your evening via email and, when we have your number, via WhatsApp. If you have questions, our concierge will contact you directly.',
                                }[locale]
                            }
                        </p>
                    ) : null}
                </div>
            ) : null}

            <div
                className="grid gap-2.5 sm:grid-cols-2"
                role="radiogroup"
                aria-required={required || undefined}
                aria-invalid={invalid || undefined}
                aria-describedby={errorId}
            >
                {preferredCommunicationOptions.map((option) => {
                    const selected = value === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={option[locale]}
                            disabled={disabled}
                            onClick={() => onValueChange(option.value)}
                            className={cn(
                                'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-[color,background-color,border-color,box-shadow,opacity] outline-none',
                                'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                                invalid && !selected
                                    ? 'border-destructive bg-secondary text-foreground hover:bg-muted active:bg-muted/80'
                                    : selected
                                      ? 'border-primary bg-primary/5 text-foreground hover:bg-primary/10 active:bg-primary/15'
                                      : 'border-border bg-secondary text-foreground hover:bg-muted active:bg-muted/80',
                            )}
                        >
                            {option.icon}
                            <span className="min-w-0 flex-1 text-sm font-medium">{option[locale]}</span>
                            <span
                                aria-hidden
                                className={cn(
                                    'flex size-4 shrink-0 items-center justify-center rounded-full border',
                                    selected ? 'border-primary' : invalid ? 'border-destructive' : 'border-input',
                                )}
                            >
                                {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
                            </span>
                        </button>
                    );
                })}
            </div>
            {errorMessage ? (
                <p id={errorId} className="text-sm text-destructive">
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
