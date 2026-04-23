/**
 * Image preprocessing for image→3D pipeline.
 *
 * Runs entirely in the browser (WebGPU / WASM) using `@huggingface/transformers`.
 * No paid APIs, no extra backend cost.
 *
 * Produces two cues that dramatically improve what a vision-LLM can infer about
 * the furniture geometry:
 *
 *   1. Silhouette / background-removed image — lets the model lock onto the
 *      object's outline and true extent without being distracted by the scene.
 *      Model: `Xenova/modnet` (MIT, ~25 MB).
 *
 *   2. Depth map — gives the vision model explicit relative-distance hints for
 *      each pixel, which it otherwise has to guess. Brighter = closer.
 *      Model: `onnx-community/depth-anything-v2-small` (Apache-2.0, ~50 MB).
 *
 * Both models are lazily imported and cached by transformers.js in IndexedDB,
 * so the first run is slow (~10–30s cold download) and subsequent runs are fast
 * (~300–800 ms). If WebGPU is unavailable we fall back to WASM automatically.
 *
 * The whole module is best-effort: if any stage fails we return the original
 * image URL and let the caller proceed with the single-image pipeline.
 */

const PREPROCESS_TARGET_SIZE = 512; // px — plenty for guiding a vision model, keeps base64 payload small

export interface PreprocessResult {
  /** Foreground cut-out as a data URL (PNG w/ alpha). Undefined if failed. */
  silhouetteDataUrl?: string;
  /** Depth map as data URL (grayscale PNG). Undefined if failed. */
  depthDataUrl?: string;
  /**
   * Dominant foreground colors as hex strings (#RRGGBB), ordered by prominence.
   * Extracted from the original image restricted to the background-removed mask,
   * so the colors are guaranteed to come from the furniture itself — never from
   * walls, floor, or props. Fed back to the vision model as a strong palette hint.
   */
  palette?: string[];
  /** Non-fatal warnings collected while running. */
  warnings: string[];
  /** Total time taken in ms. */
  elapsedMs: number;
}

// ─── Environment feature detection ────────────────────────────────────────

function hasWebGPU(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

// ─── Lazy pipeline cache ──────────────────────────────────────────────────
// We keep loaded pipelines in module scope so repeated previews reuse them.

type PipelineFn = (...args: unknown[]) => Promise<unknown>;

let _segmenterPromise: Promise<PipelineFn> | null = null;
let _depthPromise: Promise<PipelineFn> | null = null;

async function getSegmenter(): Promise<PipelineFn> {
  if (!_segmenterPromise) {
    _segmenterPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Allow remote model download; cache in IndexedDB.
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const device: "webgpu" | "wasm" = hasWebGPU() ? "webgpu" : "wasm";
      return (await pipeline("background-removal", "Xenova/modnet", {
        device,
      })) as unknown as PipelineFn;
    })().catch((err) => {
      _segmenterPromise = null; // allow retry next call
      throw err;
    });
  }
  return _segmenterPromise;
}

async function getDepthEstimator(): Promise<PipelineFn> {
  if (!_depthPromise) {
    _depthPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const device: "webgpu" | "wasm" = hasWebGPU() ? "webgpu" : "wasm";
      return (await pipeline(
        "depth-estimation",
        "onnx-community/depth-anything-v2-small",
        { device },
      )) as unknown as PipelineFn;
    })().catch((err) => {
      _depthPromise = null;
      throw err;
    });
  }
  return _depthPromise;
}

// ─── Canvas helpers ───────────────────────────────────────────────────────

async function loadHTMLImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Create a canvas with the source image drawn, scaled so its longest side is
 * `maxSize` while preserving aspect ratio. Returns the canvas + its 2D ctx.
 */
function drawToCanvas(
  img: HTMLImageElement | ImageBitmap,
  maxSize: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number } {
  const srcW = "naturalWidth" in img ? img.naturalWidth : img.width;
  const srcH = "naturalHeight" in img ? img.naturalHeight : img.height;
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

function canvasToDataUrl(canvas: HTMLCanvasElement, mime: string, quality?: number): string {
  return canvas.toDataURL(mime, quality);
}

// ─── Stage 1: silhouette (background removal) ─────────────────────────────

/**
 * Normalize an arbitrary transformers.js `background-removal` output into a
 * plain ImageBitmap / HTMLImageElement / {data, width, height} we can draw.
 */
async function silhouetteFromOutput(output: unknown): Promise<HTMLImageElement> {
  // Pipeline typically returns `RawImage[]` — first image is the cut-out with alpha.
  const first = Array.isArray(output) ? (output[0] as unknown) : output;
  if (!first) throw new Error("background-removal returned no image");

  // RawImage in transformers.js v3 exposes `.toBlob()` or is convertible via
  // `.toCanvas()`. We guard loosely because the type surface changes across versions.
  const maybeRaw = first as {
    toBlob?: () => Promise<Blob>;
    toCanvas?: () => HTMLCanvasElement;
    data?: Uint8ClampedArray | Uint8Array;
    width?: number;
    height?: number;
    channels?: number;
  };

  if (typeof maybeRaw.toBlob === "function") {
    const blob = await maybeRaw.toBlob();
    const url = URL.createObjectURL(blob);
    try {
      return await loadHTMLImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (typeof maybeRaw.toCanvas === "function") {
    const cvs = maybeRaw.toCanvas();
    return await loadHTMLImage(cvs.toDataURL("image/png"));
  }

  if (maybeRaw.data && maybeRaw.width && maybeRaw.height) {
    const { data, width, height, channels = 4 } = maybeRaw;
    const cvs = document.createElement("canvas");
    cvs.width = width;
    cvs.height = height;
    const ctx = cvs.getContext("2d")!;
    const imgData = ctx.createImageData(width, height);
    if (channels === 4) {
      imgData.data.set(data);
    } else if (channels === 3) {
      for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
        imgData.data[j] = data[i];
        imgData.data[j + 1] = data[i + 1];
        imgData.data[j + 2] = data[i + 2];
        imgData.data[j + 3] = 255;
      }
    } else {
      throw new Error(`Unsupported channel count: ${channels}`);
    }
    ctx.putImageData(imgData, 0, 0);
    return await loadHTMLImage(cvs.toDataURL("image/png"));
  }

  throw new Error("Unknown background-removal output shape");
}

interface SilhouetteOutput {
  /** Data URL for LLM consumption (foreground on light-gray bg, JPEG). */
  dataUrl: string;
  /**
   * Raw ImageData of the foreground-only cut-out (RGBA, alpha > 0 = foreground).
   * Used downstream for palette extraction without re-running segmentation.
   */
  rgba: ImageData;
}

async function runSilhouette(imageUrl: string): Promise<SilhouetteOutput> {
  const segmenter = await getSegmenter();
  const output = await segmenter(imageUrl);
  const img = await silhouetteFromOutput(output);

  // Step 1: draw the raw cut-out (preserves alpha channel) so we can read its pixels.
  const { canvas: rawCanvas, ctx: rawCtx, w, h } = drawToCanvas(img, PREPROCESS_TARGET_SIZE);
  const rgba = rawCtx.getImageData(0, 0, w, h);

  // Step 2: flatten on a neutral gray bg → JPEG to ship to the LLM.
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d")!;
  tctx.fillStyle = "#f4f4f5";
  tctx.fillRect(0, 0, w, h);
  tctx.drawImage(rawCanvas, 0, 0);
  const dataUrl = canvasToDataUrl(tmp, "image/jpeg", 0.85);

  return { dataUrl, rgba };
}

// ─── Stage 1b: palette extraction from the masked foreground ─────────────

function toHex(r: number, g: number, b: number): string {
  const h = (x: number) => x.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/**
 * Squared Euclidean distance in a rough perceptual space. We weight the
 * channels (2,4,3) to approximate human luminance perception — good enough
 * for merging near-duplicate colors without pulling in LAB conversion.
 */
function colorDist2(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

/**
 * Extract up to `maxColors` dominant hex colors from the masked foreground.
 *
 * Algorithm: histogram-quantize to 4 bits / channel (4096 buckets), sum RGBA
 * by bucket, pick the top N buckets by pixel count, then merge near-duplicates
 * using a perceptual distance threshold. Extremely fast (< 10 ms for 512×512)
 * and deterministic — no k-means randomness.
 */
function extractPaletteFromMasked(
  rgba: ImageData,
  options: { maxColors?: number; alphaThreshold?: number; mergeDist2?: number } = {},
): string[] {
  const maxColors = options.maxColors ?? 6;
  const alphaThreshold = options.alphaThreshold ?? 128;
  const mergeDist2 = options.mergeDist2 ?? 2400; // ~20 units in weighted RGB space

  const data = rgba.data;
  // Accumulate sum+count per 12-bit quantized color bucket.
  const sums = new Map<number, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < alphaThreshold) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // 4-bit quantization per channel → 12-bit key.
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = sums.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count++;
    } else {
      sums.set(key, { r, g, b, count: 1 });
    }
  }

  if (sums.size === 0) return [];

  // Sort buckets by pixel count, keep top 24 candidates for merging.
  const candidates = Array.from(sums.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 24)
    .map((s) => ({
      r: Math.round(s.r / s.count),
      g: Math.round(s.g / s.count),
      b: Math.round(s.b / s.count),
      count: s.count,
    }));

  // Greedy merge of perceptually-close colors, keeping highest count as anchor.
  const merged: typeof candidates = [];
  for (const c of candidates) {
    let found = false;
    for (const m of merged) {
      if (colorDist2(c.r, c.g, c.b, m.r, m.g, m.b) < mergeDist2) {
        // Update the merged centroid (weighted by counts).
        const total = m.count + c.count;
        m.r = Math.round((m.r * m.count + c.r * c.count) / total);
        m.g = Math.round((m.g * m.count + c.g * c.count) / total);
        m.b = Math.round((m.b * m.count + c.b * c.count) / total);
        m.count = total;
        found = true;
        break;
      }
    }
    if (!found) merged.push({ ...c });
  }

  merged.sort((a, b) => b.count - a.count);
  return merged.slice(0, maxColors).map((m) => toHex(m.r, m.g, m.b));
}

// ─── Stage 2: depth map ───────────────────────────────────────────────────

async function depthFromOutput(output: unknown): Promise<HTMLImageElement> {
  const obj = output as {
    depth?: {
      toBlob?: () => Promise<Blob>;
      toCanvas?: () => HTMLCanvasElement;
      data?: Uint8ClampedArray | Uint8Array | Float32Array;
      width?: number;
      height?: number;
    };
  };
  const d = obj?.depth;
  if (!d) throw new Error("depth pipeline returned no `depth` field");

  if (typeof d.toBlob === "function") {
    const blob = await d.toBlob();
    const url = URL.createObjectURL(blob);
    try {
      return await loadHTMLImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (typeof d.toCanvas === "function") {
    const cvs = d.toCanvas();
    return await loadHTMLImage(cvs.toDataURL("image/png"));
  }

  if (d.data && d.width && d.height) {
    const { data, width, height } = d;
    // Normalize floats → 0..255 grayscale
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1;
    const cvs = document.createElement("canvas");
    cvs.width = width;
    cvs.height = height;
    const ctx = cvs.getContext("2d")!;
    const imgData = ctx.createImageData(width, height);
    for (let i = 0, j = 0; i < data.length; i++, j += 4) {
      const g = Math.round(((data[i] - min) / range) * 255);
      imgData.data[j] = g;
      imgData.data[j + 1] = g;
      imgData.data[j + 2] = g;
      imgData.data[j + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return await loadHTMLImage(cvs.toDataURL("image/png"));
  }

  throw new Error("Unknown depth output shape");
}

async function runDepth(imageUrl: string): Promise<string> {
  const estimator = await getDepthEstimator();
  const output = await estimator(imageUrl);
  const img = await depthFromOutput(output);
  const { canvas } = drawToCanvas(img, PREPROCESS_TARGET_SIZE);
  return canvasToDataUrl(canvas, "image/jpeg", 0.85);
}

// ─── Public API ───────────────────────────────────────────────────────────

export interface PreprocessOptions {
  /** If true, skip silhouette extraction. */
  skipSilhouette?: boolean;
  /** If true, skip depth estimation. */
  skipDepth?: boolean;
  /** Optional per-stage timeout in ms (default 45s). */
  timeoutMs?: number;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Run silhouette + depth extraction in parallel.
 * Failures in either stage are caught — the other stage still tries.
 * This function is cheap to call repeatedly (pipelines + model weights are cached).
 */
export async function preprocessImage(
  imageUrl: string,
  options: PreprocessOptions = {},
): Promise<PreprocessResult> {
  const startedAt = performance.now();
  const warnings: string[] = [];
  const timeout = options.timeoutMs ?? 45_000;

  // Nothing we can do outside the browser — keep Node/Deno callers safe.
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      warnings: ["preprocessImage: not running in a browser, skipped"],
      elapsedMs: performance.now() - startedAt,
    };
  }

  const silP = options.skipSilhouette
    ? Promise.resolve<SilhouetteOutput | undefined>(undefined)
    : withTimeout(runSilhouette(imageUrl), timeout, "silhouette").catch((err: Error) => {
        warnings.push(`silhouette failed: ${err.message}`);
        return undefined;
      });

  const depP = options.skipDepth
    ? Promise.resolve<string | undefined>(undefined)
    : withTimeout(runDepth(imageUrl), timeout, "depth").catch((err: Error) => {
        warnings.push(`depth failed: ${err.message}`);
        return undefined;
      });

  const [silhouette, depthDataUrl] = await Promise.all([silP, depP]);

  // Palette extraction is a quick in-place op on the silhouette's RGBA pixels
  // — effectively free, and only possible when segmentation succeeded.
  let palette: string[] | undefined;
  if (silhouette) {
    try {
      const p = extractPaletteFromMasked(silhouette.rgba, { maxColors: 6 });
      if (p.length > 0) palette = p;
    } catch (err) {
      warnings.push(`palette extraction failed: ${(err as Error).message}`);
    }
  }

  return {
    silhouetteDataUrl: silhouette?.dataUrl,
    depthDataUrl,
    palette,
    warnings,
    elapsedMs: performance.now() - startedAt,
  };
}

/**
 * Warm up the models in the background without blocking the UI.
 * Safe to call from anywhere; no-ops on repeat calls.
 */
export function warmupPreprocess(): void {
  if (typeof window === "undefined") return;
  // Fire-and-forget; errors silently swallowed.
  void getSegmenter().catch(() => {});
  void getDepthEstimator().catch(() => {});
}
