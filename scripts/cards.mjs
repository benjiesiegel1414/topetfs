// Auto-generated social / cover cards for TopETFs articles.
// build.mjs calls cardFor() for each article and writes the card HTML to .cards/;
// scripts/render-cards.mjs turns those into 1200x630 JPGs in assets/cards/.
// Cards are data-first and "clickbaity": big real numbers from the TopETFs database,
// very few words, no branding. Content stays inside x 40..1160 because the on-site
// thumbnails crop the 1200x630 card to 16:9.

// Which articles get a card. "all" turns them on everywhere.
export const CARD_SLUGS = [
  "jepi-vs-jepq", "schd-vs-voo", "msty-etf-dividend-yield-total-return", "voo-etf-review-total-return-fees",
  "how-much-does-100-000-in-schd-pay", "how-much-do-i-need-in-jepi-to-make-1000-a-month", "best-weekly-dividend-etfs",
  "best-growth-etfs", "yield-vs-total-return", "price-decay-etf-meaning",
  "schd-vs-jepi", "qqqi-vs-jepq", "qdte-vs-xdte", "voo-vs-qqq", "jepi-etf-dividend-yield-total-return",
  "jepq-etf-dividend-yield-total-return", "ulty-etf-dividend-yield-total-return", "schd-etf-dividend-yield-total-return",
  "qqq-etf-review-total-return-fees", "how-much-do-i-need-in-schd-to-make-1000-a-month"
];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n = v => v != null && !isNaN(v);
const pct = v => !n(v) ? "n/a" : (Math.abs(v) >= 100 ? Math.round(v).toLocaleString("en-US") : Math.abs(v) >= 10 ? v.toFixed(1).replace(/\.0$/, "") : v.toFixed(1)) + "%";
const signed = v => !n(v) ? "n/a" : (v > 0 ? "+" : v < 0 ? "-" : "") + pct(Math.abs(v));
const usd = v => !n(v) ? "n/a" : "$" + Math.round(v).toLocaleString("en-US");
const aum = v => { if (!n(v)) return "n/a"; if (v >= 1e12) return (v / 1e12).toFixed(1) + "T"; if (v >= 1e9) return (v / 1e9).toFixed(v >= 1e11 ? 0 : 1) + "B"; if (v >= 1e6) return Math.round(v / 1e6) + "M"; return Math.round(v / 1e3) + "K"; };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

/* Issuer brand colors, so a card about a fund looks like that fund's issuer.
   c = main brand color (background), d = darker shade for gradients, a = accent.
   Colors sampled from issuer websites where possible; edit freely. */
const BRANDS = {
  "Vanguard": { c: "#96151D", d: "#4d0a0f", a: "#ffffff" },
  "Schwab": { c: "#00A0DF", d: "#004f7c", a: "#ffffff" },
  "JP Morgan": { c: "#3d2b1f", d: "#14100c", a: "#c8a26b" },
  "YieldMax": { c: "#0E4CC9", d: "#061f57", a: "#6d9eff" },
  "NEOS": { c: "#11245A", d: "#070f29", a: "#4f7bff" },
  "Roundhill": { c: "#16161a", d: "#000000", a: "#5B5CF1" },
  "GraniteShares": { c: "#2151F5", d: "#0b2280", a: "#dffc53" },
  "Amplify": { c: "#222B44", d: "#0e1322", a: "#c86bc5" },
  "iShares": { c: "#111111", d: "#000000", a: "#ffffff" },
  "Goldman Sachs": { c: "#7399C6", d: "#2d4a70", a: "#ffffff" },
  "State Street": { c: "#002B5C", d: "#00142b", a: "#7fb2ff" },
  "Invesco": { c: "#0a2c6b", d: "#04132f", a: "#7ab4ff" },
  "Tuttle Capital": { c: "#1f2a44", d: "#0d1322", a: "#8fc59b" }
};
const NAME_TO_BRAND = [[/vanguard/i, "Vanguard"], [/schwab/i, "Schwab"], [/jpmorgan|j\.p\. morgan/i, "JP Morgan"], [/yieldmax/i, "YieldMax"], [/neos/i, "NEOS"], [/roundhill/i, "Roundhill"], [/graniteshares/i, "GraniteShares"], [/amplify/i, "Amplify"], [/ishares/i, "iShares"], [/goldman/i, "Goldman Sachs"], [/spdr|state street/i, "State Street"], [/invesco/i, "Invesco"], [/tuttle/i, "Tuttle Capital"]];
const SYM_TO_BRAND = { QQQ: "Invesco", VUG: "Vanguard", VGT: "Vanguard", MGK: "Vanguard", VOO: "Vanguard", SCHG: "Schwab", IWF: "iShares", IWY: "iShares", SPYG: "State Street", SPY: "State Street" };
const FALLBACK = { c: "#14305e", d: "#081633", a: "#8fb8ff" };
function brand(e) {
  const k = BRANDS[e.provider] ? e.provider : SYM_TO_BRAND[e.sym] || (NAME_TO_BRAND.find(([re]) => re.test(e.name || "")) || [])[1];
  return BRANDS[k] || FALLBACK;
}
const shade = (hex, f) => "#" + hex.slice(1).match(/../g).map(h => Math.max(0, Math.min(255, Math.round(parseInt(h, 16) * f)))).map(v => v.toString(16).padStart(2, "0")).join("");

const FONT = `@font-face{font-family:"Source Serif 4";src:url(__SERIF__/source-serif-4-latin-700-normal.woff2);font-weight:700}@font-face{font-family:"Source Serif 4";src:url(__SERIF__/source-serif-4-latin-600-normal.woff2);font-weight:600}@font-face{font-family:Inter;src:url(__FONT__/inter-latin-400-normal.woff2);font-weight:400}@font-face{font-family:Inter;src:url(__FONT__/inter-latin-700-normal.woff2);font-weight:700}@font-face{font-family:Inter;src:url(__FONT__/inter-latin-800-normal.woff2);font-weight:800}@font-face{font-family:Inter;src:url(__FONT__/inter-latin-900-normal.woff2);font-weight:900}`;
const doc = (css, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONT}*{box-sizing:border-box;margin:0;padding:0}html,body{width:1200px;height:630px;overflow:hidden}body{font-family:Inter,"Liberation Sans",Arial,sans-serif;-webkit-font-smoothing:antialiased;position:relative}.sf{font-family:"Source Serif 4",Georgia,"DejaVu Serif",serif;font-weight:700}${css}</style></head><body>${body}</body></html>`;

/* ---- 1. VS: two funds head to head ---- */
function vs(A, B) {
  const ba = brand(A); let bb = brand(B);
  if (bb === ba) bb = { c: shade(ba.c, 0.55), d: shade(ba.d, 0.6), a: ba.a };
  const rowsN = [[A.yield, B.yield], [A.tr, B.tr], [A.er, B.er]].filter(([x, y]) => n(x) && n(y)).length;
  const row = (label, a, b, fmt, low) => {
    const win = n(a) && n(b) && a !== b ? ((low ? a < b : a > b) ? "a" : "b") : "";
    return `<div class="row"><div class="v ${win === "a" ? "w" : ""}">${fmt(a)}</div><div class="lab">${label}${label === "Total return" ? '<small>since launch</small>' : ""}</div><div class="v ${win === "b" ? "w" : ""}">${fmt(b)}</div></div>`;
  };
  const css = `body{background:#0a0f1c;color:#fff}
.l,.r{position:absolute;top:0;bottom:0;width:600px}.l{left:0;background:linear-gradient(160deg,${ba.c},${ba.d})}.r{right:0;background:linear-gradient(200deg,${bb.c},${bb.d})}
.tk{position:absolute;top:52px;width:600px;text-align:center;font-family:"Source Serif 4",Georgia,serif;font-weight:700;font-size:150px;letter-spacing:-.02em;line-height:1}.l .tk{left:0}.r .tk{right:0}
.vs{position:absolute;left:530px;top:70px;width:140px;height:140px;border-radius:50%;background:#ffd23f;color:#0a0f1c;font-weight:900;font-size:58px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 10px rgba(0,0,0,.35);z-index:3;letter-spacing:-.04em}
.stats{position:absolute;left:60px;right:60px;top:268px;z-index:2}
.row{display:grid;grid-template-columns:1fr 260px 1fr;align-items:center;height:108px;border-top:2px solid rgba(255,255,255,.14)}
.v{text-align:center;font-family:"Source Serif 4",Georgia,serif;font-weight:700;font-size:78px;letter-spacing:-.01em;color:rgba(255,255,255,.6)}.v.w{color:#3dff8f;text-shadow:0 0 30px rgba(61,255,143,.35)}
.lab{text-align:center;font-weight:800;font-size:22px;letter-spacing:.14em;color:rgba(255,255,255,.75);text-transform:uppercase}.lab small{display:block;font-size:15px;letter-spacing:.08em;margin-top:4px;color:rgba(255,255,255,.5);font-weight:700}`;
  return doc(css, `<div class="l"><div class="tk">${esc(A.sym)}</div></div><div class="r"><div class="tk">${esc(B.sym)}</div></div><div class="vs">VS</div>
<div class="stats" style="top:${268 + (3 - rowsN) * 54}px">${[["Yield", A.yield, B.yield, pct], ["Total return", A.tr, B.tr, signed], ["Fee", A.er, B.er, v => v.toFixed(2) + "%", true]].filter(r => n(r[1]) && n(r[2])).map(r => row(...r)).join("")}</div>`);
}

/* ---- 2. SINGLE: one fund, one giant number ---- */
function single(E, growth) {
  const b = brand(E);
  const big = growth || !(E.yield >= 6) ? { v: signed(E.tr), l: "total return since launch", c: E.tr >= 0 ? "#3dff8f" : "#ff4d5e" } : { v: pct(E.yield), l: "yield", c: "#3dff8f" };
  const pay = !growth && n(E.yield) ? `$10,000 pays <b>${usd(10000 * E.yield / 100)}</b> a year` : n(E.tr) ? `$10,000 became <b>${usd(10000 * (1 + E.tr / 100))}</b>` : "";
  const decay = E.decay == null ? "" : `<div class="chip ${E.decay ? "bad" : "ok"}">PRICE DECAY: ${E.decay ? "YES" : "NO"}</div>`;
  const css = `body{background:radial-gradient(1000px 700px at 85% 20%,${b.c} 0%,${b.d} 75%);color:#fff}
.tk{position:absolute;left:60px;top:40px;font-family:"Source Serif 4",Georgia,serif;font-weight:700;font-size:200px;letter-spacing:-.02em;line-height:1}
.big{position:absolute;left:56px;top:262px;font-family:"Source Serif 4",Georgia,serif;font-weight:700;font-size:190px;letter-spacing:-.02em;line-height:1;text-shadow:0 8px 30px rgba(0,0,0,.35)}
.lab{position:absolute;left:66px;top:462px;font-weight:800;font-size:30px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.pay{position:absolute;left:66px;top:524px;font-size:36px;font-weight:700;color:rgba(255,255,255,.85)}.pay b{color:#ffd23f;font-weight:900}
.chip{position:absolute;right:60px;top:70px;font-weight:900;font-size:28px;padding:16px 24px;border-radius:14px;letter-spacing:.04em}.chip.ok{background:#1fd270;color:#04170b}.chip.bad{background:#ff3b4f;color:#fff}`;
  return doc(css, `<div class="tk">${esc(E.sym)}</div>${decay}<div class="big" style="color:${big.c}">${big.v}</div><div class="lab">${big.l}</div><div class="pay">${pay}</div>`);
}

/* ---- 3. INCOME: "$100,000 in SCHD pays..." / "$1,000 a month needs..." ---- */
function income(E, mode) {
  const b = brand(E);
  const y = E.yield / 100;
  const freq = (E.freq || "").toLowerCase();
  const per = /week/.test(freq) ? ["every week", 52] : /quarter/.test(freq) ? ["every quarter", 4] : ["every month", 12];
  let top, big, sub;
  if (mode === "need") { top = `$1,000 a month from <b>${esc(E.sym)}</b> takes`; big = usd(12000 / y); sub = `at a ${pct(E.yield)} yield`; }
  else { top = `$100,000 in <b>${esc(E.sym)}</b> pays`; big = usd(100000 * y); sub = `a year &nbsp;·&nbsp; ${usd(100000 * y / per[1])} ${per[0]}`; }
  const css = `body{background:linear-gradient(135deg,${b.d} 0%,${b.c} 100%);color:#fff}
.coins{position:absolute;right:-60px;top:-60px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(255,210,63,.28),rgba(255,210,63,0) 70%)}
.top{position:absolute;left:64px;top:80px;font-family:"Source Serif 4",Georgia,serif;font-size:56px;font-weight:600;color:rgba(255,255,255,.9)}.top b{font-weight:900;color:#fff;background:rgba(0,0,0,.25);padding:2px 14px;border-radius:10px}
.big{position:absolute;left:56px;top:172px;font-family:"Source Serif 4",Georgia,serif;font-weight:700;font-size:236px;letter-spacing:-.03em;line-height:1;color:#ffd23f;text-shadow:0 10px 40px rgba(0,0,0,.35)}
.sub{position:absolute;left:66px;top:450px;font-size:44px;font-weight:800;color:rgba(255,255,255,.88)}`;
  return doc(css, `<div class="coins"></div><div class="top">${top}</div><div class="big">${big}</div><div class="sub">${sub}</div>`);
}

/* ---- 4. TABLE: blurred-ticker leaderboard ---- */
function table(list, growth) {
  const rows = list.slice(0, 9);
  const h = Math.max(70, Math.floor(630 / rows.length));
  const top = 630 - h * rows.length < 0 ? -Math.round(h * 0.2) : Math.round((630 - h * rows.length) / 2);
  const css = `body{background:#fff;color:#1f2937}
.t{position:absolute;left:0;right:0;top:${top}px}
.r{display:grid;grid-template-columns:160px 150px 190px 140px 140px 170px 250px;align-items:center;height:${h}px;border-bottom:1px solid #e3eef0;font-size:26px;text-align:center}
.r:nth-child(even){background:#f4fafb}
.tk{height:100%;display:flex;align-items:center;justify-content:center;background:#d6f1f6}.tk span{font-weight:900;color:#0e7490;font-size:28px;filter:blur(7px)}
.y{font-weight:900;color:#111827;font-size:29px}.g{font-weight:900;color:#16a34a;font-size:30px}.neg{font-weight:900;color:#dc2626;font-size:30px}
.no{font-weight:900;color:#16a34a}.yes{font-weight:900;color:#dc2626}.mu{color:#374151}`;
  if (growth) {
    const gcss = css.replace("grid-template-columns:160px 150px 190px 140px 140px 170px 250px", "grid-template-columns:220px 330px 380px 270px").replace(".g{font-weight:900;color:#16a34a;font-size:30px}", ".g{font-weight:900;color:#16a34a;font-size:40px}.k{font-weight:900;color:#111827;font-size:34px}").replace("font-size:26px;text-align:center", "font-size:30px;text-align:center");
    const gbody = rows.map(e => `<div class="r"><div class="tk"><span>${esc(e.sym)}</span></div><div class="${n(e.tr) && e.tr < 0 ? "neg" : "g"}">${signed(e.tr)}</div><div class="k">${n(e.tr) ? "$10K &#8594; " + usd(10000 * (1 + e.tr / 100)) : "n/a"}</div><div class="mu">${aum(e.aum)}</div></div>`).join("");
    return doc(gcss, `<div class="t">${gbody}</div>`);
  }
  const body = rows.map(e => `<div class="r"><div class="tk"><span>${esc(e.sym)}</span></div><div class="y">${pct(e.yield)}</div><div class="${n(e.tr) && e.tr < 0 ? "neg" : "g"}">${signed(e.tr)}</div><div class="mu">${n(e.er) ? e.er.toFixed(2) + "%" : "n/a"}</div><div class="mu">${aum(e.aum)}</div>${e.decay == null ? '<div class="mu">n/a</div>' : e.decay ? '<div class="yes">YES</div>' : '<div class="no">NO</div>'}<div class="mu">${esc(cap(e.freq) || (e.inception || ""))}</div></div>`).join("");
  return doc(css, `<div class="t">${body}</div>`);
}

/* ---- 5. BARS: yield vs total return, the "yield trap" picture ---- */
function bars(list) {
  const rows = list.slice(0, 5);
  const max = Math.max(...rows.map(e => Math.max(Math.abs(e.yield || 0), Math.abs(e.tr || 0))), 1);
  const W = 640, scale = v => Math.max(6, Math.round(W * Math.min(Math.abs(v), max) / max));
  const css = `body{background:#0b1020;color:#fff}
.legend{position:absolute;right:56px;top:30px;display:flex;gap:26px;font-weight:800;font-size:22px;letter-spacing:.1em}.legend i{display:inline-block;width:22px;height:22px;border-radius:5px;margin-right:10px;vertical-align:-3px}
.wrap{position:absolute;left:56px;right:56px;top:84px;bottom:30px;display:flex;flex-direction:column;justify-content:space-between}
.row{display:grid;grid-template-columns:200px 1fr;align-items:center}
.tk{font-family:"Source Serif 4",Georgia,serif;font-weight:700;font-size:52px;letter-spacing:-.01em}
.b{height:38px;border-radius:0 8px 8px 0;display:flex;align-items:center;margin:4px 0;font-weight:900;font-size:28px;white-space:nowrap}
.b span{margin-left:14px}`;
  const body = rows.map(e => `<div class="row"><div class="tk">${esc(e.sym)}</div><div><div class="b" style="width:${scale(e.yield)}px;background:#ffd23f;color:#0b1020"><span style="margin-left:${scale(e.yield) + 14}px;color:#ffd23f">${pct(e.yield)}</span></div><div class="b" style="width:${scale(e.tr)}px;background:${e.tr < 0 ? "#ff3b4f" : "#2ee07d"}"><span style="margin-left:${scale(e.tr) + 14}px;color:${e.tr < 0 ? "#ff6b7a" : "#2ee07d"}">${signed(e.tr)}</span></div></div></div>`).join("");
  return doc(css, `<div class="legend"><span><i style="background:#ffd23f"></i>YIELD</span><span><i style="background:#2ee07d"></i>TOTAL RETURN</span></div><div class="wrap">${body}</div>`);
}

/* Pick a template for an article. Returns {kind, html} or null (keep the old cover). */
export function cardFor(a, ALL) {
  if (!(CARD_SLUGS === "all" || CARD_SLUGS.includes(a.slug))) return null;
  const tk = (a.tickers || []).map(t => ALL[t]).filter(Boolean);
  if (!tk.length) return null;
  const growth = a.section === "growth";
  const kind = a.card || (
    tk.length === 2 && /-vs-/.test(a.slug) ? "vs" :
    /how-much-do-i-need/.test(a.slug) ? "need" :
    /how-much/.test(a.slug) ? "income" :
    tk.length === 1 || /etf-review|dividend-yield-total-return/.test(a.slug) ? "single" :
    /yield-vs|price-decay|return-of-capital|explained|1256/.test(a.slug) ? "bars" : "table");
  const withData = tk.filter(e => n(e.tr) || n(e.yield));
  if (kind === "vs") return { kind, html: vs(tk[0], tk[1]) };
  if ((kind === "income" || kind === "need") && n(tk[0].yield)) return { kind, html: income(tk[0], kind === "need" ? "need" : "pay") };
  if (kind === "single") return { kind, html: single(tk[0], growth) };
  if (kind === "bars") return { kind, html: bars(withData.filter(e => n(e.yield) && n(e.tr)).sort((x, y) => y.yield - x.yield)) };
  const sorted = withData.slice().sort((x, y) => growth ? (y.tr ?? -1e9) - (x.tr ?? -1e9) : (y.yield ?? -1) - (x.yield ?? -1));
  return { kind: "table", html: table(sorted, growth) };
}
