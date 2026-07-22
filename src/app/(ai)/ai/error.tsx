"use client";

import { useEffect } from "react";
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";

import { AiButton, AiCard, AiPage } from "@/widgets/ai-pages";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AI route render error", {
      digest: error.digest,
    });
  }, [error]);

  return (
    <AiPage>
      <AiCard>
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <FiAlertCircle aria-hidden="true" size={42} />
          <h1 style={{ marginTop: 12 }}>Не удалось открыть раздел</h1>
          <p style={{ margin: "10px auto 22px", maxWidth: 560 }}>
            Обновите данные. Если ошибка повторится, сообщите поддержке код{" "}
            {error.digest || "без кода"}.
          </p>
          <AiButton onClick={reset}>
            <FiRefreshCw aria-hidden="true" /> Повторить
          </AiButton>
        </div>
      </AiCard>
    </AiPage>
  );
}
