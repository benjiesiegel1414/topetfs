// TopETFs free tools: the /tools hub plus one page per tool.
// Tool logic lives in assets/js/tools.js; this file holds page markup, guides and FAQs.
export function buildTools({page,out,esc,proBand,SITE,ALL,F}){
const N=Object.keys(ALL).length;
const CSS=`<style>
.tl-wrap{max-width:1040px}
.tl-flag{display:inline-block;font-family:var(--sans);font-size:11px;font-weight:800;border-radius:999px;padding:2px 8px;vertical-align:1px}
.tl-flag.good{color:var(--pos);background:color-mix(in srgb,var(--pos) 12%,transparent)}
.tl-flag.bad{color:var(--neg);background:color-mix(in srgb,var(--neg) 12%,transparent)}
.tool .field input.bad{border-color:var(--neg)}
.tool .controls .field{min-width:150px}
.tool .results{margin:14px 0}
.tool .results>div{background:var(--paper);padding:14px 16px}
.tool .value{font-size:28px}
.tool .value.big{color:var(--navy)}
[data-theme="dark"] .tool .value.big{color:var(--link)}
.tool h3.sub{font-family:var(--sans);font-size:14px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:22px 0 10px}
.tool .data td{white-space:nowrap;font-variant-numeric:tabular-nums}
.tool:not(.ready) .results .value{opacity:.35}
.tl-note{background:color-mix(in srgb,var(--warn) 9%,var(--paper));border:1px solid color-mix(in srgb,var(--warn) 30%,var(--rule));border-radius:var(--radius);padding:11px 14px;margin:14px 0;font-size:13.5px;line-height:1.5;color:var(--ink-2)}
.tl-msg{font-size:13.5px;color:var(--neg);margin:6px 0 0}
.cmp-form{display:grid;grid-template-columns:repeat(4,1fr) auto;gap:12px;align-items:end}
.cmp-table td.win{color:var(--pos);font-weight:800}
.tool .cmp-table td,.tool .cmp-table th{white-space:normal;min-width:100px}
.tool .data th,.tool .data td{padding-left:10px;padding-right:10px}
.pf-row .field{min-width:0}
.cmp-table td.l{min-width:170px;font-weight:700}
.cmp-pop{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0}
.pf-row{display:grid;grid-template-columns:1fr 1fr 40px;gap:10px;align-items:end;margin-bottom:10px}
.pf-del{height:42px;border:1px solid var(--rule-strong);background:var(--paper);border-radius:8px;font-size:20px;cursor:pointer;color:var(--muted)}
.pf-del:hover{color:var(--neg);border-color:var(--neg)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.tl-pro{display:grid;grid-template-columns:1.4fr 1fr;gap:26px;align-items:center;background:var(--navy);color:#fff;border-radius:14px;padding:30px 32px;margin:26px 0 8px;position:relative;overflow:hidden}
.tl-pro::before{content:"";position:absolute;inset:0;background:radial-gradient(520px 260px at 100% 0%,rgba(242,193,78,.18),transparent 70%);pointer-events:none}
.tl-pro>*{position:relative}
.tl-pro .kicker{color:#f2c14e}
.tl-pro h2{font-family:var(--serif);font-size:32px;line-height:1.15;margin:8px 0 10px;color:#fff}
.tl-pro p{color:rgba(255,255,255,.8);margin:0 0 16px;font-size:16px}
.tl-pro ul{list-style:none;padding:0;margin:0;display:grid;gap:9px}
.tl-pro li{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:10px 12px;font-size:14px;color:rgba(255,255,255,.9)}
.tl-pro li b{color:#f2c14e}
.tl-badge{display:inline-block;background:#f2c14e;color:#1a1400;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:4px 10px}
.tl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.tl-card{display:flex;flex-direction:column;gap:8px;background:var(--paper);border:1px solid var(--rule);border-radius:12px;padding:20px;color:var(--ink);transition:transform .15s,box-shadow .15s,border-color .15s}
.tl-card:hover{text-decoration:none;transform:translateY(-2px);box-shadow:var(--shadow);border-color:var(--rule-strong)}
.tl-card .ic{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--link) 12%,transparent);color:var(--link)}
.tl-card .ic svg{width:22px;height:22px}
.tl-card h3{font-size:18px;margin:4px 0 0;line-height:1.25}
.tl-card p{margin:0;color:var(--ink-2);font-size:14.5px;line-height:1.5}
.tl-card .go{margin-top:auto;font-weight:800;font-size:14px;color:var(--link)}
.tl-card.pro{background:var(--navy);border-color:var(--navy);color:#fff}
.tl-card.pro p{color:rgba(255,255,255,.8)}
.tl-card.pro .ic{background:#f2c14e;color:#1a1400}
.tl-card.pro .go{color:#f2c14e}
.tl-guide{max-width:760px}
.tl-guide.prose{font-size:17.5px}
.tl-disc{margin:30px 0 0;padding:16px 18px;border:1px solid var(--rule);border-radius:var(--radius);background:var(--paper);font-size:13px;line-height:1.6;color:var(--muted)}
.tl-disc b{color:var(--ink)}
@media(max-width:860px){.tl-grid{grid-template-columns:1fr 1fr}.tl-pro{grid-template-columns:1fr;padding:24px 20px}.tl-pro h2{font-size:26px}.cmp-form{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.tl-grid,.two{grid-template-columns:1fr}.pf-row{grid-template-columns:1fr 1fr 40px}}
</style>`;
const ICON={
 calc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h0M16 11h0M8 15h2M12 15h0M16 15v3"/></svg>',
 target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>',
 loop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/></svg>',
 scale:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/></svg>',
 fee:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>',
 pie:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></svg>',
 filter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>',
 star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>'
};
const PRO_URL="https://topdividendetfspro.com/";
const proHero=(h="The best ETF tool we make: TopDividendETFsPRO")=>`<section class="tl-pro" aria-label="TopDividendETFsPRO">
<div><span class="tl-badge">Our #1 tool</span><h2>${h}</h2><p>Every free tool on TopETFs runs on a slice of the same database. PRO gives you all of it in one terminal, built for serious income investors.</p><a class="btn btn-gold" href="${PRO_URL}" target="_blank" rel="noopener" data-ga="tools-hero">Try TopDividendETFsPRO &rarr;</a></div>
<ul><li><b>160+ income ETFs</b> with yield, fees, AUM, payout schedule and price decay in one place</li><li><b>Grades and tax treatment</b> for every fund, so you can see quality at a glance</li><li><b>Advanced filters and trends</b> that go deeper than any free screener</li><li><b>Updated daily</b> by the team behind TopDividendETFs.com</li></ul></section>`;
const proCard=`<a class="tl-card pro" href="${PRO_URL}" target="_blank" rel="noopener" data-ga="tools-card"><span class="ic">${ICON.star}</span><span class="tl-badge" style="align-self:flex-start">Best tool</span><h3>TopDividendETFsPRO</h3><p>The full terminal: 160+ income ETFs with grades, tax treatment, payout schedules and advanced filters.</p><span class="go">Go PRO &rarr;</span></a>`;
const NOTE=`<div class="tl-note" role="note"><b>Heads up:</b> Results are estimates for educational purposes only, not financial advice. ETF data comes from our database, refreshes about once a day and may be delayed or outdated. Yields and payouts change. Verify with the fund issuer before investing. <a href="/disclaimer">Full disclaimer</a></div>`;
const DISC=`<p class="tl-disc"><b>Disclaimer:</b> TopETFs.com tools are provided by Dividend Empire LLC for educational and informational purposes only and are not financial, investment, tax or legal advice. Calculations are hypothetical illustrations based on simple assumptions and the current data in our database, which may be delayed, incomplete or inaccurate. Yields, distributions, prices and returns change and are not guaranteed. Past performance does not guarantee future results. Investing involves risk, including possible loss of principal. Talk to a licensed financial professional before making investment decisions. <a href="/disclaimer">Read the full disclaimer</a>.</p>`;
const tk=(n,l,ph,v)=>`<div class="field"><label>${l}</label><input name="${n}" placeholder="${ph}" value="${v||""}" autocomplete="off" spellcheck="false"></div>`;
const nm=(n,l,v,step="any",extra="")=>`<div class="field"><label>${l}</label><input name="${n}" type="number" inputmode="decimal" step="${step}" value="${v}" ${extra}></div>`;
const res=items=>`<div class="results">${items.map(([l,k,big])=>`<div><div class="label">${l}</div><div class="value${big?" big":""}" data-o="${k}">&nbsp;</div></div>`).join("")}</div>`;
const sym=s=>ALL[s]?`<a class="tkr" href="/etf?t=${s}">${s}</a>`:s;

const TOOLS=[
{slug:"dividend-calculator",card:"ETF Dividend Calculator",icon:"calc",blurb:"See exactly what any ETF pays you per year, month, week and payout at today's yield.",
 title:"ETF Dividend Calculator: How Much Will My ETF Pay Me? (Live Yields)",desc:`Free ETF dividend calculator with live yields for ${N}+ ETFs. See what SCHD, JEPI, JEPQ or any ETF pays per year, month, week and per payout.`,
 h1:"ETF Dividend Calculator",intro:"Pick any ETF, enter an amount, and see what it pays you per year, per month, per week and per payout at its current yield. Yields update daily from our database.",
 widget:`<div class="figure tool" data-tool="dividend"><p class="figure-title">How much will this ETF pay me?</p><p class="figure-sub">Live distribution yields from the TopETFs database</p>
 <div class="controls">${tk("t","ETF ticker","e.g. SCHD","SCHD")}${nm("amt","Amount invested ($)","10000","100")}</div>
 ${res([["Per year","annual",1],["Per month","monthly"],["Per week","weekly"],["Per payout","per"]])}
 <p class="figure-note" data-o="name"></p>
 <h3 class="sub">The same <span data-o="amtTxt">amount</span> in popular income ETFs</h3><div class="chart"></div>
 <p class="figure-note">Your pick is highlighted. Click a bar to run the calculator for that fund. Higher yield is not automatically better, so check price decay and total return too.</p></div>`,
 guide:`<h2>How the ETF dividend calculator works</h2><p>The math is simple: <strong>amount invested &times; dividend yield = yearly income</strong>. Divide by 12 for a monthly figure, or by the number of payouts the fund makes in a year to see the size of each check. The calculator pulls each fund's current distribution yield and payout frequency from our database, so you do not have to look anything up.</p>
<p>For example, if a fund yields 3.5% and you invest $10,000, that is about $350 a year. A quarterly payer like ${sym("SCHD")} would split that into four payments of roughly $87.50, while a monthly payer like ${sym("JEPI")} spreads its income across 12 smaller checks.</p>
<h2>What the yield really tells you</h2><p>A distribution yield is a snapshot based on recent payouts. It changes as the fund's payouts and share price move. Dividend growth funds like ${sym("SCHD")}, ${sym("DGRO")} and ${sym("VIG")} have historically raised their payouts over time, while option-income funds like ${sym("JEPI")}, ${sym("JEPQ")} and ${sym("SPYI")} pay more today but their payouts move around with market volatility.</p>
<p>That is why the chart below the calculator flags <strong>price decay</strong>. A fund can show a huge yield while its share price slowly shrinks, which eats into your total return. Always look at both numbers.</p>
<h2>Tips for using it</h2><ul><li>Compare the same dollar amount across several funds with the chart, then open each fund's profile.</li><li>Use the <a href="/dividend-income-goal-calculator">income goal calculator</a> if you want to work backward from a monthly income target.</li><li>Use the <a href="/drip-calculator">DRIP calculator</a> to see what reinvesting those dividends could grow into.</li></ul>`,
 faq:[["How do I calculate dividends from an ETF?","Multiply the amount you invest by the ETF's dividend yield. That gives you an estimate of yearly income. Divide by 12 for monthly income, or by the number of payouts per year to estimate each payment."],
 ["How much does $10,000 in SCHD pay per year?","Multiply $10,000 by SCHD's current yield. At a 3.5% yield that would be about $350 a year, paid in four quarterly payments. Run the calculator above for the live number."],
 ["Are ETF dividends guaranteed?","No. ETF distributions depend on the dividends and option income the fund collects, and they can rise, fall or stop. The yield shown is a snapshot, not a promise."],
 ["What is the difference between yield and total return?","Yield is the income a fund pays. Total return adds the change in share price. A fund with a high yield and falling price can have a weaker total return than a lower-yield fund that grows."]]},

{slug:"dividend-income-goal-calculator",card:"Dividend Income Goal Calculator",icon:"target",blurb:"How much do you need to invest to make $1,000 a month in dividends? Find out by ETF.",
 title:"How Much Do I Need to Invest to Make $1,000 a Month in Dividends? (Calculator)",desc:"Dividend income goal calculator. Enter a monthly, weekly or yearly income target and see how much you need to invest in SCHD, JEPI, JEPQ and other ETFs at live yields.",
 h1:"Dividend Income Goal Calculator",intro:"Set an income target, pick an ETF, and see how much you would need to invest to get there at today's yield. Then compare the answer across the most popular income ETFs.",
 widget:`<div class="figure tool" data-tool="goal"><p class="figure-title">How much do I need to invest?</p><p class="figure-sub">Work backward from the income you want</p>
 <div class="controls">${nm("goal","Income goal ($)","1000","50")}<div class="field"><label>Per</label><select name="per"><option value="month">Month</option><option value="week">Week</option><option value="year">Year</option></select></div>${tk("t","ETF ticker","e.g. SCHD","SCHD")}</div>
 ${res([["You would need to invest","need",1],["Yearly income","annual"],["Yearly fund fee on that amount","fee"]])}
 <p class="figure-note">To make <span data-o="goalTxt"></span> with <span data-o="needName"></span>.</p>
 <h3 class="sub">Investment needed in popular income ETFs</h3><div class="chart"></div>
 <div class="tbl-scroll" style="margin-top:14px"><table class="data"><thead><tr><th class="l">ETF</th><th>Yield</th><th>You need</th><th>Payout</th><th>Total return</th><th>Price decay</th></tr></thead><tbody></tbody></table></div>
 <p class="figure-note">Lower is cheaper to reach, but a much higher yield often comes with more risk or price decay. Total return is since each fund's inception.</p></div>`,
 guide:`<h2>The formula</h2><p>To find how much you need, flip the dividend math around: <strong>yearly income goal &divide; dividend yield = amount to invest</strong>. If you want $1,000 a month, that is $12,000 a year. At a 3.5% yield you would need about $343,000. At a 10% yield you would need about $120,000.</p>
<p>That gap is why so many people search for this. A higher yield gets you to your number with less money, but it is not free. Funds that pay double-digit yields usually do it with option strategies that cap upside, and some of them lose share price over time.</p>
<h2>Balancing yield and safety</h2><p>Many income investors split the difference: a core of dividend growth funds like ${sym("SCHD")} or ${sym("VYM")} for payouts that tend to rise over time, plus some higher-yield funds like ${sym("JEPI")}, ${sym("JEPQ")} or ${sym("SPYI")} to boost income today. The table under the calculator shows the price decay flag and total return so you can see the trade-off for each fund.</p>
<p>Want to model a mix? Use the <a href="/dividend-portfolio-calculator">dividend portfolio calculator</a> to plug in several ETFs at once and see your blended yield and month-by-month income.</p>
<h2>Things the calculator does not include</h2><ul><li><strong>Taxes.</strong> Dividends in a taxable account are taxed, so you may need more to hit an after-tax goal.</li><li><strong>Changing payouts.</strong> Yields move. Your income will too.</li><li><strong>Inflation.</strong> $1,000 a month buys less every year, which is one reason dividend growth matters.</li></ul>`,
 faq:[["How much do I need to invest to make $1,000 a month in dividends?","Divide $12,000 by the yield. At 3% you need about $400,000, at 5% about $240,000, and at 10% about $120,000. The calculator above uses live yields for each ETF."],
 ["How much do I need in SCHD to make $1,000 a month?","Divide $12,000 by SCHD's current yield. At a 3.5% yield that is roughly $343,000. Enter SCHD above for the live figure."],
 ["Is it better to use a high yield ETF to reach my goal faster?","It gets you there with less money, but high-yield funds often have more risk, capped upside or price decay. Many investors blend high-yield funds with dividend growth funds."],
 ["Does this include taxes?","No. The results are before taxes. Dividends held in a taxable account are usually taxed, so an after-tax goal needs a bigger investment."]]},

{slug:"drip-calculator",card:"DRIP Calculator",icon:"loop",blurb:"Reinvest dividends vs. take the cash. See the growth, the future income and a year-by-year table.",
 title:"DRIP Calculator: Dividend Reinvestment Calculator With Live ETF Yields",desc:"Free DRIP calculator. See how reinvesting ETF dividends grows your portfolio and income over time, with monthly contributions, dividend growth, price growth and taxes.",
 h1:"DRIP Calculator",intro:"See what happens when you reinvest every dividend instead of spending it. Pick an ETF to load its live yield, or type your own assumptions.",
 widget:`<div class="figure tool" data-tool="drip"><p class="figure-title">Dividend reinvestment (DRIP) calculator</p><p class="figure-sub">Reinvesting vs. taking dividends as cash</p>
 <div class="controls">${tk("t","ETF (loads yield)","e.g. SCHD","SCHD")}${nm("start","Starting amount ($)","10000","500")}${nm("monthly","Monthly contribution ($)","500","50")}${nm("years","Years","20","1",'min="1" max="50"')}</div>
 <div class="controls">${nm("yield","Dividend yield (%)","","0.1")}${nm("dg","Dividend growth / yr (%)","6","0.5")}${nm("pg","Share price growth / yr (%)","5","0.5")}${nm("tax","Tax on dividends (%)","0","1",'min="0" max="60"')}</div>
 <div class="legend"></div><div class="chart"></div>
 ${res([["Ending value with DRIP","end",1],["Yearly income at the end","income"],["Monthly income at the end","monthlyInc"],["Total contributed","contrib"],["Dividends reinvested","divs"],["DRIP advantage","gap"]])}
 <h3 class="sub">Year by year (with DRIP)</h3>
 <div class="tbl-scroll"><table class="data"><thead><tr><th class="l">Year</th><th>Total contributed</th><th>Portfolio value</th><th>Yearly income</th><th>Monthly income</th><th>Cash route value + dividends</th></tr></thead><tbody></tbody></table></div>
 <p class="figure-note">Illustration only. Assumes steady growth rates, monthly compounding and that dividends are reinvested the month they are paid. Real results vary.</p></div>`,
 guide:`<h2>What DRIP means</h2><p>DRIP stands for <strong>dividend reinvestment plan</strong>. Instead of taking each dividend as cash, your broker uses it to buy more shares of the same fund, usually for free and in fractional amounts. More shares means a bigger next dividend, which buys even more shares. That loop is compounding.</p>
<h2>How to read the results</h2><p>The blue line is your portfolio if every dividend gets reinvested. The orange line keeps the same contributions but takes dividends as cash. The <strong>DRIP advantage</strong> compares the reinvested portfolio to the cash route's portfolio plus all the cash it collected, so it is a fair comparison.</p>
<p>Two growth inputs matter most. <strong>Dividend growth</strong> is how fast the fund's payout per share rises each year. Dividend growth funds like ${sym("SCHD")} and ${sym("DGRO")} have historically raised payouts at a solid clip. <strong>Share price growth</strong> is how fast the fund's price rises. High-yield option funds often have higher yields but little or no price growth, and sometimes price decay.</p>
<h2>Try these scenarios</h2><ul><li>Load ${sym("SCHD")}, then ${sym("JEPI")}, and compare the yearly income after 20 years.</li><li>Set a tax rate of 15% to see the drag of holding dividend funds in a taxable account versus an IRA.</li><li>Set price growth to 0% or below for high-yield funds that do not grow, to see a more cautious outcome.</li></ul>`,
 faq:[["What is a DRIP calculator?","A DRIP calculator estimates how a portfolio grows when dividends are automatically reinvested to buy more shares, compared with taking dividends as cash."],
 ["Is it better to reinvest dividends or take the cash?","Reinvesting usually builds a bigger portfolio and bigger future income, while taking cash gives you income today. Many investors reinvest while working and switch to cash in retirement."],
 ["Are reinvested dividends still taxed?","Yes. In a taxable account, dividends are taxed in the year they are paid even if you reinvest them. Use the tax field above to model that."],
 ["What dividend growth rate should I use?","It depends on the fund. Dividend growth ETFs have historically raised payouts several percent a year, while option-income funds have no set growth pattern. Use a conservative number if unsure."]]},

{slug:"etf-comparison",card:"ETF Comparison Tool",icon:"scale",blurb:"Compare up to 4 ETFs side by side: yield, fees, AUM, total return, annualized return and price decay.",
 title:"ETF Comparison Tool: Compare ETFs Side by Side (Yield, Fees, Returns)",desc:`Compare up to 4 ETFs side by side. Yield, income on $10,000, expense ratio, AUM, total return, annualized return, payout frequency and price decay with live data for ${N}+ ETFs.`,
 h1:"ETF Comparison Tool",intro:"Put up to four ETFs head to head. Yield, income, fees, size, returns and price decay, side by side, with the winner in each row highlighted.",
 widget:`<div class="figure tool" data-tool="compare"><p class="figure-title">Compare ETFs side by side</p><p class="figure-sub">Enter up to four tickers</p>
 <form class="cmp-form" action="/etf-comparison" method="get"><div class="field"><label>ETF 1</label><input data-slot placeholder="SCHD"></div><div class="field"><label>ETF 2</label><input data-slot placeholder="JEPI"></div><div class="field"><label>ETF 3</label><input data-slot placeholder="Optional"></div><div class="field"><label>ETF 4</label><input data-slot placeholder="Optional"></div><button class="btn btn-gold" type="submit">Compare</button></form>
 <p class="tl-msg" data-o="missing"></p>
 <div class="cmp-out" style="margin-top:16px"><p class="muted">Loading live data...</p></div>
 <div class="two" style="margin-top:8px"><div><h3 class="sub">Yearly income on $10,000</h3><div class="chart chart-y"></div></div><div><h3 class="sub">Annualized return since inception</h3><div class="chart chart-r"></div></div></div>
 <h3 class="sub">Popular comparisons</h3><div class="cmp-pop">${["SCHD,JEPI","SCHD,VYM","JEPI,JEPQ","SPYI,JEPI","QQQI,JEPQ","SCHD,DGRO","VOO,SCHD","QYLD,QQQI","SCHD,VYM,DGRO,VIG","JEPI,SPYI,DIVO,GPIX"].map(p=>`<a class="chip" href="/etf-comparison?t=${p}">${p.split(",").join(" vs ")}</a>`).join("")}</div></div>`,
 guide:`<h2>What to compare first</h2><p>When you line up two ETFs, start with three numbers: <strong>yield</strong> (what it pays you), <strong>expense ratio</strong> (what it costs you every year) and <strong>annualized return</strong> (how it has actually done per year, including price changes). Together they tell you most of the story.</p>
<p>We show annualized return next to total return because total return is measured since each fund's inception. A fund that launched in 2011 will almost always show a bigger total return than one that launched in 2023. Annualized return puts them on the same yearly scale.</p>
<h2>Popular matchups</h2><p><strong>${sym("SCHD")} vs ${sym("JEPI")}</strong> is the classic dividend growth vs. covered call income debate. SCHD usually pays less today but has a long record of raising its dividend, while JEPI pays more monthly income but caps some upside. <strong>${sym("JEPI")} vs ${sym("JEPQ")}</strong> is S&amp;P 500 vs. Nasdaq-100 option income. <strong>${sym("SPYI")} vs ${sym("JEPI")}</strong> brings tax treatment into the mix.</p>
<h2>Watch the price decay row</h2><p>A "Yes" means the fund's share price is below where it started. That is common with very high-yield funds, and it means part of the income has been offset by a shrinking share price. It is not automatically bad, but it is something you should know before you buy.</p>`,
 faq:[["How do I compare two ETFs?","Look at yield, expense ratio, assets under management, payout frequency and returns side by side. Use annualized return rather than total return when funds launched in different years."],
 ["Which is better, SCHD or JEPI?","They do different jobs. SCHD focuses on quality dividend growth, while JEPI targets higher monthly income using options. Compare them above with live data, and consider which goal matters more to you."],
 ["What is a good expense ratio for an ETF?","Broad index ETFs often charge under 0.10%. Actively managed and option-income funds often charge 0.35% to 1% or more. Lower is better when two funds do the same job."],
 ["Can I share a comparison?","Yes. Every comparison has its own link, so you can bookmark it or send it to someone."]]},

{slug:"expense-ratio-calculator",card:"Expense Ratio Calculator",icon:"fee",blurb:"See how much an ETF's fee really costs you in dollars over 10, 20 or 30 years.",
 title:"ETF Expense Ratio Calculator: What Fees Really Cost You Over Time",desc:"Free ETF expense ratio calculator. Compare two ETFs or fees and see the total dollars paid in fees and the difference in your ending balance over time.",
 h1:"ETF Expense Ratio Calculator",intro:"A fee that looks tiny on paper can cost thousands over time. Pick two ETFs to load their live expense ratios, or type any fee, and see the real dollar cost.",
 widget:`<div class="figure tool" data-tool="fees"><p class="figure-title">What does the fee really cost?</p><p class="figure-sub">Same investment, two different expense ratios</p>
 <div class="controls">${tk("a","Fund A ticker","e.g. VOO","VOO")}${nm("era","Fund A expense ratio (%)","","0.01")}${tk("b","Fund B ticker","e.g. QYLD","QYLD")}${nm("erb","Fund B expense ratio (%)","","0.01")}</div>
 <div class="controls">${nm("start","Starting amount ($)","50000","1000")}${nm("monthly","Monthly contribution ($)","500","50")}${nm("ret","Return before fees (%/yr)","8","0.5")}${nm("years","Years","25","1",'min="1" max="50"')}</div>
 <div class="legend"></div><div class="chart"></div>
 ${res([["Ending value, <span data-o=\"la\"></span>","a"],["Ending value, <span data-o=\"lb\"></span>","b"],["Difference","gap",1],["Total fees paid, <span data-o=\"la\"></span>","fa"],["Total fees paid, <span data-o=\"lb\"></span>","fb"],["Year-one fee, fund A","yr1a"]])}
 <p class="figure-note">Year-one fee on your starting amount: <span data-o="yr1a"></span> vs. <span data-o="yr1b"></span>. Both funds earn the same return before fees here so you can isolate the cost. Real funds also differ in what they hold and how they perform.</p></div>`,
 guide:`<h2>What an expense ratio is</h2><p>The expense ratio is the yearly fee an ETF charges, shown as a percent of your investment. You never get a bill. It comes out of the fund's assets a little at a time, which is exactly why it is easy to ignore. A 0.50% fee on $100,000 is $500 a year, every year, and it grows as your balance grows.</p>
<h2>Why small differences add up</h2><p>Fees compound against you the same way returns compound for you. Every dollar paid in fees is a dollar that is no longer invested and growing. Over 25 or 30 years, the gap between a 0.03% index fund like ${sym("VOO")} and a fund charging 0.60% or more can be tens of thousands of dollars on an ordinary portfolio.</p>
<h2>When a higher fee can make sense</h2><p>Some strategies cost more to run. Option-income funds like ${sym("JEPI")}, ${sym("QYLD")} or ${sym("SPYI")} and actively managed funds charge more than plain index funds. That can be worth it if the strategy gives you something you want, like higher monthly income. The point of this calculator is to make sure you know the price you are paying.</p>
<p>Want a list of the cheapest funds? See our <a href="/lists/low-expense-ratio-etfs">low expense ratio ETFs</a> screen.</p>`,
 faq:[["How is an ETF expense ratio charged?","It is deducted from the fund's assets daily, a tiny fraction at a time, and reflected in the share price. You do not pay it separately."],
 ["How much is a 0.5% expense ratio on $10,000?","About $50 a year. As your balance grows, the dollar amount grows too, and over decades the lost compounding adds up to much more."],
 ["What is a good expense ratio?","Broad market index ETFs often charge 0.03% to 0.10%. Many dividend ETFs charge 0.06% to 0.40%. Option-income and actively managed funds often charge 0.35% to 1% or more."],
 ["Does a higher expense ratio mean a worse ETF?","Not always. It means the strategy costs more. Compare what you get for the fee, like income, strategy and total return, before deciding."]]},

{slug:"dividend-portfolio-calculator",card:"Dividend Portfolio Calculator",icon:"pie",blurb:"Add your ETFs and amounts to see blended yield, total income and your income month by month.",
 title:"Dividend Portfolio Calculator: Monthly Income From Your ETF Portfolio",desc:"Free dividend portfolio calculator. Add your ETFs and amounts to see your blended yield, yearly and monthly dividend income, weighted expense ratio and income by month.",
 h1:"Dividend Portfolio Income Calculator",intro:"Add the ETFs you own (or want to own) and how much is in each. See your blended yield, total income, fees and an estimate of what lands in each month.",
 widget:`<div class="figure tool" data-tool="portfolio"><p class="figure-title">Your dividend portfolio</p><p class="figure-sub">Live yields. Up to 15 holdings.</p>
 <div class="pf-rows"></div><button type="button" class="btn btn-ghost pf-add" style="padding:9px 14px">+ Add an ETF</button>
 <p class="tl-msg" data-o="missing"></p>
 ${res([["Yearly income","inc",1],["Average per month","mo"],["Per week","wk"],["Total invested","tot"],["Blended yield","yld"],["Weighted expense ratio","er"]])}
 <p class="figure-note">Estimated yearly fund fees on this portfolio: <span data-o="fee"></span>. Lightest month: <span data-o="low"></span>, heaviest month: <span data-o="high"></span>.</p>
 <h3 class="sub">Estimated income by month</h3><div class="chart"></div>
 <div class="tbl-scroll" style="margin-top:14px"><table class="data"><thead><tr><th class="l">Holding</th><th>Invested</th><th>Yield</th><th>Payout</th><th>Per year</th><th>Per month</th><th>Share of income</th><th>Price decay</th></tr></thead><tbody></tbody></table></div>
 <p class="figure-note">Monthly timing is an estimate: weekly and monthly payers are spread evenly, quarterly payers are placed in March, June, September and December. Actual pay dates vary by fund. Your portfolio is saved in the page link, so bookmark it to come back.</p></div>`,
 guide:`<h2>Why look at the whole portfolio</h2><p>Most income investors own more than one fund. A single number for your <strong>blended yield</strong> and your <strong>total monthly income</strong> tells you far more than each fund's yield on its own. This calculator weights every holding by how much you have in it.</p>
<h2>Smoothing out your monthly income</h2><p>Quarterly payers like ${sym("SCHD")}, ${sym("VYM")} and ${sym("DGRO")} tend to bunch income into March, June, September and December. Adding monthly payers like ${sym("JEPI")}, ${sym("JEPQ")} or ${sym("SPYI")}, or weekly payers, fills in the gaps. The month-by-month chart shows how even (or lumpy) your paycheck is.</p>
<h2>Don't forget fees and quality</h2><p>The weighted expense ratio shows what the portfolio costs you each year in fees. The holdings table flags price decay so you can see if part of your income is coming from funds whose share price has been shrinking. Run any single fund through the <a href="/drip-calculator">DRIP calculator</a> to see its long-term picture, or put two head to head in the <a href="/etf-comparison">ETF comparison tool</a>.</p>`,
 faq:[["How do I calculate the dividend yield of my portfolio?","Add up the yearly income from every holding (amount times yield) and divide by the total amount invested. That is your blended, or weighted, yield."],
 ["How can I get dividend income every month?","Mix funds with different schedules. Monthly and weekly payers fill the months between the quarterly payments that most traditional dividend funds make."],
 ["Is my portfolio saved?","Your holdings are stored in the page link, not on our servers. Bookmark the page to come back to the same portfolio."],
 ["Does this include taxes?","No. The income shown is before taxes. Dividends in a taxable account are usually taxed."]]}
];

// Tool pages (flat URLs at the root, e.g. /dividend-calculator)
for(const t of TOOLS){
  const others=TOOLS.filter(x=>x!==t);
  const faqLd=t.faq.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}));
  out[t.slug+".html"]=page({title:t.title+" | TopETFs",desc:t.desc,canonical:"/"+t.slug,active:"/tools",faq:faqLd,
    extra:`<script src="/assets/js/tools.js" defer></script>${CSS}`,
    ld:{"@context":"https://schema.org","@type":"WebApplication",name:t.card,url:SITE+"/"+t.slug,description:t.desc,applicationCategory:"FinanceApplication",operatingSystem:"Any",offers:{"@type":"Offer",price:"0",priceCurrency:"USD"},publisher:{"@type":"Organization",name:"Dividend Empire LLC"}}},
  `<header class="page-head"><div class="wrap tl-wrap"><nav class="crumbs"><a href="/">Home</a> / <a href="/tools">Tools</a></nav><span class="kicker">Free tool</span><h1>${t.h1}</h1><p>${t.intro}</p></div></header>
<div class="wrap tl-wrap">
${t.widget}
${NOTE}
${proHero("Want every number, for every income ETF, in one place?")}
<article class="prose tl-guide">${t.guide}
<section class="faq"><h2>Frequently asked questions</h2>${t.faq.map(([q,a])=>`<h3>${q}</h3>\n<p>${a}</p>`).join("\n")}</section></article>
<div class="section-head"><h2>More free ETF tools</h2><a href="/tools">All tools &rarr;</a></div>
<div class="tl-grid">${proCard}${others.slice(0,5).map(x=>card(x)).join("")}</div>
${DISC}
</div>`);
}
function card(t){return `<a class="tl-card" href="/${t.slug}"><span class="ic">${ICON[t.icon]}</span><h3>${t.card}</h3><p>${t.blurb}</p><span class="go">Open the tool &rarr;</span></a>`;}

// Tools hub
out["tools.html"]=page({title:"Free ETF Tools and Calculators (Dividend, DRIP, Comparison) | TopETFs",desc:"Free ETF tools with live data: dividend calculator, income goal calculator, DRIP calculator, ETF comparison, expense ratio calculator, portfolio income calculator and an ETF screener.",canonical:"/tools",active:"/tools",extra:CSS,
  ld:{"@context":"https://schema.org","@type":"CollectionPage",name:"Free ETF Tools",url:SITE+"/tools",hasPart:TOOLS.map(t=>({"@type":"WebApplication",name:t.card,url:SITE+"/"+t.slug}))}},
`<header class="page-head"><div class="wrap"><span class="kicker">Tools</span><h1>Free ETF tools and calculators</h1><p>Run the numbers yourself with live data on ${N}+ ETFs. Every tool is free, works on your phone and gives you a link you can save or share.</p></div></header>
<div class="wrap">
${proHero()}
<div class="section-head"><h2>Free tools</h2><p class="muted" style="margin:0">Live yields, fees and returns from our database</p></div>
<div class="tl-grid">${TOOLS.map(card).join("")}
<a class="tl-card" href="/screener"><span class="ic">${ICON.filter}</span><h3>ETF Screener</h3><p>Filter ${N}+ ETFs by yield, payout frequency, AUM, fees, total return and price decay.</p><span class="go">Open the screener &rarr;</span></a>
${proCard}</div>
<div class="section-head"><h2>More tools from our network</h2></div>
<div class="tl-grid">
<a class="tl-card" href="https://topdividendtools.com/" target="_blank" rel="noopener"><span class="ic">${ICON.calc}</span><h3>TopDividendTools.com</h3><p>More calculators for dividend investors, from yield on cost to dividend growth.</p><span class="go">Visit TopDividendTools &rarr;</span></a>
<a class="tl-card" href="https://dividendprojection.com/" target="_blank" rel="noopener"><span class="ic">${ICON.fee}</span><h3>DividendProjection.com</h3><p>Project your future dividend income with live yields from the PRO database.</p><span class="go">Visit DividendProjection &rarr;</span></a>
<a class="tl-card" href="https://topdividendetfs.com/" target="_blank" rel="noopener"><span class="ic">${ICON.star}</span><h3>TopDividendETFs.com</h3><p>The free, daily-updated ranking of top dividend ETFs, voted on by investors.</p><span class="go">Visit TopDividendETFs &rarr;</span></a>
</div>
${DISC}
${proBand()}
</div>`);
return TOOLS.map(t=>"/"+t.slug);
}
