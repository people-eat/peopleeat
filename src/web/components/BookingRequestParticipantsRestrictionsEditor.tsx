import { useEffect, useState } from 'react';

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
            ? { de: `Erwachsener ${indexWithinType + 1}`, en: `Adult ${indexWithinType + 1}` }[locale]
            : { de: `Kind ${indexWithinType + 1}`, en: `Child ${indexWithinType + 1}` }[locale];
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
                ? { de: `Erwachsener ${indexWithinType + 1}`, en: `Adult ${indexWithinType + 1}` }[locale]
                : { de: `Kind ${indexWithinType + 1}`, en: `Child ${indexWithinType + 1}` }[locale];
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
        const typeLabel = participant.type === 'ADULT' ? { de: 'Erwachsener', en: 'Adult' }[locale] : { de: 'Kind', en: 'Child' }[locale];

        return (
            <div className="grid gap-4" key={participant.key}>
                <div className="flex flex-col items-stretch gap-3 @md:flex-row @md:items-end">
                    <label className="grid flex-1 gap-1.5">
                        <span className="text-sm font-medium">
                            {
                                {
                                    de: 'Name des betroffenen Teilnehmers (optional)',
                                    en: 'Name of the affected participant (optional)',
                                }[locale]
                            }
                        </span>
                        <Input
                            value={participant.name}
                            disabled={disabled}
                            placeholder={`${indexWithinType + 1}. ${typeLabel}`}
                            onChange={(event) => updateByKey(participant.key, { name: event.target.value })}
                        />
                    </label>
                    <Button type="button" variant="destructive" disabled={disabled} onClick={() => hideParticipant(participant.key)}>
                        {{ de: 'Entfernen', en: 'Remove' }[locale]}
                    </Button>
                </div>
                <div className="flex flex-col items-stretch gap-3 @md:flex-row @md:items-end">
                    <Input
                        className="flex-1"
                        value={filter}
                        disabled={disabled}
                        placeholder={
                            {
                                de: 'Einschränkung oder Allergie (suchen oder hier eigene eingeben)',
                                en: 'Select from the options below or add your own one here',
                            }[locale]
                        }
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
                        {{ de: 'Eigene hinzufügen', en: 'Add custom' }[locale]}
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
                        ? { de: 'Hat einer der Erwachsenen Einschränkungen?', en: 'Do any of the adults have any restrictions?' }[locale]
                        : {
                              de: 'Hat ein weiterer der Erwachsenen Einschränkungen?',
                              en: 'Do any of the other adults have any restrictions?',
                          }[locale]}
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
                        ? { de: 'Hat eines der Kinder Einschränkungen?', en: 'Do any of the children have any restrictions?' }[locale]
                        : {
                              de: 'Hat ein weiteres der Kinder Einschränkungen?',
                              en: 'Do any of the other children have any restrictions?',
                          }[locale]}
                </Button>
            ) : null}
        </div>
    );
}
