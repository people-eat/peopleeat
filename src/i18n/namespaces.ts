export const I18N_WEB_NAMESPACES = ['common', 'public', 'publicBooking', 'profile', 'profileCook', 'profileCustomer', 'admin'] as const;

export type I18nWebNamespace = (typeof I18N_WEB_NAMESPACES)[number];
export const I18N_EMAIL_NAMESPACE = 'email' as const;
