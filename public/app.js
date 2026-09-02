async function renderAccountRequest(){
  let orgs=[];
  try{
    orgs=(await api('/api/public/org-options')).items||[];
  }catch{}

  modal('Yêu cầu cấp tài khoản',`
    <div class="request-note">
      <b>Các thông tin có dấu (*) là bắt buộc.</b>
      Sau khi gửi yêu cầu, Mạng lưới Giáo dục & Phát triển Cộng đồng Sky First (SFN)
      sẽ tiếp nhận, kiểm tra và phê duyệt.
      Thời gian xử lý dự kiến từ <b>60 phút đến 48 giờ</b>,
      có thể thay đổi tùy số lượng yêu cầu và quá trình xác minh.
      Vui lòng thường xuyên kiểm tra email và lưu lại <b>Mã yêu cầu</b>
      để tra cứu trạng thái.
    </div>

    <form id="requestForm" class="request-grid" style="margin-top:14px">

      <label>
        Họ và tên *
        <input name="full_name" required>
      </label>

      <label>
        Tên hiển thị *
        <input name="display_name" required>
      </label>

      <label>
        Ngày sinh *
        <input type="date" name="date_of_birth" required>
      </label>

      <label>
        Giới tính *
        <select name="gender" required>
          <option value="">Chọn</option>
          <option>Nam</option>
          <option>Nữ</option>
          <option>Khác</option>
          <option>Không muốn công khai</option>
        </select>
      </label>

      <label>
        Quốc tịch *
        <input name="nationality" required value="Việt Nam">
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
        <input type="date" name="id_issue_date" required>
      </label>

      <label>
        Nơi cấp *
        <input name="id_issue_place" required>
      </label>

      <label>
        Email *
        <input type="email" name="email" required>
      </label>

      <label>
        Số điện thoại *
        <input name="phone" required>
      </label>

      <label class="full">
        Địa chỉ thường trú *
        <input name="permanent_address" required>
      </label>

      <label class="full">
        Địa chỉ tạm trú / nơi ở hiện tại *
        <input name="temporary_address" required>
      </label>

      <div class="full card">
        <h3>Thông tin học tập / công tác</h3>

        <div class="request-grid">

          <label>
            Bạn hiện là *
            <select name="education_or_work_type" id="educationWorkType" required>
              <option value="">Chọn</option>
              <option value="Học sinh">Học sinh</option>
              <option value="Sinh viên">Sinh viên</option>
              <option value="Đang đi làm">Đang đi làm</option>
              <option value="Khác">Khác</option>
            </select>
          </label>

          <label>
            Tình trạng học tập / công tác *
            <select name="education_status" id="educationStatus" required>
              <option value="">Chọn</option>
              <option value="Đang học">Đang học</option>
              <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
              <option value="Đang công tác">Đang công tác</option>
              <option value="Khác">Khác</option>
            </select>
          </label>

          <label class="full" id="schoolWorkplaceWrap">
            <span id="schoolWorkplaceLabel">Trường / Đơn vị công tác *</span>
            <input
              name="school_or_workplace"
              id="schoolWorkplace"
              required
            >
          </label>

          <label class="full" id="classMajorWrap">
            <span id="classMajorLabel">
              Lớp / Ngành / Chuyên ngành / Vị trí
            </span>
            <input
              name="class_or_major"
              id="classMajor"
            >
          </label>

        </div>
      </div>

      <label class="full">
        Đơn vị đăng ký *
        <select name="target_org_node_id" required>
          <option value="">Chọn đơn vị / bộ phận</option>
          ${orgs.map(o=>`
            <option value="${esc(o.id)}">${esc(o.name)}</option>
          `).join('')}
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

      <div
        id="guardianFields"
        class="full"
        style="display:none"
      >
        <div class="card">
          <h3>Thông tin cha/mẹ/người giám hộ</h3>

          <div class="request-grid">

            <label>
              Họ và tên người giám hộ *
              <input name="guardian_full_name">
            </label>

            <label>
              Mối quan hệ *
              <select name="guardian_relationship">
                <option value="">Chọn</option>
                <option>Cha</option>
                <option>Mẹ</option>
                <option>Người giám hộ hợp pháp</option>
                <option>Khác</option>
              </select>
            </label>

            <label>
              Số điện thoại *
              <input name="guardian_phone">
            </label>

            <label>
              Email người giám hộ *
              <input type="email" name="guardian_email">
            </label>

            <label class="full">
              <input
                type="checkbox"
                name="guardian_lives_together"
                value="1"
              >
              Tôi đang ở cùng cha/mẹ/người giám hộ này
            </label>

            <label
              id="guardianAddressWrap"
              class="full"
            >
              Địa chỉ hiện tại của người giám hộ *
              <input name="guardian_address">
            </label>

          </div>
        </div>
      </div>

      <div class="request-note full">
        <b>🔒 Bảo mật thông tin cá nhân:</b>
        Các thông tin được cung cấp trong biểu mẫu được SFN sử dụng
        phục vụ việc xác minh, xét duyệt, quản lý tài khoản và hồ sơ thành viên.
        Thông tin được giới hạn quyền truy cập cho những cá nhân có thẩm quyền
        theo phạm vi nhiệm vụ. SFN không cung cấp thông tin cá nhân cho bên thứ ba
        ngoài mục đích đã thông báo, trừ trường hợp có sự đồng ý phù hợp
        hoặc theo yêu cầu, quy định của pháp luật.
      </div>

      <label class="full">
        <input
          type="checkbox"
          name="privacy_consent"
          value="1"
          required
        >
        Tôi xác nhận các thông tin đã cung cấp là chính xác và đồng ý để SFN
        xử lý các thông tin này phục vụ việc xét duyệt, quản lý tài khoản
        và hồ sơ thành viên. *
      </label>

      <button class="primary full">
        GỬI YÊU CẦU PHÊ DUYỆT
      </button>

      <div id="requestMsg" class="full"></div>

    </form>
  `);

  const form=$('#requestForm');

  const dob=form.elements.date_of_birth;
  const gbox=$('#guardianFields');
  const same=form.elements.guardian_lives_together;
  const addr=form.elements.guardian_address;

  const educationType=form.elements.education_or_work_type;
  const educationStatus=form.elements.education_status;
  const schoolWorkplace=form.elements.school_or_workplace;
  const classMajor=form.elements.class_or_major;

  const schoolLabel=$('#schoolWorkplaceLabel');
  const classLabel=$('#classMajorLabel');

  const age=()=>{
    if(!dob.value)return null;

    const d=new Date(dob.value+'T00:00:00');
    const n=new Date();

    let a=n.getFullYear()-d.getFullYear();

    if(
      n.getMonth()<d.getMonth() ||
      (
        n.getMonth()===d.getMonth() &&
        n.getDate()<d.getDate()
      )
    )a--;

    return a;
  };

  const syncGuardian=()=>{
    const minor=age()!==null && age()<18;

    gbox.style.display=minor?'block':'none';

    [
      'guardian_full_name',
      'guardian_relationship',
      'guardian_phone',
      'guardian_email'
    ].forEach(n=>{
      form.elements[n].required=minor;
    });

    addr.required=minor&&!same.checked;

    $('#guardianAddressWrap').style.display=
      minor&&!same.checked?'block':'none';
  };

  const syncEducation=()=>{
    const type=educationType.value;

    if(type==='Học sinh'){
      schoolLabel.textContent='Trường đang học *';
      classLabel.textContent='Lớp';
      schoolWorkplace.placeholder='Nhập tên trường đang học';
      classMajor.placeholder='Ví dụ: 10A1';
      educationStatus.value=
        ['Đang học','Đã tốt nghiệp','Khác'].includes(educationStatus.value)
          ? educationStatus.value
          : 'Đang học';
    }

    else if(type==='Sinh viên'){
      schoolLabel.textContent='Trường / Cơ sở giáo dục *';
      classLabel.textContent='Ngành / Chuyên ngành';
      schoolWorkplace.placeholder='Nhập tên trường / cơ sở giáo dục';
      classMajor.placeholder='Nhập ngành hoặc chuyên ngành';
      educationStatus.value=
        ['Đang học','Đã tốt nghiệp','Khác'].includes(educationStatus.value)
          ? educationStatus.value
          : 'Đang học';
    }

    else if(type==='Đang đi làm'){
      schoolLabel.textContent='Đơn vị công tác *';
      classLabel.textContent='Vị trí công tác';
      schoolWorkplace.placeholder='Nhập tên đơn vị công tác';
      classMajor.placeholder='Nhập vị trí công tác';
      educationStatus.value=
        ['Đang công tác','Khác'].includes(educationStatus.value)
          ? educationStatus.value
          : 'Đang công tác';
    }

    else{
      schoolLabel.textContent='Trường / Đơn vị / Cơ sở hiện tại *';
      classLabel.textContent='Lớp / Ngành / Vị trí / Thông tin liên quan';
      schoolWorkplace.placeholder='Nhập thông tin';
      classMajor.placeholder='Nhập thông tin nếu có';
    }
  };

  dob.onchange=syncGuardian;
  same.onchange=syncGuardian;
  educationType.onchange=syncEducation;

  syncGuardian();
  syncEducation();

  form.onsubmit=async e=>{
    e.preventDefault();

    const btn=e.target.querySelector('button.primary');

    btn.disabled=true;
    btn.textContent='ĐANG GỬI...';

    try{
      const fd=new FormData(e.target);

      if(!/^\d{12}$/.test(String(fd.get('id_number')||''))){
        throw new Error('Số CCCD phải gồm đúng 12 chữ số.');
      }

      if(!fd.get('education_or_work_type')){
        throw new Error('Vui lòng chọn thông tin học tập / công tác.');
      }

      if(!String(fd.get('school_or_workplace')||'').trim()){
        throw new Error('Vui lòng nhập trường hoặc đơn vị công tác.');
      }

      const blob=await compressAvatar(fd.get('avatar'));

      const up=await uploadBinary(
        '/api/public/request-avatar',
        blob
      );

      const body=Object.fromEntries(fd);

      delete body.avatar;

      body.avatar_url=up.url;

      body.guardian_lives_together=
        fd.get('guardian_lives_together')?'1':'0';

      body.privacy_consent=
        fd.get('privacy_consent')?'1':'0';

      const d=await api(
        '/api/public/account-request',
        {
          method:'POST',
          body:JSON.stringify(body)
        }
      );

      e.target.innerHTML=`
        <div class="request-note full">
          <b>ĐÃ GỬI YÊU CẦU</b><br>
          Mã yêu cầu:
          <b>${esc(d.request_code)}</b>
          <br><br>
          ${esc(d.message)}
        </div>
      `;
    }

    catch(err){
      btn.disabled=false;
      btn.textContent='GỬI YÊU CẦU PHÊ DUYỆT';

      $('#requestMsg').textContent=
        'Không thể gửi: '+
        (
          err.data?.field
            ? `thiếu ${err.data.field}`
            : (err.data?.error||err.message)
        );
    }
  };
}
