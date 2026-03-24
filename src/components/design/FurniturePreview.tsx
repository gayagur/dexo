import { useMemo, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import type { PanelData, GroupData, EditorSceneData } from "@/lib/furnitureData";
import { panelsToWorldSpace } from "@/lib/groupUtils";
import { MATERIALS } from "@/lib/furnitureData";
import { getMaterialTextures } from "@/lib/materialTextures";
import * as THREE from "three";

// ─── Auto-fit camera to bounding box ────────────────────

function AutoFitCamera({ panels }: { panels: PanelData[] }) {
  const { camera } = useThree();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || panels.length === 0) return;
    fitted.current = true;

    const box = new THREE.Box3();
    for (const panel of panels) {
      const halfSize = new THREE.Vector3(
        panel.size[0] / 2,
        panel.size[1] / 2,
        panel.size[2] / 2
      );
      const center = new THREE.Vector3(...panel.position);
      box.expandByPoint(center.clone().sub(halfSize));
      box.expandByPoint(center.clone().add(halfSize));
    }

    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 45;
    const dist = maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
    const offset = dist * 1.6;

    camera.position.set(
      center.x + offset * 0.6,
      center.y + offset * 0.5,
      center.z + offset * 0.7
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [panels, camera]);

  return null;
}

// ─── Static Panel (read-only, no selection/interaction) ──

function PreviewPanel({ panel }: { panel: PanelData }) {
  const mat = MATERIALS.find((m) => m.id === panel.materialId);
  const color = panel.customColor ?? mat?.color ?? "#C4A265";
  const isGlass = mat?.id === "glass";
  const isMetal = mat?.category === "Metal";
  const isFabric = mat?.category === "Fabric";
  const roughness = mat?.roughness ?? (isMetal ? 0.3 : 0.7);
  const metalness = mat?.metalness ?? (isMetal ? 0.8 : 0.05);
  const shape = panel.shape ?? "box";
  const radius = panel.size[0] / 2;
  const cylHeight = panel.size[1];
  const rotation = panel.rotation ?? [0, 0, 0];

  // PBR textures (skip for custom colors and glass)
  const textures = useMemo(() => {
    if (panel.customColor || !mat) return null;
    return getMaterialTextures(mat.id, mat.color, mat.category);
  }, [panel.customColor, mat?.id, mat?.color, mat?.category]);

  useMemo(() => {
    if (!textures) return;
    const [w, h, d] = panel.size;
    const edge = Math.max(w, h, d);
    let repX: number;
    let repY: number;
    if (isFabric) {
      const rep = Math.max(10, edge * 16);
      repX = repY = rep;
    } else {
      repX = Math.max(0.5, w * 2);
      repY = Math.max(0.5, d * 2);
    }
    [textures.map, textures.normalMap, textures.roughnessMap].forEach(t => {
      t.repeat.set(repX, repY);
    });
  }, [textures, panel.size, isFabric]);

  const normalScale = useMemo(() => {
    if (!mat) return new THREE.Vector2(0.3, 0.3);
    if (mat.category === "Fabric") {
      if (mat.id.includes("velvet")) return new THREE.Vector2(0.85, 1.25);
      if (mat.id.includes("leather")) return new THREE.Vector2(0.7, 0.7);
      return new THREE.Vector2(1.1, 1.1);
    }
    return new THREE.Vector2(0.3, 0.3);
  }, [mat]);

  function renderGeometry() {
    switch (shape) {
      case "cylinder":
        return <cylinderGeometry args={[radius, radius, cylHeight, 24]} />;
      case "sphere":
        return <sphereGeometry args={[radius, 24, 24]} />;
      case "cone":
        return <coneGeometry args={[radius, cylHeight, 24]} />;
      default:
        return <boxGeometry args={panel.size} />;
    }
  }

  return (
    <mesh
      position={panel.position}
      rotation={rotation as [number, number, number]}
      castShadow
      receiveShadow
    >
      {renderGeometry()}
      {isGlass ? (
        <meshStandardMaterial
          color={color}
          roughness={0.05}
          metalness={0}
          transparent
          opacity={0.3}
        />
      ) : textures && shape === "box" && isFabric ? (
        <meshPhysicalMaterial
          map={textures.map}
          normalMap={textures.normalMap}
          normalScale={normalScale}
          roughnessMap={textures.roughnessMap}
          roughness={roughness}
          metalness={0}
          sheen={mat!.id.includes("velvet") ? 0.5 : mat!.id.includes("leather") ? 0.1 : 0.28}
          sheenRoughness={mat!.id.includes("velvet") ? 0.72 : 0.9}
          sheenColor={mat!.color}
          envMapIntensity={mat!.id.includes("velvet") ? 0.5 : 0.36}
        />
      ) : textures && shape === "box" ? (
        <meshStandardMaterial
          map={textures.map}
          normalMap={textures.normalMap}
          normalScale={normalScale}
          roughnessMap={textures.roughnessMap}
          roughness={roughness}
          metalness={metalness}
          envMapIntensity={isMetal ? 1.5 : 0.8}
        />
      ) : (
        <meshStandardMaterial
          color={color}
          roughness={roughness}
          metalness={metalness}
          envMapIntensity={isMetal ? 1.5 : 0.8}
        />
      )}
    </mesh>
  );
}

// ─── Main Preview Component ─────────────────────────────

export interface FurniturePreviewProps {
  panels?: PanelData[] | EditorSceneData;
  className?: string;
}

export function FurniturePreview({ panels, className }: FurniturePreviewProps) {
  const allPanels = useMemo(() => {
    if (!panels) return [];
    // Detect new format: has 'groups' property
    if (typeof panels === 'object' && !Array.isArray(panels) && 'groups' in panels) {
      const scene = panels as EditorSceneData;
      const result: PanelData[] = [];
      for (const g of scene.groups) {
        result.push(...panelsToWorldSpace(g.panels, g.position, g.rotation));
      }
      result.push(...(scene.ungroupedPanels ?? []));
      return result.filter(
        (p) => p && Array.isArray(p.position) && Array.isArray(p.size) && p.position.length === 3 && p.size.length === 3
      );
    }
    // Old format: flat array
    return (panels as PanelData[]).filter(
      (p) => p && Array.isArray(p.position) && Array.isArray(p.size) && p.position.length === 3 && p.size.length === 3
    );
  }, [panels]);

  if (allPanels.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className ?? ""}`}>
        <span className="text-xs text-gray-400">No preview</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [2, 1.5, 2.5], fov: 45 }}
        shadows
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
        <Environment preset="apartment" />

        <AutoFitCamera panels={allPanels} />

        {allPanels.map((panel) => (
          <PreviewPanel key={panel.id} panel={panel} />
        ))}

        <OrbitControls
          makeDefault
          enablePan={false}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={0.5}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
}
