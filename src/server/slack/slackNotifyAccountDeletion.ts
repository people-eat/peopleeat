import type { KnownBlock } from '@slack/web-api';

import type { ServerRuntime } from '../domain/ServerRuntime';
import { slackAdminUserUrl } from './slackAdminUrls';
import { slackMessageBlocksBuild } from './slackBlocks';
import type { SlackField } from './slackBlocks';
import { slackShortId } from './slackFormat';

async function postSignUps(serverRuntime: ServerRuntime, built: { text: string; blocks: KnownBlock[] }): Promise<void> {
    const channelId = serverRuntime.slack.channels.signUps;
    if (!channelId) {
        return;
    }
    try {
        await serverRuntime.slack.postMessage({
            channel: channelId,
            text: built.text,
            blocks: built.blocks,
        });
    } catch (error) {
        serverRuntime.log.error(error);
    }
}

function nameOf(args: { firstName: string; lastName: string }): string {
    return `${args.firstName} ${args.lastName}`.trim() || 'unbekannt';
}

/** Slack: user clicked "Konto löschen" on the account page. */
export async function slackNotifyAccountDeletionIntent(
    serverRuntime: ServerRuntime,
    args: { userId: string; firstName: string; lastName: string; emailAddress: string | null },
): Promise<void> {
    const name = nameOf(args);
    const fields: SlackField[] = [
        { label: 'Name', value: name },
        { label: 'E-Mail', value: args.emailAddress ?? 'nicht hinterlegt' },
    ];
    await postSignUps(
        serverRuntime,
        slackMessageBlocksBuild({
            header: `Konto-Löschung gestartet · ${name}`,
            fields,
            body: 'Nutzer hat auf Konto löschen geklickt.',
            contextLines: [`User ${slackShortId(args.userId)}`],
            adminHref: slackAdminUserUrl(args.userId),
        }),
    );
}

/** Slack: deletion was scheduled (self-serve OTP or admin SCHEDULE). */
export async function slackNotifyAccountDeletionRequested(
    serverRuntime: ServerRuntime,
    args: {
        userId: string;
        firstName: string;
        lastName: string;
        emailAddress: string | null;
        scheduledFor: Date;
        source: 'self-serve' | 'admin';
    },
): Promise<void> {
    const name = nameOf(args);
    const fields: SlackField[] = [
        { label: 'Name', value: name },
        { label: 'E-Mail', value: args.emailAddress ?? 'nicht hinterlegt' },
        { label: 'Geplant für', value: args.scheduledFor.toISOString() },
        { label: 'Quelle', value: args.source === 'admin' ? 'Admin' : 'Self-Serve' },
    ];
    await postSignUps(
        serverRuntime,
        slackMessageBlocksBuild({
            header: `Konto-Löschung angefordert · ${name}`,
            fields,
            contextLines: [`User ${slackShortId(args.userId)}`],
            adminHref: slackAdminUserUrl(args.userId),
        }),
    );
}

/** Slack: anonymize scrub completed. */
export async function slackNotifyAccountDeletionTookPlace(
    serverRuntime: ServerRuntime,
    args: {
        userId: string;
        firstName: string;
        lastName: string;
        emailAddress: string | null;
        source: 'self-serve' | 'admin' | 'job';
    },
): Promise<void> {
    const name = nameOf(args);
    const fields: SlackField[] = [
        { label: 'Name', value: name },
        { label: 'E-Mail', value: args.emailAddress ?? 'nicht hinterlegt' },
        { label: 'Quelle', value: args.source === 'admin' ? 'Admin' : args.source === 'job' ? 'Job' : 'Self-Serve' },
    ];
    await postSignUps(
        serverRuntime,
        slackMessageBlocksBuild({
            header: `Konto gelöscht · ${name}`,
            fields,
            contextLines: [`User ${slackShortId(args.userId)}`],
            adminHref: slackAdminUserUrl(args.userId),
        }),
    );
}
