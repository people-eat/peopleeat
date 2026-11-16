import { bookingRequestSuggestedOfferMessage, containsPhoneNumber, COOK_DEFAULT_OFFER_MESSAGE_MAX_LENGTH } from '../../shared';
import type { CookDefaultOfferMessageMode } from '../../shared/cookDefaultOfferMessage';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';
import { StatusAlert } from './base/status-alert';
import { Textarea } from './base/textarea';

export function CookDefaultOfferMessageReadout({ value }: { value: string | null }) {
    const { t } = useT('profileCook');

    if (value == null) {
        return <p className="text-sm text-muted-foreground">{t('defaultOfferMessage.notSet')}</p>;
    }

    if (value.length === 0) {
        return <p className="text-sm text-muted-foreground">{t('defaultOfferMessage.emptyReadout')}</p>;
    }

    return <p className="text-sm whitespace-pre-wrap text-foreground">{value}</p>;
}

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
    const { t } = useT('profileCook');
    const selectId = `${idPrefix}-mode`;
    const textId = `${idPrefix}-text`;
    const showTemplate = allowTemplate || mode === 'template';
    const messageContainsPhoneNumber = mode === 'custom' && containsPhoneNumber(text);
    const modes: CookDefaultOfferMessageMode[] = showTemplate ? ['template', 'empty', 'custom'] : ['empty', 'custom'];

    return (
        <div className="grid min-w-0 gap-3">
            <div className="grid min-w-0 gap-2">
                <label htmlFor={selectId} className="text-sm font-medium">
                    {t('chefProfile.defaultOfferNote')}
                </label>
                <p className="text-sm text-muted-foreground">{t('defaultOfferMessage.guestsSeeHint')}</p>
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
                                    {t(`defaultOfferMessage.mode.${option}.label`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <p className="text-sm text-muted-foreground">{t(`defaultOfferMessage.mode.${mode}.description`)}</p>
            </div>
            {mode === 'custom' ? (
                <div className="grid min-w-0 gap-2">
                    <label htmlFor={textId} className="sr-only">
                        {t('defaultOfferMessage.yourText')}
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
                    {messageContainsPhoneNumber ? <StatusAlert tone="warning">{t('defaultOfferMessage.phoneSharing')}</StatusAlert> : null}
                </div>
            ) : null}
        </div>
    );
}
