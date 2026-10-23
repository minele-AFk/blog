import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// tsx/esbuild may hold a Windows working-directory handle until the test process
// exits. Own and remove fixtures in the parent, after that process has closed.
const fixture = mkdtempSync(path.join(tmpdir(), 'blog-security-'));
try {
  const tests = readdirSync('tests').filter((name) => name.endsWith('.test.mts')).map((name) => path.join('tests', name));
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...tests], {
    stdio: 'inherit', env: { ...process.env, BLOG_SECURITY_TEST_DIR: fixture },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  const resolved = path.resolve(fixture);
  if (!resolved.startsWith(path.resolve(tmpdir()) + path.sep)) throw new Error('Unsafe test cleanup path');
  rmSync(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
