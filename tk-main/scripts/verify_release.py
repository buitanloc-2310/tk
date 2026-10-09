#!/usr/bin/env python3
from pathlib import Path
import sqlite3, tempfile, glob, re, subprocess, json, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]

def ok(name): print('[OK]',name)
def fail(name,msg): errors.append(f'{name}: {msg}'); print('[FAIL]',name,msg)

required=['public/index.html','public/app.js','public/styles.css','public/sfn-logo.png','src/index.js','src/local-qr.js','src/qr-code/index.js','src/qr-code/LICENSE.txt','wrangler.jsonc','migrations/0008_account_request_profile.sql','migrations/0014_independent_verification_qr.sql']
for x in required:
    if (ROOT/x).exists(): ok('file '+x)
    else: fail('file '+x,'missing')

for x in ['public/app.js','src/index.js','src/local-qr.js','src/qr-code/index.js']:
    r=subprocess.run(['node','--check',str(ROOT/x)],capture_output=True,text=True)
    if r.returncode==0: ok('syntax '+x)
    else: fail('syntax '+x,r.stderr.strip())

try:
    cfg=json.loads((ROOT/'wrangler.jsonc').read_text())
    assert cfg['name']=='tk'
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


# V4 contract checks for regressions reported in production.
v4_checks={
 'self profile PATCH merges stored data':"const current=await env.DB.prepare('SELECT * FROM people WHERE id=?')",
 'profile image remains optional on edit':"Không chọn ảnh mới = giữ nguyên ảnh cũ",
 'evaluation schema fallback':'async function ensureEvaluations(env)',
 'evaluation admin route':'evaluationMatch',
 'evaluation member endpoint':"/api/me/evaluations",
 'card public verification avatar':'p.avatar_url',
}
for name,marker in v4_checks.items():
    if marker in back: ok(name)
    else: fail(name,'marker missing')

v4_front_checks={
 'admin evaluation tab':"evaluation:'Đánh giá'",
 'member evaluation view':"Đánh giá của tôi",
 'member card photo':'Ảnh ${esc(p.full_name)}',
 'member card QR':'cardQrSrc(x,170)',
 'member card verify action':'data-card-verify',
 'member card print/PDF action':'data-card-print',
 'card print photo':'class="photo"',
 'card print QR':'class="qr"',
}
for name,marker in v4_front_checks.items():
    if marker in front: ok(name)
    else: fail(name,'marker missing')

index=(ROOT/'public/index.html').read_text()
if 'v=20261009-member-v6-independent-qr-1' in index: ok('cache busting current release')
else: fail('cache busting','index does not force current release assets')

# Locked member-card copy must be enforced in both client and Worker API.
locked_copy = ['HIỆU LỰC & HƯỚNG DẪN SỬ DỤNG','THỜI HẠN SỬ DỤNG','Có giá trị trong thời hạn ghi trên thẻ và theo trạng thái xác minh của hệ thống.','HƯỚNG DẪN SỬ DỤNG','Xuất trình thẻ khi cần xác nhận tư cách thành viên hoặc người tham gia chương trình.','Sử dụng mã QR ở mặt trước để kiểm tra thông tin và trạng thái thẻ.','Không cho mượn, chuyển nhượng hoặc sử dụng thẻ thay cho người khác.','LƯU Ý','Thẻ chỉ có giá trị xác minh thông qua mã QR ở mặt trước. Thẻ không còn giá trị sử dụng khi hệ thống xác minh thông báo thẻ đã bị hủy.','Sky First Network · Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First']
if all(x in front and x in back for x in locked_copy): ok('locked back-of-card copy')
else: fail('locked back-of-card copy','canonical copy missing from client or API')
if 'lockedCardBackElements(requestedOrientation)' in back and 'LOCKED_CARD_BACK_IDS.has(x.id)' in back: ok('back-card content enforced server-side')
else: fail('back-card content enforcement','API does not replace user-supplied fixed text')
if 'canvas.toBlob' in front and 'toDataURL(' not in front: ok('PDF rasterization uses Blob, not data URL')
else: fail('PDF rasterization','legacy canvas data URL remains')
if 'data-nav-toggle' in front and 'savedNavScroll' in front and 'nav-section-toggle' in (ROOT/'public/styles.css').read_text(): ok('collapsible navigation and scroll preservation')
else: fail('navigation usability','accordion or scroll preservation missing')
if "locked?'disabled aria-label=\"Nội dung cố định\"'" in front and "LOCKED_CARD_BACK_IDS.has(arr[idx]?.id)" in front: ok('fixed card-back editor controls are disabled')
else: fail('fixed card-back editor controls','locked copy can be edited or dragged in the designer')
if all("['footer','Sky First Network · Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First',6,true" in x for x in (front,back)): ok('footer fits single line at physical card size')
else: fail('card footer layout','frontend and API footer sizes should match and fit print width')

verify=(ROOT/'public/verify.html').read_text()
for marker,name in [('avatar_url','verify page member photo'),('THẺ KHÔNG CÒN HIỆU LỰC','verify invalid-card warning'),('x.status===\'pending\'','future-date pending verify warning')]:
    if marker in verify: ok(name)
    else: fail(name,'missing')

# Independent QR flow for externally designed cards.
for marker,name in [
    ('import { generateQrPng }','local QR generator is integrated'),
    ('verification_qr_records','independent QR storage'),
    ("url.pathname==='/api/admin/verification-qr'",'independent QR admin API'),
    ("type:'verification_qr'",'independent QR verification type'),
    ('/api/admin/issuance-overview','real issuance overview API'),
    ('/api/admin/member-cards','member card management list API'),
    ("url.pathname==='/api/admin/card-designs'&&['GET','POST'].includes(req.method)",'create and list reusable card templates'),
    ('data-issuance-tab=\"qr\"','independent QR admin tab'),
    ('Tải QR PNG','QR PNG download action'),
    ('async function downloadQrPng(tokenValue,fileName)','validates the QR image before download'),
    ('Tạo QR xác minh độc lập','independent QR instructions'),
]:
    if marker in front+back+verify: ok(name)
    else: fail(name,'marker missing')
if 'data-add-el=\"logo\"' in front: fail('logo-free designer','logo add control remains')
else: ok('logo-free designer controls')
if "x.photo_url||'/sfn-logo.png'" in front or "t.logo_url||'/sfn-logo.png'" in front: fail('no default logo fallback in card design/export','logo remains as card image fallback')
else: ok('no default logo fallback in card design/export')
if "e.kind==='photo'?'Ảnh bắt buộc'" in front or "frontElements.some(x=>x.kind==='photo')" in back: fail('optional member photo','photo is forced by the card UI or API')
else: ok('member photo is optional and removable')
if "font:['Arial','Verdana','Georgia','Tahoma'].includes(x.font)?x.font:'Arial'" in back and "['Arial','Verdana','Georgia','Tahoma'].includes(e.font)" in front: ok('allowlisted card font support in API and exports')
else: fail('card font support','font allowlist missing from API or renderer')
if "LOGO_UPLOAD_REMOVED" in back and "['text','photo','qr','shape']" in back: ok('logo-free design API')
else: fail('logo-free design API','server still accepts logo elements or upload')

# 2026-10-09 hardening and card-export contract.
for marker,name in [
    ('async function downloadCardPdf(x,t)','direct PDF generator'),
    ('function autoLayoutCard(t,orientation)','portrait/landscape auto-layout'),
    ('data-cs-font','card text font control'),
    ('data-cs-align','card text alignment control'),
    ('data-cs-bold','card text bold control'),
    ('/MediaBox [0 0 ${w.toFixed(4)} ${h.toFixed(4)}]','physical PDF page dimensions'),
    ('PASSWORD_CHANGE_REQUIRED','forced password-change backend gate'),
    ('EMAIL_CHANGE_REQUIRES_VERIFICATION','verified-email change guard'),
    ('TOO_MANY_VERIFY_ATTEMPTS','public verification throttling'),
    ("url.pathname==='/api/public/card-qr'",'same-origin QR endpoint avoids browser CORS'),
    ('REQUEST_RATE_LIMITED','public account-request throttling'),
    ('WHERE c.verify_token=?','opaque member-card verification token'),
    ('bodyJson(req):{}','evaluation request parser')]:
    if marker in front+back: ok(name)
    else: fail(name,'marker missing')
for marker,name in [
    ('data-card-png','no card PNG export control'),
    ('data-card-jpg','no card JPG export control'),
    ('data-card-download','no card SVG export control'),
    ('downloadCardImage(','no legacy raster export handler'),
    ('downloadCardSvg(','no legacy SVG download handler')]:
    if marker in front: fail(name,'legacy user-facing/export code remains')
    else: ok(name)

if errors:
    print('\nRELEASE CHECK FAILED:',len(errors),'issue(s)')
    for e in errors: print('-',e)
    sys.exit(1)
print('\nRELEASE CHECK PASSED')
