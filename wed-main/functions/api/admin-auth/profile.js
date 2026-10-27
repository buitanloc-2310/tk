import { json, requireAdminToken } from '../../_auth.js';

export async function onRequestGet(context) {
  const denied = await requireAdminToken(context);
  if (denied) return denied;
  const r = context.data.adminUser;
  try {
    await context.env.DB.prepare('UPDATE website_admin_users SET last_login=CURRENT_TIMESTAMP WHERE uid=?').bind(r.uid).run();
  } catch {}
  let permissions = [];
  try {
    const p = JSON.parse(r.permissions_json || '[]');
    if (Array.isArray(p)) permissions = p;
  } catch {}
  return json({
    ok: true,
    user: {
      id: r.uid,
      email: r.email,
      name: r.name,
      role: r.role,
      status: r.status,
      is_root_owner: Number(r.is_root_owner || 0),
      permissions,
      note: r.note || '',
      createdAt: r.created_at,
      lastLogin: new Date().toISOString(),
    },
  });
}
