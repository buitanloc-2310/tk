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
  const r=await fetch(url,{
    credentials:'same-origin',
    ...opt,
    headers:{
      ...(opt.body?{'content-type':'application/json'}:{}),
      ...(opt.headers||{})
    }
  });

  const d=await r.json().catch(()=>({}));

  if(!r.ok){
    throw Object.assign(
      new Error(d.error||'REQUEST_FAILED'),
      {
        status:r.status,
        data:d
      }
    );
  }

  return d;
};

const logo='/sfn-logo.png?v=final-20260901';

const PORTALS=[
  ['Website chính thức','https://www.skyfirst.io.vn'],
  ['Cổng Thông tin','https://ctt.skyfirst.io.vn'],
  ['Cổng Tình nguyện viên','https://tnv.skyfirst.io.vn'],
  ['Cổng Học liệu & Học thuật','https://academic.skyfirst.io.vn']
];

const state={
  me:null,
  dashboard:null,
  view:'home',
  adminMember:null,
  adminMeta:null
};

const initials=n=>(
  String(n||'SFN')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(x=>x[0])
    .join('')
    .toUpperCase()
  ||'SFN'
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
  try{
    state.me=await api('/api/me');
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

function renderLogin(){

  $('#app').innerHTML=`
    <div class="auth-shell">
      <section class="auth-card">

        <div class="auth-brand-row">
          <img
            class="auth-logo"
            src="${logo}"
            alt="SFN"
          >

          <div>
            <div class="brand">
              CỔNG THÀNH VIÊN SKY FIRST NETWORK
            </div>

            <div class="subtitle">
              CỔNG THÀNH VIÊN
            </div>
          </div>
        </div>

        <p class="muted">
          Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First (SFN)
        </p>

        <form
          id="loginForm"
          class="form-grid"
        >
          <label>
            Tên đăng nhập / Email
            <input
              name="login"
              required
              autocomplete="username"
            >
          </label>

          <label>
            Mật khẩu
            <input
              name="password"
              type="password"
              required
              autocomplete="current-password"
            >
          </label>

          <button class="primary">
            ĐĂNG NHẬP
          </button>
        </form>

        <p
          id="msg"
          class="msg"
        ></p>

        <div class="help">
          <b>
            Quên mật khẩu hoặc không thể đăng nhập?
          </b>
          <br>
          Vui lòng liên hệ
          <b>Đơn vị chủ quản</b>
          để được xác minh và cấp lại thông tin đăng nhập.
        </div>

        <div class="auth-links">

          <button
            type="button"
            id="requestAccount"
            class="secondary"
          >
            YÊU CẦU CẤP TÀI KHOẢN
          </button>

          <button
            type="button"
            id="checkRequest"
            class="ghost"
          >
            TRA CỨU YÊU CẦU
          </button>

          <a href="/support.html">
            Trung tâm hỗ trợ
          </a>

          <a href="/contact.html">
            Thông tin liên hệ
          </a>

        </div>

        <div class="portal-block">
          <b>Các cổng của SFN</b>

          <div class="portal-links">
            ${portals()}
          </div>
        </div>

        <div class="legal">
          <a href="/terms.html">
            Điều khoản sử dụng
          </a>

          ·

          <a href="/privacy.html">
            Chính sách bảo mật
          </a>

          <br>

          © 2026 Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First (SFN)
        </div>

      </section>
    </div>
  `;

  $('#loginForm').onsubmit=async e=>{

    e.preventDefault();

    const msg=$('#msg');

    const b=Object.fromEntries(
      new FormData(e.target)
    );

    msg.textContent=
      'Đang kiểm tra tài khoản...';

    try{

      const result=await api(
        '/api/auth/login',
        {
          method:'POST',
          body:JSON.stringify(b)
        }
      );

      console.log(
        'LOGIN_OK',
        result
      );

      msg.textContent=
        'Đăng nhập thành công...';

      await boot();

    }catch(err){

      console.error(
        'LOGIN_FAILED',
        err
      );

      const code=
        err?.data?.error||
        err?.error||
        err?.message||
        'UNKNOWN_ERROR';

      const detail=
        err?.data?.detail||
        err?.detail||
        '';

      if(code==='INVALID_LOGIN'){

        msg.textContent=
          'Tên đăng nhập hoặc mật khẩu không đúng.';

      }

      else if(code==='ACCOUNT_LOCKED'){

        msg.textContent=
          'Tài khoản đang bị khóa.';

      }

      else if(code==='ACCOUNT_SUSPENDED'){

        msg.textContent=
          'Tài khoản đang bị tạm ngưng.';

      }

      else if(code==='LOGIN_SYSTEM_ERROR'){

        msg.textContent=
          'LỖI HỆ THỐNG ĐĂNG NHẬP: '+
          (detail||'Không xác định');

      }

      else{

        msg.textContent=
          'LỖI ĐĂNG NHẬP: '+
          code+
          (detail?' — '+detail:'');

      }
    }
  };

  $('#requestAccount').onclick=
    renderAccountRequest;

  $('#checkRequest').onclick=()=>{

    modal(
      'Tra cứu yêu cầu cấp tài khoản',
      `
      <form
        id="statusForm"
        class="form-grid"
      >

        <label>
          Mã yêu cầu
          <input
            name="code"
            required
          >
        </label>

        <label>
          Email đã đăng ký
          <input
            type="email"
            name="email"
            required
          >
        </label>

        <button class="primary">
          Tra cứu
        </button>

        <div id="statusResult"></div>

      </form>
      `
    );

    $('#statusForm').onsubmit=async e=>{

      e.preventDefault();

      const f=new FormData(e.target);

      try{

        const d=await api(
          `/api/public/account-request/status?code=${
            encodeURIComponent(f.get('code'))
          }&email=${
            encodeURIComponent(f.get('email'))
          }`
        );

        $('#statusResult').innerHTML=`
          <div class="request-note">

            <b>
              ${esc(d.request.full_name)}
            </b>

            <br>

            Trạng thái:
            <b>
              ${statusVi(d.request.status)}
            </b>

            ${
              d.request.admin_note
                ?`<br>Phản hồi: ${
                    esc(d.request.admin_note)
                  }`
                :''
            }

          </div>
        `;

      }catch{

        $('#statusResult').textContent=
          'Không tìm thấy yêu cầu phù hợp.';

      }
    };
  };
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


  modal(
    'Yêu cầu cấp tài khoản',
    `
    <div class="request-note">

      <b>
        Các thông tin có dấu (*) là bắt buộc.
      </b>

      Sau khi gửi yêu cầu,
      Mạng lưới Giáo dục & Phát triển Cộng đồng
      Sky First (SFN) sẽ tiếp nhận,
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


      <!-- HỌC TẬP / CÔNG TÁC -->

      <div
        class="full"
        style="margin-top:8px"
      >
        <h3>
          THÔNG TIN HỌC TẬP / CÔNG TÁC
        </h3>
      </div>


      <label>
        Bạn hiện là *

        <select
          name="education_or_work_type"
          id="educationWorkType"
          required
        >

          <option value="">
            Chọn
          </option>

          <option value="Học sinh">
            Học sinh
          </option>

          <option value="Sinh viên">
            Sinh viên
          </option>

          <option value="Đang đi làm">
            Đang đi làm
          </option>

          <option value="Khác">
            Khác
          </option>

        </select>
      </label>


      <label>
        Tình trạng học tập / công tác *

        <select
          name="education_status"
          id="educationStatus"
          required
        >

          <option value="">
            Chọn
          </option>

          <option value="Đang học">
            Đang học
          </option>

          <option value="Đã tốt nghiệp">
            Đã tốt nghiệp
          </option>

          <option value="Đang công tác">
            Đang công tác
          </option>

          <option value="Khác">
            Khác
          </option>

        </select>
      </label>


      <label>
        <span id="schoolWorkLabel">
          Trường / Đơn vị công tác *
        </span>

        <input
          name="school_or_workplace"
          id="schoolWorkInput"
          required
        >
      </label>


      <label>
        <span id="classMajorLabel">
          Lớp / Ngành / Chuyên ngành / Vị trí
        </span>

        <input
          name="class_or_major"
          id="classMajorInput"
        >
      </label>


      <!-- ĐƠN VỊ ĐĂNG KÝ -->

      <div
        class="full"
        style="margin-top:8px"
      >
        <h3>
          THÔNG TIN ĐĂNG KÝ SFN
        </h3>
      </div>


      <label class="full">
        Đơn vị đăng ký *

        <select
          name="target_org_node_id"
          required
        >

          <option value="">
            Chọn đơn vị / bộ phận
          </option>

          ${
            orgs
              .map(
                o=>
                  `<option value="${esc(o.id)}">
                    ${esc(o.name)}
                  </option>`
              )
              .join('')
          }

        </select>
      </label>


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
        được SFN sử dụng phục vụ việc xác minh,
        xét duyệt, quản lý tài khoản và hồ sơ thành viên.

        Thông tin được giới hạn quyền truy cập
        cho những cá nhân có thẩm quyền
        theo phạm vi nhiệm vụ.

        SFN không cung cấp thông tin cá nhân
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
        là chính xác và đồng ý để SFN xử lý
        các thông tin này phục vụ việc xét duyệt,
        quản lý tài khoản và hồ sơ thành viên. *

      </label>


      <button class="primary full">
        GỬI YÊU CẦU PHÊ DUYỆT
      </button>


      <div
        id="requestMsg"
        class="full"
      ></div>

    </form>
    `
  );


  const form=$('#requestForm');

  const dob=
    form.elements.date_of_birth;

  const gbox=
    $('#guardianFields');

  const same=
    form.elements.guardian_lives_together;

  const addr=
    form.elements.guardian_address;

  const educationType=
    form.elements.education_or_work_type;

  const educationStatus=
    form.elements.education_status;

  const schoolWorkInput=
    form.elements.school_or_workplace;

  const classMajorInput=
    form.elements.class_or_major;


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
      'guardian_email'
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


  const syncEducationFields=()=>{

    const type=
      educationType.value;


    if(type==='Học sinh'){

      $('#schoolWorkLabel').textContent=
        'Trường đang học *';

      schoolWorkInput.placeholder=
        'Nhập tên trường đang học';

      $('#classMajorLabel').textContent=
        'Lớp';

      classMajorInput.placeholder=
        'Ví dụ: 10A1';

      if(
        !educationStatus.value||
        educationStatus.value==='Đang công tác'
      ){
        educationStatus.value='Đang học';
      }

    }


    else if(type==='Sinh viên'){

      $('#schoolWorkLabel').textContent=
        'Trường / Cơ sở giáo dục *';

      schoolWorkInput.placeholder=
        'Nhập tên trường / cơ sở giáo dục';

      $('#classMajorLabel').textContent=
        'Ngành / Chuyên ngành';

      classMajorInput.placeholder=
        'Nhập ngành hoặc chuyên ngành';

      if(
        !educationStatus.value||
        educationStatus.value==='Đang công tác'
      ){
        educationStatus.value='Đang học';
      }

    }


    else if(type==='Đang đi làm'){

      $('#schoolWorkLabel').textContent=
        'Đơn vị công tác *';

      schoolWorkInput.placeholder=
        'Nhập tên cơ quan / tổ chức / doanh nghiệp';

      $('#classMajorLabel').textContent=
        'Vị trí';

      classMajorInput.placeholder=
        'Nhập vị trí công tác';

      if(
        !educationStatus.value||
        educationStatus.value==='Đang học'
      ){
        educationStatus.value='Đang công tác';
      }

    }


    else if(type==='Khác'){

      $('#schoolWorkLabel').textContent=
        'Trường / Đơn vị / Thông tin liên quan *';

      schoolWorkInput.placeholder=
        'Nhập thông tin phù hợp';

      $('#classMajorLabel').textContent=
        'Thông tin bổ sung';

      classMajorInput.placeholder=
        'Có thể để trống nếu không áp dụng';

    }


    else{

      $('#schoolWorkLabel').textContent=
        'Trường / Đơn vị công tác *';

      schoolWorkInput.placeholder='';

      $('#classMajorLabel').textContent=
        'Lớp / Ngành / Chuyên ngành / Vị trí';

      classMajorInput.placeholder='';

    }
  };


  dob.onchange=
    syncGuardian;

  same.onchange=
    syncGuardian;

  educationType.onchange=
    syncEducationFields;


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
          'guardian_email'
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


      if(
        !String(
          fd.get(
            'school_or_workplace'
          )||''
        ).trim()
      ){

        throw new Error(
          'Vui lòng nhập trường hoặc đơn vị công tác.'
        );

      }


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


      const body=
        Object.fromEntries(fd);


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
            ĐÃ GỬI YÊU CẦU
          </b>

          <br>

          Mã yêu cầu:

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
        'GỬI YÊU CẦU PHÊ DUYỆT';


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

function navButton(id,label){

  return `
    <button
      data-view="${id}"
      class="${state.view===id?'active':''}"
    >
      ${label}
    </button>
  `;
}


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
        'request.manage'
      ].includes(x)
    )
  );
}


function renderApp(){

  const p=
    state.me.person;


  $('#app').innerHTML=`
    <div class="app-shell">

      <aside class="sidebar">

        <div class="side-brand">

          <img
            class="side-logo"
            src="${logo}"
            alt="SFN"
          >

          <div>

            <div class="side-brand-title">
              CỔNG THÀNH VIÊN SKY FIRST NETWORK
            </div>

            <div class="side-brand-sub">
              Cổng Thành viên
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
                          'Lịch SFN'
                        )
                      :''
                  }

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

                  ${state.me?.is_super?navButton('admin-super','SUPER_ADMIN Center'):''}

                </nav>
              `
              :''
          }

        </div>


        <div class="sidebar-links">

          ${portals()}

          <a href="mailto:hotro.sfn@gmail.com">
            Hỗ trợ: hotro.sfn@gmail.com
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


      <main class="main">

        <div class="topbar">

          <div>

            <b>
              ${esc(p.full_name)}
            </b>

            <div class="muted">

              ${
                state.me.is_member
                  ?esc(p.member_code)
                  :'TÀI KHOẢN QUẢN TRỊ HỆ THỐNG'
              }

            </div>

          </div>


          <div class="identity">

            ${avatar(p)}

            <span
              class="badge ${
                p.status==='active'
                  ?'ok'
                  :'off'
              }"
            >

              ${
                state.me.is_super&&
                !state.me.is_member
                  ?'SUPER ADMIN'
                  :esc(p.status)
              }

            </span>

          </div>

        </div>


        <div id="content"></div>

      </main>

    </div>
  `;


  $$('[data-view]').forEach(
    b=>b.onclick=()=>{

      state.view=
        b.dataset.view;

      renderApp();

    }
  );


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

      <div class="modal">

        <div class="modal-head">

          <h2>
            ${title}
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

      const d=
        state.dashboard||
        await api('/api/dashboard');

      const p=
        state.me.person;

      c.innerHTML=`
        <div class="section-title">
          <div>
            <h1>
              Xin chào, ${esc(p.display_name||p.full_name)}
            </h1>

            <p class="muted">
              Cổng Thành viên Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First (SFN)
            </p>
          </div>
        </div>

        <div class="grid">

          <div class="card">
            <div class="eyebrow">
              THÀNH VIÊN
            </div>

            <h2>
              ${esc(p.member_code||'—')}
            </h2>

            <div class="muted">
              ${statusVi(p.status)}
            </div>
          </div>

          <div class="card">
            <div class="eyebrow">
              MỤC TIÊU
            </div>

            <h2>
              ${Number(d.goals_count||0)}
            </h2>

            <div class="muted">
              Mục tiêu đang theo dõi
            </div>
          </div>

          <div class="card">
            <div class="eyebrow">
              CÔNG VIỆC
            </div>

            <h2>
              ${Number(d.tasks_count||0)}
            </h2>

            <div class="muted">
              Công việc liên quan
            </div>
          </div>

          <div class="card">
            <div class="eyebrow">
              CHỨNG NHẬN
            </div>

            <h2>
              ${Number(d.certificates_count||0)}
            </h2>

            <div class="muted">
              Chứng nhận trong hồ sơ
            </div>
          </div>

        </div>
      `;

      return;
    }


    if(state.view==='profile'){
      return renderProfile(c);
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
            ${esc(x.org_name||'SFN')}
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
            ${esc(x.issuer||'SFN')}
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
            ${esc(x.org_name||'SFN')}
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

    if(state.view==='evaluations'){ return renderList(c,'Đánh giá của tôi','/api/me/evaluations',x=>`<b>${esc(x.period_label||x.period_type)}</b><div class="meta">${esc(x.org_name||'SFN')} · ${esc(x.evaluator_username||'Quản trị')} · ${x.total_score??'—'} điểm · ${esc(x.rating||'Chưa xếp loại')}</div>${x.comments?`<div>${esc(x.comments)}</div>`:''}`); }

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

    if(state.view==='support'){
      return renderSupport(c);
    }

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
          ${esc(e.data?.error||e.message)}
        </p>

      </div>
    `;
  }
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

        renderApp();

      }catch(err){
        alert(err.data?.message||({
          PERSONAL_FIELD_REQUIRED:'Vui lòng kiểm tra các trường bắt buộc.',
          EMAIL_INVALID:'Email không hợp lệ.',
          ID_NUMBER_MUST_BE_12_DIGITS:'CCCD phải gồm đúng 12 chữ số.',
          EMAIL_ALREADY_USED:'Email này đã được sử dụng.'
        })[err.data?.error]||err.data?.error||err.message);
      }
    };
  };
}


function cardClass(x){

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
  return location.origin+'/verify?code='+encodeURIComponent(x.verify_token||x.card_number||'');
}

function cardQrSrc(x,size=180){
  return 'https://api.qrserver.com/v1/create-qr-code/?format=svg&margin=1&size='+size+'x'+size+'&data='+encodeURIComponent(cardVerifyUrl(x));
}

function printCardWindow(x,p){
  const w=window.open('','_blank','width=900,height=700');
  if(!w)return alert('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép pop-up rồi thử lại.');
  const verifyUrl=cardVerifyUrl(x),qr=cardQrSrc(x,220);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(x.card_number||'SFN Card')}</title><style>
  *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:18mm;background:#fff;color:#fff}.sheet{width:86mm;height:54mm;border-radius:5mm;padding:5mm;background:linear-gradient(135deg,#10243f,#2864dc);position:relative;overflow:hidden}.brand{font-size:7.5pt;letter-spacing:1.1px}.type{font-size:14pt;font-weight:800;margin:3mm 0 2mm}.body{display:grid;grid-template-columns:20mm 1fr 20mm;gap:3mm;align-items:start}.photo{width:20mm;height:25mm;object-fit:cover;border-radius:2.5mm;border:1px solid rgba(255,255,255,.65);background:#fff}.name{font-weight:800;font-size:11pt}.meta{font-size:7.7pt;line-height:1.45}.qr{width:20mm;height:20mm;background:#fff;padding:1mm;border-radius:1.5mm}.status{position:absolute;left:5mm;bottom:4mm;font-size:8pt;font-weight:800}.verify{position:absolute;right:5mm;bottom:3.5mm;font-size:5.8pt;max-width:42mm;text-align:right;word-break:break-all;opacity:.9}@page{size:86mm 54mm;margin:0}@media print{body{padding:0}.sheet{border-radius:0}}
  </style></head><body><div class="sheet"><div class="brand">CỔNG THÀNH VIÊN SKY FIRST NETWORK</div><div class="type">${esc(x.card_type_name||'THẺ THÀNH VIÊN')}</div><div class="body"><img class="photo" src="${esc(p.avatar_url||'/sfn-logo.png')}" alt="Ảnh thành viên"><div><div class="name">${esc(p.full_name||'')}</div><div class="meta">${esc(p.member_code||'')}<br>${esc(x.card_number||'')}<br>${esc(x.org_name||'SFN')}<br>${esc(x.title_on_card||'')}<br>${esc(x.issued_at||'—')} → ${esc(x.expires_at||'Không thời hạn')}</div></div><img class="qr" src="${esc(qr)}" alt="QR xác minh"></div><div class="status">${esc(statusVi(x.status))}</div><div class="verify">${esc(verifyUrl)}</div></div><script>addEventListener('load',()=>setTimeout(()=>print(),500));<\/script></body></html>`);
  w.document.close();
}

function renderCards(c){
  c.innerHTML=`<div class="section-title"><h1>Thẻ của tôi</h1></div><div class="notice">Ảnh trên thẻ, bản in/PDF và trang xác minh lấy từ ảnh hồ sơ thành viên hiện tại. QR của mỗi thẻ dẫn tới đúng bản ghi xác minh công khai.</div><div id="cardsBox" class="card">Đang tải...</div>`;
  api('/api/me/cards').then(d=>{
    const p=state.me.person;
    $('#cardsBox').outerHTML=`<div id="cardsBox" class="card-wallet">${d.items?.length?d.items.map(x=>`
      <div class="member-card ${cardClass(x)}" style="position:relative;min-height:294px;padding-right:126px">
        <img class="member-card-logo" src="${logo}" alt="SFN">
        <div class="eyebrow">CỔNG THÀNH VIÊN SKY FIRST NETWORK</div>
        <h3>${esc(x.card_type_name||'THẺ THÀNH VIÊN')}</h3>
        <img src="${esc(p.avatar_url||'/sfn-logo.png')}" alt="Ảnh ${esc(p.full_name)}" style="width:82px;height:104px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.55);margin:7px 0">
        <div style="font-size:18px;font-weight:850">${esc(p.full_name)}</div>
        <div class="small">${esc(p.member_code||'')}</div>
        <div class="small">${esc(x.card_number||'')} · ${esc(x.org_name||'SFN')}</div>
        ${x.title_on_card?`<div class="small">${esc(x.title_on_card)}</div>`:''}
        <div class="small">Hiệu lực: ${esc(x.issued_at||'—')} → ${esc(x.expires_at||'Không thời hạn')}</div>
        <img src="${esc(cardQrSrc(x,170))}" alt="QR xác minh" style="position:absolute;right:22px;top:88px;width:92px;height:92px;background:#fff;padding:4px;border-radius:8px">
        <div class="card-status">${statusVi(x.status)}</div>
        <div class="toolbar" style="margin-top:10px"><button data-card-verify="${esc(x.verify_token||x.card_number)}">Xác minh</button><button data-card-print="${esc(x.id)}">In / Xuất PDF</button></div>
      </div>`).join(''):'<div class="empty">Chưa có thẻ điện tử.</div>'}</div>`;
    $$('[data-card-verify]').forEach(b=>b.onclick=()=>window.open('/verify?code='+encodeURIComponent(b.dataset.cardVerify),'_blank'));
    $$('[data-card-print]').forEach(b=>b.onclick=()=>{const x=d.items.find(v=>v.id===b.dataset.cardPrint);if(x)printCardWindow(x,p)});
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
                      ${esc(x.issuer||'SFN')}
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
        Quá trình tham gia SFN
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
                    ${esc(x.org_name||'SFN')}
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
                    ${esc(x.issuer||'SFN')}
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
                    ${esc(x.issuer||'SFN')}
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


  $('#printCV').onclick=()=>{

    window.print();

  };
  }catch(err){
    console.error('CV_LOAD_ERROR',err);
    c.innerHTML=`<h1>CV / Hồ sơ năng lực</h1><div class="card"><b>Không thể tải CV.</b><p class="muted">${esc(err.data?.error||err.message)}</p><button class="secondary" onclick="location.reload()">Tải lại</button></div>`;
  }
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
          Liên hệ SFN
        </h2>

        <p>
          <b>Email hỗ trợ:</b>
          <a href="mailto:hotro.sfn@gmail.com">
            hotro.sfn@gmail.com
          </a>
        </p>

        <p>
          <b>Email liên hệ:</b>
          <a href="mailto:skyfirst.ec@gmail.com">
            skyfirst.ec@gmail.com
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
        ${admin?'Lịch SFN':'Lịch của tôi'}
      </h1>

      ${
        admin
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
                          'Toàn SFN / cá nhân'
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
                Toàn SFN
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


    if(!$('#reqApprove')){
      return;
    }


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

        try{

          const z=
            await api(
              `/api/admin/account-requests/${r.id}/approve`,
              {
                method:'POST',
                body:JSON.stringify({
                  admin_note:note
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


      $('#membersBox').outerHTML=`
        <div id="membersBox">

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


          <div
            class="toolbar"
            style="margin-top:12px"
          >

            <span>
              ${d.total} thành viên
            </span>


            <button
              id="bulkExport"
              class="secondary"
            >
              Xuất danh sách đã chọn
            </button>


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


      $('#bulkExport').onclick=()=>{

        const ids=
          $$('[data-member-check]:checked')
            .map(
              x=>x.dataset.memberCheck
            );


        if(!ids.length){

          alert(
            'Chưa chọn thành viên.'
          );

          return;
        }


        const rows=
          d.items
            .filter(
              x=>ids.includes(x.id)
            )
            .map(
              x=>[
                x.member_code,
                x.full_name,
                x.email||'',
                x.phone||'',
                x.org_name||'',
                x.org_title||'',
                statusVi(x.status)
              ]
            );


        const csv=[
          [
            'Mã',
            'Họ tên',
            'Email',
            'SĐT',
            'Đơn vị',
            'Chức vụ',
            'Trạng thái'
          ],
          ...rows
        ]
        .map(
          r=>r.map(
            v=>
              '"'+
              String(v)
                .replaceAll(
                  '"',
                  '""'
                )+
              '"'
          ).join(',')
        )
        .join('\n');


        const a=
          document.createElement(
            'a'
          );


        a.href=
          URL.createObjectURL(
            new Blob(
              [
                '\ufeff'+csv
              ],
              {
                type:'text/csv'
              }
            )
          );


        a.download=
          'SFN-thanh-vien.csv';


        a.click();
      };


    }catch(err){

      $('#membersBox').textContent=
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
                    sfn:'Thông tin SFN',
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
          Cập nhật thông tin SFN
        </button>

      </div>
    `;


    $('#editSfn').onclick=()=>{

      modal(
        'Cập nhật thông tin SFN',
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


            location.reload();

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

            location.reload();

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

            location.reload();

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

                      ${esc(x.org_name||'SFN')}

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
                SFN
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

            location.reload();

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
    box.innerHTML=`<div class="toolbar"><button id="newEvaluation" class="primary">Thêm đánh giá</button></div><div class="list">${rows.length?rows.map(x=>`<div class="list-item"><b>${esc(x.period_label||x.period_type)} · ${esc(x.rating||'Chưa xếp loại')}</b><div class="meta">${esc(x.org_name||'SFN')} · Người đánh giá: ${esc(x.evaluator_username||'—')} · ${x.total_score??'—'} điểm · ${esc(x.status)}</div>${x.comments?`<div>${esc(x.comments)}</div>`:''}<div class="toolbar" style="margin-top:8px">${x.status!=='final'?`<button data-eval-edit="${x.id}">Chỉnh sửa</button><button data-eval-final="${x.id}" class="primary">Chốt đánh giá</button>`:''}${x.status==='hidden'?`<button data-eval-show="${x.id}">Khôi phục</button>`:`<button data-eval-hide="${x.id}" class="danger">Ẩn</button>`}</div></div>`).join(''):'<div class="empty">Chưa có đánh giá.</div>'}</div>`;
    const form=(x={})=>modal(x.id?'Chỉnh sửa đánh giá':'Thêm đánh giá',`<form id="evaluationForm" class="form-grid"><label>Kỳ<select name="period_type"><option value="month">Tháng</option><option value="quarter">Quý</option><option value="half_year">6 tháng</option><option value="year">Năm</option><option value="program">Chương trình</option></select></label><label>Tên kỳ<input name="period_label" required value="${esc(x.period_label||'')}"></label><label>Đơn vị<select name="org_node_id"><option value="">SFN</option>${meta.orgs.map(o=>`<option value="${o.id}" ${o.id===x.org_node_id?'selected':''}>${esc(o.name)}</option>`).join('')}</select></label><label>Điểm tổng<input type="number" min="0" max="100" step="0.1" name="total_score" value="${x.total_score??''}"></label><label>Xếp loại<input name="rating" value="${esc(x.rating||'')}"></label><label>Hiển thị<select name="visibility"><option value="member">Thành viên được xem</option><option value="admin">Chỉ quản trị</option></select></label><label style="grid-column:1/-1">Nhận xét<textarea name="comments" rows="5">${esc(x.comments||'')}</textarea></label><button class="primary">Lưu đánh giá</button></form>`);
    $('#newEvaluation').onclick=()=>{form();setTimeout(()=>{$('#evaluationForm').onsubmit=saveEval},0)};
    const saveEval=async e=>{e.preventDefault();const id=e.target.dataset.id;await api(`/api/admin/members/${p.id}/evaluation${id?'/'+id:''}`,{method:id?'PATCH':'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});location.reload()};
    $$('[data-eval-edit]').forEach(b=>b.onclick=()=>{const x=rows.find(r=>r.id===b.dataset.evalEdit);form(x);setTimeout(()=>{const f=$('#evaluationForm');f.dataset.id=x.id;f.onsubmit=saveEval},0)});
    for(const [sel,act] of [['[data-eval-final]','finalize'],['[data-eval-hide]','hide'],['[data-eval-show]','show']]) $$(sel).forEach(b=>b.onclick=async()=>{const id=b.dataset.evalFinal||b.dataset.evalHide||b.dataset.evalShow;await api(`/api/admin/members/${p.id}/evaluation/${id}/${act}`,{method:'POST'});location.reload()});
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

          location.reload();

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

          location.reload();

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
              value="Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First (SFN)"
              required
            >
          </label>


          <label>
            Ngày cấp

            <input
              type="date"
              name="issued_at"
              value="${new Date().toISOString().slice(0,10)}"
            >
          </label>


          <label>
            Đơn vị liên quan

            <select name="org_node_id">

              <option value="">
                SFN
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


            location.reload();

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

                      ${esc(x.issuer||'SFN')}

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
        ()=>location.reload()
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
                      alt="SFN"
                    >

                    <div class="eyebrow">
                      CỔNG THÀNH VIÊN SKY FIRST NETWORK
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

                      ${esc(x.org_name||'SFN')}

                    </div>

                    <div class="card-status">${esc(x.status)}</div>
                    <div class="toolbar" style="margin-top:8px"><button onclick="window.open('/verify?code=${encodeURIComponent(x.verify_token)}','_blank')">Xác minh</button><button data-print-card="${esc(x.id)}">In / Xuất PDF</button></div>

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
              value="${new Date().toISOString().slice(0,10)}"
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


            location.reload();

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
        ()=>location.reload()
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


          location.reload();

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


            location.reload();

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
    <label>Đơn vị cấp<input name="issuer" required value="${esc(x.issuer||'SFN')}"></label>
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
        id="orgNew"
        class="primary"
      >
        Thêm bộ phận / đơn vị
      </button>

    </div>


    <div class="notice">

      Cây tổ chức động nhiều cấp:

      SFN
      → BCH / Văn phòng / Ban chức năng
      → đơn vị trực thuộc
      → cơ cấu con.

    </div>


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


      $('#orgBox').innerHTML=
        d.items.map(
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

                  <button
                    class="secondary"
                    data-org-edit="${esc(x.id)}"
                  >
                    Sửa
                  </button>


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


  $('#orgNew').onclick=
    async()=>{

      try{

        const meta=
          await getMeta();


        modal(
          'Thêm bộ phận / đơn vị',
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

              <select name="node_type">

                <option value="executive_board">
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

              alert(
                err.data?.error||
                err.message
              );
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
   ADMIN - AUDIT
   ========================================================= */

async function renderAdminAudit(c){

  c.innerHTML=`
    <h1>
      Nhật ký hệ thống
    </h1>

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


    $('#auditBox').outerHTML=`
      <div class="table-wrap">

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
              d.items.map(
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
    `;


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
