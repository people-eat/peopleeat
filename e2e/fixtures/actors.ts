import type { Browser, BrowserContext, Page } from '@playwright/test';

import { e2eEnv } from '../env';
import type { SeededActor } from './db';
import { seedAnonymousSession } from './db';

export type Actor = SeededActor & {
    context: BrowserContext;
    page: Page;
};

export type AnonymousActor = {
    sessionId: string;
    context: BrowserContext;
    page: Page;
};

async function contextWithSessionCookie(browser: Browser, sessionId: string): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext({
        baseURL: e2eEnv.webPageUrl,
    });
    await context.addCookies([
        {
            name: e2eEnv.sessionCookieName,
            value: sessionId,
            url: e2eEnv.webPageUrl,
            httpOnly: true,
            sameSite: 'Lax',
            secure: false,
        },
    ]);
    const page = await context.newPage();
    return { context, page };
}

export async function actorCreate(browser: Browser, seeded: SeededActor): Promise<Actor> {
    const { context, page } = await contextWithSessionCookie(browser, seeded.sessionId);
    return { ...seeded, context, page };
}

/** Cold browser session (no user) with cookie consent already recorded. */
export async function actorCreateAnonymous(browser: Browser): Promise<AnonymousActor> {
    const { sessionId } = await seedAnonymousSession();
    const { context, page } = await contextWithSessionCookie(browser, sessionId);
    return { sessionId, context, page };
}

export async function actorClose(actor: { context: BrowserContext }): Promise<void> {
    await actor.context.close();
}
