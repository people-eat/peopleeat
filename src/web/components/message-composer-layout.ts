import type { RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

type MessageComposerLayoutOptions = {
    value: string;
    hasAttachments: boolean;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
};

/** Collapsed = single-line chrome with inline attach/send. Expanded = multiline
 *  or attachments present — actions move to a block-end row. */
export function useMessageComposerLayout({ value, hasAttachments, textareaRef }: MessageComposerLayoutOptions) {
    const [isMultiline, setIsMultiline] = useState(false);
    const narrowWidthRef = useRef(0);
    const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) {
            return;
        }
        const style = getComputedStyle(textarea);

        if (!isMultiline && !hasAttachments) {
            const horizontalPadding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
            narrowWidthRef.current = textarea.offsetWidth - horizontalPadding;
        }
        if (value.includes('\n')) {
            setIsMultiline(true);
            return;
        }
        if (narrowWidthRef.current <= 0) {
            return;
        }
        if (!canvasContextRef.current) {
            canvasContextRef.current = document.createElement('canvas').getContext('2d');
        }
        const canvasContext = canvasContextRef.current;
        if (!canvasContext) {
            return;
        }
        canvasContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const wraps = canvasContext.measureText(value).width > narrowWidthRef.current;
        if (wraps !== isMultiline) {
            setIsMultiline(wraps);
        }
    }, [value, isMultiline, hasAttachments, textareaRef]);

    return isMultiline || hasAttachments;
}
