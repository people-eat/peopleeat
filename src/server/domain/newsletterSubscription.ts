const newsletterSubscriptionSources = ['FOOTER', 'PROFILE', 'IMPORT'] as const;

export type NewsletterSubscriptionSource = (typeof newsletterSubscriptionSources)[number];
