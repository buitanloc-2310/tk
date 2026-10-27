import { requireAdminToken, json } from '../../_auth.js';

const validKey = key => typeof key === 'string' && key.startsWith('website/') && !key.includes('..') && key.length < 1024;

async function metadataSchema(context) {
  await context.env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS website_media_metadata(key TEXT PRIMARY KEY,alt TEXT NOT NULL DEFAULT '',caption TEXT NOT NULL DEFAULT '',credit TEXT NOT NULL DEFAULT '',source_url TEXT NOT NULL DEFAULT '',focal_x REAL NOT NULL DEFAULT 50,focal_y REAL NOT NULL DEFAULT 50,display_mode TEXT NOT NULL DEFAULT 'original',updated_at TEXT NOT NULL)"
  ).run();
  const columns = await context.env.DB.prepare('PRAGMA table_info(website_media_metadata)').all();
  const names = new Set((columns.results || []).map(x => x.name));
  const wanted = [
    ['credit', "TEXT NOT NULL DEFAULT ''"],
    ['source_url', "TEXT NOT NULL DEFAULT ''"],
    ['focal_x', 'REAL NOT NULL DEFAULT 50'],
    ['focal_y', 'REAL NOT NULL DEFAULT 50'],
    ['display_mode', "TEXT NOT NULL DEFAULT 'original'"],
  ];
  for (const [name, type] of wanted) {
    if (!names.has(name)) await context.env.DB.prepare(`ALTER TABLE website_media_metadata ADD COLUMN ${name} ${type}`).run();
  }
}

export async function onRequestGet(context) {
  const denied = await requireAdminToken(context, 'media.manage');
  if (denied) return denied;
  if (!context.env.MEDIA) return json({ ok: false, error: 'Kho tệp chưa sẵn sàng.' }, { status: 503 });
  try {
    await metadataSchema(context);
    const url = new URL(context.request.url);
    const listed = await context.env.MEDIA.list({
      prefix: 'website/',
      limit: 100,
      cursor: url.searchParams.get('cursor') || undefined,
      include: ['httpMetadata', 'customMetadata'],
    });
    let metadata = new Map();
    if (listed.objects.length) {
      const rows = await context.env.DB.prepare(
        `SELECT key,alt,caption,credit,source_url,focal_x,focal_y,display_mode FROM website_media_metadata WHERE key IN (${listed.objects.map(() => '?').join(',')})`
      ).bind(...listed.objects.map(o => o.key)).all();
      metadata = new Map((rows.results || []).map(row => [row.key, row]));
    }
    return json({
      ok: true,
      items: listed.objects.map(o => ({
        key: o.key,
        url: `/media/${o.key}`,
        size: o.size,
        uploaded: o.uploaded,
        type: o.httpMetadata?.contentType || '',
        name: o.customMetadata?.originalName || o.key.split('/').pop(),
        alt: metadata.get(o.key)?.alt || '',
        caption: metadata.get(o.key)?.caption || '',
        credit: metadata.get(o.key)?.credit || '',
        sourceUrl: metadata.get(o.key)?.source_url || '',
        focalX: Number(metadata.get(o.key)?.focal_x ?? 50),
        focalY: Number(metadata.get(o.key)?.focal_y ?? 50),
        displayMode: ['original', 'contain', 'cover'].includes(metadata.get(o.key)?.display_mode) ? metadata.get(o.key)?.display_mode : 'original',
      })),
      cursor: listed.truncated ? listed.cursor : null,
    });
  } catch (error) {
    console.error('Media list failed', error);
    return json({ ok: false, error: 'Không thể tải thư viện.' }, { status: 500 });
  }
}

export async function onRequestPatch(context) {
  const denied = await requireAdminToken(context, 'media.manage');
  if (denied) return denied;
  if (!context.env.MEDIA) return json({ ok: false, error: 'Kho tệp chưa sẵn sàng.' }, { status: 503 });
  try {
    const b = await context.request.json();
    if (!validKey(b.key)) return json({ ok: false, error: 'Tệp không hợp lệ.' }, { status: 400 });
    if (!(await context.env.MEDIA.head(b.key))) return json({ ok: false, error: 'Tệp không tồn tại.' }, { status: 404 });
    await metadataSchema(context);
    const fx = Math.min(100, Math.max(0, Number(b.focalX ?? 50) || 50));
    const fy = Math.min(100, Math.max(0, Number(b.focalY ?? 50) || 50));
    const displayMode = ['original', 'contain', 'cover'].includes(String(b.displayMode || '')) ? String(b.displayMode) : 'original';
    await context.env.DB.prepare(
      'INSERT INTO website_media_metadata(key,alt,caption,credit,source_url,focal_x,focal_y,display_mode,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET alt=excluded.alt,caption=excluded.caption,credit=excluded.credit,source_url=excluded.source_url,focal_x=excluded.focal_x,focal_y=excluded.focal_y,display_mode=excluded.display_mode,updated_at=excluded.updated_at'
    ).bind(
      b.key,
      String(b.alt || '').trim().slice(0, 500),
      String(b.caption || '').trim().slice(0, 2000),
      String(b.credit || '').trim().slice(0, 500),
      String(b.sourceUrl || '').trim().slice(0, 2000),
      fx,
      fy,
      displayMode,
      new Date().toISOString()
    ).run();
    return json({ ok: true });
  } catch (error) {
    console.error('Media metadata save failed', error);
    return json({ ok: false, error: 'Không lưu được thông tin tệp.' }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const denied = await requireAdminToken(context, 'media.manage');
  if (denied) return denied;
  if (!context.env.MEDIA) return json({ ok: false, error: 'Kho tệp chưa sẵn sàng.' }, { status: 503 });
  try {
    const { key } = await context.request.json();
    if (!validKey(key)) return json({ ok: false, error: 'Tệp không hợp lệ.' }, { status: 400 });
    const table = await context.env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='website_cms_documents'").first();
    if (table) {
      const used = await context.env.DB.prepare('SELECT doc_id FROM website_cms_documents WHERE instr(data_json,?)>0 LIMIT 1').bind(key).first();
      if (used) return json({ ok: false, error: 'Tệp đang được dùng trong nội dung website. Gỡ hoặc thay ảnh ở các trang trước khi xóa.' }, { status: 409 });
    }
    await context.env.MEDIA.delete(key);
    await metadataSchema(context);
    await context.env.DB.prepare('DELETE FROM website_media_metadata WHERE key=?').bind(key).run();
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'Không thể xóa tệp.' }, { status: 500 });
  }
}
