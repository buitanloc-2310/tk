const enc=new TextEncoder();
const clean=(v,m=1000)=>String(v??'').trim().slice(0,m);
const uid=(p='id')=>`${p}_${crypto.randomUUID()}`;
const json=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8',...h}});
const bodyJson=async r=>{try{return await r.json()}catch{return {}}};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha256=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
function token(){const a=new Uint8Array(32);crypto.getRandomValues(a);return b64(a).replace(/[+/=]/g,'')}
async function pbkdf2(password,salt,iterations=100000){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return b64(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations},key,256))}
const cookie=(n,v,d=7)=>`${n}=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${d*86400}`;
const clearCookie=n=>`${n}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
async function setupDone(env){const r=await env.DB.prepare('SELECT COUNT(*) c FROM accounts').first();return Number(r?.c||0)>0}
async function getSession(req,env){const raw=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sfn_session='));if(!raw)return null;const t=decodeURIComponent(raw.slice(12)),h=await sha256(t);return env.DB.prepare(`SELECT s.id session_id,s.account_id,a.person_id,a.username,p.full_name,p.member_code,p.avatar_url,p.status FROM sessions s JOIN accounts a ON a.id=s.account_id JOIN people p ON p.id=a.person_id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND a.is_locked=0`).bind(h).first()}
async function hasPerm(env,aid,code,scope=null){if(await env.DB.prepare(`SELECT 1 FROM account_scopes s JOIN roles r ON r.id=s.role_id WHERE s.account_id=? AND s.active=1 AND r.code='SUPER_ADMIN' LIMIT 1`).bind(aid).first())return true;let q=`SELECT 1 FROM account_scopes s JOIN role_permissions rp ON rp.role_id=s.role_id JOIN permissions p ON p.id=rp.permission_id WHERE s.account_id=? AND s.active=1 AND p.code=?`,b=[aid,code];if(scope){q+=` AND (s.org_node_id=? OR s.org_node_id IS NULL)`;b.push(scope)}q+=' LIMIT 1';return !!(await env.DB.prepare(q).bind(...b).first())}
async function audit(env,aid,action,type,id,scope=null,details={}){await env.DB.prepare(`INSERT INTO audit_log(actor_account_id,action,entity_type,entity_id,org_node_id,details_json) VALUES(?,?,?,?,?,?)`).bind(aid||null,action,type,id||null,scope||null,JSON.stringify(details)).run()}

async function api(req,env,url){
 if(url.pathname==='/api/setup/status'&&req.method==='GET')return json({setup_required:!(await setupDone(env))});
 if(url.pathname==='/api/setup'&&req.method==='POST'){
  if(await setupDone(env))return json({error:'SETUP_ALREADY_COMPLETED'},409);const b=await bodyJson(req),name=clean(b.full_name,160),user=clean(b.username,80).toLowerCase(),email=clean(b.email,200).toLowerCase(),pw=String(b.password||'');if(!name||!user||pw.length<10)return json({error:'INVALID_SETUP_DATA'},400);
  const pid=uid('person'),aid=uid('account'),salt=token(),it=100000,hash=await pbkdf2(pw,salt,it);
  await env.DB.batch([
   env.DB.prepare(`INSERT INTO people(id,member_code,full_name,email,joined_at,status) VALUES(?,?,?,?,DATE('now'),'active')`).bind(pid,'SFN-000001',name,email||null),
   env.DB.prepare(`INSERT INTO accounts(id,person_id,username,email,password_hash,password_salt,password_iterations,force_password_change) VALUES(?,?,?,?,?,?,?,0)`).bind(aid,pid,user,email||null,hash,salt,it),
   env.DB.prepare(`INSERT INTO account_scopes(id,account_id,role_id,org_node_id,active) VALUES(?,?,?,?,1)`).bind(uid('scope'),aid,'role_super_admin','org_sfn'),
   env.DB.prepare(`UPDATE system_settings SET value_json='{"completed":true}',updated_at=CURRENT_TIMESTAMP WHERE key='setup'`)
  ]);await audit(env,aid,'system_setup','system','setup','org_sfn',{username:user});return json({ok:true});
 }
 if(url.pathname==='/api/auth/login'&&req.method==='POST'){
  const b=await bodyJson(req),login=clean(b.login,200).toLowerCase(),pw=String(b.password||'');const a=await env.DB.prepare(`SELECT a.*,p.status person_status FROM accounts a JOIN people p ON p.id=a.person_id WHERE lower(a.username)=? OR lower(a.email)=? LIMIT 1`).bind(login,login).first();if(!a||a.is_locked||a.person_status==='suspended')return json({error:'INVALID_LOGIN'},401);if(await pbkdf2(pw,a.password_salt,a.password_iterations)!==a.password_hash)return json({error:'INVALID_LOGIN'},401);const t=token(),h=await sha256(t),sid=uid('session');await env.DB.batch([env.DB.prepare(`INSERT INTO sessions(id,account_id,token_hash,expires_at,user_agent) VALUES(?,?,?,datetime('now','+7 days'),?)`).bind(sid,a.id,h,clean(req.headers.get('user-agent'),500)),env.DB.prepare(`UPDATE accounts SET last_login_at=CURRENT_TIMESTAMP WHERE id=?`).bind(a.id)]);return json({ok:true,force_password_change:!!a.force_password_change},200,{'set-cookie':cookie('sfn_session',t,7)});
 }
 if(url.pathname==='/api/auth/logout'&&req.method==='POST'){const s=await getSession(req,env);if(s)await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(s.session_id).run();return json({ok:true},200,{'set-cookie':clearCookie('sfn_session')})}
 const s=await getSession(req,env);if(!s)return json({error:'UNAUTHORIZED'},401);
 if(url.pathname==='/api/me'&&req.method==='GET'){const person=await env.DB.prepare('SELECT * FROM people WHERE id=?').bind(s.person_id).first();const memberships=await env.DB.prepare(`SELECT m.*,o.name org_name,o.short_name,o.node_type FROM org_memberships m JOIN org_nodes o ON o.id=m.org_node_id WHERE m.person_id=? ORDER BY m.is_primary DESC,m.started_at DESC`).bind(s.person_id).all();const cards=await env.DB.prepare(`SELECT c.*,t.name card_type_name,o.name org_name FROM member_cards c JOIN card_types t ON t.id=c.card_type_id LEFT JOIN org_nodes o ON o.id=c.org_node_id WHERE c.person_id=? ORDER BY c.status='active' DESC,c.issued_at DESC`).bind(s.person_id).all();return json({person,memberships:memberships.results||[],cards:cards.results||[]})}
 if(url.pathname==='/api/dashboard'&&req.method==='GET'){const [g,t,a,c,h,n]=await Promise.all([env.DB.prepare(`SELECT period_type,ROUND(AVG(progress)) progress FROM goals WHERE person_id=? AND status='active' GROUP BY period_type`).bind(s.person_id).all(),env.DB.prepare(`SELECT COUNT(*) total FROM tasks WHERE person_id=? AND status!='cancelled'`).bind(s.person_id).first(),env.DB.prepare(`SELECT COUNT(*) total FROM activity_participants WHERE person_id=?`).bind(s.person_id).first(),env.DB.prepare(`SELECT COUNT(*) total FROM certificates WHERE person_id=? AND verification_status='verified'`).bind(s.person_id).first(),env.DB.prepare(`SELECT COUNT(*) total FROM achievements WHERE person_id=? AND verification_status='verified'`).bind(s.person_id).first(),env.DB.prepare(`SELECT COUNT(*) total FROM notifications WHERE person_id=? AND read_at IS NULL`).bind(s.person_id).first()]);return json({goals:g.results||[],tasks:t.total||0,activities:a.total||0,certificates:c.total||0,achievements:h.total||0,unread:n.total||0})}
 if(url.pathname==='/api/me/goals'&&req.method==='GET'){const r=await env.DB.prepare(`SELECT * FROM goals WHERE person_id=? ORDER BY created_at DESC LIMIT 100`).bind(s.person_id).all();return json({items:r.results||[]})}
 if(url.pathname==='/api/me/tasks'&&req.method==='GET'){const r=await env.DB.prepare(`SELECT * FROM tasks WHERE person_id=? ORDER BY created_at DESC LIMIT 100`).bind(s.person_id).all();return json({items:r.results||[]})}
 if(url.pathname==='/api/me/certificates'&&req.method==='GET'){const r=await env.DB.prepare(`SELECT * FROM certificates WHERE person_id=? ORDER BY issued_at DESC,created_at DESC LIMIT 200`).bind(s.person_id).all();return json({items:r.results||[]})}
 if(url.pathname==='/api/me/achievements'&&req.method==='GET'){const r=await env.DB.prepare(`SELECT * FROM achievements WHERE person_id=? ORDER BY achieved_at DESC,created_at DESC LIMIT 200`).bind(s.person_id).all();return json({items:r.results||[]})}
 if(url.pathname==='/api/admin/org'&&req.method==='GET'){if(!(await hasPerm(env,s.account_id,'org.manage')))return json({error:'FORBIDDEN'},403);const r=await env.DB.prepare(`SELECT * FROM org_nodes ORDER BY parent_id,sort_order,name`).all();return json({items:r.results||[]})}
 if(url.pathname==='/api/admin/org'&&req.method==='POST'){if(!(await hasPerm(env,s.account_id,'org.manage')))return json({error:'FORBIDDEN'},403);const b=await bodyJson(req),id=uid('org');await env.DB.prepare(`INSERT INTO org_nodes(id,parent_id,code,name,short_name,node_type,status,sort_order) VALUES(?,?,?,?,?,?,?,?)`).bind(id,b.parent_id||'org_sfn',clean(b.code,80),clean(b.name,200),clean(b.short_name,80),clean(b.node_type,80)||'unit','active',Number(b.sort_order||0)).run();await audit(env,s.account_id,'org_created','org_node',id,b.parent_id||'org_sfn',{code:b.code,name:b.name});return json({ok:true,id})}
 if(url.pathname==='/api/admin/members'&&req.method==='GET'){if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);const page=Math.max(1,Number(url.searchParams.get('page')||1)),limit=Math.min(100,Math.max(10,Number(url.searchParams.get('limit')||50))),q=clean(url.searchParams.get('q'),100),status=clean(url.searchParams.get('status'),30),w=[],b=[];if(q){w.push(`(p.full_name LIKE ? OR p.member_code LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)`);b.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`)}if(status){w.push('p.status=?');b.push(status)}const where=w.length?`WHERE ${w.join(' AND ')}`:'';const total=(await env.DB.prepare(`SELECT COUNT(*) total FROM people p ${where}`).bind(...b).first()).total||0;const r=await env.DB.prepare(`SELECT p.id,p.member_code,p.full_name,p.email,p.phone,p.avatar_url,p.status,p.joined_at FROM people p ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`).bind(...b,limit,(page-1)*limit).all();return json({items:r.results||[],page,limit,total})}
 if(url.pathname==='/api/admin/members'&&req.method==='POST'){if(!(await hasPerm(env,s.account_id,'member.edit')))return json({error:'FORBIDDEN'},403);const b=await bodyJson(req),pw=String(b.password||'');if(!clean(b.full_name,160)||!clean(b.username,80)||pw.length<10)return json({error:'INVALID_DATA'},400);const n=(await env.DB.prepare(`SELECT COUNT(*) c FROM people`).first()).c||0,code=`SFN-${String(Number(n)+1).padStart(6,'0')}`,pid=uid('person'),aid=uid('account'),salt=token(),it=100000,hash=await pbkdf2(pw,salt,it);await env.DB.batch([env.DB.prepare(`INSERT INTO people(id,member_code,full_name,display_name,date_of_birth,gender,nationality,id_number,id_issue_date,id_issue_place,email,phone,permanent_address,temporary_address,joined_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(pid,code,clean(b.full_name,160),clean(b.display_name,160)||null,b.date_of_birth||null,clean(b.gender,50)||null,clean(b.nationality,80)||null,clean(b.id_number,80)||null,b.id_issue_date||null,clean(b.id_issue_place,200)||null,clean(b.email,200)||null,clean(b.phone,50)||null,clean(b.permanent_address,500)||null,clean(b.temporary_address,500)||null,b.joined_at||new Date().toISOString().slice(0,10),'active'),env.DB.prepare(`INSERT INTO accounts(id,person_id,username,email,password_hash,password_salt,password_iterations,force_password_change) VALUES(?,?,?,?,?,?,?,1)`).bind(aid,pid,clean(b.username,80).toLowerCase(),clean(b.email,200).toLowerCase()||null,hash,salt,it),env.DB.prepare(`INSERT INTO account_scopes(id,account_id,role_id,org_node_id,active) VALUES(?,?,?,?,1)`).bind(uid('scope'),aid,'role_member',null)]);await audit(env,s.account_id,'member_created','person',pid,b.org_node_id||null,{member_code:code});return json({ok:true,id:pid,member_code:code})}
 if(url.pathname==='/api/admin/audit'&&req.method==='GET'){if(!(await hasPerm(env,s.account_id,'audit.view')))return json({error:'FORBIDDEN'},403);const r=await env.DB.prepare(`SELECT l.*,a.username FROM audit_log l LEFT JOIN accounts a ON a.id=l.actor_account_id ORDER BY l.id DESC LIMIT 300`).all();return json({items:r.results||[]})}
 return json({error:'NOT_FOUND'},404)
}
export default{async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return api(request,env,url);if(url.pathname==='/setup'){
  if(await setupDone(env)){
    return Response.redirect(new URL('/',url),302);
  }

  const setupUrl = new URL(request.url);
  setupUrl.pathname = '/setup.html';

  return env.ASSETS.fetch(
    new Request(setupUrl.toString(), {
      method: 'GET',
      headers: request.headers
    })
  );
}

if(!(await setupDone(env))){
  return Response.redirect(new URL('/setup',url),302);
}

return env.ASSETS.fetch(request)
}};
