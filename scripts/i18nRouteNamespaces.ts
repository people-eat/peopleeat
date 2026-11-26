import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { I18N_WEB_NAMESPACES } from '../src/i18n/namespaces';
import type { I18nWebNamespace } from '../src/i18n/namespaces';
import { namespacesLoadedForPath } from '../src/i18n/namespacesForPath';

const REPO_ROOT = process.cwd();
const SRC_ROOT = path.join(REPO_ROOT, 'src');
const LOCALE_ROUTES_DIR = path.join(SRC_ROOT, 'routes', '{-$locale}');
const ROOT_ROUTE_FILE = path.join(SRC_ROOT, 'routes', '__root.tsx');
const WEB_NAMESPACE_SET = new Set<string>(I18N_WEB_NAMESPACES);

type ImportBinding = {
    localName: string;
    importedName: string | 'default' | '*';
    module: string;
};

type ReExport = {
    exportedName: string;
    importedName: string | 'default' | '*';
    module: string;
};

type FileInfo = {
    fileName: string;
    sourceFile: ts.SourceFile;
    imports: ImportBinding[];
    reexports: ReExport[];
    exportStars: string[];
    locals: Map<string, ts.Node>;
    defaultExport: ts.Node | undefined;
    exportedNames: Set<string>;
};

const fileCache = new Map<string, FileInfo | 'missing'>();
const usageCache = new Map<string, Set<I18nWebNamespace>>();

export type RouteShell = 'admin' | 'profile' | 'public';

function routeShellFromPath(samplePath: string): RouteShell {
    if (samplePath === '/admin' || samplePath.startsWith('/admin/')) return 'admin';
    if (samplePath === '/profile' || samplePath.startsWith('/profile/')) return 'profile';
    return 'public';
}

function shouldSkipFollow(fileName: string, shell: RouteShell): boolean {
    if (shell === 'admin') return false;
    const normalized = fileName.replaceAll('\\', '/');
    if (normalized.includes('/src/web/pages/admin/')) return true;
    if (/\/Admin[A-Z][^/]*\.(ts|tsx)$/.test(normalized)) return true;
    return false;
}

function isWebNamespace(value: string): value is I18nWebNamespace {
    return WEB_NAMESPACE_SET.has(value);
}

function unwrap(node: ts.Expression): ts.Expression {
    let current = node;
    while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current)) {
        current = current.expression;
    }
    return current;
}

function stringLiteral(node: ts.Node | undefined): string | undefined {
    if (!node) return undefined;
    const expr = ts.isExpression(node) ? unwrap(node as ts.Expression) : node;
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
    return undefined;
}

function stringLiteralsFromArray(node: ts.Expression): string[] {
    const expr = unwrap(node);
    if (!ts.isArrayLiteralExpression(expr)) return [];
    const values: string[] = [];
    for (const element of expr.elements) {
        const value = stringLiteral(element);
        if (value !== undefined) values.push(value);
    }
    return values;
}

function shouldSkipFile(fileName: string): boolean {
    const normalized = fileName.replaceAll('\\', '/');
    if (normalized.includes('/node_modules/')) return true;
    if (normalized.includes('/src/server/')) return true;
    if (normalized.includes('/src/i18n/locales/')) return true;
    if (normalized.endsWith('.gen.ts')) return true;
    if (normalized.endsWith('/generated.ts')) return true;
    if (normalized.endsWith('.test.ts') || normalized.endsWith('.test.tsx')) return true;
    return !normalized.endsWith('.ts') && !normalized.endsWith('.tsx');
}

function resolveImport(fromFile: string, specifier: string): string | null {
    if (!specifier.startsWith('.')) return null;
    const base = path.resolve(path.dirname(fromFile), specifier);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
    for (const candidate of candidates) {
        if (existsSync(candidate) && statSync(candidate).isFile()) return path.normalize(candidate);
    }
    return null;
}

function addLocal(locals: Map<string, ts.Node>, name: ts.BindingName | undefined, node: ts.Node): void {
    if (!name || !ts.isIdentifier(name)) return;
    if (!locals.has(name.text)) locals.set(name.text, node);
}

function collectLocalsFromDeclaration(locals: Map<string, ts.Node>, declaration: ts.VariableDeclaration): void {
    if (ts.isIdentifier(declaration.name)) {
        addLocal(locals, declaration.name, declaration);
        return;
    }
    if (ts.isObjectBindingPattern(declaration.name) || ts.isArrayBindingPattern(declaration.name)) {
        for (const element of declaration.name.elements) {
            if (ts.isBindingElement(element)) addLocal(locals, element.name, declaration);
        }
    }
}

function parseFile(fileName: string): FileInfo | 'missing' {
    const cached = fileCache.get(fileName);
    if (cached) return cached;
    if (shouldSkipFile(fileName) || !existsSync(fileName)) {
        fileCache.set(fileName, 'missing');
        return 'missing';
    }
    const text = readFileSync(fileName, 'utf8');
    const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const info: FileInfo = {
        fileName,
        sourceFile,
        imports: [],
        reexports: [],
        exportStars: [],
        locals: new Map(),
        defaultExport: undefined,
        exportedNames: new Set(),
    };

    for (const statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
            const module = statement.moduleSpecifier.text;
            const clause = statement.importClause;
            if (!clause || clause.isTypeOnly) continue;
            if (clause.name) {
                info.imports.push({ localName: clause.name.text, importedName: 'default', module });
            }
            const bindings = clause.namedBindings;
            if (bindings && ts.isNamespaceImport(bindings)) {
                info.imports.push({ localName: bindings.name.text, importedName: '*', module });
            }
            if (bindings && ts.isNamedImports(bindings)) {
                for (const element of bindings.elements) {
                    if (element.isTypeOnly) continue;
                    info.imports.push({
                        localName: element.name.text,
                        importedName: (element.propertyName ?? element.name).text,
                        module,
                    });
                }
            }
            continue;
        }

        if (ts.isExportDeclaration(statement)) {
            const module =
                statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : undefined;
            if (statement.isTypeOnly) continue;
            if (module && !statement.exportClause) {
                info.exportStars.push(module);
                continue;
            }
            if (statement.exportClause && ts.isNamespaceExport(statement.exportClause) && module) {
                info.reexports.push({ exportedName: statement.exportClause.name.text, importedName: '*', module });
                continue;
            }
            if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
                for (const element of statement.exportClause.elements) {
                    if (element.isTypeOnly) continue;
                    const exportedName = element.name.text;
                    const importedName = (element.propertyName ?? element.name).text;
                    info.exportedNames.add(exportedName);
                    if (module) {
                        info.reexports.push({ exportedName, importedName, module });
                    }
                }
            }
            continue;
        }

        if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
            if (statement.name) {
                info.locals.set(statement.name.text, statement);
                if (statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
                    info.exportedNames.add(statement.name.text);
                }
            }
            if (statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) {
                info.defaultExport = statement;
            }
            continue;
        }

        if (ts.isVariableStatement(statement)) {
            const exported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
            for (const declaration of statement.declarationList.declarations) {
                collectLocalsFromDeclaration(info.locals, declaration);
                if (exported && ts.isIdentifier(declaration.name)) info.exportedNames.add(declaration.name.text);
            }
        }

        if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
            info.defaultExport = statement.expression;
        }
    }

    fileCache.set(fileName, info);
    return info;
}

function constString(info: FileInfo, name: string): string | undefined {
    const node = info.locals.get(name);
    if (!node || !ts.isVariableDeclaration(node) || !node.initializer) return undefined;
    return stringLiteral(node.initializer);
}

function constStringArray(info: FileInfo, name: string): string[] | undefined {
    const node = info.locals.get(name);
    if (!node || !ts.isVariableDeclaration(node) || !node.initializer) return undefined;
    const values = stringLiteralsFromArray(node.initializer);
    return values.length > 0 ? values : undefined;
}

function addNamespace(into: Set<I18nWebNamespace>, value: string | undefined): void {
    if (value && isWebNamespace(value)) into.add(value);
}

function collectCallNamespaces(expression: ts.CallExpression, info: FileInfo, into: Set<I18nWebNamespace>): void {
    const callee = expression.expression;
    if (!ts.isIdentifier(callee)) return;
    const args = expression.arguments;
    if (callee.text === 'useT') {
        addNamespace(into, stringLiteral(args[0]) ?? (args[0] && ts.isIdentifier(args[0]) ? constString(info, args[0].text) : undefined));
        return;
    }
    if (callee.text === 't' || callee.text === 'tAsync' || callee.text === 'catalogKey') {
        const namespaceArg = args[callee.text === 'catalogKey' ? 0 : 1];
        const fromLiteral = stringLiteral(namespaceArg);
        if (fromLiteral) {
            addNamespace(into, fromLiteral);
            return;
        }
        if (namespaceArg && ts.isIdentifier(namespaceArg)) addNamespace(into, constString(info, namespaceArg.text));
        return;
    }
    if (callee.text === 'i18nCreateSync') {
        const nsArg = args[1];
        if (!nsArg) return;
        const literals = stringLiteralsFromArray(nsArg);
        if (literals.length > 0) {
            for (const value of literals) addNamespace(into, value);
            return;
        }
        if (ts.isIdentifier(nsArg)) {
            for (const value of constStringArray(info, nsArg.text) ?? []) addNamespace(into, value);
        }
        return;
    }
    if (callee.text === 'webPageSeoText') {
        addNamespace(into, stringLiteral(args[3]));
    }
}

function isDeclarationName(node: ts.Identifier): boolean {
    const parent = node.parent;
    if (!parent) return false;
    if (ts.isJsxAttribute(parent) && parent.name === node) return true;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
    if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
    if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) return true;
    if (ts.isParameter(parent) && parent.name === node) return true;
    if (ts.isFunctionDeclaration(parent) && parent.name === node) return true;
    if (ts.isClassDeclaration(parent) && parent.name === node) return true;
    if (ts.isVariableDeclaration(parent) && parent.name === node) return true;
    if (ts.isBindingElement(parent) && parent.name === node) return true;
    return false;
}

function collectFromNode(
    node: ts.Node,
    info: FileInfo,
    into: Set<I18nWebNamespace>,
    followIdent: (name: string) => void,
    followModule: (specifier: string, exportName: string | 'default' | '*') => void,
): void {
    if (ts.isCallExpression(node)) {
        collectCallNamespaces(node, info, into);
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            const specifier = stringLiteral(node.arguments[0]);
            if (specifier) followModule(specifier, '*');
        }
    }
    if (ts.isIdentifier(node) && !isDeclarationName(node)) {
        followIdent(node.text);
        return;
    }
    if (ts.isJsxAttribute(node)) {
        if (node.initializer) {
            collectFromNode(node.initializer, info, into, followIdent, followModule);
        }
        return;
    }
    if (ts.isPropertyAccessExpression(node)) {
        collectFromNode(node.expression, info, into, followIdent, followModule);
        return;
    }
    ts.forEachChild(node, (child) => collectFromNode(child, info, into, followIdent, followModule));
}

function usageOf(fileName: string, exportName: string | 'default' | '*', shell: RouteShell): Set<I18nWebNamespace> {
    const cacheKey = `${shell}#${fileName}#${exportName}`;
    const cached = usageCache.get(cacheKey);
    if (cached) return cached;
    const into = new Set<I18nWebNamespace>();
    usageCache.set(cacheKey, into);
    if (shouldSkipFile(fileName) || shouldSkipFollow(fileName, shell)) return into;

    const info = parseFile(fileName);
    if (info === 'missing') return into;

    const followModule = (specifier: string, name: string | 'default' | '*') => {
        const resolved = resolveImport(fileName, specifier);
        if (!resolved || shouldSkipFollow(resolved, shell)) return;
        for (const namespace of usageOf(resolved, name, shell)) into.add(namespace);
    };

    const followIdent = (name: string) => {
        const binding = info.imports.find((item) => item.localName === name);
        if (binding) {
            followModule(binding.module, binding.importedName);
            return;
        }
        if (info.locals.has(name) && name !== exportName) {
            for (const namespace of usageOf(fileName, name, shell)) into.add(namespace);
        }
    };

    if (exportName === '*') {
        collectFromNode(info.sourceFile, info, into, followIdent, followModule);
        return into;
    }

    const reexport = info.reexports.find((item) => item.exportedName === exportName);
    if (reexport) {
        followModule(reexport.module, reexport.importedName);
        return into;
    }

    if (exportName === 'default') {
        if (info.defaultExport) collectFromNode(info.defaultExport, info, into, followIdent, followModule);
        return into;
    }

    const local = info.locals.get(exportName);
    if (local) {
        collectFromNode(local, info, into, followIdent, followModule);
        return into;
    }

    for (const star of info.exportStars) followModule(star, exportName);
    return into;
}

/** TanStack `createFileRoute('/{-$locale}/…')` id → unprefixed sample path (`$param` → `x`). */
export function samplePathFromRouteId(routeId: string): string {
    let sample = routeId.replace('/{-$locale}', '');
    if (sample === '') sample = '/';
    sample = sample
        .split('/')
        .map((segment) => (segment.endsWith('_') ? segment.slice(0, -1) : segment))
        .join('/');
    sample = sample.replace(/\$[A-Za-z0-9_]+/g, 'x');
    sample = sample.replace(/\/{2,}/g, '/');
    if (sample.length > 1 && sample.endsWith('/')) sample = sample.slice(0, -1);
    return sample === '' ? '/' : sample;
}

function walkFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walkFiles(full));
        else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full);
    }
    return out;
}

function routeIdFromSource(fileName: string, text: string): string | undefined {
    if (path.normalize(fileName) === path.normalize(ROOT_ROUTE_FILE)) return '/__root';
    const match = text.match(/createFileRoute\(\s*(['`])(\/\{-\$locale\}[^'`]*?)\1\s*\)/);
    return match?.[2];
}

export function collectRouteNamespaceUsage(routeFile: string, shell: RouteShell = 'public'): Set<I18nWebNamespace> {
    const into = new Set<I18nWebNamespace>();
    const info = parseFile(routeFile);
    if (info === 'missing') return into;
    const followModule = (specifier: string, name: string | 'default' | '*') => {
        const resolved = resolveImport(routeFile, specifier);
        if (!resolved || shouldSkipFollow(resolved, shell)) return;
        for (const namespace of usageOf(resolved, name, shell)) into.add(namespace);
    };
    collectFromNode(
        info.sourceFile,
        info,
        into,
        (name) => {
            const binding = info.imports.find((item) => item.localName === name);
            if (binding) followModule(binding.module, binding.importedName);
        },
        followModule,
    );
    for (const binding of info.imports) followModule(binding.module, binding.importedName);
    return into;
}

export type RouteNamespaceMismatch = {
    routeFile: string;
    samplePath: string;
    used: I18nWebNamespace[];
    loaded: I18nWebNamespace[];
    missing: I18nWebNamespace[];
};

export function findRouteNamespaceMismatches(): RouteNamespaceMismatch[] {
    fileCache.clear();
    usageCache.clear();
    const mismatches: RouteNamespaceMismatch[] = [];
    const files = [ROOT_ROUTE_FILE, ...walkFiles(LOCALE_ROUTES_DIR)];
    for (const fileName of files) {
        const text = readFileSync(fileName, 'utf8');
        const routeId = routeIdFromSource(fileName, text);
        if (!routeId) continue;
        const samplePath = routeId === '/__root' ? '/' : samplePathFromRouteId(routeId);
        const used = [...collectRouteNamespaceUsage(fileName, routeId === '/__root' ? 'public' : routeShellFromPath(samplePath))].sort();
        const loaded = routeId === '/__root' ? (['common'] as I18nWebNamespace[]) : namespacesLoadedForPath(samplePath);
        const loadedSet = new Set(loaded);
        const missing = used.filter((namespace) => !loadedSet.has(namespace));
        if (missing.length === 0) continue;
        mismatches.push({
            routeFile: path.relative(REPO_ROOT, fileName),
            samplePath,
            used,
            loaded: [...loaded],
            missing,
        });
    }
    return mismatches;
}

export function formatRouteNamespaceMismatches(mismatches: RouteNamespaceMismatch[]): string[] {
    return mismatches.map((mismatch) => {
        const missing = mismatch.missing.join(', ');
        return `${mismatch.routeFile} (${mismatch.samplePath}) uses ${missing} but namespacesLoadedForPath does not load ${missing}`;
    });
}
