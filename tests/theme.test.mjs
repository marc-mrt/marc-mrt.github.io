// Browser behavior test for the system-driven dark theme.
// Renders the real site with Hugo and headless Chromium over the DevTools
// Protocol, then asserts computed colors and WCAG contrast per color scheme.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Samples every page must expose; extra samples are checked when present.
const PAGES = {
    '/': ['body', 'paragraph', 'link', 'subtle'],
    '/about/': ['body', 'paragraph', 'link', 'subtle', 'code', 'underline'],
    '/blog/': ['body', 'link', 'subtle'],
};

const LIGHT = {
    background: [229, 231, 235],
    text: [0, 0, 0],
    accent: [28, 73, 135],
    subtle: [74, 74, 74],
    codeBackground: [218, 218, 218],
};

const DARK = {
    background: [26, 24, 20],
    text: [255, 255, 255],
    accent: [227, 182, 120],
    subtle: [181, 181, 181],
    codeBackground: [37, 37, 37],
};

// WCAG AA requires 4.5:1 for normal text; this palette exceeds 7:1.
const MIN_TEXT_CONTRAST = 4.5;
// WCAG non-text (borders, underlines).
const MIN_NON_TEXT_CONTRAST = 3;

const START_TIMEOUT_MS = 30000;
const CDP_TIMEOUT_MS = 10000;
const KILL_TIMEOUT_MS = 2000;

let hugo = null;
let chrome = null;
let chromeProfile = null;
let cdp = null;
let base = null;

const sleep = (ms, unref = false) =>
    new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        if (unref) timer.unref();
    });

// Wait until probe() returns truthy, bounded by a real deadline even when a
// single probe hangs. Probe errors are retried until the deadline.
async function waitFor(probe, timeoutMs, label) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        const outcome = await Promise.race([
            Promise.resolve()
                .then(probe)
                .then(
                    (value) => ({ value }),
                    (error) => ({ error })
                ),
            sleep(remaining, true).then(() => ({ timedOut: true })),
        ]);
        if (outcome.timedOut) break;
        if (outcome.value) return outcome.value;
        if (outcome.error) throw outcome.error;
    }
    throw new Error(`timed out waiting for ${label}`);
}

// Stop a process idempotently and within KILL_TIMEOUT_MS per signal. A
// missing or already-exited process resolves immediately.
async function stopProcess(proc) {
    if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
    proc.kill('SIGTERM');
    await Promise.race([
        new Promise((resolve) => proc.once('exit', resolve)),
        sleep(KILL_TIMEOUT_MS),
    ]);
    if (proc.exitCode === null && proc.signalCode === null) {
        proc.kill('SIGKILL');
        await Promise.race([
            new Promise((resolve) => proc.once('exit', resolve)),
            sleep(KILL_TIMEOUT_MS),
        ]);
    }
}

function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
    });
}

async function startHugo() {
    const port = await freePort();
    // Hugo serves its stylesheet from the localhost baseURL, so browse via
    // localhost too: a 127.0.0.1 origin makes the crossorigin="anonymous"
    // stylesheet fetch fail and every computed color reads transparent.
    base = `http://localhost:${port}`;
    hugo = spawn(
        'hugo',
        ['server', '--port', String(port), '--bind', '127.0.0.1', '--disableLiveReload', '--quiet'],
        { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] }
    );
    await waitFor(async () => (await fetch(base + '/')).ok, START_TIMEOUT_MS, 'hugo server');
}

async function startChrome() {
    const chromeBin = process.env.CHROME_BIN;
    assert.ok(chromeBin, 'CHROME_BIN must point to a Chromium executable');
    chromeProfile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'theme-test-'));
    chrome = spawn(
        chromeBin,
        ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${chromeProfile}`, 'about:blank'],
        { stdio: ['ignore', 'ignore', 'pipe'] }
    );

    // Resolve the DevTools endpoint, or fail fast when Chromium dies before
    // it ever listens.
    const devtoolsUrl = new Promise((resolve, reject) => {
        let buffer = '';
        const settle = (fn, arg) => {
            chrome.removeListener('exit', onExit);
            fn(arg);
        };
        const onExit = (code) =>
            settle(reject, new Error(`Chromium exited before DevTools started (code ${code})`));
        chrome.once('exit', onExit);
        chrome.stderr.on('data', (chunk) => {
            buffer += chunk;
            const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
            if (match) settle(resolve, match[1]);
        });
        chrome.stderr.once('error', (error) => settle(reject, error));
    });
    const browserWs = await Promise.race([
        devtoolsUrl,
        sleep(START_TIMEOUT_MS, true).then(() => {
            throw new Error('timed out waiting for Chromium DevTools');
        }),
    ]);

    const httpPort = new URL(browserWs).port;
    const target = await (
        await fetch(`http://127.0.0.1:${httpPort}/json/new?about:blank`, { method: 'PUT' })
    ).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await Promise.race([
        new Promise((resolve, reject) => {
            ws.addEventListener('open', resolve);
            ws.addEventListener('error', reject);
        }),
        sleep(START_TIMEOUT_MS, true).then(() => {
            throw new Error('timed out connecting to the DevTools websocket');
        }),
    ]);
    return ws;
}

class Cdp {
    constructor(ws) {
        this.ws = ws;
        this.nextId = 0;
        this.pending = new Map();
        this.eventWaiters = new Map();
        this.closed = null;
        ws.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.id) {
                const settle = this.pending.get(message.id);
                if (!settle) return;
                this.pending.delete(message.id);
                clearTimeout(settle.timer);
                if (message.error) settle.reject(new Error(message.error.message));
                else settle.resolve(message.result);
                return;
            }
            const waiters = this.eventWaiters.get(message.method) ?? [];
            this.eventWaiters.delete(message.method);
            for (const waiter of waiters) {
                clearTimeout(waiter.timer);
                waiter.resolve(message.params);
            }
        });
        ws.addEventListener('close', () => this.fail(new Error('DevTools connection closed')));
        ws.addEventListener('error', () => this.fail(new Error('DevTools connection error')));
    }

    fail(error) {
        if (this.closed) return;
        this.closed = error;
        for (const { reject, timer } of this.pending.values()) {
            clearTimeout(timer);
            reject(error);
        }
        this.pending.clear();
        for (const waiters of this.eventWaiters.values()) {
            for (const waiter of waiters) {
                clearTimeout(waiter.timer);
                waiter.reject(error);
            }
        }
        this.eventWaiters.clear();
    }

    send(method, params = {}) {
        if (this.closed) return Promise.reject(this.closed);
        return new Promise((resolve, reject) => {
            const id = ++this.nextId;
            const timer = setTimeout(() => {
                if (this.pending.delete(id)) reject(new Error(`CDP ${method} timed out`));
            }, CDP_TIMEOUT_MS);
            timer.unref();
            this.pending.set(id, { resolve, reject, timer });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    waitEvent(method) {
        if (this.closed) return Promise.reject(this.closed);
        return new Promise((resolve, reject) => {
            const waiter = { resolve, reject, timer: null };
            waiter.timer = setTimeout(() => {
                const waiters = this.eventWaiters.get(method) ?? [];
                const index = waiters.indexOf(waiter);
                if (index !== -1) waiters.splice(index, 1);
                reject(new Error(`timed out waiting for ${method}`));
            }, CDP_TIMEOUT_MS);
            waiter.timer.unref();
            const waiters = this.eventWaiters.get(method) ?? [];
            waiters.push(waiter);
            this.eventWaiters.set(method, waiters);
        });
    }

    close() {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
        }
    }
}

async function emulate(scheme, media = 'screen') {
    await cdp.send('Emulation.setEmulatedMedia', {
        media,
        features: [{ name: 'prefers-color-scheme', value: scheme }],
    });
}

const COLLECT = `(() => {
    const sample = (selector, properties) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = getComputedStyle(el);
        return Object.fromEntries(properties.map((p) => [p, style[p]]));
    };
    return {
        body: sample('body', ['backgroundColor', 'color']),
        paragraph: sample('main p', ['color']),
        link: sample('main a', ['color']),
        subtle: sample('main small, main em', ['color']),
        code: sample('main code', ['backgroundColor', 'color']),
        underline: sample('.underline', ['borderBottomColor']),
    };
})()`;

async function collect(page) {
    const loaded = cdp.waitEvent('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: base + page });
    await loaded;
    const { result } = await cdp.send('Runtime.evaluate', {
        expression: COLLECT,
        returnByValue: true,
    });
    return result.value;
}

function parseColor(color) {
    const match = color.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
    assert.ok(match, `unexpected color format: ${color}`);
    assert.ok(match[4] === undefined || match[4] === '1', `unexpected transparency: ${color}`);
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function contrastRatio(fg, bg) {
    const channel = (v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const luminance = ([r, g, b]) =>
        0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    const [low, high] = [luminance(fg), luminance(bg)].sort((a, b) => a - b);
    return (high + 0.05) / (low + 0.05);
}

function assertRequired(page, data) {
    for (const sample of PAGES[page]) {
        assert.ok(data[sample], `${page} is missing the required ${sample} sample`);
    }
}

function assertPalette(page, data, palette) {
    assert.deepEqual(parseColor(data.body.backgroundColor), palette.background, `${page} background`);
    assert.deepEqual(parseColor(data.body.color), palette.text, `${page} body text`);
    if (data.paragraph)
        assert.deepEqual(parseColor(data.paragraph.color), palette.text, `${page} paragraph text`);
    if (data.link)
        assert.deepEqual(parseColor(data.link.color), palette.accent, `${page} link`);
    if (data.subtle)
        assert.deepEqual(parseColor(data.subtle.color), palette.subtle, `${page} subtle text`);
    if (data.code) {
        assert.deepEqual(parseColor(data.code.backgroundColor), palette.codeBackground, `${page} code background`);
        assert.deepEqual(parseColor(data.code.color), palette.text, `${page} code text`);
    }
}

function assertContrast(page, data, t) {
    const background = parseColor(data.body.backgroundColor);
    const ratios = {};
    const check = (label, fg, bg, min) => {
        const ratio = contrastRatio(fg, bg);
        assert.ok(ratio >= min, `${page} ${label} contrast ${ratio.toFixed(2)}:1, expected >= ${min}:1`);
        ratios[label] = Number(ratio.toFixed(2));
    };
    check('body-text', parseColor(data.body.color), background, MIN_TEXT_CONTRAST);
    if (data.paragraph)
        check('paragraph-text', parseColor(data.paragraph.color), background, MIN_TEXT_CONTRAST);
    if (data.link) check('link-text', parseColor(data.link.color), background, MIN_TEXT_CONTRAST);
    if (data.subtle)
        check('subtle-text', parseColor(data.subtle.color), background, MIN_TEXT_CONTRAST);
    if (data.code)
        check(
            'code-text',
            parseColor(data.code.color),
            parseColor(data.code.backgroundColor),
            MIN_TEXT_CONTRAST
        );
    if (data.underline)
        check('underline', parseColor(data.underline.borderBottomColor), background, MIN_NON_TEXT_CONTRAST);
    t.diagnostic(`${page}: contrast ${JSON.stringify(ratios)}`);
}

async function assertScheme(t, scheme, palette) {
    await emulate(scheme);
    for (const page of Object.keys(PAGES)) {
        const data = await collect(page);
        assertRequired(page, data);
        assertPalette(page, data, palette);
        assertContrast(page, data, t);
    }
}

before(async () => {
    await startHugo();
    cdp = new Cdp(await startChrome());
    await cdp.send('Page.enable');
});

after(async () => {
    cdp?.close();
    await Promise.all([stopProcess(chrome), stopProcess(hugo)]);
    if (chromeProfile) {
        await fs.promises.rm(chromeProfile, { recursive: true, force: true });
    }
});

test('light preference keeps the light palette with AA contrast', (t) =>
    assertScheme(t, 'light', LIGHT));

test('dark preference inverts the palette with AA contrast', (t) =>
    assertScheme(t, 'dark', DARK));

test('print emulation stays light under a dark preference', async (t) => {
    await emulate('dark', 'print');
    for (const page of Object.keys(PAGES)) {
        const data = await collect(page);
        assertRequired(page, data);
        assert.deepEqual(
            parseColor(data.body.backgroundColor),
            LIGHT.background,
            `${page} print background`
        );
        assert.deepEqual(parseColor(data.body.color), LIGHT.text, `${page} print body text`);
        if (data.link)
            assert.deepEqual(parseColor(data.link.color), LIGHT.accent, `${page} print link`);
    }
    await emulate('light');
});
