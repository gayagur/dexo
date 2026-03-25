import * as THREE from "three";
import { MATERIALS } from "./furnitureData";

const materialCache = new Map<string, THREE.MeshStandardMaterial>();
const physicalCache = new Map<string, THREE.MeshPhysicalMaterial>();

/** Get or create a shared MeshStandardMaterial for a given material ID */
export function getSharedMaterial(
  materialId: string,
  opts?: { opacity?: number; transparent?: boolean; envMapIntensity?: number }
): THREE.MeshStandardMaterial {
  const opacity = opts?.opacity ?? 1;
  const envMapIntensity = opts?.envMapIntensity ?? 0.8;
  const key = `${materialId}_${opacity}_${envMapIntensity}`;

  if (materialCache.has(key)) return materialCache.get(key)!;

  const matOption = MATERIALS.find(m => m.id === materialId);
  const mat = new THREE.MeshStandardMaterial({
    color: matOption?.color ?? "#C4A265",
    roughness: matOption?.roughness ?? 0.7,
    metalness: matOption?.metalness ?? 0.05,
    transparent: opacity < 1,
    opacity,
    envMapIntensity,
  });

  materialCache.set(key, mat);
  return mat;
}

/** Get shared glass material */
export function getSharedGlassMaterial(opacity = 0.3): THREE.MeshPhysicalMaterial {
  const key = `glass_${opacity}`;
  if (physicalCache.has(key)) return physicalCache.get(key)!;

  const mat = new THREE.MeshPhysicalMaterial({
    transmission: 0.9,
    thickness: 0.5,
    roughness: 0.05,
    ior: 1.5,
    transparent: true,
    opacity,
  });

  physicalCache.set(key, mat);
  return mat;
}

/** Clear all cached materials (call on unmount if needed) */
export function clearMaterialCache() {
  materialCache.forEach(m => m.dispose());
  physicalCache.forEach(m => m.dispose());
  materialCache.clear();
  physicalCache.clear();
}
