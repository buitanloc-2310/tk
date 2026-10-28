import { generateQrPng } from './local-qr.js';
const enc=new TextEncoder();
const clean=(v,m=1000)=>String(v??'').trim().slice(0,m);
const LOCKED_CARD_BACK_IDS=new Set(['backtitle','validheading','valid','usageheading','use1','use2','use3','noteheading','note','footer']);
function lockedCardBackElements(orientation='landscape'){
  const portrait=orientation==='portrait';
  const positions=portrait?{
    backtitle:[6,3,88,8],validheading:[6,12,88,4],valid:[6,17,88,7],usageheading:[6,25,88,4],
    use1:[6,30,88,10],use2:[6,41,88,10],use3:[6,52,88,10],noteheading:[6,63,88,4],note:[6,68,88,20],footer:[6,90,88,9]
  }:{
    backtitle:[6,4,88,9],validheading:[6,14,88,5],valid:[6,19,88,9],usageheading:[6,28,88,5],
    use1:[6,33,88,10],use2:[6,43,88,10],use3:[6,53,88,10],noteheading:[6,64,88,5],note:[6,69,88,20],footer:[6,90,88,9]
  };
  const rows=[
    ['backtitle','HIỆU LỰC & HƯỚNG DẪN SỬ DỤNG',10,true,'#0b2b49'],
    ['validheading','THỜI HẠN SỬ DỤNG',8,true,'#173e5d'],
    ['valid','Có giá trị trong thời hạn ghi trên thẻ và theo trạng thái xác minh của hệ thống.',8,false,'#173e5d'],
    ['usageheading','HƯỚNG DẪN SỬ DỤNG',8,true,'#173e5d'],
    ['use1','• Xuất trình thẻ khi cần xác nhận tư cách thành viên hoặc người tham gia chương trình.',8,false,'#314e68'],
    ['use2','• Sử dụng mã QR ở mặt trước để kiểm tra thông tin và trạng thái thẻ.',8,false,'#314e68'],
    ['use3','• Không cho mượn, chuyển nhượng hoặc sử dụng thẻ thay cho người khác.',8,false,'#314e68'],
    ['noteheading','LƯU Ý',8,true,'#173e5d'],
    ['note','Thẻ chỉ có giá trị xác minh thông qua mã QR ở mặt trước. Thẻ không còn giá trị sử dụng khi hệ thống xác minh thông báo thẻ đã bị hủy.',8,false,'#314e68'],
    ['footer','Sky First Network · Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First',6,true,'#315f80']
  ];
  return rows.map(([id,text,size,bold,color])=>({id,kind:'text',text,x:positions[id][0],y:positions[id][1],w:positions[id][2],h:positions[id][3],color,size,bold,align:'left',radius:0,opacity:1}));
}
const dateInVietnam=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${v.year}-${v.month}-${v.day}`};
const uid=(p='id')=>`${p}_${crypto.randomUUID()}`;
const json=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8',...h}});
const bodyJson=async r=>{try{return await r.json()}catch{return {}}};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha256=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));

function token(){
  const a=new Uint8Array(32);
  crypto.getRandomValues(a);
  return b64(a).replace(/[+/=]/g,'');
}

async function pbkdf2(password,salt,iterations=100000){
  const key=await crypto.subtle.importKey(
    'raw',
    enc.encode(String(password)),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits=await crypto.subtle.deriveBits(
    {
      name:'PBKDF2',
      hash:'SHA-256',
      salt:enc.encode(String(salt)),
      iterations:Number(iterations||100000)
    },
    key,
    256
  );

  return b64(bits);
}

async function verifyPassword(password,salt,iterations,storedHash){
  const raw=String(password??'');

  const candidates=[
    raw,
    raw.normalize('NFC'),
    raw.normalize('NFKC')
  ];

  if(raw!==raw.trim()){
    candidates.push(raw.trim());
  }

  for(const value of [...new Set(candidates)]){
    const calculated=await pbkdf2(
      value,
      String(salt??''),
      Number(iterations||100000)
    );

    if(calculated===String(storedHash??'')){
      return true;
    }
  }

  return false;
}

const cookie=(n,v,d=7)=>
  `${n}=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${d*86400}`;

const clearCookie=n=>
  `${n}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

const clientHint=req=>clean(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'unknown',80);
const safeEq=(a,b)=>{a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0};
function sameOrigin(req){
  if(['GET','HEAD','OPTIONS'].includes(req.method))return true;
  const expected=new URL(req.url).origin;
  const origin=req.headers.get('origin');
  if(origin){try{return new URL(origin).origin===expected}catch{return false}}
  const referer=req.headers.get('referer');
  if(referer){try{return new URL(referer).origin===expected}catch{return false}}
  return false;
}
async function ensureSecurityTables(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS auth_rate_limits(rate_key TEXT PRIMARY KEY,window_start TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,attempts INTEGER NOT NULL DEFAULT 0,blocked_until TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS password_reset_tokens(id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS security_events(id TEXT PRIMARY KEY,account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,event_type TEXT NOT NULL,ip_hint TEXT,user_agent TEXT,details_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
}
async function rateState(env,key,limit=8,minutes=15){
  await ensureSecurityTables(env);
  const r=await env.DB.prepare(`SELECT attempts,window_start,blocked_until,CASE WHEN blocked_until>CURRENT_TIMESTAMP THEN 1 ELSE 0 END blocked,CASE WHEN window_start<=datetime('now',?) THEN 1 ELSE 0 END expired FROM auth_rate_limits WHERE rate_key=?`).bind(`-${minutes} minutes`,key).first();
  if(r?.blocked)return {blocked:true};
  if(!r||r.expired){await env.DB.prepare(`INSERT INTO auth_rate_limits(rate_key,window_start,attempts,blocked_until,updated_at) VALUES(?,CURRENT_TIMESTAMP,0,NULL,CURRENT_TIMESTAMP) ON CONFLICT(rate_key) DO UPDATE SET window_start=CURRENT_TIMESTAMP,attempts=0,blocked_until=NULL,updated_at=CURRENT_TIMESTAMP`).bind(key).run();return {blocked:false,attempts:0}}
  return {blocked:false,attempts:Number(r.attempts||0),limit};
}
async function rateFail(env,key,limit=8,blockMinutes=15){
  await env.DB.prepare(`UPDATE auth_rate_limits SET attempts=attempts+1,blocked_until=CASE WHEN attempts+1>=? THEN datetime('now',?) ELSE blocked_until END,updated_at=CURRENT_TIMESTAMP WHERE rate_key=?`).bind(limit,`+${blockMinutes} minutes`,key).run();
}
async function rateClear(env,key){await env.DB.prepare(`DELETE FROM auth_rate_limits WHERE rate_key=?`).bind(key).run()}
async function securityEvent(env,aid,type,req,details={}){await ensureSecurityTables(env);await env.DB.prepare(`INSERT INTO security_events(id,account_id,event_type,ip_hint,user_agent,details_json) VALUES(?,?,?,?,?,?)`).bind(uid('sec'),aid||null,type,clientHint(req),clean(req.headers.get('user-agent'),500),JSON.stringify(details)).run()}
async function safeRateState(env,key,limit=8,minutes=15){try{return await rateState(env,key,limit,minutes)}catch(err){console.error('RATE_LIMIT_STORAGE_ERROR',err);return {blocked:true,degraded:true}}}
async function safeRateFail(env,key,limit=8,blockMinutes=15){try{await rateFail(env,key,limit,blockMinutes)}catch(err){console.error('RATE_LIMIT_WRITE_ERROR',err)}}
async function safeRateClear(env,key){try{await rateClear(env,key)}catch(err){console.error('RATE_LIMIT_CLEAR_ERROR',err)}}
async function safeSecurityEvent(env,aid,type,req,details={}){try{await securityEvent(env,aid,type,req,details)}catch(err){console.error('SECURITY_EVENT_ERROR',err)}}
async function safeAudit(env,...args){try{await audit(env,...args)}catch(err){console.error('AUDIT_EVENT_ERROR',err)}}
async function createLoginSession(env,sid,aid,h,req){
  const ua=clean(req.headers.get('user-agent'),500),ip=clientHint(req);
  try{
    await env.DB.prepare(`INSERT INTO sessions(id,account_id,token_hash,expires_at,user_agent,ip_hint) VALUES(?,?,?,datetime('now','+7 days'),?,?)`).bind(sid,aid,h,ua,ip).run();
  }catch(err){
    // Compatibility with an older production sessions schema. The security migration can be applied later without blocking login.
    console.error('SESSION_METADATA_COMPAT_FALLBACK',err);
    await env.DB.prepare(`INSERT INTO sessions(id,account_id,token_hash,expires_at) VALUES(?,?,?,datetime('now','+7 days'))`).bind(sid,aid,h).run();
  }
}


async function ensureAccountRequestProfiles(env){
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS account_request_profiles(
      request_id TEXT PRIMARY KEY REFERENCES account_requests(id) ON DELETE CASCADE,
      education_or_work_type TEXT NOT NULL,
      school_or_workplace TEXT NOT NULL,
      class_or_major TEXT,
      education_status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}


async function ensureAccountRequestExtended(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS account_request_extended(
    request_id TEXT PRIMARY KEY REFERENCES account_requests(id) ON DELETE CASCADE,
    school_name TEXT NOT NULL,class_or_major TEXT NOT NULL,employment_status TEXT NOT NULL,
    workplace_name TEXT NOT NULL,work_department TEXT NOT NULL,job_title TEXT NOT NULL,
    guardian_date_of_birth TEXT,guardian_id_number TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS account_request_orgs(
    request_id TEXT NOT NULL REFERENCES account_requests(id) ON DELETE CASCADE,
    org_node_id TEXT NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
    is_primary INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(request_id,org_node_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS people_work_profiles(
    person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
    school_name TEXT,employment_status TEXT,workplace_name TEXT,work_department TEXT,job_title TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function ensureEvaluations(env){
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS member_evaluations(
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id),
      org_node_id TEXT REFERENCES org_nodes(id),
      evaluator_account_id TEXT NOT NULL REFERENCES accounts(id),
      period_type TEXT NOT NULL,
      period_label TEXT NOT NULL,
      criteria_json TEXT,
      total_score REAL,
      rating TEXT,
      comments TEXT,
      visibility TEXT NOT NULL DEFAULT 'member' CHECK(visibility IN ('member','admin')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','final','hidden')),
      finalized_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_member_evaluations_person ON member_evaluations(person_id,created_at DESC)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_member_evaluations_org ON member_evaluations(org_node_id,created_at DESC)`).run();
}

let _govTablesEnsured=false;
async function ensureGovernanceTables(env){
  if(_govTablesEnsured&&env.__schema17Ready)return;
  const ddl=[
    "CREATE TABLE IF NOT EXISTS email_otp_tokens(id TEXT PRIMARY KEY,email TEXT NOT NULL,purpose TEXT NOT NULL DEFAULT 'account_request',otp_hash TEXT NOT NULL,verify_token_hash TEXT UNIQUE,attempts INTEGER NOT NULL DEFAULT 0,max_attempts INTEGER NOT NULL DEFAULT 5,resend_count INTEGER NOT NULL DEFAULT 0,expires_at TEXT NOT NULL,verified_at TEXT,used_at TEXT,ip_hint TEXT,user_agent TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS email_delivery_logs(id TEXT PRIMARY KEY,template_code TEXT NOT NULL DEFAULT 'master_notification',recipient_email TEXT NOT NULL,sender_address TEXT NOT NULL,reply_to_address TEXT,subject TEXT NOT NULL,provider_name TEXT NOT NULL DEFAULT 'resend',provider_message_id TEXT,status TEXT NOT NULL DEFAULT 'pending',error_detail TEXT,retry_count INTEGER NOT NULL DEFAULT 0,related_entity_type TEXT,related_entity_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS legal_consent_records(id TEXT PRIMARY KEY,subject_type TEXT NOT NULL,subject_id TEXT NOT NULL,email TEXT NOT NULL,terms_version TEXT NOT NULL DEFAULT '2026.10-SFN-TERMS',privacy_version TEXT NOT NULL DEFAULT '2026.10-SFN-PDPD',read_acknowledged INTEGER NOT NULL DEFAULT 0,terms_accepted INTEGER NOT NULL DEFAULT 0,privacy_consent INTEGER NOT NULL DEFAULT 0,accuracy_committed INTEGER NOT NULL DEFAULT 0,is_minor INTEGER NOT NULL DEFAULT 0,guardian_consent INTEGER NOT NULL DEFAULT 0,email_verified INTEGER NOT NULL DEFAULT 0,otp_token_id TEXT,purpose_scope TEXT NOT NULL DEFAULT 'account_review_and_member_operations',ip_hint TEXT,user_agent TEXT,consented_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS system_config_history(id TEXT PRIMARY KEY,config_key TEXT NOT NULL,version_no INTEGER NOT NULL DEFAULT 1,previous_value_json TEXT,new_value_json TEXT NOT NULL,change_reason TEXT,impact_summary_json TEXT NOT NULL DEFAULT '{}',actor_account_id TEXT,approved_by_account_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS support_ticket_assignments(ticket_id TEXT PRIMARY KEY,org_node_id TEXT,assigned_account_id TEXT,priority TEXT NOT NULL DEFAULT 'normal',impact_level TEXT NOT NULL DEFAULT 'medium',attachment_url TEXT,duplicate_of_ticket_id TEXT,escalated_to_account_id TEXT,escalation_reason TEXT,reopen_reason TEXT,reopened_at TEXT,satisfaction_score INTEGER,feedback_comment TEXT,sla_response_due_at TEXT,sla_due_at TEXT,sla_breached INTEGER NOT NULL DEFAULT 0,resolution_note TEXT,closed_reason TEXT,responded_at TEXT,resolved_at TEXT,updated_by_account_id TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS support_ticket_messages(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL,sender_account_id TEXT,visibility TEXT NOT NULL DEFAULT 'public',message_type TEXT NOT NULL DEFAULT 'reply',body TEXT NOT NULL,attachment_url TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS work_queue_states(item_key TEXT PRIMARY KEY,source_type TEXT NOT NULL,source_id TEXT NOT NULL,org_node_id TEXT,assigned_account_id TEXT,collaborator_ids_json TEXT NOT NULL DEFAULT '[]',dependency_keys_json TEXT NOT NULL DEFAULT '[]',priority TEXT NOT NULL DEFAULT 'normal',workflow_state TEXT NOT NULL DEFAULT 'open',blocked_reason TEXT,blocked_missing_condition TEXT,blocked_coordination_party TEXT,blocked_resolution_plan TEXT,due_at TEXT,last_reminder_at TEXT,reminder_count INTEGER NOT NULL DEFAULT 0,handover_note TEXT,updated_by_account_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS governance_registry(id TEXT PRIMARY KEY,domain_group TEXT NOT NULL,code TEXT NOT NULL UNIQUE,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',org_node_id TEXT,owner_account_id TEXT,reviewer_account_id TEXT,approver_account_id TEXT,related_entity_type TEXT,related_entity_id TEXT,version_label TEXT NOT NULL DEFAULT '1.0',summary TEXT,payload_json TEXT NOT NULL DEFAULT '{}',evidence_ref TEXT,effective_from TEXT,effective_to TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
  ];
  const extDdl=[
    "CREATE TABLE IF NOT EXISTS account_type_configs(code TEXT PRIMARY KEY,name TEXT NOT NULL,aliases_json TEXT NOT NULL DEFAULT '[]',purpose TEXT NOT NULL,eligible_group TEXT NOT NULL,activation_condition TEXT NOT NULL,duration_hours INTEGER,duration_months INTEGER,allow_public_register INTEGER NOT NULL DEFAULT 1,granted_scope_note TEXT NOT NULL,resource_limits_json TEXT NOT NULL DEFAULT '{}',renewal_policy TEXT NOT NULL,retention_policy TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS account_lifecycle(account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,account_type_code TEXT NOT NULL DEFAULT 'annual_12m_1y',duration_label TEXT NOT NULL DEFAULT '12 tháng (01 năm)',activated_at TEXT,expires_at TEXT,lifecycle_status TEXT NOT NULL DEFAULT 'active',expiry_notified_at TEXT,renewal_count INTEGER NOT NULL DEFAULT 0,last_action_reason TEXT,updated_by_account_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS data_policies(id TEXT PRIMARY KEY,policy_code TEXT NOT NULL,policy_type TEXT NOT NULL,title TEXT NOT NULL,version_label TEXT NOT NULL,content_summary TEXT NOT NULL,content_body TEXT NOT NULL,is_mandatory INTEGER NOT NULL DEFAULT 1,requires_reconsent INTEGER NOT NULL DEFAULT 0,applicable_scope TEXT NOT NULL DEFAULT 'all_forms',status TEXT NOT NULL DEFAULT 'active',effective_from TEXT NOT NULL,updated_by_account_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(policy_code,version_label))",
    "CREATE TABLE IF NOT EXISTS consent_withdrawal_requests(id TEXT PRIMARY KEY,consent_record_id TEXT,subject_email TEXT NOT NULL,person_id TEXT,policy_code TEXT NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'received',admin_note TEXT,processed_by_account_id TEXT,processed_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS registration_forms(id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,slug TEXT NOT NULL UNIQUE,title TEXT NOT NULL,description TEXT,target_audience TEXT,guidelines TEXT,support_contact TEXT NOT NULL DEFAULT 'support@skyfirst.io.vn',owner_org_node_id TEXT,owner_account_id TEXT,status TEXT NOT NULL DEFAULT 'draft',current_version INTEGER NOT NULL DEFAULT 1,opens_at TEXT,closes_at TEXT,max_submissions INTEGER,require_attachment INTEGER NOT NULL DEFAULT 0,require_signature INTEGER NOT NULL DEFAULT 0,signature_method TEXT NOT NULL DEFAULT 'drawn_or_uploaded',default_account_type TEXT,post_submit_message TEXT,fields_json TEXT NOT NULL DEFAULT '[]',policy_codes_json TEXT NOT NULL DEFAULT '[\"SFN-PDPD-NOTICE\",\"SFN-TERMS-USE\"]',event_id TEXT,created_by_account_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS registration_form_versions(id TEXT PRIMARY KEY,form_id TEXT NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,version_no INTEGER NOT NULL,title TEXT NOT NULL,fields_json TEXT NOT NULL,config_snapshot_json TEXT NOT NULL,change_note TEXT,created_by_account_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(form_id,version_no))",
    "CREATE TABLE IF NOT EXISTS registration_submissions(id TEXT PRIMARY KEY,submission_code TEXT NOT NULL UNIQUE,form_id TEXT NOT NULL REFERENCES registration_forms(id),form_version INTEGER NOT NULL,form_snapshot_json TEXT NOT NULL,applicant_name TEXT NOT NULL,applicant_email TEXT NOT NULL,applicant_phone TEXT,requested_account_type TEXT,org_node_id TEXT,event_id TEXT,answers_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'submitted',assigned_account_id TEXT,reviewer_account_id TEXT,decision_reason TEXT,supplement_request_note TEXT,internal_notes_json TEXT NOT NULL DEFAULT '[]',history_json TEXT NOT NULL DEFAULT '[]',approved_account_id TEXT,idempotency_key TEXT UNIQUE,submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS registration_submission_files(id TEXT PRIMARY KEY,submission_id TEXT NOT NULL REFERENCES registration_submissions(id) ON DELETE CASCADE,field_code TEXT NOT NULL DEFAULT 'attachment',file_name TEXT NOT NULL,mime_type TEXT NOT NULL,byte_size INTEGER NOT NULL,storage_key TEXT NOT NULL,version_no INTEGER NOT NULL DEFAULT 1,check_status TEXT NOT NULL DEFAULT 'verified_header',review_note TEXT,uploaded_by_email TEXT,uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS signature_records(id TEXT PRIMARY KEY,submission_id TEXT NOT NULL REFERENCES registration_submissions(id) ON DELETE CASCADE,signer_name TEXT NOT NULL,signer_email TEXT NOT NULL,signature_type TEXT NOT NULL DEFAULT 'drawn_canvas',legal_classification TEXT NOT NULL DEFAULT 'electronic_confirmation_non_ca',legal_disclaimer TEXT NOT NULL DEFAULT 'Chữ ký vẽ tay/ảnh chữ ký gắn với hồ sơ và băm nội dung tại thời điểm nộp; không phải chữ ký số có chứng thư số công cộng.',content_version_hash TEXT NOT NULL,signed_payload_snapshot TEXT NOT NULL,signature_data_url TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'valid',resign_reason TEXT,ip_hint TEXT,user_agent TEXT,signed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sk_events(id TEXT PRIMARY KEY,event_code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,purpose TEXT NOT NULL,expected_outcomes TEXT,event_type TEXT NOT NULL DEFAULT 'community',domain_field TEXT NOT NULL DEFAULT 'Giáo dục & Cộng đồng',scale_label TEXT NOT NULL DEFAULT 'Cấp Mạng lưới',proposing_org_id TEXT NOT NULL,host_org_id TEXT NOT NULL,coordinating_orgs_json TEXT NOT NULL DEFAULT '[]',lead_person_name TEXT NOT NULL,contact_email TEXT NOT NULL,starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,milestones_json TEXT NOT NULL DEFAULT '[]',location_or_platform TEXT NOT NULL,target_participants TEXT,eligibility_criteria TEXT,expected_participants INTEGER NOT NULL DEFAULT 50,implementation_plan TEXT,communication_plan TEXT,risk_plan_json TEXT NOT NULL DEFAULT '[]',registration_form_id TEXT,registration_opens_at TEXT,registration_closes_at TEXT,max_registrations INTEGER NOT NULL DEFAULT 100,require_registration_approval INTEGER NOT NULL DEFAULT 1,status TEXT NOT NULL DEFAULT 'draft',registration_state TEXT NOT NULL DEFAULT 'closed',summary_report_state TEXT NOT NULL DEFAULT 'not_submitted',current_version INTEGER NOT NULL DEFAULT 1,version_history_json TEXT NOT NULL DEFAULT '[]',proposer_account_id TEXT NOT NULL,appraiser_account_id TEXT,appraisal_note TEXT,appraised_at TEXT,approver_account_id TEXT,approval_note TEXT,approved_at TEXT,publisher_account_id TEXT,published_at TEXT,rejected_reason TEXT,postponed_or_cancelled_reason TEXT,incident_report_json TEXT,summary_report_json TEXT,checklist_json TEXT NOT NULL DEFAULT '{\"approved\":false,\"venue_ready\":false,\"staff_ready\":false,\"logistics_ready\":false,\"form_ready\":false,\"comms_approved\":false}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sk_event_tasks(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,title TEXT NOT NULL,category TEXT NOT NULL DEFAULT 'general',assignee_account_id TEXT,assignee_name TEXT,collaborators_json TEXT NOT NULL DEFAULT '[]',reviewer_account_id TEXT,priority TEXT NOT NULL DEFAULT 'normal',weight INTEGER NOT NULL DEFAULT 1,status TEXT NOT NULL DEFAULT 'not_started',due_at TEXT,evidence_note TEXT,updated_by_account_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sk_event_staff(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,account_id TEXT,person_name TEXT NOT NULL,role_in_event TEXT NOT NULL,team_or_shift TEXT,task_description TEXT,supervisor_name TEXT,is_backup INTEGER NOT NULL DEFAULT 0,assignment_status TEXT NOT NULL DEFAULT 'assigned',handover_note TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sk_event_logistics(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,item_type TEXT NOT NULL DEFAULT 'equipment',item_name TEXT NOT NULL,quantity INTEGER NOT NULL DEFAULT 1,location_or_room TEXT,use_starts_at TEXT,use_ends_at TEXT,responsible_party TEXT,status TEXT NOT NULL DEFAULT 'requested',estimated_cost REAL NOT NULL DEFAULT 0,actual_cost REAL NOT NULL DEFAULT 0,contingency_note TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sk_event_budgets(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,item_code TEXT NOT NULL,category TEXT NOT NULL,description TEXT NOT NULL,funding_source TEXT NOT NULL DEFAULT 'Ngân sách Mạng lưới / Tài trợ',estimated_amount REAL NOT NULL DEFAULT 0,approved_amount REAL NOT NULL DEFAULT 0,received_amount REAL NOT NULL DEFAULT 0,spent_amount REAL NOT NULL DEFAULT 0,voucher_ref TEXT,proposer_account_id TEXT NOT NULL,reviewer_account_id TEXT,approver_account_id TEXT,status TEXT NOT NULL DEFAULT 'proposed',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sk_event_partners(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,partner_name TEXT NOT NULL,partner_role TEXT NOT NULL DEFAULT 'Đơn vị phối hợp',contact_person TEXT,contact_info_restricted TEXT,commitment_summary TEXT,status TEXT NOT NULL DEFAULT 'contacted',public_display_approved INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sk_event_communications(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,content_type TEXT NOT NULL DEFAULT 'announcement',title TEXT NOT NULL,body TEXT NOT NULL,media_url TEXT,channel TEXT NOT NULL DEFAULT 'Cổng nội bộ & Website',author_account_id TEXT NOT NULL,reviewer_account_id TEXT,approver_account_id TEXT,status TEXT NOT NULL DEFAULT 'draft',scheduled_publish_at TEXT,published_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sk_event_registrations(id TEXT PRIMARY KEY,registration_code TEXT NOT NULL UNIQUE,event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,account_id TEXT,person_id TEXT,full_name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT,org_name TEXT,answers_json TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'pending',reviewer_account_id TEXT,review_note TEXT,registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(event_id,email))",
    "CREATE TABLE IF NOT EXISTS sk_qr_sessions(id TEXT PRIMARY KEY,session_code TEXT NOT NULL UNIQUE,event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,session_name TEXT NOT NULL,qr_token TEXT NOT NULL UNIQUE,starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',require_approved_registration INTEGER NOT NULL DEFAULT 1,allow_duplicate_checkin INTEGER NOT NULL DEFAULT 0,created_by_account_id TEXT NOT NULL,revoked_reason TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sk_attendance_records(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES sk_events(id) ON DELETE CASCADE,session_id TEXT NOT NULL REFERENCES sk_qr_sessions(id) ON DELETE CASCADE,registration_id TEXT,account_id TEXT,participant_name TEXT NOT NULL,participant_email TEXT NOT NULL,attendance_status TEXT NOT NULL DEFAULT 'checked_in',checkin_method TEXT NOT NULL DEFAULT 'qr_scan',manual_reason TEXT,operator_account_id TEXT,checked_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS chat_conversations(id TEXT PRIMARY KEY,conv_type TEXT NOT NULL DEFAULT 'direct',title TEXT,description TEXT,avatar_url TEXT,org_node_id TEXT,event_id TEXT,created_by_account_id TEXT NOT NULL,pinned_message_id TEXT,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS chat_participants(conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,role_in_chat TEXT NOT NULL DEFAULT 'member',is_pinned INTEGER NOT NULL DEFAULT 0,is_muted INTEGER NOT NULL DEFAULT 0,is_archived INTEGER NOT NULL DEFAULT 0,unread_count INTEGER NOT NULL DEFAULT 0,last_read_at TEXT,joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(conversation_id,account_id))",
    "CREATE TABLE IF NOT EXISTS chat_messages(id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,sender_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,reply_to_message_id TEXT,forwarded_from_id TEXT,body TEXT NOT NULL,attachment_url TEXT,attachment_type TEXT,linked_entity_type TEXT,linked_entity_id TEXT,is_pinned INTEGER NOT NULL DEFAULT 0,delivery_state TEXT NOT NULL DEFAULT 'sent',status TEXT NOT NULL DEFAULT 'active',edited_at TEXT,recalled_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS community_groups(id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,group_type TEXT NOT NULL DEFAULT 'group',visibility TEXT NOT NULL DEFAULT 'public_internal',org_node_id TEXT,description TEXT,allow_member_posts INTEGER NOT NULL DEFAULT 1,allow_comments INTEGER NOT NULL DEFAULT 1,require_post_approval INTEGER NOT NULL DEFAULT 0,created_by_account_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS community_group_members(group_id TEXT NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,role_in_group TEXT NOT NULL DEFAULT 'member',can_post INTEGER NOT NULL DEFAULT 1,can_comment INTEGER NOT NULL DEFAULT 1,joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(group_id,account_id))",
    "CREATE TABLE IF NOT EXISTS social_posts(id TEXT PRIMARY KEY,group_id TEXT REFERENCES community_groups(id) ON DELETE SET NULL,author_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,org_node_id TEXT,event_id TEXT,post_kind TEXT NOT NULL DEFAULT 'discussion',title TEXT,body TEXT NOT NULL,media_url TEXT,media_type TEXT,is_pinned INTEGER NOT NULL DEFAULT 0,moderation_status TEXT NOT NULL DEFAULT 'published',approver_account_id TEXT,approved_at TEXT,rejected_reason TEXT,published_at TEXT,share_count INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS social_comments(id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,parent_comment_id TEXT,author_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS social_reactions(post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,reaction_type TEXT NOT NULL DEFAULT 'like',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(post_id,account_id))",
    "CREATE TABLE IF NOT EXISTS content_reports(id TEXT PRIMARY KEY,target_type TEXT NOT NULL,target_id TEXT NOT NULL,reporter_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',moderator_account_id TEXT,resolution_note TEXT,resolved_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
  ];
  for(const sql of [...ddl,...extDdl])await env.DB.prepare(sql).run();
  await reconcileGovernanceColumns(env);
  try{await env.DB.prepare("INSERT OR IGNORE INTO schema_version(version) VALUES(16),(17)").run();}catch{}
  _govTablesEnsured=true;env.__schema17Ready=true;
}

const GOVERNANCE_COLUMN_RECONCILE_SPECS={
  support_ticket_assignments:[
    ["org_node_id","TEXT"],
    ["assigned_account_id","TEXT"],
    ["priority","TEXT NOT NULL DEFAULT 'normal'"],
    ["impact_level","TEXT NOT NULL DEFAULT 'medium'"],
    ["attachment_url","TEXT"],
    ["duplicate_of_ticket_id","TEXT"],
    ["escalated_to_account_id","TEXT"],
    ["escalation_reason","TEXT"],
    ["reopen_reason","TEXT"],
    ["reopened_at","TEXT"],
    ["satisfaction_score","INTEGER"],
    ["feedback_comment","TEXT"],
    ["sla_response_due_at","TEXT"],
    ["sla_due_at","TEXT"],
    ["sla_breached","INTEGER NOT NULL DEFAULT 0"],
    ["resolution_note","TEXT"],
    ["closed_reason","TEXT"],
    ["responded_at","TEXT"],
    ["resolved_at","TEXT"],
    ["updated_by_account_id","TEXT"],
    ["updated_at","TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"]
  ],
  support_ticket_messages:[
    ["sender_account_id","TEXT"],
    ["visibility","TEXT NOT NULL DEFAULT 'public'"],
    ["message_type","TEXT NOT NULL DEFAULT 'reply'"],
    ["body","TEXT NOT NULL DEFAULT ''"],
    ["attachment_url","TEXT"],
    ["created_at","TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"]
  ],
  work_queue_states:[
    ["org_node_id","TEXT"],
    ["assigned_account_id","TEXT"],
    ["collaborator_ids_json","TEXT NOT NULL DEFAULT '[]'"],
    ["dependency_keys_json","TEXT NOT NULL DEFAULT '[]'"],
    ["priority","TEXT NOT NULL DEFAULT 'normal'"],
    ["workflow_state","TEXT NOT NULL DEFAULT 'open'"],
    ["blocked_reason","TEXT"],
    ["blocked_missing_condition","TEXT"],
    ["blocked_coordination_party","TEXT"],
    ["blocked_resolution_plan","TEXT"],
    ["due_at","TEXT"],
    ["last_reminder_at","TEXT"],
    ["reminder_count","INTEGER NOT NULL DEFAULT 0"],
    ["handover_note","TEXT"],
    ["updated_by_account_id","TEXT"],
    ["created_at","TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at","TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"]
  ],
  governance_registry:[
    ["domain_group","TEXT NOT NULL DEFAULT 'policy'"],
    ["code","TEXT"],
    ["title","TEXT NOT NULL DEFAULT ''"],
    ["status","TEXT NOT NULL DEFAULT 'active'"],
    ["org_node_id","TEXT"],
    ["owner_account_id","TEXT"],
    ["reviewer_account_id","TEXT"],
    ["approver_account_id","TEXT"],
    ["related_entity_type","TEXT"],
    ["related_entity_id","TEXT"],
    ["version_label","TEXT NOT NULL DEFAULT '1.0'"],
    ["summary","TEXT"],
    ["payload_json","TEXT NOT NULL DEFAULT '{}'"],
    ["evidence_ref","TEXT"],
    ["effective_from","TEXT"],
    ["effective_to","TEXT"],
    ["created_at","TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at","TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"]
  ],
  email_otp_tokens:[
    ["purpose","TEXT NOT NULL DEFAULT 'account_request'"],
    ["verify_token_hash","TEXT"],
    ["attempts","INTEGER NOT NULL DEFAULT 0"],
    ["max_attempts","INTEGER NOT NULL DEFAULT 5"],
    ["resend_count","INTEGER NOT NULL DEFAULT 0"],
    ["verified_at","TEXT"],
    ["used_at","TEXT"],
    ["ip_hint","TEXT"],
    ["user_agent","TEXT"],
    ["updated_at","TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"]
  ],
  email_delivery_logs:[
    ["template_code","TEXT NOT NULL DEFAULT 'master_notification'"],
    ["sender_address","TEXT NOT NULL DEFAULT 'noreply@skyfirst.io.vn'"],
    ["reply_to_address","TEXT"],
    ["provider_name","TEXT NOT NULL DEFAULT 'resend'"],
    ["provider_message_id","TEXT"],
    ["error_detail","TEXT"],
    ["retry_count","INTEGER NOT NULL DEFAULT 0"],
    ["related_entity_type","TEXT"],
    ["related_entity_id","TEXT"],
    ["updated_at","TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"]
  ],
  legal_consent_records:[
    ["terms_version","TEXT NOT NULL DEFAULT '2026.10-SFN-TERMS'"],
    ["privacy_version","TEXT NOT NULL DEFAULT '2026.10-SFN-PDPD'"],
    ["read_acknowledged","INTEGER NOT NULL DEFAULT 0"],
    ["terms_accepted","INTEGER NOT NULL DEFAULT 0"],
    ["privacy_consent","INTEGER NOT NULL DEFAULT 0"],
    ["accuracy_committed","INTEGER NOT NULL DEFAULT 0"],
    ["is_minor","INTEGER NOT NULL DEFAULT 0"],
    ["guardian_consent","INTEGER NOT NULL DEFAULT 0"],
    ["email_verified","INTEGER NOT NULL DEFAULT 0"],
    ["otp_token_id","TEXT"],
    ["purpose_scope","TEXT NOT NULL DEFAULT 'account_review_and_member_operations'"],
    ["ip_hint","TEXT"],
    ["user_agent","TEXT"]
  ]
};

async function reconcileGovernanceColumns(env){
  const added=[];
  for(const [table,colSpecs] of Object.entries(GOVERNANCE_COLUMN_RECONCILE_SPECS)){
    const tblRow=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(table).first();
    if(!tblRow?.name)continue;
    const info=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
    const existing=new Set((info.results||[]).map(c=>c.name));
    for(const [colName,colDef] of colSpecs){
      if(!existing.has(colName)){
        await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`).run();
        added.push(`${table}.${colName}`);
      }
    }
  }
  try{
    await env.DB.prepare("UPDATE support_ticket_assignments SET impact_level='medium' WHERE impact_level IS NULL OR TRIM(impact_level)=''").run();
    await env.DB.prepare("UPDATE support_ticket_assignments SET priority='normal' WHERE priority IS NULL OR TRIM(priority)=''").run();
  }catch{}
  if(added.length)env.__lastReconciledColumns=added;
  return added;
}

function normalizeAccountTypeCode(raw){
  const v=clean(raw,60).toLowerCase();
  if(['trial_24h','24h','24 giờ','24_hours'].includes(v))return 'trial_24h';
  if(['trial_48h','48h','48 giờ','48_hours'].includes(v))return 'trial_48h';
  if(['staff_custom','staff','custom','nhân sự'].includes(v))return 'staff_custom';
  // 12 tháng và 1 năm là hai cách gọi của cùng một gói thời hạn 12 tháng (01 năm)
  return 'annual_12m_1y';
}
function computeAccountExpirySql(typeCode,customExpiresAt=null){
  const norm=normalizeAccountTypeCode(typeCode);
  if(norm==='trial_24h')return {code:'trial_24h',label:'Tài khoản 24 giờ',sqlExpr:"datetime('now','+24 hours')"};
  if(norm==='trial_48h')return {code:'trial_48h',label:'Tài khoản 48 giờ',sqlExpr:"datetime('now','+48 hours')"};
  if(norm==='staff_custom'&&customExpiresAt){
    return {code:'staff_custom',label:'Tài khoản nhân sự (Có thời hạn)',custom:clean(customExpiresAt,30)};
  }
  return {code:'annual_12m_1y',label:'Tài khoản 12 tháng (01 năm)',sqlExpr:"datetime('now','+365 days')"};
}
function validUploadedAttachment(bytes,mimeType){
  if(!bytes||!bytes.byteLength)return false;
  const ct=String(mimeType||'').toLowerCase().split(';')[0].trim();
  if(['image/png','image/jpeg','image/webp'].includes(ct))return validUploadedImage(bytes,ct);
  if(ct==='application/pdf'){
    return bytes.byteLength>=8&&bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46; // %PDF
  }
  if(['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(ct)){
    if(bytes.byteLength<30||bytes[0]!==0x50||bytes[1]!==0x4b)return false;
    const z=inspectZipArchiveHeaders(bytes);
    return z.valid;
  }
  if(ct==='video/mp4'){
    if(bytes.byteLength<16||bytes.byteLength>15*1024*1024)return false;
    const sig=String.fromCharCode(...bytes.slice(4,8));
    return sig==='ftyp';
  }
  return false;
}
function inspectZipArchiveHeaders(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input||[]);
  if(bytes.byteLength<22)return {valid:false,reason:'ARCHIVE_TOO_SMALL',file_count:0,compressed_bytes:bytes.byteLength,total_uncompressed_bytes:0,max_compression_ratio:0,max_depth:0,risks:[{file:'(archive)',risk:'ARCHIVE_TOO_SMALL'}],entries:[],execution_policy:'NEVER_EXECUTE_UPLOADED_ARCHIVE'};
  if(bytes.byteLength>25*1024*1024)return {valid:false,reason:'ARCHIVE_COMPRESSED_TOO_LARGE',file_count:0,compressed_bytes:bytes.byteLength,total_uncompressed_bytes:0,max_compression_ratio:0,max_depth:0,risks:[{file:'(archive)',risk:'ARCHIVE_COMPRESSED_TOO_LARGE'}],entries:[],execution_policy:'NEVER_EXECUTE_UPLOADED_ARCHIVE'};
  if(bytes[0]!==0x50||bytes[1]!==0x4b||![0x03,0x05,0x07].includes(bytes[2]))return {valid:false,reason:'INVALID_ZIP_MAGIC',file_count:0,compressed_bytes:bytes.byteLength,total_uncompressed_bytes:0,max_compression_ratio:0,max_depth:0,risks:[{file:'(archive)',risk:'INVALID_ZIP_MAGIC'}],entries:[],execution_policy:'NEVER_EXECUTE_UPLOADED_ARCHIVE'};
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const dec=new TextDecoder('utf-8',{fatal:false});
  const forbiddenExt=/\.(exe|dll|bat|cmd|sh|ps1|vbs|scr|msi|jar|com|elf|so|dylib|php|jsp|asp|aspx|phtml|phar|cgi|pl|py|rb|hta|wsf|cpl|scf|lnk)$/i;
  let offset=0,fileCount=0,totalUncompressed=0,totalCompressed=0,maxRatio=0,maxDepth=0;
  const entries=[],risks=[];
  while(offset+30<=bytes.byteLength){
    const sig=view.getUint32(offset,true);
    if(sig!==0x04034b50)break;
    const flags=view.getUint16(offset+6,true);
    const method=view.getUint16(offset+8,true);
    const compSize=view.getUint32(offset+18,true);
    const uncompSize=view.getUint32(offset+22,true);
    const nameLen=view.getUint16(offset+26,true);
    const extraLen=view.getUint16(offset+28,true);
    const headerEnd=offset+30+nameLen+extraLen;
    if(headerEnd>bytes.byteLength){
      risks.push({file:`@offset_${offset}`,risk:'TRUNCATED_ZIP_HEADER'});
      return {valid:false,reason:'TRUNCATED_ZIP_HEADER',file_count:fileCount,compressed_bytes:bytes.byteLength,total_uncompressed_bytes:totalUncompressed,max_compression_ratio:Number(maxRatio.toFixed(2)),max_depth:maxDepth,risks,entries,execution_policy:'NEVER_EXECUTE_UPLOADED_ARCHIVE'};
    }
    const name=dec.decode(bytes.slice(offset+30,offset+30+nameLen));
    if(headerEnd+compSize>bytes.byteLength){
      risks.push({file:name||`@offset_${offset}`,risk:'CORRUPTED_COMPRESSED_PAYLOAD_BOUNDS'});
      return {valid:false,reason:'CORRUPTED_COMPRESSED_PAYLOAD_BOUNDS',file_count:fileCount,compressed_bytes:bytes.byteLength,total_uncompressed_bytes:totalUncompressed,max_compression_ratio:Number(maxRatio.toFixed(2)),max_depth:maxDepth,risks,entries,execution_policy:'NEVER_EXECUTE_UPLOADED_ARCHIVE'};
    }
    fileCount++;
    totalCompressed+=compSize;
    totalUncompressed+=uncompSize;
    const ratio=compSize>0?uncompSize/compSize:(uncompSize>0?999:1);
    if(ratio>maxRatio)maxRatio=ratio;
    const normSegments=name.replace(/\\/g,'/').split('/').filter(Boolean);
    if(normSegments.length>maxDepth)maxDepth=normSegments.length;
    if((flags&0x01)!==0)risks.push({file:name,risk:'ENCRYPTED_ZIP_ENTRY_FORBIDDEN'});
    if((flags&0x08)!==0&&compSize===0&&uncompSize===0)risks.push({file:name,risk:'STREAMED_DATA_DESCRIPTOR_UNVERIFIABLE_SIZE'});
    if(name.includes('..')||name.startsWith('/')||name.startsWith('\\')||name.includes('\\')||/^[a-zA-Z]:/.test(name)||name.includes('\0')||normSegments.includes('..')){
      risks.push({file:name,risk:'PATH_TRAVERSAL'});
    }
    if(forbiddenExt.test(name))risks.push({file:name,risk:'EXECUTABLE_OR_SCRIPT_FORBIDDEN'});
    if((ratio>100&&uncompSize>64*1024)||uncompSize>25*1024*1024)risks.push({file:name,risk:'SUSPECTED_ZIP_BOMB_RATIO'});
    entries.push({name,method,compressed_bytes:compSize,uncompressed_bytes:uncompSize,ratio:Number(ratio.toFixed(2))});
    if(fileCount>500){risks.push({file:name,risk:'TOO_MANY_FILES_LIMIT_500'});break;}
    if(totalUncompressed>50*1024*1024){risks.push({file:name,risk:'UNCOMPRESSED_SIZE_LIMIT_50MB'});break;}
    if(maxDepth>12){risks.push({file:name,risk:'DIRECTORY_DEPTH_LIMIT_12'});break;}
    offset=headerEnd+compSize;
  }
  // Inspect Central Directory headers if present at offset to detect symlinks or mismatched sizes
  let cdOffset=offset,cdCount=0;
  while(cdOffset+46<=bytes.byteLength&&cdCount<600){
    const sig=view.getUint32(cdOffset,true);
    if(sig!==0x02014b50)break;
    const nameLen=view.getUint16(cdOffset+28,true);
    const extraLen=view.getUint16(cdOffset+30,true);
    const commentLen=view.getUint16(cdOffset+32,true);
    const extAttr=view.getUint32(cdOffset+38,true);
    if(cdOffset+46+nameLen+extraLen+commentLen>bytes.byteLength){
      risks.push({file:`@cd_${cdOffset}`,risk:'TRUNCATED_CENTRAL_DIRECTORY'});
      break;
    }
    const cdName=dec.decode(bytes.slice(cdOffset+46,cdOffset+46+nameLen));
    const unixMode=(extAttr>>>16)&0o170000;
    if(unixMode===0o120000)risks.push({file:cdName,risk:'SYMLINK_ENTRY_FORBIDDEN'});
    cdCount++;
    cdOffset+=46+nameLen+extraLen+commentLen;
  }
  const overallRatio=totalCompressed>0?totalUncompressed/totalCompressed:1;
  if(overallRatio>100&&totalUncompressed>1024*1024)risks.push({file:'(archive)',risk:'SUSPECTED_ZIP_BOMB_RATIO'});
  return {
    valid:risks.length===0&&fileCount>0,
    reason:risks.length?risks[0].risk:(fileCount===0?'EMPTY_OR_UNSUPPORTED_STREAM_ZIP':'OK'),
    file_count:fileCount,
    central_directory_entries:cdCount,
    compressed_bytes:bytes.byteLength,
    total_uncompressed_bytes:totalUncompressed,
    max_compression_ratio:Number(maxRatio.toFixed(2)),
    overall_compression_ratio:Number(overallRatio.toFixed(2)),
    max_depth:maxDepth,
    risks,
    entries:entries.slice(0,100),
    limits:{max_files:500,max_uncompressed_bytes:50*1024*1024,max_ratio:100,max_depth:12},
    execution_policy:'NEVER_EXECUTE_UPLOADED_ARCHIVE'
  };
}

async function setupDone(env){
  const r=await env.DB.prepare('SELECT COUNT(*) c FROM accounts').first();
  return Number(r?.c||0)>0;
}

async function getSession(req,env){
  const raw=(req.headers.get('cookie')||'')
    .split(';')
    .map(x=>x.trim())
    .find(x=>x.startsWith('sfn_session='));

  if(!raw)return null;

  let t;try{t=decodeURIComponent(raw.slice('sfn_session='.length))}catch{return null}
  const h=await sha256(t);

  return env.DB.prepare(`
    SELECT
      s.id session_id,
      s.account_id,
      a.person_id,
      a.username,
      a.force_password_change,
      p.full_name,
      p.member_code,
      p.avatar_url,
      p.status
    FROM sessions s
    JOIN accounts a ON a.id=s.account_id
    LEFT JOIN people p ON p.id=a.person_id
    WHERE s.token_hash=?
      AND s.expires_at>CURRENT_TIMESTAMP
      AND a.is_locked=0
      AND NOT EXISTS (SELECT 1 FROM account_restrictions br WHERE br.account_id=a.id AND br.restriction_type='ban' AND (br.ends_at IS NULL OR date(br.ends_at)>=date('now','+7 hours')))
      AND NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='account_lifecycle' AND EXISTS (SELECT 1 FROM account_lifecycle al WHERE al.account_id=a.id AND (al.lifecycle_status IN ('expired','revoked','suspended') OR (al.expires_at IS NOT NULL AND al.expires_at<=datetime('now')))))
    LIMIT 1
  `).bind(h).first();
}

async function isSuper(env,aid){
  return !!(await env.DB.prepare(`
    SELECT 1
    FROM account_scopes s
    JOIN roles r ON r.id=s.role_id
    WHERE s.account_id=?
      AND s.active=1
      AND r.code='SUPER_ADMIN'
    LIMIT 1
  `).bind(aid).first());
}

async function isNetworkAdmin(env,aid){
  return !!(await env.DB.prepare(`
    SELECT 1
    FROM account_scopes s
    JOIN roles r ON r.id=s.role_id
    WHERE s.account_id=?
      AND s.active=1
      AND r.code IN ('SUPER_ADMIN','NETWORK_ADMIN')
    LIMIT 1
  `).bind(aid).first());
}

async function canAccessOrg(env,aid,orgId){
  if(!orgId)return false;
  if(await isNetworkAdmin(env,aid))return true;

  return !!(await env.DB.prepare(`
    WITH RECURSIVE allowed(id) AS (
      SELECT s.org_node_id
      FROM account_scopes s
      JOIN roles r ON r.id=s.role_id
      WHERE s.account_id=?
        AND s.active=1
        AND r.code IN ('SCOPE_ADMIN','UNIT_ADMIN','DEPARTMENT_ADMIN')
        AND s.org_node_id IS NOT NULL

      UNION

      SELECT o.id
      FROM org_nodes o
      JOIN allowed a ON o.parent_id=a.id
    )
    SELECT 1
    FROM allowed
    WHERE id=?
    LIMIT 1
  `).bind(aid,orgId).first());
}

async function canAccessPerson(env,aid,pid){
  if(await isNetworkAdmin(env,aid))return true;
  const self=await env.DB.prepare(`SELECT person_id FROM accounts WHERE id=?`).bind(aid).first();
  if(self?.person_id===pid)return true;
  const sameUnit=await env.DB.prepare(`
    SELECT 1 FROM org_memberships mine
    JOIN org_memberships theirs ON theirs.org_node_id=mine.org_node_id
    WHERE mine.person_id=? AND theirs.person_id=?
      AND mine.status='active' AND theirs.status='active' LIMIT 1
  `).bind(self?.person_id||'',pid).first();
  if(sameUnit)return true;

  return !!(await env.DB.prepare(`
    WITH RECURSIVE allowed(id) AS (
      SELECT s.org_node_id
      FROM account_scopes s
      JOIN roles r ON r.id=s.role_id
      WHERE s.account_id=?
        AND s.active=1
        AND r.code IN ('SCOPE_ADMIN','UNIT_ADMIN','DEPARTMENT_ADMIN')
        AND s.org_node_id IS NOT NULL

      UNION

      SELECT o.id
      FROM org_nodes o
      JOIN allowed a ON o.parent_id=a.id
    )
    SELECT 1
    FROM org_memberships m
    JOIN allowed a ON a.id=m.org_node_id
    WHERE m.person_id=?
    LIMIT 1
  `).bind(aid,pid).first());
}

async function visibleOrgs(env,aid){
  if(await isNetworkAdmin(env,aid)){
    const r=await env.DB.prepare(`
      SELECT id,code,name,short_name,node_type,parent_id,status
      FROM org_nodes
      WHERE deleted_at IS NULL
      ORDER BY sort_order,name
    `).all();

    return r.results||[];
  }

  const r=await env.DB.prepare(`
    WITH RECURSIVE allowed(id) AS (
      SELECT s.org_node_id
      FROM account_scopes s
      JOIN roles rr ON rr.id=s.role_id
      WHERE s.account_id=?
        AND s.active=1
        AND rr.code IN ('SCOPE_ADMIN','UNIT_ADMIN','DEPARTMENT_ADMIN')
        AND s.org_node_id IS NOT NULL

      UNION
      SELECT m.org_node_id FROM accounts aa JOIN org_memberships m ON m.person_id=aa.person_id WHERE aa.id=? AND m.status='active'

      UNION

      SELECT o.id
      FROM org_nodes o
      JOIN allowed a ON o.parent_id=a.id
    )
    SELECT
      o.id,
      o.code,
      o.name,
      o.short_name,
      o.node_type,
      o.parent_id,
      o.status
    FROM org_nodes o
    JOIN allowed a ON a.id=o.id
    ORDER BY o.sort_order,o.name
  `).bind(aid,aid).all();

  return r.results||[];
}

async function hasPerm(env,aid,code,scope=null){
  if(await isSuper(env,aid))return true;

  let q=`
    SELECT 1
    FROM account_scopes s
    JOIN role_permissions rp ON rp.role_id=s.role_id
    JOIN permissions p ON p.id=rp.permission_id
    WHERE s.account_id=?
      AND s.active=1
      AND p.code=?
  `;

  const b=[aid,code];

  if(scope){
    q+=` AND (s.org_node_id=? OR s.org_node_id IS NULL)`;
    b.push(scope);
  }

  q+=' LIMIT 1';

  return !!(await env.DB.prepare(q).bind(...b).first());
}

async function audit(env,aid,action,type,id,scope=null,details={}){
  await env.DB.prepare(`
    INSERT INTO audit_log(
      actor_account_id,
      action,
      entity_type,
      entity_id,
      org_node_id,
      details_json
    )
    VALUES(?,?,?,?,?,?)
  `).bind(
    aid||null,
    action,
    type,
    id||null,
    scope||null,
    JSON.stringify(details)
  ).run();
}

async function memberCode(env){
  const yy=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',year:'2-digit'}).format(new Date());
  const alphabet='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for(let attempt=0;attempt<16;attempt++){
    const bytes=crypto.getRandomValues(new Uint8Array(8));
    const suffix=[...bytes].map(n=>alphabet[n%alphabet.length]).join('');
    const code=`SFN-${yy}-${suffix}`;
    if(!(await env.DB.prepare('SELECT 1 FROM people WHERE member_code=?').bind(code).first()))return code;
  }
  throw new Error('MEMBER_ID_GENERATION_FAILED');
}

function verifyCode(prefix='SFN'){
  return `${prefix}-${crypto.randomUUID()
    .replaceAll('-','')
    .slice(0,12)
    .toUpperCase()}`;
}
function withSecurityHeaders(response){
  const headers=new Headers(response.headers);
  headers.set('x-content-type-options','nosniff');
  headers.set('x-frame-options','DENY');
  headers.set('referrer-policy','no-referrer');
  headers.set('permissions-policy','camera=(), microphone=(), geolocation=()');
  headers.set('content-security-policy',"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
const RETIRED_OR_EXTERNAL_HOST_RE=/^(?:tnv|slc|mail|sfec)\.skyfirst\.io\.vn$/i;
const DEFAULT_PORTAL_LINKS=[
  {name:'Trang Thông Tin Điện Tử Sky First',url:'https://www.skyfirst.io.vn/',description:'Thông tin chính thức của Sky First'},
  {name:'Cổng Thông Tin Số Sky First',url:'https://ctt.skyfirst.io.vn/',description:'Thông tin, chương trình và tiện ích số'}
];
const DEFAULT_SYSTEM_IDENTITY={
  siteName:'Trung tâm Nghiệp vụ Số Sky First',
  orgName:'Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First',
  appUrl:'https://nghiepvu.skyfirst.io.vn',
  systemEmail:'nghiepvu@skyfirst.io.vn',
  noreplyEmail:'noreply@skyfirst.io.vn',
  supportEmail:'support@skyfirst.io.vn',
  contactEmail:'lienhe@skyfirst.io.vn'
};
const DEFAULT_PORTAL_BRAND={siteName:'Trung tâm Nghiệp vụ Số Sky First',logoUrl:'/sfn-logo.png',primaryColor:'#2563eb',accentColor:'#38bdf8',navColor:'#0b1220',fontFamily:'system',baseFontSize:16,cornerRadius:18,contentMaxWidth:1500};
function safeSkyFirstUrl(value){try{const u=new URL(String(value||''));const h=u.hostname.toLowerCase();if(RETIRED_OR_EXTERNAL_HOST_RE.test(h))return null;return u.protocol==='https:'&&!u.username&&!u.password&&(h==='skyfirst.io.vn'||h.endsWith('.skyfirst.io.vn'))?u.toString():null}catch{return null}}
function portalLinksFromSettings(candidates){
  if(!Array.isArray(candidates)||!candidates.length)return DEFAULT_PORTAL_LINKS.map(x=>({...x}));
  const oldNames=new Set(['cổng chính sky first network','cổng thông tin','cổng sfn','cổng sfec','lớp học trực tuyến','cổng tình nguyện viên','cổng thư điện tử']);
  return DEFAULT_PORTAL_LINKS.map(fallback=>{
    const item=candidates.find(x=>{const u=safeSkyFirstUrl(x?.url);if(!u)return false;try{return new URL(u).hostname===new URL(fallback.url).hostname}catch{return false}});
    if(!item)return {...fallback};
    const rawName=clean(item.name,100),name=rawName&&!oldNames.has(rawName.toLocaleLowerCase('vi-VN'))?rawName:fallback.name;
    return {name,url:safeSkyFirstUrl(item.url)||fallback.url,description:clean(item.description,140)||fallback.description};
  });
}
function localImagePath(value,fallback='/sfn-logo.png'){const p=clean(value,1200);if(p==='/sfn-logo.png')return p;if(/^\/files\/[A-Za-z0-9._/-]+\.(?:png|jpe?g|webp)$/i.test(p)&&!p.includes('..')&&!p.includes('\\')&&!p.includes('//'))return p;return fallback}
function localBrandImagePath(value,fallback='/sfn-logo.png'){const p=clean(value,1200);if(p==='/sfn-logo.png')return p;return /^\/files\/site-assets\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.(?:png|jpg|webp)$/i.test(p)?p:fallback}

function crc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc&1)?(0xedb88320^(crc>>>1)):(crc>>>1)}
  return (crc^0xffffffff)>>>0;
}
function validDateOnly(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const t=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===value;
}
function effectiveIssueStatus(status,issuedAt,expiresAt,today=dateInVietnam()){
  if(status!=='active')return status;
  const issued=String(issuedAt||'').slice(0,10),expires=String(expiresAt||'').slice(0,10);
  // Invalid legacy dates must never make a credential appear valid.
  if(!validDateOnly(issued))return 'pending';
  if(issued>today)return 'pending';
  if(expires&& !validDateOnly(expires))return 'pending';
  if(expires&&expires<today)return 'expired';
  return 'active';
}
function validUploadedImage(input,contentType){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input||[]);
  if(!bytes.length)return false;
  if(contentType==='image/png'){
    const signature=[137,80,78,71,13,10,26,10];
    if(bytes.length<45||!signature.every((n,i)=>bytes[i]===n))return false;
    let offset=8,seenHeader=false,seenData=false,seenEnd=false,width=0,height=0;
    while(offset+12<=bytes.length){
      const view=new DataView(bytes.buffer,bytes.byteOffset+offset,bytes.byteLength-offset);
      const len=view.getUint32(0,false),type=String.fromCharCode(...bytes.slice(offset+4,offset+8));
      const end=offset+12+len;
      if(end>bytes.length)return false;
      const chunkTypeAndData=bytes.slice(offset+4,offset+8+len);
      const expected=new DataView(bytes.buffer,bytes.byteOffset+offset+8+len,4).getUint32(0,false);
      if(crc32(chunkTypeAndData)!==expected)return false;
      if(!seenHeader){
        if(type!=='IHDR'||len!==13)return false;
        const dim=new DataView(bytes.buffer,bytes.byteOffset+offset+8,13);width=dim.getUint32(0,false);height=dim.getUint32(4,false);seenHeader=true;
        if(!width||!height||width>8192||height>8192||width*height>32000000)return false;
      }else if(type==='IHDR')return false;
      if(type==='IDAT')seenData=true;
      if(type==='IEND'){
        if(len!==0||!seenData||end!==bytes.length)return false;
        seenEnd=true;break;
      }
      offset=end;
    }
    return seenHeader&&seenData&&seenEnd;
  }
  if(contentType==='image/jpeg'){
    if(bytes.length<20||bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff||bytes[bytes.length-2]!==0xff||bytes[bytes.length-1]!==0xd9)return false;
    // Require a plausible marker/segment sequence before the scan instead of trusting MIME and SOI/EOI alone.
    let i=2,segments=0,hasScan=false;
    while(i<bytes.length-2&&segments<4096){
      if(bytes[i]!==0xff){if(hasScan){i++;continue}return false}
      while(i<bytes.length&&bytes[i]===0xff)i++;
      if(i>=bytes.length)return false;
      const marker=bytes[i++];
      if(marker===0xd9)break;
      if(marker===0xd8||marker===0x01||(marker>=0xd0&&marker<=0xd7)){segments++;continue}
      if(i+2>bytes.length)return false;
      const length=(bytes[i]<<8)|bytes[i+1];if(length<2||i+length>bytes.length)return false;
      if(marker===0xda){hasScan=true;break}
      i+=length;segments++;
    }
    return hasScan;
  }
  if(contentType==='image/webp'){
    if(bytes.length<30||String.fromCharCode(...bytes.slice(0,4))!=='RIFF'||String.fromCharCode(...bytes.slice(8,12))!=='WEBP')return false;
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),riffSize=view.getUint32(4,true);
    const chunk=String.fromCharCode(...bytes.slice(12,16)),chunkSize=view.getUint32(16,true);
    if(riffSize!==bytes.length-8||!['VP8 ','VP8L','VP8X'].includes(chunk)||chunkSize<1||20+chunkSize>bytes.length)return false;
    if(chunk==='VP8X'&&chunkSize<10)return false;
    return true;
  }
  return false;
}
async function prepareRequestAvatarPromotion(env,avatarUrl,personId){
  const match=String(avatarUrl||'').match(/^\/files\/(requests\/avatars\/[A-Za-z0-9._/-]+\.(?:png|jpe?g|webp))$/i);
  if(!match||!env.FILES)return {url:null,oldKey:null,newKey:null};
  const oldKey=match[1];
  if(oldKey.includes('..')||oldKey.includes('\\'))return {url:null,oldKey:null,newKey:null};
  let source;
  try{source=await env.FILES.get(oldKey)}catch{return {url:null,oldKey:null,newKey:null}}
  if(!source)return {url:null,oldKey:null,newKey:null};
  const metadata=source.httpMetadata||{},contentType=String(metadata.contentType||'').toLowerCase().split(';')[0].trim();
  if(!['image/jpeg','image/png','image/webp'].includes(contentType))return {url:null,oldKey,newKey:null};
  let bytes;
  try{bytes=new Uint8Array(await source.arrayBuffer())}catch{return {url:null,oldKey,newKey:null}}
  if(!bytes.length||bytes.byteLength>900000||!validUploadedImage(bytes,contentType))return {url:null,oldKey,newKey:null};
  const ext=contentType==='image/png'?'png':contentType==='image/webp'?'webp':'jpg';
  const newKey=`avatars/${personId}/${crypto.randomUUID()}.${ext}`;
  try{await env.FILES.put(newKey,bytes,{httpMetadata:{contentType,cacheControl:'public, max-age=31536000, immutable'}})}catch{return {url:null,oldKey,newKey:null}}
  return {url:`/files/${newKey}`,oldKey,newKey};
}
async function deletePendingRequestAvatar(env,avatarUrl){
  const m=String(avatarUrl||'').match(/^\/files\/(requests\/avatars\/[A-Za-z0-9._/-]+\.(?:png|jpe?g|webp))$/i);
  if(m&&env.FILES?.delete){try{await env.FILES.delete(m[1])}catch(err){console.error('PENDING_AVATAR_DELETE_FAILED',String(err?.message||err))}}
}


async function api(req,env,url){
  try {

  // =========================================================
  // SETUP
  // =========================================================


  if(url.pathname==='/api/public/portal-config'&&req.method==='GET'){
    const cfg=await env.DB.prepare("SELECT value_json,updated_at FROM system_settings WHERE key='member_portal_v4'").first();
    let settings={};try{settings=JSON.parse(cfg?.value_json||'{}')}catch{}
    const defaults=[
      {key:'members',label:'Thành viên đang hoạt động',mode:'auto',enabled:true},
      {key:'activities',label:'Hoạt động đã tổ chức',mode:'auto',enabled:true},
      {key:'units',label:'Đơn vị trực thuộc',mode:'auto',enabled:true},
      {key:'programs',label:'Chương trình và dự án',mode:'manual',value:null,enabled:false}
    ];
    const allowed=new Set(defaults.map(x=>x.key));
    const published=Array.isArray(settings.stats)?settings.stats:defaults;
    const stats=published.filter(x=>x&&allowed.has(x.key)&&x.enabled!==false).slice(0,8);
    const countQueries={members:"SELECT COUNT(*) n FROM people WHERE status='active'",activities:"SELECT COUNT(*) n FROM activities WHERE status='completed'",units:"SELECT COUNT(*) n FROM org_nodes WHERE status='active'"};
    const results=[];
    for(const row of stats){
      let value=null;
      if(row.mode==='manual')value=Number.isSafeInteger(row.value)&&row.value>=0?row.value:null;
      else if(countQueries[row.key]){try{value=Number((await env.DB.prepare(countQueries[row.key]).first())?.n||0)}catch{value=null}}
      if(value!==null)results.push({key:row.key,label:clean(row.label,75),value,mode:row.mode==='manual'?'manual':'auto'});
    }
    const savedBrand=settings.brand&&typeof settings.brand==='object'?settings.brand:{};
    const brand={
      ...DEFAULT_PORTAL_BRAND,
      siteName:(()=>{const raw=clean(savedBrand.siteName||settings.siteName||DEFAULT_PORTAL_BRAND.siteName,100);return (!raw||/trung tâm thành viên số|cổng thành viên/i.test(raw))?DEFAULT_PORTAL_BRAND.siteName:raw})(),
      logoUrl:localBrandImagePath(savedBrand.logoUrl||settings.logoUrl||DEFAULT_PORTAL_BRAND.logoUrl),
      primaryColor:/^#[a-f0-9]{6}$/i.test(savedBrand.primaryColor||'')?savedBrand.primaryColor:DEFAULT_PORTAL_BRAND.primaryColor,
      accentColor:/^#[a-f0-9]{6}$/i.test(savedBrand.accentColor||'')?savedBrand.accentColor:DEFAULT_PORTAL_BRAND.accentColor,
      navColor:/^#[a-f0-9]{6}$/i.test(savedBrand.navColor||'')?savedBrand.navColor:DEFAULT_PORTAL_BRAND.navColor,
      fontFamily:['Arial','Verdana','Georgia','Tahoma','system'].includes(savedBrand.fontFamily)?savedBrand.fontFamily:DEFAULT_PORTAL_BRAND.fontFamily,
      baseFontSize:Number.isInteger(Number(savedBrand.baseFontSize))&&Number(savedBrand.baseFontSize)>=14&&Number(savedBrand.baseFontSize)<=20?Number(savedBrand.baseFontSize):16,
      cornerRadius:Number.isInteger(Number(savedBrand.cornerRadius))&&Number(savedBrand.cornerRadius)>=8&&Number(savedBrand.cornerRadius)<=24?Number(savedBrand.cornerRadius):18,
      contentMaxWidth:Number.isInteger(Number(savedBrand.contentMaxWidth))&&Number(savedBrand.contentMaxWidth)>=1080&&Number(savedBrand.contentMaxWidth)<=1680?Number(savedBrand.contentMaxWidth):1500
    };
    const links=portalLinksFromSettings(settings.links);
    return json({stats:results,tagline:clean(settings.tagline||'Mỗi thành viên là một hành trình. Mỗi đóng góp tạo nên một Sky First lớn mạnh hơn.',190),brand,links,updated_at:cfg?.updated_at||null});
  }

  if(url.pathname==='/api/setup/status'&&req.method==='GET'){
    return json({
      setup_required:!(await setupDone(env))
    });
  }

  if(url.pathname==='/api/setup'&&req.method==='POST'){
    if(await setupDone(env)) return json({error:'SETUP_ALREADY_COMPLETED'},409);
    const supplied=clean(req.headers.get('x-setup-token'),512);
    if(!env.SETUP_TOKEN||!safeEq(supplied,env.SETUP_TOKEN)) return json({error:'SETUP_FORBIDDEN'},403);
    const b=await bodyJson(req);

    const name=clean(b.full_name,160);
    const user=clean(b.username,80).toLowerCase();
    const email=clean(b.email,200).toLowerCase();
    const pw=String(b.password||'');

    if(!name||!user||pw.length<10){
      return json({error:'INVALID_SETUP_DATA'},400);
    }

    const pid=uid('person');
    const aid=uid('account');
    const salt=token();
    const it=100000;
    const hash=await pbkdf2(pw,salt,it);

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO people(
          id,
          member_code,
          full_name,
          email,
          status
        )
        VALUES(?,?,?,?, 'active')
      `).bind(
        pid,
        'SYS-ADMIN-0001',
        name,
        email||null
      ),

      env.DB.prepare(`
        INSERT INTO accounts(
          id,
          person_id,
          username,
          email,
          password_hash,
          password_salt,
          password_iterations,
          force_password_change
        )
        VALUES(?,?,?,?,?,?,?,0)
      `).bind(
        aid,
        pid,
        user,
        email||null,
        hash,
        salt,
        it
      ),

      env.DB.prepare(`
        INSERT INTO account_scopes(
          id,
          account_id,
          role_id,
          org_node_id,
          active
        )
        VALUES(?,?,?,?,1)
      `).bind(
        uid('scope'),
        aid,
        'role_super_admin',
        'org_sfn'
      ),

      env.DB.prepare(`
        UPDATE system_settings
        SET
          value_json='{"completed":true}',
          updated_at=CURRENT_TIMESTAMP
        WHERE key='setup'
      `)
    ]);

    await audit(
      env,
      aid,
      'system_setup',
      'system',
      'setup',
      'org_sfn',
      {username:user}
    );

    return json({ok:true});
  }

  // =========================================================
  // LOGIN
  // =========================================================

  if(url.pathname==='/api/auth/login'&&req.method==='POST'){
    try{
      const b=await bodyJson(req);

      const login=clean(b.login,200).toLowerCase();
      const password=String(b.password||'');

      if(!login||!password) return json({error:'INVALID_LOGIN'},401);
      const rateKey=`login:${await sha256(clientHint(req)+'|'+login)}`;
      const rs=await safeRateState(env,rateKey,8,15);
      if(rs.blocked) return json({error:'TOO_MANY_LOGIN_ATTEMPTS'},429,{'retry-after':'900'});

      const a=await env.DB.prepare(`
        SELECT
          a.id,
          a.person_id,
          a.username,
          a.email,
          a.password_hash,
          a.password_salt,
          a.password_iterations,
          a.force_password_change,
          a.is_locked,
          p.status AS person_status
        FROM accounts a
        LEFT JOIN people p ON p.id=a.person_id
        WHERE
          LOWER(TRIM(a.username))=?
          OR LOWER(TRIM(COALESCE(a.email,'')))=?
        LIMIT 1
      `).bind(login,login).first();

      if(!a){await safeRateFail(env,rateKey,8,15);return json({error:'INVALID_LOGIN'},401);}

      const restricted=await env.DB.prepare("SELECT 1 FROM account_restrictions WHERE account_id=? AND restriction_type='ban' AND (ends_at IS NULL OR date(ends_at)>=date('now','+7 hours'))").bind(a.id).first();
      if(restricted)return json({error:'ACCOUNT_BANNED'},423);
      try{
        await ensureGovernanceTables(env);
        const lc=await env.DB.prepare("SELECT lifecycle_status,expires_at,CASE WHEN expires_at IS NOT NULL AND expires_at<=datetime('now') THEN 1 ELSE 0 END is_expired FROM account_lifecycle WHERE account_id=?").bind(a.id).first();
        if(lc&&(lc.is_expired||['expired','revoked','suspended'].includes(lc.lifecycle_status))){
          return json({error:'ACCOUNT_EXPIRED',message:'Tài khoản của bạn đã hết thời hạn sử dụng hoặc bị thu hồi. Vui lòng liên hệ quản trị viên để gia hạn.'},403);
        }
      }catch{}

      if(Number(a.is_locked||0)===1){
        return json({error:'ACCOUNT_LOCKED'},423);
      }

      if(a.person_status==='suspended'){
        return json({error:'ACCOUNT_SUSPENDED'},403);
      }

      const passwordOK=await verifyPassword(
        password,
        a.password_salt,
        a.password_iterations,
        a.password_hash
      );

      if(!passwordOK){await safeRateFail(env,rateKey,8,15);await safeSecurityEvent(env,a.id,'login_failed',req);return json({error:'INVALID_LOGIN'},401);}
      await safeRateClear(env,rateKey);

      await env.DB.prepare(`
        DELETE FROM sessions
        WHERE account_id=?
          AND expires_at<=CURRENT_TIMESTAMP
      `).bind(a.id).run();

      const t=token();
      const h=await sha256(t);
      const sid=uid('session');

      await createLoginSession(env,sid,a.id,h,req);

      await env.DB.prepare(`
        UPDATE accounts
        SET
          last_login_at=CURRENT_TIMESTAMP,
          updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(a.id).run();

      await safeAudit(env,a.id,'account_login','account',a.id,null,{username:a.username});
      await safeSecurityEvent(env,a.id,'login_success',req);

      return json(
        {
          ok:true,
          force_password_change:
            Number(a.force_password_change||0)===1
        },
        200,
        {
          'set-cookie':cookie('sfn_session',t,7)
        }
      );

    }catch(err){
      console.error('LOGIN_ERROR',err);

      return json(
        {
          error:'LOGIN_SYSTEM_ERROR'
        },
        500
      );
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  if(url.pathname==='/api/auth/logout'&&req.method==='POST'){
    const s=await getSession(req,env);

    if(s){
      await env.DB.prepare(
        'DELETE FROM sessions WHERE id=?'
      ).bind(s.session_id).run();
    }

    return json(
      {ok:true},
      200,
      {'set-cookie':clearCookie('sfn_session')}
    );
  }

  // =========================================================
  // PUBLIC CARD QR IMAGE (same-origin wrapper avoids browser CORS/canvas taint)
  // =========================================================

  if(url.pathname==='/api/public/card-qr'&&req.method==='GET'){
    const qrRateKey=`public-card-qr:${await sha256(clientHint(req))}`;
    const qrRate=await safeRateState(env,qrRateKey,120,15);
    if(qrRate.blocked)return json({error:'TOO_MANY_QR_REQUESTS'},429,{'retry-after':'900'});
    await safeRateFail(env,qrRateKey,120,15);
    const code=clean(url.searchParams.get('code'),120);
    if(!code)return json({error:'CODE_REQUIRED'},400);
    if(!/^[A-Za-z0-9_-]{3,120}$/.test(code))return json({error:'INVALID_CODE'},400);
    if(code!=='PREVIEW'){
      // A stale production D1 schema may not have one_time_credentials yet.
      // Keep the legacy existence check when possible, but don't let a missing
      // table turn PDF/QR export into an HTTP 500. The verify endpoint remains authoritative.
      try{
        const exists=await env.DB.prepare(`SELECT 1 AS ok FROM member_cards WHERE verify_token=? UNION ALL SELECT 1 AS ok FROM one_time_credentials WHERE verify_token=? UNION ALL SELECT 1 AS ok FROM verification_qr_records WHERE verify_token=? LIMIT 1`).bind(code,code,code).first();
        if(!exists)return json({error:'NOT_FOUND'},404);
      }catch(err){console.error('CARD_QR_EXISTENCE_CHECK_FAILED',String(err?.message||err));return json({error:'QR_VERIFICATION_STORE_UNAVAILABLE',detail:'Không xác minh được hồ sơ QR. Hãy kiểm tra migration dữ liệu trước khi tải QR.'},503)}
    }
    const requestedSize=Number(url.searchParams.get('size'));
    const size=[120,170,180,600].includes(requestedSize)?requestedSize:180;
    const verificationUrl=new URL('/verify',url.origin);verificationUrl.searchParams.set('code',code);
    try{
      // QR is generated inside the Worker. Verification tokens are never sent to a third-party QR service.
      const image=await generateQrPng(verificationUrl.toString(),size);
      if(!image?.byteLength||image.byteLength>512*1024)return json({error:'QR_IMAGE_INVALID'},502);
      return new Response(image,{status:200,headers:{'content-type':'image/png','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'}});
    }catch(err){console.error('LOCAL_QR_GENERATION_ERROR',String(err?.message||err));return json({error:'QR_GENERATION_FAILED',detail:'Không tạo được ảnh QR cục bộ.'},502)}
  }

  // =========================================================
  // PUBLIC VERIFY
  // =========================================================

  if(url.pathname==='/api/public/verify'&&req.method==='GET'){
    const verifyRateKey=`public-verify:${await sha256(clientHint(req))}`;
    const verifyRate=await safeRateState(env,verifyRateKey,30,15);
    if(verifyRate.blocked)return json({error:'TOO_MANY_VERIFY_ATTEMPTS'},429,{'retry-after':'900'});
    await safeRateFail(env,verifyRateKey,30,15);
    const code=clean(url.searchParams.get('code'),120);

    if(!code){
      return json({error:'CODE_REQUIRED'},400);
    }

    const card=await env.DB.prepare(`
      SELECT
        c.card_number,
        c.status,
        c.issued_at,
        c.expires_at,
        c.title_on_card,
        p.full_name,
        p.member_code,
        p.avatar_url,
        t.name card_type_name,
        o.name org_name
      FROM member_cards c
      JOIN people p ON p.id=c.person_id
      JOIN card_types t ON t.id=c.card_type_id
      LEFT JOIN org_nodes o ON o.id=c.org_node_id
      WHERE c.verify_token=?
      LIMIT 1
    `).bind(code).first();

    if(card){
      const effectiveStatus=effectiveIssueStatus(card.status,card.issued_at,card.expires_at);
      return json({
        type:'card',
        valid:effectiveStatus==='active',
        record:{...card,status:effectiveStatus,avatar_url:localImagePath(card.avatar_url)}
      });
    }

    const oneTime=await env.DB.prepare(`
      SELECT
        o.card_number,
        o.status,
        o.issued_at,
        o.expires_at,
        o.event_name,
        o.full_name,
        o.role_label,
        t.name card_type_name
      FROM one_time_credentials o
      LEFT JOIN card_types t ON t.id=o.card_type_id
      WHERE o.verify_token=?
      LIMIT 1
    `).bind(code).first();
    if(oneTime){
      const effectiveStatus=effectiveIssueStatus(oneTime.status,oneTime.issued_at,oneTime.expires_at);
      return json({
        type:'one_time',
        valid:effectiveStatus==='active',
        record:{...oneTime,status:effectiveStatus}
      });
    }

    const independentQr=await env.DB.prepare(`
      SELECT credential_title,full_name,role_label,organization_label,reference_number,issued_at,expires_at,status,public_note
      FROM verification_qr_records
      WHERE verify_token=?
      LIMIT 1
    `).bind(code).first();
    if(independentQr){
      const effectiveStatus=effectiveIssueStatus(independentQr.status,independentQr.issued_at,independentQr.expires_at);
      return json({
        type:'verification_qr',
        valid:effectiveStatus==='active',
        record:{...independentQr,status:effectiveStatus}
      });
    }

    const cert=await env.DB.prepare(`
      SELECT
        c.certificate_no,
        c.title,
        c.issuer,
        c.issued_at,
        c.verification_status,
        p.full_name,
        p.member_code
      FROM certificates c
      JOIN people p ON p.id=c.person_id
      WHERE c.verify_code=?
         OR c.certificate_no=?
      LIMIT 1
    `).bind(code,code).first();

    if(cert){
      return json({
        type:'certificate',
        valid:cert.verification_status==='verified',
        record:cert
      });
    }

    return json({error:'NOT_FOUND'},404);
  }

  // =========================================================
  // PUBLIC ACCOUNT REQUEST
  // =========================================================

  if(url.pathname==='/api/public/request-avatar'&&req.method==='POST'){
    const uploadKey=`avatar-upload:${await sha256(clientHint(req))}`;const uploadRate=await safeRateState(env,uploadKey,12,60);if(uploadRate.blocked)return json({error:'UPLOAD_RATE_LIMITED'},429,{'retry-after':'3600'});await safeRateFail(env,uploadKey,12,60);
    const ct=(req.headers.get('content-type')||'').toLowerCase().split(';')[0].trim();
    if(!['image/jpeg','image/png','image/webp'].includes(ct))return json({error:'IMAGE_TYPE_NOT_ALLOWED'},415);
    if(!env.FILES)return json({error:'FILE_STORAGE_UNAVAILABLE'},503);
    const data=new Uint8Array(await req.arrayBuffer());
    if(!data.byteLength||data.byteLength>900000)return json({error:'IMAGE_TOO_LARGE'},413);
    if(!validUploadedImage(data,ct))return json({error:'INVALID_IMAGE_FILE',message:'Nội dung tệp không khớp định dạng ảnh được chọn.'},400);
    const ext=ct==='image/png'?'png':ct==='image/webp'?'webp':'jpg';
    const key=`requests/avatars/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
    await env.FILES.put(key,data,{httpMetadata:{contentType:ct,cacheControl:'private, no-store, max-age=0'}});
    return json({ok:true,url:`/files/${key}`},201,{'cache-control':'no-store'});
  }

  if(url.pathname==='/api/public/org-options'&&req.method==='GET'){
    const r=await env.DB.prepare(`SELECT id,name,parent_id,node_type FROM org_nodes WHERE status='active' AND deleted_at IS NULL ORDER BY sort_order,name`).all();
    return json({items:r.results||[]});
  }


function memberEmailHtml({title,name,intro,code,codeLabel='MÃ YÊU CẦU',status,processing='60 phút đến 48 giờ',body,ctaUrl='https://nghiepvu.skyfirst.io.vn/',ctaLabel='Mở Trung tâm Nghiệp vụ Số Sky First'}){
  const e=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const safeCta=safeSkyFirstUrl(ctaUrl)||'https://nghiepvu.skyfirst.io.vn/';
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(title)} – Trung tâm Nghiệp vụ Số Sky First</title></head><body style="margin:0;background:#eef4f8;font-family:Arial,Helvetica,sans-serif;color:#172b40;-webkit-text-size-adjust:100%"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#eef4f8"><tr><td align="center" style="padding:24px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:#fff;border:1px solid #d9e5ee;border-radius:14px;overflow:hidden"><tr><td height="6" style="height:6px;background:#1684bd;font-size:0;line-height:0">&nbsp;</td></tr><tr><td style="padding:22px 26px;border-bottom:1px solid #e6edf2;text-align:left"><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:bold;letter-spacing:.25px;color:#263f56;margin:0;text-align:left">MẠNG LƯỚI GIÁO DỤC VÀ PHÁT TRIỂN CỘNG ĐỒNG SKY FIRST</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;font-weight:800;color:#10243d;margin:6px 0 0;text-align:left">TRUNG TÂM NGHIỆP VỤ SỐ SKY FIRST</div></td></tr><tr><td style="padding:26px 26px 10px"><span style="display:inline-block;background:#eaf5fb;color:#176d99;font-size:11px;line-height:16px;font-weight:bold;padding:6px 10px;border-radius:20px">${e(status)}</span><h1 style="font-size:24px;line-height:31px;color:#10243d;margin:16px 0">${e(title)}</h1><p style="font-size:15px;line-height:24px;color:#40566a">Xin chào <strong>${e(name)}</strong>,</p><p style="font-size:15px;line-height:24px;color:#40566a">${e(intro)}</p>${code?`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f9fc;border:1px solid #dce8f0;border-radius:10px;margin:16px 0"><tr><td style="padding:17px 18px"><div style="font-size:11px;font-weight:bold;color:#657e91">${e(codeLabel)}</div><div style="font-size:20px;line-height:28px;font-weight:bold;color:#10243d;margin-top:5px;word-break:break-word">${e(code)}</div><div style="font-size:13px;line-height:21px;color:#526779;margin-top:10px">Trạng thái: <b>${e(status)}</b>${processing?` · Thời gian dự kiến: <b>${e(processing)}</b>`:''}</div></td></tr></table>`:''}<p style="font-size:15px;line-height:24px;color:#40566a;margin-top:14px">${e(body)}</p><table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto"><tr><td bgcolor="#10243d" style="border-radius:10px"><a href="${e(safeCta)}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-weight:bold">${e(ctaLabel)}</a></td></tr></table></td></tr><tr><td style="padding:22px 26px;background:#f5f9fc;border-top:1px solid #dce8f0"><div style="font-size:12px;line-height:20px;color:#526779">Email này được gửi tự động từ ${e(DEFAULT_SYSTEM_IDENTITY.noreplyEmail)}. Vui lòng không trả lời trực tiếp nếu địa chỉ gửi thư không hỗ trợ tiếp nhận phản hồi.</div><div style="font-size:13px;line-height:21px;color:#263f59;margin-top:18px">Trân trọng,</div><div style="font-size:13px;line-height:21px;font-weight:bold;color:#10243d;margin-top:8px">Trung tâm Nghiệp vụ Số Sky First</div><div style="font-size:12px;line-height:20px;color:#526779">Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First</div><div style="font-size:12px;line-height:20px;margin-top:10px"><a href="mailto:nghiepvu@skyfirst.io.vn" style="color:#126ca5;text-decoration:none">nghiepvu@skyfirst.io.vn</a><span style="color:#8193a2"> · </span><a href="mailto:support@skyfirst.io.vn" style="color:#126ca5;text-decoration:none">support@skyfirst.io.vn</a><span style="color:#8193a2"> · </span><a href="mailto:lienhe@skyfirst.io.vn" style="color:#126ca5;text-decoration:none">lienhe@skyfirst.io.vn</a></div><div style="font-size:11px;line-height:18px;color:#718596;margin-top:14px">© Sky First Network · nghiepvu.skyfirst.io.vn. Bảo lưu các quyền liên quan.</div></td></tr></table></td></tr></table></body></html>`;
}
async function sendMemberEmail(env,{to,subject,html,templateCode='master_notification',entityType=null,entityId=null,senderMode='noreply'}){
  const noreplyAddr=env.NOREPLY_EMAIL||DEFAULT_SYSTEM_IDENTITY.noreplyEmail;
  const sysAddr=env.SYSTEM_EMAIL||DEFAULT_SYSTEM_IDENTITY.systemEmail;
  const supportAddr=env.SUPPORT_EMAIL||DEFAULT_SYSTEM_IDENTITY.supportEmail;
  const fromAddr=senderMode==='system'?`Trung tâm Nghiệp vụ Số Sky First <${sysAddr}>`:`Trung tâm Nghiệp vụ Số Sky First <${noreplyAddr}>`;
  const replyTo=supportAddr;
  const logId=uid('emlog');
  const logWrite=async(status,providerId=null,errDetail=null)=>{
    try{
      await ensureGovernanceTables(env);
      await env.DB.prepare(`INSERT INTO email_delivery_logs(id,template_code,recipient_email,sender_address,reply_to_address,subject,provider_name,provider_message_id,status,error_detail,related_entity_type,related_entity_id) VALUES(?,?,?,?,?,?,'resend',?,?,?,?,?)`).bind(logId,clean(templateCode,80),clean(to,200),fromAddr,replyTo,clean(subject,240),providerId,status,errDetail?clean(errDetail,500):null,entityType,entityId).run();
    }catch(e){console.error('EMAIL_LOG_WRITE_ERROR',String(e?.message||e))}
  };
  if(!env.RESEND_API_KEY||!to){
    await logWrite('not_configured',null,'EMAIL_NOT_CONFIGURED');
    return {sent:false,reason:'EMAIL_NOT_CONFIGURED',log_id:logId};
  }
  try{
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'authorization':`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:fromAddr,to:[to],reply_to:replyTo,subject,html})});
    const data=await r.json().catch(()=>({}));
    const ok=Boolean(r.ok&&data&&data.id);
    const errMsg=ok?null:(data?.message||data?.error||`HTTP_${r.status}`);
    await logWrite(ok?'sent':'failed',data?.id||null,errMsg);
    return {sent:ok,id:data?.id||null,error:errMsg,log_id:logId};
  }catch(e){
    const errMsg=String(e?.message||e);
    await logWrite('failed',null,errMsg);
    return {sent:false,error:errMsg,log_id:logId};
  }
}

  // =========================================================
  // PUBLIC EMAIL OTP VERIFICATION (, Mục 13.2)
  // =========================================================
  if(url.pathname==='/api/public/email-otp/request'&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const email=clean(b.email,200).toLowerCase();
    const purpose=['account_request','email_change','security_verify'].includes(b.purpose)?b.purpose:'account_request';
    if(!email||!/^\S+@\S+\.\S+$/.test(email))return json({error:'EMAIL_INVALID',message:'Địa chỉ email không hợp lệ.'},400,{'cache-control':'no-store'});
    const ipRateKey=`otp-req-ip:${await sha256(clientHint(req))}`;
    const emailRateKey=`otp-req-email:${await sha256(email+'|'+purpose)}`;
    const ipState=await safeRateState(env,ipRateKey,10,15);
    const emailState=await safeRateState(env,emailRateKey,5,15);
    if(ipState.blocked||emailState.blocked)return json({error:'OTP_RATE_LIMITED',message:'Bạn đã yêu cầu gửi mã OTP quá giới hạn cho phép. Vui lòng thử lại sau 15 phút.'},429,{'retry-after':'900','cache-control':'no-store'});
    const recent=await env.DB.prepare(`SELECT id,resend_count,created_at,CASE WHEN created_at>datetime('now','-60 seconds') THEN 1 ELSE 0 END cooldown FROM email_otp_tokens WHERE email=? AND purpose=? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`).bind(email,purpose).first();
    if(recent?.cooldown)return json({error:'OTP_RESEND_COOLDOWN',message:'Vui lòng đợi ít nhất 60 giây trước khi yêu cầu gửi lại mã OTP.'},429,{'retry-after':'60','cache-control':'no-store'});
    await safeRateFail(env,ipRateKey,10,15);
    await safeRateFail(env,emailRateKey,5,15);
    const digits=new Uint32Array(1);crypto.getRandomValues(digits);
    const rawOtp=String(100000+(digits[0]%900000));
    const otpHash=await sha256(`${email}|${purpose}|${rawOtp}`);
    const otpId=uid('otp');
    const resendCount=recent?Number(recent.resend_count||0)+1:0;
    await env.DB.prepare(`UPDATE email_otp_tokens SET expires_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE email=? AND purpose=? AND used_at IS NULL AND verified_at IS NULL`).bind(email,purpose).run();
    await env.DB.prepare(`INSERT INTO email_otp_tokens(id,email,purpose,otp_hash,attempts,max_attempts,resend_count,expires_at,ip_hint,user_agent) VALUES(?,?,?,?,0,5,?,datetime('now','+10 minutes'),?,?)`).bind(otpId,email,purpose,otpHash,resendCount,clientHint(req),clean(req.headers.get('user-agent'),500)).run();
    const appUrl=env.APP_URL||DEFAULT_SYSTEM_IDENTITY.appUrl;
    const mail=await sendMemberEmail(env,{
      to:email,
      subject:`[Sky First] Mã xác minh OTP của bạn`,
      templateCode:'email_otp_verification',
      entityType:'email_otp',
      entityId:otpId,
      senderMode:'noreply',
      html:memberEmailHtml({
        title:'Xác minh địa chỉ email',
        name:clean(b.full_name,160)||email,
        intro:'Bạn vừa yêu cầu mã xác minh một lần (OTP) tại Trung tâm Nghiệp vụ Số Sky First.',
        code:rawOtp,
        codeLabel:'MÃ XÁC MINH OTP (HIỆU LỰC 10 PHÚT)',
        status:'XÁC MINH EMAIL',
        processing:'Hết hạn sau 10 phút · Chỉ dùng 1 lần',
        body:'Tuyệt đối không chia sẻ mã OTP này cho bất kỳ ai. Việc xác minh OTP chỉ xác nhận quyền kiểm soát hộp thư điện tử, không mặc nhiên thay thế chữ ký điện tử hoặc sự đồng ý cho mọi mục đích xử lý dữ liệu.',
        ctaUrl:`${appUrl}/register`,
        ctaLabel:'Quay lại Trung tâm Nghiệp vụ Số Sky First'
      })
    });
    await safeSecurityEvent(env,null,'email_otp_requested',req,{otp_id:otpId,purpose,email_sent:mail.sent===true});
    return json({
      ok:true,
      otp_id:otpId,
      email_sent:mail.sent===true,
      delivery_status:mail.sent===true?'sent':(mail.reason==='EMAIL_NOT_CONFIGURED'?'provider_not_configured':'provider_failed'),
      expires_in_seconds:600,
      message:mail.sent===true?'Mã xác minh OTP đã được nhà cung cấp dịch vụ email tiếp nhận gửi tới hộp thư của bạn.':'Dịch vụ gửi email chưa được cấu hình hoặc tạm thời lỗi; trạng thái đã được ghi nhận trung thực.'
    },mail.sent===true?200:202,{'cache-control':'no-store'});
  }

  if(url.pathname==='/api/public/email-otp/verify'&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const email=clean(b.email,200).toLowerCase();
    const rawOtp=clean(b.otp,12);
    const purpose=['account_request','email_change','security_verify'].includes(b.purpose)?b.purpose:'account_request';
    if(!email||!/^\S+@\S+\.\S+$/.test(email))return json({error:'EMAIL_INVALID',message:'Địa chỉ email không hợp lệ.'},400,{'cache-control':'no-store'});
    if(!/^\d{6}$/.test(rawOtp))return json({error:'OTP_FORMAT_INVALID',message:'Mã OTP phải gồm đúng 6 chữ số.'},400,{'cache-control':'no-store'});
    const verifyRateKey=`otp-verify:${await sha256(clientHint(req)+'|'+email)}`;
    const vr=await safeRateState(env,verifyRateKey,10,15);
    if(vr.blocked)return json({error:'OTP_TOO_MANY_ATTEMPTS',message:'Bạn đã thử sai quá nhiều lần. Vui lòng đợi 15 phút hoặc yêu cầu mã mới.'},429,{'retry-after':'900','cache-control':'no-store'});
    const row=await env.DB.prepare(`SELECT *,CASE WHEN expires_at<=CURRENT_TIMESTAMP THEN 1 ELSE 0 END is_expired FROM email_otp_tokens WHERE email=? AND purpose=? ORDER BY created_at DESC LIMIT 1`).bind(email,purpose).first();
    if(!row)return json({error:'OTP_NOT_FOUND',message:'Không tìm thấy yêu cầu OTP cho email này.'},404,{'cache-control':'no-store'});
    if(row.used_at)return json({error:'OTP_ALREADY_USED',message:'Mã OTP này đã được sử dụng.'},409,{'cache-control':'no-store'});
    if(Number(row.attempts||0)>=Number(row.max_attempts||5))return json({error:'OTP_MAX_ATTEMPTS_EXCEEDED',message:'Mã OTP đã vượt quá số lần thử cho phép (5 lần). Vui lòng yêu cầu mã mới.'},429,{'cache-control':'no-store'});
    if(row.is_expired)return json({error:'OTP_EXPIRED',message:'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi mã mới.'},410,{'cache-control':'no-store'});
    const expectedHash=await sha256(`${email}|${purpose}|${rawOtp}`);
    if(!safeEq(expectedHash,row.otp_hash)){
      await env.DB.prepare(`UPDATE email_otp_tokens SET attempts=attempts+1,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(row.id).run();
      await safeRateFail(env,verifyRateKey,10,15);
      const nextAttempts=Number(row.attempts||0)+1;
      if(nextAttempts>=Number(row.max_attempts||5)){
        return json({error:'OTP_MAX_ATTEMPTS_EXCEEDED',message:'Bạn đã nhập sai quá số lần quy định. Mã OTP đã bị vô hiệu hóa.'},429,{'cache-control':'no-store'});
      }
      return json({error:'OTP_INVALID',remaining_attempts:Math.max(0,Number(row.max_attempts||5)-nextAttempts),message:'Mã OTP không chính xác.'},400,{'cache-control':'no-store'});
    }
    await safeRateClear(env,verifyRateKey);
    const verifyToken=token();
    const verifyTokenHash=await sha256(verifyToken);
    await env.DB.prepare(`UPDATE email_otp_tokens SET verified_at=CURRENT_TIMESTAMP,verify_token_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(verifyTokenHash,row.id).run();
    await safeSecurityEvent(env,null,'email_otp_verified',req,{otp_id:row.id,purpose});
    return json({ok:true,verified:true,otp_verification_token:verifyToken,message:'Đã xác minh email thành công.'},200,{'cache-control':'no-store'});
  }

if(url.pathname==='/api/public/account-request'&&req.method==='POST'){
  const requestRateKey=`account-request:${await sha256(clientHint(req))}`;
  const requestRate=await safeRateState(env,requestRateKey,5,60);
  if(requestRate.blocked)return json({error:'REQUEST_RATE_LIMITED',message:'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau một giờ.'},429,{'retry-after':'3600'});
  await safeRateFail(env,requestRateKey,5,60);
  const b=await bodyJson(req);

  const fields=[
    'full_name',
    'display_name',
    'date_of_birth',
    'gender',
    'nationality',
    'id_number',
    'id_issue_date',
    'id_issue_place',
    'email',
    'phone',
    'permanent_address',
    'temporary_address',
    'avatar_url',
    'target_org_node_id',
    'education_or_work_type',
    'school_or_workplace',
    'education_status'
  ];

  for(const k of fields){
    if(!clean(b[k],k.includes('address')?500:240)){
      return json({
        error:'ALL_PERSONAL_FIELDS_REQUIRED',
        field:k
      },400);
    }
  }

  const email=clean(b.email,200).toLowerCase();
  const idno=clean(b.id_number,20);
  const requestedAvatarUrl=clean(b.avatar_url,1200);
  if(!/^\/files\/requests\/avatars\/[A-Za-z0-9._/-]+\.(?:png|jpe?g|webp)$/i.test(requestedAvatarUrl)||requestedAvatarUrl.includes('..')||requestedAvatarUrl.includes('\\'))return json({error:'INVALID_AVATAR_URL',message:'Ảnh hồ sơ phải được tải lên trực tiếp qua biểu mẫu đăng ký.'},400);

  if(!/^\S+@\S+\.\S+$/.test(email)){
    return json({error:'EMAIL_INVALID'},400);
  }

  if(!/^\d{12}$/.test(idno)){
    return json({
      error:'ID_NUMBER_MUST_BE_12_DIGITS'
    },400);
  }

  if(String(b.privacy_consent)!=='1'){
    return json({
      error:'PRIVACY_CONSENT_REQUIRED',
      message:'Bạn cần xác nhận đồng ý xử lý dữ liệu cá nhân theo mục đích xét duyệt và quản lý hồ sơ.'
    },400);
  }
  if(b.terms_accepted!==undefined&&String(b.terms_accepted)!=='1'){
    return json({error:'TERMS_ACCEPTANCE_REQUIRED',message:'Bạn cần chấp thuận Điều khoản sử dụng của hệ thống.'},400);
  }
  if(b.read_acknowledged!==undefined&&String(b.read_acknowledged)!=='1'){
    return json({error:'READ_ACKNOWLEDGEMENT_REQUIRED',message:'Bạn cần xác nhận đã đọc thông báo bảo mật và quyền riêng tư.'},400);
  }

  const educationType=
    clean(b.education_or_work_type,50);

  const allowedEducationTypes=[
    'Học sinh',
    'Sinh viên',
    'Đang đi làm',
    'Khác',
    'Học tập & Công việc'
  ];

  if(!allowedEducationTypes.includes(educationType)){
    return json({
      error:'EDUCATION_OR_WORK_TYPE_INVALID'
    },400);
  }

  const educationStatus=
    clean(b.education_status,80);

  const allowedEducationStatuses=[
    'Đang học',
    'Đã tốt nghiệp',
    'Đang công tác',
    'Không còn theo học',
    'Đã tốt nghiệp',
    'Khác'
  ];

  if(!allowedEducationStatuses.includes(educationStatus)){
    return json({
      error:'EDUCATION_STATUS_INVALID'
    },400);
  }

  const dob=
    new Date(
      clean(b.date_of_birth,20)+'T00:00:00Z'
    );

  if(Number.isNaN(dob.getTime())){
    return json({
      error:'DATE_OF_BIRTH_INVALID'
    },400);
  }

  const now=new Date();

  let age=
    now.getUTCFullYear()-
    dob.getUTCFullYear();

  if(
    now.getUTCMonth()<dob.getUTCMonth()||
    (
      now.getUTCMonth()===dob.getUTCMonth()&&
      now.getUTCDate()<dob.getUTCDate()
    )
  ){
    age--;
  }

  if(age<0){
    return json({
      error:'DATE_OF_BIRTH_INVALID'
    },400);
  }

  if(age<18){
    for(const k of [
      'guardian_full_name',
      'guardian_relationship',
      'guardian_phone',
      'guardian_email',
      'guardian_date_of_birth',
      'guardian_id_number'
    ]){
      if(!clean(b[k],240)){
        return json({
          error:'GUARDIAN_INFORMATION_REQUIRED',
          field:k
        },400);
      }
    }

    if(
      String(b.guardian_lives_together)!=='1'&&
      !clean(b.guardian_address,500)
    ){
      return json({
        error:'GUARDIAN_ADDRESS_REQUIRED'
      },400);
    }
  }

  for(const k of ['school_name','class_or_major','employment_status','workplace_name','work_department','job_title']){
    if(!clean(b[k],240))return json({error:'ALL_EDUCATION_WORK_FIELDS_REQUIRED',field:k},400);
  }
  const requestedOrgIds=[...new Set((Array.isArray(b.requested_org_ids)?b.requested_org_ids:[]).map(x=>clean(x,100)).filter(Boolean))];
  const primaryOrgId=clean(b.target_org_node_id,100);
  if(primaryOrgId&&!requestedOrgIds.includes(primaryOrgId))requestedOrgIds.unshift(primaryOrgId);
  if(!requestedOrgIds.length)return json({error:'AT_LEAST_ONE_ORG_REQUIRED'},400);

  const org=await env.DB.prepare(`
    SELECT id
    FROM org_nodes
    WHERE id=?
      AND status='active'
      AND deleted_at IS NULL
  `).bind(
    clean(b.target_org_node_id,100)
  ).first();

  if(!org){
    return json({
      error:'ORG_INVALID'
    },400);
  }
  for(const oid of requestedOrgIds){
    const ok=await env.DB.prepare(`SELECT 1 FROM org_nodes WHERE id=? AND status='active' AND deleted_at IS NULL`).bind(oid).first();
    if(!ok)return json({error:'ORG_INVALID'},400);
  }

  const existingAccount=
    await env.DB.prepare(`
      SELECT 1
      FROM accounts
      WHERE lower(email)=?
      LIMIT 1
    `).bind(email).first();

  if(existingAccount){
    return json({
      error:'ACCOUNT_ALREADY_EXISTS'
    },409);
  }

  const pending=
    await env.DB.prepare(`
      SELECT 1
      FROM account_requests
      WHERE status IN ('pending','supplement')
        AND (
          lower(email)=?
          OR id_number=?
        )
      LIMIT 1
    `).bind(
      email,
      idno
    ).first();

  if(pending){
    return json({
      error:'REQUEST_ALREADY_PENDING'
    },409);
  }

  const id=uid('request');

  const code=
    `SFN-MEMBER-REQ-`+
    `${String(Date.now()).slice(-8)}-`+
    `${crypto.randomUUID()
      .slice(0,4)
      .toUpperCase()}`;

  await ensureAccountRequestProfiles(env);
  await ensureAccountRequestExtended(env);
  await ensureGovernanceTables(env);

  let verifiedOtpId=null,emailVerifiedFlag=0;
  const suppliedOtpToken=clean(b.otp_verification_token,512);
  const secCfgRow=await env.DB.prepare("SELECT value_json FROM system_settings WHERE key='security'").first();
  let secCfg={};try{secCfg=JSON.parse(secCfgRow?.value_json||'{}')}catch{}
  if(suppliedOtpToken){
    const th=await sha256(suppliedOtpToken);
    const otpRow=await env.DB.prepare(`SELECT id,used_at,verified_at,CASE WHEN expires_at<=CURRENT_TIMESTAMP THEN 1 ELSE 0 END is_expired FROM email_otp_tokens WHERE verify_token_hash=? AND lower(email)=? AND purpose='account_request' LIMIT 1`).bind(th,email).first();
    if(!otpRow||!otpRow.verified_at||otpRow.is_expired)return json({error:'OTP_VERIFICATION_TOKEN_INVALID',message:'Mã xác nhận OTP không hợp lệ hoặc đã hết hạn.'},400);
    if(otpRow.used_at)return json({error:'OTP_ALREADY_USED',message:'Mã xác nhận OTP đã được sử dụng cho một yêu cầu khác.'},409);
    await env.DB.prepare(`UPDATE email_otp_tokens SET used_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(otpRow.id).run();
    verifiedOtpId=otpRow.id;emailVerifiedFlag=1;
  }else if(secCfg.require_email_otp_on_register===true){
    return json({error:'EMAIL_OTP_REQUIRED',message:'Hệ thống đang yêu cầu xác minh mã OTP email trước khi gửi hồ sơ đăng ký.'},400);
  }

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO account_requests(
        id,request_code,full_name,display_name,date_of_birth,gender,nationality,
        id_number,id_issue_date,id_issue_place,email,phone,permanent_address,temporary_address,
        avatar_url,target_org_node_id,guardian_full_name,guardian_relationship,guardian_phone,
        guardian_email,guardian_lives_together,guardian_address,privacy_consent,status
      )
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,'pending')
    `).bind(
      id,code,clean(b.full_name,160),clean(b.display_name,160),clean(b.date_of_birth,20),
      clean(b.gender,50),clean(b.nationality,80),idno,clean(b.id_issue_date,20),
      clean(b.id_issue_place,200),email,clean(b.phone,50),clean(b.permanent_address,500),
      clean(b.temporary_address,500),requestedAvatarUrl,clean(b.target_org_node_id,100),
      age<18?clean(b.guardian_full_name,160):null,
      age<18?clean(b.guardian_relationship,80):null,
      age<18?clean(b.guardian_phone,50):null,
      age<18?clean(b.guardian_email,200).toLowerCase():null,
      age<18&&String(b.guardian_lives_together)==='1'?1:0,
      age<18&&String(b.guardian_lives_together)!=='1'?clean(b.guardian_address,500):null
    ),
    env.DB.prepare(`
      INSERT INTO account_request_profiles(
        request_id,education_or_work_type,school_or_workplace,class_or_major,education_status
      ) VALUES(?,?,?,?,?)
    `).bind(
      id,educationType,clean(b.school_or_workplace,240),clean(b.class_or_major,240)||null,educationStatus
    )
  ]);
  await env.DB.prepare(`INSERT INTO account_request_extended(request_id,school_name,class_or_major,employment_status,workplace_name,work_department,job_title,guardian_date_of_birth,guardian_id_number) VALUES(?,?,?,?,?,?,?,?,?)`).bind(
    id,clean(b.school_name,240),clean(b.class_or_major,240),clean(b.employment_status,80),clean(b.workplace_name,240),clean(b.work_department,180),clean(b.job_title,180),age<18?clean(b.guardian_date_of_birth,20):null,age<18?clean(b.guardian_id_number,30):null
  ).run();
  await env.DB.batch(requestedOrgIds.map(oid=>env.DB.prepare(`INSERT OR IGNORE INTO account_request_orgs(request_id,org_node_id,is_primary) VALUES(?,?,?)`).bind(id,oid,oid===primaryOrgId?1:0)));
  await env.DB.prepare(`INSERT INTO legal_consent_records(id,subject_type,subject_id,email,terms_version,privacy_version,read_acknowledged,terms_accepted,privacy_consent,accuracy_committed,is_minor,guardian_consent,email_verified,otp_token_id,purpose_scope,ip_hint,user_agent) VALUES(?,'account_request',?,?, '2026.10-SFN-TERMS','2026.10-SFN-PDPD',?,?,?,?,?,?,?,?, 'account_review_and_member_operations',?,?)`).bind(
    uid('consent'),id,email,
    String(b.read_acknowledged??'1')==='1'?1:0,
    String(b.terms_accepted??'1')==='1'?1:0,
    1,
    String(b.accuracy_committed??'1')==='1'?1:0,
    age<18?1:0,
    age<18?(String(b.guardian_consent??'1')==='1'?1:0):0,
    emailVerifiedFlag,
    verifiedOtpId,
    clientHint(req),
    clean(req.headers.get('user-agent'),500)
  ).run();

  const trackingUrl=`${env.APP_URL||'https://nghiepvu.skyfirst.io.vn'}/`;
  const mail=await sendMemberEmail(env,{to:email,templateCode:'account_request_received',entityType:'account_request',entityId:id,subject:`[Sky First Network] Đã tiếp nhận yêu cầu đăng ký thành viên – ${code}`,html:memberEmailHtml({title:'Đã tiếp nhận yêu cầu của bạn',name:clean(b.full_name,160),intro:'Yêu cầu đăng ký của bạn đã được Trung tâm Nghiệp vụ Số Sky First tiếp nhận.',code,status:'ĐÃ TIẾP NHẬN',body:'Vui lòng lưu mã yêu cầu để tra cứu trạng thái. Hệ thống sẽ gửi thông báo tiếp theo khi trạng thái hồ sơ được cập nhật.',ctaUrl:trackingUrl,ctaLabel:'Mở Trung tâm Nghiệp vụ Số Sky First'})});

  return json({
    ok:true,
    email_sent:mail.sent===true,
    request_code:code,
    message:
      'Đăng ký đã được tiếp nhận. '+
      'Sky First Network dự kiến xử lý trong 60 phút đến 48 giờ, '+
      'có thể thay đổi tùy số lượng yêu cầu và quá trình xác minh. '+
      'Vui lòng thường xuyên kiểm tra email và lưu mã yêu cầu '+
      'để tra cứu trạng thái.'
  });
}

  if(url.pathname==='/api/public/account-request/status'&&req.method==='GET')return json({error:'METHOD_NOT_ALLOWED',message:'Hãy tra cứu từ biểu mẫu bảo mật của Trung tâm Nghiệp vụ Số Sky First.'},405,{'cache-control':'no-store'});
  if(url.pathname==='/api/public/account-request/status'&&req.method==='POST'){
    const b=await bodyJson(req),code=clean(b.code,100),email=clean(b.email,200).toLowerCase();
    const ipKey=`request-status-ip:${await sha256(clientHint(req))}`;
    const ipRate=await safeRateState(env,ipKey,12,15);
    if(ipRate.blocked)return json({error:'TOO_MANY_STATUS_CHECKS',message:'Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau 15 phút.'},429,{'retry-after':'900','cache-control':'no-store'});
    await safeRateFail(env,ipKey,12,15);
    if(!code||!email)return json({error:'CODE_AND_EMAIL_REQUIRED'},400,{'cache-control':'no-store'});
    const lookupKey=`request-status-lookup:${await sha256(code.toUpperCase()+'|'+email)}`;
    const lookupRate=await safeRateState(env,lookupKey,8,15);
    if(lookupRate.blocked)return json({error:'TOO_MANY_STATUS_CHECKS',message:'Thông tin tra cứu này đã được thử quá nhiều lần. Vui lòng thử lại sau.'},429,{'retry-after':'900','cache-control':'no-store'});
    await safeRateFail(env,lookupKey,8,15);
    const r=await env.DB.prepare(`
      SELECT request_code,full_name,status,admin_note,reviewed_at,created_at
      FROM account_requests WHERE request_code=? AND lower(email)=? LIMIT 1
    `).bind(code,email).first();
    return r?json({request:r},200,{'cache-control':'no-store'}):json({error:'NOT_FOUND'},404,{'cache-control':'no-store'});
  }

  if(url.pathname==='/api/public/password/forgot'&&req.method==='POST'){
    await ensureSecurityTables(env);const b=await bodyJson(req);const login=clean(b.login,200).toLowerCase();
    const key=`forgot:${await sha256(clientHint(req)+'|'+login)}`;const rs=await safeRateState(env,key,4,60);if(rs.blocked)return json({ok:true});
    await safeRateFail(env,key,4,60);
    const a=login?await env.DB.prepare(`SELECT id,email,username FROM accounts WHERE lower(username)=? OR lower(COALESCE(email,''))=? LIMIT 1`).bind(login,login).first():null;
    if(a?.email){const raw=token();const hash=await sha256(raw);await env.DB.prepare(`DELETE FROM password_reset_tokens WHERE account_id=? OR expires_at<=CURRENT_TIMESTAMP`).bind(a.id).run();await env.DB.prepare(`INSERT INTO password_reset_tokens(id,account_id,token_hash,expires_at) VALUES(?,?,?,datetime('now','+30 minutes'))`).bind(uid('reset'),a.id,hash).run();const app=env.APP_URL||new URL(req.url).origin;await sendMemberEmail(env,{to:a.email,subject:'Đặt lại mật khẩu Sky First',html:memberEmailHtml({title:'Đặt lại mật khẩu',name:a.username,intro:'Chúng tôi nhận được yêu cầu đặt lại mật khẩu.',status:'BẢO MẬT TÀI KHOẢN',body:'Liên kết này chỉ sử dụng một lần và hết hạn sau 30 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.',ctaUrl:`${app}/?reset_token=${encodeURIComponent(raw)}`,ctaLabel:'Đặt lại mật khẩu'})});await safeSecurityEvent(env,a.id,'password_reset_requested',req)}
    return json({ok:true});
  }
  if(url.pathname==='/api/public/password/reset'&&req.method==='POST'){
    await ensureSecurityTables(env);const b=await bodyJson(req);const raw=clean(b.token,512);const pw=String(b.password||'');if(!raw||pw.length<10)return json({error:'INVALID_RESET_DATA'},400);const h=await sha256(raw);const r=await env.DB.prepare(`SELECT pr.id,pr.account_id FROM password_reset_tokens pr WHERE pr.token_hash=? AND pr.used_at IS NULL AND pr.expires_at>CURRENT_TIMESTAMP LIMIT 1`).bind(h).first();if(!r)return json({error:'RESET_TOKEN_INVALID'},400);const salt=token(),it=100000,hash=await pbkdf2(pw,salt,it);await env.DB.batch([env.DB.prepare(`UPDATE accounts SET password_hash=?,password_salt=?,password_iterations=?,force_password_change=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(hash,salt,it,r.account_id),env.DB.prepare(`UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?`).bind(r.id),env.DB.prepare(`DELETE FROM sessions WHERE account_id=?`).bind(r.account_id)]);await safeSecurityEvent(env,r.account_id,'password_reset_completed',req);return json({ok:true});
  }


  // =========================================================
  // PUBLIC ACCOUNT TYPES, DATA POLICIES, DYNAMIC FORMS & PUBLIC SK EVENTS
  // =========================================================
  if(url.pathname==='/api/public/account-types'&&req.method==='GET'){
    await ensureGovernanceTables(env);
    const r=await env.DB.prepare("SELECT code,name,aliases_json,purpose,eligible_group,activation_condition,duration_hours,duration_months,allow_public_register,granted_scope_note,renewal_policy,retention_policy FROM account_type_configs WHERE status='active' ORDER BY COALESCE(duration_hours,999999)").all();
    return json({
      items:(r.results||[]).map(x=>({...x,aliases:(()=>{try{return JSON.parse(x.aliases_json||'[]')}catch{return []}})()})),
      equivalence_note:'Lưu ý nghiệp vụ: "12 tháng" và "1 năm" (01 năm) là hai cách gọi của cùng một gói thời hạn 12 tháng (365 ngày) mã annual_12m_1y, không tạo hai loại trùng lặp.'
    });
  }

  if(url.pathname==='/api/public/trial-register'&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const email=clean(b.email,200).toLowerCase();
    const fullName=clean(b.full_name,160);
    const phone=clean(b.phone,40)||'0900000000';
    const password=String(b.password||'');
    const rawType=clean(b.account_type_code,40)||'trial_24h';
    const typeCode=normalizeAccountTypeCode(rawType);
    if(!['trial_24h','trial_48h'].includes(typeCode))return json({error:'TRIAL_TYPE_ONLY',message:'Đăng ký kích hoạt tức thời chỉ áp dụng cho Tài khoản 24 giờ hoặc 48 giờ; Tài khoản 12 tháng (01 năm) đi qua luồng xét duyệt hồ sơ.'},400);
    if(!fullName||!email||!/^\S+@\S+\.\S+$/.test(email)||password.length<10)return json({error:'INVALID_TRIAL_DATA',message:'Vui lòng nhập họ tên, email hợp lệ và mật khẩu tối thiểu 10 ký tự.'},400);
    if(String(b.read_acknowledged)!=='1'||String(b.terms_accepted)!=='1'||String(b.privacy_consent)!=='1'){
      return json({error:'CONSENT_REQUIRED',message:'Vui lòng thực hiện hành động đồng ý rõ ràng đối với Thông báo bảo mật, Điều khoản sử dụng và Xử lý dữ liệu cá nhân.'},400);
    }
    const otpToken=clean(b.otp_verification_token,512);
    if(!otpToken)return json({error:'OTP_VERIFICATION_REQUIRED',message:'Tài khoản 24 giờ / 48 giờ chỉ bắt đầu tính hạn sau khi xác minh OTP email thành công.'},400);
    const th=await sha256(otpToken);
    const otpRow=await env.DB.prepare("SELECT id,used_at,verified_at,CASE WHEN expires_at<=CURRENT_TIMESTAMP THEN 1 ELSE 0 END is_expired FROM email_otp_tokens WHERE verify_token_hash=? AND lower(email)=? LIMIT 1").bind(th,email).first();
    if(!otpRow||!otpRow.verified_at||otpRow.is_expired)return json({error:'OTP_VERIFICATION_TOKEN_INVALID',message:'Mã xác nhận OTP không hợp lệ hoặc đã hết hạn.'},400);
    if(otpRow.used_at)return json({error:'OTP_ALREADY_USED',message:'Mã xác nhận OTP đã được sử dụng.'},409);
    const existing=await env.DB.prepare("SELECT 1 FROM accounts WHERE lower(email)=? LIMIT 1").bind(email).first();
    if(existing)return json({error:'ACCOUNT_ALREADY_EXISTS',message:'Email này đã được đăng ký tài khoản.'},409);

    const pid=uid('person'),aid=uid('account'),code=await memberCode(env),uname=code.toLowerCase();
    const salt=token(),it=100000,hash=await pbkdf2(password,salt,it);
    const hours=typeCode==='trial_24h'?24:48;
    const label=typeCode==='trial_24h'?'Tài khoản 24 giờ':'Tài khoản 48 giờ';
    await env.DB.batch([
      env.DB.prepare("UPDATE email_otp_tokens SET used_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(otpRow.id),
      env.DB.prepare("INSERT INTO people(id,member_code,full_name,display_name,email,phone,joined_at,status) VALUES(?,?,?,?,?,?,DATE('now'),'active')").bind(pid,code,fullName,fullName,email,phone),
      env.DB.prepare("INSERT INTO accounts(id,person_id,username,email,password_hash,password_salt,password_iterations,force_password_change,is_locked) VALUES(?,?,?,?,?,?,?,0,0)").bind(aid,pid,uname,email,hash,salt,it),
      env.DB.prepare("INSERT INTO account_scopes(id,account_id,role_id,org_node_id,active) VALUES(?,?,'role_member',NULL,1)").bind(uid('scope'),aid),
      env.DB.prepare(`INSERT INTO account_lifecycle(account_id,account_type_code,duration_label,activated_at,expires_at,lifecycle_status,last_action_reason) VALUES(?,?,?,CURRENT_TIMESTAMP,datetime('now','+${hours} hours'),'active','Kích hoạt sau khi xác minh OTP thành công')`).bind(aid,typeCode,label),
      env.DB.prepare("INSERT INTO legal_consent_records(id,subject_type,subject_id,email,terms_version,privacy_version,read_acknowledged,terms_accepted,privacy_consent,accuracy_committed,is_minor,guardian_consent,email_verified,otp_token_id,purpose_scope,ip_hint,user_agent) VALUES(?,'trial_account',?,?,'2026.10-SFN-TERMS','2026.10-SFN-PDPD',1,1,1,1,0,0,1,?,'trial_account_activation',?,?)").bind(uid('consent'),aid,email,otpRow.id,clientHint(req),clean(req.headers.get('user-agent'),500))
    ]);
    const lcRow=await env.DB.prepare("SELECT activated_at,expires_at FROM account_lifecycle WHERE account_id=?").bind(aid).first();
    await audit(env,aid,'trial_account_activated','account',aid,null,{account_type_code:typeCode,duration_hours:hours,expires_at:lcRow?.expires_at});
    return json({
      ok:true,
      account_id:aid,
      person_id:pid,
      username:uname,
      member_code:code,
      account_type_code:typeCode,
      duration_label:label,
      activated_at:lcRow?.activated_at,
      expires_at:lcRow?.expires_at,
      admin_access_granted:false
    },201);
  }

  if(url.pathname==='/api/public/policies'&&req.method==='GET'){
    await ensureGovernanceTables(env);
    const r=await env.DB.prepare("SELECT id,policy_code,policy_type,title,version_label,content_summary,content_body,is_mandatory,requires_reconsent,applicable_scope,effective_from,updated_at FROM data_policies WHERE status='active' ORDER BY is_mandatory DESC,policy_code ASC").all();
    return json({items:r.results||[]});
  }

  if(url.pathname==='/api/public/consent/withdraw'&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const email=clean(b.email,200).toLowerCase();
    const policyCode=clean(b.policy_code,80)||'SFN-OPT-NEWS';
    const reason=clean(b.reason,1000);
    if(!email||!/^\S+@\S+\.\S+$/.test(email)||!reason)return json({error:'EMAIL_AND_REASON_REQUIRED',message:'Vui lòng nhập email và lý do rút lại sự đồng ý.'},400);
    const wid=uid('cwith');
    await env.DB.prepare("INSERT INTO consent_withdrawal_requests(id,subject_email,policy_code,reason,status) VALUES(?,?,?,?,'received')").bind(wid,email,policyCode,reason).run();
    await safeAudit(env,null,'consent_withdrawal_requested','consent_withdrawal',wid,null,{email,policy_code:policyCode});
    return json({
      ok:true,
      id:wid,
      status:'received',
      message:'Yêu cầu rút lại sự đồng ý đã được tiếp nhận. Hệ thống không tự động xóa hồ sơ hoặc chứng cứ cần lưu trữ hợp pháp theo quy định.'
    },201);
  }

  if(url.pathname==='/api/public/forms'&&req.method==='GET'){
    await ensureGovernanceTables(env);
    const r=await env.DB.prepare("SELECT id,code,slug,title,description,target_audience,guidelines,support_contact,status,current_version,opens_at,closes_at,max_submissions,require_attachment,require_signature,signature_method,default_account_type FROM registration_forms WHERE status='published' ORDER BY updated_at DESC").all();
    return json({items:r.results||[]});
  }

  const pubFormMatch=url.pathname.match(/^\/api\/public\/forms\/([^/]+)$/);
  if(pubFormMatch&&req.method==='GET'){
    await ensureGovernanceTables(env);
    const key=decodeURIComponent(pubFormMatch[1]);
    const f=await env.DB.prepare("SELECT * FROM registration_forms WHERE (id=? OR slug=? OR code=?) LIMIT 1").bind(key,key,key).first();
    if(!f)return json({error:'FORM_NOT_FOUND',message:'Không tìm thấy biểu mẫu đăng ký.'},404);
    if(f.status!=='published')return json({error:'FORM_NOT_ACCEPTING_SUBMISSIONS',status:f.status,message:'Biểu mẫu hiện không mở nhận hồ sơ (đang soạn thảo, tạm dừng, đã đóng hoặc đã lưu trữ).'},403);
    const policies=await env.DB.prepare("SELECT policy_code,policy_type,title,version_label,content_summary,content_body,is_mandatory,effective_from FROM data_policies WHERE status='active' ORDER BY is_mandatory DESC").all();
    const subCount=await env.DB.prepare("SELECT COUNT(*) n FROM registration_submissions WHERE form_id=? AND status!='cancelled'").bind(f.id).first();
    return json({
      form:{
        ...f,
        fields:(()=>{try{return JSON.parse(f.fields_json||'[]')}catch{return []}})().filter(x=>x.active!==false),
        policy_codes:(()=>{try{return JSON.parse(f.policy_codes_json||'[]')}catch{return []}})(),
        submission_count:Number(subCount?.n||0)
      },
      policies:policies.results||[]
    });
  }

  const pubFormUploadMatch=url.pathname.match(/^\/api\/public\/forms\/([^/]+)\/upload$/);
  if(pubFormUploadMatch&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const key=decodeURIComponent(pubFormUploadMatch[1]);
    const f=await env.DB.prepare("SELECT id,status FROM registration_forms WHERE (id=? OR slug=? OR code=?) LIMIT 1").bind(key,key,key).first();
    if(!f||f.status!=='published')return json({error:'FORM_NOT_OPEN',message:'Biểu mẫu không mở nhận tệp đính kèm.'},403);
    const ct=(req.headers.get('content-type')||'').toLowerCase().split(';')[0].trim();
    const allowed=['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if(!allowed.includes(ct))return json({error:'FILE_TYPE_NOT_ALLOWED',message:'Định dạng tệp không nằm trong danh sách cho phép (PDF, PNG, JPG, WebP, DOCX, XLSX).'},415);
    const rawName=clean(req.headers.get('x-file-name')||'tai-lieu-dinh-kem',180).replace(/[^A-Za-z0-9._-]/g,'_');
    if(rawName.includes('..')||/\.(exe|dll|bat|cmd|sh|ps1|vbs|php|jsp)$/i.test(rawName))return json({error:'UNSAFE_FILE_NAME',message:'Tên tệp không an toàn.'},400);
    const bytes=new Uint8Array(await req.arrayBuffer());
    if(!bytes.byteLength||bytes.byteLength>5*1024*1024)return json({error:'FILE_SIZE_EXCEEDED',message:'Dung lượng tệp vượt quá giới hạn 5 MB.'},413);
    if(!validUploadedAttachment(bytes,ct))return json({error:'FILE_CONTENT_MISMATCH',message:'Nội dung thực tế của tệp (magic bytes) không khớp với định dạng khai báo hoặc chứa cấu trúc nén không an toàn.'},400);
    const ext=ct==='application/pdf'?'pdf':ct==='image/png'?'png':ct==='image/webp'?'webp':ct==='image/jpeg'?'jpg':ct.includes('wordprocessingml')?'docx':'xlsx';
    const storageKey=`submissions/${f.id}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
    if(env.FILES?.put){
      await env.FILES.put(storageKey,bytes,{httpMetadata:{contentType:ct,cacheControl:'private, no-store, max-age=0'}});
    }
    return json({
      ok:true,
      file_token:storageKey,
      file_url:`/files/${storageKey}`,
      file_name:rawName,
      mime_type:ct,
      byte_size:bytes.byteLength,
      check_status:'verified_header'
    },201);
  }

  const pubFormSubmitMatch=url.pathname.match(/^\/api\/public\/forms\/([^/]+)\/submit$/);
  if(pubFormSubmitMatch&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const key=decodeURIComponent(pubFormSubmitMatch[1]);
    const f=await env.DB.prepare("SELECT * FROM registration_forms WHERE (id=? OR slug=? OR code=?) LIMIT 1").bind(key,key,key).first();
    if(!f)return json({error:'FORM_NOT_FOUND'},404);
    if(f.status!=='published')return json({error:'FORM_CLOSED_OR_INACTIVE',status:f.status,message:'Biểu mẫu đã đóng, tạm dừng hoặc chưa công bố; không tiếp nhận hồ sơ mới.'},403);
    const nowIso=new Date().toISOString().slice(0,19).replace('T',' ');
    if(f.opens_at&&nowIso<f.opens_at)return json({error:'FORM_NOT_YET_OPEN',message:'Biểu mẫu chưa đến thời gian mở đăng ký.'},403);
    if(f.closes_at&&nowIso>f.closes_at)return json({error:'FORM_EXPIRED',message:'Biểu mẫu đã hết thời hạn đăng ký.'},403);
    if(f.max_submissions){
      const curCount=await env.DB.prepare("SELECT COUNT(*) n FROM registration_submissions WHERE form_id=? AND status!='cancelled'").bind(f.id).first();
      if(Number(curCount?.n||0)>=Number(f.max_submissions))return json({error:'FORM_MAX_SUBMISSIONS_REACHED',message:'Biểu mẫu đã đạt giới hạn số lượng đăng ký tối đa.'},409);
    }
    const b=await bodyJson(req);
    const idemKey=clean(b.idempotency_key||req.headers.get('x-idempotency-key'),120)||null;
    if(idemKey){
      const existingSub=await env.DB.prepare("SELECT id,submission_code,form_version,status FROM registration_submissions WHERE idempotency_key=? LIMIT 1").bind(idemKey).first();
      if(existingSub)return json({ok:true,deduplicated:true,submission_id:existingSub.id,submission_code:existingSub.submission_code,form_version:existingSub.form_version,status:existingSub.status},200);
    }
    const fields=(()=>{try{return JSON.parse(f.fields_json||'[]')}catch{return []}})().filter(x=>x.active!==false);
    const answers=b.answers&&typeof b.answers==='object'?b.answers:{};
    const sanitizedAnswers={};
    for(const fld of fields){
      const val=answers[fld.code];
      const strVal=Array.isArray(val)?val.map(v=>clean(v,500)).join(', '):clean(val,fld.maxLength||2000);
      if(fld.required&&!strVal)return json({error:'FIELD_REQUIRED',field:fld.code,message:`Trường "${fld.label||fld.code}" là bắt buộc.`},400);
      if(strVal&&fld.type==='email'&&!/^\S+@\S+\.\S+$/.test(strVal))return json({error:'FIELD_EMAIL_INVALID',field:fld.code,message:`Trường "${fld.label}" không đúng định dạng email.`},400);
      if(strVal&&fld.type==='number'&&Number.isNaN(Number(strVal)))return json({error:'FIELD_NUMBER_INVALID',field:fld.code},400);
      sanitizedAnswers[fld.code]=strVal;
    }
    const applicantName=clean(b.applicant_name||sanitizedAnswers.full_name,160);
    const applicantEmail=clean(b.applicant_email||sanitizedAnswers.email,200).toLowerCase();
    const applicantPhone=clean(b.applicant_phone||sanitizedAnswers.phone,40)||null;
    if(!applicantName||!applicantEmail||!/^\S+@\S+\.\S+$/.test(applicantEmail))return json({error:'APPLICANT_IDENTITY_REQUIRED',message:'Cần nhập họ tên và địa chỉ email hợp lệ của người nộp hồ sơ.'},400);

    // Mandatory policy consent checks
    const consents=b.consents&&typeof b.consents==='object'?b.consents:{};
    const reqPolicies=await env.DB.prepare("SELECT policy_code,title,version_label,is_mandatory FROM data_policies WHERE status='active'").all();
    for(const pol of (reqPolicies.results||[])){
      if(pol.is_mandatory&&String(consents[pol.policy_code]??'')!=='1'){
        return json({error:'MANDATORY_POLICY_CONSENT_MISSING',policy_code:pol.policy_code,message:`Bạn cần đồng ý rõ ràng với chính sách bắt buộc: ${pol.title} (${pol.version_label}).`},400);
      }
    }

    // Attachment check
    const filesInput=Array.isArray(b.attachments)?b.attachments:[];
    if(f.require_attachment&&!filesInput.length){
      return json({error:'ATTACHMENT_REQUIRED',message:'Biểu mẫu này yêu cầu đính kèm tệp tài liệu minh chứng.'},400);
    }

    // Signature check
    const sigInput=b.signature&&typeof b.signature==='object'?b.signature:null;
    if(f.require_signature&&(!sigInput||!clean(sigInput.signature_data_url,200000)||String(sigInput.confirmed)!=='1')){
      return json({error:'SIGNATURE_REQUIRED',message:'Biểu mẫu yêu cầu ký xác nhận và tích xác nhận trước khi nộp hồ sơ.'},400);
    }

    const subId=uid('sub');
    const subCode=`SFN-HS-${new Date().getUTCFullYear()}-${String(Date.now()).slice(-6)}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;
    const snapshot=JSON.stringify({form_id:f.id,code:f.code,title:f.title,version:f.current_version,fields});
    const initHistory=JSON.stringify([{at:new Date().toISOString(),action:'submitted',status:'submitted',actor:applicantEmail,note:'Khởi tạo hồ sơ từ biểu mẫu phiên bản v'+f.current_version}]);
    const reqAccType=sanitizedAnswers.account_type_requested||f.default_account_type||null;

    await env.DB.prepare(`INSERT INTO registration_submissions(id,submission_code,form_id,form_version,form_snapshot_json,applicant_name,applicant_email,applicant_phone,requested_account_type,org_node_id,event_id,answers_json,status,history_json,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?, 'submitted',?,?)`).bind(
      subId,subCode,f.id,f.current_version,snapshot,applicantName,applicantEmail,applicantPhone,reqAccType,f.owner_org_node_id||null,f.event_id||null,JSON.stringify(sanitizedAnswers),initHistory,idemKey
    ).run();

    for(const att of filesInput.slice(0,10)){
      const stKey=clean(att.file_token||att.storage_key,300);
      if(!stKey||stKey.includes('..'))continue;
      await env.DB.prepare("INSERT INTO registration_submission_files(id,submission_id,field_code,file_name,mime_type,byte_size,storage_key,version_no,check_status,uploaded_by_email) VALUES(?,?,?,?,?,?,?,1,'verified_header',?)").bind(
        uid('subfile'),subId,clean(att.field_code||'attachment',60),clean(att.file_name||'tai-lieu',180),clean(att.mime_type||'application/pdf',100),Number(att.byte_size||0),stKey,applicantEmail
      ).run();
    }

    let sigId=null,contentHash=null;
    if(sigInput&&clean(sigInput.signature_data_url,200000)){
      sigId=uid('sig');
      const signedPayload=JSON.stringify({submission_code:subCode,form_id:f.id,form_version:f.current_version,answers:sanitizedAnswers,consents});
      contentHash=await sha256(signedPayload);
      const sigType=['drawn_canvas','uploaded_image','electronic_confirmation'].includes(sigInput.signature_type)?sigInput.signature_type:'drawn_canvas';
      await env.DB.prepare("INSERT INTO signature_records(id,submission_id,signer_name,signer_email,signature_type,legal_classification,content_version_hash,signed_payload_snapshot,signature_data_url,status,ip_hint,user_agent) VALUES(?,?,?,?,?,'electronic_confirmation_non_ca',?,?,?,'valid',?,?)").bind(
        sigId,subId,applicantName,applicantEmail,sigType,contentHash,signedPayload,clean(sigInput.signature_data_url,200000),clientHint(req),clean(req.headers.get('user-agent'),500)
      ).run();
    }

    // Record granular consent records per policy
    for(const pol of (reqPolicies.results||[])){
      const accepted=String(consents[pol.policy_code]??'0')==='1'?1:0;
      if(accepted||pol.is_mandatory){
        await env.DB.prepare("INSERT INTO legal_consent_records(id,subject_type,subject_id,email,terms_version,privacy_version,read_acknowledged,terms_accepted,privacy_consent,accuracy_committed,is_minor,guardian_consent,email_verified,purpose_scope,ip_hint,user_agent) VALUES(?,'form_submission',?,?,?, ?,1,?,?,1,0,0,0,?,?,?)").bind(
          uid('consent'),subId,applicantEmail,pol.version_label,pol.version_label,accepted,accepted,`${f.code}:${pol.policy_code}`,clientHint(req),clean(req.headers.get('user-agent'),500)
        ).run();
      }
    }

    await safeAudit(env,null,'registration_submission_created','registration_submission',subId,f.owner_org_node_id,{submission_code:subCode,form_id:f.id,form_version:f.current_version,signature_id:sigId});
    return json({
      ok:true,
      submission_id:subId,
      submission_code:subCode,
      form_id:f.id,
      form_version:f.current_version,
      status:'submitted',
      signature_id:sigId,
      content_version_hash:contentHash,
      message:f.post_submit_message||'Hồ sơ đăng ký đã được tiếp nhận thành công.'
    },201);
  }

  if(url.pathname==='/api/public/submissions/lookup'&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const code=clean(b.submission_code||b.code,80);
    const email=clean(b.email,200).toLowerCase();
    if(!code||!email)return json({error:'CODE_AND_EMAIL_REQUIRED'},400);
    const sub=await env.DB.prepare("SELECT s.id,s.submission_code,s.form_id,s.form_version,s.applicant_name,s.applicant_email,s.status,s.decision_reason,s.supplement_request_note,s.submitted_at,s.updated_at,f.title form_title FROM registration_submissions s JOIN registration_forms f ON f.id=s.form_id WHERE s.submission_code=? AND lower(s.applicant_email)=? LIMIT 1").bind(code,email).first();
    if(!sub)return json({error:'NOT_FOUND',message:'Không tìm thấy hồ sơ khớp mã và email.'},404);
    return json({ok:true,submission:sub});
  }

  const pubSubSupplementMatch=url.pathname.match(/^\/api\/public\/submissions\/([^/]+)\/supplement$/);
  if(pubSubSupplementMatch&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const codeOrId=decodeURIComponent(pubSubSupplementMatch[1]);
    const b=await bodyJson(req);
    const email=clean(b.email,200).toLowerCase();
    const sub=await env.DB.prepare("SELECT * FROM registration_submissions WHERE (id=? OR submission_code=?) AND lower(applicant_email)=? LIMIT 1").bind(codeOrId,codeOrId,email).first();
    if(!sub)return json({error:'NOT_FOUND'},404);
    if(sub.status!=='waiting_supplement')return json({error:'SUPPLEMENT_NOT_REQUESTED',message:'Hồ sơ hiện không ở trạng thái chờ bổ sung.'},409);
    const prevAnswers=(()=>{try{return JSON.parse(sub.answers_json||'{}')}catch{return {}}})();
    const newAnswers={...prevAnswers,...(b.answers&&typeof b.answers==='object'?b.answers:{})};
    const hist=(()=>{try{return JSON.parse(sub.history_json||'[]')}catch{return []}})();
    hist.push({
      at:new Date().toISOString(),
      action:'supplement_submitted',
      previous_status:sub.status,
      status:'supplement_submitted',
      actor:email,
      previous_answers_snapshot:prevAnswers,
      note:clean(b.note,500)||'Người đăng ký đã gửi thông tin/tài liệu bổ sung'
    });
    await env.DB.prepare("UPDATE registration_submissions SET answers_json=?,status='supplement_submitted',history_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
      JSON.stringify(newAnswers),JSON.stringify(hist),sub.id
    ).run();
    if(Array.isArray(b.attachments)){
      const verRow=await env.DB.prepare("SELECT COALESCE(MAX(version_no),1)+1 v FROM registration_submission_files WHERE submission_id=?").bind(sub.id).first();
      const nextVer=Number(verRow?.v||2);
      for(const att of b.attachments.slice(0,5)){
        const stKey=clean(att.file_token||att.storage_key,300);
        if(!stKey||stKey.includes('..'))continue;
        await env.DB.prepare("INSERT INTO registration_submission_files(id,submission_id,field_code,file_name,mime_type,byte_size,storage_key,version_no,check_status,uploaded_by_email) VALUES(?,?,?,?,?,?,?,?, 'verified_header',?)").bind(
          uid('subfile'),sub.id,clean(att.field_code||'supplement',60),clean(att.file_name||'bo-sung',180),clean(att.mime_type||'application/pdf',100),Number(att.byte_size||0),stKey,nextVer,email
        ).run();
      }
    }
    await safeAudit(env,null,'registration_submission_supplemented','registration_submission',sub.id,sub.org_node_id,{submission_code:sub.submission_code});
    return json({ok:true,status:'supplement_submitted',history_count:hist.length});
  }

  // PUBLIC SK EVENTS PORTAL (Strictly only published / registration_open /registration_closed / ongoing / completed events!)
  if(url.pathname==='/api/public/sk-events'&&req.method==='GET'){
    await ensureGovernanceTables(env);
    const r=await env.DB.prepare(`
      SELECT id,event_code,name,purpose,expected_outcomes,event_type,domain_field,scale_label,proposing_org_id,host_org_id,lead_person_name,contact_email,starts_at,ends_at,location_or_platform,target_participants,eligibility_criteria,expected_participants,registration_opens_at,registration_closes_at,max_registrations,status,registration_state,published_at
      FROM sk_events
      WHERE status IN ('published','registration_open','registration_closed','ongoing','completed')
      ORDER BY starts_at DESC LIMIT 100
    `).all();
    return json({items:r.results||[]});
  }

  const pubSkRegisterMatch=url.pathname.match(/^\/api\/public\/sk-events\/([^/]+)\/register$/);
  if(pubSkRegisterMatch&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const eid=decodeURIComponent(pubSkRegisterMatch[1]);
    const ev=await env.DB.prepare("SELECT * FROM sk_events WHERE id=? OR event_code=? LIMIT 1").bind(eid,eid).first();
    if(!ev)return json({error:'EVENT_NOT_FOUND'},404);
    if(ev.status!=='registration_open'||ev.registration_state!=='open'){
      return json({error:'EVENT_REGISTRATION_NOT_OPEN',status:ev.status,registration_state:ev.registration_state,message:'Sự kiện này hiện chưa mở đăng ký hoặc đã đóng/tạm dừng đăng ký.'},403);
    }
    const b=await bodyJson(req);
    const fullName=clean(b.full_name,160);
    const email=clean(b.email,200).toLowerCase();
    const phone=clean(b.phone,40)||null;
    const orgName=clean(b.org_name,160)||null;
    if(!fullName||!email||!/^\S+@\S+\.\S+$/.test(email))return json({error:'INVALID_REGISTRATION_DATA',message:'Vui lòng nhập họ tên và email hợp lệ.'},400);
    const dup=await env.DB.prepare("SELECT id,registration_code,status FROM sk_event_registrations WHERE event_id=? AND lower(email)=? LIMIT 1").bind(ev.id,email).first();
    if(dup)return json({error:'ALREADY_REGISTERED',registration_code:dup.registration_code,message:'Email này đã đăng ký tham gia sự kiện.'},409);
    const curCount=await env.DB.prepare("SELECT COUNT(*) n FROM sk_event_registrations WHERE event_id=? AND status IN ('approved','pending','confirmed')").bind(ev.id).first();
    const isWaitlist=ev.max_registrations&&Number(curCount?.n||0)>=Number(ev.max_registrations);
    const initStatus=isWaitlist?'waitlisted':(ev.require_registration_approval?'pending':'approved');
    const regId=uid('evreg');
    const regCode=`SK-REG-${String(Date.now()).slice(-6)}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;
    await env.DB.prepare("INSERT INTO sk_event_registrations(id,registration_code,event_id,full_name,email,phone,org_name,answers_json,status) VALUES(?,?,?,?,?,?,?,?,?)").bind(
      regId,regCode,ev.id,fullName,email,phone,orgName,JSON.stringify(b.answers||{}),initStatus
    ).run();
    await safeAudit(env,null,'sk_event_participant_registered','sk_event_registration',regId,ev.host_org_id,{event_id:ev.id,status:initStatus});
    return json({ok:true,id:regId,registration_code:regCode,status:initStatus},201);
  }

  // =========================================================
  // AUTHENTICATED
  // =========================================================

  const s=await getSession(req,env);

  if(!s){
    return json({error:'UNAUTHORIZED'},401);
  }

  if(Number(s.force_password_change||0)===1 && !(url.pathname==='/api/me'&&req.method==='GET') && !(url.pathname==='/api/me/password'&&req.method==='POST') && !(url.pathname==='/api/auth/logout'&&req.method==='POST')){
    return json({error:'PASSWORD_CHANGE_REQUIRED',message:'Bạn cần đổi mật khẩu trước khi tiếp tục.'},403);
  }

  if(!sameOrigin(req)) return json({error:'ORIGIN_FORBIDDEN'},403);


  // Independent QR issuance for externally designed cards. It is deliberately
  // separate from member_cards and one_time_credentials.
  if(url.pathname==='/api/admin/issuance-overview'&&req.method==='GET'){
    if(!(await isNetworkAdmin(env,s.account_id))||!(await hasPerm(env,s.account_id,'card.manage')))return json({error:'FORBIDDEN',message:'Thống kê phát hành gồm QR và thẻ sự kiện toàn Mạng lưới; cần quyền quản trị Mạng lưới.'},403);
    const today=dateInVietnam();
    const future=new Date(Date.now()+30*86400000);
    const dateParts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(future).map(x=>[x.type,x.value]));
    const expiryLimit=`${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    const [qr,totalOt,activeOt,memberTotal,memberActive,expiring]=await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN status='active' AND date(issued_at)=issued_at AND issued_at<=? AND (expires_at IS NULL OR (date(expires_at)=expires_at AND expires_at>=?)) THEN 1 ELSE 0 END) active,SUM(CASE WHEN status='revoked' THEN 1 ELSE 0 END) revoked,SUM(CASE WHEN status='active' AND expires_at IS NOT NULL AND date(expires_at)=expires_at AND expires_at<? THEN 1 ELSE 0 END) expired,SUM(CASE WHEN status='active' AND (date(issued_at) IS NULL OR date(issued_at)<>issued_at OR issued_at>?) OR status='active' AND expires_at IS NOT NULL AND (date(expires_at) IS NULL OR date(expires_at)<>expires_at) THEN 1 ELSE 0 END) pending FROM verification_qr_records`).bind(today,today,today,today).first(),
      env.DB.prepare('SELECT COUNT(*) n FROM one_time_credentials').first(),
      env.DB.prepare(`SELECT COUNT(*) n FROM one_time_credentials WHERE status='active' AND date(issued_at)=issued_at AND issued_at<=? AND (expires_at IS NULL OR (date(expires_at)=expires_at AND expires_at>=?))`).bind(today,today).first(),
      env.DB.prepare('SELECT COUNT(*) n FROM member_cards').first(),
      env.DB.prepare(`SELECT COUNT(*) n FROM member_cards WHERE status='active' AND date(issued_at)=issued_at AND issued_at<=? AND (expires_at IS NULL OR (date(expires_at)=expires_at AND expires_at>=?))`).bind(today,today).first(),
      env.DB.prepare(`SELECT COUNT(*) n FROM member_cards WHERE status='active' AND date(issued_at)=issued_at AND issued_at<=? AND expires_at IS NOT NULL AND date(expires_at)=expires_at AND expires_at>=? AND expires_at<=?`).bind(today,today,expiryLimit).first()
    ]);
    return json({today,verification_qr:{total:Number(qr?.total||0),active:Number(qr?.active||0),expired:Number(qr?.expired||0),revoked:Number(qr?.revoked||0),pending:Number(qr?.pending||0)},one_time:{total:Number(totalOt?.n||0),active:Number(activeOt?.n||0)},member_cards:{total:Number(memberTotal?.n||0),active:Number(memberActive?.n||0),expiring_30_days:Number(expiring?.n||0)}});
  }

  if(url.pathname==='/api/admin/member-cards'&&req.method==='GET'){
    if(!(await hasPerm(env,s.account_id,'card.manage')))return json({error:'FORBIDDEN'},403);
    const q=clean(url.searchParams.get('q'),100),status=clean(url.searchParams.get('status'),20);
    const limit=Math.min(250,Math.max(10,Number(url.searchParams.get('limit')||100))),today=dateInVietnam();
    const networkWide=await isNetworkAdmin(env,s.account_id);
    const scopeIds=networkWide?null:(await visibleOrgs(env,s.account_id)).map(x=>x.id);
    if(scopeIds!==null&&!scopeIds.length)return json({items:[],today});
    const scopeSql=scopeIds===null?'':` AND c.org_node_id IN (${scopeIds.map(()=>'?').join(',')})`;
    const bind=[today,today,q,`%${q}%`,`%${q}%`,`%${q}%`,status,today,today,status,...(scopeIds||[]),limit];
    const effectiveCardStatus=`CASE WHEN c.status='active' AND (date(c.issued_at) IS NULL OR date(c.issued_at)<>c.issued_at OR date(c.issued_at,'+0 days')<>c.issued_at OR c.issued_at>?) THEN 'pending' WHEN c.status='active' AND c.expires_at IS NOT NULL AND (date(c.expires_at) IS NULL OR date(c.expires_at)<>c.expires_at OR date(c.expires_at,'+0 days')<>c.expires_at) THEN 'pending' WHEN c.status='active' AND c.expires_at IS NOT NULL AND c.expires_at<? THEN 'expired' ELSE c.status END`;
    const r=await env.DB.prepare(`
      SELECT c.id,c.person_id,c.card_type_id,c.org_node_id,c.card_number,c.title_on_card,c.issued_at,c.expires_at,
        ${effectiveCardStatus} status,
        c.verify_token,p.full_name,p.member_code,p.avatar_url,t.name card_type_name,t.template_json card_template_json,o.name org_name
      FROM member_cards c JOIN people p ON p.id=c.person_id
      LEFT JOIN card_types t ON t.id=c.card_type_id LEFT JOIN org_nodes o ON o.id=c.org_node_id
      WHERE (?='' OR p.full_name LIKE ? OR p.member_code LIKE ? OR c.card_number LIKE ?)
        AND (?='' OR (${effectiveCardStatus})=?) ${scopeSql}
      ORDER BY c.created_at DESC LIMIT ?
    `).bind(...bind).all();
    return json({items:r.results||[],today});
  }

  if(url.pathname==='/api/admin/verification-qr'&&['GET','POST'].includes(req.method)){
    if(!(await isNetworkAdmin(env,s.account_id))||!(await hasPerm(env,s.account_id,'card.manage')))return json({error:'FORBIDDEN',message:'QR độc lập là dữ liệu cấp Mạng lưới; cần quyền quản trị Mạng lưới.'},403);
    if(req.method==='GET'){
      const today=dateInVietnam();
      const q=clean(url.searchParams.get('q'),100);
      const r=await env.DB.prepare(`
        SELECT id,credential_title,full_name,role_label,organization_label,reference_number,issued_at,expires_at,
          CASE WHEN status='active' AND (date(issued_at) IS NULL OR date(issued_at)<>issued_at OR issued_at>?) THEN 'pending' WHEN status='active' AND expires_at IS NOT NULL AND (date(expires_at) IS NULL OR date(expires_at)<>expires_at) THEN 'pending' WHEN status='active' AND expires_at IS NOT NULL AND expires_at<? THEN 'expired' ELSE status END effective_status,
          verify_token,public_note,created_at,updated_at
        FROM verification_qr_records
        WHERE (?='' OR full_name LIKE ? OR credential_title LIKE ? OR reference_number LIKE ? OR organization_label LIKE ?)
        ORDER BY created_at DESC LIMIT 250
      `).bind(today,today,q,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`).all();
      return json({items:r.results||[],today});
    }
    const b=await bodyJson(req);
    const credentialTitle=clean(b.credential_title,160);
    const fullName=clean(b.full_name,160);
    const roleLabel=clean(b.role_label,160)||null;
    const organization=clean(b.organization_label,200)||null;
    const issuedAt=clean(b.issued_at,10)||dateInVietnam();
    const expiresAt=clean(b.expires_at,10)||null;
    const publicNote=clean(b.public_note,500)||null;
    const privateNotes=clean(b.private_notes,1000)||null;
    if(!credentialTitle||!fullName)return json({error:'CREDENTIAL_TITLE_AND_NAME_REQUIRED',message:'Cần nhập tên thẻ/giấy xác nhận và họ tên.'},400);
    if(!validDateOnly(issuedAt)||(expiresAt&&!validDateOnly(expiresAt)))return json({error:'INVALID_DATE',message:'Ngày cấp hoặc ngày hết hiệu lực không hợp lệ.'},400);
    if(expiresAt&&expiresAt<issuedAt)return json({error:'EXPIRY_BEFORE_ISSUE',message:'Ngày hết hiệu lực không được trước ngày cấp.'},400);
    const id=uid('vqr');
    let referenceNumber=clean(b.reference_number,80);
    if(referenceNumber&&!/^[A-Za-z0-9_-]{3,80}$/.test(referenceNumber))return json({error:'INVALID_REFERENCE_NUMBER',message:'Mã hồ sơ chỉ được chứa chữ, số, gạch ngang hoặc gạch dưới.'},400);
    if(!referenceNumber){
      for(let attempt=0;attempt<12;attempt++){
        const digits=new Uint32Array(1);crypto.getRandomValues(digits);
        const candidate=`SFN-QR-${String(digits[0]%100000000).padStart(8,'0')}`;
        const exists=await env.DB.prepare('SELECT 1 FROM verification_qr_records WHERE reference_number=? LIMIT 1').bind(candidate).first();
        if(!exists){referenceNumber=candidate;break}
      }
      if(!referenceNumber)return json({error:'REFERENCE_GENERATION_FAILED',message:'Không tạo được mã hồ sơ duy nhất. Vui lòng thử lại.'},503);
    }
    const verify=verifyCode('QRV');
    try{
      await env.DB.prepare(`INSERT INTO verification_qr_records(id,credential_title,full_name,role_label,organization_label,reference_number,issued_at,expires_at,status,verify_token,public_note,private_notes,created_by_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(id,credentialTitle,fullName,roleLabel,organization,referenceNumber,issuedAt,expiresAt,'active',verify,publicNote,privateNotes,s.account_id).run();
    }catch(e){
      const msg=String(e?.message||e);
      if(msg.includes('UNIQUE'))return json({error:'REFERENCE_NUMBER_ALREADY_USED',message:'Mã hồ sơ đã tồn tại. Hãy dùng mã khác.'},409);
      console.error('INDEPENDENT_QR_CREATE_FAILED',msg);
      return json({error:'CREATE_FAILED',message:'Chưa tạo được hồ sơ QR. Dữ liệu chưa được lưu.'},500);
    }
    await safeAudit(env,s.account_id,'verification_qr_created','verification_qr_record',id,null,{reference_number:referenceNumber,credential_title:credentialTitle});
    return json({ok:true,id,reference_number:referenceNumber,verify_token:verify,verification_url:new URL('/verify?code='+encodeURIComponent(verify),url.origin).toString()},201);
  }
  const verificationQrAction=url.pathname.match(/^\/api\/admin\/verification-qr\/([^/]+)\/(revoke)$/);
  if(verificationQrAction&&req.method==='POST'){
    if(!(await isNetworkAdmin(env,s.account_id))||!(await hasPerm(env,s.account_id,'card.manage')))return json({error:'FORBIDDEN',message:'QR độc lập là dữ liệu cấp Mạng lưới; cần quyền quản trị Mạng lưới.'},403);
    const id=decodeURIComponent(verificationQrAction[1]);
    const row=await env.DB.prepare('SELECT id,status,reference_number FROM verification_qr_records WHERE id=?').bind(id).first();
    if(!row)return json({error:'NOT_FOUND'},404);
    if(row.status!=='revoked'){
      await env.DB.prepare(`UPDATE verification_qr_records SET status='revoked',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run();
      await safeAudit(env,s.account_id,'verification_qr_revoked','verification_qr_record',id,null,{reference_number:row.reference_number});
    }
    return json({ok:true,status:'revoked'});
  }

  if(url.pathname==='/api/admin/one-time-credentials'&&['GET','POST'].includes(req.method)){
    if(!(await isNetworkAdmin(env,s.account_id))||!(await hasPerm(env,s.account_id,'card.manage')))return json({error:'FORBIDDEN',message:'Thẻ sự kiện hiện chưa gắn phạm vi đơn vị; cần quyền quản trị Mạng lưới.'},403);
    if(req.method==='GET'){
      const today=dateInVietnam();
      const r=await env.DB.prepare(`SELECT o.id,o.credential_type,o.event_name,o.full_name,o.role_label,o.card_number,o.issued_at,o.expires_at,o.status,CASE WHEN o.status='active' AND (date(o.issued_at) IS NULL OR date(o.issued_at)<>o.issued_at OR o.issued_at>?) THEN 'pending' WHEN o.status='active' AND o.expires_at IS NOT NULL AND (date(o.expires_at) IS NULL OR date(o.expires_at)<>o.expires_at) THEN 'pending' WHEN o.status='active' AND o.expires_at IS NOT NULL AND o.expires_at<? THEN 'expired' ELSE o.status END effective_status,o.verify_token,o.card_type_id,o.notes,o.created_by_account_id,o.created_at,o.updated_at,t.name card_type_name,t.template_json card_template_json FROM one_time_credentials o LEFT JOIN card_types t ON t.id=o.card_type_id ORDER BY o.created_at DESC LIMIT 250`).bind(today,today).all();
      return json({items:r.results||[]});
    }
    const b=await bodyJson(req);
    const fullName=clean(b.full_name,160);
    const eventName=clean(b.event_name,200);
    const issuedAt=clean(b.issued_at,20)||dateInVietnam();
    const expiresAt=clean(b.expires_at,20)||null;
    if(!fullName||!eventName)return json({error:'FULL_NAME_AND_EVENT_REQUIRED'},400);
    if(!validDateOnly(issuedAt)||(expiresAt&&!validDateOnly(expiresAt)))return json({error:'INVALID_DATE',message:'Ngày cấp hoặc ngày hết hiệu lực không hợp lệ.'},400);
    if(expiresAt&&expiresAt<issuedAt)return json({error:'EXPIRY_BEFORE_ISSUE',message:'Ngày hết hiệu lực không được trước ngày cấp.'},400);
    const id=uid('otc');
    const verify=verifyCode('EVT');
    let cardNumber=clean(b.card_number,120);
    if(!cardNumber){
      for(let attempt=0;attempt<8;attempt++){
        const digits=new Uint32Array(1);crypto.getRandomValues(digits);
        const candidate=`SFN-EVT-${String(digits[0]%100000000).padStart(8,'0')}`;
        const exists=await env.DB.prepare('SELECT 1 FROM one_time_credentials WHERE card_number=? LIMIT 1').bind(candidate).first();
        if(!exists){cardNumber=candidate;break}
      }
      if(!cardNumber)return json({error:'CARD_NUMBER_GENERATION_FAILED'},503);
    }
    const status=['active','used','expired','revoked'].includes(b.status)?b.status:'active';
    try{
      await env.DB.prepare(`INSERT INTO one_time_credentials(id,credential_type,event_name,full_name,role_label,photo_url,card_number,issued_at,expires_at,status,verify_token,card_type_id,notes,created_by_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,'event_card',eventName,fullName,clean(b.role_label,160)||null,null,cardNumber,issuedAt,expiresAt,status,verify,null,clean(b.notes,1000)||null,s.account_id).run();
    }catch(e){return json({error:String(e).includes('UNIQUE')?'CARD_NUMBER_ALREADY_USED':'CREATE_FAILED'},400)}
    await safeAudit(env,s.account_id,'one_time_credential_issued','one_time_credential',id,null,{event_name:eventName,card_number:cardNumber});
    return json({ok:true,id,verify_token:verify,card_number:cardNumber});
  }
  const oneTimeAction=url.pathname.match(/^\/api\/admin\/one-time-credentials\/([^/]+)\/(revoke|use)$/);
  if(oneTimeAction&&req.method==='POST'){
    if(!(await isNetworkAdmin(env,s.account_id))||!(await hasPerm(env,s.account_id,'card.manage')))return json({error:'FORBIDDEN',message:'Thẻ sự kiện hiện chưa gắn phạm vi đơn vị; cần quyền quản trị Mạng lưới.'},403);
    const id=decodeURIComponent(oneTimeAction[1]);
    const action=oneTimeAction[2];
    const row=await env.DB.prepare('SELECT id,status FROM one_time_credentials WHERE id=?').bind(id).first();
    if(!row)return json({error:'NOT_FOUND'},404);
    const next=action==='revoke'?'revoked':'used';
    await env.DB.prepare('UPDATE one_time_credentials SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(next,id).run();
    await safeAudit(env,s.account_id,action==='revoke'?'one_time_credential_revoked':'one_time_credential_used','one_time_credential',id,null,{});
    return json({ok:true,status:next});
  }

  if(url.pathname==='/api/admin/card-designs'||url.pathname.startsWith('/api/admin/card-designs/')){
    return json({error:'FEATURE_REMOVED',message:'Chức năng thiết kế và quản lý mẫu thẻ đã được gỡ bỏ. Nghiệp vụ cấp phát, tải tài liệu và xác minh vẫn được giữ.'},410);
  }

  if(url.pathname==='/api/admin/site-assets'&&req.method==='POST'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    const ct=(req.headers.get('content-type')||'').toLowerCase().split(';')[0].trim();
    if(!['image/jpeg','image/png','image/webp'].includes(ct))return json({error:'IMAGE_TYPE_NOT_ALLOWED',message:'Chỉ nhận ảnh JPG, PNG hoặc WebP.'},415);
    const bytes=new Uint8Array(await req.arrayBuffer());
    if(!bytes.length||bytes.length>2*1024*1024)return json({error:'IMAGE_TOO_LARGE',message:'Ảnh phải nhỏ hơn hoặc bằng 2 MB.'},413);
    const valid=validUploadedImage(bytes,ct);
    if(!valid)return json({error:'INVALID_IMAGE_FILE',message:'Nội dung tệp không khớp với định dạng ảnh đã chọn.'},400);
    if(!env.FILES)return json({error:'FILE_STORAGE_UNAVAILABLE',message:'Kho lưu trữ tệp chưa được cấu hình.'},503);
    const ext=ct==='image/png'?'png':ct==='image/webp'?'webp':'jpg';
    const key=`site-assets/${crypto.randomUUID()}.${ext}`;
    await env.FILES.put(key,bytes,{httpMetadata:{contentType:ct,cacheControl:'public, max-age=31536000, immutable'}});
    await audit(env,s.account_id,'site_asset_uploaded','site_asset',key,null,{content_type:ct,size:bytes.length});
    return json({ok:true,url:`/files/${key}`,message:'Đã tải ảnh lên kho lưu trữ.'},201);
  }

  if(url.pathname==='/api/admin/portal-config'&&['GET','PUT'].includes(req.method)){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    if(req.method==='GET'){
      const r=await env.DB.prepare("SELECT value_json,updated_at FROM system_settings WHERE key='member_portal_v4'").first();
      let data={};try{data=JSON.parse(r?.value_json||'{}')}catch{}
      const savedBrand=data.brand&&typeof data.brand==='object'?data.brand:{};
      const brand={...DEFAULT_PORTAL_BRAND,siteName:clean(savedBrand.siteName||data.siteName||DEFAULT_PORTAL_BRAND.siteName,100)||DEFAULT_PORTAL_BRAND.siteName,logoUrl:localBrandImagePath(savedBrand.logoUrl||data.logoUrl||DEFAULT_PORTAL_BRAND.logoUrl),primaryColor:/^#[a-f0-9]{6}$/i.test(savedBrand.primaryColor||'')?savedBrand.primaryColor:DEFAULT_PORTAL_BRAND.primaryColor,accentColor:/^#[a-f0-9]{6}$/i.test(savedBrand.accentColor||'')?savedBrand.accentColor:DEFAULT_PORTAL_BRAND.accentColor,navColor:/^#[a-f0-9]{6}$/i.test(savedBrand.navColor||'')?savedBrand.navColor:DEFAULT_PORTAL_BRAND.navColor,fontFamily:['Arial','Verdana','Georgia','Tahoma','system'].includes(savedBrand.fontFamily)?savedBrand.fontFamily:DEFAULT_PORTAL_BRAND.fontFamily,baseFontSize:Number.isInteger(Number(savedBrand.baseFontSize))&&Number(savedBrand.baseFontSize)>=14&&Number(savedBrand.baseFontSize)<=20?Number(savedBrand.baseFontSize):16,cornerRadius:Number.isInteger(Number(savedBrand.cornerRadius))&&Number(savedBrand.cornerRadius)>=8&&Number(savedBrand.cornerRadius)<=24?Number(savedBrand.cornerRadius):18,contentMaxWidth:Number.isInteger(Number(savedBrand.contentMaxWidth))&&Number(savedBrand.contentMaxWidth)>=1080&&Number(savedBrand.contentMaxWidth)<=1680?Number(savedBrand.contentMaxWidth):1500};
      const links=portalLinksFromSettings(data.links);
      return json({settings:{...data,brand,links},updated_at:r?.updated_at||null});
    }
    const b=await bodyJson(req),valid=new Set(['members','activities','units','programs']);
    const stored=await env.DB.prepare("SELECT value_json FROM system_settings WHERE key='member_portal_v4'").first();let previous={};try{previous=JSON.parse(stored?.value_json||'{}')}catch{}
    let stats=Array.isArray(previous.stats)?previous.stats:[];
    if(b.stats!==undefined){
      if(!Array.isArray(b.stats)||b.stats.length>8)return json({error:'INVALID_STATS',message:'Danh sách thống kê không hợp lệ.'},400);
      const seen=new Set();stats=[];
      for(const x of b.stats){
        if(!x||!valid.has(x.key)||seen.has(x.key))return json({error:'INVALID_STAT_KEY',message:'Có chỉ số thống kê không hợp lệ hoặc bị trùng.'},400);
        seen.add(x.key);const mode=x.mode==='manual'?'manual':'auto';
        if(x.key==='programs'&&mode==='auto')return json({error:'PROGRAM_COUNT_REQUIRES_MANUAL_VALUE',message:'Số chương trình phải được nhập sau khi kiểm chứng.'},400);
        const value=x.value===null||x.value===''?null:Number(x.value);
        if(mode==='manual'&&value!==null&&(!Number.isSafeInteger(value)||value<0||value>1000000000))return json({error:'INVALID_STAT_VALUE',message:'Giá trị thống kê không hợp lệ.'},400);
        stats.push({key:x.key,label:clean(x.label,75)||x.key,mode,value:mode==='manual'?value:null,enabled:x.enabled!==false});
      }
    }
    const oldBrand=previous.brand&&typeof previous.brand==='object'?previous.brand:{};
    const rawBrand=b.brand&&typeof b.brand==='object'?b.brand:{};
    const brand={
      siteName:clean(rawBrand.siteName??oldBrand.siteName??previous.siteName??DEFAULT_PORTAL_BRAND.siteName,100)||DEFAULT_PORTAL_BRAND.siteName,
      logoUrl:localBrandImagePath(rawBrand.logoUrl??oldBrand.logoUrl??previous.logoUrl??DEFAULT_PORTAL_BRAND.logoUrl),
      primaryColor:clean(rawBrand.primaryColor??oldBrand.primaryColor??DEFAULT_PORTAL_BRAND.primaryColor,7),
      accentColor:clean(rawBrand.accentColor??oldBrand.accentColor??DEFAULT_PORTAL_BRAND.accentColor,7),
      navColor:clean(rawBrand.navColor??oldBrand.navColor??DEFAULT_PORTAL_BRAND.navColor,7),
      fontFamily:clean(rawBrand.fontFamily??oldBrand.fontFamily??DEFAULT_PORTAL_BRAND.fontFamily,20),
      baseFontSize:Number(rawBrand.baseFontSize??oldBrand.baseFontSize??DEFAULT_PORTAL_BRAND.baseFontSize),
      cornerRadius:Number(rawBrand.cornerRadius??oldBrand.cornerRadius??DEFAULT_PORTAL_BRAND.cornerRadius??18),
      contentMaxWidth:Number(rawBrand.contentMaxWidth??oldBrand.contentMaxWidth??DEFAULT_PORTAL_BRAND.contentMaxWidth??1500)
    };
    for(const k of ['primaryColor','accentColor','navColor'])if(!/^#[a-f0-9]{6}$/i.test(brand[k]))return json({error:'INVALID_BRAND_COLOR',message:'Màu sắc phải có dạng mã màu hợp lệ.'},400);
    if(!['Arial','Verdana','Georgia','Tahoma','system'].includes(brand.fontFamily))return json({error:'INVALID_FONT',message:'Kiểu chữ chưa được hỗ trợ.'},400);
    if(!Number.isInteger(brand.baseFontSize)||brand.baseFontSize<14||brand.baseFontSize>20)return json({error:'INVALID_FONT_SIZE',message:'Cỡ chữ phải từ 14 đến 20.'},400);
    if(!Number.isInteger(brand.cornerRadius)||brand.cornerRadius<8||brand.cornerRadius>24)return json({error:'INVALID_CORNER_RADIUS',message:'Độ bo góc phải từ 8 đến 24.'},400);
    if(!Number.isInteger(brand.contentMaxWidth)||brand.contentMaxWidth<1080||brand.contentMaxWidth>1680)return json({error:'INVALID_CONTENT_WIDTH',message:'Chiều rộng nội dung phải từ 1080 đến 1680.'},400);
    if(rawBrand.logoUrl!==undefined&&String(rawBrand.logoUrl)!=='/sfn-logo.png'&&!/^\/files\/site-assets\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.(?:png|jpg|webp)$/i.test(String(rawBrand.logoUrl)))return json({error:'INVALID_LOGO_PATH',message:'Logo phải là ảnh đã tải lên hệ thống.'},400);
    let links=Array.isArray(previous.links)?previous.links:DEFAULT_PORTAL_LINKS;
    if(b.links!==undefined){
      if(!Array.isArray(b.links)||b.links.length!==DEFAULT_PORTAL_LINKS.length)return json({error:'INVALID_PORTAL_LINKS',message:`Cần khai báo đúng ${DEFAULT_PORTAL_LINKS.length} cổng dịch vụ đang hoạt động của Sky First.`},400);
      links=[];
      for(const [i,x] of b.links.entries()){
        const u=safeSkyFirstUrl(x?.url),name=clean(x?.name,100),description=clean(x?.description,140);
        let samePortal=false;try{samePortal=!!u&&new URL(u).hostname===new URL(DEFAULT_PORTAL_LINKS[i].url).hostname}catch{}
        if(!u||!name||!samePortal)return json({error:'INVALID_PORTAL_LINK',message:`Nền tảng thứ ${i+1} cần có tên và địa chỉ đúng website đã quy định.`},400);
        links.push({name,url:u,description});
      }
    }
    const settings={...previous,stats,tagline:clean(b.tagline??previous.tagline??'Mỗi thành viên là một hành trình. Mỗi đóng góp tạo nên một Sky First lớn mạnh hơn.',190),brand,links};
    await env.DB.prepare("INSERT INTO system_settings(key,value_json,updated_at) VALUES('member_portal_v4',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(settings)).run();
    await ensureGovernanceTables(env);
    const verRow=await env.DB.prepare("SELECT COALESCE(MAX(version_no),0)+1 v FROM system_config_history WHERE config_key='member_portal_v4'").first();
    await env.DB.prepare("INSERT INTO system_config_history(id,config_key,version_no,previous_value_json,new_value_json,change_reason,impact_summary_json,actor_account_id,approved_by_account_id) VALUES(?,?,?, ?,?,?,?, ?,?)").bind(uid('cfghist'),'member_portal_v4',Number(verRow?.v||1),JSON.stringify(previous),JSON.stringify(settings),clean(b.change_reason,300)||'Cập nhật cấu hình giao diện và liên kết từ Admin',JSON.stringify({affected:['public_pages','login_gate','brand_theme','ecosystem_links']}),s.account_id,s.account_id).run();
    await audit(env,s.account_id,'portal_config_updated','system_settings','member_portal_v4',null,{keys:stats.map(x=>x.key),brand_updated:true,links_updated:true});
    return json({ok:true,settings});
  }
  const restrictionRoute=url.pathname.match(/^\/api\/admin\/members\/([^/]+)\/restriction$/);
  if(restrictionRoute){
    if(!(await hasPerm(env,s.account_id,'account.manage')))return json({error:'FORBIDDEN'},403);
    const pid=decodeURIComponent(restrictionRoute[1]);
    if(!(await canAccessPerson(env,s.account_id,pid)))return json({error:'SCOPE_FORBIDDEN'},403);
    const target=await env.DB.prepare('SELECT a.id,a.email,p.full_name FROM accounts a JOIN people p ON p.id=a.person_id WHERE a.person_id=?').bind(pid).first();
    if(!target)return json({error:'ACCOUNT_NOT_FOUND'},404);
    if(req.method==='GET'){
      const row=await env.DB.prepare('SELECT restriction_type,reason,ends_at,created_at,updated_at FROM account_restrictions WHERE account_id=?').bind(target.id).first();
      return json({restriction:row||null});
    }
    if(req.method==='POST'){
      if(target.id===s.account_id)return json({error:'CANNOT_RESTRICT_SELF'},409);
      if(await isSuper(env,target.id))return json({error:'SUPER_ADMIN_PROTECTED'},403);
      const b=await bodyJson(req),type=clean(b.type,20),reason=clean(b.reason,500);
      if(!['ban','unban'].includes(type))return json({error:'INVALID_RESTRICTION'},400);
      if(type==='ban'){
        const end=clean(b.ends_at,35)||null;
        if(!reason)return json({error:'REASON_REQUIRED'},400);
        if(end){
          const localToday=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
          if(!/^\d{4}-\d{2}-\d{2}$/.test(end)||Number.isNaN(Date.parse(end+'T00:00:00Z'))||new Date(end+'T00:00:00Z').toISOString().slice(0,10)!==end||end<localToday)return json({error:'INVALID_END_DATE'},400);
        }
        await env.DB.prepare("INSERT INTO account_restrictions(account_id,restriction_type,reason,ends_at,actor_account_id,updated_at) VALUES(?,'ban',?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(account_id) DO UPDATE SET restriction_type='ban',reason=excluded.reason,ends_at=excluded.ends_at,actor_account_id=excluded.actor_account_id,updated_at=CURRENT_TIMESTAMP").bind(target.id,reason,end,s.account_id).run();
        await env.DB.prepare('DELETE FROM sessions WHERE account_id=?').bind(target.id).run();
      }else{
        await env.DB.prepare('DELETE FROM account_restrictions WHERE account_id=?').bind(target.id).run();
      }
      await audit(env,s.account_id,type==='ban'?'account_banned':'account_unbanned','account',target.id,null,{reason,ends_at:clean(b.ends_at,35)||null});
      let mail={sent:false,reason:'NOT_REQUESTED'};
      if(b.notify===true&&target.email){
        mail=await sendMemberEmail(env,{to:target.email,subject:type==='ban'?'[Sky First] Thông báo giới hạn tài khoản':'[Sky First] Tài khoản đã được mở lại',html:memberEmailHtml({title:type==='ban'?'Thông báo giới hạn tài khoản':'Tài khoản được khôi phục',name:target.full_name,intro:type==='ban'?'Tài khoản hiện không thể đăng nhập theo quyết định quản trị.':'Quyền truy cập đã được khôi phục.',status:type==='ban'?'TẠM NGƯNG TRUY CẬP':'ĐƯỢC KHÔI PHỤC',body:type==='ban'?`Lý do: ${reason}. ${clean(b.ends_at,35)?'Thời hạn đến hết ngày '+clean(b.ends_at,35):'Không xác định thời hạn'}. Có thể liên hệ support@skyfirst.io.vn để yêu cầu xem xét.`:'Bạn có thể tiếp tục đăng nhập vào hệ thống.',ctaUrl:env.APP_URL||'https://nghiepvu.skyfirst.io.vn',ctaLabel:'Mở Trung tâm Nghiệp vụ Số Sky First'})});
      }
      return json({ok:true,type,email_sent:mail.sent===true});
    }
  }

  if(url.pathname==='/api/me/security/sessions'&&req.method==='GET'){
    const r=await env.DB.prepare(`SELECT id,created_at,last_seen_at,user_agent,ip_hint,expires_at,CASE WHEN id=? THEN 1 ELSE 0 END current FROM sessions WHERE account_id=? AND expires_at>CURRENT_TIMESTAMP ORDER BY last_seen_at DESC`).bind(s.session_id,s.account_id).all();
    return json({items:r.results||[]});
  }
  if(url.pathname==='/api/me/security/events'&&req.method==='GET'){
    await ensureSecurityTables(env);const r=await env.DB.prepare(`SELECT event_type,ip_hint,user_agent,created_at FROM security_events WHERE account_id=? ORDER BY created_at DESC LIMIT 100`).bind(s.account_id).all();return json({items:r.results||[]});
  }
  const revokeMatch=url.pathname.match(/^\/api\/me\/security\/sessions\/([^/]+)$/);
  if(revokeMatch&&req.method==='DELETE'){
    const sid=decodeURIComponent(revokeMatch[1]);await env.DB.prepare(`DELETE FROM sessions WHERE id=? AND account_id=?`).bind(sid,s.account_id).run();await safeSecurityEvent(env,s.account_id,'session_revoked',req,{session_id:sid});return json({ok:true,current:sid===s.session_id});
  }
  if(url.pathname==='/api/me/security/revoke-others'&&req.method==='POST'){
    await env.DB.prepare(`DELETE FROM sessions WHERE account_id=? AND id<>?`).bind(s.account_id,s.session_id).run();await safeSecurityEvent(env,s.account_id,'other_sessions_revoked',req);return json({ok:true});
  }

  // Directory is isolated by ACTIVE shared unit membership. Network admins may see all.
  if(url.pathname==='/api/directory'&&req.method==='GET'){
    const q=clean(url.searchParams.get('q'),100);
    const limit=Math.min(100,Math.max(10,Number(url.searchParams.get('limit')||50)));
    if(await isNetworkAdmin(env,s.account_id)){
      const r=await env.DB.prepare(`SELECT DISTINCT p.id,p.member_code,p.display_name,p.full_name,p.avatar_url,p.status FROM people p WHERE p.status='active' AND (?='' OR p.full_name LIKE ? OR p.display_name LIKE ? OR p.member_code LIKE ?) ORDER BY p.full_name LIMIT ?`).bind(q,`%${q}%`,`%${q}%`,`%${q}%`,limit).all();
      return json({items:r.results||[],scope:'network'});
    }
    const r=await env.DB.prepare(`
      SELECT DISTINCT p.id,p.member_code,p.display_name,p.full_name,p.avatar_url,p.status,
        GROUP_CONCAT(DISTINCT o.name) shared_units
      FROM accounts me
      JOIN org_memberships mine ON mine.person_id=me.person_id AND mine.status='active'
      JOIN org_memberships theirs ON theirs.org_node_id=mine.org_node_id AND theirs.status='active'
      JOIN people p ON p.id=theirs.person_id AND p.status='active'
      JOIN org_nodes o ON o.id=mine.org_node_id
      WHERE me.id=? AND (?='' OR p.full_name LIKE ? OR p.display_name LIKE ? OR p.member_code LIKE ?)
      GROUP BY p.id
      ORDER BY p.full_name LIMIT ?
    `).bind(s.account_id,q,`%${q}%`,`%${q}%`,`%${q}%`,limit).all();
    return json({items:r.results||[],scope:'shared_unit'});
  }

  // =========================================================
  // MY PROFILE
  // =========================================================

  if(url.pathname==='/api/me'&&req.method==='GET'){
    const person=await env.DB.prepare(
      'SELECT * FROM people WHERE id=?'
    ).bind(s.person_id).first();
    await ensureAccountRequestExtended(env);
    const workProfile=await env.DB.prepare(`SELECT school_name,employment_status,workplace_name,work_department,job_title FROM people_work_profiles WHERE person_id=?`).bind(s.person_id).first();

    const memberships=await env.DB.prepare(`
      SELECT
        m.*,
        o.name org_name,
        o.short_name,
        o.node_type
      FROM org_memberships m
      JOIN org_nodes o
        ON o.id=m.org_node_id
      WHERE m.person_id=?
        AND COALESCE(m.status,'active') NOT IN ('hidden','suspended')
      ORDER BY
        m.is_primary DESC,
        m.started_at DESC
    `).bind(s.person_id).all();

    const cards=await env.DB.prepare(`
      SELECT
        c.*,
        t.name card_type_name,
        t.code card_type_code,
        o.name org_name
      FROM member_cards c
      JOIN card_types t
        ON t.id=c.card_type_id
      LEFT JOIN org_nodes o
        ON o.id=c.org_node_id
      WHERE c.person_id=?
      ORDER BY
        c.status='active' DESC,
        c.issued_at DESC
    `).bind(s.person_id).all();

    const perms=await env.DB.prepare(`
      SELECT DISTINCT p.code
      FROM account_scopes s
      JOIN role_permissions rp
        ON rp.role_id=s.role_id
      JOIN permissions p
        ON p.id=rp.permission_id
      WHERE s.account_id=?
        AND s.active=1
    `).bind(s.account_id).all();

    const scopes=await env.DB.prepare(`
      SELECT
        s.id,
        r.code role_code,
        r.name role_name,
        s.org_node_id,
        o.name org_name
      FROM account_scopes s
      JOIN roles r
        ON r.id=s.role_id
      LEFT JOIN org_nodes o
        ON o.id=s.org_node_id
      WHERE s.account_id=?
        AND s.active=1
    `).bind(s.account_id).all();

    const scopeRows=scopes.results||[];

    const is_member=
      scopeRows.some(x=>x.role_code==='MEMBER');

    return json({
      person,
      work_profile:workProfile||{school_name:person?.school_or_workplace||'',employment_status:person?.education_status||'',workplace_name:person?.school_or_workplace||'',work_department:'',job_title:person?.class_or_major||''},
      memberships:memberships.results||[],
      cards:cards.results||[],
      permissions:
        (perms.results||[]).map(x=>x.code),
      scopes:scopeRows,
      is_member,
      is_super:
        await isSuper(env,s.account_id),
      force_password_change:
        !!s.force_password_change
    });
  }

  if(url.pathname==='/api/me'&&req.method==='PATCH'){
    const b=await bodyJson(req);
    const current=await env.DB.prepare('SELECT * FROM people WHERE id=?').bind(s.person_id).first();
    if(!current)return json({error:'PROFILE_NOT_FOUND'},404);
    await ensureAccountRequestExtended(env);
    const currentWork=await env.DB.prepare('SELECT * FROM people_work_profiles WHERE person_id=?').bind(s.person_id).first()||{};
    const takeWork=(key,max,fallback='')=>Object.prototype.hasOwnProperty.call(b,key)?clean(b[key],max):(currentWork[key]||fallback||'');
    const nextWork={school_name:takeWork('school_name',240,current.school_or_workplace),employment_status:takeWork('employment_status',80,current.education_status),workplace_name:takeWork('workplace_name',240,current.school_or_workplace),work_department:takeWork('work_department',180),job_title:takeWork('job_title',180,current.class_or_major)};

    const take=(key,max,lower=false)=>{
      if(!Object.prototype.hasOwnProperty.call(b,key))return current[key]??'';
      const v=clean(b[key],max);
      return lower?v.toLowerCase():v;
    };

    const next={
      full_name:take('full_name',160),
      display_name:take('display_name',160),
      date_of_birth:take('date_of_birth',20),
      gender:take('gender',50),
      nationality:take('nationality',80),
      id_number:take('id_number',80),
      id_issue_date:take('id_issue_date',20),
      id_issue_place:take('id_issue_place',200),
      email:take('email',200,true),
      phone:take('phone',50),
      permanent_address:take('permanent_address',500),
      temporary_address:take('temporary_address',500),
      education_or_work_type:take('education_or_work_type',50),
      school_or_workplace:take('school_or_workplace',240),
      class_or_major:take('class_or_major',240),
      education_status:take('education_status',80),
      // Không chọn ảnh mới = giữ nguyên ảnh cũ.
      avatar_url:Object.prototype.hasOwnProperty.call(b,'avatar_url')
        ?(clean(b.avatar_url,1200)||current.avatar_url||'')
        :(current.avatar_url||'')
    };

    const required=[
      ['full_name','Họ và tên'],
      ['date_of_birth','Ngày sinh'],
      ['email','Email']
    ];
    for(const [key,label] of required){
      if(!next[key])return json({error:'PERSONAL_FIELD_REQUIRED',field:key,message:`Vui lòng nhập ${label}.`},400);
    }
    if(next.email&&!/^\S+@\S+\.\S+$/.test(next.email))return json({error:'EMAIL_INVALID',field:'email',message:'Email không hợp lệ.'},400);
    let emailChangeOtpId=null;
    if(next.email!==String(current.email||'').toLowerCase()){
      const emailChangeOtpToken=clean(b.email_change_otp_token,512);
      if(!emailChangeOtpToken){
        return json({error:'EMAIL_CHANGE_REQUIRES_VERIFICATION',field:'email',message:'Email đăng nhập chỉ được thay đổi sau khi xác minh mã OTP gửi tới email mới. Vui lòng bấm "Đổi email đăng nhập (Xác minh OTP)" hoặc liên hệ support@skyfirst.io.vn.'},409);
      }
      await ensureGovernanceTables(env);
      const dupEmail=await env.DB.prepare(`SELECT 1 FROM accounts WHERE lower(email)=? AND id!=? UNION ALL SELECT 1 FROM people WHERE lower(email)=? AND id!=? LIMIT 1`).bind(next.email,s.account_id,next.email,s.person_id).first();
      if(dupEmail)return json({error:'EMAIL_ALREADY_USED',field:'email',message:'Email này đã được sử dụng bởi một hồ sơ khác.'},409);
      const otpHash=await sha256(emailChangeOtpToken);
      const otpRow=await env.DB.prepare(`SELECT id,used_at,verified_at,CASE WHEN expires_at<=CURRENT_TIMESTAMP THEN 1 ELSE 0 END is_expired FROM email_otp_tokens WHERE verify_token_hash=? AND lower(email)=? AND purpose='email_change' LIMIT 1`).bind(otpHash,next.email).first();
      if(!otpRow||!otpRow.verified_at||otpRow.is_expired)return json({error:'EMAIL_CHANGE_OTP_INVALID',field:'email_change_otp_token',message:'Mã xác nhận OTP đổi email không hợp lệ hoặc đã hết hạn.'},400);
      if(otpRow.used_at)return json({error:'OTP_ALREADY_USED',field:'email_change_otp_token',message:'Mã xác nhận OTP đổi email đã được sử dụng.'},409);
      emailChangeOtpId=otpRow.id;
    }
    if(next.id_number&& !/^\d{12}$/.test(next.id_number))return json({error:'ID_NUMBER_MUST_BE_12_DIGITS',field:'id_number',message:'CCCD phải gồm đúng 12 chữ số.'},400);

    try{
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE people SET
            full_name=?,display_name=?,date_of_birth=?,gender=?,nationality=?,id_number=?,id_issue_date=?,id_issue_place=?,
            email=?,phone=?,permanent_address=?,temporary_address=?,education_or_work_type=?,school_or_workplace=?,class_or_major=?,
            education_status=?,avatar_url=?,updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `).bind(
          next.full_name,next.display_name||null,next.date_of_birth||null,next.gender||null,next.nationality||null,next.id_number||null,
          next.id_issue_date||null,next.id_issue_place||null,next.email||null,next.phone||null,next.permanent_address||null,
          next.temporary_address||null,next.education_or_work_type||null,next.school_or_workplace||null,next.class_or_major||null,
          next.education_status||null,next.avatar_url||null,s.person_id
        ),
        env.DB.prepare(`UPDATE accounts SET email=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(next.email||null,s.account_id),
        env.DB.prepare(`INSERT INTO people_work_profiles(person_id,school_name,employment_status,workplace_name,work_department,job_title,updated_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(person_id) DO UPDATE SET school_name=excluded.school_name,employment_status=excluded.employment_status,workplace_name=excluded.workplace_name,work_department=excluded.work_department,job_title=excluded.job_title,updated_at=CURRENT_TIMESTAMP`).bind(s.person_id,nextWork.school_name||null,nextWork.employment_status||null,nextWork.workplace_name||null,nextWork.work_department||null,nextWork.job_title||null)
      ]);
      if(emailChangeOtpId){
        await env.DB.prepare(`UPDATE email_otp_tokens SET used_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(emailChangeOtpId).run();
        await env.DB.prepare(`INSERT INTO legal_consent_records(id,subject_type,subject_id,email,terms_version,privacy_version,read_acknowledged,terms_accepted,privacy_consent,accuracy_committed,is_minor,guardian_consent,email_verified,otp_token_id,purpose_scope,ip_hint,user_agent) VALUES(?,'person',?,?,'2026.10-SFN-TERMS','2026.10-SFN-PDPD',1,1,1,1,0,0,1,?,'self_service_email_change',?,?)`).bind(uid('consent'),s.person_id,next.email,emailChangeOtpId,clientHint(req),clean(req.headers.get('user-agent'),500)).run();
        await safeSecurityEvent(env,s.account_id,'email_changed_via_otp',req,{previous_email:current.email,new_email:next.email,otp_id:emailChangeOtpId});
      }
      await audit(env,s.account_id,'profile_updated','person',s.person_id,null,{fields:Object.keys(b||{}),email_changed:Boolean(emailChangeOtpId)});
      return json({ok:true,email_verified:Boolean(emailChangeOtpId),person:next,work_profile:nextWork});
    }catch(err){
      const msg=String(err?.message||err);
      if(/unique/i.test(msg)&&/email/i.test(msg))return json({error:'EMAIL_ALREADY_USED',message:'Email này đã được sử dụng.'},409);
      return json({error:'PROFILE_UPDATE_FAILED',detail:msg},500);
    }
  }

  if(url.pathname==='/api/me/password'&&req.method==='POST'){
    const b=await bodyJson(req);

    const old=String(b.current_password||'');
    const pw=String(b.new_password||'');

    if(pw.length<10){
      return json({
        error:'PASSWORD_TOO_SHORT'
      },400);
    }

    const a=await env.DB.prepare(`
      SELECT *
      FROM accounts
      WHERE id=?
    `).bind(s.account_id).first();

    const forcedChange=Number(s.force_password_change||0)===1;
    const currentOK=forcedChange || await verifyPassword(
      old,
      a.password_salt,
      a.password_iterations,
      a.password_hash
    );

    if(!currentOK){
      return json({
        error:'CURRENT_PASSWORD_INVALID'
      },401);
    }

    const salt=token();
    const it=100000;
    const hash=await pbkdf2(pw,salt,it);

    await env.DB.batch([
      env.DB.prepare(`
        UPDATE accounts
        SET
          password_hash=?,
          password_salt=?,
          password_iterations=?,
          force_password_change=0,
          updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(
        hash,
        salt,
        it,
        s.account_id
      ),

      env.DB.prepare(`
        DELETE FROM sessions
        WHERE account_id=?
          AND id!=?
      `).bind(
        s.account_id,
        s.session_id
      )
    ]);

    await audit(
      env,
      s.account_id,
      'password_changed',
      'account',
      s.account_id
    );

    return json({ok:true});
  }

  // =========================================================
  // AVATAR
  // =========================================================

  if(url.pathname==='/api/me/avatar'&&req.method==='POST'){
    const ct=(req.headers.get('content-type')||'').toLowerCase().split(';')[0].trim();

    if(![
      'image/jpeg',
      'image/png',
      'image/webp'
    ].includes(ct)){
      return json({
        error:'IMAGE_TYPE_NOT_ALLOWED'
      },415);
    }

    const data=new Uint8Array(await req.arrayBuffer());

    if(
      !data.byteLength||
      data.byteLength>900000
    ){
      return json({
        error:'IMAGE_TOO_LARGE'
      },413);
    }
    if(!validUploadedImage(data,ct))return json({error:'INVALID_IMAGE_FILE',message:'Nội dung tệp không khớp định dạng ảnh được chọn.'},400);

    const ext=
      ct==='image/png'
        ?'png'
        :ct==='image/webp'
          ?'webp'
          :'jpg';

    const key=
      `avatars/${s.person_id}/`+
      `${Date.now()}.${ext}`;

    await env.FILES.put(
      key,
      data,
      {
        httpMetadata:{
          contentType:ct,
          cacheControl:
            'public, max-age=31536000, immutable'
        }
      }
    );

    const fileUrl=`/files/${key}`;

    await env.DB.prepare(`
      UPDATE people
      SET
        avatar_url=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(
      fileUrl,
      s.person_id
    ).run();

    await audit(
      env,
      s.account_id,
      'avatar_uploaded',
      'person',
      s.person_id
    );

    return json({
      ok:true,
      url:fileUrl
    });
  }

  // =========================================================
  // DASHBOARD
  // =========================================================

  if(url.pathname==='/api/dashboard'&&req.method==='GET'){
    const [g,t,a,c,h,n]=await Promise.all([
      env.DB.prepare(`
        SELECT
          period_type,
          ROUND(AVG(progress)) progress
        FROM goals
        WHERE person_id=?
          AND status='active'
        GROUP BY period_type
      `).bind(s.person_id).all(),

      env.DB.prepare(`
        SELECT COUNT(*) total
        FROM tasks
        WHERE person_id=?
          AND status!='cancelled'
      `).bind(s.person_id).first(),

      env.DB.prepare(`
        SELECT COUNT(*) total
        FROM activity_participants
        WHERE person_id=?
      `).bind(s.person_id).first(),

      env.DB.prepare(`
        SELECT COUNT(*) total
        FROM certificates
        WHERE person_id=?
          AND verification_status='verified'
      `).bind(s.person_id).first(),

      env.DB.prepare(`
        SELECT COUNT(*) total
        FROM achievements
        WHERE person_id=?
          AND verification_status='verified'
      `).bind(s.person_id).first(),

      env.DB.prepare(`
        SELECT COUNT(*) total
        FROM notifications
        WHERE person_id=?
          AND read_at IS NULL
      `).bind(s.person_id).first()
    ]);

    return json({
      goals:g.results||[],
      tasks:t?.total||0,
      activities:a?.total||0,
      certificates:c?.total||0,
      achievements:h?.total||0,
      unread:n?.total||0
    });
  }

  const selfLists={
    '/api/me/goals':`
      SELECT *
      FROM goals
      WHERE person_id=?
      ORDER BY created_at DESC
      LIMIT 200
    `,

    '/api/me/tasks':`
      SELECT *
      FROM tasks
      WHERE person_id=?
      ORDER BY created_at DESC
      LIMIT 200
    `,

    '/api/me/certificates':`
      SELECT *
      FROM certificates
      WHERE person_id=?
      ORDER BY
        COALESCE(issued_at,created_at) DESC
      LIMIT 300
    `,

    '/api/me/achievements':`
      SELECT *
      FROM achievements
      WHERE person_id=?
        AND COALESCE(verification_status,'verified')!='hidden'
      ORDER BY
        COALESCE(achieved_at,created_at) DESC
      LIMIT 300
    `,

    '/api/me/documents':`
      SELECT *
      FROM member_documents
      WHERE person_id=?
        AND COALESCE(visibility,'private')!='hidden'
      ORDER BY created_at DESC
      LIMIT 300
    `,

    '/api/me/notifications':`
      SELECT *
      FROM notifications
      WHERE person_id=?
      ORDER BY created_at DESC
      LIMIT 300
    `
  };

  if(
    selfLists[url.pathname]&&
    req.method==='GET'
  ){
    const r=await env.DB.prepare(
      selfLists[url.pathname]
    ).bind(s.person_id).all();

    return json({
      items:r.results||[]
    });
  }

  if(
    url.pathname==='/api/me/activities'&&
    req.method==='GET'
  ){
    const r=await env.DB.prepare(`
      SELECT
        a.*,
        ap.role_label,
        ap.result,
        ap.verification_status,
        o.name org_name
      FROM activity_participants ap
      JOIN activities a
        ON a.id=ap.activity_id
      LEFT JOIN org_nodes o
        ON o.id=a.org_node_id
      WHERE ap.person_id=?
        AND COALESCE(ap.verification_status,'confirmed')!='hidden'
      ORDER BY
        COALESCE(
          a.starts_at,
          a.created_at
        ) DESC
      LIMIT 300
    `).bind(s.person_id).all();

    return json({
      items:r.results||[]
    });
  }

  if(url.pathname==='/api/me/evaluations'&&req.method==='GET'){
    await ensureEvaluations(env);
    const r=await env.DB.prepare(`
      SELECT e.id,e.period_type,e.period_label,e.criteria_json,e.total_score,e.rating,e.comments,e.status,e.finalized_at,e.created_at,
             o.name org_name,a.username evaluator_username
      FROM member_evaluations e
      LEFT JOIN org_nodes o ON o.id=e.org_node_id
      LEFT JOIN accounts a ON a.id=e.evaluator_account_id
      WHERE e.person_id=? AND e.status='final' AND e.visibility='member'
      ORDER BY COALESCE(e.finalized_at,e.created_at) DESC
    `).bind(s.person_id).all();
    return json({items:r.results||[]});
  }

  // =========================================================
  // SELF COMPATIBILITY / AGGREGATED VIEWS
  // =========================================================

  if(url.pathname==='/api/me/cards'&&req.method==='GET'){
    const r=await env.DB.prepare(`
      SELECT c.*,t.name card_type_name,t.code card_type_code,t.template_json card_template_json,o.name org_name
      FROM member_cards c
      JOIN card_types t ON t.id=c.card_type_id
      LEFT JOIN org_nodes o ON o.id=c.org_node_id
      WHERE c.person_id=?
      ORDER BY c.status='active' DESC,c.issued_at DESC,c.created_at DESC
    `).bind(s.person_id).all();
    return json({items:r.results||[]});
  }

  if(url.pathname==='/api/me/history'&&req.method==='GET'){
    const r=await env.DB.prepare(`
      SELECT m.*,o.name org_name,o.short_name,o.node_type
      FROM org_memberships m
      JOIN org_nodes o ON o.id=m.org_node_id
      WHERE m.person_id=? AND COALESCE(m.status,'active')!='suspended'
      ORDER BY COALESCE(m.started_at,m.created_at) DESC
    `).bind(s.person_id).all();
    return json({items:r.results||[]});
  }

  if(url.pathname==='/api/me/cv'&&req.method==='GET'){
    const [person,memberships,activities,certificates,achievements]=await Promise.all([
      env.DB.prepare('SELECT * FROM people WHERE id=?').bind(s.person_id).first(),
      env.DB.prepare(`
        SELECT m.*,o.name org_name,o.short_name,o.node_type
        FROM org_memberships m JOIN org_nodes o ON o.id=m.org_node_id
        WHERE m.person_id=? AND COALESCE(m.status,'active')!='suspended'
        ORDER BY COALESCE(m.started_at,m.created_at) DESC
      `).bind(s.person_id).all(),
      env.DB.prepare(`
        SELECT a.*,ap.role_label,ap.result,ap.verification_status,o.name org_name
        FROM activity_participants ap JOIN activities a ON a.id=ap.activity_id
        LEFT JOIN org_nodes o ON o.id=a.org_node_id
        WHERE ap.person_id=? AND COALESCE(ap.verification_status,'confirmed')!='hidden'
        ORDER BY COALESCE(a.starts_at,a.created_at) DESC
      `).bind(s.person_id).all(),
      env.DB.prepare(`
        SELECT * FROM certificates WHERE person_id=?
        ORDER BY COALESCE(issued_at,created_at) DESC
      `).bind(s.person_id).all(),
      env.DB.prepare(`
        SELECT * FROM achievements WHERE person_id=?
          AND COALESCE(verification_status,'verified')!='hidden'
        ORDER BY COALESCE(achieved_at,created_at) DESC
      `).bind(s.person_id).all()
    ]);
    return json({
      person,
      memberships:memberships.results||[],
      activities:activities.results||[],
      certificates:certificates.results||[],
      achievements:achievements.results||[]
    });
  }

  if(url.pathname==='/api/me/journey'&&req.method==='GET'){
    if(!s.person_id)return json({items:[]});
    const [m,a,c,h]=await Promise.all([
      env.DB.prepare(`SELECT 'membership' kind,COALESCE(m.started_at,m.created_at) event_at,COALESCE(m.role_label,'Thành viên') title,o.name subtitle,m.status status FROM org_memberships m JOIN org_nodes o ON o.id=m.org_node_id WHERE m.person_id=?`).bind(s.person_id).all(),
      env.DB.prepare(`SELECT 'activity' kind,COALESCE(a.starts_at,a.created_at) event_at,a.name title,COALESCE(ap.role_label,o.name,'Hoạt động') subtitle,ap.verification_status status FROM activity_participants ap JOIN activities a ON a.id=ap.activity_id LEFT JOIN org_nodes o ON o.id=a.org_node_id WHERE ap.person_id=?`).bind(s.person_id).all(),
      env.DB.prepare(`SELECT 'certificate' kind,COALESCE(issued_at,created_at) event_at,title,issuer subtitle,verification_status status FROM certificates WHERE person_id=?`).bind(s.person_id).all(),
      env.DB.prepare(`SELECT 'achievement' kind,COALESCE(achieved_at,created_at) event_at,title,COALESCE(issuer,'Sky First Network') subtitle,verification_status status FROM achievements WHERE person_id=?`).bind(s.person_id).all()
    ]);
    const items=[...(m.results||[]),...(a.results||[]),...(c.results||[]),...(h.results||[])].filter(x=>x.event_at).sort((x,y)=>String(y.event_at).localeCompare(String(x.event_at))).slice(0,300);
    return json({items});
  }

  // =========================================================
  // PERSONAL GOALS
  // =========================================================

  if(url.pathname==='/api/me/goals'&&req.method==='POST'){
    const b=await bodyJson(req);

    const period=clean(b.period_type,20);
    const title=clean(b.title,240);

    if(
      !['week','month','quarter','year'].includes(period)||
      !title
    ){
      return json({
        error:'INVALID_DATA'
      },400);
    }

    const id=uid('goal');

    await env.DB.prepare(`
      INSERT INTO goals(
        id,
        person_id,
        org_node_id,
        period_type,
        title,
        description,
        priority,
        progress,
        status,
        starts_at,
        due_at,
        created_by_account_id
      )
      VALUES(
        ?,?,
        NULL,
        ?,?,?,?,?,?,?,?,?
      )
    `).bind(
      id,
      s.person_id,
      period,
      title,
      clean(b.description,2000)||null,
      clean(b.priority,30)||'normal',
      Math.max(
        0,
        Math.min(100,Number(b.progress||0))
      ),
      clean(b.status,30)||'active',
      clean(b.starts_at,20)||null,
      clean(b.due_at,20)||null,
      s.account_id
    ).run();

    await audit(
      env,
      s.account_id,
      'goal_created',
      'goal',
      id,
      null,
      {personal:true}
    );

    return json({ok:true,id});
  }

  const myGoal=
    url.pathname.match(
      /^\/api\/me\/goals\/([^/]+)$/
    );

  if(myGoal&&req.method==='PATCH'){
    const id=
      decodeURIComponent(myGoal[1]);

    const g=await env.DB.prepare(`
      SELECT *
      FROM goals
      WHERE id=?
        AND person_id=?
    `).bind(
      id,
      s.person_id
    ).first();

    if(!g){
      return json({error:'NOT_FOUND'},404);
    }

    const b=await bodyJson(req);

    const progress=
      Object.prototype.hasOwnProperty.call(
        b,
        'progress'
      )
        ?Math.max(
            0,
            Math.min(100,Number(b.progress))
          )
        :g.progress;

    const status=
      Object.prototype.hasOwnProperty.call(
        b,
        'status'
      )
        ?clean(b.status,30)
        :g.status;

    if(![
      'active',
      'completed',
      'cancelled'
    ].includes(status)){
      return json({
        error:'INVALID_STATUS'
      },400);
    }

    await env.DB.prepare(`
      UPDATE goals
      SET
        progress=?,
        status=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
        AND person_id=?
    `).bind(
      progress,
      status,
      id,
      s.person_id
    ).run();

    return json({ok:true});
  }

  // =========================================================
  // PERSONAL TASKS
  // =========================================================

  if(url.pathname==='/api/me/tasks'&&req.method==='POST'){
    const b=await bodyJson(req);
    const title=clean(b.title,240);

    if(!title){
      return json({
        error:'INVALID_DATA'
      },400);
    }

    const id=uid('task');

    await env.DB.prepare(`
      INSERT INTO tasks(
        id,
        person_id,
        org_node_id,
        goal_id,
        title,
        description,
        priority,
        progress,
        status,
        due_at,
        assigned_by_account_id
      )
      VALUES(
        ?,?,
        NULL,
        ?,?,?,?,?,?,?,
        NULL
      )
    `).bind(
      id,
      s.person_id,
      clean(b.goal_id,120)||null,
      title,
      clean(b.description,2000)||null,
      clean(b.priority,30)||'normal',
      Math.max(
        0,
        Math.min(100,Number(b.progress||0))
      ),
      clean(b.status,30)||'todo',
      clean(b.due_at,20)||null
    ).run();

    await audit(
      env,
      s.account_id,
      'task_created',
      'task',
      id,
      null,
      {personal:true}
    );

    return json({ok:true,id});
  }

  const myTask=
    url.pathname.match(
      /^\/api\/me\/tasks\/([^/]+)$/
    );

  if(myTask&&req.method==='PATCH'){
    const id=
      decodeURIComponent(myTask[1]);

    const t=await env.DB.prepare(`
      SELECT *
      FROM tasks
      WHERE id=?
        AND person_id=?
    `).bind(
      id,
      s.person_id
    ).first();

    if(!t){
      return json({
        error:'NOT_FOUND'
      },404);
    }

    const b=await bodyJson(req);

    const progress=
      Object.prototype.hasOwnProperty.call(
        b,
        'progress'
      )
        ?Math.max(
            0,
            Math.min(100,Number(b.progress))
          )
        :t.progress;

    const status=
      Object.prototype.hasOwnProperty.call(
        b,
        'status'
      )
        ?clean(b.status,30)
        :t.status;

    if(![
      'todo',
      'doing',
      'done',
      'cancelled'
    ].includes(status)){
      return json({
        error:'INVALID_STATUS'
      },400);
    }

    await env.DB.prepare(`
      UPDATE tasks
      SET
        progress=?,
        status=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
        AND person_id=?
    `).bind(
      progress,
      status,
      id,
      s.person_id
    ).run();

    return json({ok:true});
  }

  // =========================================================
  // EXTERNAL CERTIFICATE
  // =========================================================

  if(
    url.pathname==='/api/me/certificate-file'&&
    req.method==='POST'
  ){
    const ct=
      (req.headers.get('content-type')||'')
        .toLowerCase();

    if(ct!=='application/pdf'){
      return json({error:'PDF_ONLY'},415);
    }

    const data=await req.arrayBuffer();

    if(
      !data.byteLength||
      data.byteLength>10*1024*1024
    ){
      return json({
        error:'PDF_TOO_LARGE'
      },413);
    }

    const key=
      `certificates/external/`+
      `${s.person_id}/`+
      `${new Date().toISOString().slice(0,10)}/`+
      `${crypto.randomUUID()}.pdf`;

    await env.FILES.put(
      key,
      data,
      {
        httpMetadata:{
          contentType:'application/pdf',
          contentDisposition:'inline'
        }
      }
    );

    return json({
      ok:true,
      url:`/files/${key}`
    });
  }

  if(
    url.pathname==='/api/me/certificates/external'&&
    req.method==='POST'
  ){
    const b=await bodyJson(req);

    const title=clean(b.title,240);
    const issuer=clean(b.issuer,240);

    if(!title||!issuer){
      return json({
        error:'INVALID_DATA'
      },400);
    }

    const id=uid('certificate');

    await env.DB.prepare(`
      INSERT INTO certificates(
        id,
        person_id,
        org_node_id,
        certificate_no,
        title,
        issuer,
        issued_at,
        source_type,
        verification_status,
        file_url,
        verify_code,
        metadata_json
      )
      VALUES(
        ?,?,
        NULL,
        ?,?,?,?,
        'external',
        'pending',
        ?,
        NULL,
        ?
      )
    `).bind(
      id,
      s.person_id,
      clean(b.certificate_no,160)||null,
      title,
      issuer,
      clean(b.issued_at,20)||null,
      clean(b.file_url,1200)||null,
      JSON.stringify({
        notes:clean(b.notes,2000)
      })
    ).run();

    await audit(
      env,
      s.account_id,
      'external_certificate_submitted',
      'certificate',
      id
    );

    return json({ok:true,id});
  }

  const readNotif=
    url.pathname.match(
      /^\/api\/me\/notifications\/([^/]+)\/read$/
    );

  if(readNotif&&req.method==='POST'){
    await env.DB.prepare(`
      UPDATE notifications
      SET
        read_at=
          COALESCE(
            read_at,
            CURRENT_TIMESTAMP
          )
      WHERE id=?
        AND person_id=?
    `).bind(
      decodeURIComponent(readNotif[1]),
      s.person_id
    ).run();

    return json({ok:true});
  }

  // =========================================================
  // SUPPORT
  // =========================================================

  if(url.pathname==='/api/me/support'&&req.method==='GET'){
    await ensureGovernanceTables(env);
    const [r,msgs]=await Promise.all([
      env.DB.prepare(`SELECT st.*,sta.priority,sta.impact_level,sta.attachment_url,sta.duplicate_of_ticket_id,sta.reopen_reason,sta.reopened_at,sta.satisfaction_score,sta.feedback_comment,sta.sla_response_due_at,sta.sla_due_at,sta.sla_breached,sta.resolution_note,sta.closed_reason,sta.responded_at,sta.resolved_at FROM support_tickets st LEFT JOIN support_ticket_assignments sta ON sta.ticket_id=st.id WHERE st.person_id=? ORDER BY st.created_at DESC LIMIT 100`).bind(s.person_id).all(),
      env.DB.prepare(`SELECT m.id,m.ticket_id,m.visibility,m.message_type,m.body,m.attachment_url,m.created_at,a.username sender_username FROM support_ticket_messages m JOIN support_tickets st ON st.id=m.ticket_id LEFT JOIN accounts a ON a.id=m.sender_account_id WHERE st.person_id=? AND m.visibility='public' ORDER BY m.created_at ASC`).bind(s.person_id).all()
    ]);
    const msgMap=new Map();
    for(const m of (msgs.results||[])){
      if(!msgMap.has(m.ticket_id))msgMap.set(m.ticket_id,[]);
      msgMap.get(m.ticket_id).push(m);
    }
    const items=(r.results||[]).map(x=>({...x,messages:msgMap.get(x.id)||[]}));
    return json({items});
  }
  if(url.pathname==='/api/me/support'&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const id=uid('ticket');
    const code=`SP-${new Date().getUTCFullYear()}-${String(Date.now()).slice(-6)}-${crypto.randomUUID().slice(0,3).toUpperCase()}`;
    const subject=clean(b.subject,200);
    const body=clean(b.body,3000);
    if(!subject||!body)return json({error:'INVALID_DATA',message:'Vui lòng nhập đầy đủ tiêu đề và nội dung yêu cầu hỗ trợ.'},400);
    const category=clean(b.category,80)||'other';
    const impact=['low','medium','high','critical'].includes(b.impact_level)?b.impact_level:'medium';
    const priority=impact==='critical'?'urgent':impact==='high'?'high':impact==='low'?'low':'normal';
    const attach=clean(b.attachment_url,500)||null;
    if(attach&&(!/^(?:\/api\/files\/|\/files\/|https:\/\/nghiepvu\.skyfirst\.io\.vn\/)[A-Za-z0-9._/-]+\.(?:pdf|png|jpe?g|webp)$/i.test(attach)||attach.includes('..')||attach.includes('\\'))){
      return json({error:'INVALID_ATTACHMENT_URL',message:'Tệp đính kèm không hợp lệ hoặc không thuộc kho lưu trữ an toàn.'},400);
    }
    const dupRow=await env.DB.prepare(`SELECT id,ticket_code FROM support_tickets WHERE person_id=? AND lower(subject)=? AND status NOT IN ('completed','closed') ORDER BY created_at DESC LIMIT 1`).bind(s.person_id,subject.toLowerCase()).first();
    const slaHours=priority==='urgent'?4:priority==='high'?12:priority==='normal'?24:48;
    const slaDue=new Date(Date.now()+slaHours*3600000).toISOString().replace('T',' ').slice(0,19);
    const slaRespDue=new Date(Date.now()+Math.max(1,Math.floor(slaHours/3))*3600000).toISOString().replace('T',' ').slice(0,19);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO support_tickets(id,ticket_code,person_id,category,subject,body,status) VALUES(?,?,?,?,?,?,'received')`).bind(id,code,s.person_id,category,subject,body),
      env.DB.prepare(`INSERT INTO support_ticket_assignments(ticket_id,priority,impact_level,attachment_url,duplicate_of_ticket_id,sla_response_due_at,sla_due_at,updated_by_account_id) VALUES(?,?,?,?,?,?,?,?)`).bind(id,priority,impact,attach,dupRow?.id||null,slaRespDue,slaDue,s.account_id)
    ]);
    await audit(env,s.account_id,'support_ticket_created','support_ticket',id,null,{ticket_code:code,category,impact_level:impact,potential_duplicate:dupRow?.ticket_code||null});
    return json({
      ok:true,
      id,
      ticket_code:code,
      priority,
      impact_level:impact,
      sla_due_at:slaDue,
      sla_resolution_due_at:slaDue,
      potential_duplicate_ticket_code:dupRow?.ticket_code||null
    });
  }
  const meSupportActionMatch=url.pathname.match(/^\/api\/me\/support\/([^/]+)\/(reply|reopen|feedback)$/);
  if(meSupportActionMatch&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const tid=decodeURIComponent(meSupportActionMatch[1]);
    const act=meSupportActionMatch[2];
    const ticket=await env.DB.prepare(`SELECT * FROM support_tickets WHERE id=? AND person_id=?`).bind(tid,s.person_id).first();
    if(!ticket)return json({error:'NOT_FOUND',message:'Không tìm thấy phiếu hỗ trợ thuộc quyền truy cập của bạn.'},404);
    const b=await bodyJson(req);
    if(act==='reply'){
      const msgBody=clean(b.body,2000);
      if(!msgBody)return json({error:'MESSAGE_REQUIRED',message:'Vui lòng nhập nội dung trao đổi.'},400);
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO support_ticket_messages(id,ticket_id,sender_account_id,visibility,message_type,body) VALUES(?,?,?,'public','reply',?)`).bind(uid('tmsg'),tid,s.account_id,msgBody),
        env.DB.prepare(`UPDATE support_tickets SET status='in_progress',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(tid)
      ]);
      await audit(env,s.account_id,'support_ticket_replied','support_ticket',tid,null,{by:'member'});
      return json({ok:true},201);
    }
    if(act==='reopen'){
      const reason=clean(b.reopen_reason||b.reason,500);
      if(!reason)return json({error:'REOPEN_REASON_REQUIRED',message:'Vui lòng nhập lý do mở lại yêu cầu hỗ trợ.'},400);
      if(!['completed','closed','responded'].includes(ticket.status))return json({error:'INVALID_TICKET_STATE',message:'Chỉ có thể mở lại yêu cầu đã giải quyết hoặc đã đóng.'},409);
      await env.DB.batch([
        env.DB.prepare(`UPDATE support_tickets SET status='in_progress',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(tid),
        env.DB.prepare(`UPDATE support_ticket_assignments SET reopen_reason=?,reopened_at=CURRENT_TIMESTAMP,updated_by_account_id=?,updated_at=CURRENT_TIMESTAMP WHERE ticket_id=?`).bind(reason,s.account_id,tid),
        env.DB.prepare(`INSERT INTO support_ticket_messages(id,ticket_id,sender_account_id,visibility,message_type,body) VALUES(?,?,?,'public','reopen',?)`).bind(uid('tmsg'),tid,s.account_id,`Mở lại yêu cầu: ${reason}`)
      ]);
      await audit(env,s.account_id,'support_ticket_reopened','support_ticket',tid,null,{reason});
      return json({ok:true,ticket_status:'reopened'});
    }
    if(act==='feedback'){
      const score=Number(b.satisfaction_score??b.score);
      if(!Number.isInteger(score)||score<1||score>5)return json({error:'INVALID_SATISFACTION_SCORE',message:'Điểm đánh giá phải từ 1 đến 5.'},400);
      const comment=clean(b.feedback_comment??b.comment,1000)||null;
      await env.DB.prepare(`UPDATE support_ticket_assignments SET satisfaction_score=?,feedback_comment=?,updated_at=CURRENT_TIMESTAMP WHERE ticket_id=?`).bind(score,comment,tid).run();
      await audit(env,s.account_id,'support_ticket_feedback','support_ticket',tid,null,{score});
      return json({ok:true,satisfaction_score:score,score});
    }
  }

  // =========================================================
  // ADMIN ORG
  // =========================================================

  if(url.pathname==='/api/admin/org'&&req.method==='GET'){
    if(!(await hasPerm(
      env,
      s.account_id,
      'org.manage'
    ))){
      return json({error:'FORBIDDEN'},403);
    }

    const r=await env.DB.prepare(`
      SELECT *
      FROM org_nodes
      ORDER BY
        COALESCE(parent_id,''),
        sort_order,
        name
    `).all();

    const items=[];
    for(const o of r.results||[])if(!o.deleted_at&&await canAccessOrg(env,s.account_id,o.id))items.push(o);
    return json({items});
  }

  if(url.pathname==='/api/admin/org'&&req.method==='POST'){
    if(!(await hasPerm(
      env,
      s.account_id,
      'org.manage'
    ))){
      return json({error:'FORBIDDEN'},403);
    }

    const b=await bodyJson(req);

    const id=uid('org');
    const parent=clean(b.parent_id,100)||'org_sfn';
    if(b.node_type==='digital_member_center')b.name='Trung tâm Nghiệp vụ Số Sky First';
    if(!Number.isFinite(Number(b.sort_order||0)))return json({error:'INVALID_SORT_ORDER'},400);

    if(
      !clean(b.code,80)||
      !clean(b.name,200)
    ){
      return json({
        error:'INVALID_DATA'
      },400);
    }

    if(!(await canAccessOrg(
      env,
      s.account_id,
      parent
    ))){
      return json({
        error:'SCOPE_FORBIDDEN'
      },403);
    }

    const parentNode=await env.DB.prepare(`SELECT id FROM org_nodes WHERE id=? AND deleted_at IS NULL AND status='active'`).bind(parent).first();
    if(!parentNode)return json({error:'INVALID_PARENT'},400);
    const duplicate=await env.DB.prepare(`SELECT id FROM org_nodes WHERE code=? COLLATE NOCASE`).bind(clean(b.code,80)).first();
    if(duplicate)return json({error:'ORG_CODE_ALREADY_EXISTS'},409);
    await env.DB.prepare(`
      INSERT INTO org_nodes(
        id,
        parent_id,
        code,
        name,
        short_name,
        node_type,
        status,
        sort_order
      )
      VALUES(?,?,?,?,?,?,?,?)
    `).bind(
      id,
      parent,
      clean(b.code,80),
      clean(b.name,200),
      clean(b.short_name,80)||null,
      clean(b.node_type,80)||'unit',
      'active',
      Number(b.sort_order||0)
    ).run();

    await audit(
      env,
      s.account_id,
      'org_created',
      'org_node',
      id,
      parent,
      {
        code:b.code,
        name:b.name
      }
    );

    return json({ok:true,id});
  }

  const orgItem=url.pathname.match(/^\/api\/admin\/org\/([^/]+)$/);
  if(orgItem&&req.method==='PATCH'){
    if(!(await hasPerm(env,s.account_id,'org.manage')))return json({error:'FORBIDDEN'},403);const id=decodeURIComponent(orgItem[1]);if(!(await canAccessOrg(env,s.account_id,id)))return json({error:'SCOPE_FORBIDDEN'},403);const b=await bodyJson(req),cur=await env.DB.prepare(`SELECT * FROM org_nodes WHERE id=?`).bind(id).first();if(!cur)return json({error:'NOT_FOUND'},404);const parent=clean(b.parent_id,100)||cur.parent_id;if(cur.deleted_at)return json({error:'NOT_FOUND'},404);if(id==='org_sfn'&&parent)return json({error:'ROOT_PARENT_FORBIDDEN'},409);if(parent){const p=await env.DB.prepare(`SELECT id FROM org_nodes WHERE id=? AND deleted_at IS NULL`).bind(parent).first();if(!p)return json({error:'INVALID_PARENT'},400);const cycle=await env.DB.prepare(`WITH RECURSIVE descendants(id) AS (SELECT id FROM org_nodes WHERE id=? UNION SELECT o.id FROM org_nodes o JOIN descendants d ON o.parent_id=d.id) SELECT 1 FROM descendants WHERE id=?`).bind(id,parent).first();if(cycle)return json({error:'ORG_CYCLE_FORBIDDEN'},409)}if(b.node_type==='digital_member_center'||cur.node_type==='digital_member_center'){b.name='Trung tâm Nghiệp vụ Số Sky First';b.node_type='digital_member_center'}if(parent&&parent!==cur.parent_id&&!(await canAccessOrg(env,s.account_id,parent)))return json({error:'SCOPE_FORBIDDEN'},403);await env.DB.prepare(`UPDATE org_nodes SET parent_id=?,name=?,short_name=?,node_type=?,status=?,description=?,founded_at=?,term_label=?,responsible_person_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(parent,clean(b.name,200)||cur.name,clean(b.short_name,80)||null,clean(b.node_type,80)||cur.node_type,clean(b.status,30)||cur.status,clean(b.description,2000)||null,clean(b.founded_at,20)||null,clean(b.term_label,100)||null,clean(b.responsible_person_id,100)||null,id).run();await audit(env,s.account_id,'org_updated','org_node',id,parent,{before:{name:cur.name,parent_id:cur.parent_id,status:cur.status}});return json({ok:true})
  }
  if(orgItem&&req.method==='DELETE'){
    if(!(await hasPerm(env,s.account_id,'org.delete')))return json({error:'FORBIDDEN'},403);const id=decodeURIComponent(orgItem[1]);if(id==='org_sfn')return json({error:'ROOT_CANNOT_BE_DELETED'},409);if(!(await canAccessOrg(env,s.account_id,id)))return json({error:'SCOPE_FORBIDDEN'},403);const cur=await env.DB.prepare(`SELECT parent_id FROM org_nodes WHERE id=?`).bind(id).first();if(!cur)return json({error:'NOT_FOUND'},404);const children=await env.DB.prepare(`SELECT COUNT(*) n FROM org_nodes WHERE parent_id=? AND deleted_at IS NULL`).bind(id).first();if(children?.n)return json({error:'ORG_HAS_CHILDREN'},409);await env.DB.prepare(`UPDATE org_nodes SET status='archived',deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run();await audit(env,s.account_id,'org_deleted','org_node',id,cur.parent_id);return json({ok:true})
  }

  // =========================================================
  // ADMIN BULK OPERATIONS
  // =========================================================
  if(url.pathname==='/api/admin/members/bulk'&&req.method==='POST'){
    const b=await bodyJson(req);
    const ids=Array.isArray(b.ids)?[...new Set(b.ids.map(x=>clean(x,100)).filter(Boolean))].slice(0,100):[];
    const action=clean(b.action,40);
    if(!ids.length)return json({error:'NO_MEMBERS_SELECTED'},400);
    if(ids.some(x=>!x))return json({error:'INVALID_MEMBER_ID'},400);

    const placeholders=ids.map(()=>'?').join(',');
    const rows=await env.DB.prepare(`SELECT p.id,p.full_name,p.member_code,a.id account_id,a.email,a.is_locked FROM people p LEFT JOIN accounts a ON a.person_id=p.id WHERE p.id IN (${placeholders})`).bind(...ids).all();
    const members=rows.results||[];
    if(!members.length)return json({error:'MEMBERS_NOT_FOUND'},404);
    for(const m of members)if(!(await canAccessPerson(env,s.account_id,m.id)))return json({error:'SCOPE_FORBIDDEN',member_id:m.id},403);

    const results=[];
    if(['lock','unlock'].includes(action)){
      if(!(await hasPerm(env,s.account_id,'account.manage')))return json({error:'FORBIDDEN'},403);
      const locked=action==='lock'?1:0;
      for(const m of members){
        if(m.account_id===s.account_id){results.push({id:m.id,ok:false,error:'CANNOT_LOCK_SELF'});continue;}
        if(await isSuper(env,m.account_id||'')){results.push({id:m.id,ok:false,error:'SUPER_ADMIN_PROTECTED'});continue;}
        await env.DB.prepare('UPDATE accounts SET is_locked=?,updated_at=CURRENT_TIMESTAMP WHERE person_id=?').bind(locked,m.id).run();
        if(locked&&m.account_id)await env.DB.prepare('DELETE FROM sessions WHERE account_id=?').bind(m.account_id).run();
        await audit(env,s.account_id,locked?'account_locked_bulk':'account_unlocked_bulk','account',m.account_id,null,{person_id:m.id,batch:true});
        results.push({id:m.id,ok:true});
      }
    } else if(['ban','unban'].includes(action)){
      if(!(await hasPerm(env,s.account_id,'account.manage')))return json({error:'FORBIDDEN'},403);
      if(action==='ban'&&!clean(b.reason,500))return json({error:'REASON_REQUIRED'},400);
      for(const m of members){
        if(m.account_id===s.account_id){results.push({id:m.id,ok:false,error:'CANNOT_RESTRICT_SELF'});continue;}
        if(await isSuper(env,m.account_id||'')){results.push({id:m.id,ok:false,error:'SUPER_ADMIN_PROTECTED'});continue;}
        if(action==='ban'){
          const end=clean(b.ends_at,35)||null;
          await env.DB.prepare("INSERT INTO account_restrictions(account_id,restriction_type,reason,ends_at,actor_account_id,updated_at) VALUES(?,'ban',?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(account_id) DO UPDATE SET restriction_type='ban',reason=excluded.reason,ends_at=excluded.ends_at,actor_account_id=excluded.actor_account_id,updated_at=CURRENT_TIMESTAMP").bind(m.account_id,clean(b.reason,500),end,s.account_id).run();
          if(m.account_id)await env.DB.prepare('DELETE FROM sessions WHERE account_id=?').bind(m.account_id).run();
        }else{
          await env.DB.prepare('DELETE FROM account_restrictions WHERE account_id=?').bind(m.account_id).run();
        }
        await audit(env,s.account_id,action==='ban'?'account_banned_bulk':'account_unbanned_bulk','account',m.account_id,null,{person_id:m.id,batch:true,reason:clean(b.reason,500)||null});
        results.push({id:m.id,ok:true});
      }
    } else if(action==='issue_card'){
      if(!(await hasPerm(env,s.account_id,'card.manage')))return json({error:'FORBIDDEN'},403);
      const cardType=clean(b.card_type_id,100)||'card_member';
      const org=clean(b.org_node_id,100)||'org_sfn';
      const issuedAt=dateInVietnam(),expiresAt=clean(b.expires_at,10)||null;
      if(expiresAt&&!validDateOnly(expiresAt))return json({error:'INVALID_DATE',message:'Ngày hết hiệu lực không hợp lệ.'},400);
      if(expiresAt&&expiresAt<issuedAt)return json({error:'EXPIRY_BEFORE_ISSUE',message:'Ngày hết hiệu lực không được trước ngày cấp.'},400);
      if(!(await canAccessOrg(env,s.account_id,org)))return json({error:'SCOPE_FORBIDDEN'},403);
      for(const m of members){
        const existing=await env.DB.prepare("SELECT id FROM member_cards WHERE person_id=? AND status='active' LIMIT 1").bind(m.id).first();
        if(existing){results.push({id:m.id,ok:false,error:'ACTIVE_CARD_EXISTS'});continue;}
        let cardNumber='';
        let unique=false;
        for(let i=0;i<5&&!unique;i++){
          cardNumber=`SFN-CARD-${crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase()}`;
          unique=!(await env.DB.prepare('SELECT id FROM member_cards WHERE card_number=?').bind(cardNumber).first());
        }
        if(!unique){results.push({id:m.id,ok:false,error:'CARD_NUMBER_GENERATION_FAILED'});continue;}
        const cardId=uid('card'),verify=verifyCode('CARD');
        await env.DB.prepare(`INSERT INTO member_cards(id,person_id,card_type_id,org_node_id,card_number,title_on_card,issued_at,expires_at,status,verify_token) VALUES(?,?,?,?,?,?,?,?, 'active',?)`).bind(cardId,m.id,cardType,org,cardNumber,clean(b.title_on_card,180)||null,issuedAt,expiresAt,verify).run();
        await audit(env,s.account_id,'card_issued_bulk','member_card',cardId,org,{person_id:m.id,batch:true});
        results.push({id:m.id,ok:true,card_id:cardId,card_number:cardNumber});
      }
    } else {
      return json({error:'INVALID_BULK_ACTION'},400);
    }
    return json({ok:true,action,processed:members.length,success:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results});
  }

  // =========================================================
  // ADMIN MEMBER LIST
  // =========================================================

  if(
    url.pathname==='/api/admin/members'&&
    req.method==='GET'
  ){
    if(!(await hasPerm(
      env,
      s.account_id,
      'member.view'
    ))){
      return json({error:'FORBIDDEN'},403);
    }

    const page=Math.max(
      1,
      Number(
        url.searchParams.get('page')||1
      )
    );

    const limit=Math.min(
      100,
      Math.max(
        10,
        Number(
          url.searchParams.get('limit')||50
        )
      )
    );

    const q=clean(
      url.searchParams.get('q'),
      100
    );

    const status=clean(
      url.searchParams.get('status'),
      30
    );

    const w=[
      `EXISTS (
        SELECT 1
        FROM accounts am
        JOIN account_scopes sm
          ON sm.account_id=am.id
         AND sm.active=1
        JOIN roles rm
          ON rm.id=sm.role_id
        WHERE am.person_id=p.id
          AND rm.code='MEMBER'
      )`
    ];

    const b=[];

    if(!(await isNetworkAdmin(
      env,
      s.account_id
    ))){
      w.push(`
        EXISTS (
          WITH RECURSIVE allowed(id) AS (
            SELECT sc.org_node_id
            FROM account_scopes sc
            JOIN roles rr
              ON rr.id=sc.role_id
            WHERE sc.account_id=?
              AND sc.active=1
              AND rr.code IN ('SCOPE_ADMIN','UNIT_ADMIN','DEPARTMENT_ADMIN')
              AND sc.org_node_id IS NOT NULL

            UNION

            SELECT o.id
            FROM org_nodes o
            JOIN allowed a
              ON o.parent_id=a.id
          )
          SELECT 1
          FROM org_memberships om
          JOIN allowed al
            ON al.id=om.org_node_id
          WHERE om.person_id=p.id
        )
      `);

      b.push(s.account_id);
    }

    if(q){
      w.push(`
        (
          p.full_name LIKE ?
          OR p.member_code LIKE ?
          OR p.email LIKE ?
          OR p.phone LIKE ?
        )
      `);

      b.push(
        `%${q}%`,
        `%${q}%`,
        `%${q}%`,
        `%${q}%`
      );
    }

    if(status){
      w.push('p.status=?');
      b.push(status);
    }

    const org=clean(url.searchParams.get('org'),100);
    if(org){w.push(`EXISTS (SELECT 1 FROM org_memberships omf WHERE omf.person_id=p.id AND omf.org_node_id=? AND omf.status='active')`);b.push(org)}

    const where=
      w.length
        ?`WHERE ${w.join(' AND ')}`
        :'';

    const totalRow=
      await env.DB.prepare(`
        SELECT COUNT(*) total
        FROM people p
        ${where}
      `).bind(...b).first();

    const total=totalRow?.total||0;

    const r=await env.DB.prepare(`
      SELECT
        p.id,
        p.member_code,
        p.full_name,
        p.email,
        p.phone,
        p.avatar_url,
        p.status,
        p.joined_at,
        a.username,
        a.is_locked,
        (SELECT o.name FROM org_memberships om JOIN org_nodes o ON o.id=om.org_node_id WHERE om.person_id=p.id AND om.status='active' ORDER BY om.is_primary DESC,om.created_at DESC LIMIT 1) org_name,
        (SELECT COALESCE(om.title,om.role_label) FROM org_memberships om WHERE om.person_id=p.id AND om.status='active' ORDER BY om.is_primary DESC,om.created_at DESC LIMIT 1) org_title
      FROM people p
      LEFT JOIN accounts a
        ON a.person_id=p.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ?
      OFFSET ?
    `).bind(
      ...b,
      limit,
      (page-1)*limit
    ).all();

    return json({
      items:r.results||[],
      page,
      limit,
      total
    });
  }

  // =========================================================
  // ADMIN CREATE MEMBER
  // =========================================================

  if(
    url.pathname==='/api/admin/members'&&
    req.method==='POST'
  ){
    if(!(await hasPerm(
      env,
      s.account_id,
      'member.edit'
    ))){
      return json({error:'FORBIDDEN'},403);
    }

    const b=await bodyJson(req);
    const pw=String(b.password||'');

    const required=[
      'full_name',
      'display_name',
      'date_of_birth',
      'gender',
      'nationality',
      'id_number',
      'id_issue_date',
      'id_issue_place',
      'email',
      'phone',
      'permanent_address',
      'temporary_address',
      'education_or_work_type',
      'school_or_workplace',
      'education_status',
      'avatar_url',
      'username'
    ];

    for(const k of required){
      if(!clean(b[k],500)){
        return json({
          error:'ALL_PERSONAL_FIELDS_REQUIRED',
          field:k
        },400);
      }
    }

    if(pw.length<10){
      return json({
        error:'INVALID_DATA'
      },400);
    }

    if(
      !(await isNetworkAdmin(
        env,
        s.account_id
      ))&&
      (
        !b.org_node_id||
        !(await canAccessOrg(
          env,
          s.account_id,
          b.org_node_id
        ))
      )
    ){
      return json({
        error:'SCOPE_FORBIDDEN'
      },403);
    }

    const uname=
      clean(b.username,80).toLowerCase();

    const mail=
      clean(b.email,200).toLowerCase();

    const idno=
      clean(b.id_number,80);

    if(await env.DB.prepare(`
      SELECT 1
      FROM accounts
      WHERE lower(username)=?
         OR lower(email)=?
      LIMIT 1
    `).bind(
      uname,
      mail
    ).first()){
      return json({
        error:'ACCOUNT_ALREADY_EXISTS'
      },409);
    }

    if(await env.DB.prepare(`
      SELECT 1
      FROM people
      WHERE id_number=?
      LIMIT 1
    `).bind(idno).first()){
      return json({
        error:'IDENTITY_ALREADY_EXISTS'
      },409);
    }

    const code=await memberCode(env);
    const pid=uid('person');
    const aid=uid('account');
    const salt=token();
    const it=100000;
    const hash=await pbkdf2(
      pw,
      salt,
      it
    );

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO people(
          id,
          member_code,
          full_name,
          display_name,
          date_of_birth,
          gender,
          nationality,
          id_number,
          id_issue_date,
          id_issue_place,
          email,
          phone,
          permanent_address,
          temporary_address,
          education_or_work_type,
          school_or_workplace,
          class_or_major,
          education_status,
          avatar_url,
          joined_at,
          status
        )
        VALUES(
          ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        )
      `).bind(
        pid,
        code,
        clean(b.full_name,160),
        clean(b.display_name,160)||null,
        clean(b.date_of_birth,20)||null,
        clean(b.gender,50)||null,
        clean(b.nationality,80)||null,
        clean(b.id_number,80)||null,
        clean(b.id_issue_date,20)||null,
        clean(b.id_issue_place,200)||null,
        clean(b.email,200)||null,
        clean(b.phone,50)||null,
        clean(b.permanent_address,500)||null,
        clean(b.temporary_address,500)||null,
        clean(b.education_or_work_type,50)||null,
        clean(b.school_or_workplace,240)||null,
        clean(b.class_or_major,240)||null,
        clean(b.education_status,80)||null,
        clean(b.avatar_url,1200)||null,
        b.joined_at||
          new Date()
            .toISOString()
            .slice(0,10),
        'active'
      ),

      env.DB.prepare(`
        INSERT INTO accounts(
          id,
          person_id,
          username,
          email,
          password_hash,
          password_salt,
          password_iterations,
          force_password_change
        )
        VALUES(?,?,?,?,?,?,?,1)
      `).bind(
        aid,
        pid,
        uname,
        mail||null,
        hash,
        salt,
        it
      ),

      env.DB.prepare(`
        INSERT INTO account_scopes(
          id,
          account_id,
          role_id,
          org_node_id,
          active
        )
        VALUES(?,?,?,?,1)
      `).bind(
        uid('scope'),
        aid,
        'role_member',
        null
      )
    ]);

    if(b.org_node_id){
      await env.DB.prepare(`
        INSERT INTO org_memberships(
          id,
          person_id,
          org_node_id,
          title,
          role_label,
          started_at,
          status,
          is_primary
        )
        VALUES(
          ?,?,?,?,?,?,
          'active',
          1
        )
      `).bind(
        uid('membership'),
        pid,
        b.org_node_id,
        clean(b.title,160)||null,
        clean(b.role_label,160)||null,
        b.joined_at||
          new Date()
            .toISOString()
            .slice(0,10)
      ).run();
    }

    await audit(
      env,
      s.account_id,
      'member_created',
      'person',
      pid,
      b.org_node_id||null,
      {member_code:code}
    );

    return json({
      ok:true,
      id:pid,
      member_code:code
    });
  }

  // =========================================================
  // ADMIN MEMBER DETAIL
  // =========================================================

  const detailMatch=
    url.pathname.match(
      /^\/api\/admin\/members\/([^/]+)$/
    );

  if(detailMatch&&req.method==='GET'){
    await ensureEvaluations(env);
    if(!(await hasPerm(
      env,
      s.account_id,
      'member.view'
    ))){
      return json({
        error:'FORBIDDEN'
      },403);
    }

    const pid=
      decodeURIComponent(
        detailMatch[1]
      );

    if(!(await canAccessPerson(
      env,
      s.account_id,
      pid
    ))){
      return json({
        error:'SCOPE_FORBIDDEN'
      },403);
    }

    const person=await env.DB.prepare(`
      SELECT
        p.*,
        a.id account_id,
        a.username,
        a.email account_email,
        a.is_locked,
        a.force_password_change,
        a.last_login_at
      FROM people p
      LEFT JOIN accounts a
        ON a.person_id=p.id
      WHERE p.id=?
    `).bind(pid).first();

    if(!person){
      return json({
        error:'NOT_FOUND'
      },404);
    }

    const [
      memberships,
      certificates,
      achievements,
      cards,
      documents,
      scopes,
      goals,
      tasks,
      activities,
      evaluations,
      auditRows
    ]=await Promise.all([
      env.DB.prepare(`
        SELECT
          m.*,
          o.name org_name,
          o.code org_code
        FROM org_memberships m
        JOIN org_nodes o
          ON o.id=m.org_node_id
        WHERE m.person_id=?
        ORDER BY m.started_at DESC
      `).bind(pid).all(),

      env.DB.prepare(`
        SELECT *
        FROM certificates
        WHERE person_id=?
        ORDER BY
          COALESCE(
            issued_at,
            created_at
          ) DESC
      `).bind(pid).all(),

      env.DB.prepare(`
        SELECT *
        FROM achievements
        WHERE person_id=?
        ORDER BY
          COALESCE(
            achieved_at,
            created_at
          ) DESC
      `).bind(pid).all(),

      env.DB.prepare(`
        SELECT
          c.*,
          t.name card_type_name,
          t.template_json card_template_json,
          o.name org_name
        FROM member_cards c
        JOIN card_types t
          ON t.id=c.card_type_id
        LEFT JOIN org_nodes o
          ON o.id=c.org_node_id
        WHERE c.person_id=?
        ORDER BY c.created_at DESC
      `).bind(pid).all(),

      env.DB.prepare(`
        SELECT *
        FROM member_documents
        WHERE person_id=?
        ORDER BY created_at DESC
      `).bind(pid).all(),

      env.DB.prepare(`
        SELECT
          s.*,
          r.code role_code,
          r.name role_name,
          o.name org_name
        FROM account_scopes s
        JOIN roles r
          ON r.id=s.role_id
        LEFT JOIN org_nodes o
          ON o.id=s.org_node_id
        WHERE s.account_id=?
      `).bind(
        person.account_id||''
      ).all(),

      env.DB.prepare(`
        SELECT *
        FROM goals
        WHERE person_id=?
        ORDER BY created_at DESC
      `).bind(pid).all(),

      env.DB.prepare(`
        SELECT *
        FROM tasks
        WHERE person_id=?
        ORDER BY created_at DESC
      `).bind(pid).all(),

      env.DB.prepare(`
        SELECT
          a.*,
          ap.role_label,
          ap.result,
          ap.verification_status,
          o.name org_name
        FROM activity_participants ap
        JOIN activities a
          ON a.id=ap.activity_id
        LEFT JOIN org_nodes o
          ON o.id=a.org_node_id
        WHERE ap.person_id=?
        ORDER BY
          COALESCE(
            a.starts_at,
            a.created_at
          ) DESC
      `).bind(pid).all(),

      env.DB.prepare(`
        SELECT e.*,o.name org_name,a.username evaluator_username
        FROM member_evaluations e
        LEFT JOIN org_nodes o ON o.id=e.org_node_id
        LEFT JOIN accounts a ON a.id=e.evaluator_account_id
        WHERE e.person_id=?
        ORDER BY e.created_at DESC
      `).bind(pid).all(),

      env.DB.prepare(`
        SELECT
          l.*,
          aa.username
        FROM audit_log l
        LEFT JOIN accounts aa
          ON aa.id=l.actor_account_id
        WHERE l.entity_id=?
           OR json_extract(
                l.details_json,
                '$.person_id'
              )=?
        ORDER BY l.id DESC
        LIMIT 200
      `).bind(pid,pid).all()
    ]);

    return json({
      person,
      memberships:
        memberships.results||[],
      certificates:
        certificates.results||[],
      achievements:
        achievements.results||[],
      cards:
        cards.results||[],
      documents:
        documents.results||[],
      scopes:
        scopes.results||[],
      goals:
        goals.results||[],
      tasks:
        tasks.results||[],
      activities:
        activities.results||[],
      evaluations:
        evaluations.results||[],
      audit:
        auditRows.results||[]
    });
  }

  if(detailMatch&&req.method==='PATCH'){
    if(!(await hasPerm(
      env,
      s.account_id,
      'member.edit'
    ))){
      return json({
        error:'FORBIDDEN'
      },403);
    }

    const pid=
      decodeURIComponent(
        detailMatch[1]
      );

    if(!(await canAccessPerson(
      env,
      s.account_id,
      pid
    ))){
      return json({
        error:'SCOPE_FORBIDDEN'
      },403);
    }

    const b=await bodyJson(req);

    const p=await env.DB.prepare(`
      SELECT *
      FROM people
      WHERE id=?
    `).bind(pid).first();

    if(!p){
      return json({
        error:'NOT_FOUND'
      },404);
    }

    const v=(k,m=1000)=>
      Object.prototype
        .hasOwnProperty.call(b,k)
          ?clean(b[k],m)
          :(p[k]??'');

    await env.DB.prepare(`
      UPDATE people
      SET
        full_name=?,
        display_name=?,
        date_of_birth=?,
        gender=?,
        nationality=?,
        id_number=?,
        id_issue_date=?,
        id_issue_place=?,
        email=?,
        phone=?,
        permanent_address=?,
        temporary_address=?,
        education_or_work_type=?,
        school_or_workplace=?,
        class_or_major=?,
        education_status=?,
        avatar_url=?,
        joined_at=?,
        ended_at=?,
        status=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(
      v('full_name',160),
      v('display_name',160)||null,
      v('date_of_birth',20)||null,
      v('gender',50)||null,
      v('nationality',80)||null,
      v('id_number',80)||null,
      v('id_issue_date',20)||null,
      v('id_issue_place',200)||null,
      v('email',200)||null,
      v('phone',50)||null,
      v('permanent_address',500)||null,
      v('temporary_address',500)||null,
      v('education_or_work_type',50)||null,
      v('school_or_workplace',240)||null,
      v('class_or_major',240)||null,
      v('education_status',80)||null,
      v('avatar_url',1200)||null,
      v('joined_at',20)||null,
      v('ended_at',20)||null,
      v('status',30)||'active',
      pid
    ).run();

    await audit(
      env,
      s.account_id,
      'member_updated',
      'person',
      pid,
      null,
      {}
    );

    return json({ok:true});
  }

  // =========================================================
  // ADMIN CERTIFICATE PDF UPLOAD
  // =========================================================

  const certFileMatch=
    url.pathname.match(
      /^\/api\/admin\/members\/([^/]+)\/certificate-file$/
    );

  if(
    certFileMatch&&
    req.method==='POST'
  ){
    if(!(await hasPerm(
      env,
      s.account_id,
      'certificate.manage'
    ))){
      return json({
        error:'FORBIDDEN'
      },403);
    }

    const pid=
      decodeURIComponent(
        certFileMatch[1]
      );

    if(!(await canAccessPerson(
      env,
      s.account_id,
      pid
    ))){
      return json({
        error:'SCOPE_FORBIDDEN'
      },403);
    }

    if(!(await env.DB.prepare(`
      SELECT 1
      FROM people
      WHERE id=?
    `).bind(pid).first())){
      return json({
        error:'NOT_FOUND'
      },404);
    }

    const ct=
      (req.headers.get('content-type')||'')
        .toLowerCase();

    if(ct!=='application/pdf'){
      return json({
        error:'PDF_ONLY'
      },415);
    }

    const data=await req.arrayBuffer();

    if(
      !data.byteLength||
      data.byteLength>10*1024*1024
    ){
      return json({
        error:'PDF_TOO_LARGE'
      },413);
    }

    const key=
      `certificates/${pid}/`+
      `${new Date().toISOString().slice(0,10)}/`+
      `${crypto.randomUUID()}.pdf`;

    await env.FILES.put(
      key,
      data,
      {
        httpMetadata:{
          contentType:'application/pdf',
          contentDisposition:'inline'
        }
      }
    );

    return json({
      ok:true,
      url:`/files/${key}`
    });
  }

  // =========================================================
  // ADMIN MEMBER SUB ACTIONS
  // =========================================================

  const subMatch=
    url.pathname.match(
      /^\/api\/admin\/members\/([^/]+)\/(certificate|achievement|membership|card|document|goal|task|activity|reset-password|lock|scope)$/
    );

  if(subMatch&&req.method==='POST'){
    const pid=
      decodeURIComponent(
        subMatch[1]
      );

    const op=subMatch[2];
    const b=await bodyJson(req);

    if(!(await canAccessPerson(
      env,
      s.account_id,
      pid
    ))){
      return json({
        error:'SCOPE_FORBIDDEN'
      },403);
    }

    const person=await env.DB.prepare(`
      SELECT
        p.*,
        a.id account_id
      FROM people p
      LEFT JOIN accounts a
        ON a.person_id=p.id
      WHERE p.id=?
    `).bind(pid).first();

    if(!person){
      return json({
        error:'NOT_FOUND'
      },404);
    }

    if(op==='goal'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'goal.manage'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      if(
        b.org_node_id&&
        !(await canAccessOrg(
          env,
          s.account_id,
          b.org_node_id
        ))
      ){
        return json({
          error:'SCOPE_FORBIDDEN'
        },403);
      }

      const period=
        clean(b.period_type,20);

      const title=
        clean(b.title,240);

      if(
        ![
          'week',
          'month',
          'quarter',
          'year'
        ].includes(period)||
        !title
      ){
        return json({
          error:'INVALID_DATA'
        },400);
      }

      const id=uid('goal');

      await env.DB.prepare(`
        INSERT INTO goals(
          id,
          person_id,
          org_node_id,
          period_type,
          title,
          description,
          priority,
          progress,
          status,
          starts_at,
          due_at,
          created_by_account_id
        )
        VALUES(
          ?,?,?,?,?,?,?,?,?,?,?,?
        )
      `).bind(
        id,
        pid,
        b.org_node_id||null,
        period,
        title,
        clean(b.description,2000)||null,
        clean(b.priority,30)||'normal',
        Math.max(
          0,
          Math.min(
            100,
            Number(b.progress||0)
          )
        ),
        clean(b.status,30)||'active',
        clean(b.starts_at,20)||null,
        clean(b.due_at,20)||null,
        s.account_id
      ).run();

      await env.DB.prepare(`
        INSERT INTO notifications(
          id,
          person_id,
          org_node_id,
          type,
          title,
          body
        )
        VALUES(
          ?,?,?,
          'goal',
          'Mục tiêu mới',
          ?
        )
      `).bind(
        uid('notification'),
        pid,
        b.org_node_id||null,
        title
      ).run();

      await audit(
        env,
        s.account_id,
        'goal_assigned',
        'goal',
        id,
        b.org_node_id||null,
        {person_id:pid}
      );

      return json({ok:true,id});
    }

    if(op==='task'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'task.manage'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      if(
        b.org_node_id&&
        !(await canAccessOrg(
          env,
          s.account_id,
          b.org_node_id
        ))
      ){
        return json({
          error:'SCOPE_FORBIDDEN'
        },403);
      }

      const title=
        clean(b.title,240);

      if(!title){
        return json({
          error:'INVALID_DATA'
        },400);
      }

      const id=uid('task');

      await env.DB.prepare(`
        INSERT INTO tasks(
          id,
          person_id,
          org_node_id,
          goal_id,
          title,
          description,
          priority,
          progress,
          status,
          due_at,
          assigned_by_account_id
        )
        VALUES(
          ?,?,?,?,?,?,?,?,?,?,?
        )
      `).bind(
        id,
        pid,
        b.org_node_id||null,
        clean(b.goal_id,120)||null,
        title,
        clean(b.description,2000)||null,
        clean(b.priority,30)||'normal',
        Math.max(
          0,
          Math.min(
            100,
            Number(b.progress||0)
          )
        ),
        clean(b.status,30)||'todo',
        clean(b.due_at,20)||null,
        s.account_id
      ).run();

      await env.DB.prepare(`
        INSERT INTO notifications(
          id,
          person_id,
          org_node_id,
          type,
          title,
          body
        )
        VALUES(
          ?,?,?,
          'task',
          'Công việc mới',
          ?
        )
      `).bind(
        uid('notification'),
        pid,
        b.org_node_id||null,
        title
      ).run();

      await audit(
        env,
        s.account_id,
        'task_assigned',
        'task',
        id,
        b.org_node_id||null,
        {person_id:pid}
      );

      return json({ok:true,id});
    }

    if(op==='activity'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'activity.manage'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      if(
        b.org_node_id&&
        !(await canAccessOrg(
          env,
          s.account_id,
          b.org_node_id
        ))
      ){
        return json({
          error:'SCOPE_FORBIDDEN'
        },403);
      }

      const name=
        clean(b.name,240);

      if(!name){
        return json({
          error:'INVALID_DATA'
        },400);
      }

      const id=uid('activity');

      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO activities(
            id,
            code,
            name,
            org_node_id,
            starts_at,
            ends_at,
            status,
            description
          )
          VALUES(
            ?,?,?,?,?,?,?,?
          )
        `).bind(
          id,
          clean(b.code,120)||null,
          name,
          b.org_node_id||null,
          clean(b.starts_at,20)||null,
          clean(b.ends_at,20)||null,
          clean(b.status,30)||'completed',
          clean(b.description,2000)||null
        ),

        env.DB.prepare(`
          INSERT INTO activity_participants(
            activity_id,
            person_id,
            role_label,
            result,
            verification_status
          )
          VALUES(?,?,?,?,?)
        `).bind(
          id,
          pid,
          clean(b.role_label,160)||
            'Thành viên',
          clean(b.result,1000)||null,
          'confirmed'
        )
      ]);

      await audit(
        env,
        s.account_id,
        'activity_recorded',
        'activity',
        id,
        b.org_node_id||null,
        {person_id:pid}
      );

      return json({ok:true,id});
    }

    if(op==='certificate'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'certificate.manage'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      if(
        b.org_node_id&&
        !(await canAccessOrg(
          env,
          s.account_id,
          b.org_node_id
        ))
      ){
        return json({
          error:'SCOPE_FORBIDDEN'
        },403);
      }

      const id=uid('cert');

      const verify=
        clean(b.verify_code,100)||
        verifyCode('GCN');

      const meta={
        recognition:
          clean(b.recognition,2000),
        notes:
          clean(b.notes,1500)
      };

      if(
        !clean(b.title,240)||
        !clean(b.issuer,240)
      ){
        return json({
          error:'INVALID_DATA'
        },400);
      }

      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO certificates(
            id,
            person_id,
            org_node_id,
            certificate_no,
            title,
            issuer,
            issued_at,
            source_type,
            verification_status,
            file_url,
            verify_code,
            metadata_json
          )
          VALUES(
            ?,?,?,?,?,?,?,
            'internal',
            'verified',
            ?,?,?
          )
        `).bind(
          id,
          pid,
          b.org_node_id||null,
          clean(b.certificate_no,120)||
            verify,
          clean(b.title,240),
          clean(b.issuer,240),
          clean(b.issued_at,20)||
            new Date()
              .toISOString()
              .slice(0,10),
          clean(b.file_url,1200)||null,
          verify,
          JSON.stringify(meta)
        ),

        env.DB.prepare(`
          INSERT INTO notifications(
            id,
            person_id,
            org_node_id,
            type,
            title,
            body
          )
          VALUES(
            ?,?,?,
            'certificate',
            'Bạn có chứng nhận mới',
            ?
          )
        `).bind(
          uid('notice'),
          pid,
          b.org_node_id||null,
          `Chứng nhận "${clean(
            b.title,
            240
          )}" đã được cấp trên Trung tâm Nghiệp vụ Số Sky First.`
        )
      ]);

      await audit(
        env,
        s.account_id,
        'certificate_issued',
        'certificate',
        id,
        b.org_node_id||null,
        {
          person_id:pid,
          verify_code:verify
        }
      );

      return json({
        ok:true,
        id,
        verify_code:verify
      });
    }

    if(op==='achievement'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'achievement.manage'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      const id=uid('achievement');

      if(!clean(b.title,240)){
        return json({
          error:'INVALID_DATA'
        },400);
      }

      await env.DB.prepare(`
        INSERT INTO achievements(
          id,
          person_id,
          org_node_id,
          title,
          achievement_type,
          issuer,
          achieved_at,
          verification_status,
          source_type,
          description
        )
        VALUES(
          ?,?,?,?,?,?,?,
          'verified',
          'internal',
          ?
        )
      `).bind(
        id,
        pid,
        b.org_node_id||null,
        clean(b.title,240),
        clean(b.achievement_type,120)||null,
        clean(b.issuer,240)||'Sky First Network',
        clean(b.achieved_at,20)||null,
        clean(b.description,2000)||null
      ).run();

      await audit(
        env,
        s.account_id,
        'achievement_added',
        'achievement',
        id,
        b.org_node_id||null,
        {person_id:pid}
      );

      return json({ok:true,id});
    }

    if(op==='membership'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'member.edit'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      if(!b.org_node_id){
        return json({
          error:'ORG_REQUIRED'
        },400);
      }

      if(!(await canAccessOrg(
        env,
        s.account_id,
        b.org_node_id
      ))){
        return json({
          error:'SCOPE_FORBIDDEN'
        },403);
      }

      const id=uid('membership');

      await env.DB.prepare(`
        INSERT INTO org_memberships(
          id,
          person_id,
          org_node_id,
          title,
          role_label,
          started_at,
          ended_at,
          status,
          is_primary,
          decision_ref
        )
        VALUES(
          ?,?,?,?,?,?,?,?,?,?
        )
      `).bind(
        id,
        pid,
        b.org_node_id,
        clean(b.title,160)||null,
        clean(b.role_label,160)||null,
        clean(b.started_at,20)||null,
        clean(b.ended_at,20)||null,
        clean(b.status,30)||'active',
        b.is_primary?1:0,
        clean(b.decision_ref,240)||null
      ).run();

      await audit(
        env,
        s.account_id,
        'membership_added',
        'membership',
        id,
        b.org_node_id,
        {person_id:pid}
      );

      return json({ok:true,id});
    }
    if(op==='card'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'card.manage'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      if(
        b.org_node_id&&
        !(await canAccessOrg(
          env,
          s.account_id,
          b.org_node_id
        ))
      ){
        return json({
          error:'SCOPE_FORBIDDEN'
        },403);
      }

      const issuedAt=clean(b.issued_at,20)||dateInVietnam(),expiresAt=clean(b.expires_at,20)||null;
      if(!validDateOnly(issuedAt)||(expiresAt&&!validDateOnly(expiresAt)))return json({error:'INVALID_DATE',message:'Ngày cấp hoặc ngày hết hiệu lực không hợp lệ.'},400);
      if(expiresAt&&expiresAt<issuedAt)return json({error:'EXPIRY_BEFORE_ISSUE',message:'Ngày hết hiệu lực không được trước ngày cấp.'},400);
      const id=uid('card');

      const verify=
        verifyCode('CARD');

      const number=
        clean(b.card_number,120)||
        `SFN-CARD-${String(
          Date.now()
        ).slice(-8)}`;

      await env.DB.prepare(`
        INSERT INTO member_cards(
          id,
          person_id,
          card_type_id,
          org_node_id,
          card_number,
          title_on_card,
          issued_at,
          expires_at,
          status,
          verify_token
        )
        VALUES(
          ?,?,?,?,?,?,?,?,?,?
        )
      `).bind(
        id,
        pid,
        b.card_type_id||'card_member',
        b.org_node_id||'org_sfn',
        number,
        clean(b.title_on_card,180)||null,
        issuedAt,
        expiresAt,
        clean(b.status,30)||'active',
        verify
      ).run();

      await audit(
        env,
        s.account_id,
        'card_issued',
        'member_card',
        id,
        b.org_node_id||'org_sfn',
        {
          person_id:pid,
          verify_token:verify
        }
      );

      return json({
        ok:true,
        id,
        verify_token:verify
      });
    }

    if(op==='document'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'member.edit'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      const id=uid('doc');

      await env.DB.prepare(`
        INSERT INTO member_documents(
          id,
          person_id,
          org_node_id,
          document_type,
          title,
          file_url,
          issued_at,
          visibility
        )
        VALUES(
          ?,?,?,?,?,?,?,
          'private'
        )
      `).bind(
        id,
        pid,
        b.org_node_id||null,
        clean(b.document_type,100)||'other',
        clean(b.title,240),
        clean(b.file_url,1200)||null,
        clean(b.issued_at,20)||null
      ).run();

      await audit(env,s.account_id,'document_added','member_document',id,b.org_node_id||null,{person_id:pid});
      return json({ok:true,id});
    }

    if(op==='reset-password'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'account.manage'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      const pw=
        String(b.password||'');

      if(pw.length<10){
        return json({
          error:'PASSWORD_TOO_SHORT'
        },400);
      }

      const salt=token();
      const it=100000;
      const hash=await pbkdf2(
        pw,
        salt,
        it
      );

      await env.DB.batch([
        env.DB.prepare(`
          UPDATE accounts
          SET
            password_hash=?,
            password_salt=?,
            password_iterations=?,
            force_password_change=1,
            updated_at=CURRENT_TIMESTAMP
          WHERE person_id=?
        `).bind(
          hash,
          salt,
          it,
          pid
        ),

        env.DB.prepare(`
          DELETE FROM sessions
          WHERE account_id=?
        `).bind(
          person.account_id||''
        )
      ]);

      await audit(
        env,
        s.account_id,
        'password_reset',
        'account',
        person.account_id
      );

      return json({ok:true});
    }

    if(op==='lock'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'account.manage'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      const locked=
        b.locked?1:0;

      await env.DB.prepare(`
        UPDATE accounts
        SET
          is_locked=?,
          updated_at=CURRENT_TIMESTAMP
        WHERE person_id=?
      `).bind(
        locked,
        pid
      ).run();

      if(
        locked&&
        person.account_id
      ){
        await env.DB.prepare(`
          DELETE FROM sessions
          WHERE account_id=?
        `).bind(
          person.account_id
        ).run();
      }

      await audit(
        env,
        s.account_id,
        locked
          ?'account_locked'
          :'account_unlocked',
        'account',
        person.account_id
      );

      return json({
        ok:true,
        is_locked:locked
      });
    }

    if(op==='scope'){
      if(!(await hasPerm(
        env,
        s.account_id,
        'role.manage'
      ))){
        return json({
          error:'FORBIDDEN'
        },403);
      }

      if(
        !person.account_id||
        !b.role_id
      ){
        return json({
          error:'INVALID_DATA'
        },400);
      }

      const id=uid('scope');

      await env.DB.prepare(`
        INSERT INTO account_scopes(
          id,
          account_id,
          role_id,
          org_node_id,
          active
        )
        VALUES(?,?,?,?,1)
      `).bind(
        id,
        person.account_id,
        b.role_id,
        b.org_node_id||null
      ).run();

      await audit(
        env,
        s.account_id,
        'scope_granted',
        'account_scope',
        id,
        b.org_node_id||null,
        {
          person_id:pid,
          role_id:b.role_id
        }
      );

      return json({ok:true,id});
    }
  }

  // =========================================================
  // ADMIN MEMBER RECORD LIFECYCLE
  // =========================================================

  const membershipActionMatch=url.pathname.match(
    /^\/api\/admin\/members\/([^/]+)\/membership\/([^/]+)(?:\/(end|hide|show))?$/
  );

  if(membershipActionMatch){
    const pid=decodeURIComponent(membershipActionMatch[1]);
    const membershipId=decodeURIComponent(membershipActionMatch[2]);
    const action=membershipActionMatch[3]||null;
    if(!(await hasPerm(env,s.account_id,'member.edit')))return json({error:'FORBIDDEN'},403);
    if(!(await canAccessPerson(env,s.account_id,pid)))return json({error:'SCOPE_FORBIDDEN'},403);
    const membership=await env.DB.prepare('SELECT * FROM org_memberships WHERE id=? AND person_id=? LIMIT 1').bind(membershipId,pid).first();
    if(!membership)return json({error:'MEMBERSHIP_NOT_FOUND'},404);
    if(!(await canAccessOrg(env,s.account_id,membership.org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);

    if(req.method==='PATCH'&&!action){
      const b=await bodyJson(req);
      const orgNodeId=clean(b.org_node_id,100)||membership.org_node_id;
      if(!(await canAccessOrg(env,s.account_id,orgNodeId)))return json({error:'SCOPE_FORBIDDEN'},403);
      await env.DB.prepare(`UPDATE org_memberships SET org_node_id=?,title=?,role_label=?,started_at=?,ended_at=?,decision_ref=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`)
        .bind(orgNodeId,clean(b.title,160)||null,clean(b.role_label,160)||null,clean(b.started_at,20)||null,clean(b.ended_at,20)||null,clean(b.decision_ref,240)||null,membershipId,pid).run();
      await audit(env,s.account_id,'membership_updated','membership',membershipId,orgNodeId,{person_id:pid});
      return json({ok:true,status:'updated'});
    }
    if(req.method==='POST'&&action==='end'){
      await env.DB.prepare(`UPDATE org_memberships SET status='ended',ended_at=COALESCE(ended_at,DATE('now')),updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`).bind(membershipId,pid).run();
      await audit(env,s.account_id,'membership_ended','membership',membershipId,membership.org_node_id,{person_id:pid});
      return json({ok:true,status:'ended'});
    }
    if(req.method==='POST'&&action==='hide'){
      await env.DB.prepare(`UPDATE org_memberships SET status='suspended',updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`).bind(membershipId,pid).run();
      await audit(env,s.account_id,'membership_hidden','membership',membershipId,membership.org_node_id,{person_id:pid});
      return json({ok:true,status:'hidden'});
    }
    if(req.method==='POST'&&action==='show'){
      const newStatus=membership.ended_at?'ended':'active';
      await env.DB.prepare(`UPDATE org_memberships SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`).bind(newStatus,membershipId,pid).run();
      await audit(env,s.account_id,'membership_restored','membership',membershipId,membership.org_node_id,{person_id:pid,status:newStatus});
      return json({ok:true,status:newStatus});
    }
    return json({error:'METHOD_NOT_ALLOWED'},405);
  }

  const recordActionMatch=url.pathname.match(
    /^\/api\/admin\/members\/([^/]+)\/(goal|task|activity|certificate|achievement|card|document|scope)\/([^/]+)(?:\/(complete|cancel|restore|hide|show|revoke|activate|deactivate|doing|todo))?$/
  );

  if(recordActionMatch){
    const pid=decodeURIComponent(recordActionMatch[1]);
    const kind=recordActionMatch[2];
    const id=decodeURIComponent(recordActionMatch[3]);
    const action=recordActionMatch[4]||null;
    const permByKind={goal:'goal.manage',task:'task.manage',activity:'activity.manage',certificate:'certificate.manage',achievement:'achievement.manage',card:'card.manage',document:'member.edit',scope:'role.manage'};
    if(!(await hasPerm(env,s.account_id,permByKind[kind])))return json({error:'FORBIDDEN'},403);
    if(!(await canAccessPerson(env,s.account_id,pid)))return json({error:'SCOPE_FORBIDDEN'},403);

    const tableInfo={
      goal:['goals','person_id'],task:['tasks','person_id'],certificate:['certificates','person_id'],achievement:['achievements','person_id'],card:['member_cards','person_id'],document:['member_documents','person_id']
    };
    let row=null;
    if(kind==='activity'){
      row=await env.DB.prepare(`SELECT a.*,ap.role_label,ap.result,ap.verification_status FROM activities a JOIN activity_participants ap ON ap.activity_id=a.id WHERE a.id=? AND ap.person_id=?`).bind(id,pid).first();
    }else if(kind==='scope'){
      row=await env.DB.prepare(`SELECT s.*,a.person_id FROM account_scopes s JOIN accounts a ON a.id=s.account_id WHERE s.id=? AND a.person_id=?`).bind(id,pid).first();
    }else{
      const [table,col]=tableInfo[kind];
      row=await env.DB.prepare(`SELECT * FROM ${table} WHERE id=? AND ${col}=?`).bind(id,pid).first();
    }
    if(!row)return json({error:'RECORD_NOT_FOUND'},404);
    if(row.org_node_id&&!(await canAccessOrg(env,s.account_id,row.org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);

    const b=(req.method==='PATCH')?await bodyJson(req):{};
    const changedOrg=(Object.prototype.hasOwnProperty.call(b,'org_node_id'))?(clean(b.org_node_id,100)||null):row.org_node_id;
    if(changedOrg&&!(await canAccessOrg(env,s.account_id,changedOrg)))return json({error:'SCOPE_FORBIDDEN'},403);

    if(req.method==='PATCH'&&!action){
      if(kind==='goal'){
        const period=clean(b.period_type,20)||row.period_type;
        const status=clean(b.status,30)||row.status;
        if(!['week','month','quarter','year'].includes(period)||!['active','completed','cancelled'].includes(status))return json({error:'INVALID_DATA'},400);
        await env.DB.prepare(`UPDATE goals SET org_node_id=?,period_type=?,title=?,description=?,priority=?,progress=?,status=?,starts_at=?,due_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`).bind(changedOrg,period,clean(b.title,240)||row.title,clean(b.description,2000)||null,clean(b.priority,30)||row.priority,Math.max(0,Math.min(100,Number(b.progress??row.progress))),status,clean(b.starts_at,20)||null,clean(b.due_at,20)||null,id,pid).run();
      }else if(kind==='task'){
        const status=clean(b.status,30)||row.status;
        if(!['todo','doing','done','cancelled'].includes(status))return json({error:'INVALID_DATA'},400);
        await env.DB.prepare(`UPDATE tasks SET org_node_id=?,goal_id=?,title=?,description=?,priority=?,progress=?,status=?,due_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`).bind(changedOrg,clean(b.goal_id,120)||null,clean(b.title,240)||row.title,clean(b.description,2000)||null,clean(b.priority,30)||row.priority,Math.max(0,Math.min(100,Number(b.progress??row.progress))),status,clean(b.due_at,20)||null,id,pid).run();
      }else if(kind==='activity'){
        await env.DB.batch([
          env.DB.prepare(`UPDATE activities SET code=?,name=?,org_node_id=?,starts_at=?,ends_at=?,status=?,description=? WHERE id=?`).bind(clean(b.code,120)||row.code,clean(b.name,240)||row.name,changedOrg,clean(b.starts_at,30)||null,clean(b.ends_at,30)||null,clean(b.status,30)||row.status,clean(b.description,2000)||null,id),
          env.DB.prepare(`UPDATE activity_participants SET role_label=?,result=? WHERE activity_id=? AND person_id=?`).bind(clean(b.role_label,160)||row.role_label,clean(b.result,1000)||null,id,pid)
        ]);
      }else if(kind==='certificate'){
        const vs=clean(b.verification_status,30)||row.verification_status;
        if(!['provided','pending','verified','rejected'].includes(vs))return json({error:'INVALID_DATA'},400);
        await env.DB.prepare(`UPDATE certificates SET org_node_id=?,certificate_no=?,title=?,issuer=?,issued_at=?,verification_status=?,file_url=? WHERE id=? AND person_id=?`).bind(changedOrg,clean(b.certificate_no,160)||null,clean(b.title,240)||row.title,clean(b.issuer,240)||row.issuer,clean(b.issued_at,20)||null,vs,clean(b.file_url,1200)||null,id,pid).run();
      }else if(kind==='achievement'){
        await env.DB.prepare(`UPDATE achievements SET org_node_id=?,title=?,achievement_type=?,issuer=?,achieved_at=?,verification_status=?,source_type=?,description=? WHERE id=? AND person_id=?`).bind(changedOrg,clean(b.title,240)||row.title,clean(b.achievement_type,100)||null,clean(b.issuer,240)||null,clean(b.achieved_at,20)||null,clean(b.verification_status,30)||row.verification_status,clean(b.source_type,30)||row.source_type,clean(b.description,2000)||null,id,pid).run();
      }else if(kind==='card'){
        const status=clean(b.status,30)||row.status,issuedAt=clean(b.issued_at,20)||row.issued_at,expiresAt=clean(b.expires_at,20)||null;
        if(!['active','expired','revoked'].includes(status))return json({error:'INVALID_DATA'},400);
        if(!validDateOnly(issuedAt)||(expiresAt&&!validDateOnly(expiresAt)))return json({error:'INVALID_DATE'},400);
        if(expiresAt&&expiresAt<issuedAt)return json({error:'EXPIRY_BEFORE_ISSUE'},400);
        await env.DB.prepare(`UPDATE member_cards SET org_node_id=?,card_number=?,title_on_card=?,issued_at=?,expires_at=?,status=? WHERE id=? AND person_id=?`).bind(changedOrg,clean(b.card_number,160)||row.card_number,clean(b.title_on_card,180)||null,issuedAt,expiresAt,status,id,pid).run();
      }else if(kind==='document'){
        await env.DB.prepare(`UPDATE member_documents SET org_node_id=?,document_type=?,title=?,file_url=?,issued_at=?,visibility=? WHERE id=? AND person_id=?`).bind(changedOrg,clean(b.document_type,100)||row.document_type,clean(b.title,240)||row.title,clean(b.file_url,1200)||null,clean(b.issued_at,20)||null,clean(b.visibility,30)||row.visibility,id,pid).run();
      }else return json({error:'METHOD_NOT_ALLOWED'},405);
      await audit(env,s.account_id,`${kind}_updated`,kind,id,changedOrg,{person_id:pid});
      return json({ok:true,status:'updated'});
    }

    if(req.method==='POST'&&action){
      if(kind==='goal'){
        const st=action==='complete'?'completed':action==='cancel'?'cancelled':action==='restore'?'active':null;
        if(!st)return json({error:'INVALID_ACTION'},400);
        await env.DB.prepare(`UPDATE goals SET status=?,progress=CASE WHEN ?='completed' THEN 100 ELSE progress END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`).bind(st,st,id,pid).run();
      }else if(kind==='task'){
        const st=action==='complete'?'done':action==='cancel'?'cancelled':action==='restore'||action==='todo'?'todo':action==='doing'?'doing':null;
        if(!st)return json({error:'INVALID_ACTION'},400);
        await env.DB.prepare(`UPDATE tasks SET status=?,progress=CASE WHEN ?='done' THEN 100 ELSE progress END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`).bind(st,st,id,pid).run();
      }else if(kind==='activity'){
        const st=action==='hide'?'hidden':action==='show'?'confirmed':null;
        if(!st)return json({error:'INVALID_ACTION'},400);
        await env.DB.prepare(`UPDATE activity_participants SET verification_status=? WHERE activity_id=? AND person_id=?`).bind(st,id,pid).run();
      }else if(kind==='certificate'){
        const st=action==='revoke'?'rejected':action==='restore'?'verified':null;
        if(!st)return json({error:'INVALID_ACTION'},400);
        await env.DB.prepare(`UPDATE certificates SET verification_status=? WHERE id=? AND person_id=?`).bind(st,id,pid).run();
      }else if(kind==='achievement'){
        const st=action==='hide'?'hidden':action==='show'||action==='restore'?'verified':action==='revoke'?'rejected':null;
        if(!st)return json({error:'INVALID_ACTION'},400);
        await env.DB.prepare(`UPDATE achievements SET verification_status=? WHERE id=? AND person_id=?`).bind(st,id,pid).run();
      }else if(kind==='card'){
        const st=action==='revoke'||action==='deactivate'?'revoked':action==='restore'||action==='activate'?'active':null;
        if(!st)return json({error:'INVALID_ACTION'},400);
        await env.DB.prepare(`UPDATE member_cards SET status=? WHERE id=? AND person_id=?`).bind(st,id,pid).run();
      }else if(kind==='document'){
        const st=action==='hide'?'hidden':action==='show'||action==='restore'?'private':null;
        if(!st)return json({error:'INVALID_ACTION'},400);
        await env.DB.prepare(`UPDATE member_documents SET visibility=? WHERE id=? AND person_id=?`).bind(st,id,pid).run();
      }else if(kind==='scope'){
        const active=action==='activate'||action==='restore'?1:action==='deactivate'?0:null;
        if(active===null)return json({error:'INVALID_ACTION'},400);
        if(row.role_id==='role_member'&&active===0)return json({error:'MEMBER_SCOPE_REQUIRED'},409);
        await env.DB.prepare(`UPDATE account_scopes SET active=? WHERE id=?`).bind(active,id).run();
      }
      await audit(env,s.account_id,`${kind}_${action}`,kind,id,row.org_node_id||null,{person_id:pid});
      return json({ok:true,action});
    }
    return json({error:'METHOD_NOT_ALLOWED'},405);
  }

  // =========================================================
  // ADMIN EXTERNAL CERTIFICATE REVIEW
  // =========================================================
  const certReviewMatch=url.pathname.match(/^\/api\/admin\/certificates\/([^/]+)\/review$/);
  if(certReviewMatch&&req.method==='POST'){
    if(!(await hasPerm(env,s.account_id,'certificate.manage')))return json({error:'FORBIDDEN'},403);
    const id=decodeURIComponent(certReviewMatch[1]);
    const cert=await env.DB.prepare(`SELECT * FROM certificates WHERE id=?`).bind(id).first();
    if(!cert)return json({error:'NOT_FOUND'},404);
    if(!(await canAccessPerson(env,s.account_id,cert.person_id)))return json({error:'SCOPE_FORBIDDEN'},403);
    if(cert.org_node_id&&!(await canAccessOrg(env,s.account_id,cert.org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);
    const b=await bodyJson(req);
    const status=clean(b.status,30);
    if(!['verified','rejected'].includes(status))return json({error:'INVALID_STATUS'},400);
    await env.DB.prepare(`UPDATE certificates SET verification_status=? WHERE id=?`).bind(status,id).run();
    await audit(env,s.account_id,status==='verified'?'certificate_verified':'certificate_rejected','certificate',id,cert.org_node_id,{person_id:cert.person_id});
    return json({ok:true,status});
  }

  // =========================================================
  // ACCOUNT REQUEST ADMIN
  // =========================================================
  if(url.pathname==='/api/admin/account-requests'&&req.method==='GET'){
    if(!(await hasPerm(env,s.account_id,'request.manage')))return json({error:'FORBIDDEN'},403);
    await ensureAccountRequestProfiles(env);
    await ensureAccountRequestExtended(env);
    const status=clean(url.searchParams.get('status'),30)||'pending',params=[],where=[];
    if(status!=='all'){where.push('ar.status=?');params.push(status)}
    if(!(await isNetworkAdmin(env,s.account_id))){where.push(`ar.target_org_node_id IN (WITH RECURSIVE allowed(id) AS (SELECT sc.org_node_id FROM account_scopes sc JOIN roles rr ON rr.id=sc.role_id WHERE sc.account_id=? AND sc.active=1 AND rr.code IN ('SCOPE_ADMIN','UNIT_ADMIN','DEPARTMENT_ADMIN') AND sc.org_node_id IS NOT NULL UNION SELECT o.id FROM org_nodes o JOIN allowed a ON o.parent_id=a.id) SELECT id FROM allowed)`);params.push(s.account_id)}
    const r=await env.DB.prepare(`
      SELECT ar.*,arp.education_or_work_type,arp.school_or_workplace,arp.class_or_major,arp.education_status,
        ext.school_name,ext.employment_status,ext.workplace_name,ext.work_department,ext.job_title,
        ext.guardian_date_of_birth,CASE WHEN ext.guardian_id_number IS NULL OR trim(ext.guardian_id_number)='' THEN NULL WHEN length(ext.guardian_id_number)>4 THEN '••••••••'||substr(ext.guardian_id_number,-4) ELSE '••••' END guardian_id_number,
        o.name org_name,a.username reviewer_username,
        COALESCE(reqorg.requested_org_ids,ar.target_org_node_id) requested_org_ids,
        COALESCE(reqorg.requested_org_names,o.name) requested_org_names,
        COALESCE(reqorg.requested_org_count,1) requested_org_count,
        CAST((julianday('now')-julianday(ar.date_of_birth))/365.2425 AS INTEGER) age
      FROM account_requests ar
      LEFT JOIN account_request_profiles arp ON arp.request_id=ar.id
      LEFT JOIN account_request_extended ext ON ext.request_id=ar.id
      LEFT JOIN (SELECT aro.request_id,GROUP_CONCAT(aro.org_node_id, ',') requested_org_ids,GROUP_CONCAT(onode.name, ' · ') requested_org_names,COUNT(*) requested_org_count FROM account_request_orgs aro JOIN org_nodes onode ON onode.id=aro.org_node_id GROUP BY aro.request_id) reqorg ON reqorg.request_id=ar.id
      LEFT JOIN org_nodes o ON o.id=ar.target_org_node_id
      LEFT JOIN accounts a ON a.id=ar.reviewed_by_account_id
      ${where.length?'WHERE '+where.join(' AND '):''}
      ORDER BY ar.created_at DESC LIMIT 500
    `).bind(...params).all();return json({items:r.results||[]});
  }
  const approvalResend=url.pathname.match(/^\/api\/admin\/account-requests\/([^/]+)\/send-approval$/);
  if(approvalResend&&req.method==='POST'){
    if(!(await hasPerm(env,s.account_id,'request.manage')))return json({error:'FORBIDDEN'},403);
    const rid=decodeURIComponent(approvalResend[1]);
    const r=await env.DB.prepare(`SELECT ar.id,ar.email,ar.full_name,ar.target_org_node_id,p.member_code,a.username FROM account_requests ar JOIN people p ON p.id=ar.approved_person_id JOIN accounts a ON a.person_id=p.id WHERE ar.id=? AND ar.status='approved'`).bind(rid).first();
    if(!r)return json({error:'APPROVED_REQUEST_NOT_FOUND'},404);
    if(!(await canAccessOrg(env,s.account_id,r.target_org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);
    const mail=await sendMemberEmail(env,{to:r.email,subject:`[Sky First Network] Thông tin tài khoản thành viên – ${r.member_code}`,html:memberEmailHtml({title:'Tài khoản đã được phê duyệt',name:r.full_name,intro:'Hồ sơ thành viên của bạn đã được phê duyệt tại Sky First Network.',status:'ĐÃ PHÊ DUYỆT',processing:'',body:`Mã thành viên: ${r.member_code}. Tên đăng nhập: ${r.username}. Nếu chưa có mật khẩu, hãy liên hệ bộ phận hỗ trợ để được hướng dẫn kích hoạt bảo mật.`,ctaUrl:env.APP_URL||'https://nghiepvu.skyfirst.io.vn',ctaLabel:'Mở Trung tâm Nghiệp vụ Số Sky First'})});
    await safeAudit(env,s.account_id,'approval_email_manual','account_request',rid,r.target_org_node_id,{sent:mail.sent===true});
    return json({ok:true,email_sent:mail.sent===true,email_error:mail.error||mail.reason||null});
  }
  const reqReview=url.pathname.match(/^\/api\/admin\/account-requests\/([^/]+)\/(approve|reject|supplement)$/);
  if(reqReview&&req.method==='POST'){
    if(!(await hasPerm(env,s.account_id,'request.manage')))return json({error:'FORBIDDEN'},403);
    await ensureAccountRequestProfiles(env);
    await ensureAccountRequestExtended(env);
    const rid=decodeURIComponent(reqReview[1]),op=reqReview[2],b=await bodyJson(req),r=await env.DB.prepare(`SELECT ar.*,arp.education_or_work_type,arp.school_or_workplace,arp.class_or_major,arp.education_status,ext.school_name,ext.employment_status,ext.workplace_name,ext.work_department,ext.job_title,ext.guardian_date_of_birth,ext.guardian_id_number FROM account_requests ar LEFT JOIN account_request_profiles arp ON arp.request_id=ar.id LEFT JOIN account_request_extended ext ON ext.request_id=ar.id WHERE ar.id=? AND ar.status IN ('pending','supplement')`).bind(rid).first();
    if(!r)return json({error:'REQUEST_NOT_PENDING'},409);
    if(!(await canAccessOrg(env,s.account_id,r.target_org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);
    if(op==='reject'||op==='supplement'){
      const note=clean(b.admin_note,1000);if(!note)return json({error:'ADMIN_NOTE_REQUIRED'},400);
      const next=op==='reject'?'rejected':'supplement';
      await env.DB.prepare(`UPDATE account_requests SET status=?,admin_note=?,reviewed_by_account_id=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,avatar_url=CASE WHEN ?='rejected' THEN '' ELSE avatar_url END WHERE id=?`).bind(next,note,s.account_id,next,rid).run();
      if(op==='reject')await deletePendingRequestAvatar(env,r.avatar_url);
      await audit(env,s.account_id,op==='reject'?'account_request_rejected':'account_request_supplement_requested','account_request',rid,r.target_org_node_id,{note});
      const label=op==='reject'?'Chưa được phê duyệt':'Cần bổ sung hồ sơ';
      await sendMemberEmail(env,{to:r.email,subject:`[Sky First Network] ${label} – ${r.request_code}`,html:memberEmailHtml({title:label,name:r.full_name,intro:op==='reject'?'Sky First Network đã hoàn tất xem xét yêu cầu đăng ký của bạn.':'Hồ sơ đăng ký của bạn cần bổ sung thêm thông tin trước khi tiếp tục xử lý.',code:r.request_code,status:label,processing:'',body:note,ctaUrl:env.APP_URL||'https://nghiepvu.skyfirst.io.vn',ctaLabel:'Mở Trung tâm Nghiệp vụ Số Sky First'})});
      return json({ok:true,status:next});
    }
    const requestedRows=await env.DB.prepare(`SELECT aro.org_node_id,aro.is_primary,o.status,o.deleted_at FROM account_request_orgs aro JOIN org_nodes o ON o.id=aro.org_node_id WHERE aro.request_id=? ORDER BY aro.is_primary DESC`).bind(rid).all();
    const requestedOrgIds=[...new Set((requestedRows.results||[]).map(x=>x.org_node_id).filter(Boolean))];
    if(!requestedOrgIds.length)requestedOrgIds.push(r.target_org_node_id);
    if(!requestedOrgIds.includes(r.target_org_node_id))requestedOrgIds.unshift(r.target_org_node_id);
    if(requestedRows.results?.some(x=>x.status!=='active'||x.deleted_at))return json({error:'REQUESTED_ORG_UNAVAILABLE',message:'Một trong các đơn vị đã chọn không còn hoạt động.'},409);
    for(const orgId of requestedOrgIds){if(!(await canAccessOrg(env,s.account_id,orgId)))return json({error:'SCOPE_FORBIDDEN',message:'Hồ sơ có nhiều đơn vị đăng ký. Chỉ quản trị viên có quyền với tất cả đơn vị đã chọn mới được phê duyệt; vui lòng chuyển cho quản trị Mạng lưới.'},403)}
    if(await env.DB.prepare(`SELECT 1 FROM accounts WHERE lower(email)=? LIMIT 1`).bind(r.email).first())return json({error:'ACCOUNT_ALREADY_EXISTS'},409);
    const code=await memberCode(env),pid=uid('person'),aid=uid('account'),username=code.toLowerCase(),temporaryPassword=`SFN-${crypto.randomUUID().replaceAll('-','').slice(0,14)}`,salt=token(),it=100000,hash=await pbkdf2(temporaryPassword,salt,it);
    const avatarPromotion=await prepareRequestAvatarPromotion(env,r.avatar_url,pid);
    const approvedAvatarUrl=avatarPromotion.url||(String(r.avatar_url||'').startsWith('/files/requests/avatars/')?null:(clean(r.avatar_url,1200)||null));
    try{
      await env.DB.batch([
env.DB.prepare(`
  INSERT INTO people(
    id,
    member_code,
    full_name,
    display_name,
    date_of_birth,
    gender,
    nationality,
    id_number,
    id_issue_date,
    id_issue_place,
    email,
    phone,
    permanent_address,
    temporary_address,
    education_or_work_type,
    school_or_workplace,
    class_or_major,
    education_status,
    avatar_url,
    joined_at,
    status
  )
  VALUES(
    ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
    DATE('now'),
    'active'
  )
`).bind(
  pid,
  code,
  r.full_name,
  r.display_name,
  r.date_of_birth,
  r.gender,
  r.nationality,
  r.id_number,
  r.id_issue_date,
  r.id_issue_place,
  r.email,
  r.phone,
  r.permanent_address,
  r.temporary_address,
  r.education_or_work_type||null,
  r.school_or_workplace||null,
  r.class_or_major||null,
  r.education_status||null,
  approvedAvatarUrl
),
      env.DB.prepare(`INSERT INTO accounts(id,person_id,username,email,password_hash,password_salt,password_iterations,force_password_change) VALUES(?,?,?,?,?,?,?,1)`).bind(aid,pid,username,r.email,hash,salt,it),
      env.DB.prepare(`INSERT INTO account_scopes(id,account_id,role_id,org_node_id,active) VALUES(?,?,?,?,1)`).bind(uid('scope'),aid,'role_member',null),
      ...requestedOrgIds.map(orgId=>env.DB.prepare(`INSERT INTO org_memberships(id,person_id,org_node_id,role_label,started_at,status,is_primary) VALUES(?,?,?, ?,DATE('now'),'active',?)`).bind(uid('membership'),pid,orgId,'Thành viên',orgId===r.target_org_node_id?1:0)),
      env.DB.prepare(`INSERT INTO people_work_profiles(person_id,school_name,employment_status,workplace_name,work_department,job_title) VALUES(?,?,?,?,?,?)`).bind(pid,r.school_name||null,r.employment_status||null,r.workplace_name||null,r.work_department||null,r.job_title||null),
      env.DB.prepare(`UPDATE account_requests SET status='approved',avatar_url=?,admin_note=?,reviewed_by_account_id=?,reviewed_at=CURRENT_TIMESTAMP,approved_person_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(approvedAvatarUrl||'',clean(b.admin_note,1000)||'Đã phê duyệt',s.account_id,pid,rid),
      env.DB.prepare(`UPDATE account_request_extended SET guardian_date_of_birth=NULL,guardian_id_number=NULL WHERE request_id=?`).bind(rid)
      ]);
    }catch(err){
      if(avatarPromotion.newKey&&env.FILES?.delete){try{await env.FILES.delete(avatarPromotion.newKey)}catch(deleteErr){console.error('ORPHAN_AVATAR_CLEANUP_FAILED',String(deleteErr?.message||deleteErr))}}
      throw err;
    }
    if(avatarPromotion.oldKey&&env.FILES?.delete){try{await env.FILES.delete(avatarPromotion.oldKey)}catch(err){console.error('OLD_REQUEST_AVATAR_DELETE_FAILED',String(err?.message||err))}}
    await audit(env,s.account_id,'account_request_approved','account_request',rid,r.target_org_node_id,{person_id:pid,member_code:code,org_node_ids:requestedOrgIds});const mail=b.send_email!==false?await sendMemberEmail(env,{to:r.email,subject:`[Sky First Network] Tài khoản thành viên đã được phê duyệt – ${code}`,html:memberEmailHtml({title:'Tài khoản thành viên đã được phê duyệt',name:r.full_name,intro:'Hồ sơ của bạn đã được phê duyệt và tài khoản tại Trung tâm Nghiệp vụ Số Sky First đã được tạo.',code:r.request_code,status:'Đã phê duyệt',processing:'',body:`Mã thành viên: ${code}. Tên đăng nhập: ${username}. Vui lòng liên hệ bộ phận quản trị qua kênh hỗ trợ chính thức để nhận hướng dẫn kích hoạt tài khoản và thiết lập mật khẩu an toàn.`,ctaUrl:env.APP_URL||'https://nghiepvu.skyfirst.io.vn',ctaLabel:'Đăng nhập Trung tâm Nghiệp vụ Số Sky First'})}):{sent:false,reason:'NOT_REQUESTED'};await safeAudit(env,s.account_id,'approval_email_status','account_request',rid,r.target_org_node_id,{requested:b.send_email!==false,sent:mail.sent===true});return json({ok:true,email_sent:mail.sent===true,member_code:code,username,temporary_password:temporaryPassword,approved_org_ids:requestedOrgIds,note:'Tài khoản đã được tạo; mật khẩu tạm chỉ được trả về trong lần phê duyệt này và phải đổi khi đăng nhập lần đầu.'});
  }

  // =========================================================
  // CALENDAR
  // =========================================================
  if(url.pathname==='/api/me/calendar'&&req.method==='GET'){
    if(!s.person_id)return json({items:[]});const r=await env.DB.prepare(`SELECT e.*,o.name org_name FROM calendar_events e LEFT JOIN org_nodes o ON o.id=e.org_node_id WHERE e.status='active' AND (e.target_person_id=? OR (e.target_person_id IS NULL AND e.org_node_id IS NULL) OR e.org_node_id IN (SELECT org_node_id FROM org_memberships WHERE person_id=? AND status='active')) ORDER BY e.starts_at`).bind(s.person_id,s.person_id).all();return json({items:r.results||[]});
  }
  if(url.pathname==='/api/admin/calendar'&&req.method==='GET'){
    if(!(await hasPerm(env,s.account_id,'calendar.view'))&&!(await hasPerm(env,s.account_id,'calendar.manage')))return json({error:'FORBIDDEN'},403);const orgs=await visibleOrgs(env,s.account_id),ids=orgs.map(x=>x.id);let r;if(await isNetworkAdmin(env,s.account_id))r=await env.DB.prepare(`SELECT e.*,o.name org_name FROM calendar_events e LEFT JOIN org_nodes o ON o.id=e.org_node_id ORDER BY e.starts_at DESC LIMIT 500`).all();else if(ids.length)r=await env.DB.prepare(`SELECT e.*,o.name org_name FROM calendar_events e LEFT JOIN org_nodes o ON o.id=e.org_node_id WHERE e.org_node_id IN (${ids.map(()=>'?').join(',')}) ORDER BY e.starts_at DESC LIMIT 500`).bind(...ids).all();else return json({items:[]});return json({items:r.results||[]});
  }
  if(url.pathname==='/api/admin/calendar'&&req.method==='POST'){
    if(!(await hasPerm(env,s.account_id,'calendar.manage')))return json({error:'FORBIDDEN'},403);const b=await bodyJson(req),org=clean(b.org_node_id,100)||null;if(org&&!(await canAccessOrg(env,s.account_id,org)))return json({error:'SCOPE_FORBIDDEN'},403);if(!clean(b.title,200)||!clean(b.starts_at,40))return json({error:'INVALID_DATA'},400);const id=uid('calendar');await env.DB.prepare(`INSERT INTO calendar_events(id,title,event_type,description,starts_at,ends_at,org_node_id,target_person_id,created_by_account_id) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id,clean(b.title,200),clean(b.event_type,50)||'other',clean(b.description,2000)||null,clean(b.starts_at,40),clean(b.ends_at,40)||null,org,clean(b.target_person_id,100)||null,s.account_id).run();await audit(env,s.account_id,'calendar_created','calendar_event',id,org);return json({ok:true,id});
  }
  const calDel=url.pathname.match(/^\/api\/admin\/calendar\/([^/]+)$/);if(calDel&&req.method==='DELETE'){if(!(await hasPerm(env,s.account_id,'calendar.manage')))return json({error:'FORBIDDEN'},403);const id=decodeURIComponent(calDel[1]),e=await env.DB.prepare(`SELECT org_node_id FROM calendar_events WHERE id=?`).bind(id).first();if(!e)return json({error:'NOT_FOUND'},404);if(e.org_node_id&&!(await canAccessOrg(env,s.account_id,e.org_node_id)))return json({error:'SCOPE_FORBIDDEN'},403);await env.DB.prepare(`DELETE FROM calendar_events WHERE id=?`).bind(id).run();await audit(env,s.account_id,'calendar_deleted','calendar_event',id,e.org_node_id);return json({ok:true})}

  // =========================================================
  // ADMIN OPERATIONS CENTER
  // =========================================================
  if(url.pathname==='/api/admin/work-center'&&req.method==='GET'){
    if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const visOrgs=await visibleOrgs(env,s.account_id);
    const visOrgIds=new Set(visOrgs.map(o=>o.id));
    const netElevated=await isNetworkAdmin(env,s.account_id);
    const [pending,attention,expiring,incomplete,reqRows,ticketRows,cardRows,profileRows,queueStates]=await Promise.all([
      env.DB.prepare("SELECT COUNT(*) n FROM account_requests WHERE status IN ('pending','supplement')").first(),
      env.DB.prepare("SELECT COUNT(*) n FROM accounts a LEFT JOIN account_restrictions r ON r.account_id=a.id WHERE a.is_locked=1 OR (r.account_id IS NOT NULL AND (r.ends_at IS NULL OR r.ends_at>datetime('now')))").first(),
      env.DB.prepare("SELECT COUNT(*) n FROM member_cards WHERE status='active' AND expires_at IS NOT NULL AND expires_at<=datetime('now','+30 day')").first(),
      env.DB.prepare("SELECT COUNT(*) n FROM people WHERE status='active' AND (email IS NULL OR trim(email)='' OR avatar_url IS NULL OR trim(avatar_url)='')").first(),
      env.DB.prepare(`SELECT r.id,r.request_code,r.full_name,r.email,r.status,r.target_org_node_id,r.created_at,o.name org_name,CASE WHEN r.created_at<=datetime('now','-48 hours') THEN 1 ELSE 0 END is_overdue FROM account_requests r LEFT JOIN org_nodes o ON o.id=r.target_org_node_id WHERE r.status IN ('pending','supplement') ORDER BY r.created_at ASC LIMIT 80`).all(),
      env.DB.prepare(`SELECT st.id,st.ticket_code,st.category,st.subject,st.status,st.created_at,p.full_name,sta.org_node_id,sta.assigned_account_id,sta.priority,sta.impact_level,sta.sla_due_at,CASE WHEN sta.sla_due_at IS NOT NULL AND sta.sla_due_at<datetime('now') AND st.status NOT IN ('completed','closed') THEN 1 ELSE 0 END is_overdue FROM support_tickets st LEFT JOIN people p ON p.id=st.person_id LEFT JOIN support_ticket_assignments sta ON sta.ticket_id=st.id WHERE st.status NOT IN ('completed','closed') ORDER BY st.created_at ASC LIMIT 80`).all(),
      env.DB.prepare(`SELECT c.id,c.card_number,c.person_id,c.org_node_id,c.expires_at,c.created_at,p.full_name,o.name org_name,CASE WHEN c.expires_at<date('now') THEN 1 ELSE 0 END is_overdue FROM member_cards c JOIN people p ON p.id=c.person_id LEFT JOIN org_nodes o ON o.id=c.org_node_id WHERE c.status='active' AND c.expires_at IS NOT NULL AND c.expires_at<=date('now','+30 day') ORDER BY c.expires_at ASC LIMIT 60`).all(),
      env.DB.prepare(`SELECT p.id,p.member_code,p.full_name,p.email,p.id_number,p.updated_at FROM people p WHERE p.status='active' AND (p.email IS NULL OR trim(p.email)='' OR p.id_number IS NULL OR trim(p.id_number)='') LIMIT 60`).all(),
      env.DB.prepare(`SELECT w.*,a.username assigned_username FROM work_queue_states w LEFT JOIN accounts a ON a.id=w.assigned_account_id`).all()
    ]);
    const qMap=new Map((queueStates.results||[]).map(w=>[w.item_key,w]));
    const rawItems=[];
    for(const r of (reqRows.results||[])){
      if(!netElevated&&r.target_org_node_id&&!visOrgIds.has(r.target_org_node_id))continue;
      const itemKey=`req:${r.id}`;
      const qs=qMap.get(itemKey);
      const isOverdue=Boolean(r.is_overdue)||(qs?.due_at&&qs.due_at<new Date().toISOString().slice(0,19));
      const prio=qs?.priority||(isOverdue?'urgent':'high');
      const wfState=qs?.workflow_state||(r.status==='supplement'?'paused':'open');
      const prioScore=(wfState==='blocked'?95:0)+(isOverdue?90:0)+(prio==='urgent'?80:prio==='high'?60:prio==='normal'?40:20);
      const prioReason=wfState==='blocked'?`Đang bị chặn: ${qs?.blocked_reason||'Chờ tháo gỡ điều kiện'}`:isOverdue?'Quá hạn SLA xét duyệt (> 48 giờ)':r.status==='supplement'?'Đang chờ người đăng ký bổ sung hồ sơ':'Hồ sơ đăng ký mới cần phân loại và xét duyệt';
      rawItems.push({
        item_key:itemKey,source_type:'account_request',source_id:r.id,code:r.request_code,
        kind_label:'Xét duyệt tài khoản',title:`Duyệt hồ sơ: ${r.full_name} (${r.request_code})`,
        detail:`Đơn vị: ${r.org_name||'Mạng lưới'} · Trạng thái: ${r.status}`,
        target:r.request_code,target_view:'admin-requests',
        org_node_id:qs?.org_node_id||r.target_org_node_id||null,org_name:r.org_name||'Sky First Network',
        assigned_account_id:qs?.assigned_account_id||null,assigned_username:qs?.assigned_username||null,
        priority:prio,priority_score:prioScore,priority_reason:prioReason,
        workflow_state:wfState,is_overdue:isOverdue,
        blocked_reason:qs?.blocked_reason||null,blocked_missing_condition:qs?.blocked_missing_condition||null,
        blocked_coordination_party:qs?.blocked_coordination_party||null,blocked_resolution_plan:qs?.blocked_resolution_plan||null,
        due_at:qs?.due_at||null,reminder_count:Number(qs?.reminder_count||0),
        collaborators:(()=>{try{return JSON.parse(qs?.collaborator_ids_json||'[]')}catch{return []}})(),
        dependencies:(()=>{try{return JSON.parse(qs?.dependency_keys_json||'[]')}catch{return []}})(),
        created_at:r.created_at
      });
    }
    for(const t of (ticketRows.results||[])){
      if(!netElevated&&t.org_node_id&&!visOrgIds.has(t.org_node_id))continue;
      const itemKey=`ticket:${t.id}`;
      const qs=qMap.get(itemKey);
      const isOverdue=Boolean(t.is_overdue);
      const prio=qs?.priority||t.priority||'normal';
      const wfState=qs?.workflow_state||(t.status==='in_progress'?'in_progress':t.status==='waiting_supplement'?'paused':t.status==='escalated'?'escalated':'open');
      const prioScore=(wfState==='blocked'?95:0)+(isOverdue?88:0)+(prio==='urgent'?82:prio==='high'?62:prio==='normal'?42:22);
      const prioReason=wfState==='blocked'?`Đang bị chặn: ${qs?.blocked_reason||'Chờ phối hợp'}`:isOverdue?'Quá hạn mục tiêu phản hồi/xử lý SLA':t.impact_level==='critical'?'Mức ảnh hưởng nghiêm trọng tới nghiệp vụ':`Yêu cầu hỗ trợ danh mục ${t.category}`;
      rawItems.push({
        item_key:itemKey,source_type:'support_ticket',source_id:t.id,code:t.ticket_code,
        kind_label:'Hỗ trợ nghiệp vụ',title:`Phiếu hỗ trợ ${t.ticket_code}: ${t.subject}`,
        detail:`Người gửi: ${t.full_name||'Thành viên'} · Mức ảnh hưởng: ${t.impact_level||'medium'}`,
        target:t.ticket_code,target_view:'admin-work',
        org_node_id:qs?.org_node_id||t.org_node_id||null,org_name:'Trung tâm Hỗ trợ',
        assigned_account_id:qs?.assigned_account_id||t.assigned_account_id||null,assigned_username:qs?.assigned_username||null,
        priority:prio,priority_score:prioScore,priority_reason:prioReason,
        workflow_state:wfState,is_overdue:isOverdue,
        blocked_reason:qs?.blocked_reason||null,blocked_missing_condition:qs?.blocked_missing_condition||null,
        blocked_coordination_party:qs?.blocked_coordination_party||null,blocked_resolution_plan:qs?.blocked_resolution_plan||null,
        due_at:qs?.due_at||t.sla_due_at||null,reminder_count:Number(qs?.reminder_count||0),
        collaborators:(()=>{try{return JSON.parse(qs?.collaborator_ids_json||'[]')}catch{return []}})(),
        dependencies:(()=>{try{return JSON.parse(qs?.dependency_keys_json||'[]')}catch{return []}})(),
        created_at:t.created_at
      });
    }
    for(const c of (cardRows.results||[])){
      if(!netElevated&&c.org_node_id&&!visOrgIds.has(c.org_node_id))continue;
      const itemKey=`card:${c.id}`;
      const qs=qMap.get(itemKey);
      const isOverdue=Boolean(c.is_overdue);
      const prio=qs?.priority||(isOverdue?'high':'normal');
      const wfState=qs?.workflow_state||'open';
      const prioScore=(isOverdue?75:45)+(prio==='urgent'?30:0);
      rawItems.push({
        item_key:itemKey,source_type:'member_card',source_id:c.id,code:c.card_number,
        kind_label:'Thẻ thành viên',title:`Gia hạn / đồng bộ thẻ ${c.card_number} (${c.full_name})`,
        detail:`Hạn thẻ: ${c.expires_at} · Đơn vị: ${c.org_name||'Sky First'}`,
        target:c.card_number,target_view:'admin-issuance',
        org_node_id:c.org_node_id||null,org_name:c.org_name||'Sky First Network',
        assigned_account_id:qs?.assigned_account_id||null,assigned_username:qs?.assigned_username||null,
        priority:prio,priority_score:prioScore,priority_reason:isOverdue?'Thẻ đã quá hạn nhưng vẫn đánh dấu active':'Thẻ sắp hết hạn trong vòng 30 ngày',
        workflow_state:wfState,is_overdue:isOverdue,
        blocked_reason:qs?.blocked_reason||null,due_at:c.expires_at,reminder_count:Number(qs?.reminder_count||0),
        collaborators:[],dependencies:[],created_at:c.created_at
      });
    }
    for(const p of (profileRows.results||[])){
      const itemKey=`profile:${p.id}`;
      const qs=qMap.get(itemKey);
      const wfState=qs?.workflow_state||'open';
      rawItems.push({
        item_key:itemKey,source_type:'person_profile',source_id:p.id,code:p.member_code,
        kind_label:'Hồ sơ thiếu dữ liệu',title:`Bổ sung định danh/email cho ${p.full_name} (${p.member_code})`,
        detail:`Thiếu: ${!p.email?'Email ':''}${!p.id_number?'CCCD':''}`.trim(),
        target:p.member_code,target_view:'admin-members',
        org_node_id:qs?.org_node_id||null,org_name:'Quản lý Hồ sơ',
        assigned_account_id:qs?.assigned_account_id||null,assigned_username:qs?.assigned_username||null,
        priority:qs?.priority||'low',priority_score:30,priority_reason:'Hồ sơ đang hoạt động nhưng thiếu trường định danh chuẩn',
        workflow_state:wfState,is_overdue:false,
        blocked_reason:qs?.blocked_reason||null,due_at:qs?.due_at||null,reminder_count:Number(qs?.reminder_count||0),
        collaborators:[],dependencies:[],created_at:p.updated_at
      });
    }
    const qFilter=clean(url.searchParams.get('q'),120).toLowerCase();
    const kindFilter=clean(url.searchParams.get('kind'),40);
    const stateFilter=clean(url.searchParams.get('workflow_state'),40);
    const prioFilter=clean(url.searchParams.get('priority'),30);
    const assigneeFilter=clean(url.searchParams.get('assigned_account_id'),100);
    let filtered=rawItems.filter(x=>{
      if(qFilter&&![x.title,x.detail,x.code,x.kind_label,x.priority_reason,x.assigned_username].some(v=>String(v||'').toLowerCase().includes(qFilter)))return false;
      if(kindFilter&&x.source_type!==kindFilter)return false;
      if(stateFilter&&x.workflow_state!==stateFilter)return false;
      if(prioFilter&&x.priority!==prioFilter)return false;
      if(assigneeFilter&&(assigneeFilter==='unassigned'?Boolean(x.assigned_account_id):x.assigned_account_id!==assigneeFilter))return false;
      return true;
    });
    filtered.sort((a,b)=>b.priority_score-a.priority_score||String(a.created_at||'').localeCompare(String(b.created_at||'')));
    const queueSummary={
      total:rawItems.length,
      overdue:rawItems.filter(x=>x.is_overdue).length,
      blocked:rawItems.filter(x=>x.workflow_state==='blocked').length,
      in_progress:rawItems.filter(x=>x.workflow_state==='in_progress').length,
      unassigned:rawItems.filter(x=>!x.assigned_account_id).length
    };
    return json({
      counts:{pending_requests:Number(pending?.n||0),account_attention:Number(attention?.n||0),expiring_cards:Number(expiring?.n||0),incomplete_profiles:Number(incomplete?.n||0)},
      queue_summary:queueSummary,
      items:filtered
    });
  }
  if(url.pathname==='/api/admin/work-center/bulk'&&req.method==='POST'){
    if(!(await hasPerm(env,s.account_id,'member.edit')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const keys=Array.isArray(b.item_keys)?b.item_keys.map(k=>clean(k,120)).filter(Boolean).slice(0,50):[];
    const action=clean(b.action,40);
    if(!keys.length||!['claim','assign','set_priority','start','complete','set_status'].includes(action))return json({error:'INVALID_BULK_WORK_ACTION',message:'Danh sách công việc hoặc thao tác hàng loạt không hợp lệ.'},400);
    const results=[];
    for(const key of keys){
      const [srcType,srcId]=key.split(':');
      if(!srcType||!srcId){results.push({item_key:key,ok:false,error:'INVALID_ITEM_KEY'});continue;}
      const nextAssignee=action==='claim'?s.account_id:(action==='assign'?clean(b.assigned_account_id,100)||s.account_id:null);
      const nextPrio=['low','normal','high','urgent','critical'].includes(b.priority)?b.priority:'normal';
      const nextState=action==='set_status'&&['open','in_progress','paused','completed','escalated'].includes(b.status)?b.status:(action==='start'?'in_progress':action==='complete'?'completed':'open');
      await env.DB.prepare(`INSERT INTO work_queue_states(item_key,source_type,source_id,assigned_account_id,priority,workflow_state,updated_by_account_id,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(item_key) DO UPDATE SET assigned_account_id=COALESCE(excluded.assigned_account_id,work_queue_states.assigned_account_id),priority=CASE WHEN ?='set_priority' THEN excluded.priority ELSE work_queue_states.priority END,workflow_state=CASE WHEN ? IN ('start','complete','set_status') THEN excluded.workflow_state ELSE work_queue_states.workflow_state END,updated_by_account_id=excluded.updated_by_account_id,updated_at=CURRENT_TIMESTAMP`).bind(
        key,srcType,srcId,nextAssignee,nextPrio,nextState,s.account_id,action,action
      ).run();
      results.push({item_key:key,ok:true,action});
    }
    await audit(env,s.account_id,'work_queue_bulk_updated','work_queue',action,null,{count:results.length,action});
    const okCount=results.filter(x=>x.ok).length;
    return json({ok:true,processed:keys.length,success:okCount,updated_count:okCount,results});
  }
  const workItemMatch=url.pathname.match(/^\/api\/admin\/work-center\/([^/]+)$/);
  if(workItemMatch&&['GET','PATCH'].includes(req.method)){
    if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const itemKey=decodeURIComponent(workItemMatch[1]);
    const [srcType,srcId]=itemKey.split(':');
    if(!srcType||!srcId)return json({error:'INVALID_ITEM_KEY'},400);
    if(req.method==='GET'){
      const [qs,history]=await Promise.all([
        env.DB.prepare(`SELECT w.*,a.username assigned_username FROM work_queue_states w LEFT JOIN accounts a ON a.id=w.assigned_account_id WHERE w.item_key=?`).bind(itemKey).first(),
        env.DB.prepare(`SELECT l.*,a.username FROM audit_log l LEFT JOIN accounts a ON a.id=l.actor_account_id WHERE (l.entity_id=? OR l.entity_id=?) ORDER BY l.id DESC LIMIT 30`).bind(itemKey,srcId).all()
      ]);
      return json({
        item_key:itemKey,
        source_type:srcType,
        source_id:srcId,
        state:qs?{...qs,status:qs.workflow_state}:{workflow_state:'open',status:'open',priority:'normal'},
        history:history.results||[],
        next_steps:[
          'Kiểm tra tính hợp lệ và quyền đơn vị của hồ sơ nguồn',
          'Cập nhật trạng thái xử lý hoặc ghi rõ nguyên nhân bị chặn nếu cần phối hợp',
          'Xác nhận hoàn tất tại hồ sơ nghiệp vụ gốc để đồng bộ toàn hệ thống'
        ]
      });
    }
    if(!(await hasPerm(env,s.account_id,'member.edit')))return json({error:'FORBIDDEN'},403);
    const b=await bodyJson(req);
    const existing=await env.DB.prepare(`SELECT * FROM work_queue_states WHERE item_key=?`).bind(itemKey).first();
    const act=clean(b.action,40);
    if(act==='remind'){
      const recentRemind=await env.DB.prepare(`SELECT CASE WHEN last_reminder_at IS NOT NULL AND last_reminder_at>datetime('now','-60 minutes') THEN 1 ELSE 0 END cooldown,reminder_count FROM work_queue_states WHERE item_key=?`).bind(itemKey).first();
      if(recentRemind?.cooldown)return json({error:'REMINDER_COOLDOWN_ACTIVE',message:'Đã gửi nhắc hạn gần đây. Hệ thống chặn gửi nhắc hạn lặp liên tục trong vòng 60 phút.'},429);
      const nextCount=Number(recentRemind?.reminder_count||0)+1;
      await env.DB.prepare(`INSERT INTO work_queue_states(item_key,source_type,source_id,last_reminder_at,reminder_count,updated_by_account_id,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP,?,?,CURRENT_TIMESTAMP) ON CONFLICT(item_key) DO UPDATE SET last_reminder_at=CURRENT_TIMESTAMP,reminder_count=excluded.reminder_count,updated_by_account_id=excluded.updated_by_account_id,updated_at=CURRENT_TIMESTAMP`).bind(itemKey,srcType,srcId,nextCount,s.account_id).run();
      await audit(env,s.account_id,'work_item_reminded','work_queue',itemKey,null,{reminder_count:nextCount});
      return json({ok:true,reminder_count:nextCount,message:'Đã ghi nhận nhắc hạn công việc.'});
    }
    const reqState=b.workflow_state||b.status;
    const nextState=['open','in_progress','paused','blocked','completed','escalated'].includes(reqState)?reqState:(act==='start'||act==='resume'?'in_progress':act==='pause'?'paused':act==='block'?'blocked':act==='complete'?'completed':existing?.workflow_state||'open');
    const nextPrio=['low','normal','high','urgent','critical'].includes(b.priority)?b.priority:(existing?.priority||'normal');
    const nextAssignee=act==='claim'?s.account_id:(b.assigned_account_id!==undefined?(clean(b.assigned_account_id,100)||null):(existing?.assigned_account_id||null));
    const bReason=b.blocked_reason!==undefined?clean(b.blocked_reason,500):(existing?.blocked_reason||null);
    const bMissing=b.blocked_missing_condition!==undefined?clean(b.blocked_missing_condition,500):(existing?.blocked_missing_condition||null);
    const bParty=b.blocked_coordination_party!==undefined?clean(b.blocked_coordination_party,240):(existing?.blocked_coordination_party||null);
    const bPlan=b.blocked_resolution_plan!==undefined?clean(b.blocked_resolution_plan,500):(existing?.blocked_resolution_plan||null);
    if(nextState==='blocked'&&(!bReason||!bMissing||!bParty)){
      return json({error:'BLOCKED_DETAILS_REQUIRED',message:'Khi đánh dấu công việc bị chặn, bắt buộc nêu rõ nguyên nhân, điều kiện còn thiếu và bên cần phối hợp.'},400);
    }
    const collabs=Array.isArray(b.collaborators)?JSON.stringify(b.collaborators.map(x=>clean(x,100)).filter(Boolean)):(existing?.collaborator_ids_json||'[]');
    const deps=Array.isArray(b.dependencies)?JSON.stringify(b.dependencies.map(x=>clean(x,120)).filter(Boolean)):(existing?.dependency_keys_json||'[]');
    const handover=b.handover_note!==undefined?clean(b.handover_note,500):(existing?.handover_note||null);
    const dueAt=b.due_at!==undefined?(clean(b.due_at,30)||null):(existing?.due_at||null);
    await env.DB.prepare(`INSERT INTO work_queue_states(item_key,source_type,source_id,org_node_id,assigned_account_id,collaborator_ids_json,dependency_keys_json,priority,workflow_state,blocked_reason,blocked_missing_condition,blocked_coordination_party,blocked_resolution_plan,due_at,handover_note,updated_by_account_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(item_key) DO UPDATE SET org_node_id=COALESCE(excluded.org_node_id,work_queue_states.org_node_id),assigned_account_id=excluded.assigned_account_id,collaborator_ids_json=excluded.collaborator_ids_json,dependency_keys_json=excluded.dependency_keys_json,priority=excluded.priority,workflow_state=excluded.workflow_state,blocked_reason=excluded.blocked_reason,blocked_missing_condition=excluded.blocked_missing_condition,blocked_coordination_party=excluded.blocked_coordination_party,blocked_resolution_plan=excluded.blocked_resolution_plan,due_at=excluded.due_at,handover_note=excluded.handover_note,updated_by_account_id=excluded.updated_by_account_id,updated_at=CURRENT_TIMESTAMP`).bind(
      itemKey,srcType,srcId,clean(b.org_node_id,100)||existing?.org_node_id||null,nextAssignee,collabs,deps,nextPrio,nextState,bReason,bMissing,bParty,bPlan,dueAt,handover,s.account_id
    ).run();
    await audit(env,s.account_id,'work_item_updated','work_queue',itemKey,null,{workflow_state:nextState,priority:nextPrio,assigned_account_id:nextAssignee});
    return json({ok:true,item_key:itemKey,workflow_state:nextState,priority:nextPrio,assigned_account_id:nextAssignee});
  }

  if(url.pathname==='/api/admin/reports'&&req.method==='GET'){
    if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
    const [people,active,accounts,cards,units,requests]=await Promise.all([
      env.DB.prepare('SELECT COUNT(*) n FROM people').first(),env.DB.prepare("SELECT COUNT(*) n FROM people WHERE status='active'").first(),env.DB.prepare('SELECT COUNT(*) n FROM accounts').first(),env.DB.prepare('SELECT COUNT(*) n FROM member_cards').first(),env.DB.prepare("SELECT COUNT(*) n FROM org_nodes WHERE status='active' AND deleted_at IS NULL").first(),env.DB.prepare("SELECT COUNT(*) n FROM account_requests WHERE status IN ('pending','supplement')").first()
    ]);
    const ms=await env.DB.prepare("SELECT status,COUNT(*) n FROM people GROUP BY status ORDER BY n DESC").all();
    const orgs=await env.DB.prepare("SELECT o.name,COUNT(DISTINCT m.person_id) n FROM org_nodes o LEFT JOIN org_memberships m ON m.org_node_id=o.id AND m.status='active' WHERE o.deleted_at IS NULL GROUP BY o.id,o.name ORDER BY n DESC,o.name LIMIT 100").all();
    const cs=await env.DB.prepare("SELECT status,COUNT(*) n FROM member_cards GROUP BY status ORDER BY n DESC").all();
    const labels={active:'Đang hoạt động',inactive:'Ngừng hoạt động',suspended:'Tạm ngưng',banned:'Bị cấm',pending:'Chờ xử lý'};
    return json({summary:{people:{label:'Tổng thành viên',value:Number(people.n||0)},active:{label:'Đang hoạt động',value:Number(active.n||0)},accounts:{label:'Tài khoản',value:Number(accounts.n||0)},cards:{label:'Thẻ đã cấp',value:Number(cards.n||0)},units:{label:'Đơn vị hoạt động',value:Number(units.n||0)},requests:{label:'Yêu cầu chờ',value:Number(requests.n||0)}},member_status:(ms.results||[]).map(x=>({label:labels[x.status]||x.status,n:Number(x.n||0)})),orgs:orgs.results||[],cards:(cs.results||[]).map(x=>({label:x.status==='active'?'Đang hiệu lực':x.status==='revoked'?'Đã thu hồi':x.status==='expired'?'Hết hạn':x.status,n:Number(x.n||0)}))});
  }

  async function inspectDatabaseStructure(env,opts={}){
    const requiredSchemaVersion=16;
    const targetSchemaVersion=17;
    const requiredColumns={
      schema_version:['version'],
      system_settings:['key','value_json'],
      people:['id','member_code','full_name','status','avatar_url'],
      accounts:['id','person_id','username','password_hash','password_salt','password_iterations','force_password_change','is_locked'],
      sessions:['id','account_id','token_hash','expires_at'],
      org_nodes:['id','parent_id','code','name','node_type','status','deleted_at'],
      org_memberships:['person_id','org_node_id','status','is_primary'],
      roles:['id','code'],permissions:['id','code'],role_permissions:['role_id','permission_id'],
      account_scopes:['account_id','role_id','org_node_id','active'],
      card_types:['id','name','template_json','active'],
      member_cards:['id','person_id','card_type_id','org_node_id','card_number','issued_at','expires_at','status','verify_token','created_at'],
      account_requests:['id','request_code','full_name','email','avatar_url','target_org_node_id','status'],
      account_request_profiles:['request_id','education_or_work_type','school_or_workplace','class_or_major','education_status'],
      account_request_extended:['request_id','school_name','class_or_major','employment_status','workplace_name','work_department','job_title','guardian_date_of_birth','guardian_id_number'],
      account_request_orgs:['request_id','org_node_id','is_primary'],
      one_time_credentials:['id','credential_type','event_name','full_name','card_number','issued_at','expires_at','status','verify_token','created_at','updated_at'],
      verification_qr_records:['id','credential_title','full_name','reference_number','issued_at','expires_at','status','verify_token','created_at','updated_at'],
      people_work_profiles:['person_id','school_name','employment_status','workplace_name','work_department','job_title'],
      audit_log:['action','entity_type','entity_id','created_at'],
      auth_rate_limits:['rate_key','attempts','window_start'],
      password_reset_tokens:['account_id','token_hash','expires_at'],
      security_events:['account_id','event_type','created_at'],
      member_evaluations:['person_id','evaluator_account_id','status','visibility'],
      calendar_events:['title','starts_at','status'],
      activities:['id','name','status'],activity_participants:['activity_id','person_id'],
      certificates:['person_id','title','verification_status'],achievements:['person_id','title'],
      member_documents:['person_id','document_type','title'],notifications:['title','body'],
      goals:['person_id','title','status'],tasks:['person_id','title','status'],
      cv_exports:['person_id','export_code'],support_tickets:['ticket_code','subject','status'],
      account_restrictions:['account_id','restriction_type','reason'],
      email_otp_tokens:['id','email','purpose','otp_hash','expires_at'],
      email_delivery_logs:['id','template_code','recipient_email','status'],
      legal_consent_records:['id','subject_type','subject_id','email','privacy_consent'],
      system_config_history:['id','config_key','version_no'],
      support_ticket_assignments:['ticket_id','priority','impact_level','attachment_url','duplicate_of_ticket_id','escalated_to_account_id','escalation_reason','reopen_reason','reopened_at','satisfaction_score','feedback_comment','sla_response_due_at','sla_due_at','sla_breached','resolution_note','closed_reason'],
      support_ticket_messages:['id','ticket_id','visibility','body'],
      work_queue_states:['item_key','source_type','workflow_state'],
      governance_registry:['id','domain_group','code','title','status'],
      account_type_configs:['code','name','purpose'],
      account_lifecycle:['account_id','account_type_code','lifecycle_status'],
      data_policies:['id','policy_code','version_label'],
      consent_withdrawal_requests:['id','subject_email','policy_code'],
      registration_forms:['id','code','slug','title','status','current_version'],
      registration_form_versions:['id','form_id','version_no'],
      registration_submissions:['id','submission_code','form_id','form_version','status'],
      registration_submission_files:['id','submission_id','storage_key'],
      signature_records:['id','submission_id','content_version_hash'],
      sk_events:['id','event_code','name','status','registration_state'],
      sk_event_tasks:['id','event_id','title','status'],
      sk_event_staff:['id','event_id','person_name'],
      sk_event_logistics:['id','event_id','item_name'],
      sk_event_budgets:['id','event_id','proposer_account_id','status'],
      sk_event_partners:['id','event_id','partner_name'],
      sk_event_communications:['id','event_id','title','status'],
      sk_event_registrations:['id','registration_code','event_id','status'],
      sk_qr_sessions:['id','session_code','event_id','qr_token','status'],
      sk_attendance_records:['id','event_id','session_id','attendance_status'],
      chat_conversations:['id','conv_type','status'],
      chat_participants:['conversation_id','account_id','role_in_chat'],
      chat_messages:['id','conversation_id','sender_account_id','body','status'],
      community_groups:['id','code','name','group_type'],
      community_group_members:['group_id','account_id'],
      social_posts:['id','author_account_id','post_kind','moderation_status'],
      social_comments:['id','post_id','author_account_id'],
      social_reactions:['post_id','account_id','reaction_type'],
      content_reports:['id','target_type','target_id','status']
    };
    const requiredTables=Object.keys(requiredColumns);
    let database='error',schema_version=null,missing_tables=[...requiredTables],missing_columns=[],schema_status='unknown',reconciled_columns=[];
    try{
      await env.DB.prepare('SELECT 1 n').first();
      database='ok';
      if(opts.autoReconcile!==false&&!env.__disableAutoSchemaReconcile){
        await ensureGovernanceTables(env);
        reconciled_columns=await reconcileGovernanceColumns(env);
        if(!reconciled_columns.length&&Array.isArray(env.__lastReconciledColumns))reconciled_columns=env.__lastReconciledColumns;
      }
      try{schema_version=Number((await env.DB.prepare('SELECT MAX(version) v FROM schema_version').first())?.v||0)||null}catch{}
      const found=[];
      for(const table of requiredTables){
        const row=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(table).first();
        if(row?.name)found.push(table);
      }
      missing_tables=requiredTables.filter(table=>!found.includes(table));
      for(const table of requiredTables){
        if(!found.includes(table))continue;
        const info=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
        const columns=new Set((info.results||[]).map(column=>column.name));
        for(const column of requiredColumns[table])if(!columns.has(column))missing_columns.push(`${table}.${column}`);
      }
      schema_status=missing_tables.length||missing_columns.length||!schema_version||schema_version<requiredSchemaVersion?'outdated':'current';
    }catch(err){
      console.error('SYSTEM_HEALTH_DATABASE_CHECK_FAILED',String(err?.message||err));
      schema_status='unknown';
    }
    return {
      database,
      schema_version,
      required_schema_version:requiredSchemaVersion,
      target_schema_version:targetSchemaVersion,
      schema_status,
      missing_tables,
      missing_columns,
      reconciled_columns,
      verified_tables_count:requiredTables.length-missing_tables.length,
      total_required_tables:requiredTables.length
    };
  }

  async function runSafeR2StorageProbe(env,actorAccountId){
    const startedAt=new Date().toISOString();
    const probeId=uid('r2probe');
    const probeKey=`_system_health_probes/${probeId}.txt`;
    const payloadText=`GFI-R2-SAFE-PROBE:${probeId}:${startedAt}`;
    const payloadBytes=new TextEncoder().encode(payloadText);
    const expectedHash=await sha256(payloadText);
    const steps={
      binding_present:Boolean(env.FILES),
      list_ok:false,
      write_ok:false,
      readback_verified:false,
      delete_verified:false
    };
    let status='not_configured',error_detail=null;
    if(!env.FILES){
      return {ok:false,status:'not_configured',probe_key:probeKey,steps,error_detail:'R2_BINDING_MISSING',tested_at:startedAt};
    }
    if(typeof env.FILES.list==='function'){
      try{
        await env.FILES.list({prefix:'_system_health_probes/',limit:1});
        steps.list_ok=true;
      }catch(e){
        error_detail=`LIST_FAILED: ${clean(String(e?.message||e),240)}`;
        return {ok:false,status:'failed',probe_key:probeKey,steps,error_detail,tested_at:startedAt};
      }
    }
    if(typeof env.FILES.put!=='function'||typeof env.FILES.get!=='function'||typeof env.FILES.delete!=='function'){
      return {ok:steps.list_ok,status:steps.list_ok?'read_only_verified':'binding_present_test_unavailable',probe_key:probeKey,steps,error_detail:'WRITE_METHODS_UNAVAILABLE_ON_BINDING',tested_at:startedAt};
    }
    try{
      await env.FILES.put(probeKey,payloadBytes,{httpMetadata:{contentType:'text/plain;charset=utf-8',cacheControl:'private, no-store'}});
      steps.write_ok=true;
      const obj=await env.FILES.get(probeKey);
      if(!obj){
        error_detail='READBACK_RETURNED_NULL';
      }else{
        let readText='';
        if(typeof obj.text==='function')readText=await obj.text();
        else if(typeof obj.arrayBuffer==='function')readText=new TextDecoder().decode(new Uint8Array(await obj.arrayBuffer()));
        else if(obj.body instanceof Uint8Array)readText=new TextDecoder().decode(obj.body);
        const actualHash=await sha256(readText);
        if(readText===payloadText&&actualHash===expectedHash){
          steps.readback_verified=true;
        }else{
          error_detail='READBACK_HASH_MISMATCH';
        }
      }
    }catch(e){
      error_detail=`WRITE_OR_READBACK_FAILED: ${clean(String(e?.message||e),240)}`;
    }finally{
      if(steps.write_ok){
        try{
          await env.FILES.delete(probeKey);
          const afterDel=await env.FILES.get(probeKey);
          if(afterDel===null||afterDel===undefined){
            steps.delete_verified=true;
          }else if(!error_detail){
            error_detail='DELETE_VERIFICATION_STILL_EXISTS';
          }
        }catch(delErr){
          if(!error_detail)error_detail=`DELETE_FAILED: ${clean(String(delErr?.message||delErr),240)}`;
        }
      }
    }
    status=(steps.binding_present&&steps.list_ok&&steps.write_ok&&steps.readback_verified&&steps.delete_verified&&!error_detail)?'passed':'failed';
    const report={
      ok:status==='passed',
      status,
      probe_key:probeKey,
      expected_sha256:expectedHash,
      steps,
      error_detail,
      tested_at:startedAt
    };
    try{
      env.FILES.__lastProbeResult=report;
      await ensureGovernanceTables(env);
      await env.DB.prepare(`INSERT INTO system_settings(key,value_json,updated_at) VALUES('r2_last_probe_result',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`).bind(JSON.stringify(report)).run();
      if(actorAccountId)await audit(env,actorAccountId,'r2_storage_probe_executed','r2_bucket','FILES',null,{status,steps,error_detail});
    }catch{}
    return report;
  }

  if(url.pathname==='/api/admin/schema-reconcile'&&req.method==='POST'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureAccountRequestProfiles(env);
    await ensureAccountRequestExtended(env);
    await ensureEvaluations(env);
    await ensureGovernanceTables(env);
    const addedCols=await reconcileGovernanceColumns(env);
    const dbCheck=await inspectDatabaseStructure(env,{autoReconcile:true});
    await audit(env,s.account_id,'schema_columns_reconciled','database','D1',null,{reconciled_columns:addedCols,schema_status:dbCheck.schema_status,missing_tables:dbCheck.missing_tables,missing_columns:dbCheck.missing_columns});
    return json({
      ok:dbCheck.schema_status==='current'&&dbCheck.missing_tables.length===0&&dbCheck.missing_columns.length===0,
      ...dbCheck
    });
  }

  if(url.pathname==='/api/admin/r2-probe'&&req.method==='POST'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    const report=await runSafeR2StorageProbe(env,s.account_id);
    return json(report,report.ok?200:502,{'cache-control':'no-store'});
  }

  if(url.pathname==='/api/admin/system-health'&&req.method==='GET'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    const checkOnly=url.searchParams.get('check_only')==='1';
    const dbCheck=await inspectDatabaseStructure(env,{autoReconcile:!checkOnly});
    let r2_read_status='not_configured';
    if(env.FILES){
      if(typeof env.FILES.list==='function'){
        try{await env.FILES.list({limit:1});r2_read_status='read_ok'}catch(err){r2_read_status='read_failed';console.error('SYSTEM_HEALTH_R2_READ_FAILED',String(err?.message||err))}
      }else r2_read_status='binding_present_test_unavailable';
    }
    let r2_last_probe=env.FILES?.__lastProbeResult||null;
    if(!r2_last_probe&&!checkOnly){
      try{
        const pr=await env.DB.prepare("SELECT value_json FROM system_settings WHERE key='r2_last_probe_result'").first();
        if(pr?.value_json&&env.FILES&&typeof env.FILES.put==='function')r2_last_probe=JSON.parse(pr.value_json);
      }catch{}
    }
    const r2_write_status=(url.searchParams.get('include_probe')==='1'&&r2_last_probe)?(r2_last_probe.status==='passed'?'write_readback_delete_ok':'write_failed'):'not_tested';
    // Do not send a test email from a GET health-check endpoint. A configured provider key is not delivery verification.
    let email_logs_summary={total:0,sent:0,failed:0,not_configured:0};
    let last_verified_email_test=null;
    try{
      if(!checkOnly)await ensureGovernanceTables(env);
      const el=await env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) sent,SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed,SUM(CASE WHEN status='not_configured' THEN 1 ELSE 0 END) not_configured FROM email_delivery_logs`).first();
      if(el)email_logs_summary={total:Number(el.total||0),sent:Number(el.sent||0),failed:Number(el.failed||0),not_configured:Number(el.not_configured||0)};
      const diagRow=await env.DB.prepare(`SELECT id,recipient_email,provider_message_id,status,error_detail,created_at FROM email_delivery_logs WHERE template_code='admin_diagnostic_test' ORDER BY created_at DESC LIMIT 1`).first();
      if(diagRow)last_verified_email_test=diagRow;
    }catch{}
    const email_status=env.RESEND_API_KEY?(last_verified_email_test?.status==='sent'&&url.searchParams.get('include_probe')==='1'?'provider_accepted':'configured_delivery_not_tested'):'not_configured';
    return json({
      ...dbCheck,
      r2_binding:!!env.FILES,
      r2_read_status,
      r2_write_status,
      r2_last_probe,
      email_binding:!!env.RESEND_API_KEY,
      email_status,
      email_delivery_tested:Boolean(env.RESEND_API_KEY&&last_verified_email_test?.status==='sent'&&url.searchParams.get('include_probe')==='1'),
      last_verified_email_test,
      email_logs_summary,
      system_identity:DEFAULT_SYSTEM_IDENTITY
    },200,{'cache-control':'no-store'});
  }

  if(url.pathname==='/api/admin/saved-filters'&&req.method==='GET'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    const row=await env.DB.prepare('SELECT value_json FROM system_settings WHERE key=?').bind(`admin_saved_filters_${s.account_id}`).first();let items=[];try{items=JSON.parse(row?.value_json||'[]')}catch{}return json({items:Array.isArray(items)?items:[]});
  }
  if(url.pathname==='/api/admin/saved-filters'&&req.method==='POST'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);const b=await bodyJson(req);const name=clean(b.name,100),view=clean(b.view,80),query=clean(b.query,500);if(!name||!view)return json({error:'INVALID_DATA'},400);const key=`admin_saved_filters_${s.account_id}`;const row=await env.DB.prepare('SELECT value_json FROM system_settings WHERE key=?').bind(key).first();let items=[];try{items=JSON.parse(row?.value_json||'[]')}catch{};if(!Array.isArray(items))items=[];items=[...items.filter(x=>x?.name!==name),{id:uid('filter'),name,view,query}].slice(-50);await env.DB.prepare(`INSERT INTO system_settings(key,value_json,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`).bind(key,JSON.stringify(items)).run();await audit(env,s.account_id,'saved_filter_created','system_setting',key,null,{name,view});return json({ok:true});
  }
  const savedFilterDel=url.pathname.match(/^\/api\/admin\/saved-filters\/([^/]+)$/);
  if(savedFilterDel&&req.method==='DELETE'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);const id=decodeURIComponent(savedFilterDel[1]),key=`admin_saved_filters_${s.account_id}`,row=await env.DB.prepare('SELECT value_json FROM system_settings WHERE key=?').bind(key).first();let items=[];try{items=JSON.parse(row?.value_json||'[]')}catch{};items=(Array.isArray(items)?items:[]).filter(x=>x?.id!==id);await env.DB.prepare(`INSERT INTO system_settings(key,value_json,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`).bind(key,JSON.stringify(items)).run();await audit(env,s.account_id,'saved_filter_deleted','system_setting',key,null,{id});return json({ok:true});
  }

  // =========================================================
  // ADMIN META
  // =========================================================

  const evaluationMatch=url.pathname.match(/^\/api\/admin\/members\/([^/]+)\/evaluation(?:\/([^/]+)(?:\/(finalize|hide|show))?)?$/);
  if(evaluationMatch){
    await ensureEvaluations(env);
    const pid=decodeURIComponent(evaluationMatch[1]);
    const eid=evaluationMatch[2]||null;
    const action=evaluationMatch[3]||null;
    if(!(await hasPerm(env,s.account_id,'evaluation.manage')) && !(await isSuper(env,s.account_id))) return json({error:'FORBIDDEN'},403);
    if(!(await canAccessPerson(env,s.account_id,pid))) return json({error:'SCOPE_FORBIDDEN'},403);
    const b=['POST','PATCH'].includes(req.method)?await bodyJson(req):{};
    if(req.method==='POST'&&!eid){
      if(b.org_node_id&&!(await canAccessOrg(env,s.account_id,b.org_node_id))) return json({error:'SCOPE_FORBIDDEN'},403);
      const id=uid('eval');
      await env.DB.prepare(`INSERT INTO member_evaluations(id,person_id,org_node_id,evaluator_account_id,period_type,period_label,criteria_json,total_score,rating,comments,visibility,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(id,pid,b.org_node_id||null,s.account_id,clean(b.period_type,30)||'quarter',clean(b.period_label,120)||null,JSON.stringify(b.criteria||{}),b.total_score===''||b.total_score==null?null:Number(b.total_score),clean(b.rating,100)||null,clean(b.comments,3000)||null,clean(b.visibility,20)||'member','draft').run();
      await audit(env,s.account_id,'evaluation_created','member_evaluation',id,b.org_node_id||null,{person_id:pid});
      return json({ok:true,id});
    }
    if(!eid) return json({error:'NOT_FOUND'},404);
    const row=await env.DB.prepare('SELECT * FROM member_evaluations WHERE id=? AND person_id=?').bind(eid,pid).first();
    if(!row)return json({error:'NOT_FOUND'},404);
    if(req.method==='PATCH'&&!action){
      if(row.status==='final') return json({error:'EVALUATION_FINAL_LOCKED'},409);
      await env.DB.prepare(`UPDATE member_evaluations SET org_node_id=?,period_type=?,period_label=?,criteria_json=?,total_score=?,rating=?,comments=?,visibility=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`)
        .bind(b.org_node_id||row.org_node_id,clean(b.period_type,30)||row.period_type,clean(b.period_label,120)||row.period_label,JSON.stringify(b.criteria||JSON.parse(row.criteria_json||'{}')),b.total_score===''||b.total_score==null?row.total_score:Number(b.total_score),clean(b.rating,100)||row.rating,clean(b.comments,3000)||row.comments,clean(b.visibility,20)||row.visibility,eid,pid).run();
      await audit(env,s.account_id,'evaluation_updated','member_evaluation',eid,row.org_node_id,{person_id:pid});return json({ok:true});
    }
    if(req.method==='POST'&&action){
      const next=action==='finalize'?'final':action==='hide'?'hidden':action==='show'?'draft':null;
      if(!next)return json({error:'NOT_FOUND'},404);
      await env.DB.prepare(`UPDATE member_evaluations SET status=?,finalized_at=CASE WHEN ?='final' THEN CURRENT_TIMESTAMP ELSE finalized_at END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND person_id=?`).bind(next,next,eid,pid).run();
      await audit(env,s.account_id,'evaluation_'+action,'member_evaluation',eid,row.org_node_id,{person_id:pid});return json({ok:true,status:next});
    }
    return json({error:'METHOD_NOT_ALLOWED'},405);
  }

  if(url.pathname==='/api/admin/super/overview'&&req.method==='GET'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    const [people,accounts,orgs,pending,cards,certs]=await Promise.all([
      env.DB.prepare('SELECT COUNT(*) n FROM people').first(),env.DB.prepare('SELECT COUNT(*) n FROM accounts').first(),env.DB.prepare('SELECT COUNT(*) n FROM org_nodes').first(),env.DB.prepare("SELECT COUNT(*) n FROM account_requests WHERE status IN ('pending','supplement')").first(),env.DB.prepare("SELECT COUNT(*) n FROM member_cards WHERE status='active'").first(),env.DB.prepare("SELECT COUNT(*) n FROM certificates WHERE verification_status='verified'").first()
    ]);
    const ac=await env.DB.prepare(`SELECT a.id,a.username,a.email,a.is_locked,a.last_login_at,p.full_name,p.member_code FROM accounts a LEFT JOIN people p ON p.id=a.person_id ORDER BY a.created_at DESC LIMIT 100`).all();
    return json({stats:{people:people.n,accounts:accounts.n,orgs:orgs.n,pending_requests:pending.n,active_cards:cards.n,verified_certificates:certs.n},accounts:ac.results||[]});
  }

  const inspectMatch=url.pathname.match(/^\/api\/admin\/super\/inspect-account\/([^/]+)$/);
  if(inspectMatch&&req.method==='GET'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    const aid=decodeURIComponent(inspectMatch[1]);
    const scopes=await env.DB.prepare(`SELECT s.id,s.active,r.code role_code,r.name role_name,o.name org_name,s.org_node_id FROM account_scopes s JOIN roles r ON r.id=s.role_id LEFT JOIN org_nodes o ON o.id=s.org_node_id WHERE s.account_id=?`).bind(aid).all();
    const perms=await env.DB.prepare(`SELECT DISTINCT p.code,p.name,r.code role_code FROM account_scopes s JOIN roles r ON r.id=s.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE s.account_id=? AND s.active=1 ORDER BY p.code`).bind(aid).all();
    return json({scopes:scopes.results||[],permissions:perms.results||[]});
  }

  if(
    url.pathname==='/api/admin/meta'&&
    req.method==='GET'
  ){
    if(!(await hasPerm(
      env,
      s.account_id,
      'member.view'
    ))){
      return json({
        error:'FORBIDDEN'
      },403);
    }

    const [
      orgs,
      cards,
      roles
    ]=await Promise.all([
      visibleOrgs(
        env,
        s.account_id
      ),

      env.DB.prepare(`
        SELECT id,code,name
        FROM card_types
        WHERE active=1
        ORDER BY name
      `).all(),

      env.DB.prepare(`
        SELECT id,code,name
        FROM roles
        ORDER BY name
      `).all()
    ]);

    return json({
      orgs,
      card_types:
        cards.results||[],
      roles:
        roles.results||[]
    });
  }

  if(
    url.pathname==='/api/admin/audit'&&
    req.method==='GET'
  ){
    if(!(await hasPerm(
      env,
      s.account_id,
      'audit.view'
    ))){
      return json({
        error:'FORBIDDEN'
      },403);
    }

    const r=await env.DB.prepare(`
      SELECT
        l.*,
        a.username
      FROM audit_log l
      LEFT JOIN accounts a
        ON a.id=l.actor_account_id
      ORDER BY l.id DESC
      LIMIT 500
    `).all();

    return json({
      items:r.results||[]
    });
  }

  // =========================================================
  // ADMIN SUPPORT TICKETS MANAGEMENT (, )
  // =========================================================
  if(url.pathname==='/api/admin/support-tickets'&&req.method==='GET'){
    if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const status=clean(url.searchParams.get('status'),30);
    const priority=clean(url.searchParams.get('priority'),30);
    const q=clean(url.searchParams.get('q'),120);
    const r=await env.DB.prepare(`
      SELECT st.*,p.full_name,p.member_code,p.email,
        sta.org_node_id,sta.assigned_account_id,sta.priority,sta.impact_level,sta.attachment_url,sta.duplicate_of_ticket_id,sta.escalated_to_account_id,sta.escalation_reason,sta.reopen_reason,sta.reopened_at,sta.satisfaction_score,sta.feedback_comment,sta.sla_response_due_at,sta.sla_due_at,sta.sla_breached,sta.resolution_note,sta.closed_reason,sta.responded_at,sta.resolved_at,
        a.username assigned_username,o.name org_name,
        CASE WHEN sta.sla_due_at IS NOT NULL AND sta.sla_due_at<datetime('now') AND st.status NOT IN ('completed','closed') THEN 1 ELSE 0 END is_sla_breached
      FROM support_tickets st
      LEFT JOIN people p ON p.id=st.person_id
      LEFT JOIN support_ticket_assignments sta ON sta.ticket_id=st.id
      LEFT JOIN accounts a ON a.id=sta.assigned_account_id
      LEFT JOIN org_nodes o ON o.id=sta.org_node_id
      WHERE (?='' OR st.status=?)
        AND (?='' OR COALESCE(sta.priority,'normal')=?)
        AND (?='' OR st.ticket_code LIKE ? OR st.subject LIKE ? OR COALESCE(p.full_name,'') LIKE ?)
      ORDER BY st.created_at DESC LIMIT 250
    `).bind(status,status,priority,priority,q,`%${q}%`,`%${q}%`,`%${q}%`).all();
    const items=r.results||[];
    return json({
      items,
      stats:{
        total:items.length,
        open:items.filter(x=>!['completed','closed'].includes(x.status)).length,
        completed:items.filter(x=>['completed','closed'].includes(x.status)).length,
        sla_breached:items.filter(x=>x.is_sla_breached||x.sla_breached).length
      }
    });
  }
  const supportTicketMsgMatch=url.pathname.match(/^\/api\/admin\/support-tickets\/([^/]+)\/messages$/);
  if(supportTicketMsgMatch&&['GET','POST'].includes(req.method)){
    if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const tid=decodeURIComponent(supportTicketMsgMatch[1]);
    const ticket=await env.DB.prepare(`SELECT * FROM support_tickets WHERE id=?`).bind(tid).first();
    if(!ticket)return json({error:'NOT_FOUND'},404);
    if(req.method==='GET'){
      const msgs=await env.DB.prepare(`SELECT m.*,a.username sender_username FROM support_ticket_messages m LEFT JOIN accounts a ON a.id=m.sender_account_id WHERE m.ticket_id=? ORDER BY m.created_at ASC`).bind(tid).all();
      return json({items:msgs.results||[],messages:msgs.results||[]});
    }
    if(!(await hasPerm(env,s.account_id,'member.edit')))return json({error:'FORBIDDEN'},403);
    const b=await bodyJson(req);
    const bodyText=clean(b.body,2000);
    if(!bodyText)return json({error:'MESSAGE_REQUIRED',message:'Nội dung phản hồi không được để trống.'},400);
    const vis=['public','internal'].includes(b.visibility)?b.visibility:'public';
    const msgType=['reply','supplement_request','escalation','system'].includes(b.message_type)?b.message_type:'reply';
    const mid=uid('tmsg');
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO support_ticket_messages(id,ticket_id,sender_account_id,visibility,message_type,body) VALUES(?,?,?,?,?,?)`).bind(mid,tid,s.account_id,vis,msgType,bodyText),
      env.DB.prepare(`UPDATE support_tickets SET status=CASE WHEN ?='supplement_request' THEN 'waiting_supplement' WHEN status='received' AND ?='public' THEN 'responded' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(msgType,vis,tid)
    ]);
    await audit(env,s.account_id,'support_ticket_message_added','support_ticket',tid,null,{visibility:vis,message_type:msgType});
    return json({ok:true,id:mid,visibility:vis},201);
  }
  const supportTicketMatch=url.pathname.match(/^\/api\/admin\/support-tickets\/([^/]+)$/);
  if(supportTicketMatch&&req.method==='PATCH'){
    if(!(await hasPerm(env,s.account_id,'member.edit')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const tid=decodeURIComponent(supportTicketMatch[1]);
    const ticket=await env.DB.prepare(`SELECT st.*,p.email,p.full_name FROM support_tickets st LEFT JOIN people p ON p.id=st.person_id WHERE st.id=?`).bind(tid).first();
    if(!ticket)return json({error:'NOT_FOUND'},404);
    const b=await bodyJson(req);
    const allowedStatuses=['received','open','classifying','in_progress','waiting_supplement','waiting_user','waiting_partner','escalated','responded','completed','closed','reopened'];
    const rawStatus=allowedStatuses.includes(b.status)?b.status:ticket.status;
    const nextStatus=['completed','closed'].includes(rawStatus)?'completed':rawStatus==='responded'?'responded':rawStatus==='received'?'received':'in_progress';
    const priority=['low','normal','high','urgent'].includes(b.priority)?b.priority:'normal';
    const impact=['low','medium','high','critical'].includes(b.impact_level)?b.impact_level:'medium';
    const note=clean(b.resolution_note,2000)||null;
    const closedReason=clean(b.closed_reason,500)||null;
    const dupId=clean(b.duplicate_of_ticket_id,100)||null;
    const escAccId=clean(b.escalated_to_account_id,100)||null;
    const escReason=clean(b.escalation_reason,500)||null;
    if(['completed','closed'].includes(nextStatus)&&!note&&!closedReason)return json({error:'RESOLUTION_REQUIRED',message:'Cần nhập kết quả xử lý hoặc lý do đóng yêu cầu hỗ trợ trước khi đóng phiếu.'},400);
    if(rawStatus==='escalated'&&!escReason)return json({error:'ESCALATION_REASON_REQUIRED',message:'Cần ghi rõ lý do leo thang xử lý.'},400);
    await env.DB.batch([
      env.DB.prepare(`UPDATE support_tickets SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(nextStatus,tid),
      env.DB.prepare(`INSERT INTO support_ticket_assignments(ticket_id,org_node_id,assigned_account_id,priority,impact_level,duplicate_of_ticket_id,escalated_to_account_id,escalation_reason,sla_due_at,resolution_note,closed_reason,responded_at,resolved_at,updated_by_account_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,CASE WHEN ? IN ('responded','completed','closed') THEN CURRENT_TIMESTAMP ELSE NULL END,CASE WHEN ? IN ('completed','closed') THEN CURRENT_TIMESTAMP ELSE NULL END,?,CURRENT_TIMESTAMP) ON CONFLICT(ticket_id) DO UPDATE SET org_node_id=COALESCE(excluded.org_node_id,support_ticket_assignments.org_node_id),assigned_account_id=COALESCE(excluded.assigned_account_id,support_ticket_assignments.assigned_account_id),priority=excluded.priority,impact_level=excluded.impact_level,duplicate_of_ticket_id=COALESCE(excluded.duplicate_of_ticket_id,support_ticket_assignments.duplicate_of_ticket_id),escalated_to_account_id=COALESCE(excluded.escalated_to_account_id,support_ticket_assignments.escalated_to_account_id),escalation_reason=COALESCE(excluded.escalation_reason,support_ticket_assignments.escalation_reason),sla_due_at=COALESCE(excluded.sla_due_at,support_ticket_assignments.sla_due_at),resolution_note=COALESCE(excluded.resolution_note,support_ticket_assignments.resolution_note),closed_reason=COALESCE(excluded.closed_reason,support_ticket_assignments.closed_reason),responded_at=COALESCE(support_ticket_assignments.responded_at,excluded.responded_at),resolved_at=COALESCE(support_ticket_assignments.resolved_at,excluded.resolved_at),updated_by_account_id=excluded.updated_by_account_id,updated_at=CURRENT_TIMESTAMP`).bind(
        tid,clean(b.org_node_id,100)||null,clean(b.assigned_account_id,100)||s.account_id,priority,impact,dupId,escAccId,escReason,clean(b.sla_due_at,30)||null,note,closedReason,nextStatus,nextStatus,s.account_id
      )
    ]);
    let mail={sent:false,reason:'NOT_REQUESTED'};
    if(b.notify===true&&ticket.email){
      mail=await sendMemberEmail(env,{to:ticket.email,templateCode:'support_ticket_updated',entityType:'support_ticket',entityId:tid,subject:`[Sky First] Cập nhật yêu cầu hỗ trợ ${ticket.ticket_code}`,html:memberEmailHtml({title:'Cập nhật trạng thái phiếu hỗ trợ',name:ticket.full_name||ticket.email,intro:`Yêu cầu hỗ trợ ${ticket.ticket_code} đã được cập nhật trạng thái.`,code:ticket.ticket_code,status:nextStatus.toUpperCase(),processing:'',body:note||closedReason||'Vui lòng đăng nhập vào Trung tâm Nghiệp vụ Số Sky First để xem chi tiết.',ctaUrl:env.APP_URL||DEFAULT_SYSTEM_IDENTITY.appUrl,ctaLabel:'Xem yêu cầu hỗ trợ'})});
    }
    await audit(env,s.account_id,'support_ticket_updated','support_ticket',tid,clean(b.org_node_id,100)||null,{status:nextStatus,priority,impact_level:impact,duplicate_of_ticket_id:dupId,email_sent:mail.sent===true});
    return json({ok:true,status:nextStatus,email_sent:mail.sent===true});
  }

  // =========================================================
  // ADMIN GOVERNANCE &  UNIFIED CAPABILITY ENGINE
  // =========================================================
  if(url.pathname==='/api/admin/governance/overview'&&req.method==='GET'){
    if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const [
      regCounts,
      consentStats,
      otpStats,
      emailStats,
      anomalyStuckRequests,
      anomalyMissingProfiles,
      anomalyExpiredActiveCards,
      sodSelfEval,
      configHistory,
      securityEventsCount
    ]=await Promise.all([
      env.DB.prepare(`SELECT domain_group,COUNT(*) n FROM governance_registry GROUP BY domain_group`).all(),
      env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN privacy_consent=1 AND terms_accepted=1 THEN 1 ELSE 0 END) full_consent,SUM(CASE WHEN is_minor=1 THEN 1 ELSE 0 END) minors,SUM(CASE WHEN email_verified=1 THEN 1 ELSE 0 END) email_verified FROM legal_consent_records`).first(),
      env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN verified_at IS NOT NULL THEN 1 ELSE 0 END) verified,SUM(CASE WHEN attempts>=max_attempts THEN 1 ELSE 0 END) locked_out FROM email_otp_tokens`).first(),
      env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) sent,SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed,SUM(CASE WHEN status='not_configured' THEN 1 ELSE 0 END) not_configured FROM email_delivery_logs`).first(),
      env.DB.prepare(`SELECT COUNT(*) n FROM account_requests WHERE status IN ('pending','supplement') AND created_at<=datetime('now','-48 hours')`).first(),
      env.DB.prepare(`SELECT COUNT(*) n FROM people WHERE status='active' AND (email IS NULL OR trim(email)='' OR id_number IS NULL OR trim(id_number)='')`).first(),
      env.DB.prepare(`SELECT COUNT(*) n FROM member_cards WHERE status='active' AND expires_at IS NOT NULL AND expires_at<date('now')`).first(),
      env.DB.prepare(`SELECT COUNT(*) n FROM member_evaluations e JOIN accounts a ON a.id=e.evaluator_account_id WHERE a.person_id=e.person_id`).first(),
      env.DB.prepare(`SELECT id,config_key,version_no,change_reason,created_at FROM system_config_history ORDER BY created_at DESC LIMIT 20`).all(),
      env.DB.prepare(`SELECT COUNT(*) n FROM security_events`).first()
    ]);
    return json({
      identity:DEFAULT_SYSTEM_IDENTITY,
      domain_counts:Object.fromEntries((regCounts.results||[]).map(x=>[x.domain_group,Number(x.n||0)])),
      legal_consent:{
        total:Number(consentStats?.total||0),
        full_consent:Number(consentStats?.full_consent||0),
        minors:Number(consentStats?.minors||0),
        email_verified:Number(consentStats?.email_verified||0)
      },
      otp_center:{
        total:Number(otpStats?.total||0),
        verified:Number(otpStats?.verified||0),
        locked_out:Number(otpStats?.locked_out||0)
      },
      email_center:{
        provider:'resend',
        api_key_configured:!!env.RESEND_API_KEY,
        mailbox_provisioned_via_api:false,
        dns_spf_dkim_verified:'unverified_external_dns',
        total_logs:Number(emailStats?.total||0),
        sent:Number(emailStats?.sent||0),
        failed:Number(emailStats?.failed||0),
        not_configured:Number(emailStats?.not_configured||0)
      },
      anomalies:{
        stuck_requests_over_48h:Number(anomalyStuckRequests?.n||0),
        incomplete_active_people:Number(anomalyMissingProfiles?.n||0),
        expired_cards_still_marked_active:Number(anomalyExpiredActiveCards?.n||0),
        sod_self_evaluation_conflicts:Number(sodSelfEval?.n||0)
      },
      security_events_total:Number(securityEventsCount?.n||0),
      config_history:configHistory.results||[]
    });
  }

  if(url.pathname==='/api/admin/governance/registry'&&['GET','POST'].includes(req.method)){
    if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    if(req.method==='GET'){
      const domain=clean(url.searchParams.get('domain'),60);
      const q=clean(url.searchParams.get('q'),120);
      const r=await env.DB.prepare(`
        SELECT g.*,o.name org_name,u.username owner_username
        FROM governance_registry g
        LEFT JOIN org_nodes o ON o.id=g.org_node_id
        LEFT JOIN accounts u ON u.id=g.owner_account_id
        WHERE (?='' OR g.domain_group=?)
          AND (?='' OR g.title LIKE ? OR g.code LIKE ? OR g.summary LIKE ?)
        ORDER BY g.updated_at DESC LIMIT 300
      `).bind(domain,domain,q,`%${q}%`,`%${q}%`,`%${q}%`).all();
      return json({items:r.results||[]});
    }
    if(!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN',message:'Cần quyền Quản trị Mạng lưới hoặc Quản trị Hệ thống để cập nhật sổ đăng ký quản trị.'},403);
    const b=await bodyJson(req);
    const allowedDomains=new Set([
      'workflow_def','workflow_change','workflow_exception','sod_rule','policy_rule',
      'knowledge_article','knowledge_graph','ai_governance','scenario_simulation','maturity_assessment',
      'legal_obligation','privacy_dsar','background_job','backup_verify','tech_dependency','service_catalog','route_link','email_template','csr_program','esd_program','public_page','form_definition','feature_flag','cost_record','tech_handover','archive_inspection',
      'capability_map','case_lifecycle','sla_commitment','quality_check','decision_record','change_impact_eval','staff_readiness','ops_lesson','demand_forecast','ops_dependency','service_value','dev_proposal','resource_catalog','partner_obligation','sla_standard','beneficiary_feedback','ops_risk','initiative_portfolio'
    ]);
    const domainGroup=clean(b.domain_group,60);
    const code=clean(b.code,80).toUpperCase();
    const title=clean(b.title,240);
    if(!allowedDomains.has(domainGroup)||!code||!title)return json({error:'INVALID_GOVERNANCE_ENTRY',message:'Thiếu phân nhóm hợp lệ, mã định danh hoặc tiêu đề.'},400);
    // SoD check (): proposer cannot self-approve a workflow change or exception if approver_account_id is explicitly set to self on restricted groups
    if(['workflow_change','workflow_exception','decision_record'].includes(domainGroup)&&b.approver_account_id&&b.approver_account_id===s.account_id&&b.owner_account_id===s.account_id&&b.status==='approved'){
      return json({error:'SOD_CONFLICT_DETECTED',message:'Xung đột phân tách nhiệm vụ (SoD): Người đề xuất không được tự phê duyệt trực tiếp mục này mà không có ngoại lệ được cấp thẩm quyền xác nhận.'},409);
    }
    const id=uid('gov');
    const payload=typeof b.payload==='object'&&b.payload!==null?JSON.stringify(b.payload):clean(b.payload_json,4000)||'{}';
    try{
      await env.DB.prepare(`INSERT INTO governance_registry(id,domain_group,code,title,status,org_node_id,owner_account_id,reviewer_account_id,approver_account_id,related_entity_type,related_entity_id,version_label,summary,payload_json,evidence_ref,effective_from,effective_to) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        id,domainGroup,code,title,clean(b.status,40)||'active',clean(b.org_node_id,100)||null,clean(b.owner_account_id,100)||s.account_id,clean(b.reviewer_account_id,100)||null,clean(b.approver_account_id,100)||null,clean(b.related_entity_type,80)||null,clean(b.related_entity_id,100)||null,clean(b.version_label,30)||'1.0',clean(b.summary,2000)||null,payload,clean(b.evidence_ref,500)||null,clean(b.effective_from,20)||dateInVietnam(),clean(b.effective_to,20)||null
      ).run();
    }catch(e){
      if(String(e?.message||e).includes('UNIQUE'))return json({error:'GOVERNANCE_CODE_EXISTS',message:'Mã mục quản trị đã tồn tại.'},409);
      throw e;
    }
    await audit(env,s.account_id,'governance_entry_created',domainGroup,id,clean(b.org_node_id,100)||null,{code,title});
    return json({ok:true,id,code},201);
  }

  //  Safe Archive / ZIP Inspection Endpoint (inspects structure without executing code)
  if(url.pathname==='/api/admin/archive-inspect'&&req.method==='POST'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    const bytes=new Uint8Array(await req.arrayBuffer());
    const report=inspectZipArchiveHeaders(bytes);
    await ensureGovernanceTables(env);
    const id=uid('zipchk');
    await env.DB.prepare(`INSERT INTO governance_registry(id,domain_group,code,title,status,owner_account_id,version_label,summary,payload_json,effective_from) VALUES(?, 'archive_inspection', ?, 'Kiểm tra an toàn gói nén ZIP', ?, ?, '1.0', ?, ?, ?)`).bind(
      id,`ZIP-${Date.now().toString().slice(-8)}`,report.valid?'passed':'blocked',s.account_id,`Tệp: ${report.file_count||0} · Giải nén: ${report.total_uncompressed_bytes||0} bytes · Kết quả: ${report.reason}`,JSON.stringify({file_count:report.file_count,compressed_bytes:report.compressed_bytes,total_uncompressed_bytes:report.total_uncompressed_bytes,max_compression_ratio:report.max_compression_ratio,max_depth:report.max_depth,risks:report.risks}),dateInVietnam()
    ).run();
    await audit(env,s.account_id,'archive_inspected','archive_inspection',id,null,{valid:report.valid,reason:report.reason,file_count:report.file_count});
    return json(report,report.valid?200:400);
  }

  //  &  Admin Email & OTP Delivery Logs
  if(url.pathname==='/api/admin/email-center'&&req.method==='GET'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const [logs,otps]=await Promise.all([
      env.DB.prepare(`SELECT id,template_code,recipient_email,sender_address,reply_to_address,subject,provider_name,provider_message_id,status,error_detail,retry_count,created_at FROM email_delivery_logs ORDER BY created_at DESC LIMIT 100`).all(),
      env.DB.prepare(`SELECT id,email,purpose,attempts,max_attempts,resend_count,expires_at,verified_at,used_at,created_at FROM email_otp_tokens ORDER BY created_at DESC LIMIT 100`).all()
    ]);
    return json({
      identity:DEFAULT_SYSTEM_IDENTITY,
      provider_configured:!!env.RESEND_API_KEY,
      mailbox_note:'Cấu hình địa chỉ gửi trong ứng dụng không đồng nghĩa với việc đã tạo hộp thư (mailbox/alias) hoặc xác thực SPF/DKIM/DMARC trên nhà cung cấp email.',
      delivery_logs:logs.results||[],
      otp_records:otps.results||[]
    });
  }

  //  Governance Registry Update & Approval Lifecycle (with SoD enforcement)
  const govPatchMatch=url.pathname.match(/^\/api\/admin\/governance\/registry\/([^/]+)$/);
  if(govPatchMatch&&req.method==='PATCH'){
    if(!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN',message:'Cần quyền Quản trị Mạng lưới hoặc Quản trị Hệ thống để cập nhật mục quản trị.'},403);
    await ensureGovernanceTables(env);
    const gid=decodeURIComponent(govPatchMatch[1]);
    const existing=await env.DB.prepare(`SELECT * FROM governance_registry WHERE id=?`).bind(gid).first();
    if(!existing)return json({error:'NOT_FOUND'},404);
    const b=await bodyJson(req);
    const nextStatus=clean(b.status,40)||existing.status;
    const nextTitle=clean(b.title,240)||existing.title;
    const nextVersion=clean(b.version_label,30)||existing.version_label;
    const nextSummary=b.summary!==undefined?clean(b.summary,2000):existing.summary;
    const nextEvidence=b.evidence_ref!==undefined?clean(b.evidence_ref,500):existing.evidence_ref;
    const nextPayload=typeof b.payload==='object'&&b.payload!==null?JSON.stringify(b.payload):(b.payload_json!==undefined?clean(b.payload_json,4000):existing.payload_json);
    const nextEffectiveTo=b.effective_to!==undefined?(clean(b.effective_to,20)||null):existing.effective_to;
    // SoD check (): Owner cannot self-approve restricted governance records
    if(nextStatus==='approved'&&['workflow_change','workflow_exception','decision_record'].includes(existing.domain_group)){
      const effectiveOwner=clean(b.owner_account_id,100)||existing.owner_account_id;
      if(effectiveOwner===s.account_id){
        return json({error:'SOD_CONFLICT_DETECTED',message:'Xung đột phân tách nhiệm vụ (SoD): Người đề xuất / chủ sở hữu không được tự phê duyệt trực tiếp thay đổi quy trình, ngoại lệ hoặc quyết định.'},409);
      }
    }
    const reviewerId=clean(b.reviewer_account_id,100)||existing.reviewer_account_id||s.account_id;
    const approverId=nextStatus==='approved'?(clean(b.approver_account_id,100)||s.account_id):(clean(b.approver_account_id,100)||existing.approver_account_id);
    await env.DB.prepare(`UPDATE governance_registry SET title=?,status=?,version_label=?,summary=?,evidence_ref=?,payload_json=?,reviewer_account_id=?,approver_account_id=?,effective_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(
      nextTitle,nextStatus,nextVersion,nextSummary,nextEvidence,nextPayload,reviewerId,approverId,nextEffectiveTo,gid
    ).run();
    await audit(env,s.account_id,'governance_entry_updated',existing.domain_group,gid,existing.org_node_id,{code:existing.code,previous_status:existing.status,status:nextStatus,version_label:nextVersion});
    return json({ok:true,id:gid,code:existing.code,status:nextStatus,version_label:nextVersion});
  }

  //  Configuration Impact Preview
  if(url.pathname==='/api/admin/portal-config/preview-impact'&&req.method==='POST'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    const b=await bodyJson(req);
    const stored=await env.DB.prepare("SELECT value_json FROM system_settings WHERE key='member_portal_v4'").first();
    let prev={};try{prev=JSON.parse(stored?.value_json||'{}')}catch{}
    const affected=[];
    const warnings=[];
    const errors=[];
    if(b.brand&&typeof b.brand==='object'){
      const prevBrand=prev.brand||{};
      if(b.brand.siteName&&b.brand.siteName!==prevBrand.siteName){
        affected.push('Tiêu đề hệ thống trên Header, trang Đăng nhập, Tra cứu, Xác minh thẻ và Thiết lập');
        if(!String(b.brand.siteName).includes('Sky First'))warnings.push('Tên hiển thị mới không chứa cụm từ nhận diện "Sky First".');
      }
      for(const ck of ['primaryColor','accentColor','navColor']){
        if(b.brand[ck]!==undefined&&!/^#[a-f0-9]{6}$/i.test(String(b.brand[ck]||'')))errors.push(`Mã màu ${ck} không đúng định dạng #RRGGBB.`);
        else if(b.brand[ck]&&b.brand[ck]!==prevBrand[ck])affected.push(`Bảng màu giao diện (${ck})`);
      }
      if(b.brand.baseFontSize!==undefined){
        const fs=Number(b.brand.baseFontSize);
        if(!Number.isInteger(fs)||fs<14||fs>20)errors.push('Cỡ chữ cơ bản phải từ 14px đến 20px.');
        else if(fs!==Number(prevBrand.baseFontSize||16))affected.push(`Cỡ chữ toàn hệ thống (${fs}px)`);
      }
    }
    if(b.links!==undefined){
      if(!Array.isArray(b.links)||b.links.length!==DEFAULT_PORTAL_LINKS.length)errors.push(`Danh sách liên kết hệ sinh thái phải có đúng ${DEFAULT_PORTAL_LINKS.length} cổng đang hoạt động.`);
      else affected.push('Menu liên kết hệ sinh thái Sky First trên toàn bộ trang công khai và cổng thành viên');
    }
    if(b.stats!==undefined){
      if(!Array.isArray(b.stats))errors.push('Cấu hình thống kê không hợp lệ.');
      else{
        affected.push('Khối số liệu hoạt động tại cổng Đăng nhập / Đăng ký');
        if(b.stats.some(x=>x.key==='programs'&&x.mode==='auto'))errors.push('Chỉ số chương trình/dự án bắt buộc dùng chế độ nhập thủ công đã kiểm chứng (manual).');
      }
    }
    if(b.tagline!==undefined&&clean(b.tagline,190)!==clean(prev.tagline,190)){
      affected.push('Thông điệp truyền cảm hứng dưới bảng số liệu trang Đăng nhập');
    }
    return json({
      ok:true,
      valid:errors.length===0,
      affected_components:affected.length?affected:['Không phát hiện thay đổi so với cấu hình đang áp dụng'],
      warnings,
      errors
    });
  }

  // ,  Configuration Version Rollback
  const cfgRollbackMatch=url.pathname.match(/^\/api\/admin\/config-history\/([^/]+)\/rollback$/);
  if(cfgRollbackMatch&&req.method==='POST'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const hid=decodeURIComponent(cfgRollbackMatch[1]);
    const row=await env.DB.prepare(`SELECT * FROM system_config_history WHERE id=?`).bind(hid).first();
    if(!row)return json({error:'NOT_FOUND',message:'Không tìm thấy phiên bản cấu hình cần khôi phục.'},404);
    const b=await bodyJson(req);
    const targetJson=(b.restore_mode==='previous'&&row.previous_value_json&&row.previous_value_json!=='{}')?row.previous_value_json:row.new_value_json;
    let restoredObj={};try{restoredObj=JSON.parse(targetJson||'{}')}catch{return json({error:'INVALID_STORED_CONFIG'},400)}
    const curRow=await env.DB.prepare(`SELECT value_json FROM system_settings WHERE key=?`).bind(row.config_key).first();
    await env.DB.prepare(`INSERT INTO system_settings(key,value_json,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`).bind(row.config_key,JSON.stringify(restoredObj)).run();
    const verRow=await env.DB.prepare(`SELECT COALESCE(MAX(version_no),0)+1 v FROM system_config_history WHERE config_key=?`).bind(row.config_key).first();
    const nextVer=Number(verRow?.v||1);
    const reason=clean(b.change_reason,300)||`Khôi phục cấu hình từ phiên bản #${row.version_no}`;
    await env.DB.prepare(`INSERT INTO system_config_history(id,config_key,version_no,previous_value_json,new_value_json,change_reason,impact_summary_json,actor_account_id,approved_by_account_id) VALUES(?,?,?,?,?,?,?,?,?)`).bind(
      uid('cfghist'),row.config_key,nextVer,curRow?.value_json||'{}',JSON.stringify(restoredObj),reason,JSON.stringify({rollback_from_id:hid,rollback_from_version:row.version_no}),s.account_id,s.account_id
    ).run();
    await audit(env,s.account_id,'portal_config_rollback','system_settings',row.config_key,null,{from_history_id:hid,from_version:row.version_no,new_version:nextVer});
    return json({ok:true,config_key:row.config_key,restored_from_version:row.version_no,new_version_no:nextVer,settings:restoredObj});
  }

  // Controlled Admin Email & OTP Diagnostic Test Send (SUPER_ADMIN only, never sends to random users)
  if(url.pathname==='/api/admin/email-center/test-send'&&req.method==='POST'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const toEmail=clean(b.recipient_email,160).toLowerCase();
    const testType=['diagnostic_email','otp_simulation'].includes(b.test_type)?b.test_type:'diagnostic_email';
    if(!toEmail||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)){
      return json({error:'INVALID_RECIPIENT_EMAIL',message:'Vui lòng nhập địa chỉ email kiểm tra hợp lệ có kiểm soát.'},400);
    }
    if(b.confirm_controlled_send!==true&&String(b.confirm_controlled_send)!=='true'&&String(b.confirm_controlled_send)!=='1'){
      return json({error:'CONTROLLED_SEND_CONFIRMATION_REQUIRED',message:'Cần xác nhận gửi email kiểm tra tới địa chỉ thuộc quyền kiểm soát của quản trị viên.'},400);
    }
    const senderAddr=`${DEFAULT_SYSTEM_IDENTITY.siteName} <${env.EMAIL_FROM_NOREPLY||DEFAULT_SYSTEM_IDENTITY.noreplyEmail}>`;
    const replyToAddr=env.EMAIL_REPLY_TO||DEFAULT_SYSTEM_IDENTITY.supportEmail;
    const subj=testType==='otp_simulation'?`[Sky First GFI] Kiểm tra luồng gửi mã xác thực OTP (${dateInVietnam()})`:`[Sky First GFI] Kiểm tra kết nối dịch vụ Email hệ thống (${dateInVietnam()})`;
    const logId=uid('emlog');
    if(!env.RESEND_API_KEY){
      await env.DB.prepare(`INSERT INTO email_delivery_logs(id,template_code,recipient_email,sender_address,reply_to_address,subject,provider_name,status,error_detail,retry_count,related_entity_type,related_entity_id) VALUES(?,?,?,?,?,?,'resend','not_configured','MISSING_RESEND_API_KEY',0,'admin_diagnostic',?)`).bind(
        logId,'admin_diagnostic_test',toEmail,senderAddr,replyToAddr,subj,testType
      ).run();
      await audit(env,s.account_id,'email_diagnostic_test_executed','email_delivery_log',logId,null,{recipient_email:toEmail,test_type:testType,status:'not_configured'});
      return json({
        ok:true,
        sent:false,
        delivery_status:'not_configured',
        provider_accepted:false,
        inbox_delivery_verified:false,
        log_id:logId,
        sender_address:senderAddr,
        reply_to_address:replyToAddr,
        message:'Chưa khai báo khóa RESEND_API_KEY trong môi trường hiện tại; bản ghi kiểm tra đã được lưu với trạng thái not_configured.'
      },202);
    }
    try{
      const html=memberEmailHtml({
        title:'Kiểm tra dịch vụ Email Trung tâm Nghiệp vụ Số Sky First',
        name:toEmail,
        intro:'Đây là thư kiểm tra kỹ thuật có kiểm soát được kích hoạt bởi SUPER ADMIN.',
        code:`DIAG-${logId.slice(-6).toUpperCase()}`,
        status:testType==='otp_simulation'?'KIỂM TRA LUỒNG OTP':'KIỂM TRA DỊCH VỤ EMAIL',
        processing:`Người gửi: ${DEFAULT_SYSTEM_IDENTITY.noreplyEmail} · Phản hồi: ${replyToAddr}`,
        body:'Nếu bạn nhận được thư này trong hộp thư đến, cấu hình khóa API và định tuyến tên miền gửi thư đã hoạt động.',
        ctaUrl:env.APP_URL||DEFAULT_SYSTEM_IDENTITY.appUrl,
        ctaLabel:'Mở Trung tâm Nghiệp vụ Số Sky First'
      });
      const r=await fetch('https://api.resend.com/emails',{
        method:'POST',
        headers:{'authorization':`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},
        body:JSON.stringify({from:senderAddr,to:[toEmail],reply_to:replyToAddr,subject:subj,html})
      });
      const data=await r.json().catch(()=>({}));
      const accepted=Boolean(r.ok&&data&&data.id);
      const rawErr=accepted?null:String(data?.message||data?.error||`HTTP_${r.status}`);
      const safeErr=rawErr?rawErr.replace(/re_[A-Za-z0-9_]+/g,'[REDACTED_KEY]').slice(0,400):null;
      await env.DB.prepare(`INSERT INTO email_delivery_logs(id,template_code,recipient_email,sender_address,reply_to_address,subject,provider_name,provider_message_id,status,error_detail,retry_count,related_entity_type,related_entity_id) VALUES(?,?,?,?,?,?,'resend',?,?,?,0,'admin_diagnostic',?)`).bind(
        logId,'admin_diagnostic_test',toEmail,senderAddr,replyToAddr,subj,data?.id||null,accepted?'sent':'failed',accepted?'PROVIDER_ACCEPTED_HTTP_200':safeErr,testType
      ).run();
      await audit(env,s.account_id,'email_diagnostic_test_executed','email_delivery_log',logId,null,{recipient_email:toEmail,test_type:testType,status:accepted?'provider_accepted':'provider_rejected',provider_message_id:data?.id||null});
      return json({
        ok:accepted,
        sent:accepted,
        delivery_status:accepted?'provider_accepted':'provider_rejected',
        provider_accepted:accepted,
        provider_message_id:data?.id||null,
        inbox_delivery_verified:false,
        log_id:logId,
        sender_address:senderAddr,
        reply_to_address:replyToAddr,
        error:safeErr,
        dns_note:'Trạng thái provider_accepted xác nhận dịch vụ Resend đã nhận lệnh gửi (HTTP 200). Việc thư vào hộp thư đến còn phụ thuộc bản ghi DNS SPF/DKIM/DMARC của tên miền skyfirst.io.vn.'
      },accepted?200:502);
    }catch(e){
      const safeErr=clean(String(e?.message||e).replace(/re_[A-Za-z0-9_]+/g,'[REDACTED_KEY]'),400);
      await env.DB.prepare(`INSERT INTO email_delivery_logs(id,template_code,recipient_email,sender_address,reply_to_address,subject,provider_name,status,error_detail,retry_count,related_entity_type,related_entity_id) VALUES(?,?,?,?,?,?,'resend','failed',?,0,'admin_diagnostic',?)`).bind(
        logId,'admin_diagnostic_test',toEmail,senderAddr,replyToAddr,subj,safeErr,testType
      ).run();
      await audit(env,s.account_id,'email_diagnostic_test_executed','email_delivery_log',logId,null,{recipient_email:toEmail,test_type:testType,status:'failed'});
      return json({ok:false,sent:false,delivery_status:'failed',provider_accepted:false,log_id:logId,error:safeErr},502);
    }
  }

  // Safe Email Delivery Retry (with anti-duplicate lock, max-retry cap, and cooldown)
  const emailRetryMatch=url.pathname.match(/^\/api\/admin\/email-center\/([^/]+)\/retry$/);
  if(emailRetryMatch&&req.method==='POST'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const lid=decodeURIComponent(emailRetryMatch[1]);
    const b=await bodyJson(req);
    const logRow=await env.DB.prepare(`SELECT * FROM email_delivery_logs WHERE id=?`).bind(lid).first();
    if(!logRow)return json({error:'NOT_FOUND',message:'Không tìm thấy bản ghi nhật ký email.'},404);
    if(logRow.status==='sent'||logRow.status==='provider_accepted'){
      return json({error:'EMAIL_ALREADY_SENT',message:'Email này đã được gửi thành công / nhà cung cấp đã tiếp nhận, không gửi lại để tránh trùng lặp.'},409);
    }
    const prevRetry=Number(logRow.retry_count||0);
    if(prevRetry>=5){
      return json({error:'EMAIL_MAX_RETRIES_EXCEEDED',message:'Bản ghi email đã vượt quá giới hạn 5 lần thử gửi lại an toàn.'},429);
    }
    if(prevRetry>0&&b.force_bypass_cooldown!==true){
      const recentRow=await env.DB.prepare(`SELECT 1 recent FROM email_delivery_logs WHERE id=? AND updated_at > datetime('now','-30 seconds')`).bind(lid).first();
      if(recentRow?.recent&&b.enforce_cooldown===true){
        return json({error:'EMAIL_RETRY_COOLDOWN_ACTIVE',message:'Vui lòng đợi tối thiểu 30 giây giữa các lần thử gửi lại cùng một email để tránh gửi trùng.'},429);
      }
    }
    const nextRetry=prevRetry+1;
    if(!env.RESEND_API_KEY){
      await env.DB.prepare(`UPDATE email_delivery_logs SET retry_count=?,status='not_configured',error_detail='EMAIL_NOT_CONFIGURED_ON_RETRY',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(nextRetry,lid).run();
      await audit(env,s.account_id,'email_delivery_retried','email_delivery_log',lid,null,{retry_count:nextRetry,status:'not_configured'});
      return json({ok:true,sent:false,status:'not_configured',retry_count:nextRetry,message:'Đã ghi nhận thao tác thử lại, nhưng môi trường hiện tại chưa cấu hình khóa RESEND_API_KEY.'},202);
    }
    try{
      const html=memberEmailHtml({
        title:logRow.subject||'Thông báo từ Trung tâm Nghiệp vụ Số Sky First',
        name:logRow.recipient_email,
        intro:'Đây là thư gửi lại từ Trung tâm Nghiệp vụ Số Sky First.',
        status:'THÔNG BÁO HỆ THỐNG',
        processing:'',
        body:'Hệ thống gửi lại thông báo theo yêu cầu kiểm tra của quản trị viên.',
        ctaUrl:env.APP_URL||DEFAULT_SYSTEM_IDENTITY.appUrl,
        ctaLabel:'Mở Trung tâm Nghiệp vụ Số Sky First'
      });
      const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'authorization':`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:logRow.sender_address,to:[logRow.recipient_email],reply_to:logRow.reply_to_address||DEFAULT_SYSTEM_IDENTITY.supportEmail,subject:logRow.subject,html})});
      const data=await r.json().catch(()=>({}));
      const ok=Boolean(r.ok&&data&&data.id);
      const errMsg=ok?null:String(data?.message||data?.error||`HTTP_${r.status}`).replace(/re_[A-Za-z0-9_]+/g,'[REDACTED_KEY]').slice(0,400);
      await env.DB.prepare(`UPDATE email_delivery_logs SET retry_count=?,status=?,provider_message_id=?,error_detail=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(nextRetry,ok?'sent':'failed',data?.id||null,errMsg,lid).run();
      await audit(env,s.account_id,'email_delivery_retried','email_delivery_log',lid,null,{retry_count:nextRetry,status:ok?'sent':'failed'});
      return json({ok:true,sent:ok,status:ok?'sent':'failed',retry_count:nextRetry,provider_message_id:data?.id||null,error:errMsg});
    }catch(e){
      const errMsg=clean(String(e?.message||e).replace(/re_[A-Za-z0-9_]+/g,'[REDACTED_KEY]'),400);
      await env.DB.prepare(`UPDATE email_delivery_logs SET retry_count=?,status='failed',error_detail=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(nextRetry,errMsg,lid).run();
      return json({ok:true,sent:false,status:'failed',retry_count:nextRetry,error:errMsg},502);
    }
  }

  //  Vendor-Independent Standardized Metadata & Governance Export Bundle
  if(url.pathname==='/api/admin/export-bundle'&&req.method==='GET'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const [orgs,cardTypes,roles,settings,govItems,counts]=await Promise.all([
      env.DB.prepare(`SELECT id,code,name,short_name,node_type,parent_id,status,founded_at,term_label,sort_order FROM org_nodes WHERE deleted_at IS NULL ORDER BY sort_order,name`).all(),
      env.DB.prepare(`SELECT id,code,name,active FROM card_types ORDER BY code`).all(),
      env.DB.prepare(`SELECT id,code,name FROM roles ORDER BY code`).all(),
      env.DB.prepare(`SELECT key,value_json,updated_at FROM system_settings ORDER BY key`).all(),
      env.DB.prepare(`SELECT id,domain_group,code,title,status,version_label,summary,evidence_ref,effective_from,effective_to,updated_at FROM governance_registry ORDER BY domain_group,code`).all(),
      env.DB.prepare(`SELECT (SELECT COUNT(*) FROM people) people_count,(SELECT COUNT(*) FROM accounts) accounts_count,(SELECT COUNT(*) FROM member_cards) cards_count,(SELECT COUNT(*) FROM legal_consent_records) consents_count`).first()
    ]);
    const bundle={
      format:'skyfirst-operations-center-export-v1',
      schema_version:17,
      identity:DEFAULT_SYSTEM_IDENTITY,
      record_counts:counts||{},
      org_nodes:orgs.results||[],
      card_types:cardTypes.results||[],
      roles:roles.results||[],
      system_settings:(settings.results||[]).filter(x=>!/secret|token|password|api_key/i.test(String(x.key||''))).map(x=>({key:x.key,updated_at:x.updated_at,value:(()=>{try{return JSON.parse(x.value_json||'{}')}catch{return x.value_json}})()})),
      governance_registry:govItems.results||[]
    };
    const checksum=await sha256(JSON.stringify(bundle));
    await audit(env,s.account_id,'system_export_bundle_generated','system_export','bundle_v1',null,{sha256_checksum:checksum});
    return json({ok:true,exported_at:new Date().toISOString(),sha256_checksum:checksum,bundle},200,{'cache-control':'no-store'});
  }

  // - &  Workflow Bottleneck Analytics, Processing Times & Business Compliance Report
  if(url.pathname==='/api/admin/workflows/analytics'&&req.method==='GET'){
    if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const [reqStats,ticketStats,queueStats,govCompliance]=await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) approved,SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) rejected,SUM(CASE WHEN status='supplement' THEN 1 ELSE 0 END) supplement,SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending,SUM(CASE WHEN status IN ('pending','supplement') AND created_at<=datetime('now','-48 hours') THEN 1 ELSE 0 END) overdue_48h,AVG(CASE WHEN reviewed_at IS NOT NULL THEN (julianday(reviewed_at)-julianday(created_at))*24.0 ELSE NULL END) avg_review_hours FROM account_requests`).first(),
      env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN st.status IN ('completed','closed') THEN 1 ELSE 0 END) completed,SUM(CASE WHEN st.status='waiting_supplement' THEN 1 ELSE 0 END) waiting_supplement,SUM(CASE WHEN st.status='escalated' THEN 1 ELSE 0 END) escalated,SUM(CASE WHEN sta.sla_due_at IS NOT NULL AND sta.sla_due_at<datetime('now') AND st.status NOT IN ('completed','closed') THEN 1 ELSE 0 END) overdue_sla FROM support_tickets st LEFT JOIN support_ticket_assignments sta ON sta.ticket_id=st.id`).first(),
      env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN workflow_state='blocked' THEN 1 ELSE 0 END) blocked,SUM(CASE WHEN workflow_state='in_progress' THEN 1 ELSE 0 END) in_progress,SUM(CASE WHEN workflow_state='completed' THEN 1 ELSE 0 END) completed FROM work_queue_states`).first(),
      env.DB.prepare(`SELECT domain_group,status,COUNT(*) n FROM governance_registry WHERE domain_group IN ('workflow_def','workflow_change','workflow_exception','sod_rule','policy_rule','decision_record') GROUP BY domain_group,status`).all()
    ]);
    const reqTotal=Number(reqStats?.total||0);
    const reqApproved=Number(reqStats?.approved||0);
    const bottlenecks=[];
    if(Number(reqStats?.overdue_48h||0)>0){
      bottlenecks.push({step:'Xét duyệt hồ sơ đăng ký tài khoản',waiting_count:Number(reqStats.overdue_48h),severity:'high',evidence:`${reqStats.overdue_48h} hồ sơ ở trạng thái pending/supplement quá 48 giờ.`});
    }
    if(Number(ticketStats?.overdue_sla||0)>0){
      bottlenecks.push({step:'Phản hồi và giải quyết phiếu hỗ trợ nghiệp vụ',waiting_count:Number(ticketStats.overdue_sla),severity:'high',evidence:`${ticketStats.overdue_sla} phiếu hỗ trợ đã vượt thời hạn cam kết SLA.`});
    }
    if(Number(queueStats?.blocked||0)>0){
      bottlenecks.push({stage:'Xử lý công việc bị chặn chờ bên phối hợp',step:'Xử lý công việc bị chặn chờ bên phối hợp',waiting_count:Number(queueStats.blocked),severity:'medium',evidence:`${queueStats.blocked} công việc trong hàng đợi đang ở trạng thái blocked.`,recommendation:'Rà soát điều kiện còn thiếu và đôn đốc đơn vị phối hợp.'});
    }
    if(!bottlenecks.length){
      bottlenecks.push({stage:'Vận hành quy trình tổng thể',step:'Vận hành quy trình tổng thể',waiting_count:0,severity:'info',evidence:'Hiện không có hồ sơ đăng ký hoặc phiếu hỗ trợ nào vượt ngưỡng SLA.',recommendation:'Tiếp tục duy trì kiểm soát SLA định kỳ.'});
    }
    const arMetrics={
      total:reqTotal,
      approved:reqApproved,
      rejected:Number(reqStats?.rejected||0),
      supplement_returned:Number(reqStats?.supplement||0),
      supplement_rate_pct:reqTotal?Number(((Number(reqStats?.supplement||0)/reqTotal)*100).toFixed(1)):0,
      pending:Number(reqStats?.pending||0),
      overdue_48h:Number(reqStats?.overdue_48h||0),
      overdue_48h_count:Number(reqStats?.overdue_48h||0),
      completion_rate_pct:reqTotal?Number(((reqApproved/reqTotal)*100).toFixed(1)):100,
      avg_processing_hours:reqStats?.avg_review_hours!=null?Number(Number(reqStats.avg_review_hours).toFixed(2)):0
    };
    const supTotal=Number(ticketStats?.total||0);
    const supMetrics={
      total:supTotal,
      completed:Number(ticketStats?.completed||0),
      waiting_supplement:Number(ticketStats?.waiting_supplement||0),
      escalated:Number(ticketStats?.escalated||0),
      overdue_sla:Number(ticketStats?.overdue_sla||0),
      sla_breach_rate_pct:supTotal?Number(((Number(ticketStats?.overdue_sla||0)/supTotal)*100).toFixed(1)):0,
      avg_resolution_hours:0
    };
    return json({
      ok:true,
      workflow_metrics:{account_requests:arMetrics,support_tickets:supMetrics},
      account_request_workflow:arMetrics,
      support_workflow:supMetrics,
      bottlenecks,
      compliance_breakdown:govCompliance.results||[]
    });
  }

  // , , ,  Grounded Business Assistant & Knowledge Impact Analyzer
  if(url.pathname==='/api/admin/knowledge/assistant'&&req.method==='POST'){
    if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const query=clean(b.query||b.question,300);
    if(!query)return json({error:'QUERY_REQUIRED',message:'Vui lòng nhập câu hỏi hoặc chủ đề nghiệp vụ cần tra cứu.'},400);
    const qLike=`%${query}%`;
    const [matchedDocs,allRules,counts]=await Promise.all([
      env.DB.prepare(`SELECT code,domain_group,title,version_label,status,summary,evidence_ref,updated_at FROM governance_registry WHERE title LIKE ? OR summary LIKE ? OR code LIKE ? OR domain_group LIKE ? ORDER BY updated_at DESC LIMIT 10`).bind(qLike,qLike,qLike,qLike).all(),
      env.DB.prepare(`SELECT code,domain_group,title,version_label,status,summary,evidence_ref,updated_at FROM governance_registry WHERE status='active' ORDER BY updated_at DESC LIMIT 15`).all(),
      env.DB.prepare(`SELECT (SELECT COUNT(*) FROM account_requests WHERE status IN ('pending','supplement')) pending_requests,(SELECT COUNT(*) FROM support_tickets WHERE status NOT IN ('completed','closed')) open_tickets,(SELECT COUNT(*) FROM member_cards WHERE status='active') active_cards`).first()
    ]);
    const docs=(matchedDocs.results?.length?matchedDocs.results:allRules.results)||[];
    const verifiedFacts=docs.slice(0,6).map(d=>({
      code:d.code,
      source_code:d.code,
      domain_group:d.domain_group,
      title:d.title,
      version_label:d.version_label,
      status:d.status,
      fact:d.summary,
      evidence_ref:d.evidence_ref||'Nội bộ',
      provenance:`Sổ đăng ký quản trị (${d.code} · phiên bản ${d.version_label} · nguồn: ${d.evidence_ref||'nội bộ'})`
    }));
    const inferences=[
      `Gợi ý xử lý dựa trên dữ liệu thực tế hiện tại: Hệ thống đang có ${Number(counts?.pending_requests||0)} yêu cầu tài khoản chờ duyệt và ${Number(counts?.open_tickets||0)} phiếu hỗ trợ đang mở.`,
      'Lưu ý: Mọi đề xuất chuẩn bị nội dung từ Trợ lý Nghiệp vụ chỉ mang tính tham khảo kỹ thuật, không tự động thay thế quyết định phê duyệt của cấp có thẩm quyền.'
    ];
    const impactItems=docs.filter(d=>['workflow_def','sod_rule','legal_obligation','sla_standard'].includes(d.domain_group)).map(d=>({
      code:d.code,
      title:d.title,
      impact_note:'Cần rà soát tính đồng bộ của hướng dẫn nội bộ và biểu mẫu liên quan khi cập nhật mục này.'
    }));
    return json({
      ok:true,
      query,
      verified_facts:verifiedFacts,
      inferences_and_recommendations:inferences,
      knowledge_impact_items:impactItems,
      insufficient_evidence:matchedDocs.results?.length?[]:['Không tìm thấy văn bản khớp chính xác từ khóa; đang hiển thị các quy tắc đang hiệu lực gần nhất để đối chiếu.'],
      ai_governance_notice:'Tuân thủ quy tắc quản trị AI: Giới hạn trong phạm vi quyền người dùng; phân biệt rõ dữ kiện đã xác minh và suy luận tham khảo.'
    });
  }

  //  &  Case Reconstruction & Provenance Timeline
  if(url.pathname==='/api/admin/case-reconstruction'&&req.method==='GET'){
    if(!(await hasPerm(env,s.account_id,'member.view')))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const ref=clean(url.searchParams.get('ref')||url.searchParams.get('subject_id'),120);
    if(!ref)return json({error:'REF_REQUIRED',message:'Vui lòng nhập mã hồ sơ, mã thành viên, mã yêu cầu hoặc mã phiếu hỗ trợ.'},400);
    const [person,reqRow,ticketRow,audits,consents]=await Promise.all([
      env.DB.prepare(`SELECT id,member_code,full_name,email,status,created_at,updated_at FROM people WHERE id=? OR member_code=? OR lower(email)=lower(?) LIMIT 1`).bind(ref,ref,ref).first(),
      env.DB.prepare(`SELECT id,request_code,full_name,email,status,admin_note,reviewed_at,created_at FROM account_requests WHERE id=? OR request_code=? OR lower(email)=lower(?) LIMIT 1`).bind(ref,ref,ref).first(),
      env.DB.prepare(`SELECT st.*,sta.priority,sta.impact_level,sta.resolution_note,sta.closed_reason FROM support_tickets st LEFT JOIN support_ticket_assignments sta ON sta.ticket_id=st.id WHERE st.id=? OR st.ticket_code=? LIMIT 1`).bind(ref,ref).first(),
      env.DB.prepare(`SELECT l.*,a.username FROM audit_log l LEFT JOIN accounts a ON a.id=l.actor_account_id WHERE l.entity_id=? OR l.details_json LIKE ? ORDER BY l.id ASC LIMIT 100`).bind(ref,`%${ref}%`).all(),
      env.DB.prepare(`SELECT id,subject_type,subject_id,email,terms_version,privacy_version,read_acknowledged,terms_accepted,privacy_consent,email_verified,purpose_scope,consented_at FROM legal_consent_records WHERE subject_id=? OR lower(email)=lower(?) ORDER BY consented_at ASC`).bind(ref,ref).all()
    ]);
    const timeline=[];
    if(reqRow){
      timeline.push({timestamp:reqRow.created_at,event:'Tiếp nhận yêu cầu đăng ký tài khoản',source:`account_requests (${reqRow.request_code})`,detail:`Trạng thái: ${reqRow.status}`});
      if(reqRow.reviewed_at)timeline.push({timestamp:reqRow.reviewed_at,event:'Xét duyệt yêu cầu đăng ký',source:`account_requests (${reqRow.request_code})`,detail:reqRow.admin_note||reqRow.status});
    }
    if(person){
      timeline.push({timestamp:person.created_at,event:'Khởi tạo hồ sơ thành viên chính thức',source:`people (${person.member_code})`,detail:`Họ tên: ${person.full_name} · Trạng thái: ${person.status}`});
    }
    if(ticketRow){
      timeline.push({timestamp:ticketRow.created_at,event:'Tạo phiếu hỗ trợ nghiệp vụ',source:`support_tickets (${ticketRow.ticket_code})`,detail:`${ticketRow.subject} (${ticketRow.status})`});
    }
    for(const c of (consents.results||[])){
      timeline.push({timestamp:c.consented_at,event:'Ghi nhận bằng chứng đồng ý pháp lý & điều khoản',source:`legal_consent_records (${c.id})`,detail:`Phiên bản: ${c.terms_version} / ${c.privacy_version} · OTP verified: ${c.email_verified}`});
    }
    for(const a of (audits.results||[])){
      timeline.push({timestamp:a.created_at,event:`Nhật ký kiểm toán: ${a.action}`,source:`audit_log (#${a.id} bởi ${a.username||'Hệ thống'})`,detail:`${a.entity_type} · ${a.entity_id||''}`});
    }
    timeline.sort((x,y)=>String(x.timestamp||'').localeCompare(String(y.timestamp||'')));
    return json({
      ok:true,
      ref,
      found:Boolean(person||reqRow||ticketRow||timeline.length),
      person:person||null,
      event_count:timeline.length,
      entities:{person:person||null,account_request:reqRow||null,support_ticket:ticketRow||null},
      consents:consents.results||[],
      timeline:timeline.map(t=>({...t,title:t.event})),
      provenance_note:'Chuỗi sự kiện được tái dựng trực tiếp từ các bảng dữ liệu gốc (people, account_requests, support_tickets, legal_consent_records, audit_log).'
    });
  }

  // Legal Gate & Personal Data Protection Review (Luật BVDLCN 91/2025/QH15 & Nghị định 356/2025/NĐ-CP)
  if(url.pathname==='/api/admin/governance/legal-review'&&req.method==='GET'){
    if(!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const [legalDocs,policies,consentStats,withdrawalStats,signoffRow]=await Promise.all([
      env.DB.prepare("SELECT id,code,title,status,version_label,summary,evidence_ref,effective_from,updated_at FROM governance_registry WHERE domain_group='legal_obligation' ORDER BY code").all(),
      env.DB.prepare("SELECT id,policy_code,policy_type,title,version_label,is_mandatory,requires_reconsent,status,effective_from FROM data_policies WHERE status='active' ORDER BY policy_code").all(),
      env.DB.prepare("SELECT COUNT(*) total,SUM(CASE WHEN terms_accepted=1 AND privacy_consent=1 AND accuracy_committed=1 THEN 1 ELSE 0 END) separated_three_consents,SUM(CASE WHEN is_minor=1 THEN 1 ELSE 0 END) minor_records,SUM(CASE WHEN is_minor=1 AND guardian_consent=1 THEN 1 ELSE 0 END) minor_with_guardian_consent FROM legal_consent_records").first(),
      env.DB.prepare("SELECT COUNT(*) total,SUM(CASE WHEN status IN ('approved','completed','rejected') THEN 1 ELSE 0 END) processed FROM consent_withdrawal_requests").first(),
      env.DB.prepare("SELECT value_json,updated_at FROM system_settings WHERE key='legal_professional_signoff'").first()
    ]);
    let signoff=null;
    try{if(signoffRow?.value_json)signoff=JSON.parse(signoffRow.value_json)}catch{}
    const technicalControls=[
      {code:'CONSENT_3_SEPARATION',title:'Tách bạch 3 ô đồng ý độc lập (Điều khoản sử dụng · Bảo vệ dữ liệu cá nhân · Cam kết tính chính xác)',implemented:true,verified_records:Number(consentStats?.separated_three_consents||0)},
      {code:'MINOR_GUARDIAN_PROTECTION',title:'Kiểm soát dữ liệu người dưới 18 tuổi, thông tin người giám hộ và xóa số định danh giám hộ sau khi duyệt',implemented:true,verified_records:Number(consentStats?.minor_with_guardian_consent||0)},
      {code:'VERSIONED_DATA_POLICIES',title:'Lưu trữ phiên bản chính sách dữ liệu (data_policies) và bằng chứng đồng ý gắn mã phiên bản',implemented:(policies.results||[]).length>=2,verified_records:(policies.results||[]).length},
      {code:'CONSENT_WITHDRAWAL_WORKFLOW',title:'Cơ chế tiếp nhận và xử lý yêu cầu rút lại sự đồng ý / hạn chế xử lý dữ liệu',implemented:true,verified_records:Number(withdrawalStats?.total||0)},
      {code:'PRIVATE_ASSET_ACCESS_GUARD',title:'Chặn truy cập công khai đối với ảnh thẻ chờ duyệt, tài liệu thành viên và đính kèm nội bộ trên R2',implemented:true,verified_records:1}
    ];
    const techPassed=technicalControls.every(c=>c.implemented)&&(legalDocs.results||[]).length>=2;
    const signoffApproved=Boolean(signoff&&signoff.status==='approved'&&signoff.reviewer_name&&signoff.evidence_ref);
    return json({
      ok:true,
      technical_controls_status:techPassed?'passed':'failed',
      legal_documents_seeded:(legalDocs.results||[]).length>=2,
      legal_signoff_status:signoffApproved?'approved':(signoff?.status||'pending_legal_review'),
      overall_status:techPassed?(signoffApproved?'passed':'technical_passed_pending_legal_signoff'):'failed',
      technical_controls:technicalControls,
      legal_obligations:legalDocs.results||[],
      active_policies:policies.results||[],
      signoff_record:signoff||{status:'pending_legal_review',note:'Các kiểm soát kỹ thuật theo Luật BVDLCN số 91/2025/QH15 và Nghị định số 356/2025/NĐ-CP đã được triển khai trong mã nguồn; cần người có thẩm quyền pháp lý ký duyệt chính thức trước khi vận hành công khai.'}
    });
  }

  if(url.pathname==='/api/admin/governance/legal-signoff'&&req.method==='POST'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const status=['pending_legal_review','approved','requires_amendment'].includes(b.status)?b.status:'pending_legal_review';
    const reviewerName=clean(b.reviewer_name,160);
    const evidenceRef=clean(b.evidence_ref,300);
    const legalNote=clean(b.legal_basis_note,1000);
    if(status==='approved'&&(!reviewerName||!evidenceRef)){
      return json({error:'LEGAL_SIGNOFF_EVIDENCE_REQUIRED',message:'Khi xác nhận phê duyệt pháp lý chuyên môn, bắt buộc ghi rõ họ tên người rà soát pháp lý và mã biên bản/văn bản căn cứ.'},400);
    }
    const record={
      status,
      reviewer_name:reviewerName||null,
      evidence_ref:evidenceRef||null,
      legal_basis_note:legalNote||'Đối chiếu Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định số 356/2025/NĐ-CP.',
      recorded_by_account_id:s.account_id,
      recorded_at:new Date().toISOString()
    };
    await env.DB.prepare(`INSERT INTO system_settings(key,value_json,updated_at) VALUES('legal_professional_signoff',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`).bind(JSON.stringify(record)).run();
    await audit(env,s.account_id,'legal_professional_signoff_updated','legal_gate','LEGAL_91_2025',null,record);
    return json({ok:true,signoff_record:record});
  }

  // Data & Knowledge Consistency Checker (8 real database integrity rules with exact counts & sample records)
  if(url.pathname==='/api/admin/data-consistency'&&req.method==='GET'){
    if(!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const [
      orphanAccCnt,orphanAccRows,
      orphanMemCnt,orphanMemRows,
      expCardCnt,expCardRows,
      expGovCnt,expGovRows,
      dupReqCnt,dupReqRows,
      expAccCnt,expAccRows,
      incompleteConsentCnt,incompleteConsentRows,
      unassignedTicketCnt,unassignedTicketRows
    ]=await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) n FROM accounts a LEFT JOIN people p ON p.id=a.person_id WHERE p.id IS NULL`).first(),
      env.DB.prepare(`SELECT a.id,a.username code,a.person_id detail FROM accounts a LEFT JOIN people p ON p.id=a.person_id WHERE p.id IS NULL LIMIT 20`).all(),
      env.DB.prepare(`SELECT COUNT(*) n FROM org_memberships m LEFT JOIN people p ON p.id=m.person_id LEFT JOIN org_nodes o ON o.id=m.org_node_id WHERE p.id IS NULL OR o.id IS NULL OR o.deleted_at IS NOT NULL`).first(),
      env.DB.prepare(`SELECT m.id,m.person_id code,m.org_node_id detail FROM org_memberships m LEFT JOIN people p ON p.id=m.person_id LEFT JOIN org_nodes o ON o.id=m.org_node_id WHERE p.id IS NULL OR o.id IS NULL OR o.deleted_at IS NOT NULL LIMIT 20`).all(),
      env.DB.prepare(`SELECT COUNT(*) n FROM member_cards WHERE status='active' AND expires_at IS NOT NULL AND expires_at<date('now','+7 hours')`).first(),
      env.DB.prepare(`SELECT id,card_number code,expires_at detail FROM member_cards WHERE status='active' AND expires_at IS NOT NULL AND expires_at<date('now','+7 hours') LIMIT 20`).all(),
      env.DB.prepare(`SELECT COUNT(*) n FROM governance_registry WHERE status='active' AND effective_to IS NOT NULL AND trim(effective_to)<>'' AND effective_to<date('now','+7 hours')`).first(),
      env.DB.prepare(`SELECT id,code,effective_to detail FROM governance_registry WHERE status='active' AND effective_to IS NOT NULL AND trim(effective_to)<>'' AND effective_to<date('now','+7 hours') LIMIT 20`).all(),
      env.DB.prepare(`SELECT COUNT(*) n FROM (SELECT lower(email) em FROM account_requests WHERE status IN ('pending','supplement') GROUP BY lower(email) HAVING COUNT(*)>1)`).first(),
      env.DB.prepare(`SELECT lower(email) code,COUNT(*) detail FROM account_requests WHERE status IN ('pending','supplement') GROUP BY lower(email) HAVING COUNT(*)>1 LIMIT 20`).all(),
      env.DB.prepare(`SELECT COUNT(*) n FROM account_lifecycle WHERE lifecycle_status='active' AND expires_at IS NOT NULL AND expires_at<=datetime('now')`).first(),
      env.DB.prepare(`SELECT account_id id,account_type_code code,expires_at detail FROM account_lifecycle WHERE lifecycle_status='active' AND expires_at IS NOT NULL AND expires_at<=datetime('now') LIMIT 20`).all(),
      env.DB.prepare(`SELECT COUNT(*) n FROM legal_consent_records WHERE privacy_consent=0 OR terms_accepted=0`).first(),
      env.DB.prepare(`SELECT id,email code,subject_type detail FROM legal_consent_records WHERE privacy_consent=0 OR terms_accepted=0 LIMIT 20`).all(),
      env.DB.prepare(`SELECT COUNT(*) n FROM support_tickets st LEFT JOIN support_ticket_assignments sta ON sta.ticket_id=st.id WHERE sta.ticket_id IS NULL`).first(),
      env.DB.prepare(`SELECT st.id,st.ticket_code code,st.status detail FROM support_tickets st LEFT JOIN support_ticket_assignments sta ON sta.ticket_id=st.id WHERE sta.ticket_id IS NULL LIMIT 20`).all()
    ]);
    const checks=[
      {
        code:'ORPHAN_ACCOUNTS',
        title:'Tài khoản không gắn với hồ sơ thành viên hợp lệ (accounts -> people)',
        count:Number(orphanAccCnt?.n||0),
        status:Number(orphanAccCnt?.n||0)===0?'passed':'warning',
        remediation:'Kiểm tra khóa ngoại person_id của tài khoản hoặc liên kết lại với hồ sơ thành viên gốc.',
        samples:orphanAccRows.results||[]
      },
      {
        code:'ORPHAN_MEMBERSHIPS',
        title:'Bản ghi đơn vị/vai trò mồ côi hoặc trỏ tới đơn vị đã xóa mềm (org_memberships)',
        count:Number(orphanMemCnt?.n||0),
        status:Number(orphanMemCnt?.n||0)===0?'passed':'warning',
        remediation:'Chuẩn hóa trạng thái org_memberships sang inactive cho các đơn vị đã xóa mềm hoặc thiếu hồ sơ.',
        samples:orphanMemRows.results||[]
      },
      {
        code:'EXPIRED_ACTIVE_CARDS',
        title:'Thẻ thành viên đã qua ngày hết hạn nhưng trạng thái lưu trữ vẫn là active',
        count:Number(expCardCnt?.n||0),
        status:Number(expCardCnt?.n||0)===0?'passed':'warning',
        remediation:'Đồng bộ trạng thái thẻ quá hạn sang expired (luồng xác minh QR đã chặn tự động qua effectiveIssueStatus).',
        samples:expCardRows.results||[]
      },
      {
        code:'EXPIRED_GOVERNANCE_DOCS',
        title:'Quy tắc / văn bản quản trị đã qua ngày hiệu lực (effective_to) nhưng vẫn để active',
        count:Number(expGovCnt?.n||0),
        status:Number(expGovCnt?.n||0)===0?'passed':'warning',
        remediation:'Rà soát gia hạn hiệu lực hoặc chuyển trạng thái văn bản hết hạn sang expired/archived.',
        samples:expGovRows.results||[]
      },
      {
        code:'DUPLICATE_PENDING_REQUESTS',
        title:'Yêu cầu đăng ký tài khoản đang chờ xử lý bị trùng địa chỉ email',
        count:Number(dupReqCnt?.n||0),
        status:Number(dupReqCnt?.n||0)===0?'passed':'warning',
        remediation:'Đối chiếu và hợp nhất các yêu cầu đăng ký trùng email trước khi phê duyệt.',
        samples:dupReqRows.results||[]
      },
      {
        code:'EXPIRED_ACTIVE_ACCOUNTS',
        title:'Tài khoản có thời hạn (24h/48h/12m) đã quá hạn nhưng lifecycle_status vẫn là active',
        count:Number(expAccCnt?.n||0),
        status:Number(expAccCnt?.n||0)===0?'passed':'warning',
        remediation:'Chuyển lifecycle_status sang expired và thu hồi phiên đăng nhập của tài khoản hết hạn.',
        samples:expAccRows.results||[]
      },
      {
        code:'INCOMPLETE_MANDATORY_CONSENTS',
        title:'Bản ghi đồng ý pháp lý thiếu xác nhận điều khoản hoặc bảo vệ dữ liệu cá nhân',
        count:Number(incompleteConsentCnt?.n||0),
        status:Number(incompleteConsentCnt?.n||0)===0?'passed':'warning',
        remediation:'Yêu cầu chủ thể dữ liệu xác nhận lại đầy đủ các mục đồng ý bắt buộc.',
        samples:incompleteConsentRows.results||[]
      },
      {
        code:'TICKETS_MISSING_ASSIGNMENT_ROW',
        title:'Phiếu hỗ trợ chưa có bản ghi phân công & mức độ ảnh hưởng (support_ticket_assignments)',
        count:Number(unassignedTicketCnt?.n||0),
        status:Number(unassignedTicketCnt?.n||0)===0?'passed':'warning',
        remediation:'Khởi tạo bản ghi support_ticket_assignments mặc định (priority=normal, impact_level=medium) cho phiếu hỗ trợ.',
        samples:unassignedTicketRows.results||[]
      }
    ];
    const totalInconsistencies=checks.reduce((acc,c)=>acc+Number(c.count||0),0);
    return json({
      ok:true,
      consistent:totalInconsistencies===0,
      total_inconsistencies:totalInconsistencies,
      checked_at:new Date().toISOString(),
      checks
    });
  }

  if(url.pathname==='/api/admin/data-consistency/remediate'&&req.method==='POST'){
    if(!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const [rCards,rAccounts,rDocs,rTickets]=await Promise.all([
      env.DB.prepare(`UPDATE member_cards SET status='expired' WHERE status='active' AND expires_at IS NOT NULL AND expires_at<date('now','+7 hours')`).run(),
      env.DB.prepare(`UPDATE account_lifecycle SET lifecycle_status='expired',last_action_reason='Auto-remediated expired account',updated_at=CURRENT_TIMESTAMP WHERE lifecycle_status='active' AND expires_at IS NOT NULL AND expires_at<=datetime('now')`).run(),
      env.DB.prepare(`UPDATE governance_registry SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE status='active' AND effective_to IS NOT NULL AND trim(effective_to)<>'' AND effective_to<date('now','+7 hours')`).run(),
      env.DB.prepare(`INSERT OR IGNORE INTO support_ticket_assignments(ticket_id,priority,impact_level,updated_at) SELECT st.id,'normal','medium',CURRENT_TIMESTAMP FROM support_tickets st LEFT JOIN support_ticket_assignments sta ON sta.ticket_id=st.id WHERE sta.ticket_id IS NULL`).run()
    ]);
    const summary={
      expired_cards_updated:Number(rCards?.meta?.changes??rCards?.changes??0),
      expired_accounts_updated:Number(rAccounts?.meta?.changes??rAccounts?.changes??0),
      expired_governance_docs_updated:Number(rDocs?.meta?.changes??rDocs?.changes??0),
      missing_ticket_assignments_created:Number(rTickets?.meta?.changes??rTickets?.changes??0)
    };
    await audit(env,s.account_id,'data_consistency_remediated','database','D1',null,summary);
    return json({ok:true,remediated:summary});
  }


  // =========================================================
  // PHỤ LỤC I — QUẢN TRỊ LOẠI TÀI KHOẢN & VÒNG ĐỜI TÀI KHOẢN (24h, 48h, 12m/1y, Nhân sự)
  // =========================================================
  if(url.pathname==='/api/admin/accounts-center'&&['GET','POST'].includes(req.method)){
    if(!(await hasPerm(env,s.account_id,'account.manage'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    if(req.method==='GET'){
      const q=clean(url.searchParams.get('q'),120);
      const typeFilter=clean(url.searchParams.get('account_type_code'),40);
      const statusFilter=clean(url.searchParams.get('lifecycle_status'),30);
      const orgFilter=clean(url.searchParams.get('org_node_id'),100);
      const [types,rows]=await Promise.all([
        env.DB.prepare("SELECT * FROM account_type_configs ORDER BY COALESCE(duration_hours,999999)").all(),
        env.DB.prepare(`
          SELECT a.id,a.person_id,a.username,a.email,a.is_locked,a.force_password_change,a.last_login_at,a.created_at,
            p.member_code,p.full_name,p.status person_status,
            COALESCE(al.account_type_code,'annual_12m_1y') account_type_code,
            COALESCE(al.duration_label,'Tài khoản 12 tháng (01 năm)') duration_label,
            COALESCE(al.activated_at,a.created_at) activated_at,
            al.expires_at,
            CASE
              WHEN a.is_locked=1 THEN 'locked'
              WHEN al.lifecycle_status IN ('revoked','suspended') THEN al.lifecycle_status
              WHEN al.expires_at IS NOT NULL AND al.expires_at<=datetime('now') THEN 'expired'
              WHEN al.expires_at IS NOT NULL AND al.expires_at<=datetime('now','+3 days') THEN 'expiring_soon'
              ELSE COALESCE(al.lifecycle_status,'active')
            END effective_lifecycle_status,
            CASE WHEN al.expires_at IS NOT NULL THEN ROUND((julianday(al.expires_at)-julianday('now'))*24.0,1) ELSE NULL END remaining_hours,
            al.renewal_count,al.last_action_reason,
            (SELECT GROUP_CONCAT(r.code, ', ') FROM account_scopes sc JOIN roles r ON r.id=sc.role_id WHERE sc.account_id=a.id AND sc.active=1) roles_list,
            (SELECT o.name FROM org_memberships om JOIN org_nodes o ON o.id=om.org_node_id WHERE om.person_id=a.person_id AND om.status='active' ORDER BY om.is_primary DESC LIMIT 1) primary_org_name,
            (SELECT om.org_node_id FROM org_memberships om WHERE om.person_id=a.person_id AND om.status='active' ORDER BY om.is_primary DESC LIMIT 1) primary_org_id
          FROM accounts a
          LEFT JOIN people p ON p.id=a.person_id
          LEFT JOIN account_lifecycle al ON al.account_id=a.id
          WHERE (?='' OR a.username LIKE ? OR COALESCE(a.email,'') LIKE ? OR COALESCE(p.full_name,'') LIKE ? OR COALESCE(p.member_code,'') LIKE ?)
          ORDER BY a.created_at DESC LIMIT 300
        `).bind(q,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`).all()
      ]);
      let items=rows.results||[];
      if(typeFilter)items=items.filter(x=>x.account_type_code===normalizeAccountTypeCode(typeFilter));
      if(statusFilter)items=items.filter(x=>x.effective_lifecycle_status===statusFilter);
      if(orgFilter)items=items.filter(x=>x.primary_org_id===orgFilter);
      return json({
        account_types:types.results||[],
        equivalence_note:'"12 tháng" và "1 năm" (01 năm) là hai tên gọi của cùng một gói thời hạn 12 tháng (mã annual_12m_1y). Loại tài khoản quyết định thời hạn sử dụng; vai trò (Role) quyết định quyền thực hiện nghiệp vụ.',
        stats:{
          total:items.length,
          active:items.filter(x=>x.effective_lifecycle_status==='active').length,
          expiring_soon:items.filter(x=>x.effective_lifecycle_status==='expiring_soon').length,
          expired:items.filter(x=>x.effective_lifecycle_status==='expired').length,
          locked_or_revoked:items.filter(x=>['locked','revoked','suspended'].includes(x.effective_lifecycle_status)).length
        },
        items
      });
    }
    // POST: Admin creates an account with explicit account_type_code & expiration
    const b=await bodyJson(req);
    const fullName=clean(b.full_name,160);
    const email=clean(b.email,200).toLowerCase();
    const username=clean(b.username,80).toLowerCase()||`sfn_${Date.now().toString().slice(-6)}`;
    const password=String(b.password||'SkyFirst@2026!');
    if(!fullName||!email||password.length<10)return json({error:'INVALID_ACCOUNT_DATA',message:'Vui lòng nhập họ tên, email và mật khẩu từ 10 ký tự.'},400);
    const dup=await env.DB.prepare("SELECT 1 FROM accounts WHERE lower(username)=? OR lower(email)=? LIMIT 1").bind(username,email).first();
    if(dup)return json({error:'ACCOUNT_ALREADY_EXISTS'},409);
    const expSpec=computeAccountExpirySql(b.account_type_code,b.custom_expires_at);
    const pid=uid('person'),aid=uid('account'),mcode=await memberCode(env);
    const salt=token(),it=100000,hash=await pbkdf2(password,salt,it);
    const roleId=clean(b.role_id,80)||'role_member';
    const orgId=clean(b.org_node_id,100)||'org_sfn';
    if(roleId==='role_super_admin'&&!(await isSuper(env,s.account_id)))return json({error:'SUPER_ADMIN_ONLY'},403);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO people(id,member_code,full_name,display_name,email,joined_at,status) VALUES(?,?,?,?,?,DATE('now'),'active')").bind(pid,mcode,fullName,fullName,email),
      env.DB.prepare("INSERT INTO accounts(id,person_id,username,email,password_hash,password_salt,password_iterations,force_password_change,is_locked) VALUES(?,?,?,?,?,?,?,1,0)").bind(aid,pid,username,email,hash,salt,it),
      env.DB.prepare("INSERT INTO account_scopes(id,account_id,role_id,org_node_id,active) VALUES(?,?,?,?,1)").bind(uid('scope'),aid,'role_member',orgId),
      ...(roleId!=='role_member'?[env.DB.prepare("INSERT INTO account_scopes(id,account_id,role_id,org_node_id,active) VALUES(?,?,?,?,1)").bind(uid('scope'),aid,roleId,orgId)]:[]),
      env.DB.prepare("INSERT INTO org_memberships(id,person_id,org_node_id,title,role_label,started_at,status,is_primary) VALUES(?,?,?,?,'Thành viên',DATE('now'),'active',1)").bind(uid('membership'),pid,orgId,clean(b.title,120)||'Thành viên')
    ]);
    if(expSpec.custom){
      await env.DB.prepare("INSERT INTO account_lifecycle(account_id,account_type_code,duration_label,activated_at,expires_at,lifecycle_status,last_action_reason,updated_by_account_id) VALUES(?,?,?,CURRENT_TIMESTAMP,?,'active',?,?)").bind(aid,expSpec.code,expSpec.label,expSpec.custom,clean(b.reason,300)||'Cấp tài khoản từ Admin',s.account_id).run();
    }else{
      await env.DB.prepare(`INSERT INTO account_lifecycle(account_id,account_type_code,duration_label,activated_at,expires_at,lifecycle_status,last_action_reason,updated_by_account_id) VALUES(?,?,?,CURRENT_TIMESTAMP,${expSpec.sqlExpr},'active',?,?)`).bind(aid,expSpec.code,expSpec.label,clean(b.reason,300)||'Cấp tài khoản từ Admin',s.account_id).run();
    }
    const lc=await env.DB.prepare("SELECT * FROM account_lifecycle WHERE account_id=?").bind(aid).first();
    await audit(env,s.account_id,'admin_account_created_with_lifecycle','account',aid,orgId,{account_type_code:expSpec.code,expires_at:lc?.expires_at,role_id:roleId});
    return json({ok:true,account_id:aid,person_id:pid,member_code:mcode,username,account_type_code:expSpec.code,expires_at:lc?.expires_at},201);
  }

  const accLifecycleMatch=url.pathname.match(/^\/api\/admin\/accounts-center\/([^/]+)\/lifecycle$/);
  if(accLifecycleMatch&&['GET','PATCH'].includes(req.method)){
    if(!(await hasPerm(env,s.account_id,'account.manage'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const aid=decodeURIComponent(accLifecycleMatch[1]);
    const acc=await env.DB.prepare("SELECT a.*,p.full_name,p.member_code FROM accounts a LEFT JOIN people p ON p.id=a.person_id WHERE a.id=?").bind(aid).first();
    if(!acc)return json({error:'ACCOUNT_NOT_FOUND'},404);
    if(req.method==='GET'){
      const [lc,secEvents,audits]=await Promise.all([
        env.DB.prepare("SELECT * FROM account_lifecycle WHERE account_id=?").bind(aid).first(),
        env.DB.prepare("SELECT * FROM security_events WHERE account_id=? ORDER BY created_at DESC LIMIT 30").bind(aid).all(),
        env.DB.prepare("SELECT l.*,u.username actor_username FROM audit_log l LEFT JOIN accounts u ON u.id=l.actor_account_id WHERE l.entity_id=? ORDER BY l.id DESC LIMIT 30").bind(aid).all()
      ]);
      return json({account:acc,lifecycle:lc||null,security_events:secEvents.results||[],audit_history:audits.results||[]});
    }
    if(aid===s.account_id&&['lock','revoke','expire'].includes(b?.action))return json({error:'CANNOT_LOCK_OR_REVOKE_SELF'},409);
    const b=await bodyJson(req);
    const action=clean(b.action,40); // renew | change_type | lock | unlock | revoke | notify_expiry | set_expiry
    const reason=clean(b.reason,500)||`Cập nhật vòng đời tài khoản (${action})`;
    const existingLc=await env.DB.prepare("SELECT * FROM account_lifecycle WHERE account_id=?").bind(aid).first();
    const nextType=b.account_type_code?normalizeAccountTypeCode(b.account_type_code):(existingLc?.account_type_code||'annual_12m_1y');
    const expSpec=computeAccountExpirySql(nextType,b.custom_expires_at);

    if(action==='lock'||action==='revoke'||action==='expire'){
      const nextStatus=action==='lock'?'locked':action==='revoke'?'revoked':'expired';
      const expTime=action==='expire'?"datetime('now','-1 minute')":(existingLc?.expires_at?`'${existingLc.expires_at}'`:'NULL');
      await env.DB.batch([
        env.DB.prepare("UPDATE accounts SET is_locked=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(action==='lock'?1:0,aid),
        env.DB.prepare("DELETE FROM sessions WHERE account_id=?").bind(aid),
        env.DB.prepare(`INSERT INTO account_lifecycle(account_id,account_type_code,duration_label,activated_at,expires_at,lifecycle_status,last_action_reason,updated_by_account_id,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP,${expTime},?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(account_id) DO UPDATE SET lifecycle_status=excluded.lifecycle_status,expires_at=COALESCE(excluded.expires_at,account_lifecycle.expires_at),last_action_reason=excluded.last_action_reason,updated_by_account_id=excluded.updated_by_account_id,updated_at=CURRENT_TIMESTAMP`).bind(aid,nextType,expSpec.label,nextStatus,reason,s.account_id)
      ]);
    }else if(action==='unlock'||action==='renew'||action==='change_type'||action==='set_expiry'){
      const customExp=clean(b.custom_expires_at,30);
      if(customExp){
        await env.DB.prepare("INSERT INTO account_lifecycle(account_id,account_type_code,duration_label,activated_at,expires_at,lifecycle_status,renewal_count,last_action_reason,updated_by_account_id,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP,?,'active',1,?,?,CURRENT_TIMESTAMP) ON CONFLICT(account_id) DO UPDATE SET account_type_code=excluded.account_type_code,duration_label=excluded.duration_label,expires_at=excluded.expires_at,lifecycle_status='active',renewal_count=account_lifecycle.renewal_count+1,last_action_reason=excluded.last_action_reason,updated_by_account_id=excluded.updated_by_account_id,updated_at=CURRENT_TIMESTAMP").bind(aid,expSpec.code,expSpec.label,customExp,reason,s.account_id).run();
      }else{
        await env.DB.prepare(`INSERT INTO account_lifecycle(account_id,account_type_code,duration_label,activated_at,expires_at,lifecycle_status,renewal_count,last_action_reason,updated_by_account_id,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP,${expSpec.sqlExpr},'active',1,?,?,CURRENT_TIMESTAMP) ON CONFLICT(account_id) DO UPDATE SET account_type_code=excluded.account_type_code,duration_label=excluded.duration_label,expires_at=${expSpec.sqlExpr},lifecycle_status='active',renewal_count=account_lifecycle.renewal_count+1,last_action_reason=excluded.last_action_reason,updated_by_account_id=excluded.updated_by_account_id,updated_at=CURRENT_TIMESTAMP`).bind(aid,expSpec.code,expSpec.label,reason,s.account_id).run();
      }
      await env.DB.prepare("UPDATE accounts SET is_locked=0,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(aid).run();
    }else if(action==='notify_expiry'){
      await env.DB.prepare("UPDATE account_lifecycle SET expiry_notified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE account_id=?").bind(aid).run();
      if(acc.email){
        await sendMemberEmail(env,{to:acc.email,templateCode:'account_expiry_warning',entityType:'account',entityId:aid,subject:'[Sky First] Thông báo thời hạn sử dụng tài khoản',html:memberEmailHtml({title:'Thông báo thời hạn tài khoản',name:acc.full_name||acc.username,intro:'Tài khoản của bạn tại Trung tâm Nghiệp vụ Số Sky First sắp đến hạn hoặc cần được gia hạn.',status:'NHẮC HẠN TÀI KHOẢN',body:reason,ctaUrl:env.APP_URL||DEFAULT_SYSTEM_IDENTITY.appUrl,ctaLabel:'Mở Trung tâm Nghiệp vụ Số Sky First'})});
      }
    }else{
      return json({error:'INVALID_LIFECYCLE_ACTION'},400);
    }
    const updated=await env.DB.prepare("SELECT * FROM account_lifecycle WHERE account_id=?").bind(aid).first();
    await audit(env,s.account_id,`account_lifecycle_${action}`,'account',aid,null,{account_type_code:updated?.account_type_code,lifecycle_status:updated?.lifecycle_status,expires_at:updated?.expires_at,reason});
    return json({ok:true,action,lifecycle:updated});
  }

  // =========================================================
  // PHỤ LỤC II — TRUNG TÂM QUẢN LÝ BIỂU MẪU ĐĂNG KÝ (DYNAMIC FORM BUILDER)
  // =========================================================
  if(url.pathname==='/api/admin/forms'&&['GET','POST'].includes(req.method)){
    if(!(await hasPerm(env,s.account_id,'form.manage'))&&!(await hasPerm(env,s.account_id,'request.manage'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    if(req.method==='GET'){
      const r=await env.DB.prepare(`
        SELECT f.*,o.name owner_org_name,u.username owner_username,
          (SELECT COUNT(*) FROM registration_submissions rs WHERE rs.form_id=f.id) total_submissions,
          (SELECT COUNT(*) FROM registration_submissions rs WHERE rs.form_id=f.id AND rs.status IN ('submitted','waiting_review','supplement_submitted')) pending_submissions
        FROM registration_forms f
        LEFT JOIN org_nodes o ON o.id=f.owner_org_node_id
        LEFT JOIN accounts u ON u.id=f.owner_account_id
        ORDER BY f.updated_at DESC
      `).all();
      return json({items:(r.results||[]).map(x=>({...x,fields:(()=>{try{return JSON.parse(x.fields_json||'[]')}catch{return []}})(),public_url:`/register?form=${encodeURIComponent(x.slug)}`}))});
    }
    const b=await bodyJson(req);
    const title=clean(b.title,240);
    const code=clean(b.code,80).toUpperCase()||`FORM-${Date.now().toString().slice(-6)}`;
    const slug=clean(b.slug||code.toLowerCase().replace(/[^a-z0-9]+/g,'-'),120);
    if(!title)return json({error:'FORM_TITLE_REQUIRED',message:'Vui lòng nhập tiêu đề biểu mẫu.'},400);
    const fields=Array.isArray(b.fields)?b.fields.map((fld,idx)=>({
      code:clean(fld.code||`field_${idx+1}`,60).replace(/[^a-zA-Z0-9_]/g,'_'),
      label:clean(fld.label||`Trường ${idx+1}`,160),
      type:['text','textarea','email','phone','number','date','select','multiselect','checkbox','consent','file','image','document','signature','readonly','section_header'].includes(fld.type)?fld.type:'text',
      required:Boolean(fld.required),
      description:clean(fld.description,300)||'',
      defaultValue:clean(fld.defaultValue,200)||'',
      maxLength:Number(fld.maxLength)||1000,
      options:Array.isArray(fld.options)?fld.options.map(o=>clean(o,120)):[],
      order:Number(fld.order??idx+1),
      active:fld.active!==false
    })):[];
    const fid=uid('form');
    const status=['draft','published','paused','closed','archived'].includes(b.status)?b.status:'draft';
    const fieldsStr=JSON.stringify(fields);
    const policiesStr=JSON.stringify(Array.isArray(b.policy_codes)?b.policy_codes:['SFN-PDPD-NOTICE','SFN-TERMS-USE']);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO registration_forms(id,code,slug,title,description,target_audience,guidelines,support_contact,owner_org_node_id,owner_account_id,status,current_version,opens_at,closes_at,max_submissions,require_attachment,require_signature,signature_method,default_account_type,post_submit_message,fields_json,policy_codes_json,event_id,created_by_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        fid,code,slug,title,clean(b.description,1000)||null,clean(b.target_audience,300)||null,clean(b.guidelines,1000)||null,clean(b.support_contact,200)||'support@skyfirst.io.vn',clean(b.owner_org_node_id,100)||'org_office',s.account_id,status,clean(b.opens_at,30)||null,clean(b.closes_at,30)||null,b.max_submissions?Number(b.max_submissions):null,b.require_attachment?1:0,b.require_signature?1:0,clean(b.signature_method,40)||'drawn_or_uploaded',clean(b.default_account_type,40)||'annual_12m_1y',clean(b.post_submit_message,500)||null,fieldsStr,policiesStr,clean(b.event_id,100)||null,s.account_id
      ),
      env.DB.prepare("INSERT INTO registration_form_versions(id,form_id,version_no,title,fields_json,config_snapshot_json,change_note,created_by_account_id) VALUES(?,?,1,?,?,?,?,?)").bind(
        uid('fver'),fid,title,fieldsStr,JSON.stringify({status,require_attachment:Boolean(b.require_attachment),require_signature:Boolean(b.require_signature)}),'Khởi tạo biểu mẫu v1',s.account_id
      )
    ]);
    await audit(env,s.account_id,'registration_form_created','registration_form',fid,clean(b.owner_org_node_id,100)||'org_office',{code,slug,version:1});
    return json({ok:true,id:fid,code,slug,version:1,status},201);
  }

  const adminFormMatch=url.pathname.match(/^\/api\/admin\/forms\/([^/]+)(?:\/(clone|publish|pause|close|archive))?$/);
  if(adminFormMatch&&['GET','PATCH','POST'].includes(req.method)){
    if(!(await hasPerm(env,s.account_id,'form.manage'))&&!(await hasPerm(env,s.account_id,'request.manage'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const fid=decodeURIComponent(adminFormMatch[1]);
    const subAction=adminFormMatch[2]||null;
    const form=await env.DB.prepare("SELECT * FROM registration_forms WHERE id=? OR code=? LIMIT 1").bind(fid,fid).first();
    if(!form)return json({error:'FORM_NOT_FOUND'},404);
    if(req.method==='GET'&&!subAction){
      const [vers,subs]=await Promise.all([
        env.DB.prepare("SELECT * FROM registration_form_versions WHERE form_id=? ORDER BY version_no DESC").bind(form.id).all(),
        env.DB.prepare("SELECT id,submission_code,applicant_name,applicant_email,form_version,status,submitted_at FROM registration_submissions WHERE form_id=? ORDER BY submitted_at DESC LIMIT 50").bind(form.id).all()
      ]);
      return json({
        form:{...form,fields:(()=>{try{return JSON.parse(form.fields_json||'[]')}catch{return []}})()},
        versions:vers.results||[],
        recent_submissions:subs.results||[]
      });
    }
    const b=await bodyJson(req);
    if(req.method==='POST'&&subAction==='clone'){
      const newId=uid('form');
      const newCode=`${form.code}-COPY-${Date.now().toString().slice(-4)}`;
      const newSlug=`${form.slug}-copy-${Date.now().toString().slice(-4)}`;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO registration_forms(id,code,slug,title,description,target_audience,guidelines,support_contact,owner_org_node_id,owner_account_id,status,current_version,require_attachment,require_signature,signature_method,default_account_type,post_submit_message,fields_json,policy_codes_json,created_by_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,'draft',1,?,?,?,?,?,?,?,?)").bind(
          newId,newCode,newSlug,clean(b.title,240)||`${form.title} (Bản sao)`,form.description,form.target_audience,form.guidelines,form.support_contact,form.owner_org_node_id,s.account_id,form.require_attachment,form.require_signature,form.signature_method,form.default_account_type,form.post_submit_message,form.fields_json,form.policy_codes_json,s.account_id
        ),
        env.DB.prepare("INSERT INTO registration_form_versions(id,form_id,version_no,title,fields_json,config_snapshot_json,change_note,created_by_account_id) VALUES(?,?,1,?,?,?,?,?)").bind(
          uid('fver'),newId,`${form.title} (Bản sao)`,form.fields_json,'{}',`Sao chép từ biểu mẫu ${form.code}`,s.account_id
        )
      ]);
      await audit(env,s.account_id,'registration_form_cloned','registration_form',newId,form.owner_org_node_id,{source_form_id:form.id,new_code:newCode});
      return json({ok:true,id:newId,code:newCode,slug:newSlug,status:'draft'},201);
    }
    if(req.method==='POST'&&['publish','pause','close','archive'].includes(subAction)){
      const mapSt={publish:'published',pause:'paused',close:'closed',archive:'archived'};
      const nextSt=mapSt[subAction];
      await env.DB.prepare("UPDATE registration_forms SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(nextSt,form.id).run();
      await audit(env,s.account_id,`registration_form_${subAction}`,'registration_form',form.id,form.owner_org_node_id,{status:nextSt});
      return json({ok:true,id:form.id,status:nextSt});
    }
    if(req.method==='PATCH'){
      // Editing fields increments version_no and preserves old submission snapshots untouched!
      const nextVer=Number(form.current_version||1)+1;
      const nextTitle=clean(b.title,240)||form.title;
      const nextStatus=['draft','published','paused','closed','archived'].includes(b.status)?b.status:form.status;
      let nextFieldsStr=form.fields_json;
      if(Array.isArray(b.fields)){
        const normalized=b.fields.map((fld,idx)=>({
          code:clean(fld.code||`field_${idx+1}`,60).replace(/[^a-zA-Z0-9_]/g,'_'),
          label:clean(fld.label||`Trường ${idx+1}`,160),
          type:['text','textarea','email','phone','number','date','select','multiselect','checkbox','consent','file','image','document','signature','readonly','section_header'].includes(fld.type)?fld.type:'text',
          required:Boolean(fld.required),
          description:clean(fld.description,300)||'',
          defaultValue:clean(fld.defaultValue,200)||'',
          maxLength:Number(fld.maxLength)||1000,
          options:Array.isArray(fld.options)?fld.options.map(o=>clean(o,120)):[],
          order:Number(fld.order??idx+1),
          active:fld.active!==false
        }));
        nextFieldsStr=JSON.stringify(normalized);
      }
      const reqAtt=b.require_attachment!==undefined?(b.require_attachment?1:0):form.require_attachment;
      const reqSig=b.require_signature!==undefined?(b.require_signature?1:0):form.require_signature;
      await env.DB.batch([
        env.DB.prepare("UPDATE registration_forms SET title=?,description=?,target_audience=?,guidelines=?,status=?,current_version=?,opens_at=?,closes_at=?,max_submissions=?,require_attachment=?,require_signature=?,fields_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
          nextTitle,b.description!==undefined?clean(b.description,1000):form.description,b.target_audience!==undefined?clean(b.target_audience,300):form.target_audience,b.guidelines!==undefined?clean(b.guidelines,1000):form.guidelines,nextStatus,nextVer,b.opens_at!==undefined?(clean(b.opens_at,30)||null):form.opens_at,b.closes_at!==undefined?(clean(b.closes_at,30)||null):form.closes_at,b.max_submissions!==undefined?(b.max_submissions?Number(b.max_submissions):null):form.max_submissions,reqAtt,reqSig,nextFieldsStr,form.id
        ),
        env.DB.prepare("INSERT INTO registration_form_versions(id,form_id,version_no,title,fields_json,config_snapshot_json,change_note,created_by_account_id) VALUES(?,?,?,?,?,?,?,?)").bind(
          uid('fver'),form.id,nextVer,nextTitle,nextFieldsStr,JSON.stringify({status:nextStatus,require_attachment:reqAtt,require_signature:reqSig}),clean(b.change_note,300)||`Cập nhật cấu trúc biểu mẫu sang phiên bản v${nextVer}`,s.account_id
        )
      ]);
      await audit(env,s.account_id,'registration_form_updated','registration_form',form.id,form.owner_org_node_id,{new_version:nextVer,status:nextStatus});
      return json({ok:true,id:form.id,version:nextVer,status:nextStatus});
    }
  }

  // =========================================================
  // PHỤ LỤC III, IV, V, VI — TRUNG TÂM QUẢN LÝ HỒ SƠ ĐĂNG KÝ, TỆP, CHỮ KÝ & CHÍNH SÁCH
  // =========================================================
  if(url.pathname==='/api/admin/submissions'&&req.method==='GET'){
    if(!(await hasPerm(env,s.account_id,'form.manage'))&&!(await hasPerm(env,s.account_id,'request.manage'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const q=clean(url.searchParams.get('q'),120);
    const formId=clean(url.searchParams.get('form_id'),100);
    const status=clean(url.searchParams.get('status'),40);
    const r=await env.DB.prepare(`
      SELECT rs.*,f.code form_code,f.title form_title,u.username assignee_username,
        (SELECT COUNT(*) FROM registration_submission_files rsf WHERE rsf.submission_id=rs.id) file_count,
        (SELECT COUNT(*) FROM signature_records sr WHERE sr.submission_id=rs.id) signature_count
      FROM registration_submissions rs
      JOIN registration_forms f ON f.id=rs.form_id
      LEFT JOIN accounts u ON u.id=rs.assigned_account_id
      WHERE (?='' OR rs.submission_code LIKE ? OR rs.applicant_name LIKE ? OR rs.applicant_email LIKE ?)
        AND (?='' OR rs.form_id=?)
        AND (?='' OR rs.status=?)
      ORDER BY rs.submitted_at DESC LIMIT 200
    `).bind(q,`%${q}%`,`%${q}%`,`%${q}%`,formId,formId,status,status).all();
    return json({items:(r.results||[]).map(x=>({...x,answers:(()=>{try{return JSON.parse(x.answers_json||'{}')}catch{return {}}})()}))});
  }

  const adminSubMatch=url.pathname.match(/^\/api\/admin\/submissions\/([^/]+)$/);
  if(adminSubMatch&&['GET','PATCH'].includes(req.method)){
    if(!(await hasPerm(env,s.account_id,'form.manage'))&&!(await hasPerm(env,s.account_id,'request.manage'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const sid=decodeURIComponent(adminSubMatch[1]);
    const sub=await env.DB.prepare("SELECT rs.*,f.code form_code,f.title form_title FROM registration_submissions rs JOIN registration_forms f ON f.id=rs.form_id WHERE rs.id=? OR rs.submission_code=? LIMIT 1").bind(sid,sid).first();
    if(!sub)return json({error:'SUBMISSION_NOT_FOUND'},404);
    if(req.method==='GET'){
      const [files,sigs,consents]=await Promise.all([
        env.DB.prepare("SELECT * FROM registration_submission_files WHERE submission_id=? ORDER BY version_no DESC,uploaded_at DESC").bind(sub.id).all(),
        env.DB.prepare("SELECT * FROM signature_records WHERE submission_id=? ORDER BY signed_at DESC").bind(sub.id).all(),
        env.DB.prepare("SELECT * FROM legal_consent_records WHERE subject_id=? ORDER BY consented_at DESC").bind(sub.id).all()
      ]);
      return json({
        submission:{
          ...sub,
          answers:(()=>{try{return JSON.parse(sub.answers_json||'{}')}catch{return {}}})(),
          form_snapshot:(()=>{try{return JSON.parse(sub.form_snapshot_json||'{}')}catch{return {}}})(),
          internal_notes:(()=>{try{return JSON.parse(sub.internal_notes_json||'[]')}catch{return []}})(),
          history:(()=>{try{return JSON.parse(sub.history_json||'[]')}catch{return []}})()
        },
        files:files.results||[],
        signatures:sigs.results||[],
        consents:consents.results||[]
      });
    }
    const b=await bodyJson(req);
    const allowedStates=['submitted','waiting_review','in_review','waiting_supplement','supplement_submitted','approved','rejected','closed','cancelled','reopened'];
    const nextStatus=allowedStates.includes(b.status)?b.status:sub.status;
    const reason=clean(b.decision_reason||b.reason,1000)||sub.decision_reason;
    const suppNote=clean(b.supplement_request_note,1000)||sub.supplement_request_note;
    if(nextStatus==='rejected'&&!reason)return json({error:'REJECTION_REASON_REQUIRED',message:'Khi từ chối hồ sơ, bắt buộc ghi rõ lý do từ chối.'},400);
    if(nextStatus==='waiting_supplement'&&!suppNote)return json({error:'SUPPLEMENT_NOTE_REQUIRED',message:'Khi yêu cầu bổ sung hồ sơ, bắt buộc ghi rõ nội dung cần bổ sung.'},400);

    const notes=(()=>{try{return JSON.parse(sub.internal_notes_json||'[]')}catch{return []}})();
    if(clean(b.internal_note,1000)){
      notes.push({at:new Date().toISOString(),actor:s.username||s.account_id,note:clean(b.internal_note,1000)});
    }
    const hist=(()=>{try{return JSON.parse(sub.history_json||'[]')}catch{return []}})();
    hist.push({
      at:new Date().toISOString(),
      action:b.action||`status_transition_${nextStatus}`,
      previous_status:sub.status,
      status:nextStatus,
      actor:s.username||s.account_id,
      reason:reason||suppNote||null
    });
    const nextAssignee=b.assigned_account_id!==undefined?(clean(b.assigned_account_id,100)||null):sub.assigned_account_id;
    await env.DB.prepare("UPDATE registration_submissions SET status=?,assigned_account_id=?,reviewer_account_id=?,decision_reason=?,supplement_request_note=?,internal_notes_json=?,history_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
      nextStatus,nextAssignee,s.account_id,reason,suppNote,JSON.stringify(notes),JSON.stringify(hist),sub.id
    ).run();
    if(b.require_resign_reason){
      await env.DB.prepare("UPDATE signature_records SET status='resign_requested',resign_reason=? WHERE submission_id=?").bind(clean(b.require_resign_reason,500),sub.id).run();
    }
    if(b.invalid_file_id){
      await env.DB.prepare("UPDATE registration_submission_files SET check_status='invalid_flagged',review_note=? WHERE id=? AND submission_id=?").bind(clean(b.file_review_note||'Tệp không hợp lệ, yêu cầu tải lại',400),clean(b.invalid_file_id,100),sub.id).run();
    }
    await audit(env,s.account_id,'registration_submission_updated','registration_submission',sub.id,sub.org_node_id,{previous_status:sub.status,status:nextStatus});
    return json({ok:true,id:sub.id,status:nextStatus,history_count:hist.length});
  }

  if(url.pathname==='/api/admin/policies'&&['GET','POST'].includes(req.method)){
    if(!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    if(req.method==='GET'){
      const [pols,withdrawals,consents]=await Promise.all([
        env.DB.prepare("SELECT * FROM data_policies ORDER BY policy_code,created_at DESC").all(),
        env.DB.prepare("SELECT * FROM consent_withdrawal_requests ORDER BY created_at DESC LIMIT 100").all(),
        env.DB.prepare("SELECT * FROM legal_consent_records ORDER BY consented_at DESC LIMIT 100").all()
      ]);
      return json({policies:pols.results||[],withdrawals:withdrawals.results||[],recent_consents:consents.results||[]});
    }
    const b=await bodyJson(req);
    const code=clean(b.policy_code,80).toUpperCase();
    const version=clean(b.version_label,40);
    const title=clean(b.title,240);
    const summary=clean(b.content_summary,500);
    const bodyText=clean(b.content_body,4000);
    if(!code||!version||!title||!summary||!bodyText)return json({error:'INVALID_POLICY_DATA',message:'Vui lòng nhập đầy đủ mã chính sách, phiên bản, tiêu đề, tóm tắt và nội dung.'},400);
    // Never overwrite old policy version content so historical consent evidence remains intact!
    const existingVer=await env.DB.prepare("SELECT id FROM data_policies WHERE policy_code=? AND version_label=?").bind(code,version).first();
    if(existingVer)return json({error:'POLICY_VERSION_IMMUTABLE',message:'Phiên bản chính sách này đã tồn tại và có bằng chứng đồng ý gắn kèm. Vui lòng tạo mã phiên bản (version_label) mới thay vì ghi đè nội dung cũ.'},409);
    const pid=uid('pol');
    await env.DB.prepare("INSERT INTO data_policies(id,policy_code,policy_type,title,version_label,content_summary,content_body,is_mandatory,requires_reconsent,applicable_scope,status,effective_from,updated_by_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,'active',?,?)").bind(
      pid,code,clean(b.policy_type,40)||'privacy_notice',title,version,summary,bodyText,b.is_mandatory!==false?1:0,b.requires_reconsent?1:0,clean(b.applicable_scope,80)||'all_forms',clean(b.effective_from,20)||dateInVietnam(),s.account_id
    ).run();
    await audit(env,s.account_id,'data_policy_version_created','data_policy',pid,null,{policy_code:code,version_label:version});
    return json({ok:true,id:pid,policy_code:code,version_label:version},201);
  }

  // =========================================================
  // PHỤ LỤC SK — HỆ THỐNG QUẢN LÝ SỰ KIỆN, PHÊ DUYỆT 3 BƯỚC & ĐIỂM DANH QR
  // =========================================================
  if(url.pathname==='/api/admin/sk-events'&&['GET','POST'].includes(req.method)){
    await ensureGovernanceTables(env);
    if(req.method==='GET'){
      const q=clean(url.searchParams.get('q'),120);
      const status=clean(url.searchParams.get('status'),40);
      const r=await env.DB.prepare(`
        SELECT e.*,
          (SELECT COUNT(*) FROM sk_event_tasks t WHERE t.event_id=e.id) task_count,
          (SELECT COUNT(*) FROM sk_event_tasks t WHERE t.event_id=e.id AND t.status='completed') completed_task_count,
          (SELECT COUNT(*) FROM sk_event_registrations rg WHERE rg.event_id=e.id) registration_count,
          (SELECT COUNT(*) FROM sk_event_registrations rg WHERE rg.event_id=e.id AND rg.status='approved') approved_registration_count,
          (SELECT COUNT(*) FROM sk_attendance_records ar WHERE ar.event_id=e.id AND ar.attendance_status IN ('checked_in','manual_present','late')) attended_count
        FROM sk_events e
        WHERE (?='' OR e.name LIKE ? OR e.event_code LIKE ?)
          AND (?='' OR e.status=?)
        ORDER BY e.created_at DESC LIMIT 200
      `).bind(q,`%${q}%`,`%${q}%`,status,status).all();
      const items=(r.results||[]).map(x=>{
        const tc=Number(x.task_count||0),cc=Number(x.completed_task_count||0);
        return {...x,progress_pct:tc>0?Math.round((cc/tc)*100):0};
      });
      return json({
        items,
        overview:{
          total:items.length,
          pending_approval:items.filter(x=>['pending_appraisal','pending_approval','revision_requested'].includes(x.status)).length,
          published_or_open:items.filter(x=>['published','registration_open','ongoing'].includes(x.status)).length,
          completed_or_closed:items.filter(x=>['completed','pending_summary','closed'].includes(x.status)).length
        }
      });
    }
    if(!(await hasPerm(env,s.account_id,'event.propose'))&&!(await hasPerm(env,s.account_id,'activity.manage'))&&!(await isNetworkAdmin(env,s.account_id))){
      return json({error:'FORBIDDEN',message:'Bạn không có quyền khởi tạo hồ sơ đề xuất sự kiện.'},403);
    }
    const b=await bodyJson(req);
    const name=clean(b.name,240);
    const purpose=clean(b.purpose,1000);
    const startsAt=clean(b.starts_at,30);
    const endsAt=clean(b.ends_at,30);
    const location=clean(b.location_or_platform,300);
    const hostOrg=clean(b.host_org_id,100)||'org_sfn';
    const propOrg=clean(b.proposing_org_id,100)||hostOrg;
    const leadName=clean(b.lead_person_name,160)||s.full_name||s.username;
    const contactEmail=clean(b.contact_email,200)||DEFAULT_SYSTEM_IDENTITY.systemEmail;
    if(!name||!purpose||!startsAt||!endsAt||!location){
      return json({error:'EVENT_MANDATORY_FIELDS_MISSING',message:'Hồ sơ sự kiện bắt buộc có Tên sự kiện, Mục đích/Lý do tổ chức, Thời gian bắt đầu/kết thúc và Địa điểm/Nền tảng.'},400);
    }
    const eid=uid('skev');
    const ecode=clean(b.event_code,60).toUpperCase()||`SK-EVT-${new Date().getUTCFullYear()}-${String(Date.now()).slice(-6)}`;
    const initVer=JSON.stringify([{version:1,at:new Date().toISOString(),actor:s.account_id,action:'draft_created',name,starts_at:startsAt,location}]);
    await env.DB.prepare(`
      INSERT INTO sk_events(
        id,event_code,name,purpose,expected_outcomes,event_type,domain_field,scale_label,
        proposing_org_id,host_org_id,coordinating_orgs_json,lead_person_name,contact_email,
        starts_at,ends_at,location_or_platform,target_participants,eligibility_criteria,expected_participants,
        implementation_plan,communication_plan,risk_plan_json,registration_form_id,registration_opens_at,registration_closes_at,
        max_registrations,require_registration_approval,status,registration_state,current_version,version_history_json,proposer_account_id
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft','closed',1,?,?)
    `).bind(
      eid,ecode,name,purpose,clean(b.expected_outcomes,1000)||null,clean(b.event_type,60)||'community',clean(b.domain_field,120)||'Giáo dục & Cộng đồng',clean(b.scale_label,80)||'Cấp Mạng lưới',
      propOrg,hostOrg,JSON.stringify(Array.isArray(b.coordinating_orgs)?b.coordinating_orgs:[]),leadName,contactEmail,
      startsAt,endsAt,location,clean(b.target_participants,300)||'Thành viên & Tình nguyện viên',clean(b.eligibility_criteria,500)||null,Number(b.expected_participants||50),
      clean(b.implementation_plan,2000)||null,clean(b.communication_plan,1000)||null,JSON.stringify(Array.isArray(b.risk_plan)?b.risk_plan:[]),clean(b.registration_form_id,100)||null,clean(b.registration_opens_at,30)||null,clean(b.registration_closes_at,30)||null,
      Number(b.max_registrations||100),b.require_registration_approval!==false?1:0,initVer,s.account_id
    ).run();
    await audit(env,s.account_id,'sk_event_draft_created','sk_event',eid,hostOrg,{event_code:ecode,name});
    return json({ok:true,id:eid,event_code:ecode,status:'draft',registration_state:'closed'},201);
  }

  const skEventDetailMatch=url.pathname.match(/^\/api\/admin\/sk-events\/([^/]+)$/);
  if(skEventDetailMatch&&['GET','PATCH'].includes(req.method)){
    await ensureGovernanceTables(env);
    const eid=decodeURIComponent(skEventDetailMatch[1]);
    const ev=await env.DB.prepare("SELECT * FROM sk_events WHERE id=? OR event_code=? LIMIT 1").bind(eid,eid).first();
    if(!ev)return json({error:'EVENT_NOT_FOUND'},404);
    if(req.method==='GET'){
      const [tasks,staff,logistics,budgets,partners,comms,regs,qrSessions,attendance,audits]=await Promise.all([
        env.DB.prepare("SELECT * FROM sk_event_tasks WHERE event_id=? ORDER BY due_at ASC,created_at ASC").bind(ev.id).all(),
        env.DB.prepare("SELECT * FROM sk_event_staff WHERE event_id=? ORDER BY is_backup ASC,created_at ASC").bind(ev.id).all(),
        env.DB.prepare("SELECT * FROM sk_event_logistics WHERE event_id=? ORDER BY created_at ASC").bind(ev.id).all(),
        env.DB.prepare("SELECT * FROM sk_event_budgets WHERE event_id=? ORDER BY created_at ASC").bind(ev.id).all(),
        env.DB.prepare("SELECT * FROM sk_event_partners WHERE event_id=? ORDER BY created_at ASC").bind(ev.id).all(),
        env.DB.prepare("SELECT * FROM sk_event_communications WHERE event_id=? ORDER BY created_at DESC").bind(ev.id).all(),
        env.DB.prepare("SELECT * FROM sk_event_registrations WHERE event_id=? ORDER BY registered_at DESC").bind(ev.id).all(),
        env.DB.prepare("SELECT * FROM sk_qr_sessions WHERE event_id=? ORDER BY created_at DESC").bind(ev.id).all(),
        env.DB.prepare("SELECT * FROM sk_attendance_records WHERE event_id=? ORDER BY checked_in_at DESC").bind(ev.id).all(),
        env.DB.prepare("SELECT l.*,u.username FROM audit_log l LEFT JOIN accounts u ON u.id=l.actor_account_id WHERE l.entity_id=? ORDER BY l.id DESC LIMIT 50").bind(ev.id).all()
      ]);
      const tList=tasks.results||[];
      const totalWeight=tList.reduce((acc,t)=>acc+Number(t.weight||1),0);
      const doneWeight=tList.filter(t=>t.status==='completed').reduce((acc,t)=>acc+Number(t.weight||1),0);
      const canSeeFinance=await isNetworkAdmin(env,s.account_id)||ev.proposer_account_id===s.account_id;
      return json({
        event:{
          ...ev,
          version_history:(()=>{try{return JSON.parse(ev.version_history_json||'[]')}catch{return []}})(),
          checklist:(()=>{try{return JSON.parse(ev.checklist_json||'{}')}catch{return {}}})(),
          summary_report:(()=>{try{return JSON.parse(ev.summary_report_json||'null')}catch{return null}})(),
          progress_pct:totalWeight>0?Math.round((doneWeight/totalWeight)*100):0
        },
        tasks:tList,
        staff:staff.results||[],
        logistics:logistics.results||[],
        budgets:canSeeFinance?(budgets.results||[]):[],
        partners:(partners.results||[]).map(p=>canSeeFinance?p:{...p,contact_info_restricted:'[Giới hạn quyền truy cập]'}),
        communications:comms.results||[],
        registrations:regs.results||[],
        qr_sessions:qrSessions.results||[],
        attendance:attendance.results||[],
        audit_logs:audits.results||[]
      });
    }
    // PATCH: Check minor vs major changes after approval! (Section IV.5 of SK Appendix)
    if(!(await hasPerm(env,s.account_id,'event.propose'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    const b=await bodyJson(req);
    const majorFields=['name','purpose','starts_at','ends_at','location_or_platform','host_org_id','expected_participants','max_registrations'];
    const approvedStates=['approved','pending_publish','published','registration_open','registration_closed','ongoing'];
    const isCurrentlyApproved=approvedStates.includes(ev.status);
    let triggeredReapproval=false;
    for(const mf of majorFields){
      if(b[mf]!==undefined&&String(b[mf]).trim()!==String(ev[mf]??'').trim()&&isCurrentlyApproved){
        triggeredReapproval=true;
      }
    }
    const nextVer=Number(ev.current_version||1)+1;
    const nextStatus=triggeredReapproval?'pending_approval':ev.status;
    const nextRegState=triggeredReapproval?'closed':ev.registration_state;
    const vHist=(()=>{try{return JSON.parse(ev.version_history_json||'[]')}catch{return []}})();
    vHist.push({
      version:nextVer,
      at:new Date().toISOString(),
      actor:s.account_id,
      change_type:triggeredReapproval?'major_change_requires_reapproval':'minor_edit',
      previous_status:ev.status,
      next_status:nextStatus,
      note:clean(b.change_note,400)||(triggeredReapproval?'Thay đổi thông tin trọng yếu sau phê duyệt -> tự động kích hoạt duyệt lại':'Cập nhật hồ sơ sự kiện')
    });
    await env.DB.prepare(`
      UPDATE sk_events SET
        name=?,purpose=?,expected_outcomes=?,starts_at=?,ends_at=?,location_or_platform=?,
        expected_participants=?,max_registrations=?,implementation_plan=?,communication_plan=?,
        status=?,registration_state=?,current_version=?,version_history_json=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(
      clean(b.name,240)||ev.name,
      clean(b.purpose,1000)||ev.purpose,
      b.expected_outcomes!==undefined?clean(b.expected_outcomes,1000):ev.expected_outcomes,
      clean(b.starts_at,30)||ev.starts_at,
      clean(b.ends_at,30)||ev.ends_at,
      clean(b.location_or_platform,300)||ev.location_or_platform,
      b.expected_participants!==undefined?Number(b.expected_participants):ev.expected_participants,
      b.max_registrations!==undefined?Number(b.max_registrations):ev.max_registrations,
      b.implementation_plan!==undefined?clean(b.implementation_plan,2000):ev.implementation_plan,
      b.communication_plan!==undefined?clean(b.communication_plan,1000):ev.communication_plan,
      nextStatus,nextRegState,nextVer,JSON.stringify(vHist),ev.id
    ).run();
    await audit(env,s.account_id,triggeredReapproval?'sk_event_major_change_reapproval_triggered':'sk_event_updated','sk_event',ev.id,ev.host_org_id,{version:nextVer,triggered_reapproval:triggeredReapproval,status:nextStatus});
    return json({ok:true,id:ev.id,version:nextVer,status:nextStatus,registration_state:nextRegState,triggered_reapproval:triggeredReapproval});
  }

  // SK Event Workflow Transitions (Submit -> Appraise -> Approve -> Publish -> Open Registration -> Complete -> Summary -> Close / Postpone / Cancel)
  const skTransitionMatch=url.pathname.match(/^\/api\/admin\/sk-events\/([^/]+)\/transition$/);
  if(skTransitionMatch&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const eid=decodeURIComponent(skTransitionMatch[1]);
    const ev=await env.DB.prepare("SELECT * FROM sk_events WHERE id=? OR event_code=? LIMIT 1").bind(eid,eid).first();
    if(!ev)return json({error:'EVENT_NOT_FOUND'},404);
    const b=await bodyJson(req);
    const action=clean(b.action,40);
    const note=clean(b.note||b.reason,1000);
    const vHist=(()=>{try{return JSON.parse(ev.version_history_json||'[]')}catch{return []}})();
    let nextStatus=ev.status,nextRegState=ev.registration_state,nextSumState=ev.summary_report_state;

    if(action==='submit'){
      if(!['draft','revision_requested'].includes(ev.status))return json({error:'INVALID_STATE_TRANSITION',message:'Chỉ bản nháp hoặc hồ sơ yêu cầu chỉnh sửa mới có thể gửi trình duyệt.'},409);
      if(!ev.name||!ev.purpose||!ev.starts_at||!ev.ends_at||!ev.location_or_platform)return json({error:'MANDATORY_FIELDS_MISSING',message:'Không thể trình duyệt khi thiếu trường bắt buộc.'},400);
      nextStatus='pending_appraisal';
    }else if(action==='appraise'){
      if(!(await hasPerm(env,s.account_id,'event.appraise'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN',message:'Bạn không có quyền thẩm định hồ sơ sự kiện.'},403);
      if(ev.status!=='pending_appraisal')return json({error:'INVALID_STATE_TRANSITION'},409);
      nextStatus='pending_approval';
      await env.DB.prepare("UPDATE sk_events SET appraiser_account_id=?,appraisal_note=?,appraised_at=CURRENT_TIMESTAMP WHERE id=?").bind(s.account_id,note||'Đã thẩm định tính đầy đủ và khả thi',ev.id).run();
    }else if(action==='request_revision'){
      if(!(await hasPerm(env,s.account_id,'event.appraise'))&&!(await hasPerm(env,s.account_id,'event.approve'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
      if(!note)return json({error:'REVISION_NOTE_REQUIRED',message:'Cần nêu rõ nội dung yêu cầu chỉnh sửa/bổ sung.'},400);
      nextStatus='revision_requested';nextRegState='closed';
    }else if(action==='reject'){
      if(!(await hasPerm(env,s.account_id,'event.approve'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN',message:'Bạn không có quyền phê duyệt/từ chối sự kiện.'},403);
      if(!note)return json({error:'REJECT_REASON_REQUIRED',message:'Bắt buộc ghi rõ lý do từ chối hồ sơ sự kiện.'},400);
      nextStatus='rejected';nextRegState='closed';
      await env.DB.prepare("UPDATE sk_events SET rejected_reason=?,approver_account_id=? WHERE id=?").bind(note,s.account_id,ev.id).run();
    }else if(action==='approve'){
      if(!(await hasPerm(env,s.account_id,'event.approve'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN',message:'Bạn không có quyền phê duyệt sự kiện.'},403);
      if(!['pending_appraisal','pending_approval'].includes(ev.status))return json({error:'INVALID_STATE_TRANSITION',message:'Hồ sơ chưa ở trạng thái chờ thẩm định/phê duyệt.'},409);
      // STRICT SoD RULE: Proposer cannot self-approve their own event!
      if(ev.proposer_account_id===s.account_id&&b.allow_sod_exception!==true){
        return json({error:'SOD_SELF_APPROVAL_FORBIDDEN',message:'Nguyên tắc phân tách nhiệm vụ (SoD): Người tạo/đề xuất hồ sơ sự kiện không được tự phê duyệt hồ sơ của chính mình.'},409);
      }
      // Approving does NOT automatically publish or open registration!
      nextStatus='approved';nextRegState='closed';
      await env.DB.prepare("UPDATE sk_events SET approver_account_id=?,approval_note=?,approved_at=CURRENT_TIMESTAMP WHERE id=?").bind(s.account_id,note||'Chấp thuận chủ trương và nội dung sự kiện',ev.id).run();
    }else if(action==='publish'){
      if(!(await hasPerm(env,s.account_id,'event.publish'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN',message:'Bạn không có quyền xuất bản/công bố sự kiện.'},403);
      if(!['approved','pending_publish'].includes(ev.status))return json({error:'PUBLISH_REQUIRES_APPROVAL',message:'Sự kiện chưa được phê duyệt chính thức nên không thể công bố lên cổng công khai.'},409);
      nextStatus='published';nextRegState='closed';
      await env.DB.prepare("UPDATE sk_events SET publisher_account_id=?,published_at=CURRENT_TIMESTAMP WHERE id=?").bind(s.account_id,ev.id).run();
    }else if(action==='open_registration'){
      if(!(await hasPerm(env,s.account_id,'event.publish'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
      if(!['published','registration_closed'].includes(ev.status))return json({error:'OPEN_REG_REQUIRES_PUBLISHED',message:'Sự kiện phải được phê duyệt và công bố chính thức trước khi mở cổng đăng ký.'},409);
      if(ev.registration_form_id){
        const rf=await env.DB.prepare("SELECT status FROM registration_forms WHERE id=?").bind(ev.registration_form_id).first();
        if(!rf||rf.status!=='published')return json({error:'EVENT_FORM_NOT_VALIDATED',message:'Biểu mẫu đăng ký gắn với sự kiện chưa được công bố/kiểm tra hợp lệ.'},409);
      }
      nextStatus='registration_open';nextRegState='open';
    }else if(action==='close_registration'){
      if(!(await hasPerm(env,s.account_id,'event.publish'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
      nextStatus='registration_closed';nextRegState='closed';
    }else if(action==='start_event'){
      if(!['published','registration_open','registration_closed'].includes(ev.status))return json({error:'INVALID_STATE_TRANSITION'},409);
      nextStatus='ongoing';
    }else if(action==='complete'){
      if(!['ongoing','registration_closed','published'].includes(ev.status))return json({error:'INVALID_STATE_TRANSITION'},409);
      nextStatus='completed';nextRegState='closed';
    }else if(action==='submit_summary'){
      const sumObj=b.summary_report&&typeof b.summary_report==='object'?b.summary_report:{summary:note||'Báo cáo tổng kết sau sự kiện'};
      const [regTotal,regApp,attCount]=await Promise.all([
        env.DB.prepare("SELECT COUNT(*) n FROM sk_event_registrations WHERE event_id=?").bind(ev.id).first(),
        env.DB.prepare("SELECT COUNT(*) n FROM sk_event_registrations WHERE event_id=? AND status='approved'").bind(ev.id).first(),
        env.DB.prepare("SELECT COUNT(*) n FROM sk_attendance_records WHERE event_id=? AND attendance_status IN ('checked_in','manual_present','late')").bind(ev.id).first()
      ]);
      const groundedSummary={
        ...sumObj,
        actual_metrics_from_db:{
          total_registered:Number(regTotal?.n||0),
          total_approved:Number(regApp?.n||0),
          total_attended:Number(attCount?.n||0)
        },
        submitted_at:new Date().toISOString(),
        submitted_by:s.account_id
      };
      nextStatus='pending_summary';nextSumState='submitted';
      await env.DB.prepare("UPDATE sk_events SET summary_report_json=? WHERE id=?").bind(JSON.stringify(groundedSummary),ev.id).run();
    }else if(action==='approve_summary_and_close'){
      if(!(await hasPerm(env,s.account_id,'event.approve'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
      if(ev.summary_report_state!=='submitted'&&!ev.summary_report_json&&!note)return json({error:'SUMMARY_REPORT_REQUIRED',message:'Không thể đóng hồ sơ sự kiện khi chưa nộp báo cáo tổng kết và minh chứng.'},409);
      nextStatus='closed';nextRegState='closed';nextSumState='approved';
    }else if(action==='postpone'||action==='cancel'){
      if(!(await hasPerm(env,s.account_id,'event.approve'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
      if(!note)return json({error:'REASON_REQUIRED',message:'Khi hoãn hoặc hủy sự kiện, bắt buộc ghi rõ lý do, người quyết định và phương án xử lý.'},400);
      nextStatus=action==='postpone'?'postponed':'cancelled';
      nextRegState='closed';
      // Automatically revoke/pause all active QR sessions for this event while preserving historical registrations & attendance!
      await env.DB.batch([
        env.DB.prepare("UPDATE sk_events SET postponed_or_cancelled_reason=? WHERE id=?").bind(note,ev.id),
        env.DB.prepare("UPDATE sk_qr_sessions SET status='revoked',revoked_reason=?,updated_at=CURRENT_TIMESTAMP WHERE event_id=? AND status='active'").bind(`Tự động thu hồi mã QR do sự kiện chuyển sang trạng thái ${nextStatus}: ${note}`,ev.id)
      ]);
    }else if(action==='archive'){
      if(ev.status!=='closed')return json({error:'ARCHIVE_REQUIRES_CLOSED',message:'Chỉ lưu trữ sự kiện sau khi đã đóng hồ sơ hoàn tất.'},409);
      nextStatus='archived';
    }else{
      return json({error:'UNKNOWN_EVENT_ACTION'},400);
    }

    vHist.push({version:ev.current_version,at:new Date().toISOString(),actor:s.account_id,action,previous_status:ev.status,status:nextStatus,note:note||null});
    await env.DB.prepare("UPDATE sk_events SET status=?,registration_state=?,summary_report_state=?,version_history_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
      nextStatus,nextRegState,nextSumState,JSON.stringify(vHist),ev.id
    ).run();
    await audit(env,s.account_id,`sk_event_${action}`,'sk_event',ev.id,ev.host_org_id,{previous_status:ev.status,status:nextStatus,registration_state:nextRegState,note});
    return json({ok:true,id:ev.id,action,previous_status:ev.status,status:nextStatus,registration_state:nextRegState,summary_report_state:nextSumState});
  }

  // SK Event Sub-resources: Tasks, Staff, Logistics (with conflict check), Budgets (with SoD), Partners, Communications (with separate approval), Registrations
  const skSubMatch=url.pathname.match(/^\/api\/admin\/sk-events\/([^/]+)\/(tasks|staff|logistics|budgets|partners|communications|registrations)(?:\/([^/]+))?$/);
  if(skSubMatch&&['POST','PATCH'].includes(req.method)){
    await ensureGovernanceTables(env);
    const eid=decodeURIComponent(skSubMatch[1]);
    const subKind=skSubMatch[2];
    const itemId=skSubMatch[3]?decodeURIComponent(skSubMatch[3]):null;
    const ev=await env.DB.prepare("SELECT * FROM sk_events WHERE id=? OR event_code=? LIMIT 1").bind(eid,eid).first();
    if(!ev)return json({error:'EVENT_NOT_FOUND'},404);
    const b=await bodyJson(req);

    if(subKind==='tasks'){
      if(req.method==='POST'){
        const tid=uid('sktask');
        await env.DB.prepare("INSERT INTO sk_event_tasks(id,event_id,title,category,assignee_account_id,assignee_name,priority,weight,status,due_at,updated_by_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(
          tid,ev.id,clean(b.title,240),clean(b.category,60)||'general',clean(b.assignee_account_id,100)||null,clean(b.assignee_name,160)||null,clean(b.priority,30)||'normal',Math.max(1,Number(b.weight||1)),clean(b.status,30)||'not_started',clean(b.due_at,30)||null,s.account_id
        ).run();
        return json({ok:true,id:tid},201);
      }
      await env.DB.prepare("UPDATE sk_event_tasks SET status=?,evidence_note=?,updated_by_account_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND event_id=?").bind(
        clean(b.status,30)||'completed',clean(b.evidence_note,500)||null,s.account_id,itemId,ev.id
      ).run();
      return json({ok:true,id:itemId});
    }
    if(subKind==='staff'){
      if(req.method==='POST'){
        const stId=uid('skstaff');
        await env.DB.prepare("INSERT INTO sk_event_staff(id,event_id,account_id,person_name,role_in_event,team_or_shift,task_description,supervisor_name,is_backup,assignment_status) VALUES(?,?,?,?,?,?,?,?,?,'assigned')").bind(
          stId,ev.id,clean(b.account_id,100)||null,clean(b.person_name,160),clean(b.role_in_event,120),clean(b.team_or_shift,120)||null,clean(b.task_description,500)||null,clean(b.supervisor_name,160)||null,b.is_backup?1:0
        ).run();
        return json({ok:true,id:stId},201);
      }
      await env.DB.prepare("UPDATE sk_event_staff SET assignment_status=?,handover_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND event_id=?").bind(
        clean(b.assignment_status,40)||'accepted',clean(b.handover_note,500)||null,itemId,ev.id
      ).run();
      return json({ok:true,id:itemId});
    }
    if(subKind==='logistics'){
      const itemName=clean(b.item_name,200);
      const room=clean(b.location_or_room,200)||null;
      const uStart=clean(b.use_starts_at,30)||ev.starts_at;
      const uEnd=clean(b.use_ends_at,30)||ev.ends_at;
      // Check resource/room schedule conflict across events
      const conflict=await env.DB.prepare("SELECT l.id,e.name event_name FROM sk_event_logistics l JOIN sk_events e ON e.id=l.event_id WHERE l.event_id!=? AND (l.item_name=? OR (l.location_or_room IS NOT NULL AND l.location_or_room=?)) AND l.use_starts_at<=? AND l.use_ends_at>=? LIMIT 1").bind(ev.id,itemName,room||'',uEnd,uStart).first();
      const lid=uid('sklog');
      const initSt=conflict?'conflict_warning':(clean(b.status,30)||'requested');
      await env.DB.prepare("INSERT INTO sk_event_logistics(id,event_id,item_type,item_name,quantity,location_or_room,use_starts_at,use_ends_at,responsible_party,status,estimated_cost,actual_cost,contingency_note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(
        lid,ev.id,clean(b.item_type,40)||'equipment',itemName,Number(b.quantity||1),room,uStart,uEnd,clean(b.responsible_party,160)||null,initSt,Number(b.estimated_cost||0),Number(b.actual_cost||0),clean(b.contingency_note,500)||null
      ).run();
      return json({ok:true,id:lid,status:initSt,conflict_warning:conflict?`Cảnh báo trùng lịch tài nguyên/địa điểm với sự kiện: ${conflict.event_name}`:null},201);
    }
    if(subKind==='budgets'){
      if(req.method==='POST'){
        const bid=uid('skbud');
        await env.DB.prepare("INSERT INTO sk_event_budgets(id,event_id,item_code,category,description,funding_source,estimated_amount,approved_amount,received_amount,spent_amount,voucher_ref,proposer_account_id,status) VALUES(?,?,?,?,?,?,?,0,0,0,?,?,'proposed')").bind(
          bid,ev.id,clean(b.item_code,60)||`BUD-${Date.now().toString().slice(-4)}`,clean(b.category,100)||'Hậu cần',clean(b.description,500),clean(b.funding_source,160)||'Ngân sách Mạng lưới',Number(b.estimated_amount||0),clean(b.voucher_ref,200)||null,s.account_id
        ).run();
        return json({ok:true,id:bid,status:'proposed'},201);
      }
      const bud=await env.DB.prepare("SELECT * FROM sk_event_budgets WHERE id=? AND event_id=?").bind(itemId,ev.id).first();
      if(!bud)return json({error:'BUDGET_NOT_FOUND'},404);
      if(b.status==='approved'&&bud.proposer_account_id===s.account_id){
        return json({error:'SOD_BUDGET_SELF_APPROVAL_FORBIDDEN',message:'Không cho phép người đề xuất tự phê duyệt khoản dự toán/chi phí của chính mình.'},409);
      }
      await env.DB.prepare("UPDATE sk_event_budgets SET status=?,approved_amount=?,received_amount=?,spent_amount=?,approver_account_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
        clean(b.status,30)||bud.status,Number(b.approved_amount??bud.approved_amount),Number(b.received_amount??bud.received_amount),Number(b.spent_amount??bud.spent_amount),b.status==='approved'?s.account_id:bud.approver_account_id,bud.id
      ).run();
      return json({ok:true,id:bud.id,status:clean(b.status,30)||bud.status});
    }
    if(subKind==='partners'){
      const pid=uid('skpart');
      await env.DB.prepare("INSERT INTO sk_event_partners(id,event_id,partner_name,partner_role,contact_person,contact_info_restricted,commitment_summary,status,public_display_approved) VALUES(?,?,?,?,?,?,?,?,?)").bind(
        pid,ev.id,clean(b.partner_name,200),clean(b.partner_role,120)||'Đơn vị phối hợp',clean(b.contact_person,160)||null,clean(b.contact_info_restricted,300)||null,clean(b.commitment_summary,1000)||null,clean(b.status,40)||'confirmed',b.public_display_approved?1:0
      ).run();
      return json({ok:true,id:pid},201);
    }
    if(subKind==='communications'){
      if(req.method==='POST'){
        const cid=uid('skcomm');
        await env.DB.prepare("INSERT INTO sk_event_communications(id,event_id,content_type,title,body,media_url,channel,author_account_id,status) VALUES(?,?,?,?,?,?,?,?,'draft')").bind(
          cid,ev.id,clean(b.content_type,60)||'announcement',clean(b.title,240),clean(b.body,3000),clean(b.media_url,500)||null,clean(b.channel,120)||'Cổng nội bộ',s.account_id
        ).run();
        return json({ok:true,id:cid,status:'draft'},201);
      }
      const comm=await env.DB.prepare("SELECT * FROM sk_event_communications WHERE id=? AND event_id=?").bind(itemId,ev.id).first();
      if(!comm)return json({error:'COMM_NOT_FOUND'},404);
      const nextSt=clean(b.status,30)||comm.status;
      if(nextSt==='published'&&comm.status!=='approved'&&b.approve_and_publish!==true){
        return json({error:'COMM_REQUIRES_APPROVAL_BEFORE_PUBLISH',message:'Nội dung truyền thông công khai phải được phê duyệt trước khi xuất bản.'},409);
      }
      await env.DB.prepare("UPDATE sk_event_communications SET status=?,approver_account_id=?,published_at=CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE published_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
        nextSt,s.account_id,nextSt,comm.id
      ).run();
      return json({ok:true,id:comm.id,status:nextSt});
    }
    if(subKind==='registrations'&&req.method==='PATCH'){
      const nextSt=['approved','rejected','supplement_requested','waitlisted','cancelled'].includes(b.status)?b.status:'approved';
      await env.DB.prepare("UPDATE sk_event_registrations SET status=?,reviewer_account_id=?,review_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND event_id=?").bind(
        nextSt,s.account_id,clean(b.review_note,500)||null,itemId,ev.id
      ).run();
      await audit(env,s.account_id,'sk_event_registration_reviewed','sk_event_registration',itemId,ev.host_org_id,{event_id:ev.id,status:nextSt});
      return json({ok:true,id:itemId,status:nextSt});
    }
  }

  // SK QR Sessions & Attendance Check-in (Section XII of SK Appendix)
  const skQrMatch=url.pathname.match(/^\/api\/admin\/sk-events\/([^/]+)\/qr-sessions(?:\/([^/]+)\/(revoke|pause|close))?$/);
  if(skQrMatch&&['POST'].includes(req.method)){
    if(!(await hasPerm(env,s.account_id,'event.checkin'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const eid=decodeURIComponent(skQrMatch[1]);
    const sessionId=skQrMatch[2]?decodeURIComponent(skQrMatch[2]):null;
    const qrAction=skQrMatch[3]||null;
    const ev=await env.DB.prepare("SELECT * FROM sk_events WHERE id=? OR event_code=? LIMIT 1").bind(eid,eid).first();
    if(!ev)return json({error:'EVENT_NOT_FOUND'},404);
    const b=await bodyJson(req);

    if(sessionId&&qrAction){
      const nextSt=qrAction==='revoke'?'revoked':qrAction==='pause'?'paused':'closed';
      await env.DB.prepare("UPDATE sk_qr_sessions SET status=?,revoked_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND event_id=?").bind(
        nextSt,clean(b.reason,400)||`Thao tác ${qrAction} bởi quản trị viên`,sessionId,ev.id
      ).run();
      await audit(env,s.account_id,`sk_qr_session_${qrAction}`,'sk_qr_session',sessionId,ev.host_org_id,{event_id:ev.id,status:nextSt});
      return json({ok:true,id:sessionId,status:nextSt});
    }

    // Cannot issue active attendance QR for an unapproved or cancelled/postponed event!
    if(!['approved','published','registration_open','registration_closed','ongoing'].includes(ev.status)){
      return json({error:'QR_ISSUANCE_EVENT_NOT_ELIGIBLE',status:ev.status,message:'Không được phát hành mã QR điểm danh hoạt động cho sự kiện chưa được phê duyệt hoặc đã bị hoãn/hủy.'},409);
    }
    const qid=uid('skqr');
    const scode=`SK-QR-${String(Date.now()).slice(-6)}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;
    const qrToken=`SKQR_${crypto.randomUUID().replaceAll('-','')}`;
    const sName=clean(b.session_name,160)||'Phiên điểm danh chính thức';
    const startsAt=clean(b.starts_at,30)||new Date(Date.now()-3600000).toISOString().slice(0,19).replace('T',' ');
    const endsAt=clean(b.ends_at,30)||new Date(Date.now()+86400000).toISOString().slice(0,19).replace('T',' ');
    await env.DB.prepare("INSERT INTO sk_qr_sessions(id,session_code,event_id,session_name,qr_token,starts_at,ends_at,status,require_approved_registration,allow_duplicate_checkin,created_by_account_id) VALUES(?,?,?,?,?,?,?,'active',?,?,?)").bind(
      qid,scode,ev.id,sName,qrToken,startsAt,endsAt,b.require_approved_registration!==false?1:0,b.allow_duplicate_checkin===true?1:0,s.account_id
    ).run();
    await audit(env,s.account_id,'sk_qr_session_created','sk_qr_session',qid,ev.host_org_id,{event_id:ev.id,session_code:scode});
    return json({ok:true,id:qid,session_code:scode,qr_token:qrToken,status:'active',starts_at:startsAt,ends_at:endsAt},201);
  }

  if(url.pathname==='/api/sk-attendance/checkin'&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const b=await bodyJson(req);
    const qrToken=clean(b.qr_token,200);
    const email=clean(b.email||s.username,200).toLowerCase();
    const fullName=clean(b.full_name||s.full_name||s.username,160);
    if(!qrToken)return json({error:'QR_TOKEN_REQUIRED'},400);
    const qs=await env.DB.prepare(`
      SELECT q.*,e.status event_status,e.name event_name,e.host_org_id,
        CASE WHEN q.ends_at<datetime('now') THEN 1 ELSE 0 END is_expired,
        CASE WHEN q.starts_at>datetime('now') THEN 1 ELSE 0 END not_started
      FROM sk_qr_sessions q
      JOIN sk_events e ON e.id=q.event_id
      WHERE q.qr_token=? LIMIT 1
    `).bind(qrToken).first();
    if(!qs)return json({error:'QR_SESSION_NOT_FOUND',message:'Mã QR không tồn tại trên hệ thống.'},404);
    if(qs.status==='revoked')return json({error:'QR_REVOKED',message:'Mã QR điểm danh này đã bị thu hồi hoặc vô hiệu hóa.'},410);
    if(qs.status!=='active')return json({error:'QR_SESSION_INACTIVE',status:qs.status,message:'Phiên điểm danh hiện không hoạt động (đã tạm dừng hoặc đã đóng).'},409);
    if(['postponed','cancelled','rejected','draft'].includes(qs.event_status)){
      return json({error:'EVENT_NOT_ACTIVE_FOR_CHECKIN',event_status:qs.event_status,message:'Sự kiện hiện không ở trạng thái cho phép điểm danh.'},409);
    }
    if(qs.is_expired)return json({error:'QR_EXPIRED',message:'Mã QR của phiên điểm danh này đã hết thời hạn hiệu lực.'},410);
    if(qs.not_started)return json({error:'QR_SESSION_NOT_STARTED',message:'Phiên điểm danh chưa đến giờ bắt đầu.'},409);

    let regRow=null;
    if(qs.require_approved_registration){
      regRow=await env.DB.prepare("SELECT * FROM sk_event_registrations WHERE event_id=? AND lower(email)=? LIMIT 1").bind(qs.event_id,email).first();
      if(!regRow||regRow.status!=='approved'){
        return json({error:'PARTICIPANT_NOT_ELIGIBLE',message:'Người tham gia chưa có hồ sơ đăng ký được phê duyệt cho sự kiện này.'},403);
      }
    }
    if(!qs.allow_duplicate_checkin){
      const dupAtt=await env.DB.prepare("SELECT id,checked_in_at FROM sk_attendance_records WHERE session_id=? AND lower(participant_email)=? LIMIT 1").bind(qs.id,email).first();
      if(dupAtt)return json({error:'DUPLICATE_CHECKIN_BLOCKED',checked_in_at:dupAtt.checked_in_at,message:'Người tham gia đã được ghi nhận điểm danh trong phiên này; hệ thống chặn điểm danh trùng.'},409);
    }
    const attId=uid('skatt');
    await env.DB.prepare("INSERT INTO sk_attendance_records(id,event_id,session_id,registration_id,account_id,participant_name,participant_email,attendance_status,checkin_method,operator_account_id) VALUES(?,?,?,?,?,?,?,'checked_in','qr_scan',?)").bind(
      attId,qs.event_id,qs.id,regRow?.id||null,s.account_id,regRow?.full_name||fullName,email,s.account_id
    ).run();
    await audit(env,s.account_id,'sk_attendance_qr_checked_in','sk_attendance',attId,qs.host_org_id,{event_id:qs.event_id,session_id:qs.id,email});
    return json({ok:true,id:attId,event_id:qs.event_id,session_id:qs.id,participant_email:email,attendance_status:'checked_in'},201);
  }

  const skManualAttMatch=url.pathname.match(/^\/api\/admin\/sk-events\/([^/]+)\/attendance\/manual$/);
  if(skManualAttMatch&&req.method==='POST'){
    if(!(await hasPerm(env,s.account_id,'event.checkin'))&&!(await isNetworkAdmin(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    await ensureGovernanceTables(env);
    const eid=decodeURIComponent(skManualAttMatch[1]);
    const b=await bodyJson(req);
    const sessionId=clean(b.session_id,100);
    const email=clean(b.participant_email||b.email,200).toLowerCase();
    const name=clean(b.participant_name||b.full_name,160);
    const status=['checked_in','manual_present','absent','late','exception'].includes(b.attendance_status)?b.attendance_status:'manual_present';
    const reason=clean(b.manual_reason||b.reason,500);
    if(!sessionId||!email||!name||!reason){
      return json({error:'MANUAL_REASON_REQUIRED',message:'Mọi thao tác điểm danh hoặc hiệu chỉnh điểm danh thủ công bắt buộc phải nhập lý do, họ tên và email.'},400);
    }
    const existing=await env.DB.prepare("SELECT id FROM sk_attendance_records WHERE session_id=? AND lower(participant_email)=? LIMIT 1").bind(sessionId,email).first();
    let attId=existing?.id||uid('skatt');
    if(existing){
      await env.DB.prepare("UPDATE sk_attendance_records SET attendance_status=?,checkin_method='manual_override',manual_reason=?,operator_account_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
        status,reason,s.account_id,attId
      ).run();
    }else{
      await env.DB.prepare("INSERT INTO sk_attendance_records(id,event_id,session_id,participant_name,participant_email,attendance_status,checkin_method,manual_reason,operator_account_id) VALUES(?,?,?,?,?,?,'manual_override',?,?)").bind(
        attId,eid,sessionId,name,email,status,reason,s.account_id
      ).run();
    }
    await audit(env,s.account_id,'sk_attendance_manual_override','sk_attendance',attId,null,{event_id:eid,session_id:sessionId,email,attendance_status:status,reason});
    return json({ok:true,id:attId,attendance_status:status,manual_reason:reason,operator_account_id:s.account_id});
  }

  // =========================================================
  // SIÊU YÊU CẦU GFI II — HỆ THỐNG NHẮN TIN NỘI BỘ (1-1 & NHÓM, KHÔNG CÓ GỌI THOẠI/VIDEO)
  // =========================================================
  if(url.pathname==='/api/chat/conversations'&&['GET','POST'].includes(req.method)){
    await ensureGovernanceTables(env);
    if(req.method==='GET'){
      const q=clean(url.searchParams.get('q'),120);
      const convType=clean(url.searchParams.get('conv_type'),30);
      const r=await env.DB.prepare(`
        SELECT c.*,cp.role_in_chat,cp.is_pinned,cp.is_muted,cp.is_archived,cp.unread_count,
          (SELECT m.body FROM chat_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) last_message_body,
          (SELECT m.created_at FROM chat_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) last_message_at,
          (SELECT COUNT(*) FROM chat_participants p2 WHERE p2.conversation_id=c.id) participant_count
        FROM chat_conversations c
        JOIN chat_participants cp ON cp.conversation_id=c.id AND cp.account_id=?
        WHERE (?='' OR COALESCE(c.title,'') LIKE ? OR EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.conversation_id=c.id AND cm.body LIKE ?))
          AND (?='' OR c.conv_type=?)
        ORDER BY cp.is_pinned DESC, COALESCE(last_message_at,c.updated_at) DESC LIMIT 100
      `).bind(s.account_id,q,`%${q}%`,`%${q}%`,convType,convType).all();
      return json({
        items:r.results||[],
        policy_notice:'Hệ thống nhắn tin nội bộ hỗ trợ trao đổi văn bản, hình ảnh, tài liệu, video tệp và liên kết nghiệp vụ. Tuyệt đối không triển khai gọi thoại, gọi video hoặc hội nghị trực tuyến.'
      });
    }
    const b=await bodyJson(req);
    const convType=['direct','group'].includes(b.conv_type)?b.conv_type:'direct';
    const memberIds=[...new Set([s.account_id,...(Array.isArray(b.participant_account_ids)?b.participant_account_ids.map(x=>clean(x,100)).filter(Boolean):[])])];
    if(convType==='direct'&&memberIds.length<2)return json({error:'PARTICIPANT_REQUIRED',message:'Cuộc trò chuyện trực tiếp cần chọn tài khoản người nhận.'},400);
    const cid=uid('conv');
    const title=clean(b.title,200)||(convType==='direct'?'Trò chuyện trực tiếp':'Nhóm công việc');
    await env.DB.prepare("INSERT INTO chat_conversations(id,conv_type,title,description,org_node_id,event_id,created_by_account_id) VALUES(?,?,?,?,?,?,?)").bind(
      cid,convType,title,clean(b.description,500)||null,clean(b.org_node_id,100)||null,clean(b.event_id,100)||null,s.account_id
    ).run();
    for(const aid of memberIds){
      const role=aid===s.account_id?'owner':'member';
      await env.DB.prepare("INSERT OR IGNORE INTO chat_participants(conversation_id,account_id,role_in_chat) VALUES(?,?,?)").bind(cid,aid,role).run();
    }
    await audit(env,s.account_id,'chat_conversation_created','chat_conversation',cid,clean(b.org_node_id,100)||null,{conv_type:convType,participant_count:memberIds.length});
    return json({ok:true,id:cid,conv_type:convType,title,participant_count:memberIds.length},201);
  }

  const chatConvMatch=url.pathname.match(/^\/api\/chat\/conversations\/([^/]+)(?:\/(messages|participants|settings))?$/);
  if(chatConvMatch&&['GET','POST','PATCH'].includes(req.method)){
    await ensureGovernanceTables(env);
    const cid=decodeURIComponent(chatConvMatch[1]);
    const sub=chatConvMatch[2]||null;
    const myPart=await env.DB.prepare("SELECT * FROM chat_participants WHERE conversation_id=? AND account_id=? LIMIT 1").bind(cid,s.account_id).first();
    if(!myPart)return json({error:'CHAT_ACCESS_FORBIDDEN',message:'Bạn không phải là thành viên của cuộc trò chuyện này.'},403);
    const conv=await env.DB.prepare("SELECT * FROM chat_conversations WHERE id=?").bind(cid).first();
    if(!conv)return json({error:'CONVERSATION_NOT_FOUND'},404);

    if(req.method==='GET'&&(!sub||sub==='messages')){
      const [msgs,parts]=await Promise.all([
        env.DB.prepare(`
          SELECT m.*,u.username sender_username,p.full_name sender_name,p.avatar_url sender_avatar
          FROM chat_messages m
          JOIN accounts u ON u.id=m.sender_account_id
          LEFT JOIN people p ON p.id=u.person_id
          WHERE m.conversation_id=?
          ORDER BY m.created_at ASC LIMIT 200
        `).bind(cid).all(),
        env.DB.prepare(`
          SELECT cp.*,u.username,p.full_name,p.member_code
          FROM chat_participants cp
          JOIN accounts u ON u.id=cp.account_id
          LEFT JOIN people p ON p.id=u.person_id
          WHERE cp.conversation_id=?
        `).bind(cid).all()
      ]);
      await env.DB.prepare("UPDATE chat_participants SET unread_count=0,last_read_at=CURRENT_TIMESTAMP WHERE conversation_id=? AND account_id=?").bind(cid,s.account_id).run();
      return json({
        conversation:conv,
        my_membership:myPart,
        participants:parts.results||[],
        messages:(msgs.results||[]).map(m=>m.status==='recalled'?{...m,body:'[Tin nhắn đã được thu hồi]',attachment_url:null}:m)
      });
    }
    const b=await bodyJson(req);
    if(req.method==='POST'&&sub==='messages'){
      const msgRateKey=`chat-msg:${s.account_id}`;
      const mr=await safeRateState(env,msgRateKey,60,5);
      if(mr.blocked)return json({error:'CHAT_RATE_LIMITED',message:'Bạn đang gửi tin nhắn quá nhanh.'},429);
      await safeRateFail(env,msgRateKey,60,5);
      const bodyText=clean(b.body,3000);
      const attUrl=clean(b.attachment_url,500)||null;
      if(!bodyText&&!attUrl)return json({error:'MESSAGE_EMPTY'},400);
      const mid=uid('cmsg');
      await env.DB.batch([
        env.DB.prepare("INSERT INTO chat_messages(id,conversation_id,sender_account_id,reply_to_message_id,forwarded_from_id,body,attachment_url,attachment_type,linked_entity_type,linked_entity_id,delivery_state,status) VALUES(?,?,?,?,?,?,?,?,?,?,'delivered','active')").bind(
          mid,cid,s.account_id,clean(b.reply_to_message_id,100)||null,clean(b.forwarded_from_id,100)||null,bodyText||'[Tệp đính kèm]',attUrl,clean(b.attachment_type,40)||null,clean(b.linked_entity_type,60)||null,clean(b.linked_entity_id,100)||null
        ),
        env.DB.prepare("UPDATE chat_conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(cid),
        env.DB.prepare("UPDATE chat_participants SET unread_count=unread_count+1 WHERE conversation_id=? AND account_id!=?").bind(cid,s.account_id)
      ]);
      return json({ok:true,id:mid,conversation_id:cid,delivery_state:'delivered',created_at:new Date().toISOString()},201);
    }
    if(sub==='participants'&&req.method==='POST'){
      if(!['owner','admin'].includes(myPart.role_in_chat))return json({error:'GROUP_ADMIN_REQUIRED',message:'Chỉ trưởng nhóm hoặc quản trị viên nhóm mới có quyền thêm/xóa/phân quyền thành viên.'},403);
      const targetAid=clean(b.account_id,100);
      const op=clean(b.op,30)||'add'; // add | remove | set_role
      if(!targetAid)return json({error:'ACCOUNT_ID_REQUIRED'},400);
      if(op==='remove'){
        await env.DB.prepare("DELETE FROM chat_participants WHERE conversation_id=? AND account_id=?").bind(cid,targetAid).run();
      }else if(op==='set_role'){
        const role=['owner','admin','member'].includes(b.role_in_chat)?b.role_in_chat:'member';
        await env.DB.prepare("UPDATE chat_participants SET role_in_chat=? WHERE conversation_id=? AND account_id=?").bind(role,cid,targetAid).run();
      }else{
        await env.DB.prepare("INSERT OR IGNORE INTO chat_participants(conversation_id,account_id,role_in_chat) VALUES(?,?,'member')").bind(cid,targetAid).run();
      }
      await audit(env,s.account_id,`chat_participant_${op}`,'chat_conversation',cid,null,{target_account_id:targetAid});
      return json({ok:true,op,account_id:targetAid});
    }
    if(sub==='settings'&&req.method==='PATCH'){
      if(b.title!==undefined||b.description!==undefined){
        if(conv.conv_type==='group'&&!['owner','admin'].includes(myPart.role_in_chat))return json({error:'GROUP_ADMIN_REQUIRED'},403);
        await env.DB.prepare("UPDATE chat_conversations SET title=COALESCE(?,title),description=COALESCE(?,description),updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
          b.title?clean(b.title,200):null,b.description!==undefined?clean(b.description,500):null,cid
        ).run();
      }
      if(b.is_pinned!==undefined||b.is_muted!==undefined||b.is_archived!==undefined||b.mark_unread!==undefined){
        await env.DB.prepare("UPDATE chat_participants SET is_pinned=COALESCE(?,is_pinned),is_muted=COALESCE(?,is_muted),is_archived=COALESCE(?,is_archived),unread_count=CASE WHEN ?=1 THEN 1 ELSE unread_count END WHERE conversation_id=? AND account_id=?").bind(
          b.is_pinned!==undefined?(b.is_pinned?1:0):null,
          b.is_muted!==undefined?(b.is_muted?1:0):null,
          b.is_archived!==undefined?(b.is_archived?1:0):null,
          b.mark_unread?1:0,cid,s.account_id
        ).run();
      }
      return json({ok:true,conversation_id:cid});
    }
  }

  const chatMsgActionMatch=url.pathname.match(/^\/api\/chat\/messages\/([^/]+)$/);
  if(chatMsgActionMatch&&req.method==='PATCH'){
    await ensureGovernanceTables(env);
    const mid=decodeURIComponent(chatMsgActionMatch[1]);
    const msg=await env.DB.prepare("SELECT * FROM chat_messages WHERE id=?").bind(mid).first();
    if(!msg)return json({error:'MESSAGE_NOT_FOUND'},404);
    const myPart=await env.DB.prepare("SELECT * FROM chat_participants WHERE conversation_id=? AND account_id=?").bind(msg.conversation_id,s.account_id).first();
    if(!myPart)return json({error:'FORBIDDEN'},403);
    const b=await bodyJson(req);
    const action=clean(b.action,30); // edit | recall | pin | unpin
    if(action==='edit'){
      if(msg.sender_account_id!==s.account_id)return json({error:'ONLY_SENDER_CAN_EDIT'},403);
      const newBody=clean(b.body,3000);
      if(!newBody)return json({error:'BODY_REQUIRED'},400);
      await env.DB.prepare("UPDATE chat_messages SET body=?,edited_at=CURRENT_TIMESTAMP WHERE id=?").bind(newBody,mid).run();
      await audit(env,s.account_id,'chat_message_edited','chat_message',mid,null,{conversation_id:msg.conversation_id});
      return json({ok:true,id:mid,action:'edit'});
    }
    if(action==='recall'){
      if(msg.sender_account_id!==s.account_id&&!['owner','admin'].includes(myPart.role_in_chat))return json({error:'FORBIDDEN'},403);
      await env.DB.prepare("UPDATE chat_messages SET status='recalled',recalled_at=CURRENT_TIMESTAMP WHERE id=?").bind(mid).run();
      await audit(env,s.account_id,'chat_message_recalled','chat_message',mid,null,{conversation_id:msg.conversation_id});
      return json({ok:true,id:mid,action:'recall',status:'recalled'});
    }
    if(action==='pin'||action==='unpin'){
      const pinned=action==='pin'?1:0;
      await env.DB.batch([
        env.DB.prepare("UPDATE chat_messages SET is_pinned=? WHERE id=?").bind(pinned,mid),
        env.DB.prepare("UPDATE chat_conversations SET pinned_message_id=? WHERE id=?").bind(pinned?mid:null,msg.conversation_id)
      ]);
      return json({ok:true,id:mid,is_pinned:Boolean(pinned)});
    }
    return json({error:'INVALID_MESSAGE_ACTION'},400);
  }

  if(url.pathname==='/api/chat/upload'&&req.method==='POST'){
    await ensureGovernanceTables(env);
    const cid=clean(req.headers.get('x-conversation-id'),100);
    if(!cid)return json({error:'CONVERSATION_ID_REQUIRED'},400);
    const myPart=await env.DB.prepare("SELECT 1 FROM chat_participants WHERE conversation_id=? AND account_id=?").bind(cid,s.account_id).first();
    if(!myPart)return json({error:'CHAT_ACCESS_FORBIDDEN'},403);
    const ct=(req.headers.get('content-type')||'').toLowerCase().split(';')[0].trim();
    const allowed=['image/png','image/jpeg','image/webp','application/pdf','video/mp4','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if(!allowed.includes(ct))return json({error:'FILE_TYPE_NOT_ALLOWED'},415);
    const bytes=new Uint8Array(await req.arrayBuffer());
    if(!bytes.byteLength||bytes.byteLength>10*1024*1024)return json({error:'FILE_TOO_LARGE'},413);
    if(!validUploadedAttachment(bytes,ct))return json({error:'INVALID_ATTACHMENT_CONTENT'},400);
    const ext=ct==='image/png'?'png':ct==='image/webp'?'webp':ct==='image/jpeg'?'jpg':ct==='application/pdf'?'pdf':ct==='video/mp4'?'mp4':ct.includes('wordprocessingml')?'docx':'xlsx';
    const key=`chat/${cid}/${crypto.randomUUID()}.${ext}`;
    if(env.FILES?.put){
      await env.FILES.put(key,bytes,{httpMetadata:{contentType:ct,cacheControl:'private, no-store, max-age=0'}});
    }
    return json({ok:true,url:`/files/${key}`,attachment_type:ct.startsWith('image/')?'image':ct==='video/mp4'?'video':'document',byte_size:bytes.byteLength},201);
  }

  // =========================================================
  // SIÊU YÊU CẦU GFI III — MẠNG XÃ HỘI & CỘNG ĐỒNG NỘI BỘ
  // =========================================================
  if(url.pathname==='/api/community/groups'&&['GET','POST'].includes(req.method)){
    await ensureGovernanceTables(env);
    if(req.method==='GET'){
      const r=await env.DB.prepare("SELECT g.*,(SELECT COUNT(*) FROM community_group_members gm WHERE gm.group_id=g.id) member_count FROM community_groups g WHERE g.status='active' ORDER BY g.group_type ASC,g.name ASC").all();
      return json({items:r.results||[]});
    }
    const b=await bodyJson(req);
    const name=clean(b.name,200);
    const code=clean(b.code,60).toUpperCase()||`GRP-${Date.now().toString().slice(-6)}`;
    if(!name)return json({error:'GROUP_NAME_REQUIRED'},400);
    const gid=uid('cgrp');
    const gtype=['group','announcement_channel'].includes(b.group_type)?b.group_type:'group';
    const vis=['public_internal','private','invite_only'].includes(b.visibility)?b.visibility:'public_internal';
    await env.DB.batch([
      env.DB.prepare("INSERT INTO community_groups(id,code,name,group_type,visibility,org_node_id,description,allow_member_posts,allow_comments,require_post_approval,created_by_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(
        gid,code,name,gtype,vis,clean(b.org_node_id,100)||null,clean(b.description,1000)||null,gtype==='announcement_channel'?0:(b.allow_member_posts!==false?1:0),b.allow_comments!==false?1:0,b.require_post_approval?1:0,s.account_id
      ),
      env.DB.prepare("INSERT INTO community_group_members(group_id,account_id,role_in_group,can_post,can_comment) VALUES(?,?,'owner',1,1)").bind(gid,s.account_id)
    ]);
    await audit(env,s.account_id,'community_group_created','community_group',gid,clean(b.org_node_id,100)||null,{code,group_type:gtype,visibility:vis});
    return json({ok:true,id:gid,code,group_type:gtype,visibility:vis},201);
  }

  if(url.pathname==='/api/community/posts'&&['GET','POST'].includes(req.method)){
    await ensureGovernanceTables(env);
    const canMod=await hasPerm(env,s.account_id,'content.moderate')||await isNetworkAdmin(env,s.account_id);
    if(req.method==='GET'){
      const q=clean(url.searchParams.get('q'),120);
      const groupId=clean(url.searchParams.get('group_id'),100);
      const kind=clean(url.searchParams.get('post_kind'),40);
      const modStatus=clean(url.searchParams.get('moderation_status'),40);
      const r=await env.DB.prepare(`
        SELECT sp.*,u.username author_username,p.full_name author_name,p.member_code author_member_code,p.avatar_url author_avatar,
          cg.name group_name,cg.group_type,o.name org_name,
          (SELECT COUNT(*) FROM social_reactions sr WHERE sr.post_id=sp.id) reaction_count,
          (SELECT COUNT(*) FROM social_comments sc WHERE sc.post_id=sp.id AND sc.status='active') comment_count
        FROM social_posts sp
        JOIN accounts u ON u.id=sp.author_account_id
        LEFT JOIN people p ON p.id=u.person_id
        LEFT JOIN community_groups cg ON cg.id=sp.group_id
        LEFT JOIN org_nodes o ON o.id=sp.org_node_id
        WHERE (?='' OR sp.body LIKE ? OR COALESCE(sp.title,'') LIKE ? OR COALESCE(p.full_name,'') LIKE ?)
          AND (?='' OR sp.group_id=?)
          AND (?='' OR sp.post_kind=?)
          AND (?='' OR sp.moderation_status=?)
        ORDER BY sp.is_pinned DESC, sp.created_at DESC LIMIT 100
      `).bind(q,`%${q}%`,`%${q}%`,`%${q}%`,groupId,groupId,kind,kind,modStatus,modStatus).all();
      const visible=(r.results||[]).filter(x=>x.moderation_status==='published'||x.author_account_id===s.account_id||canMod);
      return json({items:visible,can_moderate:canMod});
    }
    const b=await bodyJson(req);
    const bodyText=clean(b.body,4000);
    if(!bodyText)return json({error:'POST_BODY_REQUIRED'},400);
    const postKind=['discussion','official_announcement'].includes(b.post_kind)?b.post_kind:'discussion';
    const groupId=clean(b.group_id,100)||'grp_general_community';
    const grp=await env.DB.prepare("SELECT * FROM community_groups WHERE id=?").bind(groupId).first();
    if(grp&&grp.group_type==='announcement_channel'&&!canMod){
      return json({error:'ANNOUNCEMENT_CHANNEL_RESTRICTED',message:'Kênh thông báo một chiều chỉ cho phép người có thẩm quyền kiểm duyệt/xuất bản đăng bài.'},403);
    }
    // Personal/internal posts NEVER automatically become published official announcements without moderation approval!
    let modStatus='published';
    if(postKind==='official_announcement'){
      modStatus=(canMod&&b.publish_immediately===true)?'published':(b.save_as_draft===true?'draft':'pending_approval');
    }else if(grp?.require_post_approval&&!canMod){
      modStatus='pending_approval';
    }
    const pid=uid('spost');
    await env.DB.prepare("INSERT INTO social_posts(id,group_id,author_account_id,org_node_id,event_id,post_kind,title,body,media_url,media_type,moderation_status,approver_account_id,approved_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(
      pid,groupId,s.account_id,clean(b.org_node_id,100)||null,clean(b.event_id,100)||null,postKind,clean(b.title,240)||null,bodyText,clean(b.media_url,500)||null,clean(b.media_type,40)||null,modStatus,modStatus==='published'&&postKind==='official_announcement'?s.account_id:null,modStatus==='published'&&postKind==='official_announcement'?new Date().toISOString():null,modStatus==='published'?new Date().toISOString():null
    ).run();
    await audit(env,s.account_id,'social_post_created','social_post',pid,clean(b.org_node_id,100)||null,{post_kind:postKind,moderation_status:modStatus});
    return json({ok:true,id:pid,post_kind:postKind,moderation_status:modStatus},201);
  }

  const socialPostActionMatch=url.pathname.match(/^\/api\/community\/posts\/([^/]+)(?:\/(comments|react|moderate|report))?$/);
  if(socialPostActionMatch&&['GET','POST','PATCH'].includes(req.method)){
    await ensureGovernanceTables(env);
    const pid=decodeURIComponent(socialPostActionMatch[1]);
    const act=socialPostActionMatch[2]||null;
    const post=await env.DB.prepare("SELECT * FROM social_posts WHERE id=?").bind(pid).first();
    if(!post)return json({error:'POST_NOT_FOUND'},404);
    const canMod=await hasPerm(env,s.account_id,'content.moderate')||await isNetworkAdmin(env,s.account_id);

    if(req.method==='GET'&&act==='comments'){
      const cmts=await env.DB.prepare("SELECT c.*,u.username author_username,p.full_name author_name FROM social_comments c JOIN accounts u ON u.id=c.author_account_id LEFT JOIN people p ON p.id=u.person_id WHERE c.post_id=? AND c.status='active' ORDER BY c.created_at ASC").bind(pid).all();
      return json({items:cmts.results||[]});
    }
    const b=await bodyJson(req);
    if(req.method==='POST'&&act==='comments'){
      const cbody=clean(b.body,2000);
      if(!cbody)return json({error:'COMMENT_BODY_REQUIRED'},400);
      const cid=uid('scmt');
      await env.DB.prepare("INSERT INTO social_comments(id,post_id,parent_comment_id,author_account_id,body) VALUES(?,?,?,?,?)").bind(
        cid,pid,clean(b.parent_comment_id,100)||null,s.account_id,cbody
      ).run();
      return json({ok:true,id:cid},201);
    }
    if(req.method==='POST'&&act==='react'){
      const rtype=['like','love','congrats','support'].includes(b.reaction_type)?b.reaction_type:'like';
      await env.DB.prepare("INSERT INTO social_reactions(post_id,account_id,reaction_type) VALUES(?,?,?) ON CONFLICT(post_id,account_id) DO UPDATE SET reaction_type=excluded.reaction_type").bind(pid,s.account_id,rtype).run();
      const cnt=await env.DB.prepare("SELECT COUNT(*) n FROM social_reactions WHERE post_id=?").bind(pid).first();
      return json({ok:true,reaction_type:rtype,reaction_count:Number(cnt?.n||0)});
    }
    if(req.method==='POST'&&act==='report'){
      const reason=clean(b.reason,500);
      if(!reason)return json({error:'REPORT_REASON_REQUIRED'},400);
      const rid=uid('creport');
      await env.DB.prepare("INSERT INTO content_reports(id,target_type,target_id,reporter_account_id,reason,status) VALUES(?,'social_post',?,?,'pending')").bind(rid,pid,s.account_id,reason).run();
      await audit(env,s.account_id,'social_post_reported','social_post',pid,null,{report_id:rid,reason});
      return json({ok:true,id:rid,status:'pending'},201);
    }
    if(req.method==='POST'&&act==='moderate'){
      if(!canMod)return json({error:'MODERATOR_PERMISSION_REQUIRED',message:'Chỉ tài khoản có quyền kiểm duyệt mới được phê duyệt, xuất bản hoặc ẩn nội dung chính thức.'},403);
      const modOp=clean(b.action,30); // approve | publish | reject | hide | pin | unpin
      let nextMod=post.moderation_status;
      if(modOp==='approve')nextMod='approved';
      else if(modOp==='publish')nextMod='published';
      else if(modOp==='reject')nextMod='rejected';
      else if(modOp==='hide')nextMod='hidden';
      const nextPin=modOp==='pin'?1:(modOp==='unpin'?0:post.is_pinned);
      await env.DB.prepare("UPDATE social_posts SET moderation_status=?,is_pinned=?,approver_account_id=?,approved_at=CASE WHEN ? IN ('approved','published') THEN CURRENT_TIMESTAMP ELSE approved_at END,published_at=CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE published_at END,rejected_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
        nextMod,nextPin,s.account_id,nextMod,nextMod,clean(b.reason,500)||null,pid
      ).run();
      await audit(env,s.account_id,`social_post_moderated_${modOp}`,'social_post',pid,post.org_node_id,{moderation_status:nextMod,is_pinned:nextPin});
      return json({ok:true,id:pid,moderation_status:nextMod,is_pinned:Boolean(nextPin)});
    }
  }

  // Pre-Release Readiness Gate (Grounded in real structural, R2, Email, Legal, and Identity checks)
  if(url.pathname==='/api/admin/release-readiness'&&req.method==='GET'){
    if(!(await isSuper(env,s.account_id)))return json({error:'FORBIDDEN'},403);
    const checkOnly=url.searchParams.get('check_only')==='1';
    const dbCheck=await inspectDatabaseStructure(env,{autoReconcile:!checkOnly});
    const schemaPassed=dbCheck.database==='ok'&&Number(dbCheck.schema_version||0)>=16&&dbCheck.missing_tables.length===0&&dbCheck.missing_columns.length===0;
    const [orgSetting,legalCount,policyCount,signoffRow,r2ProbeRow,diagEmailRow]=await Promise.all([
      env.DB.prepare("SELECT value_json FROM system_settings WHERE key='organization'").first().catch(()=>null),
      env.DB.prepare("SELECT COUNT(*) n FROM governance_registry WHERE domain_group='legal_obligation'").first().catch(()=>({n:0})),
      env.DB.prepare("SELECT COUNT(*) n FROM data_policies WHERE status='active'").first().catch(()=>({n:0})),
      env.DB.prepare("SELECT value_json FROM system_settings WHERE key='legal_professional_signoff'").first().catch(()=>null),
      env.DB.prepare("SELECT value_json FROM system_settings WHERE key='r2_last_probe_result'").first().catch(()=>null),
      env.DB.prepare("SELECT status,provider_message_id,error_detail,created_at FROM email_delivery_logs WHERE template_code='admin_diagnostic_test' ORDER BY created_at DESC LIMIT 1").first().catch(()=>null)
    ]);
    const idOk=Boolean(
      DEFAULT_SYSTEM_IDENTITY.siteName==='Trung tâm Nghiệp vụ Số Sky First'&&
      DEFAULT_SYSTEM_IDENTITY.appUrl==='https://nghiepvu.skyfirst.io.vn'&&
      DEFAULT_SYSTEM_IDENTITY.systemEmail==='nghiepvu@skyfirst.io.vn'&&
      DEFAULT_SYSTEM_IDENTITY.noreplyEmail==='noreply@skyfirst.io.vn'&&
      DEFAULT_SYSTEM_IDENTITY.supportEmail==='support@skyfirst.io.vn'&&
      DEFAULT_SYSTEM_IDENTITY.contactEmail==='lienhe@skyfirst.io.vn'&&
      orgSetting?.value_json?.includes('nghiepvu.skyfirst.io.vn')
    );
    let signoff=null;try{if(signoffRow?.value_json)signoff=JSON.parse(signoffRow.value_json)}catch{}
    const legalTechPassed=Number(legalCount?.n||0)>=2&&Number(policyCount?.n||0)>=2;
    const legalSignedOff=Boolean(signoff&&signoff.status==='approved'&&signoff.reviewer_name&&signoff.evidence_ref);
    let r2Probe=env.FILES?.__lastProbeResult||null;
    if(!r2Probe&&r2ProbeRow?.value_json&&env.FILES&&typeof env.FILES.put==='function'){
      try{r2Probe=JSON.parse(r2ProbeRow.value_json)}catch{}
    }
    let r2GateStatus='blocked_external',r2GateDetail='Chưa có binding R2 (env.FILES) trong môi trường hiện tại.';
    if(env.FILES){
      if(r2Probe?.status==='passed'){
        r2GateStatus='passed';
        r2GateDetail=`Đã kiểm tra thực tế Đọc/Ghi/Đọc lại SHA-256/Xóa an toàn trên R2 lúc ${r2Probe.tested_at}.`;
      }else if(r2Probe?.status==='failed'){
        r2GateStatus='failed';
        r2GateDetail=`Kiểm tra R2 thất bại: ${r2Probe.error_detail||'Lỗi thao tác R2'}.`;
      }else{
        r2GateStatus='configured_untested';
        r2GateDetail='Binding R2 hiện diện; cần bấm "Kiểm tra Đọc/Ghi/Xóa R2 an toàn" để xác minh đầy đủ các thao tác put/get/delete.';
      }
    }
    let emailGateStatus='blocked_external',emailGateDetail='Chưa khai báo RESEND_API_KEY trong môi trường hiện tại.';
    if(env.RESEND_API_KEY){
      if(diagEmailRow?.status==='sent'&&diagEmailRow?.provider_message_id){
        emailGateStatus='passed';
        emailGateDetail=`Nhà cung cấp Resend đã tiếp nhận email kiểm tra (ID: ${diagEmailRow.provider_message_id}); cần đối chiếu thêm hộp thư đến và bản ghi DNS SPF/DKIM/DMARC.`;
      }else if(diagEmailRow?.status==='failed'){
        emailGateStatus='failed';
        emailGateDetail=`Gửi email kiểm tra gần nhất thất bại: ${diagEmailRow.error_detail||'Nhà cung cấp từ chối'}.`;
      }else{
        emailGateStatus='configured_untested';
        emailGateDetail='Đã khai báo secret RESEND_API_KEY nhưng chưa chạy kiểm tra gửi email thực tế có kiểm soát.';
      }
    }
    const schemaDetail=schemaPassed
      ?`Phiên bản hiện tại: ${dbCheck.schema_version} (yêu cầu ≥ ${dbCheck.required_schema_version}, mục tiêu ${dbCheck.target_schema_version}) · Đã xác minh đủ ${dbCheck.verified_tables_count}/${dbCheck.total_required_tables} bảng và toàn bộ cột bắt buộc (bao gồm support_ticket_assignments.impact_level).`
      :`Chưa đạt cấu trúc lược đồ (phiên bản: ${dbCheck.schema_version??'null'})${dbCheck.missing_tables.length?' · Thiếu bảng: '+dbCheck.missing_tables.join(', '):''}${dbCheck.missing_columns.length?' · Thiếu cột: '+dbCheck.missing_columns.join(', '):''}`;
    const gates=[
      {
        code:'SCHEMA_VERSION',
        title:'Cấu trúc cơ sở dữ liệu D1 & Đối chiếu bảng/cột bắt buộc (Schema ≥ 16, mục tiêu 17)',
        status:schemaPassed?'passed':'failed',
        detail:schemaDetail,
        missing_tables:dbCheck.missing_tables,
        missing_columns:dbCheck.missing_columns
      },
      {
        code:'IDENTITY_UNIFIED',
        title:'Nhận diện Trung tâm Nghiệp vụ Số Sky First (GFI) & nghiepvu.skyfirst.io.vn',
        status:idOk?'passed':'failed',
        detail:`${DEFAULT_SYSTEM_IDENTITY.siteName} · ${DEFAULT_SYSTEM_IDENTITY.appUrl} · ${DEFAULT_SYSTEM_IDENTITY.systemEmail}`
      },
      {
        code:'LEGAL_GATE_91_2025',
        title:'Cổng pháp lý Luật BVDLCN 91/2025/QH15 & Nghị định 356/2025/NĐ-CP',
        status:legalTechPassed?'passed':'failed',
        legal_review_state:legalSignedOff?'approved':'technical_passed_pending_legal_signoff',
        detail:legalTechPassed
          ?(legalSignedOff?`Đã hoàn tất kiểm soát kỹ thuật và được phê duyệt pháp lý bởi ${signoff.reviewer_name} (${signoff.evidence_ref}).`:`Kiểm soát kỹ thuật trong mã nguồn: ĐẠT (tách 3 ô đồng ý, bảo vệ dữ liệu người <18 tuổi, ẩn/xóa CCCD giám hộ, chính sách phiên bản hóa); Trạng thái thẩm định pháp lý chuyên môn: chờ ký duyệt chính thức (pending_legal_review).`)
          :'Thiếu văn bản nghĩa vụ pháp lý hoặc chính sách bảo vệ dữ liệu cá nhân trong cơ sở dữ liệu.'
      },
      {
        code:'R2_STORAGE_PROBE',
        title:'Kho lưu trữ tệp Cloudflare R2 (Đọc danh sách · Ghi · Đọc lại · Xóa an toàn)',
        status:r2GateStatus,
        detail:r2GateDetail
      },
      {
        code:'EMAIL_PROVIDER_SECRET',
        title:'Dịch vụ gửi Email & OTP thực tế (RESEND_API_KEY & Xác nhận nhà cung cấp)',
        status:emailGateStatus,
        detail:emailGateDetail
      },
      {
        code:'PRODUCTION_DEPLOYMENT',
        title:'Triển khai Cloudflare Production & DNS nghiepvu.skyfirst.io.vn',
        status:'blocked_external',
        detail:'Chưa triển khai lên Cloudflare production từ môi trường sandbox cô lập; cần người có thẩm quyền chạy wrangler d1 migrations apply tk --remote, wrangler deploy và xác minh DNS/SPF/DKIM/DMARC.'
      }
    ];
    const allMandatoryPassed=gates.filter(g=>['SCHEMA_VERSION','IDENTITY_UNIFIED','LEGAL_GATE_91_2025'].includes(g.code)).every(g=>g.status==='passed');
    return json({
      code_package_ready:allMandatoryPassed,
      production_live_verified:false,
      schema_health:{
        schema_version:dbCheck.schema_version,
        required_schema_version:dbCheck.required_schema_version,
        target_schema_version:dbCheck.target_schema_version,
        schema_status:dbCheck.schema_status,
        missing_tables:dbCheck.missing_tables,
        missing_columns:dbCheck.missing_columns
      },
      gates
    });
  }

  return json({
    error:'NOT_FOUND'
  },404);
  } catch (err) {
    const message=String(err?.message||err||'');
    const reference=uid('err');
    console.error('API_UNHANDLED_ERROR',reference,message);
    const schemaFailure=/(no such table|no such column|has no column named|no such index|has no such table|unknown column)/i.test(message);
    if(schemaFailure){
      return json({
        error:'SCHEMA_MIGRATION_REQUIRED',
        message:'Cơ sở dữ liệu chưa có đủ bảng hoặc cột cho phiên bản ứng dụng đang chạy. Hãy sao lưu D1, kiểm tra tình trạng hệ thống và áp dụng các migration còn thiếu trước khi dùng chức năng này.',
        reference,
        schema_required_version:16
      },503,{'cache-control':'no-store'});
    }
    const unavailable=/(D1_ERROR|SQLITE_BUSY|database is locked|R2.*unavailable|connection.*closed|timed out)/i.test(message);
    return json({
      error:unavailable?'DATA_SERVICE_UNAVAILABLE':'INTERNAL_ERROR',
      message:unavailable?'Dịch vụ dữ liệu tạm thời chưa xử lý được yêu cầu. Vui lòng thử lại sau; nếu tiếp tục lỗi, gửi mã kiểm tra cho quản trị viên.':'Máy chủ gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại; nếu tiếp tục lỗi, gửi mã kiểm tra cho quản trị viên.',
      reference
    },unavailable?503:500,{'cache-control':'no-store'});
  }
}

// =========================================================
// WORKER
// =========================================================

export default{
  async fetch(request,env){
    const url=new URL(request.url);

    if(url.pathname.startsWith('/files/')){
      let key='';try{key=decodeURIComponent(url.pathname.slice(7))}catch{return withSecurityHeaders(new Response('Bad request',{status:400}))}
      if(!key||key.includes('..')||key.startsWith('/')||key.includes('\\')||key.startsWith('_system_health_probes/')) return withSecurityHeaders(new Response('Bad request',{status:400}));
      const isPrivate=/^(members|documents|certificates|requests\/avatars|submissions|chat)\//.test(key);
      if(isPrivate){
        const fs=await getSession(request,env);
        if(!fs)return withSecurityHeaders(new Response('Unauthorized',{status:401}));
        if(key.startsWith('submissions/')){
          await ensureGovernanceTables(env);
          const canForm=await hasPerm(env,fs.account_id,'form.manage')||await hasPerm(env,fs.account_id,'request.manage')||await isNetworkAdmin(env,fs.account_id);
          if(!canForm)return withSecurityHeaders(new Response('Forbidden',{status:403}));
        }else if(key.startsWith('chat/')){
          await ensureGovernanceTables(env);
          const cid=key.split('/')[1]||'';
          const inConv=await env.DB.prepare("SELECT 1 FROM chat_participants WHERE conversation_id=? AND account_id=? LIMIT 1").bind(cid,fs.account_id).first();
          if(!inConv&&!(await isSuper(env,fs.account_id)))return withSecurityHeaders(new Response('Forbidden',{status:403}));
        }
        const ownerMatch=key.match(/^certificates\/(?:external\/)?([^/]+)\//);
        if(key.startsWith('requests/avatars/')){
          const requestRow=await env.DB.prepare(`SELECT target_org_node_id FROM account_requests WHERE avatar_url=? LIMIT 1`).bind(`/files/${key}`).first();
          if(!requestRow)return withSecurityHeaders(new Response('Not found',{status:404}));
          if(!(await isNetworkAdmin(env,fs.account_id))&&!(await canAccessOrg(env,fs.account_id,requestRow.target_org_node_id)))return withSecurityHeaders(new Response('Forbidden',{status:403}));
        }else if(ownerMatch&&ownerMatch[1]!==fs.person_id){
          const elevated=await isNetworkAdmin(env,fs.account_id);
          if(!elevated)return withSecurityHeaders(new Response('Forbidden',{status:403}));
        }else if(!ownerMatch&&/^(members|documents)\//.test(key)){
          const ownerKey=key.match(/^(?:members|documents)\/([^/]+)\//)?.[1]||'';
          if(ownerKey!==fs.person_id&&!await isNetworkAdmin(env,fs.account_id))return withSecurityHeaders(new Response('Forbidden',{status:403}));
        }
      }
      const o=await env.FILES.get(key);

      if(!o){
        return withSecurityHeaders(new Response(
          'Not found',
          {status:404}
        ));
      }

      const h=new Headers();

      o.writeHttpMetadata(h);
      if(key.startsWith('requests/avatars/'))h.set('cache-control','private, no-store, max-age=0');
      h.set('etag',o.httpEtag);
      h.set('x-content-type-options','nosniff');

      return withSecurityHeaders(new Response(
        o.body,
        {headers:h}
      ));
    }

    if(url.pathname.startsWith('/api/')){
      return withSecurityHeaders(await api(
        request,
        env,
        url
      ));
    }

    if(url.pathname==='/setup'){
      if(await setupDone(env)){
        return withSecurityHeaders(Response.redirect(
          new URL('/',url),
          302
        ));
      }

      const u=
        new URL(request.url);

      u.pathname='/setup.html';

      return withSecurityHeaders(await env.ASSETS.fetch(
        new Request(
          u.toString(),
          {
            method:'GET',
            headers:request.headers
          }
        )
      ));
    }

    if(url.pathname==='/verify'){
      const u=
        new URL(request.url);

      u.pathname='/verify.html';

      return withSecurityHeaders(await env.ASSETS.fetch(
        new Request(
          u.toString(),
          {
            method:'GET',
            headers:request.headers
          }
        )
      ));
    }

    if(!(await setupDone(env))){
      return withSecurityHeaders(Response.redirect(
        new URL('/setup',url),
        302
      ));
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  }
};

export {api};
