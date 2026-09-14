// Slot typing for `promptUserForInput` lives in Zod + UI only (not GraphQL unions).
// Shapes match `src/server/db/chatPayloadTypes.ts`.

export type ChatAssistantInputSlot =
    | { inputId: string; prompt: string; kind: 'Date' }
    | { inputId: string; prompt: string; kind: 'DateRange' }
    | { inputId: string; prompt: string; kind: 'DateTime' }
    | { inputId: string; prompt: string; kind: 'Time' }
    | { inputId: string; prompt: string; kind: 'SingleSelect'; options: string[] }
    | { inputId: string; prompt: string; kind: 'MultiSelect'; options: string[] }
    | { inputId: string; prompt: string; kind: 'Boolean' }
    | { inputId: string; prompt: string; kind: 'Text' };

export type ChatAssistantInputValue =
    | { kind: 'Date'; date: string }
    | { kind: 'DateRange'; from: string; to: string }
    | { kind: 'DateTime'; dateTime: string }
    | { kind: 'Time'; time: string }
    | { kind: 'String'; value: string }
    | { kind: 'StringList'; values: string[] }
    | { kind: 'Boolean'; value: boolean };

export interface ChatMessageUserInputAnswer {
    inputId: string;
    value: ChatAssistantInputValue;
}

interface DateTimeDraft {
    date?: string;
    time?: string;
}

export type SlotDraft =
    | { kind: 'Date'; date?: string }
    | { kind: 'DateRange'; from?: string; to?: string }
    | { kind: 'DateTime'; dateTime?: DateTimeDraft }
    | { kind: 'Time'; time?: string }
    | { kind: 'SingleSelect'; selected?: string }
    | { kind: 'MultiSelect'; selected?: ReadonlyArray<string> }
    | { kind: 'Boolean'; value?: boolean }
    | { kind: 'Text'; text?: string };

function combineDateTimeDraft(draft: DateTimeDraft | undefined): string | null {
    if (!draft || !draft.date || !draft.time) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return null;
    if (!/^\d{2}:\d{2}$/.test(draft.time)) return null;
    const combined = new Date(`${draft.date}T${draft.time}:00`);
    if (Number.isNaN(combined.getTime())) return null;
    return combined.toISOString();
}

export function serializeSlotAnswer(draft: SlotDraft): ChatAssistantInputValue | null {
    switch (draft.kind) {
        case 'Date':
            return draft.date ? { kind: 'Date', date: draft.date } : null;
        case 'DateRange':
            return draft.from && draft.to ? { kind: 'DateRange', from: draft.from, to: draft.to } : null;
        case 'DateTime': {
            const iso = combineDateTimeDraft(draft.dateTime);
            return iso ? { kind: 'DateTime', dateTime: iso } : null;
        }
        case 'Time':
            return draft.time && /^\d{2}:\d{2}$/.test(draft.time) ? { kind: 'Time', time: draft.time } : null;
        case 'SingleSelect':
            return draft.selected ? { kind: 'String', value: draft.selected } : null;
        case 'MultiSelect':
            return draft.selected && draft.selected.length > 0 ? { kind: 'StringList', values: [...draft.selected] } : null;
        case 'Boolean':
            return typeof draft.value === 'boolean' ? { kind: 'Boolean', value: draft.value } : null;
        case 'Text':
            return draft.text && draft.text.trim().length > 0 ? { kind: 'String', value: draft.text } : null;
    }
}

export function toAnswerPayload(inputId: string, value: ChatAssistantInputValue): ChatMessageUserInputAnswer {
    return { inputId, value };
}

/** Normalize tool input JSON into slots with stable inputIds. */
export function slotsFromToolInput(raw: unknown): { prompt: string; slots: ChatAssistantInputSlot[]; mode: 'form' | 'stepThrough' } {
    if (!raw || typeof raw !== 'object') return { prompt: '', slots: [], mode: 'form' };
    const data = raw as { prompt?: string; inputs?: unknown[]; mode?: string };
    const prompt = typeof data.prompt === 'string' ? data.prompt : '';
    const mode = data.mode === 'stepThrough' ? 'stepThrough' : 'form';
    const slots: ChatAssistantInputSlot[] = [];
    for (const [index, entry] of (data.inputs ?? []).entries()) {
        if (!entry || typeof entry !== 'object') continue;
        const slot = entry as { kind?: string; prompt?: string; options?: string[]; inputId?: string };
        const inputId = typeof slot.inputId === 'string' && slot.inputId.length > 0 ? slot.inputId : `slot-${index}`;
        const slotPrompt = typeof slot.prompt === 'string' ? slot.prompt : '';
        switch (slot.kind) {
            case 'Date':
            case 'DateRange':
            case 'DateTime':
            case 'Time':
            case 'Boolean':
            case 'Text':
                slots.push({ inputId, prompt: slotPrompt, kind: slot.kind });
                break;
            case 'SingleSelect':
            case 'MultiSelect':
                slots.push({
                    inputId,
                    prompt: slotPrompt,
                    kind: slot.kind,
                    options: Array.isArray(slot.options) ? slot.options.filter((o): o is string => typeof o === 'string') : [],
                });
                break;
            default:
                break;
        }
    }
    return { prompt, slots, mode };
}
