import Script from "next/script";
import { Suspense } from "react";

import {
  buildYandexMetrikaBootstrap,
  isValidYandexMetrikaCounter,
} from "@/shared/lib/analytics/yandex-metrika";

import { YandexMetrikaRouteTracker } from "./YandexMetrikaRouteTracker";

// This component is rendered only from the App Router root layout. The rule
// cannot infer that through the shared component boundary.
/* eslint-disable @next/next/no-before-interactive-script-outside-document */

type YandexMetrikaProps = {
  counterId: string;
};

export function YandexMetrikaHead({ counterId }: YandexMetrikaProps) {
  const normalizedCounterId = counterId.trim();

  if (!isValidYandexMetrikaCounter(normalizedCounterId)) {
    return null;
  }

  return (
    <Script
      dangerouslySetInnerHTML={{
        __html: buildYandexMetrikaBootstrap(normalizedCounterId, true),
      }}
      id={`yandex-metrika-${normalizedCounterId}`}
      strategy="beforeInteractive"
    />
  );
}

export function YandexMetrika({ counterId }: YandexMetrikaProps) {
  const normalizedCounterId = counterId.trim();

  if (!isValidYandexMetrikaCounter(normalizedCounterId)) {
    return null;
  }

  return (
    <>
      <Suspense fallback={null}>
        <YandexMetrikaRouteTracker counterId={normalizedCounterId} />
      </Suspense>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            height="1"
            src={`https://mc.yandex.ru/watch/${normalizedCounterId}`}
            style={{ left: "-9999px", position: "absolute" }}
            width="1"
          />
        </div>
      </noscript>
    </>
  );
}
