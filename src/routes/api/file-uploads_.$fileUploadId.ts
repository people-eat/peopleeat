import { createFileRoute } from '@tanstack/react-router';
import { db } from '../../server/db';
import { fileUploadLoad } from '../../server/db/fileUploadLoad';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import { clientIpFromRequest } from '../../server/utils/clientIpFromRequest';
import {
    fileUploadAccessibleViaOfferChat,
    fileUploadAccessibleViaSupportRequest,
    fileUploadReferencedAsCookLogo,
    fileUploadReferencedAsProfilePicture,
    fileUploadReferencedByAnyContent,
    fileUploadReferencedByAnyMeal,
    fileUploadReferencedByAnyTestimonial,
    fileUploadReferencedByGiftCardPdf,
    fileUploadReferencedByOutboundEmailAttachment,
    fileUploadReferencedByPublishedContent,
    fileUploadReferencedByPublishedMeal,
    fileUploadReferencedByPublishedTestimonial,
    fileUploadReferencedByWhatsAppAttachment,
    userIsAdmin,
} from '../../server/utils/fileUploadContentAccess';
import { loggerCreate } from '../../server/utils/loggerCreate';
import { sessionUpsert } from '../../server/utils/sessionUpsert';
import { sessionUtils } from '../../server/utils/sessionUtils';

const log = loggerCreate(db);

// GET /api/file-uploads/:fileUploadId — streams the persisted bytes back with
// the original media type. Authorization:
//   1. owner of the upload
//   2. referenced as any user's current profile picture (public)
//   3. referenced as any cook's current logo (public)
//   4. referenced by a published city/partner/blog hero or section image
//   5. referenced by a published, non-deleted cook meal image
//   6. referenced by a published customer/cook testimonial `imageUrls` entry (public)
//   7. signed-in peer on an offer / support chat that attaches the upload
//   8. signed-in admin + referenced by any draft/published content page or any meal
//   9. signed-in admin + referenced by any customer/cook testimonial `imageUrls`
//  10. signed-in admin + gift-card receipt/voucher PDF or outbound-email attachment
//
// Same-origin only — `FileUpload.url` resolves to a server-rooted path,
// so the browser sends the session cookie automatically with any `<img>` /
// `<a>` request. No CORS, no signed URLs.
export const Route = createFileRoute('/api/file-uploads_/$fileUploadId')({
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

                const fileUpload = await fileUploadLoad(db, params.fileUploadId);
                if (!fileUpload) {
                    return new Response('Not found', {
                        status: 404,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }

                const isOwner = Boolean(session.userId && fileUpload.userId === session.userId);
                let allowed = isOwner;
                let isPublicCachedAsset = false;
                let isChatPeerAccess = false;
                if (!allowed) {
                    isPublicCachedAsset = await fileUploadReferencedAsProfilePicture(db, fileUpload.fileUploadId);
                    allowed = isPublicCachedAsset;
                }
                if (!allowed) {
                    isPublicCachedAsset = await fileUploadReferencedAsCookLogo(db, fileUpload.fileUploadId);
                    allowed = isPublicCachedAsset;
                }
                if (!allowed) {
                    allowed = await fileUploadReferencedByPublishedContent(db, fileUpload.fileUploadId);
                }
                if (!allowed) {
                    allowed = await fileUploadReferencedByPublishedMeal(db, fileUpload.fileUploadId);
                }
                if (!allowed) {
                    allowed = await fileUploadReferencedByPublishedTestimonial(db, fileUpload.fileUploadId);
                }
                if (!allowed && session.userId) {
                    isChatPeerAccess =
                        (await fileUploadAccessibleViaOfferChat(db, fileUpload.fileUploadId, session.userId)) ||
                        (await fileUploadAccessibleViaSupportRequest(db, fileUpload.fileUploadId, session.userId));
                    allowed = isChatPeerAccess;
                }
                if (!allowed && session.userId) {
                    const admin = await userIsAdmin(db, session.userId);
                    if (admin) {
                        allowed =
                            (await fileUploadReferencedByAnyContent(db, fileUpload.fileUploadId)) ||
                            (await fileUploadReferencedByAnyMeal(db, fileUpload.fileUploadId)) ||
                            (await fileUploadReferencedByAnyTestimonial(db, fileUpload.fileUploadId)) ||
                            (await fileUploadReferencedByGiftCardPdf(db, fileUpload.fileUploadId)) ||
                            (await fileUploadReferencedByOutboundEmailAttachment(db, fileUpload.fileUploadId)) ||
                            (await fileUploadReferencedByWhatsAppAttachment(db, fileUpload.fileUploadId));
                    }
                }

                if (!allowed) {
                    return new Response('Not found', {
                        status: 404,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }

                const safeFilename = fileUpload.filename.replace(/"/g, '');
                const body = new ArrayBuffer(fileUpload.bytes.byteLength);
                new Uint8Array(body).set(fileUpload.bytes);
                const privateCache = (isOwner || isChatPeerAccess) && !isPublicCachedAsset;
                return new Response(body, {
                    status: 200,
                    headers: {
                        'Content-Type': fileUpload.mediaType,
                        'Content-Length': String(fileUpload.size),
                        'Content-Disposition': `inline; filename="${safeFilename}"`,
                        'Cache-Control': privateCache ? 'private, max-age=86400' : 'public, max-age=86400',
                        'Set-Cookie': setCookie,
                    },
                });
            },
        },
    },
});
