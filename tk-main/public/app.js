const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

const esc=s=>String(s??'').replace(
  /[&<>"']/g,
  c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c])
);

const api=async(url,opt={})=>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try{
    const r=await fetch(url,{credentials:'same-origin',...opt,signal:controller.signal,
      headers:{...(opt.body?{'content-type':'application/json'}:{}),...(opt.headers||{})}});
    let d;try{d=await r.json()}catch{throw new Error('Máy chủ trả dữ liệu không hợp lệ. Vui lòng thử lại.')}
    if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('Dữ liệu phản hồi không hợp lệ.');
    if(!r.ok)throw Object.assign(new Error(d.error||'REQUEST_FAILED'),{status:r.status,data:d});
    return d;
  }catch(e){if(e.name==='AbortError')throw new Error('Yêu cầu quá thời gian. Kiểm tra kết quả trước khi thử lại.');throw e}
  finally{clearTimeout(timeout)}
};
const safeStore={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}};

const logo='/sfn-logo.png';
const vietnamDateInput=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${v.year}-${v.month}-${v.day}`};

const PORTALS=[
  ['Cổng chính Sky First Network','https://skyfirst.io.vn'],
  ['Cổng Thông tin','https://ctt.skyfirst.io.vn'],
  ['Cổng Tình nguyện viên','https://tnv.skyfirst.io.vn'],
  ['Cổng SFEC','https://sfec.skyfirst.io.vn'],
  ['Lớp học trực tuyến','https://slc.skyfirst.io.vn']
];

const state={
  me:null,
  dashboard:null,
  view:'home',
  adminMember:null,
  adminMeta:null
};

const VIEW_CATALOG=[
  ['home','Trang chủ','Tổng quan thành viên'],['profile','Hồ sơ của tôi','Thông tin cá nhân'],['admin-issuance','Cấp phát & thẻ','Thẻ sự kiện và nghiệp vụ không tài khoản'],['journey','Hành trình của tôi','Dòng thời gian'],
  ['goals','Mục tiêu & Tiến độ','Mục tiêu'],['tasks','Công việc','Nhiệm vụ'],['activities','Hoạt động','Hoạt động cộng đồng'],
  ['certificates','Chứng nhận','Chứng chỉ'],['achievements','Thành tích & Ghi nhận','Thành tích'],['evaluations','Đánh giá của tôi','Đánh giá'],
  ['history','Quá trình công tác','Lịch sử vai trò'],['documents','Tài liệu của tôi','Tài liệu'],['cards','Thẻ của tôi','Thẻ thành viên'],
  ['cv','CV / Hồ sơ năng lực','CV'],['notifications','Thông báo','Thông báo'],['calendar','Lịch của tôi','Lịch'],
  ['security','Bảo mật & Phiên đăng nhập','Thiết bị bảo mật'],['support','Tài khoản & Hỗ trợ','Hỗ trợ']
];
let dirtyForm=false;
function toast(message,type='ok'){
  let host=$('#toastHost'); if(!host){host=document.createElement('div');host.id='toastHost';host.className='toast-host';document.body.append(host)}
  const el=document.createElement('div');el.className='toast '+type;el.textContent=message;host.append(el);setTimeout(()=>el.remove(),3600);
}
function goView(view){if(dirtyForm&&!confirm('Bạn có thay đổi chưa lưu. Rời trang này?'))return;dirtyForm=false;state.view=view;renderApp()}
function openCommandPalette(){
  const allowed=VIEW_CATALOG.filter(([id])=>state.me?.is_member||id.startsWith('admin-'));
  modal('Tìm kiếm & thao tác nhanh',`<div class="command-box"><input id="commandSearch" autofocus placeholder="Tìm hồ sơ, chứng nhận, bảo mật, lịch..." aria-label="Tìm chức năng"><div id="commandResults" class="command-results"></div></div>`);
  const draw=()=>{const q=($('#commandSearch').value||'').trim().toLowerCase();const rows=allowed.filter(x=>x.slice(1).join(' ').toLowerCase().includes(q)).slice(0,12);$('#commandResults').innerHTML=rows.map(([id,label,hint])=>`<button data-command-view="${id}"><b>${esc(label)}</b><span>${esc(hint)}</span></button>`).join('')||'<div class="empty">Không tìm thấy chức năng phù hợp.</div>';$$('[data-command-view]').forEach(b=>b.onclick=()=>{$('#modal')?.remove();goView(b.dataset.commandView)})};
  $('#commandSearch').oninput=draw;draw();
}
function maybeShowOnboarding(){
  if(!state.me?.is_member)return;
  const code=state.me.person?.member_code||state.me.person?.id||'member';const key='sfn:onboard:v1:'+code;
  if(safeStore.get(key))return;
  setTimeout(()=>{if($('#modal'))return;modal('Chào mừng đến Trung Tâm Thành Viên Số Sky First',`<div class="onboarding"><div class="onboarding-mark">SF</div><h3>Một nơi cho toàn bộ hành trình thành viên</h3><p class="muted">Bạn có thể hoàn thiện hồ sơ, quản lý thẻ và chứng nhận, theo dõi hoạt động, CV, lịch và bảo mật tài khoản tại đây.</p><div class="onboarding-grid"><button data-onboard="profile"><b>01 · Hồ sơ số</b><span>Hoàn thiện thông tin và ảnh đại diện</span></button><button data-onboard="cards"><b>02 · Thẻ thành viên</b><span>Xem thẻ và mã xác minh</span></button><button data-onboard="security"><b>03 · Bảo mật</b><span>Kiểm tra các phiên đang đăng nhập</span></button></div><button class="primary" id="finishOnboarding">Bắt đầu sử dụng</button></div>`);
    const finish=view=>{safeStore.set(key,'1');$('#modal')?.remove();if(view)goView(view)};$('#finishOnboarding').onclick=()=>finish();$$('[data-onboard]').forEach(b=>b.onclick=()=>finish(b.dataset.onboard));
  },250);
}

function installWorkspaceUX(){
  document.onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(state.me)openCommandPalette()}if(e.key==='Escape')$('#modal')?.remove()};
  window.onbeforeunload=e=>{if(dirtyForm){e.preventDefault();e.returnValue=''}};
  document.addEventListener('input',e=>{if(e.target.closest('#content form'))dirtyForm=true});
  document.addEventListener('submit',e=>{if(e.target.closest('#content form'))dirtyForm=false});
  const net=()=>document.body.classList.toggle('offline',!navigator.onLine);addEventListener('online',()=>{net();toast('Đã kết nối lại.')});addEventListener('offline',()=>{net();toast('Mất kết nối mạng. Dữ liệu chưa gửi sẽ được giữ trên trang.','warn')});net();
}
installWorkspaceUX();

const initials=n=>(
  String(n||'Sky First Network')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(x=>x[0])
    .join('')
    .toUpperCase()
  ||'Sky First Network'
);

const avatar=(p,cls='avatar')=>
  p?.avatar_url
    ?`<span class="${cls}">
        <img src="${esc(p.avatar_url)}" alt="">
      </span>`
    :`<span class="${cls}">
        <span class="avatar-fallback">
          ${esc(initials(p?.full_name))}
        </span>
      </span>`;

const portals=()=>PORTALS
  .map(
    ([n,u])=>
      `<a href="${u}" target="_blank" rel="noopener">${n}</a>`
  )
  .join('');

async function compressAvatar(file){
  if(!file||!file.type.startsWith('image/')){
    throw new Error('Vui lòng chọn ảnh JPG/PNG/WebP.');
  }

  const img=await createImageBitmap(file);
  const max=640;

  const scale=Math.min(
    1,
    max/Math.max(img.width,img.height)
  );

  const canvas=document.createElement('canvas');

  canvas.width=Math.max(
    1,
    Math.round(img.width*scale)
  );

  canvas.height=Math.max(
    1,
    Math.round(img.height*scale)
  );

  canvas
    .getContext('2d')
    .drawImage(
      img,
      0,
      0,
      canvas.width,
      canvas.height
    );

  return await new Promise(r=>
    canvas.toBlob(
      r,
      'image/webp',
      .78
    )
  );
}

async function uploadBinary(url,blob){
  const r=await fetch(url,{
    method:'POST',
    credentials:'same-origin',
    headers:{
      'content-type':blob.type
    },
    body:blob
  });

  const d=await r.json().catch(()=>({}));

  if(!r.ok){
    throw Object.assign(
      new Error(d.error||'UPLOAD_FAILED'),
      {data:d}
    );
  }

  return d;
}

async function boot(){
  window.__SFN_APP_STARTED__=true;
  try{
    state.me=await api('/api/me');
    if(state.me.force_password_change){renderForcedPasswordChange();return}
    state.dashboard=await api('/api/dashboard');
    renderApp();
  }catch(e){
    if(e.status===401){
      renderLogin();
    }else{
      renderError(e.message);
    }
  }
}

function routePublic(path){
  if(!['/login','/register','/registration-status'].includes(path))return;
  if(location.pathname!==path)history.pushState({publicPath:path},'',path);
  if(path==='/register')renderAccountRequest();
  else if(path==='/registration-status')renderRegistrationStatus();
  else renderLogin();
  scrollTo({top:0,behavior:'instant'});
}
window.addEventListener('popstate',()=>{if(!state.me)routePublic(location.pathname)});
function renderForcedPasswordChange(){
  $('#app').innerHTML=`<main class="standalone"><section class="standalone-panel" style="max-width:560px;margin:8vh auto"><img src="${logo}" alt="Sky First Network" style="width:64px;height:64px;object-fit:contain"><div class="eyebrow">BẢO MẬT TÀI KHOẢN</div><h1>Thiết lập mật khẩu mới</h1><p class="muted">Tài khoản vừa được cấp hoặc đặt lại. Hãy tạo mật khẩu riêng trước khi tiếp tục sử dụng hệ thống.</p><form id="forcedPasswordForm" class="modern-form"><label>Mật khẩu mới<input type="password" name="password" minlength="10" autocomplete="new-password" required></label><label>Nhập lại mật khẩu mới<input type="password" name="confirm" minlength="10" autocomplete="new-password" required></label><div id="forcedPasswordMsg" role="status" aria-live="polite"></div><button class="primary">Lưu mật khẩu và tiếp tục</button></form><p class="muted">Cần hỗ trợ? <a href="mailto:support@skyfirst.io.vn">support@skyfirst.io.vn</a></p></section></main>`;
  $('#forcedPasswordForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),password=String(f.get('password')||''),confirm=String(f.get('confirm')||''),msg=$('#forcedPasswordMsg'),btn=e.target.querySelector('button');if(password!==confirm){msg.textContent='Mật khẩu nhập lại chưa khớp.';return}if(password.length<10){msg.textContent='Mật khẩu cần ít nhất 10 ký tự.';return}btn.disabled=true;msg.textContent='Đang cập nhật mật khẩu...';try{await api('/api/me/password',{method:'POST',body:JSON.stringify({current_password:'',new_password:password})});state.me=await api('/api/me');state.dashboard=await api('/api/dashboard');renderApp();toast('Đã đổi mật khẩu. Tài khoản của bạn đã sẵn sàng.')}catch(err){msg.textContent=err.data?.message||err.data?.error||err.message}finally{btn.disabled=false}};
}
function renderRegistrationStatus(){
  $('#app').innerHTML=`<main class="standalone"><header class="standalone-header"><a href="/login" data-public-path="/login"><img src="${logo}" alt="Sky First Network"> Trung tâm Thành viên Số</a><a href="/register" data-public-path="/register">Đăng ký mới →</a></header><section class="standalone-panel lookup-panel"><div class="eyebrow">SKY FIRST MEMBER IDENTITY</div><h1>Tra cứu hồ sơ đăng ký</h1><p class="muted">Nhập mã yêu cầu và email đã đăng ký để kiểm tra trạng thái xét duyệt.</p><form id="statusForm" class="modern-form"><label>Mã đăng ký<input name="code" required autocomplete="off" placeholder="Mã yêu cầu được cấp sau khi gửi"></label><label>Email đăng ký<input type="email" name="email" required autocomplete="email"></label><button class="primary">Tra cứu trạng thái →</button><div id="statusResult" role="status" aria-live="polite"></div></form><p class="muted">Cần hỗ trợ? <a href="mailto:support@skyfirst.io.vn">support@skyfirst.io.vn</a></p></section></main>`;
  wirePublicLinks();
  const qs=new URLSearchParams(location.search);if(qs.has('request'))$('#statusForm').elements.code.value=qs.get('request');if(qs.has('email'))$('#statusForm').elements.email.value=qs.get('email');
  $('#statusForm').onsubmit=async e=>{e.preventDefault();const dta=new FormData(e.target),out=$('#statusResult');out.textContent='Đang kiểm tra hồ sơ...';try{const d=await api('/api/public/account-request/status?code='+encodeURIComponent(dta.get('code'))+'&email='+encodeURIComponent(dta.get('email')));out.innerHTML=`<div class="request-note"><b>${esc(d.request.request_code)}</b><br>Trạng thái: <strong>${esc(statusVi(d.request.status))}</strong>${d.request.admin_note?`<p>Phản hồi: ${esc(d.request.admin_note)}</p>`:''}</div>`}catch{out.textContent='Không tìm thấy hồ sơ phù hợp. Vui lòng kiểm tra lại mã và email.'}};
}
function wirePublicLinks(){document.querySelectorAll('[data-public-path]').forEach(a=>a.onclick=e=>{e.preventDefault();routePublic(a.dataset.publicPath)})}
function showRegistrationPage(title,html){
  $('#app').innerHTML=`<main class="standalone register-screen"><header class="standalone-header"><a href="/login" data-public-path="/login"><img src="${logo}" alt="Sky First Network"> Trung tâm Thành viên Số</a><a href="/registration-status" data-public-path="/registration-status">Tra cứu đăng ký →</a></header><section class="standalone-panel register-panel"><div class="eyebrow">THAM GIA SKY FIRST NETWORK</div><h1>${esc(title)}</h1><p class="muted">Hoàn thành các bước bên dưới. Thông tin chỉ được xử lý để xét duyệt và quản lý hồ sơ theo chính sách của hệ thống.</p><div class="wizard-progress" id="wizardProgress" aria-live="polite"></div>${html}</section></main>`;
  wirePublicLinks();
}
function initRegistrationWizard(form){
  const children=[...form.children];
  const groups=[[],[],[],[]];let step=0;
  for(const el of children){
    const h=(el.querySelector('h3')?.textContent||'').trim().toLowerCase();
    if(h.includes('học tập'))step=1;
    else if(h.includes('thông tin đăng ký'))step=2;
    else if(h.includes('thông tin cha/mẹ'))step=3;
    groups[step].push(el);
  }
  const sections=groups.map((nodes,i)=>{const section=document.createElement('section');section.className='wizard-step request-grid';section.dataset.step=i;for(const n of nodes)section.append(n);form.append(section);return section});
  const controls=document.createElement('div');controls.className='wizard-controls';controls.innerHTML='<button type="button" id="wizardPrev" class="secondary">← Quay lại</button><button type="button" id="wizardNext" class="primary">Tiếp tục →</button>';form.append(controls);
  // Keep the real submit button inside final section, and never submit early.
  const submit=sections[3].querySelector('button[type="submit"],button.primary.full');if(submit)submit.type='submit';
  const labels=['Thông tin cá nhân','Học tập / công tác','Đơn vị tham gia','Xác nhận & gửi'];
  let current=0;
  const draw=()=>{sections.forEach((s,i)=>{s.hidden=i!==current});$('#wizardProgress').innerHTML=labels.map((label,i)=>`<div class="wizard-dot ${i===current?'current':i<current?'done':''}"><b>0${i+1}</b><span>${label}</span></div>`).join('');$('#wizardPrev').hidden=current===0;$('#wizardNext').hidden=current===3;window.scrollTo({top:0,behavior:'smooth'})};
  $('#wizardPrev').onclick=()=>{if(current>0){current--;draw()}};
  $('#wizardNext').onclick=()=>{
    const fields=[...sections[current].querySelectorAll('input,select,textarea')].filter(el=>!el.closest('[hidden]')&&el.offsetParent!==null);
    const invalid=fields.find(x=>!x.checkValidity());if(invalid){invalid.reportValidity();invalid.focus();return}
    if(current===2&&!form.querySelectorAll('[name="requested_org_ids"]:checked').length){toast('Vui lòng chọn ít nhất một đơn vị tham gia.','warn');return}
    current=Math.min(current+1,3);draw()
  };
  draw();
}
async function loadPublicStats(){
  const box=$('#impactNumbers');if(!box)return;
  try{
    const d=await api('/api/public/portal-config');
    if(!$('#impactNumbers'))return;
    box.innerHTML=(d.stats||[]).map((x,i)=>`<article class="impact-stat"><strong data-count="${Number(x.value)||0}" data-index="${i}">0</strong><span>${esc(x.label)}</span></article>`).join('')||'<span class="muted">Chào mừng đến với Sky First Network</span>';
    $('#impactTagline').textContent=d.tagline||'';
    const animate=()=>{
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      box.querySelectorAll('[data-count]').forEach(el=>{
        const goal=Number(el.dataset.count)||0,start=performance.now();
        if(reduced){el.textContent=goal.toLocaleString('vi-VN');return}
        const frame=now=>{if(!el.isConnected)return;const t=Math.min(1,(now-start)/1150),ease=1-Math.pow(1-t,3);el.textContent=Math.round(goal*ease).toLocaleString('vi-VN');if(t<1)requestAnimationFrame(frame)};
        requestAnimationFrame(frame);
      });
    };
    if('IntersectionObserver' in window){const io=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){io.disconnect();animate()}},{threshold:.2});io.observe(box)}else animate();
  }catch{box.innerHTML='<span class="muted">Thông tin hoạt động sẽ được cập nhật.</span>'}
}
function renderLogin(){
  if(location.pathname==='/register'){renderAccountRequest();return}
  if(location.pathname==='/registration-status'){renderRegistrationStatus();return}
  $('#app').innerHTML=`
    <main class="identity-gate">
      <section class="gate-story" aria-label="Sky First Network">
        <div class="gate-brand"><img src="${logo}" alt="Sky First Network"><div><strong>SKY FIRST NETWORK</strong><span>MEMBER IDENTITY</span></div></div>
        <div class="gate-copy">
          <span class="gate-kicker">TRUNG TÂM THÀNH VIÊN SỐ · DIGITAL MEMBER CENTER</span>
          <h1>Một hồ sơ.<br>Mọi hành trình<br>tại Sky First.</h1>
          <p>Không gian định danh số dành cho thành viên: vai trò, đơn vị, hoạt động, hồ sơ, thành tích và những đóng góp được kết nối trong cùng một nơi.</p>
          <div class="impact-row"><span>GIÁO DỤC</span><span>CỘNG ĐỒNG</span><span>TÌNH NGUYỆN</span></div>
          <div id="impactNumbers" class="impact-numbers" aria-live="polite"><span class="muted">Đang tải số liệu hoạt động…</span></div><p class="impact-tagline" id="impactTagline"></p>
        </div>
        <div class="gate-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="gate-foot">MẠNG LƯỚI GIÁO DỤC &amp; PHÁT TRIỂN CỘNG ĐỒNG SKY FIRST</div>
      </section>
      <section class="gate-panel">
        <div class="auth-box">
          <div class="auth-mobile-brand"><img src="${logo}" alt=""><b>SKY FIRST NETWORK</b></div>
          <div class="auth-tabs"><button class="active" data-auth-tab="login">ĐĂNG NHẬP</button><button data-auth-tab="register">ĐĂNG KÝ</button></div>
          <div id="authLoginPane">
            <div class="auth-heading"><span>MEMBER ACCESS</span><h2>Chào mừng trở lại.</h2><p>Đăng nhập bằng tài khoản thành viên Sky First của bạn.</p></div>
            <form id="loginForm" class="modern-form">
              <label>Tên đăng nhập / Email<input name="login" required autocomplete="username" placeholder="Nhập tên đăng nhập hoặc email"></label>
              <label>Mật khẩu<div class="password-wrap"><input name="password" type="password" required autocomplete="current-password" placeholder="Nhập mật khẩu"><button type="button" id="togglePassword" aria-label="Hiện mật khẩu">◉</button></div></label>
              <button class="primary auth-submit">ĐĂNG NHẬP <span>→</span></button>
            </form>
            <p id="msg" class="msg"></p>
            <div class="auth-actions"><button type="button" id="forgotPassword" class="link-button">Quên mật khẩu?</button><button type="button" id="checkRequest" class="link-button">Tra cứu đăng ký</button></div>
          </div>
          <div id="authRegisterPane" hidden>
            <div class="auth-heading"><span>MEMBER REGISTRATION</span><h2>Đăng ký thành viên.</h2><p>Hồ sơ được gửi đến Sky First để xác minh trước khi tài khoản được kích hoạt.</p></div>
            <div class="register-preview"><div><b>01</b><span>Cá nhân &amp; định danh</span></div><div><b>02</b><span>Học tập &amp; công việc</span></div><div><b>03</b><span>Đơn vị Sky First</span></div><div><b>04</b><span>Xác minh &amp; cam kết</span></div></div>
            <button type="button" id="startRegistration" class="primary auth-submit">BẮT ĐẦU ĐĂNG KÝ <span>→</span></button>
            <button type="button" id="checkRequestRegister" class="link-button register-lookup">Tra cứu đăng ký đã gửi</button>
          </div>
          <div class="auth-trust"><span>Thông tin định danh được giới hạn quyền truy cập.</span><span>Tài khoản chỉ kích hoạt sau khi Sky First xác nhận.</span></div>
          <div class="auth-ecosystem"><b>Hệ sinh thái Sky First</b><div>${portals()}</div></div>
          <div class="auth-legal"><a href="/support.html">Hỗ trợ</a><a href="/privacy.html">Bảo mật</a><a href="/terms.html">Điều khoản</a></div>
        </div>
      </section>
    </main>`;

  $$('[data-auth-tab]').forEach(b=>b.onclick=()=>{if(b.dataset.authTab==='register')routePublic('/register')});
  $('#startRegistration').onclick=()=>routePublic('/register');
  $('#checkRequest').onclick=()=>routePublic('/registration-status');
  $('#checkRequestRegister').onclick=()=>routePublic('/registration-status');
  loadPublicStats();
  $('#forgotPassword').onclick=()=>{modal('Đặt lại mật khẩu',`<form id="forgotForm" class="form-grid"><p class="muted">Nhập tên đăng nhập hoặc email. Nếu tài khoản hợp lệ, hệ thống sẽ gửi liên kết đặt lại mật khẩu.</p><label>Tên đăng nhập / Email<input name="login" required autocomplete="username"></label><button class="primary">Gửi liên kết bảo mật</button><div id="forgotMsg" class="msg"></div></form>`);$('#forgotForm').onsubmit=async e=>{e.preventDefault();const login=new FormData(e.target).get('login');await api('/api/public/password/forgot',{method:'POST',body:JSON.stringify({login})}).catch(()=>null);$('#forgotMsg').textContent='Nếu tài khoản tồn tại, hướng dẫn đã được gửi đến email đăng ký.'}};
  $('#togglePassword').onclick=()=>{const i=$('#loginForm').elements.password;i.type=i.type==='password'?'text':'password'};
  $('#loginForm').onsubmit=async e=>{e.preventDefault();const msg=$('#msg');const b=Object.fromEntries(new FormData(e.target));msg.textContent='Đang xác minh...';try{await api('/api/auth/login',{method:'POST',body:JSON.stringify(b)});await boot()}catch(err){const code=err?.data?.error||'';msg.textContent=code==='INVALID_LOGIN'?'Tên đăng nhập hoặc mật khẩu không đúng.':code==='ACCOUNT_LOCKED'?'Tài khoản đang bị khóa.':code==='ACCOUNT_BANNED'?'Tài khoản bị giới hạn truy cập. Vui lòng liên hệ support@skyfirst.io.vn.':'Không thể đăng nhập lúc này. Vui lòng thử lại.'}};
  const resetToken=new URLSearchParams(location.search).get('reset_token');
  if(resetToken){modal('Tạo mật khẩu mới',`<form id="resetForm" class="form-grid"><label>Mật khẩu mới (ít nhất 10 ký tự)<input type="password" name="password" minlength="10" required autocomplete="new-password"></label><button class="primary">Cập nhật mật khẩu</button><div id="resetMsg" class="msg"></div></form>`);$('#resetForm').onsubmit=async e=>{e.preventDefault();const password=new FormData(e.target).get('password');try{await api('/api/public/password/reset',{method:'POST',body:JSON.stringify({token:resetToken,password})});history.replaceState({},'',location.pathname);$('#resetMsg').textContent='Đã đổi mật khẩu. Bạn có thể đăng nhập ngay.'}catch{$('#resetMsg').textContent='Liên kết không hợp lệ hoặc đã hết hạn.'}}}
}

/* =========================================================
   YÊU CẦU CẤP TÀI KHOẢN
   ========================================================= */

async function renderAccountRequest(){

  let orgs=[];

  try{
    orgs=(
      await api('/api/public/org-options')
    ).items||[];
  }catch{}


  showRegistrationPage(
    'Đăng ký thành viên',
    `
    <div class="request-note">

      <b>
        Tất cả thông tin trong hồ sơ đăng ký đều bắt buộc.
      </b>

      Sau khi gửi yêu cầu,
      Mạng lưới Giáo dục & Phát triển Cộng đồng
      Sky First sẽ tiếp nhận,
      kiểm tra và phê duyệt.

      Thời gian xử lý dự kiến từ
      <b>60 phút đến 48 giờ</b>,
      có thể thay đổi tùy số lượng yêu cầu
      và quá trình xác minh.

      Vui lòng thường xuyên kiểm tra email
      và lưu lại <b>Mã yêu cầu</b>
      để tra cứu trạng thái.

    </div>


    <form
      id="requestForm"
      class="request-grid"
      style="margin-top:14px"
    >


      <!-- THÔNG TIN CÁ NHÂN -->

      <div class="full">
        <h3>
          THÔNG TIN CÁ NHÂN
        </h3>
      </div>


      <label>
        Họ và tên *
        <input
          name="full_name"
          required
        >
      </label>


      <label>
        Tên hiển thị *
        <input
          name="display_name"
          required
        >
      </label>


      <label>
        Ngày sinh *
        <input
          type="date"
          name="date_of_birth"
          required
        >
      </label>


      <label>
        Giới tính *

        <select
          name="gender"
          required
        >

          <option value="">
            Chọn
          </option>

          <option value="Nam">
            Nam
          </option>

          <option value="Nữ">
            Nữ
          </option>

          <option value="Khác">
            Khác
          </option>

          <option value="Không muốn công khai">
            Không muốn công khai
          </option>

        </select>
      </label>


      <label>
        Quốc tịch *

        <input
          name="nationality"
          required
          value="Việt Nam"
        >
      </label>


      <label>
        Số CCCD / định danh cá nhân *

        <input
          name="id_number"
          inputmode="numeric"
          maxlength="12"
          pattern="[0-9]{12}"
          title="Số CCCD phải gồm đúng 12 chữ số."
          required
        >
      </label>


      <label>
        Ngày cấp *

        <input
          type="date"
          name="id_issue_date"
          required
        >
      </label>


      <label>
        Nơi cấp *

        <input
          name="id_issue_place"
          required
        >
      </label>


      <label>
        Email *

        <input
          type="email"
          name="email"
          required
        >
      </label>


      <label>
        Số điện thoại *

        <input
          name="phone"
          required
        >
      </label>


      <label class="full">
        Địa chỉ thường trú *

        <input
          name="permanent_address"
          required
        >
      </label>


      <label class="full">
        Địa chỉ tạm trú / nơi ở hiện tại *

        <input
          name="temporary_address"
          required
        >
      </label>


      <!-- HỌC TẬP / CÔNG VIỆC -->
      <div class="full" style="margin-top:8px"><h3>HỌC TẬP &amp; CÔNG VIỆC</h3><p class="file-help">Tất cả mục đều bắt buộc. Nếu không còn đi học hoặc chưa đi làm, hãy chọn đúng trạng thái thay vì để trống.</p></div>
      <label>Tình trạng học tập *<select name="education_status" required><option value="">Chọn</option><option>Đang học</option><option>Đã tốt nghiệp</option><option>Không còn theo học</option></select></label>
      <label>Trường / Cơ sở đào tạo *<input name="school_name" required placeholder="Nếu không còn theo học, nhập trường/cơ sở gần nhất"></label>
      <label>Lớp / Ngành / Chuyên ngành *<input name="class_or_major" required></label>
      <label>Tình trạng công việc *<select name="employment_status" required><option value="">Chọn</option><option>Đang đi làm</option><option>Chưa đi làm</option><option>Tạm nghỉ</option></select></label>
      <label>Đơn vị làm việc *<input name="workplace_name" required placeholder="Nếu chưa đi làm, nhập: Chưa đi làm"></label>
      <label>Phòng ban / Bộ phận *<input name="work_department" required placeholder="Nếu không áp dụng, nhập: Không áp dụng"></label>
      <label class="full">Chức danh / Nghề nghiệp *<input name="job_title" required placeholder="Nếu chưa đi làm, nhập: Chưa đi làm"></label>
      <input type="hidden" name="education_or_work_type" value="Học tập & Công việc">
      <input type="hidden" name="school_or_workplace" value="Được lưu theo hồ sơ mở rộng">
      <!-- ĐƠN VỊ ĐĂNG KÝ -->

      <div
        class="full"
        style="margin-top:8px"
      >
        <h3>
          THÔNG TIN ĐĂNG KÝ Sky First Network
        </h3>
      </div>


      <label class="full">Đơn vị chính đăng ký *<select name="target_org_node_id" required><option value="">Chọn đơn vị chính</option>${orgs.map(o=>`<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('')}</select></label>
      <div class="full"><b>Đơn vị tham gia *</b><p class="file-help">Có thể chọn nhiều đơn vị. Quyền và khả năng nhìn thấy thành viên sẽ được giới hạn theo từng đơn vị sau khi được xác nhận.</p><div class="unit-choice-grid">${orgs.map(o=>`<label class="unit-choice"><input type="checkbox" name="requested_org_ids" value="${esc(o.id)}"> <span>${esc(o.name)}</span></label>`).join('')}</div></div>


      <label class="full">
        Ảnh đại diện *

        <input
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          required
        >
      </label>


      <!-- NGƯỜI GIÁM HỘ -->

      <div
        id="guardianFields"
        class="full"
        style="display:none"
      >

        <div class="card">

          <h3>
            THÔNG TIN CHA/MẸ/NGƯỜI GIÁM HỘ
          </h3>

          <div class="request-grid">


            <label>
              Họ và tên người giám hộ *

              <input
                name="guardian_full_name"
              >
            </label>


            <label>
              Mối quan hệ *

              <select
                name="guardian_relationship"
              >

                <option value="">
                  Chọn
                </option>

                <option value="Cha">
                  Cha
                </option>

                <option value="Mẹ">
                  Mẹ
                </option>

                <option value="Người giám hộ hợp pháp">
                  Người giám hộ hợp pháp
                </option>

                <option value="Khác">
                  Khác
                </option>

              </select>
            </label>


            <label>
              Số điện thoại *

              <input
                name="guardian_phone"
              >
            </label>


            <label>
              Email người giám hộ *

              <input
                type="email"
                name="guardian_email"
              >
            </label>
            <label>Ngày sinh người đại diện *<input type="date" name="guardian_date_of_birth"></label>
            <label>Số CCCD / định danh người đại diện *<input name="guardian_id_number" inputmode="numeric" maxlength="20"></label>


            <label class="full">

              <input
                type="checkbox"
                name="guardian_lives_together"
                value="1"
              >

              Tôi đang ở cùng
              cha/mẹ/người giám hộ này

            </label>


            <label
              id="guardianAddressWrap"
              class="full"
            >

              Địa chỉ hiện tại
              của người giám hộ *

              <input
                name="guardian_address"
              >

            </label>

          </div>
        </div>
      </div>


      <!-- BẢO MẬT -->

      <div class="request-note full">

        <b>
          🔒 Bảo mật thông tin cá nhân:
        </b>

        Các thông tin được cung cấp trong biểu mẫu
        được Sky First Network sử dụng phục vụ việc xác minh,
        xét duyệt, quản lý tài khoản và hồ sơ thành viên.

        Thông tin được giới hạn quyền truy cập
        cho những cá nhân có thẩm quyền
        theo phạm vi nhiệm vụ.

        Sky First Network không cung cấp thông tin cá nhân
        cho bên thứ ba ngoài mục đích đã thông báo,
        trừ trường hợp có sự đồng ý phù hợp
        hoặc theo yêu cầu, quy định của pháp luật.

      </div>


      <label class="full">

        <input
          type="checkbox"
          name="privacy_consent"
          value="1"
          required
        >

        Tôi xác nhận các thông tin đã cung cấp
        là chính xác và đồng ý để Sky First Network xử lý
        các thông tin này phục vụ việc xét duyệt,
        quản lý tài khoản và hồ sơ thành viên. *

      </label>


      <button class="primary full">
        GỬI ĐĂNG KÝ
      </button>


      <div
        id="requestMsg"
        class="full"
      ></div>

    </form>
    `
  );


  const form=$('#requestForm');
  initRegistrationWizard(form);

  const dob=
    form.elements.date_of_birth;

  const gbox=
    $('#guardianFields');

  const same=
    form.elements.guardian_lives_together;

  const addr=
    form.elements.guardian_address;

  const educationType=form.elements.education_or_work_type;
  const educationStatus=form.elements.education_status;
  const schoolWorkInput=form.elements.school_or_workplace;
  const classMajorInput=form.elements.class_or_major;


  const age=()=>{

    if(!dob.value){
      return null;
    }

    const d=
      new Date(
        dob.value+'T00:00:00'
      );

    const n=
      new Date();

    let a=
      n.getFullYear()-
      d.getFullYear();

    if(
      n.getMonth()<d.getMonth()||
      (
        n.getMonth()===d.getMonth()&&
        n.getDate()<d.getDate()
      )
    ){
      a--;
    }

    return a;
  };


  const syncGuardian=()=>{

    const currentAge=age();

    const minor=
      currentAge!==null&&
      currentAge<18;

    gbox.style.display=
      minor
        ?'block'
        :'none';


    [
      'guardian_full_name',
      'guardian_relationship',
      'guardian_phone',
      'guardian_email',
      'guardian_date_of_birth',
      'guardian_id_number'
    ].forEach(n=>{

      form.elements[n].required=
        minor;

    });


    addr.required=
      minor&&!same.checked;


    $('#guardianAddressWrap').style.display=
      minor&&!same.checked
        ?'block'
        :'none';
  };


  const syncEducationFields=()=>{};

  dob.onchange=
    syncGuardian;

  same.onchange=
    syncGuardian;




  syncGuardian();

  syncEducationFields();


  form.onsubmit=async e=>{

    e.preventDefault();


    const btn=
      e.target.querySelector(
        'button.primary'
      );


    btn.disabled=true;

    btn.textContent=
      'ĐANG GỬI...';


    try{

      const fd=
        new FormData(e.target);


      const idNumber=
        String(
          fd.get('id_number')||''
        ).trim();


      if(!/^\d{12}$/.test(idNumber)){

        throw new Error(
          'Số CCCD phải gồm đúng 12 chữ số.'
        );

      }


      const currentAge=age();


      if(
        currentAge!==null&&
        currentAge<18
      ){

        const requiredGuardian=[
          'guardian_full_name',
          'guardian_relationship',
          'guardian_phone',
          'guardian_email',
          'guardian_date_of_birth',
          'guardian_id_number'
        ];


        for(
          const field
          of requiredGuardian
        ){

          if(
            !String(
              fd.get(field)||''
            ).trim()
          ){

            throw new Error(
              'Vui lòng điền đầy đủ thông tin cha/mẹ/người giám hộ.'
            );

          }
        }


        if(
          !fd.get(
            'guardian_lives_together'
          )&&
          !String(
            fd.get(
              'guardian_address'
            )||''
          ).trim()
        ){

          throw new Error(
            'Vui lòng nhập địa chỉ hiện tại của người giám hộ.'
          );

        }
      }


      if(
        !String(
          fd.get(
            'education_or_work_type'
          )||''
        ).trim()
      ){

        throw new Error(
          'Vui lòng chọn thông tin học tập / công tác.'
        );

      }


      for(const field of ['school_name','class_or_major','employment_status','workplace_name','work_department','job_title']){
        if(!String(fd.get(field)||'').trim()) throw new Error('Vui lòng điền đầy đủ thông tin học tập và công việc.');
      }
      const requestedOrgs=fd.getAll('requested_org_ids').map(String).filter(Boolean);
      const primaryOrg=String(fd.get('target_org_node_id')||'');
      if(primaryOrg&&!requestedOrgs.includes(primaryOrg)) requestedOrgs.unshift(primaryOrg);
      if(!requestedOrgs.length) throw new Error('Vui lòng chọn ít nhất một đơn vị Sky First.');


      if(
        !String(
          fd.get(
            'education_status'
          )||''
        ).trim()
      ){

        throw new Error(
          'Vui lòng chọn tình trạng học tập / công tác.'
        );

      }


      if(
        !fd.get(
          'privacy_consent'
        )
      ){

        throw new Error(
          'Bạn cần xác nhận đồng ý xử lý thông tin trước khi gửi yêu cầu.'
        );

      }


      const avatarFile=
        fd.get('avatar');


      const blob=
        await compressAvatar(
          avatarFile
        );


      const up=
        await uploadBinary(
          '/api/public/request-avatar',
          blob
        );


      const body=Object.fromEntries(fd);
      body.requested_org_ids=fd.getAll('requested_org_ids').map(String).filter(Boolean);


      delete body.avatar;


      body.avatar_url=
        up.url;


      body.guardian_lives_together=
        fd.get(
          'guardian_lives_together'
        )
          ?'1'
          :'0';


      body.privacy_consent=
        fd.get(
          'privacy_consent'
        )
          ?'1'
          :'0';


      const d=
        await api(
          '/api/public/account-request',
          {
            method:'POST',
            body:JSON.stringify(body)
          }
        );


      e.target.innerHTML=`
        <div class="request-note full">

          <b>
            ĐĂNG KÝ ĐÃ ĐƯỢC TIẾP NHẬN
          </b>

          <br>

          Mã đăng ký:

          <b>
            ${esc(d.request_code)}
          </b>

          <br><br>

          ${esc(d.message)}

        </div>
      `;


    }catch(err){

      btn.disabled=false;

      btn.textContent=
        'GỬI ĐĂNG KÝ';


      $('#requestMsg').textContent=
        'Không thể gửi: '+
        (
          err.data?.field
            ?`thiếu ${err.data.field}`
            :(
              err.data?.error||
              err.message
            )
        );

    }
  };
}


/* =========================================================
   NAVIGATION / APP
   ========================================================= */

const NAV_ICONS={
  home:'⌂',profile:'◎',journey:'↗',goals:'◔',tasks:'✓',activities:'✦',certificates:'▣',achievements:'★',evaluations:'◫',history:'↺',documents:'▤',cards:'▱',cv:'▥',notifications:'◉',calendar:'▦',security:'⌁',support:'?',
  'admin-issuance':'▱','admin-requests':'◌','admin-calendar':'▦','admin-members':'◎','admin-org':'⌘','admin-audit':'◒','admin-super':'✧','admin-studio':'◈','admin-work':'✓','admin-reports':'▥','admin-system':'⚙'
};
function navButton(id,label){
  const icon=NAV_ICONS[id]||'•';
  return `
    <button data-view="${id}" class="${state.view===id?'active':''}" aria-current="${state.view===id?'page':'false'}">
      <span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label">${label}</span>
    </button>
  `;
}

const VIEW_META={
  home:['Tổng quan','Không gian điều hành hành trình thành viên'],profile:['Hồ sơ của tôi','Định danh và thông tin thành viên'],journey:['Hành trình của tôi','Các cột mốc và đóng góp'],goals:['Mục tiêu & Tiến độ','Theo dõi mục tiêu cá nhân'],tasks:['Công việc','Nhiệm vụ và tiến độ'],activities:['Hoạt động','Các hoạt động đã tham gia'],certificates:['Chứng nhận','Kho chứng nhận đã xác minh'],achievements:['Thành tích & Ghi nhận','Những dấu mốc nổi bật'],evaluations:['Đánh giá của tôi','Kết quả và lịch sử đánh giá'],history:['Quá trình công tác','Vai trò và đơn vị theo thời gian'],documents:['Tài liệu của tôi','Tài liệu cá nhân và minh chứng'],cards:['Thẻ của tôi','Thẻ thành viên và xác minh QR'],cv:['CV / Hồ sơ năng lực','Hồ sơ năng lực một trang A4'],notifications:['Thông báo','Thông tin mới và việc cần chú ý'],calendar:['Lịch của tôi','Lịch hoạt động và lịch cá nhân'],security:['Bảo mật & Phiên đăng nhập','Thiết bị và phiên truy cập'],support:['Tài khoản & Hỗ trợ','Cài đặt và trung tâm hỗ trợ'],
  'admin-issuance':['Cấp phát & thẻ','Tạo thẻ 2 mặt và nghiệp vụ không tài khoản'], 'admin-requests':['Yêu cầu cấp tài khoản','Tiếp nhận và phê duyệt hồ sơ'], 'admin-calendar':['Lịch Sky First Network','Điều hành lịch hệ thống'], 'admin-members':['Thành viên','Quản trị hồ sơ và tài khoản'], 'admin-org':['Cơ cấu tổ chức','Đơn vị, vai trò và phạm vi'], 'admin-audit':['Nhật ký hệ thống','Theo dõi thao tác quản trị'], 'admin-work':['Trung tâm công việc','Việc đang chờ xử lý và cảnh báo'], 'admin-reports':['Báo cáo & thống kê','Số liệu vận hành từ dữ liệu thật'], 'admin-super':['SUPER_ADMIN Center','Tổng quan và kiểm soát hệ thống'], 'admin-studio':['Cấu hình giao diện & thống kê','Điều chỉnh nội dung và số liệu'], 'admin-system':['Cấu hình hệ thống','Bộ lọc, an toàn và tình trạng dịch vụ']
};
function currentViewMeta(){return VIEW_META[state.view]||['Trung tâm thành viên số','Không gian quản trị Sky First'];}

function hasP(code){

  return !!(
    state.me?.is_super||
    state.me?.permissions?.includes(code)
  );
}


function canAdmin(){

  return (
    state.me?.is_super||
    state.me?.permissions?.some(
      x=>[
        'member.view',
        'org.manage',
        'audit.view',
        'certificate.manage',
        'account.manage',
        'request.manage',
        'calendar.view',
        'calendar.manage',
        'evaluation.view',
        'evaluation.manage',
        'role.manage',
        'system.manage',
        'member.edit',
        'org.delete',
        'card.manage',
        'activity.manage',
        'achievement.manage',
        'goal.manage',
        'task.manage'
      ].includes(x)
    )
  );
}


function renderApp(){

  const p=
    state.me.person;


  $('#app').innerHTML=`
    <div class="app-shell">

      <aside class="sidebar" id="memberSidebar">

        <div class="side-brand">

          <img
            class="side-logo"
            src="${logo}"
            alt="Sky First Network"
          >

          <div>

            <div class="side-brand-title">
              TRUNG TÂM THÀNH VIÊN SỐ SKY FIRST
            </div>

            <div class="side-brand-sub">
              Sky First Network
            </div>

          </div>

        </div>


        <div class="nav-scroll">

          ${
            state.me.is_member
              ?`
                <div class="nav-section">
                  Cá nhân
                </div>

                <nav class="nav">

                  ${navButton(
                    'home',
                    'Trang chủ'
                  )}

                  ${navButton(
                    'profile',
                    'Hồ sơ của tôi'
                  )}

                  ${navButton(
                    'journey',
                    'Hành trình của tôi'
                  )}

                  ${navButton(
                    'goals',
                    'Mục tiêu & Tiến độ'
                  )}

                  ${navButton(
                    'tasks',
                    'Công việc'
                  )}

                  ${navButton(
                    'activities',
                    'Hoạt động'
                  )}

                  ${navButton(
                    'certificates',
                    'Chứng nhận'
                  )}

                  ${navButton(
                    'achievements',
                    'Thành tích & Ghi nhận'
                  )}

                  ${navButton(
                    'evaluations',
                    'Đánh giá của tôi'
                  )}

                  ${navButton(
                    'history',
                    'Quá trình công tác'
                  )}

                  ${navButton(
                    'documents',
                    'Tài liệu của tôi'
                  )}

                  ${navButton(
                    'cards',
                    'Thẻ của tôi'
                  )}

                  ${navButton(
                    'cv',
                    'CV / Hồ sơ năng lực'
                  )}

                  ${navButton(
                    'notifications',
                    'Thông báo'
                  )}

                  ${navButton(
                    'calendar',
                    'Lịch của tôi'
                  )}

                  ${navButton('security','Bảo mật & Phiên đăng nhập')}

                  ${navButton(
                    'support',
                    'Tài khoản & Hỗ trợ'
                  )}

                </nav>
              `
              :''
          }


          ${
            canAdmin()
              ?`
                <div class="nav-section">
                  Điều hành
                </div>

                <nav class="nav">

                  ${
                    hasP('request.manage')
                      ?navButton(
                          'admin-requests',
                          'Yêu cầu cấp tài khoản'
                        )
                      :''
                  }

                  ${
                    hasP('calendar.manage')
                      ?navButton(
                          'admin-calendar',
                          'Lịch Sky First Network'
                        )
                      :''
                  }

                  ${hasP('card.manage')?navButton('admin-issuance','Cấp phát & thẻ'):''}

                  ${
                    hasP('member.view')
                      ?navButton(
                          'admin-members',
                          'Thành viên'
                        )
                      :''
                  }

                  ${
                    hasP('org.manage')
                      ?navButton(
                          'admin-org',
                          'Cơ cấu tổ chức'
                        )
                      :''
                  }

                  ${
                    hasP('audit.view')
                      ?navButton(
                          'admin-audit',
                          'Nhật ký hệ thống'
                        )
                      :''
                  }

                  ${hasP('member.view')?navButton('admin-work','Trung tâm công việc')+navButton('admin-reports','Báo cáo & thống kê'):''}${state.me?.is_super?navButton('admin-super','SUPER_ADMIN Center')+navButton('admin-studio','Cấu hình giao diện & thống kê')+navButton('admin-system','Cấu hình hệ thống'):''}

                </nav>
              `
              :''
          }

        </div>


        <div class="sidebar-links">

          ${portals()}

          <a href="mailto:support@skyfirst.io.vn">
            Hỗ trợ: support@skyfirst.io.vn
          </a>

        </div>


        <div class="side-bottom">

          <button
            id="logout"
            class="ghost"
          >
            Đăng xuất
          </button>

        </div>

      </aside>


      <button class="sidebar-backdrop" id="sidebarBackdrop" aria-label="Đóng menu"></button>
      <main class="main">

        <div class="topbar">
          <div class="topbar-title">
            <button class="mobile-menu" id="mobileMenu" aria-label="Mở menu" aria-controls="memberSidebar">☰</button>
            <div>
              <div class="breadcrumb"><span>SKY FIRST</span><i>›</i><span>${esc(currentViewMeta()[0])}</span></div>
              <h1>${esc(currentViewMeta()[0])}</h1>
              <p>${esc(currentViewMeta()[1])}</p>
            </div>
          </div>
          <div class="top-actions">
            <button class="quick-search" id="openCommand" title="Tìm kiếm (Ctrl/⌘ + K)" aria-label="Tìm kiếm chức năng">⌕ <span>Tìm kiếm</span><kbd>Ctrl K</kbd></button>
            <div class="top-user">
              ${avatar(p)}
              <div class="top-user-copy"><b>${esc(p.display_name||p.full_name)}</b><span>${state.me.is_member?esc(p.member_code||'Thành viên'):'SUPER ADMIN'}</span></div>
              <span class="status-dot ${p.status==='active'?'on':''}" title="${p.status==='active'?'Đang hoạt động':'Không hoạt động'}"></span>
            </div>
          </div>
        </div>

        <div class="offline-banner" role="status">Bạn đang ngoại tuyến · các thao tác cần máy chủ sẽ tạm dừng</div>
        <div id="content"></div>

      </main>

    </div>
  `;


  $$('[data-view]').forEach(b=>b.onclick=()=>{goView(b.dataset.view);document.body.classList.remove('sidebar-open')});
  $('#openCommand')?.addEventListener('click',openCommandPalette);
  $('#mobileMenu')?.addEventListener('click',()=>document.body.classList.toggle('sidebar-open'));
  $('#sidebarBackdrop')?.addEventListener('click',()=>document.body.classList.remove('sidebar-open'));

  $('#logout').onclick=async()=>{

    await api(
      '/api/auth/logout',
      {
        method:'POST'
      }
    );

    state.me=null;

    renderLogin();

  };


  if(
    !state.me.is_member&&
    state.view==='home'
  ){

    state.view=
      hasP('request.manage')
        ?'admin-requests'
        :hasP('member.view')
          ?'admin-members'
          :hasP('org.manage')
            ?'admin-org'
            :'admin-audit';

  }


  renderView();
  maybeShowOnboarding();
}


async function refreshMe(){

  state.me=
    await api('/api/me');

  state.dashboard=
    await api('/api/dashboard');

}


function modal(title,body){

  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <div
      class="modal-backdrop"
      id="modal"
    >

      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">

        <div class="modal-head">

          <h2>
            ${esc(title)}
          </h2>

          <button
            class="modal-close"
            onclick="document.querySelector('#modal').remove()"
          >
            ×
          </button>

        </div>

        ${body}

      </div>

    </div>
    `
  );
}
function fieldsForm(p={}){

  return `
    <div class="form-grid two">

      <label>
        Họ và tên
        <input
          name="full_name"
          value="${esc(p.full_name||'')}"
          required
        >
      </label>

      <label>
        Tên hiển thị
        <input
          name="display_name"
          value="${esc(p.display_name||'')}"
        >
      </label>

      <label>
        Ngày sinh
        <input
          type="date"
          name="date_of_birth"
          value="${esc(p.date_of_birth||'')}"
        >
      </label>

      <label>
        Giới tính
        <input
          name="gender"
          value="${esc(p.gender||'')}"
        >
      </label>

      <label>
        Quốc tịch
        <input
          name="nationality"
          value="${esc(p.nationality||'Việt Nam')}"
        >
      </label>

      <label>
        CCCD / định danh
        <input
          name="id_number"
          value="${esc(p.id_number||'')}"
        >
      </label>

      <label>
        Ngày cấp
        <input
          type="date"
          name="id_issue_date"
          value="${esc(p.id_issue_date||'')}"
        >
      </label>

      <label>
        Nơi cấp
        <input
          name="id_issue_place"
          value="${esc(p.id_issue_place||'')}"
        >
      </label>

      <label>
        Email
        <input
          type="email"
          name="email"
          value="${esc(p.email||'')}"
        >
      </label>

      <label>
        Điện thoại
        <input
          name="phone"
          value="${esc(p.phone||'')}"
        >
      </label>

      <label class="full">
        Địa chỉ thường trú
        <input
          name="permanent_address"
          value="${esc(p.permanent_address||'')}"
        >
      </label>

      <label class="full">
        Nơi ở hiện tại
        <input
          name="temporary_address"
          value="${esc(p.temporary_address||'')}"
        >
      </label>

      <label>
        Đối tượng hiện tại

        <select name="education_or_work_type">

          <option value="">
            Chưa cập nhật
          </option>

          <option
            value="Học sinh"
            ${p.education_or_work_type==='Học sinh'?'selected':''}
          >
            Học sinh
          </option>

          <option
            value="Sinh viên"
            ${p.education_or_work_type==='Sinh viên'?'selected':''}
          >
            Sinh viên
          </option>

          <option
            value="Đang đi làm"
            ${p.education_or_work_type==='Đang đi làm'?'selected':''}
          >
            Đang đi làm
          </option>

          <option
            value="Khác"
            ${p.education_or_work_type==='Khác'?'selected':''}
          >
            Khác
          </option>

        </select>
      </label>

      <label>
        Tình trạng học tập / công tác

        <select name="education_status">

          <option value="">
            Chưa cập nhật
          </option>

          <option
            value="Đang học"
            ${p.education_status==='Đang học'?'selected':''}
          >
            Đang học
          </option>

          <option
            value="Đã tốt nghiệp"
            ${p.education_status==='Đã tốt nghiệp'?'selected':''}
          >
            Đã tốt nghiệp
          </option>

          <option
            value="Đang công tác"
            ${p.education_status==='Đang công tác'?'selected':''}
          >
            Đang công tác
          </option>

          <option
            value="Khác"
            ${p.education_status==='Khác'?'selected':''}
          >
            Khác
          </option>

        </select>
      </label>

      <label>
        Trường / Đơn vị công tác
        <input
          name="school_or_workplace"
          value="${esc(p.school_or_workplace||'')}"
        >
      </label>

      <label>
        Lớp / Ngành / Chuyên ngành / Vị trí
        <input
          name="class_or_major"
          value="${esc(p.class_or_major||'')}"
        >
      </label>

    </div>
  `;
}


async function renderView(){

  const c=$('#content');

  if(!c){
    return;
  }

  try{

    if(state.view==='home'){
      const d=state.dashboard||await api('/api/dashboard');
      const p=state.me.person;
      const goalRows=Array.isArray(d.goals)?d.goals:[];
      const goalProgress=goalRows.length?Math.round(goalRows.reduce((sum,x)=>sum+Number(x.progress||0),0)/goalRows.length):0;
      const fields=['full_name','email','phone','avatar_url','date_of_birth','permanent_address','school_or_workplace','class_or_major'];
      const profilePct=Math.round(fields.filter(k=>String(p[k]||'').trim()).length/fields.length*100);
      c.innerHTML=`
        <section class="dashboard-hero">
          <div class="dashboard-hero-glow"></div>
          <div class="dashboard-hero-copy">
            <span class="hero-kicker">DIGITAL MEMBER IDENTITY · ${esc(statusVi(p.status)).toUpperCase()}</span>
            <h1>Xin chào, ${esc(p.display_name||p.full_name)}.</h1>
            <p>Mọi vai trò, hoạt động và cột mốc của bạn được kết nối trong một hồ sơ số duy nhất.</p>
            <div class="hero-actions"><button class="primary" data-view-jump="profile">Hoàn thiện hồ sơ <span>→</span></button><button class="hero-ghost" data-view-jump="cards">Mở thẻ thành viên</button></div>
          </div>
          <div class="dashboard-hero-card">
            ${avatar(p,'hero-avatar')}
            <div><span class="eyebrow">MEMBER ID</span><strong>${esc(p.member_code||'Chưa cấp mã')}</strong><small>${esc(p.full_name)}</small></div>
            <div class="hero-card-line"><span>Hồ sơ</span><b>${profilePct}%</b></div>
            <div class="meter"><i style="width:${profilePct}%"></i></div>
          </div>
        </section>
        <div class="dashboard-section-head"><div><span class="eyebrow">TỔNG QUAN</span><h2>Trạng thái hành trình</h2></div><button class="text-action" data-view-jump="journey">Xem hành trình →</button></div>
        <div class="dashboard-metrics">
          <button class="dashboard-metric" data-view-jump="goals"><span class="metric-icon blue">◔</span><span><b>${goalProgress}%</b><small>Tiến độ mục tiêu</small></span><i>↗</i></button>
          <button class="dashboard-metric" data-view-jump="tasks"><span class="metric-icon violet">✓</span><span><b>${Number(d.tasks||0)}</b><small>Công việc liên quan</small></span><i>↗</i></button>
          <button class="dashboard-metric" data-view-jump="activities"><span class="metric-icon green">✦</span><span><b>${Number(d.activities||0)}</b><small>Hoạt động đã tham gia</small></span><i>↗</i></button>
          <button class="dashboard-metric" data-view-jump="certificates"><span class="metric-icon gold">▣</span><span><b>${Number(d.certificates||0)}</b><small>Chứng nhận xác minh</small></span><i>↗</i></button>
        </div>
        <div class="dashboard-lower">
          <section class="card dashboard-panel journey-pulse">
            <div class="panel-head"><div><span class="eyebrow">MEMBER PULSE</span><h3>Hồ sơ & dấu ấn</h3></div><span class="badge ok">${profilePct}% hoàn thiện</span></div>
            <div class="pulse-row"><span>Hồ sơ thành viên</span><b>${profilePct}%</b></div><div class="progress premium-progress"><i style="width:${profilePct}%"></i></div>
            <div class="pulse-row"><span>Mục tiêu hiện tại</span><b>${goalProgress}%</b></div><div class="progress premium-progress"><i style="width:${goalProgress}%"></i></div>
            <div class="pulse-grid"><button data-view-jump="achievements"><b>${Number(d.achievements||0)}</b><span>Thành tích</span></button><button data-view-jump="notifications"><b>${Number(d.unread||0)}</b><span>Thông báo chưa đọc</span></button></div>
          </section>
          <section class="card dashboard-panel quick-panel">
            <div class="panel-head"><div><span class="eyebrow">SHORTCUTS</span><h3>Thao tác nhanh</h3></div></div>
            <button class="quick-row" data-view-jump="cards"><span class="quick-icon">▱</span><span><b>Thẻ thành viên</b><small>Xem QR xác minh và trạng thái</small></span><i>→</i></button>
            <button class="quick-row" data-view-jump="cv"><span class="quick-icon">▥</span><span><b>CV / Hồ sơ năng lực</b><small>Tạo hồ sơ A4 chuyên nghiệp</small></span><i>→</i></button>
            <button class="quick-row" data-view-jump="security"><span class="quick-icon">⌁</span><span><b>Bảo mật</b><small>Kiểm tra thiết bị và phiên đăng nhập</small></span><i>→</i></button>
          </section>
        </div>`;
      $$('[data-view-jump]').forEach(btn=>btn.onclick=()=>goView(btn.dataset.viewJump));
      return;
    }


    if(state.view==='profile'){
      return renderProfile(c);
    }

    if(state.view==='journey'){
      return renderJourney(c);
    }

    if(state.view==='goals'){
      return renderGoals(c);
    }

    if(state.view==='tasks'){
      return renderTasks(c);
    }

    if(state.view==='activities'){

      return renderList(
        c,
        'Hoạt động',
        '/api/me/activities',
        x=>`
          <b>${esc(x.name)}</b>

          <div class="meta">
            ${esc(x.org_name||'Sky First Network')}
            ·
            ${esc(x.role_label||'Thành viên')}
            ·
            ${esc(x.starts_at||'')}
          </div>

          ${
            x.result
              ?`<div>${esc(x.result)}</div>`
              :''
          }
        `
      );
    }

    if(state.view==='certificates'){
      return renderCertificates(c);
    }

    if(state.view==='achievements'){

      return renderList(
        c,
        'Thành tích & Ghi nhận',
        '/api/me/achievements',
        x=>`
          <b>${esc(x.title)}</b>

          <div class="meta">
            ${esc(x.issuer||'Sky First Network')}
            ·
            ${esc(x.achieved_at||'')}
          </div>

          ${
            x.description
              ?`<div>${esc(x.description)}</div>`
              :''
          }
        `
      );
    }

    if(state.view==='history'){

      return renderList(
        c,
        'Quá trình công tác',
        '/api/me/history',
        x=>`
          <b>
            ${esc(x.title||x.role_label||'Thành viên')}
          </b>

          <div>
            ${esc(x.org_name||'Sky First Network')}
          </div>

          <div class="meta">
            ${esc(x.started_at||'')}
            →
            ${esc(x.ended_at||'hiện tại')}
            ·
            ${statusVi(x.status)}
          </div>

          ${
            x.decision_ref
              ?`<div class="meta">
                  Văn bản: ${esc(x.decision_ref)}
                </div>`
              :''
          }
        `
      );
    }

    if(state.view==='evaluations'){ return renderList(c,'Đánh giá của tôi','/api/me/evaluations',x=>`<b>${esc(x.period_label||x.period_type)}</b><div class="meta">${esc(x.org_name||'Sky First Network')} · ${esc(x.evaluator_username||'Quản trị')} · ${x.total_score??'—'} điểm · ${esc(x.rating||'Chưa xếp loại')}</div>${x.comments?`<div>${esc(x.comments)}</div>`:''}`); }

    if(state.view==='documents'){
      return renderDocuments(c);
    }

    if(state.view==='cards'){
      return renderCards(c);
    }

    if(state.view==='cv'){
      return renderCV(c);
    }

    if(state.view==='notifications'){
      return renderNotifications(c);
    }

    if(state.view==='calendar'){
      return renderCalendar(c,false);
    }

    if(state.view==='security'){
      return renderSecurity(c);
    }

    if(state.view==='support'){
      return renderSupport(c);
    }

    if(state.view==='admin-issuance'){return renderIssuanceStudio(c)}

    if(state.view==='admin-requests'){
      return renderAdminRequests(c);
    }

    if(state.view==='admin-calendar'){
      return renderCalendar(c,true);
    }

    if(state.view==='admin-members'){
      return renderAdminMembers(c);
    }

    if(state.view==='admin-org'){
      return renderAdminOrg(c);
    }

    if(state.view==='admin-audit'){
      return renderAdminAudit(c);
    }
    if(state.view==='admin-work'){return renderAdminWork(c)}
    if(state.view==='admin-reports'){return renderAdminReports(c)}
    if(state.view==='admin-system'){return renderAdminSystem(c)}
    if(state.view==='admin-studio'){return renderPortalStudio(c)}
    if(state.view==='admin-super'){
      return renderSuperAdmin(c);
    }


    c.innerHTML=`
      <div class="card empty">
        Chức năng chưa khả dụng.
      </div>
    `;

  }catch(e){

    console.error(
      'RENDER_VIEW_ERROR',
      e
    );

    c.innerHTML=`
      <div class="card">

        <b>
          Không thể tải nội dung.
        </b>

        <p class="muted">
          Vui lòng thử lại. Nếu lỗi tiếp diễn, liên hệ bộ phận hỗ trợ.
        </p>

      </div>
    `;
  }
}


async function renderJourney(c){
  c.innerHTML=`<div class="section-title"><div><h1>Hành trình của tôi tại Sky First</h1><p class="muted">Dòng thời gian tổng hợp vai trò, hoạt động, thành tích và chứng nhận trong hồ sơ số của bạn.</p></div></div><div id="journeyBox" class="card">Đang tải...</div>`;
  try{
    const d=await api('/api/me/journey');
    const labels={membership:'Vai trò & đơn vị',activity:'Hoạt động',certificate:'Chứng nhận',achievement:'Thành tích'};
    $('#journeyBox').outerHTML=`<div class="timeline">${d.items?.length?d.items.map(x=>`<div class="list-item"><div class="eyebrow">${esc(labels[x.kind]||'Hành trình')}</div><b>${esc(x.title||'')}</b><div>${esc(x.subtitle||'')}</div><div class="meta">${esc(x.event_at||'')} · ${statusVi(x.status||'')}</div></div>`).join(''):'<div class="card empty">Hành trình sẽ xuất hiện khi hồ sơ có hoạt động hoặc ghi nhận.</div>'}</div>`;
  }catch(e){$('#journeyBox').textContent='Không thể tải hành trình.'}
}

async function renderGoals(c){

  c.innerHTML=`
    <div class="section-title">
      <h1>
        Mục tiêu & Tiến độ
      </h1>
    </div>

    <div
      id="goalBox"
      class="card"
    >
      Đang tải...
    </div>
  `;

  try{

    const d=
      await api('/api/me/goals');

    $('#goalBox').outerHTML=`
      <div class="list">

        ${
          d.items?.length
            ?d.items.map(
                x=>`
                  <div class="list-item">

                    <div class="section-title" style="margin:0">

                      <div>
                        <b>
                          ${esc(x.title)}
                        </b>

                        <div class="meta">
                          ${esc(x.period_type||'')}
                          ${x.due_at?' · Hạn '+esc(x.due_at):''}
                        </div>
                      </div>

                      <span class="badge">
                        ${Number(x.progress||0)}%
                      </span>

                    </div>

                    ${
                      x.description
                        ?`<div>${esc(x.description)}</div>`
                        :''
                    }

                    <div class="meta">
                      ${statusVi(x.status)}
                    </div>

                  </div>
                `
              ).join('')
            :'<div class="card empty">Chưa có mục tiêu.</div>'
        }

      </div>
    `;

  }catch(e){

    $('#goalBox').textContent=
      'Không thể tải mục tiêu.';
  }
}


async function renderTasks(c){

  c.innerHTML=`
    <div class="section-title">
      <h1>
        Công việc
      </h1>
    </div>

    <div
      id="taskBox"
      class="card"
    >
      Đang tải...
    </div>
  `;

  try{

    const d=
      await api('/api/me/tasks');

    $('#taskBox').outerHTML=`
      <div class="list">

        ${
          d.items?.length
            ?d.items.map(
                x=>`
                  <div class="list-item">

                    <div class="section-title" style="margin:0">

                      <div>
                        <b>
                          ${esc(x.title)}
                        </b>

                        <div class="meta">
                          ${
                            x.due_at
                              ?'Hạn '+esc(x.due_at)
                              :'Không có hạn'
                          }
                        </div>
                      </div>

                      <span class="badge">
                        ${Number(x.progress||0)}%
                      </span>

                    </div>

                    ${
                      x.description
                        ?`<div>${esc(x.description)}</div>`
                        :''
                    }

                    <div class="meta">
                      ${statusVi(x.status)}
                    </div>

                  </div>
                `
              ).join('')
            :'<div class="card empty">Chưa có công việc.</div>'
        }

      </div>
    `;

  }catch{

    $('#taskBox').textContent=
      'Không thể tải công việc.';
  }
}


async function renderNotifications(c){

  c.innerHTML=`
    <h1>
      Thông báo
    </h1>

    <div
      id="notificationBox"
      class="card"
    >
      Đang tải...
    </div>
  `;

  try{

    const d=
      await api('/api/me/notifications');

    $('#notificationBox').outerHTML=`
      <div class="list">

        ${
          d.items?.length
            ?d.items.map(
                x=>`
                  <div class="list-item">

                    <b>
                      ${esc(x.title)}
                    </b>

                    <div>
                      ${esc(x.body||'')}
                    </div>

                    <div class="meta">
                      ${esc(x.created_at||'')}
                    </div>

                  </div>
                `
              ).join('')
            :'<div class="card empty">Chưa có thông báo.</div>'
        }

      </div>
    `;

  }catch{

    $('#notificationBox').textContent=
      'Không thể tải thông báo.';
  }
}


async function renderProfile(c){

  const p=
    state.me?.person;

  if(!p){
    c.innerHTML=`
      <div class="card">
        Không thể tải hồ sơ thành viên.
      </div>
    `;
    return;
  }

  c.innerHTML=`
    <div class="section-title">

      <div>
        <h1>
          Hồ sơ của tôi
        </h1>

        <p class="muted">
          Thông tin cá nhân và thông tin học tập / công tác.
        </p>
      </div>

      <button
        id="editProfile"
        class="primary"
      >
        Cập nhật hồ sơ
      </button>

    </div>


    <div class="profile-head card">

      ${avatar(p,'avatar large')}

      <div>

        <h2>
          ${esc(p.full_name)}
        </h2>

        <div class="muted">
          ${esc(p.member_code||'')}
        </div>

        <div class="meta">
          ${statusVi(p.status)}
        </div>

      </div>

    </div>


    <div
      class="card"
      style="margin-top:14px"
    >

      ${
        [
          ['Tên hiển thị',p.display_name],
          ['Ngày sinh',p.date_of_birth],
          ['Giới tính',p.gender],
          ['Quốc tịch',p.nationality],
          ['Email',p.email],
          ['Số điện thoại',p.phone],
          ['Địa chỉ thường trú',p.permanent_address],
          ['Nơi ở hiện tại',p.temporary_address],

          [
            'Đối tượng hiện tại',
            p.education_or_work_type
          ],

          [
            'Trường / Đơn vị công tác',
            p.school_or_workplace
          ],

          [
            'Lớp / Ngành / Chuyên ngành / Vị trí',
            p.class_or_major
          ],

          [
            'Tình trạng học tập / công tác',
            p.education_status
          ]
        ]
        .map(
          x=>`
            <div class="kv">
              <b>${x[0]}</b>
              <span>${esc(x[1]||'—')}</span>
            </div>
          `
        )
        .join('')
      }

    </div>
  `;


  $('#editProfile').onclick=()=>{

    modal(
      'Cập nhật hồ sơ',
      `
      <form
        id="profileForm"
        class="form-grid"
      >

        ${fieldsForm(p)}

        <label>
          Ảnh đại diện

          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
          >
        </label>

        <button class="primary">
          Lưu thay đổi
        </button>

      </form>
      `
    );


    $('#profileForm').onsubmit=async e=>{

      e.preventDefault();

      const fd=
        new FormData(e.target);

      const b=
        Object.fromEntries(fd);

      const avatarFile=
        fd.get('avatar');

      delete b.avatar;


      try{

        if(
          avatarFile&&
          avatarFile.size
        ){

          const blob=
            await compressAvatar(
              avatarFile
            );

          const up=
            await uploadBinary(
              '/api/me/avatar',
              blob
            );

          b.avatar_url=
            up.url;
        }


        await api(
          '/api/me',
          {
            method:'PATCH',
            body:JSON.stringify(b)
          }
        );


        await refreshMe();

        $('#modal')?.remove();

        dirtyForm=false;
        toast('Đã cập nhật hồ sơ.');
        renderApp();

      }catch(err){
        toast(err.data?.message||({
          PERSONAL_FIELD_REQUIRED:'Vui lòng kiểm tra các trường bắt buộc.',
          EMAIL_INVALID:'Email không hợp lệ.',
          ID_NUMBER_MUST_BE_12_DIGITS:'CCCD phải gồm đúng 12 chữ số.',
          EMAIL_ALREADY_USED:'Email này đã được sử dụng.'
        })[err.data?.error]||err.data?.error||err.message,'warn');
      }
    };
  };
}


function cardTheme(x){
  let raw={};try{raw=JSON.parse(x.card_template_json||'{}')}catch{}
  return {accent:/^#[a-f0-9]{6}$/i.test(raw.accent||'')?raw.accent:'#2366c9',logo_url:/^\/files\/branding\/cards\/[a-f0-9-]+\.(png|jpg|webp)$/i.test(raw.logo_url||'')?raw.logo_url:logo,subtitle:String(raw.subtitle||'').slice(0,90)};
}
function cardClass(x){
  if(/(?:^|\b)(chủ tịch|phó chủ tịch|tổng thư ký|chairperson|president|secretary.general)(?:\b|$)/i.test(String(x.title_on_card||'')+' '+String(x.card_type_name||'')))return 'leadership';

  const c=
    (
      x.card_type_code||
      ''
    ).toLowerCase();

  return c.includes('executive')
    ?'executive'
    :c.includes('volunteer')
      ?'volunteer'
      :c.includes('alumni')
        ?'alumni'
        :'';
}


function cardVerifyUrl(x){
  if(!x.verify_token)return '';
  return location.origin+'/verify?code='+encodeURIComponent(x.verify_token);
}

function cardQrSrc(x, size = 180){
  if(!x?.verify_token) return '';
  const url = cardVerifyUrl(x);
  if(!url) return '';
  const allowedSize=[120,170,180,600].includes(Number(size))?Number(size):180;
  return `/api/public/card-qr?size=${allowedSize}&code=${encodeURIComponent(x.verify_token)}`;
}

function printCardWindow(x,p){
  // V4 compatibility: printed card keeps class="photo" and class="qr" semantics through Card Studio.
  if(!x?.verify_token){toast('Không thể in thẻ thiếu mã QR xác minh hợp lệ.','warn');return}
  const t=templateFor({name:x.card_type_name||'Thẻ thành viên',template_json:x.card_template_json||'{}'});
  openCardPrint({...x,full_name:p?.full_name||x.full_name,photo_url:p?.avatar_url||x.photo_url},t);
}
async function downloadMemberCard(x,p,side='front'){
  if(!x?.verify_token){toast('Thẻ chưa có QR xác minh.','warn');return}
  const t=templateFor({name:x.card_type_name||'Thẻ thành viên',template_json:x.card_template_json||'{}'});
  await downloadCardPdf({...x,full_name:p?.full_name||x.full_name,photo_url:p?.avatar_url||x.photo_url},t);
}

function renderCards(c){
  c.innerHTML=`<div class="section-title"><h1>Thẻ của tôi</h1></div><div class="notice">Ảnh trên thẻ, bản in/PDF và trang xác minh lấy từ ảnh hồ sơ thành viên hiện tại. QR của mỗi thẻ dẫn tới đúng bản ghi xác minh công khai.</div><div id="cardsBox" class="card">Đang tải...</div>`;
  api('/api/me/cards').then(d=>{
    const p=state.me.person;
    $('#cardsBox').outerHTML=`<div id="cardsBox" class="card-wallet">${d.items?.length?d.items.map(x=>`
      <div class="member-card ${cardClass(x)}" style="position:relative;min-height:294px;padding-right:126px;${cardClass(x)==='leadership'?'':`background:linear-gradient(135deg,#071b31,${cardTheme(x).accent})`}">
        <img class="member-card-logo" src="${esc(cardTheme(x).logo_url)}" alt="Logo đơn vị / chương trình">
        <div class="eyebrow">${esc(cardTheme(x).subtitle||'SKY FIRST NETWORK')}</div>
        <h3>${esc(x.card_type_name||'THẺ THÀNH VIÊN')}</h3>
        <img src="${esc(p.avatar_url||'/sfn-logo.png')}" alt="Ảnh ${esc(p.full_name)}" style="width:82px;height:104px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.55);margin:7px 0">
        <div style="font-size:18px;font-weight:850">${esc(p.full_name)}</div>
        <div class="small">${esc(p.member_code||'')}</div>
        <div class="small">${esc(x.card_number||'')} · ${esc(x.org_name||'Sky First Network')}</div>
        ${x.title_on_card?`<div class="small">${esc(x.title_on_card)}</div>`:''}
        <div class="small">Hiệu lực: ${esc(x.issued_at||'—')} → ${esc(x.expires_at||'Không thời hạn')}</div>
        ${x.verify_token?`<img src="${esc(cardQrSrc(x,170))}" alt="QR xác minh" style="position:absolute;right:22px;top:88px;width:92px;height:92px;background:#fff;padding:4px;border-radius:8px">`:`<div class="card-qr-missing">Thẻ chưa có QR xác minh — liên hệ quản trị để xử lý</div>`}
        <div class="card-status">${statusVi(x.status)}</div>
        <div class="toolbar" style="margin-top:10px"><button data-card-verify="${esc(x.verify_token||'')}" ${x.verify_token?'':'disabled title="Thẻ chưa có mã QR xác minh"'}>Xác minh</button><button data-card-print="${esc(x.id)}" ${x.verify_token?'':'disabled'}>Tải PDF hai mặt</button></div>
      </div>`).join(''):'<div class="empty">Chưa có thẻ điện tử.</div>'}</div>`;
    $$('[data-card-verify]').forEach(b=>b.onclick=()=>{if(b.dataset.cardVerify)window.open('/verify?code='+encodeURIComponent(b.dataset.cardVerify),'_blank','noopener')});
    $$('[data-card-print]').forEach(b=>b.onclick=async()=>{const x=d.items.find(v=>v.id===b.dataset.cardPrint);if(!x)return;b.disabled=true;try{await downloadMemberCard(x,p)}catch(e){toast(e.message||'Không thể tạo PDF thẻ.','warn')}finally{b.disabled=false}});
  }).catch(err=>{$('#cardsBox').textContent='Không thể tải thẻ: '+(err.data?.message||err.data?.error||err.message)});
}


async function renderCertificates(c){

  c.innerHTML=`
    <h1>
      Chứng nhận
    </h1>

    <div
      id="certificateBox"
      class="card"
    >
      Đang tải...
    </div>
  `;

  try{

    const d=
      await api('/api/me/certificates');

    $('#certificateBox').outerHTML=`
      <div class="list">

        ${
          d.items?.length
            ?d.items.map(
                x=>`
                  <div class="list-item">

                    <b>
                      ${esc(x.title)}
                    </b>

                    <div class="meta">
                      ${esc(x.certificate_no||'')}
                      ·
                      ${esc(x.issuer||'Sky First Network')}
                      ·
                      ${esc(x.issued_at||'')}
                    </div>

                    ${
                      x.recognition
                        ?`<div>
                            ${esc(x.recognition)}
                          </div>`
                        :''
                    }

                    <div class="actions">

                      ${
                        x.file_url
                          ?`<button
                              onclick="window.open('${esc(x.file_url)}','_blank')"
                            >
                              Xem PDF
                            </button>`
                          :''
                      }

                      ${
                        x.verify_code
                          ?`<button
                              onclick="window.open('/verify?code=${encodeURIComponent(x.verify_code)}','_blank')"
                            >
                              Xác minh
                            </button>`
                          :''
                      }

                    </div>

                  </div>
                `
              ).join('')
            :'<div class="card empty">Chưa có chứng nhận.</div>'
        }

      </div>
    `;

  }catch{

    $('#certificateBox').textContent=
      'Không thể tải chứng nhận.';
  }
}


async function renderDocuments(c){

  c.innerHTML=`
    <h1>
      Tài liệu của tôi
    </h1>

    <div
      id="docBox"
      class="card"
    >
      Đang tải...
    </div>
  `;

  try{

    const d=
      await api('/api/me/documents');

    $('#docBox').outerHTML=`
      <div class="list">

        ${
          d.items.length
            ?d.items.map(
                x=>`
                  <div class="list-item">

                    <b>
                      ${esc(x.title)}
                    </b>

                    <div class="meta">
                      ${esc(x.document_type)}
                      ·
                      ${esc(x.issued_at||x.created_at)}
                    </div>

                    ${
                      x.file_url
                        ?`
                          <div
                            class="actions"
                            style="margin-top:9px"
                          >

                            <button
                              onclick="window.open('${esc(x.file_url)}','_blank')"
                            >
                              Mở tài liệu
                            </button>

                          </div>
                        `
                        :''
                    }

                  </div>
                `
              ).join('')
            :'<div class="card empty">Chưa có tài liệu.</div>'
        }

      </div>
    `;

  }catch{

    $('#docBox').textContent=
      'Không thể tải dữ liệu.';
  }
}


async function renderList(
  c,
  title,
  url,
  row
){

  c.innerHTML=`
    <h1>
      ${title}
    </h1>

    <div
      id="listBox"
      class="card"
    >
      Đang tải...
    </div>
  `;

  try{

    const d=
      await api(url);

    $('#listBox').outerHTML=`
      <div class="list">

        ${
          d.items.length
            ?d.items.map(
                x=>`
                  <div class="list-item">
                    ${row(x)}
                  </div>
                `
              ).join('')
            :'<div class="card empty">Chưa có dữ liệu.</div>'
        }

      </div>
    `;

  }catch{

    $('#listBox').textContent=
      'Không thể tải dữ liệu.';
  }
}


function printOnePageCV({p,memberships,activities,certificates,achievements}){
  const includeContact=confirm('Có đưa email và số điện thoại vào bản PDF?\nOK: Có · Hủy: Ẩn thông tin liên hệ (khuyến nghị nếu chia sẻ công khai).');
  const w=window.open('','_blank','width=900,height=750');
  if(!w){toast('Trình duyệt chặn cửa sổ in. Hãy bật cửa sổ bật lên để lưu PDF.','warn');return}
  const list=(items,map,limit=3)=>items.slice(0,limit).map(map).join('')||'<p class="note">Chưa có dữ liệu được ghi nhận.</p>';
  const role=memberships.find(x=>x.status==='active')||memberships[0];
  const name=esc(p.full_name||'Thành viên Sky First');
  const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>CV Sky First - ${name}</title><style>
  @page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#173752;background:#fff;margin:0;font-size:9pt;line-height:1.48;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{height:276mm;overflow:hidden}.head{background:linear-gradient(112deg,#0c3152,#1674b6);color:#fff;border-radius:12px;padding:20px;display:flex;gap:17px;align-items:center}
  .head img{width:76px;height:86px;object-fit:cover;object-position:center;border-radius:10px;background:#fff;border:2px solid rgba(255,255,255,.7)}
  .head .name{font-size:21pt;font-weight:800;line-height:1.12}.head p{margin:6px 0 0;color:#d6eaf8}.id{font-size:9pt;color:#bde2ff;letter-spacing:.07em;margin-top:7px}
  .intro{background:#ecf7ff;border-radius:10px;padding:11px 14px;margin:12px 0;display:flex;gap:16px;justify-content:space-between}
  .columns{display:grid;grid-template-columns:1fr 1fr;gap:18px}.group{break-inside:avoid;margin:0 0 12px}
  h2{font-size:10.5pt;color:#0d659e;letter-spacing:.06em;border-bottom:1px solid #b7dbf3;padding:0 0 6px;margin:9px 0}
  .entry{padding:6px 0;border-bottom:1px solid #edf2f6;break-inside:avoid}.entry b{display:block;font-size:9pt}.entry small{font-size:8pt;color:#607c92}.note{font-size:8pt;color:#698095}
  .footer{display:flex;justify-content:space-between;border-top:1px solid #d6e8f4;margin-top:9px;padding-top:8px;color:#6e8397;font-size:7.5pt}
  </style></head><body><div class="sheet"><header class="head"><img src="${esc(p.avatar_url||'/sfn-logo.png')}" alt="Ảnh thành viên"><div><div style="font-size:8pt;letter-spacing:.11em">SKY FIRST NETWORK · HỒ SƠ NĂNG LỰC</div><div class="name">${name}</div><div class="id">${esc(p.member_code||'')}</div><p>${esc(role?.title||role?.role_label||'Thành viên')} · ${esc(role?.org_name||'Sky First Network')}</p></div></header>
  <div class="intro"><div><b>Học tập / Công tác</b><br>${esc(p.school_or_workplace||'Chưa cập nhật')}<br><span class="note">${esc(p.class_or_major||'')}</span></div>${includeContact?`<div><b>Liên hệ</b><br>${esc(p.email||'')}<br>${esc(p.phone||'')}</div>`:'<div><b>Quyền riêng tư</b><br>Thông tin liên hệ được ẩn</div>'}</div>
  <main class="columns"><section><div class="group"><h2>VAI TRÒ & HÀNH TRÌNH</h2>${list(memberships,x=>`<div class="entry"><b>${esc(x.title||x.role_label||'Thành viên')}</b><span>${esc(x.org_name||'Sky First Network')}</span><br><small>${esc(x.started_at||'')} — ${esc(x.ended_at||'hiện tại')}</small></div>`,4)}</div><div class="group"><h2>THÀNH TÍCH & GHI NHẬN</h2>${list(achievements,x=>`<div class="entry"><b>${esc(x.title||'Ghi nhận')}</b><small>${esc(x.achieved_at||'')} · ${esc(x.issuer||'Sky First Network')}</small></div>`,3)}</div></section>
  <section><div class="group"><h2>HOẠT ĐỘNG TIÊU BIỂU</h2>${list(activities,x=>`<div class="entry"><b>${esc(x.name||'Hoạt động')}</b><small>${esc(x.role_label||'Thành viên')} · ${esc(x.starts_at||'')}</small></div>`,4)}</div><div class="group"><h2>CHỨNG NHẬN</h2>${list(certificates,x=>`<div class="entry"><b>${esc(x.title||'Chứng nhận')}</b><small>${esc(x.issuer||'Sky First Network')} · ${esc(x.issued_at||'')}</small></div>`,3)}</div></section></main>
  <footer class="footer"><span>Hồ sơ do thành viên lựa chọn xuất từ Trung tâm Thành viên Số Sky First</span><span>member.skyfirst.io.vn</span></footer></div><script>addEventListener('load',()=>setTimeout(()=>window.print(),450));<\/script></body></html>`;
  w.document.write(html);w.document.close();
}

async function renderCV(c){

  try{
  const d=
    await api('/api/me/cv');

  const p=
    d.person||state.me.person;

  const memberships=
    d.memberships||[];

  const activities=
    d.activities||[];

  const certificates=
    d.certificates||[];

  const achievements=
    d.achievements||[];


  c.innerHTML=`
    <div class="section-title">

      <div>
        <h1>
          CV / Hồ sơ năng lực
        </h1>

        <p class="muted">
          CCCD và địa chỉ không được đưa vào CV mặc định.
        </p>
      </div>

      <button
        id="printCV"
        class="primary"
      >
        In / Lưu PDF
      </button>

    </div>


    <div
      id="cvSheet"
      class="card"
    >

      <div class="profile-head">

        ${avatar(p,'avatar large')}

        <div>

          <h1>
            ${esc(p.full_name)}
          </h1>

          <div class="muted">
            ${esc(p.member_code||'')}
          </div>

          <div>
            ${esc(p.email||'')}
            ${p.phone?' · '+esc(p.phone):''}
          </div>

        </div>

      </div>


      <hr>


      <h2>
        Thông tin học tập / công tác
      </h2>


      <div class="kv">
        <b>Đối tượng hiện tại</b>
        <span>
          ${esc(p.education_or_work_type||'—')}
        </span>
      </div>


      <div class="kv">
        <b>Trường / Đơn vị công tác</b>
        <span>
          ${esc(p.school_or_workplace||'—')}
        </span>
      </div>


      <div class="kv">
        <b>Lớp / Ngành / Chuyên ngành / Vị trí</b>
        <span>
          ${esc(p.class_or_major||'—')}
        </span>
      </div>


      <div class="kv">
        <b>Tình trạng</b>
        <span>
          ${esc(p.education_status||'—')}
        </span>
      </div>


      <h2>
        Quá trình tham gia Sky First Network
      </h2>


      ${
        memberships.length
          ?memberships.map(
              x=>`
                <div class="list-item">

                  <b>
                    ${esc(x.title||x.role_label||'Thành viên')}
                  </b>

                  <div>
                    ${esc(x.org_name||'Sky First Network')}
                  </div>

                  <div class="meta">
                    ${esc(x.started_at||'')}
                    →
                    ${esc(x.ended_at||'hiện tại')}
                  </div>

                </div>
              `
            ).join('')
          :'<div class="empty">Chưa có dữ liệu.</div>'
      }


      <h2>
        Hoạt động
      </h2>


      ${
        activities.length
          ?activities.map(
              x=>`
                <div class="list-item">

                  <b>
                    ${esc(x.name)}
                  </b>

                  <div class="meta">
                    ${esc(x.role_label||'Thành viên')}
                    ·
                    ${esc(x.starts_at||'')}
                  </div>

                </div>
              `
            ).join('')
          :'<div class="empty">Chưa có dữ liệu.</div>'
      }


      <h2>
        Chứng nhận
      </h2>


      ${
        certificates.length
          ?certificates.map(
              x=>`
                <div class="list-item">

                  <b>
                    ${esc(x.title)}
                  </b>

                  <div class="meta">
                    ${esc(x.issuer||'Sky First Network')}
                    ·
                    ${esc(x.issued_at||'')}
                  </div>

                </div>
              `
            ).join('')
          :'<div class="empty">Chưa có dữ liệu.</div>'
      }


      <h2>
        Thành tích & Ghi nhận
      </h2>


      ${
        achievements.length
          ?achievements.map(
              x=>`
                <div class="list-item">

                  <b>
                    ${esc(x.title)}
                  </b>

                  <div class="meta">
                    ${esc(x.issuer||'Sky First Network')}
                    ·
                    ${esc(x.achieved_at||'')}
                  </div>

                </div>
              `
            ).join('')
          :'<div class="empty">Chưa có dữ liệu.</div>'
      }

    </div>
  `;


  $('#cvSheet').classList.add('cv-premium');
  $('#printCV').onclick=()=>printOnePageCV({p,memberships,activities,certificates,achievements});
  }catch(err){
    console.error('CV_LOAD_ERROR',err);
    c.innerHTML=`<h1>CV / Hồ sơ năng lực</h1><div class="card"><b>Không thể tải CV.</b><p class="muted">${esc(err.data?.error||err.message)}</p><button class="secondary" id="retryCV">Thử lại</button></div>`;
    $('#retryCV').onclick=()=>renderCV(c);
  }
}
async function renderSecurity(c){
  const [sessions,events]=await Promise.all([api('/api/me/security/sessions'),api('/api/me/security/events')]);
  c.innerHTML=`<div class="section-title"><div><div class="eyebrow">ACCOUNT SECURITY</div><h1>Bảo mật & Phiên đăng nhập</h1><p class="muted">Kiểm soát nơi tài khoản đang được sử dụng và xem các sự kiện bảo mật gần đây.</p></div><button id="revokeOthers" class="secondary">Đăng xuất thiết bị khác</button></div>
  <div class="security-grid"><section class="card"><h2>Phiên đang hoạt động</h2><div class="stack-list">${sessions.items?.length?sessions.items.map(x=>`<div class="security-row"><div><b>${x.current?'Thiết bị hiện tại':'Phiên đăng nhập'}</b><div class="meta">${esc(x.user_agent||'Không rõ thiết bị')}</div><div class="meta">Hoạt động: ${esc(x.last_seen_at||x.created_at||'—')}</div></div>${x.current?'<span class="badge ok">HIỆN TẠI</span>':`<button class="ghost revoke-session" data-id="${esc(x.id)}">Thu hồi</button>`}</div>`).join(''):'<div class="empty">Không có phiên hoạt động.</div>'}</div></section>
  <section class="card"><h2>Sự kiện bảo mật</h2><div class="stack-list">${events.items?.length?events.items.map(x=>`<div class="security-row"><div><b>${esc(x.event_type.replaceAll('_',' '))}</b><div class="meta">${esc(x.created_at)} · ${esc(x.ip_hint||'')}</div></div></div>`).join(''):'<div class="empty">Chưa có sự kiện bảo mật.</div>'}</div></section></div>`;
  $('#revokeOthers').onclick=async()=>{await api('/api/me/security/revoke-others',{method:'POST'});return renderSecurity(c)};
  $$('.revoke-session').forEach(b=>b.onclick=async()=>{await api('/api/me/security/sessions/'+encodeURIComponent(b.dataset.id),{method:'DELETE'});return renderSecurity(c)});
}

function renderSupport(c){

  c.innerHTML=`
    <h1>
      Tài khoản & Hỗ trợ
    </h1>

    <div
      class="grid"
      style="grid-template-columns:repeat(2,minmax(0,1fr))"
    >

      <div class="card">

        <h2>
          Đổi mật khẩu
        </h2>

        <form
          id="pwForm"
          class="form-grid"
        >

          <label>
            Mật khẩu hiện tại

            <input
              type="password"
              name="current_password"
              required
            >
          </label>

          <label>
            Mật khẩu mới (≥10 ký tự)

            <input
              type="password"
              name="new_password"
              minlength="10"
              required
            >
          </label>

          <button class="primary">
            Đổi mật khẩu
          </button>

        </form>

      </div>


      <div class="card">

        <h2>
          Liên hệ Sky First Network
        </h2>

        <p>
          <b>Email hỗ trợ:</b>
          <a href="mailto:support@skyfirst.io.vn">
            support@skyfirst.io.vn
          </a>
        </p>

        <p>
          <b>Email liên hệ:</b>
          <a href="mailto:lienhe@skyfirst.io.vn">
            lienhe@skyfirst.io.vn
          </a>
        </p>

        <p>
          <b>Điện thoại/Zalo:</b>
          <a href="tel:+84924910210">
            0924 910 210
          </a>
        </p>

        <div class="portal-links">
          ${portals()}
        </div>

      </div>

    </div>


    <div
      class="card"
      style="margin-top:14px"
    >

      <h2>
        Gửi yêu cầu hỗ trợ
      </h2>

      <form
        id="ticketForm"
        class="form-grid"
      >

        <label>
          Loại yêu cầu

          <select name="category">

            <option value="account">
              Tài khoản
            </option>

            <option value="profile">
              Hồ sơ
            </option>

            <option value="certificate">
              Chứng nhận
            </option>

            <option value="technical">
              Kỹ thuật
            </option>

            <option value="other">
              Khác
            </option>

          </select>
        </label>

        <label>
          Tiêu đề
          <input
            name="subject"
            required
          >
        </label>

        <label>
          Nội dung
          <textarea
            name="body"
            rows="5"
            required
          ></textarea>
        </label>

        <button class="primary">
          Gửi yêu cầu
        </button>

      </form>

    </div>
  `;


  $('#pwForm').onsubmit=async e=>{

    e.preventDefault();

    try{

      await api(
        '/api/me/password',
        {
          method:'POST',
          body:JSON.stringify(
            Object.fromEntries(
              new FormData(e.target)
            )
          )
        }
      );

      alert(
        'Đã đổi mật khẩu.'
      );

      e.target.reset();

    }catch(err){

      alert(
        err.data?.error||
        err.message
      );
    }
  };


  $('#ticketForm').onsubmit=async e=>{

    e.preventDefault();

    try{

      const d=
        await api(
          '/api/me/support',
          {
            method:'POST',
            body:JSON.stringify(
              Object.fromEntries(
                new FormData(e.target)
              )
            )
          }
        );

      alert(
        'Đã ghi nhận yêu cầu: '+
        d.ticket_code
      );

      e.target.reset();

    }catch(err){

      alert(
        err.data?.error||
        err.message
      );
    }
  };
}


function statusVi(x){

  return ({
    active:'Đang hoạt động',
    inactive:'Không hoạt động',
    ended:'Đã kết thúc',
    alumni:'Cựu thành viên',
    suspended:'Tạm đình chỉ',

    pending:'Đang chờ',
    supplement:'Cần bổ sung',
    approved:'Đã phê duyệt',
    rejected:'Đã từ chối',

    archived:'Đã lưu trữ',
    cancelled:'Đã hủy',

    todo:'Chưa thực hiện',
    doing:'Đang thực hiện',
    done:'Hoàn thành',

    verified:'Đã xác minh',
    unverified:'Chưa xác minh',
    confirmed:'Đã ghi nhận',
    completed:'Hoàn thành',
    revoked:'Đã vô hiệu hóa',
    expired:'Đã hết hạn',
    hidden:'Đã ẩn',
    private:'Nội bộ'
  })[x]||x||'—';
}


/* =========================================================
   LỊCH
   ========================================================= */

async function renderCalendar(
  c,
  admin=false
){

  c.innerHTML=`
    <div class="section-title">

      <h1>
        ${admin?'Lịch Sky First Network':'Lịch của tôi'}
      </h1>

      ${
        admin&&hasP('calendar.manage')
          ?`
            <button
              id="calendarNew"
              class="primary"
            >
              Tạo lịch
            </button>
          `
          :''
      }

    </div>

    ${admin?'<div class="bulk-bar" id="calendarBulkBar"><div><b id="calendarSelectedCount">0</b> lịch đã chọn</div><div class="toolbar"><button id="calendarSelectAll" class="secondary">Chọn tất cả</button><button id="calendarBulkDelete" class="danger">Xóa lịch đã chọn</button></div></div>':''}
    <div
      id="calendarBox"
      class="card"
    >
      Đang tải...
    </div>
  `;


  const load=async()=>{

    try{

      const d=
        await api(
          admin
            ?'/api/admin/calendar'
            :'/api/me/calendar'
        );


      $('#calendarBox').outerHTML=`
        <div
          id="calendarBox"
          class="list"
        >

          ${
            d.items.length
              ?d.items.map(
                  x=>`
                    <div class="list-item">

                      ${admin?`<label class="bulk-check"><input type="checkbox" data-calendar-check="${esc(x.id)}"> Chọn</label>`:''}
                      <b>
                        ${esc(x.title)}
                      </b>

                      <div class="meta">

                        ${esc(x.starts_at)}

                        ${
                          x.ends_at
                            ?' → '+esc(x.ends_at)
                            :''
                        }

                        ·

                        ${esc(
                          x.org_name||
                          'Toàn Sky First Network / cá nhân'
                        )}

                        ·

                        ${esc(x.event_type)}

                      </div>

                      ${
                        x.description
                          ?`
                            <div>
                              ${esc(x.description)}
                            </div>
                          `
                          :''
                      }

                      ${
                        admin
                          ?`
                            <div class="actions">

                              <button
                                class="danger"
                                data-cal-del="${esc(x.id)}"
                              >
                                Xóa
                              </button>

                            </div>
                          `
                          :''
                      }

                    </div>
                  `
                ).join('')
              :`
                <div class="empty">
                  Chưa có lịch.
                </div>
              `
          }

        </div>
      `;


      if(admin){
        const syncCalendarBulk=()=>{const n=$$('[data-calendar-check]:checked').length;$('#calendarSelectedCount')?.replaceChildren(document.createTextNode(String(n)));const b=$('#calendarBulkDelete');if(b)b.disabled=n===0};
        $$('[data-calendar-check]').forEach(x=>x.addEventListener('change',syncCalendarBulk));
        $('#calendarSelectAll')?.addEventListener('click',()=>{$$('[data-calendar-check]').forEach(x=>x.checked=true);syncCalendarBulk()});
        $('#calendarBulkDelete')?.addEventListener('click',async()=>{const ids=$$('[data-calendar-check]:checked').map(x=>x.dataset.calendarCheck);if(!ids.length||!confirm(`Xóa ${ids.length} lịch đã chọn?`))return;for(const id of ids){try{await api(`/api/admin/calendar/${encodeURIComponent(id)}`,{method:'DELETE'})}catch{}}toast(`Đã xử lý ${ids.length} lịch.`);await load()});syncCalendarBulk();

        $$('[data-cal-del]').forEach(

          b=>b.onclick=async()=>{

            if(
              !confirm(
                'Xóa lịch này?'
              )
            ){
              return;
            }

            try{

              await api(
                `/api/admin/calendar/${b.dataset.calDel}`,
                {
                  method:'DELETE'
                }
              );

              load();

            }catch(err){

              alert(
                err.data?.error||
                err.message
              );
            }
          }
        );
      }

    }catch(err){

      $('#calendarBox').textContent=
        'Không thể tải lịch: '+
        (
          err.data?.error||
          err.message
        );
    }
  };


  await load();


  if(admin){

    const meta=
      await getMeta();


    $('#calendarNew').onclick=()=>{

      modal(
        'Tạo lịch',
        `
        <form
          id="calendarForm"
          class="form-grid"
        >

          <label>
            Tiêu đề

            <input
              name="title"
              required
            >
          </label>

          <label>
            Loại

            <select name="event_type">

              <option value="meeting">
                Cuộc họp
              </option>

              <option value="activity">
                Hoạt động / sự kiện
              </option>

              <option value="program">
                Chương trình
              </option>

              <option value="training">
                Đào tạo / onboarding
              </option>

              <option value="deadline">
                Deadline
              </option>

              <option value="other">
                Khác
              </option>

            </select>
          </label>

          <label>
            Bắt đầu

            <input
              type="datetime-local"
              name="starts_at"
              required
            >
          </label>

          <label>
            Kết thúc

            <input
              type="datetime-local"
              name="ends_at"
            >
          </label>

          <label>
            Phạm vi / đơn vị

            <select name="org_node_id">

              <option value="">
                Toàn Sky First Network
              </option>

              ${
                meta.orgs.map(
                  o=>`
                    <option value="${esc(o.id)}">
                      ${esc(o.name)}
                    </option>
                  `
                ).join('')
              }

            </select>
          </label>

          <label class="full">
            Mô tả

            <textarea
              name="description"
            ></textarea>
          </label>

          <button class="primary">
            Tạo lịch
          </button>

        </form>
        `
      );


      $('#calendarForm').onsubmit=
        async e=>{

          e.preventDefault();

          try{

            await api(
              '/api/admin/calendar',
              {
                method:'POST',
                body:JSON.stringify(
                  Object.fromEntries(
                    new FormData(e.target)
                  )
                )
              }
            );

            $('#modal')?.remove();

            load();

          }catch(err){

            alert(
              err.data?.error||
              err.message
            );
          }
        };
    };
  }
}


/* =========================================================
   ADMIN META
   ========================================================= */

async function getMeta(){

  if(!state.adminMeta){

    state.adminMeta=
      await api(
        '/api/admin/meta'
      );
  }

  return state.adminMeta;
}


/* =========================================================
   ADMIN - YÊU CẦU CẤP TÀI KHOẢN
   ========================================================= */

async function renderAdminRequests(c){

  c.innerHTML=`
    <div class="section-title">

      <h1>
        Yêu cầu cấp tài khoản
      </h1>

      <button
        id="reloadReq"
        class="secondary"
      >
        Tải lại
      </button>

    </div>


    <div class="notice">

      Chỉ phê duyệt sau khi đã kiểm tra đầy đủ thông tin.
      Việc phê duyệt yêu cầu sẽ tạo tài khoản thành viên
      và hồ sơ tương ứng.

      Đơn vị, tư cách tham gia, chức vụ
      và các quyền quản trị được cấp riêng
      theo thẩm quyền và phạm vi quản lý.

    </div>


    <div
      class="tabs"
      id="reqTabs"
    >

      ${
        [
          ['pending','Đang chờ'],
          ['supplement','Cần bổ sung'],
          ['approved','Đã phê duyệt'],
          ['rejected','Đã từ chối'],
          ['all','Tất cả']
        ]
        .map(
          (x,i)=>`
            <button
              data-rstatus="${x[0]}"
              class="${i===0?'active':''}"
            >
              ${x[1]}
            </button>
          `
        )
        .join('')
      }

    </div>


    <div
      id="reqList"
      class="card"
    >
      Đang tải...
    </div>
  `;


  let status=
    'pending';


  const load=async()=>{

    try{

      const d=
        await api(
          `/api/admin/account-requests?status=${encodeURIComponent(status)}`
        );


      $('#reqList').outerHTML=`
        <div
          id="reqList"
          class="table-wrap"
        >

          <table>

            <thead>

              <tr>

                <th><input type="checkbox" id="selectAllRequests" aria-label="Chọn tất cả yêu cầu"></th>
                <th>
                  Mã yêu cầu
                </th>

                <th>
                  Người đăng ký
                </th>

                <th>
                  Đơn vị
                </th>

                <th>
                  Ngày gửi
                </th>

                <th>
                  Tuổi
                </th>

                <th>
                  Trạng thái
                </th>

                <th>
                  Người xử lý
                </th>

                <th></th>

              </tr>

            </thead>


            <tbody>

              ${
                d.items.map(
                  x=>`
                    <tr>

                      <td><input type="checkbox" data-request-check="${esc(x.id)}"></td>

                      <td>
                        ${esc(x.request_code)}
                      </td>

                      <td>

                        <b>
                          ${esc(x.full_name)}
                        </b>

                        <div class="meta">
                          ${esc(x.email)}
                          ·
                          ${esc(x.phone)}
                        </div>

                      </td>

                      <td>
                        ${esc(x.org_name||'—')}
                      </td>

                      <td>
                        ${esc(x.created_at)}
                      </td>

                      <td>

                        ${
                          x.age??'—'
                        }

                        ${
                          x.age<18
                            ?' · <b>&lt;18</b>'
                            :''
                        }

                      </td>

                      <td>
                        ${statusVi(x.status)}
                      </td>

                      <td>
                        ${esc(x.reviewer_username||'—')}
                      </td>

                      <td>

                        <button
                          class="secondary"
                          data-open-req="${esc(x.id)}"
                        >
                          Xem hồ sơ
                        </button>

                      </td>

                    </tr>
                  `
                ).join('')
              }

            </tbody>

          </table>

        </div>
      `;


      const requestIds=()=>$$('[data-request-check]:checked').map(x=>x.dataset.requestCheck);
      const syncReqBulk=()=>{const n=requestIds().length;const host=$('#reqList');let bar=$('#requestBulkBar');if(!bar){bar=document.createElement('div');bar.id='requestBulkBar';bar.className='bulk-bar';bar.innerHTML='<div><b id="requestSelectedCount">0</b> yêu cầu đã chọn</div><div class="toolbar"><button id="bulkReqApprove" class="primary">Phê duyệt</button><button id="bulkReqSupplement" class="secondary">Yêu cầu bổ sung</button><button id="bulkReqReject" class="danger">Từ chối</button></div>';host.parentNode.insertBefore(bar,host)}$('#requestSelectedCount').textContent=n;['#bulkReqApprove','#bulkReqSupplement','#bulkReqReject'].forEach(sel=>{const b=$(sel);if(b)b.disabled=n===0})};
      $('#selectAllRequests')?.addEventListener('change',e=>{$$('[data-request-check]').forEach(x=>x.checked=e.target.checked);syncReqBulk()});
      $$('[data-request-check]').forEach(x=>x.addEventListener('change',syncReqBulk));
      const bulkReq=async(action)=>{const ids=requestIds();if(!ids.length)return;let note=prompt(action==='approve'?'Ghi chú phê duyệt:':action==='supplement'?'Nội dung cần bổ sung:':'Lý do từ chối:');if(note===null||!note.trim())return;let send=false;if(action==='approve'){const choice=prompt('Gửi email sau phê duyệt?\n1 = Có\n2 = Không','1');if(choice===null)return;send=choice==='1'}if(!confirm(`Xử lý ${ids.length} yêu cầu đã chọn?`))return;const results=[];for(const id of ids){try{const x=await api(`/api/admin/account-requests/${encodeURIComponent(id)}/${action==='approve'?'approve':action==='supplement'?'supplement':'reject'}`,{method:'POST',body:JSON.stringify({admin_note:note,send_email:send})});results.push({ok:true,x})}catch(err){results.push({ok:false,error:err.data?.error||err.message})}}toast(`Đã xử lý ${results.filter(x=>x.ok).length}/${ids.length} yêu cầu.`,results.some(x=>!x.ok)?'warn':'ok');await load()};
      $('#bulkReqApprove')?.addEventListener('click',()=>bulkReq('approve'));$('#bulkReqSupplement')?.addEventListener('click',()=>bulkReq('supplement'));$('#bulkReqReject')?.addEventListener('click',()=>bulkReq('reject'));syncReqBulk();

      $$('[data-open-req]').forEach(
        b=>b.onclick=()=>{

          const r=
            d.items.find(
              x=>x.id===b.dataset.openReq
            );

          if(r){
            openReq(r);
          }
        }
      );


    }catch(err){

      $('#reqList').textContent=
        'Không thể tải yêu cầu: '+
        (
          err.data?.error||
          err.message
        );
    }
  };


  const openReq=r=>{

    modal(
      'Hồ sơ yêu cầu · '+
      esc(r.request_code),
      `
      <div class="card">

        ${
          [
            ['Họ và tên',r.full_name],

            [
              'Tên hiển thị',
              r.display_name
            ],

            [
              'Ngày sinh',
              r.date_of_birth
            ],

            [
              'Giới tính',
              r.gender
            ],

            [
              'Quốc tịch',
              r.nationality
            ],

            [
              'CCCD / định danh',
              r.id_number
            ],

            [
              'Ngày cấp',
              r.id_issue_date
            ],

            [
              'Nơi cấp',
              r.id_issue_place
            ],

            [
              'Email',
              r.email
            ],

            [
              'Số điện thoại',
              r.phone
            ],

            [
              'Thường trú',
              r.permanent_address
            ],

            [
              'Nơi ở hiện tại',
              r.temporary_address
            ],

            [
              'Đối tượng hiện tại',
              r.education_or_work_type
            ],

            [
              'Trường / Đơn vị công tác',
              r.school_or_workplace
            ],

            [
              'Lớp / Ngành / Chuyên ngành / Vị trí',
              r.class_or_major
            ],

            [
              'Tình trạng học tập / công tác',
              r.education_status
            ],

            [
              'Đơn vị đăng ký',
              r.org_name
            ],

            [
              'Người giám hộ',
              r.guardian_full_name
            ],

            [
              'Quan hệ',
              r.guardian_relationship
            ],

            [
              'SĐT người giám hộ',
              r.guardian_phone
            ],

            [
              'Email người giám hộ',
              r.guardian_email
            ],

            [
              'Địa chỉ người giám hộ',
              r.guardian_lives_together
                ?'Ở cùng người đăng ký'
                :r.guardian_address
            ],

            [
              'Trạng thái',
              statusVi(r.status)
            ],

            [
              'Phản hồi',
              r.admin_note
            ]
          ]
          .map(
            x=>`
              <div class="kv">

                <b>
                  ${x[0]}
                </b>

                <span>
                  ${esc(x[1]||'—')}
                </span>

              </div>
            `
          )
          .join('')
        }

      </div>


      ${r.status==='approved'?`<div class="toolbar"><button class="secondary" id="sendApprovalLater">Gửi email tài khoản cho thành viên</button></div>`:''}
      ${
        ['pending','supplement'].includes(
          r.status
        )
          ?`
            <div
              class="toolbar"
              style="margin-top:12px"
            >

              <button
                id="reqApprove"
                class="primary"
              >
                Phê duyệt
              </button>

              <button
                id="reqSupplement"
                class="secondary"
              >
                Yêu cầu bổ sung
              </button>

              <button
                id="reqReject"
                class="danger"
              >
                Từ chối
              </button>

            </div>
          `
          :''
      }
      `
    );


    if($('#sendApprovalLater'))$('#sendApprovalLater').onclick=async()=>{
      if(!confirm('Gửi thông báo phê duyệt tài khoản đến email đã đăng ký?'))return;
      const button=$('#sendApprovalLater');button.disabled=true;
      try{const x=await api(`/api/admin/account-requests/${r.id}/send-approval`,{method:'POST',body:'{}'});toast(x.email_sent?'Đã gửi email thông báo.':'Không gửi được email: '+(x.email_error||'Kiểm tra cấu hình email'),x.email_sent?'ok':'warn')}
      catch(err){toast(err.data?.error||err.message,'warn')}finally{button.disabled=false}
    };
    if(!$('#reqApprove'))return;


    $('#reqApprove').onclick=
      async()=>{

        const note=
          prompt(
            'Ghi chú phê duyệt:',
            'Đã phê duyệt yêu cầu cấp tài khoản.'
          );

        if(note===null){
          return;
        }

        const emailChoice=prompt('Chọn gửi email sau phê duyệt:\n1 = Gửi tự động ngay\n2 = Phê duyệt trước, quản trị gửi sau\n3 = Không gửi email','1');
        if(emailChoice===null)return;
        if(!['1','2','3'].includes(emailChoice)){toast('Vui lòng chọn 1, 2 hoặc 3.','warn');return}
        const sendEmail=emailChoice==='1';
        try{

          const z=
            await api(
              `/api/admin/account-requests/${r.id}/approve`,
              {
                method:'POST',
                body:JSON.stringify({
                  admin_note:note,
                  send_email:sendEmail
                })
              }
            );


          alert(
            `Đã tạo ${z.member_code}. `+
            `Tên đăng nhập: ${z.username}. `+
            `Mật khẩu tạm chỉ hiển thị lần này: ${z.temporary_password}`
          );


          $('#modal')?.remove();

          load();

        }catch(err){

          alert(
            err.data?.error||
            err.message
          );
        }
      };


    $('#reqSupplement').onclick=
      async()=>{

        const note=
          prompt(
            'Nội dung cần bổ sung:'
          );

        if(!note){
          return;
        }

        try{

          await api(
            `/api/admin/account-requests/${r.id}/supplement`,
            {
              method:'POST',
              body:JSON.stringify({
                admin_note:note
              })
            }
          );

          $('#modal')?.remove();

          load();

        }catch(err){

          alert(
            err.data?.error||
            err.message
          );
        }
      };


    $('#reqReject').onclick=
      async()=>{

        const note=
          prompt(
            'Lý do từ chối:'
          );

        if(!note){
          return;
        }

        try{

          await api(
            `/api/admin/account-requests/${r.id}/reject`,
            {
              method:'POST',
              body:JSON.stringify({
                admin_note:note
              })
            }
          );

          $('#modal')?.remove();

          load();

        }catch(err){

          alert(
            err.data?.error||
            err.message
          );
        }
      };
  };


  $$('[data-rstatus]').forEach(
    b=>b.onclick=()=>{

      $$('[data-rstatus]').forEach(
        x=>x.classList.remove(
          'active'
        )
      );

      b.classList.add(
        'active'
      );

      status=
        b.dataset.rstatus;

      load();
    }
  );


  $('#reloadReq').onclick=
    load;


  load();
}


/* =========================================================
   ADMIN - DANH SÁCH THÀNH VIÊN
   ========================================================= */

async function renderAdminMembers(c){

  const meta=
    await getMeta();


  c.innerHTML=`
    <div class="section-title">

      <h1>
        Quản trị thành viên
      </h1>

      <button
        id="newMember"
        class="primary"
      >
        Tạo thành viên
      </button>

    </div>


    <div class="toolbar">

      <input
        id="memberQ"
        placeholder="Tìm tên, mã, email, SĐT"
      >


      <select id="memberOrg">

        <option value="">
          Tất cả đơn vị
        </option>

        ${
          meta.orgs.map(
            o=>`
              <option value="${esc(o.id)}">
                ${esc(o.name)}
              </option>
            `
          ).join('')
        }

      </select>


      <select id="memberStatus">

        <option value="">
          Tất cả trạng thái
        </option>

        <option value="active">
          Đang hoạt động
        </option>

        <option value="inactive">
          Không hoạt động
        </option>

        <option value="ended">
          Đã kết thúc
        </option>

        <option value="alumni">
          Cựu thành viên
        </option>

        <option value="suspended">
          Tạm đình chỉ
        </option>

      </select>


      <button
        id="memberSearch"
        class="secondary"
      >
        Tìm
      </button>

    </div>


    <div
      id="membersBox"
      class="card"
    >
      Đang tải...
    </div>
  `;


  const load=async(page=1)=>{

    try{

      const q=
        encodeURIComponent(
          $('#memberQ').value||''
        );

      const st=
        encodeURIComponent(
          $('#memberStatus').value||''
        );

      const org=
        encodeURIComponent(
          $('#memberOrg').value||''
        );


      const d=
        await api(
          `/api/admin/members?page=${page}&limit=50&q=${q}&status=${st}&org=${org}`
        );


      const membersBox = $('#membersBox');
      if (!membersBox || !membersBox.isConnected) return;
      membersBox.className = '';
      membersBox.innerHTML=`
        <div>

          <div class="table-wrap">

            <table>

              <thead>

                <tr>

                  <th></th>

                  <th>
                    Mã
                  </th>

                  <th>
                    Thành viên
                  </th>

                  <th>
                    Đơn vị
                  </th>

                  <th>
                    Vị trí/chức vụ
                  </th>

                  <th>
                    Tài khoản
                  </th>

                  <th>
                    Trạng thái
                  </th>

                  <th></th>

                </tr>

              </thead>


              <tbody>

                ${
                  d.items.map(
                    x=>`
                      <tr>

                        <td>
                          <input
                            type="checkbox"
                            data-member-check="${esc(x.id)}"
                          >
                        </td>

                        <td>
                          ${esc(x.member_code)}
                        </td>

                        <td>

                          <b>
                            ${esc(x.full_name)}
                          </b>

                          <div class="meta">

                            ${esc(x.email||'')}

                            ${
                              x.phone
                                ?' · '+esc(x.phone)
                                :''
                            }

                          </div>

                        </td>

                        <td>
                          ${esc(x.org_name||'—')}
                        </td>

                        <td>
                          ${esc(x.org_title||'—')}
                        </td>

                        <td>

                          ${esc(x.username||'—')}

                          ${
                            x.is_locked
                              ?' · 🔒'
                              :''
                          }

                        </td>

                        <td>
                          ${statusVi(x.status)}
                        </td>

                        <td>

                          <button
                            class="secondary"
                            data-open-member="${esc(x.id)}"
                          >
                            Mở hồ sơ
                          </button>

                        </td>

                      </tr>
                    `
                  ).join('')
                }

              </tbody>

            </table>

          </div>


          <div class="bulk-bar" id="memberBulkBar" style="margin-top:12px">
            <div><b id="memberSelectedCount">0</b> thành viên đã chọn</div>
            <div class="toolbar">
              <button id="bulkLock" class="secondary">Khóa tài khoản</button>
              <button id="bulkUnlock" class="secondary">Mở khóa</button>
              <button id="bulkBan" class="danger">Cấm tài khoản</button>
              <button id="bulkUnban" class="secondary">Gỡ cấm</button>
              <button id="bulkCard" class="primary">Tạo thẻ</button>
              <button id="bulkExport" class="secondary">Xuất danh sách</button>
            </div>
          </div>
          <div class="toolbar" style="margin-top:8px">
            <span>${d.total} thành viên · Trang ${d.page}</span>


            ${
              page>1
                ?`
                  <button
                    data-page="${page-1}"
                  >
                    ← Trước
                  </button>
                `
                :''
            }


            ${
              page*d.limit<d.total
                ?`
                  <button
                    data-page="${page+1}"
                  >
                    Sau →
                  </button>
                `
                :''
            }

          </div>

        </div>
      `;


      const selectedIds=()=>$$('[data-member-check]:checked').map(x=>x.dataset.memberCheck);
      const syncBulk=()=>{
        const n=selectedIds().length;
        const bar=$('#memberBulkBar');
        if($('#memberSelectedCount'))$('#memberSelectedCount').textContent=n;
        if(bar)bar.classList.toggle('is-active',n>0);
        ['#bulkLock','#bulkUnlock','#bulkBan','#bulkUnban','#bulkCard','#bulkExport'].forEach(sel=>{const b=$(sel);if(b)b.disabled=n===0});
      };
      $('#selectAllMembers')?.addEventListener('change',e=>{$$('[data-member-check]').forEach(x=>x.checked=e.target.checked);syncBulk()});
      $$('[data-member-check]').forEach(x=>x.addEventListener('change',()=>syncBulk()));
      const runBulk=async(action,extra={})=>{
        const ids=selectedIds(); if(!ids.length)return;
        const names={lock:'Khóa tài khoản',unlock:'Mở khóa tài khoản',ban:'Cấm tài khoản',unban:'Gỡ cấm tài khoản',issue_card:'Tạo thẻ'};
        if(!confirm(`${names[action]||'Xử lý'} cho ${ids.length} thành viên đã chọn?`))return;
        let payload={ids,action,...extra};
        if(action==='ban'){
          const reason=prompt('Lý do cấm tài khoản:'); if(!reason)return;
          payload.reason=reason;
          const ends=prompt('Ngày hết hạn (YYYY-MM-DD), để trống nếu vô thời hạn:',''); if(ends)payload.ends_at=ends;
        }
        const btn=document.querySelector(`[id="${action==='issue_card'?'bulkCard':action==='lock'?'bulkLock':action==='unlock'?'bulkUnlock':action==='ban'?'bulkBan':'bulkUnban'}"]`); if(btn)btn.disabled=true;
        try{const r=await api('/api/admin/members/bulk',{method:'POST',body:JSON.stringify(payload)});toast(`Đã xử lý ${r.success}/${r.processed} thành viên.`,r.failed?'warn':'ok');await load(page)}catch(err){toast(err.data?.error||err.message,'warn')}finally{syncBulk()}
      };
      $('#bulkLock')?.addEventListener('click',()=>runBulk('lock'));
      $('#bulkUnlock')?.addEventListener('click',()=>runBulk('unlock'));
      $('#bulkBan')?.addEventListener('click',()=>runBulk('ban'));
      $('#bulkUnban')?.addEventListener('click',()=>runBulk('unban'));
      $('#bulkCard')?.addEventListener('click',()=>{
        const ids=selectedIds();if(!ids.length)return;
        const fields=meta.card_types.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
        modal('Tạo thẻ cho nhiều thành viên',`<form id="bulkCardForm" class="form-grid"><label>Loại thẻ<select name="card_type_id">${fields}</select></label><label>Đơn vị<select name="org_node_id">${meta.orgs.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label>Chức danh chung<input name="title_on_card" placeholder="Để trống nếu dùng chức danh hiện có"></label><label>Ngày hết hạn<input name="expires_at" type="date"></label><div class="full"><button class="primary">Tạo ${ids.length} thẻ</button></div><div id="bulkCardMsg" class="msg"></div></form>`);
        $('#bulkCardForm').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button.primary');btn.disabled=true;try{const x=Object.fromEntries(new FormData(e.target));const r=await api('/api/admin/members/bulk',{method:'POST',body:JSON.stringify({ids,action:'issue_card',...x})});$('#modal')?.remove();toast(`Đã tạo ${r.success}/${r.processed} thẻ.`,r.failed?'warn':'ok');await load(page)}catch(err){$('#bulkCardMsg').textContent=err.data?.error||err.message;btn.disabled=false}};
      });
      $('#bulkExport')?.addEventListener('click',()=>{
        const ids=selectedIds();if(!ids.length)return;
        const rows=d.items.filter(x=>ids.includes(x.id));
        const csv=['Mã;Họ tên;Email;Đơn vị;Chức vụ;Tài khoản;Trạng thái',...rows.map(x=>[x.member_code,x.full_name,x.email,x.org_name,x.org_title,x.username,statusVi(x.status)].map(v=>`"${String(v||'').replaceAll('"','""')}"`).join(';'))].join('\n');
        const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='danh-sach-thanh-vien-da-chon.csv';a.click();URL.revokeObjectURL(a.href);
      });
      syncBulk();

      $$('[data-open-member]').forEach(
        b=>b.onclick=()=>{

          openAdminMember(
            b.dataset.openMember
          );
        }
      );


      $$('[data-page]').forEach(
        b=>b.onclick=()=>{

          load(
            Number(
              b.dataset.page
            )
          );
        }
      );




    }catch(err){

      const membersBox = $('#membersBox');
      if (membersBox && membersBox.isConnected) membersBox.textContent=
        'Không có quyền hoặc không thể tải dữ liệu.';
    }
  };


  $('#memberSearch').onclick=
    ()=>load(1);


  $('#newMember').onclick=
    async()=>newMemberModal(
      load
    );


  load();
}


/* =========================================================
   ADMIN - TẠO THÀNH VIÊN
   ========================================================= */

async function newMemberModal(
  done
){

  const meta=
    await getMeta();


  modal(
    'Tạo tài khoản thành viên',
    `
    <form id="newMemberForm">

      ${fieldsForm({})}


      <div class="form-grid two">

        <label>
          Tên đăng nhập

          <input
            name="username"
            required
          >
        </label>


        <label>
          Mật khẩu tạm

          <input
            name="password"
            type="password"
            minlength="10"
            required
          >
        </label>


        <label>
          Đơn vị ban đầu

          <select name="org_node_id">

            <option value="">
              — Chưa gán —
            </option>

            ${
              meta.orgs.map(
                o=>`
                  <option value="${esc(o.id)}">
                    ${esc(o.name)}
                  </option>
                `
              ).join('')
            }

          </select>
        </label>


        <label>
          Chức vụ / vai trò

          <input
            name="title"
          >
        </label>

      </div>


      <div
        class="toolbar"
        style="margin-top:16px"
      >

        <button class="primary">
          Tạo tài khoản
        </button>

      </div>

    </form>
    `
  );


  $('#newMemberForm').onsubmit=
    async e=>{

      e.preventDefault();

      try{

        const fd=
          new FormData(
            e.target
          );

        const b=
          Object.fromEntries(fd);


        if(
          fd.get('avatar_file')?.size
        ){

          const blob=
            await compressAvatar(
              fd.get('avatar_file')
            );

          const up=
            await uploadBinary(
              '/api/public/request-avatar',
              blob
            );

          b.avatar_url=
            up.url;

        }else{

          throw new Error(
            'Ảnh đại diện là bắt buộc.'
          );
        }


        delete b.avatar_file;


        const d=
          await api(
            '/api/admin/members',
            {
              method:'POST',
              body:JSON.stringify(b)
            }
          );


        alert(
          'Đã tạo '+
          d.member_code
        );


        $('#modal')?.remove();

        done();

      }catch(err){

        alert(
          err.data?.error||
          err.message
        );
      }
    };
}


/* =========================================================
   ADMIN - HỒ SƠ THÀNH VIÊN
   ========================================================= */

async function openAdminMember(id){

  try{

    const [
      d,
      meta
    ]=
      await Promise.all([
        api(
          `/api/admin/members/${id}`
        ),
        getMeta()
      ]);


    state.adminMember=
      d;


    modal(
      `Hồ sơ quản trị · ${esc(d.person.full_name)}`,
      `
      <div class="tabs">

        ${
          [
            'profile',
            'sfn',
            'membership',
            'goal',
            'task',
            'activity',
            'cert',
            'achievement',
            'history',
            'card',
            'document',
            'account',
            'permissions',
            'evaluation',
            'audit'
          ]
          .map(
            (x,i)=>`
              <button
                data-mtab="${x}"
                class="${i===0?'active':''}"
              >

                ${
                  ({
                    profile:'Thông tin cá nhân',
                    sfn:'Thông tin Sky First Network',
                    membership:'Đơn vị/vai trò',
                    goal:'Mục tiêu',
                    task:'Công việc',
                    activity:'Hoạt động',
                    cert:'GCN',
                    achievement:'Thành tích',
                    history:'Quá trình công tác',
                    card:'Thẻ',
                    document:'Tài liệu',
                    account:'Tài khoản',
                    permissions:'Phân quyền',
                    evaluation:'Đánh giá',
                    audit:'Nhật ký'
                  })[x]
                }

              </button>
            `
          )
          .join('')
        }

      </div>


      <div id="memberTab"></div>
      `
    );


    $$('[data-mtab]').forEach(
      b=>b.onclick=()=>{

        $$('[data-mtab]')
          .forEach(
            x=>x.classList.remove(
              'active'
            )
          );

        b.classList.add(
          'active'
        );

        renderAdminMemberTab(
          b.dataset.mtab,
          d,
          meta
        );
      }
    );


    renderAdminMemberTab(
      'profile',
      d,
      meta
    );


  }catch(err){

    alert(
      err.data?.error||
      err.message
    );
  }
}


/* =========================================================
   ADMIN - CÁC TAB THÀNH VIÊN
   ========================================================= */

function renderAdminMemberTab(
  tab,
  d,
  meta
){

  const box=
    $('#memberTab');

  const p=
    d.person;


  if(tab==='profile'){

    box.innerHTML=`
      <form id="adminProfileForm">

        ${fieldsForm(p)}

        <div class="form-grid two">

          <label>
            Ngày tham gia

            <input
              type="date"
              name="joined_at"
              value="${esc(p.joined_at||'')}"
            >
          </label>


          <label>
            Ngày kết thúc

            <input
              type="date"
              name="ended_at"
              value="${esc(p.ended_at||'')}"
            >
          </label>


          <label>
            Trạng thái

            <select name="status">

              ${
                [
                  'active',
                  'inactive',
                  'ended',
                  'alumni',
                  'suspended'
                ]
                .map(
                  x=>`
                    <option
                      value="${x}"
                      ${p.status===x?'selected':''}
                    >
                      ${statusVi(x)}
                    </option>
                  `
                )
                .join('')
              }

            </select>
          </label>

        </div>


        <div
          class="toolbar"
          style="margin-top:15px"
        >

          <button class="primary">
            Lưu hồ sơ
          </button>

        </div>

      </form>
    `;


    $('#adminProfileForm').onsubmit=
      async e=>{

        e.preventDefault();

        try{

          await api(
            `/api/admin/members/${p.id}`,
            {
              method:'PATCH',
              body:JSON.stringify(
                Object.fromEntries(
                  new FormData(e.target)
                )
              )
            }
          );


          alert(
            'Đã cập nhật hồ sơ.'
          );

        }catch(err){

          alert(
            err.data?.error||
            err.message
          );
        }
      };
  }


if(tab==='membership'){

  box.innerHTML=`
    <div class="toolbar">

      <button
        id="addMembership"
        class="primary"
      >
        Thêm đơn vị / vai trò
      </button>

    </div>


    <div class="list">

      ${
        d.memberships.length
          ?d.memberships.map(
              x=>`
                <div class="list-item">

                  <div
                    class="section-title"
                    style="margin:0;align-items:flex-start"
                  >

                    <div>

                      <b>
                        ${esc(
                          x.title||
                          x.role_label||
                          'Thành viên'
                        )}
                      </b>

                      <div>
                        ${esc(x.org_name)}
                      </div>

                      <div class="meta">

                        ${esc(x.started_at||'—')}

                        →

                        ${
                          x.status==='active'
                            ?'hiện tại'
                            :esc(x.ended_at||'đã kết thúc')
                        }

                        ·

                        ${
                          x.status==='active'
                            ?'Đang hiệu lực'
                            :x.status==='ended'
                              ?'Đã ngừng hiệu lực'
                              :(x.status==='hidden'||x.status==='suspended')
                                ?'Đã ẩn'
                                :statusVi(x.status)
                        }

                        ${
                          x.decision_ref
                            ?' · '+esc(x.decision_ref)
                            :''
                        }

                      </div>

                    </div>


                    <div class="actions">

                      <button
                        class="secondary"
                        data-membership-edit="${esc(x.id)}"
                      >
                        Chỉnh sửa
                      </button>


                      ${
                        x.status==='active'
                          ?`
                            <button
                              class="secondary"
                              data-membership-end="${esc(x.id)}"
                            >
                              Ngừng hiệu lực
                            </button>
                          `
                          :''
                      }


                      ${
                        x.status!=='hidden'&&x.status!=='suspended'
                          ?`
                            <button
                              class="secondary"
                              data-membership-hide="${esc(x.id)}"
                            >
                              Ẩn
                            </button>
                          `
                          :`
                            <button
                              class="secondary"
                              data-membership-show="${esc(x.id)}"
                            >
                              Hiện lại
                            </button>
                          `
                      }

                    </div>

                  </div>

                </div>
              `
            ).join('')
          :`
            <div class="empty">
              Chưa có dữ liệu đơn vị / vai trò.
            </div>
          `
      }

    </div>
  `;


  /* =========================
     THÊM ĐƠN VỊ / VAI TRÒ
     ========================= */

  $('#addMembership').onclick=()=>{

    modal(
      'Thêm đơn vị / vai trò',
      `
      <form
        id="membershipForm"
        class="form-grid"
      >

        <label>
          Đơn vị

          <select
            name="org_node_id"
            required
          >

            ${
              meta.orgs.map(
                o=>`
                  <option value="${esc(o.id)}">
                    ${esc(o.name)}
                  </option>
                `
              ).join('')
            }

          </select>
        </label>


        <label>
          Chức vụ

          <input
            name="title"
            placeholder="Ví dụ: Chủ nhiệm, Trưởng ban..."
          >
        </label>


        <label>
          Vai trò

          <input
            name="role_label"
            placeholder="Ví dụ: Thành viên, Tình nguyện viên..."
          >
        </label>


        <label>
          Ngày bắt đầu

          <input
            type="date"
            name="started_at"
          >
        </label>


        <label>
          Văn bản / quyết định

          <input
            name="decision_ref"
            placeholder="Số quyết định hoặc văn bản liên quan"
          >
        </label>


        <button class="primary">
          Ghi nhận
        </button>

      </form>
      `
    );


    $('#membershipForm').onsubmit=
      async e=>{

        e.preventDefault();

        try{

          await api(
            `/api/admin/members/${p.id}/membership`,
            {
              method:'POST',
              body:JSON.stringify(
                Object.fromEntries(
                  new FormData(e.target)
                )
              )
            }
          );

          alert(
            'Đã thêm đơn vị / vai trò.'
          );

          $('#modal')?.remove();

          openAdminMember(p.id);

        }catch(err){

          alert(
            err.data?.error||
            err.message
          );
        }
      };
  };


  /* =========================
     CHỈNH SỬA
     ========================= */

  $$('[data-membership-edit]').forEach(
    b=>b.onclick=()=>{

      const x=
        d.memberships.find(
          m=>m.id===b.dataset.membershipEdit
        );

      if(!x){
        return;
      }


      modal(
        'Chỉnh sửa đơn vị / vai trò',
        `
        <form
          id="membershipEditForm"
          class="form-grid"
        >

          <label>
            Đơn vị

            <select
              name="org_node_id"
              required
            >

              ${
                meta.orgs.map(
                  o=>`
                    <option
                      value="${esc(o.id)}"
                      ${o.id===x.org_node_id?'selected':''}
                    >
                      ${esc(o.name)}
                    </option>
                  `
                ).join('')
              }

            </select>
          </label>


          <label>
            Chức vụ

            <input
              name="title"
              value="${esc(x.title||'')}"
            >
          </label>


          <label>
            Vai trò

            <input
              name="role_label"
              value="${esc(x.role_label||'')}"
            >
          </label>


          <label>
            Ngày bắt đầu

            <input
              type="date"
              name="started_at"
              value="${esc(x.started_at||'')}"
            >
          </label>


          <label>
            Ngày kết thúc

            <input
              type="date"
              name="ended_at"
              value="${esc(x.ended_at||'')}"
            >
          </label>


          <label>
            Văn bản / quyết định

            <input
              name="decision_ref"
              value="${esc(x.decision_ref||'')}"
            >
          </label>


          <button class="primary">
            Lưu thay đổi
          </button>

        </form>
        `
      );


      $('#membershipEditForm').onsubmit=
        async e=>{

          e.preventDefault();

          try{

            await api(
              `/api/admin/members/${p.id}/membership/${x.id}`,
              {
                method:'PATCH',
                body:JSON.stringify(
                  Object.fromEntries(
                    new FormData(e.target)
                  )
                )
              }
            );

            alert(
              'Đã cập nhật đơn vị / vai trò.'
            );

            $('#modal')?.remove();

            openAdminMember(p.id);

          }catch(err){

            alert(
              err.data?.error||
              err.message
            );
          }
        };
    }
  );


  /* =========================
     NGỪNG HIỆU LỰC
     ========================= */

  $$('[data-membership-end]').forEach(
    b=>b.onclick=async()=>{

      const x=
        d.memberships.find(
          m=>m.id===b.dataset.membershipEnd
        );

      if(!x){
        return;
      }


      const ok=
        confirm(
          'Ngừng hiệu lực vai trò này?\n\n'+
          'Bản ghi vẫn được giữ lại trong lịch sử công tác.'
        );

      if(!ok){
        return;
      }


      try{

        await api(
          `/api/admin/members/${p.id}/membership/${x.id}/end`,
          {
            method:'POST'
          }
        );

        alert(
          'Đã ngừng hiệu lực vai trò.'
        );

        openAdminMember(p.id);

      }catch(err){

        alert(
          err.data?.error||
          err.message
        );
      }
    }
  );


  /* =========================
     ẨN
     ========================= */

  $$('[data-membership-hide]').forEach(
    b=>b.onclick=async()=>{

      const x=
        d.memberships.find(
          m=>m.id===b.dataset.membershipHide
        );

      if(!x){
        return;
      }


      const ok=
        confirm(
          'Ẩn đơn vị / vai trò này khỏi hồ sơ thành viên?\n\n'+
          'Dữ liệu vẫn được giữ trong hệ thống.'
        );

      if(!ok){
        return;
      }


      try{

        await api(
          `/api/admin/members/${p.id}/membership/${x.id}/hide`,
          {
            method:'POST'
          }
        );

        alert(
          'Đã ẩn đơn vị / vai trò.'
        );

        openAdminMember(p.id);

      }catch(err){

        alert(
          err.data?.error||
          err.message
        );
      }
    }
  );


  /* =========================
     HIỆN LẠI
     ========================= */

  $$('[data-membership-show]').forEach(
    b=>b.onclick=async()=>{

      const x=
        d.memberships.find(
          m=>m.id===b.dataset.membershipShow
        );

      if(!x){
        return;
      }


      try{

        await api(
          `/api/admin/members/${p.id}/membership/${x.id}/show`,
          {
            method:'POST'
          }
        );

        alert(
          'Đã hiện lại đơn vị / vai trò.'
        );

        openAdminMember(p.id);

      }catch(err){

        alert(
          err.data?.error||
          err.message
        );
      }
    }
  );

}


  if(tab==='sfn'){

    box.innerHTML=`
      <div class="card">

        ${
          [
            ['Mã thành viên',p.member_code],
            ['Trạng thái',p.status],
            ['Ngày tham gia',p.joined_at],
            ['Ngày kết thúc',p.ended_at],
            ['Tên đăng nhập',p.username],
            [
              'Tài khoản khóa',
              p.is_locked?'Có':'Không'
            ]
          ]
          .map(
            x=>`
              <div class="kv">

                <b>
                  ${x[0]}
                </b>

                <span>
                  ${esc(x[1]||'—')}
                </span>

              </div>
            `
          )
          .join('')
        }

      </div>


      <div
        class="toolbar"
        style="margin-top:12px"
      >

        <button
          id="editSfn"
          class="secondary"
        >
          Cập nhật thông tin Sky First Network
        </button>

      </div>
    `;


    $('#editSfn').onclick=()=>{

      modal(
        'Cập nhật thông tin Sky First Network',
        `
        <form
          id="sfnForm"
          class="form-grid"
        >

          <label>
            Ngày tham gia

            <input
              type="date"
              name="joined_at"
              value="${esc(p.joined_at||'')}"
            >
          </label>


          <label>
            Ngày kết thúc

            <input
              type="date"
              name="ended_at"
              value="${esc(p.ended_at||'')}"
            >
          </label>


          <label>
            Trạng thái

            <select name="status">

              <option value="active">
                Đang hoạt động
              </option>

              <option value="inactive">
                Không hoạt động
              </option>

              <option value="ended">
                Đã kết thúc
              </option>

              <option value="alumni">
                Cựu thành viên
              </option>

              <option value="suspended">
                Tạm đình chỉ
              </option>

            </select>
          </label>


          <button class="primary">
            Lưu
          </button>

        </form>
        `
      );


      $('#sfnForm').elements.status.value=
        p.status;


      $('#sfnForm').onsubmit=
        async e=>{

          e.preventDefault();

          try{

            await api(
              `/api/admin/members/${p.id}`,
              {
                method:'PATCH',
                body:JSON.stringify(
                  Object.fromEntries(
                    new FormData(e.target)
                  )
                )
              }
            );


            await refreshAdminMemberTab(p.id,tab);

          }catch(err){

            alert(
              err.data?.error||
              err.message
            );
          }
        };
    };
  }


  if(tab==='goal'){

    box.innerHTML=`
      <div class="toolbar">

        <button
          id="assignGoal"
          class="primary"
        >
          Giao mục tiêu
        </button>

      </div>


      <div class="list">

        ${
          d.goals.length
            ?d.goals.map(
                x=>`
                  <div class="list-item">

                    <b>
                      ${esc(x.title)}
                    </b>

                    <div class="meta">

                      ${esc(x.period_type)}

                      ·

                      ${x.progress}%

                      ·

                      ${esc(x.status)}

                    </div>

                  </div>
                `
              ).join('')
            :`
              <div class="empty">
                Chưa có mục tiêu.
              </div>
            `
        }

      </div>
    `;


    $('#assignGoal').onclick=()=>{

      modal(
        'Giao mục tiêu',
        `
        <form
          id="adminGoalForm"
          class="form-grid"
        >

          <label>
            Chu kỳ

            <select name="period_type">

              <option value="week">
                Tuần
              </option>

              <option value="month">
                Tháng
              </option>

              <option value="quarter">
                Quý
              </option>

              <option value="year">
                Năm
              </option>

            </select>
          </label>


          <label>
            Tiêu đề

            <input
              name="title"
              required
            >
          </label>


          <label>
            Mô tả

            <textarea
              name="description"
            ></textarea>
          </label>


          <label>
            Đơn vị

            <select name="org_node_id">

              <option value="">
                Không gắn đơn vị
              </option>

              ${
                meta.orgs.map(
                  o=>`
                    <option value="${esc(o.id)}">
                      ${esc(o.name)}
                    </option>
                  `
                ).join('')
              }

            </select>
          </label>


          <label>
            Hạn

            <input
              type="date"
              name="due_at"
            >
          </label>


          <button class="primary">
            Giao mục tiêu
          </button>

        </form>
        `
      );


      $('#adminGoalForm').onsubmit=
        async e=>{

          e.preventDefault();

          try{

            await api(
              `/api/admin/members/${p.id}/goal`,
              {
                method:'POST',
                body:JSON.stringify(
                  Object.fromEntries(
                    new FormData(e.target)
                  )
                )
              }
            );

            await refreshAdminMemberTab(p.id,tab);

          }catch(err){

            alert(
              err.data?.error||
              err.message
            );
          }
        };
    };
  }


  if(tab==='task'){

    box.innerHTML=`
      <div class="toolbar">

        <button
          id="assignTask"
          class="primary"
        >
          Giao công việc
        </button>

      </div>


      <div class="list">

        ${
          d.tasks.length
            ?d.tasks.map(
                x=>`
                  <div class="list-item">

                    <b>
                      ${esc(x.title)}
                    </b>

                    <div class="meta">

                      ${x.progress}%

                      ·

                      ${esc(x.status)}

                      ${
                        x.due_at
                          ?' · '+esc(x.due_at)
                          :''
                      }

                    </div>

                  </div>
                `
              ).join('')
            :`
              <div class="empty">
                Chưa có công việc.
              </div>
            `
        }

      </div>
    `;


    $('#assignTask').onclick=()=>{

      modal(
        'Giao công việc',
        `
        <form
          id="adminTaskForm"
          class="form-grid"
        >

          <label>
            Tiêu đề

            <input
              name="title"
              required
            >
          </label>


          <label>
            Mô tả

            <textarea
              name="description"
            ></textarea>
          </label>


          <label>
            Đơn vị

            <select name="org_node_id">

              <option value="">
                Không gắn đơn vị
              </option>

              ${
                meta.orgs.map(
                  o=>`
                    <option value="${esc(o.id)}">
                      ${esc(o.name)}
                    </option>
                  `
                ).join('')
              }

            </select>
          </label>


          <label>
            Hạn

            <input
              type="date"
              name="due_at"
            >
          </label>


          <button class="primary">
            Giao công việc
          </button>

        </form>
        `
      );


      $('#adminTaskForm').onsubmit=
        async e=>{

          e.preventDefault();

          try{

            await api(
              `/api/admin/members/${p.id}/task`,
              {
                method:'POST',
                body:JSON.stringify(
                  Object.fromEntries(
                    new FormData(e.target)
                  )
                )
              }
            );

            await refreshAdminMemberTab(p.id,tab);

          }catch(err){

            alert(
              err.data?.error||
              err.message
            );
          }
        };
    };
  }


  if(tab==='activity'){

    box.innerHTML=`
      <div class="toolbar">

        <button
          id="recordActivity"
          class="primary"
        >
          Ghi nhận hoạt động
        </button>

      </div>


      <div class="list">

        ${
          d.activities.length
            ?d.activities.map(
                x=>`
                  <div class="list-item">

                    <b>
                      ${esc(x.name)}
                    </b>

                    <div class="meta">

                      ${esc(x.org_name||'Sky First Network')}

                      ·

                      ${esc(x.role_label||'Thành viên')}

                      ·

                      ${esc(x.starts_at||'')}

                    </div>

                    ${
                      x.result
                        ?`
                          <div>
                            ${esc(x.result)}
                          </div>
                        `
                        :''
                    }

                  </div>
                `
              ).join('')
            :`
              <div class="empty">
                Chưa có hoạt động.
              </div>
            `
        }

      </div>
    `;


    $('#recordActivity').onclick=()=>{

      modal(
        'Ghi nhận hoạt động',
        `
        <form
          id="activityForm"
          class="form-grid"
        >

          <label>
            Tên hoạt động

            <input
              name="name"
              required
            >
          </label>


          <label>
            Mã hoạt động

            <input
              name="code"
            >
          </label>


          <label>
            Đơn vị

            <select name="org_node_id">

              <option value="">
                Sky First Network
              </option>

              ${
                meta.orgs.map(
                  o=>`
                    <option value="${esc(o.id)}">
                      ${esc(o.name)}
                    </option>
                  `
                ).join('')
              }

            </select>
          </label>


          <label>
            Ngày bắt đầu

            <input
              type="date"
              name="starts_at"
            >
          </label>


          <label>
            Ngày kết thúc

            <input
              type="date"
              name="ends_at"
            >
          </label>


          <label>
            Vai trò

            <input
              name="role_label"
            >
          </label>


          <label>
            Kết quả / ghi nhận

            <textarea
              name="result"
            ></textarea>
          </label>


          <button class="primary">
            Ghi nhận
          </button>

        </form>
        `
      );


      $('#activityForm').onsubmit=
        async e=>{

          e.preventDefault();

          try{

            await api(
              `/api/admin/members/${p.id}/activity`,
              {
                method:'POST',
                body:JSON.stringify(
                  Object.fromEntries(
                    new FormData(e.target)
                  )
                )
              }
            );

            await refreshAdminMemberTab(p.id,tab);

          }catch(err){

            alert(
              err.data?.error||
              err.message
            );
          }
        };
    };
  }


  if(tab==='history'){

    box.innerHTML=`
      <div class="timeline">

        ${
          d.memberships.length
            ?d.memberships.map(
                x=>`
                  <div class="card timeline-item">

                    <b>
                      ${esc(
                        x.title||
                        x.role_label||
                        'Thành viên'
                      )}
                    </b>

                    <div>
                      ${esc(x.org_name)}
                    </div>

                    <div class="muted">

                      ${esc(x.started_at||'')}

                      →

                      ${esc(x.ended_at||'hiện tại')}

                      ·

                      ${esc(x.status)}

                    </div>

                    ${
                      x.decision_ref
                        ?`
                          <div class="meta">
                            Văn bản:
                            ${esc(x.decision_ref)}
                          </div>
                        `
                        :''
                    }

                  </div>
                `
              ).join('')
            :`
              <div class="empty">
                Chưa có lịch sử công tác.
              </div>
            `
        }

      </div>
    `;
  }


  if(tab==='evaluation'){
    const rows=d.evaluations||[];
    box.innerHTML=`<div class="toolbar"><button id="newEvaluation" class="primary">Thêm đánh giá</button></div><div class="list">${rows.length?rows.map(x=>`<div class="list-item"><b>${esc(x.period_label||x.period_type)} · ${esc(x.rating||'Chưa xếp loại')}</b><div class="meta">${esc(x.org_name||'Sky First Network')} · Người đánh giá: ${esc(x.evaluator_username||'—')} · ${x.total_score??'—'} điểm · ${esc(x.status)}</div>${x.comments?`<div>${esc(x.comments)}</div>`:''}<div class="toolbar" style="margin-top:8px">${x.status!=='final'?`<button data-eval-edit="${x.id}">Chỉnh sửa</button><button data-eval-final="${x.id}" class="primary">Chốt đánh giá</button>`:''}${x.status==='hidden'?`<button data-eval-show="${x.id}">Khôi phục</button>`:`<button data-eval-hide="${x.id}" class="danger">Ẩn</button>`}</div></div>`).join(''):'<div class="empty">Chưa có đánh giá.</div>'}</div>`;
    const form=(x={})=>modal(x.id?'Chỉnh sửa đánh giá':'Thêm đánh giá',`<form id="evaluationForm" class="form-grid"><label>Kỳ<select name="period_type"><option value="month">Tháng</option><option value="quarter">Quý</option><option value="half_year">6 tháng</option><option value="year">Năm</option><option value="program">Chương trình</option></select></label><label>Tên kỳ<input name="period_label" required value="${esc(x.period_label||'')}"></label><label>Đơn vị<select name="org_node_id"><option value="">Sky First Network</option>${meta.orgs.map(o=>`<option value="${o.id}" ${o.id===x.org_node_id?'selected':''}>${esc(o.name)}</option>`).join('')}</select></label><label>Điểm tổng<input type="number" min="0" max="100" step="0.1" name="total_score" value="${x.total_score??''}"></label><label>Xếp loại<input name="rating" value="${esc(x.rating||'')}"></label><label>Hiển thị<select name="visibility"><option value="member">Thành viên được xem</option><option value="admin">Chỉ quản trị</option></select></label><label style="grid-column:1/-1">Nhận xét<textarea name="comments" rows="5">${esc(x.comments||'')}</textarea></label><button class="primary">Lưu đánh giá</button></form>`);
    $('#newEvaluation').onclick=()=>{form();setTimeout(()=>{$('#evaluationForm').onsubmit=saveEval},0)};
    const saveEval=async e=>{e.preventDefault();const id=e.target.dataset.id;await api(`/api/admin/members/${p.id}/evaluation${id?'/'+id:''}`,{method:id?'PATCH':'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});await refreshAdminMemberTab(p.id,tab)};
    $$('[data-eval-edit]').forEach(b=>b.onclick=()=>{const x=rows.find(r=>r.id===b.dataset.evalEdit);form(x);setTimeout(()=>{const f=$('#evaluationForm');f.dataset.id=x.id;f.onsubmit=saveEval},0)});
    for(const [sel,act] of [['[data-eval-final]','finalize'],['[data-eval-hide]','hide'],['[data-eval-show]','show']]) $$(sel).forEach(b=>b.onclick=async()=>{const id=b.dataset.evalFinal||b.dataset.evalHide||b.dataset.evalShow;await api(`/api/admin/members/${p.id}/evaluation/${id}/${act}`,{method:'POST'});await refreshAdminMemberTab(p.id,tab)});
  }

  if(tab==='audit'){

    box.innerHTML=`
      <div class="list">

        ${
          d.audit.length
            ?d.audit.map(
                x=>`
                  <div class="list-item">

                    <b>
                      ${esc(x.action)}
                    </b>

                    <div class="meta">

                      ${esc(x.created_at)}

                      ·

                      ${esc(x.username||'Hệ thống')}

                      ·

                      ${esc(x.entity_type)}

                    </div>

                  </div>
                `
              ).join('')
            :`
              <div class="empty">
                Chưa có nhật ký liên quan.
              </div>
            `
        }

      </div>
    `;
  }


  if(tab==='cert'){

    box.innerHTML=`
      <div class="toolbar">

        <button
          id="issueCert"
          class="primary"
        >
          CẤP GCN
        </button>

      </div>


      <div class="list">

        ${
          d.certificates.length
            ?d.certificates.map(
                x=>`
                  <div class="list-item">

                    <b>
                      ${esc(x.title)}
                    </b>

                    <div class="meta">

                      ${esc(x.certificate_no||'')}

                      ·

                      ${esc(x.issuer)}

                      ·

                      ${esc(x.issued_at||'')}

                    </div>


                    <div class="actions">

                      ${
                        x.file_url
                          ?`
                            <button
                              onclick="window.open('${esc(x.file_url)}','_blank')"
                            >
                              PDF
                            </button>
                          `
                          :''
                      }


                      ${
                        x.verify_code
                          ?`
                            <button
                              onclick="window.open('/verify?code=${encodeURIComponent(x.verify_code)}','_blank')"
                            >
                              Xác minh
                            </button>
                          `
                          :''
                      }


                      ${
                        x.source_type==='external'&&
                        x.verification_status==='pending'
                          ?`
                            <button
                              data-cert-verify="${esc(x.id)}"
                            >
                              Duyệt xác minh
                            </button>

                            <button
                              class="danger"
                              data-cert-reject="${esc(x.id)}"
                            >
                              Từ chối
                            </button>
                          `
                          :''
                      }

                    </div>

                  </div>
                `
              ).join('')
            :`
              <div class="empty">
                Chưa có GCN.
              </div>
            `
        }

      </div>
    `;


    $$('[data-cert-verify]').forEach(
      b=>b.onclick=async()=>{

        try{

          await api(
            `/api/admin/certificates/${b.dataset.certVerify}/review`,
            {
              method:'POST',
              body:JSON.stringify({
                status:'verified'
              })
            }
          );

          alert(
            'Đã xác minh chứng nhận.'
          );

          await refreshAdminMemberTab(p.id,tab);

        }catch(err){

          alert(
            err.data?.error||
            err.message
          );
        }
      }
    );


    $$('[data-cert-reject]').forEach(
      b=>b.onclick=async()=>{

        try{

          await api(
            `/api/admin/certificates/${b.dataset.certReject}/review`,
            {
              method:'POST',
              body:JSON.stringify({
                status:'rejected'
              })
            }
          );

          alert(
            'Đã từ chối xác minh.'
          );

          await refreshAdminMemberTab(p.id,tab);

        }catch(err){

          alert(
            err.data?.error||
            err.message
          );
        }
      }
    );


    $('#issueCert').onclick=()=>{

      modal(
        'Cấp GCN cho '+
        esc(p.full_name),
        `
        <form
          id="certForm"
          class="form-grid"
        >

          <label>
            Tên GCN

            <input
              name="title"
              required
            >
          </label>


          <label>
            Số / mã GCN

            <input
              name="certificate_no"
              placeholder="Để trống để hệ thống tạo"
            >
          </label>


          <label>
            Đơn vị cấp

            <input
              name="issuer"
              value="Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First"
              required
            >
          </label>


          <label>
            Ngày cấp

            <input
              type="date"
              name="issued_at"
              value="${vietnamDateInput()}"
            >
          </label>


          <label>
            Đơn vị liên quan

            <select name="org_node_id">

              <option value="">
                Sky First Network
              </option>

              ${
                meta.orgs.map(
                  o=>`
                    <option value="${esc(o.id)}">
                      ${esc(o.name)}
                    </option>
                  `
                ).join('')
              }

            </select>
          </label>


          <label>
            Nội dung ghi nhận

            <textarea
              name="recognition"
              rows="4"
            ></textarea>
          </label>


          <label>
            PDF GCN

            <input
              type="file"
              name="pdf_file"
              accept="application/pdf"
            >

            <span class="file-help">
              PDF được lưu trực tiếp trên R2 tksfn.
            </span>
          </label>


          <label>
            Hoặc link PDF ngoài

            <input
              name="file_url"
              placeholder="https://..."
            >
          </label>


          <label>
            Mã xác minh

            <input
              name="verify_code"
              placeholder="Để trống để hệ thống tạo"
            >
          </label>


          <label>
            Ghi chú

            <textarea
              name="notes"
              rows="2"
            ></textarea>
          </label>


          <button class="primary">
            Cấp chứng nhận
          </button>

        </form>
        `
      );


      $('#certForm').onsubmit=
        async e=>{

          e.preventDefault();

          try{

            const fd=
              new FormData(e.target);

            const b=
              Object.fromEntries(fd);


            if(
              fd.get('pdf_file')?.size
            ){

              const up=
                await uploadBinary(
                  `/api/admin/members/${p.id}/certificate-file`,
                  fd.get('pdf_file')
                );

              b.file_url=
                up.url;
            }


            delete b.pdf_file;


            const r=
              await api(
                `/api/admin/members/${p.id}/certificate`,
                {
                  method:'POST',
                  body:JSON.stringify(b)
                }
              );


            alert(
              'Đã cấp GCN. Mã xác minh: '+
              r.verify_code
            );


            await refreshAdminMemberTab(p.id,tab);

          }catch(err){

            alert(
              err.data?.error||
              err.message
            );
          }
        };
    };
  }


  if(tab==='achievement'){

    box.innerHTML=`
      <div class="toolbar">

        <button
          id="addAchievement"
          class="primary"
        >
          Thêm thành tích
        </button>

      </div>


      <div class="list">

        ${
          d.achievements.length
            ?d.achievements.map(
                x=>`
                  <div class="list-item">

                    <b>
                      ${esc(x.title)}
                    </b>

                    <div class="meta">

                      ${esc(x.issuer||'Sky First Network')}

                      ·

                      ${esc(x.achieved_at||'')}

                    </div>

                  </div>
                `
              ).join('')
            :`
              <div class="empty">
                Chưa có thành tích.
              </div>
            `
        }

      </div>
    `;


    $('#addAchievement').onclick=
      ()=>simplePostModal(
        'Thêm thành tích',
        `/api/admin/members/${p.id}/achievement`,
        [
          [
            'title',
            'Tên thành tích'
          ],
          [
            'achievement_type',
            'Loại'
          ],
          [
            'issuer',
            'Đơn vị ghi nhận'
          ],
          [
            'achieved_at',
            'Ngày'
          ],
          [
            'description',
            'Mô tả'
          ]
        ],
        async()=>await refreshAdminMemberTab(p.id,tab)
      );
  }


  if(tab==='card'){

    box.innerHTML=`
      <div class="toolbar">

        <button
          id="issueCard"
          class="primary"
        >
          Cấp thẻ điện tử
        </button>

      </div>


      <div class="card-wallet">

        ${
          d.cards.length
            ?d.cards.map(
                x=>`
                  <div class="member-card">

                    <img
                      class="member-card-logo"
                      src="${logo}"
                      alt="Sky First Network"
                    >

                    <div class="eyebrow">
                      TRUNG TÂM THÀNH VIÊN SỐ SKY FIRST
                    </div>

                    <h3>
                      ${esc(x.card_type_name)}
                    </h3>

                    <img class="avatar large" src="${esc(p.avatar_url||'/sfn-logo.png')}" alt="Ảnh thành viên" style="width:88px;height:108px;object-fit:cover;border-radius:10px;margin:8px 0">
                    <img src="${esc(cardQrSrc(x,170))}" alt="QR xác minh" style="width:92px;height:92px;background:#fff;padding:4px;border-radius:8px;margin:8px">
                    <div><b>${esc(p.full_name)}</b></div>

                    <div class="small">

                      ${esc(x.card_number)}

                      ·

                      ${esc(x.org_name||'Sky First Network')}

                    </div>

                    <div class="card-status">${esc(x.status)}</div>
                    <div class="toolbar" style="margin-top:8px"><button onclick="window.open('/verify?code=${encodeURIComponent(x.verify_token)}','_blank')">Xác minh</button><button data-print-card="${esc(x.id)}">Tải PDF 2 mặt</button></div>

                  </div>
                `
              ).join('')
            :`
              <div class="empty">
                Chưa có thẻ.
              </div>
            `
        }

      </div>
    `;


    $('#issueCard').onclick=()=>{

      modal(
        'Cấp thẻ điện tử',
        `
        <form
          id="cardForm"
          class="form-grid"
        >

          <label>
            Loại thẻ

            <select name="card_type_id">

              ${
                meta.card_types.map(
                  x=>`
                    <option value="${esc(x.id)}">
                      ${esc(x.name)}
                    </option>
                  `
                ).join('')
              }

            </select>
          </label>


          <label>
            Đơn vị

            <select name="org_node_id">

              ${
                meta.orgs.map(
                  o=>`
                    <option value="${esc(o.id)}">
                      ${esc(o.name)}
                    </option>
                  `
                ).join('')
              }

            </select>
          </label>


          <label>
            Số thẻ

            <input
              name="card_number"
              placeholder="Để trống để hệ thống tạo"
            >
          </label>


          <label>
            Chức danh trên thẻ

            <input
              name="title_on_card"
            >
          </label>


          <label>
            Ngày cấp

            <input
              type="date"
              name="issued_at"
              value="${vietnamDateInput()}"
            >
          </label>


          <label>
            Hết hạn

            <input
              type="date"
              name="expires_at"
            >
          </label>


          <button class="primary">
            Cấp thẻ
          </button>

        </form>
        `
      );


      $('#cardForm').onsubmit=
        async e=>{

          e.preventDefault();

          try{

            await api(
              `/api/admin/members/${p.id}/card`,
              {
                method:'POST',
                body:JSON.stringify(
                  Object.fromEntries(
                    new FormData(e.target)
                  )
                )
              }
            );


            alert(
              'Đã cấp thẻ.'
            );


            await refreshAdminMemberTab(p.id,tab);

          }catch(err){

            alert(
              err.data?.error||
              err.message
            );
          }
        };
    };
  }


    $$('[data-print-card]').forEach(btn=>btn.onclick=()=>{const x=d.cards.find(v=>v.id===btn.dataset.printCard);if(x)printCardWindow(x,p)});

  if(tab==='document'){

    box.innerHTML=`
      <div class="toolbar">

        <button
          id="addDoc"
          class="primary"
        >
          Thêm tài liệu
        </button>

      </div>


      <div class="list">

        ${
          d.documents.length
            ?d.documents.map(
                x=>`
                  <div class="list-item">

                    <b>
                      ${esc(x.title)}
                    </b>

                    <div class="meta">

                      ${esc(x.document_type)}

                      ·

                      ${esc(x.issued_at||'')}

                    </div>

                    ${
                      x.file_url
                        ?`
                          <button
                            onclick="window.open('${esc(x.file_url)}','_blank')"
                          >
                            Mở
                          </button>
                        `
                        :''
                    }

                  </div>
                `
              ).join('')
            :`
              <div class="empty">
                Chưa có tài liệu.
              </div>
            `
        }

      </div>
    `;


    $('#addDoc').onclick=
      ()=>simplePostModal(
        'Thêm tài liệu',
        `/api/admin/members/${p.id}/document`,
        [
          [
            'title',
            'Tên tài liệu'
          ],
          [
            'document_type',
            'Loại'
          ],
          [
            'file_url',
            'Đường dẫn'
          ],
          [
            'issued_at',
            'Ngày'
          ]
        ],
        async()=>await refreshAdminMemberTab(p.id,tab)
      );
  }


  if(tab==='account'){

    box.innerHTML=`
      <div class="card">

        <div class="kv">

          <b>
            Tên đăng nhập
          </b>

          <span>
            ${esc(p.username||'—')}
          </span>

        </div>


        <div class="kv">

          <b>
            Lần đăng nhập cuối
          </b>

          <span>
            ${esc(p.last_login_at||'—')}
          </span>

        </div>


        <div class="kv">

          <b>
            Trạng thái tài khoản
          </b>

          <span>
            ${
              p.is_locked
                ?'Đang khóa'
                :'Hoạt động'
            }
          </span>

        </div>

      </div>


      <div
        class="toolbar"
        style="margin-top:12px"
      >

        <button
          id="resetPw"
          class="secondary"
        >
          Cấp mật khẩu mới
        </button>

        <button
          id="banAccount" class="danger" type="button">Cấm / gỡ cấm có tùy chỉnh</button>

        <button
          id="lockAccount"
          class="${
            p.is_locked
              ?'secondary'
              :'danger'
          }"
        >

          ${
            p.is_locked
              ?'Mở khóa tài khoản'
              :'Khóa tài khoản'
          }

        </button>

      </div>
    `;


    $('#banAccount').onclick=async()=>{
      const rid=p.id;
      try{
        const r=await api(`/api/admin/members/${rid}/restriction`),current=r.restriction;
        modal('Quản lý cấm tài khoản',`<div class="request-note">Cấm tài khoản sẽ thu hồi phiên đăng nhập ngay. Cấm tạm thời tự hết hiệu lực sau ngày đã chọn. Có thể gỡ cấm bất cứ lúc nào.</div><form id="restrictionForm" class="form-grid"><label>Hình thức<select name="type"><option value="ban">Cấm tài khoản</option>${current?'<option value="unban">Gỡ cấm tài khoản</option>':''}</select></label><label>Ngày kết thúc (để trống nếu vô thời hạn)<input name="ends_at" type="date" value="${esc(current?.ends_at||'')}"></label><label>Lý do xử lý<textarea name="reason" rows="3" maxlength="500" placeholder="Mô tả lý do...">${esc(current?.reason||'')}</textarea></label><label><input name="notify" type="checkbox" checked> Gửi email thông báo cho thành viên</label><div class="full"><button class="primary">Xác nhận xử lý</button></div><div id="restrictionMsg" class="msg"></div></form>`);
        $('#restrictionForm').onsubmit=async e=>{e.preventDefault();const form=e.target,btn=form.querySelector('button.primary');btn.disabled=true;try{const data=Object.fromEntries(new FormData(form));data.notify=form.elements.notify.checked;await api(`/api/admin/members/${rid}/restriction`,{method:'POST',body:JSON.stringify(data)});$('#modal')?.remove();toast('Đã cập nhật trạng thái cấm tài khoản.');await refreshAdminMemberTab(rid,tab)}catch(err){$('#restrictionMsg').textContent=err.data?.error||err.message}finally{btn.disabled=false}};
      }catch(err){toast('Không thể mở quản lý tài khoản: '+(err.data?.error||err.message),'warn')}
    };

    $('#resetPw').onclick=
      async()=>{

        const password=
          prompt(
            'Mật khẩu tạm mới (tối thiểu 10 ký tự):'
          );


        if(!password){
          return;
        }


        try{

          await api(
            `/api/admin/members/${p.id}/reset-password`,
            {
              method:'POST',
              body:JSON.stringify({
                password
              })
            }
          );


          alert(
            'Đã cấp mật khẩu tạm. Thành viên sẽ được yêu cầu đổi mật khẩu.'
          );

        }catch(err){

          alert(
            err.data?.error||
            err.message
          );
        }
      };


    $('#lockAccount').onclick=
      async()=>{

        try{

          await api(
            `/api/admin/members/${p.id}/lock`,
            {
              method:'POST',
              body:JSON.stringify({
                locked:!p.is_locked
              })
            }
          );


          alert(
            'Đã cập nhật tài khoản.'
          );


          await refreshAdminMemberTab(p.id,tab);

        }catch(err){

          alert(
            err.data?.error||
            err.message
          );
        }
      };
  }


  if(tab==='permissions'){

    box.innerHTML=`
      <div class="notice">

        Quyền quản trị được cấp theo
        ROLE + SCOPE + PERMISSION.

        Chức vụ tổ chức không tự động
        tạo quyền quản trị.

      </div>


      <div class="list">

        ${
          d.scopes.map(
            x=>`
              <div class="list-item">

                <b>
                  ${esc(x.role_name)}
                </b>

                <div class="meta">

                  ${esc(
                    x.org_name||
                    'Toàn hệ thống / không giới hạn node'
                  )}

                  ·

                  ${
                    x.active
                      ?'Đang hiệu lực'
                      :'Ngừng'
                  }

                </div>

              </div>
            `
          ).join('')
          ||
          `
            <div class="empty">
              Chỉ có quyền thành viên cơ bản.
            </div>
          `
        }

      </div>


      <div
        class="toolbar"
        style="margin-top:12px"
      >

        <button
          id="grantScope"
          class="primary"
        >
          Cấp phạm vi quản trị
        </button>

      </div>
    `;


    $('#grantScope').onclick=()=>{

      modal(
        'Cấp phạm vi quản trị',
        `
        <form
          id="scopeForm"
          class="form-grid"
        >

          <label>
            Vai trò hệ thống

            <select name="role_id">

              ${
                meta.roles
                  .filter(
                    r=>r.code!=='SUPER_ADMIN'
                  )
                  .map(
                    r=>`
                      <option value="${esc(r.id)}">
                        ${esc(r.name)}
                      </option>
                    `
                  )
                  .join('')
              }

            </select>
          </label>


          <label>
            Phạm vi

            <select name="org_node_id">

              <option value="">
                Không giới hạn node
              </option>

              ${
                meta.orgs.map(
                  o=>`
                    <option value="${esc(o.id)}">
                      ${esc(o.name)}
                    </option>
                  `
                ).join('')
              }

            </select>
          </label>


          <button class="primary">
            Cấp quyền
          </button>

        </form>
        `
      );


      $('#scopeForm').onsubmit=
        async e=>{

          e.preventDefault();

          try{

            await api(
              `/api/admin/members/${p.id}/scope`,
              {
                method:'POST',
                body:JSON.stringify(
                  Object.fromEntries(
                    new FormData(e.target)
                  )
                )
              }
            );


            alert(
              'Đã cấp phạm vi.'
            );


            await refreshAdminMemberTab(p.id,tab);

          }catch(err){

            alert(
              err.data?.error||
              err.message
            );
          }
        };
    };
  }

  wireAdminLifecycle(tab,box,p,d,meta);
}


/* =========================================================
   ADMIN RECORD LIFECYCLE HELPERS
   ========================================================= */

async function refreshAdminMemberTab(pid,tab){
  try{
    const [d,meta]=await Promise.all([api(`/api/admin/members/${pid}`),getMeta()]);
    state.adminMember=d;
    renderAdminMemberTab(tab,d,meta);
  }catch(err){
    alert(err.data?.error||err.message);
  }
}

function lifecycleToolbar(el,buttons){
  if(!el||!buttons.length)return;
  const bar=document.createElement('div');
  bar.className='toolbar';
  bar.style.marginTop='10px';
  buttons.forEach(({label,cls='secondary',run})=>{
    const b=document.createElement('button');
    b.type='button'; b.className=cls; b.textContent=label; b.onclick=run; bar.appendChild(b);
  });
  el.appendChild(bar);
}

async function adminRecordAction(pid,tab,kind,id,action,label){
  if(!confirm(label+'?'))return;
  try{
    await api(`/api/admin/members/${pid}/${kind}/${id}/${action}`,{method:'POST',body:'{}'});
    await refreshAdminMemberTab(pid,tab);
  }catch(err){alert(err.data?.error||err.message)}
}

function editAdminRecordModal(pid,tab,kind,x,meta){
  const orgOptions=`<option value="">Không gắn đơn vị</option>${meta.orgs.map(o=>`<option value="${esc(o.id)}" ${x.org_node_id===o.id?'selected':''}>${esc(o.name)}</option>`).join('')}`;
  let fields='';
  if(kind==='goal') fields=`
    <label>Chu kỳ<select name="period_type">${['week','month','quarter','year'].map(v=>`<option value="${v}" ${x.period_type===v?'selected':''}>${({week:'Tuần',month:'Tháng',quarter:'Quý',year:'Năm'})[v]}</option>`).join('')}</select></label>
    <label>Tiêu đề<input name="title" required value="${esc(x.title||'')}"></label>
    <label>Mô tả<textarea name="description">${esc(x.description||'')}</textarea></label>
    <label>Đơn vị<select name="org_node_id">${orgOptions}</select></label>
    <label>Ưu tiên<input name="priority" value="${esc(x.priority||'normal')}"></label>
    <label>Tiến độ %<input name="progress" type="number" min="0" max="100" value="${Number(x.progress||0)}"></label>
    <label>Bắt đầu<input name="starts_at" type="date" value="${esc(x.starts_at||'')}"></label>
    <label>Hạn<input name="due_at" type="date" value="${esc(x.due_at||'')}"></label>`;
  if(kind==='task') fields=`
    <label>Tiêu đề<input name="title" required value="${esc(x.title||'')}"></label>
    <label>Mô tả<textarea name="description">${esc(x.description||'')}</textarea></label>
    <label>Đơn vị<select name="org_node_id">${orgOptions}</select></label>
    <label>Ưu tiên<input name="priority" value="${esc(x.priority||'normal')}"></label>
    <label>Tiến độ %<input name="progress" type="number" min="0" max="100" value="${Number(x.progress||0)}"></label>
    <label>Hạn<input name="due_at" type="date" value="${esc(x.due_at||'')}"></label>`;
  if(kind==='activity') fields=`
    <label>Tên hoạt động<input name="name" required value="${esc(x.name||'')}"></label>
    <label>Mã<input name="code" value="${esc(x.code||'')}"></label>
    <label>Đơn vị<select name="org_node_id">${orgOptions}</select></label>
    <label>Vai trò<input name="role_label" value="${esc(x.role_label||'')}"></label>
    <label>Kết quả<textarea name="result">${esc(x.result||'')}</textarea></label>
    <label>Bắt đầu<input name="starts_at" type="date" value="${esc((x.starts_at||'').slice(0,10))}"></label>
    <label>Kết thúc<input name="ends_at" type="date" value="${esc((x.ends_at||'').slice(0,10))}"></label>
    <label>Trạng thái<input name="status" value="${esc(x.status||'completed')}"></label>
    <label>Mô tả<textarea name="description">${esc(x.description||'')}</textarea></label>`;
  if(kind==='certificate') fields=`
    <label>Số GCN<input name="certificate_no" value="${esc(x.certificate_no||'')}"></label>
    <label>Tên GCN<input name="title" required value="${esc(x.title||'')}"></label>
    <label>Đơn vị cấp<input name="issuer" required value="${esc(x.issuer||'Sky First Network')}"></label>
    <label>Đơn vị<select name="org_node_id">${orgOptions}</select></label>
    <label>Ngày cấp<input name="issued_at" type="date" value="${esc(x.issued_at||'')}"></label>
    <label>Đường dẫn PDF<input name="file_url" value="${esc(x.file_url||'')}"></label>`;
  if(kind==='achievement') fields=`
    <label>Thành tích<input name="title" required value="${esc(x.title||'')}"></label>
    <label>Loại<input name="achievement_type" value="${esc(x.achievement_type||'')}"></label>
    <label>Đơn vị ghi nhận<input name="issuer" value="${esc(x.issuer||'')}"></label>
    <label>Đơn vị<select name="org_node_id">${orgOptions}</select></label>
    <label>Ngày<input name="achieved_at" type="date" value="${esc(x.achieved_at||'')}"></label>
    <label>Mô tả<textarea name="description">${esc(x.description||'')}</textarea></label>`;
  if(kind==='card') fields=`
    <label>Số thẻ<input name="card_number" required value="${esc(x.card_number||'')}"></label>
    <label>Chức danh<input name="title_on_card" value="${esc(x.title_on_card||'')}"></label>
    <label>Đơn vị<select name="org_node_id">${orgOptions}</select></label>
    <label>Ngày cấp<input name="issued_at" type="date" value="${esc(x.issued_at||'')}"></label>
    <label>Hết hạn<input name="expires_at" type="date" value="${esc(x.expires_at||'')}"></label>`;
  if(kind==='document') fields=`
    <label>Tên tài liệu<input name="title" required value="${esc(x.title||'')}"></label>
    <label>Loại<input name="document_type" value="${esc(x.document_type||'other')}"></label>
    <label>Đơn vị<select name="org_node_id">${orgOptions}</select></label>
    <label>Đường dẫn<input name="file_url" value="${esc(x.file_url||'')}"></label>
    <label>Ngày<input name="issued_at" type="date" value="${esc(x.issued_at||'')}"></label>`;
  modal('Chỉnh sửa',`<form id="recordEditForm" class="form-grid">${fields}<button class="primary">Lưu thay đổi</button></form>`);
  $('#recordEditForm').onsubmit=async e=>{
    e.preventDefault();
    try{
      await api(`/api/admin/members/${pid}/${kind}/${x.id}`,{method:'PATCH',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});
      $('#modal')?.remove();
      await refreshAdminMemberTab(pid,tab);
    }catch(err){alert(err.data?.error||err.message)}
  };
}

function wireAdminLifecycle(tab,box,p,d,meta){
  const add=(selector,items,builder)=>{
    [...box.querySelectorAll(selector)].forEach((el,i)=>{const x=items[i];if(x)lifecycleToolbar(el,builder(x));});
  };
  const edit=(kind,x)=>({label:'Chỉnh sửa',run:()=>editAdminRecordModal(p.id,tab,kind,x,meta)});
  const act=(kind,x,action,label,cls='secondary')=>({label,cls,run:()=>adminRecordAction(p.id,tab,kind,x.id,action,label)});

  if(tab==='goal') add('.list .list-item',d.goals,x=>[edit('goal',x),...(x.status==='active'?[act('goal',x,'complete','Hoàn thành'),act('goal',x,'cancel','Hủy','danger')]:[act('goal',x,'restore','Khôi phục')])]);
  if(tab==='task') add('.list .list-item',d.tasks,x=>[edit('task',x),...(x.status==='done'||x.status==='cancelled'?[act('task',x,'restore','Khôi phục')]:[x.status!=='doing'?act('task',x,'doing','Đang thực hiện'):act('task',x,'todo','Chuyển về chờ'),act('task',x,'complete','Hoàn thành'),act('task',x,'cancel','Hủy','danger')])]);
  if(tab==='activity') add('.list .list-item',d.activities,x=>[edit('activity',x),...(x.verification_status==='hidden'?[act('activity',x,'show','Hiện lại')]:[act('activity',x,'hide','Ẩn khỏi hồ sơ','danger')])]);
  if(tab==='cert') add('.list .list-item',d.certificates,x=>[edit('certificate',x),...(x.verification_status==='rejected'?[act('certificate',x,'restore','Khôi phục')]:[act('certificate',x,'revoke','Thu hồi GCN','danger')])]);
  if(tab==='achievement') add('.list .list-item',d.achievements,x=>[edit('achievement',x),...(x.verification_status==='hidden'?[act('achievement',x,'show','Hiện lại')]:[act('achievement',x,'hide','Ẩn khỏi hồ sơ','danger')])]);
  if(tab==='card') add('.card-wallet .member-card',d.cards,x=>[edit('card',x),...(x.status==='revoked'?[act('card',x,'restore','Kích hoạt lại')]:[act('card',x,'revoke','Vô hiệu hóa','danger')])]);
  if(tab==='document') add('.list .list-item',d.documents,x=>[edit('document',x),...(x.visibility==='hidden'?[act('document',x,'show','Hiện lại')]:[act('document',x,'hide','Ẩn khỏi hồ sơ','danger')])]);
  if(tab==='permissions') add('.list .list-item',d.scopes,x=>x.role_code==='MEMBER'?[]:[x.active?act('scope',x,'deactivate','Ngừng quyền','danger'):act('scope',x,'activate','Khôi phục quyền')]);
}


/* =========================================================
   SIMPLE POST MODAL
   ========================================================= */

function simplePostModal(
  title,
  url,
  fields,
  done
){

  modal(
    title,
    `
    <form
      id="simpleForm"
      class="form-grid"
    >

      ${
        fields.map(
          ([n,l])=>`
            <label>

              ${l}

              <input
                name="${n}"
                ${
                  n==='title'
                    ?'required'
                    :''
                }
                ${
                  n.includes('date')||
                  n.endsWith('_at')
                    ?'type="date"'
                    :''
                }
              >

            </label>
          `
        ).join('')
      }

      <button class="primary">
        Lưu
      </button>

    </form>
    `
  );


  $('#simpleForm').onsubmit=
    async e=>{

      e.preventDefault();

      try{

        await api(
          url,
          {
            method:'POST',
            body:JSON.stringify(
              Object.fromEntries(
                new FormData(e.target)
              )
            )
          }
        );


        alert(
          'Đã lưu.'
        );


        done();

      }catch(err){

        alert(
          err.data?.error||
          err.message
        );
      }
    };
}


/* =========================================================
   ADMIN - CƠ CẤU TỔ CHỨC
   ========================================================= */

function defaultCardTemplate(type){
  return {version:2,accent:'#1677d2',subtitle:'',size:{width_mm:86,height_mm:54},backTitle:'HIỆU LỰC & CÁCH SỬ DỤNG',front:{elements:[
    {id:'brand',kind:'text',text:'SKY FIRST NETWORK',x:5,y:5,w:58,h:6,color:'#ffffff',size:8,bold:true,align:'left'},
    {id:'title',kind:'text',text:type?.name||'THẺ SỰ KIỆN',x:5,y:15,w:60,h:10,color:'#ffffff',size:19,bold:true,align:'left'},
    {id:'photo',kind:'photo',text:'',x:70,y:4,w:25,h:16,color:'#ffffff',size:8,bold:false,align:'center',radius:5},
    {id:'name',kind:'text',text:'{{full_name}}',x:5,y:29,w:58,h:9,color:'#ffffff',size:15,bold:true,align:'left'},
    {id:'role',kind:'text',text:'{{role_label}}',x:5,y:39,w:49,h:7,color:'#dceeff',size:9,bold:false,align:'left'},
    {id:'event',kind:'text',text:'{{event_name}}',x:5,y:47,w:56,h:6,color:'#dceeff',size:7,bold:false,align:'left'},
    {id:'qr',kind:'qr',text:'',x:72,y:21,w:21,h:25,color:'#ffffff',size:8,bold:false,align:'center'},
    {id:'number',kind:'text',text:'{{card_number}}',x:66,y:48,w:29,h:5,color:'#ffffff',size:6,bold:false,align:'right'}
  ]},back:{elements:[
    {id:'backtitle',kind:'text',text:'HIỆU LỰC & CÁCH SỬ DỤNG',x:6,y:7,w:88,h:8,color:'#0b2b49',size:13,bold:true,align:'left'},
    {id:'valid',kind:'text',text:'Hiệu lực: {{issued_at}} → {{expires_at}}',x:6,y:20,w:88,h:7,color:'#173e5d',size:9,bold:true,align:'left'},
    {id:'use',kind:'text',text:'Sử dụng thẻ theo quy định của chương trình. QR ở mặt trước dùng để xác minh thẻ.',x:6,y:31,w:88,h:18,color:'#4b657d',size:9,bold:false,align:'left'},
    {id:'note',kind:'text',text:'Thẻ chỉ có giá trị trong phạm vi và thời gian được ghi trên thẻ.',x:6,y:43,w:88,h:8,color:'#4b657d',size:8,bold:false,align:'left'}
  ]}};
}
function templateFor(type){
  let t={};try{t=JSON.parse(type?.template_json||'{}')}catch{}
  const d=defaultCardTemplate(type);
  const mergeSide=side=>{
    const saved=Array.isArray(t[side]?.elements)?t[side].elements:null;
    const elements=saved?[...saved]:[...(d[side]?.elements||[])];
    const required=side==='front'?['photo','qr']:[];
    for(const id of required){if(!elements.some(e=>e.id===id||e.kind===id)){const fallback=(d[side]?.elements||[]).find(e=>e.id===id||e.kind===id);if(fallback)elements.push({...fallback})}}
    return {...(d[side]||{}),...(t[side]||{}),elements};
  };
  const width=Number(t.size?.width_mm),height=Number(t.size?.height_mm);
  return {...d,...t,size:width===54&&height===86?{width_mm:54,height_mm:86}:{width_mm:86,height_mm:54},front:mergeSide('front'),back:mergeSide('back')};
}
function autoLayoutCard(t,orientation){
  const portrait=orientation==='portrait';
  t.size=portrait?{width_mm:54,height_mm:86}:{width_mm:86,height_mm:54};
  const layouts=portrait?{
    front:{brand:[6,4,88,5],photo:[6,12,31,20],qr:[63,12,31,20],title:[6,35,88,9],name:[6,46,88,9],role:[6,57,88,6],event:[6,65,88,6],number:[6,73,88,5]},
    back:{backtitle:[6,7,88,8],valid:[6,20,88,9],use:[6,34,88,24],note:[6,64,88,13]}
  }:{
    front:{brand:[5,5,58,6],photo:[70,4,25,16],qr:[72,21,21,25],title:[5,15,60,10],name:[5,29,58,9],role:[5,39,49,7],event:[5,47,56,6],number:[66,48,29,5]},
    back:{backtitle:[6,7,88,8],valid:[6,20,88,7],use:[6,31,88,18],note:[6,43,88,8]}
  };
  for(const side of ['front','back'])for(const el of (t[side]?.elements||[])){const pos=layouts[side][el.id];if(pos)[el.x,el.y,el.w,el.h]=pos}
  return t;
}
function credentialText(t,x){return String(t||'').replaceAll('{{full_name}}',x.full_name||'').replaceAll('{{role_label}}',x.role_label||'').replaceAll('{{event_name}}',x.event_name||'').replaceAll('{{card_number}}',x.card_number||'').replaceAll('{{issued_at}}',x.issued_at||'—').replaceAll('{{expires_at}}',x.expires_at||'Không thời hạn')}
function safeCssColor(v,fallback='#ffffff'){return /^#[a-f0-9]{6}$/i.test(v||'')?v:fallback}
function cardHtml(x,t,side='front',qrUrl=''){
  const elems=(t[side]?.elements||[]);
  const bg=side==='front'
    ?`linear-gradient(135deg,#082b4b,${safeCssColor(t.accent,'#1677d2')})`
    :'linear-gradient(145deg,#f8fcff,#eaf5ff)';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min));
  const body=elems.map(e=>{
    const w=clamp(e.w,4,100), h=clamp(e.h,4,100);
    const xx=clamp(e.x,0,100-w), yy=clamp(e.y,0,100-h);
    const text=credentialText(e.text,x);
    const style=`left:${xx}%;top:${yy}%;width:${w}%;height:${h}%;color:${safeCssColor(e.color,side==='front'?'#fff':'#173e5d')};font-size:${clamp(e.size,6,96)}px;font-weight:${e.bold?800:500};text-align:${e.align||'left'};display:flex;align-items:center;justify-content:${e.align==='center'?'center':e.align==='right'?'flex-end':'flex-start'};line-height:1.2;position:absolute;overflow:hidden;`;
    if(e.kind==='qr'&&side==='back')return `<span class="sf-card-el" style="${style}">QR xác minh ở mặt trước</span>`;
    if(e.kind==='qr')return `<img class="sf-card-el sf-card-qr" style="${style}padding:2.2%;background:#fff;border-radius:6px;object-fit:contain" src="${esc(qrUrl)}" alt="QR xác minh">`;
    if(e.kind==='photo')return `<img class="sf-card-el" style="${style}object-fit:cover;border-radius:${clamp(e.radius,0,32)}px;background:#fff" src="${esc(x.photo_url||'/sfn-logo.png')}" alt="Ảnh">`;
    if(e.kind==='logo')return `<img class="sf-card-el" style="${style}object-fit:contain" src="${esc(t.logo_url||'/sfn-logo.png')}" alt="Logo">`;
    if(e.kind==='shape')return `<span class="sf-card-el" style="${style}background:${safeCssColor(e.color,'#ffffff')};border-radius:${clamp(e.radius,0,32)}px;opacity:${clamp(e.opacity,0,1)}"></span>`;
    return `<span class="sf-card-el" style="${style}">${esc(text)}</span>`;
  }).join('');
  const orientation=t.size?.width_mm===54&&t.size?.height_mm===86?'portrait':'landscape';
  return `<div class="sf-card-face" data-orientation="${orientation}" style="width:100%;height:100%;position:relative;background:${bg};overflow:hidden">${body}</div>`;
}
function cardPhysicalSize(t){return t?.size?.width_mm===54&&t?.size?.height_mm===86?{width:54,height:86,orientation:'portrait'}:{width:86,height:54,orientation:'landscape'}};
function cardSvg(x,t,side='front',qr=''){
  const size=cardPhysicalSize(t),viewW=100,viewH=viewW*size.height/size.width;
  const safe=(v)=>esc(String(v??''));
  const bg=side==='front'?['#082b4b',safeCssColor(t.accent,'#1677d2')]:['#f8fcff','#eaf5ff'];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min));
  const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${size.orientation==='portrait'?638:1016}" height="${size.orientation==='portrait'?1016:638}" viewBox="0 0 ${viewW} ${viewH}">`,
    `<defs><linearGradient id="cardbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg[0]}"/><stop offset="100%" stop-color="${bg[1]}"/></linearGradient></defs>`,
    `<rect width="100" height="${viewH}" fill="url(#cardbg)"/>`];
  for(const [i,e] of (t[side]?.elements||[]).entries()){
    const w=clamp(e.w,4,100),h=clamp(e.h,4,100),xx=clamp(e.x,0,100-w),yy=clamp(e.y,0,100-h);
    const X=xx,Y=viewH*yy/100,W=w,H=viewH*h/100,rx=clamp(e.radius,0,32)*100/viewW/4;
    const color=safeCssColor(e.color,side==='front'?'#ffffff':'#173e5d');
    if(e.kind==='qr'&&side==='back'){
      const cssCardWidth=size.width/25.4*96,backFont=clamp(e.size,6,72)*100/cssCardWidth;parts.push(`<text x="${X}" y="${Y+Math.min(H,backFont)}" fill="${color}" font-family="Arial,sans-serif" font-size="${backFont}">QR xác minh ở mặt trước</text>`);continue;
    }
    if(e.kind==='shape'){
      parts.push(`<rect x="${X}" y="${Y}" width="${W}" height="${H}" rx="${rx}" fill="${color}" opacity="${clamp(e.opacity,0,1)}"/>`);continue;
    }
    if(['photo','logo','qr'].includes(e.kind)){
      const src=e.kind==='qr'?qr:(e.kind==='photo'?(x.photo_url||'/sfn-logo.png'):(t.logo_url||'/sfn-logo.png'));
      const clipId=`clip${side}${i}`;
      parts.push(`<defs><clipPath id="${clipId}"><rect x="${X}" y="${Y}" width="${W}" height="${H}" rx="${e.kind==='photo'?Math.min(rx,2):1}"/></clipPath></defs>`);
      if(e.kind==='qr')parts.push(`<rect x="${X}" y="${Y}" width="${W}" height="${H}" rx="1" fill="#ffffff"/>`);
      const mode=e.kind==='photo'?'xMidYMid slice':'xMidYMid meet';
      parts.push(`<image href="${safe(src)}" x="${X}" y="${Y}" width="${W}" height="${H}" preserveAspectRatio="${mode}" clip-path="url(#${clipId})"/>`);continue;
    }
    const raw=credentialText(e.text,x),fontPx=clamp(e.size,6,72),cssCardWidth=size.width/25.4*96,font=fontPx*100/cssCardWidth,lineHeight=font*1.2;
    const chars=Math.max(1,Math.floor(W*cssCardWidth/100/(fontPx*.56))),words=raw.split(/\s+/),lines=[];let line='';
    for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>chars&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);
    const visible=lines.slice(0,Math.max(1,Math.floor(H/lineHeight)));const blockHeight=visible.length*lineHeight;
    const anchor=e.align==='center'?'middle':e.align==='right'?'end':'start';
    const tx=e.align==='center'?X+W/2:e.align==='right'?X+W:X;
    const ty=Y+(H-blockHeight)/2+font;
    const spans=visible.map((line,j)=>`<tspan x="${tx}" dy="${j===0?0:lineHeight}">${safe(line)}</tspan>`).join('');
    parts.push(`<text x="${tx}" y="${ty}" fill="${color}" font-family="Arial,sans-serif" font-size="${font}" font-weight="${e.bold?800:500}" text-anchor="${anchor}">${spans}</text>`);
  }
  parts.push('</svg>');return parts.join('');
}
async function fetchAsDataUrl(url){
  if(!url)return '';
  const r=await fetch(url,{credentials:'same-origin'});if(!r.ok)throw new Error(`Không thể tải tài nguyên thẻ (${r.status}).`);
  const blob=await r.blob();return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result));fr.onerror=()=>reject(new Error('Không thể đọc tài nguyên thẻ.'));fr.readAsDataURL(blob)});
}
async function exportCardAssets(x,t){
  const out={...x};out._qrData=await fetchAsDataUrl(cardQrSrc(x,600));
  try{out.photo_url=await fetchAsDataUrl(x.photo_url||'/sfn-logo.png')}catch{out.photo_url=await fetchAsDataUrl('/sfn-logo.png');if(x.photo_url)toast('Ảnh ngoài website không cho phép nhúng vào PDF; tạm dùng logo thay thế.','warn')}
  if(t.logo_url){try{t={...t,logo_url:await fetchAsDataUrl(t.logo_url)}}catch{t={...t,logo_url:await fetchAsDataUrl('/sfn-logo.png')};toast('Logo mẫu không thể nhúng vào PDF; đang dùng logo Sky First.','warn')}}
  return {x:out,t};
}
async function rasterizeCard(x,t,side,preparedAssets=null){
  const assets=preparedAssets||await exportCardAssets(x,t),size=cardPhysicalSize(t),svg=cardSvg(assets.x,assets.t,side,assets.x._qrData),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{const img=new Image();img.decoding='async';img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=size.orientation==='portrait'?638:1016;canvas.height=size.orientation==='portrait'?1016:638;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Trình duyệt không hỗ trợ tạo PDF.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.96)}finally{URL.revokeObjectURL(url)}
}
function dataUrlBytes(dataUrl){const raw=atob(dataUrl.split(',')[1]||''),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function joinBytes(parts){const len=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(len);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length}return out}
function makePdfFromImages(pages){
  const enc=new TextEncoder(),bytes=s=>enc.encode(s),chunks=[bytes('%PDF-1.4\n%SkyFirst\n')],offsets=[];let total=chunks[0].length;
  const kids=pages.map((_,i)=>`${3+i*3} 0 R`).join(' '),objs=[];objs[1]=bytes('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');objs[2]=bytes(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);
  pages.forEach((p,i)=>{const pn=3+i*3,cn=pn+1,inNo=pn+2,w=p.widthMm/25.4*72,h=p.heightMm/25.4*72,content=bytes(`q\n${w.toFixed(4)} 0 0 ${h.toFixed(4)} 0 0 cm\n/Im0 Do\nQ\n`);objs[pn]=bytes(`${pn} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w.toFixed(4)} ${h.toFixed(4)}] /Resources << /XObject << /Im0 ${inNo} 0 R >> >> /Contents ${cn} 0 R >>\nendobj\n`);objs[cn]=joinBytes([bytes(`${cn} 0 obj\n<< /Length ${content.length} >>\nstream\n`),content,bytes('endstream\nendobj\n')]);objs[inNo]=joinBytes([bytes(`${inNo} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.widthPx} /Height ${p.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.image.length} >>\nstream\n`),p.image,bytes('\nendstream\nendobj\n')])});
  for(let i=1;i<objs.length;i++){offsets[i]=total;chunks.push(objs[i]);total+=objs[i].length}const xrefOffset=total;let xref=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;for(let i=1;i<objs.length;i++)xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;chunks.push(bytes(xref+`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));return new Blob([joinBytes(chunks)],{type:'application/pdf'});
}
async function downloadCardPdf(x,t){
  if(!x?.verify_token)throw new Error('Thẻ chưa có mã xác minh hợp lệ.');
  const size=cardPhysicalSize(t),safe=String(x.card_number||x.id||'sky-first').replace(/[^a-z0-9_-]+/gi,'-'),pages=[];
  const template={...t,back:{...(t.back||{}),elements:(t.back?.elements||[]).map(e=>e.kind==='qr'?{...e,kind:'text',text:'QR xác minh ở mặt trước'}:e)}};
  const assets=await exportCardAssets(x,template);
  for(const side of ['front','back']){const data=await rasterizeCard(x,template,side,assets);pages.push({image:dataUrlBytes(data),widthMm:size.width,heightMm:size.height,widthPx:size.orientation==='portrait'?638:1016,heightPx:size.orientation==='portrait'?1016:638})}
  const blob=makePdfFromImages(pages),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`the-${safe}-2-mat.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast(`Đã tải PDF hai mặt · ${size.width} × ${size.height} mm mỗi mặt.`);
}
function openCardPrint(x,t){downloadCardPdf(x,t).catch(e=>toast(e.message||'Không thể tạo PDF thẻ.','warn'))}
async function mountCardDesignStudio(container){
  const d=await api('/api/admin/card-designs'); const items=d.items||[];
  if(!items.length){container.insertAdjacentHTML('beforeend','<section class="card studio-design"><h2>Thiết kế thẻ</h2><p class="muted">Chưa có loại thẻ để thiết kế.</p></section>');return}
  container.insertAdjacentHTML('beforeend',`<section class="card studio-design"><div class="section-title"><div><div class="eyebrow">CARD STUDIO</div><h2>Thiết kế thẻ 2 mặt</h2><p class="muted">Kéo thả bố cục, chỉnh màu, chữ, vị trí QR và nội dung mặt sau. Dòng “Trung Tâm Thành Viên Số Sky First” không được tự động in lên thẻ.</p></div></div><div class="card-studio-shell"><aside class="card-studio-tools"><label>Loại thẻ<select id="csType">${items.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label>Chiều thẻ<select id="csOrientation"><option value="landscape">Ngang · 86 × 54 mm</option><option value="portrait">Dọc · 54 × 86 mm</option></select></label><div class="studio-side-tabs"><button class="primary" data-cs-side="front">Mặt trước</button><button class="secondary" data-cs-side="back">Mặt sau</button></div><div id="csElements"></div><div class="toolbar"><button class="secondary" data-add-el="text">+ Chữ</button><button class="secondary" data-add-el="shape">+ Họa tiết</button><button class="secondary" data-add-el="photo">+ Ảnh</button><button class="secondary" data-add-el="logo">+ Logo</button><button class="primary" id="csSave">Lưu mẫu</button></div><div id="csMsg" class="msg"></div></aside><div class="card-studio-preview-wrap"><div class="card-studio-preview" id="csPreview"></div><p class="muted">Chọn ngang 86 × 54 mm hoặc dọc 54 × 86 mm. QR chỉ ở mặt trước.</p></div></div></section>`);
  const typeSel=$('#csType'),orientationSel=$('#csOrientation'),preview=$('#csPreview'),elements=$('#csElements');let side='front',type=items[0],t=templateFor(type),selected=null;
  const previewPerson={full_name:'NGUYỄN VĂN A',role_label:'Tình nguyện viên',event_name:'Sự kiện Sky First',card_number:'SFN-EVT-00000001',issued_at:'01/10/2026',expires_at:'31/10/2026',photo_url:'/sfn-logo.png'};
  const syncPreview=()=>{const size=cardPhysicalSize(t);preview.style.aspectRatio=`${size.width}/${size.height}`;preview.style.width=size.orientation==='portrait'?'min(100%, 350px)':'min(100%, 700px)';preview.innerHTML=cardHtml(previewPerson,t,side,cardQrSrc({verify_token:'PREVIEW'},600));};
  const redraw=()=>{type=items.find(x=>x.id===typeSel.value)||items[0];t=templateFor(type);orientationSel.value=cardPhysicalSize(t).orientation;syncPreview();renderElements();};
  const renderElements=()=>{const arr=t[side]?.elements||[];elements.innerHTML=arr.map((e,i)=>`<div class="cs-element ${selected===i?'selected':''}" data-cs-i="${i}"><div><b>${e.kind==='qr'?'QR':e.kind==='photo'?'Ảnh':e.kind==='logo'?'Logo':e.kind==='shape'?'Họa tiết':'Chữ'}</b>${(e.kind==='qr'||e.kind==='photo')&&side==='front'?`<span class="meta">${e.kind==='qr'?'QR bắt buộc':'Ảnh bắt buộc'}</span>`:`<button type="button" data-cs-del="${i}">×</button>`}</div>${e.kind==='text'?`<input data-cs-text="${i}" value="${esc(e.text||'')}" placeholder="Nội dung">`:''}<div class="cs-mini-grid"><label>X<input data-cs-x="${i}" type="number" min="0" max="100" value="${e.x}"></label><label>Y<input data-cs-y="${i}" type="number" min="0" max="100" value="${e.y}"></label><label>Rộng<input data-cs-w="${i}" type="number" min="4" max="100" value="${e.w}"></label><label>Cao<input data-cs-h="${i}" type="number" min="4" max="100" value="${e.h}"></label></div>${e.kind!=='qr'&&e.kind!=='photo'&&e.kind!=='logo'?`<div class="cs-mini-grid"><label>Cỡ chữ<input data-cs-size="${i}" type="number" min="8" max="72" value="${e.size||10}"></label><label>Màu<input data-cs-color="${i}" type="color" value="${safeCssColor(e.color,'#ffffff')}"></label></div>`:''}</div>`).join('');
    $$('[data-cs-del]').forEach(b=>b.onclick=()=>{arr.splice(Number(b.dataset.csDel),1);selected=null;redraw()});
    ['text','x','y','w','h','size','color'].forEach(k=>$$(`[data-cs-${k}]`).forEach(inp=>inp.oninput=()=>{const key=`cs${k[0].toUpperCase()+k.slice(1)}`;const i=Number(inp.dataset[key]);if(k==='text')arr[i].text=inp.value;else arr[i][k]=k==='color'?inp.value:Number(inp.value);syncPreview()}));
    $$('.sf-card-el').forEach((el,i)=>{el.onpointerdown=e=>{const arr=t[side].elements;const idx=i;const startX=e.clientX,startY=e.clientY,ox=Number(arr[idx].x),oy=Number(arr[idx].y);el.setPointerCapture?.(e.pointerId);const move=ev=>{const r=preview.getBoundingClientRect();arr[idx].x=Math.max(0,Math.min(100,ox+(ev.clientX-startX)/r.width*100));arr[idx].y=Math.max(0,Math.min(100,oy+(ev.clientY-startY)/r.height*100));syncPreview();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderElements()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)}});
  };
  typeSel.onchange=redraw;orientationSel.onchange=()=>{autoLayoutCard(t,orientationSel.value);selected=null;syncPreview();renderElements()};$$('[data-cs-side]').forEach(b=>b.onclick=()=>{side=b.dataset.csSide;$$('[data-cs-side]').forEach(x=>x.className=x===b?'primary':'secondary');renderElements();syncPreview()});
  $$('[data-add-el]').forEach(b=>b.onclick=()=>{const kind=b.dataset.addEl;const arr=t[side].elements;arr.push({id:'el_'+Date.now(),kind,text:kind==='text'?'Nội dung mới':'',x:10,y:10,w:35,h:10,color:side==='front'?'#ffffff':'#173e5d',size:kind==='text'?12:10,bold:false,align:'left'});selected=arr.length-1;renderElements();syncPreview()});
  $('#csSave').onclick=async()=>{const b=$('#csSave');b.disabled=true;try{const r=await api(`/api/admin/card-designs/${encodeURIComponent(type.id)}`,{method:'PUT',body:JSON.stringify({accent:t.accent||'#1677d2',subtitle:'',size:t.size,front:t.front,back:t.back,backTitle:t.backTitle})});type.template_json=JSON.stringify(r.template);toast('Đã lưu mẫu thẻ 2 mặt.');$('#csMsg').textContent='Đã lưu mẫu thiết kế.'}catch(e){$('#csMsg').textContent=e.data?.error||e.message}finally{b.disabled=false}};
  redraw();
}
async function renderIssuanceStudio(c){
  c.innerHTML=`<div class="section-title"><div><div class="eyebrow">CẤP PHÁT & NGHIỆP VỤ KHÔNG TÀI KHOẢN</div><h1>Tạo thẻ & cấp phát</h1><p class="muted">Người nhận không cần tài khoản Member, không tạo Member ID và không trở thành thành viên.</p></div></div><section class="card issuance-panel"><div class="issuance-tabs"><button class="primary" data-itab="create">Tạo thẻ một lần</button><button class="secondary" data-itab="list">Đã cấp</button></div><div id="issuanceBody"></div></section>`;
  const body=$('#issuanceBody');let current=[];
  const load=async()=>{const d=await api('/api/admin/one-time-credentials');current=d.items||[];body.innerHTML=`<div class="issuance-summary"><span><b>${current.length}</b> lượt cấp phát</span><span><b>${current.filter(x=>x.status==='active').length}</b> đang hiệu lực</span></div><div class="table-wrap"><table><thead><tr><th>Người nhận</th><th>Sự kiện</th><th>Vai trò</th><th>Hiệu lực</th><th>Trạng thái</th><th></th></tr></thead><tbody>${current.map(x=>`<tr><td><b>${esc(x.full_name)}</b><div class="meta">${esc(x.card_number)}</div></td><td>${esc(x.event_name)}</td><td>${esc(x.role_label||'—')}</td><td>${esc(x.issued_at)} → ${esc(x.expires_at||'Không thời hạn')}</td><td>${esc(x.status)}</td><td><button class="secondary" data-ot-pdf="${esc(x.id)}">Tải PDF hai mặt</button>${x.status==='active'?`<button class="danger" data-ot-revoke="${esc(x.id)}">Thu hồi</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Chưa có nghiệp vụ cấp phát.</td></tr>'}</tbody></table></div>`;$$('[data-ot-pdf]').forEach(b=>b.onclick=async()=>{const x=current.find(v=>v.id===b.dataset.otPdf);if(!x)return;b.disabled=true;try{let type=(currentTypes||[]).find(v=>v.id===x.card_type_id);await downloadCardPdf(x,templateFor(type||{}))}catch(e){toast(e.message||'Không thể tạo PDF.','warn')}finally{b.disabled=false}});$$('[data-ot-revoke]').forEach(b=>b.onclick=async()=>{if(!confirm('Thu hồi thẻ này?'))return;await api(`/api/admin/one-time-credentials/${encodeURIComponent(b.dataset.otRevoke)}/revoke`,{method:'POST',body:'{}'});await load()})};
  let currentTypes=[];try{currentTypes=(await api('/api/admin/card-designs')).items||[]}catch{}
  const create=()=>{body.innerHTML=`<form id="oneTimeForm" class="form-grid two"><label>Họ và tên<input name="full_name" required maxlength="160"></label><label>Tên sự kiện / chương trình<input name="event_name" required maxlength="200"></label><label>Vai trò trên thẻ<input name="role_label" placeholder="Tình nguyện viên"></label><label>Số thẻ / mã cấp phát<input name="card_number" placeholder="Để trống để tự tạo"></label><label>Loại mẫu thẻ<select name="card_type_id">${currentTypes.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label>Ngày cấp<input type="date" name="issued_at" value="${vietnamDateInput()}"></label><label>Ngày hết hiệu lực<input type="date" name="expires_at"></label><label>Ảnh người nhận (URL nếu cần)<input name="photo_url" placeholder="Không bắt buộc"></label><label style="grid-column:1/-1">Ghi chú<textarea name="notes" rows="3"></textarea></label><div class="toolbar" style="grid-column:1/-1"><button class="primary">Tạo thẻ & tải PDF</button><button type="button" class="secondary" id="openDesignFromIssue">Mở trình thiết kế</button></div><div id="oneTimeMsg" class="msg" style="grid-column:1/-1"></div></form>`;$('#oneTimeForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button.primary');b.disabled=true;try{const d=await api('/api/admin/one-time-credentials',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});const x={...Object.fromEntries(new FormData(e.target)),id:d.id,verify_token:d.verify_token,card_number:d.card_number,status:'active'};const type=currentTypes.find(v=>v.id===x.card_type_id)||{};openCardPrint(x,templateFor(type));toast('Đã tạo thẻ. Người nhận không cần tài khoản.')}catch(err){$('#oneTimeMsg').textContent=err.data?.error||err.message}finally{b.disabled=false}};$('#openDesignFromIssue').onclick=()=>{document.querySelector('[data-itab="list"]')?.click();toast('Trình thiết kế nằm ở phần cuối trang.')}};
  $$('[data-itab]').forEach(b=>b.onclick=()=>{if(b.dataset.itab==='create')create();else load()});create();
  await mountCardDesignStudio(c);
}

async function renderPortalStudio(c){
  c.innerHTML='<div class="section-title"><div><div class="eyebrow">SKY FIRST STUDIO</div><h1>Quản trị giao diện & số liệu</h1><p class="muted">Thay đổi và xuất bản nội dung trang đăng nhập mà không cần chỉnh mã nguồn.</p></div></div><div class="card">Đang tải cấu hình...</div>';
  try{
    const [saved,published]=await Promise.all([api('/api/admin/portal-config'),api('/api/public/portal-config')]);
    const fallbacks=[['members','Thành viên đang hoạt động'],['activities','Hoạt động đã tổ chức'],['units','Đơn vị trực thuộc'],['programs','Chương trình và dự án']];
    const byKey=new Map((saved.settings?.stats||[]).map(x=>[x.key,x]));
    c.innerHTML=`<div class="section-title"><div><div class="eyebrow">SKY FIRST STUDIO · SUPER ADMIN</div><h1>Cấu hình giao diện & thống kê</h1><p class="muted">Thống kê tự động dùng dữ liệu D1. Số liệu thủ công phải được kiểm chứng trước khi công bố.</p></div></div>
    <form id="studioForm" class="card studio-form"><h2>Các chỉ số ở trang đăng nhập</h2><p class="muted">Thay đổi trực tiếp trong phần quản trị. Không cần deploy lại website.</p><div class="studio-grid">
    ${fallbacks.map(([key,title])=>{const x=byKey.get(key)||{key,label:title,mode:key==='programs'?'manual':'auto',enabled:key!=='programs',value:null};return `<fieldset class="studio-stat" data-stat-key="${key}"><legend>${esc(title)}</legend><label>Tên hiển thị<input name="label" maxlength="75" value="${esc(x.label||title)}" required></label><label>Nguồn dữ liệu<select name="mode"><option value="auto" ${x.mode==='auto'?'selected':''} ${key==='programs'?'disabled':''}>Tự động từ D1</option><option value="manual" ${x.mode==='manual'?'selected':''}>Số liệu đã kiểm chứng (nhập tay)</option></select></label><label>Giá trị công bố<input name="value" type="number" min="0" max="1000000000" step="1" value="${x.value??''}" placeholder="Nhập số khi dùng thủ công"></label><label class="studio-check"><input type="checkbox" name="enabled" ${x.enabled!==false?'checked':''}> Hiển thị chỉ số</label></fieldset>`}).join('')}</div><label>Thông điệp bên dưới thống kê<textarea name="tagline" maxlength="190" rows="2">${esc(saved.settings?.tagline||published.tagline||'')}</textarea></label><div class="toolbar"><button class="primary" id="studioSave">Lưu và xuất bản</button><a href="/login" target="_blank" rel="noopener" class="secondary" style="padding:10px 16px;border-radius:12px">Xem trang đăng nhập ↗</a></div><div id="studioMsg" role="status" aria-live="polite"></div></form>`;
    $('#studioForm').onsubmit=async e=>{e.preventDefault();const button=$('#studioSave'),msg=$('#studioMsg');button.disabled=true;msg.textContent='Đang lưu và xuất bản…';try{const form=e.target;const stats=[...form.querySelectorAll('[data-stat-key]')].map(el=>({key:el.dataset.statKey,label:el.querySelector('[name="label"]').value,mode:el.querySelector('[name="mode"]').value,value:el.querySelector('[name="value"]').value||null,enabled:el.querySelector('[name="enabled"]').checked}));await api('/api/admin/portal-config',{method:'PUT',body:JSON.stringify({stats,tagline:form.elements.tagline.value})});msg.textContent='Đã xuất bản cấu hình thành công.';toast('Đã cập nhật giao diện công khai.')}catch(err){msg.textContent='Không thể lưu: '+(err.data?.error||err.message)}finally{button.disabled=false}};
    await mountCardDesignStudio(c);
  }catch(err){c.innerHTML='<div class="card">Không thể tải cấu hình: '+esc(err.data?.error||err.message)+'</div>'}
}

async function renderSuperAdmin(c){
  c.innerHTML=`<h1>SUPER_ADMIN Center</h1><div id="superBox" class="card">Đang tải...</div>`;
  try{const d=await api('/api/admin/super/overview');const s=d.stats;c.innerHTML=`<div class="section-title"><h1>SUPER_ADMIN Center</h1></div><div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[['Thành viên',s.people],['Tài khoản',s.accounts],['Đơn vị',s.orgs],['Yêu cầu chờ',s.pending_requests],['Thẻ hiệu lực',s.active_cards],['GCN xác minh',s.verified_certificates]].map(x=>`<div class="card stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}</div><div class="card" style="margin-top:14px"><h2>Kiểm tra quyền tài khoản</h2><select id="inspectAccount"><option value="">Chọn tài khoản</option>${d.accounts.map(a=>`<option value="${a.id}">${esc(a.username)} · ${esc(a.full_name||a.member_code||'')}</option>`).join('')}</select><button id="inspectBtn" class="secondary">Kiểm tra quyền</button><div id="inspectResult" style="margin-top:12px"></div></div><div class="card" style="margin-top:14px"><h2>Tài khoản gần đây</h2><div class="table-wrap"><table><thead><tr><th>Tài khoản</th><th>Thành viên</th><th>Đăng nhập cuối</th><th>Trạng thái</th></tr></thead><tbody>${d.accounts.map(a=>`<tr><td>${esc(a.username)}</td><td>${esc(a.full_name||'—')}</td><td>${esc(a.last_login_at||'—')}</td><td>${a.is_locked?'Đang khóa':'Hoạt động'}</td></tr>`).join('')}</tbody></table></div></div>`;$('#inspectBtn').onclick=async()=>{const id=$('#inspectAccount').value;if(!id)return;const x=await api('/api/admin/super/inspect-account/'+encodeURIComponent(id));$('#inspectResult').innerHTML=`<b>ROLE + SCOPE</b>${x.scopes.map(v=>`<div>${esc(v.role_name)} · ${esc(v.org_name||'Toàn hệ thống')} · ${v.active?'Hiệu lực':'Ngừng'}</div>`).join('')||'<div>Không có scope.</div>'}<br><b>PERMISSION</b>${x.permissions.map(v=>`<div>${esc(v.code)} ← ${esc(v.role_code)}</div>`).join('')||'<div>Không có permission.</div>'}`};}catch(e){$('#superBox')&&($('#superBox').textContent='Không thể tải SUPER_ADMIN Center: '+(e.data?.error||e.message));}
}

async function renderAdminOrg(c){

  c.innerHTML=`
    <div class="section-title">

      <h1>
        Cơ cấu tổ chức
      </h1>

      <button
        id="centerNew" class="secondary">Tạo Trung Tâm Thành Viên Số Sky First</button><button id="orgNew"
        class="primary"
      >
        Thêm bộ phận / đơn vị
      </button>

    </div>


    <div class="notice">

      Cây tổ chức động nhiều cấp:

      Sky First Network
      → BCH / Văn phòng / Ban chức năng
      → đơn vị trực thuộc
      → cơ cấu con.

    </div>


    <div class="toolbar" style="margin-top:14px"><input id="orgSearch" placeholder="Tìm đơn vị, mã hoặc tên ngắn"><select id="orgStatusFilter"><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Không hoạt động</option><option value="archived">Đã lưu trữ</option></select><button id="orgFilterApply" class="secondary">Lọc</button></div>
    <div class="card org-summary" id="orgSummary"></div>
    <div
      id="orgBox"
      class="card"
    >
      Đang tải...
    </div>
  `;


  const load=async()=>{

    try{

      const d=
        await api(
          '/api/admin/org'
        );


      const orgQuery=($('#orgSearch')?.value||'').trim().toLowerCase();
      const orgStatus=$('#orgStatusFilter')?.value||'';
      const visibleItems=d.items.filter(x=>(!orgQuery||[x.name,x.code,x.short_name].some(v=>String(v||'').toLowerCase().includes(orgQuery)))&&(!orgStatus||x.status===orgStatus));
      $('#orgSummary').innerHTML=`<b>${d.items.length}</b> đơn vị · <b>${d.items.filter(x=>x.status==='active').length}</b> đang hoạt động · <b>${d.items.filter(x=>x.status==='inactive').length}</b> tạm ngưng`;
      $('#orgBox').innerHTML=
        visibleItems.map(
          x=>`
            <div class="list-item">

              <div
                class="section-title"
                style="margin:0"
              >

                <div>

                  <b>
                    ${esc(x.short_name||x.code)}
                  </b>

                  <div>
                    ${esc(x.name)}
                  </div>

                  <div class="meta">
                    ${esc(x.node_type)}
                    ·
                    ${statusVi(x.status)}
                  </div>

                </div>


                <div class="actions">

                  <button class="secondary" data-org-edit="${esc(x.id)}">Sửa</button>
                  ${x.id!=='org_sfn'?`<button class="secondary" data-org-toggle="${esc(x.id)}">${x.status==='active'?'Tạm ngưng':'Kích hoạt'}</button>`:''}


                  ${
                    x.id!=='org_sfn'
                      ?`
                        <button
                          class="danger"
                          data-org-delete="${esc(x.id)}"
                        >
                          Xóa
                        </button>
                      `
                      :''
                  }

                </div>

              </div>

            </div>
          `
        ).join('');


      $$('[data-org-toggle]').forEach(b=>b.onclick=async()=>{const x=d.items.find(o=>o.id===b.dataset.orgToggle);if(!x)return;try{await api(`/api/admin/org/${x.id}`,{method:'PATCH',body:JSON.stringify({status:x.status==='active'?'inactive':'active'})});state.adminMeta=null;load()}catch(err){toast(err.data?.error||err.message,'warn')}});
      $$('[data-org-delete]').forEach(
        b=>b.onclick=async()=>{


          if(
            !confirm(
              'Ngưng hoạt động/xóa đơn vị này?'
            )
          ){
            return;
          }


          try{

            await api(
              `/api/admin/org/${b.dataset.orgDelete}`,
              {
                method:'DELETE'
              }
            );


            state.adminMeta=null;

            load();

          }catch(err){

            alert(
              err.data?.error||
              err.message
            );
          }
        }
      );


      $$('[data-org-edit]').forEach(
        b=>b.onclick=()=>{

          const x=
            d.items.find(
              o=>o.id===b.dataset.orgEdit
            );


          if(!x){
            return;
          }


          modal(
            'Sửa đơn vị',
            `
            <form
              id="orgEdit"
              class="form-grid"
            >

              <label>
                Tên

                <input
                  name="name"
                  value="${esc(x.name)}"
                  required
                >
              </label>


              <label>
                Tên ngắn

                <input
                  name="short_name"
                  value="${esc(x.short_name||'')}"
                >
              </label>


              <label>
                Loại

                <select name="node_type">
                <option value="digital_member_center" ${x.node_type==='digital_member_center'?'selected':''}>Trung Tâm Thành Viên Số Sky First</option>

                  ${
                    [
                      'executive_board',
                      'office',
                      'department',
                      'club',
                      'project',
                      'program',
                      'group',
                      'unit'
                    ]
                    .map(
                      t=>`
                        <option
                          value="${t}"
                          ${x.node_type===t?'selected':''}
                        >
                          ${t}
                        </option>
                      `
                    )
                    .join('')
                  }

                </select>
              </label>


              <label>
                Trực thuộc

                <select name="parent_id">

                  <option value="">
                    Không đổi
                  </option>

                  ${
                    d.items
                      .filter(
                        o=>o.id!==x.id
                      )
                      .map(
                        o=>`
                          <option
                            value="${esc(o.id)}"
                            ${x.parent_id===o.id?'selected':''}
                          >
                            ${esc(o.name)}
                          </option>
                        `
                      )
                      .join('')
                  }

                </select>
              </label>


              <label>
                Trạng thái

                <select name="status">

                  <option
                    value="active"
                    ${x.status==='active'?'selected':''}
                  >
                    Đang hoạt động
                  </option>

                  <option
                    value="inactive"
                    ${x.status==='inactive'?'selected':''}
                  >
                    Không hoạt động
                  </option>

                  <option
                    value="archived"
                    ${x.status==='archived'?'selected':''}
                  >
                    Đã lưu trữ
                  </option>

                </select>
              </label>


              <label>
                Ngày thành lập

                <input
                  type="date"
                  name="founded_at"
                  value="${esc(x.founded_at||'')}"
                >
              </label>


              <label>
                Nhiệm kỳ

                <input
                  name="term_label"
                  value="${esc(x.term_label||'')}"
                >
              </label>


              <label class="full">
                Mô tả

                <textarea
                  name="description"
                >${esc(x.description||'')}</textarea>
              </label>


              <button class="primary">
                Lưu
              </button>

            </form>
            `
          );


          $('#orgEdit').onsubmit=
            async e=>{

              e.preventDefault();

              try{

                await api(
                  `/api/admin/org/${x.id}`,
                  {
                    method:'PATCH',
                    body:JSON.stringify(
                      Object.fromEntries(
                        new FormData(e.target)
                      )
                    )
                  }
                );


                state.adminMeta=null;

                $('#modal')?.remove();

                load();

              }catch(err){

                alert(
                  err.data?.error||
                  err.message
                );
              }
            };
        }
      );


    }catch(err){

      $('#orgBox').textContent=
        'Không có quyền hoặc không thể tải.';
    }
  };


  $('#orgFilterApply').onclick=()=>load();
  $('#orgSearch').addEventListener('keydown',e=>{if(e.key==='Enter')load()});
  let creatingCenter=false;
  $('#centerNew').onclick=()=>{ creatingCenter=true; $('#orgNew').click(); };
  $('#orgNew').onclick=
    async()=>{
      const createCenter=creatingCenter;creatingCenter=false;

      try{

        const meta=
          await getMeta();


        modal(
          createCenter?'Tạo Trung Tâm Thành Viên Số Sky First':'Thêm bộ phận / đơn vị',
          `
          <form
            id="orgForm"
            class="form-grid"
          >

            <label>
              Tên

              <input
                name="name"
                required
                maxlength="200"
                value="${createCenter?'Trung Tâm Thành Viên Số Sky First':''}"
                ${createCenter?'readonly':''}
              >
            </label>


            <label>
              Mã duy nhất

              <input
                name="code"
                required
              >
            </label>


            <label>
              Tên ngắn

              <input
                name="short_name"
              >
            </label>


            <label>
              Loại

              <select name="node_type"><option value="digital_member_center" ${createCenter?'selected':''}>Trung Tâm Thành Viên Số Sky First</option>

                <option value="executive_board" ${createCenter?'':'selected'}>
                  BCH
                </option>

                <option value="office">
                  Văn phòng
                </option>

                <option value="department">
                  Ban / Phòng
                </option>

                <option value="club">
                  CLB
                </option>

                <option value="project">
                  Dự án
                </option>

                <option value="program">
                  Chương trình
                </option>

                <option value="group">
                  Tổ / Nhóm
                </option>

                <option value="unit">
                  Đơn vị khác
                </option>

              </select>
            </label>


            <label>
              Trực thuộc

              <select name="parent_id">

                ${
                  meta.orgs.map(
                    o=>`
                      <option value="${esc(o.id)}">
                        ${esc(o.name)}
                      </option>
                    `
                  ).join('')
                }

              </select>
            </label>


            <button class="primary">
              Tạo
            </button>

          </form>
          `
        );


        $('#orgForm').onsubmit=
          async e=>{

            e.preventDefault();
            const submit=e.target.querySelector('button[type="submit"],button.primary');
            if(submit.disabled)return;submit.disabled=true;
            try{

              await api(
                '/api/admin/org',
                {
                  method:'POST',
                  body:JSON.stringify(
                    Object.fromEntries(
                      new FormData(e.target)
                    )
                  )
                }
              );


              state.adminMeta=null;

              $('#modal')?.remove();

              load();

            }catch(err){

              alert(err.data?.error||err.message);
              submit.disabled=false;
            }
          };


      }catch(err){

        alert(
          err.data?.error||
          err.message
        );
      }
    };


  load();
}



/* =========================================================
   ADMIN - WORK CENTER / REPORTS / SYSTEM
   ========================================================= */
async function renderAdminWork(c){
  c.innerHTML=`<div class="section-title"><div><div class="eyebrow">ĐIỀU HÀNH</div><h1>Trung tâm công việc</h1><p class="muted">Một nơi để nhìn thấy việc cần xử lý mà không phải mở từng phân hệ.</p></div><button class="secondary" id="workRefresh">Làm mới</button></div><div id="workBox" class="card">Đang tải...</div>`;
  const load=async()=>{
    const d=await api('/api/admin/work-center');
    const items=d.items||[];
    $('#workBox').outerHTML=`<div id="workBox"><div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:14px">${[['Yêu cầu chờ',d.counts.pending_requests],['Tài khoản cần chú ý',d.counts.account_attention],['Thẻ sắp hết hạn',d.counts.expiring_cards],['Hồ sơ thiếu thông tin',d.counts.incomplete_profiles]].map(x=>`<div class="card stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}</div><div class="card"><div class="section-title"><h2>Danh sách việc cần xử lý</h2></div>${items.length?`<div class="table-wrap"><table><thead><tr><th>Loại việc</th><th>Nội dung</th><th>Đối tượng</th><th>Thời gian</th><th></th></tr></thead><tbody>${items.map(x=>`<tr><td>${esc(x.kind_label)}</td><td><b>${esc(x.title)}</b><div class="meta">${esc(x.detail||'')}</div></td><td>${esc(x.target||'—')}</td><td>${esc(x.created_at||'')}</td><td><button class="secondary" data-work-view="${esc(x.target_view||'admin-members')}">Mở</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Hiện không có việc cần xử lý.</div>'}</div></div>`;
    $$('[data-work-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.workView));
  };
  $('#workRefresh').onclick=load; await load();
}

async function renderAdminReports(c){
  c.innerHTML=`<div class="section-title"><div><div class="eyebrow">DỮ LIỆU VẬN HÀNH</div><h1>Báo cáo & thống kê</h1><p class="muted">Số liệu được tính trực tiếp từ dữ liệu thành viên, tài khoản, đơn vị và thẻ.</p></div><button class="secondary" id="reportRefresh">Làm mới</button></div><div id="reportBox" class="card">Đang tải...</div>`;
  const load=async()=>{const d=await api('/api/admin/reports');$('#reportBox').innerHTML=`<div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:14px">${Object.entries(d.summary||{}).map(([k,v])=>`<div class="card stat"><span>${esc(v.label)}</span><strong>${v.value}</strong></div>`).join('')}</div><div class="section-grid"><div class="card"><h2>Thành viên theo trạng thái</h2><div class="table-wrap"><table><thead><tr><th>Trạng thái</th><th>Số lượng</th></tr></thead><tbody>${(d.member_status||[]).map(x=>`<tr><td>${esc(x.label)}</td><td><b>${x.n}</b></td></tr>`).join('')}</tbody></table></div></div><div class="card"><h2>Thành viên theo đơn vị</h2><div class="table-wrap"><table><thead><tr><th>Đơn vị</th><th>Số lượng</th></tr></thead><tbody>${(d.orgs||[]).map(x=>`<tr><td>${esc(x.name)}</td><td><b>${x.n}</b></td></tr>`).join('')}</tbody></table></div></div></div><div class="card" style="margin-top:14px"><h2>Thẻ thành viên</h2><div class="table-wrap"><table><thead><tr><th>Trạng thái</th><th>Số lượng</th></tr></thead><tbody>${(d.cards||[]).map(x=>`<tr><td>${esc(x.label)}</td><td><b>${x.n}</b></td></tr>`).join('')}</tbody></table></div></div>`};
  $('#reportRefresh').onclick=load; await load();
}

async function renderAdminSystem(c){
  c.innerHTML=`<div class="section-title"><div><div class="eyebrow">SUPER_ADMIN</div><h1>Cấu hình hệ thống</h1><p class="muted">Các thiết lập vận hành, bộ lọc đã lưu và tình trạng dịch vụ.</p></div></div><div class="section-grid"><div class="card"><h2>Bộ lọc đã lưu</h2><p class="muted">Lưu bộ lọc quản trị để không phải chọn lại mỗi lần.</p><form id="savedFilterForm" class="form-grid"><label>Tên bộ lọc<input name="name" required placeholder="Ví dụ: Thành viên chưa có thẻ"></label><label>Phân hệ<select name="view"><option value="admin-members">Thành viên</option><option value="admin-requests">Yêu cầu cấp tài khoản</option><option value="admin-calendar">Lịch Sky First Network</option><option value="admin-audit">Nhật ký hệ thống</option></select></label><label style="grid-column:1/-1">Điều kiện lọc<input name="query" placeholder="Ví dụ: hoạt động, Ban Truyền thông"></label><button class="primary">Lưu bộ lọc</button></form><div id="savedFilters" style="margin-top:14px">Đang tải...</div></div><div class="card"><h2>Tình trạng hệ thống</h2><div id="healthBox">Đang kiểm tra...</div></div></div>`;
  const refresh=async()=>{const [f,h]=await Promise.all([api('/api/admin/saved-filters'),api('/api/admin/system-health')]);$('#savedFilters').innerHTML=(f.items||[]).map(x=>`<div class="list-row"><div><b>${esc(x.name)}</b><div class="meta">${esc(x.view)} · ${esc(x.query||'Không có điều kiện')}</div></div><button class="danger" data-filter-del="${esc(x.id)}">Xóa</button></div>`).join('')||'<div class="empty">Chưa có bộ lọc đã lưu.</div>';$('#healthBox').innerHTML=`<div class="list-row"><span>Cơ sở dữ liệu</span><b>${h.database==='ok'?'Hoạt động':'Có lỗi'}</b></div><div class="list-row"><span>Phiên bản lược đồ</span><b>${esc(h.schema_version||'—')}</b></div><div class="list-row"><span>Kho tệp</span><b>${h.r2_binding?'Đã khai báo':'Chưa kiểm tra kết nối'}</b></div><div class="list-row"><span>Email</span><b>${h.email_binding?'Đã khai báo':'Chưa kiểm tra kết nối'}</b></div><div class="meta" style="margin-top:10px">Không đánh dấu PASS cho dịch vụ chưa thực sự được kiểm chứng.</div>`;$$('[data-filter-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Xóa bộ lọc này?'))return;await api('/api/admin/saved-filters/'+encodeURIComponent(b.dataset.filterDel),{method:'DELETE'});await refresh()})};
  $('#savedFilterForm').onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target));await api('/api/admin/saved-filters',{method:'POST',body:JSON.stringify(x)});e.target.reset();toast('Đã lưu bộ lọc.');await refresh()}; await refresh();
}

/* =========================================================
   ADMIN - AUDIT
   ========================================================= */

async function renderAdminAudit(c){

  c.innerHTML=`
    <h1>
      Nhật ký hệ thống
    </h1>

    <div class="toolbar" style="margin-top:14px"><input id="auditSearch" placeholder="Tìm tài khoản, thao tác, đối tượng"><button id="auditFilter" class="secondary">Lọc</button><button id="auditExport" class="secondary">Xuất nhật ký</button></div>
    <div
      id="auditBox"
      class="card"
    >
      Đang tải...
    </div>
  `;


  try{

    const d=
      await api(
        '/api/admin/audit'
      );


    const renderAudit=(query='')=>{const q=query.toLowerCase();const items=(d.items||[]).filter(x=>!q||[x.username,x.action,x.entity_type,x.entity_id].some(v=>String(v||'').toLowerCase().includes(q)));$('#auditBox').outerHTML=`
      <div id="auditBox" class="table-wrap">

        <table>

          <thead>

            <tr>

              <th>
                Thời gian
              </th>

              <th>
                Tài khoản
              </th>

              <th>
                Thao tác
              </th>

              <th>
                Đối tượng
              </th>

            </tr>

          </thead>


          <tbody>

            ${
              items.map(
                x=>`
                  <tr>

                    <td>
                      ${esc(x.created_at)}
                    </td>

                    <td>
                      ${esc(x.username||'Hệ thống')}
                    </td>

                    <td>
                      ${esc(x.action)}
                    </td>

                    <td>

                      ${esc(x.entity_type)}

                      ·

                      ${esc(x.entity_id||'')}

                    </td>

                  </tr>
                `
              ).join('')
            }

          </tbody>

        </table>

      </div>
    `};
    renderAudit();
    $('#auditFilter').onclick=()=>renderAudit($('#auditSearch').value);
    $('#auditSearch').addEventListener('keydown',e=>{if(e.key==='Enter')renderAudit(e.target.value)});
    $('#auditExport').onclick=()=>{const q=($('#auditSearch').value||'').toLowerCase();const items=(d.items||[]).filter(x=>!q||[x.username,x.action,x.entity_type,x.entity_id].some(v=>String(v||'').toLowerCase().includes(q)));const csv=['Thời gian,Tài khoản,Thao tác,Đối tượng,Mã đối tượng',...items.map(x=>[x.created_at,x.username||'Hệ thống',x.action,x.entity_type,x.entity_id||''].map(v=>`"${String(v).replaceAll('"','""')}"`).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='nhat-ky-he-thong-sky-first.csv';a.click();URL.revokeObjectURL(a.href)};


  }catch(err){

    $('#auditBox').textContent=
      'Không có quyền hoặc không thể tải dữ liệu.';
  }
}


/* =========================================================
   ERROR
   ========================================================= */

function renderError(msg){

  $('#app').innerHTML=`
    <div class="auth-shell">

      <div class="auth-card">

        <b>
          Lỗi hệ thống
        </b>

        <p>
          ${esc(msg)}
        </p>

      </div>

    </div>
  `;
}


/* =========================================================
   START APPLICATION
   ========================================================= */

boot();
