import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged, User, Auth, deleteUser, Unsubscribe } from 'firebase/auth';

const firebaseConfig={
 apiKey:import.meta.env.VITE_FIREBASE_API_KEY||'AIzaSyCnsxTv6kDiIp_5KIUlnPcJznnZxYFvN9U',authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||'skyfirstnetwork.firebaseapp.com',projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID||'skyfirstnetwork',storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET||'skyfirstnetwork.firebasestorage.app',messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID||'34327270246',appId:import.meta.env.VITE_FIREBASE_APP_ID||'1:34327270246:web:3fa54fbdb2a3d1bf326ea7'};
export const isFirebaseConfigured=Boolean(firebaseConfig.apiKey&&firebaseConfig.authDomain&&firebaseConfig.projectId);
let app:FirebaseApp|null=null; let auth:Auth|null=null;
if(isFirebaseConfigured){try{app=getApps().length?getApp():initializeApp(firebaseConfig);auth=getAuth(app);}catch(e){console.error('Không thể khởi tạo dịch vụ đăng nhập.',e)}}
export {app,auth};
// Compatibility marker: CMS is Cloudflare D1, not Firestore.
export const db=true;

async function authHeaders(){const h=new Headers({'content-type':'application/json'});if(auth?.currentUser){try{h.set('authorization',`Bearer ${await auth.currentUser.getIdToken()}`)}catch{}}return h;}
export function sanitizeForFirestore<T>(data:T):T{if(data==null)return data;if(Array.isArray(data))return data.map(sanitizeForFirestore) as unknown as T;if(typeof data==='object'){const o:any={};for(const[k,v]of Object.entries(data as any))if(v!==undefined)o[k]=sanitizeForFirestore(v);return o}return data;}
export async function syncDocumentToFirestore(collection:string,id:string,data:any){try{const r=await fetch('/api/cms',{method:'PUT',headers:await authHeaders(),body:JSON.stringify({collection,id,data:sanitizeForFirestore(data)}),cache:'no-store'});return r.ok}catch{return false}}
export async function deleteDocumentFromFirestore(collection:string,id:string){try{const r=await fetch(`/api/cms?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(id)}`,{method:'DELETE',headers:await authHeaders(),cache:'no-store'});return r.ok}catch{return false}}
const initializedCollections=new Set<string>();
const excludedDocuments=new Map<string,Set<string>>();
export const isCMSDocumentExcluded=(collection:string,id:string)=>excludedDocuments.get(collection)?.has(id)===true;
export function mergeCMSCollection<T extends {id:string}>(collection:string,defaults:T[],remote:T[]):T[]{const map=new Map(defaults.filter(item=>!isCMSDocumentExcluded(collection,item.id)).map(item=>[item.id,item]));for(const item of remote)map.set(item.id,item);return [...map.values()];}
export const isCMSCollectionInitialized=(collection:string)=>initializedCollections.has(collection);
async function readCMS(url:string){const r=await fetch(url,{headers:await authHeaders(),cache:'no-store'});const d=await r.json().catch(()=>null);if(!r.ok||!d||d.ok!==true)throw new Error(d?.error||'Không thể tải dữ liệu website.');return d;}
export async function fetchCollectionFromFirestore<T>(collection:string):Promise<T[]>{const d=await readCMS(`/api/cms?collection=${encodeURIComponent(collection)}`);if(d.initialized)initializedCollections.add(collection);excludedDocuments.set(collection,new Set(Array.isArray(d.excludedIds)?d.excludedIds:[]));return Array.isArray(d.items)?d.items:[];}
export async function fetchDocumentFromFirestore<T>(collection:string,id:string):Promise<T|null>{const d=await readCMS(`/api/cms?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(id)}`);return d.item||null;}
export async function fetchCMSBundle():Promise<Record<string,any>>{
  const headers=await authHeaders();
  const hasAuth=headers.has('authorization');
  const r=await fetch('/api/cms?bundle=public',{headers,cache:hasAuth?'no-store':'default'});
  const d=await r.json().catch(()=>null);
  if(!r.ok||!d||d.ok!==true) throw new Error(d?.error||'Không thể tải dữ liệu website.');
  const collections=d.collections||{};
  for(const [name,value] of Object.entries(collections) as [string,any][]){
    if(value?.initialized) initializedCollections.add(name);
    excludedDocuments.set(name,new Set(Array.isArray(value?.excludedIds)?value.excludedIds:[]));
  }
  return collections;
}
export async function testFirestoreConnection(){try{const r=await fetch('/api/cms?collection=site_config&id=current',{cache:'no-store'});return r.ok?{ok:true,message:'Dịch vụ dữ liệu D1 hoạt động bình thường.'}:{ok:false,message:'Dịch vụ dữ liệu chưa sẵn sàng.'}}catch{return{ok:false,message:'Không thể kết nối dịch vụ dữ liệu.'}}}

export async function createInitialAdminAccount(email:string,password:string,displayName?:string):Promise<User>{if(!auth)throw new Error('Dịch vụ đăng nhập chưa sẵn sàng.');const r=await createUserWithEmailAndPassword(auth,email.trim(),password);if(displayName?.trim())await updateProfile(r.user,{displayName:displayName.trim()});return r.user}
export async function signInWithEmailPasswordReal(email:string,password:string){if(!auth)throw new Error('Dịch vụ đăng nhập chưa sẵn sàng.');return(await signInWithEmailAndPassword(auth,email.trim(),password)).user}
export async function logoutFirebase(){if(auth)await signOut(auth)}
export function subscribeToAuthChanges(cb:(u:User|null)=>void):Unsubscribe{if(!auth){cb(null);return()=>{}}return onAuthStateChanged(auth,cb)}
export async function getBootstrapStatus(){try{const r=await fetch('/api/admin-auth/bootstrap',{cache:'no-store'});if(!r.ok)return true;return Boolean((await r.json())?.completed)}catch{return true}}
async function d1AdminRequest(path:string,user:User,init:RequestInit={}){const h=new Headers(init.headers||{});h.set('authorization',`Bearer ${await user.getIdToken(true)}`);if(init.body)h.set('content-type','application/json');const r=await fetch(path,{...init,headers:h,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||'Không thể kết nối dịch vụ quản trị.');return d}
export async function bootstrapFirstAdmin(user:User,name:string){return(await d1AdminRequest('/api/admin-auth/bootstrap',user,{method:'POST',body:JSON.stringify({name})})).user}
export async function bootstrapNewFirstAdmin(user:User,name:string){try{return await bootstrapFirstAdmin(user,name)}catch(e){try{await deleteUser(user)}catch{}throw e}}
export async function activateInvitedAdmin(){throw new Error('Kích hoạt tài khoản mới đã được tắt. Liên hệ quản trị hệ thống.')}
export async function getAdminProfile(_uid:string){if(!auth?.currentUser)return null;return(await d1AdminRequest('/api/admin-auth/profile',auth.currentUser)).user||null}

async function currentAdminApi(path:string,init:RequestInit={}){if(!auth?.currentUser)throw new Error('Phiên quản trị đã hết hạn.');const h=new Headers(init.headers||{});h.set('authorization',`Bearer ${await auth.currentUser.getIdToken(true)}`);if(init.body)h.set('content-type','application/json');const r=await fetch(path,{...init,headers:h,cache:'no-store'});const text=await r.text();let d:any={};try{d=text?JSON.parse(text):{}}catch{}if(!r.ok||d?.ok===false){if(d?.error)throw new Error(String(d.error));if(r.status===404)throw new Error('Chức năng quản trị chưa được triển khai đúng trên máy chủ.');if(r.status===403)throw new Error('Tài khoản hiện tại không có quyền thực hiện thao tác này.');throw new Error(`Máy chủ chưa xử lý được yêu cầu (mã ${r.status}).`)}return d}
export async function listAdminAccounts(){return(await currentAdminApi('/api/admin-users')).items||[]}
export async function createAdminAccount(input:{email:string;password:string;name:string;role:string;status:string;note?:string;permissions?:string[]}){return(await currentAdminApi('/api/admin-users',{method:'POST',body:JSON.stringify(input)})).user}
export async function updateAdminAccount(uid:string,input:any){return currentAdminApi('/api/admin-users',{method:'PATCH',body:JSON.stringify({uid,...input})})}
export async function deleteAdminAccount(uid:string){return currentAdminApi(`/api/admin-users?uid=${encodeURIComponent(uid)}`,{method:'DELETE'})}
export async function resetAdminPassword(uid:string,password:string){return currentAdminApi('/api/admin-users?action=password',{method:'POST',body:JSON.stringify({uid,password})})}
export async function createPermanentRedirect(fromPath:string,toPath:string,title?:string){
  const clean=(v:string)=>('/'+String(v||'').replace(/^\/+|\/+$/g,'')).replace(/\/{2,}/g,'/');
  const from=clean(fromPath),to=clean(toPath);
  if(!from||!to||from===to)return true;
  const id=`redirect-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  await currentAdminApi('/api/admin-records',{method:'POST',body:JSON.stringify({id,kind:'redirects',title:title||`${from} → ${to}`,fromPath:from,toPath:to,redirectCode:'301',active:'true',public:true})});
  return true;
}

// --- Consolidated from adminApi.ts ---
export async function adminApi(url:string, init:RequestInit={}) {
  const user=auth?.currentUser; if(!user) throw new Error('Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại.');
  const token=await user.getIdToken(); const headers=new Headers(init.headers||{}); headers.set('authorization',`Bearer ${token}`);
  const r=await fetch(url,{...init,headers,cache:'no-store'});
  const text=await r.text(); let data:any={}; try{data=text?JSON.parse(text):{}}catch{}
  if(!r.ok||data?.ok===false){
    const known=String(data?.error||'').trim();
    if(known) throw new Error(known);
    if(r.status===404) throw new Error('Chức năng này chưa được máy chủ triển khai đúng. Vui lòng cập nhật bản website mới nhất.');
    if(r.status===401) throw new Error('Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại.');
    if(r.status===403) throw new Error('Tài khoản hiện tại không có quyền thực hiện thao tác này.');
    throw new Error(`Máy chủ chưa xử lý được yêu cầu (mã ${r.status}).`);
  }
  return data;
}

// --- Consolidated from mediaApi.ts ---
export interface MediaItem {key:string;url:string;name:string;type:string;size:number;uploaded?:string;alt?:string;caption?:string;credit?:string;sourceUrl?:string;focalX?:number;focalY?:number;displayMode?:'original'|'contain'|'cover'}
export const MEDIA_ACCEPT='image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml,application/pdf';
export function validateMediaFile(file:File,imageOnly=false){if(!MEDIA_ACCEPT.split(',').includes(file.type)||(imageOnly&&!file.type.startsWith('image/')))throw new Error('Chọn ảnh JPG, PNG, WebP, GIF, AVIF, SVG'+(imageOnly?'.':' hoặc PDF.'));if(!file.size)throw new Error('Tệp rỗng không thể tải lên.');if(file.size>20*1024*1024)throw new Error('Mỗi tệp tối đa 20 MB.');}
export async function uploadMedia(file:File,imageOnly=false):Promise<MediaItem>{validateMediaFile(file,imageOnly);const form=new FormData();form.append('file',file);const d=await adminApi('/api/media/upload',{method:'POST',body:form});if(!d?.url||!d?.key)throw new Error('Máy chủ chưa trả về tệp đã lưu.');return d;}
export async function uploadMediaBatch(files:File[],onProgress?:(done:number,total:number)=>void){if(files.length>50)throw new Error('Chọn tối đa 50 tệp mỗi lượt.');const results:{file:File;item?:MediaItem;error?:string}[]=new Array(files.length);let next=0,done=0;await Promise.all(Array.from({length:Math.min(3,files.length)},async()=>{while(next<files.length){const index=next++;const file=files[index];try{results[index]={file,item:await uploadMedia(file)}}catch(e){results[index]={file,error:e instanceof Error?e.message:'Không thể tải tệp.'}}onProgress?.(++done,files.length);}}));return results;}
export async function listMedia(cursor?:string){return adminApi('/api/media'+(cursor?'?cursor='+encodeURIComponent(cursor):'')) as Promise<{items:MediaItem[];cursor:string|null}>;}
export async function copyMediaUrl(url:string){await navigator.clipboard.writeText(new URL(url,location.origin).href);}

// --- Consolidated from adminPermissions.ts ---
import { AdminUser, AdminUserRole } from '../types';

export type AdminCapability =
  | 'content.edit'
  | 'content.publish'
  | 'forms.manage'
  | 'submissions.view'
  | 'records.manage'
  | 'media.manage'
  | 'website.visualEdit'
  | 'settings.manage'
  | 'users.manage'
  | 'system.manage';

export const CAPABILITY_LABELS: Record<AdminCapability, { label: string; desc: string }> = {
  'content.edit': { label: 'Viết & Sửa nội dung', desc: 'Tạo và chỉnh sửa bài viết, trang, chương trình, đơn vị ở chế độ bản nháp' },
  'content.publish': { label: 'Duyệt & Xuất bản', desc: 'Duyệt bài, xuất bản công khai, lập lịch xuất bản và khôi phục phiên bản' },
  'forms.manage': { label: 'Quản lý Biểu mẫu', desc: 'Tạo, chỉnh sửa, nhân bản, đóng/mở Form Builder của các chương trình' },
  'submissions.view': { label: 'Xem & Xử lý Hồ sơ đăng ký', desc: 'Xem, lọc, duyệt và xuất CSV danh sách đăng ký/người tham gia' },
  'records.manage': { label: 'Quản lý Bản ghi & Bình luận', desc: 'Quản lý sự kiện, cơ hội, tài liệu, bình luận, liên hệ' },
  'media.manage': { label: 'Quản lý Thư viện Media', desc: 'Tải lên, chỉnh sửa alt/chú thích/điểm lấy nét và dọn dẹp R2 Media' },
  'website.visualEdit': { label: 'Chỉnh thiết kế Website', desc: 'Sử dụng Trình thiết kế Website trực quan, bố cục trang chủ, header/footer' },
  'settings.manage': { label: 'Cấu hình Hệ thống & Email', desc: 'Truy cập Trung tâm Cấu hình 18 nhóm, mẫu thư, hàng đợi email, sao lưu' },
  'users.manage': { label: 'Quản trị Người dùng & Phân quyền', desc: 'Tạo tài khoản quản trị, gán vai trò, phân quyền chi tiết, đặt lại mật khẩu' },
  'system.manage': { label: 'Giám sát Sức khỏe & Nhật ký', desc: 'Kiểm tra sức khỏe hệ thống, chạy tác vụ tự động và xem nhật ký kiểm toán' },
};

const matrix: Record<AdminUserRole, ReadonlySet<AdminCapability>> = {
  developer: new Set([
    'content.edit',
    'content.publish',
    'forms.manage',
    'submissions.view',
    'records.manage',
    'media.manage',
    'website.visualEdit',
    'settings.manage',
    'users.manage',
    'system.manage',
  ]),
  admin: new Set([
    'content.edit',
    'content.publish',
    'forms.manage',
    'submissions.view',
    'records.manage',
    'media.manage',
    'website.visualEdit',
    'settings.manage',
    'system.manage',
  ]),
  editor: new Set([
    'content.edit',
    'media.manage',
  ]),
};

export const can = (roleOrUser: AdminUserRole | AdminUser | null | undefined, cap: AdminCapability): boolean => {
  if (!roleOrUser) return false;
  if (typeof roleOrUser === 'string') {
    return matrix[roleOrUser]?.has(cap) || false;
  }
  if (roleOrUser.status && roleOrUser.status !== 'active') return false;
  if (roleOrUser.is_root_owner || roleOrUser.role === 'developer') return true;
  if (matrix[roleOrUser.role]?.has(cap)) return true;
  if (Array.isArray(roleOrUser.permissions) && roleOrUser.permissions.includes(cap)) return true;
  return false;
};

export const canOpenAdminTab = (roleOrUser: AdminUserRole | AdminUser, tab: string): boolean => {
  if (['visual-editor', 'layout', 'menus'].includes(tab)) {
    return can(roleOrUser, 'website.visualEdit') || can(roleOrUser, 'content.edit');
  }
  if (['system-health', 'logs'].includes(tab)) {
    return can(roleOrUser, 'system.manage') || can(roleOrUser, 'settings.manage');
  }
  if (['settings', 'email-templates', 'integrations', 'redirects'].includes(tab)) {
    return can(roleOrUser, 'settings.manage');
  }
  if (tab === 'forms') return can(roleOrUser, 'forms.manage') || can(roleOrUser, 'submissions.view');
  if (['registrations', 'participants'].includes(tab)) return can(roleOrUser, 'submissions.view');
  if (['comments', 'contacts', 'partners', 'events', 'opportunities', 'documents', 'people', 'impact', 'transparency', 'notifications', 'certificates', 'contributions'].includes(tab)) {
    return can(roleOrUser, 'records.manage') || can(roleOrUser, 'content.edit');
  }
  if (tab === 'media') return can(roleOrUser, 'media.manage');
  return can(roleOrUser, 'content.edit');
};


export const ALL_CAPABILITIES: { id: AdminCapability; label: string; desc: string }[] = [
  { id: 'content.edit', label: 'Soạn thảo nội dung', desc: 'Tạo và chỉnh sửa bài viết, trang, chương trình ở trạng thái nháp' },
  { id: 'content.publish', label: 'Xuất bản & Gỡ xuất bản', desc: 'Đưa nội dung ra công khai, hẹn giờ xuất bản và khôi phục phiên bản' },
  { id: 'forms.manage', label: 'Quản lý Form Builder', desc: 'Tạo, sửa cấu trúc trường và đóng/mở biểu mẫu chương trình' },
  { id: 'submissions.view', label: 'Xem & Duyệt hồ sơ đăng ký', desc: 'Xem, lọc, cập nhật trạng thái và xuất CSV danh sách đăng ký' },
  { id: 'records.manage', label: 'Quản lý dữ liệu danh mục', desc: 'Quản lý sự kiện, cơ hội, tài liệu công khai, nhân sự, đối tác, redirect' },
  { id: 'media.manage', label: 'Quản lý Thư viện Media', desc: 'Tải lên, chỉnh sửa metadata/tỷ lệ hiển thị và xóa tệp R2' },
  { id: 'website.visualEdit', label: 'Thiết kế giao diện Website', desc: 'Sử dụng Visual Builder chỉnh sửa Trang chủ, Header, Footer, Menu' },
  { id: 'settings.manage', label: 'Cấu hình hệ thống & Email', desc: 'Quản lý 18 nhóm cấu hình, Email Outbox, SEO, Thống kê và Sao lưu' },
  { id: 'users.manage', label: 'Quản lý tài khoản & Phân quyền', desc: 'Tạo tài khoản quản trị, cấp quyền chi tiết và đặt lại mật khẩu' },
  { id: 'system.manage', label: 'Kiểm tra sức khỏe & Tự động hóa', desc: 'Xem chẩn đoán hệ thống, nhật ký audit và chạy tác vụ tự động' },
];

export const ROLE_CAPABILITIES: Record<AdminUserRole, AdminCapability[]> = {
  developer: Array.from(matrix.developer),
  admin: Array.from(matrix.admin),
  editor: Array.from(matrix.editor),
};
