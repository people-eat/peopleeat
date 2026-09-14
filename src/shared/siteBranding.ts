// Site-wide branding and external profile URLs. Shared by web chrome (via
// `seoConstants` re-exports) and transactional email (absolute asset URLs).
// Update once here so header, footer, JSON-LD, and React Email stay aligned.

export const SITE_NAME = 'peopleeat';

// Wordmark used in chrome, Organization JSON-LD, and email headers. Density
// variants live next to the 1× file under `public/logo/`.
export const SITE_LOGO = '/logo/peopleeat.png' as const;
export const SITE_LOGO_SRC_SET =
    '/logo/peopleeat.png 1x, /logo/peopleeat@2x.png 2x, /logo/peopleeat@3x.png 3x, /logo/peopleeat@4x.png 4x' as const;

// Intrinsic display size used by header / footer / email (matches CSS `h-7`).
export const SITE_LOGO_DISPLAY = { width: 140, height: 29 } as const;

// External contact / social profiles linked from site chrome and email.
export const SITE_CONTACT_EMAIL = 'contact@people-eat.com' as const;
export const SITE_WHATSAPP_URL = 'https://wa.me/message/5ADGYOIYNW2JO1' as const;
export const SITE_GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/t7nk5wcMstwupC5p8' as const;
export const SITE_INSTAGRAM_URL = 'https://www.instagram.com/peopleeat_official' as const;
export const SITE_FACEBOOK_URL = 'https://www.facebook.com/peopleeatsharing' as const;
export const SITE_LINKEDIN_URL = 'https://www.linkedin.com/company/peopleeat' as const;

// Footer Instagram mark for transactional email (`public/email/`).
export const SITE_EMAIL_INSTAGRAM_ICON = '/email/instagram.png' as const;
export const SITE_EMAIL_INSTAGRAM_ICON_DISPLAY = { width: 24, height: 24 } as const;

// Offer-chat “new message” hero for transactional email (`public/email/`).
export const SITE_EMAIL_NEW_MESSAGE_ICON = '/email/new-message.png' as const;
export const SITE_EMAIL_NEW_MESSAGE_ICON_DISPLAY = { width: 131, height: 126 } as const;
