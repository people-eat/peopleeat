import { WebClient } from '@slack/web-api';

import type { Logger } from '../utils/loggerCreate';
import type { Slack, SlackChannels, SlackPostMessageArgs } from './Slack';
import { slackChannelsCreate } from './slackChannels';
import type { SlackChannelsCreateOptions } from './slackChannels';

export type SlackCreateOptions = {
    transport: 'slack' | 'console';
    botToken: string | undefined;
    channels: SlackChannelsCreateOptions;
    log: Logger;
};

export function slackCreate(options: SlackCreateOptions): Slack {
    const channels: SlackChannels = slackChannelsCreate(options.channels);
    const botToken = options.botToken?.trim() || undefined;
    let client: WebClient | undefined;

    function isConfigured(): boolean {
        return options.transport === 'console' || Boolean(botToken);
    }

    function clientRequire(): WebClient {
        if (!botToken) {
            throw new Error('slackCreate: SLACK_BOT_TOKEN missing for slack transport');
        }
        client ??= new WebClient(botToken);
        return client;
    }

    return {
        isConfigured,
        channels,
        async postMessage(args: SlackPostMessageArgs): Promise<{ ts: string } | undefined> {
            if (options.transport === 'console') {
                // Dev/local preview — do not route through `serverRuntime.log`
                // (that persists to Postgres).
                const blockSummary = args.blocks.length > 0 ? ` blocks=${args.blocks.length}` : '';
                const threadSummary = args.threadTs ? ` threadTs=${args.threadTs}` : '';
                console.info(`[slack:console] channel=${args.channel}${threadSummary}${blockSummary}\n${args.text}`);
                return { ts: `console-${Date.now()}` };
            }

            if (!args.channel) {
                options.log.debug('slack.postMessage skipped: channel id empty');
                return undefined;
            }

            try {
                const webClient = clientRequire();
                const result = args.threadTs
                    ? await webClient.chat.postMessage({
                          channel: args.channel,
                          text: args.text,
                          blocks: args.blocks,
                          thread_ts: args.threadTs,
                          reply_broadcast: args.broadcast === true,
                      })
                    : await webClient.chat.postMessage({
                          channel: args.channel,
                          text: args.text,
                          blocks: args.blocks,
                      });
                if (!result.ts) {
                    return undefined;
                }
                return { ts: result.ts };
            } catch (error) {
                options.log.error(error);
                return undefined;
            }
        },
    };
}
