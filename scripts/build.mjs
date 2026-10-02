// TopETFs.com static site builder.
// node scripts/build.mjs
// Reads data/*.csv snapshots + content/articles/*.html and writes the site to the repo root.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://topetfs.com";
const GA_ID = "G-QL5W6LQ1Z7"; // Add the GA4 measurement ID for topetfs.com here (e.g. "G-XXXXXXX")
const BUILD_DATE = new Date();
const EMAIL = "Business@TopDividendETFs.com";
const AUTHOR = {name:"Benjie Siegel", title:"Founder, TopETFs", url:"/author/benjie-siegel"};

/* ---------------- data ---------------- */
function parseCSV(text){const rows=[];let row=[],f="",q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else if(c==='"')q=true;else if(c===','){row.push(f);f="";}else if(c==='\n'){row.push(f);rows.push(row);row=[];f="";}else if(c!=='\r')f+=c;}if(f!==""||row.length){row.push(f);rows.push(row);}return rows;}
const pct=v=>{if(v==null)return null;v=String(v).replace(/[%,\s]/g,"");return v===""||isNaN(+v)?null:+v;};
const money=v=>{if(v==null)return null;v=String(v).replace(/[$,\s]/g,"").toUpperCase();const m=v.match(/^(-?[\d.]+)([KMBT]?)$/);if(!m)return null;return +m[1]*{"":1,K:1e3,M:1e6,B:1e9,T:1e12}[m[2]];};
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
function normalize(key,rows){
  const head=rows[0].map(h=>clean(h).toLowerCase());
  const col=(...n)=>{for(const x of n){const i=head.indexOf(x);if(i>-1)return i;}return -1;};
  const iS=col("symbol"),iN=col("name","etf name"),iP=col("fund provider","provider"),iY=col("dividend yield","yield"),iE=col("expense ratio"),iA=col("aum"),iT=col("total return","total returns"),iD=col("price decay"),iI=col("inception date"),iF=col("payout frequency","frequency");
  return rows.slice(1).map(r=>{const sym=clean(r[iS]).toUpperCase();if(!/^[A-Z.]{1,6}$/.test(sym)||["PDI","PTY"].includes(sym))return null;
    return {sym,name:clean(r[iN]),provider:iP>-1?clean(r[iP]):"",yield:iY>-1?pct(r[iY]):null,er:iE>-1?pct(r[iE]):null,aum:iA>-1?money(r[iA]):null,tr:iT>-1?pct(r[iT]):null,decay:iD>-1?clean(r[iD]).toUpperCase()==="YES":null,inception:iI>-1?clean(r[iI]):"",freq:iF>-1?clean(r[iF]):(key==="weekly"?"Weekly":""),src:key};}).filter(Boolean);
}
const D={};
for(const k of ["pro","weekly","growth"]) D[k]=normalize(k,parseCSV(fs.readFileSync(path.join(ROOT,"data",k+".csv"),"utf8")));
const ALL={};
for(const k of ["pro","weekly","growth"]) for(const e of D[k]){const c=ALL[e.sym];if(!c){ALL[e.sym]={...e,lists:[k]};continue;}if(!c.lists.includes(k))c.lists.push(k);for(const f of ["name","provider","yield","er","aum","tr","decay","inception","freq"])if((c[f]==null||c[f]==="")&&e[f]!=null&&e[f]!=="")c[f]=e[f];}

const F={
  pct:(v,d)=>{if(v==null||isNaN(v))return "n/a";d=d==null?(Math.abs(v)>=100?0:1):d;return v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})+"%";},
  pct2:v=>F.pct(v,2), signed:v=>v==null?"n/a":(v>0?"+":"")+F.pct(v,Math.abs(v)>=10?0:1),
  usd:(v,d=0)=>v==null?"n/a":"$"+v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}),
  usd2:v=>F.usd(v,2),
  aum:v=>{if(v==null)return "n/a";if(v>=1e12)return "$"+(v/1e12).toFixed(2)+"T";if(v>=1e9)return "$"+(v/1e9).toFixed(v>=1e11?0:1)+"B";if(v>=1e6)return "$"+(v/1e6).toFixed(v>=1e8?0:1)+"M";return "$"+Math.round(v/1e3)+"K";},
  text:v=>v==null?"n/a":String(v), decay:v=>v==null?"n/a":(v?"Yes":"No")
};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate=d=>new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
const today=BUILD_DATE.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric",timeZone:"America/New_York"});

/* Template tokens used inside article bodies:
   {{live:SYM:field:fmt:mul}}  live-updating number, pre-rendered from snapshot
   {{tkr:SYM}}                 ticker link to the ETF profile
   {{calc:expr}}               computed value from snapshot, e.g. {{calc:usd:10000*JEPI.yield/100}}  */
function renderTokens(html){
  return html
   .replace(/\{\{live:([A-Z.]+):(\w+)(?::(\w+))?(?::([\d.]+))?\}\}/g,(m,sym,field,fmt="pct",mul)=>{
     const e=ALL[sym]; if(!e) throw new Error("Unknown ticker in article: "+sym);
     let v=e[field]; if(v!=null&&mul) v=v*+mul;
     return `<span class="live" data-live="${sym}:${field}" data-fmt="${fmt}"${mul?` data-mul="${mul}"`:""} title="Live from the TopETFs database">${esc(F[fmt](v))}</span>`;})
   .replace(/\{\{tkr:([A-Z.]+)\}\}/g,(m,s)=>`<a class="tkr" href="/etf?t=${s}">${s}</a>`)
   .replace(/\{\{calc:(\w+):([^}]+)\}\}/g,(m,fmt,expr)=>{
     const js=expr.replace(/\b([A-Z]{2,6})\.(\w+)/g,(mm,s,f)=>{const e=ALL[s];if(!e||e[f]==null)throw new Error("calc missing "+mm);return "("+e[f]+")";});
     const v=Function("return ("+js+")")(); return esc(F[fmt](v));})
   .replace(/\{\{count:(\w+)\}\}/g,(m,k)=>String(k==="all"?Object.keys(ALL).length:D[k].length));
}

/* ---------------- articles ---------------- */
const artDir=path.join(ROOT,"content","articles");
const ARTICLES=fs.readdirSync(artDir).filter(f=>f.endsWith(".html")).map(f=>{
  const raw=fs.readFileSync(path.join(artDir,f),"utf8");
  const m=raw.match(/^<!--meta\s*([\s\S]*?)-->/); if(!m) throw new Error("No meta in "+f);
  const meta=JSON.parse(m[1]); meta.body=raw.slice(m[0].length); meta.slug=meta.slug||f.replace(/\.html$/,"");
  return meta;
}).sort((a,b)=>(b.date+(b.time||"")).localeCompare(a.date+(a.time||"")) || (a.order||0)-(b.order||0));

const SECTIONS={
  income:{name:"Income",path:"/dividend",hue:["#0e2a4d","#1b4478"],accent:"#8fb8ff"},
  weekly:{name:"Weekly Pay",path:"/weekly",hue:["#1d2733","#2e4256"],accent:"#f0a36b"},
  growth:{name:"Growth",path:"/growth",hue:["#10261e","#1d4436"],accent:"#6fe0b0"},
  learn:{name:"ETF 101",path:"/learn",hue:["#231d2d","#3b3050"],accent:"#c4b5fd"},
  tools:{name:"Tools",path:"/tools",hue:["#1f2226","#3a3f46"],accent:"#ffd479"}
};

/* Deterministic editorial cover art per story: a data-ish abstract drawing, no stock photos. */
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function cover(a,big){
  const s=SECTIONS[a.section]||SECTIONS.learn, r=rng(hash(a.slug)), id="g"+hash(a.slug).toString(36);
  const W=800,H=450; let g="";
  for(let x=0;x<=W;x+=40) g+=`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(255,255,255,.05)"/>`;
  for(let y=0;y<=H;y+=40) g+=`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(255,255,255,.05)"/>`;
  const style=a.art||["line","bars","dots"][hash(a.slug)%3];
  let art="";
  if(style==="bars"){ const n=14; for(let i=0;i<n;i++){const h=60+r()*260*(0.5+i/n/1.2);const x=70+i*48;art+=`<rect x="${x}" y="${390-h}" width="30" height="${h}" rx="4" fill="${s.accent}" fill-opacity="${(0.25+0.6*i/n).toFixed(2)}"/>`;} }
  if(style==="line"||style==="bars"){ let y=330,pts=[]; for(let x=40;x<=760;x+=24){y+=(r()-0.62)*38;y=Math.max(80,Math.min(390,y));pts.push(x+","+y.toFixed(0));}
    art+=`<polyline points="${pts.join(" ")}" fill="none" stroke="${style==="bars"?"#fff":s.accent}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
    art+=`<polygon points="40,410 ${pts.join(" ")} 760,410" fill="url(#${id}a)" opacity="${style==="bars"?0:1}"/>`;
    const last=pts[pts.length-1].split(","); art+=`<circle cx="${last[0]}" cy="${last[1]}" r="9" fill="#fff"/><circle cx="${last[0]}" cy="${last[1]}" r="18" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`; }
  if(style==="dots"){ for(let i=0;i<70;i++){const x=60+r()*680,y=70+r()*320,rad=4+r()*10;art+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(1)}" fill="${r()>.7?"#fff":s.accent}" fill-opacity="${(0.35+r()*0.55).toFixed(2)}"/>`;}
    art+=`<line x1="60" y1="380" x2="740" y2="90" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>`; }
  if(style==="rings"){ for(let i=0;i<7;i++) art+=`<circle cx="580" cy="225" r="${40+i*34}" fill="none" stroke="${s.accent}" stroke-opacity="${(0.7-i*0.08).toFixed(2)}" stroke-width="${i?2:6}"/>`;
    for(let i=0;i<5;i++){const w=110+r()*150;art+=`<rect x="70" y="${120+i*48}" width="${w.toFixed(0)}" height="18" rx="9" fill="#fff" fill-opacity="${(0.15+i*0.12).toFixed(2)}"/>`;} }
  const label=(a.coverLabel||(a.tickers||[]).slice(0,3).join("  ·  ")||s.name).toUpperCase();
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(a.title)}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.hue[0]}"/><stop offset="1" stop-color="${s.hue[1]}"/></linearGradient><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.accent}" stop-opacity=".35"/><stop offset="1" stop-color="${s.accent}" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>${g}${art}<text x="40" y="58" fill="#fff" fill-opacity=".85" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="${big?22:24}" letter-spacing="3">${esc(label)}</text></svg>`;
}

/* ---------------- layout ---------------- */
const NETWORK=[
  {name:"TopDividendETFs",domain:"topdividendetfs.com",desc:"The flagship. 100 top dividend ETFs ranked, voted on and updated daily.",color:"#1A3C34",mark:"TD"},
  {name:"TopDividendETFsPRO",domain:"topdividendetfspro.com",desc:"The premium terminal: advanced screening, filters and deeper data on 160+ income ETFs.",color:"#9a6b00",mark:"PRO",pro:true},
  {name:"WeeklyETFs",domain:"weeklyetfs.com",desc:"Every ETF that pays you every single week, with yields, total returns and price decay.",color:"#001f3d",mark:"WK"},
  {name:"MonthlyETFs",domain:"monthlyetfs.com",desc:"The best monthly paying ETFs for building a steady monthly income stream.",color:"#30776C",mark:"MO"},
  {name:"GrowthETFs",domain:"growthetfs.com",desc:"Growth ETF rankings by total return and assets, plus a swipe tool and fund pages.",color:"#1f5f3a",mark:"GR"},
  {name:"ETFTotalReturns",domain:"etftotalreturns.com",desc:"Total return analysis and 300+ head-to-head ETF matchups.",color:"#34495e",mark:"TR"},
  {name:"TopDividendTools",domain:"topdividendtools.com",desc:"Calculators and tools for dividend investors, from DRIP to yield on cost.",color:"#5b3a8c",mark:"TT"},
  {name:"DividendProjection",domain:"dividendprojection.com",desc:"Project your future dividend income with live yields from our database.",color:"#0f5f8a",mark:"DP"},
  {name:"PhotonicsETFs",domain:"photonicsetfs.com",desc:"Tracking the ETFs behind lasers, optical networking and the photonics buildout.",color:"#05070E",mark:"PH"}
];
const NAV=[["Latest","/latest"],["Screener","/screener"],["Income","/dividend"],["Weekly Pay","/weekly"],["Growth","/growth"],["ETF 101","/learn"],["Tools","/tools"],["Network","/network"]];
const TAPE="SCHD,JEPI,JEPQ,QQQI,SPYI,VOO,DIVO,GPIQ,GPIX,VYM,DGRO,QQQ,VUG,SCHG,VGT,QDTE,XDTE,FEPI,QYLD,BALI,IDVO,HDV,NOBL,MSTY,ULTI";

const LOGO=`<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#fff"/><rect x="6" y="17" width="4.5" height="9" rx="1.2" fill="#0e2a4d"/><rect x="13.75" y="12" width="4.5" height="14" rx="1.2" fill="#0e2a4d"/><rect x="21.5" y="6" width="4.5" height="20" rx="1.2" fill="#2a78d6"/></svg>`;
const ICON_SEARCH=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>`;
const ICON_MENU=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;

const SPONSOR=`<aside class="sponsor" aria-label="Sponsored">
  <a class="sponsor-frame" href="https://lsfunds.com/etfs/ovl" target="_blank" rel="noopener sponsored"><img src="https://raw.githubusercontent.com/benjiesiegel1414/topdividendetfs-site/main/Revised%20Top%20Dividend%20Tools%20OVL%20ad.png" alt="Sponsored: Overlay Shares Large Cap Equity ETF (OVL)" width="728" height="90" loading="lazy"></a>
  <small><span class="tag">Sponsored By</span></small>
  <small>Read carefully before investing. Prospectus: <a href="https://lsfunds.com/hubfs/Regulatory/Prospectus.pdf?hsLang=en" target="_blank" rel="noopener">https://lsfunds.com/hubfs/Regulatory/Prospectus.pdf?hsLang=en</a></small>
</aside>`;

const DISCLAIMER=`<strong>Disclaimer:</strong> TopETFs.com is published by Dividend Empire LLC for educational and entertainment purposes only. We are not financial advisors, and nothing on this site is financial advice, a recommendation, or a solicitation to buy or sell any security. ETF data is compiled from public sources and fund issuers, may be delayed, inaccurate or outdated, and may differ from the fund sponsor's own figures. Yields are trailing distribution yields, are not guaranteed, and distributions may include return of capital, which reduces your cost basis and is not a measure of performance. Total returns are since each fund's inception unless noted and are not comparable across funds with different start dates. Past performance does not guarantee future results. Investing carries risk, including loss of principal. Read each fund's prospectus and consult a licensed financial advisor before investing. Dividend Empire LLC receives compensation from ETF issuers for sponsored placements, which are labeled as such.`;

const OG_IMAGE=SITE+"/assets/og/topetfs-card.png";
const OG_ALT="TopETFs: ETF news, research and income math with live data";
function head({title,desc,canonical,type="website",extra="",ld,faq,image=OG_IMAGE,imageAlt=OG_ALT}){
  const url=SITE+canonical;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="TopETFs">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:secure_url" content="${image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${esc(imageAlt)}">
<meta name="theme-color" content="#0e2a4d">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="TopETFs" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">
<script>try{var t=localStorage.getItem("te-theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
${GA_ID?`<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>`:""}
${ld?`<script type="application/ld+json">${JSON.stringify(ld)}</script>`:""}${faq&&faq.length?`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:faq})}</script>`:""}
${extra}
</head>`;
}
function top(active){
  return `<a class="skip" href="#main">Skip to content</a>
<div class="netbar"><div class="wrap"><span class="netbar-label">Our network</span>${NETWORK.map(n=>`<a class="netpill${n.pro?" pro":""}" href="https://${n.domain}/" target="_blank" rel="noopener">${n.name}${n.pro?"":""}.com</a>`).join("")}</div></div>
<header class="masthead"><div class="wrap mast-row">
  <a class="brand" href="/" aria-label="TopETFs home">${LOGO}<span>Top<b>ETFs</b></span></a>
  <nav class="primary" aria-label="Primary">${NAV.map(([n,h])=>`<a href="${h}"${active===h?' aria-current="page"':""}>${n}</a>`).join("")}</nav>
  <div class="mast-actions">
    <button class="icon-btn" data-open-search aria-label="Search ETFs (press /)">${ICON_SEARCH}</button>
    <a class="btn-pro" href="https://topdividendetfspro.com/" target="_blank" rel="noopener">Go PRO<span>&nbsp;&rarr;</span></a>
    <button class="icon-btn menu-btn" aria-label="Menu" aria-expanded="false">${ICON_MENU}</button>
  </div>
</div></header>
<div class="dateline"><div class="wrap"><span><strong>${today}</strong></span><span><span class="live-dot"></span>ETF data refreshed daily from the TopETFs database</span></div></div>
<div class="tape" data-w="tape" data-syms="${TAPE}" aria-label="Live ETF yields"><div class="tape-track">${tapeStatic()}</div></div>`;
}
function tapeStatic(){
  const items=TAPE.split(",").map(s=>{const e=ALL[s];if(!e)return "";const hasY=e.yield!=null&&!e.lists.includes("growth");
    const v=hasY?`${F.pct(e.yield)} <span class="k">yield</span>`:(e.tr!=null?`<span class="${e.tr>=0?"pos":"neg"}">${F.signed(e.tr)}</span> <span class="k">since incep.</span>`:"");
    return `<a class="tape-item" href="/etf?t=${s}"><b>${s}</b>${v}</a>`;}).join("");
  return items+items;
}
function foot(){
  const arts=ARTICLES.slice(0,5);
  return `
<footer class="footer"><div class="wrap">
  <div class="foot-grid">
    <div><a class="brand" href="/">${LOGO}<span>Top<b>ETFs</b></span></a><p>Plain-English ETF research with live numbers. Income, weekly pay, growth and the math behind all of it.</p><p><a class="btn btn-gold" href="https://topdividendetfspro.com/" target="_blank" rel="noopener">Try TopDividendETFsPRO</a></p></div>
    <div><h4>Sections</h4><ul>${NAV.map(([n,h])=>`<li><a href="${h}">${n}</a></li>`).join("")}</ul></div>
    <div><h4>Our network</h4><ul>${NETWORK.map(n=>`<li><a href="https://${n.domain}/" target="_blank" rel="noopener">${n.name}.com</a></li>`).join("")}</ul></div>
    <div><h4>Latest</h4><ul>${arts.map(a=>`<li><a href="/articles/${a.slug}">${esc(a.short||a.title)}</a></li>`).join("")}</ul><h4 style="margin-top:18px">Company</h4><ul><li><a href="/about">About</a></li><li><a href="/author/benjie-siegel">Our founder</a></li><li><a href="/contact">Contact</a></li><li><a href="/privacy">Privacy policy</a></li><li><a href="/disclaimer">Disclaimer</a></li><li><a href="https://topdividendetfs.com/advertise.html" target="_blank" rel="noopener">Advertise</a></li><li><a href="/feed.xml">RSS</a></li></ul></div>
  </div>
  <p class="disclaimer">${DISCLAIMER}</p>
  <div class="foot-bottom"><span>&copy; ${BUILD_DATE.getFullYear()} Dividend Empire LLC. All rights reserved.</span><button class="theme-toggle" type="button">Toggle dark mode</button></div>
</div></footer>
<div class="search-pop" id="search-pop" role="dialog" aria-label="Search ETFs"><div class="search-box"><input type="search" placeholder="Search a ticker, fund or story" aria-label="Search"><div class="search-results"></div></div></div>
<script>window.TE_ARTICLES=${JSON.stringify(ARTICLES.map(a=>({slug:a.slug,title:a.title,dek:a.dek,section:(SECTIONS[a.section]||{}).name,tickers:a.tickers||[]})))};</script>
<script src="/assets/js/app.js" defer></script>
</body>
</html>`;
}
function page(opts,body){
  return head(opts)+`\n<body${opts.slug?` data-slug="${opts.slug}"`:""}>\n`+top(opts.active)+`\n`+`\n<main id="main">\n`+body+`\n</main>\n`+foot();
}

/* ---------------- components ---------------- */
function storyCard(a,{cls="",dek=true,img=true,size}={}){
  const s=SECTIONS[a.section]||SECTIONS.learn;
  return `<a class="story ${cls}" href="/articles/${a.slug}">${img?`<div class="cover"><img src="/assets/covers/${a.slug}.svg" alt="" width="800" height="450" loading="lazy"></div>`:""}<span class="kicker">${s.name}</span><h3 class="story-title"${size?` style="font-size:${size}px"`:""}>${esc(a.title)}</h3>${dek?`<p class="story-dek">${esc(a.dek)}</p>`:""}<span class="meta">${fmtDate(a.date)}<span class="dot">&middot;</span>${a.read} min read</span></a>`;
}
function riverItem(a){
  const s=SECTIONS[a.section]||SECTIONS.learn;
  return `<a class="river-item" href="/articles/${a.slug}"><div class="cover"><img src="/assets/covers/${a.slug}.svg" alt="" width="800" height="450" loading="lazy"></div><div class="story"><span class="kicker">${s.name}</span><h3 class="story-title">${esc(a.title)}</h3><p class="story-dek">${esc(a.dek)}</p><span class="meta">${fmtDate(a.date)}<span class="dot">&middot;</span>${a.read} min read</span></div></a>`;
}
function board({title,sub,src="pro",cols="yield,er,aum,tr",sort,n=10,views,syms,minAum,exclude,foot}){
  return `<div class="board" data-w="board" data-src="${src}" data-cols="${cols}" data-sort="${sort||cols.split(",")[0]}" data-n="${n}"${syms?` data-syms="${syms}"`:""}${minAum?` data-min-aum="${minAum}"`:""}${exclude?` data-exclude="${exclude}"`:""}>
  <div class="board-head"><div><h3>${title}</h3>${sub?`<p class="meta">${sub}</p>`:""}</div>${views?`<div class="tabs" role="group">${views.map((v,i)=>`<button type="button" data-view="${v[0]}"${v[2]?` data-dir="${v[2]}"`:""} aria-pressed="${i===0}">${v[1]}</button>`).join("")}</div>`:""}</div>
  <div class="tbl-scroll"><table class="data"><thead></thead><tbody>${staticRows(src,cols,sort||cols.split(",")[0],n,syms,minAum,exclude)}</tbody></table></div>
  <div class="board-foot"><span>Click a column to sort. Click a ticker for the full profile.</span><span>${foot||`Source: TopETFs database`}</span></div></div>`;
}
function staticRows(src,cols,sort,n,syms,minAum,exclude){
  let list=syms?syms.split(",").map(s=>ALL[s.trim()]).filter(Boolean):D[src].slice();
  if(minAum) list=list.filter(e=>(e.aum||0)>=minAum);
  if(exclude){const ex=exclude.split(",");list=list.filter(e=>!ex.includes(e.sym));}
  const dir=sort==="er"?1:-1;
  list=list.filter(e=>e[sort]!=null).sort((a,b)=>dir*(a[sort]-b[sort])).slice(0,n);
  const fm={yield:F.pct,er:F.pct2,aum:F.aum,tr:F.signed,decay:F.decay,freq:F.text,provider:F.text};
  return list.map(e=>`<tr><td><a class="tk" href="/etf?t=${e.sym}">${e.sym}</a><span class="fund-name">${esc(e.name)}</span></td>${cols.split(",").map(c=>`<td>${fm[c](e[c])}</td>`).join("")}</tr>`).join("");
}
const proBand=(h="Screen 160+ income ETFs like a pro",p="TopDividendETFsPRO is our premium terminal: every income ETF we track with advanced filters, fees, AUM, payout schedules, total returns and price decay in one place.")=>`<section class="pro-band"><div><span class="kicker">TopDividendETFsPRO</span><h2>${h}</h2><p>${p}</p></div><a class="btn btn-gold" href="https://topdividendetfspro.com/" target="_blank" rel="noopener">Go PRO &rarr;</a></section>`;
function networkGrid(){
  return `<div class="net-grid">${NETWORK.map(n=>`<a class="net-card" href="https://${n.domain}/" target="_blank" rel="noopener"><div class="net-top"><div class="net-logo" style="background:${n.color}">${n.mark}</div><div><h3>${n.name}</h3><div class="domain">${n.domain}</div></div></div><p>${n.desc}</p><span class="go">Visit ${n.domain} &rarr;</span></a>`).join("")}</div>`;
}

/* ---------------- pages ---------------- */
const out={};
const lead=ARTICLES.find(a=>a.lead)||ARTICLES[0];
const rest=ARTICLES.filter(a=>a!==lead);
const bySec=k=>ARTICLES.filter(a=>a.section===k);

// Home
out["index.html"]=page({title:"TopETFs: ETF news, research and income math with live data",desc:"TopETFs is an ETF research hub: plain-English stories on income, weekly-pay and growth ETFs with live yields, total returns and interactive calculators.",canonical:"/",active:"/",
 ld:{"@context":"https://schema.org","@type":"WebSite",name:"TopETFs",url:SITE,publisher:{"@type":"Organization",name:"Dividend Empire LLC"},potentialAction:{"@type":"SearchAction",target:SITE+"/etf?t={search_term_string}","query-input":"required name=search_term_string"}}},
`<div class="wrap">
<h1 class="sr-only">TopETFs: ETF research with live data</h1>
<section class="hero">
  ${storyCard(lead,{cls:"hero-lead"})}
  <div class="hero-side">${rest.slice(0,2).map(a=>storyCard(a,{dek:false})).join("")}</div>
  <div class="rail"><h3>Most read</h3><ol class="rank-list">${rest.slice(2,7).map(a=>`<li><a href="/articles/${a.slug}">${esc(a.title)}</a></li>`).join("")}</ol>
    <p style="margin-top:14px"><button class="btn btn-ghost" style="width:100%" data-open-search>${ICON_SEARCH.replace("<svg",'<svg width="16" height="16"')} Search any ETF</button></p></div>
</section>

<aside class="pro-ad" aria-label="TopDividendETFsPRO">
  <span class="pro-ad-tag">From our network</span>
  <a class="pro-ad-card" href="https://topdividendetfspro.com/?utm_source=topetfs&amp;utm_medium=home_display&amp;utm_campaign=pro" target="_blank" rel="noopener" data-ga="pro_display_home">
    <div class="pro-ad-copy">
      <div class="pro-ad-brand"><span class="pro-ad-mark">PRO</span><span>TopDividendETFs<b>PRO</b></span></div>
      <h2>The research terminal for income investors</h2>
      <p>Every income ETF we track in one screen, with advanced filters, ratings, tax treatment, payout schedules, total returns and price decay.</p>
      <ul class="pro-ad-feats"><li>Advanced filters</li><li>Ratings &amp; tax grades</li><li>Yield &amp; return movers</li><li>Watchlists</li></ul>
    </div>
    <div class="pro-ad-viz" aria-hidden="true">
      <div class="pv-head"><span></span><span></span><span></span></div>
      <div class="pv-row"><i style="width:34%"></i><i class="g" style="width:78%"></i></div>
      <div class="pv-row"><i style="width:28%"></i><i class="g" style="width:64%"></i></div>
      <div class="pv-row"><i style="width:40%"></i><i class="g" style="width:52%"></i></div>
      <div class="pv-row"><i style="width:24%"></i><i class="g" style="width:41%"></i></div>
      <svg viewBox="0 0 200 48" class="pv-spark"><path d="M2 40 L26 34 L44 37 L66 26 L88 29 L110 18 L132 21 L156 11 L178 13 L198 4" fill="none" stroke="#f2c14e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="198" cy="4" r="3" fill="#f2c14e"/></svg>
    </div>
    <div class="pro-ad-cta"><span class="btn btn-gold">Explore PRO &rarr;</span><small>topdividendetfspro.com</small></div>
  </a>
</aside>

<div class="section-head"><div><h2>Latest</h2><p>New stories every day, built on live data</p></div><a href="/latest">All stories &rarr;</a></div>
<div class="grid-3">${rest.slice(0,6).map(a=>storyCard(a)).join("")}</div>

<div class="section-head"><div><h2>Income</h2><p>Dividend and option-income ETFs, ranked live</p></div><a href="/dividend">Income hub &rarr;</a></div>
<div class="grid-2" style="align-items:start">
  ${board({title:"Biggest income ETFs",sub:"Funds with $5B+ in assets, by yield",cols:"yield,er,aum",sort:"yield",n:8,minAum:5e9,views:[["yield","Yield"],["aum","Assets"],["er","Lowest fee","asc"]]})}
  <div class="river">${bySec("income").slice(0,3).map(a=>storyCard(a,{img:false})).join('<hr style="border:0;border-top:1px solid var(--rule);margin:16px 0">')}</div>
</div>

<div class="section-head"><div><h2>Weekly Pay</h2><p>Funds that pay you every week</p></div><a href="/weekly">Weekly hub &rarr;</a></div>
<div class="grid-2" style="align-items:start">
  <div class="figure" style="margin:0" data-w="income" data-src="weekly" data-default="${D.weekly.some(e=>e.sym==="QDTE")?"QDTE":D.weekly[0].sym}">
    <p class="figure-title">Weekly income calculator</p><p class="figure-sub">Pick a weekly payer and an amount</p>
    <div class="controls"><div class="field"><label for="hw-amt">Invest</label><input id="hw-amt" name="amount" inputmode="decimal" value="10000"></div><div class="field"><label>ETF</label><select aria-label="ETF"></select></div></div>
    <div class="results"><div><div class="label">Per week</div><div class="value big" data-o="weekly">$0</div></div><div><div class="label">Per month</div><div class="value" data-o="monthly">$0</div></div><div><div class="label">Per year</div><div class="value" data-o="annual">$0</div></div></div>
    <p class="figure-note" data-o="name"></p><p class="figure-note">At the current distribution yield. Payouts change every week and are not guaranteed.</p>
  </div>
  <div class="river">${bySec("weekly").slice(0,3).map(a=>storyCard(a,{img:false})).join('<hr style="border:0;border-top:1px solid var(--rule);margin:16px 0">')}</div>
</div>

<div class="section-head"><div><h2>Growth</h2><p>Where long-term total return has come from</p></div><a href="/growth">Growth hub &rarr;</a></div>
<div class="grid-2" style="align-items:start">
  <div class="figure" style="margin:0" data-w="growthTen" data-n="10" data-min-aum="10000000000"><p class="figure-title">What $10,000 became</p><p class="figure-sub">Growth ETFs over $10B, total return since each fund's inception</p><div class="chart" style="min-height:300px"></div><p class="figure-note">Funds launched in different years, so this is a scoreboard of history, not a fair race. Hover a bar for details.</p></div>
  <div class="river">${bySec("growth").slice(0,3).map(a=>storyCard(a,{img:false})).join('<hr style="border:0;border-top:1px solid var(--rule);margin:16px 0">')}</div>
</div>

${proBand()}

<div class="section-head"><div><h2>ETF 101</h2><p>The concepts behind every number on this site</p></div><a href="/learn">Start learning &rarr;</a></div>
<div class="grid-3">${[...bySec("learn"),...bySec("tools")].slice(0,3).map(a=>storyCard(a)).join("")}</div>

<div class="section-head"><div><h2>The TopETFs network</h2><p>Nine specialist sites, one research team</p></div><a href="/network">See all &rarr;</a></div>
${networkGrid()}
</div>`);

// Latest
out["latest.html"]=page({title:"Latest ETF stories | TopETFs",desc:"Every TopETFs story, newest first: income, weekly-pay and growth ETF research with live data.",canonical:"/latest",active:"/latest"},
`<header class="page-head"><div class="wrap"><span class="kicker">All stories</span><h1>Latest</h1><p>Every story we publish, newest first. Numbers inside each story update live from our database.</p>
<div class="chipbar" id="filters"><button class="chip" aria-pressed="true" data-f="all">All</button>${Object.entries(SECTIONS).map(([k,s])=>`<button class="chip" aria-pressed="false" data-f="${k}">${s.name}</button>`).join("")}</div></div></header>
<div class="wrap"><div class="river" id="river">${ARTICLES.map(a=>riverItem(a).replace('class="river-item"',`class="river-item" data-sec="${a.section}"`)).join("")}</div></div>
<script>document.getElementById("filters").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;this.querySelectorAll("button").forEach(function(x){x.setAttribute("aria-pressed",x===b);});var f=b.getAttribute("data-f");document.querySelectorAll("#river [data-sec]").forEach(function(r){r.style.display=f==="all"||r.getAttribute("data-sec")===f?"":"none";});});</script>`);

// Section hubs
const hub=(file,key,title,h1,intro,boardHtml,extra="")=>{
  const list=bySec(key);
  out[file]=page({title,desc:intro,canonical:"/"+file.replace(".html",""),active:"/"+file.replace(".html","")},
  `<header class="page-head"><div class="wrap"><span class="kicker">${SECTIONS[key].name}</span><h1>${h1}</h1><p>${intro}</p></div></header>
<div class="wrap">
${list.length?`<div class="section-head"><h2>Stories</h2></div><div class="grid-3">${list.map(a=>storyCard(a)).join("")}</div>`:""}
<div class="section-head"><div><h2>Live leaderboard</h2><p>Sorted from today's data. Click any fund for its profile.</p></div></div>
${boardHtml}
${extra}
${proBand()}
</div>`);
};
hub("dividend.html","income","Income ETFs: dividend and option-income research | TopETFs","Income ETFs","Dividend ETFs, covered call funds and option-income strategies, explained with live yields, fees and total returns.",
  board({title:"Income ETF leaderboard",sub:"Our income list, sorted live",src:"pro",cols:"yield,er,aum,tr,freq",sort:"yield",n:25,views:[["yield","Yield"],["tr","Total return"],["aum","Assets"],["er","Lowest fee","asc"]]}),
  `<div class="figure" data-w="yieldScatter"><p class="figure-title">Yield vs. total return</p><p class="figure-sub">Each dot is one income ETF. <span data-count>0</span> funds shown.</p><div class="controls"><div class="field" style="max-width:320px"><label>Max yield shown <output>40%</output></label><input type="range" min="5" max="120" step="5" value="40" aria-label="Max yield"></div></div><div class="legend"></div><div class="chart"></div><p class="figure-note">Total return since inception, which rewards older funds. Price decay means the share price is below where it started. Click a dot to open the fund.</p></div>`);
hub("weekly.html","weekly","Weekly pay ETFs: income every week | TopETFs","Weekly Pay ETFs","Funds that distribute every week, with live yields, price decay and total return so you can see the whole trade, not just the payout.",
  board({title:"Weekly-pay leaderboard",sub:`From WeeklyETFs.com, ${D.weekly.length} funds`,src:"weekly",cols:"yield,tr,decay",sort:"yield",n:25,views:[["yield","Yield"],["tr","Total return"]]}),
  `<p class="center" style="margin-top:18px"><a class="btn btn-ghost" href="https://weeklyetfs.com/" target="_blank" rel="noopener">See the full list on WeeklyETFs.com &rarr;</a></p>`);
hub("growth.html","growth","Growth ETFs: total return leaders | TopETFs","Growth ETFs","Large-cap, mid-cap and thematic growth funds ranked by total return and assets, with the context behind the numbers.",
  board({title:"Growth leaderboard",sub:`From GrowthETFs.com, ${D.growth.length} funds`,src:"growth",cols:"tr,aum",sort:"aum",n:25,views:[["aum","Assets"],["tr","Total return"]]}),
  `<p class="center" style="margin-top:18px"><a class="btn btn-ghost" href="https://growthetfs.com/" target="_blank" rel="noopener">Explore GrowthETFs.com &rarr;</a></p>`);
hub("learn.html","learn","ETF 101: how ETFs work, explained | TopETFs","ETF 101","The concepts behind every number on this site: what an ETF is, how yield and total return differ, and what fees really cost.",
  board({title:"The core dividend ETFs",sub:"Where most dividend portfolios start",syms:"SCHD,VYM,DGRO,VIG,HDV,NOBL,DGRW,FDVV,SPHD",cols:"yield,er,aum,tr",sort:"aum",n:9,views:[["aum","Assets"],["yield","Yield"],["er","Lowest fee","asc"]]}));

// Tools
out["tools.html"]=page({title:"ETF calculators: income, DRIP and fee drag | TopETFs",desc:"Free ETF calculators with live yields: dividend income, DRIP compounding and expense ratio drag.",canonical:"/tools",active:"/tools"},
`<header class="page-head"><div class="wrap"><span class="kicker">Tools</span><h1>ETF calculators</h1><p>Run the numbers yourself. Income math uses live yields from our database.</p></div></header>
<div class="wrap" style="max-width:900px">
<div class="figure" data-w="income" data-src="all" data-default="SCHD" id="income"><p class="figure-title">Dividend income calculator</p><p class="figure-sub">Any ETF in our database, at its current distribution yield</p>
 <div class="controls"><div class="field"><label>Invest</label><input name="amount" inputmode="decimal" value="25000"></div><div class="field"><label>ETF</label><select aria-label="ETF"></select></div></div>
 <div class="results"><div><div class="label">Per year</div><div class="value big" data-o="annual">$0</div></div><div><div class="label">Per month</div><div class="value" data-o="monthly">$0</div></div><div><div class="label" data-o="perLabel">Per payout</div><div class="value" data-o="per">$0</div></div></div><p class="figure-note" data-o="name"></p></div>
${dripWidget()}
${feeWidget()}
<p class="center" style="margin-top:24px"><a class="btn btn-ghost" href="https://topdividendtools.com/" target="_blank" rel="noopener">More calculators on TopDividendTools.com &rarr;</a> <a class="btn btn-ghost" href="https://dividendprojection.com/" target="_blank" rel="noopener">Project your income on DividendProjection.com &rarr;</a></p>
${proBand()}
</div>`);

export function dripWidget(){ return `<div class="figure" data-w="drip" id="drip"><p class="figure-title">DRIP compounding calculator</p><p class="figure-sub">Reinvesting dividends vs. spending them</p>
 <div class="controls"><div class="field"><label>Starting amount</label><input type="number" name="start" value="10000" min="0" step="500"></div><div class="field"><label>Monthly add</label><input type="number" name="monthly" value="500" min="0" step="50"></div>
 <div class="field"><label>Yield <output for="yield"></output></label><input type="range" name="yield" min="0" max="15" step="0.5" value="3.5" data-unit="%"></div><div class="field"><label>Price growth / yr <output for="growth"></output></label><input type="range" name="growth" min="-5" max="12" step="0.5" value="6" data-unit="%"></div><div class="field"><label>Years <output for="years"></output></label><input type="range" name="years" min="1" max="40" step="1" value="20"></div></div>
 <div class="legend"></div><div class="chart"></div>
 <div class="results"><div><div class="label">Ending value (DRIP)</div><div class="value big" data-o="end">$0</div></div><div><div class="label">Annual income at the end</div><div class="value" data-o="income">$0</div></div><div><div class="label">Cash route (value + dividends)</div><div class="value" data-o="cash">$0</div></div><div><div class="label">You contributed</div><div class="value" data-o="contrib">$0</div></div></div>
 <p class="figure-note">Illustration only. Assumes a steady yield and price growth, monthly compounding and no taxes. Real results vary.</p></div>`; }
export function feeWidget(){ return `<div class="figure" data-w="fees" id="fees"><p class="figure-title">Expense ratio drag</p><p class="figure-sub">The same investment at two different fees</p>
 <div class="controls"><div class="field"><label>Starting amount</label><input type="number" name="start" value="50000" min="0" step="1000"></div><div class="field"><label>Monthly add</label><input type="number" name="monthly" value="500" min="0" step="50"></div><div class="field"><label>Return before fees <output for="ret"></output></label><input type="range" name="ret" min="2" max="12" step="0.5" value="8" data-unit="%"></div></div>
 <div class="controls"><div class="field"><label>Fee A <output for="er1"></output></label><input type="range" name="er1" min="0" max="1.5" step="0.01" value="0.06" data-unit="%"></div><div class="field"><label>Fee B <output for="er2"></output></label><input type="range" name="er2" min="0" max="1.5" step="0.01" value="0.75" data-unit="%"></div><div class="field"><label>Years <output for="years"></output></label><input type="range" name="years" min="1" max="40" step="1" value="30"></div></div>
 <div class="legend"></div><div class="chart"></div>
 <div class="results"><div><div class="label">Ending value, fee A</div><div class="value" data-o="a">$0</div></div><div><div class="label">Ending value, fee B</div><div class="value" data-o="b">$0</div></div><div><div class="label">Cost of the higher fee</div><div class="value big" data-o="gap">$0</div></div><div><div class="label">Share of the pot</div><div class="value" data-o="share">0%</div></div></div>
 <p class="figure-note">Illustration only. Fees are deducted monthly from a steady return. Actual fund returns vary.</p></div>`; }

// ETF profile
out["etf.html"]=page({title:"ETF profile | TopETFs",desc:"ETF profile with live yield, total return, expense ratio, AUM and an income calculator.",canonical:"/etf",active:""},
`<div class="wrap" style="margin-top:30px"><div data-w="profile"><div class="card" style="padding:28px"><span class="skeleton">Loading fund data</span></div></div>
<div class="section-head"><h2>Related stories</h2></div><div class="grid-3" data-related-for=""></div>
${proBand()}</div>`);

// Network
out["network.html"]=page({title:"The TopETFs network: nine ETF research sites | TopETFs",desc:"TopETFs is part of a network of specialist ETF sites: TopDividendETFs, WeeklyETFs, MonthlyETFs, GrowthETFs, ETFTotalReturns and more.",canonical:"/network",active:"/network"},
`<header class="page-head"><div class="wrap"><span class="kicker">Network</span><h1>One research team, nine specialist sites</h1><p>Each site goes deep on one corner of the ETF market. TopETFs pulls them together into one place to read, learn and run the numbers.</p></div></header>
<div class="wrap" style="margin-top:28px">${networkGrid()}${proBand()}</div>`);

// About + disclaimer
out["about.html"]=page({title:"About TopETFs",desc:"TopETFs is an ETF research hub published by Dividend Empire LLC.",canonical:"/about"},
`<header class="page-head"><div class="wrap"><span class="kicker">About</span><h1>About TopETFs</h1><p>ETF research in plain English, with the numbers kept live.</p></div></header>
<div class="wrap" style="max-width:760px;margin-top:28px"><div class="prose">
<p>TopETFs is the research hub of a network of ETF sites built by an investor with more than ten years of dividend investing behind him. The rest of the network is built for scanning tables. This site is built for reading: stories that explain what a fund actually does, why its yield looks the way it does, and what the math means for your money.</p>
<p>Every number inside a story is pulled from the same database that powers <a href="https://topdividendetfs.com/">TopDividendETFs.com</a>, <a href="https://weeklyetfs.com/">WeeklyETFs.com</a>, <a href="https://growthetfs.com/">GrowthETFs.com</a> and <a href="https://topdividendetfspro.com/">TopDividendETFsPRO</a>. When the data changes, the stories change with it. Fund details come from issuer websites and SEC filings.</p>
<p>TopETFs is published by Dividend Empire LLC. Some placements on the site are paid sponsorships from ETF issuers, and they are always labeled "Sponsored." Sponsors do not see or approve our stories.</p>
<p>TopETFs was founded by <a href="/author/benjie-siegel">Benjie Siegel</a>, who writes and oversees everything published here.</p>
<p>Articles are written with the help of AI tools, then edited, fact-checked and shaped by Benjie around the topics he finds most useful. All fund data comes live from our database.</p>
<p>Questions, corrections or partnership ideas: <a href="/contact">contact us</a> or email <a href="mailto:${EMAIL}">${EMAIL}</a>.</p></div></div>`);

// Author
out["author/benjie-siegel.html"]=page({title:"Benjie Siegel, Founder of TopETFs",desc:"Benjie Siegel is the founder of TopETFs and Dividend Empire LLC, a dividend investor of more than ten years who runs a network of ETF research sites.",canonical:"/author/benjie-siegel",
 ld:{"@context":"https://schema.org","@type":"ProfilePage",mainEntity:{"@type":"Person",name:AUTHOR.name,jobTitle:AUTHOR.title,url:SITE+AUTHOR.url,worksFor:{"@type":"Organization",name:"Dividend Empire LLC"},email:"mailto:"+EMAIL,sameAs:NETWORK.map(n=>"https://"+n.domain+"/")}}},
`<header class="page-head"><div class="wrap"><div class="author-hero"><span class="avatar xl">BS</span><div><span class="kicker">Founder</span><h1>Benjie Siegel</h1><p>Founder of TopETFs and Dividend Empire LLC. Dividend investor for more than ten years. Builder of the TopETFs network.</p></div></div></div></header>
<div class="wrap" style="max-width:760px;margin-top:28px"><div class="prose">
<p class="lede">I started investing in dividend stocks and ETFs more than ten years ago, and like a lot of people I learned the hard way that the biggest yield on the screen is not always the best investment. Most of the ETF information I found was either buried in fund documents or written to sell something. So I started building the tools I wished I had.</p>
<h2>What I built</h2>
<p>That started with <a href="https://topdividendetfs.com/">TopDividendETFs.com</a>, a free, daily-updated ranking of top dividend ETFs. It grew into a network of specialist sites, each focused on one corner of the ETF market: <a href="https://weeklyetfs.com/">WeeklyETFs.com</a> for weekly payers, <a href="https://monthlyetfs.com/">MonthlyETFs.com</a> for monthly income, <a href="https://growthetfs.com/">GrowthETFs.com</a>, <a href="https://etftotalreturns.com/">ETFTotalReturns.com</a>, <a href="https://topdividendtools.com/">TopDividendTools.com</a>, <a href="https://dividendprojection.com/">DividendProjection.com</a> and <a href="https://photonicsetfs.com/">PhotonicsETFs.com</a>. For investors who want to go deeper, <a href="https://topdividendetfspro.com/">TopDividendETFsPRO</a> is a premium terminal covering 160+ income ETFs.</p>
<p>I built every one of these sites myself, without outside funding and without a background in web development. I also share ETF research every day with more than 80,000 followers on X and on YouTube under the name DevotedDividend.</p>
<h2>Why TopETFs</h2>
<p>The rest of the network is built for scanning tables. TopETFs is built for reading. My goal is to explain ETFs in plain English: what a fund actually does, where its yield comes from, what it costs, and how it has really performed, with every number pulled live from the same database that powers the rest of the network.</p>
<h2>How I work</h2>
<ul>
<li><strong>Numbers first.</strong> Yields, fees, assets and total returns come from our database and update daily. When the data changes, the articles change with it.</li>
<li><strong>Show the whole trade.</strong> A high yield is always shown next to total return and price history, so you can see what it costs.</li>
<li><strong>Primary sources.</strong> Fund details come from issuer websites, prospectuses and SEC filings.</li>
<li><strong>AI as a tool, not the author.</strong> I use AI tools to help research, draft and format articles. I choose every topic based on my own interests and what I think will help investors, and I review, edit and fact-check everything before it goes live.</li>
<li><strong>Clear about money.</strong> The network is supported by clearly labeled sponsorships from ETF issuers. Sponsors never see or approve what I write.</li>
</ul>
<h2>What I am not</h2>
<p>I am not a licensed financial advisor, and nothing on this site is personal investment advice. I write about ETFs I research and sometimes own, and I always recommend reading a fund's prospectus and talking with a professional before investing. See the full <a href="/disclaimer">disclaimer</a>.</p>
<h2>Get in touch</h2>
<p>Corrections, questions and partnership ideas are always welcome at <a href="mailto:${EMAIL}">${EMAIL}</a> or through the <a href="/contact">contact page</a>.</p>
</div>
<div class="section-head"><h2>Latest from Benjie</h2><a href="/latest">All stories &rarr;</a></div>
<div class="grid-3">${ARTICLES.slice(0,6).map(a=>storyCard(a)).join("")}</div></div>`);

out["author/benjamin-siegel.html"]=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Benjie Siegel</title><link rel="canonical" href="${SITE}/author/benjie-siegel"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=/author/benjie-siegel"></head><body><a href="/author/benjie-siegel">Benjie Siegel</a></body></html>`;

// Contact
out["contact.html"]=page({title:"Contact TopETFs",desc:"Contact TopETFs for corrections, questions, partnerships and ETF issuer sponsorships.",canonical:"/contact"},
`<header class="page-head"><div class="wrap"><span class="kicker">Contact</span><h1>Contact us</h1><p>We read every message. The fastest way to reach us is email.</p></div></header>
<div class="wrap" style="max-width:860px;margin-top:28px">
<div class="contact-card"><div><div class="label">Email</div><a class="contact-email" href="mailto:${EMAIL}">${EMAIL}</a><p class="muted" style="margin:6px 0 0">We usually reply within one to two business days.</p></div><a class="btn btn-navy" href="mailto:${EMAIL}">Send an email</a></div>
<div class="grid-3" style="margin-top:22px">
<div class="net-card"><h3>Corrections</h3><p>Spot a number that looks off or a fund detail that has changed? Send the ticker and the page link and we will check it against the source.</p></div>
<div class="net-card"><h3>Partnerships and sponsorships</h3><p>ETF issuers and financial brands can reach our audience across the TopETFs network. Email us or see our <a href="https://topdividendetfs.com/advertise.html">advertising page</a>.</p></div>
<div class="net-card"><h3>Questions and feedback</h3><p>Ideas for a story, a calculator or a data feature? We would love to hear them.</p></div>
</div>
<div class="callout" style="margin-top:26px"><strong>Please note</strong>We cannot give personal investment advice or tell you whether to buy or sell a specific fund. For decisions about your own money, please talk with a licensed financial advisor.</div>
<p class="muted" style="font-size:14px">TopETFs is published by Dividend Empire LLC. Founder: <a href="/author/benjie-siegel">Benjie Siegel</a>.</p>
</div>`);

// Privacy
out["privacy.html"]=page({title:"Privacy Policy | TopETFs",desc:"How TopETFs.com collects, uses and protects information, including cookies, analytics and advertising.",canonical:"/privacy"},
`<header class="page-head"><div class="wrap"><span class="kicker">Legal</span><h1>Privacy Policy</h1><p>Effective September 27, 2026</p></div></header>
<div class="wrap" style="max-width:760px;margin-top:28px"><div class="prose">
<div class="takeaways"><h2>The short version</h2><ul>
<li>You do not need an account to use TopETFs, and we do not ask for your name, email or payment details to read the site.</li>
<li>We use Google Analytics to understand how the site is used, and we may show ads that use cookies.</li>
<li>We do not sell your personal information.</li>
<li>You can block or delete cookies at any time, and you can opt out of personalized ads.</li>
</ul></div>
<p>This Privacy Policy explains how Dividend Empire LLC ("we," "us" or "our") handles information when you visit TopETFs.com (the "Site"). By using the Site, you agree to the practices described here.</p>

<h2>1. Information we collect</h2>
<h3>Information you give us</h3>
<p>If you email us, we receive your email address, your name if you include it, and anything you choose to write. We use it only to reply and to keep a record of the conversation.</p>
<h3>Information collected automatically</h3>
<p>Like most websites, when you visit the Site we and our service providers automatically receive certain technical information, such as your IP address, browser type, device type, operating system, referring page, the pages you view, the time and length of your visit, and approximate location (city or region) derived from your IP address.</p>
<h3>Information stored in your browser</h3>
<p>The Site stores a small amount of information in your own browser to make it work better, for example your light or dark mode choice and a short-term copy of ETF data so pages load faster. This information stays on your device and is not sent to us.</p>

<h2>2. Cookies and similar technologies</h2>
<p>Cookies are small text files placed on your device. We and our partners use cookies and similar technologies to:</p>
<ul>
<li><strong>Measure usage.</strong> Understand which pages are read and how visitors find the Site.</li>
<li><strong>Show and measure advertising.</strong> Display ads and measure how they perform, if and when advertising runs on the Site.</li>
<li><strong>Remember preferences.</strong> Keep settings such as dark mode.</li>
</ul>
<p>You can block or delete cookies through your browser settings. Some parts of the Site may not work as intended without them.</p>

<h2>3. Google Analytics</h2>
<p>We use Google Analytics 4, a web analytics service provided by Google LLC, to understand how visitors use the Site. Google Analytics uses cookies to collect information such as pages visited, time on site and general location. This information is used to produce aggregate reports and does not identify you by name. You can learn how Google uses this data at <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">How Google uses information from sites that use its services</a>, and you can opt out with the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics Opt-out Browser Add-on</a>.</p>

<h2>4. Advertising</h2>
<p>The Site may display advertising, including ads served by Google AdSense and other third-party ad networks, as well as sponsorships from ETF issuers that are clearly labeled "Sponsored."</p>
<ul>
<li>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this Site or other websites.</li>
<li>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this Site and/or other sites on the internet.</li>
<li>You may opt out of personalized advertising by visiting Google's <a href="https://adssettings.google.com" target="_blank" rel="noopener">Ads Settings</a>. You can also opt out of some third-party vendors' use of cookies for personalized advertising at <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener">www.aboutads.info</a> and, in the EU, <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener">www.youronlinechoices.eu</a>.</li>
</ul>
<p>Where required by law, such as for visitors in the European Economic Area, the United Kingdom and Switzerland, we will ask for your consent before personalized advertising cookies are used.</p>

<h2>5. Other third-party services</h2>
<p>To run the Site, your browser connects to a few outside services, which may receive your IP address and standard browser information:</p>
<ul>
<li><strong>GitHub Pages</strong> hosts the Site.</li>
<li><strong>Google Fonts</strong> delivers the typefaces used on the Site.</li>
<li><strong>Google Sheets</strong> supplies the live ETF data shown in articles and tables.</li>
</ul>
<p>The Site also links to other websites, including our network sites, ETF issuers and the SEC. We are not responsible for the privacy practices of other websites, so please review their policies.</p>

<h2>6. How we use information</h2>
<p>We use information to operate and improve the Site, understand what content is useful, respond to messages, show and measure advertising, keep the Site secure, and comply with legal obligations.</p>

<h2>7. How we share information</h2>
<p><strong>We do not sell your personal information</strong>, and we do not share it for money. We share information only with service providers that help us run the Site (such as the analytics, hosting and advertising partners listed above), when required by law, or to protect our rights and the safety of our users.</p>

<h2>8. Data retention</h2>
<p>Google Analytics data is kept for the retention period set in our Analytics account, after which it is deleted. Emails you send us are kept only as long as needed to respond and keep reasonable business records.</p>

<h2>9. Your privacy rights</h2>
<p>Depending on where you live, you may have the right to know what personal information we hold about you, to request a copy, to correct it, to delete it, or to object to or limit certain uses, including opting out of targeted advertising.</p>
<ul>
<li><strong>California residents</strong> have these rights under the California Consumer Privacy Act (CCPA), as amended by the CPRA. We do not sell personal information or use it for purposes that require a "Do Not Sell or Share" opt-out beyond the advertising choices described above, and we will not discriminate against you for exercising your rights.</li>
<li><strong>Visitors in the EEA, UK and Switzerland</strong> have rights under the GDPR, including the right to lodge a complaint with a data protection authority. Our legal bases are your consent (for advertising and analytics cookies where required) and our legitimate interest in operating and improving the Site.</li>
</ul>
<p>To make a request, email <a href="mailto:${EMAIL}">${EMAIL}</a>. We may need to verify your request before acting on it.</p>

<h2>10. Children's privacy</h2>
<p>The Site is intended for adults and is not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has sent us information, contact us and we will delete it.</p>

<h2>11. Security</h2>
<p>The Site is served over encrypted HTTPS connections. No method of transmission or storage is completely secure, but we use reasonable measures to protect information.</p>

<h2>12. Changes to this policy</h2>
<p>We may update this Privacy Policy from time to time. When we do, we will change the effective date at the top of this page. Significant changes will be highlighted on the Site.</p>

<h2>13. Contact</h2>
<p>Dividend Empire LLC<br>Email: <a href="mailto:${EMAIL}">${EMAIL}</a><br>Web: <a href="/contact">topetfs.com/contact</a></p>
</div></div>`);

out["disclaimer.html"]=page({title:"Disclaimer | TopETFs",desc:"Important information about the data and content on TopETFs.com.",canonical:"/disclaimer"},
`<header class="page-head"><div class="wrap"><span class="kicker">Legal</span><h1>Disclaimer</h1></div></header>
<div class="wrap" style="max-width:760px;margin-top:28px"><div class="prose"><p>${DISCLAIMER.replace("<strong>Disclaimer:</strong> ","")}</p>
<p>Distribution yields shown are based on recent distributions and are not a promise of future income. Option-income and single-stock income ETFs can lose value quickly and are not suitable for every investor. "Price decay" on this site simply means a fund's share price is below its starting price and is not a buy or sell signal.</p></div></div>`);

out["404.html"]=page({title:"Page not found | TopETFs",desc:"That page does not exist.",canonical:"/404"},
`<div class="wrap center" style="padding:70px 0"><span class="kicker">404</span><h1 class="h-serif" style="font-size:42px;margin:8px 0">That page moved or never existed</h1><p class="muted">Try the search, or head back to the front page.</p><p><a class="btn btn-navy" href="/">Front page</a> <button class="btn btn-ghost" data-open-search>Search ETFs</button></p></div>`);

// Articles
for(const a of ARTICLES){
  const s=SECTIONS[a.section]||SECTIONS.learn;
  const body=renderTokens(a.body);
  const url="/articles/"+a.slug;
  const keys=(a.keyNumbers||[]).map(([label,token])=>`<div class="kv"><span>${label}</span><span>${renderTokens(token)}</span></div>`).join("");
  const tk=new Set(a.tickers||[]);
  const more=ARTICLES.filter(x=>x!==a).map((x,i)=>({x,i,s:(x.tickers||[]).filter(t=>tk.has(t)).length})).sort((p,q)=>(q.s-p.s)||(p.i-q.i)).slice(0,5).map(o=>o.x);
  const faqs=[...body.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].filter(()=>/<section class="faq"/.test(body)).filter(m=>body.indexOf(m[0])>body.indexOf('<section class="faq"')).map(m=>({"@type":"Question",name:m[1].replace(/<[^>]+>/g,"").trim(),acceptedAnswer:{"@type":"Answer",text:m[2].replace(/<[^>]+>/g,"").trim()}}));
  out["articles/"+a.slug+".html"]=page({title:(a.seoTitle||a.title)+" | TopETFs",desc:a.dek,canonical:url,type:"article",active:s.path,slug:a.slug,
    ld:{"@context":"https://schema.org","@type":"Article",headline:a.title,description:a.dek,datePublished:a.date,dateModified:BUILD_DATE.toISOString().slice(0,10),author:{"@type":"Person",name:AUTHOR.name,url:SITE+AUTHOR.url,jobTitle:AUTHOR.title},publisher:{"@type":"Organization",name:"Dividend Empire LLC"},mainEntityOfPage:SITE+url,...(a.tickers&&a.tickers.length?{about:a.tickers.map(t=>({"@type":"Thing",name:t+(ALL[t]?" ("+ALL[t].name+")":"")}))}:{})},faq:faqs},
`<div class="wrap"><div class="article-wrap">
<article>
  <header class="article-head">
    <nav class="crumbs"><a href="/">Home</a> / <a href="${s.path}">${s.name}</a></nav>
    <span class="kicker">${s.name}</span>
    <h1>${esc(a.title)}</h1>
    <p class="dek">${esc(a.dek)}</p>
    <div class="byline"><a class="avatar" href="${AUTHOR.url}" aria-label="About ${AUTHOR.name}">BS</a><span>By <a href="${AUTHOR.url}"><strong>${AUTHOR.name}</strong></a>, ${AUTHOR.title}<br>${fmtDate(a.date)}<span class="dot">&middot;</span>${a.read} min read<span class="dot">&middot;</span><span class="live-dot"></span>Live data</span>
      <span class="share"><a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(SITE+url)}&text=${encodeURIComponent(a.title)}" target="_blank" rel="noopener">Share on X</a><button type="button" data-copy-link>Copy link</button></span></div>
  </header>
  <figure class="article-cover"><div class="cover"><img src="/assets/covers/${a.slug}.svg" alt="${esc(a.title)}" width="800" height="450"></div></figure>
  <div class="prose">
${body}
  <div class="author-box"><a class="avatar lg" href="${AUTHOR.url}">BS</a><div><div class="kicker">About the author</div><p><a href="${AUTHOR.url}"><strong>${AUTHOR.name}</strong></a> is the founder of Dividend Empire LLC and has been a dividend investor for more than ten years. He built and runs the TopETFs network, including TopDividendETFs.com and TopDividendETFsPRO, and shares daily ETF research with more than 80,000 followers as DevotedDividend. <a href="${AUTHOR.url}">More about Benjie</a></p></div></div>
  <p style="font-family:var(--sans);font-size:13.5px;color:var(--muted);line-height:1.55;margin:0 0 1.2em"><strong style="color:var(--ink-2)">How this article was made:</strong> Benjie picks every topic based on what he finds useful as a dividend investor and what readers ask about. Parts of this article were drafted with help from AI tools, then edited, fact-checked and shaped by Benjie. All fund numbers come from the TopETFs database and update daily.</p>
  <div class="callout"><strong>Keep going</strong>Screen every income ETF we track with filters for yield, fees, AUM and payout schedule on <a href="https://topdividendetfspro.com/">TopDividendETFsPRO</a>. For the full weekly list see <a href="https://weeklyetfs.com/">WeeklyETFs.com</a>, for monthly payers <a href="https://monthlyetfs.com/">MonthlyETFs.com</a>, and for growth funds <a href="https://growthetfs.com/">GrowthETFs.com</a>.</div>
  <p style="font-family:var(--sans);font-size:13px;color:var(--muted);line-height:1.6">${DISCLAIMER}</p>
  </div>
</article>
<aside class="article-aside"><div class="aside-sticky">
  ${keys?`<div class="aside-card"><h3>Key numbers</h3>${keys}<p class="figure-note">Live from the TopETFs database</p></div>`:""}
  <div class="aside-card"><h3>More from TopETFs</h3><ol class="rank-list">${more.map(x=>`<li><a href="/articles/${x.slug}">${esc(x.title)}</a></li>`).join("")}</ol></div>
  <div class="aside-card" style="background:var(--navy);border-color:var(--navy);color:#fff"><h3 style="color:#f2c14e">TopDividendETFsPRO</h3><p style="margin:0 0 12px;font-size:14px;color:rgba(255,255,255,.8)">160+ income ETFs with advanced filters in one terminal.</p><a class="btn btn-gold" style="width:100%" href="https://topdividendetfspro.com/" target="_blank" rel="noopener">Go PRO</a></div>
</div></aside>
</div>
<div class="section-head"><h2>Keep reading</h2><a href="/latest">All stories &rarr;</a></div>
<div class="grid-3" data-related-for="">${more.slice(0,3).map(x=>storyCard(x)).join("")}</div>
</div>`);
}

const SCREENER_PAGES=[];
// ETF Screener: /screener plus pre-built screen pages (each one a real, indexable URL)
{
  const TES=createRequire(import.meta.url)("../assets/js/screener.js");
  const slug=s=>s.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  const PRESETS=[
    {slug:"high-yield-etfs",chip:"High yield 10%+",d:{ymin:10,sort:"yield"},h1:"High Yield ETFs",t:"High Yield ETFs: Every ETF Yielding 10% or More, Ranked",intro:"Every ETF in our database yielding 10% or more, sorted by yield. Check the price decay and total return columns before you get excited about the payout."},
    {slug:"monthly-dividend-etfs",chip:"Monthly pay",d:{f:"Monthly",sort:"yield"},h1:"Monthly Dividend ETFs",t:"Monthly Dividend ETFs: Yields, Fees and Total Return, Ranked",intro:"ETFs that pay you every month, ranked by yield, with fees, fund size, total return and price decay side by side."},
    {slug:"weekly-dividend-etfs",chip:"Weekly pay",d:{f:"Weekly",sort:"yield"},h1:"Weekly Dividend ETFs",t:"Weekly Dividend ETFs: Every Fund That Pays Weekly, Ranked",intro:"Funds that distribute every single week. Most use option strategies to generate the payout, so total return and price decay matter a lot here."},
    {slug:"quarterly-dividend-etfs",chip:"Quarterly pay",d:{f:"Quarterly",sort:"aum"},h1:"Quarterly Dividend ETFs",t:"Quarterly Dividend ETFs: The Classic Dividend Payers, Ranked",intro:"The traditional dividend ETFs that pay four times a year, sorted by fund size."},
    {slug:"high-yield-etfs-without-price-decay",chip:"High yield, no decay",d:{ymin:8,decay:"no",sort:"yield"},h1:"High Yield ETFs Without Price Decay",t:"High Yield ETFs Without Price Decay: 8%+ Yield That Held Its Value",intro:"ETFs yielding 8% or more whose share price is not below where it started. Big income without the shrinking share price."},
    {slug:"largest-etfs",chip:"Largest ETFs",d:{sort:"aum"},h1:"Largest ETFs by Assets",t:"Largest ETFs by Assets Under Management (AUM)",intro:"The biggest funds we track, ranked by assets under management."},
    {slug:"low-expense-ratio-etfs",chip:"Lowest fees",d:{ermax:0.2,sort:"er",dir:"asc"},h1:"Low Expense Ratio ETFs",t:"Low Expense Ratio ETFs: Funds Charging 0.20% or Less",intro:"ETFs charging 0.20% a year or less, cheapest first. Fees come out of your return every year, so they add up."},
    {slug:"best-performing-etfs",chip:"Best annualized return",d:{age:3,sort:"ar"},h1:"Best Performing ETFs",t:"Best Performing ETFs by Annualized Return (3+ Year Track Record)",intro:"Funds with at least three years of history, ranked by annualized total return since inception, which levels the playing field between older and newer funds."},
    {slug:"large-dividend-etfs",chip:"$1B+ income ETFs",d:{u:"income",aum:1e9,sort:"yield"},h1:"Large Dividend ETFs",t:"Dividend and Income ETFs With $1 Billion or More in Assets",intro:"Income ETFs with at least $1 billion in assets, ranked by yield. Bigger funds usually trade with tighter spreads and have longer track records."},
    {slug:"new-etfs",chip:"New launches",d:{agemax:1,sort:"age",dir:"desc"},h1:"New ETFs",t:"New ETFs: Funds Launched in the Last 12 Months",intro:"Income and growth ETFs that launched within the last year, newest first. Short track records, so treat the numbers with care."},
    {slug:"growth-etfs",chip:"Growth ETFs",d:{u:"growth",sort:"aum"},h1:"Growth ETFs",t:"Growth ETFs: Total Return and Assets, Ranked",intro:"Growth funds from GrowthETFs.com ranked by size, with total and annualized return since inception."},
    {slug:"income-etfs",chip:"Income ETFs",d:{u:"income",sort:"yield"},h1:"Income ETFs",t:"Income ETFs: Dividend and Option-Income Funds, Ranked by Yield",intro:"Our full income list: dividend ETFs, covered call funds and option-income strategies, ranked by yield."}
  ];
  const pc={};for(const s in ALL){const p=ALL[s].provider;if(p)pc[p]=(pc[p]||0)+1;}
  const PROV=Object.entries(pc).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).map(([p,c])=>({slug:slug(p)+"-etfs",chip:p,d:{p,sort:"yield"},h1:`${p} ETFs`,t:`${p} ETFs: Full List With Yields, Fees and Total Returns`,intro:`Every ${p} ETF we track (${c} funds), with live yield, expense ratio, AUM, payout frequency, total return and price decay.`,prov:true}));
  const ALLP=[...PRESETS,...PROV];
  const chipbar=cur=>`<div class="chipbar scr-chips">${PRESETS.map(p=>`<a class="chip${cur===p.slug?" on":""}" href="/lists/${p.slug}">${p.chip}</a>`).join("")}</div>`;
  const linkGrid=cur=>`<div class="section-head"><h2>Popular screens</h2></div><div class="scr-links">${PRESETS.filter(p=>p.slug!==cur).map(p=>`<a href="/lists/${p.slug}">${p.h1}</a>`).join("")}</div>
<div class="section-head"><h2>ETFs by provider</h2></div><div class="scr-links">${PROV.filter(p=>p.slug!==cur).map(p=>`<a href="/lists/${p.slug}">${esc(p.h1)}</a>`).join("")}</div>`;
  const GLOSS=[
    ["What does the ETF screener do?","It filters every ETF in the TopETFs database by yield, payout frequency, fund size (AUM), expense ratio, total return, annualized return, price decay, fund age and provider. Every screen has its own link, so you can bookmark or share it."],
    ["How often is the data updated?","The numbers come from the same database behind TopDividendETFsPRO, WeeklyETFs.com and GrowthETFs.com and refresh every day."],
    ["What is price decay?","Price decay means the fund's share price is below where it started. Some high-yield funds pay out more than they earn, which shrinks the share price over time even while the payouts look great."],
    ["Why look at annualized return instead of total return?","Total return here is since each fund's inception, so a fund from 2011 will usually show a bigger number than one from 2024. Annualized return divides that into a yearly rate, which makes funds of different ages easier to compare."],
    ["What does the $10K pays per year column mean?","It is what $10,000 would pay over a year at the current yield. Payouts change, so treat it as a snapshot, not a promise."]
  ];
  const faqHtml=`<section class="faq scr-faq"><div class="section-head"><h2>How to use the ETF screener</h2></div>${GLOSS.map(([q,a])=>`<h3>${q}</h3><p>${a}</p>`).join("")}</section>`;
  const faqLd=GLOSS.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}));
  const shell=(base,d,lead,cur)=>{const q=TES.parse("",d);return `${chipbar(cur)}
<div class="scr" data-screener data-base="${base}" data-defaults='${esc(JSON.stringify(d))}'>
<div data-screener-formwrap>${TES.form(ALL,q)}</div>
<div data-screener-out>${TES.render(ALL,q,base,d)}</div>
</div>`;};
  const n=Object.keys(ALL).length;
  out["screener.html"]=page({title:`ETF Screener: Filter ${n}+ ETFs by Yield, AUM, Payout and Fees | TopETFs`,desc:`Free ETF screener. Filter ${n}+ dividend, weekly-pay and growth ETFs by yield, payout frequency, AUM, expense ratio, total return, price decay and provider.`,canonical:"/screener",active:"/screener",faq:faqLd,extra:`<script src="/assets/js/screener.js" defer></script>`,
    ld:{"@context":"https://schema.org","@type":"WebApplication",name:"TopETFs ETF Screener",url:SITE+"/screener",applicationCategory:"FinanceApplication",operatingSystem:"Any",offers:{"@type":"Offer",price:"0",priceCurrency:"USD"}}},
  `<header class="page-head"><div class="wrap"><span class="kicker">Free tool</span><h1>ETF Screener</h1><p>Filter ${n}+ ETFs by yield, payout frequency, fund size, fees, total return, price decay and more. Every screen gets its own link, so bookmark the ones you use.</p></div></header>
<div class="wrap">${shell("/screener",{},"",null)}
<aside class="pro-ad scr-pro"><a href="https://topdividendetfspro.com/" target="_blank" rel="noopener" data-ga="screener"><span class="kicker">TopDividendETFsPRO</span><strong>Want ratings, tax grades and alerts on top of this?</strong><span>PRO adds our grades, tax treatment and deeper filters for every income ETF we track. Go PRO &rarr;</span></a></aside>
${linkGrid(null)}${faqHtml}${proBand()}</div>`);
  for(const p of ALLP){
    const base="/lists/"+p.slug;
    out["lists/"+p.slug+".html"]=page({title:`${p.t} | TopETFs`,desc:p.intro,canonical:base,active:"/screener",faq:faqLd,extra:`<script src="/assets/js/screener.js" defer></script>`,
      ld:{"@context":"https://schema.org","@type":"CollectionPage",name:p.t,url:SITE+base,description:p.intro,isPartOf:{"@type":"WebSite",name:"TopETFs",url:SITE}}},
    `<header class="page-head"><div class="wrap"><nav class="crumbs"><a href="/">Home</a> / <a href="/screener">ETF Screener</a></nav><span class="kicker">ETF Screener</span><h1>${esc(p.h1)}</h1><p>${esc(p.intro)} Updated daily. Adjust any filter below to build your own screen.</p></div></header>
<div class="wrap">${shell(base,p.d,"",p.slug)}${linkGrid(p.slug)}${faqHtml}${proBand()}</div>`);
  }
  SCREENER_PAGES.push("/screener",...ALLP.map(p=>"/lists/"+p.slug));
}

// sitemap, rss, robots, CNAME, favicon
const pages=["/","/screener",...SCREENER_PAGES.slice(1),"/latest","/dividend","/weekly","/growth","/learn","/tools","/network","/about","/author/benjie-siegel","/contact","/privacy","/disclaimer"];
out["sitemap.xml"]=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p=>`  <url><loc>${SITE}${p}</loc><lastmod>${BUILD_DATE.toISOString().slice(0,10)}</lastmod></url>`).join("\n")}\n${ARTICLES.map(a=>`  <url><loc>${SITE}/articles/${a.slug}</loc><lastmod>${a.date}</lastmod></url>`).join("\n")}\n</urlset>\n`;
out["feed.xml"]=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>TopETFs</title><link>${SITE}/</link><description>ETF research with live data</description>\n${ARTICLES.map(a=>`<item><title>${esc(a.title)}</title><link>${SITE}/articles/${a.slug}</link><guid>${SITE}/articles/${a.slug}</guid><pubDate>${new Date(a.date+"T12:00:00Z").toUTCString()}</pubDate><description>${esc(a.dek)}</description></item>`).join("\n")}\n</channel></rss>\n`;
out["robots.txt"]=`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
out["CNAME"]="topetfs.com\n";
out["favicon.svg"]=LOGO.replace('aria-hidden="true"','xmlns="http://www.w3.org/2000/svg"');
out[".nojekyll"]="";
for(const a of ARTICLES) out["assets/covers/"+a.slug+".svg"]=cover(a,true).replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" ');

for(const [f,c] of Object.entries(out)){ const p=path.join(ROOT,f); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,c); }
console.log(`Built ${Object.keys(out).length} files, ${ARTICLES.length} articles, ${Object.keys(ALL).length} ETFs.`);
