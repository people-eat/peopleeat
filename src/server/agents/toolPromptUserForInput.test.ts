import { describe, expect, it } from 'vitest';
import { chatAssistantInputCollectionInputSchema, FORM_MODE_MAX_SLOTS, selectOptionToNaturalLanguage } from './toolPromptUserForInput';

describe('selectOptionToNaturalLanguage', () => {
    it('humanizes camelCase and PascalCase identifiers', () => {
        expect(selectOptionToNaturalLanguage('webApp')).toBe('Web App');
        expect(selectOptionToNaturalLanguage('aiIntegration')).toBe('Ai Integration');
        expect(selectOptionToNaturalLanguage('ProjectType')).toBe('Project Type');
    });

    it('leaves natural-language labels alone', () => {
        expect(selectOptionToNaturalLanguage('Web app')).toBe('Web app');
        expect(selectOptionToNaturalLanguage('Italian')).toBe('Italian');
        expect(selectOptionToNaturalLanguage('mobile')).toBe('mobile');
        expect(selectOptionToNaturalLanguage('AI')).toBe('AI');
        expect(selectOptionToNaturalLanguage('Gluten-free')).toBe('Gluten-free');
    });
});

describe('chatAssistantInputCollectionInputSchema', () => {
    it(`coerces mode to stepThrough when there are more than ${FORM_MODE_MAX_SLOTS} slots`, () => {
        const parsed = chatAssistantInputCollectionInputSchema.parse({
            prompt: 'A few details',
            mode: 'form',
            inputs: Array.from({ length: FORM_MODE_MAX_SLOTS + 1 }, (_, index) => ({
                kind: 'Text' as const,
                prompt: `Field ${index + 1}`,
            })),
        });
        expect(parsed.mode).toBe('stepThrough');
    });

    it(`keeps form mode when there are ${FORM_MODE_MAX_SLOTS} or fewer slots`, () => {
        const parsed = chatAssistantInputCollectionInputSchema.parse({
            prompt: 'Quick form',
            mode: 'form',
            inputs: Array.from({ length: FORM_MODE_MAX_SLOTS }, (_, index) => ({
                kind: 'Text' as const,
                prompt: `Field ${index + 1}`,
            })),
        });
        expect(parsed.mode).toBe('form');
    });

    it('humanizes camelCase select options before persistence', () => {
        const parsed = chatAssistantInputCollectionInputSchema.parse({
            prompt: 'What kind of project?',
            inputs: [
                {
                    kind: 'SingleSelect',
                    prompt: 'Project type',
                    options: ['webApp', 'mobile', 'aiIntegration', 'Web app'],
                },
            ],
        });
        expect(parsed.inputs[0]?.options).toEqual(['Web App', 'mobile', 'Ai Integration', 'Web app']);
    });
});
