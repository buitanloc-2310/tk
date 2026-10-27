import { spawnSync } from 'node:child_process';
const files = ['src/index.js', 'src/local-qr.js', 'src/qr-code/index.js', 'public/app.js', 'public/brand.js'];
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}
console.log('[OK] Syntax check passed for all JS entrypoints.');
