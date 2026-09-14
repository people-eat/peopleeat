import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatTimeValue, parseTimeValue, TimePicker } from './time-picker';

describe('parseTimeValue / formatTimeValue', () => {
    it('parses valid HH:mm values', () => {
        expect(parseTimeValue('08:15')).toEqual({ hours: 8, minutes: 15 });
        expect(parseTimeValue('23:45')).toEqual({ hours: 23, minutes: 45 });
    });

    it('rejects invalid values', () => {
        expect(parseTimeValue(undefined)).toBeUndefined();
        expect(parseTimeValue('')).toBeUndefined();
        expect(parseTimeValue('8:15')).toBeUndefined();
        expect(parseTimeValue('24:00')).toBeUndefined();
        expect(parseTimeValue('12:60')).toBeUndefined();
    });

    it('formats hours and minutes as HH:mm', () => {
        expect(formatTimeValue(8, 0)).toBe('08:00');
        expect(formatTimeValue(19, 45)).toBe('19:45');
    });
});

describe('TimePicker', () => {
    it('renders a native time input for small viewports', () => {
        render(<TimePicker value="19:30" hourAriaLabel="Hour" minuteAriaLabel="Minute" aria-label="Time" onValueChange={vi.fn()} />);

        const input = screen.getByLabelText('Time');
        expect(input.getAttribute('type')).toBe('time');
        expect(input).toBeInstanceOf(HTMLInputElement);
        if (!(input instanceof HTMLInputElement)) throw new Error('expected input');
        expect(input.value).toBe('19:30');
        expect(input.className).toMatch(/md:hidden/);
    });

    it('emits HH:mm when the native time input changes', () => {
        const onValueChange = vi.fn();
        render(<TimePicker value="19:30" hourAriaLabel="Hour" minuteAriaLabel="Minute" aria-label="Time" onValueChange={onValueChange} />);

        fireEvent.change(screen.getByLabelText('Time'), { target: { value: '20:15' } });
        expect(onValueChange).toHaveBeenCalledWith('20:15');
    });

    it('exposes desktop hour and minute selects with the current value', () => {
        render(
            <TimePicker
                value="19:07"
                hourOptions={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]}
                minuteOptions={[0, 15, 30, 45]}
                hourAriaLabel="Hour"
                minuteAriaLabel="Minute"
                aria-label="Time"
                onValueChange={vi.fn()}
            />,
        );

        expect(screen.getByRole('combobox', { name: 'Hour' }).textContent).toContain('19');
        expect(screen.getByRole('combobox', { name: 'Minute' }).textContent).toContain('07');
    });
});
