import { requireAdminToken, json } from '../../_auth.js';

async function ensure(context) {
  await context.env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS website_admin_records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,title TEXT NOT NULL,payload TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
  ).run();
  await context.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_website_admin_records_kind ON website_admin_records(kind,updated_at DESC)').run();
}

function parsePayload(v) { try { return JSON.parse(v || '{}'); } catch { return {}; } }

async function audit(context, action, detail) {
  const u = context.data?.adminUser;
  try {
    await context.env.DB.prepare('INSERT INTO website_admin_audit(actor_uid,target_uid,action,detail) VALUES(?,?,?,?)')
      .bind(u?.uid || 'unknown', null, action, JSON.stringify(detail || {})).run();
  } catch {}
}

const PUBLIC_KINDS = new Set(['partners', 'events', 'opportunities', 'documents', 'people', 'impact', 'transparency', 'notifications', 'redirects']);

function publicRecord(x) {
  const p = parsePayload(x.payload);
  if (x.kind === 'redirects') {
    if (String(p.active).toLowerCase() !== 'true') return null;
  } else if (!p.public) return null;
  const { contactEmail, contactPhone, recipientEmail, bankAccount, accountHolder, receiptUrl, note, integrationSecret, webhookSecret, ...safe } = p;
  return { id: x.id, kind: x.kind, title: x.title, ...safe, updated_at: x.updated_at };
}

export async function onRequestGet(context) {
  try {
    await ensure(context);
    const u = new URL(context.request.url);
    const kind = u.searchParams.get('kind') || '';
    const wantsPublic = u.searchParams.get('public') === '1';
    const wantsPublicBundle = u.searchParams.get('publicBundle') === '1';
    if (wantsPublicBundle) {
      const r = await context.env.DB.prepare(`SELECT id,kind,title,payload,updated_at FROM website_admin_records WHERE kind IN (${[...PUBLIC_KINDS].map(() => '?').join(',')}) ORDER BY updated_at DESC LIMIT 1000`).bind(...PUBLIC_KINDS).all();
      const collections = Object.fromEntries([...PUBLIC_KINDS].map(k => [k, []]));
      for (const row of r.results || []) {
        const item = publicRecord(row);
        if (item && collections[row.kind]) collections[row.kind].push(item);
      }
      return json({ ok: true, collections }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900' } });
    }
    if (wantsPublic) {
      if (!PUBLIC_KINDS.has(kind)) return json({ ok: false, error: 'Nhóm dữ liệu công khai không hợp lệ.' }, { status: 400 });
      const r = await context.env.DB.prepare('SELECT id,kind,title,payload,updated_at FROM website_admin_records WHERE kind=? ORDER BY updated_at DESC LIMIT 250').bind(kind).all();
      const items = (r.results || []).map(publicRecord).filter(Boolean);
      return json({ ok: true, items }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900' } });
    }
    const requiredCap = ['email-templates', 'integrations', 'redirects'].includes(kind) ? 'settings.manage' : 'records.manage';
    const denied = await requireAdminToken(context, requiredCap);
    if (denied) return denied;
    if (kind === 'logs') {
      const r = await context.env.DB.prepare(`SELECT a.id,a.action,a.detail,a.created_at,u.name,u.email FROM website_admin_audit a LEFT JOIN website_admin_users u ON u.uid=a.actor_uid ORDER BY a.id DESC LIMIT 300`).all();
      return json({
        ok: true,
        items: (r.results || []).map(x => {
          let d = {};
          try { d = JSON.parse(x.detail || '{}'); } catch {}
          return {
            id: String(x.id),
            kind: 'logs',
            title: String(x.action || 'Hoạt động quản trị'),
            subtitle: `${x.name || x.email || 'Quản trị viên'} • ${x.created_at || ''}${d.title ? ` • ${d.title}` : ''}`,
            status: 'Đã ghi',
            eventTime: x.created_at,
          };
        }),
      });
    }
    const r = await context.env.DB.prepare('SELECT id,kind,title,payload,created_at,updated_at FROM website_admin_records WHERE kind=? ORDER BY updated_at DESC').bind(kind).all();
    return json({ ok: true, items: (r.results || []).map(x => ({ ...x, ...parsePayload(x.payload) })) });
  } catch {
    return json({ ok: false, error: 'Không thể tải dữ liệu quản trị.', code: 'ADMIN_RECORDS_READ_FAILED' }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    await ensure(context);
    const b = await context.request.json().catch(() => ({}));
    const requiredCap = ['email-templates', 'integrations', 'redirects'].includes(b?.kind) ? 'settings.manage' : 'records.manage';
    const denied = await requireAdminToken(context, requiredCap);
    if (denied) return denied;
    if (!b?.id || !b?.kind || !b?.title) return json({ ok: false, error: 'Thiếu dữ liệu bắt buộc.' }, { status: 400 });
    if (b.kind === 'logs') return json({ ok: false, error: 'Nhật ký được hệ thống tự ghi và không thể tạo thủ công.' }, { status: 400 });
    const old = await context.env.DB.prepare('SELECT id FROM website_admin_records WHERE id=? LIMIT 1').bind(b.id).first();
    const { id, kind, title, ...payload } = b;
    await context.env.DB.prepare(
      "INSERT INTO website_admin_records(id,kind,title,payload,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,title=excluded.title,payload=excluded.payload,updated_at=CURRENT_TIMESTAMP"
    ).bind(id, kind, title, JSON.stringify(payload)).run();
    await audit(context, old ? 'Cập nhật bản ghi' : 'Tạo bản ghi', { id, kind, title });
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'Không thể lưu dữ liệu quản trị.', code: 'ADMIN_RECORDS_WRITE_FAILED' }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    await ensure(context);
    const b = await context.request.json().catch(() => ({}));
    const old = await context.env.DB.prepare('SELECT id,kind,title FROM website_admin_records WHERE id=? LIMIT 1').bind(b?.id || '').first();
    const requiredCap = ['email-templates', 'integrations', 'redirects'].includes(old?.kind) ? 'settings.manage' : 'records.manage';
    const denied = await requireAdminToken(context, requiredCap);
    if (denied) return denied;
    if (old) {
      await context.env.DB.prepare('DELETE FROM website_admin_records WHERE id=?').bind(old.id).run();
      await audit(context, 'Xóa bản ghi', old);
    }
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'Không thể xóa dữ liệu quản trị.', code: 'ADMIN_RECORDS_DELETE_FAILED' }, { status: 500 });
  }
}
