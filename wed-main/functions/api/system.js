import { requireAdminToken, json, hasAdminCapability, recordRevision } from '../_auth.js';
import { renderSafeEmailTemplate, ALLOWED_EMAIL_VARS } from './forms/index.js';
import { runDueScheduledPublications } from './cms.js';

const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const parse = (v, fb = {}) => { try { return JSON.parse(v || ''); } catch { return fb; } };

const BOT_UA_REGEX = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|headlesschrome|lighthouse|pingdom|uptimerobot|curl|wget|python-requests/i;

export async function ensureSystemSchema(context) {
  if (!context.env.DB) throw new Error('Missing D1 binding DB');
  await context.env.DB.batch([
    context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_email_outbox (
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
    context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_revisions (
      id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
      version_label TEXT NOT NULL DEFAULT '', snapshot_json TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'system', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_analytics_daily (
      day TEXT NOT NULL, path TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
      entity_type TEXT NOT NULL DEFAULT 'page', entity_id TEXT NOT NULL DEFAULT '',
      views INTEGER NOT NULL DEFAULT 0, sessions_est INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (day, path)
    )`),
    context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_analytics_manual (
      id TEXT PRIMARY KEY, metric_date TEXT NOT NULL, period_label TEXT NOT NULL DEFAULT '',
      path_or_scope TEXT NOT NULL DEFAULT 'all', pageviews INTEGER NOT NULL DEFAULT 0,
      visitors_est INTEGER NOT NULL DEFAULT 0, source_name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '', recorded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS website_backups (
      id TEXT PRIMARY KEY, label TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'full_cms_forms_config',
      status TEXT NOT NULL DEFAULT 'completed', checksum TEXT NOT NULL DEFAULT '',
      stats_json TEXT NOT NULL DEFAULT '{}', snapshot_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT 'system', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
  ]);
}

function maskSecret(val) {
  const s = String(val || '').trim();
  if (!s) return { configured: false, masked: 'Chưa cấu hình' };
  if (s.length <= 8) return { configured: true, masked: '••••••••' };
  return { configured: true, masked: `${s.slice(0, 4)}••••${s.slice(-4)}` };
}

function sanitizeErrorText(err) {
  return String(err || '')
    .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer [REDACTED]')
    .replace(/re_[A-Za-z0-9_]+/g, 're_[REDACTED]')
    .replace(/AIza[A-Za-z0-9_\-]+/g, 'AIza[REDACTED]')
    .slice(0, 400);
}

async function computeChecksum(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function dispatchSingleEmail(context, row) {
  const key = context.env.RESEND_API_KEY;
  const from = context.env.MAIL_FROM || 'Sky First Network <support@skyfirst.io.vn>';
  const attempts = Number(row.attempts || 0) + 1;
  const maxAttempts = Number(row.max_attempts || 3);

  if (!key) {
    await context.env.DB.prepare(
      "UPDATE website_email_outbox SET status='unconfigured', error_text='Chưa cấu hình RESEND_API_KEY trong môi trường máy chủ.', updated_at=datetime('now') WHERE id=?"
    ).bind(row.id).run();
    return { ok: false, status: 'unconfigured', error: 'Chưa cấu hình RESEND_API_KEY trên máy chủ.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.recipient || ''))) {
    await context.env.DB.prepare(
      "UPDATE website_email_outbox SET status='invalid_config', attempts=?, error_text='Địa chỉ email người nhận không hợp lệ.', updated_at=datetime('now') WHERE id=?"
    ).bind(attempts, row.id).run();
    return { ok: false, status: 'invalid_config', error: 'Địa chỉ email người nhận không hợp lệ.' };
  }

  try {
    const payload = {
      from,
      to: [row.recipient],
      subject: row.subject,
      text: row.body,
    };
    if (row.reply_to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.reply_to)) {
      payload.reply_to = row.reply_to;
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      const finalStatus = d.id ? 'accepted_by_provider' : 'sent';
      await context.env.DB.prepare(
        "UPDATE website_email_outbox SET status=?, attempts=?, provider_id=?, error_text='', next_retry_at=NULL, sent_at=datetime('now'), updated_at=datetime('now') WHERE id=?"
      ).bind(finalStatus, attempts, String(d.id || ''), row.id).run();
      return { ok: true, status: finalStatus, providerId: String(d.id || '') };
    }
    const cleanErr = sanitizeErrorText(d?.message || `HTTP ${r.status}`);
    if (r.status === 401 || r.status === 403) {
      await context.env.DB.prepare(
        "UPDATE website_email_outbox SET status='invalid_config', attempts=?, error_text=?, next_retry_at=NULL, updated_at=datetime('now') WHERE id=?"
      ).bind(attempts, cleanErr, row.id).run();
      return { ok: false, status: 'invalid_config', error: cleanErr };
    }
    if (r.status === 422 || r.status === 400) {
      await context.env.DB.prepare(
        "UPDATE website_email_outbox SET status='rejected', attempts=?, error_text=?, next_retry_at=NULL, updated_at=datetime('now') WHERE id=?"
      ).bind(attempts, cleanErr, row.id).run();
      return { ok: false, status: 'rejected', error: cleanErr };
    }
    const canRetry = (r.status >= 500 || r.status === 429) && attempts < maxAttempts;
    const backoffMinutes = Math.pow(3, attempts); // 3m, 9m, 27m
    const nextRetry = canRetry ? new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString() : null;
    const nextStatus = canRetry ? 'retry_scheduled' : 'perm_failed';
    await context.env.DB.prepare(
      "UPDATE website_email_outbox SET status=?, attempts=?, next_retry_at=?, error_text=?, updated_at=datetime('now') WHERE id=?"
    ).bind(nextStatus, attempts, nextRetry, cleanErr, row.id).run();
    return { ok: false, status: nextStatus, error: cleanErr, nextRetryAt: nextRetry };
  } catch (e) {
    const cleanErr = sanitizeErrorText(e?.message || e);
    const canRetry = attempts < maxAttempts;
    const backoffMinutes = Math.pow(3, attempts);
    const nextRetry = canRetry ? new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString() : null;
    const nextStatus = canRetry ? 'temp_failed' : 'perm_failed';
    await context.env.DB.prepare(
      "UPDATE website_email_outbox SET status=?, attempts=?, next_retry_at=?, error_text=?, updated_at=datetime('now') WHERE id=?"
    ).bind(nextStatus, attempts, nextRetry, cleanErr, row.id).run();
    return { ok: false, status: nextStatus, error: cleanErr, nextRetryAt: nextRetry };
  }
}

export async function onRequestGet(context) {
  await ensureSystemSchema(context);
  const u = new URL(context.request.url);
  const action = clean(u.searchParams.get('action'), 60);

  if (action === 'analytics') {
    const denied = await requireAdminToken(context, 'content.edit');
    if (denied) return denied;
    const days = Math.min(365, Math.max(1, Number(u.searchParams.get('days') || 30)));
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const [dailyRows, topPaths, manualRows] = await Promise.all([
      context.env.DB.prepare(
        'SELECT day, SUM(views) as total_views, SUM(sessions_est) as total_sessions FROM website_analytics_daily WHERE day >= ? GROUP BY day ORDER BY day ASC'
      ).bind(since).all(),
      context.env.DB.prepare(
        'SELECT path, MAX(title) as title, entity_type, SUM(views) as views, SUM(sessions_est) as sessions_est FROM website_analytics_daily WHERE day >= ? GROUP BY path ORDER BY views DESC LIMIT 30'
      ).bind(since).all(),
      context.env.DB.prepare(
        'SELECT * FROM website_analytics_manual ORDER BY metric_date DESC, created_at DESC LIMIT 100'
      ).all(),
    ]);
    const autoTotalViews = (dailyRows.results || []).reduce((s, r) => s + Number(r.total_views || 0), 0);
    const autoTotalSessions = (dailyRows.results || []).reduce((s, r) => s + Number(r.total_sessions || 0), 0);
    const manualTotalViews = (manualRows.results || []).reduce((s, r) => s + Number(r.pageviews || 0), 0);
    const mappedManual = (manualRows.results || []).map(r => ({
      ...r,
      metric_label: r.period_label || r.path_or_scope || r.metric_date,
      metric_value: Number(r.pageviews || 0),
      source: r.source_name,
      recorded_date: r.metric_date,
      created_by: r.recorded_by,
    }));
    return json({
      ok: true,
      days,
      since,
      totalAutoViews: autoTotalViews,
      byPage: topPaths.results || [],
      byDay: dailyRows.results || [],
      manualEntries: mappedManual,
      automatic: {
        totalViews: autoTotalViews,
        estimatedSessions: autoTotalSessions,
        note: 'Số liệu tự động ghi nhận pageview thực tế (đã lọc bot và trang quản trị). Phiên truy cập là ước tính không xâm lấn quyền riêng tư.',
        daily: dailyRows.results || [],
        topPages: topPaths.results || [],
      },
      manual: {
        totalViews: manualTotalViews,
        note: 'Số liệu nhập thủ công từ báo cáo đối chiếu bên ngoài, có ghi rõ nguồn, người nhập và thời điểm.',
        entries: mappedManual,
      },
    });
  }

  if (action === 'email-outbox') {
    const denied = await requireAdminToken(context, 'settings.manage');
    if (denied) return denied;
    const statusFilter = clean(u.searchParams.get('status'), 40);
    const eventFilter = clean(u.searchParams.get('eventType'), 60);
    let sql = 'SELECT id,idempotency_key,recipient,reply_to,from_name,subject,event_type,reference_id,status,attempts,max_attempts,next_retry_at,provider,provider_id,error_text,created_at,updated_at,sent_at FROM website_email_outbox WHERE 1=1';
    const binds = [];
    if (statusFilter && statusFilter !== 'all') { sql += ' AND status=?'; binds.push(statusFilter); }
    if (eventFilter && eventFilter !== 'all') { sql += ' AND event_type=?'; binds.push(eventFilter); }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const rows = await context.env.DB.prepare(sql).bind(...binds).all();
    const counts = await context.env.DB.prepare(
      'SELECT status, COUNT(*) as count FROM website_email_outbox GROUP BY status'
    ).all();
    return json({
      ok: true,
      secretsStatus: {
        resendApiKey: maskSecret(context.env.RESEND_API_KEY),
        mailFrom: { configured: Boolean(context.env.MAIL_FROM), value: context.env.MAIL_FROM || 'Sky First Network <support@skyfirst.io.vn>' },
        firebaseServiceAccount: maskSecret(context.env.FIREBASE_SERVICE_ACCOUNT_JSON),
      },
      allowedVariables: [...ALLOWED_EMAIL_VARS],
      summary: Object.fromEntries((counts.results || []).map(r => [r.status, Number(r.count || 0)])),
      items: (rows.results || []).map(r => ({
        ...r,
        recipient_email: r.recipient,
        last_error: r.error_text,
      })),
    });
  }

  if (action === 'revisions') {
    const denied = await requireAdminToken(context, 'content.edit');
    if (denied) return denied;
    const entityType = clean(u.searchParams.get('entityType'), 80);
    const entityId = clean(u.searchParams.get('entityId'), 120);
    let sql = 'SELECT id,entity_type,entity_id,version_label,created_by,created_at FROM website_revisions WHERE 1=1';
    const binds = [];
    if (entityType) { sql += ' AND entity_type=?'; binds.push(entityType); }
    if (entityId) { sql += ' AND entity_id=?'; binds.push(entityId); }
    sql += ' ORDER BY created_at DESC, id DESC LIMIT 60';
    const rows = await context.env.DB.prepare(sql).bind(...binds).all();
    return json({ ok: true, items: rows.results || [] });
  }

  if (action === 'backups') {
    const denied = await requireAdminToken(context, 'settings.manage');
    if (denied) return denied;
    const rows = await context.env.DB.prepare(
      'SELECT id,label,scope,status,checksum,stats_json,created_by,created_at FROM website_backups ORDER BY created_at DESC, id DESC LIMIT 30'
    ).all();
    return json({
      ok: true,
      items: (rows.results || []).map(r => {
        const st = parse(r.stats_json, {});
        return { ...r, stats: st, sha256: r.checksum, size_bytes: Number(st.bytes || 0) };
      }),
    });
  }

  if (action === 'health') {
    const denied = await requireAdminToken(context, 'content.edit');
    if (denied) return denied;
    const checks = [];
    // 1. D1 database check
    try {
      const tables = await context.env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tableNames = new Set((tables.results || []).map(x => x.name));
      const requiredTables = ['website_cms_documents', 'website_forms', 'website_form_submissions', 'website_email_outbox', 'website_revisions', 'website_analytics_daily', 'website_backups'];
      const missing = requiredTables.filter(t => !tableNames.has(t));
      checks.push({
        id: 'd1_schema',
        name: 'Kết nối D1 & Phiên bản Schema',
        status: missing.length === 0 ? 'normal' : 'warning',
        detail: missing.length === 0 ? `Bình thường (${tableNames.size} bảng đang hoạt động, khớp schema 0001 + 0002).` : `Thiếu bảng: ${missing.join(', ')}`,
      });
    } catch (e) {
      checks.push({ id: 'd1_schema', name: 'Kết nối D1 & Phiên bản Schema', status: 'error', detail: sanitizeErrorText(e.message) });
    }

    // 2. R2 Media bucket check
    if (!context.env.MEDIA) {
      checks.push({ id: 'r2_media', name: 'Kho lưu trữ R2 Media', status: 'unverifiable', detail: 'Binding MEDIA chưa được gắn vào môi trường hiện tại.' });
    } else {
      try {
        const listed = await context.env.MEDIA.list({ prefix: 'website/', limit: 5 });
        checks.push({ id: 'r2_media', name: 'Kho lưu trữ R2 Media', status: 'normal', detail: `Kết nối R2 hoạt động tốt (${listed.objects?.length || 0} tệp mẫu phản hồi).` });
      } catch (e) {
        checks.push({ id: 'r2_media', name: 'Kho lưu trữ R2 Media', status: 'error', detail: sanitizeErrorText(e.message) });
      }
    }

    // 3. Email configuration & queue health
    const hasResend = Boolean(context.env.RESEND_API_KEY);
    const failedEmails = await context.env.DB.prepare("SELECT COUNT(*) n FROM website_email_outbox WHERE status IN ('temp_failed','perm_failed','invalid_config','rejected')").first();
    const stuckEmails = await context.env.DB.prepare("SELECT COUNT(*) n FROM website_email_outbox WHERE status IN ('queued','retry_scheduled')").first();
    checks.push({
      id: 'email_system',
      name: 'Hệ thống Email & Hàng đợi Outbox',
      status: !hasResend ? 'warning' : (Number(failedEmails?.n || 0) > 0 ? 'warning' : 'normal'),
      detail: !hasResend
        ? `Chưa cấu hình RESEND_API_KEY (các thư tự động được lưu an toàn ở trạng thái unconfigured/queued: ${Number(stuckEmails?.n || 0)} thư).`
        : `Đã cấu hình nhà cung cấp gửi thư. Hàng đợi chờ: ${Number(stuckEmails?.n || 0)}, Lỗi cần chú ý: ${Number(failedEmails?.n || 0)}.`,
    });

    // 4. Scheduled publishing & Expired forms
    const expiredOpenForms = await context.env.DB.prepare("SELECT id, title, settings_json FROM website_forms WHERE status='open'").all();
    const now = Date.now();
    const expiredList = (expiredOpenForms.results || []).filter(f => {
      const s = parse(f.settings_json, {});
      return s.closeAt && new Date(s.closeAt).getTime() < now;
    });
    checks.push({
      id: 'automation_forms',
      name: 'Vòng đời Biểu mẫu & Lịch tự động',
      status: expiredList.length > 0 ? 'warning' : 'normal',
      detail: expiredList.length > 0
        ? `Có ${expiredList.length} biểu mẫu đã qua thời hạn đóng (hệ thống tự chặn nộp đơn mới; có thể chạy đồng bộ đóng trạng thái).`
        : 'Tất cả biểu mẫu đang mở đều trong thời hạn hợp lệ.',
    });

    return json({
      ok: true,
      checkedAt: new Date().toISOString(),
      checks,
      secrets: {
        RESEND_API_KEY: maskSecret(context.env.RESEND_API_KEY),
        FIREBASE_SERVICE_ACCOUNT_JSON: maskSecret(context.env.FIREBASE_SERVICE_ACCOUNT_JSON),
        FIREBASE_API_KEY: maskSecret(context.env.FIREBASE_API_KEY),
      },
    });
  }

  return json({ ok: false, error: 'Hành động truy vấn hệ thống không hợp lệ.' }, { status: 400 });
}

export async function onRequestPost(context) {
  await ensureSystemSchema(context);
  const u = new URL(context.request.url);
  const body = await context.request.json().catch(() => ({}));
  const action = clean(u.searchParams.get('action') || body.action, 60);

  // 1. Public privacy-safe Pageview tracking
  if (action === 'pageview') {
    const ua = context.request.headers.get('user-agent') || '';
    if (BOT_UA_REGEX.test(ua)) {
      return json({ ok: true, ignored: 'bot' });
    }
    const path = clean(body.path || '/', 240);
    if (path.startsWith('/admin') || path.startsWith('/api')) {
      return json({ ok: true, ignored: 'internal' });
    }
    const day = new Date().toISOString().slice(0, 10);
    const title = clean(body.title || path, 240);
    const entityType = clean(body.entityType || 'page', 40);
    const entityId = clean(body.entityId || '', 120);
    const isNewSession = body.newSession === true ? 1 : 0;
    await context.env.DB.prepare(
      `INSERT INTO website_analytics_daily(day, path, title, entity_type, entity_id, views, sessions_est, updated_at)
       VALUES(?, ?, ?, ?, ?, 1, ?, datetime('now'))
       ON CONFLICT(day, path) DO UPDATE SET
         views = website_analytics_daily.views + 1,
         sessions_est = website_analytics_daily.sessions_est + excluded.sessions_est,
         title = CASE WHEN excluded.title <> '' THEN excluded.title ELSE website_analytics_daily.title END,
         updated_at = datetime('now')`
    ).bind(day, path, title, entityType, entityId, isNewSession).run();
    return json({ ok: true, recorded: true, day, path });
  }

  // 2. Manual analytics record entry
  if (action === 'analytics-manual') {
    const denied = await requireAdminToken(context, 'settings.manage');
    if (denied) return denied;
    const adminUser = context.data.adminUser;
    const metricDate = clean(body.metricDate || new Date().toISOString().slice(0, 10), 20);
    const sourceName = clean(body.sourceName || body.source || 'Báo cáo nội bộ', 160);
    const pageviews = Math.max(0, Number(body.pageviews ?? body.metricValue ?? 0));
    const visitorsEst = Math.max(0, Number(body.visitorsEst || 0));
    if (!sourceName || !Number.isFinite(pageviews)) {
      return json({ ok: false, error: 'Vui lòng nhập nguồn số liệu và số lượt xem hợp lệ.' }, { status: 400 });
    }
    const id = `man-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    await context.env.DB.prepare(
      `INSERT INTO website_analytics_manual(id,metric_date,period_label,path_or_scope,pageviews,visitors_est,source_name,note,recorded_by,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`
    ).bind(
      id,
      metricDate,
      clean(body.periodLabel || body.metricLabel || metricDate, 80),
      clean(body.pathOrScope || 'Toàn website', 160),
      Math.round(pageviews),
      Math.round(visitorsEst),
      sourceName,
      clean(body.note, 500),
      adminUser.email || adminUser.name || adminUser.uid
    ).run();
    return json({ ok: true, id });
  }

  // 3. Preview Email Template safely without sending real email
  if (action === 'email-preview') {
    const denied = await requireAdminToken(context, 'settings.manage');
    if (denied) return denied;
    const sampleVars = {
      ho_ten: 'Nguyễn Minh Anh',
      email: 'minhanh@example.com',
      so_dien_thoai: '0912 345 678',
      ten_chuong_trinh: 'Chương trình Tình nguyện & Giáo dục Sky First 2026',
      ten_bieu_mau: 'Đăng ký Thành viên Sky First 2026',
      ma_ho_so: 'SFN-20261026-DEMO01',
      trang_thai: 'Đã tiếp nhận',
      thoi_gian: new Date().toLocaleString('vi-VN'),
      duong_dan: 'https://skyfirst.io.vn/join',
      tieu_de_bai_viet: 'Thông báo tuyển Thành viên & Tình nguyện viên 2026',
      ghi_chu: 'Bản xem trước mẫu thư bằng dữ liệu giả lập an toàn.',
      site_name: 'Sky First Network',
      program_title: 'Chương trình Tình nguyện & Giáo dục Sky First 2026',
      applicant_name: 'Nguyễn Minh Anh',
      applicant_email: 'minhanh@example.com',
      submission_id: 'SFN-20261026-DEMO01',
      submitted_at: new Date().toLocaleString('vi-VN'),
      contact_email: 'lienhe@skyfirst.io.vn',
      ...(body.sampleVars && typeof body.sampleVars === 'object' ? body.sampleVars : {}),
    };
    return json({
      ok: true,
      previewOnly: true,
      renderedSubject: renderSafeEmailTemplate(body.subject || body.subjectTemplate || '', sampleVars),
      renderedBody: renderSafeEmailTemplate(body.body || body.bodyTemplate || '', sampleVars),
      sampleVarsUsed: sampleVars,
      allowedVariables: [...ALLOWED_EMAIL_VARS],
    });
  }

  // 4. Send Test Email & distinguish actual provider/config status
  if (action === 'email-test') {
    const denied = await requireAdminToken(context, 'settings.manage');
    if (denied) return denied;
    const adminUser = context.data.adminUser;
    const recipient = clean(body.recipient || body.recipientEmail || adminUser.email, 180);
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return json({ ok: false, status: 'invalid_config', error: 'Địa chỉ email nhận thử nghiệm không hợp lệ.' }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const subject = clean(body.subject || '[Sky First Network] Kiểm tra cấu hình gửi email hệ thống', 200);
    const textBody = clean(
      body.body || `Xin chào,\n\nĐây là thư kiểm tra kết nối từ Trung tâm Cấu hình Sky First Network.\nNgười thực hiện: ${adminUser.email}\nThời gian: ${new Date().toISOString()}\n\nLưu ý: Thư thử nghiệm không bao giờ đính kèm khóa bí mật hay mật khẩu hệ thống.`,
      3000
    );
    await context.env.DB.prepare(
      `INSERT INTO website_email_outbox(id,idempotency_key,recipient,reply_to,from_name,subject,body,event_type,reference_id,status,attempts,max_attempts,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,'admin_email_test',?,'queued',0,3,datetime('now'),datetime('now'))`
    ).bind(id, `test:${id}`, recipient, clean(body.replyTo, 180), clean(body.fromName || 'Sky First Network', 120), subject, textBody, adminUser.uid).run();

    const row = await context.env.DB.prepare('SELECT * FROM website_email_outbox WHERE id=?').bind(id).first();
    const dispatchResult = await dispatchSingleEmail(context, row);
    const statusMessages = {
      unconfigured: 'Đã ghi vào hàng đợi (unconfigured): Máy chủ chưa cấu hình biến môi trường RESEND_API_KEY nên chưa thể gửi thư ra ngoài.',
      invalid_config: 'Cấu hình không hợp lệ (invalid_config): Nhà cung cấp từ chối xác thực hoặc địa chỉ gửi không hợp lệ.',
      accepted_by_provider: 'Nhà cung cấp email đã tiếp nhận yêu cầu gửi (accepted_by_provider). Vui lòng kiểm tra hộp thư đến/spam của người nhận.',
      sent: 'Đã gửi tới nhà cung cấp email (sent).',
      rejected: 'Bị nhà cung cấp từ chối (rejected). Kiểm tra tên miền gửi MAIL_FROM hoặc địa chỉ nhận.',
      retry_scheduled: 'Lỗi tạm thời từ dịch vụ email — đã lên lịch thử lại tự động (retry_scheduled).',
      temp_failed: 'Lỗi kết nối tạm thời (temp_failed) — hệ thống sẽ thử lại có kiểm soát.',
      perm_failed: 'Thất bại vĩnh viễn (perm_failed).',
    };
    return json({
      ok: true,
      outboxId: id,
      deliveryStatus: dispatchResult.status,
      providerId: dispatchResult.providerId || '',
      error: dispatchResult.error || '',
      message: statusMessages[dispatchResult.status] || `Trạng thái: ${dispatchResult.status}`,
    });
  }

  // 5. Retry failed/queued email with backoff & attempt limit
  if (action === 'email-retry') {
    const denied = await requireAdminToken(context, 'settings.manage');
    if (denied) return denied;
    const outboxId = clean(body.id, 100);
    if (outboxId) {
      const row = await context.env.DB.prepare('SELECT * FROM website_email_outbox WHERE id=? LIMIT 1').bind(outboxId).first();
      if (!row) return json({ ok: false, error: 'Không tìm thấy tác vụ email.' }, { status: 404 });
      if (Number(row.attempts || 0) >= Number(row.max_attempts || 3) && !body.forceResetAttempts) {
        return json({ ok: false, status: 'perm_failed', error: `Tác vụ đã vượt giới hạn thử lại (${row.attempts}/${row.max_attempts}).` }, { status: 409 });
      }
      if (body.forceResetAttempts) {
        await context.env.DB.prepare('UPDATE website_email_outbox SET attempts=0 WHERE id=?').bind(outboxId).run();
        row.attempts = 0;
      }
      const res = await dispatchSingleEmail(context, row);
      return json({ ok: true, id: outboxId, ...res });
    }
    // Batch process due retries
    const dueRows = await context.env.DB.prepare(
      "SELECT * FROM website_email_outbox WHERE status IN ('queued','retry_scheduled','temp_failed') AND attempts < max_attempts AND (next_retry_at IS NULL OR next_retry_at <= datetime('now')) ORDER BY created_at ASC LIMIT 20"
    ).all();
    const outcomes = [];
    for (const r of dueRows.results || []) {
      outcomes.push({ id: r.id, ...(await dispatchSingleEmail(context, r)) });
    }
    return json({ ok: true, processed: outcomes.length, outcomes });
  }

  // 6. Run automated tasks (Scheduled publications, form auto-close, link/SEO audit, retry due emails)
  if (action === 'run-automations') {
    const denied = await requireAdminToken(context, 'content.edit');
    if (denied) return denied;
    const publishedCount = await runDueScheduledPublications(context);
    // Auto-close forms past closeAt
    const openForms = await context.env.DB.prepare("SELECT id, title, settings_json FROM website_forms WHERE status='open'").all();
    const now = Date.now();
    let closedFormsCount = 0;
    for (const f of openForms.results || []) {
      const s = parse(f.settings_json, {});
      if (s.closeAt && new Date(s.closeAt).getTime() < now && s.autoClose !== false) {
        await context.env.DB.prepare("UPDATE website_forms SET status='closed', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(f.id).run();
        closedFormsCount++;
      }
    }
    return json({
      ok: true,
      executedAt: new Date().toISOString(),
      publishedScheduledCount: publishedCount,
      autoClosedFormsCount: closedFormsCount,
      published: { publishedCount },
      closedFormsCount,
    });
  }

  // 7. Restore Revision
  if (action === 'restore-revision') {
    const denied = await requireAdminToken(context, 'content.publish');
    if (denied) return denied;
    const adminUser = context.data.adminUser;
    const revId = clean(body.revisionId, 100);
    const rev = await context.env.DB.prepare('SELECT * FROM website_revisions WHERE id=? LIMIT 1').bind(revId).first();
    if (!rev) return json({ ok: false, error: 'Không tìm thấy phiên bản cần khôi phục.' }, { status: 404 });
    const snap = parse(rev.snapshot_json, null);
    if (!snap) return json({ ok: false, error: 'Dữ liệu phiên bản không hợp lệ.' }, { status: 400 });

    if (rev.entity_type.startsWith('cms:')) {
      const collection = rev.entity_type.slice(4);
      const docId = rev.entity_id;
      const current = await context.env.DB.prepare('SELECT data_json FROM website_cms_documents WHERE collection_name=? AND doc_id=?').bind(collection, docId).first();
      if (current?.data_json) {
        await recordRevision(context, {
          entityType: rev.entity_type,
          entityId: docId,
          versionLabel: `Tự động lưu trước khi khôi phục về ${rev.id}`,
          snapshot: current.data_json,
          actorUid: adminUser.uid,
        });
      }
      const now = new Date().toISOString();
      const pub = collection === 'site_config' || collection === 'cms_modules' ? 1 : (snap.isPublished === true ? 1 : 0);
      await context.env.DB.prepare(
        `INSERT INTO website_cms_documents(collection_name,doc_id,data_json,is_published,updated_at,updated_by)
         VALUES(?,?,?,?,?,?) ON CONFLICT(collection_name,doc_id) DO UPDATE SET
         data_json=excluded.data_json,is_published=excluded.is_published,updated_at=excluded.updated_at,updated_by=excluded.updated_by`
      ).bind(collection, docId, JSON.stringify(snap), pub, now, adminUser.uid).run();
      return json({ ok: true, restoredType: rev.entity_type, restoredId: docId, item: snap });
    }

    if (rev.entity_type === 'form') {
      const formId = rev.entity_id;
      await context.env.DB.prepare(
        `UPDATE website_forms SET title=?, description=?, status=?, fields_json=?, settings_json=?, version=version+1, updated_at=CURRENT_TIMESTAMP WHERE id=?`
      ).bind(snap.title || '', snap.description || '', snap.status || 'draft', JSON.stringify(snap.fields || []), JSON.stringify(snap.settings || {}), formId).run();
      return json({ ok: true, restoredType: 'form', restoredId: formId });
    }

    return json({ ok: false, error: 'Loại phiên bản chưa hỗ trợ khôi phục tự động.' }, { status: 400 });
  }

  // 8. Create Verified System Backup
  if (action === 'backup-create') {
    const denied = await requireAdminToken(context, 'settings.manage');
    if (denied) return denied;
    const adminUser = context.data.adminUser;
    const [cmsDocs, forms, adminRecords] = await Promise.all([
      context.env.DB.prepare('SELECT collection_name,doc_id,data_json,is_published,updated_at FROM website_cms_documents').all(),
      context.env.DB.prepare('SELECT id,slug,title,description,program_id,status,version,fields_json,settings_json,updated_at FROM website_forms').all(),
      context.env.DB.prepare('SELECT id,kind,title,payload,updated_at FROM website_admin_records').all(),
    ]);
    const payload = {
      schemaVersion: '2026.2',
      exportedAt: new Date().toISOString(),
      cmsDocuments: cmsDocs.results || [],
      forms: forms.results || [],
      adminRecords: adminRecords.results || [],
    };
    const snapshotText = JSON.stringify(payload);
    const checksum = await computeChecksum(snapshotText);
    const stats = {
      cmsDocumentsCount: (cmsDocs.results || []).length,
      formsCount: (forms.results || []).length,
      adminRecordsCount: (adminRecords.results || []).length,
      bytes: snapshotText.length,
    };
    const id = `bk-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const label = clean(body.label || `Sao lưu hệ thống (${new Date().toLocaleString('vi-VN')})`, 160);
    await context.env.DB.prepare(
      `INSERT INTO website_backups(id,label,scope,status,checksum,stats_json,snapshot_json,created_by,created_at)
       VALUES(?,?,'full_cms_forms_config','completed',?,?,?,?,datetime('now'))`
    ).bind(id, label, checksum, JSON.stringify(stats), snapshotText, adminUser.email || adminUser.uid).run();
    await context.env.DB.prepare('INSERT INTO website_admin_audit(actor_uid,target_uid,action,detail) VALUES(?,?,?,?)')
      .bind(adminUser.uid, id, 'system.backup.create', JSON.stringify({ id, label, checksum, stats })).run();
    return json({ ok: true, id, label, checksum, sha256: checksum, size_bytes: stats.bytes, stats });
  }

  // 9. Verify or Restore Backup with integrity verification & explicit confirmation
  if (action === 'backup-restore') {
    const denied = await requireAdminToken(context, 'settings.manage');
    if (denied) return denied;
    const adminUser = context.data.adminUser;
    const backupId = clean(body.backupId || body.id, 100);
    const dryRun = body.dryRun === true;
    const token = body.confirmToken || body.confirmText || body.confirmationToken;
    if (!dryRun && token !== 'KHOI_PHUC_DU_LIEU') {
      return json({ ok: false, error: 'Vui lòng nhập mã xác nhận KHOI_PHUC_DU_LIEU trước khi ghi đè cấu hình/nội dung từ bản sao lưu.' }, { status: 400 });
    }
    const row = await context.env.DB.prepare('SELECT * FROM website_backups WHERE id=? LIMIT 1').bind(backupId).first();
    if (!row) return json({ ok: false, error: 'Không tìm thấy bản sao lưu.' }, { status: 404 });
    const actualChecksum = await computeChecksum(row.snapshot_json);
    if (row.checksum && actualChecksum !== row.checksum) {
      return json({ ok: false, error: 'Kiểm tra toàn vẹn thất bại: Checksum bản sao lưu không khớp!' }, { status: 409 });
    }
    const parsed = parse(row.snapshot_json, null);
    if (!parsed || !Array.isArray(parsed.cmsDocuments) || !Array.isArray(parsed.forms)) {
      return json({ ok: false, error: 'Cấu trúc dữ liệu bản sao lưu không hợp lệ.' }, { status: 400 });
    }
    if (dryRun) {
      return json({
        ok: true,
        dryRun: true,
        integrityVerified: true,
        checksum: actualChecksum,
        counts: {
          cmsDocuments: parsed.cmsDocuments.length,
          forms: parsed.forms.length,
          adminRecords: (parsed.adminRecords || []).length,
        },
      });
    }
    // Create automatic pre-restore safety snapshot before overwriting
    const [curCms, curForms, curRecs] = await Promise.all([
      context.env.DB.prepare('SELECT collection_name,doc_id,data_json,is_published,updated_at FROM website_cms_documents').all(),
      context.env.DB.prepare('SELECT id,slug,title,description,program_id,status,version,fields_json,settings_json,updated_at FROM website_forms').all(),
      context.env.DB.prepare('SELECT id,kind,title,payload,updated_at FROM website_admin_records').all(),
    ]);
    const preSnapText = JSON.stringify({
      schemaVersion: '2026.2',
      exportedAt: new Date().toISOString(),
      cmsDocuments: curCms.results || [],
      forms: curForms.results || [],
      adminRecords: curRecs.results || [],
    });
    const preHash = await computeChecksum(preSnapText);
    const preId = `bk-pre-restore-${Date.now()}`;
    await context.env.DB.prepare(
      `INSERT INTO website_backups(id,label,scope,status,checksum,stats_json,snapshot_json,created_by,created_at)
       VALUES(?,?,'pre_restore_auto','completed',?,?,?,?,datetime('now'))`
    ).bind(preId, `Tự động lưu trước khi khôi phục về ${backupId}`, preHash, JSON.stringify({ bytes: preSnapText.length }), preSnapText, adminUser.email || adminUser.uid).run();

    const statements = [];
    for (const doc of parsed.cmsDocuments) {
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO website_cms_documents(collection_name,doc_id,data_json,is_published,updated_at,updated_by)
           VALUES(?,?,?,?,?,?) ON CONFLICT(collection_name,doc_id) DO UPDATE SET
           data_json=excluded.data_json,is_published=excluded.is_published,updated_at=excluded.updated_at,updated_by=excluded.updated_by`
        ).bind(doc.collection_name, doc.doc_id, doc.data_json, Number(doc.is_published || 0), doc.updated_at || new Date().toISOString(), adminUser.uid)
      );
    }
    for (const f of parsed.forms) {
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO website_forms(id,slug,title,description,program_id,status,version,fields_json,settings_json,updated_at)
           VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,title=excluded.title,description=excluded.description,
           program_id=excluded.program_id,status=excluded.status,version=excluded.version,fields_json=excluded.fields_json,settings_json=excluded.settings_json,updated_at=CURRENT_TIMESTAMP`
        ).bind(f.id, f.slug, f.title, f.description || '', f.program_id || '', f.status || 'draft', Number(f.version || 1), f.fields_json || '[]', f.settings_json || '{}')
      );
    }
    if (statements.length) await context.env.DB.batch(statements);
    await context.env.DB.prepare('INSERT INTO website_admin_audit(actor_uid,target_uid,action,detail) VALUES(?,?,?,?)')
      .bind(adminUser.uid, backupId, 'system.backup.restore', JSON.stringify({ backupId, checksum: actualChecksum, restoredCount: statements.length })).run();
    return json({
      ok: true,
      restored: true,
      integrityVerified: true,
      checksum: actualChecksum,
      restoredStatements: statements.length,
    });
  }

  return json({ ok: false, error: 'Yêu cầu xử lý hệ thống không hợp lệ.' }, { status: 400 });
}

export async function onRequestDelete(context) {
  await ensureSystemSchema(context);
  const denied = await requireAdminToken(context, 'settings.manage');
  if (denied) return denied;
  const u = new URL(context.request.url);
  const action = clean(u.searchParams.get('action'), 60);
  const queryId = clean(u.searchParams.get('id'), 100);
  const body = await context.request.json().catch(() => ({}));
  const manualId = clean(body.manualAnalyticsId || (action === 'analytics-manual' ? queryId : ''), 100);
  if (manualId) {
    await context.env.DB.prepare('DELETE FROM website_analytics_manual WHERE id=?').bind(manualId).run();
    return json({ ok: true });
  }
  if (body.outboxId) {
    await context.env.DB.prepare('DELETE FROM website_email_outbox WHERE id=?').bind(clean(body.outboxId, 100)).run();
    return json({ ok: true });
  }
  return json({ ok: false, error: 'Thiếu tham số xóa.' }, { status: 400 });
}
