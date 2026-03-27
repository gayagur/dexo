import * as THREE from "three";

// Cache to avoid regenerating textures
const textureCache = new Map<string, { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture }>();

const TEX_SIZE = 1024;

/** Get or create PBR textures for a material */
export function getMaterialTextures(materialId: string, baseColor: string, category: string): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} | null {
  // Skip textures for glass — it uses transmission
  if (category === "Glass") return null;

  const cacheKey = `v8_${materialId}_${baseColor}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  let result;
  switch (category) {
    case "Wood":
      result = generateWoodTextures(baseColor, materialId);
      break;
    case "Engineered":
      result = generateEngineeredTextures(baseColor, materialId);
      break;
    case "Metal":
      result = generateMetalTextures(baseColor, materialId);
      break;
    case "Stone":
      result = generateStoneTextures(baseColor, materialId);
      break;
    case "Fabric":
      result = generateFabricTextures(baseColor, materialId);
      break;
    default:
      return null;
  }

  if (result) {
    // Configure all textures for tiling + high-quality filtering
    [result.map, result.normalMap, result.roughnessMap].forEach(tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 8; // sharper at oblique angles (grain on tabletops)
      tex.needsUpdate = true;
    });
    result.map.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(cacheKey, result);
  }

  return result;
}

// ─── Helper: parse hex color ──────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

// Simple seeded random for deterministic patterns
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d")!;
  return [canvas, ctx];
}

// ─── Noise primitives for photorealistic procedural textures ───

/** Integer hash — fast, deterministic, no state */
function ihash(x: number, y: number, s: number): number {
  let h = ((x * 374761393 + y * 668265263 + s * 1013904223) | 0) >>> 0;
  h = (((h >> 13) ^ h) * 1274126177) >>> 0;
  return (h & 0x7fffffff) / 0x7fffffff; // 0..1
}

/** Bicubic-smooth value noise (seamless integer lattice) */
function vnoise(x: number, y: number, s: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  // Quintic interpolation (Ken Perlin's improved smoothstep)
  const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = ihash(ix, iy, s), b = ihash(ix + 1, iy, s);
  const c = ihash(ix, iy + 1, s), d = ihash(ix + 1, iy + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Fractal Brownian Motion — stacks octaves for organic detail */
function fbm(x: number, y: number, s: number, octaves: number, lacunarity = 2.0, gain = 0.5): number {
  let value = 0, amplitude = 1, frequency = 1, maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * vnoise(x * frequency, y * frequency, s + i * 7919);
    maxAmp += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / maxAmp;
}

/** Domain-warped FBM — distorts coordinates with another fbm for ultra-organic look */
function warpedFbm(x: number, y: number, s: number, octaves: number): number {
  const wx = fbm(x + 1.7, y + 9.2, s + 31, 3) * 4.0;
  const wy = fbm(x + 8.3, y + 2.8, s + 67, 3) * 4.0;
  return fbm(x + wx, y + wy, s, octaves);
}

// ─── WOOD TEXTURES — natural flowing grain with knot eyes ──────
function generateWoodTextures(baseColor: string, materialId: string) {
  const [br, bg, bb] = hexToRgb(baseColor);
  const seed = materialId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);

  // ── Knot/eye features: 2-4 organic focal points where grain flows around ──
  const knotCount = 2 + Math.floor(rand() * 3);
  const knots: { cx: number; cy: number; rx: number; ry: number; strength: number }[] = [];
  for (let i = 0; i < knotCount; i++) {
    knots.push({
      cx: 0.15 + rand() * 0.7,              // x position (normalized)
      cy: 0.1 + rand() * 0.8,               // y position
      rx: 0.06 + rand() * 0.10,             // horizontal radius (wide ovals)
      ry: 0.03 + rand() * 0.06,             // vertical radius (shorter)
      strength: 0.5 + rand() * 0.5,         // how strongly grain warps around it
    });
  }

  // ── Buffers ──
  const heightMap = new Float32Array(TEX_SIZE * TEX_SIZE);
  const [colorCanvas, colorCtx] = createCanvas();
  const imgData = colorCtx.createImageData(TEX_SIZE, TEX_SIZE);
  const px = imgData.data;

  for (let py = 0; py < TEX_SIZE; py++) {
    for (let px_ = 0; px_ < TEX_SIZE; px_++) {
      const idx = (py * TEX_SIZE + px_) * 4;
      const u = px_ / TEX_SIZE;
      const v = py / TEX_SIZE;

      // === 1. Knot-warped coordinates ===
      // Grain flows around knots like water around stones
      let warpU = u;
      let warpV = v;
      let knotDarkening = 0;
      for (const k of knots) {
        const dx = (u - k.cx) / k.rx;
        const dy = (v - k.cy) / k.ry;
        const dist2 = dx * dx + dy * dy;
        const dist = Math.sqrt(dist2);
        if (dist < 3.0) {
          // Push grain lines away from knot center (radial displacement)
          const falloff = Math.exp(-dist2 * 0.8) * k.strength;
          const angle = Math.atan2(dy, dx);
          // Deflect vertically (grain bends up/down around knot)
          warpV += Math.sin(angle) * falloff * 0.12;
          // Compress grain near knot edges (lines bunch together)
          warpU += Math.cos(angle) * falloff * 0.04;
          // Darken inside knot eye
          if (dist < 1.0) {
            knotDarkening += (1.0 - dist) * 0.10 * k.strength;
          }
        }
      }

      // === 2. Organic domain warp (flowing, not mechanical) ===
      const warp1 = fbm(warpU * 2.5, warpV * 1.2, seed, 3, 2.0, 0.45) * 0.20;
      const warp2 = fbm(warpU * 2.0 + 5.3, warpV * 1.0 + 3.1, seed + 41, 2, 2.0, 0.4) * 0.12;
      const wu = warpU + warp2;
      const wv = warpV + warp1;

      // === 3. Multi-frequency grain lines (horizontal, flowing) ===
      // Wide bands — the dominant visual pattern
      const grain1 = Math.sin(wv * 18.0) * 0.5 + 0.5;
      // Medium detail — fills space between wide bands
      const grain2 = Math.sin(wv * 38.0 + wu * 1.5) * 0.5 + 0.5;
      // Fine lines — tight grain detail visible up close
      const grain3 = Math.sin(wv * 72.0 + wu * 2.0) * 0.5 + 0.5;
      // Sub-grain texture — very fine shimmer
      const grain4 = Math.sin(wv * 140.0 + wu * 3.0) * 0.5 + 0.5;

      // Grain density varies across surface (some areas tight, some open)
      const densityVar = fbm(u * 1.5, v * 0.8, seed + 200, 2, 2.0, 0.4);
      // Where density is high, fine grain shows more; where low, only wide bands
      const fineWeight = 0.08 + densityVar * 0.12;
      const grainVal = grain1 * 0.42 + grain2 * 0.30 + grain3 * fineWeight + grain4 * 0.04;

      // === 4. Long flowing fiber streaks ===
      const fiberWarp = fbm(wu * 1.5, wv * 0.4, seed + 500, 2, 2.0, 0.35) * 0.4;
      const fiber = fbm(wu * 2.0 + fiberWarp, wv * 18.0, seed + 100, 3, 2.2, 0.5);
      const fiberMod = (fiber - 0.5) * 0.04;

      // === 5. Broad tonal drift (warm patches, cool patches) ===
      const drift = warpedFbm(u * 0.7, v * 0.5, seed + 300, 3);
      const driftMod = (drift - 0.5) * 0.06;

      // === Combine ===
      const grainDark = grainVal * 0.12; // ~12% contrast — clearly visible grain
      const mod = 1.0 - grainDark + driftMod + fiberMod - knotDarkening;

      // Warmth: grain lines and knots get amber push
      const warmth = (grainVal * 0.6 + knotDarkening * 3.0) * 5.0;
      const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
      px[idx]     = clamp(br * mod + warmth);
      px[idx + 1] = clamp(bg * mod + warmth * 0.35);
      px[idx + 2] = clamp(bb * mod - warmth * 0.15);
      px[idx + 3] = 255;

      // Height map — grain + knot depression
      heightMap[py * TEX_SIZE + px_] =
        grainVal * 0.3 +
        fiber * 0.1 -
        knotDarkening * 0.4;
    }
  }

  // Dither to break banding
  const microRand = seededRandom(seed + 999);
  for (let i = 0; i < px.length; i += 4) {
    const n = (microRand() - 0.5) * 3.0;
    px[i]     = Math.max(0, Math.min(255, px[i] + n));
    px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + n * 0.8));
    px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + n * 0.5));
  }
  colorCtx.putImageData(imgData, 0, 0);

  // ── Normal map — Sobel, moderate strength ──
  const [normalCanvas, normalCtx] = createCanvas();
  const nd = normalCtx.createImageData(TEX_SIZE, TEX_SIZE);
  const nStr = 2.8;
  for (let py = 1; py < TEX_SIZE - 1; py++) {
    for (let px_ = 1; px_ < TEX_SIZE - 1; px_++) {
      const o = (py * TEX_SIZE + px_) * 4;
      const h = (yy: number, xx: number) => heightMap[yy * TEX_SIZE + xx];
      const tl = h(py-1,px_-1), tc = h(py-1,px_), tr = h(py-1,px_+1);
      const ml = h(py,px_-1),                       mr = h(py,px_+1);
      const bl = h(py+1,px_-1), bc = h(py+1,px_), brc = h(py+1,px_+1);
      const ddx = (tr + 2*mr + brc) - (tl + 2*ml + bl);
      const ddy = (bl + 2*bc + brc) - (tl + 2*tc + tr);
      const nx = -ddx * nStr, ny = -ddy * nStr, nz = 1.0;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
      nd.data[o]   = Math.round(((nx/len)*0.5+0.5)*255);
      nd.data[o+1] = Math.round(((ny/len)*0.5+0.5)*255);
      nd.data[o+2] = Math.round(((nz/len)*0.5+0.5)*255);
      nd.data[o+3] = 255;
    }
  }
  for (let x = 0; x < TEX_SIZE; x++) {
    const top = (0*TEX_SIZE+x)*4, row1 = (1*TEX_SIZE+x)*4;
    nd.data[top]=nd.data[row1]; nd.data[top+1]=nd.data[row1+1]; nd.data[top+2]=nd.data[row1+2]; nd.data[top+3]=255;
    const bot = ((TEX_SIZE-1)*TEX_SIZE+x)*4, rowN = ((TEX_SIZE-2)*TEX_SIZE+x)*4;
    nd.data[bot]=nd.data[rowN]; nd.data[bot+1]=nd.data[rowN+1]; nd.data[bot+2]=nd.data[rowN+2]; nd.data[bot+3]=255;
  }
  normalCtx.putImageData(nd, 0, 0);

  // ── Roughness map — soft matte with grain-following micro-variation ──
  const [roughCanvas, roughCtx] = createCanvas();
  const rd = roughCtx.createImageData(TEX_SIZE, TEX_SIZE);
  for (let py = 0; py < TEX_SIZE; py++) {
    for (let px_ = 0; px_ < TEX_SIZE; px_++) {
      const i = (py * TEX_SIZE + px_) * 4;
      const u = px_ / TEX_SIZE, v = py / TEX_SIZE;
      // Soft matte base (~0.72-0.85)
      let rough = 200; // ~0.78
      // Grain-aligned variation
      const grainVar = vnoise(u * 3, v * 14, seed + 800);
      rough += (grainVar - 0.5) * 18;
      // Micro-roughness
      const micro = vnoise(u * 16, v * 16, seed + 900);
      rough += (micro - 0.5) * 8;
      rd.data[i] = rd.data[i+1] = rd.data[i+2] = Math.max(175, Math.min(220, Math.round(rough)));
      rd.data[i+3] = 255;
    }
  }
  roughCtx.putImageData(rd, 0, 0);

  return {
    map: new THREE.CanvasTexture(colorCanvas),
    normalMap: new THREE.CanvasTexture(normalCanvas),
    roughnessMap: new THREE.CanvasTexture(roughCanvas),
  };
}

// ─── ENGINEERED (LAMINATE/MELAMINE) TEXTURES ──────────
function generateEngineeredTextures(baseColor: string, materialId: string) {
  const [r, g, b] = hexToRgb(baseColor);
  const seed = materialId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const isLaminate = materialId.includes("laminate");

  const [colorCanvas, colorCtx] = createCanvas();
  colorCtx.fillStyle = baseColor;
  colorCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  if (isLaminate) {
    // Laminate has subtle wood-like grain
    for (let i = 0; i < 40; i++) {
      const y = rand() * TEX_SIZE;
      const darkness = 0.92 + rand() * 0.06;
      colorCtx.strokeStyle = rgbToHex(r * darkness, g * darkness, b * darkness);
      colorCtx.lineWidth = 0.5 + rand() * 1.5;
      colorCtx.beginPath();
      colorCtx.moveTo(0, y);
      for (let x = 0; x < TEX_SIZE; x += 30) {
        colorCtx.lineTo(x, y + Math.sin(x * 0.01) * 2);
      }
      colorCtx.stroke();
    }
  } else {
    // Melamine: very subtle speckle
    const imageData = colorCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (rand() - 0.5) * 6;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
    }
    colorCtx.putImageData(imageData, 0, 0);
  }

  // Flat normal (no grain)
  const [normalCanvas, normalCtx] = createCanvas();
  normalCtx.fillStyle = "rgb(128,128,255)"; // flat normal
  normalCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Smooth roughness
  const [roughCanvas, roughCtx] = createCanvas();
  roughCtx.fillStyle = isLaminate ? "#999" : "#888"; // smoother than wood
  roughCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  return {
    map: new THREE.CanvasTexture(colorCanvas),
    normalMap: new THREE.CanvasTexture(normalCanvas),
    roughnessMap: new THREE.CanvasTexture(roughCanvas),
  };
}

// ─── METAL TEXTURES ───────────────────────────────────
function generateMetalTextures(baseColor: string, materialId: string) {
  const [r, g, b] = hexToRgb(baseColor);
  const seed = materialId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const isBrushed = materialId === "steel" || materialId === "brass" || materialId === "copper";

  const [colorCanvas, colorCtx] = createCanvas();
  colorCtx.fillStyle = baseColor;
  colorCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  if (isBrushed) {
    // Brushed metal: horizontal scratch lines
    for (let i = 0; i < 300; i++) {
      const y = rand() * TEX_SIZE;
      const brightness = 0.9 + rand() * 0.2;
      colorCtx.strokeStyle = rgbToHex(
        Math.min(255, r * brightness),
        Math.min(255, g * brightness),
        Math.min(255, b * brightness)
      );
      colorCtx.lineWidth = 0.3 + rand() * 0.5;
      colorCtx.globalAlpha = 0.3 + rand() * 0.4;
      colorCtx.beginPath();
      const startX = rand() * TEX_SIZE * 0.3;
      colorCtx.moveTo(startX, y);
      colorCtx.lineTo(startX + TEX_SIZE * (0.3 + rand() * 0.7), y + (rand() - 0.5) * 2);
      colorCtx.stroke();
    }
    colorCtx.globalAlpha = 1;
  } else {
    // Chrome/smooth metal: very subtle variation
    const imageData = colorCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (rand() - 0.5) * 4;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
    }
    colorCtx.putImageData(imageData, 0, 0);
  }

  // Normal map for brushed effect
  const [normalCanvas, normalCtx] = createCanvas();
  normalCtx.fillStyle = "rgb(128,128,255)";
  normalCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  if (isBrushed) {
    const normalData = normalCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < normalData.data.length; i += 4) {
      normalData.data[i] = 128 + Math.round((rand() - 0.5) * 15); // subtle X variation
      normalData.data[i + 1] = 128; // no Y variation (horizontal brushing)
    }
    normalCtx.putImageData(normalData, 0, 0);
  }

  // Roughness
  const [roughCanvas, roughCtx] = createCanvas();
  roughCtx.fillStyle = isBrushed ? "#555" : "#222"; // brushed=rougher, chrome=very smooth
  roughCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  return {
    map: new THREE.CanvasTexture(colorCanvas),
    normalMap: new THREE.CanvasTexture(normalCanvas),
    roughnessMap: new THREE.CanvasTexture(roughCanvas),
  };
}

// ─── STONE TEXTURES ───────────────────────────────────
function generateStoneTextures(baseColor: string, materialId: string) {
  const [r, g, b] = hexToRgb(baseColor);
  const seed = materialId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const isMarble = materialId.includes("marble");

  const [colorCanvas, colorCtx] = createCanvas();
  colorCtx.fillStyle = baseColor;
  colorCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  if (isMarble) {
    // Marble veins
    for (let i = 0; i < 15; i++) {
      const startX = rand() * TEX_SIZE;
      const startY = rand() * TEX_SIZE;
      colorCtx.strokeStyle = rgbToHex(
        Math.max(0, r - 40 - rand() * 30),
        Math.max(0, g - 40 - rand() * 30),
        Math.max(0, b - 30 - rand() * 20)
      );
      colorCtx.lineWidth = 0.5 + rand() * 2;
      colorCtx.globalAlpha = 0.2 + rand() * 0.3;
      colorCtx.beginPath();
      colorCtx.moveTo(startX, startY);
      let cx = startX, cy = startY;
      for (let j = 0; j < 20; j++) {
        cx += (rand() - 0.5) * 60;
        cy += (rand() - 0.3) * 40;
        colorCtx.lineTo(cx, cy);
      }
      colorCtx.stroke();
    }
    colorCtx.globalAlpha = 1;
  } else {
    // Granite/concrete: speckled
    const imageData = colorCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (rand() - 0.5) * 25;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
    }
    colorCtx.putImageData(imageData, 0, 0);
  }

  const [normalCanvas, normalCtx] = createCanvas();
  normalCtx.fillStyle = "rgb(128,128,255)";
  normalCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  // Add subtle surface variation
  const normalData = normalCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  for (let i = 0; i < normalData.data.length; i += 4) {
    normalData.data[i] = 128 + Math.round((rand() - 0.5) * 8);
    normalData.data[i + 1] = 128 + Math.round((rand() - 0.5) * 8);
  }
  normalCtx.putImageData(normalData, 0, 0);

  const [roughCanvas, roughCtx] = createCanvas();
  roughCtx.fillStyle = isMarble ? "#777" : "#aaa";
  roughCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  return {
    map: new THREE.CanvasTexture(colorCanvas),
    normalMap: new THREE.CanvasTexture(normalCanvas),
    roughnessMap: new THREE.CanvasTexture(roughCanvas),
  };
}

// ─── FABRIC: normals + roughness from albedo luminance ─────────────────
function luminanceFromPixel(data: Uint8ClampedArray, i: number): number {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

/** Tangent-space normals from albedo height (woven / leather relief reads as fabric) */
function fabricNormalsFromAlbedo(colorCtx: CanvasRenderingContext2D, strength: number): HTMLCanvasElement {
  const colorData = colorCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  const d = colorData.data;
  const lum = (x: number, y: number) => {
    const xi = Math.max(0, Math.min(TEX_SIZE - 1, x));
    const yi = Math.max(0, Math.min(TEX_SIZE - 1, y));
    return luminanceFromPixel(d, (yi * TEX_SIZE + xi) * 4);
  };
  const [normalCanvas, normalCtx] = createCanvas();
  const nd = normalCtx.createImageData(TEX_SIZE, TEX_SIZE);
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const Lx = lum(x + 1, y) - lum(x - 1, y);
      const Ly = lum(x, y + 1) - lum(x, y - 1);
      const o = (y * TEX_SIZE + x) * 4;
      nd.data[o] = Math.round(Math.max(0, Math.min(255, 128 - Lx * strength)));
      nd.data[o + 1] = Math.round(Math.max(0, Math.min(255, 128 - Ly * strength)));
      nd.data[o + 2] = 255;
      nd.data[o + 3] = 255;
    }
  }
  normalCtx.putImageData(nd, 0, 0);
  return normalCanvas;
}

function fabricRoughnessFromAlbedo(colorCtx: CanvasRenderingContext2D, baseGray: number, contrast: number): HTMLCanvasElement {
  const colorData = colorCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  const d = colorData.data;
  const [roughCanvas, roughCtx] = createCanvas();
  const rd = roughCtx.createImageData(TEX_SIZE, TEX_SIZE);
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const i = (y * TEX_SIZE + x) * 4;
      const L = luminanceFromPixel(d, i) / 255;
      const v = Math.max(0, Math.min(255, (baseGray + (1 - L) * contrast) * 255));
      rd.data[i] = rd.data[i + 1] = rd.data[i + 2] = v;
      rd.data[i + 3] = 255;
    }
  }
  roughCtx.putImageData(rd, 0, 0);
  return roughCanvas;
}

// ─── FABRIC TEXTURES — premium stylized (soft plush upholstery) ──────────────
function generateFabricTextures(baseColor: string, materialId: string) {
  const [r, g, b] = hexToRgb(baseColor);
  const seed = materialId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const isLeather = materialId.includes("leather");
  const isVelvet = materialId.includes("velvet");

  // ── Style: soft, plush, cozy — like premium boucle / woven upholstery.
  // No visible individual threads. Broad gentle tonal variation.
  // Reads as "touchably soft" at medium camera distance. ──

  const heightMap = new Float32Array(TEX_SIZE * TEX_SIZE);
  const [colorCanvas, colorCtx] = createCanvas();
  const imgData = colorCtx.createImageData(TEX_SIZE, TEX_SIZE);
  const px = imgData.data;

  if (isLeather) {
    // ── Leather: soft, clean, premium — not raw pebble grain ──
    for (let py = 0; py < TEX_SIZE; py++) {
      for (let px_ = 0; px_ < TEX_SIZE; px_++) {
        const i = (py * TEX_SIZE + px_) * 4;
        const u = px_ / TEX_SIZE, v = py / TEX_SIZE;

        // Gentle organic variation (not aggressive pebble)
        const broad = fbm(u * 8, v * 8, seed, 3, 2.0, 0.4);
        const fine = fbm(u * 25, v * 25, seed + 100, 2, 2.0, 0.35);

        const colorVar = (broad - 0.5) * 0.06 + (fine - 0.5) * 0.025;
        const mod = 1.0 + colorVar;
        px[i] = Math.max(0, Math.min(255, r * mod));
        px[i + 1] = Math.max(0, Math.min(255, g * mod));
        px[i + 2] = Math.max(0, Math.min(255, b * mod));
        px[i + 3] = 255;

        heightMap[py * TEX_SIZE + px_] = broad * 0.2 + fine * 0.08;
      }
    }
  } else if (isVelvet) {
    // ── Velvet: soft pile, gentle directional shimmer ──
    for (let py = 0; py < TEX_SIZE; py++) {
      for (let px_ = 0; px_ < TEX_SIZE; px_++) {
        const i = (py * TEX_SIZE + px_) * 4;
        const u = px_ / TEX_SIZE, v = py / TEX_SIZE;

        // Soft pile direction
        const pile = fbm(u * 2, v * 12, seed, 3, 2.0, 0.4);
        const micro = fbm(u * 20, v * 20, seed + 100, 2);

        const colorVar = (pile - 0.5) * 0.05 + (micro - 0.5) * 0.02;
        const mod = 1.0 + colorVar;
        px[i] = Math.max(0, Math.min(255, r * mod));
        px[i + 1] = Math.max(0, Math.min(255, g * mod));
        px[i + 2] = Math.max(0, Math.min(255, b * mod));
        px[i + 3] = 255;

        heightMap[py * TEX_SIZE + px_] = pile * 0.15 + micro * 0.06;
      }
    }
  } else {
    // ── Woven upholstery: ribbed wool/sisal weave with visible yarn structure ──
    // Vertical ribs (cords) with individual yarn bumps inside each rib.

    // Rib parameters — how many vertical cords across the texture
    const ribCount = 28 + Math.floor(rand() * 12); // 28-40 ribs
    const ribWidth = TEX_SIZE / ribCount;
    // Yarn row parameters — horizontal yarn loops within each rib
    const yarnRowHeight = ribWidth * (0.7 + rand() * 0.3);

    // Per-rib tone variation (some ribs slightly lighter/darker)
    const ribTones: number[] = [];
    for (let i = 0; i < ribCount + 1; i++) {
      ribTones.push((rand() - 0.5) * 0.08);
    }

    for (let py = 0; py < TEX_SIZE; py++) {
      for (let px_ = 0; px_ < TEX_SIZE; px_++) {
        const i = (py * TEX_SIZE + px_) * 4;
        const u = px_ / TEX_SIZE, v = py / TEX_SIZE;

        // === 1. Vertical rib structure ===
        // Slight horizontal warp so ribs aren't perfectly straight
        const ribWarp = fbm(u * 1.5, v * 3, seed + 200, 2, 2.0, 0.4) * 0.008;
        const ribPhase = ((px_ / ribWidth) + ribWarp * ribCount) % 1.0;
        // Smooth rib profile: rounded column shape (cosine bump)
        const ribProfile = Math.cos(ribPhase * Math.PI * 2) * 0.5 + 0.5; // 0=gap, 1=center
        // Gap darkening between ribs
        const ribGap = ribProfile < 0.15 ? (0.15 - ribProfile) * 0.4 : 0;

        // Which rib index for tone lookup
        const ribIdx = Math.floor(px_ / ribWidth);

        // === 2. Yarn bumps within each rib ===
        // Slight vertical warp for organic feel
        const yarnWarp = fbm(u * 4 + 3.7, v * 1.5, seed + 300, 2, 2.0, 0.35) * 0.006;
        const yarnPhase = ((py / yarnRowHeight) + yarnWarp * (TEX_SIZE / yarnRowHeight)) % 1.0;
        // Each yarn loop is a rounded bump
        const yarnBump = Math.cos(yarnPhase * Math.PI * 2) * 0.5 + 0.5;
        // Stagger alternate ribs by half a yarn (like real weaving)
        const stagger = (ribIdx % 2 === 0) ? 0 : 0.5;
        const yarnPhaseStag = ((py / yarnRowHeight) + stagger + yarnWarp * (TEX_SIZE / yarnRowHeight)) % 1.0;
        const yarnBumpStag = Math.cos(yarnPhaseStag * Math.PI * 2) * 0.5 + 0.5;
        // Use staggered version
        const yarn = yarnBumpStag;

        // === 3. Fine fiber fuzz (individual fiber-scale noise) ===
        const fuzz = fbm(u * 60, v * 60, seed + 500, 2, 2.0, 0.4);
        const fuzzMod = (fuzz - 0.5) * 0.025;

        // === 4. Broad tonal variation (cushion-scale warm/cool shifts) ===
        const broad = fbm(u * 1.5, v * 1.5, seed + 600, 2, 2.0, 0.45);
        const broadMod = (broad - 0.5) * 0.04;

        // === Combine color ===
        const ribTone = ribTones[Math.min(ribIdx, ribTones.length - 1)];
        const yarnDark = (1.0 - yarn) * 0.05; // yarn valleys slightly darker
        const mod = 1.0 + ribTone + broadMod + fuzzMod - ribGap - yarnDark;

        // Slight warm shift in darker areas
        const warmth = (ribGap + yarnDark) * 12;
        const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
        px[i]     = clamp(r * mod + warmth * 0.3);
        px[i + 1] = clamp(g * mod);
        px[i + 2] = clamp(b * mod - warmth * 0.15);
        px[i + 3] = 255;

        // Height map — ribs are tall, yarn bumps are secondary
        heightMap[py * TEX_SIZE + px_] =
          ribProfile * 0.45 +   // rib columns are the main relief
          yarn * 0.20 +         // yarn bumps within ribs
          fuzz * 0.05;          // micro fiber texture
      }
    }
  }

  // Very minimal pixel noise
  const noiseRand = seededRandom(seed + 777);
  for (let i = 0; i < px.length; i += 4) {
    const n = (noiseRand() - 0.5) * 2;
    px[i] = Math.max(0, Math.min(255, px[i] + n));
    px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + n));
    px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + n));
  }
  colorCtx.putImageData(imgData, 0, 0);

  // ── Normal map — gentle Sobel, soft strength for plush feel ──
  const [normalCanvas, normalCtx] = createCanvas();
  const nd = normalCtx.createImageData(TEX_SIZE, TEX_SIZE);
  const nStr = isLeather ? 2.5 : isVelvet ? 2.0 : 3.5; // woven: strong relief for visible rib structure
  for (let py = 1; py < TEX_SIZE - 1; py++) {
    for (let px_ = 1; px_ < TEX_SIZE - 1; px_++) {
      const o = (py * TEX_SIZE + px_) * 4;
      const h = (yy: number, xx: number) => heightMap[yy * TEX_SIZE + xx];
      const tl = h(py-1,px_-1), tc = h(py-1,px_), tr = h(py-1,px_+1);
      const ml = h(py,px_-1),                       mr = h(py,px_+1);
      const bl = h(py+1,px_-1), bc = h(py+1,px_), br = h(py+1,px_+1);
      const ddx = (tr + 2*mr + br) - (tl + 2*ml + bl);
      const ddy = (bl + 2*bc + br) - (tl + 2*tc + tr);
      const nx = -ddx * nStr, ny = -ddy * nStr, nz = 1.0;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
      nd.data[o] = Math.round(((nx/len)*0.5+0.5)*255);
      nd.data[o+1] = Math.round(((ny/len)*0.5+0.5)*255);
      nd.data[o+2] = Math.round(((nz/len)*0.5+0.5)*255);
      nd.data[o+3] = 255;
    }
  }
  normalCtx.putImageData(nd, 0, 0);

  // ── Roughness map — high roughness = matte, soft, no plastic shine ──
  const [roughCanvas, roughCtx] = createCanvas();
  const rd = roughCtx.createImageData(TEX_SIZE, TEX_SIZE);
  for (let py = 0; py < TEX_SIZE; py++) {
    for (let px_ = 0; px_ < TEX_SIZE; px_++) {
      const i = (py * TEX_SIZE + px_) * 4;
      const u = px_ / TEX_SIZE, v = py / TEX_SIZE;

      let rough: number;
      if (isLeather) {
        rough = 175; // ~0.69 — matte leather, not shiny
        rough += (vnoise(u * 8, v * 8, seed + 500) - 0.5) * 10;
      } else if (isVelvet) {
        rough = 185; // ~0.73 — very matte
        rough += (vnoise(u * 10, v * 10, seed + 500) - 0.5) * 8;
      } else {
        rough = 200; // ~0.78 — high roughness for soft woven feel
        rough += (fbm(u * 3, v * 3, seed + 500, 2) - 0.5) * 12;
      }
      rd.data[i] = rd.data[i+1] = rd.data[i+2] = Math.max(150, Math.min(230, Math.round(rough)));
      rd.data[i+3] = 255;
    }
  }
  roughCtx.putImageData(rd, 0, 0);

  return {
    map: new THREE.CanvasTexture(colorCanvas),
    normalMap: new THREE.CanvasTexture(normalCanvas),
    roughnessMap: new THREE.CanvasTexture(roughCanvas),
  };
}
