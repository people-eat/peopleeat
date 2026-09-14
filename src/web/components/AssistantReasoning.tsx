import { ChevronRightIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { AssistantMarkdown } from './AssistantMarkdown';

// Collapsed Gemini thought-summary region shown above an AI-produced chat
// message (tool call, approval, input collection, or final answer). Fed live
// by `ChatUpdateAssistantReasoningChunk` (Pro + `includeThoughts`) and
// durably by that message's `reasoning` field after the step commits. Flash
// never emits these. While `live`, the disclosure stays open so the growing
// summary is readable; once the step settles it starts collapsed with a
// chevron to expand.

export function AssistantReasoning({ text, live = false, className }: { text: string; live?: boolean; className?: string }) {
    const locale = useLocale();
    // Settled turns start collapsed; live turns stay forced open.
    const [open, setOpen] = useState(live);
    // Transitions only for user clicks — programmatic `live` sync stays instant.
    const [animate, setAnimate] = useState(false);
    const panelId = useId();

    useEffect(() => {
        setAnimate(false);
        setOpen(live);
    }, [live]);

    if (!text) return null;

    const label = live ? { de: 'Denke nach…', en: 'Thinking…' }[locale] : { de: 'Nachgedacht', en: 'Thought' }[locale];

    return (
        <div className={cn('min-w-0 text-sm text-muted-foreground', className)}>
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                disabled={live}
                onClick={() => {
                    if (live) return;
                    setAnimate(true);
                    setOpen((current) => !current);
                }}
                className={cn(
                    'flex max-w-full items-center gap-2 rounded py-0.5 text-left font-medium',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    live ? 'cursor-default' : 'cursor-pointer hover:text-foreground active:text-foreground',
                    live && 'shimmer',
                )}
            >
                <span className="truncate">{label}</span>
                {!live && (
                    <ChevronRightIcon
                        aria-hidden
                        className={cn(
                            'size-3.5 shrink-0 opacity-70 transition-transform duration-200 ease-out motion-reduce:transition-none',
                            open && 'rotate-90',
                        )}
                    />
                )}
            </button>
            <div
                id={panelId}
                className={cn(
                    'grid',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    animate && 'transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                )}
            >
                <div className="min-h-0 overflow-hidden" aria-hidden={!open} inert={!open}>
                    <div className="my-4 opacity-90">
                        <AssistantMarkdown text={text} streaming={live} className="text-xs text-muted-foreground" />
                    </div>
                </div>
            </div>
        </div>
    );
}
