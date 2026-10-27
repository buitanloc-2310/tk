import { requireAdminToken, json } from '../../_auth.js';
function clean(v, max) { return String(v || '').trim().slice(0, max); }

async function ensure(context){
  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_contacts(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,topic TEXT NOT NULL DEFAULT 'Liên hệ chung',message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  const info=await context.env.DB.prepare('PRAGMA table_info(website_contacts)').all();
  const cols=new Set((info.results||[]).map(x=>x.name));
  if(!cols.has('assigned_to')) await context.env.DB.prepare("ALTER TABLE website_contacts ADD COLUMN assigned_to TEXT NOT NULL DEFAULT ''").run();
}
function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
async function loadOfficialContacts(context){
  try{
    const row=await context.env.DB.prepare("SELECT data_json FROM website_cms_documents WHERE collection_name='site_config' AND doc_id='current' LIMIT 1").first();
    const cfg=row?.data_json?JSON.parse(row.data_json):{};
    return Array.isArray(cfg?.footerContacts)?cfg.footerContacts:[];
  }catch{return []}
}
function resolveContact(topic, contacts){
  const t=normalize(topic);
  const desired=t.includes('hop tac')||t.includes('dong hanh')?'hop tac':t.includes('nhan su')?'nhan su':t.includes('tinh nguyen')||t.includes('tnv')?'tinh nguyen':t.includes('truyen thong')?'truyen thong':t.includes('lop hoc')||t.includes('giao duc')?'lop hoc':'lien he chung';
  const candidates=contacts.filter(x=>String(x?.value||'').includes('@skyfirst.io.vn'));
  const picked=candidates.find(x=>normalize(x?.label).includes(desired))||candidates.find(x=>normalize(x?.label).includes('lien he chung'))||candidates.find(x=>normalize(x?.label).includes('lien he'));
  return clean(picked?.value||'lienhe@skyfirst.io.vn',180);
}

export async function onRequestPost(context) {
  await ensure(context);
  const body = await context.request.json().catch(() => ({}));
  const name = clean(body.name, 100), email = clean(body.email, 180), message = clean(body.message, 4000), topic = clean(body.topic || 'Liên hệ chung', 120);
  if (!name || !email || !message) return json({ ok: false, error: 'Vui lòng nhập đầy đủ thông tin.' }, { status: 400 });
  const id = crypto.randomUUID();
  const reference = `SFN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${id.slice(0,6).toUpperCase()}`;
  const assignedTo=resolveContact(topic,await loadOfficialContacts(context));
  await context.env.DB.prepare("INSERT INTO website_contacts (id, name, email, topic, message, status, assigned_to, created_at) VALUES (?, ?, ?, ?, ?, 'new', ?, datetime('now'))").bind(id, name, email, topic, message, assignedTo).run();
  return json({ ok: true, reference, assignedTo, message: 'Thông tin của bạn đã được tiếp nhận và chuyển đúng bộ phận phụ trách.' });
}

export async function onRequestGet(context) {
  const denied = await requireAdminToken(context); if (denied) return denied;
  await ensure(context);
  const rows = await context.env.DB.prepare('SELECT id, name, email, topic, message, status, assigned_to, created_at FROM website_contacts ORDER BY created_at DESC LIMIT 300').all();
  return json({ ok: true, items: rows.results || [] });
}

export async function onRequestPatch(context) {
  const denied = await requireAdminToken(context); if (denied) return denied;
  await ensure(context);
  const body = await context.request.json().catch(() => ({}));
  const id = clean(body.id, 80), status = clean(body.status, 20);
  if (!id || !['new','reviewed','closed'].includes(status)) return json({ ok: false, error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  await context.env.DB.prepare('UPDATE website_contacts SET status = ? WHERE id = ?').bind(status, id).run();
  return json({ ok: true });
}

export async function onRequestDelete(context) {
  const denied = await requireAdminToken(context); if (denied) return denied;
  await ensure(context);
  const body = await context.request.json().catch(() => ({}));
  const id = clean(body.id, 80); if (!id) return json({ ok: false, error: 'Thiếu id.' }, { status: 400 });
  await context.env.DB.prepare('DELETE FROM website_contacts WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
