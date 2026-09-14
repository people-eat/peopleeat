import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CookProfileTag, cookProfileTagLabels, CookProfileTags } from './CookProfileTags';

describe('cookProfileTagLabels', () => {
    it('returns trimmed cuisine and philosophy in order', () => {
        expect(
            cookProfileTagLabels({
                cuisineStyle: '  Italienisch  ',
                cookingPhilosophy: 'Saisonal',
            }),
        ).toEqual(['Italienisch', 'Saisonal']);
    });

    it('drops null, empty, and whitespace-only values', () => {
        expect(
            cookProfileTagLabels({
                cuisineStyle: null,
                cookingPhilosophy: '   ',
            }),
        ).toEqual([]);
        expect(cookProfileTagLabels({})).toEqual([]);
    });
});

describe('CookProfileTags', () => {
    it('renders nothing when both fields are empty', () => {
        const { container } = render(<CookProfileTags cuisineStyle={null} cookingPhilosophy="" />);
        expect(container.firstChild).toBeNull();
    });

    it('renders cuisine and philosophy as pills', () => {
        render(<CookProfileTags cuisineStyle="Mediterran" cookingPhilosophy="Farm-to-Table" />);
        const list = screen.getByRole('list');
        expect(list.dataset.slot).toBe('cook-profile-tags');
        expect(screen.getByText('Mediterran')).toBeTruthy();
        expect(screen.getByText('Farm-to-Table')).toBeTruthy();
    });

    it('applies the md size to the list and pills', () => {
        render(<CookProfileTags cuisineStyle="Fusion" size="md" />);
        const list = screen.getByRole('list');
        expect(list.dataset.size).toBe('md');
        expect(screen.getByText('Fusion').closest('[data-slot="cook-profile-tag"]')?.getAttribute('data-size')).toBe('md');
    });
});

describe('CookProfileTag', () => {
    it('renders a single muted pill', () => {
        render(<CookProfileTag>Nordisch</CookProfileTag>);
        const pill = screen.getByText('Nordisch').closest('[data-slot="cook-profile-tag"]');
        expect(pill).not.toBeNull();
        expect(pill?.className).toContain('bg-muted');
    });
});
