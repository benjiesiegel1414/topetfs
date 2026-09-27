/* TopETFs.com front end
   Loads the network's live ETF data (Google Sheets CSV, with a daily
   repo snapshot as fallback), fills live numbers, draws charts and runs
   the interactive widgets. No dependencies. */
(function(){
"use strict";

var SOURCES = {
  pro:    { live:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTxCiod-Cwry7E6k9Un9dgrM_ANymC36_IO_wLyNj-YDo2KI7mp_1ZzyNBnBGZOxT48QPM8TCwtsmA4/pub?gid=0&single=true&output=csv", local:"/data/pro.csv" },
  weekly: { live:"https://docs.google.com/spreadsheets/d/e/2PACX-1vT1P00pQ6hNvYolxzrKYIuxC-AH1xFBpMtsn-NwC17W4vQazk3ql69ZmSmW8J-jp7OaUmKLV5v2KPI3/pub?gid=0&single=true&output=csv", local:"/data/weekly.csv" },
  growth: { live:"https://docs.google.com/spreadsheets/d/e/2PACX-1vQgB3eBiOxZ6CoBjVvi9Rm3PmJDssWCsHWuVG4YgCPnXLG02u0tQxoR055J-e21MYbXJES1UpPTy7h9/pub?gid=0&single=true&output=csv", local:"/data/growth.csv" }
};

/* Closed-end funds that appear in the PRO sheet but are not ETFs */
var NOT_ETF=["PDI","PTY"];

/* ---------------- CSV + parsing ---------------- */
function parseCSV(text){
  var rows=[],row=[],f="",q=false,i,c;
  for(i=0;i<text.length;i++){
    c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else if(c==='"') q=true;
    else if(c===','){ row.push(f); f=""; }
    else if(c==='\n'){ row.push(f); rows.push(row); row=[]; f=""; }
    else if(c!=='\r') f+=c;
  }
  if(f!==""||row.length){ row.push(f); rows.push(row); }
  return rows;
}
function pct(v){ if(v==null) return null; v=String(v).replace(/[%,\s]/g,""); if(v===""||isNaN(+v)) return null; return +v; }
function money(v){
  if(v==null) return null; v=String(v).replace(/[$,\s]/g,"").toUpperCase(); if(!v) return null;
  var m=v.match(/^(-?[\d.]+)([KMBT]?)$/); if(!m) return null;
  var mult={"":1,K:1e3,M:1e6,B:1e9,T:1e12}[m[2]]; return +m[1]*mult;
}
function clean(s){ return String(s||"").replace(/\s+/g," ").trim(); }
function normalize(key,rows){
  var head=rows[0].map(function(h){return clean(h).toLowerCase();});
  function col(){ for(var a=0;a<arguments.length;a++){ var i=head.indexOf(arguments[a]); if(i>-1) return i; } return -1; }
  var iS=col("symbol"), iN=col("name","etf name"), iP=col("fund provider","provider"), iY=col("dividend yield","yield"),
      iE=col("expense ratio"), iA=col("aum"), iT=col("total return","total returns"), iD=col("price decay"),
      iI=col("inception date"), iF=col("payout frequency","frequency");
  var out=[];
  rows.slice(1).forEach(function(r){
    var sym=clean(r[iS]).toUpperCase(); if(!sym||!/^[A-Z.]{1,6}$/.test(sym)||NOT_ETF.indexOf(sym)>-1) return;
    out.push({
      sym:sym, name:clean(r[iN]), provider:iP>-1?clean(r[iP]):"",
      yield:iY>-1?pct(r[iY]):null, er:iE>-1?pct(r[iE]):null, aum:iA>-1?money(r[iA]):null,
      tr:iT>-1?pct(r[iT]):null, decay:iD>-1?(clean(r[iD]).toUpperCase()==="YES"):null,
      inception:iI>-1?clean(r[iI]):"", freq:iF>-1?clean(r[iF]):(key==="weekly"?"Weekly":""), src:key
    });
  });
  return out;
}
function fetchText(url,ms){
  return new Promise(function(res,rej){
    var done=false, t=setTimeout(function(){ if(!done){done=true;rej(new Error("timeout"));} },ms);
    fetch(url,{cache:"no-store"}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.text(); })
      .then(function(x){ if(done) return; done=true; clearTimeout(t); if(x.indexOf("<html")>-1) rej(new Error("html")); else res(x); })
      .catch(function(e){ if(done) return; done=true; clearTimeout(t); rej(e); });
  });
}
function cacheGet(k){ try{ var v=sessionStorage.getItem("te:"+k); if(!v) return null; v=JSON.parse(v); if(Date.now()-v.t>30*60e3) return null; return v.d; }catch(e){ return null; } }
function cacheSet(k,d){ try{ sessionStorage.setItem("te:"+k,JSON.stringify({t:Date.now(),d:d})); }catch(e){} }

function loadSource(key){
  var c=cacheGet(key); if(c) return Promise.resolve(c);
  var s=SOURCES[key];
  return fetchText(s.live,6000).catch(function(){ return fetchText(s.local,6000); })
    .then(function(txt){ var d=normalize(key,parseCSV(txt)); if(d.length) cacheSet(key,d); return d; })
    .catch(function(){ return []; });
}

var DATA=null, readyP=null;
function ready(){
  if(readyP) return readyP;
  readyP=Promise.all([loadSource("pro"),loadSource("weekly"),loadSource("growth")]).then(function(r){
    var all={};
    function merge(list){ list.forEach(function(e){ var cur=all[e.sym]; if(!cur){ all[e.sym]=Object.assign({lists:[e.src]},e); return; }
      if(cur.lists.indexOf(e.src)<0) cur.lists.push(e.src);
      ["name","provider","yield","er","aum","tr","decay","inception","freq"].forEach(function(k){ if((cur[k]==null||cur[k]==="")&&e[k]!=null&&e[k]!=="") cur[k]=e[k]; });
    }); }
    merge(r[0]); merge(r[1]); merge(r[2]);
    DATA={pro:r[0],weekly:r[1],growth:r[2],all:all};
    return DATA;
  });
  return readyP;
}

/* ---------------- formatting ---------------- */
var F={
  pct:function(v,d){ if(v==null||isNaN(v)) return "n/a"; d=d==null?(Math.abs(v)>=100?0:1):d; return v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})+"%"; },
  pct2:function(v){ return F.pct(v,2); },
  signed:function(v){ if(v==null) return "n/a"; return (v>0?"+":"")+F.pct(v,Math.abs(v)>=10?0:1); },
  usd:function(v,d){ if(v==null||isNaN(v)) return "n/a"; return "$"+v.toLocaleString("en-US",{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); },
  usd2:function(v){ return F.usd(v,2); },
  aum:function(v){ if(v==null) return "n/a"; if(v>=1e12) return "$"+(v/1e12).toFixed(2)+"T"; if(v>=1e9) return "$"+(v/1e9).toFixed(v>=1e11?0:1)+"B"; if(v>=1e6) return "$"+(v/1e6).toFixed(v>=1e8?0:1)+"M"; return "$"+Math.round(v/1e3)+"K"; },
  compact:function(v){ if(Math.abs(v)>=1e6) return "$"+(v/1e6).toFixed(2)+"M"; if(Math.abs(v)>=1e4) return "$"+(v/1e3).toFixed(0)+"K"; return F.usd(v); },
  text:function(v){ return v==null?"n/a":String(v); },
  decay:function(v){ return v==null?"n/a":(v?"Yes":"No"); }
};
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function etfUrl(sym){ return "/etf?t="+encodeURIComponent(sym); }
function median(a){ a=a.filter(function(x){return x!=null&&!isNaN(x);}).sort(function(x,y){return x-y;}); if(!a.length) return null; var m=a.length>>1; return a.length%2?a[m]:(a[m-1]+a[m])/2; }

/* ---------------- live fields ----------------
   <span data-live="JEPI:yield" data-fmt="pct">7.5%</span>
   Pre-rendered snapshot value stays if data can't load. */
function fillLive(d){
  document.querySelectorAll("[data-live]").forEach(function(el){
    var p=el.getAttribute("data-live").split(":"), sym=p[0], field=p[1], e=d.all[sym];
    if(!e||e[field]==null) return;
    var fmt=F[el.getAttribute("data-fmt")||"pct"]||F.pct, v=e[field];
    var mul=el.getAttribute("data-mul"); if(mul) v=v*(+mul);
    el.textContent=fmt(v);
  });
}

/* ---------------- tooltip ---------------- */
var tipEl=null;
function tip(html,ev){
  if(!tipEl){ tipEl=document.createElement("div"); tipEl.className="tip"; tipEl.setAttribute("role","status"); document.body.appendChild(tipEl); }
  if(html==null){ tipEl.classList.remove("on"); return; }
  tipEl.innerHTML=html; tipEl.classList.add("on");
  var x=ev.clientX, y=ev.clientY, w=tipEl.offsetWidth, h=tipEl.offsetHeight;
  var left=x+14, top=y-h-12; if(left+w>window.innerWidth-8) left=x-w-14; if(top<8) top=y+16;
  tipEl.style.left=left+"px"; tipEl.style.top=top+"px";
}
function tipRows(title,rows){ return "<b>"+esc(title)+"</b>"+rows.map(function(r){return '<div class="row"><span>'+esc(r[0])+'</span><span>'+esc(r[1])+'</span></div>';}).join(""); }

/* ---------------- charts (SVG) ---------------- */
var NS="http://www.w3.org/2000/svg";
function S(tag,attrs,parent){ var e=document.createElementNS(NS,tag); for(var k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e; }
function css(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function niceTicks(min,max,n){
  var span=max-min||1, step=Math.pow(10,Math.floor(Math.log10(span/n))), err=span/n/step;
  if(err>=7.5) step*=10; else if(err>=3.5) step*=5; else if(err>=1.5) step*=2;
  var t=[], v=Math.floor(min/step)*step; do{ t.push(+v.toFixed(10)); v+=step; }while(t[t.length-1]<max-step*1e-6); if(t.length<2) t.push(+v.toFixed(10)); return t;
}

/* Horizontal bar chart. rows:[{label,sub,value,href,tip:[[k,v]]}] */
function barChart(el,rows,o){
  o=o||{}; el.innerHTML=""; if(!rows.length){ el.innerHTML='<p class="muted">No data available.</p>'; return; }
  var W=el.clientWidth||640, rowH=o.rowH||30, labelW=o.labelW||(W<480?64:78), valW=o.valW||(W<480?66:84);
  var H=rows.length*rowH+8, plotW=Math.max(60,W-labelW-valW-8);
  var max=o.max||Math.max.apply(null,rows.map(function(r){return Math.max(0,r.value);})), min=Math.min(0,Math.min.apply(null,rows.map(function(r){return r.value;})));
  var span=max-min||1, x0=labelW+(-min/span)*plotW;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,width:W,height:H,role:"img","aria-label":o.aria||"Bar chart"},el);
  rows.forEach(function(r,i){
    var y=i*rowH+4, bh=Math.min(16,rowH-12), by=y+(rowH-bh)/2-2;
    var w=Math.abs(r.value)/span*plotW, x=r.value>=0?x0:x0-w;
    var g=S("g",{},svg);
    S("rect",{x:0,y:y-2,width:W,height:rowH,fill:"transparent"},g);
    var t=S("text",{x:0,y:by+bh/2+4,class:"lbl"},g); t.textContent=r.label;
    var color=r.value<0?css("--neg"):(r.color||css(o.color||"--series-1"));
    var rw=Math.max(2,w);
    var path;
    if(r.value>=0) path="M"+x+","+by+"h"+(rw-4)+"q4,0 4,4v"+(bh-8)+"q0,4 -4,4h-"+(rw-4)+"z";
    else path="M"+(x+rw)+","+by+"h-"+(rw-4)+"q-4,0 -4,4v"+(bh-8)+"q0,4 4,4h"+(rw-4)+"z";
    if(rw<8) path="M"+x+","+by+"h"+rw+"v"+bh+"h-"+rw+"z";
    S("path",{d:path,fill:color},g);
    var vt=S("text",{x:W,y:by+bh/2+4,"text-anchor":"end",class:"val"},g); vt.textContent=(o.fmt||F.pct)(r.value);
    g.style.cursor=r.href?"pointer":"default";
    g.addEventListener("mousemove",function(ev){ tip(tipRows(r.label+(r.sub?" · "+r.sub:""),r.tip||[[o.valueName||"Value",(o.fmt||F.pct)(r.value)]]),ev); });
    g.addEventListener("mouseleave",function(){ tip(null); });
    if(r.href) g.addEventListener("click",function(){ location.href=r.href; });
  });
  S("line",{x1:x0,x2:x0,y1:0,y2:H,class:"axis"},svg);
}

/* Scatter. points:[{x,y,label,group}] groups:[{key,name,color}] */
function axisPct(v){ return F.pct(v,Math.abs(v)%1?1:0); }
function scatter(el,points,o){
  o=o||{}; el.innerHTML="";
  var W=el.clientWidth||640, H=o.height||(W<520?300:380), m={l:48,r:16,t:30,b:40};
  var xs=points.map(function(p){return p.x;}), ys=points.map(function(p){return p.y;});
  var xT=niceTicks(o.xMin!=null?o.xMin:Math.min(0,Math.min.apply(null,xs)),Math.max.apply(null,xs),6);
  var yT=niceTicks(Math.min(0,Math.min.apply(null,ys)),Math.max.apply(null,ys),6);
  var xmin=xT[0],xmax=xT[xT.length-1],ymin=yT[0],ymax=yT[yT.length-1];
  function X(v){ return m.l+(v-xmin)/(xmax-xmin)*(W-m.l-m.r); } function Y(v){ return H-m.b-(v-ymin)/(ymax-ymin)*(H-m.t-m.b); }
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,width:W,height:H,role:"img","aria-label":o.aria||"Scatter chart"},el);
  yT.forEach(function(t){ S("line",{x1:m.l,x2:W-m.r,y1:Y(t),y2:Y(t),class:t===0?"axis":"gridline"},svg); var tx=S("text",{x:m.l-8,y:Y(t)+4,"text-anchor":"end"},svg); tx.textContent=(o.yFmt||axisPct)(t); });
  xT.forEach(function(t){ var tx=S("text",{x:X(t),y:H-m.b+18,"text-anchor":"middle"},svg); tx.textContent=(o.xFmt||axisPct)(t); });
  var xl=S("text",{x:(m.l+W-m.r)/2,y:H-4,"text-anchor":"middle"},svg); xl.textContent=o.xLabel||"";
  var yl=S("text",{x:0,y:12,"text-anchor":"start"},svg); yl.textContent=o.yLabel||""; yl.setAttribute("transform","translate(0,0)");
  var gmap={}; (o.groups||[]).forEach(function(g){gmap[g.key]=g;});
  var surface=css("--paper");
  points.forEach(function(p){
    var g=gmap[p.group]||{color:css("--series-1")};
    var c=S("circle",{cx:X(p.x),cy:Y(p.y),r:5.5,fill:g.color,stroke:surface,"stroke-width":2,"fill-opacity":.9},svg);
    var hit=S("circle",{cx:X(p.x),cy:Y(p.y),r:11,fill:"transparent"},svg);
    hit.style.cursor="pointer";
    hit.addEventListener("mousemove",function(ev){ c.setAttribute("r",7.5); tip(tipRows(p.label,p.tip||[]),ev); });
    hit.addEventListener("mouseleave",function(){ c.setAttribute("r",5.5); tip(null); });
    hit.addEventListener("click",function(){ location.href=etfUrl(p.label); });
    if(p.showLabel){ var tl=S("text",{x:X(p.x)+8,y:Y(p.y)-7,class:"lbl"},svg); tl.textContent=p.label; }
  });
}

/* Line chart with crosshair. series:[{name,color,values:[y...]}], xs:[...] */
function lineChart(el,xs,series,o){
  o=o||{}; el.innerHTML="";
  var W=el.clientWidth||640, H=o.height||(W<520?260:320), m={l:62,r:16,t:14,b:34};
  var all=[]; series.forEach(function(s){ all=all.concat(s.values); });
  var yT=niceTicks(Math.min(o.yMin!=null?o.yMin:0,Math.min.apply(null,all)),Math.max.apply(null,all),5);
  var ymin=yT[0],ymax=yT[yT.length-1],xmin=xs[0],xmax=xs[xs.length-1];
  function X(v){ return m.l+(v-xmin)/((xmax-xmin)||1)*(W-m.l-m.r); } function Y(v){ return H-m.b-(v-ymin)/((ymax-ymin)||1)*(H-m.t-m.b); }
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,width:W,height:H,role:"img","aria-label":o.aria||"Line chart"},el);
  yT.forEach(function(t){ S("line",{x1:m.l,x2:W-m.r,y1:Y(t),y2:Y(t),class:t===ymin?"axis":"gridline"},svg); var tx=S("text",{x:m.l-8,y:Y(t)+4,"text-anchor":"end"},svg); tx.textContent=(o.yFmt||F.compact)(t); });
  var every=Math.ceil(xs.length/8);
  xs.forEach(function(x,i){ if(i%every&&i!==xs.length-1) return; var tx=S("text",{x:X(x),y:H-m.b+18,"text-anchor":"middle"},svg); tx.textContent=(o.xFmt||String)(x); });
  series.forEach(function(s){
    var d=s.values.map(function(v,i){return (i?"L":"M")+X(xs[i]).toFixed(1)+","+Y(v).toFixed(1);}).join("");
    S("path",{d:d,fill:"none",stroke:s.color,"stroke-width":2.25,"stroke-linejoin":"round","stroke-linecap":"round"},svg);
    var last=s.values.length-1;
    S("circle",{cx:X(xs[last]),cy:Y(s.values[last]),r:4,fill:s.color,stroke:css("--paper"),"stroke-width":2},svg);
  });
  var cross=S("line",{x1:0,x2:0,y1:m.t,y2:H-m.b,stroke:css("--rule-strong"),"stroke-width":1,opacity:0},svg);
  var dots=series.map(function(s){ return S("circle",{r:4.5,fill:s.color,stroke:css("--paper"),"stroke-width":2,opacity:0},svg); });
  var hit=S("rect",{x:m.l,y:m.t,width:W-m.l-m.r,height:H-m.t-m.b,fill:"transparent"},svg);
  hit.addEventListener("mousemove",function(ev){
    var r=svg.getBoundingClientRect(), px=(ev.clientX-r.left)*(W/r.width);
    var i=Math.round((px-m.l)/(W-m.l-m.r)*(xs.length-1)); i=Math.max(0,Math.min(xs.length-1,i));
    cross.setAttribute("x1",X(xs[i])); cross.setAttribute("x2",X(xs[i])); cross.setAttribute("opacity",1);
    dots.forEach(function(dt,k){ dt.setAttribute("cx",X(xs[i])); dt.setAttribute("cy",Y(series[k].values[i])); dt.setAttribute("opacity",1); });
    tip(tipRows((o.xName||"")+" "+(o.xFmt||String)(xs[i]),series.map(function(s){return [s.name,(o.tipFmt||o.yFmt||F.compact)(s.values[i])];})),ev);
  });
  hit.addEventListener("mouseleave",function(){ cross.setAttribute("opacity",0); dots.forEach(function(d){d.setAttribute("opacity",0);}); tip(null); });
}
function legend(el,series){
  el.innerHTML=series.map(function(s){ return '<span><i style="background:'+s.color+'"></i>'+esc(s.name)+'</span>'; }).join("");
}

/* ---------------- widgets ---------------- */
var W={};

/* Ticker tape */
W.tape=function(el,d){
  var syms=(el.getAttribute("data-syms")||"").split(",");
  var items=syms.map(function(s){ var e=d.all[s.trim()]; if(!e) return "";
    var hasY=e.yield!=null&&e.lists.indexOf("growth")<0;
    var v=hasY?F.pct(e.yield)+' <span class="k">yield</span>':(e.tr!=null?'<span class="'+(e.tr>=0?"pos":"neg")+'">'+F.signed(e.tr)+'</span> <span class="k">since incep.</span>':"");
    return '<a class="tape-item" href="'+etfUrl(e.sym)+'"><b>'+esc(e.sym)+'</b>'+v+'</a>'; }).join("");
  if(!items) return;
  el.querySelector(".tape-track").innerHTML=items+items;
};

/* Stat tiles on the home page */
W.stats=function(el,d){
  var n=Object.keys(d.all).length;
  var wk=d.weekly.filter(function(e){return e.yield!=null;}).sort(function(a,b){return b.yield-a.yield;})[0];
  var gr=d.growth.filter(function(e){return e.tr!=null&&e.aum>=1e9&&!/ultra|2x|3x/i.test(e.name);}).sort(function(a,b){return b.tr-a.tr;})[0];
  var er=median(d.pro.map(function(e){return e.er;}));
  var core=d.all["SCHD"];
  function set(k,v,sub){ var t=el.querySelector('[data-stat="'+k+'"]'); if(!t) return; t.querySelector(".value").textContent=v; if(sub!=null) t.querySelector(".sub").innerHTML=sub; }
  set("count",n.toLocaleString(),"across income, weekly-pay and growth lists");
  if(wk) set("weekly",F.pct(wk.yield),'Top weekly payer: <a href="'+etfUrl(wk.sym)+'">'+esc(wk.sym)+'</a>');
  if(gr) set("growth",F.signed(gr.tr),'Since inception: <a href="'+etfUrl(gr.sym)+'">'+esc(gr.sym)+'</a> (funds over $1B)');
  if(er!=null) set("er",F.pct(er,2),"Median fee across the income list");
};

/* Leaderboard table */
W.board=function(el,d){
  var src=el.getAttribute("data-src")||"pro", list=(d[src]||[]).slice();
  var syms=el.getAttribute("data-syms"); if(syms){ syms=syms.split(",").map(function(s){return s.trim();}); list=syms.map(function(s){return d.all[s];}).filter(Boolean); }
  var minAum=+(el.getAttribute("data-min-aum")||0); if(minAum) list=list.filter(function(e){return (e.aum||0)>=minAum;});
  var excl=(el.getAttribute("data-exclude")||"").split(",").map(function(s){return s.trim();});
  list=list.filter(function(e){return excl.indexOf(e.sym)<0;});
  var cols=(el.getAttribute("data-cols")||"yield,er,aum,tr").split(",");
  var labels={yield:"Yield",er:"Exp. ratio",aum:"AUM",tr:"Total return",decay:"Price decay",freq:"Pays",provider:"Issuer"};
  var fmts={yield:F.pct,er:F.pct2,aum:F.aum,tr:F.signed,decay:F.decay,freq:F.text,provider:F.text};
  var sort=el.getAttribute("data-sort")||cols[0], dir=el.getAttribute("data-dir")==="asc"?1:-1, n=+(el.getAttribute("data-n")||10);
  var tbody, thead;
  function render(){
    var rows=list.filter(function(e){return e[sort]!=null;}).sort(function(a,b){ var x=a[sort],y=b[sort]; if(typeof x==="string") return dir*x.localeCompare(y); return dir*(x-y); }).slice(0,n);
    thead.innerHTML="<tr><th>Fund</th>"+cols.map(function(c){ return '<th'+(c===sort?' aria-sort="'+(dir>0?"ascending":"descending")+'"':'')+(c==="provider"||c==="freq"?' class="l"':'')+'><button data-k="'+c+'">'+labels[c]+'</button></th>'; }).join("")+"</tr>";
    tbody.innerHTML=rows.map(function(e){
      return '<tr><td><a class="tk" href="'+etfUrl(e.sym)+'">'+esc(e.sym)+'</a><span class="fund-name" title="'+esc(e.name)+'">'+esc(e.name)+'</span></td>'+cols.map(function(c){
        var v=e[c], cls=c==="provider"||c==="freq"?"l":"";
        if(c==="tr"&&v!=null) cls+=v>=0?" pos":" neg";
        if(c==="decay"&&v!=null) return '<td>'+(v?'<span class="flag neg">Yes</span>':'<span class="flag pos">No</span>')+'</td>';
        return '<td class="'+cls+'">'+fmts[c](v)+'</td>'; }).join("")+'</tr>';
    }).join("");
  }
  var tbl=el.querySelector("table"); thead=tbl.querySelector("thead"); tbody=tbl.querySelector("tbody");
  thead.addEventListener("click",function(ev){ var b=ev.target.closest("button"); if(!b) return; var k=b.getAttribute("data-k"); if(k===sort) dir=-dir; else { sort=k; dir=(k==="er")?1:-1; } render(); });
  el.querySelectorAll("[data-view]").forEach(function(b){ b.addEventListener("click",function(){
    el.querySelectorAll("[data-view]").forEach(function(x){x.setAttribute("aria-pressed","false");}); b.setAttribute("aria-pressed","true");
    sort=b.getAttribute("data-view"); dir=b.getAttribute("data-dir")==="asc"?1:-1; render(); }); });
  render();
};

/* Bar chart figure driven by data attributes */
W.bars=function(el,d){
  var src=el.getAttribute("data-src")||"pro", field=el.getAttribute("data-field")||"yield", n=+(el.getAttribute("data-n")||10);
  var list=(d[src]||[]).slice();
  var syms=el.getAttribute("data-syms"); if(syms) list=syms.split(",").map(function(s){return d.all[s.trim()];}).filter(Boolean);
  var minAum=+(el.getAttribute("data-min-aum")||0); if(minAum) list=list.filter(function(e){return (e.aum||0)>=minAum;});
  var excl=(el.getAttribute("data-exclude")||"").split(","); list=list.filter(function(e){return excl.indexOf(e.sym)<0;});
  var fmt=F[el.getAttribute("data-fmt")||"pct"];
  var asc=el.getAttribute("data-dir")==="asc";
  list=list.filter(function(e){return e[field]!=null;});
  if(syms&&!el.getAttribute("data-n")) n=list.length;
  if(!syms||el.hasAttribute("data-sorted")) list.sort(function(a,b){return asc?a[field]-b[field]:b[field]-a[field];});
  list=list.slice(0,n);
  var chart=el.querySelector(".chart");
  function draw(){ barChart(chart,list.map(function(e){ return {label:e.sym,sub:e.name,value:e[field],href:etfUrl(e.sym),
    tip:[["Yield",F.pct(e.yield)],["Total return",F.signed(e.tr)],["AUM",F.aum(e.aum)]].filter(function(r){return r[1]!=="n/a";})}; }),{fmt:fmt,color:el.getAttribute("data-color")||"--series-1",aria:el.querySelector(".figure-title")?el.querySelector(".figure-title").textContent:""}); }
  draw(); onResize(draw);
};

/* Yield vs total return scatter */
W.yieldScatter=function(el,d){
  var chart=el.querySelector(".chart"), slider=el.querySelector("input[type=range]"), out=el.querySelector("output");
  var groups=[{key:"no",name:"No price decay",color:css("--series-1")},{key:"yes",name:"Price decay",color:css("--series-2")}];
  legend(el.querySelector(".legend"),groups);
  function draw(){
    var cap=slider?+slider.value:40; if(out) out.textContent=cap+"%";
    var pts=d.pro.filter(function(e){ return e.yield!=null&&e.tr!=null&&e.yield<=cap&&e.tr<=400; }).map(function(e){
      return {x:e.yield,y:e.tr,label:e.sym,group:e.decay?"yes":"no",showLabel:["JEPI","SCHD","QYLD","DIVO","MSTY","ULTI"].indexOf(e.sym)>-1,
        tip:[["Yield",F.pct(e.yield)],["Total return",F.signed(e.tr)],["Price decay",e.decay?"Yes":"No"],["Since",e.inception||"n/a"]]}; });
    scatter(chart,pts,{xLabel:"Distribution yield",yLabel:"Total return since inception",groups:groups,aria:"Yield versus total return for income ETFs"});
    var n=el.querySelector("[data-count]"); if(n) n.textContent=pts.length;
  }
  if(slider) slider.addEventListener("input",draw);
  draw(); onResize(draw);
};

/* Income calculator (single ETF) */
W.income=function(el,d){
  var src=el.getAttribute("data-src")||"pro", sel=el.querySelector("select"), amt=el.querySelector("[name=amount]");
  var list=(src==="all"?Object.keys(d.all).map(function(k){return d.all[k];}):d[src]).filter(function(e){return e.yield!=null;}).sort(function(a,b){return a.sym.localeCompare(b.sym);});
  var def=el.getAttribute("data-default")||list[0].sym;
  sel.innerHTML=list.map(function(e){ return '<option value="'+e.sym+'"'+(e.sym===def?" selected":"")+'>'+esc(e.sym)+' · '+F.pct(e.yield)+'</option>'; }).join("");
  function calc(){
    var e=d.all[sel.value], a=Math.max(0,+String(amt.value).replace(/[^\d.]/g,"")||0), y=(e.yield||0)/100, yr=a*y;
    var per={Weekly:52,Monthly:12,Quarterly:4,"Semi-Annual":2,Annual:1}[e.freq]||12;
    set("annual",F.usd(yr)); set("monthly",F.usd(yr/12)); set("weekly",F.usd(yr/52));
    if(per===12){ set("per",F.usd(yr/52,yr/52<100?2:0)); set("perLabel","Per week"); } else { set("per",F.usd(yr/per,yr/per<100?2:0)); set("perLabel",per===52?"Per weekly payout":per===4?"Per quarterly payout":"Per payout"); }
    var n=el.querySelector("[data-o=name]"); if(n) n.innerHTML='<a href="'+etfUrl(e.sym)+'">'+esc(e.name)+'</a>, '+F.pct(e.yield)+' yield, pays '+esc((e.freq||"on a set schedule").toLowerCase());
  }
  function set(k,v){ var t=el.querySelector('[data-o="'+k+'"]'); if(t) t.textContent=v; }
  sel.addEventListener("change",calc); amt.addEventListener("input",calc); calc();
};

/* Head-to-head income for a list of ETFs at a fixed amount */
W.incomeBars=function(el,d){
  var syms=(el.getAttribute("data-syms")||"").split(",").map(function(s){return s.trim();});
  var inp=el.querySelector("[name=amount]"), chart=el.querySelector(".chart");
  var list=syms.map(function(s){return d.all[s];}).filter(function(e){return e&&e.yield!=null;}).sort(function(a,b){return b.yield-a.yield;});
  var per=el.getAttribute("data-per")||"year", div={year:1,month:12,week:52}[per];
  function draw(){ var a=Math.max(0,+String(inp.value).replace(/[^\d.]/g,"")||0);
    barChart(chart,list.map(function(e){ var v=a*e.yield/100/div; return {label:e.sym,sub:e.name,value:v,href:etfUrl(e.sym),tip:[["Yield",F.pct(e.yield)],["Income per "+per,F.usd(v,v<100?2:0)],["Total return",F.signed(e.tr)]]}; }),{fmt:function(v){return F.usd(v,v<100?2:0);},valW:92}); }
  inp.addEventListener("input",draw); draw(); onResize(draw);
};

/* Compounding / DRIP calculator */
W.drip=function(el){
  var f=function(n){ var i=el.querySelector('[name="'+n+'"]'); return i?+i.value:0; };
  var chart=el.querySelector(".chart");
  function calc(){
    var P=f("start"), C=f("monthly"), y=f("yield")/100, g=f("growth")/100, yrs=Math.round(f("years"));
    el.querySelectorAll("output[for]").forEach(function(o){ var i=el.querySelector('[name="'+o.getAttribute("for")+'"]'); o.textContent=i.getAttribute("data-unit")==="%"?(+i.value).toFixed(1)+"%":i.value+(i.getAttribute("data-unit")||""); });
    var drip=P, cash=P, cashIncome=0, xs=[0], a=[P], b=[P], inc=0;
    for(var yr=1;yr<=yrs;yr++){
      for(var mo=0;mo<12;mo++){
        drip=drip*(1+g/12)+drip*y/12+C;
        var paid=cash*y/12; cashIncome+=paid; cash=cash*(1+g/12)+C;
      }
      xs.push(yr); a.push(drip); b.push(cash);
    }
    inc=drip*y;
    var contrib=P+C*12*yrs;
    lineChart(chart,xs,[{name:"Dividends reinvested",color:css("--series-1"),values:a},{name:"Dividends taken as cash",color:css("--series-2"),values:b}],{xFmt:function(v){return "Yr "+v;},xName:"",aria:"Portfolio value with and without reinvesting dividends"});
    legend(el.querySelector(".legend"),[{name:"Dividends reinvested",color:css("--series-1")},{name:"Dividends taken as cash",color:css("--series-2")}]);
    var o=function(k,v){ var t=el.querySelector('[data-o="'+k+'"]'); if(t) t.textContent=v; };
    o("end",F.compact(drip)); o("income",F.usd(inc)); o("contrib",F.compact(contrib)); o("cash",F.compact(cash+cashIncome));
  }
  el.addEventListener("input",calc); calc(); onResize(calc);
};

/* Fee drag calculator */
W.fees=function(el){
  var f=function(n){ var i=el.querySelector('[name="'+n+'"]'); return i?+i.value:0; };
  var chart=el.querySelector(".chart");
  function calc(){
    el.querySelectorAll("output[for]").forEach(function(o){ var i=el.querySelector('[name="'+o.getAttribute("for")+'"]'); var u=i.getAttribute("data-unit"); o.textContent=u==="%"?(+i.value).toFixed(2)+"%":(u==="$"?F.usd(+i.value):i.value+(u||"")); });
    var P=f("start"), r=f("ret")/100, e1=f("er1")/100, e2=f("er2")/100, yrs=Math.round(f("years")), C=f("monthly");
    var a=P,b=P,xs=[0],A=[P],B=[P];
    for(var y=1;y<=yrs;y++){ for(var m=0;m<12;m++){ a=a*(1+(r-e1)/12)+C; b=b*(1+(r-e2)/12)+C; } xs.push(y); A.push(a); B.push(b); }
    var s=[{name:"Fund at "+(e1*100).toFixed(2)+"%",color:css("--series-1"),values:A},{name:"Fund at "+(e2*100).toFixed(2)+"%",color:css("--series-2"),values:B}];
    lineChart(chart,xs,s,{xFmt:function(v){return "Yr "+v;},aria:"Growth of the same investment at two expense ratios"});
    legend(el.querySelector(".legend"),s);
    var o=function(k,v){ var t=el.querySelector('[data-o="'+k+'"]'); if(t) t.textContent=v; };
    o("a",F.compact(a)); o("b",F.compact(b)); o("gap",F.compact(Math.abs(a-b)));
    o("share",(Math.abs(a-b)/Math.max(a,b)*100).toFixed(1)+"%");
  }
  el.addEventListener("input",calc); calc(); onResize(calc);
};

/* Covered call payoff at expiration (one month) */
W.payoff=function(el){
  var chart=el.querySelector(".chart");
  function calc(){
    var prem=+el.querySelector("[name=prem]").value, otm=+el.querySelector("[name=otm]").value;
    el.querySelector("output[for=prem]").textContent=prem.toFixed(1)+"%"; el.querySelector("output[for=otm]").textContent=otm.toFixed(1)+"%";
    var xs=[],s=[],c=[]; for(var x=-15;x<=15;x+=0.5){ xs.push(x); s.push(x); c.push(Math.min(x,otm)+prem); }
    var ser=[{name:"Own the stock",color:css("--series-1"),values:s},{name:"Stock + sold call",color:css("--series-2"),values:c}];
    lineChart(chart,xs,ser,{yMin:-15,xFmt:function(v){return (v>0?"+":"")+v+"%";},yFmt:function(v){return (v>0?"+":"")+Math.round(v)+"%";},tipFmt:function(v){return (v>0?"+":"")+v.toFixed(1)+"%";},xName:"Stock moves",aria:"Covered call payoff compared with owning the stock"});
    legend(el.querySelector(".legend"),ser);
    var be=otm+prem; var t=el.querySelector("[data-o=cross]"); if(t) t.textContent="+"+be.toFixed(1)+"%";
    var cap=el.querySelector("[data-o=cap]"); if(cap) cap.textContent="+"+(otm+prem).toFixed(1)+"%";
    var cush=el.querySelector("[data-o=cush]"); if(cush) cush.textContent=prem.toFixed(1)+"%";
  }
  el.addEventListener("input",calc); calc(); onResize(calc);
};

/* Growth of $10k: bar of ending values from total return */
W.growthTen=function(el,d){
  var chart=el.querySelector(".chart"), n=+(el.getAttribute("data-n")||12), min=+(el.getAttribute("data-min-aum")||5e9);
  var list=d.growth.filter(function(e){return e.tr!=null&&(e.aum||0)>=min&&!/ultra|2x|3x/i.test(e.name);}).sort(function(a,b){return b.tr-a.tr;}).slice(0,n);
  function draw(){ barChart(chart,list.map(function(e){ var v=10000*(1+e.tr/100); return {label:e.sym,sub:e.name,value:v,href:etfUrl(e.sym),tip:[["Total return",F.signed(e.tr)],["$10K became",F.usd(v)],["AUM",F.aum(e.aum)]]}; }),{fmt:F.compact,valW:84}); }
  draw(); onResize(draw);
};

/* ETF profile page */
W.profile=function(el,d){
  var sym=(new URLSearchParams(location.search).get("t")||"").toUpperCase().replace(/[^A-Z.]/g,"");
  var e=d.all[sym];
  if(!e){ el.innerHTML='<div class="card" style="padding:28px"><h1 class="h-serif" style="margin:0 0 8px">'+(sym?esc(sym)+" isn't in our coverage yet":"Find an ETF")+'</h1><p class="muted">Try the search, or browse the <a href="/dividend">income</a>, <a href="/weekly">weekly-pay</a> and <a href="/growth">growth</a> lists.</p><p><button class="btn btn-navy" data-open-search>Search ETFs</button></p></div>'; bindSearchButtons(); return; }
  document.title=e.sym+" ETF: yield, total return, fees and income calculator | TopETFs";
  var md=document.querySelector('meta[name=description]'); if(md) md.setAttribute("content",e.sym+" ("+e.name+") at a glance: distribution yield, total return, expense ratio, AUM and a live income calculator.");
  var lists={pro:"Income list",weekly:"Weekly pay",growth:"Growth list"};
  var kv=[["Distribution yield",F.pct(e.yield)],["Total return (since inception)",F.signed(e.tr)],["Expense ratio",F.pct2(e.er)],["Assets under management",F.aum(e.aum)],["Pays",e.freq||"n/a"],["Price decay since inception",e.decay==null?"n/a":(e.decay?"Yes":"No")],["Inception",e.inception||"n/a"],["Issuer",e.provider||"n/a"]].filter(function(r){return r[1]!=="n/a";});
  var q=encodeURIComponent(e.sym+" ETF");
  el.innerHTML=
   '<div class="etf-hero"><div><div class="kicker">ETF profile</div><div class="etf-sym">'+esc(e.sym)+'</div><div class="etf-name">'+esc(e.name)+'</div>'+
   '<div class="badges">'+e.lists.map(function(l){return '<span class="badge">'+lists[l]+'</span>';}).join("")+(e.provider?'<span class="badge">'+esc(e.provider)+'</span>':'')+'</div></div></div>'+
   '<div class="grid-2" style="margin-top:26px;align-items:start"><div class="aside-card"><h3>Key numbers</h3>'+kv.map(function(r){return '<div class="kv"><span>'+r[0]+'</span><span>'+r[1]+'</span></div>';}).join("")+
   '<p class="figure-note">From the TopETFs database, refreshed daily. Yields are trailing distribution yields and can change with every payout.</p></div>'+
   (e.yield!=null?'<div class="figure" style="margin:0" data-w="income" data-src="all" data-default="'+esc(e.sym)+'"><p class="figure-title">Income calculator</p><p class="figure-sub">What '+esc(e.sym)+' would pay at its current yield</p><div class="controls"><div class="field"><label>Invest</label><input name="amount" inputmode="decimal" value="10000"></div><div class="field"><label>ETF</label><select></select></div></div><div class="results"><div><div class="label">Per year</div><div class="value big" data-o="annual">$0</div></div><div><div class="label">Per month</div><div class="value" data-o="monthly">$0</div></div><div><div class="label" data-o="perLabel">Per payout</div><div class="value" data-o="per">$0</div></div></div><p class="figure-note" data-o="name"></p></div>':'<div class="aside-card"><h3>Growth of $10,000</h3><div class="kv"><span>Since inception</span><span>'+(e.tr!=null?F.usd(10000*(1+e.tr/100)):"n/a")+'</span></div><p class="figure-note">Total return includes reinvested distributions. Past performance does not guarantee future results.</p></div>')+
   '</div>'+
   '<div class="section-head"><h2>Research '+esc(e.sym)+'</h2></div><div class="grid-3">'+
   '<a class="net-card" href="https://www.sec.gov/edgar/search/#/q=%22'+encodeURIComponent(e.name)+'%22" target="_blank" rel="noopener"><h3>SEC filings</h3><p>Prospectus, annual reports and 19a-1 distribution notices on EDGAR.</p><span class="go">Search EDGAR &rarr;</span></a>'+
   '<a class="net-card" href="https://www.google.com/search?q='+encodeURIComponent(e.name+" official site")+'" target="_blank" rel="noopener"><h3>Fund website</h3><p>Holdings, fact sheet and the latest distribution from '+esc(e.provider||"the issuer")+'.</p><span class="go">Find the fund page &rarr;</span></a>'+
   '<a class="net-card" href="https://topdividendetfspro.com/" target="_blank" rel="noopener"><h3>Compare in PRO</h3><p>Screen '+esc(e.sym)+' against 160+ income ETFs with advanced filters.</p><span class="go">Open TopDividendETFsPRO &rarr;</span></a></div>'+
   '<p class="figure-note" style="margin-top:18px">Data is for education only and may be delayed or differ from the issuer. Read the prospectus before investing.</p>';
  el.querySelectorAll("[data-w]").forEach(function(w){ if(W[w.getAttribute("data-w")]) W[w.getAttribute("data-w")](w,d); });
  var rel=document.querySelector("[data-related-for]"); if(rel) rel.setAttribute("data-related-for",e.sym);
};

/* ---------------- search ---------------- */
var searchIdx=null;
function openSearch(){
  var pop=document.getElementById("search-pop"); if(!pop) return;
  pop.classList.add("open"); var inp=pop.querySelector("input"); inp.value=""; inp.focus(); renderSearch("");
  ready().then(function(d){ searchIdx=Object.keys(d.all).map(function(k){return d.all[k];}); renderSearch(inp.value); });
}
function closeSearch(){ var pop=document.getElementById("search-pop"); if(pop) pop.classList.remove("open"); }
function renderSearch(q){
  var box=document.querySelector("#search-pop .search-results"); if(!box) return;
  q=q.trim().toUpperCase();
  var arts=(window.TE_ARTICLES||[]).filter(function(a){ return q&&(a.title.toUpperCase().indexOf(q)>-1||(a.tickers||[]).indexOf(q)>-1); }).slice(0,4);
  if(!searchIdx){ box.innerHTML='<div class="search-empty">Loading ETFs...</div>'; return; }
  var res=searchIdx.filter(function(e){ return !q||e.sym.indexOf(q)===0||e.name.toUpperCase().indexOf(q)>-1; })
    .sort(function(a,b){ var ax=a.sym===q?0:a.sym.indexOf(q)===0?1:2, bx=b.sym===q?0:b.sym.indexOf(q)===0?1:2; return ax-bx||((b.aum||0)-(a.aum||0)); }).slice(0,q?10:8);
  var html=arts.map(function(a){ return '<a href="/articles/'+a.slug+'"><span class="type">Story</span><span>'+esc(a.title)+'</span><span></span></a>'; }).join("")+
    res.map(function(e){ return '<a href="'+etfUrl(e.sym)+'"><span class="tk">'+esc(e.sym)+'</span><span class="fund-name" style="max-width:none">'+esc(e.name)+'</span><span class="num">'+(e.yield!=null&&e.lists.indexOf("growth")<0?F.pct(e.yield)+" yld":(e.tr!=null?F.signed(e.tr):""))+'</span></a>'; }).join("");
  box.innerHTML=html||'<div class="search-empty">No matches. Try a ticker like SCHD or JEPI.</div>';
  var first=box.querySelector("a"); if(first) first.classList.add("active");
}
function bindSearchButtons(){ document.querySelectorAll("[data-open-search]").forEach(function(b){ if(b._b) return; b._b=1; b.addEventListener("click",function(ev){ ev.preventDefault(); openSearch(); }); }); }

/* ---------------- misc ---------------- */
var resizers=[]; function onResize(fn){ resizers.push(fn); }
var rt; window.addEventListener("resize",function(){ clearTimeout(rt); rt=setTimeout(function(){ resizers.forEach(function(f){ try{f();}catch(e){} }); },150); });

function related(){
  var el=document.querySelector("[data-related-for]"); if(!el||!window.TE_ARTICLES) return;
  var sym=el.getAttribute("data-related-for"), here=document.body.getAttribute("data-slug");
  var list=window.TE_ARTICLES.filter(function(a){ return a.slug!==here&&(!sym||(a.tickers||[]).indexOf(sym)>-1); });
  if(list.length<3) list=list.concat(window.TE_ARTICLES.filter(function(a){ return a.slug!==here&&list.indexOf(a)<0; }));
  el.innerHTML=list.slice(0,3).map(function(a){ return '<a class="story" href="/articles/'+a.slug+'"><div class="cover"><img src="/assets/covers/'+a.slug+'.svg" alt="" loading="lazy"></div><span class="kicker">'+esc(a.section)+'</span><h3 class="story-title">'+esc(a.title)+'</h3><p class="story-dek">'+esc(a.dek)+'</p></a>'; }).join("");
}

function init(){
  bindSearchButtons();
  var pop=document.getElementById("search-pop");
  if(pop){
    pop.addEventListener("click",function(ev){ if(ev.target===pop) closeSearch(); });
    var inp=pop.querySelector("input");
    inp.addEventListener("input",function(){ renderSearch(inp.value); });
    inp.addEventListener("keydown",function(ev){
      var items=[].slice.call(pop.querySelectorAll(".search-results a")), i=items.findIndex(function(a){return a.classList.contains("active");});
      if(ev.key==="ArrowDown"||ev.key==="ArrowUp"){ ev.preventDefault(); if(i>-1) items[i].classList.remove("active"); i=ev.key==="ArrowDown"?Math.min(items.length-1,i+1):Math.max(0,i-1); if(items[i]){ items[i].classList.add("active"); items[i].scrollIntoView({block:"nearest"}); } }
      if(ev.key==="Enter"&&items[i]) location.href=items[i].href;
    });
  }
  document.addEventListener("keydown",function(ev){
    if(ev.key==="Escape") closeSearch();
    if(ev.key==="/"&&!/input|textarea|select/i.test(document.activeElement.tagName)){ ev.preventDefault(); openSearch(); }
  });
  var mb=document.querySelector(".menu-btn"); if(mb) mb.addEventListener("click",function(){ var n=document.querySelector(".primary"); var o=n.classList.toggle("open"); mb.setAttribute("aria-expanded",o); });
  var tt=document.querySelector(".theme-toggle"); if(tt) tt.addEventListener("click",function(){
    var cur=document.documentElement.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
    var next=cur==="dark"?"light":"dark"; document.documentElement.setAttribute("data-theme",next); try{localStorage.setItem("te-theme",next);}catch(e){} location.reload(); });
  document.querySelectorAll("[data-copy-link]").forEach(function(b){ b.addEventListener("click",function(){ try{ navigator.clipboard.writeText(location.href); b.textContent="Copied"; setTimeout(function(){b.textContent="Copy link";},1600);}catch(e){} }); });
  related();

  ready().then(function(d){
    fillLive(d);
    document.querySelectorAll("[data-w]").forEach(function(el){
      var k=el.getAttribute("data-w"); if(!W[k]||el.closest("[data-w=profile]")&&k!=="profile") return;
      try{ W[k](el,d); }catch(e){ if(window.console) console.warn("widget",k,e); }
    });
    var stamp=document.querySelector("[data-updated]"); if(stamp) stamp.textContent="Live";
  });
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();

window.TopETFs={ready:ready,F:F,charts:{bar:barChart,scatter:scatter,line:lineChart}};
})();
