import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { blogPosts, cities, cooks, occasions, sessionEvents, sessions } from '../db/schema';
import { commandSetup, partnerVenueInsert, testDb } from '../test/commandTestUtils';
import { sessionWebPageVisitCreate } from './sessionWebPageVisitCreate';

describe('sessionWebPageVisitCreate', () => {
    it('inserts a WEB_PAGE_VISITED event for the current session', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const result = await sessionWebPageVisitCreate(
            {
                input: {
                    webPageKey: 'LANDING',
                    path: '/',
                    cityId: null,
                    cookId: null,
                    blogPostId: null,
                    partnerVenueId: null,
                    occasionId: null,
                    bookingRequestId: null,
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, result.referenceId!));
        expect(row).toMatchObject({
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'LANDING', path: '/' },
        });
    });

    it('soft-succeeds when the session is terminated', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        await testDb.update(sessions).set({ wasTerminatedAt: new Date() }).where(eq(sessions.sessionId, requestingSession.sessionId));

        // Act
        const result = await sessionWebPageVisitCreate(
            {
                input: {
                    webPageKey: 'LANDING',
                    path: '/',
                    cityId: null,
                    cookId: null,
                    blogPostId: null,
                    partnerVenueId: null,
                    occasionId: null,
                    bookingRequestId: null,
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: null });
        const rows = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, requestingSession.sessionId));
        expect(rows).toHaveLength(0);
    });

    it('resolves a chef slug to the stable cookId', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const pathName = `chef-${user.userId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(cooks).values({
            cookId: user.userId,
            pathName,
            isVisible: true,
            isApprovedByAdmin: true,
        });

        const result = await sessionWebPageVisitCreate(
            {
                input: {
                    webPageKey: 'CHEFS',
                    path: `/chefs/${pathName}`,
                    cityId: null,
                    cookId: pathName,
                    blogPostId: null,
                    partnerVenueId: null,
                    occasionId: null,
                    bookingRequestId: null,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, result.referenceId!));
        expect(row?.payload).toMatchObject({
            webPageKey: 'CHEFS',
            path: `/chefs/${pathName}`,
            params: { cookId: user.userId },
        });
    });

    it('resolves city, venue, occasion, and blog slugs to stable ids', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const cityId = idCreate();
        const cityPath = `city-${cityId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(cities).values({
            cityId,
            pathName: cityPath,
            nameDe: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        const venue = await partnerVenueInsert({ name: 'Loft' });
        const occasionId = idCreate();
        const occasionPath = `occasion-${occasionId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(occasions).values({
            occasionId,
            pathName: occasionPath,
            name: 'Geburtstag',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        const blogPostId = idCreate();
        const blogPath = `post-${blogPostId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(blogPosts).values({
            blogPostId,
            pathName: blogPath,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });

        const cityResult = await sessionWebPageVisitCreate(
            {
                input: {
                    webPageKey: 'CITIES',
                    path: `/cities/${cityPath}`,
                    cityId: cityPath,
                    cookId: null,
                    blogPostId: null,
                    partnerVenueId: null,
                    occasionId: null,
                    bookingRequestId: null,
                },
            },
            requestingSession,
            serverRuntime,
        );
        const venueResult = await sessionWebPageVisitCreate(
            {
                input: {
                    webPageKey: 'VENUES',
                    path: `/venues/${venue.pathName}`,
                    cityId: null,
                    cookId: null,
                    blogPostId: null,
                    partnerVenueId: venue.pathName,
                    occasionId: null,
                    bookingRequestId: null,
                },
            },
            requestingSession,
            serverRuntime,
        );
        const occasionResult = await sessionWebPageVisitCreate(
            {
                input: {
                    webPageKey: 'OCCASIONS',
                    path: `/occasions/${occasionPath}`,
                    cityId: null,
                    cookId: null,
                    blogPostId: null,
                    partnerVenueId: null,
                    occasionId: occasionPath,
                    bookingRequestId: null,
                },
            },
            requestingSession,
            serverRuntime,
        );
        const blogResult = await sessionWebPageVisitCreate(
            {
                input: {
                    webPageKey: 'BLOG_POSTS',
                    path: `/blog-posts/${blogPath}`,
                    cityId: null,
                    cookId: null,
                    blogPostId: blogPath,
                    partnerVenueId: null,
                    occasionId: null,
                    bookingRequestId: null,
                },
            },
            requestingSession,
            serverRuntime,
        );

        const [cityRow] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, cityResult.referenceId!));
        const [venueRow] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, venueResult.referenceId!));
        const [occasionRow] = await testDb
            .select()
            .from(sessionEvents)
            .where(eq(sessionEvents.sessionEventId, occasionResult.referenceId!));
        const [blogRow] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, blogResult.referenceId!));
        expect(cityRow?.payload).toMatchObject({ params: { cityId } });
        expect(venueRow?.payload).toMatchObject({ params: { partnerVenueId: venue.partnerVenueId } });
        expect(occasionRow?.payload).toMatchObject({ params: { occasionId } });
        expect(blogRow?.payload).toMatchObject({ params: { blogPostId } });
    });
});
