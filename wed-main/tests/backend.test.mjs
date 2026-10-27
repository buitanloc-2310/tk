import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.File) {
  globalThis.File = class File extends Blob {
    constructor(parts, name, options = {}) {
      super(parts, options);
      this.name = String(name || '');
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');

class PythonSqliteBridge {
  constructor() {
    this.proc = spawn('python3', ['-u', '-c', `
import sys, json, sqlite3
conn = sqlite3.connect(':memory:', isolation_level=None)
conn.row_factory = sqlite3.Row
for line in sys.stdin:
    if not line.strip(): continue
    req = json.loads(line)
    cmd = req.get('cmd')
    sql = req.get('sql', '')
    args = req.get('args', [])
    try:
        if cmd == 'exec':
            conn.executescript(sql)
            print(json.dumps({'ok': True}), flush=True)
        elif cmd == 'run':
            cur = conn.execute(sql, args)
            print(json.dumps({'ok': True, 'changes': cur.rowcount, 'lastInsertRowid': cur.lastrowid}), flush=True)
        elif cmd == 'first':
            cur = conn.execute(sql, args)
            row = cur.fetchone()
            print(json.dumps({'ok': True, 'row': dict(row) if row else None}), flush=True)
        elif cmd == 'all':
            cur = conn.execute(sql, args)
            rows = [dict(r) for r in cur.fetchall()]
            print(json.dumps({'ok': True, 'rows': rows}), flush=True)
    except Exception as e:
        print(json.dumps({'ok': False, 'error': str(e)}), flush=True)
`]);
    this.queue = [];
    this.buffer = '';
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk;
      let idx;
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 1);
        const waiter = this.queue.shift();
        if (waiter) {
          const parsed = JSON.parse(line);
          if (parsed.ok) waiter.resolve(parsed);
          else waiter.reject(new Error(parsed.error || 'SQLite error'));
        }
      }
    });
  }

  send(payload) {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.proc.stdin.write(JSON.stringify(payload) + '\n');
    });
  }

  async exec(sql) {
    await this.send({ cmd: 'exec', sql });
  }

  prepare(sql) {
    const self = this;
    let boundArgs = [];
    return {
      bind(...args) {
        boundArgs = args.map(a => (a === undefined ? null : a));
        return this;
      },
      async run() {
        const res = await self.send({ cmd: 'run', sql, args: boundArgs });
        return { success: true, meta: { changes: res.changes, last_row_id: res.lastInsertRowid } };
      },
      async first() {
        const res = await self.send({ cmd: 'first', sql, args: boundArgs });
        return res.row || null;
      },
      async all() {
        const res = await self.send({ cmd: 'all', sql, args: boundArgs });
        return { results: res.rows || [] };
      },
    };
  }

  close() {
    try { this.proc.kill(); } catch {}
  }
}

export async function createFixture() {
  let sqlite;
  try {
    const mod = await import('node:sqlite');
    const db = new mod.DatabaseSync(':memory:');
    sqlite = {
      async exec(sql) { db.exec(sql); },
      prepare(sql) {
        let args = [];
        return {
          bind(...a) { args = a.map(x => (x === undefined ? null : x)); return this; },
          async run() { return { success: true, meta: db.prepare(sql).run(...args) }; },
          async first() { return db.prepare(sql).get(...args) || null; },
          async all() { return { results: db.prepare(sql).all(...args) }; },
        };
      },
      close() { db.close(); },
    };
  } catch {
    sqlite = new PythonSqliteBridge();
  }

  for (const name of ['0001_initial_schema.sql', '0002_system_automation_analytics.sql']) {
    await sqlite.exec(await readFile(root + '/migrations/' + name, 'utf8'));
  }

  const DB = {
    prepare(sql) { return sqlite.prepare(sql); },
    async batch(qs) {
      await sqlite.prepare('BEGIN').run();
      try {
        const out = [];
        for (const q of qs) out.push(await q.run());
        await sqlite.prepare('COMMIT').run();
        return out;
      } catch (e) {
        try { await sqlite.prepare('ROLLBACK').run(); } catch {}
        throw e;
      }
    },
  };

  const objects = new Map();
  const MEDIA = {
    async put(key, body, options) {
      const bytes = body instanceof Uint8Array ? body : new Uint8Array(await new Response(body).arrayBuffer());
      objects.set(key, { key, bytes, ...options, uploaded: new Date().toISOString(), size: bytes.length, httpEtag: '"' + key + '"' });
    },
    async list({ prefix = '', cursor, limit = 100 } = {}) {
      const all = [...objects.values()]
        .filter(x => !prefix || x.key.startsWith(prefix))
        .sort((a, b) => a.key.localeCompare(b.key));
      const index = Number(cursor || 0);
      const slice = all.slice(index, index + limit);
      return { objects: slice, truncated: all.length > index + limit, cursor: String(index + limit) };
    },
    async get(key) {
      const o = objects.get(key);
      return o
        ? {
            ...o,
            body: o.bytes,
            writeHttpMetadata(headers) {
              if (o.httpMetadata?.contentType) headers.set('content-type', o.httpMetadata.contentType);
            },
          }
        : null;
    },
    async head(key) {
      return objects.get(key) || null;
    },
    async delete(key) {
      objects.delete(key);
    },
  };

  let emailMode = 'success';
  const sentEmails = [];

  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const urlStr = String(url);
    if (urlStr.includes('identitytoolkit.googleapis.com')) {
      const token = JSON.parse(init?.body || '{}').idToken;
      if (token === 'qa-owner-token') return Response.json({ users: [{ localId: 'qa-owner', email: 'skyfirst.ec@gmail.com' }] });
      if (token === 'qa-editor-token') return Response.json({ users: [{ localId: 'qa-editor', email: 'editor@skyfirst.io.vn' }] });
      if (token === 'qa-admin-token') return Response.json({ users: [{ localId: 'qa-admin', email: 'admin@skyfirst.io.vn' }] });
      return Response.json({ error: { message: 'INVALID_ID_TOKEN' } }, { status: 400 });
    }
    if (urlStr.includes('api.resend.com/emails')) {
      const payload = JSON.parse(init?.body || '{}');
      if (emailMode === 'temp_error') {
        return Response.json({ message: 'Temporary provider outage' }, { status: 503 });
      }
      if (emailMode === 'perm_error') {
        return Response.json({ message: 'Invalid recipient domain' }, { status: 422 });
      }
      const id = `re_${Date.now()}_${sentEmails.length + 1}`;
      sentEmails.push({ id, ...payload });
      return Response.json({ id }, { status: 200 });
    }
    return nativeFetch(url, init);
  };

  await DB.prepare("INSERT INTO website_admin_users(uid,email,name,role,status,is_root_owner,permissions_json,note) VALUES('qa-owner','skyfirst.ec@gmail.com','QA Owner','developer','active',1,'[]','test fixture')").run();
  await DB.prepare("INSERT INTO website_admin_users(uid,email,name,role,status,is_root_owner,permissions_json,note) VALUES('qa-admin','admin@skyfirst.io.vn','QA Admin','admin','active',0,'[]','test admin')").run();
  await DB.prepare("INSERT INTO website_admin_users(uid,email,name,role,status,is_root_owner,permissions_json,note) VALUES('qa-editor','editor@skyfirst.io.vn','QA Editor','editor','active',0,'[]','test editor')").run();

  return {
    env: { DB, MEDIA, RESEND_API_KEY: 're_test_mock_key', MAIL_FROM: 'Sky First Network <support@skyfirst.io.vn>' },
    objects,
    sqlite,
    sentEmails,
    setEmailMode(m) { emailMode = m; },
    close() {
      globalThis.fetch = nativeFetch;
      sqlite.close();
    },
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import * as cms from '../functions/api/cms.js';
import * as upload from '../functions/api/media/upload.js';
import * as media from '../functions/api/media/index.js';
import * as serve from '../functions/media/[[path]].js';
import * as contact from '../functions/api/contact/index.js';
import * as comments from '../functions/api/comments/index.js';
import * as registrations from '../functions/api/registrations/index.js';
import * as forms from '../functions/api/forms/index.js';
import * as system from '../functions/api/system.js';
import * as sitemap from '../functions/sitemap.xml.js';

test('Sky First Network — Comprehensive Backend, CMS, Forms, Email, Automation & Security Suite', async t => {
  const f = await createFixture();
  t.after(() => f.close());

  const call = async (module, method, path, body, token, extraHeaders = {}) => {
    const headers = new Headers(extraHeaders);
    if (token) headers.set('authorization', 'Bearer ' + token);
    const init = { method, headers };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) {
      headers.set('content-type', 'application/json');
      init.body = JSON.stringify(body);
    }
    const response = await module['onRequest' + method[0] + method.slice(1).toLowerCase()]({
      env: f.env,
      request: new Request('https://test.invalid' + path, init),
      data: {},
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    return { status: response.status, data, headers: response.headers };
  };

  const owner = 'qa-owner-token';
  const admin = 'qa-admin-token';
  const editor = 'qa-editor-token';

  await t.test('1. Authentication & RBAC: unauthorized and under-privileged callers are blocked', async () => {
    assert.equal((await call(media, 'GET', '/api/media')).status, 401);
    assert.equal((await call(media, 'GET', '/api/media', undefined, 'invalid')).status, 401);
    assert.equal((await call(cms, 'PUT', '/api/cms', { collection: 'site_config', id: 'current', data: {} })).status, 401);
    // Editor cannot modify global site_config or publish articles directly
    assert.equal((await call(cms, 'PUT', '/api/cms', { collection: 'site_config', id: 'current', data: { siteName: 'Hack' } }, editor)).status, 403);
    assert.equal((await call(cms, 'PUT', '/api/cms', { collection: 'news_articles', id: 'ed-pub', data: { title: 'Test', isPublished: true } }, editor)).status, 403);
    // Editor CAN save draft articles
    assert.equal((await call(cms, 'PUT', '/api/cms', { collection: 'news_articles', id: 'ed-draft', data: { title: 'Draft by Editor', isPublished: false } }, editor)).status, 200);
    // Editor cannot manage forms or system backups
    assert.equal((await call(forms, 'POST', '/api/forms?admin=1', { title: 'F', slug: 'f' }, editor)).status, 403);
    assert.equal((await call(system, 'POST', '/api/system?action=backup-create', {}, editor)).status, 403);
  });

  await t.test('2. Configuration persistence, revision tracking & rollback', async () => {
    const save1 = await call(cms, 'PUT', '/api/cms', { collection: 'site_config', id: 'current', data: { siteName: 'Sky First v1', hotline: '0924 910 210' } }, admin);
    assert.equal(save1.status, 200);
    const save2 = await call(cms, 'PUT', '/api/cms', { collection: 'site_config', id: 'current', data: { siteName: 'Sky First v2', hotline: '0900 111 222' } }, admin);
    assert.equal(save2.status, 200);
    const read2 = await call(cms, 'GET', '/api/cms?collection=site_config&id=current');
    assert.equal(read2.data.item.siteName, 'Sky First v2');

    // Verify revision was recorded before v2 overwrite and restore it
    const revs = await call(system, 'GET', '/api/system?action=revisions&entityType=cms:site_config&entityId=current', undefined, admin);
    assert.ok(revs.data.items.length >= 1);
    const restore = await call(system, 'POST', '/api/system?action=restore-revision', { revisionId: revs.data.items[0].id }, admin);
    assert.equal(restore.status, 200);
    const readRestored = await call(cms, 'GET', '/api/cms?collection=site_config&id=current');
    assert.equal(readRestored.data.item.siteName, 'Sky First v1');
  });

  await t.test('3. Drafts, canonical IDs, deletion, scheduled publishing & sitemap privacy', async () => {
    assert.equal((await call(cms, 'PUT', '/api/cms', { collection: 'news_articles', id: 'test-news', data: { id: 'different', isPublished: false, title: 'Test Draft' } }, owner)).data.item.id, 'test-news');
    assert.equal((await call(cms, 'GET', '/api/cms?collection=news_articles')).data.items.length, 0);
    assert.ok((await call(cms, 'GET', '/api/cms?collection=news_articles')).data.excludedIds.includes('test-news'));

    // Sitemap must NOT include draft or noIndex pages
    await call(cms, 'PUT', '/api/cms', { collection: 'custom_pages', id: 'private-page', data: { slug: 'trang-noi-bo-bi-mat', title: 'Private', isPublished: true, noIndex: true } }, owner);
    await call(cms, 'PUT', '/api/cms', { collection: 'custom_pages', id: 'public-page', data: { slug: 'trang-cong-khai-hop-le', title: 'Public', isPublished: true, noIndex: false } }, owner);
    const sm = await call(sitemap, 'GET', '/sitemap.xml');
    assert.equal(sm.status, 200);
    assert.ok(sm.data.includes('/trang-cong-khai-hop-le'));
    assert.ok(!sm.data.includes('/trang-noi-bo-bi-mat'));
    assert.ok(!sm.data.includes('/admin'));
    assert.ok(!sm.data.includes('test-news'));

    // Scheduled publication past due automatically publishes
    const pastIso = new Date(Date.now() - 60000).toISOString();
    await call(cms, 'PUT', '/api/cms', { collection: 'news_articles', id: 'sched-news', data: { slug: 'tin-hen-gio', title: 'Scheduled News', isPublished: false, scheduledPublishAt: pastIso } }, owner);
    const pubList = await call(cms, 'GET', '/api/cms?collection=news_articles');
    assert.ok(pubList.data.items.some(x => x.id === 'sched-news' && x.isPublished === true));
  });

  let item;
  const bytes = await readFile(new URL('../public/brand/sky-first-network-web.png', import.meta.url));
  await t.test('4. Real media upload, MIME signature validation, active SVG protection & referenced-file lock', async () => {
    for (const [name, type, data, status] of [
      ['logo.png', 'image/png', bytes, 200],
      ['fake.png', 'image/png', 'not an image', 400],
      ['unsafe.svg', 'image/svg+xml', '<svg><script>alert(1)</script></svg>', 400],
      ['empty.png', 'image/png', '', 400],
    ]) {
      const form = new FormData();
      form.set('file', new File([data], name, { type }));
      const result = await call(upload, 'POST', '/api/media/upload', form, owner);
      assert.equal(result.status, status);
      if (status === 200) item = result.data;
    }
    assert.equal(f.objects.get(item.key).bytes.length, bytes.length);
    const request = new Request('https://test.invalid' + item.url);
    const response = await serve.onRequestGet({ env: f.env, request, params: { path: item.key.split('/') } });
    assert.equal(response.status, 200);
    assert.equal((await response.arrayBuffer()).byteLength, bytes.length);

    assert.equal((await call(media, 'PATCH', '/api/media', { key: item.key, alt: 'Logo alt', caption: 'Caption', displayMode: 'original' }, owner)).status, 200);
    await call(cms, 'PUT', '/api/cms', { collection: 'site_config', id: 'current', data: { heroImageUrl: item.url } }, owner);
    // Referenced file cannot be deleted
    assert.equal((await call(media, 'DELETE', '/api/media', { key: item.key }, owner)).status, 409);
  });

  await t.test('5. Independent Program Forms A & B, isolation, field snapshot preservation & duplicate guard', async () => {
    // Create Program A Form and Program B Form independently
    const formA = await call(forms, 'POST', '/api/forms?admin=1', {
      id: 'form-prog-a',
      slug: 'form-chuong-trinh-a',
      title: 'Biểu mẫu Chương trình A',
      programId: 'prog-a',
      status: 'open',
      fields: [
        { id: 'full_name', type: 'text', label: 'Họ và tên ứng viên A', required: true },
        { id: 'email', type: 'email', label: 'Email liên hệ A', required: true },
        { id: 'english_level', type: 'select', label: 'Trình độ Tiếng Anh', required: true, options: ['A2', 'B1', 'B2'] },
        { id: 'consent', type: 'consent', label: 'Cam kết A', required: true },
      ],
      settings: { confirmationMessage: 'Đã nhận đơn A' },
    }, admin);
    assert.equal(formA.status, 200);

    const formB = await call(forms, 'POST', '/api/forms?admin=1', {
      id: 'form-prog-b',
      slug: 'form-chuong-trinh-b',
      title: 'Biểu mẫu Chương trình B',
      programId: 'prog-b',
      status: 'open',
      fields: [
        { id: 'full_name', type: 'text', label: 'Họ tên TNV B', required: true },
        { id: 'email', type: 'email', label: 'Email TNV B', required: true },
        { id: 'birth_year', type: 'birth_year', label: 'Năm sinh', required: true },
        { id: 'consent', type: 'consent', label: 'Cam kết B', required: true },
      ],
      settings: { confirmationMessage: 'Đã nhận đơn B' },
    }, admin);
    assert.equal(formB.status, 200);

    // Submit to Form A
    const subA = await call(forms, 'POST', '/api/forms', {
      formId: 'form-prog-a',
      programId: 'prog-a',
      answers: { full_name: 'Nguyễn Văn A', email: 'vana@example.com', english_level: 'B2', consent: true },
    });
    assert.equal(subA.status, 200);
    assert.ok(subA.data.applicationCode.startsWith('SFN-'));

    // Duplicate email within 5 minutes is blocked
    const dupA = await call(forms, 'POST', '/api/forms', {
      formId: 'form-prog-a',
      programId: 'prog-a',
      answers: { full_name: 'Nguyễn Văn A', email: 'vana@example.com', english_level: 'B2', consent: true },
    });
    assert.equal(dupA.status, 409);

    // Submit to Form B
    const subB = await call(forms, 'POST', '/api/forms', {
      formId: 'form-prog-b',
      programId: 'prog-b',
      answers: { full_name: 'Trần Thị B', email: 'thib@example.com', birth_year: '2003', consent: true },
    });
    assert.equal(subB.status, 200);

    // Modify Form A structure (rename & remove english_level, add new field) -> must NOT affect Form B or corrupt Submission A's historical field snapshot
    await call(forms, 'POST', '/api/forms?admin=1', {
      id: 'form-prog-a',
      slug: 'form-chuong-trinh-a',
      title: 'Biểu mẫu Chương trình A (Đã cập nhật v2)',
      programId: 'prog-a',
      status: 'open',
      fields: [
        { id: 'full_name', type: 'text', label: 'Họ và tên mới', required: true },
        { id: 'email', type: 'email', label: 'Email mới', required: true },
        { id: 'portfolio', type: 'url', label: 'Link Portfolio mới', required: false },
        { id: 'consent', type: 'consent', label: 'Cam kết A', required: true },
      ],
      settings: { confirmationMessage: 'Đã nhận đơn A v2' },
    }, admin);

    const checkB = await call(forms, 'GET', '/api/forms?slug=form-chuong-trinh-b');
    assert.equal(checkB.data.item.title, 'Biểu mẫu Chương trình B');
    assert.equal(checkB.data.item.fields[2].id, 'birth_year');

    const listSubA = await call(forms, 'GET', '/api/forms?admin=1&submissions=1&formId=form-prog-a', undefined, admin);
    assert.equal(listSubA.data.items.length, 1);
    assert.equal(listSubA.data.items[0].answers.english_level, 'B2');
    // Historical snapshot still remembers 'Trình độ Tiếng Anh'
    assert.ok(listSubA.data.items[0].fieldSnapshot.some(f => f.id === 'english_level' && f.label === 'Trình độ Tiếng Anh'));
  });

  await t.test('6. Email system: template preview, variable sanitization, test email status, temp error backoff & no infinite loop', async () => {
    // Preview with invalid variable {{secret_token}} -> stripped safely without sending real email
    const emailCountBefore = f.sentEmails.length;
    const prev = await call(system, 'POST', '/api/system?action=email-preview', {
      subject: 'Chào {{ho_ten}} - {{unknown_var}}',
      body: 'Mã hồ sơ: {{ma_ho_so}} | Bí mật: {{secret_api_key}}',
    }, admin);
    assert.equal(prev.status, 200);
    assert.equal(f.sentEmails.length, emailCountBefore); // Preview never sends real email
    assert.ok(!prev.data.renderedSubject.includes('unknown_var'));
    assert.ok(!prev.data.renderedBody.includes('secret_api_key'));

    // Test email when provider succeeds
    f.setEmailMode('success');
    const testOk = await call(system, 'POST', '/api/system?action=email-test', {
      recipient: 'audit@skyfirst.io.vn',
    }, admin);
    assert.equal(testOk.status, 200);
    assert.equal(testOk.data.deliveryStatus, 'accepted_by_provider');

    // Test email when provider has temporary outage -> schedules retry, caps at max_attempts (3)
    f.setEmailMode('temp_error');
    const testFail = await call(system, 'POST', '/api/system?action=email-test', {
      recipient: 'retry@skyfirst.io.vn',
    }, admin);
    assert.equal(testFail.status, 200);
    assert.equal(testFail.data.deliveryStatus, 'retry_scheduled');
    const outboxId = testFail.data.outboxId;

    // Attempt 2
    const retry2 = await call(system, 'POST', '/api/system?action=email-retry', { id: outboxId }, admin);
    assert.equal(retry2.data.status, 'retry_scheduled');
    // Attempt 3 (reaches max_attempts = 3 -> perm_failed)
    const retry3 = await call(system, 'POST', '/api/system?action=email-retry', { id: outboxId }, admin);
    assert.equal(retry3.data.status, 'perm_failed');
    // Attempt 4 is refused without infinite loop
    const retry4 = await call(system, 'POST', '/api/system?action=email-retry', { id: outboxId }, admin);
    assert.equal(retry4.status, 409);
    f.setEmailMode('success');
  });

  await t.test('7. Privacy-safe Analytics: bot filtering, automatic pageviews vs manual entries', async () => {
    // Bot User-Agent is ignored
    const botRes = await call(system, 'POST', '/api/system?action=pageview', { path: '/home', title: 'Trang chủ' }, undefined, { 'user-agent': 'Googlebot/2.1' });
    assert.equal(botRes.data.ignored, 'bot');

    // Real visitor pageview is recorded
    const humanRes = await call(system, 'POST', '/api/system?action=pageview', { path: '/tin-tuc/bai-viet-1', title: 'Bài viết 1', entityType: 'news', newSession: true }, undefined, { 'user-agent': 'Mozilla/5.0 Chrome/126.0' });
    assert.equal(humanRes.data.recorded, true);

    // Manual analytics entry with provenance
    const manualRes = await call(system, 'POST', '/api/system?action=analytics-manual', {
      metricDate: '2026-10-01',
      periodLabel: 'Tháng 10/2026',
      pageviews: 1250,
      visitorsEst: 480,
      sourceName: 'Cloudflare Web Analytics Export',
      note: 'Số liệu đối chiếu tháng 10',
    }, admin);
    assert.equal(manualRes.status, 200);

    const report = await call(system, 'GET', '/api/system?action=analytics&days=30', undefined, admin);
    assert.equal(report.status, 200);
    assert.equal(report.data.automatic.totalViews, 1);
    assert.equal(report.data.manual.totalViews, 1250);
  });

  await t.test('8. Verified Backup creation, checksum verification & safe dry-run/restore', async () => {
    const bk = await call(system, 'POST', '/api/system?action=backup-create', { label: 'Before Upgrade Backup' }, admin);
    assert.equal(bk.status, 200);
    assert.ok(bk.data.checksum.length >= 16);

    // Dry run verifies checksum without mutating
    const dry = await call(system, 'POST', '/api/system?action=backup-restore', { backupId: bk.data.id, dryRun: true }, admin);
    assert.equal(dry.status, 200);
    assert.equal(dry.data.integrityVerified, true);

    // Restore without confirmation token is rejected
    const noToken = await call(system, 'POST', '/api/system?action=backup-restore', { backupId: bk.data.id }, admin);
    assert.equal(noToken.status, 400);
  });

  await t.test('9. Contact, moderated comments & legacy program registration compatibility', async () => {
    assert.equal((await call(contact, 'POST', '/api/contact', { name: 'Test', email: 'test@example.invalid', message: 'Test contact' })).status, 200);
    assert.equal((await call(comments, 'POST', '/api/comments', { articleId: 'test-news', name: 'Test', content: 'Pending comment' })).status, 200);
    assert.equal((await call(comments, 'GET', '/api/comments?articleId=test-news')).data.items.length, 0);
    await call(cms, 'PUT', '/api/cms', { collection: 'programs', id: 'closed', data: { isPublished: true, registrationEnabled: false, title: 'Closed' } }, owner);
    const input = { programId: 'closed', programTitle: 'Closed', fullName: 'Test', email: 'test@example.invalid', phone: '0000000000', organization: 'Test', motivation: 'Test', consent: true };
    assert.equal((await call(registrations, 'POST', '/api/registrations', input)).status, 409);
  });

  await t.test('10. Form auto-close when closeAt expires & rejects late submissions', async () => {
    const expiredIso = new Date(Date.now() - 120000).toISOString();
    await call(forms, 'POST', '/api/forms?admin=1', {
      id: 'form-expired',
      slug: 'form-qua-han',
      title: 'Biểu mẫu Quá hạn',
      programId: 'prog-exp',
      status: 'open',
      fields: [
        { id: 'full_name', type: 'text', label: 'Họ tên', required: true },
        { id: 'email', type: 'email', label: 'Email', required: true },
      ],
      settings: { closeAt: expiredIso },
    }, admin);

    // Late submission is automatically rejected and form transitions to closed
    const lateSub = await call(forms, 'POST', '/api/forms', {
      formId: 'form-expired',
      answers: { full_name: 'Người nộp muộn', email: 'late@example.com' },
    });
    assert.ok([403, 409, 410].includes(lateSub.status));
  });

  await t.test('11. Idempotent Automation Runner (/api/system?action=run-automations)', async () => {
    const run1 = await call(system, 'POST', '/api/system?action=run-automations', {}, admin);
    assert.equal(run1.status, 200);
    assert.equal(run1.data.ok, true);
    // Running a second time immediately is idempotent and does not duplicate publishes
    const run2 = await call(system, 'POST', '/api/system?action=run-automations', {}, admin);
    assert.equal(run2.status, 200);
    assert.equal(run2.data.published.publishedCount, 0);
  });

  await t.test('12. System Health (/api/system?action=health) returns 4 standard status levels', async () => {
    const h = await call(system, 'GET', '/api/system?action=health', undefined, admin);
    assert.equal(h.status, 200);
    assert.equal(h.data.ok, true);
    assert.ok(Array.isArray(h.data.checks));
    const validStatuses = new Set(['normal', 'warning', 'error', 'unverifiable']);
    for (const c of h.data.checks) {
      assert.ok(validStatuses.has(c.status), `Invalid health status: ${c.status}`);
    }
  });

  await t.test('13. Form submission file upload & /media/form-submissions/* serving', async () => {
    await call(forms, 'POST', '/api/forms?admin=1', {
      id: 'form-prog-a',
      slug: 'form-chuong-trinh-a',
      title: 'Biểu mẫu Chương trình A (Có đính kèm)',
      programId: 'prog-a',
      status: 'open',
      fields: [
        { id: 'full_name', type: 'text', label: 'Họ và tên', required: true },
        { id: 'email', type: 'email', label: 'Email', required: true },
        { id: 'cv_file', type: 'file', label: 'CV đính kèm', required: false },
      ],
    }, admin);
    const fd = new FormData();
    fd.set('file', new File([bytes], 'cv-ung-vien.png', { type: 'image/png' }));
    const up = await call(forms, 'POST', '/api/forms?upload=1&formId=form-prog-a&fieldId=cv_file', fd);
    assert.equal(up.status, 200);
    assert.ok(up.data.url.startsWith('/media/form-submissions/'));
    const keyParts = up.data.url.replace(/^\/media\//, '').split('/');
    const serveRes = await serve.onRequestGet({
      env: f.env,
      request: new Request('https://test.invalid' + up.data.url),
      params: { path: keyParts },
    });
    assert.equal(serveRes.status, 200);
  });

  await t.test('14. Full Backup Restore with KHOI_PHUC_DU_LIEU confirmation phrase & pre-restore safety snapshot', async () => {
    await call(cms, 'PUT', '/api/cms', { collection: 'site_config', id: 'current', data: { siteName: 'Truoc Khi Khoi Phuc' } }, admin);
    const bk = await call(system, 'POST', '/api/system?action=backup-create', { label: 'Point A' }, admin);
    assert.equal(bk.status, 200);

    await call(cms, 'PUT', '/api/cms', { collection: 'site_config', id: 'current', data: { siteName: 'Sau Khi Thay Doi' } }, admin);
    const restored = await call(system, 'POST', '/api/system?action=backup-restore', {
      id: bk.data.id,
      backupId: bk.data.id,
      confirmText: 'KHOI_PHUC_DU_LIEU',
      confirmationToken: 'KHOI_PHUC_DU_LIEU',
    }, owner);
    assert.equal(restored.status, 200);
    const checkCfg = await call(cms, 'GET', '/api/cms?collection=site_config&id=current');
    assert.equal(checkCfg.data.item.siteName, 'Truoc Khi Khoi Phuc');
  });

  await t.test('15. Maintenance Mode (/admin remains 100% operational while siteStatus is closed)', async () => {
    await call(cms, 'PUT', '/api/cms', {
      collection: 'site_config',
      id: 'current',
      data: { siteStatus: 'closed', closedReason: 'maintenance', closedReasonText: 'Bảo trì định kỳ' },
    }, admin);
    const pubCfg = await call(cms, 'GET', '/api/cms?collection=site_config&id=current');
    assert.equal(pubCfg.data.item.siteStatus, 'closed');
    // Admin endpoints remain 100% operational during maintenance mode
    const adminHealth = await call(system, 'GET', '/api/system?action=health', undefined, admin);
    assert.equal(adminHealth.status, 200);
  });

  await t.test('16. Legacy D1 Schema (0010-0014) upgrade compatibility: preserves historical data and adds new columns/indexes without error', async () => {
    const legacyBridge = new PythonSqliteBridge();
    // 1. Initialize ONLY with the exact legacy 0010-0014 schema (before program_id, version, field_snapshot_json, permissions_json, display_mode, assigned_to existed)
    await legacyBridge.exec(`
      CREATE TABLE website_contacts (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
        topic TEXT NOT NULL DEFAULT 'Liên hệ chung', message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE website_admin_users (
        uid TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'editor', status TEXT NOT NULL DEFAULT 'active',
        is_root_owner INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_login TEXT
      );
      CREATE TABLE website_media_metadata (
        key TEXT PRIMARY KEY, alt TEXT NOT NULL DEFAULT '', caption TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL
      );
      CREATE TABLE website_forms (
        id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
        fields_json TEXT NOT NULL DEFAULT '[]', settings_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE website_form_submissions (
        id TEXT PRIMARY KEY, form_id TEXT NOT NULL, application_code TEXT NOT NULL UNIQUE,
        applicant_name TEXT, applicant_email TEXT, answers_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'received', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO website_forms(id, slug, title, status, fields_json) VALUES('legacy-form-1', 'form-cu-2025', 'Biểu mẫu Cũ 2025', 'open', '[{"id":"full_name","type":"text","label":"Họ tên"}]');
      INSERT INTO website_form_submissions(id, form_id, application_code, applicant_name, applicant_email, answers_json)
        VALUES('legacy-sub-1', 'legacy-form-1', 'SFN-2025-OLD001', 'Lê Văn Cũ', 'cu@example.com', '{"full_name":"Lê Văn Cũ"}');
    `);

    // 2. Apply current 0001_initial_schema.sql and 0002_system_automation_analytics.sql on top of the legacy DB
    const sql0001 = await readFile(new URL('../migrations/0001_initial_schema.sql', import.meta.url), 'utf8');
    const sql0002 = await readFile(new URL('../migrations/0002_system_automation_analytics.sql', import.meta.url), 'utf8');
    await legacyBridge.exec(sql0001);
    await legacyBridge.exec(sql0002);

    try {
      const legacyDB = {
        prepare(sql) { return legacyBridge.prepare(sql); },
        async batch(qs) {
          await legacyBridge.prepare('BEGIN').run();
          try {
            const out = [];
            for (const q of qs) out.push(await q.run());
            await legacyBridge.prepare('COMMIT').run();
            return out;
          } catch (e) {
            try { await legacyBridge.prepare('ROLLBACK').run(); } catch {}
            throw e;
          }
        },
      };
      const legacyEnv = { ...f.env, DB: legacyDB };
      const res = await forms.onRequestGet({
        env: legacyEnv,
        request: new Request('https://test.invalid/api/forms?lookup=SFN-2025-OLD001'),
        data: {},
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ok, true);
      assert.equal(body.item.application_code, 'SFN-2025-OLD001');
    } finally {
      legacyBridge.close();
    }
  });
});
