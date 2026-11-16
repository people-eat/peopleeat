import { bookingRequestSuggestedOfferMessage, containsPhoneNumber, COOK_DEFAULT_OFFER_MESSAGE_MAX_LENGTH, inlineCopy } from '../../shared';
import type { CookDefaultOfferMessageMode } from '../../shared/cookDefaultOfferMessage';
import { useLocale } from '../hooks/useLocale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';
import { StatusAlert } from './base/status-alert';
import { Textarea } from './base/textarea';

export function CookDefaultOfferMessageReadout({ value }: { value: string | null }) {
    const locale = useLocale();

    if (value == null) {
        return (
            <p className="text-sm text-muted-foreground">
                {inlineCopy(
                    {
                        de: 'Noch nicht festgelegt. Neue Angebote starten mit einer kurzen peopleeat-Begrüßung.',
                        en: 'Not set. New offers start with a short peopleeat greeting.',
                    },
                    locale,
                )}
            </p>
        );
    }

    if (value.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {inlineCopy(
                    {
                        de: 'Leer. Du schreibst für jedes Angebot eine neue Nachricht.',
                        en: 'Empty. You write a new note for each offer.',
                    },
                    locale,
                )}
            </p>
        );
    }

    return <p className="text-sm whitespace-pre-wrap text-foreground">{value}</p>;
}

const MODE_COPY: Record<CookDefaultOfferMessageMode, { label: { de: string; en: string }; description: { de: string; en: string } }> = {
    template: {
        label: { de: 'peopleeat-Begrüßung', en: 'peopleeat greeting' },
        description: {
            de: 'Neue Angebote starten mit dem kurzen Standardtext, bis du etwas anderes speicherst.',
            en: 'New offers start with the short default text until you save a different choice.',
        },
    },
    empty: {
        label: { de: 'Jedes Mal leer', en: 'Start empty each time' },
        description: {
            de: 'Das Nachrichtenfeld bleibt leer, damit du jedes Angebot persönlich formulierst.',
            en: 'The note starts blank so you can write a personal message for each offer.',
        },
    },
    custom: {
        label: { de: 'Eigener Text', en: 'Custom text' },
        description: {
            de: 'Dieser Text wird beim Erstellen eines Angebots vorausgefüllt.',
            en: 'This text prefills when you create an offer.',
        },
    },
};

export function CookDefaultOfferMessageFields({
    idPrefix,
    mode,
    text,
    allowTemplate,
    disabled = false,
    onModeChange,
    onTextChange,
}: {
    idPrefix: string;
    mode: CookDefaultOfferMessageMode;
    text: string;
    allowTemplate: boolean;
    disabled?: boolean;
    onModeChange: (mode: CookDefaultOfferMessageMode) => void;
    onTextChange: (text: string) => void;
}) {
    const locale = useLocale();
    const selectId = `${idPrefix}-mode`;
    const textId = `${idPrefix}-text`;
    const showTemplate = allowTemplate || mode === 'template';
    const messageContainsPhoneNumber = mode === 'custom' && containsPhoneNumber(text);
    const modes: CookDefaultOfferMessageMode[] = showTemplate ? ['template', 'empty', 'custom'] : ['empty', 'custom'];

    return (
        <div className="grid min-w-0 gap-3">
            <div className="grid min-w-0 gap-2">
                <label htmlFor={selectId} className="text-sm font-medium">
                    {inlineCopy({ de: 'Begrüßungstext für Angebote', en: 'Default offer note' }, locale)}
                </label>
                <p className="text-sm text-muted-foreground">
                    {inlineCopy(
                        {
                            de: 'Gäste sehen ihn als erste Chat-Nachricht. Speichere leer, wenn du jedes Mal neu schreiben möchtest.',
                            en: 'Guests see it as the first chat message. Save empty if you want to write a new note each time.',
                        },
                        locale,
                    )}
                </p>
                <div className="w-full sm:w-fit sm:min-w-60 sm:justify-self-start">
                    <Select
                        value={mode}
                        disabled={disabled}
                        onValueChange={(next) => {
                            if (next === 'template' || next === 'empty' || next === 'custom') onModeChange(next);
                        }}
                    >
                        <SelectTrigger id={selectId} className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {modes.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {inlineCopy(MODE_COPY[option].label, locale)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <p className="text-sm text-muted-foreground">{inlineCopy(MODE_COPY[mode].description, locale)}</p>
            </div>
            {mode === 'custom' ? (
                <div className="grid min-w-0 gap-2">
                    <label htmlFor={textId} className="sr-only">
                        {inlineCopy({ de: 'Dein Text', en: 'Your text' }, locale)}
                    </label>
                    <Textarea
                        id={textId}
                        rows={5}
                        maxLength={COOK_DEFAULT_OFFER_MESSAGE_MAX_LENGTH}
                        value={text}
                        disabled={disabled}
                        placeholder={bookingRequestSuggestedOfferMessage(locale)}
                        onChange={(event) => onTextChange(event.target.value.slice(0, COOK_DEFAULT_OFFER_MESSAGE_MAX_LENGTH))}
                    />
                    {messageContainsPhoneNumber ? (
                        <StatusAlert tone="warning">
                            {inlineCopy(
                                {
                                    de: 'Das Teilen von Telefonnummern ist nicht erlaubt. Bitte bleibe für Absprachen im Chat.',
                                    en: 'Sharing phone numbers is not allowed. Please keep arrangements in chat.',
                                },
                                locale,
                            )}
                        </StatusAlert>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
