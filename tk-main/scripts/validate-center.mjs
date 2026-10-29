import worker from '../src/index.js';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash, webcrypto} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import readline from 'node:readline';

if(!globalThis.crypto)globalThis.crypto=webcrypto;

// Dual-engine SQLite harness: uses built-in node:sqlite on Node >= 22.13, or persistent in-memory Python sqlite3 process on Node 18/20.
let dbExec, dbGet, dbAll, dbRun, dbBatch, closeDb=()=>{};
let nativeSqlite=null;
try{nativeSqlite=await import('node:sqlite')}catch{}
if(nativeSqlite?.DatabaseSync){
  const rawDb=new nativeSqlite.DatabaseSync(':memory:');
  const stmtCache=new Map();
  const getStmt=(sql)=>{let s=stmtCache.get(sql);if(!s){s=rawDb.prepare(sql);stmtCache.set(sql,s)}return s};
  const normArgs=a=>a.map(x=>x===undefined?null:typeof x==='boolean'?(x?1:0):x);
  dbExec=async(sql)=>{stmtCache.clear();return rawDb.exec(sql)};
  dbGet=async(sql,...args)=>{const r=getStmt(sql).get(...normArgs(args));return r?{...r}:null;};
  dbAll=async(sql,...args)=>getStmt(sql).all(...normArgs(args)).map(r=>({...r}));
  dbRun=async(sql,...args)=>getStmt(sql).run(...normArgs(args));
  dbBatch=async(items)=>items.map(x=>getStmt(x.__sql).run(...normArgs(x.__args)));
}else{
  const proc=spawn('python3',['-u','-c',`
import sqlite3, sys, json
con = sqlite3.connect(':memory:')
con.row_factory = sqlite3.Row
for line in sys.stdin:
    req = json.loads(line)
    op = req['op']
    sql = req.get('sql', '')
    args = req.get('args', [])
    try:
        if op == 'exec':
            con.executescript(sql)
            con.commit()
            print(json.dumps({'ok': True}), flush=True)
        elif op == 'get':
            cur = con.execute(sql, args)
            row = cur.fetchone()
            print(json.dumps({'ok': True, 'data': dict(row) if row else None}), flush=True)
        elif op == 'all':
            cur = con.execute(sql, args)
            rows = [dict(r) for r in cur.fetchall()]
            print(json.dumps({'ok': True, 'data': rows}), flush=True)
        elif op == 'run':
            cur = con.execute(sql, args)
            con.commit()
            print(json.dumps({'ok': True, 'changes': cur.rowcount, 'lastInsertRowid': cur.lastrowid}), flush=True)
        elif op == 'batch':
            out = []
            for item in req.get('items', []):
                cur = con.execute(item['sql'], item.get('args', []))
                out.append({'changes': cur.rowcount, 'lastInsertRowid': cur.lastrowid})
            con.commit()
            print(json.dumps({'ok': True, 'results': out}), flush=True)
    except Exception as e:
        print(json.dumps({'ok': False, 'error': str(e)}), flush=True)
`]);
  const rl=readline.createInterface({input:proc.stdout});
  const queue=[];
  rl.on('line',line=>{const cb=queue.shift();if(cb)cb(JSON.parse(line));});
  const send=(payload)=>new Promise((resolve,reject)=>{
    queue.push(res=>res.ok?resolve(res):reject(new Error(res.error)));
    proc.stdin.write(JSON.stringify(payload)+'\n');
  });
  closeDb=()=>{try{proc.kill()}catch{}};
  dbExec=async(sql)=>{await send({op:'exec',sql})};
  dbGet=async(sql,...args)=>(await send({op:'get',sql,args:args.map(x=>x===undefined?null:x)})).data;
  dbAll=async(sql,...args)=>(await send({op:'all',sql,args:args.map(x=>x===undefined?null:x)})).data;
  dbRun=async(sql,...args)=>await send({op:'run',sql,args:args.map(x=>x===undefined?null:x)});
  dbBatch=async(items)=>(await send({op:'batch',items:items.map(x=>({sql:x.__sql,args:x.__args.map(v=>v===undefined?null:v)}))})).results;
}

const migFiles=[...new Set([...readdirSync('migrations').filter(x=>x.endsWith('.sql')),...(existsSync('migrations/0017_skyfirst_operations_center_p1_p7.sql')?['0017_skyfirst_operations_center_p1_p7.sql']:[])])].sort();
for(const f of migFiles)await dbExec(readFileSync('migrations/'+f,'utf8'));

const DB={prepare(sql){let args=[];const q={__sql:sql,__args:args,bind(...a){args=a;q.__args=a;return q},async first(){return await dbGet(sql,...args)},async all(){return {results:await dbAll(sql,...args)}},async run(){return await dbRun(sql,...args)}};return q},async batch(q){return await dbBatch(q)}};

await dbExec(`INSERT INTO people(id,member_code,full_name) VALUES('p','T','Test'); INSERT INTO accounts(id,person_id,username,password_hash,password_salt,force_password_change) VALUES('a','p','test','x','x',0); INSERT INTO account_scopes(id,account_id,role_id,org_node_id) VALUES('scope','a','role_super_admin','org_sfn');`);
await dbRun("INSERT INTO sessions(id,account_id,token_hash,expires_at) VALUES('s','a',?,datetime('now','+1 day'))",createHash('sha256').update('test').digest('hex'));
const src=readFileSync('src/index.js','utf8');const {default:Worker,api}=await import('../src/index.js');
let checks=0;async function call(path,method='GET',b,env={DB}){const req=new Request('https://nghiepvu.skyfirst.io.vn'+path,{method,headers:{cookie:'sfn_session=test','content-type':'application/json',origin:'https://nghiepvu.skyfirst.io.vn'},body:b?JSON.stringify(b):undefined});const r=await api(req,env,new URL(req.url));const j=await r.json();return {httpStatus:r.status,status:r.status,...j}}

// 1. Existing Organization & RBAC checks (84 baseline checks)
let r=await call('/api/admin/org','POST',{code:'SF-DMC',name:'Wrong',node_type:'digital_member_center'});assert.equal(r.status,200);const id=r.id;assert.equal((await dbGet('SELECT name FROM org_nodes WHERE id=?',id)).name,'Trung tâm Nghiệp vụ Số Sky First');checks++;
assert.equal((await call('/api/admin/org','POST',{code:'sf-dmc',name:'Duplicate'})).status,409);checks++;
assert.equal((await call('/api/admin/org/'+id,'PATCH',{parent_id:id})).error,'ORG_CYCLE_FORBIDDEN');checks++;
r=await call('/api/admin/org','POST',{code:'CHILD',name:'Child',parent_id:id});assert.equal(r.status,200);assert.equal((await call('/api/admin/org/'+id,'PATCH',{parent_id:r.id})).error,'ORG_CYCLE_FORBIDDEN');checks++;
assert.equal((await call('/api/admin/org/org_sfn','PATCH',{parent_id:id})).error,'ROOT_PARENT_FORBIDDEN');checks++;
assert.equal((await call('/api/admin/org','POST',{code:'INVALID',name:'X',parent_id:'missing'})).status,400);checks++;
assert.equal((await call('/api/admin/org','POST',{code:'SORT',name:'X',sort_order:'bad'})).error,'INVALID_SORT_ORDER');checks++;
assert.equal((await call('/api/admin/org/'+id,'PATCH',{name:'Changed'})).status,200);assert.equal((await dbGet('SELECT name FROM org_nodes WHERE id=?',id)).name,'Trung tâm Nghiệp vụ Số Sky First');checks++;
await dbExec("UPDATE account_scopes SET role_id='role_scope_admin',org_node_id='org_office'; INSERT OR IGNORE INTO role_permissions(role_id,permission_id) SELECT 'role_scope_admin',id FROM permissions WHERE code='org.manage';");
r=await call('/api/admin/org');assert.equal(r.status,200);assert(r.items.every(x=>x.id==='org_office'));checks++;
assert.equal((await call('/api/admin/org','POST',{code:'FORBIDDEN',name:'X',parent_id:'org_sfn'})).status,403);checks++;

// 2. Scoped member cards & public verification checks
await dbExec("INSERT OR IGNORE INTO org_nodes(id,parent_id,code,name,node_type,status) VALUES('audit_other','org_sfn','AUDIT-OTHER','Audit Other Unit','unit','active'); INSERT OR IGNORE INTO member_cards(id,person_id,card_type_id,org_node_id,card_number,issued_at,expires_at,status,verify_token) VALUES('audit_card_office','p','card_volunteer','org_office','AUDIT-CARD-OFFICE','2026-10-01',NULL,'active','AUDIT_VERIFY_OFFICE'),('audit_card_other','p','card_volunteer','audit_other','AUDIT-CARD-OTHER','2026-10-01',NULL,'active','AUDIT_VERIFY_OTHER'),('audit_card_future','p','card_volunteer','org_office','AUDIT-CARD-FUTURE','2099-01-01','2099-12-31','active','AUDIT_VERIFY_FUTURE'),('audit_card_bad_date','p','card_volunteer','org_office','AUDIT-CARD-BADDATE','2026-02-30',NULL,'active','AUDIT_VERIFY_BADDATE');");
r=await call('/api/admin/member-cards');assert.equal(r.status,200);assert(r.items.some(x=>x.id==='audit_card_office'));assert(!r.items.some(x=>x.id==='audit_card_other'));assert.equal(r.items.find(x=>x.id==='audit_card_future').status,'pending');assert.equal(r.items.find(x=>x.id==='audit_card_bad_date').status,'pending');checks++;
r=await call('/api/admin/member-cards?status=pending');assert.equal(r.status,200);assert(r.items.some(x=>x.id==='audit_card_future'));assert(r.items.some(x=>x.id==='audit_card_bad_date'));assert(!r.items.some(x=>x.id==='audit_card_office'));checks++;
r=await call('/api/public/verify?code=AUDIT_VERIFY_FUTURE');assert.equal(r.status,200);assert.equal(r.valid,false);assert.equal(r.record.status,'pending');checks++;
r=await call('/api/public/verify?code=AUDIT_VERIFY_BADDATE');assert.equal(r.status,200);assert.equal(r.valid,false);assert.equal(r.record.status,'pending');checks++;
assert.equal((await call('/api/admin/verification-qr')).status,403);checks++;
assert.equal((await call('/api/admin/verification-qr','POST',{credential_title:'Scope bypass',full_name:'Scope bypass'})).status,403);checks++;
assert.equal((await call('/api/admin/one-time-credentials')).status,403);checks++;
assert.equal((await call('/api/admin/one-time-credentials','POST',{full_name:'Scope bypass',event_name:'Scope bypass'})).status,403);checks++;
assert.equal((await call('/api/admin/issuance-overview')).status,403);checks++;
assert.equal((await call('/api/admin/work-center')).status,200);checks++;
r=await call('/api/admin/reports');assert.equal(r.status,200);assert('summary' in r);checks++;
await dbExec("UPDATE account_scopes SET role_id='role_super_admin',org_node_id='org_sfn' WHERE account_id='a';");r=await call('/api/admin/system-health');assert.equal(r.status,200);assert.equal(r.database,'ok');assert.equal(r.required_schema_version,16);assert.equal(r.schema_status,'current');assert.deepEqual(r.missing_tables,[]);assert.equal(r.email_delivery_tested,false);assert.equal(r.system_identity.siteName,'Trung tâm Nghiệp vụ Số Sky First');assert.equal(r.system_identity.appUrl,'https://nghiepvu.skyfirst.io.vn');checks++;

// 3. Portal config, brand normalization, retired/external domain stripping, and config version history
await dbRun("INSERT OR REPLACE INTO system_settings(key,value_json,updated_at) VALUES('member_portal_v4',?,CURRENT_TIMESTAMP)",JSON.stringify({brand:{logoUrl:'https://outside.invalid/logo.png'},links:[{name:'Liên kết sai',url:'https://outside.invalid/'}]}));
const legacyConfig=await call('/api/public/portal-config');assert.equal(legacyConfig.links.length,2);assert.equal(legacyConfig.brand.logoUrl,'/sfn-logo.png');assert.equal(legacyConfig.brand.siteName,'Trung tâm Nghiệp vụ Số Sky First');assert.equal(legacyConfig.links[0].name,'Trang Thông Tin Điện Tử Sky First');checks++;
const securityResponse=await Worker.fetch(new Request('https://nghiepvu.skyfirst.io.vn/api/public/portal-config'),{DB});assert.equal(securityResponse.status,200);assert.equal(securityResponse.headers.get('x-content-type-options'),'nosniff');assert.equal(securityResponse.headers.get('x-frame-options'),'DENY');assert.equal(securityResponse.headers.get('referrer-policy'),'no-referrer');assert((securityResponse.headers.get('content-security-policy')||'').includes("frame-ancestors 'none'"));checks++;
await dbRun("UPDATE system_settings SET value_json=?,updated_at=CURRENT_TIMESTAMP WHERE key='member_portal_v4'",JSON.stringify({links:[{name:'Cổng chính Sky First Network',url:'https://www.skyfirst.io.vn/'},{name:'Cổng Thông tin',url:'https://ctt.skyfirst.io.vn/'}]}));
const migratedLinks=await call('/api/public/portal-config');assert.deepEqual(migratedLinks.links.map(x=>x.name),['Trang Thông Tin Điện Tử Sky First','Cổng Thông Tin Số Sky First']);assert.equal(migratedLinks.links[0].url,'https://www.skyfirst.io.vn/');assert.equal(migratedLinks.links[1].url,'https://ctt.skyfirst.io.vn/');checks++;
const linkSet=[{name:'Trang Thông Tin Điện Tử Sky First',url:'https://www.skyfirst.io.vn/',description:'Thông tin chính thức'},{name:'Cổng Thông Tin Số Sky First',url:'https://ctt.skyfirst.io.vn/',description:'Thông tin số'}];
r=await call('/api/admin/portal-config','PUT',{stats:[],tagline:'Hành trình của thành viên',brand:{siteName:'Trung tâm Nghiệp vụ Số Sky First',logoUrl:'/sfn-logo.png',primaryColor:'#123456',accentColor:'#22bbdd',navColor:'#102030',fontFamily:'system',baseFontSize:17,cornerRadius:12,contentMaxWidth:1360},links:linkSet,change_reason:'Chuẩn hóa nhận diện Trung tâm Nghiệp vụ Số Sky First'});assert.equal(r.status,200);assert.equal(r.settings.brand.primaryColor,'#123456');assert.equal(r.settings.brand.cornerRadius,12);assert.equal(r.settings.brand.contentMaxWidth,1360);assert.equal(r.settings.links.length,2);checks++;
r=await call('/api/admin/portal-config');assert.equal(r.status,200);assert.equal(r.settings.brand.primaryColor,'#123456');assert.equal(r.settings.brand.baseFontSize,17);assert.equal(r.settings.brand.cornerRadius,12);assert.equal(r.settings.brand.contentMaxWidth,1360);assert.equal(r.settings.links[1].name,'Cổng Thông Tin Số Sky First');checks++;
r=await call('/api/admin/portal-config','PUT',{stats:[],brand:{siteName:'Bad',logoUrl:'https://external.invalid/logo.png',primaryColor:'#123456',accentColor:'#22bbdd',navColor:'#102030',fontFamily:'system',baseFontSize:16},links:linkSet});assert.equal(r.status,400);assert.equal(r.error,'INVALID_LOGO_PATH');checks++;
r=await call('/api/admin/portal-config','PUT',{stats:[],brand:{siteName:'Bad',logoUrl:'/sfn-logo.png',primaryColor:'#123456',accentColor:'#22bbdd',navColor:'#102030',fontFamily:'system',baseFontSize:16},links:[linkSet[0],{name:'External',url:'https://example.com',description:''}]});assert.equal(r.status,400);assert.equal(r.error,'INVALID_PORTAL_LINK');checks++;
r=await call('/api/admin/portal-config','PUT',{stats:[],brand:{siteName:'Bad',logoUrl:'/sfn-logo.png',primaryColor:'#123456',accentColor:'#22bbdd',navColor:'#102030',fontFamily:'system',baseFontSize:16},links:[{...linkSet[0],url:'https://ctt.skyfirst.io.vn/'},linkSet[1]]});assert.equal(r.status,400);assert.equal(r.error,'INVALID_PORTAL_LINK');checks++;

// 4. Image upload & private request avatar protection
const crc32=(bytes)=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1)}return (c^0xffffffff)>>>0};
const pngChunk=(type,data)=>{const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc])};
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(Buffer.from([0,0,0,0,0]))),pngChunk('IEND',Buffer.alloc(0))]);
const bucket=new Map();const FILES={async list(opts={}){const p=opts.prefix||'';return {objects:[...bucket.keys()].filter(k=>k.startsWith(p)).map(key=>({key}))}},async put(key,bytes,opts){bucket.set(key,{bytes:new Uint8Array(bytes),metadata:opts.httpMetadata,etag:'"uploaded-test"'})},async get(key){const x=bucket.get(key);if(!x)return null;return {body:x.bytes,httpEtag:x.etag,httpMetadata:x.metadata,arrayBuffer:async()=>x.bytes.slice().buffer,writeHttpMetadata(h){h.set('content-type',x.metadata.contentType);h.set('cache-control',x.metadata.cacheControl)}}},async delete(key){bucket.delete(key)}};
const uploadReq=new Request('https://nghiepvu.skyfirst.io.vn/api/admin/site-assets',{method:'POST',headers:{cookie:'sfn_session=test',origin:'https://nghiepvu.skyfirst.io.vn','content-type':'image/png'},body:png});const uploadRes=await api(uploadReq,{DB,FILES},new URL(uploadReq.url));const uploadBody=await uploadRes.json();assert.equal(uploadRes.status,201);assert.match(uploadBody.url,/^\/files\/site-assets\/[a-f0-9-]+\.png$/);assert(bucket.size===1);checks++;
const badImgReq=new Request('https://nghiepvu.skyfirst.io.vn/api/admin/site-assets',{method:'POST',headers:{cookie:'sfn_session=test',origin:'https://nghiepvu.skyfirst.io.vn','content-type':'image/png'},body:new Uint8Array([137,80,78,71,13,10,26,10,1])});const badImgRes=await api(badImgReq,{DB,FILES},new URL(badImgReq.url));assert.equal(badImgRes.status,400);checks++;
const fakeRequestAvatarReq=new Request('https://nghiepvu.skyfirst.io.vn/api/public/request-avatar',{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'image/png'},body:new Uint8Array([137,80,78,71,13,10,26,10,1])});const fakeRequestAvatarRes=await api(fakeRequestAvatarReq,{DB,FILES},new URL(fakeRequestAvatarReq.url));assert.equal(fakeRequestAvatarRes.status,400);checks++;
const requestAvatarReq=new Request('https://nghiepvu.skyfirst.io.vn/api/public/request-avatar',{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'image/png'},body:png});const requestAvatarRes=await api(requestAvatarReq,{DB,FILES},new URL(requestAvatarReq.url));const requestAvatarBody=await requestAvatarRes.json();assert.equal(requestAvatarRes.status,201);assert.match(requestAvatarBody.url,/^\/files\/requests\/avatars\//);const requestAvatarKey=requestAvatarBody.url.slice('/files/'.length);assert.equal(bucket.get(requestAvatarKey).metadata.cacheControl,'private, no-store, max-age=0');checks++;
const anonymousAvatarRes=await Worker.fetch(new Request('https://nghiepvu.skyfirst.io.vn'+requestAvatarBody.url),{DB,FILES});assert.equal(anonymousAvatarRes.status,401);checks++;
const assetReq=new Request('https://nghiepvu.skyfirst.io.vn'+uploadBody.url);const assetRes=await Worker.fetch(assetReq,{DB,FILES});assert.equal(assetRes.status,200);assert.match(assetRes.headers.get('content-type')||'',/image\/png/);assert.equal((await assetRes.arrayBuffer()).byteLength,png.length);checks++;
r=await call('/api/admin/saved-filters','POST',{name:'Test filter',view:'admin-members',query:'active'});assert.equal(r.status,200);checks++;
r=await call('/api/admin/saved-filters');assert.equal(r.status,200);assert(r.items.some(x=>x.name==='Test filter'));const fid=r.items.find(x=>x.name==='Test filter').id;checks++;
assert.equal((await call('/api/admin/saved-filters/'+fid,'DELETE')).status,200);checks++;

const noOriginReq=new Request('https://nghiepvu.skyfirst.io.vn/api/admin/org',{method:'POST',headers:{cookie:'sfn_session=test','content-type':'application/json'},body:JSON.stringify({code:'NO-ORIGIN',name:'Blocked'})});
assert.equal((await api(noOriginReq,{DB},new URL(noOriginReq.url))).status,403);checks++;
const req=new Request('https://nghiepvu.skyfirst.io.vn/api/me',{headers:{cookie:'sfn_session=%ZZ'}});assert.equal((await api(req,{DB},new URL(req.url))).status,401);checks++;
const front=readFileSync('public/app.js','utf8');const apiText=front.slice(front.indexOf('const api='),front.indexOf('const safeStore='));const ctx={fetch:async()=>new Response('<html>',{status:200}),AbortController,setTimeout,clearTimeout};vm.createContext(ctx);vm.runInContext(apiText+'\nglobalThis.testApi=api;',ctx);await assert.rejects(ctx.testApi('/api/test'),/không hợp lệ/);checks++;
ctx.fetch=async()=>Response.json(null);await assert.rejects(ctx.testApi('/api/test'),/không hợp lệ/);checks++;

// 5. One-time credentials & Independent verification QR
r=await call('/api/admin/one-time-credentials','POST',{full_name:'Nguyen Test',event_name:'Su kien Test',role_label:'TNV',card_type_id:'card_volunteer',photo_url:'https://external.invalid/photo.jpg',expires_at:'2099-12-31'});assert.equal(r.status,200);assert(r.verify_token&&r.card_number);checks++;
r=await call('/api/admin/one-time-credentials','POST',{full_name:'Future Event Test',event_name:'Future Event',issued_at:'2099-01-01',expires_at:'2099-12-31'});assert.equal(r.status,200);const futureEventCredential=r;checks++;
r=await call('/api/public/verify?code='+encodeURIComponent(futureEventCredential.verify_token));assert.equal(r.status,200);assert.equal(r.valid,false);assert.equal(r.record.status,'pending');checks++;
r=await call('/api/admin/one-time-credentials','POST',{full_name:'Invalid Date Test',event_name:'Invalid',issued_at:'2026-02-30',expires_at:'2026-03-01'});assert.equal(r.status,400);checks++;
r=await call('/api/admin/one-time-credentials','POST',{full_name:'Invalid Range Test',event_name:'Invalid',issued_at:'2026-10-10',expires_at:'2026-10-09'});assert.equal(r.status,400);checks++;
r=await call('/api/admin/one-time-credentials');assert.equal(r.status,200);assert(r.items.some(x=>x.id===r.id||x.card_number));const otc=r.items.find(x=>x.full_name==='Nguyen Test');assert(otc);assert.equal(otc.photo_url,undefined);assert.equal((await dbGet('SELECT photo_url FROM one_time_credentials WHERE id=?',otc.id)).photo_url,null);checks++;
r=await call('/api/public/verify?code='+encodeURIComponent(otc.verify_token));assert.equal(r.status,200);assert.equal(r.type,'one_time');assert.equal(r.valid,true);checks++;
r=await call('/api/public/card-qr?code=not-a-real-token');assert.equal(r.status,404);assert.equal(r.error,'NOT_FOUND');checks++;
{const req=new Request('https://nghiepvu.skyfirst.io.vn/api/public/card-qr?code=PREVIEW&size=180',{headers:{origin:'https://nghiepvu.skyfirst.io.vn'}});const out=await api(req,{DB},new URL(req.url));assert.equal(out.status,200);assert.match(out.headers.get('content-type')||'',/image\/png/);const png=new Uint8Array(await out.arrayBuffer());assert.deepEqual(Array.from(png.slice(0,8)),[137,80,78,71,13,10,26,10]);assert(png.length>100);checks++;}
r=await call('/api/public/verify?code='+encodeURIComponent(otc.card_number));assert.equal(r.status,404);assert.equal(r.error,'NOT_FOUND');checks++;
r=await call('/api/admin/one-time-credentials/'+encodeURIComponent(otc.id)+'/revoke','POST',{});assert.equal(r.status,'revoked');checks++;
r=await call('/api/public/verify?code='+encodeURIComponent(otc.verify_token));assert.equal(r.status,200);assert.equal(r.valid,false);checks++;

r=await call('/api/admin/card-designs','POST',{name:'Mẫu kiểm thử Card Studio'});assert.equal(r.status,410);assert.equal(r.error,'FEATURE_REMOVED');checks++;
r=await call('/api/admin/card-designs');assert.equal(r.status,410);checks++;

r=await call('/api/admin/verification-qr','POST',{credential_title:'The tinh nguyen vien',full_name:'Nguyen QR Test',role_label:'Tinh nguyen vien',organization_label:'Sky First Network',reference_number:'CUSTOM_QR_001',issued_at:'2026-10-09',expires_at:'2099-12-31',public_note:'Public note',private_notes:'PRIVATE_NEVER_PUBLIC'});assert.equal(r.status,201);assert(r.verify_token&&r.reference_number==='CUSTOM_QR_001');const qrRecord=r;checks++;
r=await call('/api/admin/verification-qr');assert.equal(r.status,200);assert(r.items.some(x=>x.id===qrRecord.id&&x.reference_number==='CUSTOM_QR_001'));checks++;
r=await call('/api/public/verify?code='+encodeURIComponent(qrRecord.verify_token));assert.equal(r.status,200);assert.equal(r.type,'verification_qr');assert.equal(r.valid,true);assert.equal(r.record.full_name,'Nguyen QR Test');assert.equal(r.record.private_notes,undefined);assert.equal(r.record.verify_token,undefined);checks++;
r=await call('/api/public/verify?code=CUSTOM_QR_001');assert.equal(r.status,404);checks++;
r=await call('/api/admin/verification-qr','POST',{credential_title:'Duplicate code',full_name:'Duplicate',reference_number:'CUSTOM_QR_001',issued_at:'2026-10-09'});assert.equal(r.status,409);checks++;
r=await call('/api/admin/verification-qr','POST',{credential_title:'Invalid date',full_name:'Invalid',issued_at:'2026-10-09',expires_at:'2026-01-01'});assert.equal(r.status,400);checks++;
r=await call('/api/admin/verification-qr','POST',{credential_title:'Future credential',full_name:'Future QR Test',reference_number:'FUTURE_QR_002',issued_at:'2099-01-01',expires_at:'2099-12-31'});assert.equal(r.status,201);const futureQrRecord=r;checks++;
r=await call('/api/public/verify?code='+encodeURIComponent(futureQrRecord.verify_token));assert.equal(r.status,200);assert.equal(r.valid,false);assert.equal(r.record.status,'pending');checks++;
r=await call('/api/admin/verification-qr');assert.equal(r.status,200);assert(r.items.some(x=>x.id===futureQrRecord.id&&x.effective_status==='pending'));checks++;
r=await call('/api/admin/verification-qr/'+encodeURIComponent(qrRecord.id)+'/revoke','POST',{});assert.equal(r.status,'revoked');checks++;
r=await call('/api/public/verify?code='+encodeURIComponent(qrRecord.verify_token));assert.equal(r.status,200);assert.equal(r.valid,false);assert.equal(r.record.status,'revoked');checks++;
r=await call('/api/admin/issuance-overview');assert.equal(r.status,200);assert.equal(r.verification_qr.total,2);assert.equal(r.verification_qr.revoked,1);assert.equal(r.verification_qr.pending,1);checks++;
r=await call('/api/admin/member-cards');assert.equal(r.status,200);assert(Array.isArray(r.items));checks++;
r=await call('/api/admin/members/bulk','POST',{ids:['p'],action:'issue_card',expires_at:'2026-02-30'});assert.equal(r.status,400);assert.equal(r.error,'INVALID_DATE');checks++;
r=await call('/api/admin/members/bulk','POST',{ids:['p'],action:'issue_card',expires_at:'2026-10-08'});assert.equal(r.status,400);assert.equal(r.error,'EXPIRY_BEFORE_ISSUE');checks++;

// 6. Account request lookup & multi-unit approval
{const getReq=new Request('https://nghiepvu.skyfirst.io.vn/api/public/account-request/status?code=SHOULD_NOT_BE_HERE&email=person%40example.com');const getRes=await api(getReq,{DB},new URL(getReq.url));assert.equal(getRes.status,405);assert.equal(getRes.headers.get('cache-control'),'no-store');checks++;}
{const statusReq=new Request('https://nghiepvu.skyfirst.io.vn/api/public/account-request/status',{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/json'},body:JSON.stringify({code:'NO_SUCH_REQUEST',email:'nobody@example.com'})});const statusRes=await api(statusReq,{DB},new URL(statusReq.url));assert.equal(statusRes.status,404);assert.equal(statusRes.headers.get('cache-control'),'no-store');checks++;for(let i=0;i<7;i++){const retry=new Request('https://nghiepvu.skyfirst.io.vn/api/public/account-request/status',{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/json'},body:JSON.stringify({code:'NO_SUCH_REQUEST',email:'nobody@example.com'})});assert.equal((await api(retry,{DB},new URL(retry.url))).status,404)}const limited=new Request('https://nghiepvu.skyfirst.io.vn/api/public/account-request/status',{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/json'},body:JSON.stringify({code:'NO_SUCH_REQUEST',email:'nobody@example.com'})});const limitedRes=await api(limited,{DB},new URL(limited.url));assert.equal(limitedRes.status,429);assert.equal(limitedRes.headers.get('cache-control'),'no-store');checks++;}

await dbExec(`INSERT OR IGNORE INTO account_requests(id,request_code,full_name,display_name,date_of_birth,gender,nationality,id_number,id_issue_date,id_issue_place,email,phone,permanent_address,temporary_address,avatar_url,target_org_node_id,privacy_consent,status) VALUES('request-multi','REQ-MULTI-AUDIT','Audit Member','Audit Member','1998-01-01','Không khai báo','Việt Nam','AUDIT-ID-1001','2020-01-01','Test Office','audit.member@example.com','0900000001','Address One','Address Two','', 'org_office',1,'pending');
INSERT INTO account_request_profiles(request_id,education_or_work_type,school_or_workplace,class_or_major,education_status) VALUES('request-multi','education','Trường Kiểm thử','Công nghệ thông tin','studying');
INSERT INTO account_request_extended(request_id,school_name,class_or_major,employment_status,workplace_name,work_department,job_title,guardian_date_of_birth,guardian_id_number) VALUES('request-multi','Trường Kiểm thử','Công nghệ thông tin','employed','Công ty Kiểm thử','Công nghệ','Chuyên viên','1980-01-01','GUARDIAN-ID-1234');
INSERT INTO account_request_orgs(request_id,org_node_id,is_primary) VALUES('request-multi','org_office',1),('request-multi','audit_other',0);`);
await dbRun("UPDATE account_requests SET avatar_url=? WHERE id='request-multi'",requestAvatarBody.url);
r=await call('/api/admin/account-requests');assert.equal(r.status,200);const pendingMulti=r.items.find(x=>x.id==='request-multi');assert(pendingMulti);assert.equal(pendingMulti.school_name,'Trường Kiểm thử');assert.equal(pendingMulti.guardian_id_number,'••••••••1234');assert.equal(Number(pendingMulti.requested_org_count),2);assert(pendingMulti.requested_org_names.includes('Văn phòng Mạng lưới'));checks++;
r=await call('/api/admin/account-requests/request-multi/approve','POST',{send_email:false},{DB,FILES});assert.equal(r.status,200);assert.deepEqual(r.approved_org_ids,['org_office','audit_other']);const approvedPerson=await dbGet('SELECT id FROM people WHERE email=?','audit.member@example.com');assert(approvedPerson);assert.equal((await dbGet("SELECT COUNT(*) n FROM org_memberships WHERE person_id=? AND status='active'",approvedPerson.id)).n,2);assert.equal((await dbGet('SELECT COUNT(*) n FROM org_memberships WHERE person_id=? AND is_primary=1',approvedPerson.id)).n,1);const savedWork=await dbGet('SELECT * FROM people_work_profiles WHERE person_id=?',approvedPerson.id);assert.equal(savedWork.school_name,'Trường Kiểm thử');assert.equal(savedWork.work_department,'Công nghệ');const clearedGuardian=await dbGet("SELECT guardian_date_of_birth,guardian_id_number FROM account_request_extended WHERE request_id='request-multi'");assert.equal(clearedGuardian.guardian_date_of_birth,null);assert.equal(clearedGuardian.guardian_id_number,null);const approvedAvatar=(await dbGet("SELECT avatar_url FROM account_requests WHERE id='request-multi'")).avatar_url;assert.match(approvedAvatar,/^\/files\/avatars\//);assert(!bucket.has(requestAvatarKey));const approvedAvatarKey=approvedAvatar.slice('/files/'.length);assert(bucket.has(approvedAvatarKey));assert.equal(bucket.get(approvedAvatarKey).metadata.cacheControl,'public, max-age=31536000, immutable');checks++;
await dbRun("UPDATE accounts SET force_password_change=1 WHERE id='a'");
r=await call('/api/dashboard');assert.equal(r.status,403);assert.equal(r.error,'PASSWORD_CHANGE_REQUIRED');checks++;
r=await call('/api/me/password','POST',{current_password:'',new_password:'StrongPassword2026!'});assert.equal(r.status,200);assert.equal((await dbGet("SELECT force_password_change FROM accounts WHERE id='a'")).force_password_change,0);checks++;

// 7. Schema health & error boundaries
{
  await dbExec('DROP TABLE verification_qr_records');
  const failed=await call('/api/admin/verification-qr');
  assert.equal(failed.status,503);assert.equal(failed.error,'SCHEMA_MIGRATION_REQUIRED');assert.equal(failed.schema_required_version,16);assert(failed.reference);
  const missingTableHealth=await call('/api/admin/system-health');
  assert.equal(missingTableHealth.schema_status,'outdated');assert(missingTableHealth.missing_tables.includes('verification_qr_records'));
  await dbExec(readFileSync('migrations/0014_independent_verification_qr.sql','utf8'));
  await dbExec('INSERT OR IGNORE INTO schema_version(version) VALUES(16)');
  checks++;
}
{
  await dbExec('ALTER TABLE one_time_credentials RENAME COLUMN event_name TO event_name__audit_missing');
  const missingColumnHealth=await call('/api/admin/system-health');
  assert.equal(missingColumnHealth.schema_status,'outdated');assert(missingColumnHealth.missing_columns.includes('one_time_credentials.event_name'));
  await dbExec('ALTER TABLE one_time_credentials RENAME COLUMN event_name__audit_missing TO event_name');
  checks++;
}
{
  const r2Probe={async list(){return {objects:[]}}};
  const health=await call('/api/admin/system-health','GET',undefined,{DB,FILES:r2Probe,RESEND_API_KEY:'configured-but-not-tested'});
  assert.equal(health.r2_read_status,'read_ok');assert.equal(health.r2_write_status,'not_tested');assert.equal(health.email_status,'configured_delivery_not_tested');assert.equal(health.email_delivery_tested,false);checks++;
}
{
  const a=front.indexOf('async function fetchAsDataUrl'),b=front.indexOf('async function fetchOptionalCardPhoto',a);
  const ctx={fetch:async()=>new Response(JSON.stringify({error:'SCHEMA_MIGRATION_REQUIRED',message:'D1 cần cập nhật migration.'}),{status:503,headers:{'content-type':'application/json'}}),Response,URL,Promise,Error,String};
  vm.createContext(ctx);vm.runInContext(front.slice(a,b)+'\nglobalThis.testFetchAsset=fetchAsDataUrl;',ctx);
  await assert.rejects(ctx.testFetchAsset('/api/public/card-qr','mã QR xác minh'),/D1 cần cập nhật migration/);checks++;
}

// =========================================================================
// 8. NEW P1-P7 COMPREHENSIVE TESTS (Section 13.2 OTP, Legal Gate, Support, Governance, Archive)
// =========================================================================

r=await call('/api/public/email-otp/request','POST',{email:'not-an-email',purpose:'account_request'});
assert.equal(r.status,400);assert.equal(r.error,'EMAIL_INVALID');checks++;

r=await call('/api/public/email-otp/request','POST',{email:'otpuser@skyfirst.io.vn',full_name:'OTP User',purpose:'account_request'});
assert.equal(r.status,202);assert.equal(r.email_sent,false);assert.equal(r.delivery_status,'provider_not_configured');checks++;

r=await call('/api/public/email-otp/request','POST',{email:'otpuser@skyfirst.io.vn',purpose:'account_request'});
assert.equal(r.status,429);assert.equal(r.error,'OTP_RESEND_COOLDOWN');checks++;

r=await call('/api/public/email-otp/verify','POST',{email:'otpuser@skyfirst.io.vn',otp:'000000',purpose:'account_request'});
assert.equal(r.status,400);assert.equal(r.error,'OTP_INVALID');assert.equal(r.remaining_attempts,4);checks++;

for(let i=0;i<4;i++){
  await call('/api/public/email-otp/verify','POST',{email:'otpuser@skyfirst.io.vn',otp:'000000',purpose:'account_request'});
}
r=await call('/api/public/email-otp/verify','POST',{email:'otpuser@skyfirst.io.vn',otp:'000000',purpose:'account_request'});
assert.equal(r.status,429);assert.equal(r.error,'OTP_MAX_ATTEMPTS_EXCEEDED');checks++;

const knownOtp='654321';
const knownHash=createHash('sha256').update('expired@skyfirst.io.vn|account_request|'+knownOtp).digest('hex');
await dbRun("INSERT INTO email_otp_tokens(id,email,purpose,otp_hash,attempts,max_attempts,expires_at) VALUES('otp_exp','expired@skyfirst.io.vn','account_request',?,0,5,datetime('now','-5 minutes'))",knownHash);
r=await call('/api/public/email-otp/verify','POST',{email:'expired@skyfirst.io.vn',otp:knownOtp,purpose:'account_request'});
assert.equal(r.status,410);assert.equal(r.error,'OTP_EXPIRED');checks++;

const validEmail='validotp@skyfirst.io.vn';
const validHash=createHash('sha256').update(validEmail+'|account_request|'+knownOtp).digest('hex');
await dbRun("INSERT INTO email_otp_tokens(id,email,purpose,otp_hash,attempts,max_attempts,expires_at) VALUES('otp_ok',?,'account_request',?,0,5,datetime('now','+10 minutes'))",validEmail,validHash);
r=await call('/api/public/email-otp/verify','POST',{email:validEmail,otp:knownOtp,purpose:'account_request'});
assert.equal(r.status,200);assert.equal(r.verified,true);assert(r.otp_verification_token);const otpVerifyToken=r.otp_verification_token;checks++;

const regAvatarRes=await api(new Request('https://nghiepvu.skyfirst.io.vn/api/public/request-avatar',{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'image/png'},body:png}),{DB,FILES},new URL('https://nghiepvu.skyfirst.io.vn/api/public/request-avatar'));
const regAvatarUrl=(await regAvatarRes.json()).url;
const baseRegPayload={
  full_name:'Nguyễn Nghiệp Vụ',display_name:'Nguyễn Nghiệp Vụ',date_of_birth:'2000-05-15',gender:'Nam',nationality:'Việt Nam',
  id_number:'079200001234',id_issue_date:'2021-05-15',id_issue_place:'Cục CSQLHC',email:validEmail,phone:'0912345678',
  permanent_address:'TP. Hồ Chí Minh',temporary_address:'TP. Hồ Chí Minh',avatar_url:regAvatarUrl,target_org_node_id:'org_office',
  requested_org_ids:['org_office'],education_or_work_type:'Học tập & Công việc',school_or_workplace:'Đại học Quốc gia',
  education_status:'Đã tốt nghiệp',school_name:'Đại học Quốc gia',class_or_major:'Kỹ thuật phần mềm',employment_status:'Đang đi làm',
  workplace_name:'Sky First',work_department:'Ban Công nghệ',job_title:'Kỹ sư',
  read_acknowledged:'1',terms_accepted:'1',privacy_consent:'1'
};
r=await call('/api/public/account-request','POST',{...baseRegPayload,full_name:''},{DB,FILES});
assert.equal(r.status,400);assert.equal(r.error,'ALL_PERSONAL_FIELDS_REQUIRED');checks++;

r=await call('/api/public/account-request','POST',{...baseRegPayload,terms_accepted:'0'},{DB,FILES});
assert.equal(r.status,400);assert.equal(r.error,'TERMS_ACCEPTANCE_REQUIRED');checks++;

r=await call('/api/public/account-request','POST',{...baseRegPayload,otp_verification_token:'invalid-token-xyz'},{DB,FILES});
assert.equal(r.status,400);assert.equal(r.error,'OTP_VERIFICATION_TOKEN_INVALID');checks++;

r=await call('/api/public/account-request','POST',{...baseRegPayload,otp_verification_token:otpVerifyToken},{DB,FILES});
assert.equal(r.status,200);assert(r.request_code);
const consentRow=await dbGet('SELECT * FROM legal_consent_records WHERE email=?',validEmail);
assert(consentRow);assert.equal(consentRow.email_verified,1);assert.equal(consentRow.terms_accepted,1);assert.equal(consentRow.privacy_consent,1);assert.equal(consentRow.read_acknowledged,1);checks++;

r=await call('/api/public/email-otp/verify','POST',{email:validEmail,otp:knownOtp,purpose:'account_request'});
assert.equal(r.status,409);assert.equal(r.error,'OTP_ALREADY_USED');checks++;

r=await call('/api/me/support','POST',{category:'technical',subject:'Cần hỗ trợ đồng bộ hồ sơ',body:'Nhờ kiểm tra trạng thái thẻ nghiệp vụ.'});
assert.equal(r.status,200);assert(r.ticket_code);checks++;
r=await call('/api/me/support','GET');
assert.equal(r.status,200);assert.equal(r.items.length,1);const ticketId=r.items[0].id;checks++;
r=await call('/api/admin/support-tickets','GET');
assert.equal(r.status,200);assert(r.items.some(x=>x.id===ticketId));checks++;
r=await call('/api/admin/support-tickets/'+encodeURIComponent(ticketId),'PATCH',{status:'completed',priority:'high',resolution_note:'Đã kiểm tra và đồng bộ thẻ thành công.',closed_reason:'Hoàn tất hỗ trợ'});
assert.equal(r.status,'completed');assert.equal(r.ok,true);checks++;

r=await call('/api/admin/governance/overview','GET');
assert.equal(r.status,200);assert.equal(r.identity.siteName,'Trung tâm Nghiệp vụ Số Sky First');assert(r.legal_consent.total>=1);checks++;

r=await call('/api/admin/governance/registry?domain=legal_obligation','GET');
assert.equal(r.status,200);assert(r.items.some(x=>x.code==='LAW-91-2025-QH15'));assert(r.items.some(x=>x.code==='DEC-356-2025-NDCP'));checks++;

r=await call('/api/admin/governance/registry','POST',{domain_group:'workflow_change',code:'WF-CHG-SOD-TEST',title:'Thay đổi quy trình tự duyệt',status:'approved',owner_account_id:'a',approver_account_id:'a'});
assert.equal(r.status,409);assert.equal(r.error,'SOD_CONFLICT_DETECTED');checks++;

r=await call('/api/admin/governance/registry','POST',{domain_group:'ops_risk',code:'RISK-2026-01',title:'Rủi ro gián đoạn dịch vụ gửi email bên ngoài',status:'active',summary:'Theo dõi trạng thái khóa API và hạn mức gửi thư.'});
assert.equal(r.status,201);assert.equal(r.code,'RISK-2026-01');checks++;

r=await call('/api/admin/email-center','GET');
assert.equal(r.status,200);assert(Array.isArray(r.delivery_logs));assert(Array.isArray(r.otp_records));assert(r.delivery_logs.length>=1);checks++;

r=await call('/api/admin/release-readiness','GET');
assert.equal(r.status,200);assert.equal(r.code_package_ready,true);assert.equal(r.production_live_verified,false);checks++;

{
  const badZipReq=new Request('https://nghiepvu.skyfirst.io.vn/api/admin/archive-inspect',{method:'POST',headers:{cookie:'sfn_session=test',origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/zip'},body:new Uint8Array([1,2,3,4])});
  const badZipRes=await api(badZipReq,{DB},new URL(badZipReq.url));
  assert.equal(badZipRes.status,400);checks++;
}

// =========================================================
// SUPER VIP INTEGRATION TESTS (M4_SUPER_VIP_UPGRADE)
// =========================================================
function buildTestZip(entries){
  const localParts=[];
  const centralParts=[];
  let offset=0;
  for(const ent of entries){
    const nameBytes=Buffer.from(ent.name,'utf8');
    const dataBytes=Buffer.from(ent.content||'hello','utf8');
    const compSize=ent.compSize??dataBytes.length;
    const uncompSize=ent.uncompSize??dataBytes.length;
    const lh=Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50,0);
    lh.writeUInt16LE(20,4);
    lh.writeUInt32LE(compSize,18);
    lh.writeUInt32LE(uncompSize,22);
    lh.writeUInt16LE(nameBytes.length,26);
    localParts.push(lh,nameBytes,dataBytes);
    const ch=Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50,0);
    ch.writeUInt16LE(20,4);
    ch.writeUInt16LE(20,6);
    ch.writeUInt32LE(compSize,20);
    ch.writeUInt32LE(uncompSize,24);
    ch.writeUInt16LE(nameBytes.length,28);
    ch.writeUInt32LE(offset,42);
    centralParts.push(ch,nameBytes);
    offset+=30+nameBytes.length+dataBytes.length;
  }
  const cdBuf=Buffer.concat(centralParts);
  const eocd=Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50,0);
  eocd.writeUInt16LE(entries.length,8);
  eocd.writeUInt16LE(entries.length,10);
  eocd.writeUInt32LE(cdBuf.length,12);
  eocd.writeUInt32LE(offset,16);
  return new Uint8Array(Buffer.concat([...localParts,cdBuf,eocd]));
}

// 1. Valid ZIP inspection passes (200) and traversal/executable ZIP fails (400)
{
  const cleanZip=buildTestZip([{name:'docs/README.md',content:'# Sky First'},{name:'src/index.js',content:'export default {};'}]);
  const cleanRes=await api(new Request('https://nghiepvu.skyfirst.io.vn/api/admin/archive-inspect',{method:'POST',headers:{cookie:'sfn_session=test',origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/zip'},body:cleanZip}),{DB},new URL('https://nghiepvu.skyfirst.io.vn/api/admin/archive-inspect'));
  const cleanBody=await cleanRes.json();
  assert.equal(cleanRes.status,200);assert.equal(cleanBody.valid,true);assert.equal(cleanBody.file_count,2);checks+=3;

  const evilZip=buildTestZip([{name:'../../etc/passwd',content:'root'},{name:'malware.exe',content:'MZ'}]);
  const evilRes=await api(new Request('https://nghiepvu.skyfirst.io.vn/api/admin/archive-inspect',{method:'POST',headers:{cookie:'sfn_session=test',origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/zip'},body:evilZip}),{DB},new URL('https://nghiepvu.skyfirst.io.vn/api/admin/archive-inspect'));
  const evilBody=await evilRes.json();
  assert.equal(evilRes.status,400);assert.equal(evilBody.valid,false);assert.equal(evilBody.reason,'PATH_TRAVERSAL');assert(evilBody.risks.some(x=>(x.risk||String(x)).includes('EXECUTABLE')));checks+=3;
}

// 2. Self-Service Email Change via OTP (purpose='email_change')
{
  // Without OTP token -> 409 EMAIL_CHANGE_REQUIRES_VERIFICATION
  r=await call('/api/me','PATCH',{date_of_birth:'1995-01-15',email:'new-admin-email@skyfirst.io.vn'});
  assert.equal(r.status,409);assert.equal(r.error,'EMAIL_CHANGE_REQUIRES_VERIFICATION');checks+=2;

  // With invalid OTP token -> 400 EMAIL_CHANGE_OTP_INVALID
  r=await call('/api/me','PATCH',{date_of_birth:'1995-01-15',email:'new-admin-email@skyfirst.io.vn',email_change_otp_token:'bad-otp-token'});
  assert.equal(r.status,400);assert.equal(r.error,'EMAIL_CHANGE_OTP_INVALID');checks+=2;

  // Request OTP for email_change
  const newAdminEmail='admin-verified-new@skyfirst.io.vn';
  r=await call('/api/public/email-otp/request','POST',{email:newAdminEmail,purpose:'email_change',full_name:'Admin'});
  assert.equal(r.status,202);assert.equal(r.ok,true);checks+=2;

  // Seed known OTP hash for email_change and verify
  const changeOtpCode='889900';
  const changeOtpHash=createHash('sha256').update(newAdminEmail+'|email_change|'+changeOtpCode).digest('hex');
  await dbRun("UPDATE email_otp_tokens SET otp_hash=? WHERE email=? AND purpose='email_change'",changeOtpHash,newAdminEmail);
  r=await call('/api/public/email-otp/verify','POST',{email:newAdminEmail,otp:changeOtpCode,purpose:'email_change'});
  assert.equal(r.status,200);assert.equal(r.verified,true);const changeOtpToken=r.otp_verification_token;assert(changeOtpToken);checks+=3;

  // Perform PATCH /api/me with valid email_change_otp_token -> 200
  r=await call('/api/me','PATCH',{date_of_birth:'1995-01-15',email:newAdminEmail,email_change_otp_token:changeOtpToken});
  assert.equal(r.status,200);assert.equal(r.ok,true);assert.equal(r.email_verified,true);assert.equal(r.person.email,newAdminEmail);checks+=4;

  // Verify DB updated both people.email and accounts.email + legal_consent_records
  const updatedAcc=await dbGet("SELECT email FROM accounts WHERE id='a'");
  assert.equal(updatedAcc.email,newAdminEmail);
  const emailChangeConsent=await dbGet("SELECT * FROM legal_consent_records WHERE purpose_scope='self_service_email_change' AND email=?",newAdminEmail);
  assert(emailChangeConsent);assert.equal(emailChangeConsent.email_verified,1);checks+=3;

  // Token cannot be reused for another email change
  r=await call('/api/me','PATCH',{date_of_birth:'1995-01-15',email:'another-email@skyfirst.io.vn',email_change_otp_token:changeOtpToken});
  assert.equal(r.status,400);assert.equal(r.error,'EMAIL_CHANGE_OTP_INVALID');checks+=2;
}

// 3. Governance Registry Lifecycle PATCH & SoD Approval Enforcement
{
  // Create a pending workflow_change owned by 'a'
  r=await call('/api/admin/governance/registry','POST',{domain_group:'workflow_change',code:'WF-CHG-2026-02',title:'Cập nhật bước kiểm tra hồ sơ đa đơn vị',status:'pending_verification',summary:'Đề xuất rút ngắn SLA bước phân loại.'});
  assert.equal(r.status,201);const wfChangeId=r.id;checks+=2;

  // Owner 'a' updating summary/version while still pending_verification succeeds (200)
  r=await call('/api/admin/governance/registry/'+encodeURIComponent(wfChangeId),'PATCH',{version_label:'1.1',summary:'Đã bổ sung tài liệu đánh giá tác động.'});
  assert.equal(r.status,'pending_verification');assert.equal(r.ok,true);assert.equal(r.version_label,'1.1');checks+=3;

  // Owner 'a' attempting to self-approve their own workflow_change is blocked by SoD (409)
  r=await call('/api/admin/governance/registry/'+encodeURIComponent(wfChangeId),'PATCH',{status:'approved'});
  assert.equal(r.status,409);assert.equal(r.error,'SOD_CONFLICT_DETECTED');checks+=2;

  // Create a second Super Admin session ('a_rev') to independently approve the workflow_change
  await dbRun("INSERT INTO people(id,member_code,full_name,status) VALUES('p_rev','SFN-REV','Người Phê Duyệt Độc Lập','active')");
  await dbRun("INSERT INTO accounts(id,person_id,username,password_hash,password_salt,force_password_change) VALUES('a_rev','p_rev','reviewer','x','y',0)");
  await dbRun("INSERT INTO account_scopes(id,account_id,role_id,org_node_id) VALUES('s_rev','a_rev','role_super_admin','org_sfn')");
  const revTokenHash=createHash('sha256').update('rev_session_token').digest('hex');
  await dbRun("INSERT INTO sessions(id,account_id,token_hash,expires_at) VALUES('ses_rev','a_rev',?,datetime('now','+1 day'))",revTokenHash);

  const revReq=new Request('https://nghiepvu.skyfirst.io.vn/api/admin/governance/registry/'+encodeURIComponent(wfChangeId),{method:'PATCH',headers:{cookie:'sfn_session=rev_session_token','content-type':'application/json',origin:'https://nghiepvu.skyfirst.io.vn'},body:JSON.stringify({status:'approved',evidence_ref:'BB-HDQT-2026-10'})});
  const revRes=await api(revReq,{DB},new URL(revReq.url));
  const revBody=await revRes.json();
  assert.equal(revRes.status,200);assert.equal(revBody.ok,true);assert.equal(revBody.status,'approved');
  const approvedGov=await dbGet('SELECT status,approver_account_id FROM governance_registry WHERE id=?',wfChangeId);
  assert.equal(approvedGov.status,'approved');assert.equal(approvedGov.approver_account_id,'a_rev');checks+=5;
}

// 4. Configuration Impact Preview (P6.22) & Version Rollback (P6.34)
{
  r=await call('/api/admin/portal-config/preview-impact','POST',{brand:{siteName:'Trung tâm Nghiệp vụ Số Sky First',primaryColor:'#1d4ed8',baseFontSize:17},tagline:'Thông điệp mới thử nghiệm'});
  assert.equal(r.status,200);assert.equal(r.valid,true);assert(Array.isArray(r.affected_components));assert(r.affected_components.length>=1);checks+=4;

  r=await call('/api/admin/portal-config/preview-impact','POST',{brand:{primaryColor:'not-a-color'},stats:[{key:'programs',mode:'auto'}]});
  assert.equal(r.status,200);assert.equal(r.valid,false);assert(r.errors.length>=2);checks+=3;

  // Save a new portal-config version so we have a history entry to rollback
  const beforeCfg=await call('/api/public/portal-config','GET');
  r=await call('/api/admin/portal-config','PUT',{tagline:'Thông điệp tạm thời trước khi rollback',change_reason:'Thử nghiệm rollback'});
  assert.equal(r.status,200);checks++;

  const govOv=await call('/api/admin/governance/overview','GET');
  assert(govOv.config_history.length>=1);
  const latestHistId=govOv.config_history[0].id;
  r=await call('/api/admin/config-history/'+encodeURIComponent(latestHistId)+'/rollback','POST',{restore_mode:'previous',change_reason:'Khôi phục về cấu hình chuẩn'});
  assert.equal(r.status,200);assert.equal(r.ok,true);assert.equal(r.settings.tagline,beforeCfg.tagline);checks+=3;
}

// 5. Safe Email Retry (P6.19)
{
  const emCenter=await call('/api/admin/email-center','GET');
  const firstLog=emCenter.delivery_logs[0];
  assert(firstLog);
  r=await call('/api/admin/email-center/'+encodeURIComponent(firstLog.id)+'/retry','POST',{});
  assert.equal(r.ok,true);assert.equal(r.status,'not_configured');assert(r.retry_count>=1);checks+=4;
}

// 6. Vendor-Independent Standardized Export Bundle (P6.36)
{
  r=await call('/api/admin/export-bundle','GET');
  assert.equal(r.status,200);assert.equal(r.ok,true);assert.equal(r.bundle.format,'skyfirst-operations-center-export-v1');
  assert.equal(typeof r.sha256_checksum,'string');assert.equal(r.sha256_checksum.length,64);
  assert(r.bundle.org_nodes.length>=1);assert(r.bundle.governance_registry.length>=10);checks+=6;
}

// 7. Deep Work Queue Coordination: Priority Scoring, Claim/Assign, Blocked Validation, Reminder Cooldown & Bulk Operations
{
  const wq=await call('/api/admin/work-center','GET');
  assert.equal(wq.status,200);assert(Array.isArray(wq.items));assert(wq.items.length>=1);
  const firstItem=wq.items[0];
  assert(typeof firstItem.priority_score==='number');assert(typeof firstItem.priority_reason==='string'&&firstItem.priority_reason.length>0);
  checks+=4;

  // Blocked state without mandatory fields must fail with 400 BLOCKED_DETAILS_REQUIRED
  r=await call('/api/admin/work-center/'+encodeURIComponent(firstItem.item_key),'PATCH',{status:'blocked',blocked_reason:'Thiếu giấy tờ'});
  assert.equal(r.status,400);assert.equal(r.error,'BLOCKED_DETAILS_REQUIRED');checks+=2;

  // Blocked state with all 3 mandatory fields succeeds
  r=await call('/api/admin/work-center/'+encodeURIComponent(firstItem.item_key),'PATCH',{
    status:'blocked',
    priority:'high',
    blocked_reason:'Chờ xác nhận văn bản từ đơn vị cơ sở',
    blocked_missing_condition:'Bản sao quyết định cử nhân sự',
    blocked_coordination_party:'Ban Nhân sự & Văn phòng Trung ương',
    collaborators:['Ban Nhân sự','Ban Kiểm tra'],
    dependencies:['account_request:init'],
    handover_note:'Tạm chặn chờ bổ sung minh chứng'
  });
  assert.equal(r.status,200);assert.equal(r.workflow_state,'blocked');assert.equal(r.ok,true);checks+=2;

  // Verify GET /api/admin/work-center/:itemKey returns persisted state and audit history
  const wqDetail=await call('/api/admin/work-center/'+encodeURIComponent(firstItem.item_key),'GET');
  assert.equal(wqDetail.status,200);assert.equal(wqDetail.state.status,'blocked');assert(Array.isArray(wqDetail.history));assert(wqDetail.history.length>=1);checks+=4;

  // Reminder with 60-minute cooldown protection
  r=await call('/api/admin/work-center/'+encodeURIComponent(firstItem.item_key),'PATCH',{action:'remind'});
  assert.equal(r.ok,true);checks++;
  r=await call('/api/admin/work-center/'+encodeURIComponent(firstItem.item_key),'PATCH',{action:'remind'});
  assert.equal(r.status,429);assert.equal(r.error,'REMINDER_COOLDOWN_ACTIVE');checks+=2;

  // Bulk claim & bulk status transition
  r=await call('/api/admin/work-center/bulk','POST',{item_keys:[firstItem.item_key],action:'claim',handover_note:'Nhận việc hàng loạt'});
  assert.equal(r.status,200);assert.equal(r.updated_count,1);checks+=2;
}

// 8. Full Support Ticket Lifecycle: Impact Level, SLA, Duplicate Detection, Public/Internal Messages, Mandatory Resolution, Reopen & Satisfaction Rating
{
  // Create support ticket with high impact
  const t1=await call('/api/me/support','POST',{category:'Kỹ thuật & Tài khoản',subject:'Không tải được thẻ PDF hai mặt trên trình duyệt di động',body:'Khi bấm tải PDF thẻ thành viên trên điện thoại thì báo lỗi.',impact_level:'high',attachment_url:'/api/files/minh-chung.png'});
  assert.equal(t1.status,200);assert.equal(t1.ok,true);assert.equal(t1.impact_level,'high');assert.equal(t1.priority,'high');assert(t1.sla_resolution_due_at);checks+=5;

  // Create duplicate ticket within 7 days -> detected and linked without deleting
  const t2=await call('/api/me/support','POST',{category:'Kỹ thuật & Tài khoản',subject:'Không tải được thẻ PDF hai mặt trên trình duyệt di động',body:'Gửi lại yêu cầu hỗ trợ tải PDF.',impact_level:'medium'});
  assert.equal(t2.status,200);assert.equal(t2.potential_duplicate_ticket_code,t1.ticket_code);checks+=2;

  // Admin posts an internal note and a public reply
  r=await call(`/api/admin/support-tickets/${encodeURIComponent(t1.id)}/messages`,'POST',{visibility:'internal',body:'Ghi chú nội bộ: Kiểm tra bộ nhớ đệm SVG trên Safari iOS.'});
  assert.equal(r.status,201);assert.equal(r.visibility,'internal');checks+=2;
  r=await call(`/api/admin/support-tickets/${encodeURIComponent(t1.id)}/messages`,'POST',{visibility:'public',body:'Ban Kỹ thuật đã tiếp nhận và đang xử lý cho bạn.'});
  assert.equal(r.status,201);assert.equal(r.visibility,'public');checks+=2;

  // Member replies to ticket
  r=await call(`/api/me/support/${encodeURIComponent(t1.id)}/reply`,'POST',{body:'Cảm ơn Ban Kỹ thuật, tôi dùng iOS 17.'});
  assert.equal(r.status,201);checks++;

  // Verify member GET /api/me/support sees public messages & own reply, but NOT internal admin notes
  const mySupport=await call('/api/me/support','GET');
  const myT1=mySupport.items.find(x=>x.id===t1.id);
  assert(myT1);assert.equal(myT1.messages.length,2);assert(myT1.messages.every(m=>m.visibility!=='internal'));checks+=3;

  // Admin attempting to close ticket without resolution_note fails with 400 RESOLUTION_REQUIRED
  r=await call('/api/admin/support-tickets/'+encodeURIComponent(t1.id),'PATCH',{status:'completed',resolution_note:''});
  assert.equal(r.status,400);assert.equal(r.error,'RESOLUTION_REQUIRED');checks+=2;

  // Admin closes ticket with full resolution_note
  r=await call('/api/admin/support-tickets/'+encodeURIComponent(t1.id),'PATCH',{status:'completed',resolution_note:'Đã cập nhật cơ chế tạo Blob PDF trực tiếp tương thích Safari iOS.',closed_reason:'Đã khắc phục triệt để'});
  assert.equal(r.status,"completed");assert.equal(r.ok,true);checks+=2;

  // Member reopens closed ticket with reason
  r=await call(`/api/me/support/${encodeURIComponent(t1.id)}/reopen`,'POST',{reason:'Cần kiểm tra thêm ở chế độ dọc (portrait).'});
  assert.equal(r.status,200);assert.equal(r.ticket_status,'reopened');checks+=2;

  // Admin completes again, then member rates 5 stars
  await call('/api/admin/support-tickets/'+encodeURIComponent(t1.id),'PATCH',{status:'completed',resolution_note:'Đã kiểm tra cả chế độ ngang và dọc, hoạt động ổn định.'});
  r=await call(`/api/me/support/${encodeURIComponent(t1.id)}/feedback`,'POST',{score:5,comment:'Hỗ trợ rất nhanh và rõ ràng!'});
  assert.equal(r.status,200);assert.equal(r.score,5);checks+=2;
}

// 9. Workflow Bottleneck Analytics, Grounded Knowledge Assistant, Case Reconstruction & Data Consistency
{
  const wf=await call('/api/admin/workflows/analytics','GET');
  assert.equal(wf.status,200);assert.equal(wf.ok,true);assert(wf.workflow_metrics?.account_requests);assert(Array.isArray(wf.bottlenecks));assert(wf.bottlenecks.length>=1);checks+=5;

  const kn=await call('/api/admin/knowledge/assistant','POST',{question:'SLA phê duyệt hồ sơ đăng ký tài khoản'});
  assert.equal(kn.status,200);assert.equal(kn.ok,true);assert(Array.isArray(kn.verified_facts));assert(Array.isArray(kn.inferences_and_recommendations));checks+=4;

  const recon=await call('/api/admin/case-reconstruction?subject_id=p','GET');
  assert.equal(recon.status,200);assert.equal(recon.ok,true);assert.equal(recon.person.id,'p');assert(recon.timeline.length>=1);checks+=4;

  const dc=await call('/api/admin/data-consistency','GET');
  assert.equal(dc.status,200);assert.equal(dc.ok,true);assert.equal(dc.checks.length,8);checks+=3;
}


// =========================================================
// 10. SUPPLEMENT I–VIII: ACCOUNT LIFECYCLE (24h, 48h, 12m/1y), DYNAMIC FORMS, SUBMISSIONS, ATTACHMENTS, SIGNATURES & POLICIES
// =========================================================
{
  // 10.1 Account types & equivalence of 12 months / 1 year
  const at=await call('/api/public/account-types','GET');
  assert.equal(at.status,200);assert(at.items.length>=4);
  assert(at.items.some(x=>x.code==='trial_24h'&&x.duration_hours===24));
  assert(at.items.some(x=>x.code==='trial_48h'&&x.duration_hours===48));
  assert(at.items.some(x=>x.code==='annual_12m_1y'&&x.duration_months===12));
  assert(at.equivalence_note.includes('12 tháng')&&at.equivalence_note.includes('1 năm'));
  checks+=5;

  // 10.2 Trial 24h account registration after OTP verification -> activated with exact 24h expiry, NO Admin access
  const trialEmail='trial24h@skyfirst.io.vn';
  const trialOtp='112233';
  const trialHash=createHash('sha256').update(trialEmail+'|account_request|'+trialOtp).digest('hex');
  await dbRun("INSERT INTO email_otp_tokens(id,email,purpose,otp_hash,attempts,max_attempts,expires_at) VALUES('otp_t24',?,'account_request',?,0,5,datetime('now','+10 minutes'))",trialEmail,trialHash);
  const vRes=await call('/api/public/email-otp/verify','POST',{email:trialEmail,otp:trialOtp,purpose:'account_request'});
  assert.equal(vRes.status,200);const t24OtpToken=vRes.otp_verification_token;checks++;

  // Missing consent rejected
  r=await call('/api/public/trial-register','POST',{full_name:'Trial User 24h',email:trialEmail,phone:'0901112233',password:'TrialPass2026!',account_type_code:'trial_24h',otp_verification_token:t24OtpToken,read_acknowledged:'1',terms_accepted:'1',privacy_consent:'0'});
  assert.equal(r.httpStatus,400);assert.equal(r.error,'CONSENT_REQUIRED');checks+=2;

  // Valid trial 24h activation
  const t24=await call('/api/public/trial-register','POST',{full_name:'Trial User 24h',email:trialEmail,phone:'0901112233',password:'TrialPass2026!',account_type_code:'trial_24h',otp_verification_token:t24OtpToken,read_acknowledged:'1',terms_accepted:'1',privacy_consent:'1'});
  assert.equal(t24.status,201);assert.equal(t24.account_type_code,'trial_24h');assert.equal(t24.admin_access_granted,false);assert(t24.activated_at&&t24.expires_at);checks+=4;

  // Create a session for the 24h user and verify they can call /api/me but CANNOT access Admin (/api/admin/accounts-center -> 403)
  await dbRun("INSERT INTO sessions(id,account_id,token_hash,expires_at) VALUES('ses_t24',?,?,datetime('now','+1 day'))",t24.account_id,createHash('sha256').update('t24_token').digest('hex'));
  const callAsT24=async(path,method='GET',b)=>{const rq=new Request('https://nghiepvu.skyfirst.io.vn'+path,{method,headers:{cookie:'sfn_session=t24_token','content-type':'application/json',origin:'https://nghiepvu.skyfirst.io.vn'},body:b?JSON.stringify(b):undefined});const rs=await api(rq,{DB,FILES},new URL(rq.url));const j=await rs.json();return {httpStatus:rs.status,status:rs.status,...j}};
  const t24Me=await callAsT24('/api/me');
  assert.equal(t24Me.status,200);assert.equal(t24Me.is_super,false);checks+=2;
  const t24Admin=await callAsT24('/api/admin/accounts-center');
  assert.equal(t24Admin.status,403);checks++;

  // Expire the 24h account via Admin lifecycle API -> verify backend immediately blocks /api/me (401) AND /api/auth/login (403 ACCOUNT_EXPIRED)
  r=await call(`/api/admin/accounts-center/${encodeURIComponent(t24.account_id)}/lifecycle`,'PATCH',{action:'expire',reason:'Kiểm thử hết hạn 24 giờ'});
  assert.equal(r.httpStatus,200);assert.equal(r.lifecycle.lifecycle_status,'expired');checks+=2;
  const t24AfterExp=await callAsT24('/api/me');
  assert.equal(t24AfterExp.status,401);checks++;
  const t24LoginAfterExp=await call('/api/auth/login','POST',{login:t24.username,password:'TrialPass2026!'});
  assert.equal(t24LoginAfterExp.status,403);assert.equal(t24LoginAfterExp.error,'ACCOUNT_EXPIRED');checks+=2;

  // Admin renews the expired account to 48h -> user can access again
  r=await call(`/api/admin/accounts-center/${encodeURIComponent(t24.account_id)}/lifecycle`,'PATCH',{action:'renew',account_type_code:'trial_48h',reason:'Gia hạn lên gói 48 giờ'});
  assert.equal(r.httpStatus,200);assert.equal(r.lifecycle.account_type_code,'trial_48h');assert.equal(r.lifecycle.lifecycle_status,'active');checks+=3;

  // 10.3 Dynamic Form Builder: Admin creates a new form without editing code
  const fCreate=await call('/api/admin/forms','POST',{
    code:'FORM-TECH-2026',
    slug:'tuyen-ban-cong-nghe-2026',
    title:'Biểu mẫu Tuyển Cộng tác viên Ban Công nghệ Số',
    description:'Biểu mẫu động có đính kèm tệp và chữ ký xác nhận.',
    status:'published',
    require_attachment:true,
    require_signature:true,
    fields:[
      {code:'full_name',label:'Họ và tên',type:'text',required:true},
      {code:'email',label:'Email liên hệ',type:'email',required:true},
      {code:'github_or_portfolio',label:'Liên kết dự án / kinh nghiệm',type:'textarea',required:true}
    ]
  });
  assert.equal(fCreate.httpStatus,201);assert.equal(fCreate.status,'published');assert.equal(fCreate.version,1);const dynFormId=fCreate.id;checks+=2;

  // 10.4 Public user opens form, uploads attachment (valid & invalid), signs, consents, and submits with idempotency
  const badUploadRes=await api(new Request(`https://nghiepvu.skyfirst.io.vn/api/public/forms/${encodeURIComponent(dynFormId)}/upload`,{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/pdf','x-file-name':'fake.pdf'},body:new Uint8Array([1,2,3,4])}),{DB,FILES},new URL(`https://nghiepvu.skyfirst.io.vn/api/public/forms/${encodeURIComponent(dynFormId)}/upload`));
  assert.equal(badUploadRes.status,400);checks++;

  const validPdfBytes=new Uint8Array(Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF','utf8'));
  const okUploadRes=await api(new Request(`https://nghiepvu.skyfirst.io.vn/api/public/forms/${encodeURIComponent(dynFormId)}/upload`,{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/pdf','x-file-name':'ho-so-nang-luc.pdf'},body:validPdfBytes}),{DB,FILES},new URL(`https://nghiepvu.skyfirst.io.vn/api/public/forms/${encodeURIComponent(dynFormId)}/upload`));
  const okUploadBody=await okUploadRes.json();
  assert.equal(okUploadRes.status,201);assert.equal(okUploadBody.check_status,'verified_header');checks+=2;

  // Missing mandatory consent rejected
  r=await call(`/api/public/forms/${encodeURIComponent(dynFormId)}/submit`,'POST',{
    applicant_name:'Lê Văn Ứng Viên',
    applicant_email:'ungvien@skyfirst.io.vn',
    answers:{full_name:'Lê Văn Ứng Viên',email:'ungvien@skyfirst.io.vn',github_or_portfolio:'5 năm phát triển hệ thống số'},
    attachments:[okUploadBody],
    signature:{signature_type:'drawn_canvas',signature_data_url:'data:image/svg+xml;utf8,<svg></svg>',confirmed:'1'},
    consents:{'SFN-PDPD-NOTICE':'1','SFN-TERMS-USE':'0'}
  },{DB,FILES});
  assert.equal(r.httpStatus,400);assert.equal(r.error,'MANDATORY_POLICY_CONSENT_MISSING');checks+=2;

  // Valid submission with idempotency key
  const subRes=await call(`/api/public/forms/${encodeURIComponent(dynFormId)}/submit`,'POST',{
    idempotency_key:'idem-test-001',
    applicant_name:'Lê Văn Ứng Viên',
    applicant_email:'ungvien@skyfirst.io.vn',
    answers:{full_name:'Lê Văn Ứng Viên',email:'ungvien@skyfirst.io.vn',github_or_portfolio:'5 năm phát triển hệ thống số'},
    attachments:[okUploadBody],
    signature:{signature_type:'drawn_canvas',signature_data_url:'data:image/svg+xml;utf8,<svg></svg>',confirmed:'1'},
    consents:{'SFN-PDPD-NOTICE':'1','SFN-TERMS-USE':'1','SFN-OPT-NEWS':'0'}
  },{DB,FILES});
  assert.equal(subRes.httpStatus,201);assert.equal(subRes.status,'submitted');assert.equal(subRes.form_version,1);assert(subRes.submission_code&&subRes.signature_id&&subRes.content_version_hash);
  const subId=subRes.submission_id;checks+=3;

  // Retry with same idempotency_key does NOT create duplicate submission
  const subRetry=await call(`/api/public/forms/${encodeURIComponent(dynFormId)}/submit`,'POST',{
    idempotency_key:'idem-test-001',
    applicant_name:'Lê Văn Ứng Viên',
    applicant_email:'ungvien@skyfirst.io.vn',
    answers:{full_name:'Lê Văn Ứng Viên',email:'ungvien@skyfirst.io.vn',github_or_portfolio:'5 năm phát triển hệ thống số'},
    attachments:[okUploadBody],
    signature:{signature_type:'drawn_canvas',signature_data_url:'data:image/svg+xml;utf8,<svg></svg>',confirmed:'1'},
    consents:{'SFN-PDPD-NOTICE':'1','SFN-TERMS-USE':'1'}
  },{DB,FILES});
  assert.equal(subRetry.httpStatus,200);assert.equal(subRetry.deduplicated,true);assert.equal(subRetry.submission_id,subId);checks+=3;

  // 10.5 Admin edits the form -> form version becomes v2, while old submission keeps v1 snapshot intact!
  const fEdit=await call(`/api/admin/forms/${encodeURIComponent(dynFormId)}`,'PATCH',{
    title:'Biểu mẫu Tuyển CTV Ban Công nghệ Số (Đã nâng cấp v2)',
    fields:[
      {code:'full_name',label:'Họ và tên đầy đủ',type:'text',required:true},
      {code:'email',label:'Email',type:'email',required:true},
      {code:'new_v2_field',label:'Trường mới ở v2',type:'text',required:true}
    ]
  });
  assert.equal(fEdit.httpStatus,200);assert.equal(fEdit.version,2);checks+=2;

  const subDet1=await call(`/api/admin/submissions/${encodeURIComponent(subId)}`,'GET');
  assert.equal(subDet1.status,200);assert.equal(subDet1.submission.form_version,1);
  assert.equal(subDet1.submission.answers.github_or_portfolio,'5 năm phát triển hệ thống số');
  assert.equal(subDet1.signatures.length,1);assert.equal(subDet1.files.length,1);checks+=5;

  // 10.6 Admin requests supplement -> Applicant submits supplement -> History preserves original answers without overwriting evidence
  r=await call(`/api/admin/submissions/${encodeURIComponent(subId)}`,'PATCH',{status:'waiting_supplement',supplement_request_note:'Vui lòng bổ sung chứng chỉ chuyên môn.'});
  assert.equal(r.status,'waiting_supplement');checks++;

  r=await call(`/api/public/submissions/${encodeURIComponent(subRes.submission_code)}/supplement`,'POST',{
    email:'ungvien@skyfirst.io.vn',
    answers:{cert_link:'https://nghiepvu.skyfirst.io.vn/verify?code=CERT01'},
    note:'Đã bổ sung liên kết chứng chỉ'
  });
  assert.equal(r.status,'supplement_submitted');assert(r.history_count>=3);checks+=2;

  // Admin approves submission
  r=await call(`/api/admin/submissions/${encodeURIComponent(subId)}`,'PATCH',{status:'approved',decision_reason:'Hồ sơ đạt yêu cầu sau khi bổ sung'});
  assert.equal(r.status,'approved');checks++;

  // Close form -> new submissions rejected
  await call(`/api/admin/forms/${encodeURIComponent(dynFormId)}/close`,'POST',{});
  r=await call(`/api/public/forms/${encodeURIComponent(dynFormId)}/submit`,'POST',{applicant_name:'Late User',applicant_email:'late@skyfirst.io.vn',answers:{}});
  assert.equal(r.httpStatus,403);assert.equal(r.error,'FORM_CLOSED_OR_INACTIVE');checks+=2;

  // Unauthorized user cannot view submissions or download private submission attachment
  await dbRun("INSERT INTO sessions(id,account_id,token_hash,expires_at) VALUES('ses_t24_active',?,?,datetime('now','+1 day'))",t24.account_id,createHash('sha256').update('t24_active_tok').digest('hex'));
  const unauthSubReq=new Request(`https://nghiepvu.skyfirst.io.vn/api/admin/submissions/${encodeURIComponent(subId)}`,{headers:{cookie:'sfn_session=t24_active_tok',origin:'https://nghiepvu.skyfirst.io.vn'}});
  assert.equal((await api(unauthSubReq,{DB,FILES},new URL(unauthSubReq.url))).status,403);checks++;
  const unauthFileReq=new Request(`https://nghiepvu.skyfirst.io.vn${okUploadBody.file_url}`,{headers:{cookie:'sfn_session=t24_active_tok'}});
  assert.equal((await Worker.fetch(unauthFileReq,{DB,FILES})).status,403);checks++;

  // Policy versioning & Consent withdrawal
  r=await call('/api/admin/policies','POST',{policy_code:'SFN-PDPD-NOTICE',version_label:'2026.10-SFN-PDPD',title:'Duplicate version',content_summary:'S',content_body:'B'});
  assert.equal(r.httpStatus,409);assert.equal(r.error,'POLICY_VERSION_IMMUTABLE');checks+=2;
  r=await call('/api/admin/policies','POST',{policy_code:'SFN-PDPD-NOTICE',version_label:'2026.12-SFN-PDPD',title:'Updated Privacy Policy',content_summary:'Cập nhật mục đích mới',content_body:'Nội dung cập nhật',requires_reconsent:true});
  assert.equal(r.httpStatus,201);checks++;
  r=await call('/api/public/consent/withdraw','POST',{email:'ungvien@skyfirst.io.vn',policy_code:'SFN-OPT-NEWS',reason:'Không còn nhu cầu nhận bản tin mở rộng'});
  assert.equal(r.httpStatus,201);assert.equal(r.status,'received');checks+=2;
}

// =========================================================
// 11. SUPPLEMENT SK: EVENT MANAGEMENT LIFECYCLE, 3-DECISION SEPARATION, SOD & QR ATTENDANCE
// =========================================================
{
  // 11.1 Mandatory fields check on event draft creation
  r=await call('/api/admin/sk-events','POST',{name:'Sự kiện thiếu trường'});
  assert.equal(r.httpStatus,400);assert.equal(r.error,'EVENT_MANDATORY_FIELDS_MISSING');checks+=2;

  // Create valid SK event draft (owned/proposed by 'a')
  const evCreate=await call('/api/admin/sk-events','POST',{
    name:'Hội nghị Thường niên Mạng lưới Giáo dục Sky First 2026',
    purpose:'Tổng kết hoạt động giáo dục cộng đồng và triển khai kế hoạch năm mới',
    starts_at:'2026-12-01 08:00:00',
    ends_at:'2026-12-01 17:00:00',
    location_or_platform:'Trung tâm Hội nghị TP. Hồ Chí Minh',
    expected_participants:200,
    max_registrations:250
  });
  assert.equal(evCreate.httpStatus,201);assert.equal(evCreate.status,'draft');const skEvId=evCreate.id;checks+=2;

  // Draft event MUST NOT appear on public portal (/api/public/sk-events)
  let pubEvs=await call('/api/public/sk-events','GET');
  assert(!pubEvs.items.some(x=>x.id===skEvId));checks++;

  // Unapproved event CANNOT be published or open registration via direct API call
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'publish'});
  assert.equal(r.httpStatus,409);assert.equal(r.error,'PUBLISH_REQUIRES_APPROVAL');checks+=2;
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'open_registration'});
  assert.equal(r.httpStatus,409);assert.equal(r.error,'OPEN_REG_REQUIRES_PUBLISHED');checks+=2;

  // Unapproved event CANNOT issue active QR session
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/qr-sessions`,'POST',{session_name:'Phiên sáng'});
  assert.equal(r.httpStatus,409);assert.equal(r.error,'QR_ISSUANCE_EVENT_NOT_ELIGIBLE');checks+=2;

  // Submit -> Appraise
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'submit'});
  assert.equal(r.status,'pending_appraisal');checks++;
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'appraise',note:'Hồ sơ đầy đủ, khả thi'});
  assert.equal(r.status,'pending_approval');checks++;

  // Section V.2: Account without approval permission ('t24') CANNOT approve event (403 FORBIDDEN)
  const unauthApproveReq=new Request(`https://nghiepvu.skyfirst.io.vn/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,{method:'POST',headers:{cookie:'sfn_session=t24_active_tok','content-type':'application/json',origin:'https://nghiepvu.skyfirst.io.vn'},body:JSON.stringify({action:'approve'})});
  assert.equal((await api(unauthApproveReq,{DB,FILES},new URL(unauthApproveReq.url))).status,403);checks++;

  // Section V.2: Authorized Admin ('a') who created the event CAN self-approve their own event without waiting for another user!
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'approve',note:'Quản trị viên phê duyệt chủ trương tổ chức'});
  assert.equal(r.httpStatus,200);assert.equal(r.status,'approved');assert.equal(r.registration_state,'closed');checks+=3;

  const callAsRev=async(path,method='GET',b)=>{const rq=new Request('https://nghiepvu.skyfirst.io.vn'+path,{method,headers:{cookie:'sfn_session=rev_session_token','content-type':'application/json',origin:'https://nghiepvu.skyfirst.io.vn'},body:b?JSON.stringify(b):undefined});const rs=await api(rq,{DB,FILES},new URL(rq.url));const j=await rs.json();return {httpStatus:rs.status,status:rs.status,...j}};

  // Approved event STILL does not appear on public portal until explicitly published! (Separation of Approve vs Publish)
  pubEvs=await call('/api/public/sk-events','GET');
  assert(!pubEvs.items.some(x=>x.id===skEvId));checks++;

  // Admin 'a' publishes event -> Now appears on public portal, but registration is still closed
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'publish'});
  assert.equal(r.status,'published');assert.equal(r.registration_state,'closed');checks+=2;
  pubEvs=await call('/api/public/sk-events','GET');
  assert(pubEvs.items.some(x=>x.id===skEvId));checks++;
  r=await call(`/api/public/sk-events/${encodeURIComponent(skEvId)}/register`,'POST',{full_name:'Người Tham Gia 1',email:'pt1@skyfirst.io.vn'});
  assert.equal(r.httpStatus,403);assert.equal(r.error,'EVENT_REGISTRATION_NOT_OPEN');checks+=2;

  // Open registration -> Participant registers -> Admin approves registration
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'open_registration'});
  assert.equal(r.status,'registration_open');assert.equal(r.registration_state,'open');checks+=2;
  const pReg=await call(`/api/public/sk-events/${encodeURIComponent(skEvId)}/register`,'POST',{full_name:'Nguyễn Tham Gia',email:'nguyentg@skyfirst.io.vn',phone:'0909998888'});
  assert.equal(pReg.httpStatus,201);const evRegId=pReg.id;checks++;
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/registrations/${encodeURIComponent(evRegId)}`,'PATCH',{status:'approved'});
  assert.equal(r.status,'approved');checks++;

  // Tasks & Budget approval by authorized Admin 'a'
  await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/tasks`,'POST',{title:'Chuẩn bị hội trường',weight:2,status:'completed'});
  await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/tasks`,'POST',{title:'Đón tiếp đại biểu',weight:2,status:'not_started'});
  const budCreate=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/budgets`,'POST',{category:'Âm thanh ánh sáng',description:'Thuê hệ thống âm thanh',estimated_amount:5000000});
  assert.equal(budCreate.httpStatus,201);
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/budgets/${encodeURIComponent(budCreate.id)}`,'PATCH',{status:'approved',approved_amount:5000000});
  assert.equal(r.httpStatus,200);assert.equal(r.status,'approved');checks+=2;

  // Issue QR session with require_approved_registration: true for closed-registration test, plus verify manual_code & /q-r/tenhd URL
  const qrSes=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/qr-sessions`,'POST',{session_name:'Phiên Khai mạc',require_approved_registration:true});
  assert.equal(qrSes.httpStatus,201);assert(qrSes.qr_token);assert(qrSes.manual_code);assert(qrSes.qr_path.startsWith('/q-r/'));checks+=4;

  // Unapproved/unregistered participant blocked when require_approved_registration=true on legacy endpoint
  r=await call('/api/sk-attendance/checkin','POST',{qr_token:qrSes.qr_token,email:'stranger@skyfirst.io.vn',full_name:'Người Lạ'});
  assert.equal(r.httpStatus,403);assert.equal(r.error,'PARTICIPANT_NOT_ELIGIBLE');checks+=2;

  // Approved participant checks in via QR
  r=await call('/api/sk-attendance/checkin','POST',{qr_token:qrSes.qr_token,email:'nguyentg@skyfirst.io.vn',full_name:'Nguyễn Tham Gia'});
  assert.equal(r.httpStatus,201);assert.equal(r.attendance_status,'checked_in');checks+=2;

  // Duplicate check-in in same session is blocked!
  r=await call('/api/sk-attendance/checkin','POST',{qr_token:qrSes.qr_token,email:'nguyentg@skyfirst.io.vn',full_name:'Nguyễn Tham Gia'});
  assert.equal(r.httpStatus,409);assert.equal(r.error,'DUPLICATE_CHECKIN_BLOCKED');checks+=2;

  // Manual attendance adjustment without reason is rejected (400)
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/attendance/manual`,'POST',{session_id:qrSes.id,email:'manual@skyfirst.io.vn',full_name:'Khách Mời',attendance_status:'manual_present',reason:''});
  assert.equal(r.httpStatus,400);assert.equal(r.error,'MANUAL_REASON_REQUIRED');checks+=2;

  // Manual attendance adjustment with mandatory reason succeeds and logs operator
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/attendance/manual`,'POST',{session_id:qrSes.id,email:'manual@skyfirst.io.vn',full_name:'Khách Mời',attendance_status:'manual_present',reason:'Xác nhận có mặt trực tiếp tại bàn lễ tân'});
  assert.equal(r.httpStatus,200);assert.equal(r.attendance_status,'manual_present');checks+=2;

  // Revoke QR session -> subsequent scans rejected with 410 QR_REVOKED
  await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/qr-sessions/${encodeURIComponent(qrSes.id)}/revoke`,'POST',{reason:'Kết thúc phiên điểm danh'});
  r=await call('/api/sk-attendance/checkin','POST',{qr_token:qrSes.qr_token,email:'nguyentg@skyfirst.io.vn'});
  assert.equal(r.httpStatus,410);assert.equal(r.error,'QR_REVOKED');checks+=2;

  // Major change after approval (changing location_or_platform) triggers re-approval, and Admin 'a' can immediately re-approve!
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}`,'PATCH',{location_or_platform:'Địa điểm mới thay đổi trọng yếu'});
  assert.equal(r.status,'pending_approval');assert.equal(r.triggered_reapproval,true);assert.equal(r.registration_state,'closed');checks+=3;

  // Admin 'a' re-approves, publishes, completes, submits summary report grounded in real DB counts, and closes event
  await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'approve'});
  await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'publish'});
  await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'complete'});
  await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'submit_summary',note:'Đã hoàn thành hội nghị tốt đẹp'});
  r=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}/transition`,'POST',{action:'approve_summary_and_close'});
  assert.equal(r.status,'closed');assert.equal(r.summary_report_state,'approved');checks+=2;

  const evFinal=await call(`/api/admin/sk-events/${encodeURIComponent(skEvId)}`,'GET');
  assert.equal(evFinal.event.progress_pct,50);
  assert.equal(evFinal.event.summary_report.actual_metrics_from_db.total_registered,1);
  assert.equal(evFinal.event.summary_report.actual_metrics_from_db.total_attended,2);
  checks+=3;
}

// =========================================================
// 12. TWO-WAY CHAT RETIRED (410 GONE) & ONE-WAY OFFICIAL ANNOUNCEMENT CHANNEL ACTIVE (MỤC III)
// =========================================================
{
  // Two-way chat endpoints MUST return 410 GONE (CHAT_FEATURE_RETIRED)
  const chatGet=await call('/api/chat/conversations','GET');
  assert.equal(chatGet.httpStatus,410);assert.equal(chatGet.error,'CHAT_FEATURE_RETIRED');checks+=2;

  const chatPost=await call('/api/chat/conversations','POST',{conv_type:'group',title:'Test'});
  assert.equal(chatPost.httpStatus,410);assert.equal(chatPost.error,'CHAT_FEATURE_RETIRED');checks+=2;

  const chatUp=new Request('https://nghiepvu.skyfirst.io.vn/api/chat/upload',{method:'POST',headers:{cookie:'sfn_session=admin_session_token',origin:'https://nghiepvu.skyfirst.io.vn'}});
  assert.equal((await api(chatUp,{DB,FILES},new URL(chatUp.url))).status,410);checks++;

  // Regular user posting to 1-way announcement channel is blocked (403)
  const unauthPostReq=new Request('https://nghiepvu.skyfirst.io.vn/api/community/posts',{method:'POST',headers:{cookie:'sfn_session=t24_active_tok','content-type':'application/json',origin:'https://nghiepvu.skyfirst.io.vn'},body:JSON.stringify({group_id:'grp_official_bch',post_kind:'official_announcement',title:'Fake Official',body:'Should be blocked'})});
  assert.equal((await api(unauthPostReq,{DB,FILES},new URL(unauthPostReq.url))).status,403);checks++;

  // Regular user proposing an official_announcement in general group goes to 'pending_approval', NOT auto-published!
  const propPostReq=new Request('https://nghiepvu.skyfirst.io.vn/api/community/posts',{method:'POST',headers:{cookie:'sfn_session=t24_active_tok','content-type':'application/json',origin:'https://nghiepvu.skyfirst.io.vn'},body:JSON.stringify({group_id:'grp_general_community',post_kind:'official_announcement',title:'Đề xuất thông báo',body:'Nội dung chờ duyệt'})});
  const propPostRes=await api(propPostReq,{DB,FILES},new URL(propPostReq.url));
  const propPostBody=await propPostRes.json();
  assert.equal(propPostRes.status,201);assert.equal(propPostBody.moderation_status,'pending_approval');checks+=2;

  // Moderator approves and publishes the announcement, and members can acknowledge/react, while two-way comments are disabled (410)
  r=await call(`/api/community/posts/${encodeURIComponent(propPostBody.id)}/moderate`,'POST',{action:'publish'});
  assert.equal(r.httpStatus,200);assert.equal(r.moderation_status,'published');checks+=2;

  r=await call(`/api/community/posts/${encodeURIComponent(propPostBody.id)}/react`,'POST',{reaction_type:'like'});
  assert.equal(r.httpStatus,200);assert.equal(r.reaction_count,1);checks+=2;

  r=await call(`/api/community/posts/${encodeURIComponent(propPostBody.id)}/comments`,'POST',{body:'Bình luận hai chiều bị khóa'});
  assert.equal(r.httpStatus,410);assert.equal(r.error,'TWO_WAY_CHAT_DISABLED');checks+=2;
}

// =========================================================
// 13. SKY FIRST DEEP REMEDIATION & END-TO-END SYSTEM VERIFICATION
// =========================================================
{
  // 13.1 Simulate legacy v17 support_ticket_assignments table missing impact_level & companion columns
  await dbExec(`
    DROP TABLE support_ticket_assignments;
    CREATE TABLE support_ticket_assignments(
      ticket_id TEXT PRIMARY KEY,
      org_node_id TEXT,
      assigned_account_id TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      sla_due_at TEXT,
      sla_breached INTEGER NOT NULL DEFAULT 0,
      resolution_note TEXT,
      closed_reason TEXT,
      responded_at TEXT,
      resolved_at TEXT,
      updated_by_account_id TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO support_ticket_assignments(ticket_id, org_node_id, assigned_account_id, priority, resolution_note)
    VALUES ('ticket_legacy_v17', 'org_sfn', 'a', 'high', 'Dữ liệu phiếu hỗ trợ cũ phải được bảo toàn 100%');
  `);

  // With check_only=1, both system-health and release-readiness must detect missing support_ticket_assignments.impact_level and NEVER report passed!
  const rawHealth=await call('/api/admin/system-health?check_only=1','GET');
  assert.equal(rawHealth.schema_status,'outdated');
  assert(rawHealth.missing_columns.includes('support_ticket_assignments.impact_level'));
  checks+=2;

  const rawRel=await call('/api/admin/release-readiness?check_only=1','GET');
  assert.equal(rawRel.code_package_ready,false);
  const rawSchemaGate=rawRel.gates.find(g=>g.code==='SCHEMA_VERSION');
  assert.equal(rawSchemaGate.status,'failed');
  assert(rawSchemaGate.missing_columns.includes('support_ticket_assignments.impact_level'));
  checks+=3;

  // Now run POST /api/admin/schema-reconcile (or normal system-health) and verify it heals support_ticket_assignments.impact_level while preserving data!
  const rec=await call('/api/admin/schema-reconcile','POST',{});
  assert.equal(rec.httpStatus,200);
  assert.equal(rec.ok,true);
  assert.equal(rec.schema_status,'current');
  assert.deepEqual(rec.missing_tables,[]);
  assert.deepEqual(rec.missing_columns,[]);
  assert(rec.reconciled_columns.includes('support_ticket_assignments.impact_level'));
  checks+=6;

  const preservedRow=await dbGet("SELECT * FROM support_ticket_assignments WHERE ticket_id='ticket_legacy_v17'");
  assert(preservedRow);
  assert.equal(preservedRow.priority,'high');
  assert.equal(preservedRow.impact_level,'medium');
  assert.equal(preservedRow.resolution_note,'Dữ liệu phiếu hỗ trợ cũ phải được bảo toàn 100%');
  checks+=4;

  // 13.2 Safe Non-Destructive R2 Read/Write/Read-Back/Delete Probe
  const r2ProbeRes=await call('/api/admin/r2-probe','POST',{},{DB,FILES});
  assert.equal(r2ProbeRes.httpStatus,200);
  assert.equal(r2ProbeRes.ok,true);
  assert.equal(r2ProbeRes.status,'passed');
  assert.deepEqual(r2ProbeRes.steps,{
    binding_present:true,
    list_ok:true,
    write_ok:true,
    readback_verified:true,
    delete_verified:true
  });
  // Confirm probe object was deleted from bucket and /files/_system_health_probes/... is blocked
  assert.equal([...bucket.keys()].some(k=>k.startsWith('_system_health_probes/')),false);
  const blockedProbeFile=await Worker.fetch(new Request('https://nghiepvu.skyfirst.io.vn/files/_system_health_probes/probe.txt'),{DB,FILES});
  assert.equal(blockedProbeFile.status,400);
  checks+=6;

  // Test failing R2 write probe when bucket put throws an error
  const brokenR2={
    async list(){return {objects:[]};},
    async put(){throw new Error('Simulated R2 write permission denied');},
    async get(){return null;},
    async delete(){}
  };
  const failedR2Probe=await call('/api/admin/r2-probe','POST',{},{DB,FILES:brokenR2});
  assert.equal(failedR2Probe.httpStatus,502);
  assert.equal(failedR2Probe.ok,false);
  assert.equal(failedR2Probe.status,'failed');
  assert.equal(failedR2Probe.steps.list_ok,true);
  assert.equal(failedR2Probe.steps.write_ok,false);
  // Restore passing R2 probe
  await call('/api/admin/r2-probe','POST',{},{DB,FILES});
  checks+=5;

  // 13.3 Controlled Email & OTP Diagnostic Test Send + Anti-Duplicate Retry Lock
  const unconfirmedMail=await call('/api/admin/email-center/test-send','POST',{recipient_email:'nghiepvu@skyfirst.io.vn',confirm_controlled_send:false});
  assert.equal(unconfirmedMail.httpStatus,400);
  assert.equal(unconfirmedMail.error,'CONTROLLED_SEND_CONFIRMATION_REQUIRED');
  checks+=2;

  const diagMail=await call('/api/admin/email-center/test-send','POST',{recipient_email:'nghiepvu@skyfirst.io.vn',test_type:'diagnostic_email',confirm_controlled_send:true});
  assert.equal(diagMail.httpStatus,202);
  assert.equal(diagMail.delivery_status,'not_configured');
  assert.equal(diagMail.provider_accepted,false);
  assert(diagMail.log_id);
  checks+=4;

  // Retry once -> retry_count becomes 1; immediate second retry with enforce_cooldown=true is blocked with 429 EMAIL_RETRY_COOLDOWN_ACTIVE
  const retry1=await call(`/api/admin/email-center/${encodeURIComponent(diagMail.log_id)}/retry`,'POST',{enforce_cooldown:true});
  assert.equal(retry1.httpStatus,202);
  assert.equal(retry1.retry_count,1);
  const retryCooldown=await call(`/api/admin/email-center/${encodeURIComponent(diagMail.log_id)}/retry`,'POST',{enforce_cooldown:true});
  assert.equal(retryCooldown.httpStatus,429);
  assert.equal(retryCooldown.error,'EMAIL_RETRY_COOLDOWN_ACTIVE');
  checks+=4;

  // 13.4 3-Layer Legal Gate & Sign-off Verification
  const legalRev1=await call('/api/admin/governance/legal-review','GET');
  assert.equal(legalRev1.httpStatus,200);
  assert.equal(legalRev1.technical_controls_status,'passed');
  assert.equal(legalRev1.legal_documents_seeded,true);
  assert.equal(legalRev1.legal_signoff_status,'pending_legal_review');
  assert.equal(legalRev1.overall_status,'technical_passed_pending_legal_signoff');
  checks+=5;

  const badSignoff=await call('/api/admin/governance/legal-signoff','POST',{status:'approved',reviewer_name:''});
  assert.equal(badSignoff.httpStatus,400);
  assert.equal(badSignoff.error,'LEGAL_SIGNOFF_EVIDENCE_REQUIRED');
  const okSignoff=await call('/api/admin/governance/legal-signoff','POST',{status:'approved',reviewer_name:'Ban Pháp chế Sky First',evidence_ref:'BB-PL-2026-10'});
  assert.equal(okSignoff.httpStatus,200);
  const legalRev2=await call('/api/admin/governance/legal-review','GET');
  assert.equal(legalRev2.overall_status,'passed');
  // Reset back to pending_legal_review so default state remains honest
  await call('/api/admin/governance/legal-signoff','POST',{status:'pending_legal_review'});
  checks+=5;

  // 13.5 8-Rule Data Consistency Detection & Automated Remediation
  await dbRun("INSERT INTO member_cards(id,person_id,card_type_id,org_node_id,card_number,issued_at,expires_at,status,verify_token) VALUES('card_exp_test','p','card_volunteer','org_sfn','SFN-EXP-999','2024-01-01','2025-01-01','active','tok_exp_999')");
  await dbRun("DELETE FROM support_ticket_assignments WHERE ticket_id='ticket_legacy_v17'");
  const dcBefore=await call('/api/admin/data-consistency','GET');
  assert.equal(dcBefore.httpStatus,200);
  assert.equal(dcBefore.consistent,false);
  assert(dcBefore.total_inconsistencies>=1);
  assert(dcBefore.checks.find(c=>c.code==='EXPIRED_ACTIVE_CARDS').count>=1);
  assert(dcBefore.checks.every(c=>typeof c.remediation==='string'&&c.remediation.length>5));
  checks+=5;

  const dcRem=await call('/api/admin/data-consistency/remediate','POST',{});
  assert.equal(dcRem.httpStatus,200);
  assert(dcRem.remediated.expired_cards_updated>=1);
  const dcAfter=await call('/api/admin/data-consistency','GET');
  assert.equal(dcAfter.consistent,true);
  assert.equal(dcAfter.total_inconsistencies,0);
  checks+=4;

  // 13.6 Encrypted ZIP Header Detection & Deterministic Export Bundle SHA-256 Match
  const encZip=new Uint8Array(38);
  const dv=new DataView(encZip.buffer);
  dv.setUint32(0,0x04034b50,true);
  dv.setUint16(6,0x0001,true); // Bit 0 = Encrypted!
  dv.setUint32(18,0,true);
  dv.setUint32(22,10,true);
  dv.setUint16(26,8,true);
  encZip.set(new TextEncoder().encode('test.txt'),30);
  const encReq=new Request('https://nghiepvu.skyfirst.io.vn/api/admin/archive-inspect',{method:'POST',headers:{cookie:'sfn_session=test',origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/zip'},body:encZip});
  const encRes=await api(encReq,{DB,FILES},new URL(encReq.url));
  const encBody=await encRes.json();
  assert.equal(encRes.status,400);
  assert.equal(encBody.valid,false);
  assert.equal(encBody.reason,'ENCRYPTED_ZIP_ENTRY_FORBIDDEN');
  checks+=3;


  // 13.7 Web-Integrated Desktop Download Center (.exe & .dmg endpoints + metadata)
  const dlMeta=await call('/api/public/desktop-downloads','GET');
  assert.equal(dlMeta.httpStatus,200);
  assert.equal(dlMeta.version,'6.0.0');
  assert.equal(dlMeta.windows.execution_level,'asInvoker');
  assert.equal(dlMeta.macos.bundle_id,'vn.io.skyfirst.nghiepvu.desktop');
  const exeRes=await Worker.fetch(new Request('https://nghiepvu.skyfirst.io.vn/api/public/desktop-downloads/windows.exe'),{DB,FILES});
  assert.equal(exeRes.status,200);
  const exeBytes=new Uint8Array(await exeRes.arrayBuffer());
  assert.equal(exeBytes[0],0x4d);assert.equal(exeBytes[1],0x5a); // MZ magic
  const dmgRes=await Worker.fetch(new Request('https://nghiepvu.skyfirst.io.vn/api/public/desktop-downloads/macos.dmg'),{DB,FILES});
  assert.equal(dmgRes.status,200);
  const dmgBytes=new Uint8Array(await dmgRes.arrayBuffer());
  assert.equal(new TextDecoder().decode(dmgBytes.slice(-512,-508)),'koly'); // Apple UDIF koly trailer
  checks+=8;

  const expBundle=await call('/api/admin/export-bundle','GET');
  assert.equal(expBundle.httpStatus,200);
  const recomputedHash=createHash('sha256').update(JSON.stringify(expBundle.bundle)).digest('hex');
  assert.equal(expBundle.sha256_checksum,recomputedHash);
  checks+=2;
}


// =========================================================
// 14. REGISTRATION 4-STEP CONFIRMATION FILE, PUBLIC EVENT DETAIL, PRIVATE PROOF UPLOAD & QR -> MEMBER HISTORY SYNC
// =========================================================
{
  // 14.1 Test Step 04 Confirmation File Upload (POST /api/public/request-confirmation-file)
  const badConfReq=new Request('https://nghiepvu.skyfirst.io.vn/api/public/request-confirmation-file',{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/pdf'},body:new TextEncoder().encode('NOT_A_PDF')});
  const badConfRes=await api(badConfReq,{DB,FILES},new URL(badConfReq.url));
  assert.equal(badConfRes.status,400);
  checks++;

  const validPdfBytes=new TextEncoder().encode('%PDF-1.4\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF');
  const okConfReq=new Request('https://nghiepvu.skyfirst.io.vn/api/public/request-confirmation-file',{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/pdf'},body:validPdfBytes});
  const okConfRes=await api(okConfReq,{DB,FILES},new URL(okConfReq.url));
  const okConfBody=await okConfRes.json();
  assert.equal(okConfRes.status,201);
  assert.match(okConfBody.url,/^\/files\/requests\/confirmations\/.+\.pdf$/);
  // Anonymous GET on private confirmation file must be blocked (401)
  const anonConfGet=await Worker.fetch(new Request('https://nghiepvu.skyfirst.io.vn'+okConfBody.url),{DB,FILES});
  assert.equal(anonConfGet.status,401);
  checks+=3;

  // 14.2 End-to-End Public Activity Detail -> Private Proof Upload -> Registration -> QR Check-in -> Member History Sync
  await dbRun("UPDATE people SET email='member.sync@skyfirst.io.vn' WHERE id='p'");
  const evCreate=await call('/api/admin/sk-events','POST',{
    name:'Ngày hội Tình nguyện Số Sky First 2026',
    purpose:'Chương trình tập huấn và hoạt động cộng đồng toàn mạng lưới',
    starts_at:'2026-11-15 08:00:00',
    ends_at:'2026-11-15 17:00:00',
    location_or_platform:'Hội trường Trung tâm TP.HCM',
    host_org_id:'org_sfn',
    require_registration_approval:false
  });
  assert.equal(evCreate.httpStatus,201);
  const syncEvId=evCreate.id;

  // Draft event must NOT be accessible on public detail endpoint (404)
  const draftDetail=await call(`/api/public/sk-events/${encodeURIComponent(syncEvId)}`,'GET');
  assert.equal(draftDetail.httpStatus,404);
  checks+=2;

  // Submit -> Appraise -> Approve (by a_rev) -> Publish -> Open Registration
  await call(`/api/admin/sk-events/${encodeURIComponent(syncEvId)}/transition`,'POST',{action:'submit'});
  const callRev=async(p,m='GET',b)=>{const rq=new Request('https://nghiepvu.skyfirst.io.vn'+p,{method:m,headers:{cookie:'sfn_session=rev_session_token','content-type':'application/json',origin:'https://nghiepvu.skyfirst.io.vn'},body:b?JSON.stringify(b):undefined});const rs=await api(rq,{DB,FILES},new URL(rq.url));return {httpStatus:rs.status,...(await rs.json())}};
  await callRev(`/api/admin/sk-events/${encodeURIComponent(syncEvId)}/transition`,'POST',{action:'appraise'});
  await callRev(`/api/admin/sk-events/${encodeURIComponent(syncEvId)}/transition`,'POST',{action:'approve'});
  await callRev(`/api/admin/sk-events/${encodeURIComponent(syncEvId)}/transition`,'POST',{action:'publish'});
  await callRev(`/api/admin/sk-events/${encodeURIComponent(syncEvId)}/transition`,'POST',{action:'open_registration'});

  // Public detail endpoint now returns 200
  const pubDetail=await call(`/api/public/sk-events/${encodeURIComponent(syncEvId)}`,'GET');
  assert.equal(pubDetail.httpStatus,200);
  assert.equal(pubDetail.event.name,'Ngày hội Tình nguyện Số Sky First 2026');
  checks+=2;

  // Upload private proof asset for the event
  const proofReq=new Request(`https://nghiepvu.skyfirst.io.vn/api/public/sk-events/${encodeURIComponent(syncEvId)}/upload-asset`,{method:'POST',headers:{origin:'https://nghiepvu.skyfirst.io.vn','content-type':'application/pdf'},body:validPdfBytes});
  const proofRes=await api(proofReq,{DB,FILES},new URL(proofReq.url));
  const proofBody=await proofRes.json();
  assert.equal(proofRes.status,201);
  assert.match(proofBody.url,/^\/files\/events\/private\//);
  // Anonymous GET on private event proof asset is blocked (401)
  const anonProofGet=await Worker.fetch(new Request('https://nghiepvu.skyfirst.io.vn'+proofBody.url),{DB,FILES});
  assert.equal(anonProofGet.status,401);
  checks+=3;

  // Member registers on the public event detail page
  const evReg=await call(`/api/public/sk-events/${encodeURIComponent(syncEvId)}/register`,'POST',{
    full_name:'Test Member',
    email:'member.sync@skyfirst.io.vn',
    phone:'0909123456',
    answers:{proof_asset_url:proofBody.url,confirmation_note:'Cam kết tham gia'}
  });
  assert.equal(evReg.httpStatus,201);
  assert.equal(evReg.status,'approved');
  checks+=2;

  // Issue QR session and check in
  const qrSes2=await call(`/api/admin/sk-events/${encodeURIComponent(syncEvId)}/qr-sessions`,'POST',{session_name:'Buổi sáng'});
  assert.equal(qrSes2.httpStatus,201);
  const chkRes=await call('/api/sk-attendance/checkin','POST',{qr_token:qrSes2.qr_token,email:'member.sync@skyfirst.io.vn',full_name:'Test Member'});
  assert.equal(chkRes.httpStatus,201);
  assert.equal(chkRes.attendance_status,'checked_in');

  // Verify public status lookup reflects attendance
  const stLookup=await call(`/api/public/sk-events/${encodeURIComponent(syncEvId)}/status-lookup`,'POST',{email:'member.sync@skyfirst.io.vn'});
  assert.equal(stLookup.httpStatus,200);
  assert.equal(stLookup.attended,true);

  // Verify Member Activity History (/api/me/activities & /api/me/cv) was automatically synchronized!
  const meActs=await call('/api/me/activities','GET');
  assert.equal(meActs.httpStatus,200);
  assert(meActs.items.some(a=>a.id===syncEvId&&a.verification_status==='confirmed'&&a.result==='Đã điểm danh tham dự'));
  const meCv=await call('/api/me/cv','GET');
  assert.equal(meCv.httpStatus,200);
  assert(meCv.activities.some(a=>a.id===syncEvId));
  checks+=6;
}


// =========================================================
// 15. PUBLIC LOGIN-FREE QR & MANUAL CODE CHECK-IN (/q-r/tenhd) WITH MANDATORY EVIDENCE PHOTO (MỤC IV & VII)
// =========================================================
{
  const pubCall = async (path, method = 'GET', bodyObj = null) => {
    const rq = new Request('https://nghiepvu.skyfirst.io.vn' + path, {
      method,
      headers: {
        origin: 'https://nghiepvu.skyfirst.io.vn',
        ...(bodyObj ? { 'content-type': 'application/json' } : {})
      },
      body: bodyObj ? JSON.stringify(bodyObj) : undefined
    });
    const rs = await api(rq, { DB, FILES }, new URL(rq.url));
    const j = await rs.json().catch(() => ({}));
    return { httpStatus: rs.status, ...j };
  };

  // 1. Admin creates activity with custom slug 'ngay-hoi-so-skyfirst-2026' and Attendance Manager, self-approves & publishes it
  const evQrCreate = await call('/api/admin/sk-events', 'POST', {
    name: 'Ngày hội Nghiệp vụ Số Sky First 2026',
    slug: 'ngay-hoi-so-skyfirst-2026',
    purpose: 'Hoạt động điểm danh QR công khai không cần đăng nhập',
    starts_at: '2026-01-01 08:00:00',
    ends_at: '2027-12-31 20:00:00',
    location_or_platform: 'TP. Hồ Chí Minh',
    lead_person_name: 'Trần Quản Trị',
    attendance_manager_name: 'Lê Phụ Trách Điểm Danh',
    attendance_manager_email: 'diemdanh@skyfirst.io.vn',
    attendance_manager_phone: '0912345678'
  });
  assert.equal(evQrCreate.httpStatus, 201);
  assert.equal(evQrCreate.slug, 'ngay-hoi-so-skyfirst-2026');
  assert.equal(evQrCreate.qr_url, 'https://nghiepvu.skyfirst.io.vn/q-r/ngay-hoi-so-skyfirst-2026');
  checks += 3;

  // Before approval, /api/public/q-r/ngay-hoi-so-skyfirst-2026 returns 403 EVENT_NOT_OPEN_FOR_CHECKIN (never redirects to login)
  const preOpenInfo = await pubCall('/api/public/q-r/ngay-hoi-so-skyfirst-2026', 'GET');
  assert.equal(preOpenInfo.httpStatus, 403);
  assert.equal(preOpenInfo.error, 'EVENT_NOT_OPEN_FOR_CHECKIN');
  checks += 2;

  // Non-existent slug returns 404 EVENT_NOT_FOUND
  const notFoundInfo = await pubCall('/api/public/q-r/hoat-dong-khong-ton-tai-999', 'GET');
  assert.equal(notFoundInfo.httpStatus, 404);
  assert.equal(notFoundInfo.error, 'EVENT_NOT_FOUND');
  checks += 2;

  // Admin self-approves and publishes the activity directly (Section V.2)
  const selfApp = await call(`/api/admin/sk-events/${encodeURIComponent(evQrCreate.id)}/transition`, 'POST', { action: 'approve', note: 'Admin tự phê duyệt hoạt động' });
  assert.equal(selfApp.httpStatus, 200);
  assert.equal(selfApp.status, 'approved');
  const selfPub = await call(`/api/admin/sk-events/${encodeURIComponent(evQrCreate.id)}/transition`, 'POST', { action: 'publish' });
  assert.equal(selfPub.httpStatus, 200);
  assert.equal(selfPub.status, 'published');
  checks += 4;

  // Issue QR session with manual code 'SKM-2026OK'
  const qrSessionRes = await call(`/api/admin/sk-events/${encodeURIComponent(evQrCreate.id)}/qr-sessions`, 'POST', {
    session_name: 'Ca Sáng Ngày Hội Số',
    manual_code: 'SKM-2026OK',
    attendance_manager_name: 'Lê Phụ Trách Điểm Danh'
  });
  assert.equal(qrSessionRes.httpStatus, 201);
  assert.equal(qrSessionRes.manual_code, 'SKM-2026OK');
  assert.equal(qrSessionRes.qr_path, '/q-r/ngay-hoi-so-skyfirst-2026');
  checks += 3;

  // 2. Unauthenticated visitor opens /api/public/q-r/ngay-hoi-so-skyfirst-2026?t=<qr_token> -> 200 OK with exact activity name & valid token state
  const openInfo = await pubCall(`/api/public/q-r/ngay-hoi-so-skyfirst-2026?t=${encodeURIComponent(qrSessionRes.qr_token)}`, 'GET');
  assert.equal(openInfo.httpStatus, 200);
  assert.equal(openInfo.event.name, 'Ngày hội Nghiệp vụ Số Sky First 2026');
  assert.equal(openInfo.event.attendance_manager_name, 'Lê Phụ Trách Điểm Danh');
  assert.equal(openInfo.checkin_open, true);
  assert.equal(openInfo.token_state.valid, true);
  checks += 5;

  // QR PNG image endpoint works publicly without login
  const qrImgReq = new Request(`https://nghiepvu.skyfirst.io.vn/api/public/q-r/ngay-hoi-so-skyfirst-2026/qr-image?t=${encodeURIComponent(qrSessionRes.qr_token)}`);
  const qrImgRes = await api(qrImgReq, { DB, FILES }, new URL(qrImgReq.url));
  assert.equal(qrImgRes.status, 200);
  assert.equal(qrImgRes.headers.get('content-type'), 'image/png');
  checks += 2;

  // 3. Evidence photo upload validation: reject non-image / forged bytes (400), accept valid PNG (201)
  const badEvReq = new Request('https://nghiepvu.skyfirst.io.vn/api/public/q-r/ngay-hoi-so-skyfirst-2026/upload-evidence', {
    method: 'POST',
    headers: { origin: 'https://nghiepvu.skyfirst.io.vn', 'content-type': 'image/png' },
    body: new Uint8Array([1, 2, 3, 4, 5])
  });
  assert.equal((await api(badEvReq, { DB, FILES }, new URL(badEvReq.url))).status, 400);
  checks++;

  const validPng = png;
  const okEvReq = new Request('https://nghiepvu.skyfirst.io.vn/api/public/q-r/ngay-hoi-so-skyfirst-2026/upload-evidence', {
    method: 'POST',
    headers: { origin: 'https://nghiepvu.skyfirst.io.vn', 'content-type': 'image/png' },
    body: validPng
  });
  const okEvRes = await api(okEvReq, { DB, FILES }, new URL(okEvReq.url));
  const okEvBody = await okEvRes.json();
  assert.equal(okEvRes.status, 201);
  assert(okEvBody.evidence_photo_url.startsWith(`/files/events/private/attendance/${evQrCreate.id}/`));
  checks += 2;

  // 4. Field validation: missing phone, invalid email, or missing evidence photo MUST be rejected (400) with exact field name
  const missPhone = await pubCall('/api/public/q-r/ngay-hoi-so-skyfirst-2026/checkin', 'POST', {
    checkin_method: 'qr_scan',
    qr_token: qrSessionRes.qr_token,
    full_name: 'Phạm Minh Tuấn',
    phone: '12345',
    email: 'pmtuan@gmail.com',
    evidence_photo_url: okEvBody.evidence_photo_url
  });
  assert.equal(missPhone.httpStatus, 400);
  assert.equal(missPhone.field, 'phone');
  checks += 2;

  const missEvidence = await pubCall('/api/public/q-r/ngay-hoi-so-skyfirst-2026/checkin', 'POST', {
    checkin_method: 'qr_scan',
    qr_token: qrSessionRes.qr_token,
    full_name: 'Phạm Minh Tuấn',
    phone: '0901234567',
    email: 'pmtuan@gmail.com',
    evidence_photo_url: ''
  });
  assert.equal(missEvidence.httpStatus, 400);
  assert.equal(missEvidence.field, 'evidence_photo');
  checks += 2;

  // 5. Complete public login-free check-in via QR Scan (Method 1)
  const chk1 = await pubCall('/api/public/q-r/ngay-hoi-so-skyfirst-2026/checkin', 'POST', {
    checkin_method: 'qr_scan',
    qr_token: qrSessionRes.qr_token,
    full_name: 'Phạm Minh Tuấn',
    phone: '0901234567',
    email: 'pmtuan@gmail.com',
    evidence_photo_url: okEvBody.evidence_photo_url,
    idempotency_key: 'idem_tuan_01'
  });
  assert.equal(chk1.httpStatus, 201);
  assert.equal(chk1.checkin_method, 'qr_scan');
  assert.equal(chk1.attendance_manager_name, 'Lê Phụ Trách Điểm Danh');
  checks += 3;

  // Retrying with same idempotency_key returns 200 deduplicated without error or duplicate row
  const chk1Retry = await pubCall('/api/public/q-r/ngay-hoi-so-skyfirst-2026/checkin', 'POST', {
    checkin_method: 'qr_scan',
    qr_token: qrSessionRes.qr_token,
    full_name: 'Phạm Minh Tuấn',
    phone: '0901234567',
    email: 'pmtuan@gmail.com',
    evidence_photo_url: okEvBody.evidence_photo_url,
    idempotency_key: 'idem_tuan_01'
  });
  assert.equal(chk1Retry.httpStatus, 200);
  assert.equal(chk1Retry.deduplicated, true);
  checks += 2;

  // Duplicate check-in with same phone or email (different idempotency_key) is blocked (409 DUPLICATE_CHECKIN_BLOCKED)
  const chk1Dup = await pubCall('/api/public/q-r/ngay-hoi-so-skyfirst-2026/checkin', 'POST', {
    checkin_method: 'manual_code',
    manual_code: 'SKM-2026OK',
    full_name: 'Phạm Minh Tuấn',
    phone: '0901234567',
    email: 'otheremail@gmail.com',
    evidence_photo_url: okEvBody.evidence_photo_url
  });
  assert.equal(chk1Dup.httpStatus, 409);
  assert.equal(chk1Dup.error, 'DUPLICATE_CHECKIN_BLOCKED');
  checks += 2;

  // 6. Another participant with the SAME FULL NAME ('Phạm Minh Tuấn') but different phone & email checks in via Manual Code (Method 2) -> ALLOWED with duplicate_name_notice!
  const okEvReq2 = new Request('https://nghiepvu.skyfirst.io.vn/api/public/q-r/ngay-hoi-so-skyfirst-2026/upload-evidence', {
    method: 'POST',
    headers: { origin: 'https://nghiepvu.skyfirst.io.vn', 'content-type': 'image/png' },
    body: validPng
  });
  const okEvBody2 = await (await api(okEvReq2, { DB, FILES }, new URL(okEvReq2.url))).json();

  const chk2 = await pubCall('/api/public/q-r/ngay-hoi-so-skyfirst-2026/checkin', 'POST', {
    checkin_method: 'manual_code',
    manual_code: 'SKM-2026OK',
    full_name: 'Phạm Minh Tuấn',
    phone: '0988776655',
    email: 'pmtuan2.homonym@gmail.com',
    evidence_photo_url: okEvBody2.evidence_photo_url
  });
  assert.equal(chk2.httpStatus, 201);
  assert.equal(chk2.checkin_method, 'manual_code');
  assert.equal(chk2.duplicate_name_notice, true);
  checks += 3;

  // 7. Cross-event code check: using a code from another event on /q-r/ngay-hoi-so-skyfirst-2026 is rejected (403 CODE_EVENT_MISMATCH)
  const otherEv = await call('/api/admin/sk-events', 'POST', {
    name: 'Hoạt động Khác 2026',
    slug: 'hoat-dong-khac-2026',
    purpose: 'Kiểm tra chéo mã QR',
    starts_at: '2026-01-01 08:00:00',
    ends_at: '2027-12-31 20:00:00',
    location_or_platform: 'Hà Nội'
  });
  await call(`/api/admin/sk-events/${encodeURIComponent(otherEv.id)}/transition`, 'POST', { action: 'approve' });
  await call(`/api/admin/sk-events/${encodeURIComponent(otherEv.id)}/transition`, 'POST', { action: 'publish' });
  const otherQr = await call(`/api/admin/sk-events/${encodeURIComponent(otherEv.id)}/qr-sessions`, 'POST', {
    session_name: 'Ca Khác',
    manual_code: 'SKM-OTHEREV'
  });
  const crossTry = await pubCall('/api/public/q-r/ngay-hoi-so-skyfirst-2026/checkin', 'POST', {
    checkin_method: 'manual_code',
    manual_code: otherQr.manual_code,
    full_name: 'Lê Văn C',
    phone: '0977665544',
    email: 'levanc@gmail.com',
    evidence_photo_url: okEvBody2.evidence_photo_url
  });
  assert.equal(crossTry.httpStatus, 403);
  assert.equal(crossTry.error, 'CODE_EVENT_MISMATCH');
  checks += 2;

  // 8. Access control on evidence photo: anonymous (401) and unprivileged user 't24' (403) CANNOT view participant evidence photo!
  const anonFileReq = new Request('https://nghiepvu.skyfirst.io.vn' + okEvBody.evidence_photo_url);
  assert.equal((await worker.fetch(anonFileReq, { DB, FILES })).status, 401);
  const unprivFileReq = new Request('https://nghiepvu.skyfirst.io.vn' + okEvBody.evidence_photo_url, {
    headers: { cookie: 'sfn_session=t24_active_tok' }
  });
  assert.equal((await worker.fetch(unprivFileReq, { DB, FILES })).status, 403);
  const adminFileReq = new Request('https://nghiepvu.skyfirst.io.vn' + okEvBody.evidence_photo_url, {
    headers: { cookie: 'sfn_session=test_session_token' }
  });
  assert.equal((await worker.fetch(adminFileReq, { DB, FILES })).status, 200);
  checks += 3;

  // 9. Admin reviews and adjusts attendance status with audit log
  const adjRes = await call(`/api/admin/sk-events/${encodeURIComponent(evQrCreate.id)}/attendance/${encodeURIComponent(chk2.id)}`, 'PATCH', {
    attendance_status: 'late',
    review_note: 'Đối soát thời gian check-in trễ 10 phút'
  });
  assert.equal(adjRes.httpStatus, 200);
  assert.equal(adjRes.attendance_status, 'late');
  checks += 2;
}

console.log(`${checks}/${checks} center/API integration checks passed`);
closeDb();
