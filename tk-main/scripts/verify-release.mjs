import { spawnSync } from 'node:child_process';
const r = spawnSync('python3', ['scripts/verify_release.py'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
