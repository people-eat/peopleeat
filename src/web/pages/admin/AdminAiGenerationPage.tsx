import { Link } from '@tanstack/react-router';

import { formatDateTime, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Separator } from '../../components/base/separator';
import type { GqlCAdminAiGenerationPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminAiGenerationKindLabel } from './adminAiGenerationsColumns';

export const adminAiGenerationPageTitle = { de: 'AI-Generierung', en: 'AI generation' } as const;
export const adminAiGenerationPageDescription = {
    de: 'Details eines One-Shot-AI-Aufrufs.',
    en: 'Details for a one-shot AI call.',
} as const;

type AdminAiGenerationDetail = NonNullable<
    NonNullable<NonNullable<GqlCAdminAiGenerationPageQuery['currentSession']['user']>['admin']>['aiGeneration']
>;

export function AdminAiGenerationPage({ data }: { data: GqlCAdminAiGenerationPageQuery }) {
    const locale = useLocale();
    const generation = data.currentSession.user?.admin?.aiGeneration ?? null;
    const crumbLabel = generation ? adminAiGenerationKindLabel(generation.kind, locale) : adminAiGenerationPageTitle[locale];

    return (
        <AdminPageChrome
            crumbs={[
                {
                    label: { de: 'AI-Generierungen', en: 'AI Generations' }[locale],
                    to: '/{-$locale}/admin/ai-generations',
                },
                { label: crumbLabel },
            ]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminAiGenerationPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{{ de: 'AI-Aufruf-Details', en: 'AI call details' }[locale]}</p>
                </div>

                {generation ? (
                    <AdminAiGenerationDetailFields generation={generation} />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'AI-Generierung nicht gefunden.', en: 'AI generation not found.' }[locale]}
                    </p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminAiGenerationDetailFields({ generation }: { generation: AdminAiGenerationDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const empty = { de: '—', en: '—' }[locale];

    return (
        <dl className="grid gap-4">
            <DetailField label={{ de: 'ID', en: 'ID' }[locale]} value={generation.aiGenerationId} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{{ de: 'Art', en: 'Kind' }[locale]}</dt>
                <dd>
                    <Badge variant="secondary">{adminAiGenerationKindLabel(generation.kind, locale)}</Badge>
                </dd>
            </div>
            <Separator />
            <DetailField label={{ de: 'Zeit', en: 'Time' }[locale]} value={formatCreatedAt(generation.createdAt, locale, timeZone)} />
            <Separator />
            <DetailField label={{ de: 'Modell', en: 'Model' }[locale]} value={generation.modelId ?? empty} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Tokens', en: 'Tokens' }[locale]}
                </dt>
                <dd className="text-sm text-foreground tabular-nums">
                    {
                        {
                            de: `Eingabe ${formatToken(generation.inputTokens, empty)} · Ausgabe ${formatToken(generation.outputTokens, empty)} · Gesamt ${formatToken(generation.totalTokens, empty)} · Reasoning ${formatToken(generation.reasoningTokens, empty)} · Cache ${formatToken(generation.cachedInputTokens, empty)}`,
                            en: `Input ${formatToken(generation.inputTokens, empty)} · Output ${formatToken(generation.outputTokens, empty)} · Total ${formatToken(generation.totalTokens, empty)} · Reasoning ${formatToken(generation.reasoningTokens, empty)} · Cache ${formatToken(generation.cachedInputTokens, empty)}`,
                        }[locale]
                    }
                </dd>
            </div>
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Nutzer', en: 'User' }[locale]}
                </dt>
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
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Sitzung', en: 'Session' }[locale]}
                </dt>
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
            <PromptBlock label={{ de: 'System', en: 'System' }[locale]} value={generation.system} />
            <Separator />
            <PromptBlock label={{ de: 'Prompt', en: 'Prompt' }[locale]} value={generation.prompt} />
            <Separator />
            <PromptBlock label={{ de: 'Output', en: 'Output' }[locale]} value={generation.output} />
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
