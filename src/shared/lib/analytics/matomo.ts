export const DEFAULT_MATOMO_URL = 'https://metrika.neuroluv.ru/';
export const DEFAULT_MATOMO_SITE_ID = '1';

export type MatomoConfiguration = { url: string; siteId: string };

export function buildMatomoBootstrap(
	configuration: MatomoConfiguration,
	attributionParameters: readonly string[],
	catalogParameters: readonly string[],
): string {
	const url = new URL(configuration.url);
	if (
		url.protocol !== 'https:' ||
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		!/^[1-9]\d*$/u.test(configuration.siteId)
	) {
		throw new Error('Invalid public Matomo configuration');
	}
	const settings = JSON.stringify({
		url: `${url.href.replace(/\/+$/, '')}/`,
		siteId: configuration.siteId,
		attributionParameters,
		catalogParameters,
	}).replace(/</g, '\\u003c');

	// One shared bridge handles both the initial HTML and React navigations.
	// Keep this a stable string: /ai authorizes this exact script with a CSP hash.
	return `(function(){
if(window.location.hostname!=="neuroluv.ru"&&window.location.hostname!=="www.neuroluv.ru"){return;}
if(window.__neuroluvTrackMatomoPage){return;}
var settings=${settings};
var queue=window._paq=window._paq||[];
var attribution=new Set(settings.attributionParameters);
var catalog=new Set(settings.catalogParameters);
var searchPages={"/prompts":"Промпты","/news":"Новости","/articles":"Статьи","/ai/prompts":"Промпты Studio"};
var engineParameters=new Set(["q","query","text","p","search","wd","word"]);
var lastKey=null,lastUrl="",lastSearch="";
function keepAttribution(key){return key.indexOf("utm_")===0||key.indexOf("openstat_")===0||attribution.has(key);}
function privatePath(path){return path.replace(/^\\/ai\\/(works|share)\\/[^/]+/,"/ai/$1/item");}
function cleanUrl(value,externalReferrer){
try{
var url=new URL(value,window.location.href);
if(url.protocol!=="https:"&&url.protocol!=="http:"){return "";}
url.username="";url.password="";url.hash="";
var publicCatalog=Object.prototype.hasOwnProperty.call(searchPages,url.pathname);
Array.from(url.searchParams.keys()).forEach(function(name){
var key=name.toLowerCase();
var allowed=keepAttribution(key)||(externalReferrer&&engineParameters.has(key))||(publicCatalog&&catalog.has(key)&&key!=="q"&&key!=="search");
if(!allowed){url.searchParams.delete(name);}
});
url.pathname=privatePath(url.pathname);
return url.href;
}catch(error){return "";}
}
function cleanReferrer(value){
if(!value){return "";}
try{var url=new URL(value);var current=new URL(window.location.href);var sameSite=url.origin===current.origin||(url.hostname.endsWith(".neuroluv.ru")&&current.hostname.endsWith(".neuroluv.ru"))||((url.hostname==="neuroluv.ru"||url.hostname.endsWith(".neuroluv.ru"))&&(current.hostname==="neuroluv.ru"||current.hostname.endsWith(".neuroluv.ru")));return cleanUrl(value,!sameSite);}catch(error){return "";}
}
var landingReferrer=cleanReferrer(document.referrer);
function track(){
var raw=new URL(window.location.href);
var category=searchPages[raw.pathname]||"";
var keyword=category?(raw.searchParams.get("q")||raw.searchParams.get("search")||"").trim().slice(0,200):"";
var url=cleanUrl(raw.href,false);
var searchKey=keyword?JSON.stringify([raw.pathname,keyword]):"";
var key=JSON.stringify([raw.pathname,url,searchKey]);
if(key===lastKey){return;}
var title=document.title;
if(/^\\/ai\\/(works|share)\\//.test(raw.pathname)){title=raw.pathname.indexOf("/ai/works/")===0?"Моя работа — Нейролюб Studio":"Общая работа — Нейролюб Studio";}
queue.push(["setReferrerUrl",lastKey===null?landingReferrer:lastUrl]);
queue.push(["setCustomUrl",url]);
queue.push(["setDocumentTitle",title]);
if(searchKey&&searchKey!==lastSearch){queue.push(["trackSiteSearch",keyword,category]);}else{queue.push(["trackPageView"]);}
lastKey=key;lastUrl=url;lastSearch=searchKey;
}
window.__neuroluvTrackMatomoPage=track;
queue.push(["setTrackerUrl",settings.url+"matomo.php"]);
queue.push(["setSiteId",settings.siteId]);
queue.push(["setIgnoreClasses",["matomo-ignore-sensitive"]]);
queue.push(["enableLinkTracking"]);
document.addEventListener("click",function(event){
var target=event.target;
var anchor=target&&target.closest?target.closest("a[href]"):null;
if(!anchor){return;}
try{
var link=new URL(anchor.href,window.location.href);
var sensitive=/^\\/ai(?:\\/|$)/.test(window.location.pathname)||Array.from(link.searchParams.keys()).some(function(key){return /token|secret|password|signature|^x-amz-|^code$/i.test(key);});
if(sensitive){anchor.classList.add("matomo-ignore-sensitive");}
}catch(error){anchor.classList.add("matomo-ignore-sensitive");}
},true);
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",track,{once:true});}else{track();}
var script=document.createElement("script");script.async=true;script.src=settings.url+"matomo.js";
document.head.appendChild(script);
}());`;
}
