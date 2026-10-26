import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {spawnSync, spawn} from 'node:child_process';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import readline from 'node:readline';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// If python3 is available and verify_release.py exists, run it first; otherwise run native Node verification.
const pyCheck = spawnSync('python3', ['--version'], {encoding: 'utf8'});
if (pyCheck.status === 0 && existsSync(join(ROOT, 'scripts/verify_release.py'))) {
  const res = spawnSync('python3', [join(ROOT, 'scripts/verify_release.py')], {cwd: ROOT, stdio: 'inherit'});
  process.exit(res.status ?? 0);
}

// Pure Node.js fallback (for Windows or Cloudflare/Node containers without python3)
let errors = [];
const ok = (name) => console.log('[OK]', name);
const fail = (name, msg) => { errors.push(`${name}: ${msg}`); console.log('[FAIL]', name, msg); };

const required = [
  'migrations/0017_skyfirst_operations_center_p1_p7.sql','public/index.html','public/app.js','public/brand.js',
  'public/styles.css','public/sfn-logo.png','src/index.js','src/local-qr.js','src/qr-code/index.js',
  'src/qr-code/LICENSE.txt','wrangler.jsonc','migrations/0008_account_request_profile.sql',
  'migrations/0014_independent_verification_qr.sql','migrations/0015_people_work_profile.sql',
  'migrations/0016_schema_health_baseline.sql','REMEDIATION_REPORT_2026-10-09_V11.md'
];
for (const x of required) {
  if (existsSync(join(ROOT, x))) ok('file ' + x);
  else fail('file ' + x, 'missing');
}

for (const x of ['public/app.js','public/brand.js','src/index.js','src/local-qr.js','src/qr-code/index.js']) {
  const r = spawnSync(process.execPath, ['--check', join(ROOT, x)], {encoding: 'utf8'});
  if (r.status === 0) ok('syntax ' + x);
  else fail('syntax ' + x, (r.stderr || '').trim());
}

try {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'wrangler.jsonc'), 'utf8'));
  if (cfg.name !== 'tk') throw new Error('worker name must be tk');
  if (cfg.d1_databases?.[0]?.binding !== 'DB' || cfg.d1_databases?.[0]?.database_name !== 'tk' || cfg.d1_databases?.[0]?.database_id !== 'ff630699-cc44-471d-9507-aa94c84468fb') throw new Error('D1 binding mismatch');
  if (cfg.r2_buckets?.[0]?.binding !== 'FILES' || cfg.r2_buckets?.[0]?.bucket_name !== 'tksfn') throw new Error('R2 binding mismatch');
  ok('Cloudflare bindings');
} catch (e) {
  fail('Cloudflare bindings', e.message);
}

let nativeSqlite = null;
try { nativeSqlite = await import('node:sqlite'); } catch {}
if (nativeSqlite?.DatabaseSync) {
  try {
    const db = new nativeSqlite.DatabaseSync(':memory:');
    const migs = readdirSync(join(ROOT, 'migrations')).filter(f => f.endsWith('.sql')).sort();
    for (const f of migs) db.exec(readFileSync(join(ROOT, 'migrations', f), 'utf8'));
    ok('migrations apply from blank schema');
    const src = readFileSync(join(ROOT, 'src/index.js'), 'utf8');
    const re = /env\.DB\.prepare\(`([\s\S]*?)`\)/g;
    let m, n = 0;
    while ((m = re.exec(src)) !== null) {
      const q = m[1].trim();
      if (q.includes('${')) continue;
      n++;
      try { db.prepare('EXPLAIN ' + q); } catch (e) { fail('SQL prepare', e.message); }
    }
    ok(`${n} static SQL statements`);
  } catch (e) {
    fail('migrations', e.message);
  }
}

if (errors.length) {
  console.log('\nRELEASE CHECK FAILED:', errors.length, 'issue(s)');
  process.exit(1);
}
console.log('\nRELEASE CHECK PASSED');
