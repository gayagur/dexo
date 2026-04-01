import { useMemo, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import type { PanelData, GroupData, EditorSceneData } from "@/lib/furnitureData";
import { panelsToWorldSpace } from "@/lib/groupUtils";
import { MATERIALS } from "@/lib/furnitureData";
import { getFabricRenderingParams, getMaterialTextures } from "@/lib/materialTextures";
import {
  cloneFabricTexturesWithTufting,
  fabricRepeatSpans,
  panelShouldHaveFabricTufting,
} from "@/lib/fabricTufting";
import { ShapeRenderer } from "@/components/design/editor/ShapeRenderer";
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
  const rotation = panel.rotation ?? [0, 0, 0];
  const isBasicShape = shape === "box" || shape === "cylinder" || shape === "sphere" || shape === "cone";

  // PBR textures (skip for custom colors and glass)
  const textures = useMemo(() => {
    if (panel.customColor || !mat) return null;
    const base = getMaterialTextures(mat.id, mat.color, mat.category);
    if (!base) return null;
    if (mat.category === "Fabric" && panelShouldHaveFabricTufting(panel, mat.id)) {
      return cloneFabricTexturesWithTufting(base, panel);
    }
    return base;
  }, [mat, panel]);

  useEffect(() => {
    if (!textures) return;
    const [w, , d] = panel.size;
    let repX: number;
    let repY: number;
    if (isFabric) {
      const { su, sv } = fabricRepeatSpans(panel);
      const edge = Math.max(su, sv);
      const rep = Math.max(12, edge * 17);
      repX = repY = rep;
    } else {
      repX = Math.max(0.5, w * 2);
      repY = Math.max(0.5, d * 2);
    }
    [textures.map, textures.normalMap, textures.roughnessMap].forEach(t => {
      t.repeat.set(repX, repY);
    });
  }, [textures, panel, panel.size, panel.label, panel.shape, isFabric]);

  const normalScale = useMemo(() => {
    if (!mat) return new THREE.Vector2(0.3, 0.3);
    if (mat.category === "Fabric") {
      if (mat.id.includes("velvet")) return new THREE.Vector2(0.52, 0.62);
      if (mat.id.includes("leather")) return new THREE.Vector2(0.42, 0.42);
      return new THREE.Vector2(0.52, 0.52);
    }
    return new THREE.Vector2(0.3, 0.3);
  }, [mat]);

  const fabricParams = useMemo(() => {
    if (!isFabric || !mat) return null;
    return getFabricRenderingParams(mat.id, color, "day");
  }, [isFabric, mat, color]);

  function renderBasicGeometry() {
    const radius = panel.size[0] / 2;
    const cylHeight = panel.size[1];
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
    <group position={panel.position} rotation={rotation as [number, number, number]}>
      {isBasicShape ? (
        <mesh castShadow receiveShadow>
          {renderBasicGeometry()}
          {isGlass ? (
            <meshStandardMaterial
              color={color}
              roughness={0.05}
              metalness={0}
              transparent
              opacity={0.3}
            />
          ) : textures && (shape === "box" || shape === "cushion" || shape === "mattress") && isFabric && fabricParams ? (
            <meshPhysicalMaterial
              map={textures.map}
              normalMap={textures.normalMap}
              normalScale={normalScale}
              roughnessMap={textures.roughnessMap}
              roughness={roughness}
              metalness={0}
              {...fabricParams}
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
      ) : (
        <ShapeRenderer
          shape={shape}
          size={panel.size}
          shapeParams={panel.shapeParams}
          color={color}
          roughness={roughness}
          metalness={metalness}
          transparent={!!isGlass}
          opacity={isGlass ? 0.3 : 1}
          map={textures?.map}
          envMapIntensity={isMetal ? 1.5 : 0.8}
          drapedControlPoints={panel.drapedControlPoints}
        />
      )}
    </group>
  );
}

// ─── Main Preview Component ─────────────────────────────

export interface FurniturePreviewProps {
  panels?: PanelData[] | EditorSceneData;
  className?: string;
  /** When true, the canvas ignores pointer events (e.g. list cards so overlay buttons work). */
  disableInteraction?: boolean;
}

export function FurniturePreview({ panels, className, disableInteraction }: FurniturePreviewProps) {
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
    <div className={`${className ?? ""} ${disableInteraction ? "pointer-events-none" : ""}`.trim()}>
      <Canvas
        camera={{ position: [2, 1.5, 2.5], fov: 45 }}
        shadows
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.42} />
        <directionalLight position={[5, 8, 5]} intensity={1.05} castShadow />
        <directionalLight position={[4.5, 3.5, -4]} intensity={0.4} color="#fff6ec" />
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
