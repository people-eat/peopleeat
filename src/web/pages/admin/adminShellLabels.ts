// Thin bilingual labels for admin chrome. Profile sidebars must import from
// here — never from `AdminLayout` — so the admin assistant (Streamdown)
// stays out of cook/customer profile bundles.

export const adminPageTitle = { de: 'Admin', en: 'Admin' } as const;
export const adminPageDescription = {
    de: 'Administrationsbereich.',
    en: 'Administration area.',
} as const;
