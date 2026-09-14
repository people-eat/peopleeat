import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: ['.env.local'] });

const confirmed = process.argv.includes('--confirm');
const databaseUrl = process.env.DATABASE_URL;

if (!confirmed) {
    console.error('Refusing to wipe without --confirm.');
    console.error('Usage: npm run db:wipe -- --confirm');
    process.exit(1);
}

if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const parsedUrl = new URL(databaseUrl);
const host = parsedUrl.host || '(unknown host)';
const database = parsedUrl.pathname.replace(/^\//, '') || '(unknown database)';

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
    const { rows } = await client.query<{ schemaname: string; tablename: string }>(
        `
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname IN ('public', 'pgboss')
        ORDER BY schemaname, tablename
        `,
    );

    if (rows.length === 0) {
        console.log(`[${host}/${database}] no tables in public or pgboss — nothing to wipe`);
        process.exit(0);
    }

    const qualified = rows.map((row) => `"${row.schemaname}"."${row.tablename}"`);
    console.log(`[${host}/${database}] truncating ${qualified.length} table(s) (drizzle schema preserved)`);

    await client.query(`TRUNCATE TABLE ${qualified.join(', ')} RESTART IDENTITY CASCADE`);

    console.log(`[${host}/${database}] wipe complete`);
} finally {
    await client.end();
}
