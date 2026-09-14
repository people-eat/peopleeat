import type { Pool } from 'pg';

import { idCreate } from '../../src/shared/idCreate';
import type { MigrateConfig } from './config';

export type Archiver = {
    write: (sourceTable: string, sourceId: string, payload: unknown) => Promise<void>;
    count: () => number;
};

export function archiverCreate(config: MigrateConfig, pg: Pool): Archiver {
    let written = 0;

    return {
        count: () => written,
        async write(sourceTable, sourceId, payload) {
            written += 1;
            if (config.dryRun) return;
            await pg.query(
                `INSERT INTO "MigrationArchive" ("archiveId", "sourceTable", "sourceId", "payload", "createdAt")
                 VALUES ($1, $2, $3, $4::jsonb, NOW())`,
                [idCreate(), sourceTable, sourceId, JSON.stringify(payload)],
            );
        },
    };
}
