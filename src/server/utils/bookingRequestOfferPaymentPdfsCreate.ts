import { eq, inArray } from 'drizzle-orm';

import type { FeatureToggleKey } from '../../shared/featureToggle';
import { fileUploadCreate } from '../commands/fileUploadCreate';
import { bookingRequestOffers, bookingRequests, fileUploads } from '../db/schema';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { featureToggleIsEnabled } from './featureToggleIsEnabled';
import { fileUploadReferencedByOutboundEmailAttachment, fileUploadReferencedByWhatsAppAttachment } from './fileUploadContentAccess';
import { createServerToken } from './serverToken';

const RECEIPT_FILENAME = 'peopleeat-payment-receipt.pdf';
const STATEMENT_FILENAME = 'peopleeat-payout-statement.pdf';
const PDF_MEDIA_TYPE = 'application/pdf';
const TOGGLE_KEY: FeatureToggleKey = 'BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS';

type BookingRequestOfferPaymentPdf = { fileUploadId: string; content: Buffer };

export type BookingRequestOfferPaymentPdfs = {
    customerReceipt: BookingRequestOfferPaymentPdf | null;
    cookStatement: BookingRequestOfferPaymentPdf | null;
    /** Toggle was on for the customer and the offer is paid, even if capture failed. */
    customerReceiptEnabled: boolean;
    /** Toggle was on for the cook and the offer is paid, even if capture failed. */
    cookStatementEnabled: boolean;
};

export const bookingRequestOfferPaymentPdfFilenames = {
    receipt: RECEIPT_FILENAME,
    statement: STATEMENT_FILENAME,
    mediaType: PDF_MEDIA_TYPE,
} as const;

type Audience = 'customer' | 'cook' | 'both';

/**
 * Capture courtesy PDFs for a paid offer when `BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS`
 * is on for that party. Soft-fails per PDF. Deletes a replaced upload only when no
 * outbound email or WhatsApp message still attaches it.
 */
export async function bookingRequestOfferPaymentPdfsCreate(
    bookingRequestOfferId: string,
    serverRuntime: ServerRuntime,
    options?: { audience?: Audience },
): Promise<BookingRequestOfferPaymentPdfs> {
    const empty: BookingRequestOfferPaymentPdfs = {
        customerReceipt: null,
        cookStatement: null,
        customerReceiptEnabled: false,
        cookStatementEnabled: false,
    };

    try {
        const [offer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!offer || !bookingRequestOfferPaymentIsPaid(offer.paymentStatus)) {
            return empty;
        }

        const audience = options?.audience ?? 'both';
        const wantCustomer = audience === 'customer' || audience === 'both';
        const wantCook = audience === 'cook' || audience === 'both';
        const customerUserId = wantCustomer ? await bookingRequestCustomerUserId(serverRuntime, offer.bookingRequestId) : null;
        const [customerReceiptEnabled, cookStatementEnabled] = await Promise.all([
            wantCustomer ? featureToggleIsEnabled(TOGGLE_KEY, serverRuntime, customerUserId) : Promise.resolve(false),
            wantCook ? featureToggleIsEnabled(TOGGLE_KEY, serverRuntime, offer.cookId) : Promise.resolve(false),
        ]);

        const [customerReceipt, cookStatement] = await Promise.all([
            customerReceiptEnabled
                ? paymentPdfCapture(serverRuntime, {
                      bookingRequestOfferId,
                      ownerUserId: customerUserId,
                      path: 'customer-receipt',
                      filename: RECEIPT_FILENAME,
                      column: 'customerReceiptFileUploadId',
                      previousFileUploadId: offer.customerReceiptFileUploadId,
                  })
                : null,
            cookStatementEnabled
                ? paymentPdfCapture(serverRuntime, {
                      bookingRequestOfferId,
                      ownerUserId: offer.cookId,
                      path: 'cook-statement',
                      filename: STATEMENT_FILENAME,
                      column: 'cookStatementFileUploadId',
                      previousFileUploadId: offer.cookStatementFileUploadId,
                  })
                : null,
        ]);

        return { customerReceipt, cookStatement, customerReceiptEnabled, cookStatementEnabled };
    } catch (error) {
        serverRuntime.log.error(error, null);
        return empty;
    }
}

async function bookingRequestCustomerUserId(serverRuntime: ServerRuntime, bookingRequestId: string): Promise<string | null> {
    const [row] = await serverRuntime.db
        .select({ userId: bookingRequests.userId })
        .from(bookingRequests)
        .where(eq(bookingRequests.bookingRequestId, bookingRequestId))
        .limit(1);
    return row?.userId ?? null;
}

async function paymentPdfCapture(
    serverRuntime: ServerRuntime,
    input: {
        bookingRequestOfferId: string;
        ownerUserId: string | null;
        path: 'customer-receipt' | 'cook-statement';
        filename: string;
        column: 'customerReceiptFileUploadId' | 'cookStatementFileUploadId';
        previousFileUploadId: string | null;
    },
): Promise<BookingRequestOfferPaymentPdf | null> {
    try {
        const token = createServerToken(input.bookingRequestOfferId);
        const url = `${environmentVariables.webPageUrl}/server/booking-request-offers/${input.bookingRequestOfferId}/${input.path}?token=${encodeURIComponent(token)}`;
        const content = await serverRuntime.browser.capturePdf({
            url,
            waitForSelector: '[data-payment-document-ready]',
        });
        const fileUpload = await fileUploadCreate(serverRuntime.db, {
            userId: input.ownerUserId,
            filename: input.filename,
            mediaType: PDF_MEDIA_TYPE,
            bytes: content,
        });
        await serverRuntime.db
            .update(bookingRequestOffers)
            .set({ [input.column]: fileUpload.fileUploadId })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, input.bookingRequestOfferId));
        if (input.previousFileUploadId && input.previousFileUploadId !== fileUpload.fileUploadId) {
            await paymentPdfObsoleteDelete(serverRuntime, input.previousFileUploadId);
        }
        return { fileUploadId: fileUpload.fileUploadId, content };
    } catch (error) {
        serverRuntime.log.error(error, null);
        return null;
    }
}

async function paymentPdfObsoleteDelete(serverRuntime: ServerRuntime, fileUploadId: string): Promise<void> {
    const [keptByEmail, keptByWhatsApp] = await Promise.all([
        fileUploadReferencedByOutboundEmailAttachment(serverRuntime.db, fileUploadId),
        fileUploadReferencedByWhatsAppAttachment(serverRuntime.db, fileUploadId),
    ]);
    if (keptByEmail || keptByWhatsApp) {
        return;
    }
    await serverRuntime.db.delete(fileUploads).where(inArray(fileUploads.fileUploadId, [fileUploadId]));
}
