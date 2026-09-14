import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';

import { db } from '../../../server/db';
import { bookingRequestOfferCallRecordings } from '../../../server/db/schema';
import { environmentVariables } from '../../../server/env/environmentVariablesCreate';
import { objectStorageCreate } from '../../../server/objectStorage/objectStorageCreate';
import { clientIpFromRequest } from '../../../server/utils/clientIpFromRequest';
import { userIsAdmin } from '../../../server/utils/fileUploadContentAccess';
import { loggerCreate } from '../../../server/utils/loggerCreate';
import { sessionUpsert } from '../../../server/utils/sessionUpsert';
import { sessionUtils } from '../../../server/utils/sessionUtils';

const log = loggerCreate(db);

const objectStorage = objectStorageCreate({
    bucket: environmentVariables.objectStorageS3Bucket,
    endpoint: environmentVariables.objectStorageS3Endpoint,
    region: environmentVariables.objectStorageS3Region,
    accessKeyId: environmentVariables.objectStorageS3AccessKeyId,
    secretAccessKey: environmentVariables.objectStorageS3SecretAccessKey,
    forcePathStyle: environmentVariables.objectStorageS3ForcePathStyle,
});

// GET /api/admin/call-recordings/:recordingId/audio — streams call audio from
// Garage for signed-in admins. See docs/features/call-recordings.md.
export const Route = createFileRoute('/api/admin/call-recordings_/$recordingId/audio')({
    server: {
        handlers: {
            GET: async ({ request, params }) => {
                const existingSessionId = sessionUtils.getSessionIdFromRequest(environmentVariables.sessionCookie, request);
                const session = await sessionUpsert(
                    db,
                    log,
                    existingSessionId,
                    request.headers.get('user-agent'),
                    clientIpFromRequest(request),
                    request.headers.get('referer'),
                    request.headers.get('x-landing-path'),
                );
                const setCookie = sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, session);

                if (!session.userId || !(await userIsAdmin(db, session.userId))) {
                    return new Response('Forbidden', {
                        status: 403,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }

                if (!objectStorage.isConfigured()) {
                    return new Response('Not configured', {
                        status: 503,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }

                const [recording] = await db
                    .select()
                    .from(bookingRequestOfferCallRecordings)
                    .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, params.recordingId))
                    .limit(1);

                if (!recording) {
                    return new Response('Not found', {
                        status: 404,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }

                try {
                    const object = await objectStorage.getObject(recording.objectKey);
                    return new Response(new Uint8Array(object.body), {
                        status: 200,
                        headers: {
                            'Set-Cookie': setCookie,
                            'Content-Type': object.contentType ?? recording.mediaType ?? 'audio/ogg',
                            'Content-Length': String(object.body.byteLength),
                            'Cache-Control': 'private, no-store',
                        },
                    });
                } catch (error) {
                    log.error(error, session);
                    return new Response('Not found', {
                        status: 404,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }
            },
        },
    },
});
