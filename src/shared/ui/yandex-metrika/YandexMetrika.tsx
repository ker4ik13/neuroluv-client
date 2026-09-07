import { Suspense } from "react";

import {
  buildYandexMetrikaBootstrap,
  isValidYandexMetrikaCounter,
} from "@/shared/lib/analytics/yandex-metrika";

import { YandexMetrikaRouteTracker } from "./YandexMetrikaRouteTracker";

type YandexMetrikaProps = {
  counterId: string;
};

export function YandexMetrikaHead({ counterId }: YandexMetrikaProps) {
  const normalizedCounterId = counterId.trim();

  if (!isValidYandexMetrikaCounter(normalizedCounterId)) {
    return null;
  }

  // Keep this native: next/script serializes beforeInteractive content into
  // Next's client queue, delaying analytics until the runtime starts.
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: buildYandexMetrikaBootstrap(normalizedCounterId, true),
      }}
      id={`yandex-metrika-${normalizedCounterId}`}
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
