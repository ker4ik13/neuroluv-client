type ClipboardImageErrorCode =
  | "insecure_context"
  | "unsupported"
  | "download_failed"
  | "invalid_image"
  | "conversion_failed"
  | "write_failed";

export class ClipboardImageError extends Error {
  readonly code: ClipboardImageErrorCode;

  constructor(code: ClipboardImageErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "ClipboardImageError";
    this.code = code;
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(
        new ClipboardImageError(
          "conversion_failed",
          "Браузер не смог подготовить изображение для копирования.",
        ),
      );
    }, "image/png");
  });
}

function drawImageToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<Blob> {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new ClipboardImageError(
      "invalid_image",
      "Не удалось определить размер изображения.",
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new ClipboardImageError(
      "conversion_failed",
      "Браузер не поддерживает подготовку изображения к копированию.",
    );
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvasToPngBlob(canvas);
}

async function convertWithImageElement(blob: Blob): Promise<Blob> {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.decoding = "async";
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(
          new ClipboardImageError(
            "invalid_image",
            "Полученный файл не удалось открыть как изображение.",
          ),
        );
      element.src = objectUrl;
    });

    return drawImageToCanvas(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function convertToPng(blob: Blob): Promise<Blob> {
  if (
    blob.type &&
    !blob.type.startsWith("image/") &&
    blob.type !== "application/octet-stream"
  ) {
    throw new ClipboardImageError(
      "invalid_image",
      "По этой ссылке получен не файл изображения.",
    );
  }

  if (blob.type === "image/png") return blob;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);

      try {
        return await drawImageToCanvas(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    } catch (error) {
      if (error instanceof ClipboardImageError) throw error;
      // Safari and older Chromium versions do not decode every image type here.
      // The regular image element below supports a wider set of decoders.
    }
  }

  return convertWithImageElement(blob);
}

async function fetchClipboardImage(
  url: string,
  requestInit?: Pick<RequestInit, "credentials" | "headers">,
): Promise<Blob> {
  let response: Response;

  try {
    response = await fetch(url, requestInit);
  } catch (error) {
    throw new ClipboardImageError(
      "download_failed",
      "Не удалось загрузить изображение для копирования.",
      error,
    );
  }

  if (!response.ok) {
    throw new ClipboardImageError(
      "download_failed",
      "Не удалось загрузить изображение для копирования.",
    );
  }

  return convertToPng(await response.blob());
}

/**
 * Copies image pixels rather than its URL.
 *
 * Keep this function call directly inside a click/keyboard handler. Passing a
 * Promise to ClipboardItem lets Safari retain the transient user activation
 * while the image is downloaded and converted to PNG.
 */
export function writeClipboardImage(
  url: string,
  requestInit?: Pick<RequestInit, "credentials" | "headers">,
): Promise<void> {
  if (!window.isSecureContext) {
    return Promise.reject(
      new ClipboardImageError(
        "insecure_context",
        "Копирование изображений доступно только через HTTPS.",
      ),
    );
  }

  if (
    typeof ClipboardItem === "undefined" ||
    typeof navigator.clipboard?.write !== "function"
  ) {
    return Promise.reject(
      new ClipboardImageError(
        "unsupported",
        "Этот браузер не поддерживает копирование изображений. Скачайте файл.",
      ),
    );
  }

  const pngPromise = fetchClipboardImage(url, requestInit);
  let writePromise: Promise<void>;

  try {
    writePromise = navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngPromise }),
    ]);
  } catch (error) {
    // Prevent an unhandled rejection when ClipboardItem construction fails
    // before the browser starts awaiting the image promise.
    void pngPromise.catch(() => undefined);
    return Promise.reject(
      new ClipboardImageError(
        "write_failed",
        "Не удалось скопировать изображение. Скачайте файл и попробуйте снова.",
        error,
      ),
    );
  }

  return writePromise.catch((error: unknown) => {
    if (error instanceof ClipboardImageError) throw error;

    throw new ClipboardImageError(
      "write_failed",
      "Не удалось скопировать изображение. Разрешите доступ к буферу обмена или скачайте файл.",
      error,
    );
  });
}
