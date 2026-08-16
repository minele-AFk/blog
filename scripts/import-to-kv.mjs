// 数据导入脚本：把本地 data/*.json 导入 Cloudflare KV
// 背景：Workers 无持久磁盘，data/*.json（moments/projects/friends/admin/anime）需要迁移到 KV
// 用法：
//   node scripts/import-to-kv.mjs                 # 从环境变量 CLOUDFLARE_API_TOKEN 读取 token
//   node scripts/import-to-kv.mjs --token=xxx      # 或直接传 token
// 前置：已创建 KV namespace（id 见下方 NAMESPACE_ID，与 wrangler.jsonc 一致）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');

// 与 wrangler.jsonc 中 kv_namespaces 配置保持一致
const ACCOUNT_ID = 'd27cecec1a81810d06627ed7b39e3f55';
const NAMESPACE_ID = '5f9c97b54cb740658dd8089ee897978a';
const API = 'https://api.cloudflare.com/client/v4';

// 需要导入的 data 文件（key 前缀 data: 与 lib/json-store.ts / lib/auth.ts / lib/kazumi.ts 一致）
// 排除：music-cache.json / anime-detail-cache.json（运行时缓存，无需迁移）
const FILES = ['admin.json', 'friends.json', 'moments.json', 'projects.json', 'anime.json'];

const token =
  process.env.CLOUDFLARE_API_TOKEN ||
  process.argv.find((a) => a.startsWith('--token='))?.split('=')[1];

if (!token) {
  console.error('缺少 Cloudflare API Token：请设置 CLOUDFLARE_API_TOKEN 环境变量或使用 --token=xxx');
  process.exit(1);
}

async function putKv(key, value) {
  const res = await fetch(
    `${API}/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/${encodeURIComponent(key)}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: value,
    }
  );
  if (!res.ok) {
    throw new Error(`写入 ${key} 失败: ${res.status} ${await res.text()}`);
  }
  console.log(`✓ ${key}`);
}

for (const f of FILES) {
  const filePath = path.join(dataDir, f);
  if (!fs.existsSync(filePath)) {
    console.log(`- 跳过 ${f}（本地不存在）`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  await putKv(`data:${f}`, content);
}

console.log('✅ 导入完成');
