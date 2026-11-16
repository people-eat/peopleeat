import { useTranslation } from 'react-i18next';

import type { I18nWebNamespace } from '../../i18n/namespaces';

export function useT<Ns extends I18nWebNamespace>(ns: Ns) {
    return useTranslation(ns);
}
