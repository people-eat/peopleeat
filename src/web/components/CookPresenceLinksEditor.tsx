import { PlusIcon, Trash2Icon } from 'lucide-react';
import { inlineCopy } from '../../shared';

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
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Input } from './base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';

export function cookPresenceLinksIssueMessage(issue: CookPresenceLinksIssue, locale: Locale): string {
    const field =
        issue.field === 'otherProfiles'
            ? `${inlineCopy({ de: 'Weiteres Profil', en: 'Another profile' }, locale)} ${(issue.index ?? 0) + 1}`
            : {
                  websiteUrl: inlineCopy({ de: 'Website', en: 'Website' }, locale),
                  instagramUrl: 'Instagram',
                  googleProfileUrl: inlineCopy({ de: 'Google-Profil', en: 'Google profile' }, locale),
                  takeAChefUrl: 'Take a Chef',
              }[issue.field];

    const detail = inlineCopy(
        {
            url: { de: 'Bitte gib eine gültige https-Adresse ein.', en: 'Enter a valid https address.' },
            https: { de: 'Bitte gib eine gültige https-Adresse ein.', en: 'Enter a valid https address.' },
            credentials: {
                de: 'Die Adresse darf kein Passwort enthalten.',
                en: 'The address must not include a password.',
            },
            tooLong: { de: 'Die Adresse ist zu lang.', en: 'The address is too long.' },
            instagramHost: {
                de: 'Die Instagram-Adresse muss auf instagram.com liegen.',
                en: 'The Instagram address must be on instagram.com.',
            },
            googleHost: {
                de: 'Die Google-Adresse muss ein Maps-, g.page- oder Unternehmensprofil-Link sein.',
                en: 'The Google address must be a Maps, g.page, or Business Profile link.',
            },
            takeAChefHost: {
                de: 'Die Take-a-Chef-Adresse muss auf takeachef.com liegen.',
                en: 'The Take a Chef address must be on takeachef.com.',
            },
            labelRequired: { de: 'Bitte benenne die Plattform.', en: 'Name the platform.' },
            labelTooLong: { de: 'Der Plattformname ist zu lang.', en: 'The platform name is too long.' },
            duplicatePlatform: {
                de: 'Diese Plattform ist schon eingetragen.',
                en: 'That platform is already listed.',
            },
            tooMany: {
                de: 'Höchstens fünf weitere Profile.',
                en: 'At most five other profiles.',
            },
        }[issue.code],
        locale,
    );

    return `${field}: ${detail}`;
}

export function CookPresenceLinksReadout({ links }: { links: unknown }) {
    const locale = useLocale();
    const rows = presenceRows(cookPresenceLinksFromStored(links), locale);
    if (rows.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {inlineCopy({ de: 'Noch keine Profile angegeben.', en: 'No other profiles yet.' }, locale)}
            </p>
        );
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
    const atCap = value.otherProfiles.length >= COOK_PRESENCE_OTHER_PROFILES_MAX;

    function patch(partial: Partial<CookPresenceLinksFormValue>) {
        onChange({ ...value, ...partial });
    }

    return (
        <div className="grid min-w-0 gap-4">
            <UrlField
                id={`${idPrefix}-website`}
                label={inlineCopy({ de: 'Website', en: 'Website' }, locale)}
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
                label={inlineCopy({ de: 'Google-Profil', en: 'Google profile' }, locale)}
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
                            {inlineCopy({ de: 'Weiteres Profil', en: 'Another profile' }, locale)}
                        </label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={disabled}
                            aria-label={inlineCopy({ de: 'Profil entfernen', en: 'Remove profile' }, locale)}
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
                                {inlineCopy({ de: 'Name der Plattform', en: 'Platform name' }, locale)}
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
                            {inlineCopy({ de: 'Adresse', en: 'Address' }, locale)}
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
                    {inlineCopy({ de: 'Weiteres Profil hinzufügen', en: 'Add another profile' }, locale)}
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
    if (platform === 'OTHER') return inlineCopy({ de: 'Andere', en: 'Other' }, locale);
    return cookPresenceOtherPlatformLabel(platform);
}

function presenceRows(links: CookPresenceLinks | null | undefined, locale: Locale): Array<{ label: string; url: string }> {
    if (links == null) return [];
    const rows: Array<{ label: string; url: string }> = [];
    if (links.websiteUrl) rows.push({ label: inlineCopy({ de: 'Website', en: 'Website' }, locale), url: links.websiteUrl });
    if (links.instagramUrl) rows.push({ label: 'Instagram', url: links.instagramUrl });
    if (links.googleProfileUrl) {
        rows.push({ label: inlineCopy({ de: 'Google-Profil', en: 'Google profile' }, locale), url: links.googleProfileUrl });
    }
    if (links.takeAChefUrl) rows.push({ label: 'Take a Chef', url: links.takeAChefUrl });
    for (const profile of links.otherProfiles) {
        const label = profile.platform === 'OTHER' && profile.label ? profile.label : platformOptionLabel(profile.platform, locale);
        rows.push({ label, url: profile.url });
    }
    return rows;
}
