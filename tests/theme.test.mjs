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
const PAGES = ['/', '/about/', '/blog/'];

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

// WCAG AA is 4.5:1 for text; this palette must exceed 7:1 with margin.
const MIN_TEXT_CONTRAST = 7;
// WCAG non-text (borders, underlines).
const MIN_NON_TEXT_CONTRAST = 3;

let hugo;
let chrome;
let cdp;
let base;

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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(probe, timeoutMs, label) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        try {
            const value = await probe();
            if (value) return value;
        } catch {
            // Retry until the deadline: the process may not be listening yet.
        }
        if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
        await sleep(250);
    }
}

async function startHugo() {
    const port = await freePort();
    const proc = spawn(
        'hugo',
        ['server', '--port', String(port), '--bind', '127.0.0.1', '--disableLiveReload', '--quiet'],
        { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] }
    );
    base = `http://localhost:${port}`;
    await waitFor(async () => (await fetch(base + '/')).ok, 30000, 'hugo server');
    return proc;
}

async function startChrome() {
    const chromeBin = process.env.CHROME_BIN;
    assert.ok(chromeBin, 'CHROME_BIN must point to a Chromium executable');
    const userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'theme-test-'));
    const proc = spawn(
        chromeBin,
        ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${userDataDir}`, 'about:blank'],
        { stdio: ['ignore', 'ignore', 'pipe'] }
    );

    const devtoolsUrl = new Promise((resolve, reject) => {
        let buffer = '';
        proc.stderr.on('data', (chunk) => {
            buffer += chunk;
            const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
            if (match) resolve(match[1]);
        });
        proc.stderr.on('error', reject);
    });
    const browserWs = await waitFor(() => devtoolsUrl, 30000, 'Chromium DevTools');

    const httpPort = new URL(browserWs).port;
    const target = await (
        await fetch(`http://127.0.0.1:${httpPort}/json/new?about:blank`, { method: 'PUT' })
    ).json();

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve);
        ws.addEventListener('error', reject);
    });

    proc.userDataDir = userDataDir;
    proc.websocket = ws;
    return proc;
}

class Cdp {
    constructor(ws) {
        this.ws = ws;
        this.nextId = 0;
        this.pending = new Map();
        this.eventWaiters = new Map();
        ws.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.id) {
                const settle = this.pending.get(message.id);
                this.pending.delete(message.id);
                if (message.error) settle.reject(new Error(message.error.message));
                else settle.resolve(message.result);
                return;
            }
            for (const resolve of this.eventWaiters.get(message.method) ?? []) resolve(message.params);
            this.eventWaiters.delete(message.method);
        });
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.nextId;
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    waitEvent(method) {
        return new Promise((resolve) => {
            const waiters = this.eventWaiters.get(method) ?? [];
            waiters.push(resolve);
            this.eventWaiters.set(method, waiters);
        });
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

function assertPalette(page, data, palette) {
    assert.deepEqual(parseColor(data.body.backgroundColor), palette.background, `${page} background`);
    assert.deepEqual(parseColor(data.body.color), palette.text, `${page} body text`);
    if (data.paragraph)
        assert.deepEqual(parseColor(data.paragraph.color), palette.text, `${page} paragraph text`);
    if (data.link)
        assert.deepEqual(parseColor(data.link.color), palette.accent, `${page} link`);
    if (data.subtle)
        assert.deepEqual(parseColor(data.subtle.color), palette.subtle, `${page} subtle text`);
    if (data.code)
        assert.deepEqual(parseColor(data.code.backgroundColor), palette.codeBackground, `${page} code background`);
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

before(async () => {
    hugo = await startHugo();
    chrome = await startChrome();
    cdp = new Cdp(chrome.websocket);
    await cdp.send('Page.enable');
});

after(async () => {
    chrome?.kill();
    hugo?.kill();
    await Promise.allSettled([
        new Promise((resolve) => chrome?.once('exit', resolve)),
        new Promise((resolve) => hugo?.once('exit', resolve)),
    ]);
    if (chrome?.userDataDir) await fs.promises.rm(chrome.userDataDir, { recursive: true, force: true });
});

test('light preference keeps the light palette with AA contrast', async (t) => {
    await emulate('light');
    for (const page of PAGES) {
        const data = await collect(page);
        assertPalette(page, data, LIGHT);
        assertContrast(page, data, t);
    }
});

test('dark preference inverts the palette with AA contrast', async (t) => {
    await emulate('dark');
    for (const page of PAGES) {
        const data = await collect(page);
        assertPalette(page, data, DARK);
        assertContrast(page, data, t);
    }
});

test('print emulation stays light under a dark preference', async (t) => {
    await emulate('dark', 'print');
    for (const page of PAGES) {
        const data = await collect(page);
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
