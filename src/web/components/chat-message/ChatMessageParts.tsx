import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { formatDate } from '../../../shared';
import type { ChatAssistantInputSlot, SlotDraft } from '../../chat/chatAssistantInputKinds';
import { serializeSlotAnswer, slotsFromToolInput, toAnswerPayload } from '../../chat/chatAssistantInputKinds';
import { toolDisplay } from '../../chat/toolDisplay';
import type { GqlCChatTurnFieldsFragment } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminBookingRequestListCard } from '../AdminBookingRequestListCard';
import type { AdminBookingRequestListCardRequest } from '../AdminBookingRequestListCard';
import { AdminUserListCard } from '../AdminUserListCard';
import type { AdminUserListCardUser } from '../AdminUserListCard';
import { AssistantMarkdown } from '../AssistantMarkdown';
import { AssistantPendingStatus } from '../AssistantPendingStatus';
import { AssistantReasoning } from '../AssistantReasoning';
import { CookMealCard } from '../CookMealCard';
import { CookMenuCard } from '../CookMenuCard';
import { ChatArtifactCard } from './ChatArtifactCard';
import { ChatCardList } from './ChatCardList';
import { ToolArgumentsButton } from './shared';

type AssistantMessage = GqlCChatTurnFieldsFragment['assistantMessage'];
type Part = AssistantMessage['parts'][number];

const CHEF_CARD_LIST = 'chef.cardList';
const ADMIN_BOOKING_REQUEST_LIST = 'admin.bookingRequestList';
const ADMIN_USER_LIST = 'admin.userList';
const ADMIN_MEAL_LIST = 'admin.mealList';
const ADMIN_MENU_LIST = 'admin.menuList';

type ChatAdminMealListItem = {
    mealId: string;
    cookId: string;
    cookName: string;
    title: string;
    description: string;
    imageUrl: string | null;
    publishedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
};

type ChatAdminMenuListItem = {
    menuId: string;
    cookId: string;
    cookName: string;
    title: string;
    description: string;
    courseCount: number;
    courseMealOptionImages: string[];
    publishedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
};

interface ChatMessagePartsViewProps {
    message: AssistantMessage;
    chatTurnId: string;
    onApprovalRespond?: (chatTurnId: string, approvalId: string, approved: boolean, reason?: string) => void;
    onPromptUserForInputSubmit?: (chatTurnId: string, toolCallId: string, answers: unknown) => void;
}

const CHEF_PENDING = [
    { de: 'Schaue in die Speisekammer…', en: 'Checking the pantry…' },
    { de: 'Würze die Antwort…', en: 'Seasoning the answer…' },
    { de: 'Lass es köcheln…', en: 'Simmering on that…' },
    { de: 'Richte die Teller an…', en: 'Plating your options…' },
] as const;

/** Render durable assistant parts (text / reasoning / tool / data). */
export function ChatMessagePartsView({ message, chatTurnId, onApprovalRespond, onPromptUserForInputSubmit }: ChatMessagePartsViewProps) {
    const locale = useLocale();
    const [pendingIndex, setPendingIndex] = useState(0);
    const isPending = message.status === 'PENDING' || (message.status === 'STREAMING' && message.parts.length === 0);

    useEffect(() => {
        if (!isPending) return;
        const id = window.setInterval(() => {
            setPendingIndex((index) => (index + 1) % CHEF_PENDING.length);
        }, 3000);
        return () => window.clearInterval(id);
    }, [isPending]);

    if (isPending) {
        return <AssistantPendingStatus label={CHEF_PENDING[pendingIndex]![locale]} />;
    }

    return (
        <div className="flex w-full min-w-0 flex-col gap-2">
            {message.parts.map((part) => (
                <PartView
                    key={part.partId}
                    part={part}
                    chatTurnId={chatTurnId}
                    onApprovalRespond={onApprovalRespond}
                    onPromptUserForInputSubmit={onPromptUserForInputSubmit}
                />
            ))}
        </div>
    );
}

function PartView({
    part,
    chatTurnId,
    onApprovalRespond,
    onPromptUserForInputSubmit,
}: {
    part: Part;
    chatTurnId: string;
    onApprovalRespond?: ChatMessagePartsViewProps['onApprovalRespond'];
    onPromptUserForInputSubmit?: ChatMessagePartsViewProps['onPromptUserForInputSubmit'];
}) {
    const locale = useLocale();

    switch (part.__typename) {
        case 'ChatMessageTextPart':
            return <AssistantMarkdown text={part.text} />;
        case 'ChatMessageReasoningPart':
            return <AssistantReasoning text={part.text} live={part.partState === 'STREAMING'} />;
        case 'ChatMessageToolPart': {
            if (part.toolState === 'APPROVAL_REQUESTED' && part.approval && onApprovalRespond) {
                return (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                            onClick={() => onApprovalRespond(chatTurnId, part.approval!.approvalId, true)}
                        >
                            {{ de: 'Erlauben', en: 'Approve' }[locale]}
                        </button>
                        <button
                            type="button"
                            className="rounded border px-3 py-1.5 text-sm"
                            onClick={() => onApprovalRespond(chatTurnId, part.approval!.approvalId, false)}
                        >
                            {{ de: 'Ablehnen', en: 'Deny' }[locale]}
                        </button>
                    </div>
                );
            }
            if (part.toolName === 'promptUserForInput' && part.toolState === 'INPUT_AVAILABLE' && onPromptUserForInputSubmit) {
                return (
                    <PromptUserForInputForm
                        rawInput={part.debug?.input}
                        onSubmit={(answers) => onPromptUserForInputSubmit(chatTurnId, part.toolCallId, answers)}
                    />
                );
            }
            const label = part.toolTitle ?? toolDisplay(part.toolName, locale).label;
            const pending =
                part.toolState === 'INPUT_STREAMING' || part.toolState === 'INPUT_AVAILABLE' || part.toolState === 'APPROVAL_RESPONDED';
            return (
                <div className="group/tool-row flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm text-muted-foreground">
                    <div className="min-w-0 flex-1">{pending ? <AssistantPendingStatus label={label} /> : label}</div>
                    {part.debug ? (
                        <ToolArgumentsButton
                            toolLabel={label}
                            input={part.debug.input}
                            output={part.debug.output}
                            errorText={part.debug.errorText}
                        />
                    ) : null}
                </div>
            );
        }
        case 'ChatMessageSourceUrlPart':
            return (
                <a className="text-sm text-primary underline" href={part.url} target="_blank" rel="noreferrer">
                    {part.sourceTitle ?? part.url}
                </a>
            );
        case 'ChatMessageDataPart':
            return <ChatMessageDataPartView part={part} />;
        default:
            return null;
    }
}

function ChatMessageDataPartView({ part }: { part: Extract<Part, { __typename: 'ChatMessageDataPart' }> }) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    if (part.dataType === CHEF_CARD_LIST && part.data && typeof part.data === 'object') {
        const cards = (part.data as { cards?: Array<Record<string, string | undefined>> }).cards ?? [];
        if (cards.length === 0) return null;
        return (
            <ChatCardList>
                {cards.map((card, index) => (
                    <li key={index} className="min-h-0 min-w-0">
                        <ChatArtifactCard
                            layout="responsive"
                            card={{
                                imageUrl: card.imageUrl,
                                title: card.title ?? '',
                                description: card.description ?? '',
                                price: card.price,
                                href: card.href,
                                buttonTitle: card.buttonTitle,
                            }}
                        />
                    </li>
                ))}
            </ChatCardList>
        );
    }
    if (part.dataType === ADMIN_BOOKING_REQUEST_LIST && part.data && typeof part.data === 'object') {
        const requests = (part.data as { requests?: AdminBookingRequestListCardRequest[] }).requests ?? [];
        if (requests.length === 0) return null;
        return (
            <ChatCardList>
                {requests.map((request) => (
                    <li key={request.bookingRequestId} className="min-h-0 min-w-0">
                        <AdminBookingRequestListCard request={request} />
                    </li>
                ))}
            </ChatCardList>
        );
    }
    if (part.dataType === ADMIN_USER_LIST && part.data && typeof part.data === 'object') {
        const users = (part.data as { users?: AdminUserListCardUser[] }).users ?? [];
        if (users.length === 0) return null;
        return (
            <ChatCardList>
                {users.map((user) => (
                    <li key={user.userId} className="min-h-0 min-w-0">
                        <AdminUserListCard user={user} />
                    </li>
                ))}
            </ChatCardList>
        );
    }
    if (part.dataType === ADMIN_MEAL_LIST && part.data && typeof part.data === 'object') {
        const meals = (part.data as { meals?: ChatAdminMealListItem[] }).meals ?? [];
        if (meals.length === 0) return null;
        return (
            <ChatCardList columns="upToTwo">
                {meals.map((meal) => (
                    <li key={meal.mealId} className="min-h-0 min-w-0">
                        <CookMealCard
                            meal={meal}
                            density="compact"
                            className="hover:bg-muted/40"
                            to="/{-$locale}/admin/meals/$mealId"
                            params={{ mealId: meal.mealId }}
                            meta={
                                <>
                                    <Link
                                        to="/{-$locale}/admin/users/$userId"
                                        params={{ userId: meal.cookId }}
                                        search={{ tab: 'meals' }}
                                        className="hover:underline"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        {meal.cookName}
                                    </Link>
                                    {' · '}
                                    {formatDate(meal.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                </>
                            }
                        />
                    </li>
                ))}
            </ChatCardList>
        );
    }
    if (part.dataType === ADMIN_MENU_LIST && part.data && typeof part.data === 'object') {
        const menus = (part.data as { menus?: ChatAdminMenuListItem[] }).menus ?? [];
        if (menus.length === 0) return null;
        return (
            <ChatCardList columns="upToTwo">
                {menus.map((menu) => (
                    <li key={menu.menuId} className="min-h-0 min-w-0">
                        <CookMenuCard
                            menu={menu}
                            density="compact"
                            to="/{-$locale}/admin/menus/$menuId"
                            params={{ menuId: menu.menuId }}
                            meta={
                                <>
                                    <Link
                                        to="/{-$locale}/admin/users/$userId"
                                        params={{ userId: menu.cookId }}
                                        search={{ tab: 'menus' }}
                                        className="hover:underline"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        {menu.cookName}
                                    </Link>
                                    {' · '}
                                    {formatDate(menu.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                </>
                            }
                        />
                    </li>
                ))}
            </ChatCardList>
        );
    }
    return null;
}

function emptyDraft(slot: ChatAssistantInputSlot): SlotDraft {
    switch (slot.kind) {
        case 'Date':
            return { kind: 'Date' };
        case 'DateRange':
            return { kind: 'DateRange' };
        case 'DateTime':
            return { kind: 'DateTime', dateTime: {} };
        case 'Time':
            return { kind: 'Time' };
        case 'SingleSelect':
            return { kind: 'SingleSelect' };
        case 'MultiSelect':
            return { kind: 'MultiSelect', selected: [] };
        case 'Boolean':
            return { kind: 'Boolean' };
        case 'Text':
            return { kind: 'Text' };
    }
}

function PromptUserForInputForm({
    rawInput,
    onSubmit,
}: {
    rawInput: unknown;
    onSubmit: (answers: { status: 'answered'; answers: ReturnType<typeof toAnswerPayload>[] }) => void;
}) {
    const locale = useLocale();
    const { prompt, slots } = useMemo(() => slotsFromToolInput(rawInput), [rawInput]);
    const [drafts, setDrafts] = useState<Record<string, SlotDraft>>(() =>
        Object.fromEntries(slots.map((slot) => [slot.inputId, emptyDraft(slot)])),
    );

    const answers = slots
        .map((slot) => {
            const draft = drafts[slot.inputId] ?? emptyDraft(slot);
            const value = serializeSlotAnswer(draft);
            return value ? toAnswerPayload(slot.inputId, value) : null;
        })
        .filter((answer): answer is NonNullable<typeof answer> => answer !== null);

    const canSubmit = slots.length > 0 && answers.length === slots.length;

    return (
        <form
            className="grid gap-3 rounded-md border border-border p-3 text-sm"
            onSubmit={(event) => {
                event.preventDefault();
                if (!canSubmit) return;
                onSubmit({ status: 'answered', answers });
            }}
        >
            {prompt ? <p className="font-medium">{prompt}</p> : null}
            {slots.map((slot) => (
                <SlotControl
                    key={slot.inputId}
                    slot={slot}
                    draft={drafts[slot.inputId] ?? emptyDraft(slot)}
                    onChange={(next) => setDrafts((current) => ({ ...current, [slot.inputId]: next }))}
                />
            ))}
            <button
                type="submit"
                disabled={!canSubmit}
                className="justify-self-start rounded bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-50"
            >
                {{ de: 'Absenden', en: 'Submit' }[locale]}
            </button>
        </form>
    );
}

function SlotControl({ slot, draft, onChange }: { slot: ChatAssistantInputSlot; draft: SlotDraft; onChange: (draft: SlotDraft) => void }) {
    const fieldClass = 'w-full rounded border border-border bg-background px-2 py-1.5 text-sm';
    return (
        <label className="grid gap-1">
            <span className="text-muted-foreground">{slot.prompt}</span>
            {slot.kind === 'Date' && draft.kind === 'Date' ? (
                <input
                    className={fieldClass}
                    type="date"
                    value={draft.date ?? ''}
                    onChange={(e) => onChange({ kind: 'Date', date: e.target.value })}
                />
            ) : null}
            {slot.kind === 'DateRange' && draft.kind === 'DateRange' ? (
                <div className="flex gap-2">
                    <input
                        className={fieldClass}
                        type="date"
                        value={draft.from ?? ''}
                        onChange={(e) => onChange({ kind: 'DateRange', from: e.target.value, to: draft.to })}
                    />
                    <input
                        className={fieldClass}
                        type="date"
                        value={draft.to ?? ''}
                        onChange={(e) => onChange({ kind: 'DateRange', from: draft.from, to: e.target.value })}
                    />
                </div>
            ) : null}
            {slot.kind === 'DateTime' && draft.kind === 'DateTime' ? (
                <div className="flex gap-2">
                    <input
                        className={fieldClass}
                        type="date"
                        value={draft.dateTime?.date ?? ''}
                        onChange={(e) => onChange({ kind: 'DateTime', dateTime: { ...draft.dateTime, date: e.target.value } })}
                    />
                    <input
                        className={fieldClass}
                        type="time"
                        value={draft.dateTime?.time ?? ''}
                        onChange={(e) => onChange({ kind: 'DateTime', dateTime: { ...draft.dateTime, time: e.target.value } })}
                    />
                </div>
            ) : null}
            {slot.kind === 'Time' && draft.kind === 'Time' ? (
                <input
                    className={fieldClass}
                    type="time"
                    value={draft.time ?? ''}
                    onChange={(e) => onChange({ kind: 'Time', time: e.target.value })}
                />
            ) : null}
            {slot.kind === 'Text' && draft.kind === 'Text' ? (
                <input
                    className={fieldClass}
                    type="text"
                    value={draft.text ?? ''}
                    onChange={(e) => onChange({ kind: 'Text', text: e.target.value })}
                />
            ) : null}
            {slot.kind === 'Boolean' && draft.kind === 'Boolean' ? (
                <div className="flex gap-2">
                    <button type="button" className="rounded border px-3 py-1.5" onClick={() => onChange({ kind: 'Boolean', value: true })}>
                        Yes
                    </button>
                    <button
                        type="button"
                        className="rounded border px-3 py-1.5"
                        onClick={() => onChange({ kind: 'Boolean', value: false })}
                    >
                        No
                    </button>
                </div>
            ) : null}
            {slot.kind === 'SingleSelect' && draft.kind === 'SingleSelect' ? (
                <select
                    className={fieldClass}
                    value={draft.selected ?? ''}
                    onChange={(e) => onChange({ kind: 'SingleSelect', selected: e.target.value || undefined })}
                >
                    <option value="">—</option>
                    {slot.options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            ) : null}
            {slot.kind === 'MultiSelect' && draft.kind === 'MultiSelect' ? (
                <div className="grid gap-1">
                    {slot.options.map((option) => {
                        const selected = draft.selected?.includes(option) ?? false;
                        return (
                            <label key={option} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => {
                                        const next = new Set(draft.selected ?? []);
                                        if (selected) next.delete(option);
                                        else next.add(option);
                                        onChange({ kind: 'MultiSelect', selected: [...next] });
                                    }}
                                />
                                {option}
                            </label>
                        );
                    })}
                </div>
            ) : null}
        </label>
    );
}
