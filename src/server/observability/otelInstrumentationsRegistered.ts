const OTEL_INSTRUMENTATIONS_REGISTERED = Symbol.for('peopleeat.otel.instrumentationsRegistered');

type GlobalWithOtelFlag = typeof globalThis & {
    [OTEL_INSTRUMENTATIONS_REGISTERED]?: boolean;
};

/** True when `ops/observability/register.mjs` (or a late fallback) already registered Pg/HTTP instrumentations. */
export function otelInstrumentationsAlreadyRegistered(): boolean {
    return Boolean((globalThis as GlobalWithOtelFlag)[OTEL_INSTRUMENTATIONS_REGISTERED]);
}

export function otelInstrumentationsMarkRegistered(): void {
    (globalThis as GlobalWithOtelFlag)[OTEL_INSTRUMENTATIONS_REGISTERED] = true;
}
