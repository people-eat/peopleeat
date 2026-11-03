import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { GqlCUserNotificationSettings, GqlCUserNotificationSettingsInput } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './base/alert-dialog';
import { Switch } from './base/switch';

type NotificationDomain = keyof GqlCUserNotificationSettingsInput;
type NotificationChannel = 'email' | 'whatsApp';

type NotificationRow = {
    domain: NotificationDomain;
    confirmLastChannel: boolean;
    title: { de: string; en: string };
    description: { de: string; en: string };
};

const customerRows: NotificationRow[] = [
    {
        domain: 'customerBooking',
        confirmLastChannel: true,
        title: { de: 'Änderungen am Abend', en: 'Changes to the evening' },
        description: {
            de: 'Anfrage, Menü, Gästezahl, Absage und Kennenlerngespräch.',
            en: 'Request, menu, guest count, cancellation, and the intro call.',
        },
    },
    {
        domain: 'customerChat',
        confirmLastChannel: false,
        title: { de: 'Nachrichten deines Kochs', en: 'Messages from your cook' },
        description: { de: 'Wenn eine Nachricht noch ungelesen ist.', en: 'When a message is still unread.' },
    },
    {
        domain: 'customerReview',
        confirmLastChannel: false,
        title: { de: 'Nach dem Abend', en: 'After the evening' },
        description: { de: 'Erinnerungen, eine Bewertung zu schreiben.', en: 'Reminders to write a review.' },
    },
];

const cookRows: NotificationRow[] = [
    {
        domain: 'cookNewRequest',
        confirmLastChannel: false,
        title: { de: 'Neue Anfragen in deiner Nähe', en: 'New requests near you' },
        description: { de: 'Kann häufig kommen.', en: 'These can come often.' },
    },
    {
        domain: 'cookOffer',
        confirmLastChannel: true,
        title: { de: 'Deine Angebote', en: 'Your offers' },
        description: {
            de: 'Änderungen, Zu- und Absagen, Menü, Gästezahl und Gespräche.',
            en: 'Changes, accepted or declined, menu, guest count, and calls.',
        },
    },
    {
        domain: 'cookChat',
        confirmLastChannel: false,
        title: { de: 'Nachrichten deiner Gäste', en: 'Messages from your guests' },
        description: { de: 'Wenn eine Nachricht noch ungelesen ist.', en: 'When a message is still unread.' },
    },
    {
        domain: 'cookReview',
        confirmLastChannel: false,
        title: { de: 'Nach dem Abend', en: 'After the evening' },
        description: { de: 'Erinnerungen zur Bewertung deiner Gäste.', en: "Reminders about your guests' reviews." },
    },
];

function channelToast(row: NotificationRow, channel: NotificationChannel, enabled: boolean, locale: 'de' | 'en'): string {
    const title = row.title[locale];
    if (channel === 'email') {
        return enabled
            ? { de: `${title} per E-Mail an.`, en: `${title} by email turned on.` }[locale]
            : { de: `${title} per E-Mail aus.`, en: `${title} by email turned off.` }[locale];
    }
    return enabled
        ? { de: `${title} per WhatsApp an.`, en: `${title} by WhatsApp turned on.` }[locale]
        : { de: `${title} per WhatsApp aus.`, en: `${title} by WhatsApp turned off.` }[locale];
}

export function notificationWhatsAppSwitchChecked(hasPhoneNumber: boolean, storedWhatsApp: boolean): boolean {
    return hasPhoneNumber && storedWhatsApp;
}

export function notificationLastChannelNeedsConfirm(args: {
    confirmLastChannel: boolean;
    enabled: boolean;
    hasPhoneNumber: boolean;
    emailOn: boolean;
    whatsAppOn: boolean;
    channel: NotificationChannel;
}): boolean {
    if (!args.confirmLastChannel || args.enabled) {
        return false;
    }
    const otherDelivers = args.channel === 'email' ? args.hasPhoneNumber && args.whatsAppOn : args.emailOn;
    return !otherDelivers;
}

function withChannel(
    settings: GqlCUserNotificationSettings,
    domain: NotificationDomain,
    channel: NotificationChannel,
    enabled: boolean,
): GqlCUserNotificationSettings {
    return {
        ...settings,
        [domain]: { ...settings[domain], [channel]: enabled },
    };
}

export function AccountNotificationSettings({
    value,
    hasPhoneNumber,
    isCook,
    disabled,
    onAddPhone,
    onSave,
}: {
    value: GqlCUserNotificationSettings;
    hasPhoneNumber: boolean;
    isCook: boolean;
    disabled: boolean;
    onAddPhone: () => void;
    onSave: (patch: GqlCUserNotificationSettingsInput) => Promise<void>;
}) {
    const locale = useLocale();
    const [settings, setSettings] = useState(value);
    const ignoreClose = useRef(false);
    const [pending, setPending] = useState<{
        domain: NotificationDomain;
        channel: NotificationChannel;
        previous: GqlCUserNotificationSettings;
        next: GqlCUserNotificationSettings;
    } | null>(null);

    useEffect(() => {
        setSettings(value);
    }, [value]);

    async function save(
        next: GqlCUserNotificationSettings,
        domain: NotificationDomain,
        channel: NotificationChannel,
        previous: GqlCUserNotificationSettings,
    ) {
        setSettings(next);
        try {
            await onSave({ [domain]: next[domain] });
            const row = [...customerRows, ...cookRows].find((item) => item.domain === domain);
            if (row) {
                toast.success(channelToast(row, channel, next[domain][channel], locale));
            }
        } catch {
            setSettings(previous);
            toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
        }
    }

    function onToggle(row: NotificationRow, channel: NotificationChannel, enabled: boolean) {
        if (disabled) return;
        const previous = settings;
        const next = withChannel(settings, row.domain, channel, enabled);
        if (
            notificationLastChannelNeedsConfirm({
                confirmLastChannel: row.confirmLastChannel,
                enabled,
                hasPhoneNumber,
                emailOn: settings[row.domain].email,
                whatsAppOn: settings[row.domain].whatsApp,
                channel,
            })
        ) {
            setSettings(next);
            setPending({ domain: row.domain, channel, previous, next });
            return;
        }
        void save(next, row.domain, channel, previous);
    }

    function cancelPending() {
        if (ignoreClose.current) {
            ignoreClose.current = false;
            return;
        }
        if (!pending) return;
        setSettings(pending.previous);
        setPending(null);
    }

    async function confirmPending() {
        if (!pending) return;
        const current = pending;
        ignoreClose.current = true;
        setPending(null);
        await save(current.next, current.domain, current.channel, current.previous);
    }

    return (
        <div className="grid gap-6">
            {hasPhoneNumber ? null : (
                <button
                    type="button"
                    className="w-fit text-left text-sm text-foreground underline-offset-4 hover:underline"
                    onClick={onAddPhone}
                >
                    {
                        {
                            de: 'WhatsApp bleibt aus, solange keine Nummer hinterlegt ist.',
                            en: 'WhatsApp stays off until a number is on file.',
                        }[locale]
                    }
                </button>
            )}
            <NotificationGroup
                heading={{ de: 'Für deine Abende', en: 'Evenings you book' }[locale]}
                rows={customerRows}
                settings={settings}
                hasPhoneNumber={hasPhoneNumber}
                disabled={disabled}
                onToggle={onToggle}
            />
            {isCook ? (
                <NotificationGroup
                    heading={{ de: 'Wenn du kochst', en: 'When you cook' }[locale]}
                    rows={cookRows}
                    settings={settings}
                    hasPhoneNumber={hasPhoneNumber}
                    disabled={disabled}
                    onToggle={onToggle}
                />
            ) : null}
            <AlertDialog
                open={pending != null}
                onOpenChange={(open) => {
                    if (!open) cancelPending();
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {
                                {
                                    de: 'Keine E-Mail und kein WhatsApp mehr?',
                                    en: 'No email or WhatsApp?',
                                }[locale]
                            }
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Du bekommst dann keine E-Mail und kein WhatsApp, wenn sich der Abend ändert oder abgesagt wird. In der App siehst du es weiterhin.',
                                    en: 'You will not get an email or a WhatsApp if this evening changes or is cancelled. You can still see it in the app.',
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={disabled}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={disabled}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmPending();
                            }}
                        >
                            {{ de: 'Ausschalten', en: 'Turn off' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function NotificationGroup({
    heading,
    rows,
    settings,
    hasPhoneNumber,
    disabled,
    onToggle,
}: {
    heading: string;
    rows: NotificationRow[];
    settings: GqlCUserNotificationSettings;
    hasPhoneNumber: boolean;
    disabled: boolean;
    onToggle: (row: NotificationRow, channel: NotificationChannel, enabled: boolean) => void;
}) {
    const locale = useLocale();

    return (
        <section className="grid gap-4">
            <h2 className="text-sm font-medium text-foreground">{heading}</h2>
            {rows.map((row) => (
                <div key={row.domain} className="grid gap-3">
                    <div className="grid gap-0.5">
                        <p className="text-sm font-medium text-foreground">{row.title[locale]}</p>
                        <p className="text-sm text-muted-foreground">{row.description[locale]}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <ChannelSwitch
                            id={`${row.domain}-email`}
                            label={{ de: 'E-Mail-Adresse', en: 'Email address' }[locale]}
                            checked={settings[row.domain].email}
                            disabled={disabled}
                            onCheckedChange={(enabled) => onToggle(row, 'email', enabled)}
                        />
                        <ChannelSwitch
                            id={`${row.domain}-whatsapp`}
                            label="WhatsApp"
                            checked={notificationWhatsAppSwitchChecked(hasPhoneNumber, settings[row.domain].whatsApp)}
                            disabled={disabled || !hasPhoneNumber}
                            onCheckedChange={(enabled) => onToggle(row, 'whatsApp', enabled)}
                        />
                    </div>
                </div>
            ))}
        </section>
    );
}

function ChannelSwitch({
    id,
    label,
    checked,
    disabled,
    onCheckedChange,
}: {
    id: string;
    label: string;
    checked: boolean;
    disabled: boolean;
    onCheckedChange: (enabled: boolean) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-labelledby={`${id}-label`} />
            <label id={`${id}-label`} htmlFor={id} className="text-sm text-foreground">
                {label}
            </label>
        </div>
    );
}
