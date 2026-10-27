
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeHtml } from '../utils/contentUtils';
import { useDataContext } from '../context/DataContext';
import { Certificate, CustomPage, PageBlock, PageRoute } from '../types';
import { AlertCircle, ArrowLeft, ArrowRight, Award, Building, Building2, Calendar, Camera, CheckCircle2, Clock, Copy, ExternalLink, FileCheck, FileText, HeartHandshake, Loader2, Mail, PenLine, Phone, Play, QrCode, Quote, RotateCcw, Search, Send, ShieldCheck, Sparkles, UploadCloud, UserRoundPlus, Users, X } from 'lucide-react';
import { adminApi, subscribeToAuthChanges } from '../lib/firebase';
import { EntityBadge, RichTextRenderer } from '../components/UIPrimitives';





interface CustomPageDetailProps {
  slug: string;
  onNavigate: (route: PageRoute) => void;
}

const blockBackground=(bg?:PageBlock['background'])=>bg==='navy'?'bg-[#071B3A] text-white':bg==='sky'?'bg-sky-50 text-slate-900':bg==='soft'?'bg-slate-50 text-slate-900':'bg-white text-slate-900';
const safeExternal=(url:string)=>/^https?:\/\//i.test(url);
const youtubeEmbed=(value?:string)=>{
  const raw=String(value||'').trim(); if(!raw)return '';
  try{const u=new URL(raw); if(!['youtube.com','www.youtube.com','youtu.be'].includes(u.hostname))return ''; let id=''; if(u.hostname==='youtu.be')id=u.pathname.slice(1); else id=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop()||''; return id?`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`:'';}catch{return ''}
};


const blockWidth=(w?:PageBlock['width'])=>w==='full'?'max-w-none':w==='wide'?'max-w-7xl':'max-w-5xl';
const blockAnim=(a?:PageBlock['animation'])=>a&&a!=='none'?`cms-anim cms-anim-${a}`:'';
let publicRecordsBundlePromise:Promise<any>|null=null;
const fetchPublicRecordsBundle=()=>publicRecordsBundlePromise||(publicRecordsBundlePromise=fetch('/api/admin-records?publicBundle=1').then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||d?.ok!==true)throw new Error(d?.error||'Không tải được dữ liệu công khai.');return d.collections||{}}).catch(e=>{publicRecordsBundlePromise=null;throw e}));
const PublicRecords:React.FC<{kind:string,title:string}>=({kind,title})=>{const[items,setItems]=React.useState<any[]>([]),[loading,setLoading]=React.useState(true);React.useEffect(()=>{let live=true;fetchPublicRecordsBundle().then(d=>{if(live)setItems(Array.isArray(d?.[kind])?d[kind]:[])}).catch(()=>{}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[kind]);if(loading)return <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse"><div className="h-4 w-36 bg-slate-100 rounded"/><div className="mt-4 h-20 bg-slate-100 rounded-xl"/></div>;if(!items.length)return null;return <section className="rounded-[28px] border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">{title}</h2><span className="text-xs font-bold text-slate-400">{items.length} mục</span></div><div className="mt-5 grid gap-3 md:grid-cols-2">{items.map(x=><article key={x.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap gap-2 items-center"><h3 className="font-extrabold text-slate-900">{x.title}</h3>{x.status&&<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{x.status}</span>}</div>{x.subtitle&&<p className="mt-2 text-sm text-slate-600 leading-6">{x.subtitle}</p>}<div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">{x.date&&<span>{x.date}</span>}{x.year&&<span>{x.year}</span>}{x.value&&<span className="font-bold text-[#0B66C3]">{x.value} {x.unit||''}</span>}{x.amount&&<span className="font-bold text-[#0B66C3]">{x.amount}</span>}</div>{(x.fileUrl||x.sourceUrl||x.website)&&<a href={x.fileUrl||x.sourceUrl||x.website} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-black text-[#0B66C3]">Xem thông tin <ExternalLink size={13}/></a>}</article>)}</div></section>}


const DocumentCenter:React.FC=()=>{const[items,setItems]=React.useState<any[]>([]),[q,setQ]=React.useState(''),[year,setYear]=React.useState(''),[type,setType]=React.useState('');React.useEffect(()=>{let live=true;fetchPublicRecordsBundle().then(d=>{if(live)setItems(Array.isArray(d?.documents)?d.documents:[])}).catch(()=>{});return()=>{live=false}},[]);const years=Array.from(new Set(items.map(x=>String(x.year||'')).filter(Boolean))).sort().reverse();const types=Array.from(new Set(items.map(x=>String(x.documentType||'')).filter(Boolean))).sort();const filtered=items.filter(x=>{const text=JSON.stringify(x).toLocaleLowerCase('vi');return(!q||text.includes(q.toLocaleLowerCase('vi')))&&(!year||String(x.year||'')===year)&&(!type||String(x.documentType||'')===type)});return <section className="rounded-[30px] border border-slate-200 bg-white p-5 sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-xs font-black uppercase tracking-[.15em] text-[#0B66C3]">Document Center</div><h2 className="mt-2 text-3xl font-black text-slate-950">Tài liệu công khai</h2><p className="mt-2 text-sm text-slate-500">Tìm kiếm theo tên, loại tài liệu, năm hoặc đơn vị công bố.</p></div><div className="grid gap-2 sm:grid-cols-3"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm tài liệu..." className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400"/><select value={type} onChange={e=>setType(e.target.value)} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Tất cả loại</option>{types.map(x=><option key={x}>{x}</option>)}</select><select value={year} onChange={e=>setYear(e.target.value)} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Tất cả năm</option>{years.map(x=><option key={x}>{x}</option>)}</select></div></div><div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">{filtered.length?filtered.map(x=><article key={x.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-50 text-[#0B66C3]"><FileText size={20}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-950">{x.title}</h3>{x.version&&<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{x.version}</span>}</div><p className="mt-1 text-xs text-slate-500">{[x.documentType,x.year,x.unit,x.effectiveDate].filter(Boolean).join(' • ')}</p>{x.subtitle&&<p className="mt-1 line-clamp-2 text-sm text-slate-600">{x.subtitle}</p>}</div>{x.fileUrl&&<a href={x.fileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-xs font-black text-[#0B66C3]">Xem / tải <ExternalLink size={13} className="ml-2"/></a>}</article>):<div className="p-8 text-center text-sm text-slate-500">Chưa có tài liệu phù hợp với bộ lọc.</div>}</div></section>};

const relatedFormBySlug:Record<string,string>={
  'thanh-vien-sky-first':'thanh-vien-sky-first-2026',
  'core-team':'core-team-sky-first',
  'tinh-nguyen-vien':'tinh-nguyen-vien',
  'tinh-nguyen-vien-day-hoc':'tinh-nguyen-vien-day-hoc',
  'hop-tac-dong-hanh':'hop-tac-dong-hanh',
  'gui-sang-kien-de-xuat':'gui-sang-kien-de-xuat'
};
const RelatedForm:React.FC<{pageSlug:string}>=({pageSlug})=>{const formSlug=relatedFormBySlug[pageSlug];const[item,setItem]=React.useState<any>(null);const[checked,setChecked]=React.useState(false);React.useEffect(()=>{if(!formSlug){setChecked(true);return}fetch(`/api/forms?slug=${encodeURIComponent(formSlug)}`).then(async r=>{const d=await r.json().catch(()=>({}));if(r.ok&&d?.item)setItem(d.item)}).catch(()=>{}).finally(()=>setChecked(true))},[formSlug]);if(!formSlug||!checked)return null;return <section className="rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-black uppercase tracking-[.15em] text-[#0B66C3]">Biểu mẫu liên quan</div><h2 className="mt-2 text-2xl font-black text-slate-950">{item?.title||'Biểu mẫu hiện chưa mở'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{item?.description||'Cấu trúc biểu mẫu đã được dựng sẵn trong CMS. Khi quản trị viên mở đợt tiếp nhận, nút đăng ký sẽ hoạt động tại đây.'}</p></div>{item?<a href={`/join?form=${encodeURIComponent(formSlug)}`} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#0B66C3] px-5 py-3 text-sm font-black text-white">Mở biểu mẫu <ArrowRight size={16} className="ml-2"/></a>:<span className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-500">Chưa nhận hồ sơ</span>}</div></section>};

export const CustomPageDetail: React.FC<CustomPageDetailProps> = ({ slug, onNavigate }) => {
  const { customPages, isPublicDataReady } = useDataContext();

  const regularPage = customPages.find((p) => p.slug === slug || p.id === slug || p.slug === decodeURIComponent(slug));
  const [redirectChecking,setRedirectChecking]=React.useState(false);
  const [redirectChecked,setRedirectChecked]=React.useState(false);
  const params=typeof window!=='undefined'?new URLSearchParams(window.location.search):new URLSearchParams();
  const previewMode=params.get('cmsPreview')==='1';
  const previewId=params.get('cmsPreviewId')||'';
  const [previewAuthorized,setPreviewAuthorized]=React.useState<boolean|null>(previewMode?null:false);
  const [previewPage,setPreviewPage]=React.useState<CustomPage|null>(null);
  React.useEffect(()=>{
    if(!previewMode){setPreviewAuthorized(false);setPreviewPage(null);return;}
    let live=true;
    const unsub=subscribeToAuthChanges(async user=>{
      if(!live)return;
      if(!user){setPreviewAuthorized(false);return;}
      try{
        const id=previewId||regularPage?.id||slug;
        const d=await adminApi(`/api/cms?collection=custom_pages&id=${encodeURIComponent(id)}`);
        if(!live)return;
        setPreviewPage((d?.item||null) as CustomPage|null);
        setPreviewAuthorized(true);
      }catch{if(live)setPreviewAuthorized(false)}
    });
    return()=>{live=false;unsub?.()};
  },[previewMode,previewId,regularPage?.id,slug]);
  const page=previewMode&&previewAuthorized===true&&previewPage?previewPage:regularPage;

  React.useEffect(()=>{
    if(previewMode||!isPublicDataReady||page||redirectChecked)return;
    let live=true;setRedirectChecking(true);
    fetch('/api/admin-records?kind=redirects&public=1').then(r=>r.json()).then(d=>{
      if(!live)return;const path=window.location.pathname.replace(/\/+$/,'')||'/';
      const item=(Array.isArray(d?.items)?d.items:[]).find((x:any)=>String(x.fromPath||'').replace(/\/+$/,'')===path);
      if(item?.toPath&&String(item.toPath).startsWith('/')){window.location.replace(String(item.toPath));return;}
    }).catch(()=>{}).finally(()=>{if(live){setRedirectChecking(false);setRedirectChecked(true)}});
    return()=>{live=false};
  },[previewMode,isPublicDataReady,page,redirectChecked]);

  if (!isPublicDataReady || (previewMode&&previewAuthorized===null) || (!page && redirectChecking)) {
    return <div className="min-h-[65vh] bg-white"><div className="max-w-4xl mx-auto px-4 py-14 animate-pulse"><div className="h-5 w-32 bg-slate-100 rounded"/><div className="mt-8 h-10 w-4/5 bg-slate-100 rounded-xl"/><div className="mt-4 h-5 w-3/5 bg-slate-100 rounded"/><div className="mt-10 h-80 rounded-[28px] bg-slate-100"/></div></div>;
  }

  if (!page) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
        <FileText size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy trang yêu cầu</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md">Trang bạn tìm kiếm có thể đã bị xóa hoặc đường dẫn chưa chính xác.</p>
        <button type="button" onClick={() => onNavigate('home')} className="mt-6 px-5 py-2.5 bg-[#0284C7] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#0369A1] transition">Trở Về Trang Chủ</button>
      </div>
    );
  }

  if(page.isPublished===false && previewMode && previewAuthorized===null){
    return <div className="min-h-[65vh] bg-white"><div className="max-w-4xl mx-auto px-4 py-14 animate-pulse"><div className="h-5 w-32 bg-slate-100 rounded"/><div className="mt-8 h-10 w-4/5 bg-slate-100 rounded-xl"/><div className="mt-6 h-40 bg-slate-100 rounded-2xl"/></div></div>;
  }
  if (page.isPublished === false && (!previewMode || previewAuthorized!==true)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-2xs"><Clock size={28} /></div>
        <h2 className="text-xl font-bold text-slate-800">Trang đang ở trạng thái bản nháp</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md">Trang thông tin này hiện đang được quản trị viên biên tập ở chế độ Bản nháp và chưa được xuất bản công khai.</p>
        <button type="button" onClick={() => onNavigate('home')} className="mt-6 px-5 py-2.5 bg-[#0284C7] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#0369A1] transition">Trở Về Trang Chủ</button>
      </div>
    );
  }

  const handleButtonClick = (url?: string) => {
    if (!url) return;
    if (safeExternal(url)) window.open(url, '_blank', 'noopener,noreferrer');
    else if (url.startsWith('/')) onNavigate(url.replace(/^\//, '') as PageRoute);
    else onNavigate(url as PageRoute);
  };

  const renderBlock=(block:PageBlock)=>{
    if(block.hidden)return null;
    const bg=blockBackground(block.background);
    if(block.type==='divider')return <div key={block.id} className="py-4"><hr className="border-slate-200"/></div>;
    if(block.type==='image'){const fit=block.imageFit||'original';return <section key={block.id} className={`rounded-[28px] p-4 sm:p-6 ${bg}`}><figure className="article-media"><div className={fit==='cover'?'aspect-video overflow-hidden rounded-2xl bg-slate-100':fit==='contain'?'min-h-40 max-h-[760px] overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center':''}><img src={block.imageUrl} alt={block.alt||block.title||page.title} style={{objectPosition:`${block.focalX??50}% ${block.focalY??50}%`}} className={fit==='cover'?'h-full w-full object-cover':fit==='contain'?'max-h-[760px] w-full object-contain':'block h-auto max-w-full mx-auto rounded-2xl'}/></div>{(block.caption||block.credit)&&<figcaption className="mt-3 text-center text-sm opacity-75">{block.caption&&<span>{block.caption}</span>}{block.caption&&block.credit&&<br/>}{block.credit&&<span className="text-[11px] font-bold uppercase tracking-wide">ẢNH/NGUỒN: {block.credit}</span>}</figcaption>}</figure></section>;}
    if(block.type==='video'){
      const embed=youtubeEmbed(block.videoUrl);
      return <section key={block.id} className={`rounded-[28px] p-5 sm:p-7 ${bg}`}>{block.title&&<h2 className="text-2xl font-black mb-5">{block.title}</h2>}{embed?<div className="aspect-video overflow-hidden rounded-2xl bg-black"><iframe src={embed} title={block.title||'Video'} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div>:block.videoUrl?<video controls preload="metadata" poster={block.posterUrl} className="w-full max-h-[720px] rounded-2xl bg-black"><source src={block.videoUrl}/></video>:<div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center opacity-60"><Play className="mx-auto"/>Chưa cấu hình video.</div>}</section>;
    }
    if(block.type==='stats')return <section key={block.id} className={`rounded-[28px] p-6 sm:p-8 ${bg}`}>{block.title&&<h2 className="text-2xl font-black mb-6">{block.title}</h2>}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(block.stats||[]).map((stat,i)=><div key={i} className="rounded-2xl border border-current/10 bg-white/8 p-5"><div className="text-3xl font-black tracking-tight">{stat.value}</div><div className="mt-1 text-sm font-bold opacity-80">{stat.label}</div>{stat.note&&<div className="mt-1 text-xs opacity-60">{stat.note}</div>}</div>)}</div></section>;
    if(block.type==='cta')return <section key={block.id} className={`rounded-[30px] p-7 sm:p-10 ${bg}`}><h2 className="text-3xl font-black tracking-tight">{block.title||'Cùng đồng hành'}</h2>{block.body&&<p className="mt-3 max-w-3xl leading-7 opacity-75">{block.body}</p>}<div className="mt-6 flex flex-wrap gap-3">{block.buttonLabel&&<button onClick={()=>handleButtonClick(block.buttonUrl)} className="rounded-xl bg-[#0B66C3] px-5 py-3 text-sm font-black text-white">{block.buttonLabel}<ArrowRight size={15} className="inline ml-2"/></button>}{block.secondaryButtonLabel&&<button onClick={()=>handleButtonClick(block.secondaryButtonUrl)} className="rounded-xl border border-current/20 px-5 py-3 text-sm font-black">{block.secondaryButtonLabel}</button>}</div></section>;
    if(block.type==='quote')return <section key={block.id} className={`rounded-[28px] p-7 sm:p-9 ${bg}`}><Quote size={26} className="text-sky-500"/>{block.title&&<h2 className="mt-4 text-xl font-black">{block.title}</h2>}<blockquote className="mt-3 text-lg leading-8 font-medium opacity-80">{block.body}</blockquote></section>;
    if(block.type==='html')return <section key={block.id} className={`rounded-[28px] p-6 sm:p-8 ${bg}`}>{block.title&&<h2 className="text-2xl font-black mb-4">{block.title}</h2>}<div className="formatted-content prose prose-slate max-w-none" dangerouslySetInnerHTML={{__html:sanitizeHtml(block.body||'')}}/></section>;
    if(['gallery','timeline','logos','accordion','tabs','table','documents','people','campaign','funding','transparency','marquee'].includes(block.type))return <section key={block.id} className={`${block.mobileHidden?'hidden sm:block':''} ${blockWidth(block.width)} ${blockAnim(block.animation)} mx-auto rounded-[28px] p-6 sm:p-8 ${bg}`}><h2 className="text-2xl font-black">{block.title||({gallery:'Thư viện',timeline:'Dòng thời gian',logos:'Đơn vị đồng hành',accordion:'Thông tin',tabs:'Nội dung',documents:'Tài liệu',people:'Con người',campaign:'Chiến dịch',funding:'Nguồn lực',transparency:'Công khai & Minh bạch',marquee:'Cập nhật'} as any)[block.type]||''}</h2>{block.body&&<p className="mt-2 opacity-70 leading-7">{block.body}</p>}<div className={block.type==='marquee'?'mt-5 flex gap-6 overflow-x-auto whitespace-nowrap':'mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'} style={block.type==='marquee'?undefined:{gridTemplateColumns:`repeat(${Math.min(4,Math.max(1,block.columns||2))},minmax(0,1fr))`}}>{(block.items||[]).map((item,i)=><article key={i} className={`${block.type==='logos'?'flex items-center justify-center min-h-28':'rounded-2xl border border-current/10 bg-white/70 p-4'} text-slate-900`}>{item.imageUrl&&<img src={item.imageUrl} alt={item.title||''} style={block.type==='logos'?undefined:{objectPosition:`${block.focalX??50}% ${block.focalY??50}%`}} className={block.type==='logos'?'max-h-14 max-w-[160px] object-contain':block.imageFit==='cover'?'mb-3 aspect-video w-full rounded-xl object-cover':block.imageFit==='contain'?'mb-3 h-44 w-full rounded-xl object-contain bg-slate-50':'mb-3 h-auto max-w-full rounded-xl mx-auto'}/>}<div className="font-extrabold">{item.title||item.label}</div>{item.body&&<div className="mt-1 text-sm text-slate-600 whitespace-normal">{item.body}</div>}{item.url&&<a href={item.url} target={safeExternal(item.url)?'_blank':undefined} rel={safeExternal(item.url)?'noreferrer':undefined} className="mt-3 inline-flex text-xs font-black text-[#0B66C3]">Xem thêm →</a>}</article>)}</div></section>;
    if(block.type==='map'||block.type==='embed'){const src=block.sourceUrl||block.videoUrl||'';return <section key={block.id} className={`${block.mobileHidden?'hidden sm:block':''} ${blockWidth(block.width)} ${blockAnim(block.animation)} mx-auto rounded-[28px] p-5 sm:p-7 ${bg}`}>{block.title&&<h2 className="text-2xl font-black mb-4">{block.title}</h2>}{src&&/^https:\/\//i.test(src)?<div className="aspect-video overflow-hidden rounded-2xl border bg-white"><iframe src={src} title={block.title||block.type} className="h-full w-full" loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups"/></div>:<div className="rounded-xl border border-dashed p-8 text-center text-sm opacity-60">Chưa cấu hình URL an toàn.</div>}</section>}
    return <section key={block.id} className={`rounded-[28px] p-6 sm:p-8 ${bg}`}>{block.title&&<h2 className="text-2xl font-black tracking-tight">{block.title}</h2>}{block.body&&<div className="formatted-content prose prose-slate max-w-none mt-4 leading-8" dangerouslySetInnerHTML={{__html:sanitizeHtml(block.body.includes('<')?block.body:block.body.replace(/\n/g,'<br/>'))}}/>}</section>;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="bg-white border-b border-slate-200/80 pt-8 pb-10"><div className="max-w-5xl mx-auto px-4 sm:px-6">
        <button type="button" onClick={() => onNavigate('home')} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 group transition"><ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform"/><span>Trang chủ</span></button>
        {page.badge&&<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-black text-[#0284C7] mb-3"><Sparkles size={13}/><span>{page.badge}</span></div>}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-[-.035em] leading-tight">{page.title}</h1>
        {page.summary&&<p className="mt-4 text-base sm:text-lg text-slate-600 leading-8 max-w-4xl">{page.summary}</p>}
        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex-wrap"><span className="flex items-center gap-1.5"><Calendar size={14}/><span>{page.publishedAt||'Năm 2026'}</span></span></div>
      </div></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-5">
        {(page.imageUrl || page.contentFormatted || page.content || page.secondaryImageUrl) && <article className="bg-white rounded-[30px] border border-slate-200/80 shadow-xs p-6 sm:p-10 space-y-8">
          {page.imageUrl&&<div className={`w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 ${page.imageFit==='cover'?'aspect-video':page.imageFit==='contain'?'min-h-56 max-h-[760px] flex items-center justify-center':''}`}><img src={page.imageUrl} alt={page.title} referrerPolicy="no-referrer" style={{objectPosition:`${page.imageFocalX??50}% ${page.imageFocalY??50}%`}} className={page.imageFit==='cover'?'w-full h-full object-cover':page.imageFit==='contain'?'w-full max-h-[760px] object-contain':'block w-auto max-w-full h-auto mx-auto'}/></div>}
          {page.contentFormatted&&page.contentFormatted.includes('<')?<div className="formatted-content prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed" dangerouslySetInnerHTML={{__html:sanitizeHtml(page.contentFormatted)}}/>:<div className="formatted-content prose prose-slate max-w-none space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{page.contentFormatted||page.content}</div>}
          {page.secondaryImageUrl&&<div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100"><img src={page.secondaryImageUrl} alt="Ảnh minh họa đính kèm" referrerPolicy="no-referrer" className="w-full h-auto object-contain"/></div>}
        </article>}

        {(page.pageBlocks||[]).map(renderBlock)}

        {slug==='cong-khai'&&<><PublicRecords kind="transparency" title="Hồ sơ công khai"/><PublicRecords kind="impact" title="Số liệu & tác động"/><PublicRecords kind="documents" title="Tài liệu & báo cáo"/><PublicRecords kind="partners" title="Đơn vị đồng hành"/></>}
        {slug==='tai-lieu-cong-khai'&&<DocumentCenter/>}

        {slug==='su-kien'&&<PublicRecords kind="events" title="Sự kiện đang được công bố"/>}
        {slug==='co-hoi'&&<PublicRecords kind="opportunities" title="Cơ hội đang mở"/>}
        {slug==='con-nguoi'&&<PublicRecords kind="people" title="Con người Sky First"/>}

        <RelatedForm pageSlug={slug}/>

        {(page.buttonLabel||page.secondaryButtonLabel)&&<div className="rounded-[26px] border border-slate-200 bg-white p-6 flex flex-wrap items-center gap-3">{page.buttonLabel&&<button type="button" onClick={()=>handleButtonClick(page.buttonUrl)} className="px-6 py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-xs sm:text-sm rounded-xl transition flex items-center gap-2"><span>{page.buttonLabel}</span>{page.buttonUrl?.startsWith('http')?<ExternalLink size={15}/>:<ArrowRight size={15}/>}</button>}{page.secondaryButtonLabel&&<button type="button" onClick={()=>handleButtonClick(page.secondaryButtonUrl)} className="px-5 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-2"><span>{page.secondaryButtonLabel}</span>{page.secondaryButtonUrl?.startsWith('http')?<ExternalLink size={15}/>:<ArrowRight size={15}/>}</button>}</div>}
      </div>
    </div>
  );
};


// --- Consolidated from src/pages/ContactPage.tsx ---

interface ContactPageProps{onNavigate:(page:PageRoute)=>void;onShowToast:(msg:string)=>void;}

export const ContactPage:React.FC<ContactPageProps>=({onShowToast})=>{
  const {siteConfig,customPages}=useDataContext();
  const p=customPages.find(x=>x.slug==='contact'||x.id==='page-contact');
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [topic,setTopic]=useState('Liên hệ chung');
  const [message,setMessage]=useState('');
  const [sending,setSending]=useState(false);
  const contacts=(siteConfig.footerContacts||[]).filter((x:any)=>x.value!=='support@skyfirst.io.vn'&&x.value!=='skyfirst.ec@gmail.com');

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setSending(true);
    try{
      const r=await fetch('/api/contact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,email,topic,message})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d?.ok) throw new Error(d?.error||'Không thể gửi thông tin.');
      setName('');setEmail('');setTopic('Liên hệ chung');setMessage('');
      onShowToast(d?.message||'Thông tin của bạn đã được tiếp nhận.');
    }catch(err:any){onShowToast(err?.message||'Không thể gửi thông tin. Vui lòng dùng email hỗ trợ.');}
    finally{setSending(false);}
  };

  return <main className="bg-white">
    <section className="bg-[#071B3A] text-white py-14 sm:py-20"><div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-xs uppercase tracking-[.18em] text-sky-200 font-black">{p?.badge||'Liên hệ'}</div><h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-.045em]">{p?.title||'Liên hệ'}</h1><p className="mt-5 max-w-3xl text-slate-300 leading-7 sm:leading-8">{p?.summary||''}</p></div></section>
    <section className="py-12 lg:py-20"><div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{(p?.contentFormatted||p?.content)&&<div className="mb-10"><RichTextRenderer content={p?.contentFormatted||p?.content||''}/></div>}<div className="grid lg:grid-cols-[.9fr_1.1fr] gap-8"><div className="space-y-4">{contacts.filter((x:any)=>x.url?.startsWith('mailto:')||x.url?.startsWith('tel:')).map((x:any)=>{const Icon=x.url.startsWith('tel:')?Phone:Mail;return <a key={x.label+x.url} href={x.url} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5 hover:border-sky-300 hover:bg-sky-50/40 transition"><div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0B5FB4] grid place-items-center"><Icon size={19}/></div><div className="min-w-0"><div className="text-xs text-slate-400">{x.label}</div><div className="font-bold mt-1 break-all">{x.value}</div></div></a>})}<div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 text-sm leading-6 text-slate-700"><div className="flex items-center gap-2 font-black text-[#0B5FB4]"><ShieldCheck size={18}/>Mỗi kết nối đều đáng được lắng nghe</div><p className="mt-2">Thông tin của bạn sẽ được chuyển đến đúng bộ phận phụ trách để tiếp nhận và phản hồi phù hợp. Sky First tôn trọng tính riêng tư và chỉ sử dụng thông tin cho mục đích xử lý nội dung bạn gửi.</p><p className="mt-2 text-xs text-slate-500">Không chia sẻ mật khẩu, mã OTP hoặc thông tin tài chính nhạy cảm qua biểu mẫu.</p></div></div>
      <form onSubmit={submit} className="rounded-[28px] border border-slate-200 p-5 sm:p-7 space-y-5 shadow-sm"><div><h2 className="text-2xl sm:text-3xl font-black">{p?.contactFormTitle||'Gửi thông tin liên hệ'}</h2><p className="mt-2 text-sm text-slate-500">{p?.contactFormDescription||'Chọn nhu cầu phù hợp để thông tin được tiếp nhận đúng hướng.'}</p></div><label className="block text-sm font-bold">Họ và tên<input value={name} onChange={e=>setName(e.target.value)} required maxLength={100} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500"/></label><label className="block text-sm font-bold">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={180} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500"/></label><label className="block text-sm font-bold">Nhu cầu<select value={topic} onChange={e=>setTopic(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500"><option>Liên hệ chung</option><option>Hợp tác & Đồng hành</option><option>Nhân sự</option><option>Tình nguyện viên</option><option>Lớp học</option><option>Truyền thông</option><option>Xác thực GCN</option></select></label><label className="block text-sm font-bold">Nội dung<textarea value={message} onChange={e=>setMessage(e.target.value)} required maxLength={4000} rows={6} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500"/></label><button disabled={sending} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#0B5FB4] text-white px-5 py-3 font-bold disabled:opacity-60">{sending?<Loader2 size={17} className="animate-spin"/>:<Send size={17}/>} {sending?'Đang gửi...':(p?.contactSubmitButtonLabel||'Gửi thông tin')}</button></form>
    </div></div></section>
  </main>;
};


// --- Consolidated from src/pages/JoinPage.tsx ---

type F={id:string;slug:string;title:string;description:string;status?:string;fields?:any[];settings?:any};
interface JoinPageProps{onNavigate:(r:PageRoute)=>void;onShowToast:(m:string)=>void}

const SignatureField:React.FC<{value?:string;onChange:(v:string)=>void}>=({value,onChange})=>{
 const ref=useRef<HTMLCanvasElement|null>(null);const drawing=useRef(false);
 useEffect(()=>{const c=ref.current;if(!c)return;const ratio=Math.max(1,window.devicePixelRatio||1);const rect=c.getBoundingClientRect();c.width=rect.width*ratio;c.height=180*ratio;const ctx=c.getContext('2d');if(!ctx)return;ctx.scale(ratio,ratio);ctx.lineWidth=2;ctx.lineCap='round';ctx.strokeStyle='#0f172a';if(value){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,rect.width,180);img.src=value}},[]);
 const point=(e:React.PointerEvent<HTMLCanvasElement>)=>{const r=e.currentTarget.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 const down=(e:React.PointerEvent<HTMLCanvasElement>)=>{drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);const ctx=e.currentTarget.getContext('2d');const p=point(e);ctx?.beginPath();ctx?.moveTo(p.x,p.y)};
 const move=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;const ctx=e.currentTarget.getContext('2d');const p=point(e);ctx?.lineTo(p.x,p.y);ctx?.stroke()};
 const up=(e:React.PointerEvent<HTMLCanvasElement>)=>{drawing.current=false;try{onChange(e.currentTarget.toDataURL('image/png'))}catch{}};
 const clear=()=>{const c=ref.current;if(!c)return;const ctx=c.getContext('2d');ctx?.clearRect(0,0,c.width,c.height);onChange('')};
 return <div className="rounded-xl border border-slate-200 overflow-hidden"><canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="block h-[180px] w-full touch-none bg-white cursor-crosshair"/><div className="flex items-center justify-between border-t bg-slate-50 px-3 py-2 text-xs"><span className="flex items-center gap-1 text-slate-500"><PenLine size={13}/>Ký trực tiếp bằng chuột hoặc cảm ứng</span><button type="button" onClick={clear} className="font-bold text-rose-600">Xóa chữ ký</button></div></div>
};

export const JoinPage:React.FC<JoinPageProps>=({onNavigate,onShowToast})=>{
 const{customPages}=useDataContext();const p=customPages.find(x=>x.slug==='join'||x.id==='page-join');
 const roles=[1,2,3].map(i=>({title:(p as any)?.[`joinRole${i}Title`],tag:(p as any)?.[`joinRole${i}Tag`],text:(p as any)?.[`joinRole${i}Description`],button:(p as any)?.[`joinRole${i}ButtonLabel`],url:(p as any)?.[`joinRole${i}ButtonUrl`]})).filter(x=>x.title||x.text);
 const icons=[UserRoundPlus,HeartHandshake,Users,Building2];
 const[forms,setForms]=useState<F[]>([]),[selected,setSelected]=useState<F|null>(null),[answers,setAnswers]=useState<Record<string,any>>({}),[code,setCode]=useState(''),[lookup,setLookup]=useState<any>(null),[busy,setBusy]=useState(false),[uploading,setUploading]=useState<string>('');
 const loadForms=()=>fetch('/api/forms').then(r=>r.json()).then(async d=>{const list=d.items||[];setForms(list);const requested=new URLSearchParams(window.location.search).get('form');if(requested){const match=list.find((x:F)=>x.slug===requested);if(match){try{const detail=await fetch(`/api/forms?slug=${encodeURIComponent(match.slug)}`).then(r=>r.json());if(detail?.ok)setSelected(detail.item)}catch{}}}}).catch(()=>{});useEffect(()=>{loadForms()},[]);
 const open=async(f:F)=>{try{const d=await fetch(`/api/forms?slug=${encodeURIComponent(f.slug)}`).then(r=>r.json());if(!d.ok)throw new Error(d.error);setSelected(d.item);setAnswers({})}catch(e:any){onShowToast(e.message||'Không thể mở biểu mẫu.')}};
 const uploadField=async(field:any,file:File)=>{if(!selected)return;setUploading(field.id);try{const fd=new FormData();fd.append('file',file);const r=await fetch(`/api/forms?upload=1&formId=${encodeURIComponent(selected.id)}&fieldId=${encodeURIComponent(field.id)}`,{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error);setAnswers(a=>({...a,[field.id]:d.url}));onShowToast('Đã tải tệp lên.')}catch(e:any){onShowToast(e.message||'Không thể tải tệp.')}finally{setUploading('')}};
 const uploadSignature=async(field:any,dataUrl:string)=>{if(!selected){return}if(!dataUrl){setAnswers(a=>({...a,[field.id]:''}));return}try{const blob=await(await fetch(dataUrl)).blob();const fd=new FormData();fd.append('file',new File([blob],'signature.png',{type:'image/png'}));setUploading(field.id);const r=await fetch(`/api/forms?upload=1&formId=${encodeURIComponent(selected.id)}&fieldId=${encodeURIComponent(field.id)}`,{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error);setAnswers(a=>({...a,[field.id]:d.url}));}catch(e:any){onShowToast(e.message||'Không thể lưu chữ ký.')}finally{setUploading('')}};
 const submit=async()=>{if(!selected)return;setBusy(true);try{const r=await fetch('/api/forms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({formId:selected.id,answers})});const d=await r.json();if(!r.ok)throw new Error(d.error);setCode(d.applicationCode);setSelected(null);onShowToast(d.message||`Đã nhận hồ sơ. Mã: ${d.applicationCode}`)}catch(e:any){onShowToast(e.message||'Không thể gửi hồ sơ.')}finally{setBusy(false)}};
 const doLookup=async()=>{const q=code.trim();if(!q)return onShowToast('Vui lòng nhập mã hồ sơ.');setBusy(true);try{const r=await fetch(`/api/forms?lookup=${encodeURIComponent(q)}`);const d=await r.json();if(!r.ok)throw new Error(d.error);setLookup(d.item)}catch(e:any){setLookup(null);onShowToast(e.message)}finally{setBusy(false)}};
 const update=(id:string,value:any)=>setAnswers(a=>({...a,[id]:value}));
 const isFieldVisible=(f:any)=>{const rule=f?.showWhen;if(!rule?.fieldId)return true;const current=answers[rule.fieldId];return Array.isArray(current)?current.map(String).includes(String(rule.equals??'')):String(current??'')===String(rule.equals??'')};
 return <main className="bg-white"><section className="bg-[#071B3A] text-white py-20"><div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-xs uppercase tracking-[.18em] text-sky-200 font-black">{p?.badge||'Tham gia'}</div><h1 className="mt-4 text-5xl lg:text-6xl font-black tracking-[-.045em]">{p?.title||'Tham gia Sky First Network'}</h1><p className="mt-5 max-w-3xl text-slate-300 leading-8">{p?.summary||''}</p></div></section>
 <section className="py-16"><div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{(p?.contentFormatted||p?.content)&&<div className="mb-10"><RichTextRenderer content={p?.contentFormatted||p?.content||''}/></div>}<div className="grid md:grid-cols-2 gap-5">{roles.map((r,i)=>{const Icon=icons[i]||HeartHandshake;return <article key={i} className="rounded-2xl border p-6"><Icon/><h2 className="mt-3 text-2xl font-extrabold">{r.title}</h2><p className="mt-3 text-slate-600">{r.text}</p>{r.button&&<a href={r.url||'/contact'} className="mt-5 inline-flex gap-2 font-bold text-[#0B5FB4]">{r.button}<ArrowRight size={16}/></a>}</article>})}</div>
 <div className="mt-12"><h2 className="text-3xl font-black">Biểu mẫu đang mở</h2><div className="mt-5 grid md:grid-cols-2 gap-4">{forms.length?forms.map(f=><button key={f.id} onClick={()=>void open(f)} className="text-left rounded-2xl border p-5 hover:border-sky-400"><div className="font-black text-lg">{f.title}</div><p className="mt-2 text-sm text-slate-600">{f.description}</p><span className="mt-4 inline-flex font-bold text-sky-700">Đăng ký ngay →</span></button>):<p className="text-slate-500">Hiện chưa có biểu mẫu công khai.</p>}</div></div>
 <div className="mt-12 rounded-3xl bg-slate-50 border p-6"><h2 className="text-2xl font-black">Tra cứu hồ sơ</h2><p className="text-sm text-slate-600 mt-2">Nhập mã hồ sơ được cấp sau khi gửi biểu mẫu.</p><div className="mt-4 flex gap-2"><input value={code} onChange={e=>setCode(e.target.value)} className="flex-1 border rounded-xl px-4 py-3" placeholder="VD: SFN-20261006-ABC123"/><button onClick={()=>void doLookup()} className="bg-[#0F2B5B] text-white rounded-xl px-5 font-bold flex items-center gap-2"><Search size={17}/>Tra cứu</button></div>{lookup&&<div className="mt-4 rounded-xl bg-white border p-4"><b>{lookup.form_title}</b><div className="mt-1 text-sm">Mã: {lookup.application_code}</div><div className="text-sm">Trạng thái: <b>{lookup.status}</b></div></div>}</div></div></section>
 {selected&&<div className="fixed inset-0 z-[120] bg-slate-950/60 p-3 flex items-center justify-center"><div className="bg-white rounded-2xl max-w-3xl w-full max-h-[94vh] overflow-hidden flex flex-col"><header className="p-5 border-b flex justify-between gap-4"><div><h2 className="text-2xl font-black">{selected.title}</h2><p className="text-sm text-slate-600 mt-2">{selected.description}</p></div><button onClick={()=>setSelected(null)}><X/></button></header><div className="p-6 overflow-y-auto space-y-4">{(selected.fields||[]).filter(isFieldVisible).map((f:any)=>{
   if(f.type==='section')return <h3 key={f.id} className="font-black text-lg pt-3">{f.label}</h3>;
   if(f.type==='consent')return <label key={f.id} className="flex gap-2 text-sm"><input type="checkbox" checked={!!answers[f.id]} onChange={e=>update(f.id,e.target.checked)}/><span>{f.label}{f.required?' *':''}</span></label>;
   if(f.type==='signature')return <div key={f.id}><div className="text-sm font-bold mb-2">{f.label}{f.required?' *':''}</div><SignatureField onChange={v=>void uploadSignature(f,v)}/>{uploading===f.id&&<div className="mt-1 text-xs text-sky-700">Đang lưu chữ ký...</div>}{answers[f.id]&&<div className="mt-1 text-xs text-emerald-700">Đã lưu chữ ký an toàn.</div>}</div>;
   if(['file','image'].includes(f.type))return <label key={f.id} className="block"><span className="text-sm font-bold">{f.label}{f.required?' *':''}</span><div className="mt-2 rounded-xl border border-dashed p-4"><span className="inline-flex items-center gap-2 text-sm font-bold"><UploadCloud size={16}/>{uploading===f.id?'Đang tải...':'Chọn tệp tải lên'}</span><input type="file" accept={f.type==='image'?'image/jpeg,image/png,image/webp':'image/jpeg,image/png,image/webp,application/pdf'} className="block mt-2 text-xs" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadField(f,file)}}/>{answers[f.id]&&<div className="mt-2 text-xs text-emerald-700">Đã tải tệp thành công.</div>}</div></label>;
   if(['select','radio'].includes(f.type))return <label key={f.id} className="block"><span className="text-sm font-bold">{f.label}{f.required?' *':''}</span><select className="mt-1 w-full border rounded-xl p-3" value={answers[f.id]||''} onChange={e=>update(f.id,e.target.value)}><option value="">Chọn...</option>{(f.options||[]).map((o:string)=><option key={o}>{o}</option>)}</select></label>;
   if(f.type==='checkbox')return <div key={f.id}><div className="text-sm font-bold">{f.label}{f.required?' *':''}</div><div className="mt-2 grid sm:grid-cols-2 gap-2">{(f.options||[]).map((o:string)=>{const arr=Array.isArray(answers[f.id])?answers[f.id]:[];return <label key={o} className="flex gap-2 rounded-lg border p-2 text-sm"><input type="checkbox" checked={arr.includes(o)} onChange={e=>update(f.id,e.target.checked?[...arr,o]:arr.filter((x:string)=>x!==o))}/>{o}</label>})}</div></div>;
   const htmlType=['email','date','time','number'].includes(f.type)?f.type:f.type==='datetime'?'datetime-local':f.type==='url'?'url':f.type==='phone'?'tel':'text';
   return <label key={f.id} className="block"><span className="text-sm font-bold">{f.label}{f.required?' *':''}</span>{f.type==='textarea'?<textarea className="mt-1 w-full border rounded-xl p-3" placeholder={f.placeholder||''} value={answers[f.id]||''} onChange={e=>update(f.id,e.target.value)}/>:<input className="mt-1 w-full border rounded-xl p-3" type={htmlType} placeholder={f.placeholder||''} value={answers[f.id]||''} onChange={e=>update(f.id,e.target.value)}/>}</label>})}</div><footer className="p-4 border-t"><button disabled={busy||!!uploading} onClick={()=>void submit()} className="w-full rounded-xl bg-[#0F2B5B] disabled:opacity-60 text-white p-3 font-black flex justify-center gap-2"><Send size={18}/>Gửi hồ sơ</button></footer></div></div>}</main>
}


// --- Consolidated from src/pages/UnitsPage.tsx ---


interface UnitsPageProps { onNavigate: (page: PageRoute) => void; }

export const UnitsPage: React.FC<UnitsPageProps> = ({ onNavigate }) => {
  const { networkUnits, siteConfig } = useDataContext();
  const units = networkUnits.filter(u => u.isPublished !== false);

  return <main className="bg-white">
    <section className="bg-[#071B3A] text-white py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-xs uppercase tracking-[.18em] text-sky-200 font-black">{siteConfig.unitsLabel || 'Đơn vị trực thuộc'}</div>
        <h1 className="mt-4 text-5xl lg:text-6xl font-black tracking-[-.045em]">{siteConfig.unitsHeading || 'Đơn vị trực thuộc'}</h1>
        <p className="mt-5 max-w-3xl text-slate-300 leading-8">{siteConfig.unitsIntro || 'Các đơn vị trực thuộc có phạm vi hoạt động và thông tin riêng, được cập nhật theo dữ liệu chính thức trên website.'}</p>
      </div>
    </section>

    <section className="py-16 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {units.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-slate-500">Chưa có đơn vị được công bố.</div>}
        {units.map(unit => <article key={unit.id} className="rounded-[28px] border border-slate-200 p-6 lg:p-8 grid md:grid-cols-[120px_1fr] gap-6 items-start">
          <div className="w-28 h-28 rounded-2xl border border-slate-200 bg-white overflow-hidden grid place-items-center">
            {unit.imageUrl ? <img src={unit.imageUrl} alt={`Logo ${unit.name}`} className="w-full h-full object-contain"/> : <Building2 size={34} className="text-slate-400"/>}
          </div>
          <div>
            <EntityBadge label={unit.categoryLabel} color={unit.badgeColor} className="uppercase tracking-[.08em]" />
            <h2 className="mt-2 text-3xl font-black">{unit.name}</h2>
            {unit.tagline && <p className="mt-2 text-slate-500">{unit.tagline}</p>}
            <p className="mt-5 leading-7 text-slate-600">{unit.description}</p>
            {(unit.leader?.name || unit.leader?.title) && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                {unit.leader?.name && <span className="font-bold text-slate-800">{unit.leader.name}</span>}
                {unit.leader?.title && <EntityBadge label={unit.leader.title} color={unit.leader.color} />}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-600">
              {unit.contact.email && <a className="inline-flex items-center gap-2" href={`mailto:${unit.contact.email}`}><Mail size={16}/> {unit.contact.email}</a>}
              {unit.contact.phone && <a className="inline-flex items-center gap-2" href={`tel:${unit.contact.phone.replace(/\s/g,'')}`}><Phone size={16}/> {unit.contact.phone}</a>}
            </div>
          </div>
        </article>)}
        <button onClick={() => onNavigate('contact')} className="inline-flex items-center gap-2 rounded-xl bg-[#0B5FB4] text-white px-5 py-3 font-bold">{siteConfig.ctaSecondaryButtonText || 'Liên hệ'} <ArrowRight size={17}/></button>
      </div>
    </section>
  </main>;
};


// --- Consolidated from src/pages/CertificatePage.tsx ---


interface CertificatePageProps {
  onShowToast: (msg: string) => void;
}

export const CertificatePage: React.FC<CertificatePageProps> = ({ onShowToast }) => {
  const { certificates, customPages } = useDataContext();

  const pageData = customPages.find(
    p => p.slug === 'certificate' || p.id === 'page-certificate'
  );

  const badgeText =
    pageData?.badge || 'TRUNG TÂM XÁC THỰC SKY FIRST';

  const titleText =
    pageData?.title || 'Trung tâm Xác thực Sky First';

  const summaryText =
    pageData?.summary ||
    'Xác thực thông tin và trạng thái các ghi nhận được quản lý trên hệ thống Sky First.';

  const searchLabel =
    pageData?.certSearchLabel || 'Mã Tra Cứu Chứng Nhận';

  const searchPlaceholder =
    pageData?.certSearchPlaceholder || 'Nhập mã Giấy chứng nhận';

  const searchButtonLabel =
    pageData?.certSearchButtonLabel || 'Tra Cứu';

  const resetButtonLabel =
    pageData?.certResetButtonLabel || 'Làm mới';

  const guidanceNote =
    pageData?.certGuidanceNote ||
    'Hệ thống tra cứu tự động đối chiếu mã số với cơ sở dữ liệu số hóa hệ thống Giấy chứng nhận theo thời gian thực.';

  const certFeature1Title =
    pageData?.certFeature1Title || 'Mã Định Danh Duy Nhất';

  const certFeature1Desc =
    pageData?.certFeature1Desc ||
    'Mỗi Giấy chứng nhận được ghi nhận bằng một mã phục vụ việc tra cứu và đối chiếu thông tin.';

  const certFeature2Title =
    pageData?.certFeature2Title || 'Lưu Trữ Trong Hệ Thống';

  const certFeature2Desc =
    pageData?.certFeature2Desc ||
    'Hồ sơ được lưu trữ trên cơ sở dữ liệu số của Sky First Network phục vụ việc đối chiếu thông tin.';

  const certFeature3Title =
    pageData?.certFeature3Title || 'Hỗ Trợ Nhanh Chóng';

  const certFeature3Desc =
    pageData?.certFeature3Desc ||
    'Cần xác minh bổ sung hoặc chỉnh sửa thông tin, vui lòng gửi yêu cầu qua trang Liên hệ.';

  const certCtaTitle =
    pageData?.certCtaTitle || pageData?.ctaTitle;

  const certCtaDescription =
    pageData?.certCtaDescription || pageData?.ctaDescription;

  const certCtaButtonLabel =
    pageData?.certCtaButtonLabel || pageData?.buttonLabel;

  const certCtaButtonUrl =
    pageData?.certCtaButtonUrl ||
    pageData?.buttonUrl ||
    '/contact';

  const [certCode, setCertCode] = useState('');
  const [searchedCode, setSearchedCode] = useState('');
  const [searchedCert, setSearchedCert] = useState<Certificate | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [stats,setStats]=useState<{issued:number;valid:number;programs:number;updatedAt:string}|null>(null);
  const displayStats={
    issued:pageData?.certStatIssuedMode==='manual'?(pageData.certStatIssuedManual||'—'):(stats?.issued??'—'),
    valid:pageData?.certStatValidMode==='manual'?(pageData.certStatValidManual||'—'):(stats?.valid??'—'),
    programs:pageData?.certStatProgramsMode==='manual'?(pageData.certStatProgramsManual||'—'):(stats?.programs??'—'),
    updatedAt:pageData?.certStatUpdatedMode==='manual'?(pageData.certStatUpdatedManual||'—'):(stats?.updatedAt?new Date(stats.updatedAt).toLocaleDateString('vi-VN'):'—')
  };
  const [scanOpen,setScanOpen]=useState(false);
  const [scanError,setScanError]=useState('');
  const videoRef=useRef<HTMLVideoElement|null>(null);
  useEffect(()=>{fetch('/api/cms?collection=certificates&stats=1').then(r=>r.json()).then(d=>{if(d?.ok&&d.stats)setStats(d.stats)}).catch(()=>{})},[]);

  const handleLookup = async (codeToSearch?: string) => {
    const target = (codeToSearch ?? certCode)
      .trim()
      .toUpperCase();

    if (!target) {
      setErrorMsg('Vui lòng nhập mã Giấy chứng nhận để tra cứu');
      return;
    }

    setHasSearched(true);
    setErrorMsg('');
    setSearchedCode(target);
    setSearchedCert(null);

    // =====================================================
    // 1. TRA DỮ LIỆU TRỰC TIẾP TRÊN WEBSITE SKY FIRST
    // =====================================================

    const dynamicFound =
      certificates[target] ||
      Object.values(certificates).find(
        (c: Certificate) =>
          c.code?.toUpperCase() === target
      );

    if (dynamicFound) {
      setSearchedCert(dynamicFound);
      onShowToast(`Đã tìm thấy Giấy chứng nhận: ${target}`);
      return;
    }

    // Chỉ tra đúng mã được yêu cầu; public không tải toàn bộ kho chứng nhận/PII vào trình duyệt.
    try {
      const localResponse = await fetch(`/api/cms?collection=certificates&id=${encodeURIComponent(target)}`, { cache: 'no-store' });
      const localPayload = await localResponse.json().catch(() => null);
      if (localResponse.ok && localPayload?.item) {
        setSearchedCert(localPayload.item as Certificate);
        onShowToast(`Đã tìm thấy Giấy chứng nhận: ${target}`);
        return;
      }
    } catch {
      // Tiếp tục thử các nguồn tra cứu liên kết bên dưới.
    }

    // =====================================================
    // 2. HÀM CHUẨN HÓA DỮ LIỆU TỪ CÁC HỆ THỐNG
    // =====================================================

    type LookupSource = {
      name: string;
      url: string;
      adapt: (payload: any) => Certificate | null;
    };

    const normalizeStatus = (
      value: unknown
    ): Certificate['status'] => {
      const x = String(value || '').toLowerCase();

      if (
        [
          'revoked',
          'revoke',
          'cancelled',
          'canceled',
          'invalid'
        ].includes(x)
      ) {
        return 'revoked';
      }

      if (x === 'test') {
        return 'test';
      }

      return 'valid';
    };

    const makeCert = (
      item: any,
      sourceSystem: string,
      fallbackIssuer: string
    ): Certificate | null => {
      if (!item) return null;

      const code =
        item.code ||
        item.certificate_no ||
        item.certificateNo ||
        item.verify_code ||
        item.verifyCode;

      if (!code) return null;

      let metadata: any = {};

      if (typeof item.metadata_json === 'string') {
        try {
          metadata = JSON.parse(item.metadata_json);
        } catch {
          metadata = {};
        }
      } else if (
        item.metadata_json &&
        typeof item.metadata_json === 'object'
      ) {
        metadata = item.metadata_json;
      }

      const hoursRaw =
        item.hoursCompleted ??
        item.hours_completed ??
        metadata.hours_completed ??
        metadata.hoursCompleted;

      const hoursNumber =
        hoursRaw !== undefined &&
        hoursRaw !== null &&
        hoursRaw !== ''
          ? Number(hoursRaw)
          : undefined;

      return {
        code: String(code),

        recipientName:
          item.full_name ||
          item.fullName ||
          item.recipientName ||
          item.recipient_name ||
          item.name ||
          '',

        programTitle:
          item.program ||
          item.program_name ||
          item.activity ||
          item.activity_name ||
          item.title ||
          item.content ||
          item.cert_type ||
          item.type ||
          'Giấy chứng nhận',

        programType:
          item.programType ||
          item.program_type ||
          'Chứng Nhận Cống Hiến',

        certificateType:
          item.certificateType ||
          item.certificate_type ||
          item.cert_type ||
          item.type ||
          '',

        sourceSystem,

        role:
          item.role ||
          metadata.role ||
          '',

        issuer:
          item.unit_name ||
          item.unitName ||
          item.issuer ||
          item.organization ||
          metadata.unit_name ||
          metadata.issuer ||
          fallbackIssuer,

        issueDate:
          item.issued_at ||
          item.issuedAt ||
          item.issueDate ||
          item.issue_date ||
          '',

        expiryDate:
          item.expiryDate ||
          item.expiry_date ||
          item.expires_at ||
          item.expiresAt ||
          undefined,

        status: normalizeStatus(
          item.status ||
          item.verification_status ||
          item.verificationStatus ||
          (item.valid === false ? 'revoked' : 'valid')
        ),

        grade:
          item.grade ||
          item.rank ||
          metadata.grade ||
          undefined,

        hoursCompleted:
          hoursNumber !== undefined &&
          Number.isFinite(hoursNumber)
            ? hoursNumber
            : undefined,

        verificationUrl:
          window.location.href,

        signatory: {
          name:
            item.signatory?.name ||
            item.signer ||
            metadata.signer ||
            '',

          title:
            item.signatory?.title ||
            item.signer_title ||
            item.signerTitle ||
            metadata.signer_title ||
            ''
        }
      };
    };

    // =====================================================
    // 3. CÁC HỆ THỐNG TRA CỨU LIÊN THÔNG
    // =====================================================
    //
    // Member KHÔNG nằm ở đây.
    // Member là hệ thống tài khoản / hồ sơ cá nhân,
    // không phải nguồn tra cứu GCN công khai.
    //
    // Thứ tự:
    // CTT -> SFEC -> TNV -> NHN
    //
    // Nếu 1 cổng lỗi, hệ thống vẫn tiếp tục thử cổng sau.
    // =====================================================

    const sources: LookupSource[] = [
      {
        name: 'Cổng Thông tin Sky First Network',

        url:
          import.meta.env.VITE_CTT_CERTIFICATE_LOOKUP_URL ||
          'https://ctt.skyfirst.io.vn/api/lookup/certificate',

        adapt: p =>
          makeCert(
            p?.payload?.item ||
              p?.payload?.certificate ||
              p?.item ||
              p?.certificate ||
              p?.data,

            'Cổng Thông tin Sky First Network',
            'Sky First Network'
          )
      },

      {
        name: 'The Sky First English Club (SFEC)',

        url:
            import.meta.env.VITE_SFEC_CERTIFICATE_LOOKUP_URL ||
          'https://sfec.skyfirst.io.vn/api/lookup/certificate',

        adapt: p =>
          makeCert(
            p?.payload?.item ||
              p?.payload?.certificate ||
              p?.item ||
              p?.certificate ||
              p?.data,

            'The Sky First English Club (SFEC)',
            'The Sky First English Club (SFEC)'
          )
      },

      {
        name: 'Cổng Tình nguyện viên Sky First Network',

        url:
          import.meta.env.VITE_TNV_CERTIFICATE_LOOKUP_URL ||
          'https://tnv.skyfirst.io.vn/api/public/certificates/lookup',

        adapt: p =>
          makeCert(
            p?.payload?.item ||
              p?.payload?.certificate ||
              p?.certificate ||
              p?.item ||
              p?.data,

            'Cổng Tình nguyện viên Sky First Network',
            'Sky First Network'
          )
      },

      {
        name: 'Nhà Hán Ngữ',

        url:
  import.meta.env.VITE_NHN_CERTIFICATE_LOOKUP_URL ||
  'https://app.nhahanngu.io.vn/api/lookup/certificate',

        adapt: p =>
          makeCert(
            p?.payload?.item ||
              p?.payload?.certificate ||
              p?.item ||
              p?.certificate ||
              p?.data,

            'Nhà Hán Ngữ',
            'Nhà Hán Ngữ'
          )
      }
    ];

    // =====================================================
    // 4. THỰC HIỆN TRA CỨU
    // =====================================================

    let unavailable = 0;

    for (const source of sources) {
      try {
        const separator =
          source.url.includes('?') ? '&' : '?';

        const response = await fetch(
          `${source.url}${separator}code=${encodeURIComponent(target)}`,
          {
            cache: 'no-store',
            headers: {
              Accept: 'application/json'
            }
          }
        );

        // Không có ở nguồn này -> thử nguồn tiếp theo.
        if (response.status === 404) {
          continue;
        }

        // Nguồn lỗi -> vẫn thử nguồn tiếp theo.
        if (!response.ok) {
          unavailable += 1;
          continue;
        }

        const payload = await response.json();

        const cert = source.adapt(payload);

        if (cert) {
          setSearchedCert(cert);

          onShowToast(
            `Đã tìm thấy Giấy chứng nhận: ${target}`
          );

          return;
        }
      } catch {
        unavailable += 1;
      }
    }

    // =====================================================
    // 5. KHÔNG TÌM THẤY
    // =====================================================

    setErrorMsg(
      unavailable === sources.length
        ? 'Các nguồn tra cứu liên thông đang tạm thời không phản hồi. Vui lòng thử lại sau.'
        : `Không tìm thấy Giấy chứng nhận có mã ${target} trong các hệ thống đã kết nối.`
    );
  };

  const handleCopyCode = () => {
    if (!searchedCert) return;

    navigator.clipboard.writeText(searchedCert.code);

    onShowToast(
      'Đã sao chép mã chứng nhận!'
    );
  };

  const handleReset = () => {
    setCertCode('');
    setSearchedCode('');
    setSearchedCert(null);
    setHasSearched(false);
    setErrorMsg('');
  };


  useEffect(()=>{if(!scanOpen)return;let stream:MediaStream|undefined;let timer:number|undefined;let stopped=false;const run=async()=>{try{setScanError('');const Detector=(window as any).BarcodeDetector;if(!Detector)throw new Error('Trình duyệt này chưa hỗ trợ quét QR trực tiếp. Bạn vẫn có thể nhập mã thủ công.');stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}const detector=new Detector({formats:['qr_code']});timer=window.setInterval(async()=>{if(stopped||!videoRef.current)return;try{const result=await detector.detect(videoRef.current);const raw=String(result?.[0]?.rawValue||'').trim();if(!raw)return;let code=raw;try{const u=new URL(raw);code=u.searchParams.get('code')||u.pathname.split('/').filter(Boolean).pop()||raw}catch{}stopped=true;if(timer)window.clearInterval(timer);stream?.getTracks().forEach(t=>t.stop());setScanOpen(false);setCertCode(code.toUpperCase());void handleLookup(code)}catch{}},650)}catch(e:any){setScanError(e?.message||'Không thể mở camera.');}};void run();return()=>{stopped=true;if(timer)window.clearInterval(timer);stream?.getTracks().forEach(t=>t.stop())}},[scanOpen]);

  return (
    <div className="bg-[#F5F9FD] pb-16">
      <section className="relative overflow-hidden border-b border-sky-100 bg-gradient-to-br from-white via-sky-50 to-[#DDEEFF]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#0B66C3]/15 blur-3xl"/>
        <div className="pointer-events-none absolute bottom-[-140px] left-[42%] h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl"/>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3.5 py-1.5 text-xs font-black text-[#0B66C3] shadow-sm"><ShieldCheck size={14}/>{badgeText}</div>
            <h1 className="mt-5 text-4xl font-black tracking-[-.045em] text-slate-950 sm:text-5xl lg:text-6xl">{titleText}<span className="block text-[#0B66C3]">Sky First Network</span></h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{summaryText}</p>
            <div className="mt-7 rounded-[26px] border border-white bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,94,160,.12)] sm:p-5">
              <label className="text-xs font-black uppercase tracking-wide text-slate-800">{searchLabel}</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={certCode} onChange={e=>{setCertCode(e.target.value.toUpperCase());if(errorMsg)setErrorMsg('')}} onKeyDown={e=>{if(e.key==='Enter')void handleLookup()}} placeholder={searchPlaceholder} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 font-mono text-sm font-bold uppercase tracking-wider outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"/></div><button onClick={()=>void handleLookup()} className="min-h-12 rounded-2xl bg-[#0B66C3] px-6 text-sm font-black text-white shadow-lg shadow-sky-900/10">{searchButtonLabel} →</button><button onClick={()=>setScanOpen(true)} className="min-h-12 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-black text-[#0B66C3] sm:hidden"><Camera size={17} className="inline mr-2"/>Quét QR</button></div>
              {guidanceNote&&<p className="mt-2 text-[11px] leading-5 text-slate-500">{guidanceNote}</p>}
              {errorMsg&&<div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"><AlertCircle size={15}/>{errorMsg}</div>}
            </div>
          </div>
          <div className="relative min-h-[330px]">
            <div className="absolute inset-4 rotate-[-5deg] rounded-[28px] border border-sky-200 bg-white/55 shadow-xl"/>
            <div className="absolute inset-x-8 inset-y-3 rotate-[4deg] rounded-[28px] border border-sky-200 bg-white/70 shadow-xl"/>
            <div className="relative mx-auto mt-6 max-w-lg rounded-[30px] border border-sky-200 bg-white p-7 shadow-[0_28px_70px_rgba(15,94,160,.18)]">
              <div className="flex items-start justify-between"><div><img src="/brand/sky-first-network-web.png" alt="Sky First" className="h-12 w-auto object-contain"/><div className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#0B66C3]">Giấy chứng nhận điện tử</div><div className="mt-2 text-3xl font-black text-slate-950">Xác thực nhanh.<br/>Đối chiếu minh bạch.</div></div><div className="grid h-16 w-16 place-items-center rounded-2xl bg-sky-50 text-[#0B66C3]"><QrCode size={34}/></div></div>
              <div className="mt-8 h-2 rounded-full bg-gradient-to-r from-[#0B66C3] via-cyan-400 to-sky-100"/>
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 size={22}/><div><b className="block text-sm">Xác thực chính thức</b><span className="text-xs">Chỉ hiển thị dữ liệu đã được ghi nhận.</span></div></div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[displayStats.issued,'GCN đã phát hành',Award],[displayStats.valid,'Đang hợp lệ',ShieldCheck],[displayStats.programs,'Chương trình có GCN',Building],[displayStats.updatedAt,'Cập nhật gần nhất',Calendar]].map(([value,label,Icon]:any)=><div key={label} className="rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-50 text-[#0B66C3]"><Icon size={20}/></span><div><div className="text-2xl font-black tabular-nums text-slate-950">{value}</div><div className="text-xs font-bold text-slate-500">{label}</div></div></div></div>)}</div></div>
      </section>

      {scanOpen&&<div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 p-4"><div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-4"><div><h3 className="font-black">Quét QR Giấy chứng nhận</h3><p className="text-xs text-slate-500">Đưa QR vào giữa khung camera.</p></div><button onClick={()=>setScanOpen(false)} className="rounded-xl p-2 hover:bg-slate-100"><X size={20}/></button></div><div className="relative aspect-square bg-black"><video ref={videoRef} playsInline muted className="h-full w-full object-cover"/><div className="pointer-events-none absolute inset-[14%] rounded-3xl border-2 border-cyan-300 shadow-[0_0_0_999px_rgba(0,0,0,.25)]"/></div>{scanError&&<div className="p-4 text-sm text-rose-600">{scanError}</div>}</div></div>}

      {/* ================================================= */}
      {/* KẾT QUẢ TRA CỨU */}
      {/* ================================================= */}

      {hasSearched && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">

          {searchedCert ? (

            <div className="bg-white rounded-3xl border border-emerald-300 shadow-sm p-6 sm:p-8 space-y-6">

              {/* Header Card */}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">

                <div className="flex items-center gap-2.5">

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    searchedCert.status === 'revoked'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>

                    {searchedCert.status === 'revoked' ? (
                      <AlertCircle size={22} />
                    ) : (
                      <CheckCircle2 size={22} />
                    )}

                  </div>

                  <div>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ${
                        searchedCert.status === 'revoked'
                          ? 'text-rose-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {searchedCert.status === 'revoked'
                        ? 'Giấy chứng nhận đã thu hồi'
                        : 'Giấy chứng nhận hợp lệ'}
                    </span>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 font-mono">
                      {searchedCert.code}
                    </h3>

                  </div>

                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition"
                    title="Sao chép mã"
                  >
                    <Copy size={13} />
                    <span>Sao chép mã</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition"
                    title="Tra cứu mã khác"
                  >
                    <RotateCcw size={13} />
                    <span>Làm mới</span>
                  </button>

                </div>

              </div>

              {/* Thông tin chính */}

              <div className="space-y-4">

                <div>
                  <div className="text-xs font-medium text-slate-500">
                    Họ và tên người nhận
                  </div>

                  <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                    {searchedCert.recipientName || 'Chưa có thông tin'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-1">

                  <div className="text-xs font-semibold text-[#0284C7]">
                    Chương trình / Chiến dịch
                  </div>

                  <div className="text-base font-extrabold text-slate-900">
                    {searchedCert.programTitle || 'Giấy chứng nhận'}
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    Loại giấy:{' '}
                    <span className="text-slate-800 font-semibold">
                      {searchedCert.certificateType ||
                        searchedCert.programType ||
                        'Giấy chứng nhận'}
                    </span>
                  </div>

                </div>

                {/* Danh sách thông số */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-xs">

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">

                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Building
                        size={14}
                        className="text-[#0284C7]"
                      />
                      Đơn vị cấp
                    </span>

                    <span className="font-bold text-slate-900 block leading-snug">
                      {searchedCert.issuer ||
                        'Sky First Network'}
                    </span>

                  </div>

                  {searchedCert.sourceSystem && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">

                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <ShieldCheck
                          size={14}
                          className="text-[#0284C7]"
                        />
                        Nguồn dữ liệu
                      </span>

                      <span className="font-bold text-slate-900 block">
                        {searchedCert.sourceSystem}
                      </span>

                    </div>
                  )}

                  {searchedCert.issueDate && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">

                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <Calendar
                          size={14}
                          className="text-emerald-600"
                        />
                        Ngày cấp chứng nhận
                      </span>

                      <span className="font-bold text-slate-900 block font-mono">
                        {searchedCert.issueDate}
                      </span>

                    </div>
                  )}

                  {searchedCert.hoursCompleted !== undefined && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">

                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <Clock
                          size={14}
                          className="text-amber-600"
                        />
                        Thời lượng / Cống hiến
                      </span>

                      <span className="font-bold text-slate-900 block">
                        {searchedCert.hoursCompleted} giờ
                      </span>

                    </div>
                  )}

                  {searchedCert.grade && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">

                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <Award
                          size={14}
                          className="text-indigo-600"
                        />
                        Xếp loại / Danh hiệu
                      </span>

                      <span className="font-bold text-emerald-700 block">
                        {searchedCert.grade}
                      </span>

                    </div>
                  )}

                </div>

                {(searchedCert.signatory?.name ||
                  searchedCert.signatory?.title) && (
                  <div className="pt-2 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-100">

                    <span>
                      Người ký:{' '}
                      <strong>
                        {searchedCert.signatory?.name ||
                          'Chưa cập nhật'}
                      </strong>

                      {searchedCert.signatory?.title
                        ? ` (${searchedCert.signatory.title})`
                        : ''}
                    </span>

                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      Đã số hóa
                    </span>

                  </div>
                )}

              </div>

            </div>

          ) : (

            <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-6 sm:p-8 text-center space-y-4">

              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <AlertCircle size={28} />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">

                <h3 className="text-lg font-black text-slate-900">
                  Không Tìm Thấy Thông Tin Chứng Nhận
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Hệ thống không tìm thấy hồ sơ dữ liệu tương ứng với mã{' '}
                  <strong className="font-mono text-slate-900">
                    "{searchedCode}"
                  </strong>.
                </p>

                <p className="text-xs text-slate-500 pt-1">
                  Vui lòng kiểm tra lại tính chính xác của mã Giấy chứng nhận hoặc liên hệ Sky First Network để được hỗ trợ kiểm tra.
                </p>

              </div>

              <div className="pt-2">

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Thử tra cứu mã khác</span>
                </button>

              </div>

            </div>

          )}

        </section>
      )}

      {/* ================================================= */}
      {/* QUY CHUẨN MINH BẠCH */}
      {/* ================================================= */}

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">

        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-5">

          <div className="space-y-1">

            <div className="flex items-center gap-2 text-xs font-black text-[#0284C7] uppercase">

              <ShieldCheck
                size={16}
                className="text-[#0284C7]"
              />

              <span>{certFeature1Title}</span>

            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {certFeature1Desc}
            </p>

          </div>

          <div className="space-y-1">

            <div className="flex items-center gap-2 text-xs font-black text-emerald-700 uppercase">

              <FileCheck
                size={16}
                className="text-emerald-500"
              />

              <span>{certFeature2Title}</span>

            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {certFeature2Desc}
            </p>

          </div>

          <div className="space-y-1">

            <div className="flex items-center gap-2 text-xs font-black text-amber-700 uppercase">

              <Sparkles
                size={16}
                className="text-amber-500"
              />

              <span>{certFeature3Title}</span>

            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {certFeature3Desc}
            </p>

          </div>

        </div>

      </section>

      {/* ================================================= */}
      {/* NỘI DUNG BỔ SUNG */}
      {/* ================================================= */}

      {(pageData?.contentFormatted ||
        pageData?.content) && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <div
            className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs text-xs sm:text-sm text-slate-700 leading-relaxed formatted-content prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(pageData.contentFormatted || pageData.content)
            }}
          />

        </section>
      )}

      {/* ================================================= */}
      {/* CTA HỖ TRỢ */}
      {/* ================================================= */}

      {certCtaTitle && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">

          <div className="p-7 sm:p-8 rounded-3xl bg-linear-to-br from-sky-900 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">

            <div className="space-y-1.5 text-center sm:text-left">

              <h3 className="text-lg sm:text-xl font-black tracking-tight">
                {certCtaTitle}
              </h3>

              {certCtaDescription && (
                <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed max-w-xl font-normal">
                  {certCtaDescription}
                </p>
              )}

            </div>

            {(certCtaButtonLabel ||
              pageData?.buttonLabel) && (
              <a
                href={
                  certCtaButtonUrl ||
                  pageData?.buttonUrl ||
                  '/contact'
                }
                className="px-5 py-2.5 rounded-xl bg-white text-sky-900 hover:bg-sky-50 font-bold text-xs transition shadow-sm whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <span>
                  {certCtaButtonLabel ||
                    pageData?.buttonLabel ||
                    'Liên Hệ Ban Chấp hành'}
                </span>
              </a>
            )}

          </div>

        </section>
      )}

    </div>
  );
};


// --- Consolidated from src/pages/SponsorPage.tsx ---

interface SponsorPageProps{onNavigate:(page:PageRoute)=>void;onShowToast:(msg:string)=>void;}

const cleanAmount=(value:string)=>value.replace(/\D/g,'').slice(0,13);
const formatMoney=(value:string)=> value ? new Intl.NumberFormat('vi-VN').format(Number(value))+' ₫' : '';

export const SponsorPage:React.FC<SponsorPageProps>=({onNavigate,onShowToast})=>{
  const {customPages,siteConfig}=useDataContext();
  const p=customPages.find(x=>x.slug==='sponsor'||x.id==='page-sponsor');
  const [amount,setAmount]=useState('');
  const [transferNote,setTransferNote]=useState(p?.sponsorTransferSyntax||'');
  const [confirmed,setConfirmed]=useState(false);
  const [partnerForm,setPartnerForm]=useState<any|null>(null);
  const [partnerAnswers,setPartnerAnswers]=useState<Record<string,any>>({});
  const [partnerSending,setPartnerSending]=useState(false);
  const [partnerUploading,setPartnerUploading]=useState('');
  const [partnerCode,setPartnerCode]=useState('');
  useEffect(()=>{fetch('/api/forms?slug=hop-tac-dong-hanh').then(async r=>{const d=await r.json();if(r.ok&&d?.ok)setPartnerForm(d.item)}).catch(()=>{})},[]);
  const goalAmount=Number(String(p?.sponsorGoalAmount||'').replace(/\D/g,''))||0;
  const receivedAmount=Number(String(p?.sponsorReceivedAmount||'').replace(/\D/g,''))||0;
  const progress=goalAmount>0?Math.min(100,Math.max(0,(receivedAmount/goalAmount)*100)):0;

  const suggested=useMemo(()=>String(p?.sponsorSuggestedAmounts||'50000,100000,200000,500000').split(',').map(x=>cleanAmount(x)).filter(Boolean),[p?.sponsorSuggestedAmounts]);
  const autoQr=useMemo(()=>{
    const bank=(p?.sponsorBankId||'').trim();
    const account=(p?.sponsorBankAccount||'').replace(/[^0-9A-Za-z]/g,'');
    if(!bank||!account) return '';
    const qs=new URLSearchParams();
    const money=cleanAmount(amount);
    if(money && Number(money)>0) qs.set('amount',money);
    if(transferNote.trim()) qs.set('addInfo',transferNote.trim().slice(0,25));
    if(p?.sponsorAccountHolder?.trim()) qs.set('accountName',p.sponsorAccountHolder.trim());
    return `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(account)}-compact2.png?${qs.toString()}`;
  },[p?.sponsorBankId,p?.sponsorBankAccount,p?.sponsorAccountHolder,amount,transferNote]);
  const qrSrc=autoQr || p?.sponsorQrCodeUrl || '';
  const contactRows=Array.isArray(siteConfig.footerContacts)?siteConfig.footerContacts:[];
  const findContact=(needle:string,fallback:string)=>contactRows.find(x=>String(x.label||'').toLocaleLowerCase('vi').includes(needle.toLocaleLowerCase('vi')))?.value||fallback;
  const partnershipEmail=findContact('Hợp tác','hoptac@skyfirst.io.vn');
  const publicHotline=findContact('Hotline',siteConfig.hotline||'0924 910 210');

  const copy=async(text:string,label:string)=>{try{await navigator.clipboard.writeText(text);onShowToast(`Đã sao chép ${label}.`)}catch{onShowToast(`Không thể tự động sao chép ${label}.`)} };
  const partnerVisible=(f:any)=>{const rule=f?.showWhen;if(!rule?.fieldId)return true;const current=partnerAnswers[rule.fieldId];return Array.isArray(current)?current.map(String).includes(String(rule.equals??'')):String(current??'')===String(rule.equals??'')};
  const partnerUpdate=(id:string,value:any)=>setPartnerAnswers(a=>({...a,[id]:value}));
  const uploadPartnerFile=async(field:any,file:File)=>{if(!partnerForm)return;setPartnerUploading(field.id);try{const fd=new FormData();fd.append('file',file);const r=await fetch(`/api/forms?upload=1&formId=${encodeURIComponent(partnerForm.id)}&fieldId=${encodeURIComponent(field.id)}`,{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error);partnerUpdate(field.id,d.url);onShowToast('Đã tải tài liệu lên.')}catch(err:any){onShowToast(err?.message||'Không thể tải tài liệu.')}finally{setPartnerUploading('')}};
  const submitPartnership=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!partnerForm){onShowToast('Biểu mẫu Hợp tác & Đồng hành chưa sẵn sàng.');return}
    setPartnerSending(true);
    try{
      const r=await fetch('/api/forms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({formId:partnerForm.id,answers:partnerAnswers})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d?.ok)throw new Error(d?.error||'Không thể gửi đề xuất.');
      setPartnerCode(d.applicationCode||'');setPartnerAnswers({});
      onShowToast(d?.message||'Đề xuất đã được tiếp nhận.');
    }catch(err:any){onShowToast(err?.message||`Không thể gửi đề xuất. Vui lòng liên hệ ${partnershipEmail}.`)}finally{setPartnerSending(false)}
  };
  const go=(url?:string)=>{
    if(!url) return;
    if(url.startsWith('#')){document.getElementById(url.slice(1))?.scrollIntoView({behavior:'smooth'});return;}
    if(url==='/contact'){onNavigate('contact');return;}
    window.open(url,'_blank','noopener,noreferrer');
  };
  const commitments=[1,2,3,4].map(i=>({title:(p as any)?.[`sponsorCommit${i}Title`],desc:(p as any)?.[`sponsorCommit${i}Desc`]})).filter(x=>x.title||x.desc);
  const packages=[1,2,3,4].map(i=>({title:(p as any)?.[`sponsorPkg${i}Title`],badge:(p as any)?.[`sponsorPkg${i}Badge`],unit:(p as any)?.[`sponsorPkg${i}Unit`],desc:(p as any)?.[`sponsorPkg${i}Desc`],impact:(p as any)?.[`sponsorPkg${i}Impact`]})).filter(x=>x.title||x.desc||x.impact);
  const faqs=[1,2,3,4].map(i=>({q:(p as any)?.[`sponsorFaq${i}Q`],a:(p as any)?.[`sponsorFaq${i}A`]})).filter(x=>x.q||x.a);

  return <main className="bg-white">
    <section className="bg-[#071B3A] text-white py-20 lg:py-24"><div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-sky-200"><HeartHandshake size={16}/>{p?.badge||'Tài trợ & Đồng hành'}</div>
      <h1 className="mt-6 max-w-4xl text-5xl lg:text-6xl font-black tracking-[-.045em]">{p?.title||'Đồng hành cùng Sky First Network'}</h1>
      {p?.summary&&<p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{p.summary}</p>}
      <div className="mt-8 flex flex-wrap gap-3">{p?.sponsorHeroPrimaryButtonLabel&&<button onClick={()=>go(p.sponsorHeroPrimaryButtonUrl)} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-[#071B3A]">{p.sponsorHeroPrimaryButtonLabel}<ArrowRight size={17}/></button>}{p?.sponsorHeroSecondaryButtonLabel&&<button onClick={()=>go(p.sponsorHeroSecondaryButtonUrl)} className="rounded-xl border border-white/25 px-5 py-3 font-bold">{p.sponsorHeroSecondaryButtonLabel}</button>}</div>
    </div></section>

    <section className="py-16 lg:py-20"><div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
      {(p?.contentFormatted||p?.content)&&<RichTextRenderer content={p?.contentFormatted||p?.content||''}/>} 

      <section id="de-xuat-dong-hanh" className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.75fr)]">
        <form onSubmit={submitPartnership} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-xs font-black uppercase tracking-[.16em] text-[#0B66C3]">Hợp tác & Đồng hành</div>
          <h2 className="mt-2 text-3xl font-black text-slate-950">{partnerForm?.title||'Gửi đề xuất đồng hành'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{partnerForm?.description||'Biểu mẫu được quản lý tập trung trong Form Builder. Không gửi mật khẩu, OTP hoặc thông tin tài chính nhạy cảm.'}</p>
          {!partnerForm?<div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">Đang tải biểu mẫu Hợp tác & Đồng hành…</div>:<div className="mt-6 space-y-4">
            {(partnerForm.fields||[]).filter(partnerVisible).map((f:any)=>{
              if(f.type==='section')return <h3 key={f.id} className="pt-2 text-lg font-black">{f.label}</h3>;
              if(f.type==='consent')return <label key={f.id} className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><input type="checkbox" checked={!!partnerAnswers[f.id]} onChange={e=>partnerUpdate(f.id,e.target.checked)} className="mt-1"/><span>{f.label}{f.required?' *':''}</span></label>;
              if(['file','image'].includes(f.type))return <label key={f.id} className="block text-sm font-bold">{f.label}{f.required?' *':''}<div className="mt-2 rounded-xl border border-dashed border-slate-300 p-4"><span className="inline-flex items-center gap-2 text-sm font-bold"><UploadCloud size={16}/>{partnerUploading===f.id?'Đang tải...':'Chọn tệp'}</span><input type="file" accept={f.type==='image'?'image/jpeg,image/png,image/webp':'image/jpeg,image/png,image/webp,application/pdf'} className="mt-2 block text-xs" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadPartnerFile(f,file)}}/>{partnerAnswers[f.id]&&<div className="mt-2 text-xs text-emerald-700">Đã tải tệp thành công.</div>}</div></label>;
              if(f.type==='select'||f.type==='radio')return <label key={f.id} className="block text-sm font-bold">{f.label}{f.required?' *':''}<select required={!!f.required} value={partnerAnswers[f.id]||''} onChange={e=>partnerUpdate(f.id,e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"><option value="">Chọn...</option>{(f.options||[]).map((o:string)=><option key={o} value={o}>{o}</option>)}</select></label>;
              if(f.type==='checkbox')return <div key={f.id}><div className="text-sm font-bold">{f.label}{f.required?' *':''}</div><div className="mt-2 grid gap-2 sm:grid-cols-2">{(f.options||[]).map((o:string)=>{const arr=Array.isArray(partnerAnswers[f.id])?partnerAnswers[f.id]:[];return <label key={o} className="flex gap-2 rounded-xl border p-3 text-sm"><input type="checkbox" checked={arr.includes(o)} onChange={e=>partnerUpdate(f.id,e.target.checked?[...arr,o]:arr.filter((x:string)=>x!==o))}/>{o}</label>})}</div></div>;
              const htmlType=['email','url','date','time','number'].includes(f.type)?f.type:f.type==='phone'?'tel':f.type==='datetime'?'datetime-local':'text';
              return <label key={f.id} className="block text-sm font-bold">{f.label}{f.required?' *':''}{f.type==='textarea'?<textarea required={!!f.required} rows={5} value={partnerAnswers[f.id]||''} onChange={e=>partnerUpdate(f.id,e.target.value)} placeholder={f.placeholder||''} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"/>:<input required={!!f.required} type={htmlType} value={partnerAnswers[f.id]||''} onChange={e=>partnerUpdate(f.id,e.target.value)} placeholder={f.placeholder||''} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"/>}</label>;
            })}
          </div>}
          <button disabled={partnerSending||!!partnerUploading||!partnerForm} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B66C3] px-5 py-3 font-black text-white disabled:opacity-60">{partnerSending?'Đang gửi...':'Gửi đề xuất'}</button>
          {partnerCode&&<div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">Mã hồ sơ: <strong className="font-mono">{partnerCode}</strong></div>}
        </form>
        <aside className="rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 lg:sticky lg:top-24 lg:self-start"><HeartHandshake className="text-[#0B66C3]"/><h3 className="mt-4 text-xl font-black">Kênh hợp tác chính thức</h3><p className="mt-2 text-sm leading-6 text-slate-600">Đề xuất hợp tác và đồng hành được ưu tiên tiếp nhận qua biểu mẫu hoặc email chuyên trách.</p><a href={`mailto:${partnershipEmail}`} className="mt-5 block rounded-xl bg-white p-4 font-black text-[#0B66C3] shadow-sm">{partnershipEmail}</a><a href={`tel:${publicHotline.replace(/\s/g,'')}`} className="mt-3 block rounded-xl bg-white p-4 font-black text-slate-900 shadow-sm">{publicHotline}</a></aside>
      </section>

      {commitments.length>0&&<section><div className="max-w-3xl"><h2 className="text-3xl font-black">{p?.sponsorCommitmentHeading||'Nguyên tắc tiếp nhận và minh bạch'}</h2>{p?.sponsorCommitmentSubtitle&&<p className="mt-3 text-slate-600 leading-7">{p.sponsorCommitmentSubtitle}</p>}</div><div className="mt-7 grid md:grid-cols-2 gap-4">{commitments.map((x,i)=><article key={i} className="rounded-2xl border border-slate-200 p-5"><ShieldCheck className="text-[#0B5FB4]"/><h3 className="mt-3 font-extrabold text-lg">{x.title}</h3>{x.desc&&<p className="mt-2 text-sm leading-6 text-slate-600">{x.desc}</p>}</article>)}</div></section>}

      {packages.length>0&&<section><h2 className="text-3xl font-black">{p?.sponsorPackagesHeading||'Các hình thức đồng hành'}</h2>{p?.sponsorPackagesSubtitle&&<p className="mt-3 text-slate-600">{p.sponsorPackagesSubtitle}</p>}<div className="mt-7 grid md:grid-cols-2 gap-4">{packages.map((x,i)=><article key={i} className="rounded-2xl border border-slate-200 p-5">{x.badge&&<div className="text-xs font-black uppercase tracking-wider text-[#0B5FB4]">{x.badge}</div>}<h3 className="mt-2 text-xl font-black">{x.title}</h3>{x.unit&&<div className="mt-2 text-sm font-semibold text-slate-500">{x.unit}</div>}{x.desc&&<p className="mt-3 text-sm leading-6 text-slate-600">{x.desc}</p>}{x.impact&&<p className="mt-3 text-sm rounded-xl bg-slate-50 p-3 text-slate-700">{x.impact}</p>}</article>)}</div></section>}

      {(p?.sponsorBankAccount||p?.sponsorQrCodeUrl)&&<section id="thong-tin-chuyen-khoan" className="rounded-[30px] border border-slate-200 bg-slate-50 p-6 lg:p-9"><div className="grid lg:grid-cols-[1fr_.9fr] gap-8">
        <div><div className="inline-flex items-center gap-2 text-[#0B5FB4] font-extrabold"><Building2 size={19}/>Thông tin chuyển khoản</div><h2 className="mt-3 text-3xl font-black">Tài trợ & Đồng hành</h2>
          {(goalAmount>0||receivedAmount>0)&&<div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4"><div className="flex items-end justify-between gap-3"><div><div className="text-xs font-bold text-sky-700">Nguồn lực đã ghi nhận</div><div className="mt-1 text-2xl font-black text-slate-900">{new Intl.NumberFormat('vi-VN').format(receivedAmount)} ₫</div></div>{goalAmount>0&&<div className="text-right"><div className="text-[11px] text-slate-500">Mục tiêu</div><div className="font-black">{new Intl.NumberFormat('vi-VN').format(goalAmount)} ₫</div></div>}</div>{goalAmount>0&&<><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#0B66C3] transition-all" style={{width:`${progress}%`}}/></div><div className="mt-2 flex justify-between text-[11px] font-bold text-slate-500"><span>{progress.toFixed(progress>=10?0:1)}%</span>{p?.sponsorPublicLedgerUrl&&<a href={p.sponsorPublicLedgerUrl} target="_blank" rel="noopener noreferrer" className="text-[#0B66C3] hover:underline">Xem công khai / đối soát</a>}</div></>}</div>}
          {p?.sponsorRecipientEntity&&<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-[11px] font-black uppercase tracking-wider text-amber-700">Chủ thể tiếp nhận nguồn lực</div><div className="mt-1 font-extrabold text-slate-900">{p.sponsorRecipientEntity}</div><p className="mt-1 text-xs leading-5 text-slate-600">Vui lòng đối chiếu đúng chủ thể, tên tài khoản và ngân hàng trước khi thực hiện giao dịch.</p></div>}
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100">
            {p?.sponsorBankName&&<div className="p-4"><div className="text-xs text-slate-400">Ngân hàng</div><div className="font-bold">{p.sponsorBankName}</div></div>}
            {p?.sponsorBankAccount&&<div className="p-4 flex items-center justify-between gap-3"><div><div className="text-xs text-slate-400">Số tài khoản</div><div className="font-black text-xl tracking-wide">{p.sponsorBankAccount}</div></div><button onClick={()=>copy(p.sponsorBankAccount||'','số tài khoản')} className="p-2.5 rounded-xl border border-slate-200" title={p?.sponsorCopyButtonLabel||'Sao chép số tài khoản'}><Copy size={18}/></button></div>}
            {p?.sponsorAccountHolder&&<div className="p-4"><div className="text-xs text-slate-400">Tên người nhận</div><div className="font-bold uppercase">{p.sponsorAccountHolder}</div></div>}
            {p?.sponsorBankBranch&&<div className="p-4"><div className="text-xs text-slate-400">Chi nhánh / ghi chú ngân hàng</div><div className="font-semibold">{p.sponsorBankBranch}</div></div>}
          </div>
          <div className="mt-6"><label className="text-sm font-bold">Số tiền muốn chuyển</label><input inputMode="numeric" value={amount} onChange={e=>setAmount(cleanAmount(e.target.value))} placeholder="Nhập số tiền (VNĐ)" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold"/>{amount&&<div className="mt-1 text-sm text-slate-500">{formatMoney(amount)}</div>}<div className="mt-3 flex flex-wrap gap-2">{suggested.map(v=><button key={v} onClick={()=>setAmount(v)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold">{formatMoney(v)}</button>)}</div></div>
          <div className="mt-5"><label className="text-sm font-bold">Nội dung chuyển khoản</label><input value={transferNote} onChange={e=>setTransferNote(e.target.value.slice(0,25))} maxLength={25} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder={p?.sponsorTransferSyntax||'Nội dung chuyển khoản'}/><div className="mt-1 text-xs text-slate-400">Tối đa 25 ký tự để tăng khả năng tương thích với mã chuyển khoản.</div></div>
          <label className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/><span>{p?.sponsorDonationNotice||'Vui lòng kiểm tra đúng tên người nhận, ngân hàng, số tài khoản, số tiền và nội dung trước khi xác nhận chuyển khoản. Website không tự động xác nhận đã nhận tiền chỉ dựa trên việc quét mã.'}</span></label>
        </div>
        <div className="rounded-3xl bg-white border border-slate-200 p-6 text-center"><div className="inline-flex items-center gap-2 font-black"><QrCode size={19}/>{p?.sponsorQrCodeTitle||'Mã QR chuyển khoản'}</div>{p?.sponsorQrCodeSubtitle&&<p className="mt-2 text-sm text-slate-500">{p.sponsorQrCodeSubtitle}</p>}{qrSrc?<div className={`mt-5 transition ${confirmed?'opacity-100':'opacity-35 pointer-events-none select-none'}`}><img src={qrSrc} alt="Mã QR chuyển khoản" className="mx-auto max-w-[320px] w-full rounded-2xl border border-slate-100"/><p className="mt-3 text-xs text-slate-400">Mã được tạo từ thông tin tài khoản đã công bố. Ứng dụng ngân hàng vẫn là nơi xác nhận giao dịch cuối cùng.</p></div>:<div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-10 text-slate-400">Chưa cấu hình mã QR hoặc thông tin ngân hàng đủ để tạo mã tự động.</div>}</div>
      </div></section>}

      <section className="rounded-[28px] border border-slate-200 bg-white p-7 lg:p-9 grid lg:grid-cols-[1fr_.8fr] gap-8"><div><CheckCircle2 className="text-[#0B5FB4]"/><h2 className="mt-5 text-3xl font-black">{p?.sponsorContactHeading||p?.sponsorContactLeadTitle||'Liên hệ trao đổi'}</h2>{p?.sponsorContactDescription&&<p className="mt-3 text-slate-600 leading-7">{p.sponsorContactDescription}</p>}</div><div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 space-y-4">{(p?.sponsorContactEmail||p?.sponsorEmail||partnershipEmail)&&<div className="flex gap-3"><Mail className="text-[#0B5FB4]" size={20}/><div><div className="text-xs text-slate-400">Email hợp tác</div><a className="font-bold" href={`mailto:${p?.sponsorContactEmail||p?.sponsorEmail||partnershipEmail}`}>{p?.sponsorContactEmail||p?.sponsorEmail||partnershipEmail}</a></div></div>}{(p?.sponsorContactHotline||p?.sponsorHotline||publicHotline)&&<div className="flex gap-3"><Phone className="text-[#0B5FB4]" size={20}/><div><div className="text-xs text-slate-400">Điện thoại liên hệ</div><a className="font-bold" href={`tel:${String(p?.sponsorContactHotline||p?.sponsorHotline||publicHotline).replace(/\s/g,'')}`}>{p?.sponsorContactHotline||p?.sponsorHotline||publicHotline}</a></div></div>}{p?.sponsorContactButtonLabel&&<button onClick={()=>go(p.sponsorContactButtonUrl)} className="w-full rounded-xl bg-[#0B5FB4] px-5 py-3 text-white font-bold">{p.sponsorContactButtonLabel}</button>}</div></section>

      {faqs.length>0&&<section><h2 className="text-3xl font-black">{p?.sponsorFaqHeading||'Câu hỏi thường gặp'}</h2>{p?.sponsorFaqSubtitle&&<p className="mt-3 text-slate-600">{p.sponsorFaqSubtitle}</p>}<div className="mt-6 space-y-3">{faqs.map((x,i)=><details key={i} className="rounded-2xl border border-slate-200 p-5"><summary className="cursor-pointer font-extrabold">{x.q}</summary>{x.a&&<p className="mt-3 text-sm leading-6 text-slate-600">{x.a}</p>}</details>)}</div></section>}

      {(p?.sponsorCtaTitle||p?.buttonLabel)&&<section className="rounded-[30px] bg-[#071B3A] p-8 lg:p-10 text-white"><h2 className="text-3xl font-black">{p?.sponsorCtaTitle}</h2>{p?.sponsorCtaDescription&&<p className="mt-3 max-w-3xl text-slate-300 leading-7">{p.sponsorCtaDescription}</p>}<div className="mt-6 flex flex-wrap gap-3">{p?.buttonLabel&&<button onClick={()=>go(p.buttonUrl)} className="rounded-xl bg-white px-5 py-3 font-bold text-[#071B3A]">{p.buttonLabel}</button>}{p?.secondaryButtonLabel&&<button onClick={()=>go(p.secondaryButtonUrl)} className="rounded-xl border border-white/25 px-5 py-3 font-bold">{p.secondaryButtonLabel}</button>}</div></section>}
    </div></section>
  </main>;
};
