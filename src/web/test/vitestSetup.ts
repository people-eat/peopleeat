import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement `window.scrollTo` and logs "Not implemented" when
// a dependency (or future UI code) calls it during a test. Stub it so the
// suite stays quiet without changing scroll behavior under test.
Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });

// `@testing-library/react` mounts every render into `document.body`. Without
// an explicit unmount the DOM accumulates across tests in the same file and
// queries return stale matches. `cleanup()` unmounts everything React
// rendered during the test and restores `document.body` to a blank slate.
afterEach(() => {
    cleanup();
});
