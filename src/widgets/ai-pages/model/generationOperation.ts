export type AutomaticGenerationKind =
  | "image"
  | "video"
  | "text"
  | "photo-to-prompt";

type PromptVideoMode = {
  code: string;
  imageInput?: "frame_images" | "input_references";
  minReferenceFiles: number;
  maxReferenceFiles: number;
  operation: "text_to_video" | "image_to_video";
};

export function resolvePromptVideoModeCode({
  maximumReferenceFiles,
  minimumReferenceFiles,
  modes,
}: {
  maximumReferenceFiles: number;
  minimumReferenceFiles: number;
  modes: readonly PromptVideoMode[] | undefined;
}): string | null {
  if (!modes?.length) return null;

  const minimum = Math.max(0, minimumReferenceFiles);
  const maximum = Math.max(minimum, maximumReferenceFiles);
  const acceptsReferences = minimum > 0 || maximum > 0;

  if (!acceptsReferences) {
    return (
      modes.find(
        (mode) =>
          mode.operation === "text_to_video" &&
          mode.minReferenceFiles === 0 &&
          mode.maxReferenceFiles === 0,
      )?.code || null
    );
  }

  const referenceMode = modes.find(
    (mode) =>
      mode.operation === "image_to_video" &&
      mode.imageInput === "input_references" &&
      mode.maxReferenceFiles >= minimum,
  );

  // A frame pair can contain at most the first and last frame. A catalog
  // prompt that requires 3+ inputs, or merely allows more than 2, describes
  // an input-reference workflow and must never open in frame mode.
  if (minimum >= 3 || maximum > 2) {
    return referenceMode?.code || null;
  }

  const frameMode = modes.find(
    (mode) =>
      mode.operation === "image_to_video" &&
      mode.imageInput === "frame_images" &&
      mode.minReferenceFiles <= Math.max(1, minimum) &&
      mode.maxReferenceFiles >= maximum,
  );

  return frameMode?.code || referenceMode?.code || null;
}

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
