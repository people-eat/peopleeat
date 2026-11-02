import { spawn } from 'node:child_process';

type Check = {
    name: string;
    script: string;
};

type CheckResult = Check & {
    code: number;
    output: string;
    ms: number;
};

/** Same wave as CI: format / spell / types / usage (+ commitlint locally). Lint follows. */
const PARALLEL: Check[] = [
    { name: 'format', script: 'format:check' },
    { name: 'spell', script: 'spell:check' },
    { name: 'types', script: 'type:check' },
    { name: 'usage', script: 'usage:check' },
    { name: 'commitlint', script: 'commitlint:check' },
];

const LINT: Check = { name: 'lint', script: 'lint:check' };

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function runNpmScript(check: Check): Promise<CheckResult> {
    const started = Date.now();

    return new Promise((resolve) => {
        const child = spawn('npm', ['run', '--silent', check.script], {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        const chunks: Buffer[] = [];
        child.stdout.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });
        child.stderr.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });
        child.on('error', (error) => {
            resolve({
                ...check,
                code: 1,
                output: error.message,
                ms: Date.now() - started,
            });
        });
        child.on('close', (code) => {
            resolve({
                ...check,
                code: code ?? 1,
                output: Buffer.concat(chunks).toString('utf8').trimEnd(),
                ms: Date.now() - started,
            });
        });
    });
}

function printStatus(result: CheckResult): void {
    const mark = result.code === 0 ? 'pass' : 'FAIL';
    console.log(`${mark.padEnd(4)} ${result.name.padEnd(10)} ${formatDuration(result.ms)}`);
}

function printFailureLog(result: CheckResult): void {
    console.log(`\n── ${result.name} ${'─'.repeat(Math.max(1, 56 - result.name.length))}`);
    if (result.output.length > 0) {
        console.log(result.output);
    } else {
        console.log(`(no output, exit ${result.code})`);
    }
}

async function main(): Promise<void> {
    const wallStart = Date.now();
    console.log(`check: ${PARALLEL.map((check) => check.name).join(', ')} (parallel)`);

    const results = await Promise.all(
        PARALLEL.map(async (check) => {
            const result = await runNpmScript(check);
            printStatus(result);
            return result;
        }),
    );

    const failed = results.filter((result) => result.code !== 0);
    for (const result of failed) {
        printFailureLog(result);
    }

    if (failed.length > 0) {
        console.log(`\ncheck: failed (${failed.map((result) => result.name).join(', ')}) ${formatDuration(Date.now() - wallStart)}`);
        process.exit(1);
    }

    console.log('\ncheck: lint');
    const lint = await runNpmScript(LINT);
    printStatus(lint);
    if (lint.code !== 0) {
        printFailureLog(lint);
        console.log(`\ncheck: failed (lint) ${formatDuration(Date.now() - wallStart)}`);
        process.exit(1);
    }

    console.log(`\ncheck: ok (${formatDuration(Date.now() - wallStart)})`);
}

await main();
