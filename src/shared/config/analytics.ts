import {
  DEFAULT_YANDEX_METRIKA_COUNTER_ID,
  resolveYandexMetrikaCounterId,
} from "@/shared/lib/analytics/yandex-metrika";

export const YANDEX_METRIKA_ID = resolveYandexMetrikaCounterId(
  process.env.YANDEX_METRIKA_ID,
  process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID,
  DEFAULT_YANDEX_METRIKA_COUNTER_ID,
);
