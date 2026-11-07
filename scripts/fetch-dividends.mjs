// Pulls per-share dividend history for every ETF on TopETFs into data/dividends.json.
// Source order: Nasdaq.com dividend history (has pay, record and declaration dates),
// then Yahoo Finance for funds Nasdaq does not cover (NYSE Arca and Cboe listings).
// Anything that fails keeps its previous snapshot, so a bad day never wipes history.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "dividends.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const sleep = ms => new Promise(r => setTimeout(r, ms));

function symbols() {
  const set = new Set();
  for (const k of ["pro", "weekly", "growth"]) {
    const f = path.join(ROOT, "data", k + ".csv");
    if (!fs.existsSync(f)) continue;
    const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
    const head = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());
    const i = head.indexOf("symbol");
    if (i < 0) continue;
    for (const l of lines.slice(1)) {
      const s = (l.split(",")[i] || "").replace(/"/g, "").trim().toUpperCase();
      if (/^[A-Z.]{1,6}$/.test(s) && !["PDI", "PTY"].includes(s)) set.add(s);
    }
  }
  return [...set].sort();
}

async function getJson(url, headers) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json, text/plain, */*", ...headers }, signal: AbortSignal.timeout(15000) });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (a + 1)); continue; }
      if (!r.ok) return { err: "HTTP " + r.status };
      return { json: await r.json() };
    } catch (e) { if (a === 2) return { err: String(e.message || e) }; await sleep(1500); }
  }
  return { err: "retries exhausted" };
}

const mdy = s => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || "").trim()); return m ? `${m[3]}-${m[1]}-${m[2]}` : null; };
const num = s => { const v = parseFloat(String(s || "").replace(/[$,]/g, "")); return isFinite(v) && v > 0 ? +v.toFixed(6) : null; };

let nasdaqDown = 0;
async function fromNasdaq(t) {
  if (nasdaqDown >= 8) return null; // Nasdaq not answering from this runner, skip it
  const { json, err } = await getJson(`https://api.nasdaq.com/api/quote/${encodeURIComponent(t)}/dividends?assetclass=etf`, { Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" });
  if (err) { nasdaqDown++; return null; }
  nasdaqDown = 0;
  const rows = json?.data?.dividends?.rows || [];
  const out = rows.map(x => [mdy(x.exOrEffDate), num(x.amount), mdy(x.paymentDate), mdy(x.recordDate), mdy(x.declarationDate)])
    .filter(x => x[0] && x[1]);
  return out.length ? out : null;
}

async function fromYahoo(t) {
  const y = t.replace(/\./g, "-");
  const { json } = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?range=max&interval=1d&events=div`);
  const d = json?.chart?.result?.[0]?.events?.dividends;
  if (!d) return null;
  const out = Object.values(d).map(x => [new Date(x.date * 1000).toISOString().slice(0, 10), x.amount > 0 ? +(+x.amount).toFixed(6) : null]).filter(x => x[1]);
  return out.length ? out : null;
}

// ---------- Missing-payout check + StockAnalysis.com backfill ----------
// Nasdaq/Yahoo sometimes skip a payout (Yahoo dropped JEPI's Oct and Nov 2026 checks, for example).
// For each fund we work out its normal spacing from recent payouts, then flag it when the latest
// payout is overdue or there is a hole in the last 2 years. Flagged funds are filled in from
// StockAnalysis.com's dividend history (which also has pay dates). Anything still missing after
// that is listed in data/dividend-gaps.json so it can be checked against the issuer's site.
const DAY = 864e5;
const dd = s => new Date(s + "T12:00:00Z").getTime();
function gapCheck(rows, todayIso) {
  if (!rows || rows.length < 3) return null;
  const recent = rows.slice(0, 13), gaps = [];
  for (let i = 0; i < recent.length - 1; i++) gaps.push((dd(recent[i][0]) - dd(recent[i + 1][0])) / DAY);
  const s = gaps.slice().sort((x, y) => x - y), med = s[Math.floor(s.length / 2)];
  if (!(med > 0)) return null;
  const freq = med <= 10 ? "weekly" : med <= 45 ? "monthly" : med <= 120 ? "quarterly" : med <= 220 ? "semiannual" : "annual";
  if (freq === "semiannual" || freq === "annual") return null; // irregular payers: not worth flagging
  const slack = 1.5;
  const issues = [];
  const age = (dd(todayIso) - dd(rows[0][0])) / DAY;
  if (age > med * slack + 2 && age < 400) issues.push(`latest payout ${rows[0][0]} is ${Math.round(age)} days old (normally every ~${Math.round(med)} days)`);
  const cut = new Date(dd(todayIso) - 730 * DAY).toISOString().slice(0, 10);
  const gapAt = i => (dd(rows[i][0]) - dd(rows[i + 1][0])) / DAY;
  for (let i = 0; i < rows.length - 1 && rows[i + 1][0] >= cut; i++) {
    const g = gapAt(i);
    if (g <= med * slack + 2) continue;
    // If the older payouts keep this wider spacing, the fund simply paid less often back then
    // (e.g. monthly before switching to weekly): stop checking instead of flagging a fake gap.
    const older = [i + 1, i + 2].filter(j => j < rows.length - 1).map(gapAt);
    if (older.length && older.every(o => Math.abs(o - g) <= g * 0.3 || o > med * slack + 2)) break;
    issues.push(`gap of ${Math.round(g)} days between ${rows[i + 1][0]} and ${rows[i][0]}`);
  }
  return issues.length ? { freq, every: Math.round(med), issues } : null;
}
async function fromStockAnalysis(t) {
  for (const kind of ["etf", "stocks"]) {
    try {
      const r = await fetch(`https://stockanalysis.com/${kind}/${t.toLowerCase().replace(/\./g, "-")}/dividend/`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) continue;
      const html = await r.text();
      const i = html.indexOf("history:[");
      if (i < 0) continue;
      const seg = html.slice(i, html.indexOf("]", i));
      const out = [];
      for (const m of seg.matchAll(/dt:"(\d{4}-\d{2}-\d{2})",amt:"\$?([\d.,]+)"[^}]*?pay:"([^"]*)"/g)) {
        const v = num(m[2]); if (v) out.push([m[1], v, /^\d{4}-\d{2}-\d{2}$/.test(m[3]) ? m[3] : null]);
      }
      if (out.length) return out;
    } catch (e) { /* try the next path */ }
  }
  return null;
}
// Adds StockAnalysis rows the main source is missing (last 3 years only) and fills in missing pay dates.
function mergeRows(rows, extra, todayIso) {
  const cut = new Date(dd(todayIso) - 1096 * DAY).toISOString().slice(0, 10);
  let added = 0, pays = 0;
  for (const x of extra) {
    if (x[0] < cut) continue;
    const hit = rows.find(r => Math.abs(dd(r[0]) - dd(x[0])) <= 3 * DAY);
    if (hit) { if (!hit[2] && x[2]) { while (hit.length < 2) hit.push(null); hit[2] = x[2]; pays++; } continue; }
    rows.push(x[2] ? [x[0], x[1], x[2]] : [x[0], x[1]]); added++;
  }
  rows.sort((a, b) => b[0].localeCompare(a[0]));
  return { added, pays };
}

async function main() {
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { funds: {} };
  const syms = symbols();
  const funds = {};
  const stat = { nasdaq: 0, yahoo: 0, kept: 0, none: 0 };
  let next = 0;
  async function worker() {
    while (next < syms.length) {
      const t = syms[next++];
      let rows = await fromNasdaq(t), src = "nasdaq";
      if (!rows) { rows = await fromYahoo(t); src = "yahoo"; }
      if (rows) {
        const seen = new Set();
        rows = rows.sort((a, b) => b[0].localeCompare(a[0])).filter(x => !seen.has(x[0]) && seen.add(x[0]))
          .map(x => { while (x.length > 2 && x[x.length - 1] == null) x.pop(); return x; });
        funds[t] = { src, rows };
        stat[src]++;
      } else if (prev.funds?.[t]) { funds[t] = prev.funds[t]; stat.kept++; }
      else stat.none++;
      await sleep(250);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  // Missing-payout check and backfill
  const todayIso = new Date().toISOString().slice(0, 10);
  const flagged = [], fixed = [];
  for (const t of Object.keys(funds).sort()) {
    const f = funds[t];
    const before = gapCheck(f.rows, todayIso);
    if (!before) continue;
    const sa = await fromStockAnalysis(t);
    let added = 0, pays = 0;
    if (sa) ({ added, pays } = mergeRows(f.rows, sa, todayIso));
    if (added) { f.src = f.src.replace(/\+stockanalysis$/, "") + "+stockanalysis"; f.filled = added; }
    const after = gapCheck(f.rows, todayIso);
    if (added) fixed.push(`${t}: added ${added} payout${added > 1 ? "s" : ""} from StockAnalysis`);
    if (after) flagged.push({ sym: t, freq: after.freq, every: after.every, issues: after.issues, triedStockAnalysis: !!sa });
    await sleep(600);
  }
  fs.writeFileSync(path.join(ROOT, "data", "dividend-gaps.json"), JSON.stringify({ checked: todayIso, fixed, needsReview: flagged }, null, 1));
  console.log(`dividend gaps: ${fixed.length} fixed from StockAnalysis, ${flagged.length} still need review`);
  for (const f of flagged) console.log(`::warning::${f.sym} dividend history may be missing payouts: ${f.issues.join("; ")}`);
  const total = stat.nasdaq + stat.yahoo;
  if (total < syms.length * 0.3 && Object.keys(prev.funds || {}).length) {
    console.log("::warning::Dividend fetch mostly failed, keeping previous snapshot", stat);
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), fields: ["exDate", "amount", "payDate", "recordDate", "declaredDate"], funds }));
  console.log("dividends:", syms.length, "funds", stat);
}
main().catch(e => { console.log("::warning::dividend fetch failed: " + e.message); });
