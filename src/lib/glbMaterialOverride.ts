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
  if (mat.category === "Wood") return new THREE.Vector2(0.45, 0.45);
  if (mat.category === "Stone") return new THREE.Vector2(0.4, 0.4);
  if (mat.category === "Fabric") {
    if (mat.id.includes("velvet")) return new THREE.Vector2(0.4, 0.5);
    if (mat.id.includes("leather")) return new THREE.Vector2(0.35, 0.35);
    return new THREE.Vector2(0.5, 0.5);
  }
  return new THREE.Vector2(0.3, 0.3);
}

export type GlbMaterialLightMode = "day" | "night";

/**
 * Rebuild mesh materials for scene lighting while keeping the GLB author's look:
 * diffuse map, vertex colors, or at minimum the original albedo color (Kenney props).
 */
function materialPreservingFileVisuals(
  oldMat: THREE.Material,
  geometry: THREE.BufferGeometry,
  opts: {
    customColor?: string;
    paletteRoughness: number;
    paletteMetalness: number;
    transparent: boolean;
    opacity: number;
    envDefault: number;
  },
): THREE.MeshStandardMaterial | null {
  if (
    !(oldMat instanceof THREE.MeshStandardMaterial) &&
    !(oldMat instanceof THREE.MeshPhysicalMaterial)
  ) {
    return null;
  }

  const std = oldMat;
  const map = std.map ?? undefined;
  const hasVertexColors = !!geometry.getAttribute("color");

  const rough =
    typeof std.roughness === "number" && !Number.isNaN(std.roughness)
      ? std.roughness
      : opts.paletteRoughness;
  const metal =
    typeof std.metalness === "number" && !Number.isNaN(std.metalness)
      ? std.metalness
      : opts.paletteMetalness;

  if (map || hasVertexColors) {
    const tint = opts.customColor
      ? new THREE.Color(opts.customColor)
      : map
        ? new THREE.Color(0xffffff)
        : std.color.clone();
    return new THREE.MeshStandardMaterial({
      map,
      vertexColors: hasVertexColors,
      normalMap: std.normalMap ?? undefined,
      normalScale: std.normalScale ? std.normalScale.clone() : new THREE.Vector2(1, 1),
      roughness: rough,
      metalness: metal,
      color: tint,
      transparent: opts.transparent,
      opacity: opts.opacity,
      envMapIntensity: opts.envDefault,
    });
  }

  const albedo = opts.customColor ? new THREE.Color(opts.customColor) : std.color.clone();
  const out = new THREE.MeshStandardMaterial({
    color: albedo,
    roughness: rough,
    metalness: metal,
    transparent: opts.transparent,
    opacity: opts.opacity,
    envMapIntensity: opts.envDefault,
  });
  if (std.emissive && std.emissive.getHex() !== 0) {
    out.emissive = std.emissive.clone();
    out.emissiveIntensity = std.emissiveIntensity ?? 1;
  }
  return out;
}

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
    /**
     * When true (default), meshes that already have a diffuse map or vertex colors keep them
     * (Kenney plants, props). Set false after the user applies a palette material to the group.
     */
    preserveOriginalDiffuseMaps?: boolean;
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

  const preserve = options.preserveOriginalDiffuseMaps !== false;

  const paletteMaterialForSlot = (): THREE.Material => {
    if (isClearGlass) {
      return new THREE.MeshPhysicalMaterial({
        transmission: 0.9,
        thickness: 0.5,
        roughness: 0.05,
        ior: 1.5,
        transparent: true,
        opacity: options.dimmed ? 0.2 : 0.3,
      });
    }

    if (textures && isFabric && matEntry) {
      return new THREE.MeshPhysicalMaterial({
        map: textures.map,
        normalMap: textures.normalMap,
        normalScale,
        roughnessMap: textures.roughnessMap,
        roughness,
        metalness: 0,
        sheen: matEntry.id.includes("velvet") ? 0.35 : matEntry.id.includes("leather") ? 0.06 : 0.18,
        sheenRoughness: matEntry.id.includes("velvet") ? 0.75 : matEntry.id.includes("leather") ? 0.9 : 0.85,
        sheenColor: matEntry.color,
        transparent,
        opacity,
        envMapIntensity: matEntry.id.includes("velvet") ? 0.5 : 0.36,
      });
    }

    // Wood: MeshPhysicalMaterial — matte/satin natural finish (no lacquer sheen)
    const isWood = matEntry?.category === "Wood";
    if (textures && isWood) {
      return new THREE.MeshPhysicalMaterial({
        map: textures.map,
        normalMap: textures.normalMap,
        normalScale,
        roughnessMap: textures.roughnessMap,
        roughness,
        metalness: 0,
        clearcoat: 0.03,
        clearcoatRoughness: 0.8,
        transparent,
        opacity,
        envMapIntensity: night ? 0.6 : 0.75,
      });
    }

    if (textures) {
      return new THREE.MeshStandardMaterial({
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
    }

    return new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness,
      metalness,
      transparent,
      opacity,
      envMapIntensity: isMetal ? envMetal : envDefault,
    });
  };

  const preserveOpts = {
    customColor: options.customColor,
    paletteRoughness: roughness,
    paletteMetalness: metalness,
    transparent,
    opacity,
    envDefault,
  };

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const geo = child.geometry;

    const resolveMaterial = (oldMat: THREE.Material): THREE.Material => {
      if (preserve) {
        const phys = oldMat as THREE.MeshPhysicalMaterial;
        if (phys.transmission != null && phys.transmission > 0.5) {
          const c = phys.clone();
          c.transparent = transparent;
          c.opacity = opacity;
          return c;
        }
        const kept = materialPreservingFileVisuals(oldMat, geo, preserveOpts);
        if (kept) return kept;
      }
      return paletteMaterialForSlot();
    };

    if (Array.isArray(child.material)) {
      const next = child.material.map((m) => resolveMaterial(m));
      disposeMaterialRef(child.material);
      child.material = next;
    } else {
      const next = resolveMaterial(child.material);
      disposeMaterialRef(child.material);
      child.material = next;
    }
  });
}
