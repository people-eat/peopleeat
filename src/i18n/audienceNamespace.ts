import type { I18nWebNamespace } from './namespaces';

export function i18nAudienceNamespace(audience: 'admin' | 'customer' | 'cook'): I18nWebNamespace {
    if (audience === 'admin') return 'admin';
    if (audience === 'cook') return 'profileCook';
    return 'profileCustomer';
}
