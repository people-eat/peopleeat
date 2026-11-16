import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { formatDateTime, inlineCopy, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Separator } from '../../components/base/separator';
import type { GqlCAdminAiGenerationPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { adminAiGenerationKindLabel } from './adminAiGenerationsColumns';

export function adminAiGenerationPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.aiGeneration.title');
}
export function adminAiGenerationPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.aiGeneration.description');
}

type AdminAiGenerationDetail = NonNullable<
    NonNullable<NonNullable<GqlCAdminAiGenerationPageQuery['currentSession']['user']>['admin']>['aiGeneration']
>;

export function AdminAiGenerationPage({ data }: { data: GqlCAdminAiGenerationPageQuery }) {
    const locale = useLocale();
    const generation = data.currentSession.user?.admin?.aiGeneration ?? null;
    const crumbLabel = generation ? adminAiGenerationKindLabel(generation.kind, locale) : adminAiGenerationPageTitle(locale);

    return (
        <AdminPageChrome
            crumbs={[
                {
                    label: t(locale, 'admin', 'copy.aiGenerations'),
                    to: '/{-$locale}/admin/ai-generations',
                },
                { label: crumbLabel },
            ]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminAiGenerationPageTitle(locale)}</h1>
                    <p className="text-muted-foreground">{t(locale, 'admin', 'copy.aiCallDetails')}</p>
                </div>

                {generation ? (
                    <AdminAiGenerationDetailFields generation={generation} />
                ) : (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.aiGenerationNotFound')}</p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminAiGenerationDetailFields({ generation }: { generation: AdminAiGenerationDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const empty = t(locale, 'admin', 'copy.empty');

    return (
        <dl className="grid gap-4">
            <DetailField label={t(locale, 'admin', 'copy.id')} value={generation.aiGenerationId} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.kind')}</dt>
                <dd>
                    <Badge variant="secondary">{adminAiGenerationKindLabel(generation.kind, locale)}</Badge>
                </dd>
            </div>
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.time2')} value={formatCreatedAt(generation.createdAt, locale, timeZone)} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.model')} value={generation.modelId ?? empty} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.tokens')}</dt>
                <dd className="text-sm text-foreground tabular-nums">
                    {inlineCopy(
                        {
                            de: `Eingabe ${formatToken(generation.inputTokens, empty)} · Ausgabe ${formatToken(generation.outputTokens, empty)} · Gesamt ${formatToken(generation.totalTokens, empty)} · Reasoning ${formatToken(generation.reasoningTokens, empty)} · Cache ${formatToken(generation.cachedInputTokens, empty)}`,
                            en: `Input ${formatToken(generation.inputTokens, empty)} · Output ${formatToken(generation.outputTokens, empty)} · Total ${formatToken(generation.totalTokens, empty)} · Reasoning ${formatToken(generation.reasoningTokens, empty)} · Cache ${formatToken(generation.cachedInputTokens, empty)}`,
                        },
                        locale,
                    )}
                </dd>
            </div>
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.user')}</dt>
                <dd className="text-sm text-foreground">
                    {generation.user ? (
                        <div className="grid gap-0.5">
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: generation.user.userId }}
                                className="font-medium text-foreground hover:underline"
                            >
                                {userDisplayName(generation.user)}
                            </Link>
                            <span className="text-muted-foreground">{generation.user.emailAddress}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.session')}</dt>
                <dd className="text-sm text-foreground">
                    {generation.sessionId ? (
                        <Link
                            to="/{-$locale}/admin/sessions/$sessionId"
                            params={{ sessionId: generation.sessionId }}
                            className="font-mono text-xs break-all text-foreground hover:underline"
                        >
                            {generation.sessionId}
                        </Link>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <PromptBlock label={t(locale, 'admin', 'copy.system')} value={generation.system} />
            <Separator />
            <PromptBlock label={t(locale, 'admin', 'copy.prompt')} value={generation.prompt} />
            <Separator />
            <PromptBlock label={t(locale, 'admin', 'copy.output')} value={generation.output} />
        </dl>
    );
}

function formatCreatedAt(value: string, locale: ReturnType<typeof useLocale>, timeZone: string) {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'long', timeStyle: 'medium' });
}

function formatToken(value: number | null | undefined, empty: string) {
    return value != null ? value.toLocaleString() : empty;
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className={mono ? 'font-mono text-sm break-all text-foreground' : 'text-sm text-foreground'}>{value}</dd>
        </div>
    );
}

function PromptBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd>
                <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap text-foreground">
                    {value}
                </pre>
            </dd>
        </div>
    );
}
