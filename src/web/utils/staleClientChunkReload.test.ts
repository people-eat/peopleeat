import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('staleClientChunkReload', () => {
    const store = new Map<string, string>();

    beforeEach(() => {
        store.clear();
        vi.resetModules();
        vi.stubGlobal('sessionStorage', {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => {
                store.set(key, value);
            },
            removeItem: (key: string) => {
                store.delete(key);
            },
        });
        vi.stubGlobal('location', { reload: vi.fn() });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reloads once then refuses a second attempt', async () => {
        const mod = await import('./staleClientChunkReload');

        expect(mod.staleClientChunkReloadAlreadyTried()).toBe(false);
        expect(mod.staleClientChunkReloadOnce()).toBe(true);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(mod.staleClientChunkReloadAlreadyTried()).toBe(true);
        expect(mod.staleClientChunkReloadOnce()).toBe(false);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    it('skips reload when sessionStorage is unavailable', async () => {
        vi.stubGlobal('sessionStorage', {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('blocked');
            },
            removeItem: () => {
                throw new Error('blocked');
            },
        });
        const mod = await import('./staleClientChunkReload');
        expect(mod.staleClientChunkReloadOnce()).toBe(false);
        expect(window.location.reload).not.toHaveBeenCalled();
    });
});
