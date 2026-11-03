import type { WhatsAppMessage } from '../db/schema';
import { whatsappTemplateSnapshotText } from '../domain/whatsappTemplates';

export function whatsappMessageText(message: Pick<WhatsAppMessage, 'body' | 'direction' | 'messageKind' | 'templateSnapshot'>): string {
    if (message.templateSnapshot) return whatsappTemplateSnapshotText(message.templateSnapshot);
    if (message.direction === 'OUTBOUND' && message.messageKind === 'TEMPLATE') {
        return 'Historische WhatsApp-Vorlage: Wortlaut nicht verifiziert. / Historical WhatsApp template: wording unverified.';
    }
    return message.body;
}
