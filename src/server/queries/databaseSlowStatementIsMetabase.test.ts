import { describe, expect, it } from 'vitest';

import { databaseSlowStatementIsMetabase } from './databaseSlowStatementIsMetabase';

describe('databaseSlowStatementIsMetabase', () => {
    it('detects Metabase __mb_ aliases', () => {
        expect(
            databaseSlowStatementIsMetabase(
                'SELECT "__mb_source"."Sessions - SessionId__referrer" AS "Sessions - SessionId__referrer" FROM "__mb_source"',
            ),
        ).toBe(true);
    });

    it('detects Metabase JSON #>> array extraction', () => {
        expect(
            databaseSlowStatementIsMetabase(
                'SELECT COUNT(*) AS "count" FROM "public"."SessionEvents" LEFT JOIN (SELECT ("public"."Sessions"."geoInformation"#>> array[$1]::text[])::text',
            ),
        ).toBe(true);
    });

    it('detects Metabase FK join aliases', () => {
        expect(
            databaseSlowStatementIsMetabase(
                'SELECT ("Sessions - SessionId"."geoInformation"#>> array[$1]::text[])::text AS "Sessions - SessionId__geoInformation"',
            ),
        ).toBe(true);
    });

    it('leaves app SQL alone', () => {
        expect(databaseSlowStatementIsMetabase('select "sessionId", "createdAt" from "SessionEvents" where "type" = $1')).toBe(false);
        expect(databaseSlowStatementIsMetabase(`select (payload->>'webPageKey') from "SessionEvents"`)).toBe(false);
    });
});
