import type { Metadata } from "next";

import { getAiPublicPrompt } from "@/shared/api/ai/public";
import { PromptDetailPage } from "@/widgets/ai-pages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const prompt = await getAiPublicPrompt(slug);
  const canonical = `/ai/prompts/${encodeURIComponent(slug)}`;

  if (!prompt) {
    return { title: "Промпт", robots: { index: false, follow: false } };
  }

  const title = prompt.seoTitle || prompt.title;
  const description = prompt.seoDescription || prompt.description || prompt.excerpt || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      ...(prompt.imageUrl ? { images: [prompt.imageUrl] } : {}),
    },
    robots: {
      index: !prompt.seoNoindex,
      follow: !prompt.seoNofollow,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PromptDetailPage slug={slug} />;
}
