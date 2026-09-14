//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config';
import prettierConfig from 'eslint-config-prettier';
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

const tanstackPlugins = tanstackConfig.find((config) => config.plugins?.import)?.plugins ?? {};

/** Paths that keep type-aware rules (TS program via projectService). Everything else uses disableTypeChecked. */
const typedLintFiles = ['src/server/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}'];

export default [
    ...tanstackConfig,
    {
        files: ['**/*.{js,ts,tsx}'],
        plugins: {
            // Flat-config objects that set `import/*` / `@typescript-eslint/*` rules
            // must re-declare those plugins on the same object.
            ...tanstackPlugins,
            'better-tailwindcss': eslintPluginBetterTailwindcss,
        },
        settings: {
            'better-tailwindcss': {
                entryPoint: 'src/styles.css',
            },
        },
        rules: {
            'import/no-cycle': 'off',
            // Override TanStack's import/order: alphabetize within groups, and keep
            // `import type` with its module path (not a trailing type-only group).
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
            // Member names inside `{ a, b }` — declaration order is owned by import/order.
            'sort-imports': [
                'error',
                {
                    ignoreCase: true,
                    ignoreDeclarationSort: true,
                    ignoreMemberSort: false,
                },
            ],
            '@typescript-eslint/array-type': 'off',
            '@typescript-eslint/no-deprecated': 'error',
            '@typescript-eslint/require-await': 'off',
            'pnpm/json-enforce-catalog': 'off',
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['lucide-react'],
                            importNamePattern: '^(?!.*Icon$)(?!type )',
                            message: 'Use the Icon-suffixed variant from lucide-react (e.g., CheckIcon instead of Check).',
                        },
                    ],
                },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'MemberExpression[object.name="process"][property.name="env"]',
                    message:
                        'Do not read process.env directly. Use environmentVariablesCreate() from src/server/env/environmentVariablesCreate.ts.',
                },
            ],
            // Same as Tailwind IntelliSense `suggestCanonicalClasses` — see docs/conventions.md.
            'better-tailwindcss/enforce-canonical-classes': 'error',
            // Companion: canonical autofix can leave doubled spaces when classes collapse.
            'better-tailwindcss/no-unnecessary-whitespace': 'error',
        },
    },
    // Typed linting only on server + shared — avoids loading the web GraphQL type graph into ESLint.
    {
        files: typedLintFiles,
        languageOptions: {
            parserOptions: {
                projectService: true,
                project: null,
            },
        },
    },
    {
        ...tseslint.configs.disableTypeChecked,
        files: ['**/*.{js,ts,tsx}'],
        ignores: typedLintFiles,
    },
    {
        // Web consumes GraphQL-generated types only — never Drizzle rows or server domain shapes.
        files: ['src/web/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['lucide-react'],
                            importNamePattern: '^(?!.*Icon$)(?!type )',
                            message: 'Use the Icon-suffixed variant from lucide-react (e.g., CheckIcon instead of Check).',
                        },
                        {
                            regex: '(^|/)server/(db|domain)(/|$)',
                            message: 'Web must not import from server/db or server/domain. Use generated GraphQL types (GqlC*) instead.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: [
            'src/server/env/environmentVariablesCreate.ts',
            'scripts/migrationsCheck.ts',
            'scripts/migrationsReconcile.ts',
            'scripts/databaseWipe.ts',
            'scripts/migrateFromPeopleEat/**/*.{ts,tsx}',
            'e2e/**/*.{ts,tsx}',
            'playwright.config.ts',
        ],
        rules: {
            'no-restricted-syntax': 'off',
        },
    },
    // CQRS: commands and queries must not import each other. Shared reads belong
    // inline in the command, or in a helper outside queries/ (e.g. mappers/, db/).
    {
        files: ['src/server/commands/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['lucide-react'],
                            importNamePattern: '^(?!.*Icon$)(?!type )',
                            message: 'Use the Icon-suffixed variant from lucide-react (e.g., CheckIcon instead of Check).',
                        },
                        {
                            regex: '(^|/)queries(/|$)',
                            message:
                                'Commands must not import from queries/. Inline the read, or move shared DB access to a helper outside queries/.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/server/queries/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['lucide-react'],
                            importNamePattern: '^(?!.*Icon$)(?!type )',
                            message: 'Use the Icon-suffixed variant from lucide-react (e.g., CheckIcon instead of Check).',
                        },
                        {
                            regex: '(^|/)commands(/|$)',
                            message: 'Queries must not import from commands/. Keep CQRS read/write layers separate.',
                        },
                    ],
                },
            ],
        },
    },
    prettierConfig,
    prettierPlugin,
    {
        ignores: [
            'eslint.config.js',
            'prettier.config.ts',
            'src/server/graphql/generated.ts',
            'src/web/graphql/generated.ts',
            'src/routeTree.gen.ts',
            'storybook-static',
            '.output',
            '.tanstack',
            '.nitro',
            '.vinxi',
            '.wrangler',
            'dist',
            'dist-ssr',
            'drizzle',
        ],
    },
];
