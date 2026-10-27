import { requireAdminToken, json, recordRevision } from '../../_auth.js';

const clean = (v, n = 500) => String(v ?? '').trim().slice(0, n);
const parse = (v, f) => { try { return JSON.parse(v || ''); } catch { return f; } };
const code = () => `SFN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

export const ALLOWED_EMAIL_VARS = new Set([
  'ho_ten',
  'email',
  'so_dien_thoai',
  'ten_chuong_trinh',
  'ten_bieu_mau',
  'ma_ho_so',
  'trang_thai',
  'thoi_gian',
  'duong_dan',
  'tieu_de_bai_viet',
  'ghi_chu',
  'site_name',
  'program_title',
  'applicant_name',
  'applicant_email',
  'submission_id',
  'submitted_at',
  'contact_email',
]);

export function renderSafeEmailTemplate(template = '', vars = {}) {
  return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const k = String(key).trim();
    if (!ALLOWED_EMAIL_VARS.has(k)) return '';
    return String(vars[k] ?? '').trim();
  });
}

async function ensure(c) {
  await c.env.DB.batch([
    c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_forms(
      id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', program_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 1,
      fields_json TEXT NOT NULL DEFAULT '[]', settings_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_form_submissions(
      id TEXT PRIMARY KEY, form_id TEXT NOT NULL, program_id TEXT NOT NULL DEFAULT '',
      application_code TEXT NOT NULL UNIQUE, idempotency_key TEXT,
      applicant_name TEXT, applicant_email TEXT, applicant_phone TEXT,
      answers_json TEXT NOT NULL DEFAULT '{}', field_snapshot_json TEXT NOT NULL DEFAULT '[]',
      form_version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'received',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_form_rate(rate_key TEXT PRIMARY KEY,count INTEGER NOT NULL DEFAULT 0,window_start TEXT NOT NULL)`),
    c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_email_outbox(
      id TEXT PRIMARY KEY, idempotency_key TEXT UNIQUE, recipient TEXT NOT NULL,
      reply_to TEXT NOT NULL DEFAULT '', from_name TEXT NOT NULL DEFAULT 'Sky First Network',
      subject TEXT NOT NULL, body TEXT NOT NULL, html_body TEXT NOT NULL DEFAULT '',
      event_type TEXT NOT NULL DEFAULT 'general', reference_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3, next_retry_at TEXT,
      provider TEXT NOT NULL DEFAULT 'resend', provider_id TEXT NOT NULL DEFAULT '',
      error_text TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')), sent_at TEXT
    )`),
  ]);

  // Add additive columns if migrating from older table definition
  const formCols = new Set(((await c.env.DB.prepare('PRAGMA table_info(website_forms)').all()).results || []).map(x => x.name));
  if (!formCols.has('program_id')) await c.env.DB.prepare("ALTER TABLE website_forms ADD COLUMN program_id TEXT NOT NULL DEFAULT ''").run();
  if (!formCols.has('version')) await c.env.DB.prepare('ALTER TABLE website_forms ADD COLUMN version INTEGER NOT NULL DEFAULT 1').run();

  const subCols = new Set(((await c.env.DB.prepare('PRAGMA table_info(website_form_submissions)').all()).results || []).map(x => x.name));
  if (!subCols.has('program_id')) await c.env.DB.prepare("ALTER TABLE website_form_submissions ADD COLUMN program_id TEXT NOT NULL DEFAULT ''").run();
  if (!subCols.has('idempotency_key')) await c.env.DB.prepare('ALTER TABLE website_form_submissions ADD COLUMN idempotency_key TEXT').run();
  if (!subCols.has('applicant_phone')) await c.env.DB.prepare('ALTER TABLE website_form_submissions ADD COLUMN applicant_phone TEXT').run();
  if (!subCols.has('field_snapshot_json')) await c.env.DB.prepare("ALTER TABLE website_form_submissions ADD COLUMN field_snapshot_json TEXT NOT NULL DEFAULT '[]'").run();
  if (!subCols.has('form_version')) await c.env.DB.prepare('ALTER TABLE website_form_submissions ADD COLUMN form_version INTEGER NOT NULL DEFAULT 1').run();
  await c.env.DB.batch([
    c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_website_forms_program ON website_forms(program_id, status)'),
    c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_website_form_submissions_program ON website_form_submissions(program_id, created_at DESC)'),
  ]);

  const common = [
    { id: 'full_name', type: 'text', label: 'Họ và tên', required: true, placeholder: 'Nhập họ và tên' },
    { id: 'email', type: 'email', label: 'Email', required: true, placeholder: 'example@email.com' },
    { id: 'phone', type: 'phone', label: 'Số điện thoại / Zalo', required: true, placeholder: 'Nhập số điện thoại' },
    { id: 'location', type: 'text', label: 'Khu vực đang sinh sống', required: true, placeholder: 'Tỉnh/Thành phố' },
    { id: 'facebook', type: 'url', label: 'Facebook cá nhân', required: false, placeholder: 'https://facebook.com/...' },
    { id: 'organization', type: 'text', label: 'Trường / Đơn vị học tập, làm việc', required: false },
    { id: 'motivation', type: 'textarea', label: 'Vì sao bạn muốn tham gia?', required: true },
    { id: 'availability', type: 'textarea', label: 'Thời gian có thể tham gia', required: true },
    { id: 'consent', type: 'consent', label: 'Tôi xác nhận thông tin đã cung cấp là chính xác và đồng ý để Sky First Network sử dụng dữ liệu này cho mục đích tiếp nhận, liên hệ và xử lý hồ sơ.', required: true },
  ];
  const member = [
    ...common.slice(0, 6),
    { id: 'position', type: 'select', label: 'Vị trí/Ban muốn đăng ký', required: true, options: ['Ban Truyền thông', 'Văn phòng Sky First Network', 'Ban Nhân sự', 'Ban Đối ngoại & Sự kiện', 'Ban Hậu cần', 'Ban Tài chính & Nguồn lực', 'Khác'] },
    { id: 'position_other', type: 'text', label: 'Nếu chọn Khác, vui lòng ghi rõ', required: false, showWhen: { fieldId: 'position', equals: 'Khác' } },
    ...common.slice(6),
  ];
  const templates = [
    ['form-member-2026', 'thanh-vien-sky-first-2026', 'Đăng ký Thành viên Sky First 2026', 'Biểu mẫu tiếp nhận hồ sơ Thành viên Sky First Network. Vui lòng chọn đúng vị trí và theo dõi thông báo sau khi gửi.', 'open', member, { closeAt: '2026-12-31T23:59:00+07:00', sendConfirmationEmail: true, notifyAdminEmail: true, confirmationMessage: 'Hồ sơ đã được tiếp nhận. Vui lòng lưu mã hồ sơ và theo dõi hướng dẫn phỏng vấn/trao đổi tiếp theo.' }],
    ['form-core-team', 'core-team-sky-first', 'Ứng tuyển Core Team Sky First', 'Mẫu hồ sơ Core Team được dựng sẵn; quản trị viên có thể mở lại theo từng đợt tuyển.', 'draft', [...common.slice(0, 6), { id: 'position', type: 'text', label: 'Vị trí Core Team ứng tuyển', required: true }, { id: 'experience', type: 'textarea', label: 'Kinh nghiệm hoặc sản phẩm liên quan', required: true }, { id: 'cv', type: 'file', label: 'CV / hồ sơ năng lực', required: false }, ...common.slice(6)], { confirmationMessage: 'Hồ sơ Core Team đã được tiếp nhận.' }],
    ['form-volunteer', 'tinh-nguyen-vien', 'Đăng ký Tình nguyện viên', 'Đăng ký đồng hành theo chương trình, dự án hoặc mảng công việc phù hợp.', 'open', [...common.slice(0, 6), { id: 'area', type: 'checkbox', label: 'Mảng muốn tham gia', required: true, options: ['Giáo dục', 'Truyền thông', 'Sự kiện', 'Cộng đồng', 'Hậu cần', 'Công nghệ', 'Khác'] }, { id: 'skills', type: 'textarea', label: 'Kỹ năng/chuyên môn có thể đóng góp', required: true }, ...common.slice(6)], { sendConfirmationEmail: true, confirmationMessage: 'Đăng ký tình nguyện viên đã được tiếp nhận.' }],
    ['form-teaching-volunteer', 'tinh-nguyen-vien-day-hoc', 'Đăng ký Tình nguyện viên Dạy học', 'Biểu mẫu dành cho người muốn hỗ trợ lớp học và hoạt động giáo dục cộng đồng.', 'open', [...common.slice(0, 6), { id: 'subject', type: 'text', label: 'Môn/chuyên môn có thể hỗ trợ', required: true }, { id: 'teaching_experience', type: 'textarea', label: 'Kinh nghiệm dạy học/trợ giảng', required: false }, { id: 'weekly_schedule', type: 'textarea', label: 'Khung giờ có thể duy trì hằng tuần', required: true }, ...common.slice(6)], { sendConfirmationEmail: true, confirmationMessage: 'Hồ sơ TNV Dạy học đã được tiếp nhận.' }],
    ['form-partnership', 'hop-tac-dong-hanh', 'Đề xuất Hợp tác & Đồng hành', 'Gửi đề xuất hợp tác về chuyên môn, chương trình, truyền thông, sự kiện hoặc nguồn lực.', 'open', [{ id: 'full_name', type: 'text', label: 'Người liên hệ', required: true }, { id: 'email', type: 'email', label: 'Email', required: true }, { id: 'phone', type: 'phone', label: 'Số điện thoại/Zalo', required: true }, { id: 'organization', type: 'text', label: 'Tổ chức/Đơn vị', required: false }, { id: 'proposal_type', type: 'select', label: 'Hình thức đề xuất', required: true, options: ['Chuyên môn', 'Chương trình/Dự án', 'Truyền thông', 'Sự kiện', 'Nguồn lực/Tài trợ', 'Công nghệ', 'Khác'] }, { id: 'proposal', type: 'textarea', label: 'Nội dung đề xuất', required: true }, { id: 'proposal_link', type: 'url', label: 'Link tham khảo / tài liệu trực tuyến', required: false, placeholder: 'https://...' }, { id: 'attachment', type: 'file', label: 'Tài liệu đính kèm', required: false }, { id: 'consent', type: 'consent', label: 'Tôi đồng ý để Sky First Network sử dụng thông tin này để tiếp nhận và phản hồi đề xuất.', required: true }], { sendConfirmationEmail: true, confirmationMessage: 'Đề xuất hợp tác đã được tiếp nhận.' }],
    ['form-initiative', 'gui-sang-kien-de-xuat', 'Gửi Sáng kiến & Đề xuất', 'Gửi ý tưởng hoặc sáng kiến liên quan đến giáo dục, cộng đồng, người trẻ, môi trường hoặc vận hành số.', 'open', [{ id: 'full_name', type: 'text', label: 'Họ và tên', required: true }, { id: 'email', type: 'email', label: 'Email', required: true }, { id: 'idea_title', type: 'text', label: 'Tên sáng kiến/đề xuất', required: true }, { id: 'problem', type: 'textarea', label: 'Vấn đề bạn muốn giải quyết', required: true }, { id: 'solution', type: 'textarea', label: 'Giải pháp hoặc ý tưởng đề xuất', required: true }, { id: 'resources', type: 'textarea', label: 'Nguồn lực dự kiến cần thiết', required: false }, { id: 'attachment', type: 'file', label: 'Tài liệu đính kèm', required: false }, { id: 'consent', type: 'consent', label: 'Tôi xác nhận nội dung do tôi cung cấp và đồng ý để Sky First Network liên hệ về đề xuất này.', required: true }], { sendConfirmationEmail: true, confirmationMessage: 'Sáng kiến/đề xuất đã được tiếp nhận.' }],
  ];
  for (const [id, slug, title, description, status, fields, settings] of templates) {
    await c.env.DB.prepare(`INSERT OR IGNORE INTO website_forms(id,slug,title,description,status,fields_json,settings_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(id, slug, title, description, status, JSON.stringify(fields), JSON.stringify(settings)).run();
  }
}

function safeForm(r) {
  const fields = parse(r.fields_json, []);
  const settings = parse(r.settings_json, {});
  const now = Date.now();
  const openMs = settings.openAt ? new Date(settings.openAt).getTime() : 0;
  const closeMs = settings.closeAt ? new Date(settings.closeAt).getTime() : 0;
  const lifecycleState = r.status !== 'open' ? r.status : (openMs && now < openMs ? 'upcoming' : (closeMs && now > closeMs ? 'expired' : 'open'));
  return {
    ...r,
    fields,
    settings,
    lifecycleState,
    fields_json: undefined,
    settings_json: undefined,
  };
}

function isOpen(row) {
  const s = parse(row.settings_json, {});
  const now = Date.now();
  const open = s.openAt ? new Date(s.openAt).getTime() : 0;
  const close = s.closeAt ? new Date(s.closeAt).getTime() : 0;
  return row.status === 'open' && (!open || now >= open) && (!close || now <= close);
}

function getClosedReason(row) {
  if (!row) return 'Biểu mẫu không tồn tại.';
  const s = parse(row.settings_json, {});
  const now = Date.now();
  const open = s.openAt ? new Date(s.openAt).getTime() : 0;
  const close = s.closeAt ? new Date(s.closeAt).getTime() : 0;
  if (row.status === 'draft') return 'Biểu mẫu đang ở trạng thái Bản nháp, chưa mở nhận đơn.';
  if (row.status === 'closed') return s.closedMessage || 'Biểu mẫu đã đóng nhận hồ sơ.';
  if (open && now < open) return `Biểu mẫu sẽ mở nhận đơn từ ${new Date(open).toLocaleString('vi-VN')}.`;
  if (close && now > close) return s.expiredMessage || `Biểu mẫu đã kết thúc thời hạn nhận đơn (${new Date(close).toLocaleString('vi-VN')}).`;
  return 'Biểu mẫu hiện không nhận hồ sơ.';
}

function fieldVisible(f, answers) {
  const rule = f?.showWhen;
  if (!rule?.fieldId) return true;
  const current = answers?.[rule.fieldId];
  if (Array.isArray(current)) return current.map(String).includes(String(rule.equals ?? ''));
  return String(current ?? '') === String(rule.equals ?? '');
}

function validateValue(f, v) {
  const type = String(f.type || 'text');
  if (type === 'section' || type === 'guide') return true;
  if (v == null || v === '') return true;
  if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v));
  if (type === 'url') return /^https?:\/\//i.test(String(v));
  if (type === 'number' || type === 'rating') return Number.isFinite(Number(v));
  if (type === 'birth_year') return /^(19\d\d|20\d\d)$/.test(String(v).trim());
  if (type === 'phone') return /^[+\d][\d\s().-]{6,20}$/.test(String(v));
  if (type === 'date' || type === 'datetime' || type === 'time') return !Number.isNaN(Date.parse(type === 'time' ? `1970-01-01T${v}` : String(v)));
  if (type === 'consent') return v === true || v === 'true' || v === 1;
  return true;
}

async function rateLimit(c, formId) {
  const ip = clean(c.request.headers.get('CF-Connecting-IP') || 'unknown', 80);
  const key = `${formId}:${ip}`;
  const row = await c.env.DB.prepare('SELECT count,window_start FROM website_form_rate WHERE rate_key=?').bind(key).first();
  const now = Date.now();
  if (!row || now - new Date(row.window_start).getTime() > 3600000) {
    await c.env.DB.prepare('INSERT OR REPLACE INTO website_form_rate(rate_key,count,window_start) VALUES(?,1,?)').bind(key, new Date().toISOString()).run();
    return true;
  }
  if (Number(row.count) >= 15) return false;
  await c.env.DB.prepare('UPDATE website_form_rate SET count=count+1 WHERE rate_key=?').bind(key).run();
  return true;
}

async function enqueueFormEmail(c, { idempotencyKey, to, subject, body, eventType, referenceId }) {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return;
  try {
    const existing = idempotencyKey ? await c.env.DB.prepare('SELECT id FROM website_email_outbox WHERE idempotency_key=? LIMIT 1').bind(idempotencyKey).first() : null;
    if (existing) return;
    const id = crypto.randomUUID();
    const key = c.env.RESEND_API_KEY;
    const from = c.env.MAIL_FROM || 'Sky First Network <support@skyfirst.io.vn>';
    let status = key ? 'queued' : 'unconfigured';
    await c.env.DB.prepare(
      `INSERT INTO website_email_outbox(id,idempotency_key,recipient,subject,body,event_type,reference_id,status,attempts,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,0,datetime('now'),datetime('now'))`
    ).bind(id, idempotencyKey || id, to, subject, body, eventType, referenceId, status).run();
    if (!key) return;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      await c.env.DB.prepare("UPDATE website_email_outbox SET status='accepted_by_provider',provider_id=?,attempts=1,sent_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(d.id || '', id).run();
    } else {
      const isTemp = r.status >= 500 || r.status === 429;
      const nextRetry = isTemp ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null;
      await c.env.DB.prepare("UPDATE website_email_outbox SET status=?,attempts=1,next_retry_at=?,error_text=?,updated_at=datetime('now') WHERE id=?")
        .bind(isTemp ? 'retry_scheduled' : 'perm_failed', nextRetry, clean(d?.message || `HTTP ${r.status}`, 300), id).run();
    }
  } catch (e) {
    // Non-blocking: email failure never breaks form submission
  }
}

const uploads = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
function validUpload(bytes, type) {
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
  if (type === 'image/webp') { const t = new TextDecoder().decode(bytes.slice(0, 16)); return t.slice(0, 4) === 'RIFF' && t.slice(8, 12) === 'WEBP'; }
  if (type === 'application/pdf') return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  return false;
}

async function uploadField(c, u) {
  if (!c.env.MEDIA) return json({ ok: false, error: 'Kho tệp chưa sẵn sàng.' }, { status: 503 });
  const formId = clean(u.searchParams.get('formId'), 100), fieldId = clean(u.searchParams.get('fieldId'), 100);
  const row = await c.env.DB.prepare('SELECT * FROM website_forms WHERE id=? LIMIT 1').bind(formId).first();
  if (!row || !isOpen(row)) return json({ ok: false, error: getClosedReason(row) }, { status: 404 });
  const field = parse(row.fields_json, []).find(f => String(f.id) === fieldId);
  if (!field || !['file', 'image', 'signature'].includes(String(field.type))) return json({ ok: false, error: 'Trường tải tệp không hợp lệ.' }, { status: 400 });
  const fd = await c.request.formData();
  const file = fd.get('file');
  if (!file || typeof file.arrayBuffer !== 'function' || !uploads[file.type] || !file.size || file.size > 5 * 1024 * 1024) {
    return json({ ok: false, error: 'Tệp không hợp lệ. Hỗ trợ JPG, PNG, WebP, PDF tối đa 5MB.' }, { status: 400 });
  }
  if (field.type === 'signature' && file.type !== 'image/png') return json({ ok: false, error: 'Chữ ký phải ở định dạng PNG.' }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validUpload(bytes, file.type)) return json({ ok: false, error: 'Nội dung tệp không khớp định dạng.' }, { status: 400 });
  const key = `form-submissions/${formId}/${crypto.randomUUID()}.${uploads[file.type]}`;
  await c.env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: file.type, cacheControl: 'private, max-age=0' },
    customMetadata: { formId, fieldId, uploadedAt: new Date().toISOString() },
  });
  return json({ ok: true, url: `/media/${key}` });
}

export async function onRequestGet(c) {
  await ensure(c);
  const u = new URL(c.request.url);
  const admin = u.searchParams.get('admin') === '1';
  const lookup = clean(u.searchParams.get('lookup'), 80);
  const slug = clean(u.searchParams.get('slug'), 120);
  const formIdParam = clean(u.searchParams.get('id') || u.searchParams.get('formId'), 120);
  const programIdParam = clean(u.searchParams.get('programId'), 120);
  const submissions = u.searchParams.get('submissions') === '1';

  if (admin) {
    const denied = await requireAdminToken(c, submissions ? 'submissions.view' : 'forms.manage');
    if (denied) return denied;
    if (submissions) {
      let sql = 'SELECT s.*, f.title as form_title, f.slug as form_slug FROM website_form_submissions s LEFT JOIN website_forms f ON f.id=s.form_id WHERE 1=1';
      const binds = [];
      if (formIdParam) { sql += ' AND s.form_id=?'; binds.push(formIdParam); }
      if (programIdParam) { sql += ' AND (s.program_id=? OR f.program_id=?)'; binds.push(programIdParam, programIdParam); }
      sql += ' ORDER BY s.created_at DESC LIMIT 500';
      const r = await c.env.DB.prepare(sql).bind(...binds).all();
      return json({
        ok: true,
        items: (r.results || []).map(x => ({
          ...x,
          answers: parse(x.answers_json, {}),
          fieldSnapshot: parse(x.field_snapshot_json, []),
        })),
      });
    }
    const r = await c.env.DB.prepare('SELECT * FROM website_forms ORDER BY updated_at DESC').all();
    return json({ ok: true, items: (r.results || []).map(safeForm) });
  }

  if (lookup) {
    const r = await c.env.DB.prepare(
      `SELECT s.application_code,s.status,s.created_at,s.updated_at,s.program_id,f.title form_title
       FROM website_form_submissions s JOIN website_forms f ON f.id=s.form_id
       WHERE upper(s.application_code)=upper(?) LIMIT 1`
    ).bind(lookup).first();
    return r ? json({ ok: true, item: r }, { headers: { 'cache-control': 'no-store' } }) : json({ ok: false, error: 'Không tìm thấy hồ sơ với mã này.' }, { status: 404 });
  }

  if (slug || formIdParam || programIdParam) {
    let r = null;
    if (formIdParam) r = await c.env.DB.prepare('SELECT * FROM website_forms WHERE id=? LIMIT 1').bind(formIdParam).first();
    else if (slug) r = await c.env.DB.prepare('SELECT * FROM website_forms WHERE slug=? LIMIT 1').bind(slug).first();
    else if (programIdParam) r = await c.env.DB.prepare('SELECT * FROM website_forms WHERE program_id=? ORDER BY updated_at DESC LIMIT 1').bind(programIdParam).first();
    if (!r) return json({ ok: false, error: 'Biểu mẫu không tồn tại.' }, { status: 404 });
    if (!isOpen(r)) {
      return json({
        ok: false,
        closed: true,
        lifecycleState: safeForm(r).lifecycleState,
        title: r.title,
        description: r.description,
        error: getClosedReason(r),
      }, { status: 404 });
    }
    return json({ ok: true, item: safeForm(r) }, { headers: { 'cache-control': 'public, max-age=15, s-maxage=30' } });
  }

  const r = await c.env.DB.prepare("SELECT id,slug,title,description,program_id,status,version,fields_json,settings_json,updated_at FROM website_forms WHERE status='open' ORDER BY updated_at DESC").all();
  return json({ ok: true, items: (r.results || []).filter(isOpen).map(safeForm) }, { headers: { 'cache-control': 'public, max-age=30, s-maxage=120' } });
}

export async function onRequestPost(c) {
  await ensure(c);
  const u = new URL(c.request.url);
  if (u.searchParams.get('upload') === '1') return uploadField(c, u);
  const admin = u.searchParams.get('admin') === '1';
  const b = await c.request.json().catch(() => ({}));

  if (admin) {
    const denied = await requireAdminToken(c, 'forms.manage');
    if (denied) return denied;
    const adminUser = c.data.adminUser;
    const id = clean(b.id, 100) || `form-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const slug = clean(b.slug || b.title, 120).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    const title = clean(b.title, 240);
    if (!slug || !title) return json({ ok: false, error: 'Tên và đường dẫn (slug) biểu mẫu là bắt buộc.' }, { status: 400 });
    const fields = Array.isArray(b.fields) ? b.fields : [];
    const settings = b.settings && typeof b.settings === 'object' ? b.settings : {};
    const programId = clean(b.program_id ?? b.programId ?? settings.programId ?? '', 120);
    const existing = await c.env.DB.prepare('SELECT * FROM website_forms WHERE id=? LIMIT 1').bind(id).first();
    const nextVersion = existing ? Number(existing.version || 1) + 1 : 1;
    if (existing) {
      await recordRevision(c, {
        entityType: 'form',
        entityId: id,
        versionLabel: `Phiên bản v${existing.version || 1} - ${existing.title}`,
        snapshot: safeForm(existing),
        actorUid: adminUser.uid,
      });
    }
    await c.env.DB.prepare(
      `INSERT INTO website_forms(id,slug,title,description,program_id,status,version,fields_json,settings_json,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,title=excluded.title,description=excluded.description,
       program_id=excluded.program_id,status=excluded.status,version=excluded.version,
       fields_json=excluded.fields_json,settings_json=excluded.settings_json,updated_at=CURRENT_TIMESTAMP`
    ).bind(id, slug, title, clean(b.description, 4000), programId, ['draft', 'open', 'closed'].includes(b.status) ? b.status : 'draft', nextVersion, JSON.stringify(fields), JSON.stringify(settings)).run();
    await c.env.DB.prepare('INSERT INTO website_admin_audit(actor_uid,target_uid,action,detail) VALUES(?,?,?,?)')
      .bind(adminUser.uid, id, existing ? 'form.update' : 'form.create', JSON.stringify({ id, slug, title, version: nextVersion, programId })).run();
    return json({ ok: true, id, slug, version: nextVersion });
  }

  // Public submission
  const formId = clean(b.formId, 100);
  const form = await c.env.DB.prepare('SELECT * FROM website_forms WHERE id=? LIMIT 1').bind(formId).first();
  if (!form || !isOpen(form)) return json({ ok: false, error: getClosedReason(form) }, { status: 409 });
  if (!(await rateLimit(c, form.id))) {
    return json({ ok: false, error: 'Bạn đã gửi quá nhiều hồ sơ trong thời gian ngắn. Vui lòng thử lại sau.' }, { status: 429 });
  }
  const fields = parse(form.fields_json, []);
  const settings = parse(form.settings_json, {});
  const answers = b.answers && typeof b.answers === 'object' ? b.answers : {};

  for (const f of fields) {
    if (f.type === 'section' || f.type === 'guide') continue;
    if (!fieldVisible(f, answers)) continue;
    const v = answers[f.id];
    if (f.required && (v == null || v === '' || (Array.isArray(v) && !v.length) || (f.type === 'consent' && v !== true && v !== 'true'))) {
      return json({ ok: false, error: `Vui lòng hoàn thành: ${f.label || f.id}` }, { status: 400 });
    }
    if (!validateValue(f, v)) {
      return json({ ok: false, error: `Dữ liệu chưa đúng định dạng: ${f.label || f.id}` }, { status: 400 });
    }
  }

  if (settings.maxSubmissions) {
    const r = await c.env.DB.prepare('SELECT COUNT(*) n FROM website_form_submissions WHERE form_id=?').bind(form.id).first();
    if (Number(r?.n || 0) >= Number(settings.maxSubmissions)) {
      return json({ ok: false, error: 'Biểu mẫu đã đạt giới hạn hồ sơ tiếp nhận.' }, { status: 409 });
    }
  }

  const name = clean(answers.full_name || answers.name || answers.ho_ten || b.applicantName, 160);
  const email = clean(answers.email || b.applicantEmail, 180).toLowerCase();
  const phone = clean(answers.phone || answers.so_dien_thoai || b.applicantPhone, 40);
  const programId = clean(b.programId || form.program_id || settings.programId || '', 120);

  // Duplicate submission guard (same form + email within 10 minutes or identical idempotency key)
  const idempotencyKey = clean(b.idempotencyKey || '', 120);
  if (idempotencyKey) {
    const dupKey = await c.env.DB.prepare('SELECT application_code, status FROM website_form_submissions WHERE idempotency_key=? LIMIT 1').bind(idempotencyKey).first();
    if (dupKey) {
      return json({ ok: true, deduplicated: true, applicationCode: dupKey.application_code, status: dupKey.status, message: clean(settings.confirmationMessage, 500) || 'Hồ sơ đã được tiếp nhận.' });
    }
  }
  if (email && settings.preventDuplicateEmail !== false) {
    const recentDup = await c.env.DB.prepare(
      "SELECT application_code FROM website_form_submissions WHERE form_id=? AND lower(applicant_email)=? AND created_at >= datetime('now', '-5 minutes') LIMIT 1"
    ).bind(form.id, email).first();
    if (recentDup) {
      return json({ ok: false, code: 'DUPLICATE_SUBMISSION', error: `Email này vừa gửi hồ sơ cho biểu mẫu này (Mã: ${recentDup.application_code}). Vui lòng không gửi trùng lặp.` }, { status: 409 });
    }
  }

  const applicationCode = code();
  const id = crypto.randomUUID();
  // Capture immutable field snapshot so future form edits never corrupt historical submissions
  const fieldSnapshot = fields
    .filter(f => f.type !== 'section' && f.type !== 'guide')
    .map(f => ({ id: f.id, label: f.label, type: f.type }));

  await c.env.DB.prepare(
    `INSERT INTO website_form_submissions(
      id,form_id,program_id,application_code,idempotency_key,applicant_name,applicant_email,applicant_phone,
      answers_json,field_snapshot_json,form_version,status,created_at,updated_at
     ) VALUES(?,?,?,?,?,?,?,?,?,?,?,'received',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
  ).bind(
    id,
    form.id,
    programId,
    applicationCode,
    idempotencyKey || null,
    name,
    email,
    phone,
    JSON.stringify(answers),
    JSON.stringify(fieldSnapshot),
    Number(form.version || 1)
  ).run();

  const vars = {
    ho_ten: name || 'Bạn',
    email,
    so_dien_thoai: phone,
    ten_bieu_mau: form.title,
    ten_chuong_trinh: clean(b.programTitle || form.title, 200),
    ma_ho_so: applicationCode,
    trang_thai: 'Đã tiếp nhận',
    thoi_gian: new Date().toLocaleString('vi-VN'),
  };

  if (email && settings.sendConfirmationEmail !== false) {
    const subj = renderSafeEmailTemplate(settings.confirmationEmailSubject || 'Sky First Network đã tiếp nhận hồ sơ {{ma_ho_so}}', vars);
    const bodyText = renderSafeEmailTemplate(
      settings.confirmationEmailBody || 'Chào {{ho_ten}},\n\nSky First Network đã tiếp nhận hồ sơ của bạn tại biểu mẫu "{{ten_bieu_mau}}".\nMã hồ sơ tra cứu: {{ma_ho_so}}\nThời gian: {{thoi_gian}}\n\nTrân trọng,\nSky First Network',
      vars
    );
    await enqueueFormEmail(c, {
      idempotencyKey: `form_confirm:${id}`,
      to: email,
      subject: subj,
      body: bodyText,
      eventType: 'form_submission_confirmation',
      referenceId: id,
    });
  }

  if (settings.notifyAdminEmail && settings.adminNotificationAddress) {
    await enqueueFormEmail(c, {
      idempotencyKey: `form_admin_notify:${id}`,
      to: clean(settings.adminNotificationAddress, 180),
      subject: `[Hồ sơ mới] ${form.title} - ${applicationCode}`,
      body: `Có hồ sơ mới tại biểu mẫu "${form.title}".\nMã hồ sơ: ${applicationCode}\nỨng viên: ${name} (${email} / ${phone})`,
      eventType: 'form_submission_admin_alert',
      referenceId: id,
    });
  }

  return json({
    ok: true,
    id,
    applicationCode,
    status: 'received',
    message: clean(settings.confirmationMessage, 500) || 'Hồ sơ đã được tiếp nhận.',
  });
}

export async function onRequestPatch(c) {
  await ensure(c);
  const denied = await requireAdminToken(c, 'submissions.view');
  if (denied) return denied;
  const b = await c.request.json().catch(() => ({}));
  if (b.submissionId) {
    const status = clean(b.status, 30);
    if (!['received', 'reviewing', 'accepted', 'rejected', 'closed'].includes(status)) {
      return json({ ok: false, error: 'Trạng thái không hợp lệ.' }, { status: 400 });
    }
    const subId = clean(b.submissionId, 100);
    const row = await c.env.DB.prepare('SELECT * FROM website_form_submissions WHERE id=? LIMIT 1').bind(subId).first();
    if (!row) return json({ ok: false, error: 'Không tìm thấy hồ sơ.' }, { status: 404 });
    await c.env.DB.prepare('UPDATE website_form_submissions SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status, subId).run();
    if (status === 'accepted' && row.program_id) {
      await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_program_participants(id TEXT PRIMARY KEY,registration_id TEXT UNIQUE,program_id TEXT NOT NULL,program_title TEXT NOT NULL,full_name TEXT NOT NULL,email TEXT,phone TEXT,status TEXT NOT NULL DEFAULT 'active',joined_at TEXT NOT NULL)`).run();
      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO website_program_participants(id,registration_id,program_id,program_title,full_name,email,phone,status,joined_at)
         VALUES(?,?,?,?,?,?,?,'active',datetime('now'))`
      ).bind(crypto.randomUUID(), row.id, row.program_id, clean(b.programTitle || row.program_id, 200), row.applicant_name || 'Ứng viên', row.applicant_email || '', row.applicant_phone || '').run();
    }
    return json({ ok: true });
  }
  return json({ ok: false, error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
}

export async function onRequestDelete(c) {
  await ensure(c);
  const denied = await requireAdminToken(c, 'forms.manage');
  if (denied) return denied;
  const b = await c.request.json().catch(() => ({}));
  if (b.submissionId) {
    await c.env.DB.prepare('DELETE FROM website_form_submissions WHERE id=?').bind(clean(b.submissionId, 100)).run();
    return json({ ok: true });
  }
  const id = clean(b.id, 100);
  if (!id) return json({ ok: false, error: 'Thiếu id.' }, { status: 400 });
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM website_form_submissions WHERE form_id=?').bind(id),
    c.env.DB.prepare('DELETE FROM website_forms WHERE id=?').bind(id),
  ]);
  return json({ ok: true });
}
