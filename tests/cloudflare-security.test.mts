import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { randomBytes } from 'node:crypto';

// Mock bindings exercise Workers branches without any remote KV/R2 writes.
const key = Symbol.for('__cloudflare-context__');
const globals = globalThis as typeof globalThis & { [key: symbol]: unknown };
const data = new Map<string, string>();
let rateAllowed = true;
let lastRateKey = '';
let lastTtl: number | undefined;
const env: Record<string, unknown> = {
  LOGIN_RATE_LIMITER: { async limit({ key }: { key: string }) { lastRateKey = key; return { success: rateAllowed }; } },
  BLOG_DATA: {
    async get(key: string) { return data.get(key) ?? null; },
    async put(key: string, value: string, options?: { expirationTtl?: number }) { data.set(key, value); lastTtl = options?.expirationTtl; },
  },
};
const backgroundTasks: Promise<unknown>[] = [];
globals[key] = { env, ctx: { waitUntil(task: Promise<unknown>) { backgroundTasks.push(task); } } };
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.BANGUMI_TOKEN = randomBytes(24).toString('hex');
const storage = await import('../lib/storage');
const limiter = await import('../lib/login-rate-limit');
const auth = await import('../lib/auth');
const upload = await import('../app/api/upload/route');
const kazumi = await import('../lib/kazumi');
after(() => { delete globals[key]; });

test('Workers trusts only edge IP and checks the shared rate binding; missing binding fails closed', async () => {
  const request = new Request('https://blog.test', { headers: { 'CF-Connecting-IP': '198.51.100.20', 'X-Forwarded-For': '203.0.113.9' } });
  assert.equal(storage.isCloudflare(), true);
  assert.equal(limiter.getLoginClientKey(request), '198.51.100.20');
  assert.equal(await limiter.allowLoginAttempt(request), true);
  assert.equal(lastRateKey, 'admin-login:198.51.100.20');
  rateAllowed = false;
  assert.equal(await limiter.allowLoginAttempt(request), false);
  const binding = env.LOGIN_RATE_LIMITER;
  delete env.LOGIN_RATE_LIMITER;
  assert.equal(await limiter.allowLoginAttempt(request), false);
  env.LOGIN_RATE_LIMITER = binding;
});

test('Workers image cache forwards expiration and preserves UTF-8 values', async () => {
  await storage.kvSetRaw('cover:test', '中文图片元数据', { expirationTtl: 604800 });
  assert.equal(lastTtl, 604800);
  assert.equal(await storage.kvGetRaw('cover:test'), '中文图片元数据');
});

test('Workers upload checks the R2 storage quota before writing', async () => {
  let writes = 0;
  env.BLOG_UPLOADS = {
    async list() { return { objects: Array.from({ length: 500 }, (_, i) => ({ key: `${i}.png`, size: 100 })), truncated: false }; },
    async put() { writes++; },
  };
  const form = new FormData();
  form.set('file', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'test.png');
  const request = new Request('https://blog.test/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${auth.generateToken()}` }, body: form });
  const response = await upload.POST(request as Parameters<typeof upload.POST>[0]);
  assert.equal(response.status, 400);
  assert.equal(writes, 0);
});

test('Workers background tasks are registered with waitUntil', async () => {
  const task = Promise.resolve('sync result');
  storage.runInBackground(task);
  assert.equal(backgroundTasks.at(-1), task);
  await task;
});

test('Bangumi sync uses edge-compatible manual redirects and keeps credentials on the official origin', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async (input, options) => {
      assert.equal(options?.redirect, 'manual');
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://api.bgm.tv');
      assert.equal(new Headers(options?.headers).get('authorization'), `Bearer ${process.env.BANGUMI_TOKEN}`);
      calls++;
      if (url.pathname === '/v0/me') return Response.json({ username: 'security-test' });
      return Response.json({ total: 1, data: [{ subject_id: Number(url.searchParams.get('type')), subject: { name: '测试动画' } }] });
    };
    const result = await kazumi.syncFromKazumi();
    assert.equal(result.length, 5);
    assert.equal(calls, 6);
    assert.equal((await kazumi.getCacheStatus()).expired, false);
  } finally { globalThis.fetch = originalFetch; }
});

test('Bangumi redirect responses never forward the token or replace the last successful cache', async () => {
  const originalFetch = globalThis.fetch;
  const previous = await storage.kvGetJson('data:anime.json');
  let calls = 0;
  try {
    globalThis.fetch = async (_input, options) => {
      assert.equal(options?.redirect, 'manual');
      calls++;
      return new Response(null, { status: 302, headers: { Location: 'https://untrusted.invalid/private' } });
    };
    await assert.rejects(kazumi.syncFromKazumi(), /重定向/);
    assert.equal(calls, 1);
    assert.deepEqual(await storage.kvGetJson('data:anime.json'), previous);
  } finally { globalThis.fetch = originalFetch; }
});
