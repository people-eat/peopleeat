import type { ParseKeys } from 'i18next';

import type { I18nWebNamespace } from './namespaces';

/**
 * Escape hatch for open-ended runtime catalog keys (queued job names, gift-card
 * occasions, …) that cannot be enumerated as a finite union. Prefer
 * `satisfies Record<Union, ParseKeys<Ns>>` / exact literals everywhere else.
 */
export function catalogKey<Ns extends I18nWebNamespace>(_ns: Ns, key: string): ParseKeys<Ns> {
    return key as ParseKeys<Ns>;
}
