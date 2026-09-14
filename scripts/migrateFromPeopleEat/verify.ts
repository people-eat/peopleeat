import type { Pool as MysqlPool } from 'mysql2/promise';
import type { Pool as PgPool } from 'pg';

type CountPair = { table: string; mysql: string; postgres: string };

const COUNT_PAIRS: CountPair[] = [
    { table: 'Users', mysql: 'Users', postgres: 'Users' },
    { table: 'Admins', mysql: 'Admins', postgres: 'Admins' },
    { table: 'Cooks', mysql: 'Cooks', postgres: 'Cooks' },
    { table: 'Sessions', mysql: 'Sessions', postgres: 'Sessions' },
    { table: 'Meals', mysql: 'Meals', postgres: 'Meals' },
    { table: 'Menus', mysql: 'Menus', postgres: 'Menus' },
    { table: 'BookingRequests', mysql: 'BookingRequests', postgres: 'BookingRequests' },
    { table: 'BookingRequestOffers', mysql: 'BookingRequestOffers', postgres: 'BookingRequestOffers' },
    { table: 'GiftCards', mysql: 'GiftCards', postgres: 'GiftCards' },
    { table: 'PromoCodes', mysql: 'PromoCodes', postgres: 'PromoCodes' },
    { table: 'SupportRequests', mysql: 'SupportRequests', postgres: 'SupportRequests' },
    { table: 'Cities', mysql: 'Cities', postgres: 'Cities' },
    { table: 'Partners', mysql: 'Partners', postgres: 'Partners' },
    { table: 'BlogPosts', mysql: 'BlogPosts', postgres: 'BlogPosts' },
    { table: 'NewsletterSubscriptions', mysql: 'NewsletterSubscriptions', postgres: 'NewsletterSubscriptions' },
];

async function mysqlCount(mysql: MysqlPool, table: string): Promise<number> {
    const [rows] = await mysql.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
    const row = (rows as Array<{ c: number }>)[0];
    return Number(row?.c ?? 0);
}

async function pgCount(pg: PgPool, table: string): Promise<number> {
    const { rows } = await pg.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM "${table}"`);
    return Number(rows[0]?.c ?? 0);
}

export async function verifyMigration(mysql: MysqlPool, pg: PgPool): Promise<boolean> {
    let ok = true;
    console.log('Verification counts (MySQL → Postgres):');

    for (const pair of COUNT_PAIRS) {
        const source = await mysqlCount(mysql, pair.mysql);
        const target = await pgCount(pg, pair.postgres);
        const mark = source === target ? 'OK' : 'DIFF';
        if (source !== target) ok = false;
        console.log(`  [${mark}] ${pair.table}: ${source} → ${target}`);
    }

    const [sampleUsers] = await mysql.query(`SELECT userId FROM Users ORDER BY createdAt ASC LIMIT 5`);
    for (const row of sampleUsers as Array<{ userId: string }>) {
        const { rows } = await pg.query(`SELECT "userId" FROM "Users" WHERE "userId" = $1`, [row.userId]);
        if (rows.length === 0) {
            ok = false;
            console.log(`  [MISS] Users.userId ${row.userId} not found in Postgres`);
        } else {
            console.log(`  [OK] Users.userId ${row.userId} preserved`);
        }
    }

    const { rows: fileRows } = await pg.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM "FileUploads"`);
    console.log(`  FileUploads rows: ${fileRows[0]?.c ?? '0'}`);

    const { rows: archiveRows } = await pg.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM "MigrationArchive"`);
    console.log(`  MigrationArchive rows: ${archiveRows[0]?.c ?? '0'}`);

    return ok;
}
