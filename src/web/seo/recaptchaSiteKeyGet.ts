import { createIsomorphicFn } from '@tanstack/react-start';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';

// Browser reCAPTCHA v3 site key. Same isomorphic pattern as `webPageUrlGet`:
// `.server()` is stripped from the client bundle so `environmentVariables`
// does not leak. The client always returns '' — the gift-card route passes the
// server-resolved key through the loader instead of reading env in the browser.
export const recaptchaSiteKeyGet: () => string = createIsomorphicFn()
    .server(() => environmentVariables.recaptchaSiteKey)
    .client(() => '');
