import { eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { adminLegalImprints, adminLegalPrivacyPolicies, adminLegalTermsAndConditions, admins } from '../db/schema';
import type { GqlSLegalDocumentKind } from '../graphql/generated';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminLegalDocumentDraftUpsert } from './adminLegalDocumentDraftUpsert';
import { adminLegalDocumentPublish } from './adminLegalDocumentPublish';

async function adminWithLegalAcceptance(firstName: string) {
    const admin = await commandSetup.withUser({ firstName, lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    return admin;
}

const kinds: Array<{
    kind: GqlSLegalDocumentKind;
    clear: () => Promise<unknown>;
    insert: (values: { id: string; bodyDe: string; changeSummaryDe: string; publishedAt: Date | null }) => Promise<unknown>;
    selectById: (id: string) => Promise<{ bodyDe: string; changeSummaryDe: string; publishedAt: Date | null } | undefined>;
    clearDrafts: () => Promise<unknown>;
}> = [
    {
        kind: 'IMPRINT',
        clear: () => testDb.delete(adminLegalImprints),
        clearDrafts: () => testDb.delete(adminLegalImprints).where(isNull(adminLegalImprints.publishedAt)),
        insert: (values) =>
            testDb.insert(adminLegalImprints).values({
                imprintId: values.id,
                bodyDe: values.bodyDe,
                changeSummaryDe: values.changeSummaryDe,
                publishedAt: values.publishedAt,
            }),
        selectById: async (id) => {
            const [row] = await testDb.select().from(adminLegalImprints).where(eq(adminLegalImprints.imprintId, id));
            return row ? { bodyDe: row.bodyDe, changeSummaryDe: row.changeSummaryDe, publishedAt: row.publishedAt ?? null } : undefined;
        },
    },
    {
        kind: 'PRIVACY_POLICY',
        clear: () => testDb.delete(adminLegalPrivacyPolicies),
        clearDrafts: () => testDb.delete(adminLegalPrivacyPolicies).where(isNull(adminLegalPrivacyPolicies.publishedAt)),
        insert: (values) =>
            testDb.insert(adminLegalPrivacyPolicies).values({
                privacyPolicyId: values.id,
                bodyDe: values.bodyDe,
                changeSummaryDe: values.changeSummaryDe,
                publishedAt: values.publishedAt,
            }),
        selectById: async (id) => {
            const [row] = await testDb.select().from(adminLegalPrivacyPolicies).where(eq(adminLegalPrivacyPolicies.privacyPolicyId, id));
            return row ? { bodyDe: row.bodyDe, changeSummaryDe: row.changeSummaryDe, publishedAt: row.publishedAt ?? null } : undefined;
        },
    },
    {
        kind: 'TERMS_AND_CONDITIONS',
        clear: () => testDb.delete(adminLegalTermsAndConditions),
        clearDrafts: () => testDb.delete(adminLegalTermsAndConditions).where(isNull(adminLegalTermsAndConditions.publishedAt)),
        insert: (values) =>
            testDb.insert(adminLegalTermsAndConditions).values({
                termsAndConditionsId: values.id,
                bodyDe: values.bodyDe,
                changeSummaryDe: values.changeSummaryDe,
                publishedAt: values.publishedAt,
            }),
        selectById: async (id) => {
            const [row] = await testDb
                .select()
                .from(adminLegalTermsAndConditions)
                .where(eq(adminLegalTermsAndConditions.termsAndConditionsId, id));
            return row ? { bodyDe: row.bodyDe, changeSummaryDe: row.changeSummaryDe, publishedAt: row.publishedAt ?? null } : undefined;
        },
    },
];

describe.each(kinds)('adminLegalDocumentDraftUpsert ($kind)', ({ kind, clear, clearDrafts, insert, selectById }) => {
    it('creates an empty draft when no published version exists', async () => {
        await clear();
        const admin = await adminWithLegalAcceptance(`legal-upsert-create-${kind}`);

        const result = await adminLegalDocumentDraftUpsert(
            adminMutationParent(admin.user.userId),
            { kind, input: { bodyDe: '', changeSummaryDe: '' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const row = await selectById(result.referenceId!);
        expect(row).toMatchObject({
            bodyDe: '',
            changeSummaryDe: '',
            publishedAt: null,
        });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('seeds bodyDe from the latest published version when input body is blank', async () => {
        await clear();
        const admin = await adminWithLegalAcceptance(`legal-upsert-seed-${kind}`);
        await insert({
            id: idCreate(),
            bodyDe: 'Published body',
            changeSummaryDe: 'Erstfassung',
            publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        });

        const result = await adminLegalDocumentDraftUpsert(
            adminMutationParent(admin.user.userId),
            { kind, input: { bodyDe: '', changeSummaryDe: '' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const row = await selectById(result.referenceId!);
        expect(row).toMatchObject({
            bodyDe: 'Published body\n',
            changeSummaryDe: '',
            publishedAt: null,
        });
    });

    it('updates the existing unpublished draft', async () => {
        await clearDrafts();
        const admin = await adminWithLegalAcceptance(`legal-upsert-update-${kind}`);
        const draftId = idCreate();
        await insert({
            id: draftId,
            bodyDe: 'Old draft\n',
            changeSummaryDe: '',
            publishedAt: null,
        });

        const result = await adminLegalDocumentDraftUpsert(
            adminMutationParent(admin.user.userId),
            { kind, input: { bodyDe: 'Updated draft', changeSummaryDe: 'Wip' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.referenceId).toBe(draftId);
        const row = await selectById(draftId);
        expect(row).toMatchObject({
            bodyDe: 'Updated draft\n',
            changeSummaryDe: 'Wip',
            publishedAt: null,
        });
    });

    it('rejects an empty bodyDe when updating an existing draft', async () => {
        await clearDrafts();
        const admin = await adminWithLegalAcceptance(`legal-upsert-empty-body-${kind}`);
        await insert({
            id: idCreate(),
            bodyDe: 'Draft\n',
            changeSummaryDe: '',
            publishedAt: null,
        });

        await expect(
            adminLegalDocumentDraftUpsert(
                adminMutationParent(admin.user.userId),
                { kind, input: { bodyDe: '   ', changeSummaryDe: '' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/bodyDe must not be empty/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('allows an empty changeSummaryDe when saving a draft', async () => {
        await clearDrafts();
        const admin = await adminWithLegalAcceptance(`legal-upsert-empty-summary-${kind}`);
        const draftId = idCreate();
        await insert({
            id: draftId,
            bodyDe: 'Draft\n',
            changeSummaryDe: 'old',
            publishedAt: null,
        });

        const result = await adminLegalDocumentDraftUpsert(
            adminMutationParent(admin.user.userId),
            { kind, input: { bodyDe: 'Draft body', changeSummaryDe: '  ' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.referenceId).toBe(draftId);
        const row = await selectById(draftId);
        expect(row?.changeSummaryDe).toBe('');
    });
});

describe.each(kinds)('adminLegalDocumentPublish ($kind)', ({ kind, clearDrafts, insert, selectById }) => {
    it('publishes an unpublished draft and publishes adminUpdates', async () => {
        await clearDrafts();
        const admin = await adminWithLegalAcceptance(`legal-publish-${kind}`);
        const draftId = idCreate();
        await insert({
            id: draftId,
            bodyDe: 'Ready to publish\n',
            changeSummaryDe: 'Summary',
            publishedAt: null,
        });

        const result = await adminLegalDocumentPublish(
            adminMutationParent(admin.user.userId),
            { kind, documentId: draftId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBe(draftId);
        const row = await selectById(draftId);
        expect(row?.publishedAt).toBeInstanceOf(Date);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects an empty changeSummaryDe without publishing', async () => {
        await clearDrafts();
        const admin = await adminWithLegalAcceptance(`legal-publish-empty-summary-${kind}`);
        const draftId = idCreate();
        await insert({
            id: draftId,
            bodyDe: 'Body\n',
            changeSummaryDe: '',
            publishedAt: null,
        });

        await expect(
            adminLegalDocumentPublish(
                adminMutationParent(admin.user.userId),
                { kind, documentId: draftId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/changeSummaryDe must not be empty/);

        const row = await selectById(draftId);
        expect(row?.publishedAt).toBeNull();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('throws when the draft is missing, logs the error, and does not publish', async () => {
        const admin = await adminWithLegalAcceptance(`legal-publish-missing-${kind}`);

        await expect(
            adminLegalDocumentPublish(
                adminMutationParent(admin.user.userId),
                { kind, documentId: idCreate() },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/draft not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/draft not found/);
    });

    it('throws when the document is already published', async () => {
        await clearDrafts();
        const admin = await adminWithLegalAcceptance(`legal-publish-already-${kind}`);
        const publishedId = idCreate();
        await insert({
            id: publishedId,
            bodyDe: 'Published\n',
            changeSummaryDe: 'Done',
            publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        });

        await expect(
            adminLegalDocumentPublish(
                adminMutationParent(admin.user.userId),
                { kind, documentId: publishedId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/draft not found/);
    });
});
