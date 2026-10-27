import { json, ensureAdminSchema, requireAdminToken } from '../../_auth.js';
import { firebaseCreateUser, firebaseDeleteUid, firebaseSetPassword } from '../../_firebaseAdmin.js';

async function ensure(context) {
  await ensureAdminSchema(context);
  const cols = await context.env.DB.prepare('PRAGMA table_info(website_admin_users)').all();
  const names = new Set((cols.results || []).map(x => x.name));
  if (!names.has('note')) await context.env.DB.prepare("ALTER TABLE website_admin_users ADD COLUMN note TEXT NOT NULL DEFAULT ''").run();
  if (!names.has('permissions_json')) await context.env.DB.prepare("ALTER TABLE website_admin_users ADD COLUMN permissions_json TEXT NOT NULL DEFAULT '[]'").run();
  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_admin_audit(
    id INTEGER PRIMARY KEY AUTOINCREMENT,actor_uid TEXT NOT NULL,target_uid TEXT,
    action TEXT NOT NULL,detail TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function gate(context) {
  const denied = await requireAdminToken(context, 'users.manage');
  if (denied) return denied;
  await ensure(context);
  if (context.data.adminUser.role !== 'developer') {
    return json({ ok: false, error: 'Chỉ Chủ sở hữu hệ thống hoặc Lập trình viên được quản lý tài khoản.' }, { status: 403 });
  }
  return null;
}

async function audit(c, target, action, detail = '') {
  await c.env.DB.prepare('INSERT INTO website_admin_audit(actor_uid,target_uid,action,detail) VALUES(?,?,?,?)')
    .bind(c.data.adminUser.uid, target || null, action, detail).run();
}

const isRoot = (u) => Number(u?.is_root_owner || 0) === 1;
const parsePerms = (v) => { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };

export async function onRequestGet(context) {
  const denied = await gate(context);
  if (denied) return denied;
  const r = await context.env.DB.prepare(
    'SELECT uid AS id,email,name,role,status,is_root_owner,permissions_json,note,created_at AS createdAt,last_login AS lastLogin FROM website_admin_users ORDER BY is_root_owner DESC, created_at ASC'
  ).all();
  return json({
    ok: true,
    items: (r.results || []).map(x => ({
      ...x,
      permissions: parsePerms(x.permissions_json),
      permissions_json: undefined,
    })),
  });
}

export async function onRequestPost(context) {
  const denied = await gate(context);
  if (denied) return denied;
  const b = await context.request.json().catch(() => ({}));
  const u = new URL(context.request.url);

  // Support password reset via ?action=password or body.action==='reset-password'
  if (u.searchParams.get('action') === 'password' || b.action === 'reset-password') {
    const uid = String(b.uid || '');
    const password = String(b.password || '');
    if (!uid || password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return json({ ok: false, error: 'Mật khẩu mới cần ít nhất 10 ký tự, có chữ hoa, chữ thường và số.' }, { status: 400 });
    }
    const target = await context.env.DB.prepare('SELECT role,is_root_owner FROM website_admin_users WHERE uid=?').bind(uid).first();
    if (!target) return json({ ok: false, error: 'Không tìm thấy tài khoản.' }, { status: 404 });
    if (isRoot(target) && uid !== context.data.adminUser.uid) {
      return json({ ok: false, error: 'Không tài khoản nào khác được đặt lại mật khẩu của Chủ sở hữu hệ thống.' }, { status: 403 });
    }
    if (target.role === 'developer' && !isRoot(context.data.adminUser) && uid !== context.data.adminUser.uid) {
      return json({ ok: false, error: 'Lập trình viên không thể đặt lại mật khẩu của Lập trình viên khác.' }, { status: 403 });
    }
    try {
      await firebaseSetPassword(context.env, uid, password);
      await audit(context, uid, 'admin.password_reset', '');
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: String(e.message || e) }, { status: 503 });
    }
  }

  const email = String(b.email || '').trim().toLowerCase(),
    password = String(b.password || ''),
    name = String(b.name || '').trim().slice(0, 120);
  const role = ['developer', 'admin', 'editor'].includes(b.role) ? b.role : 'editor',
    status = b.status === 'inactive' ? 'inactive' : 'active',
    note = String(b.note || '').trim().slice(0, 500),
    permissions = Array.isArray(b.permissions) ? b.permissions.map(String) : [];

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ ok: false, error: 'Địa chỉ email không hợp lệ.' }, { status: 400 });
  if (email === 'skyfirst.ec@gmail.com') return json({ ok: false, error: 'Địa chỉ Chủ sở hữu hệ thống được bảo vệ và không thể cấp lại từ trang quản trị.' }, { status: 409 });
  if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return json({ ok: false, error: 'Mật khẩu cần ít nhất 10 ký tự, có chữ hoa, chữ thường và số.' }, { status: 400 });
  }
  if (role === 'developer' && !isRoot(context.data.adminUser)) {
    return json({ ok: false, error: 'Chỉ Chủ sở hữu hệ thống được cấp thêm quyền Lập trình viên.' }, { status: 403 });
  }
  const exists = await context.env.DB.prepare('SELECT uid FROM website_admin_users WHERE lower(email)=? LIMIT 1').bind(email).first();
  if (exists) return json({ ok: false, error: 'Email này đã có trong danh sách quản trị.' }, { status: 409 });

  let created = null;
  try {
    created = await firebaseCreateUser(context.env, { email, password, displayName: name || email.split('@')[0], disabled: false });
  } catch (e) {
    const m = String(e?.message || e || '');
    if (m.includes('EMAIL_EXISTS')) return json({ ok: false, error: 'Email đã tồn tại trong hệ thống đăng nhập.' }, { status: 409 });
    return json({ ok: false, error: `Không tạo được tài khoản đăng nhập: ${m}` }, { status: 503 });
  }
  try {
    await context.env.DB.prepare(
      'INSERT INTO website_admin_users(uid,email,name,role,status,is_root_owner,permissions_json,note,created_at) VALUES(?,?,?,?,?,0,?,?,CURRENT_TIMESTAMP)'
    ).bind(created.localId, email, name || email.split('@')[0], role, status, JSON.stringify(permissions), note).run();
    await audit(context, created.localId, 'admin.create', JSON.stringify({ email, role, status, permissions }));
    return json({ ok: true, user: { id: created.localId, email, name: name || email.split('@')[0], role, status, permissions, note, is_root_owner: 0 } });
  } catch {
    try { await firebaseDeleteUid(context.env, created.localId); } catch {}
    return json({ ok: false, error: 'Không lưu được quyền quản trị vào D1; tài khoản đăng nhập vừa tạo đã được hoàn tác.' }, { status: 500 });
  }
}

export async function onRequestPatch(context) {
  const denied = await gate(context);
  if (denied) return denied;
  const b = await context.request.json().catch(() => ({})), uid = String(b.uid || '');
  if (!uid) return json({ ok: false, error: 'Thiếu UID.' }, { status: 400 });
  const target = await context.env.DB.prepare('SELECT * FROM website_admin_users WHERE uid=?').bind(uid).first();
  if (!target) return json({ ok: false, error: 'Không tìm thấy tài khoản.' }, { status: 404 });
  const actor = context.data.adminUser;
  if (isRoot(target) && uid !== actor.uid) return json({ ok: false, error: 'Chủ sở hữu hệ thống được bảo vệ và không thể bị tài khoản khác thay đổi.' }, { status: 403 });
  if (target.role === 'developer' && !isRoot(actor) && uid !== actor.uid) return json({ ok: false, error: 'Lập trình viên không thể thay đổi một Lập trình viên khác.' }, { status: 403 });
  let role = ['developer', 'admin', 'editor'].includes(b.role) ? b.role : target.role,
    status = b.status === 'inactive' ? 'inactive' : b.status === 'active' ? 'active' : target.status;
  if (isRoot(target)) { role = 'developer'; status = 'active'; }
  else if (role === 'developer' && !isRoot(actor)) return json({ ok: false, error: 'Chỉ Chủ sở hữu hệ thống được cấp quyền Lập trình viên.' }, { status: 403 });
  const name = String(b.name ?? target.name).trim().slice(0, 120),
    note = String(b.note ?? target.note ?? '').trim().slice(0, 500),
    permissions = Array.isArray(b.permissions) ? b.permissions.map(String) : parsePerms(target.permissions_json);
  await context.env.DB.prepare('UPDATE website_admin_users SET name=?,role=?,status=?,permissions_json=?,note=? WHERE uid=?')
    .bind(name, role, status, JSON.stringify(permissions), note, uid).run();
  await audit(context, uid, 'admin.update', JSON.stringify({ role, status, permissions }));
  return json({ ok: true });
}

export async function onRequestDelete(context) {
  const denied = await gate(context);
  if (denied) return denied;
  const uid = new URL(context.request.url).searchParams.get('uid') || '';
  if (!uid) return json({ ok: false, error: 'Thiếu UID.' }, { status: 400 });
  if (uid === context.data.adminUser.uid) return json({ ok: false, error: 'Không thể tự xóa tài khoản đang đăng nhập.' }, { status: 400 });
  const target = await context.env.DB.prepare('SELECT role,is_root_owner FROM website_admin_users WHERE uid=?').bind(uid).first();
  if (!target) return json({ ok: false, error: 'Không tìm thấy tài khoản.' }, { status: 404 });
  if (isRoot(target)) return json({ ok: false, error: 'Chủ sở hữu hệ thống không thể bị xóa.' }, { status: 403 });
  if (target.role === 'developer' && !isRoot(context.data.adminUser)) return json({ ok: false, error: 'Chỉ Chủ sở hữu hệ thống được xóa tài khoản Lập trình viên.' }, { status: 403 });
  try { await firebaseDeleteUid(context.env, uid); } catch (e) { return json({ ok: false, error: String(e.message || e) }, { status: 503 }); }
  await context.env.DB.prepare('DELETE FROM website_admin_users WHERE uid=?').bind(uid).run();
  await audit(context, uid, 'admin.delete');
  return json({ ok: true });
}
