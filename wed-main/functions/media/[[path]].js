export async function onRequestGet(context) {
  if (!context.env.MEDIA) return new Response('Media unavailable', { status: 503 });
  const path = Array.isArray(context.params.path) ? context.params.path.join('/') : String(context.params.path || '');
  if (!path || path.includes('..') || (!path.startsWith('website/') && !path.startsWith('form-submissions/'))) {
    return new Response('Not found', { status: 404 });
  }
  const object = await context.env.MEDIA.get(path);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (object.httpEtag) headers.set('etag', object.httpEtag);
  headers.set('cache-control', path.startsWith('form-submissions/') ? 'private, max-age=3600' : 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  if (object.httpMetadata?.contentType === 'image/svg+xml') {
    headers.set('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }
  if (object.httpMetadata?.contentType === 'application/pdf') {
    headers.set('content-disposition', 'inline');
  }
  if (object.httpEtag && context.request.headers.get('if-none-match') === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
}

export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, { status: response.status, headers: response.headers });
}
