import type { ChangeEvent, ClipboardEvent, DragEvent } from 'react';
import { useRef, useState } from 'react';

type MessageComposerFileIntakeOptions = {
    enabled: boolean;
    multiple: boolean;
    onAdd: ((files: File[]) => void) | undefined;
    value: string;
    onValueChange: (value: string) => void;
};

const isFileDrag = (event: DragEvent) => event.dataTransfer.types.includes('Files');

export function useMessageComposerFileIntake({ enabled, multiple, onAdd, value, onValueChange }: MessageComposerFileIntakeOptions) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const dragDepthRef = useRef(0);

    const accept = (incoming: FileList | File[]) => {
        if (!enabled || !onAdd) {
            return;
        }
        const next = [...incoming];
        if (next.length > 0) {
            onAdd(multiple ? next : next.slice(0, 1));
        }
    };

    const onDragEnter = (event: DragEvent<HTMLFormElement>) => {
        if (enabled && isFileDrag(event)) {
            event.preventDefault();
            dragDepthRef.current += 1;
            setIsDragOver(true);
        }
    };

    const onDragOver = (event: DragEvent<HTMLFormElement>) => {
        if (enabled && isFileDrag(event)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        }
    };

    const onDragLeave = () => {
        if (enabled) {
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            setIsDragOver(dragDepthRef.current > 0);
        }
    };

    const onDrop = (event: DragEvent<HTMLFormElement>) => {
        if (enabled && isFileDrag(event)) {
            event.preventDefault();
            dragDepthRef.current = 0;
            setIsDragOver(false);
            accept(event.dataTransfer.files);
        }
    };

    const onPickerChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { target } = event;
        if (target.files) {
            accept(target.files);
        }
        target.value = '';
    };

    const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
        if (!enabled || event.clipboardData.files.length === 0) {
            return;
        }
        event.preventDefault();
        accept(event.clipboardData.files);

        const text = event.clipboardData.getData('text/plain');
        if (!text) {
            return;
        }
        const textarea = event.currentTarget;
        const start = textarea.selectionStart;
        const nextCaret = start + text.length;
        onValueChange(value.slice(0, start) + text + value.slice(textarea.selectionEnd));
        requestAnimationFrame(() => textarea.setSelectionRange(nextCaret, nextCaret));
    };

    return {
        fileInputRef,
        isDragOver,
        formHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
        onPickerChange,
        onPaste,
        openPicker: () => fileInputRef.current?.click(),
    };
}
