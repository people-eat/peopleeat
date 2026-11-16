import { describe, expect, it } from 'vitest';

import { i18nResourcesLoad } from './catalogCache';
import { t, tAsync } from './t';

describe('t', () => {
    it('returns German copy for the source locale', async () => {
        await i18nResourcesLoad('de', ['common', 'public']);
        expect(t('de', 'public', 'logOn.title')).toBe('Anmelden');
        expect(t('de', 'common', 'close')).toBe('Schließen');
    });

    it('returns English copy for en', async () => {
        expect(await tAsync('en', 'public', 'logOn.title')).toBe('Log on');
    });

    it('returns French copy for a complete fr catalog', async () => {
        await i18nResourcesLoad('fr', ['common', 'profile']);
        expect(t('fr', 'profile', 'account.title')).toBe('Compte');
    });

    it('interpolates ICU arguments', async () => {
        await i18nResourcesLoad('de', ['common']);
        expect(t('de', 'common', 'costBreakdown.promoCode', { code: 'SAVE10' })).toBe('Promocode SAVE10');
    });
});
