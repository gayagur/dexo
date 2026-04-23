// ─── GLB Model Loader → GroupData ────────────────────────
// Loads a .glb file using Three.js GLTFLoader, parses its scene graph
// into our editable GroupData system.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PanelData, GroupData } from "./furnitureData";
import { MATERIALS } from "./furnitureData";

// Lazy-init to avoid issues with module-level instantiation
let _loader: GLTFLoader | null = null;
function getLoader(): GLTFLoader {
  if (!_loader) _loader = new GLTFLoader();
  return _loader;
}

/** Map a GLTF material color to the closest material in our palette */
/**
 * Match a Three.js color to the closest MATERIALS entry using weighted
 * Euclidean distance in linear RGB. The weights approximate human perception
 * (red-mean formula from Color Difference article) — much better than raw
 * Euclidean which biases toward warm wood tones.
 */
function matchMaterial(color: THREE.Color): string {
  let bestId = "oak";
  let bestDist = Infinity;

  // Convert to 0-255 for the red-mean weighting formula
  const r1 = color.r * 255;
  const g1 = color.g * 255;
  const b1 = color.b * 255;

  for (const mat of MATERIALS) {
    const mc = new THREE.Color(mat.color);
    const r2 = mc.r * 255;
    const g2 = mc.g * 255;
    const b2 = mc.b * 255;

    // Red-mean weighted Euclidean distance — approximates perceptual difference
    const rMean = (r1 + r2) / 2;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    const dist = (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db;

    if (dist < bestDist) {
      bestDist = dist;
      bestId = mat.id;
    }
  }
  return bestId;
}

/** Clean up node name: "desk(Clone)" → "Desk" */
function cleanName(raw: string): string {
  return raw
    .replace(/\(Clone\)$/i, "")
    .replace(/^Mesh\s*/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase → words
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

interface ParsedPart {
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  materialId: string;
  customColor?: string;
}

let _pid = 5000;
function pid(): string { return `kenney-${++_pid}`; }

/**
 * Load a GLB model and parse it into a GroupData.
 * Sub-meshes become separate editable panels with bounding-box dimensions.
 */
export async function loadGLBAsGroup(
  url: string,
  groupName: string,
  offsetPosition?: [number, number, number],
  options?: { preserveOriginalMaterials?: boolean },
): Promise<GroupData> {
  console.log("[glbLoader] Loading:", url);
  return new Promise((resolve, reject) => {
    getLoader().load(
      url,
      (gltf) => {
        console.log("[glbLoader] GLTF loaded, parsing scene...");
        const scene = gltf.scene;
        const parts: ParsedPart[] = [];

        // Walk the scene graph and extract meshes
        scene.updateMatrixWorld(true);

        scene.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;

          // Compute world-space bounding box
          const geo = child.geometry;
          if (!geo.boundingBox) geo.computeBoundingBox();
          const bbox = geo.boundingBox!.clone();

          // Apply world transform to bounding box
          bbox.applyMatrix4(child.matrixWorld);

          const center = new THREE.Vector3();
          bbox.getCenter(center);
          const size = new THREE.Vector3();
          bbox.getSize(size);

          // Skip tiny meshes (handles, bolts, etc. smaller than 2mm)
          if (size.x < 0.002 && size.y < 0.002 && size.z < 0.002) return;

          // Get material color — ensure it's a proper THREE.Color
          const mat = child.material as THREE.MeshStandardMaterial;
          const rawColor = mat?.color;
          const color = rawColor instanceof THREE.Color
            ? rawColor
            : new THREE.Color(rawColor?.r ?? 0.7, rawColor?.g ?? 0.5, rawColor?.b ?? 0.3);
          const materialId = matchMaterial(color);

          // If material match is poor, store exact color
          const bestMat = MATERIALS.find((m) => m.id === materialId);
          const bestColor = new THREE.Color(bestMat?.color ?? "#C4A265");
          const dr = color.r - bestColor.r;
          const dg = color.g - bestColor.g;
          const db = color.b - bestColor.b;
          const colorDist = Math.sqrt(dr * dr + dg * dg + db * db);
          const customColor = colorDist > 0.15
            ? `#${color.getHexString()}`
            : undefined;

          // Name: prefer node name, fall back to parent name
          const rawName = child.name || child.parent?.name || `Part ${parts.length + 1}`;

          parts.push({
            name: cleanName(rawName),
            position: [center.x, center.y, center.z],
            size: [
              Math.max(0.005, size.x),
              Math.max(0.005, size.y),
              Math.max(0.005, size.z),
            ],
            materialId,
            customColor,
          });
        });

        // If no meshes found, create a placeholder
        if (parts.length === 0) {
          parts.push({
            name: groupName,
            position: [0, 0.25, 0],
            size: [0.5, 0.5, 0.5],
            materialId: "oak",
          });
        }

        // Compute group center
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (const p of parts) {
          minX = Math.min(minX, p.position[0] - p.size[0] / 2);
          maxX = Math.max(maxX, p.position[0] + p.size[0] / 2);
          minY = Math.min(minY, p.position[1] - p.size[1] / 2);
          maxY = Math.max(maxY, p.position[1] + p.size[1] / 2);
          minZ = Math.min(minZ, p.position[2] - p.size[2] / 2);
          maxZ = Math.max(maxZ, p.position[2] + p.size[2] / 2);
        }
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        const groupPos: [number, number, number] = [
          centerX + (offsetPosition?.[0] ?? 0),
          centerY + (offsetPosition?.[1] ?? 0),
          centerZ + (offsetPosition?.[2] ?? 0),
        ];

        // Convert parts to PanelData with relative positions
        const panels: PanelData[] = parts.map((p) => ({
          id: pid(),
          type: (p.size[1] > p.size[0] && p.size[1] > p.size[2] ? "vertical" : "horizontal") as PanelData["type"],
          label: p.name,
          position: [
            p.position[0] - centerX,
            p.position[1] - centerY,
            p.position[2] - centerZ,
          ] as [number, number, number],
          size: p.size as [number, number, number],
          materialId: p.materialId,
          ...(p.customColor ? { customColor: p.customColor } : {}),
        }));

        console.log("[glbLoader] Parsed", panels.length, "parts from", groupName);
        resolve({
          id: crypto.randomUUID(),
          name: groupName,
          position: groupPos,
          rotation: [0, 0, 0],
          panels,
          glbUrl: url,
          preserveGlbDiffuseMaps: options?.preserveOriginalMaterials !== false,
        });
      },
      (progress) => {
        if (progress.total > 0) {
          console.log("[glbLoader] Progress:", Math.round((progress.loaded / progress.total) * 100) + "%");
        }
      },
      (error) => {
        console.error("[glbLoader] Load error:", error);
        reject(new Error(`Failed to load model: ${error}`));
      },
    );
  });
}

/**
 * Load a GLB and render it as a raw Three.js scene (for preview thumbnails).
 * Returns the GLTF scene root — caller is responsible for cleanup.
 */
export async function loadGLBScene(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    getLoader().load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (error) => reject(new Error(`Failed to load: ${error}`)),
    );
  });
}
