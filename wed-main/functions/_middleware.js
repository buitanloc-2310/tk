const redirectCache=new Map();
const TTL=60_000;
function cleanPath(v){const p='/'+String(v||'').replace(/^\/+|\/+$/g,'');return p==='/'?'/':p.replace(/\/{2,}/g,'/').replace(/\/$/,'')}
function skipPath(path){return path.startsWith('/api/')||path==='/api'||path.startsWith('/admin')||path.startsWith('/media/')||path.startsWith('/assets/')||/\.[a-z0-9]{2,8}$/i.test(path)}
export async function onRequest(context){
  const method=context.request.method.toUpperCase();
  if(method!=='GET'&&method!=='HEAD')return context.next();
  const url=new URL(context.request.url),path=cleanPath(url.pathname);
  if(skipPath(path))return context.next();
  try{
    const hit=redirectCache.get(path);
    if(hit&&hit.expires>Date.now()){
      if(!hit.to)return context.next();
      return Response.redirect(new URL(hit.to,url.origin).toString(),hit.code);
    }
    const row=await context.env.DB.prepare("SELECT payload FROM website_admin_records WHERE kind='redirects' AND json_extract(payload,'$.fromPath')=? AND lower(CAST(COALESCE(json_extract(payload,'$.active'),'false') AS TEXT)) IN ('true','1') ORDER BY updated_at DESC LIMIT 1").bind(path).first();
    if(!row?.payload){redirectCache.set(path,{to:'',code:301,expires:Date.now()+TTL});return context.next()}
    let p={};try{p=JSON.parse(row.payload||'{}')}catch{}
    const to=String(p.toPath||'').trim();
    if(!to||(!to.startsWith('/')&&!/^https:\/\//i.test(to))){redirectCache.set(path,{to:'',code:301,expires:Date.now()+TTL});return context.next()}
    const code=Number(p.redirectCode)===302?302:301;
    redirectCache.set(path,{to,code,expires:Date.now()+TTL});
    return Response.redirect(new URL(to,url.origin).toString(),code);
  }catch{return context.next()}
}
