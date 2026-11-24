import { sql } from 'drizzle-orm';

import type { GqlSAdminWebPageVisitAudience } from '../graphql/generated';

export function adminWebPageVisitAudienceSql(audience: GqlSAdminWebPageVisitAudience): {
    join: ReturnType<typeof sql>;
    where: ReturnType<typeof sql>;
} {
    if (audience === 'ALL') {
        return { join: sql``, where: sql`true` };
    }

    return {
        join: sql`
            INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
            LEFT JOIN "Admins" a ON a."adminId" = s."userId"
            LEFT JOIN "Cooks" c ON c."cookId" = s."userId"
        `,
        where: sql`
            s."isBot" = false
            AND s."impersonationReturnSessionId" IS NULL
            AND a."adminId" IS NULL
            AND c."cookId" IS NULL
        `,
    };
}
