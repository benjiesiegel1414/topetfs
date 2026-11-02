// Finds new long-tail "how-to" topics for the daily TopETFs article and adds them to content/topics.json.
// node scripts/find-topics.mjs              -> refill only if fewer than MIN_PENDING guide topics are pending
// node scripts/find-topics.mjs --force      -> refill now
// node scripts/find-topics.mjs --candidates -> print the raw autocomplete candidates and exit (no API call)
// Env: ANTHROPIC_API_KEY (optional; without it the best candidates are added with simple titles), CLAUDE_MODEL
//
// How it finds topics:
// 1. Expands a list of investing/ETF question stems with Google autocomplete. Autocomplete only suggests
//    phrases people actually type, so every candidate is a real search.
// 2. Keeps specific, long-tail questions (4+ words, US investing, how-to/what-happens/should-I intent) and drops
//    anything our other sites already cover (dividend history, ex-dates, yield rankings, single-fund deep dives).
// 3. Asks Claude to pick the most useful, evergreen questions that big finance sites tend to answer thinly,
//    write a working title and angle for each, and assign a section.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const FILE=path.join(ROOT,"content","topics.json");
const SEEDS_FILE=path.join(ROOT,"content","topic-seeds.json");
const MIN_PENDING=10, ADD=14;
const KEY=process.env.ANTHROPIC_API_KEY, MODEL=process.env.CLAUDE_MODEL||"claude-sonnet-5-5";
const FORCE=process.argv.includes("--force"), ONLY_CANDS=process.argv.includes("--candidates");

const TQ=JSON.parse(fs.readFileSync(FILE,"utf8"));
const pendingGuides=TQ.topics.filter(t=>t.status==="pending"&&t.type==="guide").length;
if(!FORCE&&!ONLY_CANDS&&pendingGuides>=MIN_PENDING){console.log(`${pendingGuides} guide topics pending, no refill needed`);process.exit(0);}

const {stems,modifiers}=JSON.parse(fs.readFileSync(SEEDS_FILE,"utf8"));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function suggest(q){
  try{const r=await fetch("https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=us&q="+encodeURIComponent(q),{headers:{"user-agent":"Mozilla/5.0"}});
    if(!r.ok) return []; const j=JSON.parse(await r.text()); return Array.isArray(j[1])?j[1]:[];}catch{return [];}
}
const raw=new Set();
for(const s of stems){ for(const m of modifiers){ (await suggest((s+" "+m).trim())).forEach(x=>raw.add(x.toLowerCase().trim())); await sleep(120); } }

const INVEST=/\b(etf|etfs|index fund|fund|funds|invest|investing|portfolio|ira|roth|401k|401\(k\)|hsa|brokerage|dividend|dividends|stock|stocks|bond|bonds|s&p|nasdaq|capital gains|tax|rebalanc|expense ratio|nav|retire|retirement)\b/;
const NON_US=/\b(uk|india|indian|canada|canadian|australia|australian|isa|tfsa|rrsp|super|nz|zerodha|groww|trade republic|degiro|ireland|irish|europe|european|ucits|singapore|hindi|in tamil|in telugu|sip)\b/;
const OVERLAP=/(dividend history|ex[- ]?dividend|dividend date|pay date|dividend calendar|highest yield|best dividend etf|yield of|price prediction|stock price|news|reddit|today)/;
const words=s=>s.split(/\s+/).filter(Boolean);
let cands=[...raw].filter(q=>words(q).length>=4&&INVEST.test(q)&&!NON_US.test(q)&&!OVERLAP.test(q));

const norm=s=>new Set(words(s.toLowerCase().replace(/[^a-z0-9 ]/g," ")).filter(w=>!["the","a","an","to","in","of","for","and","is","how","do","does","you","your","i","my","can","what","etf","etfs"].includes(w)));
const jac=(a,b)=>{const A=norm(a),B=norm(b);if(!A.size||!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return n/(A.size+B.size-n);};
const known=TQ.topics.map(t=>t.keyword+" "+(t.title||""));
cands=cands.filter(c=>!known.some(k=>jac(c,k)>=0.5));
// collapse near-duplicate suggestions
const uniq=[];for(const c of cands){ if(!uniq.some(u=>jac(u,c)>=0.6)) uniq.push(c); }
cands=uniq.slice(0,320);
if(ONLY_CANDS){console.log(cands.join("\n"));console.log(`\n${cands.length} candidates from ${raw.size} suggestions`);process.exit(0);}
if(!cands.length){console.log("::warning::No autocomplete candidates found");process.exit(0);}

const sl=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70).replace(/-+$/,"");
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
let picks=null;
if(KEY){
  const SYSTEM=`You pick article topics for TopETFs.com, a new investing site. It cannot win head terms against Investopedia, NerdWallet or the big brokers yet, so it targets specific long-tail questions that real people search, where the top results are thin, generic, outdated or forum threads. The site's sister sites already cover dividend ETF rankings, yields, dividend histories and ex-dates, so avoid those.`;
  const user=`Here are real Google autocomplete searches (US):\n${cands.join("\n")}\n\nAlready published or queued (do not repeat or closely overlap):\n${known.slice(-150).join("\n")}\n\nPick the ${ADD} best topics. Good picks: a clear how-to or "what happens if" question, evergreen, specific enough that a thorough 1,500 word guide with a worked example would be the best answer on the web, and related to investing with ETFs or index funds (accounts, taxes, transfers, rebalancing, buying and selling mechanics, retirement withdrawals, portfolio building, fees, risks, how ETFs work). Skip vague head terms, brand-new news, non-US topics, and anything about a single fund's dividends or yield. Prefer a spread across sections.\n\nReturn ONLY a JSON array of objects with keys:\n- "keyword": the exact search phrase (lightly cleaned up)\n- "title": a specific, natural H1 (50 to 75 characters) that answers the query\n- "section": one of "learn" (how ETFs, accounts, taxes and trading work), "growth" (long-term investing, portfolio building, rebalancing, index investing), "income" (retirement income, withdrawals, living off a portfolio)\n- "angle": 1 to 2 sentences on what the guide must cover, including the worked example to use\n- "tickers": 0 to 4 well-known broad ETFs that make good examples (e.g. VOO, VTI, SCHD, QQQ, BND, SGOV), or []`;
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:MODEL,max_tokens:6000,system:SYSTEM,messages:[{role:"user",content:user}]})});
    const j=await r.json(); if(!r.ok) throw new Error(JSON.stringify(j).slice(0,300));
    const text=(j.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("");
    picks=JSON.parse(text.slice(text.indexOf("["),text.lastIndexOf("]")+1));
  }catch(e){console.log("Claude topic pick failed: "+e.message);}
}
if(!Array.isArray(picks)||!picks.length){
  // fallback: longest, most question-like candidates
  picks=cands.filter(c=>/^(how|what|can|should|when|why|is|do|does|which)\b/.test(c)).sort((a,b)=>words(b).length-words(a).length).slice(0,ADD)
    .map(c=>({keyword:c,title:cap(c.replace(/\?$/,""))+"?",section:/retire|withdraw|income|live off/.test(c)?"income":/portfolio|rebalanc|long term|index/.test(c)?"growth":"learn",angle:"Answer the question directly at the top, then walk through a worked example step by step, common mistakes, and a short checklist.",tickers:[]}));
}
let added=0;
for(const p of picks){
  if(!p||!p.keyword||!p.title) continue;
  const slug=sl(p.keyword);
  if(TQ.topics.some(t=>t.slug===slug||jac(t.keyword+" "+(t.title||""),p.keyword+" "+p.title)>=0.5)) continue;
  TQ.topics.push({slug,keyword:p.keyword,title:p.title,tickers:Array.isArray(p.tickers)?p.tickers.slice(0,4):[],section:["learn","growth","income"].includes(p.section)?p.section:"learn",type:"guide",angle:p.angle||"",source:"autocomplete",found:new Date().toISOString().slice(0,10),status:"pending"});
  added++;
}
fs.writeFileSync(FILE,JSON.stringify(TQ,null,1));
console.log(`Added ${added} guide topics (${cands.length} candidates from ${raw.size} autocomplete suggestions)`);
