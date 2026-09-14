import { Streamdown } from 'streamdown';

import { cn } from '../utils/cn';

const markdownControls = {
    table: { copy: false, download: false, fullscreen: false },
    code: { copy: true, download: false },
    mermaid: { download: false, copy: false, fullscreen: false, panZoom: false },
} as const;

// Authored body (legal pages, CMS sections, admin preview) — not model output.
// Streamdown's default `linkSafety` interstitial is for untrusted assistant
// links; turn it off so public legal and other static markdown open hrefs
// directly. Chat/assistant surfaces use `AssistantMarkdown` instead.
const linkSafety = { enabled: false } as const;

// Static markdown for non-chat surfaces. Fenced code renders as plain
// `<pre><code>` — no syntax highlighter.
export function MarkdownBody({ text, className }: { text: string; className?: string }) {
    return (
        <Streamdown
            mode="static"
            controls={markdownControls}
            linkSafety={linkSafety}
            parseIncompleteMarkdown={false}
            className={cn(
                'text-base/relaxed wrap-break-word *:first:mt-0 *:last:mb-0',
                '[&_ul]:list-outside [&_ol]:list-outside [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:pl-1',
                '[&_h1]:font-serif [&_h1]:text-3xl [&_h2]:font-serif [&_h2]:text-2xl [&_h3]:text-xl',
                '[&_a]:underline [&_a]:underline-offset-4',
                className,
            )}
        >
            {text}
        </Streamdown>
    );
}
