import { requireAdminToken, json } from '../../_auth.js';

function clean(v, max) { return String(v || '').trim().slice(0, max); }

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const admin = url.searchParams.get('admin') === '1';
  if (admin) {
    const denied = await requireAdminToken(context); if (denied) return denied;
    const rows = await context.env.DB.prepare('SELECT id, article_id, name, email, content, status, created_at FROM website_comments ORDER BY created_at DESC LIMIT 300').all();
    return json({ ok: true, items: rows.results || [] });
  }
  const articleId = clean(url.searchParams.get('articleId'), 160);
  if (!articleId) return json({ ok: false, error: 'Thiếu articleId.' }, { status: 400 });
  const rows = await context.env.DB.prepare("SELECT id, article_id, name, content, created_at FROM website_comments WHERE article_id = ? AND status = 'approved' ORDER BY created_at ASC LIMIT 200").bind(articleId).all();
  return json({ ok: true, items: rows.results || [] });
}

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const articleId = clean(body.articleId, 160), name = clean(body.name, 80), email = clean(body.email, 160), content = clean(body.content, 2000);
  if (!articleId || !name || !content) return json({ ok: false, error: 'Vui lòng nhập đầy đủ họ tên và nội dung bình luận.' }, { status: 400 });
  const id = crypto.randomUUID();
  await context.env.DB.prepare("INSERT INTO website_comments (id, article_id, name, email, content, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))").bind(id, articleId, name, email, content).run();
  return json({ ok: true, message: 'Bình luận đã được gửi và đang chờ duyệt.' });
}

export async function onRequestPatch(context) {
  const denied = await requireAdminToken(context); if (denied) return denied;
  const body = await context.request.json().catch(() => ({}));
  const id = clean(body.id, 80), status = clean(body.status, 20);
  if (!id || !['pending','approved','hidden'].includes(status)) return json({ ok: false, error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  await context.env.DB.prepare('UPDATE website_comments SET status = ? WHERE id = ?').bind(status, id).run();
  return json({ ok: true });
}

export async function onRequestDelete(context) {
  const denied = await requireAdminToken(context); if (denied) return denied;
  const body = await context.request.json().catch(() => ({}));
  const id = clean(body.id, 80); if (!id) return json({ ok: false, error: 'Thiếu id.' }, { status: 400 });
  await context.env.DB.prepare('DELETE FROM website_comments WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
