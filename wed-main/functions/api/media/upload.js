import { requireAdminToken, json } from '../../_auth.js';

const MAX_BYTES = 20 * 1024 * 1024;
const extensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

export function validFileBytes(bytes, type) {
  const text = new TextDecoder().decode(bytes.slice(0, 256));
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
  if (type === 'image/webp') return text.slice(0, 4) === 'RIFF' && text.slice(8, 12) === 'WEBP';
  if (type === 'image/gif') return /^GIF8[79]a/.test(text);
  if (type === 'image/avif') return text.slice(4, 8) === 'ftyp' && /avif|avis/.test(text.slice(8, 64));
  if (type === 'application/pdf') return text.startsWith('%PDF-');
  if (type === 'image/svg+xml') {
    const svg = new TextDecoder().decode(bytes);
    return /<svg[\s>]/i.test(svg) && !/<\s*(?:script|foreignObject|iframe|object|embed|style|a)(?:\s|>)/i.test(svg) && !/(?:\son\w+\s*=|javascript\s*:|data\s*:|<!ENTITY|url\s*\(|(?:href|src)\s*=\s*['"]\s*(?!#))/i.test(svg);
  }
  return false;
}

function safeName(name, type) {
  const base = name.replace(/\.[^.]*$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'media';
  return base.slice(0, 70) + '.' + extensions[type];
}

export async function onRequestPost(context) {
  const denied = await requireAdminToken(context, 'media.manage');
  if (denied) return denied;
  if (!context.env.MEDIA) return json({ ok: false, error: 'Kho tệp chưa sẵn sàng. Kiểm tra binding MEDIA.' }, { status: 503 });
  try {
    const form = await context.request.formData();
    const file = form.get('file');
    if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
      return json({ ok: false, error: 'Chưa chọn tệp.' }, { status: 400 });
    }
    const mimeType = String(file.type || '');
    const fileName = String(file.name || 'upload.bin');
    if (!extensions[mimeType]) return json({ ok: false, error: 'Hỗ trợ JPG, PNG, WebP, GIF, AVIF, SVG hoặc PDF.' }, { status: 400 });
    if (!file.size || file.size > MAX_BYTES) return json({ ok: false, error: 'Mỗi tệp phải có dữ liệu và không vượt quá 20 MB.' }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validFileBytes(bytes, mimeType)) return json({ ok: false, error: 'Nội dung tệp không khớp định dạng hoặc SVG chứa nội dung không an toàn.' }, { status: 400 });
    const now = new Date();
    const key = `website/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}-${safeName(fileName, mimeType)}`;
    await context.env.MEDIA.put(key, bytes, {
      httpMetadata: { contentType: mimeType, cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { originalName: fileName.slice(0, 255), uploadedAt: now.toISOString() },
    });
    return json({ ok: true, key, url: `/media/${key}`, name: fileName, size: file.size, type: mimeType, uploaded: now.toISOString() });
  } catch (error) {
    console.error('Media upload failed', error);
    return json({ ok: false, error: 'Không thể lưu tệp. Vui lòng thử lại.' }, { status: 500 });
  }
}
