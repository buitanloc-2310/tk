const enc=new TextEncoder();
const clean=(v,m=1000)=>String(v??'').trim().slice(0,m);
const uid=(p='id')=>`${p}_${crypto.randomUUID()}`;
const json=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8',...h}});
const bodyJson=async r=>{try{return await r.json()}catch{return {}}};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha256=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
function token(){const a=new Uint8Array(32);crypto.getRandomValues(a);return b64(a).replace(/[+/=]/g,'')}
async function verifyPassword(password, salt, iterations, storedHash) {
  const raw = String(password ?? '');

  const candidates = [
    raw,
    raw.normalize('NFC'),
    raw.normalize('NFKC')
  ];

  // Phòng trường hợp trình duyệt/clipboard vô tình thêm khoảng trắng.
  if (raw !== raw.trim()) candidates.push(raw.trim());

  for (const value of [...new Set(candidates)]) {
    const calculated = await pbkdf2(
      value,
      String(salt ?? ''),
      Number(iterations || 100000)
    );

    if (calculated === String(storedHash ?? '')) {
      return true;
    }
  }

  return false;
}
const cookie=(n,v,d=7)=>`${n}=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${d*86400}`;
const clearCookie=n=>`${n}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
async function setupDone(env){const r=await env.DB.prepare('SELECT COUNT(*) c FROM accounts').first();return Number(r?.c||0)>0}
async function getSession(req,env){const raw=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sfn_session='));if(!raw)return null;const t=decodeURIComponent(raw.slice('sfn_session='.length)),h=await sha256(t);return env.DB.prepare(`SELECT s.id session_id,s.account_id,a.person_id,a.username,a.force_password_change,p.full_name,p.member_code,p.avatar_url,p.status FROM sessions s JOIN accounts a ON a.id=s.account_id JOIN people p ON p.id=a.person_id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND a.is_locked=0`).bind(h).first()}
async function isSuper(env,aid){return !!(await env.DB.prepare(`SELECT 1 FROM account_scopes s JOIN roles r ON r.id=s.role_id WHERE s.account_id=? AND s.active=1 AND r.code='SUPER_ADMIN' LIMIT 1`).bind(aid).first())}
async function isNetworkAdmin(env,aid){return !!(await env.DB.prepare(`SELECT 1 FROM account_scopes s JOIN roles r ON r.id=s.role_id WHERE s.account_id=? AND s.active=1 AND r.code IN ('SUPER_ADMIN','NETWORK_ADMIN') LIMIT 1`).bind(aid).first())}
async function canAccessOrg(env,aid,orgId){if(!orgId)return false;if(await isNetworkAdmin(env,aid))return true;return !!(await env.DB.prepare(`WITH RECURSIVE allowed(id) AS (SELECT s.org_node_id FROM account_scopes s JOIN roles r ON r.id=s.role_id WHERE s.account_id=? AND s.active=1 AND r.code='SCOPE_ADMIN' AND s.org_node_id IS NOT NULL UNION SELECT o.id FROM org_nodes o JOIN allowed a ON o.parent_id=a.id) SELECT 1 FROM allowed WHERE id=? LIMIT 1`).bind(aid,orgId).first())}
async function canAccessPerson(env,aid,pid){if(await isNetworkAdmin(env,aid))return true;return !!(await env.DB.prepare(`WITH RECURSIVE allowed(id) AS (SELECT s.org_node_id FROM account_scopes s JOIN roles r ON r.id=s.role_id WHERE s.account_id=? AND s.active=1 AND r.code='SCOPE_ADMIN' AND s.org_node_id IS NOT NULL UNION SELECT o.id FROM org_nodes o JOIN allowed a ON o.parent_id=a.id) SELECT 1 FROM org_memberships m JOIN allowed a ON a.id=m.org_node_id WHERE m.person_id=? LIMIT 1`).bind(aid,pid).first())}
async function visibleOrgs(env,aid){if(await isNetworkAdmin(env,aid)){const r=await env.DB.prepare(`SELECT id,code,name,short_name,node_type,parent_id,status FROM org_nodes ORDER BY sort_order,name`).all();return r.results||[]}const r=await env.DB.prepare(`WITH RECURSIVE allowed(id) AS (SELECT s.org_node_id FROM account_scopes s JOIN roles rr ON rr.id=s.role_id WHERE s.account_id=? AND s.active=1 AND rr.code='SCOPE_ADMIN' AND s.org_node_id IS NOT NULL UNION SELECT o.id FROM org_nodes o JOIN allowed a ON o.parent_id=a.id) SELECT o.id,o.code,o.name,o.short_name,o.node_type,o.parent_id,o.status FROM org_nodes o JOIN allowed a ON a.id=o.id ORDER BY o.sort_order,o.name`).bind(aid).all();return r.results||[]}
async function hasPerm(env,aid,code,scope=null){if(await isSuper(env,aid))return true;let q=`SELECT 1 FROM account_scopes s JOIN role_permissions rp ON rp.role_id=s.role_id JOIN permissions p ON p.id=rp.permission_id WHERE s.account_id=? AND s.active=1 AND p.code=?`,b=[aid,code];if(scope){q+=` AND (s.org_node_id=? OR s.org_node_id IS NULL)`;b.push(scope)}q+=' LIMIT 1';return !!(await env.DB.prepare(q).bind(...b).first())}
async function audit(env,aid,action,type,id,scope=null,details={}){await env.DB.prepare(`INSERT INTO audit_log(actor_account_id,action,entity_type,entity_id,org_node_id,details_json) VALUES(?,?,?,?,?,?)`).bind(aid||null,action,type,id||null,scope||null,JSON.stringify(details)).run()}
function memberCode(n){return `SFN-${String(n).padStart(6,'0')}`}
function verifyCode(prefix='SFN'){return `${prefix}-${crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase()}`}

async function api(req,env,url){
 if(url.pathname==='/api/setup/status'&&req.method==='GET')return json({setup_required:!(await setupDone(env))});
 if(url.pathname==='/api/setup'&&req.method==='POST'){
  if(await setupDone(env))return json({error:'SETUP_ALREADY_COMPLETED'},409);
  const b=await bodyJson(req),name=clean(b.full_name,160),user=clean(b.username,80).toLowerCase(),email=clean(b.email,200).toLowerCase(),pw=String(b.password||'');
  if(!name||!user||pw.length<10)return json({error:'INVALID_SETUP_DATA'},400);
  const pid=uid('person'),aid=uid('account'),salt=token(),it=100000,hash=await pbkdf2(pw,salt,it);
  await env.DB.batch([
   env.DB.prepare(`INSERT INTO people(id,member_code,full_name,email,status) VALUES(?,?,?,?, 'active')`).bind(pid,'SYS-ADMIN-0001',name,email||null),
   env.DB.prepare(`INSERT INTO accounts(id,person_id,username,email,password_hash,password_salt,password_iterations,force_password_change) VALUES(?,?,?,?,?,?,?,0)`).bind(aid,pid,user,email||null,hash,salt,it),
   env.DB.prepare(`INSERT INTO account_scopes(id,account_id,role_id,org_node_id,active) VALUES(?,?,?,?,1)`).bind(uid('scope'),aid,'role_super_admin','org_sfn'),
   env.DB.prepare(`UPDATE system_settings SET value_json='{"completed":true}',updated_at=CURRENT_TIMESTAMP WHERE key='setup'`)
  ]);
  await audit(env,aid,'system_setup','system','setup','org_sfn',{username:user});
  return json({ok:true});
 }

 return json({ok:true,force_password_change:!!a.force_password_change},200,{'set-cookie':cookie('sfn_session',t,7)}); }
  const b=await bodyJson(req),login=clean(b.login,200).toLowerCase(),pw=String(b.password||'');
  const a=await env.DB.prepare(`SELECT a.*,p.status person_status FROM accounts a JOIN people p ON p.id=a.person_id WHERE lower(a.username)=? OR lower(a.email)=? LIMIT 1`).bind(login,login).first();
  if(!a||a.is_locked||a.person_status==='suspended')return json({error:'INVALID_LOGIN'},401);
  if(await pbkdf2(pw,a.password_salt,a.password_iterations)!==a.password_hash)return json({error:'INVALID_LOGIN'},401);
  const t=token(),h=await sha256(t),sid=uid('session');
  await env.DB.batch([
   env.DB.prepare(`INSERT INTO sessions(id,account_id,token_hash,expires_at,user_agent) VALUES(?,?,?,datetime('now','+7 days'),?)`).bind(sid,a.id,h,clean(req.headers.get('user-agent'),500)),
   env.DB.prepare(`UPDATE accounts SET last_login_at=CURRENT_TIMESTAMP WHERE id=?`).bind(a.id)
  ]);
  return json({ok:true,force_password_change:!!a.force_password_change},200,{'set-cookie':cookie('sfn_session',t,7)});
 }
 if(url.pathname==='/api/auth/logout'&&req.method==='POST'){const s=await getSession(req,env);if(s)await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(s.session_id).run();return json({ok:true},200,{'set-cookie':clearCookie('sfn_session')})}

 // Public verification does not expose CCCD/address/contact details.
 if(url.pathname==='/api/public/verify'&&req.method==='GET'){
  const code=clean(url.searchParams.get('code'),100);
  if(!code)return json({error:'CODE_REQUIRED'},400);
  const card=await env.DB.prepare(`SELECT c.card_number,c.status,c.issued_at,c.expires_at,c.title_on_card,p.full_name,p.member_code,p.avatar_url,t.name card_type_name,o.name org_name FROM member_cards c JOIN people p ON p.id=c.person_id JOIN card_types t ON t.id=c.card_type_id LEFT JOIN org_nodes o ON o.id=c.org_node_id WHERE c.verify_token=? OR c.card_number=? LIMIT 1`).bind(code,code).first();
  if(card)return json({type:'card',valid:card.status==='active'&&(!card.expires_at||card.expires_at>=new Date().toISOString().slice(0,10)),record:card});
  const cert=await env.DB.prepare(`SELECT c.certificate_no,c.title,c.issuer,c.issued_at,c.verification_status,p.full_name,p.member_code FROM certificates c JOIN people p ON p.id=c.person_id WHERE c.verify_code=? OR c.certificate_no=? LIMIT 1`).bind(code,code).first();
  if(cert)return json({type:'certificate',valid:cert.verification_status==='verified',record:cert});
  return json({error:'NOT_FOUND'},404);
 }

 // Public account request: every personal-information field is mandatory.
 if(url.pathname==='/api/public/request-avatar'&&req.method==='POST'){
  const ct=(req.headers.get('content-type')||'').toLowerCase();
  if(!['image/jpeg','image/png','image/webp'].includes(ct))return json({error:'IMAGE_TYPE_NOT_ALLOWED'},415);
  const data=await req.arrayBuffer();if(!data.byteLength||data.byteLength>900000)return json({error:'IMAGE_TOO_LARGE'},413);
  const ext=ct==='image/png'?'png':ct==='image/webp'?'webp':'jpg',key=`requests/avatars/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
  await env.FILES.put(key,data,{httpMetadata:{contentType:ct,cacheControl:'public, max-age=31536000, immutable'}});
  return json({ok:true,url:`/files/${key}`});
 }
 if(url.pathname==='/api/public/account-request'&&req.method==='POST'){
  const b=await bodyJson(req),fields=['full_name','display_name','date_of_birth','gender','nationality','id_number','id_issue_date','id_issue_place','email','phone','permanent_address','temporary_address','avatar_url','desired_username'];
  for(const k of fields)if(!clean(b[k],k.includes('address')?500:240))return json({error:'ALL_PERSONAL_FIELDS_REQUIRED',field:k},400);
  const email=clean(b.email,200).toLowerCase(),username=clean(b.desired_username,80).toLowerCase(),idno=clean(b.id_number,80);
  if(!/^\S+@\S+\.\S+$/.test(email))return json({error:'EMAIL_INVALID'},400);
  if(!/^[a-z0-9._-]{4,80}$/.test(username))return json({error:'USERNAME_INVALID'},400);
  if(await env.DB.prepare(`SELECT 1 FROM accounts WHERE lower(username)=? OR lower(email)=? LIMIT 1`).bind(username,email).first())return json({error:'ACCOUNT_ALREADY_EXISTS'},409);
  if(await env.DB.prepare(`SELECT 1 FROM account_requests WHERE status='pending' AND (lower(email)=? OR id_number=? OR lower(desired_username)=?) LIMIT 1`).bind(email,idno,username).first())return json({error:'REQUEST_ALREADY_PENDING'},409);
  const id=uid('request'),code=`SFN-REQ-${String(Date.now()).slice(-8)}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;
  await env.DB.prepare(`INSERT INTO account_requests(id,request_code,full_name,display_name,date_of_birth,gender,nationality,id_number,id_issue_date,id_issue_place,email,phone,permanent_address,temporary_address,avatar_url,desired_username,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')`).bind(id,code,clean(b.full_name,160),clean(b.display_name,160),clean(b.date_of_birth,20),clean(b.gender,50),clean(b.nationality,80),idno,clean(b.id_issue_date,20),clean(b.id_issue_place,200),email,clean(b.phone,50),clean(b.permanent_address,500),clean(b.temporary_address,500),clean(b.avatar_url,1200),username).run();
  return json({ok:true,request_code:code,message:'Yêu cầu đã được ghi nhận. SFN dự kiến kiểm tra trong 12–24 giờ; có thể sớm hoặc trễ hơn tùy lưu lượng và khối lượng công việc. Vui lòng thường xuyên kiểm tra email và lưu mã yêu cầu để tra cứu trạng thái.'});
 }
 if(url.pathname==='/api/public/account-request/status'&&req.method==='GET'){
  const code=clean(url.searchParams.get('code'),100),email=clean(url.searchParams.get('email'),200).toLowerCase();if(!code||!email)return json({error:'CODE_AND_EMAIL_REQUIRED'},400);
  const r=await env.DB.prepare(`SELECT request_code,full_name,status,admin_note,reviewed_at,created_at FROM account_requests WHERE request_code=? AND lower(email)=? LIMIT 1`).bind(code,email).first();return r?json({request:r}):json({error:'NOT_FOUND'},404);
 }

 const s=await getSession(req,env);
 if(!s)return json({error:'UNAUTHORIZED'},401);

 if(url.pathname==='/api/me'&&req.method==='GET'){
  const person=await env.DB.prepare('SELECT * FROM people WHERE id=?').bind(s.person_id).first();
  const memberships=await env.DB.prepare(`SELECT m.*,o.name org_name,o.short_name,o.node_type FROM org_memberships m JOIN org_nodes o ON o.id=m.org_node_id WHERE m.person_id=? ORDER BY m.is_primary DESC,m.started_at DESC`).bind(s.person_id).all();
  const cards=await env.DB.prepare(`SELECT c.*,t.name card_type_name,t.code card_type_code,o.name org_name FROM member_cards c JOIN card_types t ON t.id=c.card_type_id LEFT JOIN org_nodes o ON o.id=c.org_node_id WHERE c.person_id=? ORDER BY c.status='active' DESC,c.issued_at DESC`).bind(s.person_id).all();
  const perms=await env.DB.prepare(`SELECT DISTINCT p.code FROM account_scopes s JOIN role_permissions rp ON rp.role_id=s.role_id JOIN permissions p ON p.id=rp.permission_id WHERE s.account_id=? AND s.active=1`).bind(s.account_id).all();
  const scopes=await env.DB.prepare(`SELECT s.id,r.code role_code,r.name role_name,s.org_node_id,o.name org_name FROM account_scopes s JOIN roles r ON r.id=s.role_id LEFT JOIN org_nodes o ON o.id=s.org_node_id WHERE s.account_id=? AND s.active=1`).bind(s.account_id).all();
  const scopeRows=scopes.results||[],is_member=scopeRows.some(x=>x.role_code==='MEMBER');
  return json({person,memberships:memberships.results||[],cards:cards.results||[],permissions:(perms.results||[]).map(x=>x.code),scopes:scopeRows,is_member,is_super:await isSuper(env,s.account_id),force_password_change:!!s.force_password_change});
 }
 if(url.pathname==='/api/me'&&req.method==='PATCH'){
  const b=await bodyJson(req),next={
   full_name:clean(b.full_name,160),display_name:clean(b.display_name,160),date_of_birth:clean(b.date_of_birth,20),gender:clean(b.gender,50),
   nationality:clean(b.nationality,80),id_number:clean(b.id_number,80),id_issue_date:clean(b.id_issue_date,20),id_issue_place:clean(b.id_issue_place,200),
   email:clean(b.email,200).toLowerCase(),phone:clean(b.phone,50),permanent_address:clean(b.permanent_address,500),temporary_address:clean(b.temporary_address,500),avatar_url:clean(b.avatar_url,1200)
  };
  for(const k of ['full_name','display_name','date_of_birth','gender','nationality','id_number','id_issue_date','id_issue_place','email','phone','permanent_address','temporary_address','avatar_url'])if(!next[k])return json({error:'ALL_PERSONAL_FIELDS_REQUIRED',field:k},400);
  try{await env.DB.batch([
   env.DB.prepare(`UPDATE people SET full_name=?,display_name=?,date_of_birth=?,gender=?,nationality=?,id_number=?,id_issue_date=?,id_issue_place=?,email=?,phone=?,permanent_address=?,temporary_address=?,avatar_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(next.full_name,next.display_name||null,next.date_of_birth||null,next.gender||null,next.nationality||null,next.id_number||null,next.id_issue_date||null,next.id_issue_place||null,next.email||null,next.phone||null,next.permanent_address||null,next.temporary_address||null,next.avatar_url||null,s.person_id),
   env.DB.prepare(`UPDATE accounts SET email=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(next.email||null,s.account_id)
  ])}catch{return json({error:'PROFILE_UPDATE_FAILED'},409)}
  await audit(env,s.account_id,'profile_updated','person',s.person_id,null,{fields:Object.keys(next)});
  return json({ok:true});
 }
 if(url.pathname==='/api/me/password'&&req.method==='POST'){
  const b=await bodyJson(req),old=String(b.current_password||''),pw=String(b.new_password||'');
  if(pw.length<10)return json({error:'PASSWORD_TOO_SHORT'},400);
  const a=await env.DB.prepare('SELECT * FROM accounts WHERE id=?').bind(s.account_id).first();
  if(await pbkdf2(old,a.password_salt,a.password_iterations)!==a.password_hash)return json({error:'CURRENT_PASSWORD_INVALID'},401);
  const salt=token(),it=100000,hash=await pbkdf2(pw,salt,it);
  await env.DB.batch([
   env.DB.prepare(`UPDATE accounts SET password_hash=?,password_salt=?,password_iterations=?,force_password_change=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(hash,salt,it,s.account_id),
   env.DB.prepare(`DELETE FROM sessions WHERE account_id=? AND id!=?`).bind(s.account_id,s.session_id)
  ]);
  await audit(env,s.account_id,'password_changed','account',s.account_id);
  return json({ok:true});
 }

 if(url.pathname==='/api/me/avatar'&&req.method==='POST'){
  const ct=(req.headers.get('content-type')||'').toLowerCase();if(!['image/jpeg','image/png','image/webp'].includes(ct))return json({error:'IMAGE_TYPE_NOT_ALLOWED'},415);
  const data=await req.arrayBuffer();if(!data.byteLength||data.byteLength>900000)return json({error:'IMAGE_TOO_LARGE'},413);
  const ext=ct==='image/png'?'png':ct==='image/webp'?'webp':'jpg',key=`avatars/${s.person_id}/${Date.now()}.${ext}`;await env.FILES.put(key,data,{httpMetadata:{contentType:ct,cacheControl:'public, max-age=31536000, immutable'}});
  const fileUrl=`/files/${key}`;await env.DB.prepare(`UPDATE people SET avatar_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(fileUrl,s.person_id).run();await audit(env,s.account_id,'avatar_uploaded','person',s.person_id);return json({ok:true,url:fileUrl});
 }

 if(url.pathname==='/api/dashboard'&&req.method==='GET'){
  const [g,t,a,c,h,n]=await Promise.all([
   env.DB.prepare(`SELECT period_type,ROUND(AVG(progress)) progress FROM goals WHERE person_id=? AND status='active' GROUP BY period_type`).bind(s.person_id).all(),
   env.DB.prepare(`SELECT COUNT(*) total FROM tasks WHERE person_id=? AND status!='cancelled'`).bind(s.person_id).first(),
   env.DB.prepare(`SELECT COUNT(*) total FROM activity_participants WHERE person_id=?`).bind(s.person_id).first(),
   env.DB.prepare(`SELECT COUNT(*) total FROM certificates WHERE person_id=? AND verification_status='verified'`).bind(s.person_id).first(),
   env.DB.prepare(`SELECT COUNT(*) total FROM achievements WHERE person_id=? AND verification_status='verified'`).bind(s.person_id).first(),
   env.DB.prepare(`SELECT COUNT(*) total FROM notifications WHERE person_id=? AND read_at IS NULL`).bind(s.person_id).first()
  ]);
  return json({goals:g.results||[],tasks:t.total||0,activities:a.total||0,certificates:c.total||0,achievements:h.total||0,unread:n.total||0});
 }
 const selfLists={
  '/api/me/goals':`SELECT * FROM goals WHERE person_id=? ORDER BY created_at DESC LIMIT 200`,
  '/api/me/tasks':`SELECT * FROM tasks WHERE person_id=? ORDER BY created_at DESC LIMIT 200`,
  '/api/me/certificates':`SELECT * FROM certificates WHERE person_id=? ORDER BY COALESCE(issued_at,created_at) DESC LIMIT 300`,
  '/api/me/achievements':`SELECT * FROM achievements WHERE person_id=? ORDER BY COALESCE(achieved_at,created_at) DESC LIMIT 300`,
  '/api/me/documents':`SELECT * FROM member_documents WHERE person_id=? ORDER BY created_at DESC LIMIT 300`,
  '/api/me/notifications':`SELECT * FROM notifications WHERE person_id=? ORDER BY created_at DESC LIMIT 300`
 };
 if(selfLists[url.pathname]&&req.method==='GET'){const r=await env.DB.prepare(selfLists[url.pathname]).bind(s.person_id).all();return json({items:r.results||[]})}
 if(url.pathname==='/api/me/activities'&&req.method==='GET'){const r=await env.DB.prepare(`SELECT a.*,ap.role_label,ap.result,ap.verification_status,o.name org_name FROM activity_participants ap JOIN activities a ON a.id=ap.activity_id LEFT JOIN org_nodes o ON o.id=a.org_node_id WHERE ap.person_id=? ORDER BY COALESCE(a.starts_at,a.created_at) DESC LIMIT 300`).bind(s.person_id).all();return json({items:r.results||[]})}

 // Member-managed personal goals.
 if(url.pathname==='/api/me/goals'&&req.method==='POST'){
  const b=await bodyJson(req),period=clean(b.period_type,20),title=clean(b.title,240);if(!['week','month','quarter','year'].includes(period)||!title)return json({error:'INVALID_DATA'},400);const id=uid('goal');
  await env.DB.prepare(`INSERT INTO goals(id,person_id,org_node_id,period_type,title,description,priority,progress,status,starts_at,due_at,created_by_account_id) VALUES(?,?,NULL,?,?,?,?,?,?,?, ?,?)`).bind(id,s.person_id,period,title,clean(b.description,2000)||null,clean(b.priority,30)||'normal',Math.max(0,Math.min(100,Number(b.progress||0))),clean(b.status,30)||'active',clean(b.starts_at,20)||null,clean(b.due_at,20)||null,s.account_id).run();
  await audit(env,s.account_id,'goal_created','goal',id,null,{personal:true});return json({ok:true,id});
 }
 const myGoal=url.pathname.match(/^\/api\/me\/goals\/([^/]+)$/);
 if(myGoal&&req.method==='PATCH'){
  const id=decodeURIComponent(myGoal[1]),g=await env.DB.prepare(`SELECT * FROM goals WHERE id=? AND person_id=?`).bind(id,s.person_id).first();if(!g)return json({error:'NOT_FOUND'},404);const b=await bodyJson(req),progress=Object.prototype.hasOwnProperty.call(b,'progress')?Math.max(0,Math.min(100,Number(b.progress))):g.progress,status=Object.prototype.hasOwnProperty.call(b,'status')?clean(b.status,30):g.status;if(!['active','completed','cancelled'].includes(status))return json({error:'INVALID_STATUS'},400);await env.DB.prepare(`UPDATE goals SET progress=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`).bind(progress,status,id,s.person_id).run();return json({ok:true});
 }
 // Personal tasks can be created by the member; assigned organizational tasks remain visible in the same list.
 if(url.pathname==='/api/me/tasks'&&req.method==='POST'){
  const b=await bodyJson(req),title=clean(b.title,240);if(!title)return json({error:'INVALID_DATA'},400);const id=uid('task');await env.DB.prepare(`INSERT INTO tasks(id,person_id,org_node_id,goal_id,title,description,priority,progress,status,due_at,assigned_by_account_id) VALUES(?,?,NULL,?,?,?,?,?,?,?,NULL)`).bind(id,s.person_id,clean(b.goal_id,120)||null,title,clean(b.description,2000)||null,clean(b.priority,30)||'normal',Math.max(0,Math.min(100,Number(b.progress||0))),clean(b.status,30)||'todo',clean(b.due_at,20)||null).run();await audit(env,s.account_id,'task_created','task',id,null,{personal:true});return json({ok:true,id});
 }
 const myTask=url.pathname.match(/^\/api\/me\/tasks\/([^/]+)$/);
 if(myTask&&req.method==='PATCH'){
  const id=decodeURIComponent(myTask[1]),t=await env.DB.prepare(`SELECT * FROM tasks WHERE id=? AND person_id=?`).bind(id,s.person_id).first();if(!t)return json({error:'NOT_FOUND'},404);const b=await bodyJson(req),progress=Object.prototype.hasOwnProperty.call(b,'progress')?Math.max(0,Math.min(100,Number(b.progress))):t.progress,status=Object.prototype.hasOwnProperty.call(b,'status')?clean(b.status,30):t.status;if(!['todo','doing','done','cancelled'].includes(status))return json({error:'INVALID_STATUS'},400);await env.DB.prepare(`UPDATE tasks SET progress=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`).bind(progress,status,id,s.person_id).run();return json({ok:true});
 }
 // External certificate submitted by member.
 if(url.pathname==='/api/me/certificate-file'&&req.method==='POST'){
  const ct=(req.headers.get('content-type')||'').toLowerCase();if(ct!=='application/pdf')return json({error:'PDF_ONLY'},415);const data=await req.arrayBuffer();if(!data.byteLength||data.byteLength>10*1024*1024)return json({error:'PDF_TOO_LARGE'},413);const key=`certificates/external/${s.person_id}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.pdf`;await env.FILES.put(key,data,{httpMetadata:{contentType:'application/pdf',contentDisposition:'inline'}});return json({ok:true,url:`/files/${key}`});
 }
 if(url.pathname==='/api/me/certificates/external'&&req.method==='POST'){
  const b=await bodyJson(req),title=clean(b.title,240),issuer=clean(b.issuer,240);if(!title||!issuer)return json({error:'INVALID_DATA'},400);const id=uid('certificate');await env.DB.prepare(`INSERT INTO certificates(id,person_id,org_node_id,certificate_no,title,issuer,issued_at,source_type,verification_status,file_url,verify_code,metadata_json) VALUES(?,?,NULL,?,?,?,?,'external','pending',?,NULL,?)`).bind(id,s.person_id,clean(b.certificate_no,160)||null,title,issuer,clean(b.issued_at,20)||null,clean(b.file_url,1200)||null,JSON.stringify({notes:clean(b.notes,2000)})).run();await audit(env,s.account_id,'external_certificate_submitted','certificate',id);return json({ok:true,id});
 }
 const readNotif=url.pathname.match(/^\/api\/me\/notifications\/([^/]+)\/read$/);
 if(readNotif&&req.method==='POST'){await env.DB.prepare(`UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND person_id=?`).bind(decodeURIComponent(readNotif[1]),s.person_id).run();return json({ok:true})}

 if(url.pathname==='/api/me/support'&&req.method==='POST'){const b=await bodyJson(req),id=uid('ticket'),code=`SP-${new Date().getUTCFullYear()}-${String(Date.now()).slice(-6)}`;if(!clean(b.subject,200)||!clean(b.body,3000))return json({error:'INVALID_DATA'},400);await env.DB.prepare(`INSERT INTO support_tickets(id,ticket_code,person_id,category,subject,body,status) VALUES(?,?,?,?,?,?,'received')`).bind(id,code,s.person_id,clean(b.category,80)||'other',clean(b.subject,200),clean(b.body,3000)).run();return json({ok:true,ticket_code:code})}

 // ----- ADMIN / DELEGATED ADMIN -----
 if(url.pathname==='/api/admin/org'&&req.method==='GET'){if(!(await hasPerm(env,s.account_id,'org.manage')))return json({error:'FORBIDDEN'},403);const r=await env.DB.prepare(`SELECT * FROM org_nodes ORDER BY COALESCE(parent_id,''),sort_order,name`).all();return json({items:r.results||[]})}
 if(url.pathname==='/api/admin/org'&&req.method==='POST'){if(!(await hasPerm(env,s.account_id,'org.manage')))return json({error:'FORBIDDEN'},403);const b=await bodyJson(req),id=uid('org'),parent=b.parent_id||'org_sfn';if(!clean(b.code,80)||!clean(b.name,200))return json({error:'INVALID_DATA'},400);if(!(await canAccessOrg(env,s.account_id,parent)))return json({error:'SCOPE_FORBIDDEN'},403);await env.DB.prepare(`INSERT INTO org_nodes(id,parent_id,code,name,short_name,node_type,status,sort_order) VALUES(?,?,?,?,?,?,?,?)`).bind(id,parent,clean(b.code,80),clean(b.name,200),clean(b.short_name,80)||null,clean(b.node_type,80)||'unit','active',Number(b.sort_order||0)).run();await audit(env,s.account_id,'org_created','org_node',id,parent,{code:b.code,name:b.name});return json({ok:true,id})}

 if(url.pathname==='/api/admin/members'&&req.method==='GET'){
  if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
  const page=Math.max(1,Number(url.searchParams.get('page')||1)),limit=Math.min(100,Math.max(10,Number(url.searchParams.get('limit')||50))),q=clean(url.searchParams.get('q'),100),status=clean(url.searchParams.get('status'),30),w=[`EXISTS (SELECT 1 FROM accounts am JOIN account_scopes sm ON sm.account_id=am.id AND sm.active=1 JOIN roles rm ON rm.id=sm.role_id WHERE am.person_id=p.id AND rm.code='MEMBER')`],b=[];
  if(!(await isNetworkAdmin(env,s.account_id))){w.push(`EXISTS (WITH RECURSIVE allowed(id) AS (SELECT sc.org_node_id FROM account_scopes sc JOIN roles rr ON rr.id=sc.role_id WHERE sc.account_id=? AND sc.active=1 AND rr.code='SCOPE_ADMIN' AND sc.org_node_id IS NOT NULL UNION SELECT o.id FROM org_nodes o JOIN allowed a ON o.parent_id=a.id) SELECT 1 FROM org_memberships om JOIN allowed al ON al.id=om.org_node_id WHERE om.person_id=p.id)`);b.push(s.account_id)}
  if(q){w.push(`(p.full_name LIKE ? OR p.member_code LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)`);b.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`)}
  if(status){w.push('p.status=?');b.push(status)}
  const where=w.length?`WHERE ${w.join(' AND ')}`:'',total=(await env.DB.prepare(`SELECT COUNT(*) total FROM people p ${where}`).bind(...b).first()).total||0;
  const r=await env.DB.prepare(`SELECT p.id,p.member_code,p.full_name,p.email,p.phone,p.avatar_url,p.status,p.joined_at,a.username,a.is_locked FROM people p LEFT JOIN accounts a ON a.person_id=p.id ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`).bind(...b,limit,(page-1)*limit).all();
  return json({items:r.results||[],page,limit,total});
 }
 if(url.pathname==='/api/admin/members'&&req.method==='POST'){
  if(!(await hasPerm(env,s.account_id,'member.edit')))return json({error:'FORBIDDEN'},403);
  const b=await bodyJson(req),pw=String(b.password||''),required=['full_name','display_name','date_of_birth','gender','nationality','id_number','id_issue_date','id_issue_place','email','phone','permanent_address','temporary_address','avatar_url','username'];for(const k of required)if(!clean(b[k],500))return json({error:'ALL_PERSONAL_FIELDS_REQUIRED',field:k},400);if(pw.length<10)return json({error:'INVALID_DATA'},400);
  if(!(await isNetworkAdmin(env,s.account_id))&&(!b.org_node_id||!(await canAccessOrg(env,s.account_id,b.org_node_id))))return json({error:'SCOPE_FORBIDDEN'},403);
  const uname=clean(b.username,80).toLowerCase(),mail=clean(b.email,200).toLowerCase(),idno=clean(b.id_number,80);if(await env.DB.prepare(`SELECT 1 FROM accounts WHERE lower(username)=? OR lower(email)=? LIMIT 1`).bind(uname,mail).first())return json({error:'ACCOUNT_ALREADY_EXISTS'},409);if(await env.DB.prepare(`SELECT 1 FROM people WHERE id_number=? LIMIT 1`).bind(idno).first())return json({error:'IDENTITY_ALREADY_EXISTS'},409);
  const last=await env.DB.prepare(`SELECT member_code FROM people WHERE member_code LIKE 'SFN-%' ORDER BY CAST(substr(member_code,5) AS INTEGER) DESC LIMIT 1`).first(),n=last?.member_code?Number(last.member_code.slice(4))+1:1;
  const code=memberCode(n),pid=uid('person'),aid=uid('account'),salt=token(),it=100000,hash=await pbkdf2(pw,salt,it);
  await env.DB.batch([
   env.DB.prepare(`INSERT INTO people(id,member_code,full_name,display_name,date_of_birth,gender,nationality,id_number,id_issue_date,id_issue_place,email,phone,permanent_address,temporary_address,avatar_url,joined_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(pid,code,clean(b.full_name,160),clean(b.display_name,160)||null,clean(b.date_of_birth,20)||null,clean(b.gender,50)||null,clean(b.nationality,80)||null,clean(b.id_number,80)||null,clean(b.id_issue_date,20)||null,clean(b.id_issue_place,200)||null,clean(b.email,200)||null,clean(b.phone,50)||null,clean(b.permanent_address,500)||null,clean(b.temporary_address,500)||null,clean(b.avatar_url,1200)||null,b.joined_at||new Date().toISOString().slice(0,10),'active'),
   env.DB.prepare(`INSERT INTO accounts(id,person_id,username,email,password_hash,password_salt,password_iterations,force_password_change) VALUES(?,?,?,?,?,?,?,1)`).bind(aid,pid,uname,mail||null,hash,salt,it),
   env.DB.prepare(`INSERT INTO account_scopes(id,account_id,role_id,org_node_id,active) VALUES(?,?,?,?,1)`).bind(uid('scope'),aid,'role_member',null)
  ]);
  if(b.org_node_id)await env.DB.prepare(`INSERT INTO org_memberships(id,person_id,org_node_id,title,role_label,started_at,status,is_primary) VALUES(?,?,?,?,?,?,'active',1)`).bind(uid('membership'),pid,b.org_node_id,clean(b.title,160)||null,clean(b.role_label,160)||null,b.joined_at||new Date().toISOString().slice(0,10)).run();
  await audit(env,s.account_id,'member_created','person',pid,b.org_node_id||null,{member_code:code});
  return json({ok:true,id:pid,member_code:code});
 }

 const detailMatch=url.pathname.match(/^\/api\/admin\/members\/([^/]+)$/);
 if(detailMatch&&req.method==='GET'){
  if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
  const pid=decodeURIComponent(detailMatch[1]);if(!(await canAccessPerson(env,s.account_id,pid)))return json({error:'SCOPE_FORBIDDEN'},403);const person=await env.DB.prepare(`SELECT p.*,a.id account_id,a.username,a.email account_email,a.is_locked,a.force_password_change,a.last_login_at FROM people p LEFT JOIN accounts a ON a.person_id=p.id WHERE p.id=?`).bind(pid).first();
  if(!person)return json({error:'NOT_FOUND'},404);
  const [memberships,certificates,achievements,cards,documents,scopes,goals,tasks,activities,auditRows]=await Promise.all([
   env.DB.prepare(`SELECT m.*,o.name org_name,o.code org_code FROM org_memberships m JOIN org_nodes o ON o.id=m.org_node_id WHERE m.person_id=? ORDER BY m.started_at DESC`).bind(pid).all(),
   env.DB.prepare(`SELECT * FROM certificates WHERE person_id=? ORDER BY COALESCE(issued_at,created_at) DESC`).bind(pid).all(),
   env.DB.prepare(`SELECT * FROM achievements WHERE person_id=? ORDER BY COALESCE(achieved_at,created_at) DESC`).bind(pid).all(),
   env.DB.prepare(`SELECT c.*,t.name card_type_name,o.name org_name FROM member_cards c JOIN card_types t ON t.id=c.card_type_id LEFT JOIN org_nodes o ON o.id=c.org_node_id WHERE c.person_id=? ORDER BY c.created_at DESC`).bind(pid).all(),
   env.DB.prepare(`SELECT * FROM member_documents WHERE person_id=? ORDER BY created_at DESC`).bind(pid).all(),
   env.DB.prepare(`SELECT s.*,r.code role_code,r.name role_name,o.name org_name FROM account_scopes s JOIN roles r ON r.id=s.role_id LEFT JOIN org_nodes o ON o.id=s.org_node_id WHERE s.account_id=?`).bind(person.account_id||'').all(),
   env.DB.prepare(`SELECT * FROM goals WHERE person_id=? ORDER BY created_at DESC`).bind(pid).all(),
   env.DB.prepare(`SELECT * FROM tasks WHERE person_id=? ORDER BY created_at DESC`).bind(pid).all(),
   env.DB.prepare(`SELECT a.*,ap.role_label,ap.result,ap.verification_status,o.name org_name FROM activity_participants ap JOIN activities a ON a.id=ap.activity_id LEFT JOIN org_nodes o ON o.id=a.org_node_id WHERE ap.person_id=? ORDER BY COALESCE(a.starts_at,a.created_at) DESC`).bind(pid).all(),
   env.DB.prepare(`SELECT l.*,aa.username FROM audit_log l LEFT JOIN accounts aa ON aa.id=l.actor_account_id WHERE l.entity_id=? OR json_extract(l.details_json,'$.person_id')=? ORDER BY l.id DESC LIMIT 200`).bind(pid,pid).all()
  ]);
  return json({person,memberships:memberships.results||[],certificates:certificates.results||[],achievements:achievements.results||[],cards:cards.results||[],documents:documents.results||[],scopes:scopes.results||[],goals:goals.results||[],tasks:tasks.results||[],activities:activities.results||[],audit:auditRows.results||[]});
 }
 if(detailMatch&&req.method==='PATCH'){
  if(!(await hasPerm(env,s.account_id,'member.edit')))return json({error:'FORBIDDEN'},403);
  const pid=decodeURIComponent(detailMatch[1]);if(!(await canAccessPerson(env,s.account_id,pid)))return json({error:'SCOPE_FORBIDDEN'},403);const b=await bodyJson(req),p=await env.DB.prepare('SELECT * FROM people WHERE id=?').bind(pid).first();if(!p)return json({error:'NOT_FOUND'},404);
  const v=(k,m=1000)=>Object.prototype.hasOwnProperty.call(b,k)?clean(b[k],m):(p[k]??'');
  await env.DB.prepare(`UPDATE people SET full_name=?,display_name=?,date_of_birth=?,gender=?,nationality=?,id_number=?,id_issue_date=?,id_issue_place=?,email=?,phone=?,permanent_address=?,temporary_address=?,avatar_url=?,joined_at=?,ended_at=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(v('full_name',160),v('display_name',160)||null,v('date_of_birth',20)||null,v('gender',50)||null,v('nationality',80)||null,v('id_number',80)||null,v('id_issue_date',20)||null,v('id_issue_place',200)||null,v('email',200)||null,v('phone',50)||null,v('permanent_address',500)||null,v('temporary_address',500)||null,v('avatar_url',1200)||null,v('joined_at',20)||null,v('ended_at',20)||null,v('status',30)||'active',pid).run();
  await audit(env,s.account_id,'member_updated','person',pid,null,{});
  return json({ok:true});
 }

 const certFileMatch=url.pathname.match(/^\/api\/admin\/members\/([^/]+)\/certificate-file$/);
 if(certFileMatch&&req.method==='POST'){
  if(!(await hasPerm(env,s.account_id,'certificate.manage')))return json({error:'FORBIDDEN'},403);const pid=decodeURIComponent(certFileMatch[1]);if(!(await canAccessPerson(env,s.account_id,pid)))return json({error:'SCOPE_FORBIDDEN'},403);if(!(await env.DB.prepare('SELECT 1 FROM people WHERE id=?').bind(pid).first()))return json({error:'NOT_FOUND'},404);
  const ct=(req.headers.get('content-type')||'').toLowerCase();if(ct!=='application/pdf')return json({error:'PDF_ONLY'},415);const data=await req.arrayBuffer();if(!data.byteLength||data.byteLength>10*1024*1024)return json({error:'PDF_TOO_LARGE'},413);
  const key=`certificates/${pid}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.pdf`;await env.FILES.put(key,data,{httpMetadata:{contentType:'application/pdf',contentDisposition:'inline'}});return json({ok:true,url:`/files/${key}`});
 }

 const subMatch=url.pathname.match(/^\/api\/admin\/members\/([^/]+)\/(certificate|achievement|membership|card|document|goal|task|activity|reset-password|lock|scope)$/);
 if(subMatch&&req.method==='POST'){
  const pid=decodeURIComponent(subMatch[1]),op=subMatch[2],b=await bodyJson(req);if(!(await canAccessPerson(env,s.account_id,pid)))return json({error:'SCOPE_FORBIDDEN'},403);const person=await env.DB.prepare(`SELECT p.*,a.id account_id FROM people p LEFT JOIN accounts a ON a.person_id=p.id WHERE p.id=?`).bind(pid).first();
  if(!person)return json({error:'NOT_FOUND'},404);

  if(op==='goal'){
   if(!(await hasPerm(env,s.account_id,'goal.manage')))return json({error:'FORBIDDEN'},403);if(b.org_node_id&&!(await canAccessOrg(env,s.account_id,b.org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);const period=clean(b.period_type,20),title=clean(b.title,240);if(!['week','month','quarter','year'].includes(period)||!title)return json({error:'INVALID_DATA'},400);const id=uid('goal');await env.DB.prepare(`INSERT INTO goals(id,person_id,org_node_id,period_type,title,description,priority,progress,status,starts_at,due_at,created_by_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,pid,b.org_node_id||null,period,title,clean(b.description,2000)||null,clean(b.priority,30)||'normal',Math.max(0,Math.min(100,Number(b.progress||0))),clean(b.status,30)||'active',clean(b.starts_at,20)||null,clean(b.due_at,20)||null,s.account_id).run();await env.DB.prepare(`INSERT INTO notifications(id,person_id,org_node_id,type,title,body) VALUES(?,?,?,'goal','Mục tiêu mới',?)`).bind(uid('notification'),pid,b.org_node_id||null,title).run();await audit(env,s.account_id,'goal_assigned','goal',id,b.org_node_id||null,{person_id:pid});return json({ok:true,id});
  }
  if(op==='task'){
   if(!(await hasPerm(env,s.account_id,'task.manage')))return json({error:'FORBIDDEN'},403);if(b.org_node_id&&!(await canAccessOrg(env,s.account_id,b.org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);const title=clean(b.title,240);if(!title)return json({error:'INVALID_DATA'},400);const id=uid('task');await env.DB.prepare(`INSERT INTO tasks(id,person_id,org_node_id,goal_id,title,description,priority,progress,status,due_at,assigned_by_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(id,pid,b.org_node_id||null,clean(b.goal_id,120)||null,title,clean(b.description,2000)||null,clean(b.priority,30)||'normal',Math.max(0,Math.min(100,Number(b.progress||0))),clean(b.status,30)||'todo',clean(b.due_at,20)||null,s.account_id).run();await env.DB.prepare(`INSERT INTO notifications(id,person_id,org_node_id,type,title,body) VALUES(?,?,?,'task','Công việc mới',?)`).bind(uid('notification'),pid,b.org_node_id||null,title).run();await audit(env,s.account_id,'task_assigned','task',id,b.org_node_id||null,{person_id:pid});return json({ok:true,id});
  }
  if(op==='activity'){
   if(!(await hasPerm(env,s.account_id,'activity.manage')))return json({error:'FORBIDDEN'},403);if(b.org_node_id&&!(await canAccessOrg(env,s.account_id,b.org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);const name=clean(b.name,240);if(!name)return json({error:'INVALID_DATA'},400);const id=uid('activity');await env.DB.batch([env.DB.prepare(`INSERT INTO activities(id,code,name,org_node_id,starts_at,ends_at,status,description) VALUES(?,?,?,?,?,?,?,?)`).bind(id,clean(b.code,120)||null,name,b.org_node_id||null,clean(b.starts_at,20)||null,clean(b.ends_at,20)||null,clean(b.status,30)||'completed',clean(b.description,2000)||null),env.DB.prepare(`INSERT INTO activity_participants(activity_id,person_id,role_label,result,verification_status) VALUES(?,?,?,?,?)`).bind(id,pid,clean(b.role_label,160)||'Thành viên',clean(b.result,1000)||null,'confirmed')]);await audit(env,s.account_id,'activity_recorded','activity',id,b.org_node_id||null,{person_id:pid});return json({ok:true,id});
  }
  if(op==='certificate'){
   if(!(await hasPerm(env,s.account_id,'certificate.manage')))return json({error:'FORBIDDEN'},403);if(b.org_node_id&&!(await canAccessOrg(env,s.account_id,b.org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);
   const id=uid('cert'),verify=clean(b.verify_code,100)||verifyCode('GCN'),meta={recognition:clean(b.recognition,2000),notes:clean(b.notes,1500)};
   if(!clean(b.title,240)||!clean(b.issuer,240))return json({error:'INVALID_DATA'},400);
   await env.DB.batch([
    env.DB.prepare(`INSERT INTO certificates(id,person_id,org_node_id,certificate_no,title,issuer,issued_at,source_type,verification_status,file_url,verify_code,metadata_json) VALUES(?,?,?,?,?,?,?,'internal','verified',?,?,?)`).bind(id,pid,b.org_node_id||null,clean(b.certificate_no,120)||verify,clean(b.title,240),clean(b.issuer,240),clean(b.issued_at,20)||new Date().toISOString().slice(0,10),clean(b.file_url,1200)||null,verify,JSON.stringify(meta)),
    env.DB.prepare(`INSERT INTO notifications(id,person_id,org_node_id,type,title,body) VALUES(?,?,?,'certificate','Bạn có chứng nhận mới',?)`).bind(uid('notice'),pid,b.org_node_id||null,`Chứng nhận "${clean(b.title,240)}" đã được cấp trên Cổng Thành viên Sky First Network.`)
   ]);
   await audit(env,s.account_id,'certificate_issued','certificate',id,b.org_node_id||null,{person_id:pid,verify_code:verify});return json({ok:true,id,verify_code:verify});
  }
  if(op==='achievement'){
   if(!(await hasPerm(env,s.account_id,'achievement.manage')))return json({error:'FORBIDDEN'},403);
   const id=uid('achievement');if(!clean(b.title,240))return json({error:'INVALID_DATA'},400);
   await env.DB.prepare(`INSERT INTO achievements(id,person_id,org_node_id,title,achievement_type,issuer,achieved_at,verification_status,source_type,description) VALUES(?,?,?,?,?,?,?,'verified','internal',?)`).bind(id,pid,b.org_node_id||null,clean(b.title,240),clean(b.achievement_type,120)||null,clean(b.issuer,240)||'SFN',clean(b.achieved_at,20)||null,clean(b.description,2000)||null).run();
   await audit(env,s.account_id,'achievement_added','achievement',id,b.org_node_id||null,{person_id:pid});return json({ok:true,id});
  }
  if(op==='membership'){
   if(!(await hasPerm(env,s.account_id,'member.edit')))return json({error:'FORBIDDEN'},403);
   if(!b.org_node_id)return json({error:'ORG_REQUIRED'},400);if(!(await canAccessOrg(env,s.account_id,b.org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);const id=uid('membership');
   await env.DB.prepare(`INSERT INTO org_memberships(id,person_id,org_node_id,title,role_label,started_at,ended_at,status,is_primary,decision_ref) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id,pid,b.org_node_id,clean(b.title,160)||null,clean(b.role_label,160)||null,clean(b.started_at,20)||null,clean(b.ended_at,20)||null,clean(b.status,30)||'active',b.is_primary?1:0,clean(b.decision_ref,240)||null).run();
   await audit(env,s.account_id,'membership_added','membership',id,b.org_node_id,{person_id:pid});return json({ok:true,id});
  }
  if(op==='card'){
   if(!(await hasPerm(env,s.account_id,'card.manage')))return json({error:'FORBIDDEN'},403);if(b.org_node_id&&!(await canAccessOrg(env,s.account_id,b.org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);
   const id=uid('card'),verify=verifyCode('CARD'),number=clean(b.card_number,120)||`SFN-CARD-${String(Date.now()).slice(-8)}`;
   await env.DB.prepare(`INSERT INTO member_cards(id,person_id,card_type_id,org_node_id,card_number,title_on_card,issued_at,expires_at,status,verify_token) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id,pid,b.card_type_id||'card_member',b.org_node_id||'org_sfn',number,clean(b.title_on_card,180)||null,clean(b.issued_at,20)||new Date().toISOString().slice(0,10),clean(b.expires_at,20)||null,clean(b.status,30)||'active',verify).run();
   await audit(env,s.account_id,'card_issued','member_card',id,b.org_node_id||'org_sfn',{person_id:pid,verify_token:verify});return json({ok:true,id,verify_token:verify});
  }
  if(op==='document'){
   if(!(await hasPerm(env,s.account_id,'member.edit')))return json({error:'FORBIDDEN'},403);const id=uid('doc');
   await env.DB.prepare(`INSERT INTO member_documents(id,person_id,org_node_id,document_type,title,file_url,issued_at,visibility) VALUES(?,?,?,?,?,?,?,?)`).bind(id,pid,b.org_node_id||null,clean(b.document_type,100)||'other',clean(b.title,240),clean(b.file_url,1200)||null,clean(b.issued_at,20)||null,'private').run();return json({ok:true,id});
  }
  if(op==='reset-password'){
   if(!(await hasPerm(env,s.account_id,'account.manage')))return json({error:'FORBIDDEN'},403);const pw=String(b.password||'');if(pw.length<10)return json({error:'PASSWORD_TOO_SHORT'},400);
   const salt=token(),it=100000,hash=await pbkdf2(pw,salt,it);await env.DB.batch([env.DB.prepare(`UPDATE accounts SET password_hash=?,password_salt=?,password_iterations=?,force_password_change=1,updated_at=CURRENT_TIMESTAMP WHERE person_id=?`).bind(hash,salt,it,pid),env.DB.prepare(`DELETE FROM sessions WHERE account_id=?`).bind(person.account_id||'')]);await audit(env,s.account_id,'password_reset','account',person.account_id);return json({ok:true});
  }
  if(op==='lock'){
   if(!(await hasPerm(env,s.account_id,'account.manage')))return json({error:'FORBIDDEN'},403);const locked=b.locked?1:0;await env.DB.prepare(`UPDATE accounts SET is_locked=?,updated_at=CURRENT_TIMESTAMP WHERE person_id=?`).bind(locked,pid).run();if(locked&&person.account_id)await env.DB.prepare(`DELETE FROM sessions WHERE account_id=?`).bind(person.account_id).run();await audit(env,s.account_id,locked?'account_locked':'account_unlocked','account',person.account_id);return json({ok:true,is_locked:locked});
  }
  if(op==='scope'){
   if(!(await hasPerm(env,s.account_id,'role.manage')))return json({error:'FORBIDDEN'},403);if(!person.account_id||!b.role_id)return json({error:'INVALID_DATA'},400);const id=uid('scope');await env.DB.prepare(`INSERT INTO account_scopes(id,account_id,role_id,org_node_id,active) VALUES(?,?,?,?,1)`).bind(id,person.account_id,b.role_id,b.org_node_id||null).run();await audit(env,s.account_id,'scope_granted','account_scope',id,b.org_node_id||null,{person_id:pid,role_id:b.role_id});return json({ok:true,id});
  }
 }

 if(url.pathname==='/api/admin/account-requests'&&req.method==='GET'){
  if(!(await hasPerm(env,s.account_id,'request.manage')))return json({error:'FORBIDDEN'},403);const status=clean(url.searchParams.get('status'),30)||'pending';const r=await env.DB.prepare(`SELECT * FROM account_requests WHERE status=? ORDER BY created_at ASC LIMIT 500`).bind(status).all();return json({items:r.results||[]});
 }
 const reqReview=url.pathname.match(/^\/api\/admin\/account-requests\/([^/]+)\/(approve|reject)$/);
 if(reqReview&&req.method==='POST'){
  if(!(await hasPerm(env,s.account_id,'request.manage')))return json({error:'FORBIDDEN'},403);const rid=decodeURIComponent(reqReview[1]),op=reqReview[2],b=await bodyJson(req),r=await env.DB.prepare(`SELECT * FROM account_requests WHERE id=? AND status='pending'`).bind(rid).first();if(!r)return json({error:'REQUEST_NOT_PENDING'},409);
  if(op==='reject'){await env.DB.prepare(`UPDATE account_requests SET status='rejected',admin_note=?,reviewed_by_account_id=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(clean(b.admin_note,1000)||'Không được phê duyệt',s.account_id,rid).run();await audit(env,s.account_id,'account_request_rejected','account_request',rid);return json({ok:true});}
  const pw=String(b.temporary_password||'');if(pw.length<10)return json({error:'TEMP_PASSWORD_TOO_SHORT'},400);
  if(await env.DB.prepare(`SELECT 1 FROM accounts WHERE lower(username)=? OR lower(email)=? LIMIT 1`).bind(r.desired_username,r.email).first())return json({error:'ACCOUNT_ALREADY_EXISTS'},409);
  const last=await env.DB.prepare(`SELECT member_code FROM people WHERE member_code LIKE 'SFN-%' ORDER BY CAST(substr(member_code,5) AS INTEGER) DESC LIMIT 1`).first(),nextNo=last?.member_code?Number(last.member_code.slice(4))+1:1,pid=uid('person'),aid=uid('account'),code=memberCode(nextNo),salt=token(),it=100000,hash=await pbkdf2(pw,salt,it);
  await env.DB.batch([
   env.DB.prepare(`INSERT INTO people(id,member_code,full_name,display_name,date_of_birth,gender,nationality,id_number,id_issue_date,id_issue_place,email,phone,permanent_address,temporary_address,avatar_url,joined_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,DATE('now'),'active')`).bind(pid,code,r.full_name,r.display_name,r.date_of_birth,r.gender,r.nationality,r.id_number,r.id_issue_date,r.id_issue_place,r.email,r.phone,r.permanent_address,r.temporary_address,r.avatar_url),
   env.DB.prepare(`INSERT INTO accounts(id,person_id,username,email,password_hash,password_salt,password_iterations,force_password_change) VALUES(?,?,?,?,?,?,?,1)`).bind(aid,pid,r.desired_username,r.email,hash,salt,it),
   env.DB.prepare(`INSERT INTO account_scopes(id,account_id,role_id,org_node_id,active) VALUES(?,?,?,?,1)`).bind(uid('scope'),aid,'role_member',null),
   env.DB.prepare(`UPDATE account_requests SET status='approved',admin_note=?,reviewed_by_account_id=?,reviewed_at=CURRENT_TIMESTAMP,approved_person_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(clean(b.admin_note,1000)||'Đã phê duyệt',s.account_id,pid,rid)
  ]);await audit(env,s.account_id,'account_request_approved','account_request',rid,null,{person_id:pid,member_code:code});return json({ok:true,member_code:code,username:r.desired_username,note:'Tài khoản đã được tạo. Gửi thông tin đăng nhập cho người yêu cầu qua kênh email chính thức.'});
 }


 const certReview=url.pathname.match(/^\/api\/admin\/certificates\/([^/]+)\/review$/);
 if(certReview&&req.method==='POST'){
  if(!(await hasPerm(env,s.account_id,'certificate.manage')))return json({error:'FORBIDDEN'},403);const cid=decodeURIComponent(certReview[1]),cert=await env.DB.prepare(`SELECT * FROM certificates WHERE id=?`).bind(cid).first();if(!cert)return json({error:'NOT_FOUND'},404);if(!(await canAccessPerson(env,s.account_id,cert.person_id)))return json({error:'SCOPE_FORBIDDEN'},403);if(cert.source_type!=='external')return json({error:'INTERNAL_CERTIFICATE'},409);const b=await bodyJson(req),status=clean(b.status,30);if(!['verified','rejected'].includes(status))return json({error:'INVALID_STATUS'},400);const verify=status==='verified'?(cert.verify_code||verifyCode('CERT')):cert.verify_code;await env.DB.prepare(`UPDATE certificates SET verification_status=?,verify_code=? WHERE id=?`).bind(status,verify||null,cid).run();await env.DB.prepare(`INSERT INTO notifications(id,person_id,org_node_id,type,title,body) VALUES(?,?,?,'certificate',?,?)`).bind(uid('notification'),cert.person_id,cert.org_node_id||null,status==='verified'?'Chứng nhận bên ngoài đã được xác minh':'Chứng nhận bên ngoài chưa được xác minh',status==='verified'?'Chứng nhận bạn cung cấp đã được SFN xác minh.':'Chứng nhận bạn cung cấp đã bị từ chối xác minh.').run();await audit(env,s.account_id,'external_certificate_reviewed','certificate',cid,cert.org_node_id||null,{person_id:cert.person_id,status});return json({ok:true,status,verify_code:verify||null});
 }

 if(url.pathname==='/api/admin/meta'&&req.method==='GET'){
  if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
  const [orgs,cards,roles]=await Promise.all([visibleOrgs(env,s.account_id),env.DB.prepare(`SELECT id,code,name FROM card_types WHERE active=1 ORDER BY name`).all(),env.DB.prepare(`SELECT id,code,name FROM roles ORDER BY name`).all()]);
  return json({orgs,card_types:cards.results||[],roles:roles.results||[]});
 }
 if(url.pathname==='/api/admin/audit'&&req.method==='GET'){if(!(await hasPerm(env,s.account_id,'audit.view')))return json({error:'FORBIDDEN'},403);const r=await env.DB.prepare(`SELECT l.*,a.username FROM audit_log l LEFT JOIN accounts a ON a.id=l.actor_account_id ORDER BY l.id DESC LIMIT 500`).all();return json({items:r.results||[]})}

 return json({error:'NOT_FOUND'},404);
}

export default{
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/files/')){const key=decodeURIComponent(url.pathname.slice(7));const o=await env.FILES.get(key);if(!o)return new Response('Not found',{status:404});const h=new Headers();o.writeHttpMetadata(h);h.set('etag',o.httpEtag);h.set('x-content-type-options','nosniff');return new Response(o.body,{headers:h});}
  if(url.pathname.startsWith('/api/'))return api(request,env,url);
  if(url.pathname==='/setup'){
   if(await setupDone(env))return Response.redirect(new URL('/',url),302);
   const u=new URL(request.url);u.pathname='/setup.html';return env.ASSETS.fetch(new Request(u.toString(),{method:'GET',headers:request.headers}));
  }
  if(url.pathname==='/verify'){
   const u=new URL(request.url);u.pathname='/verify.html';return env.ASSETS.fetch(new Request(u.toString(),{method:'GET',headers:request.headers}));
  }
  if(!(await setupDone(env)))return Response.redirect(new URL('/setup',url),302);
  return env.ASSETS.fetch(request);
 }
};
