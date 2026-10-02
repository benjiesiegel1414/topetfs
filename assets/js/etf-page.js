/* ETF pages: live price widget (TradingView) + income calculator.
   Price data is provided by TradingView and may be delayed. */
(function(){
"use strict";
function theme(){var t=document.documentElement.getAttribute("data-theme");if(t)return t;return window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}
function tv(el){
  var sym=el.getAttribute("data-tv");if(!sym)return;
  var box=document.createElement("div");box.className="tradingview-widget-container";
  var w=document.createElement("div");w.className="tradingview-widget-container__widget";box.appendChild(w);
  var s=document.createElement("script");s.type="text/javascript";s.async=true;
  s.src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
  s.text=JSON.stringify({symbol:sym,width:"100%",height:el.getAttribute("data-h")||220,locale:"en",dateRange:"12M",colorTheme:theme(),isTransparent:true,autosize:true,largeChartUrl:"",noTimeScale:false,chartOnly:false,trendLineColor:"rgba(42,120,214,1)",underLineColor:"rgba(42,120,214,0.12)",underLineBottomColor:"rgba(42,120,214,0)"});
  box.appendChild(s);el.innerHTML="";el.appendChild(box);
}
function usd(v){if(!isFinite(v))return "n/a";var d=Math.abs(v)<100?2:0;return "$"+v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});}
function calc(el){
  var y=+el.getAttribute("data-yield")||0,n=+el.getAttribute("data-n")||4,inp=el.querySelector("input");
  function run(){var a=Math.max(0,+String(inp.value).replace(/[^\d.]/g,"")||0),yr=a*y/100;
    var set=function(k,v){var o=el.querySelector('[data-c="'+k+'"]');if(o)o.textContent=v;};
    set("yr",usd(yr));set("mo",usd(yr/12));set("wk",usd(yr/52));set("per",usd(yr/n));}
  inp.addEventListener("input",run);run();
  if(window.TopETFs){window.TopETFs.ready().then(function(d){var e=d&&d.all&&d.all[el.getAttribute("data-sym")];if(e&&e.yield!=null){y=e.yield;run();}});}
}
function init(){
  var t=document.querySelectorAll("[data-tv]");
  if(t.length){if("IntersectionObserver" in window){var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){io.unobserve(x.target);tv(x.target);}});},{rootMargin:"300px"});Array.prototype.forEach.call(t,function(el){io.observe(el);});}else Array.prototype.forEach.call(t,tv);}
  Array.prototype.forEach.call(document.querySelectorAll("[data-income-calc]"),calc);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
