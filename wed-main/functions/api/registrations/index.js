import { requireAdminToken, json } from '../../_auth.js';
import { renderSafeEmailTemplate } from '../forms/index.js';

function clean(value, max) { return String(value || '').trim().slice(0, max); }
function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function makeCode() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `SFN-${stamp}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

async function ensure(context) {
  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_program_participants(
    id TEXT PRIMARY KEY,registration_id TEXT UNIQUE,program_id TEXT NOT NULL,
    program_title TEXT NOT NULL,full_name TEXT NOT NULL,email TEXT,phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',joined_at TEXT NOT NULL
  )`).run();
  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_email_outbox(
    id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE,recipient TEXT NOT NULL,
    reply_to TEXT NOT NULL DEFAULT '',from_name TEXT NOT NULL DEFAULT 'Sky First Network',
    subject TEXT NOT NULL,body TEXT NOT NULL,html_body TEXT NOT NULL DEFAULT '',
    event_type TEXT,reference_id TEXT,status TEXT NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry_at TEXT,provider TEXT NOT NULL DEFAULT 'resend',
    provider_id TEXT,error_text TEXT,created_at TEXT NOT NULL,updated_at TEXT,sent_at TEXT
  )`).run();
  const cols = new Set(((await context.env.DB.prepare('PRAGMA table_info(website_email_outbox)').all()).results || []).map(x => x.name));
  if (!cols.has('idempotency_key')) await context.env.DB.prepare('ALTER TABLE website_email_outbox ADD COLUMN idempotency_key TEXT').run();
  if (!cols.has('attempts')) await context.env.DB.prepare('ALTER TABLE website_email_outbox ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0').run();
  if (!cols.has('max_attempts')) await context.env.DB.prepare('ALTER TABLE website_email_outbox ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3').run();
  if (!cols.has('next_retry_at')) await context.env.DB.prepare('ALTER TABLE website_email_outbox ADD COLUMN next_retry_at TEXT').run();
  if (!cols.has('updated_at')) await context.env.DB.prepare('ALTER TABLE website_email_outbox ADD COLUMN updated_at TEXT').run();
}

async function getProgram(context, id) {
  const r = await context.env.DB.prepare("SELECT data_json FROM website_cms_documents WHERE collection_name='programs' AND doc_id=?").bind(id).first();
  try { return r ? JSON.parse(r.data_json) : null; } catch { return null; }
}

export async function queueAndSend(context, { to, subject, body, event, ref, idempotencyKey }) {
  await ensure(context);
  const idem = idempotencyKey || `${event || 'mail'}:${ref || ''}:${to}`;
  const existing = await context.env.DB.prepare('SELECT id, status FROM website_email_outbox WHERE idempotency_key=? LIMIT 1').bind(idem).first();
  if (existing) return { queued: true, deduplicated: true, status: existing.status, id: existing.id };
  const id = crypto.randomUUID();
  const key = context.env.RESEND_API_KEY;
  const from = context.env.MAIL_FROM || 'Sky First Network <support@skyfirst.io.vn>';
  const initialStatus = key ? 'queued' : 'unconfigured';
  await context.env.DB.prepare(
    `INSERT INTO website_email_outbox(id,idempotency_key,recipient,subject,body,event_type,reference_id,status,attempts,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,0,datetime('now'),datetime('now'))`
  ).bind(id, idem, to, subject, body, event, ref, initialStatus).run();
  if (!key) return { queued: true, sent: false, status: 'unconfigured', id };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const isTemp = r.status >= 500 || r.status === 429;
      const nextStatus = isTemp ? 'retry_scheduled' : (r.status === 401 || r.status === 403 ? 'invalid_config' : 'rejected');
      const nextRetry = isTemp ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null;
      await context.env.DB.prepare(
        "UPDATE website_email_outbox SET status=?,attempts=1,next_retry_at=?,error_text=?,updated_at=datetime('now') WHERE id=?"
      ).bind(nextStatus, nextRetry, String(d?.message || `HTTP ${r.status}`).slice(0, 500), id).run();
      return { queued: true, sent: false, status: nextStatus, id };
    }
    await context.env.DB.prepare(
      "UPDATE website_email_outbox SET status='accepted_by_provider',attempts=1,provider_id=?,sent_at=datetime('now'),updated_at=datetime('now') WHERE id=?"
    ).bind(d.id || '', id).run();
    return { queued: true, sent: true, status: 'accepted_by_provider', id, providerId: d.id || '' };
  } catch (e) {
    const nextRetry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await context.env.DB.prepare(
      "UPDATE website_email_outbox SET status='temp_failed',attempts=1,next_retry_at=?,error_text=?,updated_at=datetime('now') WHERE id=?"
    ).bind(nextRetry, String(e.message || e).slice(0, 500), id).run();
    return { queued: true, sent: false, status: 'temp_failed', id };
  }
}

async function accept(context, row, program) {
  await ensure(context);
  await context.env.DB.prepare(
    `INSERT OR IGNORE INTO website_program_participants(id,registration_id,program_id,program_title,full_name,email,phone,status,joined_at)
     VALUES(?,?,?,?,?,?,?,'active',datetime('now'))`
  ).bind(crypto.randomUUID(), row.id, row.program_id, row.program_title, row.full_name, row.email, row.phone).run();
  const vars = { ho_ten: row.full_name, ten_chuong_trinh: row.program_title, ma_ho_so: row.application_code };
  const subject = renderSafeEmailTemplate(program?.registrationAcceptedSubject || 'Hồ sơ {{ma_ho_so}} đã được tiếp nhận', vars);
  const body = renderSafeEmailTemplate(program?.registrationAcceptedBody || 'Chào {{ho_ten}},\n\nHồ sơ của bạn cho {{ten_chuong_trinh}} đã được tiếp nhận.', vars);
  await queueAndSend(context, {
    to: row.email,
    subject,
    body,
    event: 'registration_accepted',
    ref: row.id,
    idempotencyKey: `reg_accepted:${row.id}`,
  });
}

export async function onRequestPost(context) {
  await ensure(context);
  const body = await context.request.json().catch(() => ({}));
  const programId = clean(body.programId, 120),
    programTitle = clean(body.programTitle, 240),
    fullName = clean(body.fullName, 120),
    email = clean(body.email, 180).toLowerCase(),
    phone = clean(body.phone, 40),
    organization = clean(body.organization, 180),
    birthYear = clean(body.birthYear, 8),
    portfolioUrl = clean(body.portfolioUrl, 500),
    motivation = clean(body.motivation, 4000),
    consent = body.consent === true ? 1 : 0;

  if (!programId || !programTitle || !fullName || !email || !phone || !organization || !motivation || !consent) {
    return json({ ok: false, error: 'Vui lòng nhập đầy đủ thông tin bắt buộc và xác nhận cam kết.' }, { status: 400 });
  }
  if (!validEmail(email)) return json({ ok: false, error: 'Email không hợp lệ.' }, { status: 400 });
  if (birthYear && !/^\d{4}$/.test(birthYear)) return json({ ok: false, error: 'Năm sinh không hợp lệ.' }, { status: 400 });
  if (portfolioUrl && !/^https?:\/\//i.test(portfolioUrl)) return json({ ok: false, error: 'Liên kết hồ sơ phải bắt đầu bằng http:// hoặc https://.' }, { status: 400 });

  const program = await getProgram(context, programId);
  if (program?.registrationEnabled === false) return json({ ok: false, error: 'Chương trình hiện không nhận đăng ký.' }, { status: 409 });
  const now = Date.now();
  if (program?.registrationOpenAt && now < new Date(program.registrationOpenAt).getTime()) return json({ ok: false, error: 'Chương trình chưa mở đăng ký.' }, { status: 409 });
  if (program?.registrationCloseAt && now > new Date(program.registrationCloseAt).getTime()) return json({ ok: false, error: 'Chương trình đã đóng đăng ký.' }, { status: 409 });

  const dup = await context.env.DB.prepare(
    "SELECT application_code FROM website_registrations WHERE program_id=? AND lower(email)=? AND created_at >= datetime('now', '-5 minutes') LIMIT 1"
  ).bind(programId, email).first();
  if (dup) {
    return json({ ok: false, error: `Email này vừa đăng ký chương trình này (Mã: ${dup.application_code}). Vui lòng không gửi trùng lặp.` }, { status: 409 });
  }

  const id = crypto.randomUUID(), applicationCode = makeCode(), status = program?.registrationAutoAccept ? 'accepted' : 'new';
  await context.env.DB.prepare(
    `INSERT INTO website_registrations(id,application_code,program_id,program_title,full_name,email,phone,organization,birth_year,portfolio_url,motivation,consent,status,created_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`
  ).bind(id, applicationCode, programId, programTitle, fullName, email, phone, organization, birthYear, portfolioUrl, motivation, consent, status).run();

  const vars = { ho_ten: fullName, ten_chuong_trinh: programTitle, ma_ho_so: applicationCode };
  await queueAndSend(context, {
    to: email,
    subject: renderSafeEmailTemplate(program?.registrationReceiptSubject || 'Sky First đã nhận hồ sơ {{ma_ho_so}}', vars),
    body: renderSafeEmailTemplate(program?.registrationReceiptBody || 'Chào {{ho_ten}},\n\nSky First Network đã nhận hồ sơ đăng ký {{ten_chuong_trinh}}. Mã hồ sơ: {{ma_ho_so}}.', vars),
    event: 'registration_received',
    ref: id,
    idempotencyKey: `reg_received:${id}`,
  });

  if (status === 'accepted') {
    await accept(context, { id, application_code: applicationCode, program_id: programId, program_title: programTitle, full_name: fullName, email, phone }, program);
  }
  return json({
    ok: true,
    applicationCode,
    status,
    message: status === 'accepted' ? 'Hồ sơ đã được tiếp nhận và chuyển vào danh sách người tham gia.' : 'Hồ sơ đăng ký đã được tiếp nhận.',
  });
}

export async function onRequestGet(context) {
  const denied = await requireAdminToken(context, 'submissions.view');
  if (denied) return denied;
  await ensure(context);
  const u = new URL(context.request.url), programId = clean(u.searchParams.get('programId'), 120), view = clean(u.searchParams.get('view'), 30);
  if (view === 'participants') {
    const q = programId
      ? context.env.DB.prepare('SELECT * FROM website_program_participants WHERE program_id=? ORDER BY joined_at DESC').bind(programId)
      : context.env.DB.prepare('SELECT * FROM website_program_participants ORDER BY joined_at DESC LIMIT 500');
    const rows = await q.all();
    return json({ ok: true, items: rows.results || [] });
  }
  const q = programId
    ? context.env.DB.prepare('SELECT * FROM website_registrations WHERE program_id=? ORDER BY created_at DESC LIMIT 500').bind(programId)
    : context.env.DB.prepare('SELECT * FROM website_registrations ORDER BY created_at DESC LIMIT 500');
  const rows = await q.all();
  return json({ ok: true, items: rows.results || [] });
}

export async function onRequestPatch(context) {
  const denied = await requireAdminToken(context, 'submissions.view');
  if (denied) return denied;
  await ensure(context);
  const body = await context.request.json().catch(() => ({})), id = clean(body.id, 80), status = clean(body.status, 30);
  if (!id || !['new', 'reviewing', 'accepted', 'rejected', 'closed'].includes(status)) {
    return json({ ok: false, error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }
  const row = await context.env.DB.prepare('SELECT * FROM website_registrations WHERE id=?').bind(id).first();
  if (!row) return json({ ok: false, error: 'Không tìm thấy hồ sơ.' }, { status: 404 });
  await context.env.DB.prepare('UPDATE website_registrations SET status=? WHERE id=?').bind(status, id).run();
  if (status === 'accepted') {
    const program = await getProgram(context, row.program_id);
    await accept(context, row, program);
  }
  return json({ ok: true, participantCreated: status === 'accepted' });
}

export async function onRequestDelete(context) {
  const denied = await requireAdminToken(context, 'forms.manage');
  if (denied) return denied;
  const body = await context.request.json().catch(() => ({})), id = clean(body.id, 80);
  if (!id) return json({ ok: false, error: 'Thiếu id.' }, { status: 400 });
  await context.env.DB.prepare('DELETE FROM website_registrations WHERE id=?').bind(id).run();
  return json({ ok: true });
}
