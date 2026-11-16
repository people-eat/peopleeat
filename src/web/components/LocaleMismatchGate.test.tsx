import { render, screen } from '@testing-library/react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { Provider } from 'urql';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { never } from 'wonka';

import { i18nResourcesLoad } from '../../i18n/catalogCache';
import { i18nCreateSync } from '../../i18n/i18nCreate';
import { LocaleMismatchGate } from './LocaleMismatchGate';

vi.mock('../hooks/useLocale', () => ({ useLocale: () => 'en' as const }));
vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/en', searchStr: '', hash: '' }),
}));

const urqlClient = {
    executeMutation: () => never,
    executeQuery: () => never,
    executeSubscription: () => never,
} as never;

let i18n: ReturnType<typeof i18nCreateSync>;

beforeAll(async () => {
    await i18nResourcesLoad('en', ['common']);
    i18n = i18nCreateSync('en', ['common']);
    void i18n.use(initReactI18next);
});

describe('LocaleMismatchGate', () => {
    it('renders catalog copy instead of raw keys', () => {
        render(
            <I18nextProvider i18n={i18n}>
                <Provider value={urqlClient}>
                    <LocaleMismatchGate open profileLocale="de" onResolved={vi.fn()} />
                </Provider>
            </I18nextProvider>,
        );

        expect(screen.getByText('Language does not match')).toBeTruthy();
        expect(screen.getByText('Yes, change profile language')).toBeTruthy();
        expect(screen.getByText('No, keep profile language')).toBeTruthy();
        expect(screen.queryByText('localeMismatch.title')).toBeNull();
    });
});
