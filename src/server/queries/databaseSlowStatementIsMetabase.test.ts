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

    it('detects Metabase native SQL that qualifies public or uses spaced aliases', () => {
        expect(
            databaseSlowStatementIsMetabase(`SELECT ("createdAt" AT TIME ZONE $1)::date AS "Visit day",
       regexp_replace("landingPath", $2, $3) AS "Landing path",
       COALESCE(NULLIF(regexp_replace("referrer", $4, $5), $6), $7) AS "Referrer",
       count(*) AS "Sessions"
FROM public."Sessions"
WHERE "isBot" IS FALSE
  AND "landingPath" ~ $8
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC, 2, 3`),
        ).toBe(true);
        expect(
            databaseSlowStatementIsMetabase(`SELECT COUNT(DISTINCT event."sessionId") AS "Unique visitors"
FROM public."SessionEvents" AS event
LEFT JOIN public."Sessions" AS session
  ON session."sessionId" = event."sessionId"
WHERE event."type" = $1
  AND session."isBot" IS NOT TRUE
  AND (
    event."payload" ->> $2 ILIKE ANY (ARRAY[$3])
    OR event."payload"::text ILIKE ANY (ARRAY[$4])
  )`),
        ).toBe(true);
        expect(
            databaseSlowStatementIsMetabase(`SELECT
  ("createdAt" AT TIME ZONE $1)::date AS "Day",
  COUNT(*) AS "Landing sessions"
FROM public."Sessions"
WHERE "isBot" IS FALSE
  AND "landingPath" ~* $2
GROUP BY 1
ORDER BY 1`),
        ).toBe(true);
        expect(
            databaseSlowStatementIsMetabase(
                'SELECT CAST(TIMEZONE($1, "public"."Sessions"."createdAt") AS date) AS "Day" FROM "public"."Sessions" WHERE "isBot" = $2',
            ),
        ).toBe(true);
    });

    it('leaves app SQL alone', () => {
        expect(databaseSlowStatementIsMetabase('select "sessionId", "createdAt" from "SessionEvents" where "type" = $1')).toBe(false);
        expect(databaseSlowStatementIsMetabase(`select (payload->>'webPageKey') from "SessionEvents"`)).toBe(false);
        expect(
            databaseSlowStatementIsMetabase(
                'select "fileUploadId", "userId" from "FileUploads" where "FileUploads"."fileUploadId" = $1 limit $2',
            ),
        ).toBe(false);
        expect(
            databaseSlowStatementIsMetabase(
                'select count(*) from "Sessions" where ("Sessions"."isBot" = $1 and "Sessions"."landingPath" ilike $2)',
            ),
        ).toBe(false);
    });
});
