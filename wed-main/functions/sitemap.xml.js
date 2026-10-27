function xml(v = '') {
  return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}
function slug(v = '') {
  return String(v).trim().replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+|\/+$/g, '').split('/').pop()?.replace(/[^a-zA-Z0-9\-_À-ỹ]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || '';
}
function url(origin, path, lastmod) {
  return `<url><loc>${xml(origin + path)}</loc>${lastmod ? `<lastmod>${xml(String(lastmod).slice(0, 10))}</lastmod>` : ''}</url>`;
}
const PRIVATE_SLUGS = new Set(['admin', 'certificate', 'sponsor', 'login', 'api', 'media']);

export async function onRequestGet(context) {
  try {
    const origin = String(context.env.APP_URL || new URL(context.request.url).origin).replace(/\/$/, '');
    const base = ['/', '/about', '/du-an', '/units', '/tin-tuc', '/join', '/contact', '/su-kien', '/co-hoi', '/con-nguoi', '/tai-lieu-cong-khai'];
    const urls = base.map(p => url(origin, p));
    if (context.env.DB) {
      const r = await context.env.DB.prepare(
        "SELECT collection_name,doc_id,data_json,updated_at FROM website_cms_documents WHERE is_published=1 AND collection_name IN ('custom_pages','programs','news_articles') ORDER BY updated_at DESC LIMIT 3000"
      ).all();
      for (const row of r.results || []) {
        let d = {};
        try { d = JSON.parse(row.data_json || '{}'); } catch {}
        if (d.noIndex === true || d.isPublished === false) continue;
        const s = slug(d.slug || row.doc_id);
        if (!s || PRIVATE_SLUGS.has(s.toLowerCase())) continue;
        let path = '';
        if (row.collection_name === 'custom_pages') path = '/' + s;
        else if (row.collection_name === 'programs') path = '/du-an/' + s;
        else if (row.collection_name === 'news_articles') path = '/tin-tuc/' + s;
        if (path && !base.includes(path)) urls.push(url(origin, path, d.updatedAt || row.updated_at));
      }
    }
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].join('\n')}\n</urlset>`, {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: { 'content-type': 'application/xml; charset=utf-8' },
      status: 200,
    });
  }
}
