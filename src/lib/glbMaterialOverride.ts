import * as THREE from "three";
import { MATERIALS, type MaterialOption } from "./furnitureData";
import { getMaterialTextures } from "./materialTextures";

function disposeMaterialRef(m: THREE.Material | THREE.Material[]) {
  if (Array.isArray(m)) {
    for (const x of m) x.dispose();
  } else {
    m.dispose();
  }
}

function normalScaleForMaterial(mat: MaterialOption | undefined): THREE.Vector2 {
  if (!mat) return new THREE.Vector2(0.3, 0.3);
  if (mat.category === "Fabric") {
    if (mat.id.includes("velvet")) return new THREE.Vector2(0.85, 1.25);
    if (mat.id.includes("leather")) return new THREE.Vector2(0.7, 0.7);
    return new THREE.Vector2(1.1, 1.1);
  }
  return new THREE.Vector2(0.3, 0.3);
}

export type GlbMaterialLightMode = "day" | "night";

/**
 * Replace materials on every Mesh under `root` with DEXO palette PBR, without touching geometry.
 * Used for imported GLB groups so group material / custom color updates keep original shapes.
 */
export function applyDesignMaterialToGlbRoot(
  root: THREE.Object3D,
  options: {
    materialId: string;
    customColor?: string;
    lightMode: GlbMaterialLightMode;
    dimmed: boolean;
    /** When set (SH3D picker), applies this image on every mesh and skips palette PBR */
    sh3dColorMap?: THREE.Texture;
  },
): void {
  const night = options.lightMode === "night";
  const envDefault = night ? 0.62 : 0.88;
  const transparent = options.dimmed;
  const opacity = options.dimmed ? 0.3 : 1;

  if (options.sh3dColorMap) {
    const map = options.sh3dColorMap;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(2, 2);
    map.colorSpace = THREE.SRGBColorSpace;
    root.updateMatrixWorld(true);
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      disposeMaterialRef(child.material);
      child.material = new THREE.MeshStandardMaterial({
        map,
        color: 0xffffff,
        roughness: 0.88,
        metalness: 0.04,
        transparent,
        opacity,
        envMapIntensity: envDefault,
      });
    });
    return;
  }

  const matEntry = MATERIALS.find((m) => m.id === options.materialId);
  const roughness = matEntry?.roughness ?? 0.7;
  const metalness = matEntry?.metalness ?? 0.05;
  const envMetal = night ? 4.75 : 2.5;
  const isMetal = matEntry?.category === "Metal";
  const isFabric = matEntry?.category === "Fabric";
  const isClearGlass = options.materialId === "glass";
  const colorHex = options.customColor ?? matEntry?.color ?? "#C4A265";

  root.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const w = Math.max(size.x, 0.01);
  const h = Math.max(size.y, 0.01);
  const d = Math.max(size.z, 0.01);
  const edge = Math.max(w, h, d);

  const textures =
    options.customColor || !matEntry
      ? null
      : getMaterialTextures(options.materialId, matEntry.color, matEntry.category);

  if (textures) {
    let repX: number;
    let repY: number;
    if (isFabric) {
      const rep = Math.max(10, edge * 16);
      repX = rep;
      repY = rep;
    } else {
      repX = Math.max(0.5, w * 2);
      repY = Math.max(0.5, d * 2);
    }
    for (const t of [textures.map, textures.normalMap, textures.roughnessMap]) {
      t.repeat.set(repX, repY);
    }
  }

  const normalScale = normalScaleForMaterial(matEntry);

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    disposeMaterialRef(child.material);

    if (isClearGlass) {
      child.material = new THREE.MeshPhysicalMaterial({
        transmission: 0.9,
        thickness: 0.5,
        roughness: 0.05,
        ior: 1.5,
        transparent: true,
        opacity: options.dimmed ? 0.2 : 0.3,
      });
      return;
    }

    if (textures && isFabric && matEntry) {
      child.material = new THREE.MeshPhysicalMaterial({
        map: textures.map,
        normalMap: textures.normalMap,
        normalScale,
        roughnessMap: textures.roughnessMap,
        roughness,
        metalness: 0,
        sheen: matEntry.id.includes("velvet") ? 0.5 : matEntry.id.includes("leather") ? 0.1 : 0.28,
        sheenRoughness: matEntry.id.includes("velvet") ? 0.72 : 0.9,
        sheenColor: matEntry.color,
        transparent,
        opacity,
        envMapIntensity: matEntry.id.includes("velvet") ? 0.5 : 0.36,
      });
      return;
    }

    if (textures) {
      child.material = new THREE.MeshStandardMaterial({
        map: textures.map,
        normalMap: textures.normalMap,
        normalScale,
        roughnessMap: textures.roughnessMap,
        roughness,
        metalness,
        transparent,
        opacity,
        envMapIntensity: isMetal ? envMetal : envDefault,
      });
      return;
    }

    child.material = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness,
      metalness,
      transparent,
      opacity,
      envMapIntensity: isMetal ? envMetal : envDefault,
    });
  });
}
