import mysql from 'mysql2/promise';
import pg from 'pg';

import { archiverCreate } from './archive';
import { migrateConfigFromArgv } from './config';
import { failureLogCreate } from './failures';
import { fileImporterCreate } from './files';
import { importAllDomains } from './importDomains';
import { verifyMigration } from './verify';

const { Pool: PgPool } = pg;

async function main(): Promise<void> {
    const config = migrateConfigFromArgv(process.argv.slice(2));

    console.log(`Source MySQL: ${config.sourceMysqlUrl.replace(/:[^:@/]+@/, ':***@')}`);
    console.log(`Target Postgres: ${config.targetDatabaseUrl.replace(/:[^:@/]+@/, ':***@')}`);
    console.log(`Web origin: ${config.sourceWebOrigin}`);
    console.log(`Mode: ${config.verifyOnly ? 'verify-only' : config.dryRun ? 'dry-run' : 'apply'}`);

    // Predecessor server Docker (node alpine, no TZ) writes MySQL DATETIME digits in UTC via
    // mysql2 `timezone: 'local'`. Force `Z` so ETL hosts in Europe/Berlin (or any non-UTC zone)
    // do not shift booking `dateTime` / timestamps by the local offset (typically ±1–2h).
    const mysqlPool = mysql.createPool({
        uri: config.sourceMysqlUrl,
        timezone: 'Z',
    });
    const pgPool = new PgPool({
        connectionString: config.targetDatabaseUrl,
        max: Math.max(10, config.dbConcurrency + 2, config.httpConcurrency + 2),
    });
    console.log(`MySQL DATETIME: interpreted as UTC (mysql2 timezone=Z)`);
    console.log(`HTTP concurrency: ${config.httpConcurrency}`);
    console.log(`DB batch: size=${config.dbBatchSize} concurrency=${config.dbConcurrency}`);

    try {
        if (config.verifyOnly) {
            const ok = await verifyMigration(mysqlPool, pgPool);
            process.exit(ok ? 0 : 1);
        }

        const archive = archiverCreate(config, pgPool);
        const failures = failureLogCreate();
        const files = fileImporterCreate(config, pgPool, async (source, detail) => {
            await archive.write(source, String(detail.url ?? detail.imageId ?? 'unknown'), detail);
            if (source === 'HttpFileFetch') {
                failures.record(
                    source,
                    String(detail.url ?? detail.imageId ?? 'unknown'),
                    String(detail.error ?? detail.status ?? 'fetch failed'),
                );
            }
        });

        await importAllDomains({ config, mysql: mysqlPool, pg: pgPool, files, archive, failures });

        console.log(
            `File fetch stats: attempted=${files.stats.attempted} ok=${files.stats.succeeded} fail=${files.stats.failed} dup=${files.stats.skippedDuplicate}`,
        );
        console.log(`MigrationArchive rows written: ${archive.count()}`);
        failures.printSummary();

        if (!config.dryRun) {
            const ok = await verifyMigration(mysqlPool, pgPool);
            if (!ok) {
                console.error('Verification reported differences — review logs before cutover.');
                process.exitCode = 2;
            }
        } else {
            console.log('Dry run complete — no rows were written to Postgres.');
        }
        if (failures.total() > 0 && process.exitCode == null) {
            process.exitCode = 3;
        }
    } finally {
        await mysqlPool.end();
        await pgPool.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
