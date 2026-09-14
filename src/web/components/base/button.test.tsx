import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
    it('renders children inside a native <button> by default', () => {
        // Arrange — nothing

        // Act
        render(<Button>Click me</Button>);

        // Assert
        const button = screen.getByRole('button', { name: 'Click me' });
        expect(button.tagName).toBe('BUTTON');
        expect(button.dataset.slot).toBe('button');
        expect(button.dataset.variant).toBe('default');
        expect(button.dataset.size).toBe('default');
    });

    it('reflects the variant and size props on data attributes', () => {
        // Arrange — nothing

        // Act
        render(
            <Button variant="destructive" size="lg">
                Delete
            </Button>,
        );

        // Assert
        const button = screen.getByRole('button', { name: 'Delete' });
        expect(button.dataset.variant).toBe('destructive');
        expect(button.dataset.size).toBe('lg');
    });

    it('forwards click events to the onClick handler', () => {
        // Arrange
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Submit</Button>);
        const button = screen.getByRole('button', { name: 'Submit' });

        // Act
        button.click();

        // Assert
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('includes pressed (active) styles for every variant', () => {
        // Arrange
        const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;

        for (const variant of variants) {
            // Act
            const { unmount } = render(<Button variant={variant}>{variant}</Button>);
            const button = screen.getByRole('button', { name: variant });

            // Assert — motion.md: every clickable element ships with an active: pressed state
            expect(button.className).toMatch(/active:/);

            unmount();
        }
    });

    it('darkens filled primary and destructive presses with brightness, not opacity alone', () => {
        for (const variant of ['default', 'destructive'] as const) {
            const { unmount } = render(<Button variant={variant}>{variant}</Button>);
            const button = screen.getByRole('button', { name: variant });

            expect(button.className).toMatch(/active:brightness-\[0\.8\]/);

            unmount();
        }
    });

    it('presses the link variant with a rounded background wash', () => {
        render(<Button variant="link">link</Button>);
        const button = screen.getByRole('button', { name: 'link' });

        expect(button.className).toMatch(/rounded-md/);
        expect(button.className).toMatch(/active:bg-foreground\/10/);
    });

    it('renders the child element instead of a <button> when asChild is set', () => {
        // Arrange — nothing

        // Act
        render(
            <Button asChild>
                <a href="/somewhere">Go</a>
            </Button>,
        );

        // Assert — the rendered element is the anchor, with Button's classes merged onto it
        const link = screen.getByRole('link', { name: 'Go' });
        expect(link.tagName).toBe('A');
        expect(link.getAttribute('href')).toBe('/somewhere');
        expect(link.dataset.slot).toBe('button');
    });
});
