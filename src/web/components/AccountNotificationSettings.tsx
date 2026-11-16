import { use, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { i18nResourcesLoadPromise } from '../../i18n/catalogCache';
import { t } from '../../i18n/t';
import type { Locale } from '../../shared';
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
    titleKey: string;
    descriptionKey: string;
    operatorTitleKey?: string;
    operatorDescriptionKey?: string;
};

export type AccountNotificationVoice = 'account' | 'operator';

const customerRows: NotificationRow[] = [
    {
        domain: 'customerBooking',
        confirmLastChannel: true,
        titleKey: 'account.notifications.customer.booking.title',
        descriptionKey: 'account.notifications.customer.booking.description',
    },
    {
        domain: 'customerChat',
        confirmLastChannel: false,
        titleKey: 'account.notifications.customer.chat.title',
        operatorTitleKey: 'account.notifications.customer.chat.operatorTitle',
        descriptionKey: 'account.notifications.customer.chat.description',
    },
    {
        domain: 'customerReview',
        confirmLastChannel: false,
        titleKey: 'account.notifications.customer.review.title',
        descriptionKey: 'account.notifications.customer.review.description',
    },
];

const cookRows: NotificationRow[] = [
    {
        domain: 'cookNewRequest',
        confirmLastChannel: false,
        titleKey: 'account.notifications.cook.newRequest.title',
        operatorTitleKey: 'account.notifications.cook.newRequest.operatorTitle',
        descriptionKey: 'account.notifications.cook.newRequest.description',
    },
    {
        domain: 'cookDirectRequest',
        confirmLastChannel: false,
        titleKey: 'account.notifications.cook.directRequest.title',
        operatorTitleKey: 'account.notifications.cook.directRequest.operatorTitle',
        descriptionKey: 'account.notifications.cook.directRequest.description',
    },
    {
        domain: 'cookOffer',
        confirmLastChannel: true,
        titleKey: 'account.notifications.cook.offer.title',
        operatorTitleKey: 'account.notifications.cook.offer.operatorTitle',
        descriptionKey: 'account.notifications.cook.offer.description',
    },
    {
        domain: 'cookChat',
        confirmLastChannel: false,
        titleKey: 'account.notifications.cook.chat.title',
        operatorTitleKey: 'account.notifications.cook.chat.operatorTitle',
        descriptionKey: 'account.notifications.cook.chat.description',
    },
    {
        domain: 'cookReview',
        confirmLastChannel: false,
        titleKey: 'account.notifications.cook.review.title',
        descriptionKey: 'account.notifications.cook.review.description',
        operatorDescriptionKey: 'account.notifications.cook.review.operatorDescription',
    },
];

function notificationCopy(row: NotificationRow, voice: AccountNotificationVoice, part: 'title' | 'description', locale: Locale): string {
    if (voice === 'operator') {
        const overrideKey = part === 'title' ? row.operatorTitleKey : row.operatorDescriptionKey;
        if (overrideKey) return t(locale, 'profile', overrideKey);
    }
    return t(locale, 'profile', part === 'title' ? row.titleKey : row.descriptionKey);
}

function channelToast(title: string, channel: NotificationChannel, enabled: boolean, locale: Locale): string {
    if (channel === 'email') {
        return t(locale, 'profile', enabled ? 'account.notifications.toastEmailOn' : 'account.notifications.toastEmailOff', { title });
    }
    return t(locale, 'profile', enabled ? 'account.notifications.toastWhatsAppOn' : 'account.notifications.toastWhatsAppOff', { title });
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
    voice = 'account',
}: {
    value: GqlCUserNotificationSettings;
    hasPhoneNumber: boolean;
    isCook: boolean;
    disabled: boolean;
    onAddPhone: () => void;
    onSave: (patch: GqlCUserNotificationSettingsInput) => Promise<void>;
    voice?: AccountNotificationVoice;
}) {
    const locale = useLocale();
    use(i18nResourcesLoadPromise(locale, ['profile']));
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
                toast.success(channelToast(notificationCopy(row, voice, 'title', locale), channel, next[domain][channel], locale));
            }
        } catch {
            setSettings(previous);
            toast.error(t(locale, 'common', 'saveFailed'));
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
                    disabled={disabled}
                    className="w-fit text-left text-sm text-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
                    onClick={onAddPhone}
                >
                    {t(locale, 'profile', 'account.notifications.whatsAppNeedsNumber')}
                </button>
            )}
            <NotificationGroup
                heading={t(
                    locale,
                    'profile',
                    voice === 'operator' ? 'account.notifications.bookedEvenings' : 'account.notifications.eveningsYouBook',
                )}
                rows={customerRows}
                voice={voice}
                settings={settings}
                hasPhoneNumber={hasPhoneNumber}
                disabled={disabled}
                onToggle={onToggle}
            />
            {isCook ? (
                <NotificationGroup
                    heading={t(
                        locale,
                        'profile',
                        voice === 'operator' ? 'account.notifications.asACook' : 'account.notifications.whenYouCook',
                    )}
                    rows={cookRows}
                    voice={voice}
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
                        <AlertDialogTitle>{t(locale, 'profile', 'account.notifications.lastChannelTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(
                                locale,
                                'profile',
                                voice === 'operator'
                                    ? 'account.notifications.lastChannelBodyOperator'
                                    : 'account.notifications.lastChannelBody',
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={disabled}>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={disabled}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmPending();
                            }}
                        >
                            {t(locale, 'profile', 'account.notifications.turnOff')}
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
    voice,
    settings,
    hasPhoneNumber,
    disabled,
    onToggle,
}: {
    heading: string;
    rows: NotificationRow[];
    voice: AccountNotificationVoice;
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
                        <p className="text-sm font-medium text-foreground">{notificationCopy(row, voice, 'title', locale)}</p>
                        <p className="text-sm text-muted-foreground">{notificationCopy(row, voice, 'description', locale)}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <ChannelSwitch
                            id={`${row.domain}-email`}
                            label={t(locale, 'profile', 'account.contact.email')}
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
