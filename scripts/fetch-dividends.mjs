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
  const total = stat.nasdaq + stat.yahoo;
  if (total < syms.length * 0.3 && Object.keys(prev.funds || {}).length) {
    console.log("::warning::Dividend fetch mostly failed, keeping previous snapshot", stat);
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), fields: ["exDate", "amount", "payDate", "recordDate", "declaredDate"], funds }));
  console.log("dividends:", syms.length, "funds", stat);
}
main().catch(e => { console.log("::warning::dividend fetch failed: " + e.message); });
