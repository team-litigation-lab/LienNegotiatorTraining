// Local stand-in for Cloudflare: serves the site through worker.js with an
// in-memory KV store, so the smoke test runs without an account.
// Usage: node .github/scripts/server.mjs [port]   (run from the repository root)
// MASTER_ADMIN_PASSWORD and PORTAL_SSO_SECRET are passed through from the shell when set (secure mode, single sign-on).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PORT = Number(process.argv[2] || process.env.PORT || 8787);
const worker = (await import(pathToFileURL(path.join(ROOT, 'worker.js')).href)).default;
const store = new Map();
const KV = {
    get: async (k) => (store.has(k) ? store.get(k) : null),
    put: async (k, v) => { store.set(k, String(v)); },
    delete: async (k) => { store.delete(k); },
    list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true })
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.pdf': 'application/pdf', '.png': 'image/png', '.svg': 'image/svg+xml' };
const ASSETS = {
    fetch: async (req) => {
        let p = decodeURIComponent(new URL(req.url).pathname);
        if (p.endsWith('/')) p += 'index.html';
        const f = path.join(ROOT, p);
        if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return new Response('Not found', { status: 404 });
        return new Response(fs.readFileSync(f), { headers: { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' } });
    }
};
const env = { LSH_KV: KV, ASSETS, SESSION_SECRET: 'ci-only-secret' };
for (const k of ['MASTER_ADMIN_PASSWORD', 'PORTAL_SSO_SECRET']) if (process.env[k]) env[k] = process.env[k];
http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    try {
        const out = await worker.fetch(r, env, { waitUntil() {} });
        res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
    } catch (e) { res.writeHead(500); res.end(String(e && e.stack || e)); }
}).listen(PORT, () => console.log(`listening on ${PORT}`));
