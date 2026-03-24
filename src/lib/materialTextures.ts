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

  const cacheKey = `${materialId}_${baseColor}`;
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

// ─── FABRIC TEXTURES ──────────────────────────────────
function generateFabricTextures(baseColor: string, materialId: string) {
  const [r, g, b] = hexToRgb(baseColor);
  const seed = materialId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const isLeather = materialId.includes("leather");

  const [colorCanvas, colorCtx] = createCanvas();
  colorCtx.fillStyle = baseColor;
  colorCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  if (isLeather) {
    // Leather: subtle pebble/grain pattern
    for (let i = 0; i < 2000; i++) {
      const x = rand() * TEX_SIZE;
      const y = rand() * TEX_SIZE;
      const size = 2 + rand() * 6;
      const brightness = 0.92 + rand() * 0.16;
      colorCtx.fillStyle = rgbToHex(
        Math.min(255, r * brightness),
        Math.min(255, g * brightness),
        Math.min(255, b * brightness)
      );
      colorCtx.globalAlpha = 0.15 + rand() * 0.2;
      colorCtx.beginPath();
      colorCtx.ellipse(x, y, size, size * 0.7, rand() * Math.PI, 0, Math.PI * 2);
      colorCtx.fill();
    }
    colorCtx.globalAlpha = 1;
  } else if (materialId.includes("velvet")) {
    // Velvet: soft directional sheen
    const imageData = colorCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (rand() - 0.5) * 8;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
    }
    colorCtx.putImageData(imageData, 0, 0);
  } else {
    // Woven fabric: crosshatch pattern
    colorCtx.globalAlpha = 0.08;
    for (let y = 0; y < TEX_SIZE; y += 4) {
      colorCtx.strokeStyle = y % 8 === 0
        ? rgbToHex(Math.max(0, r - 15), Math.max(0, g - 15), Math.max(0, b - 15))
        : rgbToHex(Math.min(255, r + 10), Math.min(255, g + 10), Math.min(255, b + 10));
      colorCtx.lineWidth = 1;
      colorCtx.beginPath();
      colorCtx.moveTo(0, y);
      colorCtx.lineTo(TEX_SIZE, y);
      colorCtx.stroke();
    }
    for (let x = 0; x < TEX_SIZE; x += 4) {
      colorCtx.strokeStyle = x % 8 === 0
        ? rgbToHex(Math.max(0, r - 10), Math.max(0, g - 10), Math.max(0, b - 10))
        : rgbToHex(Math.min(255, r + 8), Math.min(255, g + 8), Math.min(255, b + 8));
      colorCtx.beginPath();
      colorCtx.moveTo(x, 0);
      colorCtx.lineTo(x, TEX_SIZE);
      colorCtx.stroke();
    }
    colorCtx.globalAlpha = 1;
  }

  // Normal map
  const [normalCanvas, normalCtx] = createCanvas();
  normalCtx.fillStyle = "rgb(128,128,255)";
  normalCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  const normalData = normalCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  const bumpStrength = isLeather ? 12 : 5;
  for (let i = 0; i < normalData.data.length; i += 4) {
    normalData.data[i] = 128 + Math.round((rand() - 0.5) * bumpStrength);
    normalData.data[i + 1] = 128 + Math.round((rand() - 0.5) * bumpStrength);
  }
  normalCtx.putImageData(normalData, 0, 0);

  // Roughness
  const [roughCanvas, roughCtx] = createCanvas();
  roughCtx.fillStyle = isLeather ? "#cccccc" : "#e5e5e5"; // leather smoother than fabric
  roughCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  return {
    map: new THREE.CanvasTexture(colorCanvas),
    normalMap: new THREE.CanvasTexture(normalCanvas),
    roughnessMap: new THREE.CanvasTexture(roughCanvas),
  };
}
