#!/usr/bin/env node
/**
 * Generates peopleeat Grafana dashboard JSON for grafana.people-eat.com.
 * Datasource UIDs: prometheus, tempo. Env label: deployment_environment.
 * Run: node ops/grafana/dashboards/generate.mjs
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROM = { type: 'prometheus', uid: 'prometheus' };
const TEMPO = { type: 'tempo', uid: 'tempo' };

const envSelector = 'service_name="peopleeat",deployment_environment=~"${environment:regex}"';

function envVariable() {
    return {
        name: 'environment',
        type: 'query',
        label: 'Environment',
        datasource: PROM,
        description: 'Defaults to production. Switch to test (or All) when debugging staging.',
        query: 'label_values(graphql_operation_duration_milliseconds_count{service_name="peopleeat"}, deployment_environment)',
        refresh: 2,
        includeAll: true,
        multi: true,
        allValue: '.*',
        current: { selected: true, text: 'production', value: 'production' },
        sort: 1,
    };
}

function promTarget(refId, expr, legendFormat) {
    return {
        refId,
        expr,
        legendFormat: legendFormat ?? '',
        datasource: PROM,
        editorMode: 'code',
        range: true,
        instant: false,
    };
}

function timeseries(id, title, gridPos, targets, unit = 'short') {
    return {
        id,
        type: 'timeseries',
        title,
        gridPos,
        datasource: PROM,
        fieldConfig: {
            defaults: {
                unit,
                custom: {
                    drawStyle: 'line',
                    lineWidth: 1,
                    fillOpacity: 15,
                    spanNulls: true,
                    showPoints: 'never',
                },
            },
            overrides: [],
        },
        options: {
            legend: { displayMode: 'list', placement: 'bottom', showLegend: true },
            tooltip: { mode: 'multi', sort: 'desc' },
        },
        targets,
    };
}

function stat(id, title, gridPos, targets, unit = 'short', thresholds) {
    return {
        id,
        type: 'stat',
        title,
        gridPos,
        datasource: PROM,
        fieldConfig: {
            defaults: {
                unit,
                thresholds: thresholds ?? {
                    mode: 'absolute',
                    steps: [
                        { color: 'green', value: null },
                        { color: 'yellow', value: 0.01 },
                        { color: 'red', value: 0.05 },
                    ],
                },
            },
            overrides: [],
        },
        options: {
            reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
            colorMode: 'value',
            graphMode: 'area',
            textMode: 'auto',
            orientation: 'auto',
        },
        targets: targets.map((t) => ({ ...t, instant: true, range: false })),
    };
}

function row(id, title, y) {
    return {
        id,
        type: 'row',
        title,
        gridPos: { h: 1, w: 24, x: 0, y },
        collapsed: false,
        panels: [],
    };
}

function tempoTraces(id, title, gridPos) {
    return {
        id,
        type: 'traces',
        title,
        gridPos,
        datasource: TEMPO,
        targets: [
            {
                refId: 'A',
                datasource: TEMPO,
                queryType: 'traceql',
                limit: 20,
                tableType: 'traces',
                query: '{ resource.service.name = "peopleeat" && resource.deployment.environment =~ "${environment:regex}" }',
            },
        ],
    };
}

function dashboard({ uid, title, description, panels }) {
    return {
        uid,
        title,
        description,
        tags: ['peopleeat'],
        timezone: 'browser',
        schemaVersion: 39,
        version: 1,
        refresh: '30s',
        time: { from: 'now-6h', to: 'now' },
        editable: true,
        graphTooltip: 1,
        fiscalYearStartMonth: 0,
        liveNow: false,
        weekStart: '',
        links: [
            {
                title: 'peopleeat dashboards',
                type: 'dashboards',
                tags: ['peopleeat'],
                asDropdown: true,
                includeVars: true,
                keepTime: true,
            },
        ],
        annotations: { list: [] },
        templating: { list: [envVariable()] },
        panels,
    };
}

const latencyThresholds = {
    mode: 'absolute',
    steps: [
        { color: 'green', value: null },
        { color: 'yellow', value: 500 },
        { color: 'red', value: 2000 },
    ],
};

const overview = dashboard({
    uid: 'peopleeat-overview',
    title: 'peopleeat / Overview',
    description: 'Ops at a glance: GraphQL RED, jobs, client vitals. Environment defaults to production; toggle to test or All.',
    panels: [
        row(100, 'GraphQL', 0),
        stat(
            1,
            'GraphQL req/s',
            { h: 4, w: 6, x: 0, y: 1 },
            [promTarget('A', `sum(rate(graphql_operation_duration_milliseconds_count{${envSelector}}[$__rate_interval]))`)],
            'reqps',
            {
                mode: 'absolute',
                steps: [{ color: 'blue', value: null }],
            },
        ),
        stat(
            2,
            'GraphQL error rate',
            { h: 4, w: 6, x: 6, y: 1 },
            [
                promTarget(
                    'A',
                    `sum(rate(graphql_operation_errors_total{${envSelector}}[$__rate_interval])) / clamp_min(sum(rate(graphql_operation_duration_milliseconds_count{${envSelector}}[$__rate_interval])), 1e-9)`,
                ),
            ],
            'percentunit',
        ),
        stat(
            3,
            'GraphQL p95 latency',
            { h: 4, w: 6, x: 12, y: 1 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.95, sum by (le) (rate(graphql_operation_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                ),
            ],
            'ms',
            latencyThresholds,
        ),
        stat(
            4,
            'Job p95 latency',
            { h: 4, w: 6, x: 18, y: 1 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.95, sum by (le) (rate(job_handler_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                ),
            ],
            'ms',
            latencyThresholds,
        ),
        timeseries(
            5,
            'GraphQL request rate by operation',
            { h: 8, w: 12, x: 0, y: 5 },
            [
                promTarget(
                    'A',
                    `sum by (graphql_operation_name) (rate(graphql_operation_duration_milliseconds_count{${envSelector}}[$__rate_interval]))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'reqps',
        ),
        timeseries(
            6,
            'GraphQL p95 latency by operation',
            { h: 8, w: 12, x: 12, y: 5 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.95, sum by (le, graphql_operation_name) (rate(graphql_operation_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'ms',
        ),
        timeseries(
            7,
            'GraphQL errors by operation',
            { h: 8, w: 12, x: 0, y: 13 },
            [
                promTarget(
                    'A',
                    `sum by (graphql_operation_name) (rate(graphql_operation_errors_total{${envSelector}}[$__rate_interval]))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'ops',
        ),
        timeseries(
            8,
            'Job handler rate by name',
            { h: 8, w: 12, x: 12, y: 13 },
            [
                promTarget(
                    'A',
                    `sum by (job_name) (rate(job_handler_duration_milliseconds_count{${envSelector}}[$__rate_interval]))`,
                    '{{job_name}}',
                ),
            ],
            'ops',
        ),
        row(101, 'Client', 21),
        timeseries(
            9,
            'Web Vitals (p75)',
            { h: 8, w: 12, x: 0, y: 22 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.75, sum by (le, vital_name) (rate(client_web_vital_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                    '{{vital_name}}',
                ),
            ],
            'ms',
        ),
        timeseries(
            10,
            'CLS score (p75)',
            { h: 8, w: 12, x: 12, y: 22 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.75, sum by (le, vital_name) (rate(client_web_vital_score_bucket{${envSelector}}[$__rate_interval])))`,
                    '{{vital_name}}',
                ),
            ],
            'short',
        ),
        row(102, 'Traces', 30),
        tempoTraces(11, 'Recent traces (filtered by Environment)', { h: 10, w: 24, x: 0, y: 31 }),
    ],
});

const graphql = dashboard({
    uid: 'peopleeat-graphql',
    title: 'peopleeat / GraphQL',
    description: 'GraphQL operation and subscription latency, throughput, and errors.',
    panels: [
        row(100, 'Operations', 0),
        timeseries(
            1,
            'Request rate by operation',
            { h: 8, w: 12, x: 0, y: 1 },
            [
                promTarget(
                    'A',
                    `sum by (graphql_operation_name) (rate(graphql_operation_duration_milliseconds_count{${envSelector}}[$__rate_interval]))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'reqps',
        ),
        timeseries(
            2,
            'Request rate by type',
            { h: 8, w: 12, x: 12, y: 1 },
            [
                promTarget(
                    'A',
                    `sum by (graphql_operation_type) (rate(graphql_operation_duration_milliseconds_count{${envSelector}}[$__rate_interval]))`,
                    '{{graphql_operation_type}}',
                ),
            ],
            'reqps',
        ),
        timeseries(
            3,
            'p50 / p95 / p99 latency (all ops)',
            { h: 8, w: 12, x: 0, y: 9 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.50, sum by (le) (rate(graphql_operation_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                    'p50',
                ),
                promTarget(
                    'B',
                    `histogram_quantile(0.95, sum by (le) (rate(graphql_operation_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                    'p95',
                ),
                promTarget(
                    'C',
                    `histogram_quantile(0.99, sum by (le) (rate(graphql_operation_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                    'p99',
                ),
            ],
            'ms',
        ),
        timeseries(
            4,
            'p95 latency by operation',
            { h: 8, w: 12, x: 12, y: 9 },
            [
                promTarget(
                    'A',
                    `topk(15, histogram_quantile(0.95, sum by (le, graphql_operation_name) (rate(graphql_operation_duration_milliseconds_bucket{${envSelector}}[$__rate_interval]))))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'ms',
        ),
        timeseries(
            5,
            'Error rate by operation',
            { h: 8, w: 12, x: 0, y: 17 },
            [
                promTarget(
                    'A',
                    `sum by (graphql_operation_name) (rate(graphql_operation_errors_total{${envSelector}}[$__rate_interval]))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'ops',
        ),
        timeseries(
            6,
            'Error rate by class',
            { h: 8, w: 12, x: 12, y: 17 },
            [
                promTarget(
                    'A',
                    `sum by (graphql_error_class) (rate(graphql_operation_errors_total{${envSelector}}[$__rate_interval]))`,
                    '{{graphql_error_class}}',
                ),
            ],
            'ops',
        ),
        row(101, 'Subscriptions (SSE)', 25),
        timeseries(
            7,
            'Subscription connection lifetime p95',
            { h: 8, w: 12, x: 0, y: 26 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.95, sum by (le, graphql_operation_name) (rate(graphql_subscription_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'ms',
        ),
        timeseries(
            8,
            'Subscription connection rate',
            { h: 8, w: 12, x: 12, y: 26 },
            [
                promTarget(
                    'A',
                    `sum by (graphql_operation_name) (rate(graphql_subscription_duration_milliseconds_count{${envSelector}}[$__rate_interval]))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'ops',
        ),
        timeseries(
            9,
            'Subscription events (when exported)',
            { h: 8, w: 12, x: 0, y: 34 },
            [
                promTarget(
                    'A',
                    `sum by (graphql_operation_name) (rate(graphql_subscription_events_total{${envSelector}}[$__rate_interval]))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'ops',
        ),
        timeseries(
            10,
            'Subscription errors (when exported)',
            { h: 8, w: 12, x: 12, y: 34 },
            [
                promTarget(
                    'A',
                    `sum by (graphql_operation_name) (rate(graphql_subscription_errors_total{${envSelector}}[$__rate_interval]))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'ops',
        ),
    ],
});

const jobsIngress = dashboard({
    uid: 'peopleeat-jobs-ingress',
    title: 'peopleeat / Jobs & Ingress',
    description: 'Background job handlers and HTTP ingress (webhooks, file upload).',
    panels: [
        row(100, 'Jobs', 0),
        timeseries(
            1,
            'Job handler rate',
            { h: 8, w: 12, x: 0, y: 1 },
            [
                promTarget(
                    'A',
                    `sum by (job_name) (rate(job_handler_duration_milliseconds_count{${envSelector}}[$__rate_interval]))`,
                    '{{job_name}}',
                ),
            ],
            'ops',
        ),
        timeseries(
            2,
            'Job handler p95 latency',
            { h: 8, w: 12, x: 12, y: 1 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.95, sum by (le, job_name) (rate(job_handler_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                    '{{job_name}}',
                ),
            ],
            'ms',
        ),
        timeseries(
            3,
            'Job handler errors (when exported)',
            { h: 8, w: 24, x: 0, y: 9 },
            [promTarget('A', `sum by (job_name) (rate(job_handler_errors_total{${envSelector}}[$__rate_interval]))`, '{{job_name}}')],
            'ops',
        ),
        row(101, 'HTTP ingress', 17),
        timeseries(
            4,
            'Ingress rate by provider',
            { h: 8, w: 12, x: 0, y: 18 },
            [
                promTarget(
                    'A',
                    `sum by (ingress_provider) (rate(http_ingress_duration_milliseconds_count{${envSelector}}[$__rate_interval]))`,
                    '{{ingress_provider}}',
                ),
            ],
            'ops',
        ),
        timeseries(
            5,
            'Ingress p95 latency by provider',
            { h: 8, w: 12, x: 12, y: 18 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.95, sum by (le, ingress_provider) (rate(http_ingress_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                    '{{ingress_provider}}',
                ),
            ],
            'ms',
        ),
        timeseries(
            6,
            'Ingress errors by provider (when exported)',
            { h: 8, w: 24, x: 0, y: 26 },
            [
                promTarget(
                    'A',
                    `sum by (ingress_provider) (rate(http_ingress_errors_total{${envSelector}}[$__rate_interval]))`,
                    '{{ingress_provider}}',
                ),
            ],
            'ops',
        ),
    ],
});

const client = dashboard({
    uid: 'peopleeat-client',
    title: 'peopleeat / Client',
    description: 'Browser Web Vitals and client-reported GraphQL / route errors.',
    panels: [
        row(100, 'Web Vitals', 0),
        timeseries(
            1,
            'LCP / INP / FCP / TTFB p75',
            { h: 8, w: 12, x: 0, y: 1 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.75, sum by (le, vital_name) (rate(client_web_vital_duration_milliseconds_bucket{${envSelector}}[$__rate_interval])))`,
                    '{{vital_name}}',
                ),
            ],
            'ms',
        ),
        timeseries(
            2,
            'CLS p75',
            { h: 8, w: 12, x: 12, y: 1 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.75, sum by (le, vital_name) (rate(client_web_vital_score_bucket{${envSelector}}[$__rate_interval])))`,
                    '{{vital_name}}',
                ),
            ],
            'short',
        ),
        timeseries(
            3,
            'Web Vital sample rate',
            { h: 8, w: 12, x: 0, y: 9 },
            [
                promTarget(
                    'A',
                    `sum by (vital_name) (rate(client_web_vital_duration_milliseconds_count{${envSelector}}[$__rate_interval]))`,
                    '{{vital_name}}',
                ),
                promTarget(
                    'B',
                    `sum by (vital_name) (rate(client_web_vital_score_count{${envSelector}}[$__rate_interval]))`,
                    'CLS {{vital_name}}',
                ),
            ],
            'ops',
        ),
        timeseries(
            4,
            'LCP p75 by environment',
            { h: 8, w: 12, x: 12, y: 9 },
            [
                promTarget(
                    'A',
                    `histogram_quantile(0.75, sum by (le, deployment_environment) (rate(client_web_vital_duration_milliseconds_bucket{${envSelector},vital_name="LCP"}[$__rate_interval])))`,
                    '{{deployment_environment}}',
                ),
            ],
            'ms',
        ),
        row(101, 'Client errors', 17),
        timeseries(
            5,
            'Client GraphQL errors by operation (when exported)',
            { h: 8, w: 12, x: 0, y: 18 },
            [
                promTarget(
                    'A',
                    `sum by (graphql_operation_name) (rate(client_graphql_errors_total{${envSelector}}[$__rate_interval]))`,
                    '{{graphql_operation_name}}',
                ),
            ],
            'ops',
        ),
        timeseries(
            6,
            'Client route errors (when exported)',
            { h: 8, w: 12, x: 12, y: 18 },
            [promTarget('A', `sum(rate(client_route_errors_total{${envSelector}}[$__rate_interval]))`, 'route errors')],
            'ops',
        ),
    ],
});

const dashboards = [overview, graphql, jobsIngress, client];

for (const dash of dashboards) {
    const path = join(__dirname, `${dash.uid}.json`);
    writeFileSync(path, `${JSON.stringify(dash, null, 2)}\n`);
    console.log(`wrote ${path}`);
}
