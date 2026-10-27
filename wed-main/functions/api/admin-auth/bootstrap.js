import { json, ensureAdminSchema, ROOT_OWNER_EMAIL } from '../../_auth.js';
import { firebaseCreateUser, firebaseDeleteUid, firebaseGetUserByEmail } from '../../_firebaseAdmin.js';

async function state(context){
  await ensureAdminSchema(context);
  const d1=await context.env.DB.prepare('SELECT uid,email FROM website_admin_users WHERE lower(email)=? OR is_root_owner=1 LIMIT 1').bind(ROOT_OWNER_EMAIL).first();
  const fb=await firebaseGetUserByEmail(context.env,ROOT_OWNER_EMAIL);
  // Firebase is the identity authority. If Auth no longer has the Root account,
  // a stale D1 profile must not permanently lock the installation.
  return {d1,fb,needsSetup:!fb};
}
export async function onRequestGet(context){
  try{const s=await state(context);return json({ok:true,completed:!s.needsSetup,needsSetup:s.needsSetup,rootEmail:ROOT_OWNER_EMAIL});}
  catch(e){return json({ok:false,error:String(e?.message||'Không thể kiểm tra trạng thái khởi tạo.'),code:'BOOTSTRAP_STATE_FAILED'},{status:503});}
}
export async function onRequestPost(context){
  let created=null;
  try{
    const s=await state(context);
    if(!s.needsSetup)return json({ok:false,error:'Hệ thống đã có Chủ sở hữu. Chế độ khởi tạo đã đóng.',code:'BOOTSTRAP_CLOSED'},{status:409});
    const body=await context.request.json().catch(()=>({}));
    const name=String(body.name||'').trim();const password=String(body.password||'');const confirm=String(body.confirmPassword||'');
    if(name.length<2)return json({ok:false,error:'Vui lòng nhập tên Chủ sở hữu hệ thống.'},{status:400});
    if(password.length<10||!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password))return json({ok:false,error:'Mật khẩu phải từ 10 ký tự, có chữ hoa, chữ thường và số.'},{status:400});
    if(password!==confirm)return json({ok:false,error:'Mật khẩu xác nhận không khớp.'},{status:400});
    // Re-check immediately before creation to close the race window.
    const again=await firebaseGetUserByEmail(context.env,ROOT_OWNER_EMAIL);if(again)return json({ok:false,error:'Hệ thống vừa được khởi tạo ở phiên khác. Hãy đăng nhập.',code:'BOOTSTRAP_CLOSED'},{status:409});
    created=await firebaseCreateUser(context.env,{email:ROOT_OWNER_EMAIL,password,displayName:name,disabled:false});
    await context.env.DB.prepare('DELETE FROM website_admin_users WHERE lower(email)=? OR is_root_owner=1').bind(ROOT_OWNER_EMAIL).run();
    await context.env.DB.prepare(`INSERT INTO website_admin_users(uid,email,name,role,status,is_root_owner,note,created_at,last_login)
      VALUES(?,?,?,'developer','active',1,'Tài khoản Chủ sở hữu hệ thống',CURRENT_TIMESTAMP,NULL)`)
      .bind(created.localId,ROOT_OWNER_EMAIL,name).run();
    await context.env.DB.prepare(`INSERT INTO website_admin_audit(actor_uid,target_uid,action,detail) VALUES(?,?,?,?)`)
      .bind(created.localId,created.localId,'bootstrap_root_owner','Khởi tạo Chủ sở hữu hệ thống đầu tiên qua Firebase Authentication + D1').run();
    return json({ok:true,completed:true,user:{id:created.localId,email:ROOT_OWNER_EMAIL,name,role:'developer',status:'active',is_root_owner:1}});
  }catch(e){
    if(created?.localId){try{await firebaseDeleteUid(context.env,created.localId)}catch{}}
    return json({ok:false,error:String(e?.message||'Không thể khởi tạo Chủ sở hữu hệ thống.'),code:'BOOTSTRAP_FAILED'},{status:500});
  }
}
