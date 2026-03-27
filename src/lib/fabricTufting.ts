import * as THREE from "three";
import type { PanelData } from "@/lib/furnitureData";

/**
 * Biscuit tufting + vertical channel tufting (plush sofa backrest look).
 * Only for fabric on mattresses, cushions, and similar soft seating — not arms, bases, etc.
 */
export function panelShouldHaveFabricTufting(panel: PanelData, materialId: string): boolean {
  if (materialId.includes("leather")) return false;
  if (materialId.includes("cane") || materialId.includes("rattan")) return false;
  const sh = panel.shape ?? "box";
  const lab = panel.label.toLowerCase();

  if (/\b(headboard|footboard|wall panel|modesty)\b/.test(lab)) return false;
  if (/\b(bistro|cafe)\b/.test(lab) && /\bseat\b/.test(lab)) return false;

  if (sh === "mattress") return true;

  if (sh !== "cushion") return false;

  if (/\b(base|left arm|right arm|arm\b|skirt|frame|side rail|rail\b)\b/.test(lab)) return false;

  return (
    /\b(seat|pillow|cushion|mattress|backrest|chaise|ottoman|throw|body pillow|loft)\b/.test(lab) ||
    /\bback\b/.test(lab)
  );
}

/** Vertical channels on back cushions; biscuit grid on seats / tops / pillows. */
export function tuftStyleForPanel(panel: PanelData): "biscuit" | "channel_v" {
  const lab = panel.label.toLowerCase();
  if (/\b(backrest|upper back|lower back|lumbar)\b/.test(lab)) return "channel_v";
  if (/\bback\b/.test(lab) && !/\bseat\b/.test(lab)) return "channel_v";
  return "biscuit";
}

/**
 * Physical spans (m) that drive tuft cell count and fabric UV repeat on the main visible face.
 * Back cushions use width × height; seats and tops use width × depth.
 */
export function fabricRepeatSpans(panel: PanelData): { su: number; sv: number } {
  const [w, h, d] = panel.size;
  const lab = panel.label.toLowerCase();
  const backCushion =
    /\b(backrest|upper back|lower back|lumbar)\b/.test(lab) ||
    /\bseat\s+back\b/.test(lab) ||
    (/\bback\b/.test(lab) &&
      !/\bseat\b/.test(lab) &&
      (panel.shape === "cushion" || panel.shape === "mattress"));

  if (panel.shape === "mattress") return { su: w, sv: d };
  if (backCushion) {
    return { su: w, sv: h };
  }
  return { su: w, sv: d };
}

export function tuftGridForPanel(panel: PanelData): { cellsU: number; cellsV: number } {
  const { su, sv } = fabricRepeatSpans(panel);
  const style = tuftStyleForPanel(panel);
  const step = style === "channel_v" ? 0.14 : 0.152;
  const maxC = 16;
  const minC = 3;
  return {
    cellsU: Math.min(maxC, Math.max(minC, Math.round(su / step))),
    cellsV: Math.min(maxC, Math.max(minC, Math.round(sv / step))),
  };
}

function distToNearestCellCorner(u: number, v: number, cu: number, cv: number): number {
  let gx = u * cu;
  let gy = v * cv;
  gx -= Math.floor(gx);
  gy -= Math.floor(gy);
  const d00 = Math.hypot(gx, gy);
  const d10 = Math.hypot(1 - gx, gy);
  const d01 = Math.hypot(gx, 1 - gy);
  const d11 = Math.hypot(1 - gx, 1 - gy);
  return Math.min(d00, d10, d01, d11);
}

/** Distance to nearest vertical seam (channel) in UV — grooves at u = k/cu. */
function distToVerticalSeam(u: number, cu: number): number {
  let uu = u % 1;
  if (uu < 0) uu += 1;
  const fu = (uu * cu) % 1;
  const frac = fu < 0 ? fu + 1 : fu;
  return Math.min(frac, 1 - frac);
}

function tuftDepthAt(
  u: number,
  v: number,
  cu: number,
  cv: number,
  uPhase: number,
  vPhase: number,
  style: "biscuit" | "channel_v",
): number {
  let uu = (u + uPhase) % 1;
  let vv = (v + vPhase) % 1;
  if (uu < 0) uu += 1;
  if (vv < 0) vv += 1;

  if (style === "channel_v") {
    const ds = distToVerticalSeam(uu, cu);
    const alongV = 0.04 * Math.sin(vv * Math.PI * 2 * 0.5);
    const core = -Math.exp(-((ds / 0.092) ** 2)) * 0.44;
    return core * (1 + alongV);
  }

  const dc = distToNearestCellCorner(uu, vv, cu, cv);
  return -Math.exp(-((dc / 0.168) ** 2)) * 0.29;
}

function hashPanelId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h;
}

function cloneCanvasFromTexture(tex: THREE.CanvasTexture): HTMLCanvasElement {
  const src = tex.image as HTMLCanvasElement;
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  return c;
}

function canvasTextureLike(
  source: THREE.CanvasTexture,
  canvas: HTMLCanvasElement,
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = source.wrapS;
  t.wrapT = source.wrapT;
  t.repeat.copy(source.repeat);
  t.offset.copy(source.offset);
  t.center.copy(source.center);
  t.rotation = source.rotation;
  t.generateMipmaps = source.generateMipmaps;
  t.minFilter = source.minFilter;
  t.magFilter = source.magFilter;
  t.anisotropy = source.anisotropy;
  t.colorSpace = source.colorSpace;
  t.needsUpdate = true;
  return t;
}

export function cloneFabricTexturesWithTufting(
  base: {
    map: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  },
  panel: PanelData,
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const style = tuftStyleForPanel(panel);
  const { cellsU, cellsV } = tuftGridForPanel(panel);
  const h = hashPanelId(panel.id);
  const uPhase = ((h & 0xffff) / 0xffff) * 0.06 - 0.03;
  const vPhase = (((h >>> 16) & 0xffff) / 0xffff) * 0.06 - 0.03;

  const bumpScale = style === "channel_v" ? 8.4 : 6.85;
  const shadeK = style === "channel_v" ? 0.74 : 0.66;

  const mapCanvas = cloneCanvasFromTexture(base.map);
  const normalCanvas = cloneCanvasFromTexture(base.normalMap);
  const roughCanvas = cloneCanvasFromTexture(base.roughnessMap);

  const W = mapCanvas.width;
  const H = mapCanvas.height;
  const mapCtx = mapCanvas.getContext("2d")!;
  const nCtx = normalCanvas.getContext("2d")!;
  const rCtx = roughCanvas.getContext("2d")!;

  const mapData = mapCtx.getImageData(0, 0, W, H);
  const nData = nCtx.getImageData(0, 0, W, H);
  const rData = rCtx.getImageData(0, 0, W, H);
  const md = mapData.data;
  const nd = nData.data;
  const rd = rData.data;

  const sampleZ = (tx: number, ty: number): number => {
    const u = (tx + 0.5) / W;
    const v = (ty + 0.5) / H;
    return tuftDepthAt(u, v, cellsU, cellsV, uPhase, vPhase, style);
  };

  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const i = (ty * W + tx) * 4;
      const zc = sampleZ(tx, ty);
      const zlx = sampleZ(Math.max(0, tx - 1), ty);
      const zrx = sampleZ(Math.min(W - 1, tx + 1), ty);
      const zdy = sampleZ(tx, Math.max(0, ty - 1));
      const zuy = sampleZ(tx, Math.min(H - 1, ty + 1));
      const dzx = (zrx - zlx) * 0.5;
      const dzy = (zuy - zdy) * 0.5;

      const shade = 1 + zc * shadeK;
      md[i] = Math.max(0, Math.min(255, Math.round(md[i] * shade)));
      md[i + 1] = Math.max(0, Math.min(255, Math.round(md[i + 1] * shade)));
      md[i + 2] = Math.max(0, Math.min(255, Math.round(md[i + 2] * shade)));

      let nx = (nd[i] / 255) * 2 - 1;
      let ny = (nd[i + 1] / 255) * 2 - 1;
      let nz = (nd[i + 2] / 255) * 2 - 1;
      nx -= dzx * bumpScale;
      ny -= dzy * bumpScale;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      nd[i] = Math.round((nx * 0.5 + 0.5) * 255);
      nd[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nd[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);

      const roughAdd = (-zc) * (style === "channel_v" ? 108 : 98);
      const rv = rd[i] + roughAdd;
      rd[i] = rd[i + 1] = rd[i + 2] = Math.max(128, Math.min(250, Math.round(rv)));
    }
  }

  mapCtx.putImageData(mapData, 0, 0);
  nCtx.putImageData(nData, 0, 0);
  rCtx.putImageData(rData, 0, 0);

  return {
    map: canvasTextureLike(base.map, mapCanvas),
    normalMap: canvasTextureLike(base.normalMap, normalCanvas),
    roughnessMap: canvasTextureLike(base.roughnessMap, roughCanvas),
  };
}
