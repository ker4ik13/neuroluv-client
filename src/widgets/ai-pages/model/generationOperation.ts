export type AutomaticGenerationKind =
  | "image"
  | "video"
  | "text"
  | "photo-to-prompt";

export function resolveGenerationOperation({
  kind,
  supportedOperations,
  hasReference,
  requiresImageToImage = false,
}: {
  kind: AutomaticGenerationKind;
  supportedOperations: readonly string[];
  hasReference: boolean;
  requiresImageToImage?: boolean;
}): string | null {
  const supported = new Set(supportedOperations);

  if (kind === "photo-to-prompt") {
    return supported.has("photo_to_prompt") ? "photo_to_prompt" : null;
  }
  if (kind === "text") {
    return supported.has("text_generation") ? "text_generation" : null;
  }
  if (kind === "video") {
    if (hasReference && supported.has("image_to_video")) return "image_to_video";
    return supported.has("text_to_video") ? "text_to_video" : null;
  }
  if (!hasReference) {
    return supported.has("text_to_image") ? "text_to_image" : null;
  }
  if (supported.has("image_to_image")) return "image_to_image";
  if (!requiresImageToImage && supported.has("image_edit")) return "image_edit";
  return null;
}
