import { NextResponse } from 'next/server';

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// Enforce the limit while streaming, including requests without Content-Length.
export async function readLimitedBody(request: Pick<Request, 'headers' | 'body'>, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw new RequestError('请求体过大', 413);
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestError('请求体过大', 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

export async function readJsonObject(request: Request, maxBytes = 256 * 1024): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new RequestError('请使用 application/json', 415);
  }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(await readLimitedBody(request, maxBytes))); }
  catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError('请求体格式错误');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('请求体必须是 JSON 对象');
  return body as Record<string, unknown>;
}

export function withApiErrors<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try { return await handler(...args); }
    catch (error) {
      if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error('API request failed');
      return NextResponse.json({ error: '服务器处理请求失败' }, { status: 500 });
    }
  };
}

export function text(value: unknown, max = 2000, required = false): string {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new RequestError('文本字段类型、长度或内容不合法');
  return value;
}

export function safeUrl(value: unknown, allowLocal = false): string {
  const raw = text(value, 2048);
  if (!raw) return '';
  if (/[\u0000-\u0020\u007f\\]/.test(raw)) throw new RequestError('链接地址不合法');
  if (allowLocal && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error();
    return raw;
  } catch { throw new RequestError('链接仅支持 HTTP/HTTPS 地址'); }
}

const stringList = (value: unknown, maxItems: number, item: (value: unknown) => string): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw new RequestError('列表字段不合法');
  return value.map(item);
};
const count = (value: unknown): number => {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new RequestError('数量字段不合法');
  return value;
};
const fields = {
  friends: { name: (v: unknown) => text(v, 200, true), url: (v: unknown) => { const url = safeUrl(v); if (!url) throw new RequestError('链接不能为空'); return url; }, avatar: (v: unknown) => safeUrl(v, true), description: (v: unknown) => text(v), tags: (v: unknown) => stringList(v, 30, (s) => text(s, 100)), order: count },
  projects: { name: (v: unknown) => text(v, 200, true), description: (v: unknown) => text(v, 10000, true), tags: (v: unknown) => stringList(v, 30, (s) => text(s, 100)), date: (v: unknown) => text(v ?? new Date().getFullYear().toString(), 100), github: (v: unknown) => safeUrl(v), demo: (v: unknown) => safeUrl(v), icon: (v: unknown) => text(v ?? '✨', 100), cover: (v: unknown) => safeUrl(v, true), order: count },
  moments: { content: (v: unknown) => text(v, 50000, true), date: (v: unknown) => text(v ?? new Date().toISOString().split('T')[0], 100), likes: count, comments: count, images: (v: unknown) => stringList(v, 9, (s) => safeUrl(s, true)), order: count },
  posts: { title: (v: unknown) => text(v, 300, true), excerpt: (v: unknown) => text(v, 5000), content: (v: unknown) => text(v, 200000, true), date: (v: unknown) => text(v ?? new Date().toISOString().split('T')[0], 100), tags: (v: unknown) => stringList(v, 30, (s) => text(s, 100)), category: (v: unknown) => text(v ?? '其他', 200), author: (v: unknown) => text(v ?? '管理员', 200), coverImage: (v: unknown) => safeUrl(v, true) },
};
type Kind = keyof typeof fields;
type Parsed<K extends Kind> = { [P in keyof typeof fields[K]]: typeof fields[K][P] extends (value: unknown) => infer R ? R : never };

export function validateFields<K extends Kind>(kind: K, body: Record<string, unknown>, partial: true): Partial<Parsed<K>>;
export function validateFields<K extends Kind>(kind: K, body: Record<string, unknown>, partial?: false): Parsed<K>;
export function validateFields(kind: Kind, body: Record<string, unknown>, partial = false) {
  const schema: Record<string, (value: unknown) => unknown> = fields[kind];
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (!Object.hasOwn(schema, key)) throw new RequestError(`不支持的字段：${key}`);
  }
  for (const [key, parse] of Object.entries(schema)) {
    if (!partial || Object.hasOwn(body, key)) result[key] = parse(body[key]);
  }
  return result;
}
