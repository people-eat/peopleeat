import { describe, expect, it } from 'vitest';

import type { GqlSAdminOutboundEmailPurpose } from '../graphql/generated';
import { adminOutboundEmailCriterionWhere } from './adminOutboundEmailCriterionWhere';

const ALL_PURPOSES: GqlSAdminOutboundEmailPurpose[] = ['AUTH_EMAIL_OTP'];

describe('adminOutboundEmailCriterionWhere', () => {
    it('returns false for empty purposes', () => {
        expect(adminOutboundEmailCriterionWhere({ purposes: [], searchText: undefined })).toBe(false);
    });

    it('returns false for empty lifecycleStatuses', () => {
        expect(
            adminOutboundEmailCriterionWhere({
                purposes: ALL_PURPOSES,
                lifecycleStatuses: [],
            }),
        ).toBe(false);
    });

    it('builds a where clause for purposes only', () => {
        const where = adminOutboundEmailCriterionWhere({
            purposes: ALL_PURPOSES,
        });
        expect(where).not.toBe(false);
        expect(where).toBeDefined();
    });

    it('builds a where clause with a lifecycle filter', () => {
        const where = adminOutboundEmailCriterionWhere({
            purposes: ALL_PURPOSES,
            lifecycleStatuses: ['FAILED'],
        });
        expect(where).not.toBe(false);
        expect(where).toBeDefined();
    });
});
