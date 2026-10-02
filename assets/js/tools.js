/* TopETFs free tools. Each tool lives in <div data-tool="name"> and runs on live data
   from window.TopETFs (app.js). Calculators update as you type and keep their inputs in the URL
   so any result can be bookmarked or shared. */
(function(){
"use strict";
var FREQ_N={Weekly:52,Monthly:12,Quarterly:4,"Semi-Annual":2,Annual:1};
var POP=["SCHD","VYM","DGRO","JEPI","JEPQ","SPYI","QQQI","DIVO","GPIQ","QYLD","SGOV","VOO"];
var MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var T,F,D;

function $(el,s){return el.querySelector(s);}
function $$(el,s){return Array.prototype.slice.call(el.querySelectorAll(s));}
function num(v){v=+String(v==null?"":v).replace(/[^\d.\-]/g,"");return isNaN(v)?0:v;}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}
function usd(v,d){if(v==null||isNaN(v))return "n/a";if(d==null)d=Math.abs(v)<100?2:0;return (v<0?"-":"")+"$"+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});}
function etf(sym){sym=String(sym||"").toUpperCase().replace(/[^A-Z.]/g,"");return D.all[sym]||null;}
function freqOf(e){if(!e)return "";var f=e.freq?e.freq.charAt(0).toUpperCase()+e.freq.slice(1).toLowerCase():"";if(f==="Semi-annual")f="Semi-Annual";if(!f&&e.lists&&e.lists.indexOf("weekly")>-1)f="Weekly";return f;}
function perYear(e){return FREQ_N[freqOf(e)]||4;}
function pDate(s){var m=String(s||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?new Date(+m[3],+m[1]-1,+m[2]):null;}
function ageYears(e){var d=pDate(e&&e.inception);return d?(Date.now()-d.getTime())/(365.25*864e5):null;}
function annualized(e){var a=ageYears(e);if(a==null||a<1||e.tr==null||e.tr<=-100)return null;return (Math.pow(1+e.tr/100,1/a)-1)*100;}
function isGrowthOnly(e){return e&&e.lists&&e.lists.indexOf("growth")>-1&&e.lists.indexOf("pro")<0&&e.lists.indexOf("weekly")<0;}
function yld(e){return e&&!isGrowthOnly(e)&&e.yield!=null?e.yield:null;}
function epath(s){return "/etfs/"+String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-");}
function link(e){return '<a href="'+epath(e.sym)+'">'+esc(e.sym)+'</a>';}
function legend(el,series){if(el)el.innerHTML=series.map(function(s){return '<span><i style="background:'+s.color+'"></i>'+esc(s.name)+'</span>';}).join("");}
function out(el,k,v){$$(el,'[data-o="'+k+'"]').forEach(function(t){t.innerHTML=v;});}
function params(){var o={};location.search.replace(/^\?/,"").split("&").forEach(function(p){if(!p)return;var kv=p.split("=");o[decodeURIComponent(kv[0])]=decodeURIComponent((kv[1]||"").replace(/\+/g," "));});return o;}
function saveURL(o){try{var q=Object.keys(o).filter(function(k){return o[k]!==""&&o[k]!=null;}).map(function(k){return k+"="+encodeURIComponent(o[k]);}).join("&");history.replaceState(null,"",location.pathname+(q?"?"+q:""));}catch(e){}}
var rT=null;function onResize(fn){var w=window.innerWidth;window.addEventListener("resize",function(){clearTimeout(rT);rT=setTimeout(function(){if(window.innerWidth!==w){w=window.innerWidth;fn();}},200);});}
function datalist(){
  if(document.getElementById("etf-list"))return;
  var dl=document.createElement("datalist");dl.id="etf-list";
  dl.innerHTML=Object.keys(D.all).sort().map(function(s){var e=D.all[s];return '<option value="'+s+'">'+esc(e.name)+(yld(e)!=null?" · "+F.pct(e.yield)+" yield":"")+'</option>';}).join("");
  document.body.appendChild(dl);
}
function bindTicker(inp,cb){inp.setAttribute("list","etf-list");inp.setAttribute("autocomplete","off");inp.setAttribute("spellcheck","false");
  inp.addEventListener("input",function(){var v=inp.value.toUpperCase();if(v!==inp.value)inp.value=v;var e=etf(v);inp.classList.toggle("bad",!!v&&!e);if(e||!v)cb(e);});
  inp.addEventListener("change",function(){cb(etf(inp.value));});}
function fill(el,p,defs){Object.keys(defs).forEach(function(k){var i=$(el,'[name="'+k+'"]');if(i)i.value=p[k]!=null&&p[k]!==""?p[k]:defs[k];});}
function vals(el,names){var o={};names.forEach(function(n){var i=$(el,'[name="'+n+'"]');o[n]=i?i.value:"";});return o;}
function warnDecay(e){return e&&e.decay?' <span class="tl-flag bad" title="Share price is below where it started">Price decay</span>':'';}

var TOOLS={};

/* 1. ETF dividend calculator */
TOOLS.dividend=function(el){
  var p=params();fill(el,p,{t:"SCHD",amt:"10000"});
  var chart=$(el,".chart");
  function calc(){
    var e=etf($(el,"[name=t]").value),a=Math.max(0,num($(el,"[name=amt]").value));
    saveURL(vals(el,["t","amt"]));
    if(!e||yld(e)==null){out(el,"name",e?esc(e.sym)+" does not have a distribution yield in our data (it is tracked as a growth fund). Try an income ETF like SCHD, JEPI or SPYI.":"Type a ticker from the list, like SCHD, JEPI or QQQI.");return;}
    var yr=a*e.yield/100,n=perYear(e),f=freqOf(e)||"Quarterly";
    out(el,"annual",usd(yr,0));out(el,"monthly",usd(yr/12));out(el,"weekly",usd(yr/52));out(el,"daily",usd(yr/365));
    out(el,"per",usd(yr/n));out(el,"perLabel","Per "+f.toLowerCase()+" payout");
    out(el,"name",link(e)+" "+esc(e.name)+", "+F.pct(e.yield)+" yield, pays "+esc(f.toLowerCase())+", expense ratio "+F.pct2(e.er)+warnDecay(e)+". Fee on this amount: about "+usd(a*(e.er||0)/100)+" a year.");
    out(el,"amtTxt",usd(a,0));
    var list=POP.concat([e.sym]).filter(function(s,i,arr){return arr.indexOf(s)===i;}).map(etf).filter(function(x){return x&&yld(x)!=null;}).sort(function(x,y){return y.yield-x.yield;});
    T.charts.bar(chart,list.map(function(x){var v=a*x.yield/100;return {label:x.sym,sub:x.name,value:v,href:"/dividend-calculator?t="+x.sym+"&amt="+a,color:x.sym===e.sym?css("--series-2"):null,tip:[["Yield",F.pct(x.yield)],["Per year",usd(v,0)],["Per month",usd(v/12)],["Price decay",x.decay?"Yes":"No"]]};}),{fmt:function(v){return usd(v,0);},valW:84,aria:"Annual income from the same amount in popular ETFs"});
  }
  bindTicker($(el,"[name=t]"),calc);el.addEventListener("input",calc);calc();onResize(calc);
};

/* 2. Dividend income goal calculator */
TOOLS.goal=function(el){
  var p=params();fill(el,p,{goal:"1000",per:"month",t:"SCHD"});
  var chart=$(el,".chart"),tb=$(el,"tbody");
  function calc(){
    var g=Math.max(0,num($(el,"[name=goal]").value)),per=$(el,"[name=per]").value,mult={week:52,month:12,year:1}[per]||12,annual=g*mult;
    var e=etf($(el,"[name=t]").value);saveURL(vals(el,["goal","per","t"]));
    out(el,"goalTxt",usd(g,0)+" a "+per);
    if(e&&yld(e)){var need=annual/(e.yield/100);out(el,"need",usd(need,0));out(el,"needName",link(e)+" at a "+F.pct(e.yield)+" yield"+warnDecay(e));out(el,"annual",usd(annual,0));out(el,"fee",usd(need*(e.er||0)/100,0));}
    else{out(el,"need","n/a");out(el,"needName","Pick an income ETF from the list.");}
    var list=POP.concat(e?[e.sym]:[]).filter(function(s,i,arr){return arr.indexOf(s)===i;}).map(etf).filter(function(x){return x&&yld(x);}).sort(function(x,y){return y.yield-x.yield;});
    T.charts.bar(chart,list.map(function(x){var v=annual/(x.yield/100);return {label:x.sym,sub:x.name,value:v,color:e&&x.sym===e.sym?css("--series-2"):null,href:"/dividend-income-goal-calculator?goal="+g+"&per="+per+"&t="+x.sym,tip:[["Yield",F.pct(x.yield)],["You would need",usd(v,0)],["Total return",F.signed(x.tr)],["Price decay",x.decay?"Yes":"No"]]};}),{fmt:F.compact,valW:84,aria:"Investment needed in each ETF to hit the income goal"});
    tb.innerHTML=list.map(function(x){var v=annual/(x.yield/100);return '<tr><td class="l">'+link(x)+'<span class="fund-name">'+esc(x.name)+'</span></td><td>'+F.pct(x.yield)+'</td><td><b>'+usd(v,0)+'</b></td><td>'+esc(freqOf(x)||"n/a")+'</td><td class="'+(x.tr==null?"":x.tr>=0?"pos":"neg")+'">'+F.signed(x.tr)+'</td><td>'+(x.decay?'<span class="tl-flag bad">Yes</span>':'<span class="tl-flag good">No</span>')+'</td></tr>';}).join("");
  }
  bindTicker($(el,"[name=t]"),calc);el.addEventListener("input",calc);el.addEventListener("change",calc);calc();onResize(calc);
};

/* 3. DRIP calculator */
TOOLS.drip=function(el){
  var p=params();fill(el,p,{t:"SCHD",start:"10000",monthly:"500",yield:"",dg:"6",pg:"5",years:"20",tax:"0"});
  var chart=$(el,".chart"),tb=$(el,"tbody"),yi=$(el,"[name=yield]");
  function pick(e){if(e&&yld(e)!=null){yi.value=(+e.yield).toFixed(2);calc();}}
  if(!yi.value){var e0=etf($(el,"[name=t]").value);yi.value=e0&&yld(e0)!=null?(+e0.yield).toFixed(2):"3.5";}
  function calc(){
    var P=Math.max(0,num($(el,"[name=start]").value)),C=Math.max(0,num($(el,"[name=monthly]").value)),y=num(yi.value)/100,dg=num($(el,"[name=dg]").value)/100,pg=num($(el,"[name=pg]").value)/100,yrs=Math.min(50,Math.max(1,Math.round(num($(el,"[name=years]").value)))),tax=Math.min(60,Math.max(0,num($(el,"[name=tax]").value)))/100;
    saveURL(vals(el,["t","start","monthly","yield","dg","pg","years","tax"]));
    var drip=P,cash=P,cashPaid=0,xs=[0],A=[P],B=[P],rows=[],contrib=P,divTotal=0;
    for(var yr=1;yr<=yrs;yr++){
      var yNow=y*Math.pow((1+dg)/(1+pg),yr-1),yDiv=0;
      for(var m=0;m<12;m++){
        var dv=drip*yNow/12*(1-tax);yDiv+=dv;divTotal+=dv;drip=drip*(1+pg/12)+dv+C;
        cashPaid+=cash*yNow/12*(1-tax);cash=cash*(1+pg/12)+C;contrib+=C;
      }
      xs.push(yr);A.push(drip);B.push(cash);
      rows.push([yr,contrib,drip,drip*y*Math.pow((1+dg)/(1+pg),yr)*(1-tax),yDiv,cash+cashPaid]);
    }
    var endInc=drip*y*Math.pow((1+dg)/(1+pg),yrs)*(1-tax);
    var s=[{name:"Dividends reinvested (DRIP)",color:css("--series-1"),values:A},{name:"Dividends taken as cash",color:css("--series-2"),values:B}];
    T.charts.line(chart,xs,s,{xFmt:function(v){return "Yr "+v;},aria:"Portfolio value with and without dividend reinvestment"});legend($(el,".legend"),s);
    out(el,"end",F.compact(drip));out(el,"income",usd(endInc,0));out(el,"monthlyInc",usd(endInc/12,0));out(el,"contrib",F.compact(contrib));out(el,"divs",F.compact(divTotal));out(el,"gap",F.compact(drip-(cash+cashPaid)));
    tb.innerHTML=rows.filter(function(r){return r[0]<=5||r[0]%5===0||r[0]===yrs;}).map(function(r){return '<tr><td class="l">Year '+r[0]+'</td><td>'+usd(r[1],0)+'</td><td><b>'+usd(r[2],0)+'</b></td><td>'+usd(r[3],0)+'</td><td>'+usd(r[3]/12,0)+'</td><td>'+usd(r[5],0)+'</td></tr>';}).join("");
  }
  bindTicker($(el,"[name=t]"),pick);el.addEventListener("input",function(ev){if(ev.target.name!=="t")calc();});calc();onResize(calc);
};

/* 4. ETF comparison (each comparison is its own page load) */
TOOLS.compare=function(el){
  var p=params(),syms=(p.t||"SCHD,JEPI,VYM").toUpperCase().split(/[,\s]+/).filter(Boolean).slice(0,4);
  $$(el,"[data-slot]").forEach(function(inp,i){inp.value=syms[i]||"";inp.setAttribute("list","etf-list");inp.setAttribute("autocomplete","off");});
  var form=$(el,"form");
  form.addEventListener("submit",function(ev){ev.preventDefault();var s=$$(el,"[data-slot]").map(function(i){return i.value.toUpperCase().replace(/[^A-Z.]/g,"");}).filter(Boolean);
    if(typeof gtag==="function"){try{gtag("event","tool_compare",{tickers:s.join(",")});}catch(_){}}
    location.href=location.pathname+(s.length?"?t="+s.join(","):"");});
  var list=syms.map(etf).filter(Boolean),missing=syms.filter(function(s){return !etf(s);});
  if(missing.length)out(el,"missing","Not in our database: "+esc(missing.join(", "))+". Check the ticker or try another fund.");
  if(!list.length){$(el,".cmp-out").innerHTML='<p class="muted">Enter at least one ticker above.</p>';return;}
  document.title=list.map(function(e){return e.sym;}).join(" vs ")+": ETF Comparison | TopETFs";
  var h1=$(document,"h1");if(h1&&list.length>1)h1.textContent=list.map(function(e){return e.sym;}).join(" vs. ")+" ETF Comparison";
  function best(vals,hi){var v=vals.filter(function(x){return x!=null;});if(v.length<2)return null;return hi?Math.max.apply(null,v):Math.min.apply(null,v);}
  var R=[
    ["Fund name",function(e){return esc(e.name);}],
    ["Provider",function(e){return esc(e.provider||"n/a");}],
    ["Dividend yield",function(e){return F.pct(yld(e));},function(e){return yld(e);},1],
    ["$10,000 pays per year",function(e){return yld(e)!=null?usd(yld(e)*100,0):"n/a";},function(e){return yld(e);},1],
    ["$10,000 pays per month",function(e){return yld(e)!=null?usd(yld(e)*100/12):"n/a";},function(e){return yld(e);},1],
    ["Payout frequency",function(e){return esc(freqOf(e)||"n/a");}],
    ["Expense ratio",function(e){return F.pct2(e.er);},function(e){return e.er;},0],
    ["Yearly fee on $10,000",function(e){return e.er!=null?usd(e.er*100,0):"n/a";},function(e){return e.er;},0],
    ["Assets (AUM)",function(e){return F.aum(e.aum);},function(e){return e.aum;},1],
    ["Total return since inception",function(e){return F.signed(e.tr);},null],
    ["Annualized return",function(e){return F.signed(annualized(e));},function(e){return annualized(e);},1],
    ["Inception date",function(e){var d=pDate(e.inception);return d?d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"n/a";}],
    ["Price decay",function(e){return e.decay==null?"n/a":e.decay?'<span class="tl-flag bad">Yes</span>':'<span class="tl-flag good">No</span>';}]
  ];
  var html='<div class="tbl-scroll"><table class="data cmp-table"><thead><tr><th class="l">Metric</th>'+list.map(function(e){return '<th><a href="'+epath(e.sym)+'">'+e.sym+'</a></th>';}).join("")+'</tr></thead><tbody>'+
    R.map(function(r){var b=r[2]?best(list.map(r[2]),r[3]):null;return '<tr><td class="l">'+r[0]+'</td>'+list.map(function(e){var v=r[2]?r[2](e):null,win=b!=null&&v===b;return '<td'+(win?' class="win"':'')+'>'+r[1](e)+'</td>';}).join("")+'</tr>';}).join("")+'</tbody></table></div><p class="figure-note">Green marks the best value in each row among the funds compared. Total return is since each fund\'s own inception, so use annualized return to compare funds of different ages.</p>';
  $(el,".cmp-out").innerHTML=html;
  var c1=$(el,".chart-y"),c2=$(el,".chart-r");
  function draw(){
    T.charts.bar(c1,list.filter(function(e){return yld(e)!=null;}).map(function(e){return {label:e.sym,sub:e.name,value:yld(e)*100,href:epath(e.sym),tip:[["Yield",F.pct(yld(e))],["$10K pays / yr",usd(yld(e)*100,0)]]};}),{fmt:function(v){return usd(v,0);},valW:80,aria:"Yearly income on $10,000"});
    T.charts.bar(c2,list.filter(function(e){return annualized(e)!=null;}).map(function(e){return {label:e.sym,sub:e.name,value:annualized(e),href:epath(e.sym),tip:[["Annualized return",F.signed(annualized(e))],["Total return",F.signed(e.tr)]]};}),{fmt:F.signed,valW:70,aria:"Annualized total return since inception"});
  }
  draw();onResize(draw);
};

/* 5. Expense ratio calculator */
TOOLS.fees=function(el){
  var p=params();fill(el,p,{a:"VOO",b:"QYLD",era:"",erb:"",start:"50000",monthly:"500",ret:"8",years:"25"});
  var chart=$(el,".chart"),ea=$(el,"[name=era]"),eb=$(el,"[name=erb]");
  function set(inp,e){if(e&&e.er!=null){inp.value=(+e.er).toFixed(2);calc();}}
  if(!ea.value){var a0=etf($(el,"[name=a]").value);ea.value=a0&&a0.er!=null?(+a0.er).toFixed(2):"0.03";}
  if(!eb.value){var b0=etf($(el,"[name=b]").value);eb.value=b0&&b0.er!=null?(+b0.er).toFixed(2):"0.60";}
  function calc(){
    var P=Math.max(0,num($(el,"[name=start]").value)),C=Math.max(0,num($(el,"[name=monthly]").value)),r=num($(el,"[name=ret]").value)/100,yrs=Math.min(50,Math.max(1,Math.round(num($(el,"[name=years]").value))));
    var e1=Math.max(0,num(ea.value))/100,e2=Math.max(0,num(eb.value))/100;
    saveURL(vals(el,["a","b","era","erb","start","monthly","ret","years"]));
    var la=$(el,"[name=a]").value||"Fund A",lb=$(el,"[name=b]").value||"Fund B";
    var a=P,b=P,fa=0,fb=0,xs=[0],A=[P],B=[P];
    for(var y=1;y<=yrs;y++){for(var m=0;m<12;m++){a=a*(1+r/12);b=b*(1+r/12);var x=a*e1/12,z=b*e2/12;fa+=x;fb+=z;a=a-x+C;b=b-z+C;}xs.push(y);A.push(a);B.push(b);}
    var s=[{name:la+" ("+(e1*100).toFixed(2)+"%)",color:css("--series-1"),values:A},{name:lb+" ("+(e2*100).toFixed(2)+"%)",color:css("--series-2"),values:B}];
    T.charts.line(chart,xs,s,{xFmt:function(v){return "Yr "+v;},aria:"Growth of the same investment at two expense ratios"});legend($(el,".legend"),s);
    out(el,"la",esc(la));out(el,"lb",esc(lb));out(el,"a",F.compact(a));out(el,"b",F.compact(b));out(el,"fa",usd(fa,0));out(el,"fb",usd(fb,0));
    out(el,"gap",F.compact(Math.abs(a-b)));out(el,"yr1a",usd(P*e1,0));out(el,"yr1b",usd(P*e2,0));
    out(el,"cheaper",esc(a>=b?la:lb));
  }
  bindTicker($(el,"[name=a]"),function(e){set(ea,e);});bindTicker($(el,"[name=b]"),function(e){set(eb,e);});
  el.addEventListener("input",function(ev){if(ev.target.name!=="a"&&ev.target.name!=="b")calc();});calc();onResize(calc);
};

/* 6. Dividend portfolio income calculator */
TOOLS.portfolio=function(el){
  var p=params(),rowsEl=$(el,".pf-rows"),chart=$(el,".chart"),tb=$(el,"tbody");
  var init=(p.p||"SCHD:25000,JEPI:15000,JEPQ:10000,SPYI:10000").split(",").map(function(x){var kv=x.split(":");return [kv[0],kv[1]||""];}).slice(0,15);
  function addRow(t,a){if($$(rowsEl,".pf-row").length>=15)return;var d=document.createElement("div");d.className="pf-row";
    d.innerHTML='<div class="field"><label>ETF</label><input name="pt" placeholder="Ticker" value="'+esc(t||"")+'"></div><div class="field"><label>Amount invested ($)</label><input name="pa" inputmode="decimal" placeholder="10000" value="'+esc(a||"")+'"></div><button type="button" class="pf-del" aria-label="Remove">&times;</button>';
    rowsEl.appendChild(d);var ti=$(d,"[name=pt]");bindTicker(ti,calc);}
  init.forEach(function(r){addRow(r[0],r[1]);});
  $(el,".pf-add").addEventListener("click",function(){addRow("","");calc();});
  rowsEl.addEventListener("click",function(ev){if(ev.target.classList.contains("pf-del")){ev.target.parentNode.remove();calc();}});
  function payMonths(e){var f=freqOf(e);if(f==="Weekly"||f==="Monthly")return [0,1,2,3,4,5,6,7,8,9,10,11];if(f==="Semi-Annual")return [5,11];if(f==="Annual")return [11];return [2,5,8,11];}
  function calc(){
    var rows=$$(rowsEl,".pf-row").map(function(r){return {t:$(r,"[name=pt]").value.toUpperCase().trim(),a:Math.max(0,num($(r,"[name=pa]").value))};});
    try{history.replaceState(null,"",location.pathname+"?p="+rows.filter(function(r){return r.t;}).map(function(r){return r.t+":"+r.a;}).join(","));}catch(e){}
    var hold=rows.map(function(r){return {e:etf(r.t),t:r.t,a:r.a};}).filter(function(h){return h.e&&h.a>0;});
    var tot=0,inc=0,fee=0,mon=[0,0,0,0,0,0,0,0,0,0,0,0];
    hold.forEach(function(h){var y=yld(h.e)||0;h.inc=h.a*y/100;tot+=h.a;inc+=h.inc;fee+=h.a*(h.e.er||0)/100;var ms=payMonths(h.e);ms.forEach(function(m){mon[m]+=h.inc/ms.length;});});
    out(el,"tot",usd(tot,0));out(el,"inc",usd(inc,0));out(el,"mo",usd(inc/12,0));out(el,"wk",usd(inc/52,0));
    out(el,"yld",tot?F.pct(inc/tot*100,2):"n/a");out(el,"er",tot?F.pct(fee/tot*100,2):"n/a");out(el,"fee",usd(fee,0));
    out(el,"low",usd(Math.min.apply(null,mon),0));out(el,"high",usd(Math.max.apply(null,mon),0));
    T.charts.bar(chart,mon.map(function(v,i){return {label:MONTHS[i],value:v,tip:[["Estimated income",usd(v,0)]]};}),{fmt:function(v){return usd(v,0);},valW:80,rowH:26,aria:"Estimated dividend income by month"});
    tb.innerHTML=hold.sort(function(x,y){return y.inc-x.inc;}).map(function(h){return '<tr><td class="l">'+link(h.e)+'<span class="fund-name">'+esc(h.e.name)+'</span></td><td>'+usd(h.a,0)+'</td><td>'+F.pct(yld(h.e))+'</td><td>'+esc(freqOf(h.e)||"n/a")+'</td><td><b>'+usd(h.inc,0)+'</b></td><td>'+usd(h.inc/12,0)+'</td><td>'+(inc?F.pct(h.inc/inc*100):"n/a")+'</td><td>'+(h.e.decay?'<span class="tl-flag bad">Yes</span>':'<span class="tl-flag good">No</span>')+'</td></tr>';}).join("")||'<tr><td class="l" colspan="8">Add a ticker and an amount to see your income.</td></tr>';
    var bad=rows.filter(function(r){return r.t&&!etf(r.t);}).map(function(r){return r.t;});
    out(el,"missing",bad.length?"Not in our database: "+esc(bad.join(", ")):"");
  }
  el.addEventListener("input",function(ev){if(ev.target.name==="pa")calc();});calc();onResize(calc);
};

function init(){
  var els=document.querySelectorAll("[data-tool]");if(!els.length||!window.TopETFs)return;
  T=window.TopETFs;F=T.F;
  T.ready().then(function(d){D=d;if(!d||!d.all||!Object.keys(d.all).length)return;datalist();
    Array.prototype.forEach.call(els,function(el){var k=el.getAttribute("data-tool");if(TOOLS[k]){try{TOOLS[k](el);}catch(e){if(window.console)console.warn("tool",k,e);}}el.classList.add("ready");});
  });
}
if(document.readyState==="complete")init();else document.addEventListener("DOMContentLoaded",init);
})();
