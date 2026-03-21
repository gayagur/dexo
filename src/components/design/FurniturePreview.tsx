import { useMemo, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import type { PanelData } from "@/lib/furnitureData";
import { MATERIALS } from "@/lib/furnitureData";
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
  const color = mat?.color ?? "#C4A265";
  const isGlass = mat?.id === "glass";
  const isMetal = mat?.category === "Metal";
  const shape = panel.shape ?? "box";
  const radius = panel.size[0] / 2;
  const cylHeight = panel.size[1];
  const rotation = panel.rotation ?? [0, 0, 0];

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
      <meshStandardMaterial
        color={color}
        roughness={isMetal ? 0.3 : 0.7}
        metalness={isMetal ? 0.8 : 0.05}
        transparent={isGlass}
        opacity={isGlass ? 0.3 : 1}
      />
    </mesh>
  );
}

// ─── Main Preview Component ─────────────────────────────

export interface FurniturePreviewProps {
  panels: PanelData[];
  className?: string;
}

export function FurniturePreview({ panels, className }: FurniturePreviewProps) {
  const validPanels = useMemo(
    () =>
      (panels ?? []).filter(
        (p) =>
          p &&
          Array.isArray(p.position) &&
          Array.isArray(p.size) &&
          p.position.length === 3 &&
          p.size.length === 3
      ),
    [panels]
  );

  if (validPanels.length === 0) {
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

        <AutoFitCamera panels={validPanels} />

        {validPanels.map((panel) => (
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
