import { useEffect, useState } from 'react';

import { t } from '../../i18n/t';
import { defaultBookingRequestRestrictions, textNormalizeTitled } from '../../shared';
import type { BookingRequestParticipantDraft, Locale } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import { Button } from './base/button';
import { Input } from './base/input';
import { SelectableChip } from './SelectableChip';

type EditorParticipant = BookingRequestParticipantDraft & {
    key: string;
};

function participantKeys(participants: readonly BookingRequestParticipantDraft[]): string[] {
    let adultIndex = 0;
    let discountedIndex = 0;
    return participants.map((participant) => {
        if (participant.type === 'ADULT') {
            adultIndex += 1;
            return `adult-${adultIndex}`;
        }
        discountedIndex += 1;
        return `discounted-${discountedIndex}`;
    });
}

function withKeys(participants: readonly BookingRequestParticipantDraft[]): EditorParticipant[] {
    const keys = participantKeys(participants);
    return participants.map((participant, index) => ({ ...participant, key: keys[index]! }));
}

function shouldRevealInitially(participant: BookingRequestParticipantDraft, locale: Locale, indexWithinType: number): boolean {
    if (participant.restrictions.length > 0) return true;
    const defaultName =
        participant.type === 'ADULT'
            ? t(locale, 'common', 'bookingRequestParticipant.adultName', { index: indexWithinType + 1 })
            : t(locale, 'common', 'bookingRequestParticipant.childName', { index: indexWithinType + 1 });
    return participant.name.trim() !== defaultName;
}

export function BookingRequestParticipantsRestrictionsEditor({
    participants,
    onChange,
    disabled = false,
}: {
    participants: readonly BookingRequestParticipantDraft[];
    onChange: (next: BookingRequestParticipantDraft[]) => void;
    disabled?: boolean;
}) {
    const locale = useLocale();
    const keyed = withKeys(participants);
    const participantSignature = keyed
        .map((participant) => `${participant.key}:${participant.restrictions.join('|')}:${participant.name}`)
        .join(';');
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(() => {
        const next = new Set<string>();
        let adultIndex = 0;
        let discountedIndex = 0;
        for (const participant of keyed) {
            const indexWithinType = participant.type === 'ADULT' ? adultIndex++ : discountedIndex++;
            if (shouldRevealInitially(participant, locale, indexWithinType)) {
                next.add(participant.key);
            }
        }
        return next;
    });
    const [filterByKey, setFilterByKey] = useState<Record<string, string>>({});

    useEffect(() => {
        setRevealedKeys((previous) => {
            const next = new Set(previous);
            let adultIndex = 0;
            let discountedIndex = 0;
            const current = withKeys(participants);
            for (const participant of current) {
                const indexWithinType = participant.type === 'ADULT' ? adultIndex++ : discountedIndex++;
                if (shouldRevealInitially(participant, locale, indexWithinType)) {
                    next.add(participant.key);
                }
            }
            for (const key of [...next]) {
                if (!current.some((participant) => participant.key === key)) {
                    next.delete(key);
                }
            }
            return next;
        });
    }, [participantSignature, locale, participants]);

    const adults = keyed.filter((participant) => participant.type === 'ADULT');
    const discounted = keyed.filter((participant) => participant.type === 'DISCOUNTED');
    const revealedAdults = adults.filter((participant) => revealedKeys.has(participant.key));
    const revealedDiscounted = discounted.filter((participant) => revealedKeys.has(participant.key));
    const defaults = defaultBookingRequestRestrictions(locale);

    function updateByKey(key: string, patch: Partial<BookingRequestParticipantDraft>) {
        onChange(
            keyed.map((participant) => {
                if (participant.key !== key) {
                    return { type: participant.type, name: participant.name, restrictions: participant.restrictions };
                }
                return {
                    type: participant.type,
                    name: patch.name ?? participant.name,
                    restrictions: patch.restrictions ?? participant.restrictions,
                };
            }),
        );
    }

    function revealNext(type: 'ADULT' | 'DISCOUNTED') {
        const candidate = keyed.find((participant) => participant.type === type && !revealedKeys.has(participant.key));
        if (!candidate) return;
        setRevealedKeys((previous) => new Set([...previous, candidate.key]));
    }

    function hideParticipant(key: string) {
        const participant = keyed.find((item) => item.key === key);
        if (!participant) return;
        const sameType = keyed.filter((item) => item.type === participant.type);
        const indexWithinType = sameType.findIndex((item) => item.key === key);
        const defaultName =
            participant.type === 'ADULT'
                ? t(locale, 'common', 'bookingRequestParticipant.adultName', { index: indexWithinType + 1 })
                : t(locale, 'common', 'bookingRequestParticipant.childName', { index: indexWithinType + 1 });
        setRevealedKeys((previous) => {
            const next = new Set(previous);
            next.delete(key);
            return next;
        });
        setFilterByKey((previous) => {
            const { [key]: _removed, ...rest } = previous;
            return rest;
        });
        updateByKey(key, { restrictions: [], name: defaultName });
    }

    function renderParticipantEditor(participant: EditorParticipant, indexWithinType: number) {
        const filter = filterByKey[participant.key] ?? '';
        const customOptions = participant.restrictions.filter((restriction) => !defaults.includes(restriction));
        const options = [...defaults, ...customOptions].filter((option) => option.toLowerCase().includes(filter.toLowerCase()));
        const typeLabel =
            participant.type === 'ADULT' ? t(locale, 'common', 'restrictions.adult') : t(locale, 'common', 'restrictions.child');

        return (
            <div className="grid gap-4" key={participant.key}>
                <div className="flex flex-col items-stretch gap-3 @md:flex-row @md:items-end">
                    <label className="grid flex-1 gap-1.5">
                        <span className="text-sm font-medium">{t(locale, 'common', 'restrictions.affectedName')}</span>
                        <Input
                            value={participant.name}
                            disabled={disabled}
                            placeholder={`${indexWithinType + 1}. ${typeLabel}`}
                            onChange={(event) => updateByKey(participant.key, { name: event.target.value })}
                        />
                    </label>
                    <Button type="button" variant="destructive" disabled={disabled} onClick={() => hideParticipant(participant.key)}>
                        {t(locale, 'common', 'remove')}
                    </Button>
                </div>
                <div className="flex flex-col items-stretch gap-3 @md:flex-row @md:items-end">
                    <Input
                        className="flex-1"
                        value={filter}
                        disabled={disabled}
                        placeholder={t(locale, 'common', 'restrictions.searchPlaceholder')}
                        onChange={(event) => setFilterByKey((previous) => ({ ...previous, [participant.key]: event.target.value }))}
                    />
                    <Button
                        type="button"
                        disabled={disabled || filter.trim() === ''}
                        onClick={() => {
                            const next = textNormalizeTitled(filter);
                            if (!next) return;
                            if (!participant.restrictions.includes(next)) {
                                updateByKey(participant.key, { restrictions: [...participant.restrictions, next] });
                            }
                            setFilterByKey((previous) => ({ ...previous, [participant.key]: '' }));
                        }}
                    >
                        {t(locale, 'common', 'restrictions.addCustom')}
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                        const selected = participant.restrictions.includes(option);
                        return (
                            <SelectableChip
                                key={option}
                                label={option}
                                selected={selected}
                                disabled={disabled}
                                onClick={() => {
                                    updateByKey(participant.key, {
                                        restrictions: selected
                                            ? participant.restrictions.filter((item) => item !== option)
                                            : [...participant.restrictions, option],
                                    });
                                    setFilterByKey((previous) => ({ ...previous, [participant.key]: '' }));
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-10">
            {revealedAdults.map((participant, index) => renderParticipantEditor(participant, index))}
            {revealedAdults.length < adults.length ? (
                <Button
                    type="button"
                    variant="outline"
                    className="justify-self-stretch whitespace-normal @md:justify-self-end"
                    disabled={disabled}
                    onClick={() => revealNext('ADULT')}
                >
                    {revealedAdults.length === 0
                        ? t(locale, 'common', 'restrictions.anyAdults')
                        : t(locale, 'common', 'restrictions.otherAdults')}
                </Button>
            ) : null}
            {revealedDiscounted.map((participant, index) => renderParticipantEditor(participant, index))}
            {revealedDiscounted.length < discounted.length ? (
                <Button
                    type="button"
                    variant="secondary"
                    className="justify-self-stretch whitespace-normal @md:justify-self-end"
                    disabled={disabled}
                    onClick={() => revealNext('DISCOUNTED')}
                >
                    {revealedDiscounted.length === 0
                        ? t(locale, 'common', 'restrictions.anyChildren')
                        : t(locale, 'common', 'restrictions.otherChildren')}
                </Button>
            ) : null}
        </div>
    );
}
