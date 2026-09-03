#!/usr/bin/env python3
from pathlib import Path
import sqlite3, tempfile, glob, re, subprocess, json, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]

def ok(name): print('[OK]',name)
def fail(name,msg): errors.append(f'{name}: {msg}'); print('[FAIL]',name,msg)

required=['public/index.html','public/app.js','public/styles.css','public/sfn-logo.png','src/index.js','wrangler.jsonc','migrations/0008_account_request_profile.sql']
for x in required:
    if (ROOT/x).exists(): ok('file '+x)
    else: fail('file '+x,'missing')

for x in ['public/app.js','src/index.js']:
    r=subprocess.run(['node','--check',str(ROOT/x)],capture_output=True,text=True)
    if r.returncode==0: ok('syntax '+x)
    else: fail('syntax '+x,r.stderr.strip())

try:
    cfg=json.loads((ROOT/'wrangler.jsonc').read_text())
    assert cfg['name']=='sfn-member-portal'
    assert cfg['d1_databases'][0]['binding']=='DB'
    assert cfg['d1_databases'][0]['database_name']=='tk'
    assert cfg['d1_databases'][0]['database_id']=='ff630699-cc44-471d-9507-aa94c84468fb'
    assert cfg['r2_buckets'][0]['binding']=='FILES' and cfg['r2_buckets'][0]['bucket_name']=='tksfn'
    ok('Cloudflare bindings')
except Exception as e: fail('Cloudflare bindings',str(e))

# Apply all migrations into a blank SQLite database.
try:
    con=sqlite3.connect(':memory:')
    con.execute('PRAGMA foreign_keys=ON')
    for f in sorted((ROOT/'migrations').glob('*.sql')):
        con.executescript(f.read_text())
    ok('migrations apply from blank schema')
except Exception as e:
    fail('migrations',str(e)); con=None

# Validate every static SQL template prepared by the Worker against the migrated schema.
if con:
    src=(ROOT/'src/index.js').read_text()
    n=0
    for m in re.finditer(r'env\.DB\.prepare\(`(.*?)`\)',src,re.S):
        q=m.group(1).strip()
        if '${' in q: continue
        n+=1
        try: con.execute('EXPLAIN '+q,[None]*q.count('?'))
        except Exception as e:
            line=src[:m.start()].count('\n')+1
            fail('SQL prepare',f'line {line}: {e}')
    if not any(x.startswith('SQL prepare:') for x in errors): ok(f'{n} static SQL statements')

front=(ROOT/'public/app.js').read_text(); back=(ROOT/'src/index.js').read_text()
checks={
 'member CV endpoint':"/api/me/cv",
 'member history endpoint':"/api/me/history",
 'member cards endpoint':"/api/me/cards",
 'membership lifecycle':"membershipActionMatch",
 'record lifecycle':"recordActionMatch",
 'certificate review':"certReviewMatch",
 'account-request profile companion':"account_request_profiles",
 'PBKDF2 100000':"const it=100000"
}
for name,marker in checks.items():
    if marker in back: ok(name)
    else: fail(name,'backend marker missing')

if '/api/me/profile' in front: fail('profile API compatibility','obsolete /api/me/profile call remains')
else: ok('profile API compatibility')

for route in ['/api/me/cv','/api/me/history','/api/me/cards']:
    if route in front and route in back: ok('route '+route)
    else: fail('route '+route,'frontend/backend mismatch')

if '60 phút đến 48 giờ' in front and '60 phút đến 48 giờ' in back: ok('account review SLA text')
else: fail('account review SLA text','expected wording missing')

if errors:
    print('\nRELEASE CHECK FAILED:',len(errors),'issue(s)')
    for e in errors: print('-',e)
    sys.exit(1)
print('\nRELEASE CHECK PASSED')
