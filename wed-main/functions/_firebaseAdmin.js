function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function text64(s){return b64url(new TextEncoder().encode(s))}
function pemBytes(pem){const s=pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');const bin=atob(s);return Uint8Array.from(bin,c=>c.charCodeAt(0))}
export function firebaseProjectId(env){return env.FIREBASE_PROJECT_ID||'skyfirstnetwork'}
export function firebaseApiKey(env){return env.FIREBASE_API_KEY||'AIzaSyCnsxTv6kDiIp_5KIUlnPcJznnZxYFvN9U'}
export async function firebaseAdminAccessToken(env){
 const raw=env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw new Error('Thiếu FIREBASE_SERVICE_ACCOUNT_JSON trên Cloudflare.');
 let sa;try{sa=JSON.parse(raw)}catch{throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON không hợp lệ.')}
 if(!sa.client_email||!sa.private_key)throw new Error('Service Account Firebase thiếu client_email/private_key.');
 const now=Math.floor(Date.now()/1000),header=text64(JSON.stringify({alg:'RS256',typ:'JWT'})),payload=text64(JSON.stringify({iss:sa.client_email,sub:sa.client_email,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600,scope:'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/identitytoolkit'}));
 const key=await crypto.subtle.importKey('pkcs8',pemBytes(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(`${header}.${payload}`));
 const assertion=`${header}.${payload}.${b64url(new Uint8Array(sig))}`;
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 const d=await r.json();if(!r.ok||!d.access_token)throw new Error('Không lấy được quyền quản trị Firebase.');return d.access_token;
}
export async function firebaseSetPassword(env,uid,password){const token=await firebaseAdminAccessToken(env);const project=firebaseProjectId(env);const r=await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(project)}/accounts:update`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({localId:uid,password})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error?.message||'Không đặt lại được mật khẩu Firebase.');return d}
export async function firebaseDeleteUid(env,uid){const token=await firebaseAdminAccessToken(env);const project=firebaseProjectId(env);const r=await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(project)}/accounts:delete`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({localId:uid})});if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d?.error?.message||'Không xóa được tài khoản Firebase.')}}

export async function firebaseCreateUser(env,{email,password,displayName='',disabled=false}){
 const token=await firebaseAdminAccessToken(env);const project=firebaseProjectId(env);
 const r=await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(project)}/accounts`,{
  method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
  body:JSON.stringify({email,password,displayName,disabled:Boolean(disabled),emailVerified:false})
 });
 const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.localId){const m=d?.error?.message||'Không tạo được tài khoản Firebase.';throw new Error(m)}
 return d;
}

export async function firebaseGetUserByEmail(env,email){
 const token=await firebaseAdminAccessToken(env);const project=firebaseProjectId(env);
 const r=await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(project)}/accounts:lookup`,{
  method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({email:[String(email).trim().toLowerCase()]})
 });
 const d=await r.json().catch(()=>({}));
 if(r.status===404)return null;
 if(!r.ok){const m=d?.error?.message||'Không kiểm tra được tài khoản Firebase.';if(String(m).includes('USER_NOT_FOUND'))return null;throw new Error(m)}
 return d?.users?.[0]||null;
}
