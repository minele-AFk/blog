import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// All successful mutations use disposable fixtures, never the user's blog data.
const originalCwd = process.cwd();
const fixture = process.env.BLOG_SECURITY_TEST_DIR;
assert.ok(fixture && path.resolve(fixture).startsWith(path.resolve(tmpdir()) + path.sep), 'Run through npm test for isolated storage and parent cleanup');
process.chdir(fixture);
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.ADMIN_PASSWORD = randomBytes(24).toString('hex');
delete process.env.BANGUMI_TOKEN;
delete process.env.TRUSTED_CLIENT_IP_HEADER;
delete process.env.ADMIN_TOKEN;
process.env.CRON_SECRET = randomBytes(32).toString('hex');
await mkdir(path.join(fixture, 'posts'));

const auth = await import('../lib/auth');
const friends = await import('../app/api/admin/friends/route');
const friend = await import('../app/api/admin/friends/[id]/route');
const projects = await import('../app/api/admin/projects/route');
const project = await import('../app/api/admin/projects/[id]/route');
const moments = await import('../app/api/admin/moments/route');
const moment = await import('../app/api/admin/moments/[id]/route');
const posts = await import('../app/api/admin/posts/route');
const post = await import('../app/api/admin/posts/[slug]/route');
const upload = await import('../app/api/upload/route');
const gallery = await import('../app/api/admin/gallery/route');
const cron = await import('../app/api/anime/cron/route');
const sync = await import('../app/api/anime/sync/route');
const login = await import('../app/api/admin/login/route');
const music = await import('../app/api/music/route');
const animeDetail = await import('../app/api/anime/[id]/route');
const imageProxy = await import('../lib/image-proxy');
const { readJsonObject, readLimitedBody, validateFields } = await import('../lib/request-security');
const { parseFrontmatter, stringifyFrontmatter } = await import('../lib/frontmatter.mjs');
const { getLoginClientKey, allowLoginAttempt } = await import('../lib/login-rate-limit');
const token = auth.generateToken();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const req = (method: string, body?: unknown, authorized = true) => new NextRequest('https://blog.test/api/test', {
  method, headers: authorized ? headers : { 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const context = { params: Promise.resolve({ id: 'unknown', slug: 'security-fixture' }) };

after(async () => {
  process.chdir(originalCwd);
});

test('all admin mutation entry points reject anonymous requests before reading body', async () => {
  const routes = [
    ['POST', friends.POST], ['PUT', friends.PUT], ['DELETE', friends.DELETE], ['PUT', friend.PUT], ['DELETE', friend.DELETE],
    ['POST', projects.POST], ['PUT', projects.PUT], ['DELETE', projects.DELETE], ['PUT', project.PUT], ['DELETE', project.DELETE],
    ['POST', moments.POST], ['PUT', moments.PUT], ['DELETE', moments.DELETE], ['PUT', moment.PUT], ['DELETE', moment.DELETE],
    ['POST', posts.POST], ['PUT', post.PUT], ['DELETE', post.DELETE], ['POST', upload.POST], ['DELETE', gallery.DELETE], ['POST', sync.POST],
  ] as const;
  for (const [method, handler] of routes) {
    assert.equal((await handler(req(method, undefined, false), context)).status, 401, handler.name);
  }
  assert.equal((await gallery.GET(req('GET', undefined, false))).status, 401);
});

test('JWT requires admin identity, expiry and the expected algorithm', () => {
  const secret = process.env.JWT_SECRET!;
  assert.ok(auth.verifyToken(token));
  assert.equal(auth.verifyToken(jwt.sign({ userId: 'visitor' }, secret, { expiresIn: '1h' })), null);
  assert.equal(auth.verifyToken(jwt.sign({ userId: 'admin' }, secret)), null);
  assert.equal(auth.verifyToken(jwt.sign({ userId: 'admin' }, secret, { expiresIn: -1 })), null);
  assert.equal(auth.verifyToken(jwt.sign({ userId: 'admin' }, secret, { algorithm: 'HS384', expiresIn: '1h' })), null);
  assert.equal(auth.isAdminRequest(new Request('https://blog.test', { headers: { Authorization: token } })), false);
});

test('forged Cloudflare User-Agent, empty credentials and query tokens cannot authorize cron', async () => {
  for (const ua of ['Cloudflare', 'Cloudflare-Cron', 'Mozilla/5.0']) {
    const request = new Request(`https://blog.test/api/anime/cron?token=${process.env.CRON_SECRET}`, {
      method: 'POST', headers: { 'User-Agent': ua, Authorization: 'Bearer ' },
    });
    assert.equal((await cron.POST(request)).status, 401);
  }
  assert.equal((await cron.GET()).status, 405);
});

test('JSON validation rejects null, arrays, malformed JSON and over-limit chunked bodies', async () => {
  for (const raw of ['null', '[]', '{', '"string"']) {
    const request = new NextRequest('https://blog.test', { method: 'POST', headers, body: raw });
    assert.equal((await friends.POST(request)).status, 400);
  }
  assert.equal((await friends.POST(req('POST', { name: 'x'.repeat(300000) }))).status, 413);
  assert.equal((await friends.POST(new NextRequest('https://blog.test', {
    method: 'POST', headers: { Authorization: headers.Authorization, 'Content-Type': 'text/plain' }, body: '{}',
  }))).status, 415);
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({ start(controller) {
    controller.enqueue(new Uint8Array(4)); controller.enqueue(new Uint8Array(5)); controller.close();
  } });
  await assert.rejects(readLimitedBody({ headers: new Headers({ 'Content-Length': '1' }), body: stream }, 8), /请求体过大/);
  await assert.rejects(readJsonObject(new Request('https://blog.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'null' })), /JSON 对象/);
});

test('CRUD rejects executable URLs, prototype fields, ID replacement and invalid field types', async () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '//evil.test', 'https://user:pass@evil.test', 'https://safe.test\\@evil.test']) {
    assert.equal((await friends.POST(req('POST', { name: 'friend', url }))).status, 400, url);
  }
  assert.equal((await friends.POST(req('POST', { name: 'friend', url: 'https://example.com', tags: {} }))).status, 400);
  assert.equal((await friend.PUT(req('PUT', { id: 'overwrite' }), context)).status, 400);
  assert.throws(() => validateFields('moments', { images: ['data:image/svg+xml,<svg/>'] }, true));
  assert.throws(() => validateFields('projects', JSON.parse('{"__proto__":{"polluted":true}}'), true));
  assert.throws(() => validateFields('moments', { likes: -1 }, true));
});

test('normal create, read, edit, reorder and delete still work in isolated storage', async () => {
  const created = await friends.POST(req('POST', { name: '测试友链', url: 'https://example.com', tags: ['技术'] }));
  assert.equal(created.status, 201);
  const data = (await created.json()).data;
  assert.equal((await friends.GET()).status, 200);
  assert.equal((await friends.PUT(req('PUT', { id: data.id, order: 2 }))).status, 200);
  assert.equal((await friend.PUT(req('PUT', { name: '更新友链' }), { params: Promise.resolve({ id: data.id }) })).status, 200);
  assert.equal((await friends.DELETE(req('DELETE', { id: data.id }))).status, 200);
});

test('frontmatter JS is never evaluated by parse or stringify; YAML and Markdown remain intact', () => {
  const payload = '---js\n(globalThis.__frontmatterExecuted = true, {title: "bad"})\n---\nbody';
  const state = globalThis as typeof globalThis & { __frontmatterExecuted?: boolean };
  state.__frontmatterExecuted = false;
  assert.throws(() => parseFrontmatter(payload), /Only YAML/);
  const raw = stringifyFrontmatter(payload, { title: '安全标题', tags: ['技术'] });
  assert.equal(parseFrontmatter(raw).content.trim(), payload);
  assert.equal(parseFrontmatter(raw).data.title, '安全标题');
  assert.equal(state.__frontmatterExecuted, false);
  delete state.__frontmatterExecuted;
});

test('post management rejects traversal and malformed input, while normal publishing works', async () => {
  assert.equal((await posts.POST(req('POST', { slug: '../escape', title: 't', content: 'c' }))).status, 400);
  assert.equal((await posts.POST(req('POST', { slug: 'con', title: 't', content: 'c' }))).status, 400);
  assert.equal((await posts.POST(req('POST', { title: {}, content: 'c' }))).status, 400);
  const response = await posts.POST(req('POST', { slug: 'security-fixture', title: '测试文章', content: '# Hello\n内容', tags: ['测试'] }));
  assert.equal(response.status, 201);
  assert.match(await readFile(path.join(fixture, 'posts', 'security-fixture.md'), 'utf8'), /测试文章/);
  assert.equal((await post.PUT(req('PUT', { slug: 'security-fixture', title: '修改', content: '新内容' }), context)).status, 200);
  assert.equal((await post.DELETE(req('DELETE'), context)).status, 200);
});

test('SVG uploads and MIME spoofing are rejected; genuine raster uploads remain usable', async () => {
  const form = (bytes: Uint8Array | string, type: string) => {
    const data = new FormData(); data.set('file', new Blob([bytes as BlobPart], { type }), 'test');
    return new NextRequest('https://blog.test/api/upload', { method: 'POST', headers: { Authorization: headers.Authorization }, body: data });
  };
  assert.equal((await upload.POST(form('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'image/svg+xml'))).status, 400);
  assert.equal((await upload.POST(form('<html>script</html>', 'image/png'))).status, 400);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aBrkAAAAASUVORK5CYII=', 'base64');
  const response = await upload.POST(form(png, 'image/png'));
  assert.equal(response.status, 200);
  assert.match((await response.json()).url, /^\/uploads\/[-a-f0-9]+\.png$/);
});

test('image proxies normalize cache busters and reject host/protocol/path confusion', () => {
  assert.equal(imageProxy.canonicalImageUrl('https://avatars.githubusercontent.com/octocat?random=1#x', 'avatar'), imageProxy.canonicalImageUrl('https://avatars.githubusercontent.com/octocat?random=2', 'avatar'));
  for (const raw of ['http://avatars.githubusercontent.com/octocat', 'https://avatars.githubusercontent.com.evil.test/u/1', 'https://avatars.githubusercontent.com@127.0.0.1/u/1', 'https://avatars.githubusercontent.com/\\evil.test', 'https://avatars.githubusercontent.com:444/u/1']) {
    assert.equal(imageProxy.canonicalImageUrl(raw, 'avatar'), null, raw);
  }
  assert.ok(imageProxy.canonicalImageUrl('https://lain.bgm.tv/pic/cover/l/aa/bb/123_test.jpg', 'cover'));
  assert.equal(imageProxy.canonicalImageUrl('https://lain.bgm.tv/anything.php', 'cover'), null);
});

test('image proxy rejects redirects, non-images and oversized streams', async () => {
  const originalFetch = globalThis.fetch;
  const request = new Request('https://blog.test/api/avatar?u=https://avatars.githubusercontent.com/security-test');
  try {
    globalThis.fetch = async (_input, options) => {
      assert.equal(options?.redirect, 'error');
      assert.ok(options?.signal);
      return new Response('<svg><script/></svg>', { headers: { 'Content-Type': 'image/svg+xml' } });
    };
    assert.equal((await imageProxy.serveImageProxy(request, 'avatar')).status, 502);
    globalThis.fetch = async () => new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { 'Content-Type': 'image/png' } });
    assert.equal((await imageProxy.serveImageProxy(request, 'avatar')).status, 502);
    globalThis.fetch = async () => { throw new TypeError('redirect disallowed'); };
    assert.equal((await imageProxy.serveImageProxy(request, 'avatar')).status, 502);
  } finally { globalThis.fetch = originalFetch; }
});

test('public music and anime endpoints reject parameter injection before upstream access', async () => {
  for (const query of ['ids=1%26evil=1', 'ids=1&source=invalid', 'ids=' + Array(51).fill('1').join(',')]) {
    assert.equal((await music.GET(new NextRequest(`https://blog.test/api/music?${query}`))).status, 400);
  }
  assert.equal((await animeDetail.GET(req('GET'), { params: Promise.resolve({ id: '../me' }) })).status, 400);
});

test('password limits reject bcrypt truncation, normal login succeeds, forged IP cannot reset limits', async () => {
  await assert.rejects(auth.setAdminPassword('a'.repeat(73)));
  await assert.rejects(auth.setAdminPassword('your-admin-password'));
  const response = await login.POST(req('POST', { password: process.env.ADMIN_PASSWORD }, false));
  assert.equal(response.status, 200);
  assert.ok(auth.verifyToken((await response.json()).token));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  for (let i = 0; i < 4; i++) {
    const request = new NextRequest('https://blog.test', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `198.51.100.${i}` }, body: '{"password":"wrong"}' });
    assert.equal(getLoginClientKey(request), 'untrusted-proxy');
    assert.equal((await login.POST(request)).status, 401);
  }
  assert.equal((await login.POST(req('POST', { password: 'wrong' }, false))).status, 429);
  assert.equal(await allowLoginAttempt(req('POST'), Date.now() + 16 * 60 * 1000), true);
});
