export const authOauthProviders = ['GOOGLE', 'FACEBOOK'] as const;
export type AuthOauthProvider = (typeof authOauthProviders)[number];

export const authOauthSignInFailReasons = [
    'denied',
    'unverified_email',
    'anonymized',
    'conflict',
    'toggle_off',
    'invalid_state',
    'token',
] as const;
export type AuthOauthSignInFailReason = (typeof authOauthSignInFailReasons)[number];
