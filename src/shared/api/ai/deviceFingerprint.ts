let fingerprintRequest: Promise<string> | null = null;

export function getAiDeviceFingerprint(): Promise<string> | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;
  fingerprintRequest ??= createFingerprint();
  return fingerprintRequest;
}

async function createFingerprint(): Promise<string> {
  const screenWidth = Math.max(window.screen.width, window.screen.height);
  const screenHeight = Math.min(window.screen.width, window.screen.height);
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  const values = [
    normalizedUserAgent(navigator.userAgent),
    navigator.platform || "",
    [...navigator.languages].join(","),
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    `${screenWidth}x${screenHeight}`,
    String(window.screen.colorDepth || 0),
    String(navigator.hardwareConcurrency || 0),
    String(navigatorWithMemory.deviceMemory || 0),
    String(navigator.maxTouchPoints || 0),
    window.matchMedia("(pointer: coarse)").matches ? "coarse" : "fine",
    window.matchMedia("(color-gamut: p3)").matches ? "p3" : "srgb",
    webGlIdentity(),
  ];
  const source = values.join("\u001f");

  try {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(source),
    );
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } catch {
    return fallbackHash(source);
  }
}

function normalizedUserAgent(userAgent: string): string {
  return userAgent
    .toLowerCase()
    .replace(/\b(version|chrome|crios|firefox|fxios|edg|safari)\/[\d._]+/g, "$1/#")
    .replace(/\b(android|cpu(?: iphone)? os|mac os x) [\d._]+/g, "$1 #")
    .replace(/\s+/g, " ")
    .trim();
}

function webGlIdentity(): string {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl");
    if (!context) return "";
    const extension = context.getExtension("WEBGL_debug_renderer_info");
    if (!extension) return `${context.getParameter(context.VENDOR)}:${context.getParameter(context.RENDERER)}`;
    return `${context.getParameter(extension.UNMASKED_VENDOR_WEBGL)}:${context.getParameter(extension.UNMASKED_RENDERER_WEBGL)}`;
  } catch {
    return "";
  }
}

function fallbackHash(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
  }
  return `${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`
    .repeat(4)
    .slice(0, 64);
}
