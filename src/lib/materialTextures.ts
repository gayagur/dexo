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

  const cacheKey = `v5_${materialId}_${baseColor}`;
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

// ─── WOOD TEXTURES — photorealistic procedural generation ──────
function generateWoodTextures(baseColor: string, materialId: string) {
  const [br, bg, bb] = hexToRgb(baseColor);
  const seed = materialId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);

  // ── Wood species parameters (adaptive to the material id) ──
  const isOak = materialId.includes("oak");
  const isWalnut = materialId.includes("walnut");
  const isPine = materialId.includes("pine");
  const isBirch = materialId.includes("birch");
  const isCherry = materialId.includes("cherry");

  // Growth ring density (rings per texture tile). Oak/walnut = wide rings, pine = tight.
  const ringDensity = isPine ? 22 + rand() * 6 : isOak ? 10 + rand() * 4 : isWalnut ? 8 + rand() * 4 : 12 + rand() * 5;
  // Knot probability
  const knotChance = isPine ? 0.7 : isOak ? 0.25 : 0.35;
  // Medullary ray intensity (quarter-sawn oak fleck)
  const rayIntensity = isOak ? 0.22 : isBirch ? 0.08 : 0.03;
  // Pore depth (open-pore woods like oak)
  const poreIntensity = isOak ? 0.35 : isWalnut ? 0.2 : isCherry ? 0.12 : 0.06;
  // Color warmth shift for earlywood vs latewood
  const earlyLateContrast = isOak ? 0.14 : isWalnut ? 0.1 : isPine ? 0.18 : 0.1;

  // Derived warm/cool tones from the base color
  const earlyR = Math.min(255, br + 12), earlyG = Math.min(255, bg + 6), earlyB = bb;
  const lateR = Math.max(0, br - 18), lateG = Math.max(0, bg - 12), lateB = Math.max(0, bb - 8);

  // ── Buffers ──
  const heightMap = new Float32Array(TEX_SIZE * TEX_SIZE);
  const [colorCanvas, colorCtx] = createCanvas();
  const imgData = colorCtx.createImageData(TEX_SIZE, TEX_SIZE);
  const px = imgData.data;

  // ── Virtual tree center for growth rings (off-screen = flat-sawn look) ──
  const treeCX = TEX_SIZE * (0.4 + rand() * 0.2);
  const treeCY = TEX_SIZE * (-1.5 - rand() * 3);  // far above = nearly horizontal rings

  // ── Pre-compute knots ──
  const knotCount = rand() < knotChance ? 1 + Math.floor(rand() * 2) : 0;
  const knots: { cx: number; cy: number; r: number }[] = [];
  for (let i = 0; i < knotCount; i++) {
    knots.push({ cx: rand() * TEX_SIZE, cy: rand() * TEX_SIZE, r: 18 + rand() * 35 });
  }

  // ── Per-pixel generation ──
  for (let py = 0; py < TEX_SIZE; py++) {
    for (let px_ = 0; px_ < TEX_SIZE; px_++) {
      const idx = (py * TEX_SIZE + px_) * 4;

      // Normalised coordinates
      const u = px_ / TEX_SIZE;
      const v = py / TEX_SIZE;

      // === 1. Growth rings ===
      // Distance from virtual tree center, warped by domain noise for organic flow
      const warpX = fbm(u * 3, v * 3, seed, 3) * 0.35;
      const warpY = fbm(u * 3 + 5.1, v * 3 + 3.7, seed + 41, 3) * 0.35;
      const dx = (px_ + warpX * TEX_SIZE) - treeCX;
      const dy = (py + warpY * TEX_SIZE) - treeCY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ringPhase = (dist / TEX_SIZE) * ringDensity * Math.PI * 2;

      // Ring profile: sharp latewood boundary (realistic — wood rings aren't sinusoidal)
      const ringRaw = Math.sin(ringPhase);
      const ringSharp = ringRaw > 0.3 ? 1.0 : ringRaw < -0.3 ? 0.0 : (ringRaw + 0.3) / 0.6;
      // ringSharp: 0 = earlywood (light), 1 = latewood (dark)

      // === 2. Grain flow — fibers along the X axis with organic variation ===
      const fiberNoise = fbm(u * 40, v * 2.5, seed + 100, 4, 2.0, 0.45);
      const fiberDetail = fbm(u * 120, v * 6, seed + 200, 3, 2.0, 0.4);

      // === 3. Medullary rays — bright cross-grain flecks ===
      let rayVal = 0;
      if (rayIntensity > 0.01) {
        // Rays run perpendicular to grain (vertical streaks in flat-sawn)
        const rayNoise = vnoise(u * 2, v * 80, seed + 500);
        const rayMask = vnoise(u * 6, v * 250, seed + 510);
        rayVal = rayMask > 0.72 ? (rayNoise > 0.4 ? rayIntensity * (rayMask - 0.72) / 0.28 : 0) : 0;
      }

      // === 4. Pores — tiny dark dots along grain ===
      let poreVal = 0;
      if (poreIntensity > 0.04) {
        const poreN = vnoise(u * 200, v * 25, seed + 600);
        const poreMask = vnoise(u * 60, v * 8, seed + 610);
        // Pores cluster in earlywood bands
        if (poreN > 0.82 && poreMask > 0.45 && ringSharp < 0.5) {
          poreVal = poreIntensity * (poreN - 0.82) / 0.18;
        }
      }

      // === 5. Knot distortion ===
      let knotVal = 0;
      for (const knot of knots) {
        const kx = px_ - knot.cx, ky = py - knot.cy;
        const kd = Math.sqrt(kx * kx + ky * ky);
        if (kd < knot.r * 3) {
          const falloff = Math.max(0, 1 - kd / (knot.r * 3));
          const falloff2 = falloff * falloff;
          // Concentric rings
          const kRing = Math.sin(kd * 0.4) * 0.5 + 0.5;
          knotVal += kRing * falloff2 * 0.3;
          // Dark core
          if (kd < knot.r * 0.35) {
            knotVal += (1 - kd / (knot.r * 0.35)) * 0.4;
          }
        }
      }

      // === 6. Large-scale heartwood/sapwood color drift ===
      const drift = warpedFbm(u * 1.5, v * 0.8, seed + 300, 4);

      // === Combine into final color ===
      const earlyLate = ringSharp * earlyLateContrast;
      const fiberMod = (fiberNoise - 0.5) * 0.08 + (fiberDetail - 0.5) * 0.03;
      const driftMod = (drift - 0.5) * 0.12;

      // Interpolate between earlywood and latewood colors
      const t = ringSharp;
      let cr = earlyR + (lateR - earlyR) * t;
      let cg = earlyG + (lateG - earlyG) * t;
      let cb = earlyB + (lateB - earlyB) * t;

      // Apply modifiers
      const mod = 1.0 + fiberMod + driftMod - earlyLate * 0.5 - knotVal - poreVal;
      cr *= mod;
      cg *= mod;
      cb *= mod;

      // Medullary rays — add brightness (they reflect light)
      cr += rayVal * 45;
      cg += rayVal * 35;
      cb += rayVal * 20;

      // Micro-stains: rare dark spots for natural irregularity
      const stain = vnoise(u * 30, v * 30, seed + 700);
      if (stain > 0.92) {
        const s = (stain - 0.92) / 0.08 * 0.15;
        cr *= (1 - s); cg *= (1 - s); cb *= (1 - s);
      }

      px[idx] = Math.max(0, Math.min(255, Math.round(cr)));
      px[idx + 1] = Math.max(0, Math.min(255, Math.round(cg)));
      px[idx + 2] = Math.max(0, Math.min(255, Math.round(cb)));
      px[idx + 3] = 255;

      // === Height map — for normal generation ===
      heightMap[py * TEX_SIZE + px_] =
        ringSharp * 0.35 +           // grain depth in latewood
        fiberNoise * 0.2 +           // fiber-level relief
        fiberDetail * 0.1 +          // micro-fiber detail
        poreVal * -1.5 +             // pores are depressions
        knotVal * 0.8 +              // knots are raised
        rayVal * 0.4;                // rays have slight elevation
    }
  }

  // === Micro pixel noise — breaks digital perfection ===
  const microRand = seededRandom(seed + 999);
  for (let i = 0; i < px.length; i += 4) {
    const n = (microRand() - 0.5) * 4;
    px[i] = Math.max(0, Math.min(255, px[i] + n));
    px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + n));
    px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + n));
  }
  colorCtx.putImageData(imgData, 0, 0);

  // ── Normal map — 3x3 Sobel on height buffer ──
  const [normalCanvas, normalCtx] = createCanvas();
  const nd = normalCtx.createImageData(TEX_SIZE, TEX_SIZE);
  const nStr = 4.0; // stronger normals for visible grain under lighting
  for (let py = 1; py < TEX_SIZE - 1; py++) {
    for (let px_ = 1; px_ < TEX_SIZE - 1; px_++) {
      const o = (py * TEX_SIZE + px_) * 4;
      const h = (yy: number, xx: number) => heightMap[yy * TEX_SIZE + xx];
      const tl = h(py - 1, px_ - 1), tc = h(py - 1, px_), tr = h(py - 1, px_ + 1);
      const ml = h(py, px_ - 1),                             mr = h(py, px_ + 1);
      const bl = h(py + 1, px_ - 1), bc = h(py + 1, px_), br = h(py + 1, px_ + 1);

      const ddx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
      const ddy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
      const nx = -ddx * nStr, ny = -ddy * nStr, nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nd.data[o] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      nd.data[o + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      nd.data[o + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      nd.data[o + 3] = 255;
    }
  }
  // Fill edges (copy from neighbours)
  for (let x = 0; x < TEX_SIZE; x++) {
    const top = (0 * TEX_SIZE + x) * 4, row1 = (1 * TEX_SIZE + x) * 4;
    nd.data[top] = nd.data[row1]; nd.data[top + 1] = nd.data[row1 + 1]; nd.data[top + 2] = nd.data[row1 + 2]; nd.data[top + 3] = 255;
    const bot = ((TEX_SIZE - 1) * TEX_SIZE + x) * 4, rowN = ((TEX_SIZE - 2) * TEX_SIZE + x) * 4;
    nd.data[bot] = nd.data[rowN]; nd.data[bot + 1] = nd.data[rowN + 1]; nd.data[bot + 2] = nd.data[rowN + 2]; nd.data[bot + 3] = 255;
  }
  normalCtx.putImageData(nd, 0, 0);

  // ── Roughness map — grain-aware with micro-scratches ──
  const [roughCanvas, roughCtx] = createCanvas();
  const rd = roughCtx.createImageData(TEX_SIZE, TEX_SIZE);
  const scratchRand = seededRandom(seed + 1234);
  for (let py = 0; py < TEX_SIZE; py++) {
    for (let px_ = 0; px_ < TEX_SIZE; px_++) {
      const i = (py * TEX_SIZE + px_) * 4;
      const h = heightMap[py * TEX_SIZE + px_];

      // Base roughness: finished wood ~0.55-0.70
      let rough = 150; // ~0.59 for finished/lacquered wood

      // Latewood is slightly smoother (denser fibers)
      rough -= h * 8;

      // Large-scale roughness variation (worn areas)
      const wearNoise = vnoise(px_ / TEX_SIZE * 4, py / TEX_SIZE * 4, seed + 800);
      rough += (wearNoise - 0.5) * 18;

      // Micro-scratches — fine directional marks along grain
      const scratch = vnoise(px_ / TEX_SIZE * 300, py / TEX_SIZE * 8, seed + 900);
      if (scratch > 0.85) {
        rough += (scratch - 0.85) / 0.15 * 35; // scratches are rougher
      }

      // Pore areas — slightly rougher (open pore finish)
      const u = px_ / TEX_SIZE, v = py / TEX_SIZE;
      const poreCheck = vnoise(u * 200, v * 25, seed + 600);
      if (poreCheck > 0.82 && poreIntensity > 0.04) {
        rough += 20;
      }

      rd.data[i] = rd.data[i + 1] = rd.data[i + 2] = Math.max(60, Math.min(220, Math.round(rough)));
      rd.data[i + 3] = 255;
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

// ─── FABRIC TEXTURES — photorealistic upholstery ──────────────
function generateFabricTextures(baseColor: string, materialId: string) {
  const [r, g, b] = hexToRgb(baseColor);
  const seed = materialId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const isLeather = materialId.includes("leather");
  const isVelvet = materialId.includes("velvet");

  const heightMap = new Float32Array(TEX_SIZE * TEX_SIZE);
  const [colorCanvas, colorCtx] = createCanvas();
  const imgData = colorCtx.createImageData(TEX_SIZE, TEX_SIZE);
  const px = imgData.data;

  if (isLeather) {
    // ── Leather: pebble grain with creases and micro-pitting ──
    for (let py = 0; py < TEX_SIZE; py++) {
      for (let px_ = 0; px_ < TEX_SIZE; px_++) {
        const i = (py * TEX_SIZE + px_) * 4;
        const u = px_ / TEX_SIZE, v = py / TEX_SIZE;

        // Pebble grain — domain-warped noise creates organic cell pattern
        const pebble = warpedFbm(u * 18, v * 18, seed, 4);
        const detail = fbm(u * 60, v * 60, seed + 100, 3);
        const crease = fbm(u * 6, v * 8, seed + 200, 3);

        // Color variation — slight warm/cool shift
        const colorVar = (pebble - 0.5) * 0.12 + (detail - 0.5) * 0.04;
        const creaseEffect = crease < 0.35 ? (0.35 - crease) * 0.25 : 0;

        const mod = 1.0 + colorVar - creaseEffect;
        px[i] = Math.max(0, Math.min(255, r * mod));
        px[i + 1] = Math.max(0, Math.min(255, g * mod));
        px[i + 2] = Math.max(0, Math.min(255, b * mod));
        px[i + 3] = 255;

        heightMap[py * TEX_SIZE + px_] = pebble * 0.6 + detail * 0.2 - creaseEffect * 1.5;
      }
    }
  } else if (isVelvet) {
    // ── Velvet: short pile with directional sheen ──
    for (let py = 0; py < TEX_SIZE; py++) {
      for (let px_ = 0; px_ < TEX_SIZE; px_++) {
        const i = (py * TEX_SIZE + px_) * 4;
        const u = px_ / TEX_SIZE, v = py / TEX_SIZE;

        // Pile direction streaks
        const pile = fbm(u * 3 + v * 0.5, v * 40, seed, 4, 2.0, 0.5);
        const micro = fbm(u * 80, v * 80, seed + 100, 3);

        const colorVar = (pile - 0.5) * 0.09 + (micro - 0.5) * 0.03;
        const mod = 1.0 + colorVar;
        px[i] = Math.max(0, Math.min(255, r * mod));
        px[i + 1] = Math.max(0, Math.min(255, g * mod));
        px[i + 2] = Math.max(0, Math.min(255, b * mod));
        px[i + 3] = 255;

        heightMap[py * TEX_SIZE + px_] = pile * 0.4 + micro * 0.15;
      }
    }
  } else {
    // ── Woven cloth: realistic twill / plain weave with fiber detail ──
    const threadSize = 4; // pixels per thread
    const threadCount = TEX_SIZE / threadSize;

    // Pre-generate per-thread color variation (each yarn slightly different)
    const threadColors: number[] = [];
    for (let i = 0; i < threadCount * 2; i++) {
      threadColors.push(0.94 + rand() * 0.12); // 0.94-1.06 brightness per thread
    }

    for (let py = 0; py < TEX_SIZE; py++) {
      for (let px_ = 0; px_ < TEX_SIZE; px_++) {
        const i = (py * TEX_SIZE + px_) * 4;
        const u = px_ / TEX_SIZE, v = py / TEX_SIZE;

        // Thread indices
        const tx = Math.floor(px_ / threadSize);
        const ty = Math.floor(py / threadSize);
        // Position within thread (0..1)
        const lx = (px_ % threadSize) / threadSize;
        const ly = (py % threadSize) / threadSize;

        // Plain weave: alternating over/under
        const isWarp = (tx + ty) % 2 === 0; // warp on top

        // Thread cross-section profile — rounded for realism
        const profileX = 1.0 - 4.0 * (lx - 0.5) * (lx - 0.5); // parabolic
        const profileY = 1.0 - 4.0 * (ly - 0.5) * (ly - 0.5);
        const threadProfile = isWarp ? profileY : profileX;

        // Thread elevation (over threads are raised)
        const elevation = isWarp ? 0.3 + threadProfile * 0.5 : threadProfile * 0.3;

        // Gap shadow between threads
        const gapX = Math.min(lx, 1 - lx);
        const gapY = Math.min(ly, 1 - ly);
        const gap = Math.min(gapX, gapY);
        const gapShadow = gap < 0.15 ? (0.15 - gap) / 0.15 * 0.15 : 0;

        // Per-thread color variation
        const threadColorMod = isWarp
          ? threadColors[ty % threadCount]
          : threadColors[(threadCount + tx) % (threadCount * 2)];

        // Micro-fiber noise
        const fiberNoise = vnoise(u * 200, v * 200, seed + 300);
        const fiberMod = (fiberNoise - 0.5) * 0.04;

        // Large-scale wear/fading
        const wear = fbm(u * 2.5, v * 2.5, seed + 400, 3);
        const wearMod = (wear - 0.5) * 0.06;

        const shade = (threadColorMod + fiberMod + wearMod - gapShadow) *
          (0.92 + threadProfile * 0.12); // raised center slightly brighter

        // Slight warm/cool shift between warp and weft
        const warmShift = isWarp ? 2 : -2;
        px[i] = Math.max(0, Math.min(255, r * shade + warmShift));
        px[i + 1] = Math.max(0, Math.min(255, g * shade));
        px[i + 2] = Math.max(0, Math.min(255, b * shade - warmShift * 0.5));
        px[i + 3] = 255;

        heightMap[py * TEX_SIZE + px_] = elevation - gapShadow * 0.5;
      }
    }
  }

  // Micro pixel noise — breaks digital perfection
  const noiseRand = seededRandom(seed + 777);
  for (let i = 0; i < px.length; i += 4) {
    const n = (noiseRand() - 0.5) * 3;
    px[i] = Math.max(0, Math.min(255, px[i] + n));
    px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + n));
    px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + n));
  }
  colorCtx.putImageData(imgData, 0, 0);

  // ── Normal map from height buffer (Sobel) ──
  const [normalCanvas, normalCtx] = createCanvas();
  const nd = normalCtx.createImageData(TEX_SIZE, TEX_SIZE);
  const nStr = isLeather ? 5.0 : isVelvet ? 6.0 : 7.0;
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

  // ── Roughness map — height-driven with wear variation ──
  const [roughCanvas, roughCtx] = createCanvas();
  const rd = roughCtx.createImageData(TEX_SIZE, TEX_SIZE);
  for (let py = 0; py < TEX_SIZE; py++) {
    for (let px_ = 0; px_ < TEX_SIZE; px_++) {
      const i = (py * TEX_SIZE + px_) * 4;
      const h = heightMap[py * TEX_SIZE + px_];
      const u = px_ / TEX_SIZE, v = py / TEX_SIZE;

      let rough: number;
      if (isLeather) {
        rough = 155 + h * -15; // ~0.61 base, smoother on raised grain
        rough += (vnoise(u * 20, v * 20, seed + 500) - 0.5) * 20;
      } else if (isVelvet) {
        rough = 145 + h * -10; // ~0.57 base, pile direction affects roughness
        rough += (vnoise(u * 30, v * 30, seed + 500) - 0.5) * 15;
      } else {
        rough = 175; // ~0.69 base for woven cloth
        // Weave gaps are rougher, raised thread centers smoother
        rough -= h * 18;
        // Wear variation
        rough += (fbm(u * 3, v * 3, seed + 500, 3) - 0.5) * 22;
      }
      rd.data[i] = rd.data[i+1] = rd.data[i+2] = Math.max(80, Math.min(230, Math.round(rough)));
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
