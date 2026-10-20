import { format, parseISO } from 'date-fns';
import { BracesIcon, CheckIcon, CopyIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { Button } from '../base/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../base/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../base/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '../base/tooltip';

// Bits shared across the chat-message variants. Kept variant-agnostic — anything
// specific to a single message type lives next to that variant's view file.

interface MessageRowProps extends PropsWithChildren {
    /** `milestone` = centered offer-domain timeline pills; `system` = left tool/approval rail. */
    side: 'user' | 'assistant' | 'system' | 'milestone';
}

export function MessageRow({ side, children }: MessageRowProps) {
    return (
        <div
            data-slot="chat-message-row"
            data-side={side}
            className={cn(
                'flex w-full gap-3',
                side === 'user' && 'justify-end',
                side === 'system' && 'justify-start',
                side === 'milestone' && 'justify-center',
            )}
        >
            {children}
        </div>
    );
}

interface BubbleProps extends PropsWithChildren {
    tone: 'user' | 'assistant';
    /** Cut the corner toward the speaker (default). Pass false for mid-streak
     *  peer bubbles that sit above a later avatar-bearing row. */
    tail?: boolean;
    className?: string;
}

export function Bubble({ tone, tail = true, className, children }: BubbleProps) {
    return (
        <div
            data-slot="chat-message-bubble"
            data-tone={tone}
            className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2 text-sm/relaxed shadow-sm',
                tone === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                tail && (tone === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'),
                className,
            )}
        >
            {children}
        </div>
    );
}

export function Timestamp({ iso, className }: { iso: string; className?: string }) {
    return (
        <time dateTime={iso} className={cn('mt-1 block text-[11px] opacity-70', className)}>
            {format(parseISO(iso), 'HH:mm')}
        </time>
    );
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
    const locale = useLocale();
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleLabel = label ?? { de: 'Nachricht kopieren', en: 'Copy message' }[locale];
    const ariaLabel = copied ? { de: 'Kopiert', en: 'Copied' }[locale] : idleLabel;
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);
    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success({ de: 'In die Zwischenablage kopiert', en: 'Copied to clipboard' }[locale]);
        } catch {
            toast.error({ de: 'Kopieren in die Zwischenablage fehlgeschlagen', en: 'Could not copy to clipboard' }[locale]);
        }
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
    }, [text, locale]);
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={ariaLabel}
                    onClick={onCopy}
                    className="opacity-70 hover:opacity-100"
                >
                    {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{ariaLabel}</TooltipContent>
        </Tooltip>
    );
}

function formatToolDebugJson(value: unknown): string {
    if (value === undefined) return '';
    try {
        return JSON.stringify(value, null, 2) ?? 'null';
    } catch {
        return String(value);
    }
}

/** Hover-revealed inspector for tool input/output JSON (never inline in the row). */
export function ToolArgumentsButton({
    toolLabel,
    input,
    output,
    errorText,
}: {
    toolLabel: string;
    input: unknown;
    output: unknown;
    errorText?: string | null;
}) {
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const inputText = formatToolDebugJson(input);
    const outputText = errorText != null && errorText.length > 0 ? formatToolDebugJson({ errorText, output }) : formatToolDebugJson(output);
    const hasOutput = outputText.length > 0;
    const argsLabel = { de: 'Argumente anzeigen', en: 'Show arguments' }[locale];
    const dialogTitle = { de: 'Werkzeug-Argumente', en: 'Tool arguments' }[locale];
    const inputTab = { de: 'Eingabe', en: 'Input' }[locale];
    const outputTab = { de: 'Ausgabe', en: 'Output' }[locale];
    const emptyOutput = { de: 'Noch keine Ausgabe.', en: 'No output yet.' }[locale];
    const emptyInput = { de: 'Keine Eingabe.', en: 'No input.' }[locale];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={argsLabel}
                        onClick={() => setOpen(true)}
                        className={cn(
                            'shrink-0 text-muted-foreground transition-opacity',
                            'opacity-100 [@media(hover:hover)]:opacity-0',
                            '[@media(hover:hover)]:group-hover/tool-row:opacity-100',
                            '[@media(hover:hover)]:group-focus-within/tool-row:opacity-100',
                            open && '[@media(hover:hover)]:opacity-100',
                        )}
                    >
                        <BracesIcon aria-hidden />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{argsLabel}</TooltipContent>
            </Tooltip>
            <DialogContent className="flex max-h-[min(85vh,40rem)] flex-col gap-3 sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="pr-8">
                        {dialogTitle}
                        <span className="mt-1 block truncate text-sm font-normal text-muted-foreground">{toolLabel}</span>
                    </DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="input" className="min-h-0 flex-1">
                    <TabsList aria-label={dialogTitle}>
                        <TabsTrigger value="input">{inputTab}</TabsTrigger>
                        <TabsTrigger value="output">{outputTab}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="input" className="min-h-0">
                        <ToolDebugPane text={inputText.length > 0 ? inputText : emptyInput} copyDisabled={inputText.length === 0} />
                    </TabsContent>
                    <TabsContent value="output" className="min-h-0">
                        <ToolDebugPane text={hasOutput ? outputText : emptyOutput} copyDisabled={!hasOutput} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

function ToolDebugPane({ text, copyDisabled }: { text: string; copyDisabled: boolean }) {
    const locale = useLocale();
    return (
        <div className="relative min-h-0">
            <div className="absolute top-2 right-2 z-10">
                {copyDisabled ? null : <CopyButton text={text} label={{ de: 'JSON kopieren', en: 'Copy JSON' }[locale]} />}
            </div>
            <pre className="max-h-[min(50vh,24rem)] overflow-auto rounded-md border border-border/60 bg-muted/40 p-3 pr-10 text-xs/relaxed whitespace-pre-wrap break-all text-foreground">
                {text}
            </pre>
        </div>
    );
}
