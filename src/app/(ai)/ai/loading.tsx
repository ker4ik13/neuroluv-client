import { AiPage, AsyncState } from "@/widgets/ai-pages";

export default function Loading() {
  return (
    <AiPage>
      <AsyncState error={null} isLoading>
        <span />
      </AsyncState>
    </AiPage>
  );
}

