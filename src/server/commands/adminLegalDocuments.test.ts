import { eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { adminLegalImprints, adminLegalPrivacyPolicies, adminLegalTermsAndConditions, admins } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminLegalImprintDraftCreate } from './adminLegalImprintDraftCreate';
import { adminLegalImprintDraftUpdate } from './adminLegalImprintDraftUpdate';
import { adminLegalImprintPublish } from './adminLegalImprintPublish';
import { adminLegalPrivacyPolicyDraftCreate } from './adminLegalPrivacyPolicyDraftCreate';
import { adminLegalPrivacyPolicyDraftUpdate } from './adminLegalPrivacyPolicyDraftUpdate';
import { adminLegalPrivacyPolicyPublish } from './adminLegalPrivacyPolicyPublish';
import { adminLegalTermsAndConditionsDraftCreate } from './adminLegalTermsAndConditionsDraftCreate';
import { adminLegalTermsAndConditionsDraftUpdate } from './adminLegalTermsAndConditionsDraftUpdate';
import { adminLegalTermsAndConditionsPublish } from './adminLegalTermsAndConditionsPublish';

async function adminWithLegalAcceptance(firstName: string) {
    // `commandSetup.withUser` already stamps far-future legal acceptance.
    const admin = await commandSetup.withUser({ firstName, lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    return admin;
}

describe('adminLegalImprintDraftCreate', () => {
    it('creates an empty draft when no published version exists', async () => {
        // Arrange
        await testDb.delete(adminLegalImprints);
        const admin = await adminWithLegalAcceptance('imprint-draft-create-empty');

        // Act
        const result = await adminLegalImprintDraftCreate(
            adminMutationParent(admin.user.userId),
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(adminLegalImprints).where(eq(adminLegalImprints.imprintId, result.referenceId!));
        expect(row).toMatchObject({
            bodyDe: '',
            changeSummaryDe: '',
            publishedAt: null,
        });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('seeds bodyDe from the latest published version', async () => {
        // Arrange
        await testDb.delete(adminLegalImprints);
        const admin = await adminWithLegalAcceptance('imprint-draft-create-seed');
        await testDb.insert(adminLegalImprints).values({
            imprintId: idCreate(),
            bodyDe: 'Published imprint',
            changeSummaryDe: 'Erstfassung',
            publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        });

        // Act
        const result = await adminLegalImprintDraftCreate(
            adminMutationParent(admin.user.userId),
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(adminLegalImprints).where(eq(adminLegalImprints.imprintId, result.referenceId!));
        expect(row).toMatchObject({
            bodyDe: 'Published imprint\n',
            changeSummaryDe: '',
            publishedAt: null,
        });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects when a draft already exists', async () => {
        // Arrange
        await testDb.delete(adminLegalImprints).where(isNull(adminLegalImprints.publishedAt));
        const admin = await adminWithLegalAcceptance('imprint-draft-create-exists');
        await testDb.insert(adminLegalImprints).values({
            imprintId: idCreate(),
            bodyDe: 'Draft',
            changeSummaryDe: '',
            publishedAt: null,
        });

        // Act + Assert
        await expect(
            adminLegalImprintDraftCreate(adminMutationParent(admin.user.userId), admin.requestingSession, admin.serverRuntime),
        ).rejects.toThrow(/draft already exists/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/draft already exists/);
    });
});

describe('adminLegalImprintDraftUpdate', () => {
    it('updates the existing unpublished draft', async () => {
        // Arrange
        await testDb.delete(adminLegalImprints).where(isNull(adminLegalImprints.publishedAt));
        const admin = await adminWithLegalAcceptance('imprint-draft-update');
        const imprintId = idCreate();
        await testDb.insert(adminLegalImprints).values({
            imprintId,
            bodyDe: 'Alt',
            changeSummaryDe: 'Alt',
            publishedAt: null,
        });

        // Act
        const result = await adminLegalImprintDraftUpdate(
            adminMutationParent(admin.user.userId),
            { input: { bodyDe: 'Neu', changeSummaryDe: 'Update' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: imprintId });
        const [row] = await testDb.select().from(adminLegalImprints).where(eq(adminLegalImprints.imprintId, imprintId));
        expect(row).toMatchObject({ bodyDe: 'Neu\n', changeSummaryDe: 'Update', publishedAt: null });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects when no draft exists', async () => {
        // Arrange
        await testDb.delete(adminLegalImprints).where(isNull(adminLegalImprints.publishedAt));
        const admin = await adminWithLegalAcceptance('imprint-draft-update-missing');

        // Act + Assert
        await expect(
            adminLegalImprintDraftUpdate(
                adminMutationParent(admin.user.userId),
                { input: { bodyDe: 'Body', changeSummaryDe: 'Summary' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/draft not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/draft not found/);
    });

    it('rejects an empty bodyDe without publishing', async () => {
        // Arrange
        await testDb.delete(adminLegalImprints).where(isNull(adminLegalImprints.publishedAt));
        const admin = await adminWithLegalAcceptance('imprint-draft-empty-body');
        await testDb.insert(adminLegalImprints).values({
            imprintId: idCreate(),
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: null,
        });

        // Act + Assert
        await expect(
            adminLegalImprintDraftUpdate(
                adminMutationParent(admin.user.userId),
                { input: { bodyDe: '   ', changeSummaryDe: 'Summary' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/bodyDe must not be empty/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/bodyDe must not be empty/);
    });

    it('allows an empty changeSummaryDe when saving a draft', async () => {
        // Arrange
        await testDb.delete(adminLegalImprints).where(isNull(adminLegalImprints.publishedAt));
        const admin = await adminWithLegalAcceptance('imprint-draft-empty-summary');
        const imprintId = idCreate();
        await testDb.insert(adminLegalImprints).values({
            imprintId,
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: null,
        });

        // Act
        const result = await adminLegalImprintDraftUpdate(
            adminMutationParent(admin.user.userId),
            { input: { bodyDe: 'Body', changeSummaryDe: '   ' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: imprintId });
        const [row] = await testDb.select().from(adminLegalImprints).where(eq(adminLegalImprints.imprintId, imprintId));
        expect(row).toMatchObject({ bodyDe: 'Body\n', changeSummaryDe: '', publishedAt: null });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });
});

describe('adminLegalImprintPublish', () => {
    it('publishes an unpublished draft and publishes adminUpdates', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('imprint-publish');
        const imprintId = idCreate();
        await testDb.insert(adminLegalImprints).values({
            imprintId,
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: null,
        });

        // Act
        const result = await adminLegalImprintPublish(
            adminMutationParent(admin.user.userId),
            { imprintId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: imprintId });
        const [row] = await testDb.select().from(adminLegalImprints).where(eq(adminLegalImprints.imprintId, imprintId));
        expect(row?.publishedAt).toBeInstanceOf(Date);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);

        await testDb.delete(adminLegalImprints).where(eq(adminLegalImprints.imprintId, imprintId));
    });

    it('rejects an empty changeSummaryDe without publishing', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('imprint-publish-empty-summary');
        const imprintId = idCreate();
        await testDb.insert(adminLegalImprints).values({
            imprintId,
            bodyDe: 'Body',
            changeSummaryDe: '',
            publishedAt: null,
        });

        // Act + Assert
        await expect(
            adminLegalImprintPublish(adminMutationParent(admin.user.userId), { imprintId }, admin.requestingSession, admin.serverRuntime),
        ).rejects.toThrow(/changeSummaryDe must not be empty/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/changeSummaryDe must not be empty/);

        await testDb.delete(adminLegalImprints).where(eq(adminLegalImprints.imprintId, imprintId));
    });

    it('throws when the draft is missing, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('imprint-publish-missing');
        const imprintId = idCreate();

        // Act + Assert
        await expect(
            adminLegalImprintPublish(adminMutationParent(admin.user.userId), { imprintId }, admin.requestingSession, admin.serverRuntime),
        ).rejects.toThrow(/draft not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/draft not found/);
    });

    it('throws when the imprint is already published', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('imprint-publish-already');
        const imprintId = idCreate();
        await testDb.insert(adminLegalImprints).values({
            imprintId,
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        });

        // Act + Assert
        await expect(
            adminLegalImprintPublish(adminMutationParent(admin.user.userId), { imprintId }, admin.requestingSession, admin.serverRuntime),
        ).rejects.toThrow(/draft not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/draft not found/);

        await testDb.delete(adminLegalImprints).where(eq(adminLegalImprints.imprintId, imprintId));
    });
});

describe('adminLegalPrivacyPolicyDraftCreate', () => {
    it('creates an empty draft when no published version exists', async () => {
        // Arrange
        await testDb.delete(adminLegalPrivacyPolicies);
        const admin = await adminWithLegalAcceptance('privacy-draft-create-empty');

        // Act
        const result = await adminLegalPrivacyPolicyDraftCreate(
            adminMutationParent(admin.user.userId),
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const [row] = await testDb
            .select()
            .from(adminLegalPrivacyPolicies)
            .where(eq(adminLegalPrivacyPolicies.privacyPolicyId, result.referenceId!));
        expect(row).toMatchObject({ bodyDe: '', changeSummaryDe: '', publishedAt: null });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('seeds bodyDe from the latest published version', async () => {
        // Arrange
        await testDb.delete(adminLegalPrivacyPolicies);
        const admin = await adminWithLegalAcceptance('privacy-draft-create-seed');
        const publishedId = idCreate();
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId: publishedId,
            bodyDe: 'Published privacy',
            changeSummaryDe: 'Erstfassung',
            publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        });

        // Act
        const result = await adminLegalPrivacyPolicyDraftCreate(
            adminMutationParent(admin.user.userId),
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb
            .select()
            .from(adminLegalPrivacyPolicies)
            .where(eq(adminLegalPrivacyPolicies.privacyPolicyId, result.referenceId!));
        expect(row).toMatchObject({ bodyDe: 'Published privacy\n', changeSummaryDe: '', publishedAt: null });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);

        await testDb.delete(adminLegalPrivacyPolicies).where(eq(adminLegalPrivacyPolicies.privacyPolicyId, publishedId));
        await testDb.delete(adminLegalPrivacyPolicies).where(eq(adminLegalPrivacyPolicies.privacyPolicyId, result.referenceId!));
    });

    it('rejects when a draft already exists', async () => {
        // Arrange
        await testDb.delete(adminLegalPrivacyPolicies).where(isNull(adminLegalPrivacyPolicies.publishedAt));
        const admin = await adminWithLegalAcceptance('privacy-draft-create-exists');
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId: idCreate(),
            bodyDe: 'Draft',
            changeSummaryDe: '',
            publishedAt: null,
        });

        // Act + Assert
        await expect(
            adminLegalPrivacyPolicyDraftCreate(adminMutationParent(admin.user.userId), admin.requestingSession, admin.serverRuntime),
        ).rejects.toThrow(/draft already exists/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });
});

describe('adminLegalPrivacyPolicyDraftUpdate', () => {
    it('updates the existing unpublished draft', async () => {
        // Arrange
        await testDb.delete(adminLegalPrivacyPolicies).where(isNull(adminLegalPrivacyPolicies.publishedAt));
        const admin = await adminWithLegalAcceptance('privacy-draft-update');
        const privacyPolicyId = idCreate();
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId,
            bodyDe: 'Alt',
            changeSummaryDe: 'Alt',
            publishedAt: null,
        });

        // Act
        const result = await adminLegalPrivacyPolicyDraftUpdate(
            adminMutationParent(admin.user.userId),
            { input: { bodyDe: 'Neu', changeSummaryDe: 'Update' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: privacyPolicyId });
        const [row] = await testDb
            .select()
            .from(adminLegalPrivacyPolicies)
            .where(eq(adminLegalPrivacyPolicies.privacyPolicyId, privacyPolicyId));
        expect(row).toMatchObject({ bodyDe: 'Neu\n', changeSummaryDe: 'Update', publishedAt: null });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects when no draft exists', async () => {
        // Arrange
        await testDb.delete(adminLegalPrivacyPolicies).where(isNull(adminLegalPrivacyPolicies.publishedAt));
        const admin = await adminWithLegalAcceptance('privacy-draft-update-missing');

        // Act + Assert
        await expect(
            adminLegalPrivacyPolicyDraftUpdate(
                adminMutationParent(admin.user.userId),
                { input: { bodyDe: 'Body', changeSummaryDe: 'Summary' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/draft not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects an empty bodyDe without publishing', async () => {
        // Arrange
        await testDb.delete(adminLegalPrivacyPolicies).where(isNull(adminLegalPrivacyPolicies.publishedAt));
        const admin = await adminWithLegalAcceptance('privacy-draft-empty-body');
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId: idCreate(),
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: null,
        });

        // Act + Assert
        await expect(
            adminLegalPrivacyPolicyDraftUpdate(
                adminMutationParent(admin.user.userId),
                { input: { bodyDe: '   ', changeSummaryDe: 'Summary' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/bodyDe must not be empty/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('allows an empty changeSummaryDe when saving a draft', async () => {
        // Arrange
        await testDb.delete(adminLegalPrivacyPolicies).where(isNull(adminLegalPrivacyPolicies.publishedAt));
        const admin = await adminWithLegalAcceptance('privacy-draft-empty-summary');
        const privacyPolicyId = idCreate();
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId,
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: null,
        });

        // Act
        const result = await adminLegalPrivacyPolicyDraftUpdate(
            adminMutationParent(admin.user.userId),
            { input: { bodyDe: 'Body', changeSummaryDe: '   ' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: privacyPolicyId });
        const [row] = await testDb
            .select()
            .from(adminLegalPrivacyPolicies)
            .where(eq(adminLegalPrivacyPolicies.privacyPolicyId, privacyPolicyId));
        expect(row).toMatchObject({ bodyDe: 'Body\n', changeSummaryDe: '', publishedAt: null });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });
});

describe('adminLegalPrivacyPolicyPublish', () => {
    it('publishes an unpublished draft and publishes adminUpdates', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('privacy-publish');
        const privacyPolicyId = idCreate();
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId,
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: null,
        });

        // Act
        const result = await adminLegalPrivacyPolicyPublish(
            adminMutationParent(admin.user.userId),
            { privacyPolicyId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: privacyPolicyId });
        const [row] = await testDb
            .select()
            .from(adminLegalPrivacyPolicies)
            .where(eq(adminLegalPrivacyPolicies.privacyPolicyId, privacyPolicyId));
        expect(row?.publishedAt).toBeInstanceOf(Date);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);

        // Cleanup — remove the published row so other suites without legal acceptance stay green.
        await testDb.delete(adminLegalPrivacyPolicies).where(eq(adminLegalPrivacyPolicies.privacyPolicyId, privacyPolicyId));
    });

    it('rejects an empty changeSummaryDe without publishing', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('privacy-publish-empty-summary');
        const privacyPolicyId = idCreate();
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId,
            bodyDe: 'Body',
            changeSummaryDe: '   ',
            publishedAt: null,
        });

        // Act + Assert
        await expect(
            adminLegalPrivacyPolicyPublish(
                adminMutationParent(admin.user.userId),
                { privacyPolicyId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/changeSummaryDe must not be empty/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        await testDb.delete(adminLegalPrivacyPolicies).where(eq(adminLegalPrivacyPolicies.privacyPolicyId, privacyPolicyId));
    });

    it('throws when the draft is missing, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('privacy-publish-missing');
        const privacyPolicyId = idCreate();

        // Act + Assert
        await expect(
            adminLegalPrivacyPolicyPublish(
                adminMutationParent(admin.user.userId),
                { privacyPolicyId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/draft not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/draft not found/);
    });

    it('throws when the privacy policy is already published', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('privacy-publish-already');
        const privacyPolicyId = idCreate();
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId,
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        });

        // Act + Assert
        await expect(
            adminLegalPrivacyPolicyPublish(
                adminMutationParent(admin.user.userId),
                { privacyPolicyId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/draft not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/draft not found/);

        await testDb.delete(adminLegalPrivacyPolicies).where(eq(adminLegalPrivacyPolicies.privacyPolicyId, privacyPolicyId));
    });
});

describe('adminLegalTermsAndConditionsDraftCreate', () => {
    it('creates an empty draft when no published version exists', async () => {
        // Arrange
        await testDb.delete(adminLegalTermsAndConditions);
        const admin = await adminWithLegalAcceptance('terms-draft-create-empty');

        // Act
        const result = await adminLegalTermsAndConditionsDraftCreate(
            adminMutationParent(admin.user.userId),
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const [row] = await testDb
            .select()
            .from(adminLegalTermsAndConditions)
            .where(eq(adminLegalTermsAndConditions.termsAndConditionsId, result.referenceId!));
        expect(row).toMatchObject({ bodyDe: '', changeSummaryDe: '', publishedAt: null });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('seeds bodyDe from the latest published version', async () => {
        // Arrange
        await testDb.delete(adminLegalTermsAndConditions);
        const admin = await adminWithLegalAcceptance('terms-draft-create-seed');
        const publishedId = idCreate();
        await testDb.insert(adminLegalTermsAndConditions).values({
            termsAndConditionsId: publishedId,
            bodyDe: 'Published terms',
            changeSummaryDe: 'Erstfassung',
            publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        });

        // Act
        const result = await adminLegalTermsAndConditionsDraftCreate(
            adminMutationParent(admin.user.userId),
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb
            .select()
            .from(adminLegalTermsAndConditions)
            .where(eq(adminLegalTermsAndConditions.termsAndConditionsId, result.referenceId!));
        expect(row).toMatchObject({ bodyDe: 'Published terms\n', changeSummaryDe: '', publishedAt: null });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);

        await testDb.delete(adminLegalTermsAndConditions).where(eq(adminLegalTermsAndConditions.termsAndConditionsId, publishedId));
        await testDb.delete(adminLegalTermsAndConditions).where(eq(adminLegalTermsAndConditions.termsAndConditionsId, result.referenceId!));
    });

    it('rejects when a draft already exists', async () => {
        // Arrange
        await testDb.delete(adminLegalTermsAndConditions).where(isNull(adminLegalTermsAndConditions.publishedAt));
        const admin = await adminWithLegalAcceptance('terms-draft-create-exists');
        await testDb.insert(adminLegalTermsAndConditions).values({
            termsAndConditionsId: idCreate(),
            bodyDe: 'Draft',
            changeSummaryDe: '',
            publishedAt: null,
        });

        // Act + Assert
        await expect(
            adminLegalTermsAndConditionsDraftCreate(adminMutationParent(admin.user.userId), admin.requestingSession, admin.serverRuntime),
        ).rejects.toThrow(/draft already exists/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });
});

describe('adminLegalTermsAndConditionsDraftUpdate', () => {
    it('updates the existing unpublished draft', async () => {
        // Arrange
        await testDb.delete(adminLegalTermsAndConditions).where(isNull(adminLegalTermsAndConditions.publishedAt));
        const admin = await adminWithLegalAcceptance('terms-draft-update');
        const termsAndConditionsId = idCreate();
        await testDb.insert(adminLegalTermsAndConditions).values({
            termsAndConditionsId,
            bodyDe: 'Alt',
            changeSummaryDe: 'Alt',
            publishedAt: null,
        });

        // Act
        const result = await adminLegalTermsAndConditionsDraftUpdate(
            adminMutationParent(admin.user.userId),
            { input: { bodyDe: 'Neu', changeSummaryDe: 'Update' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: termsAndConditionsId });
        const [row] = await testDb
            .select()
            .from(adminLegalTermsAndConditions)
            .where(eq(adminLegalTermsAndConditions.termsAndConditionsId, termsAndConditionsId));
        expect(row).toMatchObject({ bodyDe: 'Neu\n', changeSummaryDe: 'Update', publishedAt: null });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects when no draft exists', async () => {
        // Arrange
        await testDb.delete(adminLegalTermsAndConditions).where(isNull(adminLegalTermsAndConditions.publishedAt));
        const admin = await adminWithLegalAcceptance('terms-draft-update-missing');

        // Act + Assert
        await expect(
            adminLegalTermsAndConditionsDraftUpdate(
                adminMutationParent(admin.user.userId),
                { input: { bodyDe: 'Body', changeSummaryDe: 'Summary' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/draft not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects an empty bodyDe without publishing', async () => {
        // Arrange
        await testDb.delete(adminLegalTermsAndConditions).where(isNull(adminLegalTermsAndConditions.publishedAt));
        const admin = await adminWithLegalAcceptance('terms-draft-empty-body');
        await testDb.insert(adminLegalTermsAndConditions).values({
            termsAndConditionsId: idCreate(),
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: null,
        });

        // Act + Assert
        await expect(
            adminLegalTermsAndConditionsDraftUpdate(
                adminMutationParent(admin.user.userId),
                { input: { bodyDe: '   ', changeSummaryDe: 'Summary' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/bodyDe must not be empty/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('allows an empty changeSummaryDe when saving a draft', async () => {
        // Arrange
        await testDb.delete(adminLegalTermsAndConditions).where(isNull(adminLegalTermsAndConditions.publishedAt));
        const admin = await adminWithLegalAcceptance('terms-draft-empty-summary');
        const termsAndConditionsId = idCreate();
        await testDb.insert(adminLegalTermsAndConditions).values({
            termsAndConditionsId,
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: null,
        });

        // Act
        const result = await adminLegalTermsAndConditionsDraftUpdate(
            adminMutationParent(admin.user.userId),
            { input: { bodyDe: 'Body', changeSummaryDe: '   ' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: termsAndConditionsId });
        const [row] = await testDb
            .select()
            .from(adminLegalTermsAndConditions)
            .where(eq(adminLegalTermsAndConditions.termsAndConditionsId, termsAndConditionsId));
        expect(row).toMatchObject({ bodyDe: 'Body\n', changeSummaryDe: '', publishedAt: null });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });
});

describe('adminLegalTermsAndConditionsPublish', () => {
    it('publishes an unpublished draft and publishes adminUpdates', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('terms-publish');
        const termsAndConditionsId = idCreate();
        await testDb.insert(adminLegalTermsAndConditions).values({
            termsAndConditionsId,
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: null,
        });

        // Act
        const result = await adminLegalTermsAndConditionsPublish(
            adminMutationParent(admin.user.userId),
            { termsAndConditionsId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: termsAndConditionsId });
        const [row] = await testDb
            .select()
            .from(adminLegalTermsAndConditions)
            .where(eq(adminLegalTermsAndConditions.termsAndConditionsId, termsAndConditionsId));
        expect(row?.publishedAt).toBeInstanceOf(Date);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);

        await testDb
            .delete(adminLegalTermsAndConditions)
            .where(eq(adminLegalTermsAndConditions.termsAndConditionsId, termsAndConditionsId));
    });

    it('rejects an empty changeSummaryDe without publishing', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('terms-publish-empty-summary');
        const termsAndConditionsId = idCreate();
        await testDb.insert(adminLegalTermsAndConditions).values({
            termsAndConditionsId,
            bodyDe: 'Body',
            changeSummaryDe: '',
            publishedAt: null,
        });

        // Act + Assert
        await expect(
            adminLegalTermsAndConditionsPublish(
                adminMutationParent(admin.user.userId),
                { termsAndConditionsId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/changeSummaryDe must not be empty/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        await testDb
            .delete(adminLegalTermsAndConditions)
            .where(eq(adminLegalTermsAndConditions.termsAndConditionsId, termsAndConditionsId));
    });

    it('throws when the draft is missing, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('terms-publish-missing');
        const termsAndConditionsId = idCreate();

        // Act + Assert
        await expect(
            adminLegalTermsAndConditionsPublish(
                adminMutationParent(admin.user.userId),
                { termsAndConditionsId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/draft not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/draft not found/);
    });

    it('throws when the terms document is already published', async () => {
        // Arrange
        const admin = await adminWithLegalAcceptance('terms-publish-already');
        const termsAndConditionsId = idCreate();
        await testDb.insert(adminLegalTermsAndConditions).values({
            termsAndConditionsId,
            bodyDe: 'Body',
            changeSummaryDe: 'Summary',
            publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        });

        // Act + Assert
        await expect(
            adminLegalTermsAndConditionsPublish(
                adminMutationParent(admin.user.userId),
                { termsAndConditionsId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/draft not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/draft not found/);

        await testDb
            .delete(adminLegalTermsAndConditions)
            .where(eq(adminLegalTermsAndConditions.termsAndConditionsId, termsAndConditionsId));
    });
});
