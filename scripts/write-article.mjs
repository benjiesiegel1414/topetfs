// Daily article writer for TopETFs.com
// node scripts/write-article.mjs            -> writes 1 article from content/topics.json using the Claude API
// node scripts/write-article.mjs --dry-run  -> prints the prompt for the next topic, no API call
// Env: ANTHROPIC_API_KEY (required), CLAUDE_MODEL (optional, default claude-sonnet-5-5)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const KEY = process.env.ANTHROPIC_API_KEY;
const DRY = process.argv.includes("--dry-run");
const MAX_CALLS = 3;
const TOPICS_FILE = path.join(ROOT, "content", "topics.json");
const ART_DIR = path.join(ROOT, "content", "articles");

/* ---------- data (same shape as build.mjs) ---------- */
function parseCSV(t){const rows=[];let row=[],f="",q=false;t=t.replace(/\r/g,"");for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else if(c==='"')q=true;else if(c===','){row.push(f);f="";}else if(c==='\n'){row.push(f);rows.push(row);row=[];f="";}else f+=c;}if(f||row.length){row.push(f);rows.push(row);}return rows;}
const num=v=>{v=String(v??"").replace(/[%,$\s]/g,"");return v===""||isNaN(+v)?null:+v;};
const money=v=>{v=String(v??"").replace(/[$,\s]/g,"").toUpperCase();const m=v.match(/^(-?[\d.]+)([KMBT]?)$/);return m?+m[1]*{"":1,K:1e3,M:1e6,B:1e9,T:1e12}[m[2]]:null;};
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const ALL={};
for (const k of ["pro","weekly","growth"]) {
  const rows=parseCSV(fs.readFileSync(path.join(ROOT,"data",k+".csv"),"utf8")); const h=rows[0].map(x=>clean(x).toLowerCase());
  const c=(...n)=>{for(const x of n){const i=h.indexOf(x);if(i>-1)return i;}return -1;};
  const I={s:c("symbol"),n:c("name","etf name"),p:c("fund provider","provider"),y:c("dividend yield","yield"),e:c("expense ratio"),a:c("aum"),t:c("total return","total returns"),d:c("price decay"),i:c("inception date"),f:c("payout frequency","frequency")};
  for (const r of rows.slice(1)) {
    const sym=clean(r[I.s]).toUpperCase(); if(!/^[A-Z.]{1,6}$/.test(sym)) continue;
    const e={sym,name:clean(r[I.n]),provider:I.p>-1?clean(r[I.p]):"",yield:I.y>-1?num(r[I.y]):null,er:I.e>-1?num(r[I.e]):null,aum:I.a>-1?money(r[I.a]):null,tr:I.t>-1?num(r[I.t]):null,decay:I.d>-1?clean(r[I.d]).toUpperCase()==="YES":null,inception:I.i>-1?clean(r[I.i]):"",freq:I.f>-1?clean(r[I.f]):(k==="weekly"?"Weekly":"")};
    const cur=ALL[sym]; if(!cur){ALL[sym]={...e,lists:[k]};continue;}
    if(!cur.lists.includes(k)) cur.lists.push(k);
    for (const f of Object.keys(e)) if((cur[f]==null||cur[f]==="")&&e[f]!=null&&e[f]!=="") cur[f]=e[f];
  }
}
const fmtAum=v=>v==null?"n/a":v>=1e9?"$"+(v/1e9).toFixed(1)+"B":"$"+(v/1e6).toFixed(0)+"M";
const card=s=>{const e=ALL[s];return e?`${s} | ${e.name} | provider: ${e.provider||"n/a"} | yield: ${e.yield??"n/a"}% | expense ratio: ${e.er??"n/a"}% | AUM: ${fmtAum(e.aum)} | total return since inception: ${e.tr??"n/a"}% | price decay: ${e.decay==null?"n/a":e.decay?"YES":"NO"} | inception: ${e.inception||"n/a"} | pays: ${e.freq||"n/a"} | lists: ${e.lists.join("/")}`:null;};

/* ---------- topic ---------- */
const TQ=JSON.parse(fs.readFileSync(TOPICS_FILE,"utf8"));
const existing=fs.readdirSync(ART_DIR).filter(f=>f.endsWith(".html")).map(f=>{const raw=fs.readFileSync(path.join(ART_DIR,f),"utf8");const m=raw.match(/^<!--meta\s*([\s\S]*?)-->/);const meta=m?JSON.parse(m[1]):{};return {slug:f.replace(/\.html$/,""),title:meta.title||"",tickers:meta.tickers||[],section:meta.section||""};});
const etDate=new Date().toLocaleDateString("en-CA",{timeZone:"America/New_York"});
const todayCount=fs.readdirSync(ART_DIR).filter(f=>{const raw=fs.readFileSync(path.join(ART_DIR,f),"utf8");return raw.includes(`"date":"${etDate}"`)&&raw.includes('"auto":true');}).length;
if (todayCount>0 && !process.argv.includes("--force")) { console.log("An automatic article already exists for "+etDate+". Nothing to do."); process.exit(0); }

/* Section rotation: one article per day, cycling Income -> Weekly Pay -> Growth -> ETF 101 (section "learn").
   The next section is the one after the most recently published topic's section. If that section has no usable
   pending topic, the writer moves on to the next section in the rotation so a day is never skipped. */
const ORDER=Array.isArray(TQ.rotation)&&TQ.rotation.length?TQ.rotation:["income","weekly","growth","learn"];
function sectionQueue(){
  const pub=TQ.topics.map((t,i)=>({t,i})).filter(o=>o.t.status==="published"&&o.t.date&&ORDER.includes(o.t.section)).sort((a,b)=>a.t.date===b.t.date?a.i-b.i:a.t.date<b.t.date?-1:1);
  const last=pub.length?pub[pub.length-1].t.section:ORDER[ORDER.length-1];
  const start=(ORDER.indexOf(last)+1)%ORDER.length;
  return ORDER.map((_,k)=>ORDER[(start+k)%ORDER.length]);
}
function nextTopic(){
  for (const sec of sectionQueue()) {
    for (const t of TQ.topics) {
      if (t.status!=="pending" || t.section!==sec) continue;
      if (existing.some(a=>a.slug===t.slug)) { t.status="published"; t.date=t.date||"2000-01-01"; continue; }
      t.tickers=(t.tickers||[]).filter(s=>ALL[s]);
      if (!t.tickers.length) { t.status="failed"; t.error="none of the tickers are in the database"; continue; }
      return t;
    }
  }
  return null;
}

/* Section-specific direction layered on top of the shared format rules */
const SECTION_GUIDE={
  income:`SECTION FOCUS: INCOME. Dividend and option-income ETFs. Lead with yield, payout schedule and what a real investment pays per month and per year, then check it against total return and price decay. Board: data-sort="yield".`,
  weekly:`SECTION FOCUS: WEEKLY PAY. Funds that pay every week. Explain how the weekly distribution is produced (options strategy, underlying stock or index), how steady the payouts have been, return of capital, NAV erosion and price decay risk. Show weekly income math, e.g. {{calc:usd:10000*SYM.yield/100/52}} per week on $10,000, plus monthly and yearly. Compare against other weekly payers from DATA. Board: data-sort="yield". Link https://weeklyetfs.com/ as a network link.`,
  growth:`SECTION FOCUS: GROWTH. Growth and index ETFs where the story is total return, not income. Lead with total return since inception, fees, what the fund holds (style, sector tilt, concentration in the largest names) and how it compares to close alternatives from DATA. Use growth math, e.g. what $10,000 became at the total return: {{calc:usd:10000*(1+SYM.tr/100)}}, and fee drag: {{calc:usd:10000*SYM.er/100}} per year in fees. Mention the small yield only as a side note. The income calculator widget is still required: title it as a reality check on how little income a growth fund throws off. Board: data-sort="tr" with data-cols="tr,er,aum,yield,freq" and the Total return tab pressed. Link https://growthetfs.com/ as a network link.`,
  learn:`SECTION FOCUS: ETF 101. A beginner-friendly explainer. Teach the concept in plain English first (one simple definition near the top), then show it with real funds from DATA using live tokens, walk through a worked example step by step, cover the common mistakes, and end with what the reader should check before buying any ETF. Assume the reader is new; define every term. Board: pick the sort that best illustrates the concept.`
};

/* ---------- prompt ---------- */
const VOICE=fs.readFileSync(path.join(ROOT,"content","voice.md"),"utf8");
const SYSTEM=`You write SEO articles for TopETFs.com in the voice of its founder, Benjie Siegel.

${VOICE}

# Output format (follow exactly)
Return ONE JSON object and nothing else (no code fences, no commentary). Keys:
- "title": the H1. Natural, specific, includes the main keyword. 50 to 75 characters is ideal.
- "seoTitle": the <title> tag, under 60 characters, main keyword first.
- "dek": the meta description and subtitle, 140 to 160 characters, includes the keyword, promises a specific payoff.
- "short": 2 to 5 word label.
- "coverLabel": 1 to 4 tickers or words separated by "  ·  ".
- "art": one of "line", "bars", "dots", "rings".
- "keyNumbers": 3 to 5 pairs like ["SCHD yield","{{live:SCHD:yield}}"] using only live tokens.
- "body": the article HTML (no <h1>, no <html>, no <style>, no <script>).

# Body HTML rules
Allowed tags: h2, h3, p, ul, ol, li, strong, em, a, table, thead, tbody, tr, th, td, div, section, label, input, select, span. Every number about a fund must be a live token:
- {{live:SYM:FIELD}} where FIELD is yield | er | aum | tr. Format suffix optional: {{live:SYM:er:pct2}}, {{live:SYM:aum:aum}}, {{live:SYM:tr:signed}}. yield/tr default to percent. ALWAYS use :aum for aum and :pct2 for er.
- {{live:SYM:decay:decay}} prints Yes/No. {{live:SYM:inception:text}} prints the inception date. {{live:SYM:freq:text}} prints the payout frequency.
- {{tkr:SYM}} prints a linked ticker. Use it the first time each ticker appears in a section.
- {{calc:usd:EXPR}} computes dollars from live data, e.g. {{calc:usd:10000*SCHD.yield/100}} (annual income on $10,000), {{calc:usd:100000*JEPI.yield/100/12}} (monthly on $100,000), {{calc:usd:12000/(SCHD.yield/100)}} (amount needed for $1,000 a month). Only use SYM.yield, SYM.er or SYM.tr inside calc. Formats: usd, usd2, pct.
Only use tickers from the DATA section. Never type a fund's yield, fee, AUM or return as a plain number.

Required structure, in this order:
1. <div class="takeaways"><h2>The short version</h2><ul> 3 bullets </ul></div>
2. <p class="lede"> that answers the search query directly, with live tokens.
3. A live data table using this exact widget (fill data-syms with 1 to 8 tickers from DATA):
<div class="board" data-w="board" data-syms="SYM1,SYM2" data-cols="yield,er,aum,tr,freq" data-sort="yield" data-n="8">
  <div class="board-head"><div><h3>TITLE</h3><p class="meta">Live from the TopETFs database</p></div><div class="tabs" role="group"><button type="button" data-view="yield" aria-pressed="true">Yield</button><button type="button" data-view="tr" aria-pressed="false">Total return</button><button type="button" data-view="aum" aria-pressed="false">Assets</button></div></div>
  <div class="tbl-scroll"><table class="data"><thead></thead><tbody></tbody></table></div>
  <div class="board-foot"><span>Total return since inception. Funds launched in different years.</span><span>Source: TopETFs database</span></div>
</div>
4. Several <h2> sections (5 to 8) that go deep: how it works, income math with {{calc}} examples, total return and price decay, risks, who it fits, comparisons to close alternatives from DATA.
5. One income calculator widget (use this exact markup, set data-syms and the default amount):
<div class="figure" data-w="incomeBars" data-syms="SYM1,SYM2" data-per="year">
  <p class="figure-title">TITLE</p>
  <p class="figure-sub">Estimated annual income at each fund's current yield</p>
  <div class="controls"><div class="field" style="max-width:220px"><label for="ib-amt">Amount invested</label><input id="ib-amt" name="amount" inputmode="decimal" value="10000"></div></div>
  <div class="chart" style="min-height:150px"></div>
  <p class="figure-note">Today's income only. Yields change and are not guaranteed.</p>
</div>
6. <section class="faq"><h2>FAQ</h2> then 4 to 6 pairs written exactly as <h3>Question?</h3><p>Answer in 1 to 3 sentences.</p></section>. Questions should match real searches ("Does X pay monthly?", "Is X a good investment?", "X vs Y").
7. A closing <h2> with Benjie's bottom line (balanced, no buy/sell call).

Links: link 2 to 4 related TopETFs articles from the list given (href="/articles/SLUG"), and 1 to 3 network links where relevant: https://topdividendetfspro.com/ (screen every income ETF), https://weeklyetfs.com/ (weekly payers), https://topdividendetfs.com/ (top 100 dividend ETFs), https://growthetfs.com/ (growth ETFs), https://dividendprojection.com/ (project future income), /tools (calculators). Use descriptive anchor text.
Length: 1,300 to 2,000 words of real content. Every paragraph must earn its place.`;

function userPrompt(t){
  const peers=Object.values(ALL).filter(e=>!t.tickers.includes(e.sym)&&e.aum&&(t.section==="growth"?e.lists.includes("growth"):t.section==="weekly"?e.lists.includes("weekly"):e.lists.includes("pro"))).sort((a,b)=>b.aum-a.aum).slice(0,14).map(e=>e.sym);
  const related=existing.filter(a=>a.slug!==t.slug).map(a=>({a,s:a.tickers.filter(x=>t.tickers.includes(x)).length+(a.section===t.section?0.5:0)})).sort((x,y)=>y.s-x.s).slice(0,8).map(o=>`/articles/${o.a.slug} | ${o.a.title}`);
  return `TODAY: ${etDate}
${SECTION_GUIDE[t.section]||""}
${t.type==="profile"?"FORMAT: single-fund deep dive. Cover what it is and who runs it, the strategy and holdings style, live numbers, how it has done since inception, the main risks, who it fits and who should skip it, and how it compares to 2 or 3 close alternatives from DATA.\n":""}
TOPIC: ${t.title}
PRIMARY KEYWORD: ${t.keyword}
ANGLE: ${t.angle}
SECTION: ${t.section}

DATA (live values right now; reference them ONLY through tokens):
Main funds:
${t.tickers.map(card).join("\n")}
Comparable funds you may mention:
${peers.map(card).join("\n")}

RELATED TOPETFS ARTICLES (for internal links):
${related.join("\n")||"(none yet)"}

Write the article now. Return only the JSON object.`;
}

/* ---------- API ---------- */
async function callClaude(messages){
  if(process.env.MOCK_RESPONSE) return fs.readFileSync(process.env.MOCK_RESPONSE,'utf8');
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},
    body:JSON.stringify({model:MODEL,max_tokens:16000,system:SYSTEM,messages})});
  const j=await r.json();
  if(!r.ok) throw new Error("Claude API "+r.status+": "+JSON.stringify(j).slice(0,400));
  const text=(j.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("");
  console.log("usage",JSON.stringify(j.usage||{}));
  return text;
}

/* ---------- validation ---------- */
const FIELDS=new Set(["yield","er","aum","tr","decay","inception","freq","name","provider"]);
const FMTS=new Set(["pct","pct2","signed","usd","usd2","aum","text","decay"]);
function validate(a,t){
  const errs=[];
  for (const k of ["title","seoTitle","dek","body"]) if(!a[k]||typeof a[k]!=="string") errs.push("missing "+k);
  if (errs.length) return errs;
  a.body=a.body.replace(/\s*[—–]\s*/g,", ").replace(/<h1[\s\S]*?<\/h1>/gi,"").replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"");
  for (const k of ["title","seoTitle","dek","short","coverLabel"]) if(typeof a[k]==="string") a[k]=a[k].replace(/\s*[—–]\s*/g,", ");
  for (const m of a.body.matchAll(/\{\{live:([A-Z.]+):(\w+)(?::(\w+))?(?::[\d.]+)?\}\}/g)) { if(!ALL[m[1]]) errs.push("unknown ticker "+m[1]); if(!FIELDS.has(m[2])) errs.push("bad field "+m[0]); if(m[3]&&!FMTS.has(m[3])) errs.push("bad format "+m[0]); }
  for (const m of a.body.matchAll(/\{\{tkr:([A-Z.]+)\}\}/g)) if(!ALL[m[1]]) errs.push("unknown ticker "+m[1]);
  for (const m of a.body.matchAll(/\{\{calc:(\w+):([^}]+)\}\}/g)) { if(!FMTS.has(m[1])) errs.push("bad calc format "+m[0]); for (const r of m[2].matchAll(/\b([A-Z]{2,6})\.(\w+)/g)) { if(!ALL[r[1]]) errs.push("unknown ticker in calc "+r[1]); else if(!["yield","er","tr"].includes(r[2])||ALL[r[1]][r[2]]==null) errs.push("calc uses missing value "+r[0]); } if(/[^A-Z0-9a-z_.+\-*/() ]/.test(m[2])) errs.push("bad calc expression "+m[0]); }
  for (const m of a.body.matchAll(/data-syms="([^"]+)"/g)) for (const s of m[1].split(",")) if(!ALL[s.trim()]) errs.push("unknown ticker in widget "+s);
  if (!/class="takeaways"/.test(a.body)) errs.push("missing takeaways box");
  if (!/<section class="faq"/.test(a.body)) errs.push("missing FAQ section");
  if (!/data-w="board"/.test(a.body)) errs.push("missing live data table");
  const text=a.body.replace(/\{\{[^}]+\}\}/g," X ").replace(/<[^>]+>/g," ");
  const words=text.split(/\s+/).filter(Boolean).length; a.words=words;
  if (words<(+process.env.MIN_WORDS||1000)) errs.push(`too short (${words} words, need 1,300+)`);
  const hard=(text.match(/\b\d+(\.\d+)?%/g)||[]).length;
  if (hard>10) errs.push(`${hard} hardcoded percentages; fund numbers must be live tokens`);
  if (!(a.body.match(/\{\{(live|calc):/g)||[]).length) errs.push("no live numbers");
  return errs;
}

function buildOk(){
  try { execFileSync("node",[path.join(ROOT,"scripts","build.mjs")],{cwd:ROOT,stdio:"pipe"}); return null; }
  catch(e){ return String(e.stderr||e.message).split("\n").find(l=>/Error/.test(l))||"build failed"; }
}

/* ---------- main ---------- */
const t=nextTopic();
if(!t){ console.log("Topic queue is empty. Add topics to content/topics.json."); fs.writeFileSync(TOPICS_FILE,JSON.stringify(TQ,null,1)); process.exit(0); }
if(DRY){ console.log(SYSTEM+"\n\n=====\n\n"+userPrompt(t)); process.exit(0); }
if(!KEY && !process.env.MOCK_RESPONSE){ console.log("::warning::ANTHROPIC_API_KEY is not set. Add it under Settings > Secrets and variables > Actions."); process.exit(0); }

let calls=0, topic=t, done=false;
while(topic && calls<MAX_CALLS && !done){
  const messages=[{role:"user",content:userPrompt(topic)}];
  let attempt=0;
  while(attempt<2 && calls<MAX_CALLS){
    attempt++; calls++;
    let raw; try{ raw=await callClaude(messages); }catch(e){ console.log(e.message); break; }
    let a; try{ a=JSON.parse(raw.slice(raw.indexOf("{"),raw.lastIndexOf("}")+1)); }catch(e){ a=null; }
    const errs=a?validate(a,topic):["response was not valid JSON"];
    if(!errs.length){
      const meta={title:a.title,short:a.short||"",seoTitle:a.seoTitle,dek:a.dek,section:topic.section,date:etDate,time:"08",read:Math.max(4,Math.round(a.words/230)),art:["line","bars","dots","rings"].includes(a.art)?a.art:"line",tickers:topic.tickers,coverLabel:a.coverLabel||topic.tickers.slice(0,3).join("  ·  "),keyNumbers:(a.keyNumbers||[]).filter(k=>Array.isArray(k)&&/^\{\{(live|calc):/.test(k[1])).slice(0,5),keyword:topic.keyword,auto:true};
      const file=path.join(ART_DIR,topic.slug+".html");
      fs.writeFileSync(file,`<!--meta\n${JSON.stringify(meta)}\n-->\n${a.body.trim()}\n`);
      const be=buildOk();
      if(!be){ topic.status="published"; topic.date=etDate; topic.words=a.words; done=true;
        fs.writeFileSync(path.join(ROOT,".new-article-url"),"https://topetfs.com/articles/"+topic.slug);
        console.log("Published "+topic.slug+" ("+a.words+" words)"); break; }
      fs.unlinkSync(file); errs.push("build error: "+be);
    }
    console.log("Attempt "+attempt+" problems: "+errs.join("; "));
    if(raw) { messages.push({role:"assistant",content:raw.slice(0,60000)}); messages.push({role:"user",content:"Fix these problems and return the full corrected JSON object only: "+errs.join("; ")}); }
  }
  if(!done){ topic.status="failed"; topic.error="validation failed"; topic=nextTopic(); }
}
fs.writeFileSync(TOPICS_FILE,JSON.stringify(TQ,null,1));
if(!done){ console.log("::warning::No article published today."); }
