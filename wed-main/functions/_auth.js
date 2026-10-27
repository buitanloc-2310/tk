export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export const ROOT_OWNER_EMAIL = 'skyfirst.ec@gmail.com';

export const ROLE_CAPABILITIES = {
  developer: new Set([
    'content.edit',
    'content.publish',
    'forms.manage',
    'submissions.view',
    'records.manage',
    'media.manage',
    'website.visualEdit',
    'settings.manage',
    'users.manage',
    'system.manage',
  ]),
  admin: new Set([
    'content.edit',
    'content.publish',
    'forms.manage',
    'submissions.view',
    'records.manage',
    'media.manage',
    'website.visualEdit',
    'settings.manage',
  ]),
  editor: new Set([
    'content.edit',
    'media.manage',
  ]),
};

export function hasAdminCapability(adminUser, capability) {
  if (!adminUser || adminUser.status !== 'active') return false;
  if (Number(adminUser.is_root_owner || 0) === 1 || adminUser.role === 'developer') return true;
  const base = ROLE_CAPABILITIES[adminUser.role] || ROLE_CAPABILITIES.editor;
  if (base.has(capability)) return true;
  try {
    const custom = Array.isArray(adminUser.permissions)
      ? adminUser.permissions
      : JSON.parse(adminUser.permissions_json || '[]');
    if (Array.isArray(custom) && custom.includes(capability)) return true;
  } catch {}
  return false;
}

export async function ensureAdminSchema(context) {
  if (!context.env.DB) throw new Error('D1 binding DB is missing');
  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_admin_users (
    uid TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor', status TEXT NOT NULL DEFAULT 'active',
    is_root_owner INTEGER NOT NULL DEFAULT 0, permissions_json TEXT NOT NULL DEFAULT '[]',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_login TEXT
  )`).run();
  const cols = await context.env.DB.prepare('PRAGMA table_info(website_admin_users)').all();
  const names = new Set((cols.results || []).map(x => x.name));
  if (!names.has('is_root_owner')) await context.env.DB.prepare('ALTER TABLE website_admin_users ADD COLUMN is_root_owner INTEGER NOT NULL DEFAULT 0').run();
  if (!names.has('permissions_json')) await context.env.DB.prepare("ALTER TABLE website_admin_users ADD COLUMN permissions_json TEXT NOT NULL DEFAULT '[]'").run();
  if (!names.has('note')) await context.env.DB.prepare("ALTER TABLE website_admin_users ADD COLUMN note TEXT NOT NULL DEFAULT ''").run();
  await context.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_website_admin_users_email ON website_admin_users(email)').run();
  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_admin_audit(
    id INTEGER PRIMARY KEY AUTOINCREMENT, actor_uid TEXT NOT NULL, target_uid TEXT,
    action TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await context.env.DB.prepare("UPDATE website_admin_users SET is_root_owner=1, role='developer', status='active' WHERE lower(email)=?").bind(ROOT_OWNER_EMAIL).run();
  await context.env.DB.prepare("UPDATE website_admin_users SET is_root_owner=0 WHERE lower(email)<>? AND is_root_owner<>0").bind(ROOT_OWNER_EMAIL).run();
}

export async function verifyFirebaseUser(context) {
  const header = context.request.headers.get('authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!idToken) return null;
  const apiKey = context.env.FIREBASE_API_KEY || 'AIzaSyCnsxTv6kDiIp_5KIUlnPcJznnZxYFvN9U';
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const u = d?.users?.[0];
    if (!u?.localId) return null;
    return { uid: u.localId, email: String(u.email || '').trim().toLowerCase(), idToken };
  } catch {
    return null;
  }
}

async function resolveAdmin(context, user) {
  let row = await context.env.DB.prepare('SELECT uid,email,name,role,status,is_root_owner,permissions_json,note,created_at,last_login FROM website_admin_users WHERE uid=? LIMIT 1').bind(user.uid).first();
  if (user.email === ROOT_OWNER_EMAIL) {
    if (!row) {
      const byEmail = await context.env.DB.prepare('SELECT uid FROM website_admin_users WHERE lower(email)=? LIMIT 1').bind(ROOT_OWNER_EMAIL).first();
      if (byEmail && byEmail.uid !== user.uid) {
        await context.env.DB.prepare('DELETE FROM website_admin_users WHERE uid=?').bind(byEmail.uid).run();
      }
      await context.env.DB.prepare(`INSERT INTO website_admin_users(uid,email,name,role,status,is_root_owner,permissions_json,note,created_at,last_login)
        VALUES(?,?,?,'developer','active',1,'[]','',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
        .bind(user.uid, ROOT_OWNER_EMAIL, 'Sky First System Owner').run();
    } else {
      await context.env.DB.prepare("UPDATE website_admin_users SET email=?,role='developer',status='active',is_root_owner=1,last_login=CURRENT_TIMESTAMP WHERE uid=?").bind(ROOT_OWNER_EMAIL, user.uid).run();
    }
    await context.env.DB.prepare('UPDATE website_admin_users SET is_root_owner=0 WHERE uid<>? AND is_root_owner<>0').bind(user.uid).run();
    row = await context.env.DB.prepare('SELECT uid,email,name,role,status,is_root_owner,permissions_json,note,created_at,last_login FROM website_admin_users WHERE uid=? LIMIT 1').bind(user.uid).first();
  }
  return row;
}

export async function requireAdminToken(context, requiredCapability = null) {
  try {
    await ensureAdminSchema(context);
  } catch {
    return json({ ok: false, error: 'Cơ sở dữ liệu quản trị chưa sẵn sàng.', code: 'ADMIN_DB_UNAVAILABLE' }, { status: 503 });
  }
  const user = await verifyFirebaseUser(context);
  if (!user) return json({ ok: false, error: 'Phiên quản trị không hợp lệ.', code: 'AUTH_INVALID' }, { status: 401 });
  try {
    const row = await resolveAdmin(context, user);
    if (!row || !['developer', 'admin', 'editor'].includes(row.role) || row.status !== 'active') {
      return json({ ok: false, error: 'Tài khoản không có quyền quản trị.', code: 'ADMIN_FORBIDDEN' }, { status: 403 });
    }
    if (requiredCapability && !hasAdminCapability(row, requiredCapability)) {
      return json({ ok: false, error: `Tài khoản (${row.role}) không có quyền thực hiện thao tác: ${requiredCapability}.`, code: 'CAPABILITY_FORBIDDEN' }, { status: 403 });
    }
    context.data = context.data || {};
    context.data.adminUser = row;
    context.data.firebaseUser = user;
    return null;
  } catch {
    return json({ ok: false, error: 'Không thể xác minh quyền quản trị.', code: 'ADMIN_LOOKUP_FAILED' }, { status: 503 });
  }
}

export async function recordRevision(context, { entityType, entityId, versionLabel = '', snapshot, actorUid = 'system' }) {
  try {
    await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_revisions (
      id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
      version_label TEXT NOT NULL DEFAULT '', snapshot_json TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'system', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();
    const id = `rev-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const jsonText = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot || {});
    await context.env.DB.prepare(
      `INSERT INTO website_revisions(id, entity_type, entity_id, version_label, snapshot_json, created_by, created_at)
       VALUES(?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(id, String(entityType), String(entityId), String(versionLabel || '').slice(0, 160), jsonText, String(actorUid || 'system')).run();
    // Giữ tối đa 30 bản phiên bản gần nhất cho mỗi thực thể để tối ưu dung lượng D1
    await context.env.DB.prepare(
      `DELETE FROM website_revisions WHERE entity_type=? AND entity_id=? AND id NOT IN (
         SELECT id FROM website_revisions WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC, id DESC LIMIT 30
       )`
    ).bind(String(entityType), String(entityId), String(entityType), String(entityId)).run();
  } catch {}
}
