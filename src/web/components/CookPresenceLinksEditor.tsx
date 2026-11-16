import { PlusIcon, Trash2Icon } from 'lucide-react';

import { t as translate } from '../../i18n/t';
import type {
    CookPresenceLinks,
    CookPresenceLinksFormValue,
    CookPresenceLinksIssue,
    CookPresenceOtherPlatform,
} from '../../shared/cookPresenceLinks';
import {
    COOK_PRESENCE_OTHER_PROFILES_MAX,
    cookPresenceLinksFromStored,
    cookPresenceOtherPlatformLabel,
    cookPresenceOtherPlatforms,
} from '../../shared/cookPresenceLinks';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Input } from './base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';

export function cookPresenceLinksIssueMessage(issue: CookPresenceLinksIssue, locale: Locale): string {
    const field =
        issue.field === 'otherProfiles'
            ? `${translate(locale, 'profileCook', 'presence.anotherProfile')} ${(issue.index ?? 0) + 1}`
            : {
                  websiteUrl: translate(locale, 'profileCook', 'presence.website'),
                  instagramUrl: 'Instagram',
                  googleProfileUrl: translate(locale, 'profileCook', 'presence.googleProfile'),
                  takeAChefUrl: 'Take a Chef',
              }[issue.field];

    const detail = translate(locale, 'profileCook', `presence.issue.${issue.code}`);

    return `${field}: ${detail}`;
}

export function CookPresenceLinksReadout({ links }: { links: unknown }) {
    const locale = useLocale();
    const { t } = useT('profileCook');
    const rows = presenceRows(cookPresenceLinksFromStored(links), locale);
    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">{t('presence.empty')}</p>;
    }

    return (
        <ul className="grid gap-3">
            {rows.map((row) => (
                <li key={`${row.label}-${row.url}`} className="grid gap-1">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{row.label}</span>
                    <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 text-sm break-all text-foreground underline-offset-4 hover:underline"
                    >
                        {row.url}
                    </a>
                </li>
            ))}
        </ul>
    );
}

export function CookPresenceLinksFields({
    idPrefix,
    value,
    disabled,
    onChange,
}: {
    idPrefix: string;
    value: CookPresenceLinksFormValue;
    disabled?: boolean;
    onChange: (next: CookPresenceLinksFormValue) => void;
}) {
    const locale = useLocale();
    const { t } = useT('profileCook');
    const atCap = value.otherProfiles.length >= COOK_PRESENCE_OTHER_PROFILES_MAX;

    function patch(partial: Partial<CookPresenceLinksFormValue>) {
        onChange({ ...value, ...partial });
    }

    return (
        <div className="grid min-w-0 gap-4">
            <UrlField
                id={`${idPrefix}-website`}
                label={t('presence.website')}
                placeholder="https://"
                value={value.websiteUrl}
                disabled={disabled}
                onChange={(websiteUrl) => patch({ websiteUrl })}
            />
            <UrlField
                id={`${idPrefix}-instagram`}
                label="Instagram"
                placeholder="https://instagram.com/"
                value={value.instagramUrl}
                disabled={disabled}
                onChange={(instagramUrl) => patch({ instagramUrl })}
            />
            <UrlField
                id={`${idPrefix}-google`}
                label={t('presence.googleProfile')}
                placeholder="https://maps.app.goo.gl/"
                value={value.googleProfileUrl}
                disabled={disabled}
                onChange={(googleProfileUrl) => patch({ googleProfileUrl })}
            />
            <UrlField
                id={`${idPrefix}-take-a-chef`}
                label="Take a Chef"
                placeholder="https://www.takeachef.com/"
                value={value.takeAChefUrl}
                disabled={disabled}
                onChange={(takeAChefUrl) => patch({ takeAChefUrl })}
            />

            {value.otherProfiles.map((profile, index) => (
                <div key={`${idPrefix}-other-${index}`} className="grid min-w-0 gap-2 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                        <label htmlFor={`${idPrefix}-other-${index}-platform`} className="text-sm font-medium">
                            {t('presence.anotherProfile')}
                        </label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={disabled}
                            aria-label={t('presence.removeProfile')}
                            onClick={() => patch({ otherProfiles: value.otherProfiles.filter((_, row) => row !== index) })}
                        >
                            <Trash2Icon aria-hidden />
                        </Button>
                    </div>
                    <Select
                        value={profile.platform}
                        disabled={disabled}
                        onValueChange={(next) => {
                            const platform = next as CookPresenceOtherPlatform;
                            patch({
                                otherProfiles: value.otherProfiles.map((row, rowIndex) =>
                                    rowIndex === index ? { ...row, platform, label: platform === 'OTHER' ? row.label : '' } : row,
                                ),
                            });
                        }}
                    >
                        <SelectTrigger id={`${idPrefix}-other-${index}-platform`} className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {cookPresenceOtherPlatforms.map((platform) => (
                                <SelectItem key={platform} value={platform}>
                                    {platformOptionLabel(platform, locale)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {profile.platform === 'OTHER' ? (
                        <div className="grid gap-2">
                            <label htmlFor={`${idPrefix}-other-${index}-label`} className="text-sm font-medium">
                                {t('presence.platformName')}
                            </label>
                            <Input
                                id={`${idPrefix}-other-${index}-label`}
                                value={profile.label}
                                disabled={disabled}
                                onChange={(event) =>
                                    patch({
                                        otherProfiles: value.otherProfiles.map((row, rowIndex) =>
                                            rowIndex === index ? { ...row, label: event.target.value } : row,
                                        ),
                                    })
                                }
                            />
                        </div>
                    ) : null}
                    <div className="grid gap-2">
                        <label htmlFor={`${idPrefix}-other-${index}-url`} className="text-sm font-medium">
                            {t('presence.address')}
                        </label>
                        <Input
                            id={`${idPrefix}-other-${index}-url`}
                            inputMode="url"
                            autoCapitalize="off"
                            spellCheck={false}
                            placeholder="https://"
                            value={profile.url}
                            disabled={disabled}
                            onChange={(event) =>
                                patch({
                                    otherProfiles: value.otherProfiles.map((row, rowIndex) =>
                                        rowIndex === index ? { ...row, url: event.target.value } : row,
                                    ),
                                })
                            }
                        />
                    </div>
                </div>
            ))}

            {atCap ? null : (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={disabled}
                    onClick={() =>
                        patch({
                            otherProfiles: [...value.otherProfiles, { platform: 'OTHER', label: '', url: '' }],
                        })
                    }
                >
                    <PlusIcon aria-hidden />
                    {t('presence.addAnother')}
                </Button>
            )}
        </div>
    );
}

function UrlField({
    id,
    label,
    placeholder,
    value,
    disabled,
    onChange,
}: {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    disabled?: boolean;
    onChange: (next: string) => void;
}) {
    return (
        <div className="grid min-w-0 gap-2">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>
            <Input
                id={id}
                inputMode="url"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={placeholder}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}

function platformOptionLabel(platform: CookPresenceOtherPlatform, locale: Locale): string {
    if (platform === 'OTHER') return translate(locale, 'profileCook', 'presence.other');
    return cookPresenceOtherPlatformLabel(platform);
}

function presenceRows(links: CookPresenceLinks | null | undefined, locale: Locale): Array<{ label: string; url: string }> {
    if (links == null) return [];
    const rows: Array<{ label: string; url: string }> = [];
    if (links.websiteUrl) rows.push({ label: translate(locale, 'profileCook', 'presence.website'), url: links.websiteUrl });
    if (links.instagramUrl) rows.push({ label: 'Instagram', url: links.instagramUrl });
    if (links.googleProfileUrl) {
        rows.push({ label: translate(locale, 'profileCook', 'presence.googleProfile'), url: links.googleProfileUrl });
    }
    if (links.takeAChefUrl) rows.push({ label: 'Take a Chef', url: links.takeAChefUrl });
    for (const profile of links.otherProfiles) {
        const label = profile.platform === 'OTHER' && profile.label ? profile.label : platformOptionLabel(profile.platform, locale);
        rows.push({ label, url: profile.url });
    }
    return rows;
}
