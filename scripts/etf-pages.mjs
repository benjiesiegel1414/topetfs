// Static ETF pages: /etfs/<ticker> (overview + live price), /etfs/<ticker>-dividend-calculator,
// /etfs/<ticker>-alternatives and the /etfs/ A-Z directory. Rebuilt daily with fresh data.
import { createRequire } from "node:module";
const TES=createRequire(import.meta.url)("../assets/js/screener.js");
export const etfSlug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-");
export const etfPath=s=>"/etfs/"+etfSlug(s);

export function buildEtfPages({page,out,esc,F,ALL,SITE,ARTICLES,proBand}){
const R=TES.rows(ALL);
const BY={};R.forEach(r=>BY[r.sym]=r);
const SYMS=R.map(r=>r.sym).sort();
const INC=R.filter(r=>r.yield!=null);
const N=R.length;
const PRO="https://topdividendetfspro.com/";
const pct=(v,d)=>F.pct(v,d), sg=v=>F.signed(v), aum=v=>F.aum(v);
const usd=(v,d)=>v==null||isNaN(v)?"n/a":"$"+v.toLocaleString("en-US",{minimumFractionDigits:d==null?(Math.abs(v)<100?2:0):d,maximumFractionDigits:d==null?(Math.abs(v)<100?2:0):d});
const L=(sym,f,fmt,mul)=>{const r=BY[sym];let v=f==="inc10"?r.yield:r[f];const src=f==="inc10"?"yield":f;if(v==null)return "n/a";if(mul)v=v*mul;return `<span class="live" data-live="${sym}:${src}" data-fmt="${fmt}"${mul?` data-mul="${mul}"`:""}>${esc(F[fmt](v))}</span>`;};
const PER={Weekly:52,Monthly:12,Quarterly:4,"Semi-annual":2,"Semi-Annual":2,Annual:1};
const perN=r=>PER[r.freq]||4;
const incDate=r=>r.inception?r.inception.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):null;
const yrs=r=>r.age!=null?(r.age>=2?Math.floor(r.age)+" years":r.age>=1?"about a year":Math.max(1,Math.round(r.age*12))+" months"):null;
function rank(list,sym,key,asc){const l=list.filter(x=>x[key]!=null).sort((a,b)=>asc?a[key]-b[key]:b[key]-a[key]);const i=l.findIndex(x=>x.sym===sym);return i<0?null:{n:i+1,of:l.length,pctl:Math.round((1-i/Math.max(1,l.length-1))*100)};}
const STOP=new Set("etf etfs fund trust shares the of and & income strategy daily option 2x 1x target term".split(" "));
const words=r=>new Set(r.name.toLowerCase().replace(/[^a-z0-9& ]/g," ").split(/\s+/).filter(w=>w&&!STOP.has(w)&&!r.provider.toLowerCase().split(/\s+/).includes(w)));
const W={};R.forEach(r=>W[r.sym]=words(r));
function peers(r,k){
  const isInc=r.yield!=null;
  return R.filter(x=>x.sym!==r.sym&&(x.yield!=null)===isInc).map(x=>{
    let s=0;const a=W[r.sym],b=W[x.sym];let sh=0;a.forEach(w=>{if(b.has(w))sh++;});s+=sh/Math.max(1,Math.min(a.size,b.size))*3;
    if(isInc&&r.yield>0&&x.yield>0)s-=Math.abs(Math.log(x.yield/r.yield))*1.6;
    if(r.freq&&x.freq===r.freq)s+=.6;
    if(r.provider&&x.provider===r.provider)s+=.3;
    if(r.aum&&x.aum)s-=Math.abs(Math.log10(x.aum/r.aum))*.25;
    if(x.aum)s+=Math.min(.6,Math.log10(x.aum)/18);
    if(r.decay!=null&&x.decay===r.decay)s+=.2;
    return {x,s};}).sort((p,q)=>q.s-p.s).slice(0,k).map(o=>o.x);
}
const CSS=`<style>
.ep-head{background:var(--paper);border-bottom:1px solid var(--rule);padding:26px 0 0}
.ep-top{display:grid;grid-template-columns:1.2fr 1fr;gap:28px;align-items:start}
.ep-tk{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ep-tk h1{font-family:var(--serif);font-size:44px;line-height:1;margin:0;letter-spacing:-.02em}
.ep-name{font-size:18px;color:var(--ink-2);margin:10px 0 12px}
.ep-badges{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}
.ep-badge{font-size:12px;font-weight:800;border-radius:999px;padding:4px 10px;background:var(--canvas);border:1px solid var(--rule);color:var(--ink-2)}
.ep-badge.good{color:var(--pos);background:color-mix(in srgb,var(--pos) 10%,transparent);border-color:transparent}
.ep-badge.bad{color:var(--neg);background:color-mix(in srgb,var(--neg) 10%,transparent);border-color:transparent}
.ep-hl{display:flex;gap:26px;flex-wrap:wrap;margin:4px 0 6px}
.ep-hl .live,.ep-stats .live{font:inherit;color:inherit}
.ep-top>div{min-width:0}
.ep-hl div b{display:block;font-family:var(--serif);font-size:34px;line-height:1;font-variant-numeric:tabular-nums}
.ep-hl div span{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.ep-price{background:var(--paper);border:1px solid var(--rule);border-radius:12px;padding:10px 10px 4px;min-height:236px}
.ep-price .lbl{display:flex;justify-content:space-between;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:2px 4px 6px}
.ep-price [data-tv]{min-height:200px;display:grid;place-items:center;color:var(--muted);font-size:13px}
.ep-tabs{display:flex;gap:4px;margin-top:20px;overflow-x:auto;scrollbar-width:none}
.ep-tabs a{padding:11px 16px;font-weight:800;font-size:14.5px;color:var(--muted);border-bottom:3px solid transparent;white-space:nowrap}
.ep-tabs a:hover{color:var(--ink);text-decoration:none}
.ep-tabs a[aria-current]{color:var(--ink);border-bottom-color:var(--navy)}
[data-theme="dark"] .ep-tabs a[aria-current]{border-bottom-color:#f2c14e}
.ep-body{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:34px;margin-top:28px}
.ep-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--rule);border:1px solid var(--rule);border-radius:12px;overflow:hidden}
.ep-stats>div{background:var(--paper);padding:14px 16px}
.ep-stats .k{font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.ep-stats .v{font-size:22px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}
.ep-stats .s{font-size:12.5px;color:var(--muted);margin-top:2px}
.ep-h2{font-family:var(--serif);font-size:26px;margin:34px 0 12px}
.ep-prose{font-size:17px;line-height:1.7;color:var(--ink)}
.ep-prose p{margin:0 0 1em}
.ep-rank{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.ep-rank a{display:block;background:var(--paper);border:1px solid var(--rule);border-radius:12px;padding:14px 16px;color:var(--ink)}
.ep-rank a:hover{border-color:var(--ink);text-decoration:none}
.ep-rank b{font-size:22px}
.ep-rank .bar{height:6px;border-radius:3px;background:var(--canvas);margin:8px 0 6px;overflow:hidden}
.ep-rank .bar i{display:block;height:100%;background:var(--series-1);border-radius:3px}
.ep-rank span{font-size:13px;color:var(--muted)}
.ep-calc{background:var(--paper);border:1px solid var(--rule);border-radius:12px;padding:18px}
.ep-calc .field{max-width:260px}
.ep-calc .results{margin-top:12px}
.ep-calc .results>div{background:var(--paper);padding:12px 14px}
.ep-calc .value{font-size:24px}
.ep-chips{display:flex;gap:8px;flex-wrap:wrap}
.ep-side{display:flex;flex-direction:column;gap:16px}
.ep-side .aside-card h3{margin-top:0}
.ep-locked{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.14);font-size:14px}
.ep-locked:last-of-type{border-bottom:0}
.ep-locked b{background:rgba(255,255,255,.12);border-radius:6px;padding:2px 10px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#f2c14e}
.ep-nav{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:34px 0 0}
.ep-nav a{display:block;background:var(--paper);border:1px solid var(--rule);border-radius:12px;padding:14px 16px;color:var(--ink)}
.ep-nav a:hover{border-color:var(--ink);text-decoration:none}
.ep-nav a span{display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.ep-nav a:last-child{text-align:right}
.ep-note{font-size:12.5px;color:var(--muted);line-height:1.6;margin:26px 0 0}
.ep-tbl td{white-space:nowrap;font-variant-numeric:tabular-nums}
.ep-az{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px;position:sticky;top:0;background:var(--canvas);padding:10px 0;z-index:2}
.ep-az a{min-width:34px;text-align:center;padding:6px 8px;border:1px solid var(--rule-strong);border-radius:8px;font-weight:800;color:var(--ink-2);background:var(--paper)}
.ep-grp{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin-bottom:22px}
.ep-grp a{display:flex;gap:10px;align-items:baseline;padding:10px 12px;border:1px solid var(--rule);border-radius:10px;background:var(--paper);color:var(--ink);min-width:0}
.ep-grp a:hover{border-color:var(--ink);text-decoration:none}
.ep-grp a b{flex:none}
.ep-grp a span{color:var(--muted);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:960px){.ep-top,.ep-body{grid-template-columns:minmax(0,1fr)}.ep-stats{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.ep-tk h1{font-size:36px}.ep-hl div b{font-size:28px}.ep-rank{grid-template-columns:1fr}.ep-stats .v{font-size:19px}}
</style>`;
const EXTRA=`<script src="/assets/js/etf-page.js" defer></script>${CSS}`;
const DISC=`<p class="ep-note"><strong>Disclaimer:</strong> For educational purposes only, not financial advice or a recommendation to buy or sell. ETF data comes from the TopETFs database, refreshes daily and may be delayed, incomplete or outdated. Yields are trailing distribution yields and payouts can change or stop. Total return is since the fund's inception. Price chart and quote provided by TradingView and may be delayed. Always check the fund issuer's website and prospectus before investing. <a href="/disclaimer">Full disclaimer</a>.</p>`;
const prevNext=sym=>{const i=SYMS.indexOf(sym),p=SYMS[(i-1+SYMS.length)%SYMS.length],n=SYMS[(i+1)%SYMS.length];return `<nav class="ep-nav" aria-label="More ETFs"><a href="${etfPath(p)}"><span>&larr; Previous ETF</span><b>${p}</b> ${esc(BY[p].name)}</a><a href="${etfPath(n)}"><span>Next ETF &rarr;</span><b>${n}</b> ${esc(BY[n].name)}</a></nav>`;};
const tabs=(r,cur)=>`<nav class="ep-tabs" aria-label="${r.sym} pages"><a href="${etfPath(r.sym)}"${cur==="o"?' aria-current="page"':""}>Overview</a>${r.yield!=null?`<a href="${etfPath(r.sym)}-dividend-calculator"${cur==="d"?' aria-current="page"':""}>Dividend calculator</a>`:""}<a href="${etfPath(r.sym)}-alternatives"${cur==="a"?' aria-current="page"':""}>Alternatives</a><a href="/etf-comparison?t=${r.sym},${peers(r,1)[0]?.sym||"VOO"}">Compare</a></nav>`;
const head=(r,cur)=>{
  const badges=[r.freq?`<span class="ep-badge">${esc(r.freq)} payouts</span>`:"",r.provider?`<a class="ep-badge" href="/lists/${r.provider.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}-etfs">${esc(r.provider)}</a>`:"",r.decay===false?`<span class="ep-badge good">No price decay</span>`:r.decay?`<span class="ep-badge bad">Price decay</span>`:"",r.age!=null&&r.age<1?`<span class="ep-badge">New fund</span>`:""].join("");
  const hl=r.yield!=null?`<div><b>${L(r.sym,"yield","pct")}</b><span>Dividend yield</span></div><div><b>${L(r.sym,"inc10","usd",100)}</b><span>$10K pays / yr</span></div><div><b>${L(r.sym,"er","pct2")}</b><span>Expense ratio</span></div>`:`<div><b>${L(r.sym,"tr","signed")}</b><span>Total return</span></div><div><b>${sg(r.ar)}</b><span>Annualized</span></div><div><b>${L(r.sym,"aum","aum")}</b><span>Assets</span></div>`;
  return `<header class="ep-head"><div class="wrap"><nav class="crumbs"><a href="/">Home</a> / <a href="/etfs/">ETFs A-Z</a> / ${r.sym}</nav>
<div class="ep-top"><div><div class="ep-tk"><h1>${r.sym}</h1></div><p class="ep-name">${esc(r.name)}</p><div class="ep-badges">${badges}</div><div class="ep-hl">${hl}</div></div>
<div class="ep-price"><div class="lbl"><span>${r.sym} live price</span><span>12 months</span></div><div data-tv="${r.sym}">Loading live price...</div></div></div>
${tabs(r,cur)}</div></header>`;
};
const side=(r)=>`<aside class="ep-side">
<div class="aside-card" style="background:var(--navy);border-color:var(--navy);color:#fff"><h3 style="color:#f2c14e">${r.sym} on TopDividendETFsPRO</h3>
<div class="ep-locked"><span>PRO rating</span><b>Locked</b></div><div class="ep-locked"><span>Tax treatment grade</span><b>Locked</b></div><div class="ep-locked"><span>Advanced filters and trends</span><b>Locked</b></div>
<p style="margin:12px 0;font-size:14px;color:rgba(255,255,255,.8)">Unlock grades, tax treatment and advanced filters for ${r.sym} and 160+ income ETFs.</p><a class="btn btn-gold" style="width:100%" href="${PRO}" target="_blank" rel="noopener" data-ga="etf-page-pro">Unlock with PRO &rarr;</a></div>
<div class="aside-card"><h3>Free tools for ${r.sym}</h3><ul class="rank-list" style="list-style:none;padding:0;margin:0;display:grid;gap:8px">
${r.yield!=null?`<li><a href="${etfPath(r.sym)}-dividend-calculator">${r.sym} dividend calculator</a></li><li><a href="/drip-calculator?t=${r.sym}">${r.sym} DRIP calculator</a></li><li><a href="/dividend-income-goal-calculator?t=${r.sym}">How much ${r.sym} for $1,000/month?</a></li>`:""}
<li><a href="${etfPath(r.sym)}-alternatives">ETFs like ${r.sym}</a></li><li><a href="/expense-ratio-calculator?a=${r.sym}&b=VOO">${r.sym} fee calculator</a></li><li><a href="/screener">Full ETF screener</a></li></ul></div>
</aside>`;
const peerTable=(r,list)=>`<div class="tbl-scroll"><table class="data ep-tbl"><thead><tr><th class="l">ETF</th>${r.yield!=null?"<th>Yield</th><th>$10K / yr</th>":""}<th>Expense</th><th>AUM</th><th>Annualized</th><th>Price decay</th><th></th></tr></thead><tbody>
${[r].concat(list).map((x,i)=>`<tr${i===0?' style="background:color-mix(in srgb,var(--link) 6%,transparent)"':""}><td class="l"><a class="tk" href="${etfPath(x.sym)}">${x.sym}</a><span class="fund-name">${esc(x.name)}</span></td>${r.yield!=null?`<td><b>${pct(x.yield)}</b></td><td>${x.yield!=null?usd(x.yield*100,0):"n/a"}</td>`:""}<td>${pct(x.er,2)}</td><td>${aum(x.aum)}</td><td class="${x.ar==null?"":x.ar>=0?"pos":"neg"}">${sg(x.ar)}</td><td>${x.decay==null?"n/a":x.decay?'<span class="tl-flag bad" style="color:var(--neg)">Yes</span>':'<span style="color:var(--pos);font-weight:800">No</span>'}</td><td>${i?`<a href="/etf-comparison?t=${r.sym},${x.sym}">Compare</a>`:"<b>This fund</b>"}</td></tr>`).join("")}
</tbody></table></div>`;
const artsFor=sym=>ARTICLES.filter(a=>(a.tickers||[]).includes(sym)).slice(0,4);
const ld=(r,type,url,name,desc,faq)=>({title:name+" | TopETFs",desc,canonical:url,active:"",extra:EXTRA,faq,
  ld:{"@context":"https://schema.org","@type":"WebPage",name,url:SITE+url,description:desc,dateModified:new Date().toISOString().slice(0,10),about:{"@type":"FinancialProduct",name:r.name,alternateName:r.sym,category:"Exchange-traded fund",provider:r.provider?{"@type":"Organization",name:r.provider}:undefined},
    breadcrumb:{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:SITE+"/"},{"@type":"ListItem",position:2,name:"ETFs A-Z",item:SITE+"/etfs/"},{"@type":"ListItem",position:3,name:r.sym,item:SITE+etfPath(r.sym)}]}}});
const faqLd=list=>list.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a.replace(/<[^>]+>/g,"")}}));
const faqHtml=list=>`<h2 class="ep-h2">${"Frequently asked questions"}</h2><div class="ep-prose">${list.map(([q,a])=>`<h3 style="font-size:18px;margin:18px 0 6px">${q}</h3><p>${a}</p>`).join("")}</div>`;
const urls=[];

for(const r of R){
  const S=r.sym, url=etfPath(S), inc=r.yield!=null, P=peers(r,8), n=perN(r);
  const rk={y:inc?rank(INC,S,"yield"):null,e:rank(R,S,"er",true),a:rank(R,S,"aum"),r:rank(R.filter(x=>x.age!=null&&x.age>=1),S,"ar")};
  // ---------- quick take ----------
  const T=[];
  if(inc){T.push(`<p>${S} (${esc(r.name)}) currently pays a <strong>${L(S,"yield","pct")}</strong> distribution yield${r.freq?`, paid ${r.freq.toLowerCase()}`:""}. On a $10,000 investment that works out to about <strong>${L(S,"inc10","usd",100)}</strong> a year, or roughly ${usd(r.yield*100/12)} a month before taxes.${rk.y?` That yield ranks #${rk.y.n} of the ${rk.y.of} income ETFs we track.`:""}</p>`);}
  else T.push(`<p>${S} (${esc(r.name)}) is tracked as a growth fund on TopETFs, so the focus here is total return rather than income.${r.tr!=null?` Since its inception it has returned <strong>${L(S,"tr","signed")}</strong>${r.ar!=null?`, or about <strong>${sg(r.ar)}</strong> a year`:""}.`:""}</p>`);
  const p2=[];
  if(r.er!=null)p2.push(`It charges an expense ratio of ${L(S,"er","pct2")}, which is ${rk.e&&rk.e.pctl>=66?"cheaper than most":rk.e&&rk.e.pctl>=33?"middle of the pack among":"on the higher end of"} the ETFs we track (about ${usd(r.er*100,0)} a year per $10,000 invested)`);
  if(r.aum!=null)p2.push(`${p2.length?"and it":"It"} manages ${L(S,"aum","aum")} in assets${rk.a&&rk.a.n<=30?`, making it one of the ${rk.a.n<=10?"10":"30"} largest funds in our database`:""}`);
  if(p2.length)T.push(`<p>${p2.join(" ")}.</p>`);
  if(inc&&r.tr!=null)T.push(`<p>Yield is only half the story. ${S}'s total return since ${incDate(r)?`it launched on ${incDate(r)}`:"inception"} is <strong>${L(S,"tr","signed")}</strong>${r.ar!=null?` (about ${sg(r.ar)} per year)`:""}${r.decay===true?`, and our data flags <strong>price decay</strong>, meaning the share price is below where it started. Part of the income has been offset by a shrinking share price, so look at the total return, not just the payout.`:r.decay===false?`, and the share price is not below where it started, so there is no price decay flag.`:"."}</p>`);
  else if(!inc&&incDate(r))T.push(`<p>The fund launched on ${incDate(r)}${yrs(r)?`, giving it a track record of ${yrs(r)}`:""}. Keep in mind that total return depends heavily on when a fund started, so compare annualized returns when you line it up against other funds.</p>`);
  if(r.age!=null&&r.age<1)T.push(`<p>${S} is a newer fund with less than a year of history, so its numbers can move around a lot. Treat the track record with care.</p>`);
  // ---------- stats grid ----------
  const st=[
    inc?["Dividend yield",L(S,"yield","pct"),rk.y?`#${rk.y.n} of ${rk.y.of} income ETFs`:""]:["Total return",L(S,"tr","signed"),"Since inception"],
    inc?["$10K pays per year",L(S,"inc10","usd",100),`${usd(r.yield*100/12)} a month`]:["Annualized return",sg(r.ar),r.ar!=null?"Since inception":"Under 1 year of data"],
    ["Payout frequency",esc(r.freq||"n/a"),inc?`${usd(r.yield*100/n)} per payout on $10K`:""],
    ["Expense ratio",L(S,"er","pct2"),r.er!=null?`${usd(r.er*100,0)} a year per $10K`:""],
    ["Assets (AUM)",L(S,"aum","aum"),rk.a?`#${rk.a.n} of ${rk.a.of} by size`:""],
    inc?["Total return",L(S,"tr","signed"),"Since inception"]:["Price decay",r.decay==null?"n/a":r.decay?"Yes":"No",""],
    inc?["Annualized return",sg(r.ar),r.ar!=null?"Since inception":"Under 1 year of data"]:["Provider",esc(r.provider||"n/a"),""],
    ["Inception date",r.inception?r.inception.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"n/a",yrs(r)?yrs(r)+" of history":""],
    inc?["Price decay",r.decay==null?"n/a":r.decay?'<span style="color:var(--neg)">Yes</span>':'<span style="color:var(--pos)">No</span>',r.decay?"Price below starting point":"Price at or above start"]:["Tracked on",r.lists.map(l=>({pro:"TopDividendETFsPRO",weekly:"WeeklyETFs",growth:"GrowthETFs"}[l])).join(", "),""]
  ];
  const ranks=[rk.y&&["Yield rank",rk.y,"/lists/high-yield-etfs","among income ETFs"],rk.e&&["Fee rank (lowest)",rk.e,"/lists/low-expense-ratio-etfs","cheapest first"],rk.a&&["Size rank",rk.a,"/lists/largest-etfs","by assets"],rk.r&&["Annualized return rank",rk.r,"/lists/best-performing-etfs","funds with 1+ year"]].filter(Boolean);
  const faq=inc?[
    [`What is ${S}'s dividend yield?`,`${S} currently has a distribution yield of ${pct(r.yield)}, based on the TopETFs database. Yields change as payouts and the share price move.`],
    [`How often does ${S} pay dividends?`,r.freq?`${S} pays ${r.freq.toLowerCase()}, which is about ${n} payments a year.`:`Check the fund issuer's website for ${S}'s payment schedule.`],
    [`How much does $10,000 in ${S} pay?`,`At a ${pct(r.yield)} yield, $10,000 in ${S} pays about ${usd(r.yield*100,0)} a year, or roughly ${usd(r.yield*100/12)} a month before taxes.`],
    [`What is ${S}'s expense ratio?`,r.er!=null?`${S} charges ${pct(r.er,2)} a year, about ${usd(r.er*100,0)} for every $10,000 invested.`:`We do not have an expense ratio on file for ${S}. Check the fund's prospectus.`],
    [`Does ${S} have price decay?`,r.decay==null?`We do not have a price decay flag for ${S} yet.`:r.decay?`Yes. ${S}'s share price is below where it started, so part of its income has been offset by a falling share price. Its total return since inception is ${sg(r.tr)}.`:`No. ${S}'s share price is not below where it started. Its total return since inception is ${sg(r.tr)}.`]
  ]:[
    [`What is ${S}'s total return?`,`${S} has returned ${sg(r.tr)} since inception${r.ar!=null?`, or about ${sg(r.ar)} a year`:""}, based on the TopETFs database.`],
    [`What is ${S}'s expense ratio?`,r.er!=null?`${S} charges ${pct(r.er,2)} a year.`:`Check the fund's prospectus for its current expense ratio.`],
    [`How big is ${S}?`,r.aum!=null?`${S} manages about ${aum(r.aum)} in assets.`:`We do not have assets on file for ${S}.`],
    [`When did ${S} launch?`,incDate(r)?`${S} launched on ${incDate(r)}.`:`Check the issuer's website for the launch date.`]
  ];
  const arts=artsFor(S);
  const desc=inc?`${S} ETF: live price, ${pct(r.yield)} dividend yield, what $10,000 pays, expense ratio, AUM, total return and price decay. Compare ${S} with similar ETFs.`:`${S} ETF: live price, total return, annualized return, expense ratio and assets. Compare ${S} with similar ETFs.`;
  const title=inc?`${S} ETF: Live Price, Dividend Yield and What $10,000 Pays`:`${S} ETF: Live Price, Total Return and Key Stats`;
  out["etfs/"+etfSlug(S)+".html"]=page(ld(r,"o",url,title,desc,faqLd(faq)),
`${head(r,"o")}
<div class="wrap"><div class="ep-body"><div>
<div class="ep-stats">${st.map(([k,v,s])=>`<div><div class="k">${k}</div><div class="v">${v}</div>${s?`<div class="s">${s}</div>`:""}</div>`).join("")}</div>
<h2 class="ep-h2">${S} at a glance</h2><div class="ep-prose">${T.join("")}</div>
${inc?`<h2 class="ep-h2">How much will ${S} pay you?</h2><div class="ep-calc" data-income-calc data-sym="${S}" data-yield="${r.yield}" data-n="${n}"><div class="field"><label>Amount invested ($)</label><input inputmode="decimal" value="10000"></div>
<div class="results"><div><div class="label">Per year</div><div class="value" data-c="yr"></div></div><div><div class="label">Per month</div><div class="value" data-c="mo"></div></div><div><div class="label">Per week</div><div class="value" data-c="wk"></div></div><div><div class="label">Per ${esc((r.freq||"quarterly").toLowerCase())} payout</div><div class="value" data-c="per"></div></div></div>
<p class="figure-note">At today's yield, before taxes. <a href="${url}-dividend-calculator">Open the full ${S} dividend calculator &rarr;</a></p></div>`:""}
${ranks.length?`<h2 class="ep-h2">Where ${S} ranks</h2><div class="ep-rank">${ranks.map(([l,x,href,sub])=>`<a href="${href}"><span>${l}</span><br><b>#${x.n}</b> <span>of ${x.of} ${sub}</span><div class="bar"><i style="width:${Math.max(3,x.pctl)}%"></i></div><span>Better than ${Math.max(0,x.pctl)}% of funds &rarr; see the list</span></a>`).join("")}</div>`:""}
<h2 class="ep-h2">ETFs similar to ${S}</h2>${peerTable(r,P.slice(0,6))}
<p style="margin-top:10px"><a href="${url}-alternatives">See all ${S} alternatives &rarr;</a></p>
<h2 class="ep-h2">Compare ${S} with</h2><div class="ep-chips">${P.slice(0,6).map(x=>`<a class="chip" href="/etf-comparison?t=${S},${x.sym}">${S} vs ${x.sym}</a>`).join("")}${S!=="VOO"?`<a class="chip" href="/etf-comparison?t=${S},VOO">${S} vs VOO</a>`:""}</div>
${arts.length?`<h2 class="ep-h2">Stories about ${S}</h2><ul style="margin:0;padding-left:1.1em;line-height:1.9">${arts.map(a=>`<li><a href="/articles/${a.slug}">${esc(a.title)}</a></li>`).join("")}</ul>`:""}
${faqHtml(faq)}
${prevNext(S)}
${DISC}
</div>${side(r)}</div>${proBand()}</div>`);
  urls.push(url);

  // ---------- dividend calculator page ----------
  if(inc){
    const amts=[1000,5000,10000,25000,50000,100000,250000,500000,1000000];
    const goals=[100,500,1000,2000,5000];
    const dfaq=[
      [`How much does ${S} pay per share?`,`Payouts per share change over time. At the current ${pct(r.yield)} yield, every $1,000 invested in ${S} earns about ${usd(r.yield*10)} a year. Check the issuer's website for the latest per-share distribution.`],
      [`How much do I need in ${S} to make $1,000 a month?`,`About ${usd(12000/(r.yield/100),0)} at the current ${pct(r.yield)} yield, before taxes.`],
      [`How much does $100,000 in ${S} pay?`,`About ${usd(r.yield*1000,0)} a year, or ${usd(r.yield*1000/12,0)} a month, at today's yield.`],
      [`Is ${S}'s dividend guaranteed?`,`No. ETF distributions depend on what the fund earns and can rise, fall or stop. The numbers here are estimates based on the current yield.`]];
    const durl=url+"-dividend-calculator";
    out["etfs/"+etfSlug(S)+"-dividend-calculator.html"]=page(ld(r,"d",durl,`${S} Dividend Calculator: How Much Does ${S} Pay?`,`${S} dividend calculator with the live ${pct(r.yield)} yield. See what any amount in ${S} pays per year, month, week and per ${(r.freq||"").toLowerCase()||"payout"}, and how much you need for $1,000 a month.`,faqLd(dfaq)),
`${head(r,"d")}
<div class="wrap"><div class="ep-body"><div>
<div class="ep-calc" data-income-calc data-sym="${S}" data-yield="${r.yield}" data-n="${n}"><div class="field"><label>Amount invested in ${S} ($)</label><input inputmode="decimal" value="10000"></div>
<div class="results"><div><div class="label">Per year</div><div class="value big" data-c="yr"></div></div><div><div class="label">Per month</div><div class="value" data-c="mo"></div></div><div><div class="label">Per week</div><div class="value" data-c="wk"></div></div><div><div class="label">Per ${esc((r.freq||"quarterly").toLowerCase())} payout</div><div class="value" data-c="per"></div></div></div>
<p class="figure-note">Based on ${S}'s current ${L(S,"yield","pct")} yield, before taxes. Payouts change over time.</p></div>
<h2 class="ep-h2">What different amounts in ${S} pay</h2>
<div class="tbl-scroll"><table class="data ep-tbl"><thead><tr><th class="l">Invested</th><th>Per year</th><th>Per month</th><th>Per payout</th><th>Yearly fee</th></tr></thead><tbody>
${amts.map(a=>`<tr><td class="l"><b>${usd(a,0)}</b></td><td>${usd(a*r.yield/100,0)}</td><td>${usd(a*r.yield/100/12)}</td><td>${usd(a*r.yield/100/n)}</td><td>${r.er!=null?usd(a*r.er/100,0):"n/a"}</td></tr>`).join("")}
</tbody></table></div>
<h2 class="ep-h2">How much ${S} do you need?</h2>
<div class="tbl-scroll"><table class="data ep-tbl"><thead><tr><th class="l">Monthly income goal</th><th>Amount needed in ${S}</th><th>Yearly income</th></tr></thead><tbody>
${goals.map(g=>`<tr><td class="l"><b>${usd(g,0)} a month</b></td><td><b>${usd(g*12/(r.yield/100),0)}</b></td><td>${usd(g*12,0)}</td></tr>`).join("")}
</tbody></table></div>
<p style="margin-top:10px"><a href="/dividend-income-goal-calculator?t=${S}">Try any goal in the income goal calculator &rarr;</a> &nbsp; <a href="/drip-calculator?t=${S}">See ${S} with dividends reinvested &rarr;</a></p>
<div class="ep-prose" style="margin-top:22px"><p>These numbers multiply the amount invested by ${S}'s current distribution yield of ${pct(r.yield)}${r.freq?` and split the result across its ${r.freq.toLowerCase()} payouts`:""}. ${r.decay?`Remember that ${S} has price decay in our data, so a high payout has come with a lower share price over time.`:`Payouts can still change from one period to the next.`} Compare the income with similar funds below before deciding anything.</p></div>
<h2 class="ep-h2">Same $10,000 in similar ETFs</h2>${peerTable(r,P.filter(x=>x.yield!=null).slice(0,6))}
${faqHtml(dfaq)}
${prevNext(S).replace(/href="\/etfs\/([a-z0-9-]+)"/g,(m,s)=>BY[s.toUpperCase()]&&BY[s.toUpperCase()].yield!=null?`href="/etfs/${s}-dividend-calculator"`:m)}
${DISC}
</div>${side(r)}</div>${proBand()}</div>`);
    urls.push(durl);
  }

  // ---------- alternatives page ----------
  const A=peers(r,12),aurl=url+"-alternatives";
  const afaq=[[`What are the best alternatives to ${S}?`,`Funds most similar to ${S} in our data include ${A.slice(0,5).map(x=>x.sym).join(", ")}. Similarity is based on strategy keywords, ${inc?"yield, ":""}payout schedule, provider and size.`],[`How do I compare ${S} with another ETF?`,`Use the ETF comparison tool to put ${S} side by side with up to three other funds, including yield, fees, assets, total return and price decay.`]];
  out["etfs/"+etfSlug(S)+"-alternatives.html"]=page(ld(r,"a",aurl,`ETFs Like ${S}: ${A.length} ${S} Alternatives Compared`,`Looking for an alternative to ${S}? Compare ${A.length} similar ETFs side by side: ${inc?"yield, income on $10,000, ":""}expense ratio, assets, annualized return and price decay.`,faqLd(afaq)),
`${head(r,"a")}
<div class="wrap"><div class="ep-body"><div>
<div class="ep-prose"><p>These are the ETFs in our database that look most like <strong>${S}</strong> (${esc(r.name)}), based on strategy, ${inc?"yield, ":""}payout schedule, provider and fund size. ${S} is shown first so you can see how each one stacks up.</p></div>
${peerTable(r,A)}
<h2 class="ep-h2">Head-to-head comparisons</h2><div class="ep-chips">${A.slice(0,10).map(x=>`<a class="chip" href="/etf-comparison?t=${S},${x.sym}">${S} vs ${x.sym}</a>`).join("")}<a class="chip" href="/etf-comparison?t=${[S].concat(A.slice(0,3).map(x=>x.sym)).join(",")}">${S} vs top 3</a></div>
<h2 class="ep-h2">Quick read on the alternatives</h2><div class="ep-prose">${A.slice(0,6).map(x=>{const bits=[];if(inc&&x.yield!=null&&r.yield!=null)bits.push(x.yield>r.yield?`pays more (${pct(x.yield)} vs ${pct(r.yield)})`:x.yield<r.yield?`pays less (${pct(x.yield)} vs ${pct(r.yield)})`:`pays a similar ${pct(x.yield)}`);if(x.er!=null&&r.er!=null)bits.push(x.er<r.er?`costs less (${pct(x.er,2)})`:x.er>r.er?`costs more (${pct(x.er,2)})`:"charges the same fee");if(x.ar!=null&&r.ar!=null)bits.push(`has returned ${sg(x.ar)} a year vs ${sg(r.ar)} for ${S}`);if(x.decay)bits.push("has price decay");return `<p><a class="tkr" href="${etfPath(x.sym)}">${x.sym}</a> ${esc(x.name)}${bits.length?": "+bits.join(", ")+".":"."}</p>`;}).join("")}</div>
${faqHtml(afaq)}
${prevNext(S).replace(/href="\/etfs\/([a-z0-9-]+)"/g,'href="/etfs/$1-alternatives"')}
${DISC}
</div>${side(r)}</div>${proBand()}</div>`);
  urls.push(aurl);
}

// ---------- A-Z directory ----------
const groups={};SYMS.forEach(s=>{const k=/^[A-Z]/.test(s)?s[0]:"#";(groups[k]=groups[k]||[]).push(s);});
const letters=Object.keys(groups).sort();
out["etfs/index.html"]=page({title:`All ETFs A-Z: ${N} ETF Profiles With Live Prices and Yields | TopETFs`,desc:`Browse ${N} ETF profiles from A to Z with live prices, dividend yields, expense ratios, assets and total returns.`,canonical:"/etfs/",active:"",extra:EXTRA},
`<header class="page-head"><div class="wrap"><span class="kicker">ETF directory</span><h1>All ETFs A-Z</h1><p>${N} ETF profiles with live prices, yields, fees, assets and returns. Pick a ticker, or use the <a href="/screener">screener</a> to filter.</p></div></header>
<div class="wrap" style="margin-top:20px"><nav class="ep-az" aria-label="Jump to letter">${letters.map(l=>`<a href="#l-${l}">${l}</a>`).join("")}</nav>
${letters.map(l=>`<h2 class="ep-h2" id="l-${l}" style="scroll-margin-top:70px">${l}</h2><div class="ep-grp">${groups[l].map(s=>`<a href="${etfPath(s)}"><b>${s}</b><span>${esc(BY[s].name)}</span></a>`).join("")}</div>`).join("")}
${proBand()}</div>`);
urls.unshift("/etfs/");
return urls;
}
