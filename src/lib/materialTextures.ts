import * as THREE from "three";

// Cache to avoid regenerating textures
const textureCache = new Map<string, { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture }>();

const TEX_SIZE = 512;

/** Get or create PBR textures for a material */
export function getMaterialTextures(materialId: string, baseColor: string, category: string): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} | null {
  // Skip textures for glass — it uses transmission
  if (category === "Glass") return null;

  const cacheKey = `v3_${materialId}_${baseColor}`;
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
    // Configure all textures for tiling
    [result.map, result.normalMap, result.roughnessMap].forEach(tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
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

// ─── WOOD TEXTURES ────────────────────────────────────
function generateWoodTextures(baseColor: string, materialId: string) {
  const [r, g, b] = hexToRgb(baseColor);
  const seed = materialId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);

  // Color map: wood grain lines
  const [colorCanvas, colorCtx] = createCanvas();
  colorCtx.fillStyle = baseColor;
  colorCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Draw grain lines
  for (let i = 0; i < 80; i++) {
    const y = rand() * TEX_SIZE;
    const width = 1 + rand() * 3;
    const darkness = 0.85 + rand() * 0.1; // 85-95% of base color
    colorCtx.strokeStyle = rgbToHex(r * darkness, g * darkness, b * darkness);
    colorCtx.lineWidth = width;
    colorCtx.beginPath();
    colorCtx.moveTo(0, y);
    // Slightly wavy grain
    for (let x = 0; x < TEX_SIZE; x += 20) {
      const yOff = y + Math.sin(x * 0.02 + rand() * 6) * (3 + rand() * 5);
      colorCtx.lineTo(x, yOff);
    }
    colorCtx.stroke();
  }

  // Add subtle noise/variation
  const imageData = colorCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const noise = (rand() - 0.5) * 12;
    pixels[i] = Math.max(0, Math.min(255, pixels[i] + noise));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + noise));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + noise));
  }
  colorCtx.putImageData(imageData, 0, 0);

  // Normal map: derive from grain height
  const [normalCanvas, normalCtx] = createCanvas();
  const normalData = normalCtx.createImageData(TEX_SIZE, TEX_SIZE);
  const colorData = colorCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  for (let y = 1; y < TEX_SIZE - 1; y++) {
    for (let x = 1; x < TEX_SIZE - 1; x++) {
      const idx = (y * TEX_SIZE + x) * 4;
      const left = colorData.data[((y) * TEX_SIZE + (x - 1)) * 4];
      const right = colorData.data[((y) * TEX_SIZE + (x + 1)) * 4];
      const up = colorData.data[((y - 1) * TEX_SIZE + x) * 4];
      const down = colorData.data[((y + 1) * TEX_SIZE + x) * 4];
      // Sobel-ish normal calculation
      const dx = (right - left) / 255;
      const dy = (down - up) / 255;
      const strength = 2.0;
      normalData.data[idx] = Math.round((dx * strength * 0.5 + 0.5) * 255);
      normalData.data[idx + 1] = Math.round((dy * strength * 0.5 + 0.5) * 255);
      normalData.data[idx + 2] = 200; // Z component (mostly up)
      normalData.data[idx + 3] = 255;
    }
  }
  normalCtx.putImageData(normalData, 0, 0);

  // Roughness map: grain areas slightly smoother
  const [roughCanvas, roughCtx] = createCanvas();
  roughCtx.fillStyle = "#bbb"; // base roughness ~0.73
  roughCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  // Add variation
  const roughData = roughCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  for (let i = 0; i < roughData.data.length; i += 4) {
    const variation = (rand() - 0.5) * 30;
    const val = Math.max(0, Math.min(255, 187 + variation));
    roughData.data[i] = roughData.data[i + 1] = roughData.data[i + 2] = val;
  }
  roughCtx.putImageData(roughData, 0, 0);

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

// ─── FABRIC TEXTURES ──────────────────────────────────
function generateFabricTextures(baseColor: string, materialId: string) {
  const [r, g, b] = hexToRgb(baseColor);
  const seed = materialId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const isLeather = materialId.includes("leather");
  const isVelvet = materialId.includes("velvet");

  const [colorCanvas, colorCtx] = createCanvas();

  if (isLeather) {
    colorCtx.fillStyle = baseColor;
    colorCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < 4500; i++) {
      const x = rand() * TEX_SIZE;
      const y = rand() * TEX_SIZE;
      const size = 1.5 + rand() * 5;
      const brightness = 0.88 + rand() * 0.22;
      colorCtx.fillStyle = rgbToHex(
        Math.min(255, r * brightness),
        Math.min(255, g * brightness),
        Math.min(255, b * brightness)
      );
      colorCtx.globalAlpha = 0.22 + rand() * 0.28;
      colorCtx.beginPath();
      colorCtx.ellipse(x, y, size, size * 0.75, rand() * Math.PI, 0, Math.PI * 2);
      colorCtx.fill();
    }
    colorCtx.globalAlpha = 1;
    // Crease lines
    colorCtx.strokeStyle = rgbToHex(Math.max(0, r - 25), Math.max(0, g - 25), Math.max(0, b - 25));
    colorCtx.globalAlpha = 0.12;
    colorCtx.lineWidth = 1;
    for (let k = 0; k < 12; k++) {
      colorCtx.beginPath();
      let cx = rand() * TEX_SIZE;
      let cy = rand() * TEX_SIZE;
      for (let s = 0; s < 30; s++) {
        cx += (rand() - 0.3) * 18;
        cy += (rand() - 0.5) * 18;
        if (s === 0) colorCtx.moveTo(cx, cy);
        else colorCtx.lineTo(cx, cy);
      }
      colorCtx.stroke();
    }
    colorCtx.globalAlpha = 1;
  } else if (isVelvet) {
    const img = colorCtx.createImageData(TEX_SIZE, TEX_SIZE);
    // Short pile: vertical streaks + noise (sheen handled in material)
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const stripe = Math.sin(x * 0.45 + y * 0.08) * 0.045 + Math.sin(y * 0.12) * 0.025;
        const n = Math.sin(x * 0.31 + y * 0.47) * 0.018 + Math.sin(x * 0.09 - y * 0.13) * 0.012;
        const bump = 1 + stripe + n;
        const i = (y * TEX_SIZE + x) * 4;
        img.data[i] = Math.max(0, Math.min(255, r * bump));
        img.data[i + 1] = Math.max(0, Math.min(255, g * bump));
        img.data[i + 2] = Math.max(0, Math.min(255, b * bump));
        img.data[i + 3] = 255;
      }
    }
    colorCtx.putImageData(img, 0, 0);
  } else {
    const img = colorCtx.createImageData(TEX_SIZE, TEX_SIZE);
    // Woven cloth: basket / plain weave with visible thread spacing
    const thread = 5;
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const cx = Math.floor(x / thread);
        const cy = Math.floor(y / thread);
        const under = (cx + cy) % 2 === 0;
        const u = (x % thread) / thread;
        const v = (y % thread) / thread;
        let shade = 1;
        if (under) {
          const dist = Math.abs(v - 0.5);
          shade = dist < 0.38 ? 1.06 - dist * 0.18 : 0.9 + dist * 0.08;
        } else {
          const dist = Math.abs(u - 0.5);
          shade = dist < 0.38 ? 1.04 - dist * 0.15 : 0.91 + dist * 0.07;
        }
        const fiber = 1 + Math.sin((cx * 7 + cy * 11 + x * 0.2 + y * 0.17) * 0.9) * 0.03;
        const i = (y * TEX_SIZE + x) * 4;
        img.data[i] = Math.max(0, Math.min(255, r * shade * fiber));
        img.data[i + 1] = Math.max(0, Math.min(255, g * shade * fiber));
        img.data[i + 2] = Math.max(0, Math.min(255, b * shade * fiber));
        img.data[i + 3] = 255;
      }
    }
    colorCtx.putImageData(img, 0, 0);
    // Secondary fine weft/warp lines
    colorCtx.globalAlpha = 0.18;
    colorCtx.lineWidth = 1;
    for (let y = 0; y < TEX_SIZE; y += 2) {
      colorCtx.strokeStyle = rgbToHex(
        Math.max(0, r - 22), Math.max(0, g - 22), Math.max(0, b - 22)
      );
      colorCtx.beginPath();
      colorCtx.moveTo(0, y);
      colorCtx.lineTo(TEX_SIZE, y);
      colorCtx.stroke();
    }
    for (let x = 0; x < TEX_SIZE; x += 2) {
      colorCtx.strokeStyle = rgbToHex(
        Math.min(255, r + 12), Math.min(255, g + 12), Math.min(255, b + 12)
      );
      colorCtx.beginPath();
      colorCtx.moveTo(x, 0);
      colorCtx.lineTo(x, TEX_SIZE);
      colorCtx.stroke();
    }
    colorCtx.globalAlpha = 1;
  }

  const normalStrength = isLeather ? 4.2 : isVelvet ? 5.5 : 6.2;
  const normalCanvas = fabricNormalsFromAlbedo(colorCtx, normalStrength);

  const roughBase = isLeather ? 0.62 : isVelvet ? 0.58 : 0.68;
  const roughContrast = isLeather ? 0.28 : 0.35;
  const roughCanvas = fabricRoughnessFromAlbedo(colorCtx, roughBase, roughContrast);

  return {
    map: new THREE.CanvasTexture(colorCanvas),
    normalMap: new THREE.CanvasTexture(normalCanvas),
    roughnessMap: new THREE.CanvasTexture(roughCanvas),
  };
}
