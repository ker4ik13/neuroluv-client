import {
  ANALYTICS_DIAGNOSTIC_QUERY_PARAMETER_NAMES,
  ATTRIBUTION_QUERY_PARAMETER_NAMES,
  METRIKA_ROUTE_QUERY_PARAMETER_NAMES,
} from "./tracking-query";

export type YandexMetrikaLanding = {
  referer: string;
  url: string;
};

// Counter IDs are public and visible in rendered HTML. Keep the production ID
// as a final fallback so analytics cannot silently disappear after an env or
// deployment configuration change.
export const DEFAULT_YANDEX_METRIKA_COUNTER_ID = "110430749";

export function isValidYandexMetrikaCounter(counterId: string): boolean {
  return /^\d{1,20}$/u.test(counterId.trim());
}

export function resolveYandexMetrikaCounterId(
  ...candidates: unknown[]
): string {
  for (const candidate of candidates) {
    const counterId =
      typeof candidate === "number" || typeof candidate === "string"
        ? String(candidate).trim()
        : "";

    if (isValidYandexMetrikaCounter(counterId)) {
      return counterId;
    }
  }

  return "";
}

export function buildYandexMetrikaBootstrap(
  counterId: string,
  webvisor = true,
): string {
  const normalizedCounterId = counterId.trim();

  if (!isValidYandexMetrikaCounter(normalizedCounterId)) {
    return "";
  }

  const exactQueryParameters = JSON.stringify([
    ...ATTRIBUTION_QUERY_PARAMETER_NAMES,
    ...ANALYTICS_DIAGNOSTIC_QUERY_PARAMETER_NAMES,
    ...METRIKA_ROUTE_QUERY_PARAMETER_NAMES,
  ]);

  return `(function(){var exact=new Set(${exactQueryParameters});function keep(name){var key=String(name).toLowerCase();return key.indexOf("utm_")===0||key.indexOf("openstat_")===0||exact.has(key);}function clean(value){try{var url=new URL(value,window.location.href);Array.from(url.searchParams.keys()).forEach(function(key){if(!keep(key)){url.searchParams.delete(key);}});url.hash="";return url.href;}catch(error){return window.location.origin+window.location.pathname;}}function cleanReferer(value){if(!value){return "";}try{var referer=new URL(value);var current=new URL(window.location.href);var refererHost=referer.hostname;var currentHost=current.hostname;var sameSite=referer.origin===current.origin||((refererHost==="neuroluv.ru"||refererHost.endsWith(".neuroluv.ru"))&&(currentHost==="neuroluv.ru"||currentHost.endsWith(".neuroluv.ru")));return sameSite?clean(referer.href):referer.href;}catch(error){return "";}}var landing=window.__neuroluvMetrikaLanding=window.__neuroluvMetrikaLanding||{url:clean(window.location.href),referer:cleanReferer(document.referrer)};(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${normalizedCounterId},"init",{accurateTrackBounce:true,clickmap:true,defer:true,trackLinks:true,webvisor:${webvisor ? "true" : "false"}});var hitOptions={title:document.title};if(landing.referer){hitOptions.referer=landing.referer;}ym(${normalizedCounterId},"hit",landing.url,hitOptions);}());`;
}
