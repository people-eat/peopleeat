import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from './base/tooltip';
import { MessageComposer } from './MessageComposer';

const mocks = vi.hoisted(() => ({ isMobile: false }));

vi.mock('../hooks/use-mobile', () => ({ useIsMobile: () => mocks.isMobile }));
vi.mock('../hooks/useLocale', () => ({ useLocale: () => 'en' as const }));

afterEach(() => {
    mocks.isMobile = false;
});

const composer = (busy: boolean, submitting: boolean, onSubmit = vi.fn(), autoFocus = false) => (
    <TooltipProvider>
        <button type="button">Other control</button>
        <MessageComposer
            value="A message"
            onValueChange={vi.fn()}
            onSubmit={onSubmit}
            busy={busy}
            submitting={submitting}
            ariaLabel="Message"
            autoFocus={autoFocus}
            showDisclaimer={false}
        />
    </TooltipProvider>
);

describe('MessageComposer', () => {
    it('does not steal focus when the user interacts elsewhere during generation', () => {
        const onSubmit = vi.fn();
        const { rerender } = render(composer(false, false, onSubmit));
        const textarea = screen.getByLabelText('Message');
        textarea.focus();
        fireEvent.submit(textarea.closest('form')!);
        rerender(composer(true, false, onSubmit));

        const otherControl = screen.getByRole('button', { name: 'Other control' });
        otherControl.focus();
        rerender(composer(false, false, onSubmit));

        expect(document.activeElement).toBe(otherControl);
    });

    it('returns desktop focus without scrolling when the composer still owns the interaction', () => {
        const onSubmit = vi.fn();
        const { rerender } = render(composer(false, false, onSubmit));
        const textarea = screen.getByLabelText('Message');
        const focus = vi.spyOn(textarea, 'focus');
        textarea.focus();
        fireEvent.submit(textarea.closest('form')!);
        rerender(composer(true, false, onSubmit));
        textarea.blur();

        rerender(composer(false, false, onSubmit));

        expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
        expect(document.activeElement).toBe(textarea);
    });

    it('returns focus after the first-message submit leaves focus on the document body', () => {
        const onSubmit = vi.fn();
        const { rerender } = render(composer(false, false, onSubmit));
        const textarea = screen.getByLabelText('Message');
        const focus = vi.spyOn(textarea, 'focus');
        textarea.focus();
        textarea.blur();
        fireEvent.submit(textarea.closest('form')!);
        rerender(composer(true, false, onSubmit));
        fireEvent.focusIn(document.body);

        rerender(composer(false, false, onSubmit));

        expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
        expect(document.activeElement).toBe(textarea);
    });

    it('waits for an initially busy desktop composer before applying auto focus', () => {
        const { rerender } = render(composer(true, false, vi.fn(), true));
        const textarea = screen.getByLabelText('Message');

        rerender(composer(false, false, vi.fn(), true));

        expect(document.activeElement).toBe(textarea);
    });

    it('does not apply deferred auto focus after the user interacts elsewhere', () => {
        const { rerender } = render(composer(true, false, vi.fn(), true));
        const otherControl = screen.getByRole('button', { name: 'Other control' });
        otherControl.focus();

        rerender(composer(false, false, vi.fn(), true));

        expect(document.activeElement).toBe(otherControl);
    });

    it('shows sent after an accepted submission while generation remains busy', async () => {
        let acceptSubmission: ((accepted: boolean) => void) | undefined;
        const onSubmit = vi.fn(
            () =>
                new Promise<boolean>((resolve) => {
                    acceptSubmission = resolve;
                }),
        );
        const { rerender } = render(composer(false, false, onSubmit));
        fireEvent.submit(screen.getByLabelText('Message').closest('form')!);
        rerender(composer(true, true, onSubmit));

        await act(async () => acceptSubmission?.(true));
        rerender(composer(true, false));

        expect(screen.getByRole('button', { name: 'Sent' })).toBeTruthy();
    });

    it('does not show sent after a rejected submission', () => {
        const onSubmit = vi.fn(() => false);
        render(composer(false, false, onSubmit));

        fireEvent.submit(screen.getByLabelText('Message').closest('form')!);

        expect(screen.queryByRole('button', { name: 'Sent' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy();
    });

    it('does not reopen the mobile keyboard after generation', () => {
        mocks.isMobile = true;
        const onSubmit = vi.fn();
        const { rerender } = render(composer(false, false, onSubmit));
        const textarea = screen.getByLabelText('Message');
        const focus = vi.spyOn(textarea, 'focus');
        textarea.focus();
        fireEvent.submit(textarea.closest('form')!);
        rerender(composer(true, false, onSubmit));
        textarea.blur();
        focus.mockClear();

        rerender(composer(false, false, onSubmit));

        expect(focus).not.toHaveBeenCalled();
    });
});
