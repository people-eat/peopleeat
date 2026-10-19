import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';

import { httpIngressRecord, httpIngressWindowRecord } from './redMetrics';
import type { IngressProvider } from './redMetrics';

const tracer = trace.getTracer('peopleeat.ingress');

export type IngressSpanInput = {
    provider: IngressProvider;
    route: string;
    eventType?: string;
    sessionId?: string;
    userId?: string | null;
};

/**
 * Wrap an HTTP ingress handler (webhook / file upload) with an OTel span and
 * RED metrics. Records duration for all outcomes; error counter only for 5xx
 * or thrown failures (4xx is client/attacker noise).
 */
export async function withIngressSpan(input: IngressSpanInput, run: (span: Span) => Promise<Response>): Promise<Response> {
    const startedAt = Date.now();

    return tracer.startActiveSpan(`ingress ${input.provider}`, async (span) => {
        span.setAttribute('http.route', input.route);
        span.setAttribute('ingress.provider', input.provider);
        if (input.eventType) {
            span.setAttribute('ingress.event_type', input.eventType);
        }
        if (input.sessionId) {
            span.setAttribute('session.id', input.sessionId);
        }
        if (input.userId) {
            span.setAttribute('enduser.id', input.userId);
        }

        try {
            const response = await run(span);
            const statusCode = response.status;
            span.setAttribute('http.status_code', statusCode);
            const errored = statusCode >= 500;
            if (errored) {
                span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${statusCode}` });
            }
            const durationMs = Date.now() - startedAt;
            httpIngressRecord(input.provider, durationMs, statusCode, errored);
            httpIngressWindowRecord(input.provider, durationMs, errored);
            return response;
        } catch (error) {
            span.recordException(error instanceof Error ? error : new Error(String(error)));
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Ingress throw',
            });
            span.setAttribute('http.status_code', 500);
            const durationMs = Date.now() - startedAt;
            httpIngressRecord(input.provider, durationMs, 500, true);
            httpIngressWindowRecord(input.provider, durationMs, true);
            throw error;
        } finally {
            span.end();
        }
    });
}

/** Set `ingress.event_type` after the provider payload is known (e.g. post-verify). */
export function ingressEventTypeSet(span: Span, eventType: string): void {
    span.setAttribute('ingress.event_type', eventType);
}
