import { trace } from '@opentelemetry/api';

/** Active OTel span ids for correlating Postgres log rows with Grafana / Langfuse. */
export function activeTraceContext(): { traceId: string; spanId: string } | undefined {
    const span = trace.getActiveSpan();
    if (!span) {
        return undefined;
    }
    const spanContext = span.spanContext();
    if (!trace.isSpanContextValid(spanContext)) {
        return undefined;
    }
    return { traceId: spanContext.traceId, spanId: spanContext.spanId };
}
