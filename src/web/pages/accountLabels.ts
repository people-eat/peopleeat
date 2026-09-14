// Thin bilingual labels for account chrome. Sidebars/breadcrumbs must import
// from here — never from `AccountPage` — so the account page module (cropper,
// passkeys, mutations) stays out of unrelated shells.

export const accountPageTitle = { de: 'Konto', en: 'Account' } as const;
export const accountPageDescription = {
    de: 'Kontoeinstellungen, Sicherheit und angemeldete Geräte.',
    en: 'Account settings, security, and signed-in devices.',
} as const;
