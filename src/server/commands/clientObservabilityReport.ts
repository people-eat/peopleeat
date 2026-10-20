import { isBenignClientNetworkErrorMessage } from '../../shared/isBenignClientNetworkErrorMessage';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSClientObservabilityReportInput,
    GqlSMutationClientObservabilityReportArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { clientGraphqlErrorRecord, clientRouteErrorRecord, clientWebVitalRecord } from '../observability/clientMetrics';
import type { ClientWebVitalName } from '../observability/clientMetrics';

const MESSAGE_MAX = 200;
const PATH_MAX = 256;
const OPERATION_NAME_MAX = 128;
const ROUTE_ID_MAX = 128;

const WEB_VITAL_NAMES = new Set<ClientWebVitalName>(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);

function truncate(value: string | null | undefined, max: number): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function reportWebVital(input: GqlSClientObservabilityReportInput): boolean {
    if (!input.vitalName || !WEB_VITAL_NAMES.has(input.vitalName)) {
        return false;
    }
    if (typeof input.value !== 'number' || !Number.isFinite(input.value) || input.value < 0) {
        return false;
    }
    clientWebVitalRecord(input.vitalName, input.value);
    return true;
}

/**
 * Ingest browser RUM. Always returns success so collectors never break the UI.
 */
export async function clientObservabilityReport(
    args: GqlSMutationClientObservabilityReportArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const input = args.input;
        const path = truncate(input.path, PATH_MAX);

        if (input.kind === 'WEB_VITAL') {
            reportWebVital(input);
            return { success: true, referenceId: null };
        }

        if (input.kind === 'GRAPHQL_ERROR') {
            const operationName = truncate(input.operationName, OPERATION_NAME_MAX) ?? 'anonymous';
            const message = truncate(input.message, MESSAGE_MAX) ?? 'GraphQL error';
            if (isBenignClientNetworkErrorMessage(message)) {
                return { success: true, referenceId: null };
            }
            clientGraphqlErrorRecord(operationName);
            serverRuntime.log.error(
                new Error(`client graphql: ${operationName}${path ? ` path=${path}` : ''}: ${message}`),
                requestingSession,
            );
            return { success: true, referenceId: null };
        }

        // ROUTE_ERROR (exhaustive after WEB_VITAL / GRAPHQL_ERROR)
        const message = truncate(input.message, MESSAGE_MAX) ?? 'Route error';
        const routeId = truncate(input.routeId, ROUTE_ID_MAX);
        clientRouteErrorRecord();
        serverRuntime.log.error(
            new Error(`client route${routeId ? ` routeId=${routeId}` : ''}${path ? ` path=${path}` : ''}: ${message}`),
            requestingSession,
        );
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        return { success: true, referenceId: null };
    }
}
