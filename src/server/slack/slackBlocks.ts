import type { KnownBlock } from '@slack/web-api';

export type SlackField = {
    label: string;
    value: string;
};

export type SlackMessageBuildArgs = {
    header: string;
    fields?: SlackField[];
    body?: string;
    contextLines?: string[];
    adminHref?: string;
    adminButtonTitle?: string;
};

const HEADER_MAX = 150;
const FIELD_VALUE_MAX = 2000;
const BODY_CHUNK_MAX = 2900;

function truncate(text: string, max: number): string {
    if (text.length <= max) {
        return text;
    }
    return `${text.slice(0, max - 1)}…`;
}

function fieldMrkdwn(field: SlackField): string {
    return `*${field.label}*\n${truncate(field.value, FIELD_VALUE_MAX)}`;
}

/**
 * Structured Block Kit template for ops Slack messages.
 * Header → optional 2-col fields → optional body → context → optional admin button.
 */
export function slackMessageBlocksBuild(args: SlackMessageBuildArgs): { text: string; blocks: KnownBlock[] } {
    const header = truncate(args.header.trim(), HEADER_MAX);
    const blocks: KnownBlock[] = [
        {
            type: 'header',
            text: { type: 'plain_text', text: header, emoji: true },
        },
    ];

    const fields = (args.fields ?? []).filter((field) => field.value.trim().length > 0);
    if (fields.length > 0) {
        // Slack section fields max 10; chunk into groups of 10.
        for (let index = 0; index < fields.length; index += 10) {
            const chunk = fields.slice(index, index + 10);
            blocks.push({
                type: 'section',
                fields: chunk.map((field) => ({
                    type: 'mrkdwn',
                    text: fieldMrkdwn(field),
                })),
            });
        }
    }

    const body = args.body?.trim();
    if (body) {
        const chunks = body.match(new RegExp(`[\\s\\S]{1,${BODY_CHUNK_MAX}}`, 'gu')) ?? [body];
        for (const chunk of chunks) {
            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: chunk.trim() },
            });
        }
    }

    const contextLines = (args.contextLines ?? []).map((line) => line.trim()).filter(Boolean);
    if (contextLines.length > 0) {
        blocks.push({
            type: 'context',
            elements: contextLines.map((line) => ({
                type: 'mrkdwn',
                text: truncate(line, 2000),
            })),
        });
    }

    if (args.adminHref) {
        blocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: args.adminButtonTitle ?? 'In Admin öffnen',
                        emoji: true,
                    },
                    url: args.adminHref,
                },
            ],
        });
    }

    return { text: header, blocks };
}
