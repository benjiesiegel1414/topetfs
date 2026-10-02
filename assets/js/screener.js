/* TopETFs ETF Screener. Shared by the browser and the site build (scripts/build.mjs).
   Every screen is a real URL (/screener?f=Monthly&ymin=8 ...), so each change loads a new page
   that can be bookmarked, shared and tracked. */
var TES=(function(){
"use strict";
var NOW=Date.now();
var FREQS=["Weekly","Monthly","Quarterly","Annual"];
var UNIVERSE=[["all","All ETFs"],["income","Income & dividend"],["weekly","Weekly pay"],["growth","Growth"]];
var AUMS=[["","Any size"],["10000000","$10M+"],["100000000","$100M+"],["500000000","$500M+"],["1000000000","$1B+"],["10000000000","$10B+"],["100000000000","$100B+"]];
var AGES=[["","Any age"],["1","1+ years"],["3","3+ years"],["5","5+ years"],["10","10+ years"]];
var AGEMAX=[["","Any"],["0.5","Under 6 months"],["1","Under 1 year"],["2","Under 2 years"]];
var PER=["25","50","100"];
var COLS=[
  {k:"sym",l:"ETF",dir:"asc"},
  {k:"provider",l:"Provider",dir:"asc"},
  {k:"yield",l:"Yield",dir:"desc"},
  {k:"inc",l:"$10K pays / yr",dir:"desc"},
  {k:"freq",l:"Payout",dir:"asc"},
  {k:"er",l:"Expense",dir:"asc"},
  {k:"aum",l:"AUM",dir:"desc"},
  {k:"tr",l:"Total return",dir:"desc"},
  {k:"ar",l:"Annualized",dir:"desc"},
  {k:"decay",l:"Price decay",dir:"asc"},
  {k:"age",l:"Inception",dir:"asc"}
];
var KEYS=["u","q","p","f","ymin","ymax","ermax","aum","trmin","armin","decay","age","agemax","sort","dir","n","pg"];
var DEF={u:"all",sort:"aum",dir:"desc",n:"25",pg:"1"};

function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function num(v){if(v==null||v==="")return null;v=+String(v).replace(/[$,%\s]/g,"");return isNaN(v)?null:v;}
function pDate(s){var m=String(s||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!m)return null;return new Date(+m[3],+m[1]-1,+m[2]);}
var F={
  pct:function(v,d){if(v==null||isNaN(v))return "n/a";d=d==null?(Math.abs(v)>=100?0:1):d;return v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})+"%";},
  signed:function(v){if(v==null)return "n/a";return (v>0?"+":"")+F.pct(v,Math.abs(v)>=10?0:1);},
  usd:function(v){return v==null?"n/a":"$"+Math.round(v).toLocaleString("en-US");},
  aum:function(v){if(v==null)return "n/a";if(v>=1e12)return "$"+(v/1e12).toFixed(2)+"T";if(v>=1e9)return "$"+(v/1e9).toFixed(v>=1e11?0:1)+"B";if(v>=1e6)return "$"+(v/1e6).toFixed(v>=1e8?0:1)+"M";return "$"+Math.round(v/1e3)+"K";}
};

/* Turn the merged ETF map into screener rows with derived fields */
function rows(all){
  return Object.keys(all).map(function(s){
    var e=all[s],d=pDate(e.inception),age=d?(NOW-d.getTime())/(365.25*864e5):null;
    var fr=e.freq?e.freq.charAt(0).toUpperCase()+e.freq.slice(1).toLowerCase():"";
    if(!fr&&e.lists&&e.lists.indexOf("weekly")>-1)fr="Weekly";
    var ar=(age!=null&&age>=1&&e.tr!=null&&e.tr>-100)?(Math.pow(1+e.tr/100,1/age)-1)*100:null;
    var isG=e.lists&&e.lists.indexOf("growth")>-1&&e.lists.indexOf("pro")<0&&e.lists.indexOf("weekly")<0;
    var y=isG?null:e.yield;
    return {sym:s,name:e.name||"",provider:e.provider||"",yield:y,inc:y!=null?y*100:null,freq:fr,er:e.er,aum:e.aum,tr:e.tr,ar:ar,
      decay:e.decay,age:age,inception:d,incTxt:e.inception||"",lists:e.lists||[]};
  });
}

function parse(search,defaults){
  var q={},k,i,sp=String(search||"").replace(/^\?/,"").split("&");
  for(k in DEF)q[k]=DEF[k];
  for(k in (defaults||{}))q[k]=String(defaults[k]);
  for(i=0;i<sp.length;i++){if(!sp[i])continue;var kv=sp[i].split("="),key=decodeURIComponent(kv[0]);if(KEYS.indexOf(key)<0)continue;
    var val=decodeURIComponent((kv[1]||"").replace(/\+/g," ")).trim();if(val==="")continue;q[key]=val.slice(0,60);}
  return q;
}

function run(all,q){
  var r=rows(all),t=(q.q||"").toLowerCase();
  var ymin=num(q.ymin),ymax=num(q.ymax),ermax=num(q.ermax),aum=num(q.aum),trmin=num(q.trmin),armin=num(q.armin),age=num(q.age),agemax=num(q.agemax);
  r=r.filter(function(e){
    if(q.u==="income"&&e.lists.indexOf("pro")<0)return false;
    if(q.u==="weekly"&&e.freq!=="Weekly")return false;
    if(q.u==="growth"&&e.lists.indexOf("growth")<0)return false;
    if(t&&e.sym.toLowerCase().indexOf(t)<0&&e.name.toLowerCase().indexOf(t)<0&&e.provider.toLowerCase().indexOf(t)<0)return false;
    if(q.p&&e.provider.toLowerCase()!==q.p.toLowerCase())return false;
    if(q.f&&e.freq!==q.f)return false;
    if(ymin!=null&&!(e.yield!=null&&e.yield>=ymin))return false;
    if(ymax!=null&&!(e.yield!=null&&e.yield<=ymax))return false;
    if(ermax!=null&&!(e.er!=null&&e.er<=ermax))return false;
    if(aum!=null&&!(e.aum!=null&&e.aum>=aum))return false;
    if(trmin!=null&&!(e.tr!=null&&e.tr>=trmin))return false;
    if(armin!=null&&!(e.ar!=null&&e.ar>=armin))return false;
    if(q.decay==="no"&&e.decay!==false)return false;
    if(q.decay==="yes"&&e.decay!==true)return false;
    if(age!=null&&!(e.age!=null&&e.age>=age))return false;
    if(agemax!=null&&!(e.age!=null&&e.age<agemax))return false;
    return true;
  });
  var s=q.sort,dir=q.dir==="asc"?1:-1;
  if(!COLS.some(function(c){return c.k===s;}))s="aum";
  r.sort(function(a,b){var x=a[s],y=b[s];
    if(s==="decay"){x=x==null?null:(x?1:0);y=y==null?null:(y?1:0);}
    if(x==null&&y==null)return a.sym<b.sym?-1:1; if(x==null)return 1; if(y==null)return -1;
    if(typeof x==="string")return dir*x.localeCompare(y)||(a.sym<b.sym?-1:1);
    return dir*(x-y)||(a.sym<b.sym?-1:1);});
  return r;
}

function href(base,q,defaults,changes){
  var o={},k,parts=[];for(k in q)o[k]=q[k];for(k in changes)o[k]=changes[k];
  if(!("pg" in changes))o.pg="1";
  var d={};for(k in DEF)d[k]=DEF[k];for(k in (defaults||{}))d[k]=String(defaults[k]);
  KEYS.forEach(function(k){if(o[k]!=null&&o[k]!==""&&String(o[k])!==String(d[k]==null?"":d[k]))parts.push(k+"="+encodeURIComponent(o[k]).replace(/%20/g,"+"));});
  return base+(parts.length?"?"+parts.join("&"):"");
}

function median(a){a=a.filter(function(x){return x!=null;}).sort(function(x,y){return x-y;});if(!a.length)return null;var m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2;}

function render(all,q,base,defaults){
  var r=run(all,q),n=Math.min(100,Math.max(10,+q.n||25)),pages=Math.max(1,Math.ceil(r.length/n)),pg=Math.min(pages,Math.max(1,+q.pg||1));
  var slice=r.slice((pg-1)*n,pg*n);
  var stats='<div class="scr-stats"><div><b>'+r.length+'</b><span>ETFs match</span></div><div><b>'+F.pct(median(r.map(function(e){return e.yield;})))+'</b><span>Median yield</span></div><div><b>'+F.pct(median(r.map(function(e){return e.er;})),2)+'</b><span>Median expense</span></div><div><b>'+F.aum(r.reduce(function(s,e){return s+(e.aum||0);},0)||null)+'</b><span>Total AUM</span></div></div>';
  var th=COLS.map(function(c){var on=q.sort===c.k,nd=on?(q.dir==="asc"?"desc":"asc"):c.dir;
    return '<th'+(c.k==="sym"||c.k==="provider"?' class="l"':'')+(on?' aria-sort="'+(q.dir==="asc"?"ascending":"descending")+'"':'')+'><a rel="nofollow" href="'+esc(href(base,q,defaults,{sort:c.k,dir:nd}))+'">'+c.l+(on?(q.dir==="asc"?" &#9650;":" &#9660;"):"")+'</a></th>';}).join("");
  var tb=slice.map(function(e){
    return '<tr><td class="l"><a class="tk" href="/etfs/'+e.sym.toLowerCase().replace(/[^a-z0-9]+/g,"-")+'">'+esc(e.sym)+'</a><span class="fund-name">'+esc(e.name)+'</span></td>'+
      '<td class="l">'+(e.provider?'<a rel="nofollow" href="'+esc(href(base,q,defaults,{p:e.provider}))+'">'+esc(e.provider)+'</a>':'<span class="muted">n/a</span>')+'</td>'+
      '<td><b>'+F.pct(e.yield)+'</b></td><td>'+F.usd(e.inc)+'</td><td>'+(e.freq||'<span class="muted">n/a</span>')+'</td><td>'+F.pct(e.er,2)+'</td><td>'+F.aum(e.aum)+'</td>'+
      '<td class="'+(e.tr==null?'':e.tr>=0?'pos':'neg')+'">'+F.signed(e.tr)+'</td><td class="'+(e.ar==null?'':e.ar>=0?'pos':'neg')+'">'+F.signed(e.ar)+'</td>'+
      '<td>'+(e.decay==null?'<span class="muted">n/a</span>':e.decay?'<span class="scr-flag bad">Yes</span>':'<span class="scr-flag good">No</span>')+'</td>'+
      '<td>'+(e.inception?e.inception.toLocaleDateString("en-US",{month:"short",year:"numeric"}):'<span class="muted">n/a</span>')+'</td></tr>';}).join("");
  if(!slice.length)tb='<tr><td colspan="'+COLS.length+'" class="l" style="padding:28px 14px">No ETFs match this screen. Try loosening a filter or <a href="'+esc(base)+'">reset the screen</a>.</td></tr>';
  var pager="";
  if(pages>1){var b=[],i,lo=Math.max(1,pg-2),hi=Math.min(pages,pg+2);
    if(pg>1)b.push('<a rel="prev" href="'+esc(href(base,q,defaults,{pg:String(pg-1)}))+'">&larr; Prev</a>');
    for(i=lo;i<=hi;i++)b.push(i===pg?'<span aria-current="page">'+i+'</span>':'<a href="'+esc(href(base,q,defaults,{pg:String(i)}))+'">'+i+'</a>');
    if(pg<pages)b.push('<a rel="next" href="'+esc(href(base,q,defaults,{pg:String(pg+1)}))+'">Next &rarr;</a>');
    pager='<nav class="scr-pager" aria-label="Pages">'+b.join("")+'</nav>';}
  return stats+'<div class="board"><div class="board-head"><div><h3>'+r.length+' ETF'+(r.length===1?'':'s')+' found</h3><p class="meta">Showing '+(r.length?((pg-1)*n+1)+' to '+Math.min(pg*n,r.length):'0')+'. Click a column to sort, a ticker for the full profile.</p></div></div>'+
    '<div class="tbl-scroll"><table class="data scr-table"><thead><tr>'+th+'</tr></thead><tbody>'+tb+'</tbody></table></div>'+
    '<div class="board-foot"><span>Total return is since each fund\'s inception, so funds that launched on different dates are not directly comparable. Annualized return shown for funds 1+ years old.</span><span>Source: TopETFs database</span></div></div>'+pager;
}

function opts(list,val){return list.map(function(o){var v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return '<option value="'+esc(v)+'"'+(String(val||"")===String(v)?' selected':'')+'>'+esc(l)+'</option>';}).join("");}
function form(all,q){
  var provs={};Object.keys(all).forEach(function(s){if(all[s].provider)provs[all[s].provider]=1;});
  provs=Object.keys(provs).sort(function(a,b){return a.toLowerCase()<b.toLowerCase()?-1:1;});
  function inp(n,l,ph,step){return '<div class="field"><label for="s-'+n+'">'+l+'</label><input id="s-'+n+'" name="'+n+'" type="number" inputmode="decimal" step="'+(step||"any")+'" placeholder="'+ph+'" value="'+esc(q[n]||"")+'"></div>';}
  function sel(n,l,list,val){return '<div class="field"><label for="s-'+n+'">'+l+'</label><select id="s-'+n+'" name="'+n+'" data-auto>'+opts(list,val)+'</select></div>';}
  return '<form class="scr-form" method="get" action="/screener" data-screener-form>'+
    '<div class="scr-grid">'+
    '<div class="field scr-wide"><label for="s-q">Ticker, fund or provider</label><input id="s-q" name="q" type="search" placeholder="e.g. SCHD, covered call, NEOS" value="'+esc(q.q||"")+'"></div>'+
    sel("u","Universe",UNIVERSE,q.u)+
    sel("f","Payout frequency",[["","Any"]].concat(FREQS.map(function(f){return [f,f];})),q.f)+
    sel("p","Provider",[["","All providers"]].concat(provs.map(function(p){return [p,p];})),q.p)+
    sel("aum","Fund size (AUM)",AUMS,q.aum)+
    inp("ymin","Min yield %","Any")+inp("ymax","Max yield %","Any")+
    inp("ermax","Max expense ratio %","Any","0.01")+
    inp("trmin","Min total return %","Any")+
    inp("armin","Min annualized return %","Any")+
    sel("decay","Price decay",[["","Any"],["no","No price decay"],["yes","Has price decay"]],q.decay)+
    sel("age","Fund age",AGES,q.age)+
    sel("agemax","Newly launched",AGEMAX,q.agemax)+
    sel("sort","Sort by",COLS.map(function(c){return [c.k,c.l];}),q.sort)+
    sel("dir","Order",[["desc","High to low"],["asc","Low to high"]],q.dir)+
    sel("n","Rows per page",PER.map(function(p){return [p,p];}),q.n)+
    '</div><div class="scr-actions"><button class="btn btn-gold" type="submit">Run screen</button><a class="btn btn-ghost" href="/screener">Reset all</a></div></form>';
}

return {COLS:COLS,FREQS:FREQS,F:F,rows:rows,parse:parse,run:run,render:render,form:form,href:href};
})();
if(typeof window!=="undefined"){window.TES=TES;
  (function(){
    var DEFS={u:"all",sort:"aum",dir:"desc",n:"25"};
    function init(){
      var root=document.querySelector("[data-screener]");if(!root)return;
      var base=root.getAttribute("data-base")||"/screener",defaults={};
      try{defaults=JSON.parse(root.getAttribute("data-defaults")||"{}");}catch(e){}
      var hasQ=location.search.length>1;
      if(hasQ)root.classList.add("scr-loading");
      root.addEventListener("change",function(e){var f=e.target.form;if(f&&e.target.hasAttribute("data-auto"))(f.requestSubmit?f.requestSubmit():f.submit());});
      root.addEventListener("submit",function(e){var f=e.target;if(!f.hasAttribute("data-screener-form"))return;
        Array.prototype.forEach.call(f.elements,function(el){if(!el.name)return;if(el.value===""||DEFS[el.name]===el.value)el.disabled=true;});
        if(typeof gtag==="function"){try{gtag("event","screener_run",{screen:location.pathname});}catch(_){}}
      });
      if(!window.TopETFs){root.classList.remove("scr-loading");return;}
      window.TopETFs.ready().then(function(d){
        root.classList.remove("scr-loading");
        if(!d||!d.all||!Object.keys(d.all).length)return;
        var q=TES.parse(location.search,defaults);
        var fw=root.querySelector("[data-screener-formwrap]");if(fw)fw.innerHTML=TES.form(d.all,q);
        var out=root.querySelector("[data-screener-out]");if(out)out.innerHTML=TES.render(d.all,q,base,defaults);
      },function(){root.classList.remove("scr-loading");});
    }
    if(document.readyState==="complete")init();else document.addEventListener("DOMContentLoaded",init);
  })();
}
if(typeof module!=="undefined")module.exports=TES;
