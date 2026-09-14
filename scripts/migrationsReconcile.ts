import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

type JournalEntry = { idx: number; when: number; tag: string };
type Journal = { entries: JournalEntry[] };

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const apply = process.argv.includes('--apply');
const removePhantoms = process.argv.includes('--remove-phantoms');

const journal: Journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));

const local = journal.entries.map((entry) => {
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, 'utf8');
    return {
        tag: entry.tag,
        when: entry.when,
        hash: createHash('sha256').update(sql).digest('hex'),
    };
});
const localHashes = new Set(local.map((migration) => migration.hash));

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
    const { rows } = await client.query<{ id: number; hash: string; created_at: string }>(
        'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id',
    );
    const appliedHashes = new Set(rows.map((row) => row.hash));

    const missing = local.filter((migration) => !appliedHashes.has(migration.hash));
    const phantoms = rows.filter((row) => !localHashes.has(row.hash));

    console.log(`Local migrations: ${local.length}`);
    console.log(`Applied rows: ${rows.length}`);
    console.log(`Missing (need to insert): ${missing.length}`);
    for (const migration of missing) console.log(`  + ${migration.tag} ${migration.hash}`);
    console.log(`Phantoms (in DB but not in journal): ${phantoms.length}`);
    for (const phantom of phantoms) console.log(`  ? id=${phantom.id} hash=${phantom.hash} at=${phantom.created_at}`);

    if (!apply) {
        console.log('\nDry run. Re-run with --apply to insert missing rows.');
        if (phantoms.length > 0) console.log('Add --remove-phantoms to also delete phantom rows.');
    } else {
        await client.query('BEGIN');
        try {
            for (const migration of missing) {
                await client.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)', [
                    migration.hash,
                    migration.when,
                ]);
                console.log(`inserted ${migration.tag}`);
            }
            if (removePhantoms) {
                for (const phantom of phantoms) {
                    await client.query('DELETE FROM drizzle.__drizzle_migrations WHERE id = $1', [phantom.id]);
                    console.log(`deleted phantom id=${phantom.id}`);
                }
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }

        console.log('Done.');
    }
} finally {
    await client.end();
}
