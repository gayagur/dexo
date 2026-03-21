import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment, TransformControls } from "@react-three/drei";
import type { PanelData } from "@/lib/furnitureData";
import { MATERIALS } from "@/lib/furnitureData";
import * as THREE from "three";

// ─── Types ─────────────────────────────────────────────

export type TransformMode = "translate" | "rotate" | "scale";

// ─── Helpers ───────────────────────────────────────────

function isDoor(label: string) { return /door/i.test(label); }
function isDrawer(label: string) { return /drawer/i.test(label); }
function isInteractive(label: string) { return isDoor(label) || isDrawer(label); }

// Snap value to grid (10mm = 0.01m)
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

// ─── Context Menu Info ─────────────────────────────────

interface ContextMenuInfo {
  panelId: string;
  label: string;
  x: number;
  y: number;
  type: "door" | "drawer";
}

// ─── Main Component ────────────────────────────────────

interface EditorViewportProps {
  panels: PanelData[];
  selectedPanelId: string | null;
  transformMode: TransformMode;
  snapEnabled: boolean;
  onSelectPanel: (id: string | null) => void;
  onUpdatePanel: (id: string, updates: Partial<PanelData>) => void;
}

export function EditorViewport({
  panels,
  selectedPanelId,
  transformMode,
  snapEnabled,
  onSelectPanel,
  onUpdatePanel,
}: EditorViewportProps) {
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuInfo | null>(null);

  const togglePanel = useCallback((id: string) => {
    setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;

  return (
    <div
      className="w-full h-full bg-gray-50 rounded-xl overflow-hidden border border-gray-200 relative"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        camera={{ position: [2.5, 2, 3], fov: 45 }}
        shadows
        onPointerMissed={() => {
          onSelectPanel(null);
          closeContextMenu();
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
        <Environment preset="apartment" />

        <Grid
          args={[10, 10]}
          cellSize={0.1}
          cellThickness={0.5}
          cellColor="#d4d4d8"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#a1a1aa"
          fadeDistance={8}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />

        {panels.map((panel) => (
          <FurniturePanel
            key={panel.id}
            panel={panel}
            selected={panel.id === selectedPanelId}
            isOpen={!!openPanels[panel.id]}
            onClick={() => { onSelectPanel(panel.id); closeContextMenu(); }}
            onDoubleClick={() => { if (isInteractive(panel.label)) togglePanel(panel.id); }}
            onContextMenu={(x, y) => {
              if (isDoor(panel.label)) {
                setContextMenu({ panelId: panel.id, label: panel.label, x, y, type: "door" });
              } else if (isDrawer(panel.label)) {
                setContextMenu({ panelId: panel.id, label: panel.label, x, y, type: "drawer" });
              }
            }}
          />
        ))}

        {/* TransformControls for selected non-door/drawer panel */}
        {selectedPanel && !isDoor(selectedPanel.label) && !isDrawer(selectedPanel.label) && (
          <TransformGizmo
            panel={selectedPanel}
            mode={transformMode}
            snapEnabled={snapEnabled}
            onUpdate={onUpdatePanel}
          />
        )}

        <OrbitControls
          makeDefault
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={1}
          maxDistance={10}
        />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport />
        </GizmoHelper>
      </Canvas>

      {/* Context menu overlay */}
      {contextMenu && (
        <div className="absolute z-50" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => { togglePanel(contextMenu.panelId); closeContextMenu(); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
            >
              <span className="text-base">
                {openPanels[contextMenu.panelId]
                  ? contextMenu.type === "door" ? "🚪" : "📥"
                  : contextMenu.type === "door" ? "🔓" : "📤"}
              </span>
              <span className="text-gray-700">
                {openPanels[contextMenu.panelId]
                  ? contextMenu.type === "door" ? "Close Door" : "Close Drawer"
                  : contextMenu.type === "door" ? "Open Door" : "Open Drawer"}
              </span>
            </button>
            <div className="border-t border-gray-100 my-0.5" />
            <button onClick={closeContextMenu} className="w-full px-3 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Transform Gizmo ───────────────────────────────────

function TransformGizmo({
  panel,
  mode,
  snapEnabled,
  onUpdate,
}: {
  panel: PanelData;
  mode: TransformMode;
  snapEnabled: boolean;
  onUpdate: (id: string, updates: Partial<PanelData>) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const controlsRef = useRef<any>(null);
  const { gl } = useThree();

  // Sync mesh position/rotation from panel data
  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(...panel.position);
    const rot = panel.rotation ?? [0, 0, 0];
    meshRef.current.rotation.set(...rot);
  }, [panel.position, panel.rotation]);

  // When transform ends, write back to panel data
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onEnd = () => {
      if (!meshRef.current) return;
      const pos = meshRef.current.position;
      const rot = meshRef.current.rotation;
      const gridSize = 0.01; // 10mm

      let newPos: [number, number, number] = [pos.x, pos.y, pos.z];
      if (snapEnabled && mode === "translate") {
        newPos = [
          snapToGrid(pos.x, gridSize),
          snapToGrid(pos.y, gridSize),
          snapToGrid(pos.z, gridSize),
        ];
        meshRef.current.position.set(...newPos);
      }

      const updates: Partial<PanelData> = {};
      if (mode === "translate") {
        updates.position = newPos;
      } else if (mode === "rotate") {
        updates.rotation = [rot.x, rot.y, rot.z];
      }
      // Scale mode: update size
      if (mode === "scale") {
        const scl = meshRef.current.scale;
        const newSize: [number, number, number] = [
          panel.size[0] * scl.x,
          panel.size[1] * scl.y,
          panel.size[2] * scl.z,
        ];
        meshRef.current.scale.set(1, 1, 1);
        updates.size = newSize;
      }

      onUpdate(panel.id, updates);
    };

    controls.addEventListener("mouseUp", onEnd);
    return () => controls.removeEventListener("mouseUp", onEnd);
  }, [panel.id, panel.size, mode, snapEnabled, onUpdate]);

  // Set snap values on controls
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (snapEnabled) {
      controls.setTranslationSnap(0.01); // 10mm
      controls.setRotationSnap(THREE.MathUtils.degToRad(15)); // 15°
      controls.setScaleSnap(0.05);
    } else {
      controls.setTranslationSnap(null);
      controls.setRotationSnap(null);
      controls.setScaleSnap(null);
    }
  }, [snapEnabled]);

  const shape = panel.shape ?? "box";
  const radius = panel.size[0] / 2;
  const cylHeight = panel.size[1];

  return (
    <>
      <mesh ref={meshRef} visible={false}>
        {shape === "cylinder" ? (
          <cylinderGeometry args={[radius, radius, cylHeight, 24]} />
        ) : shape === "sphere" ? (
          <sphereGeometry args={[radius, 24, 24]} />
        ) : shape === "cone" ? (
          <coneGeometry args={[radius, cylHeight, 24]} />
        ) : (
          <boxGeometry args={panel.size} />
        )}
        <meshBasicMaterial visible={false} />
      </mesh>
      <TransformControls
        ref={controlsRef}
        object={meshRef.current!}
        mode={mode}
        size={0.6}
      />
    </>
  );
}

// ─── Individual Panel (with door/drawer animation) ─────

function FurniturePanel({
  panel,
  selected,
  isOpen,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  panel: PanelData;
  selected: boolean;
  isOpen: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (screenX: number, screenY: number) => void;
}) {
  const mat = MATERIALS.find((m) => m.id === panel.materialId);
  const color = mat?.color ?? "#C4A265";
  const isGlass = mat?.id === "glass";
  const isMetal = mat?.category === "Metal";
  const shape = panel.shape ?? "box";
  const radius = panel.size[0] / 2;
  const cylHeight = panel.size[1];
  const panelRotation = panel.rotation ?? [0, 0, 0];

  const panelIsDoor = isDoor(panel.label);
  const panelIsDrawer = isDrawer(panel.label);

  const groupRef = useRef<THREE.Group>(null!);
  const animProgress = useRef(isOpen ? 1 : 0);

  useFrame((_, delta) => {
    const target = isOpen ? 1 : 0;
    const speed = 3.5;
    animProgress.current = THREE.MathUtils.lerp(
      animProgress.current, target, Math.min(speed * delta * 4, 1)
    );
    if (!groupRef.current) return;
    if (panelIsDoor) {
      groupRef.current.rotation.y = animProgress.current * (-Math.PI / 2);
    } else if (panelIsDrawer) {
      const slideDistance = panel.size[2] + 0.25;
      groupRef.current.position.z = -animProgress.current * slideDistance;
    }
  });

  function renderGeometry(outline = false) {
    const pad = outline ? 0.003 : 0;
    switch (shape) {
      case "cylinder":
        return <cylinderGeometry args={[radius + pad, radius + pad, cylHeight + (outline ? 0.004 : 0), 24]} />;
      case "sphere":
        return <sphereGeometry args={[radius + pad, 24, 24]} />;
      case "cone":
        return <coneGeometry args={[radius + pad, cylHeight + (outline ? 0.004 : 0), 24]} />;
      default:
        return outline
          ? <boxGeometry args={[panel.size[0] + 0.004, panel.size[1] + 0.004, panel.size[2] + 0.004]} />
          : <boxGeometry args={panel.size} />;
    }
  }

  const handleClick = (e: any) => { e.stopPropagation(); onClick(); };
  const handlePointerDown = (e: any) => {
    if (e.nativeEvent.button === 2 && (panelIsDoor || panelIsDrawer)) {
      e.stopPropagation();
      onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
    }
  };

  // Door: pivot from left edge
  if (panelIsDoor) {
    const halfW = panel.size[0] / 2;
    return (
      <group position={[panel.position[0] - halfW, panel.position[1], panel.position[2]]} rotation={panelRotation as any}>
        <group ref={groupRef}>
          <mesh position={[halfW, 0, 0]} onClick={handleClick}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
            onPointerDown={handlePointerDown} castShadow receiveShadow>
            {renderGeometry()}
            <meshStandardMaterial color={selected ? "#e8c4a8" : color}
              roughness={isMetal ? 0.3 : 0.7} metalness={isMetal ? 0.8 : 0.05}
              transparent={isGlass} opacity={isGlass ? 0.3 : 1} />
          </mesh>
          {/* Hinge indicators */}
          <mesh position={[0.005, panel.size[1] * 0.3, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.02, 8]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.005, -panel.size[1] * 0.3, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.02, 8]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
          </mesh>
          {selected && (
            <mesh position={[halfW, 0, 0]}>
              {renderGeometry(true)}
              <meshBasicMaterial color="#C87D5A" wireframe />
            </mesh>
          )}
        </group>
      </group>
    );
  }

  // Drawer: slide on Z
  if (panelIsDrawer) {
    return (
      <group position={panel.position} rotation={panelRotation as any}>
        <group ref={groupRef}>
          <mesh onClick={handleClick}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
            onPointerDown={handlePointerDown} castShadow receiveShadow>
            {renderGeometry()}
            <meshStandardMaterial color={selected ? "#e8c4a8" : color}
              roughness={isMetal ? 0.3 : 0.7} metalness={isMetal ? 0.8 : 0.05}
              transparent={isGlass} opacity={isGlass ? 0.3 : 1} />
          </mesh>
          <mesh position={[0, 0, -panel.size[2] / 2 - 0.01]}>
            <boxGeometry args={[0.06, 0.012, 0.012]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
          </mesh>
          {selected && <mesh>{renderGeometry(true)}<meshBasicMaterial color="#C87D5A" wireframe /></mesh>}
        </group>
      </group>
    );
  }

  // Regular panel
  return (
    <group>
      <mesh position={panel.position} rotation={panelRotation as any}
        onClick={handleClick} onPointerDown={handlePointerDown} castShadow receiveShadow>
        {renderGeometry()}
        <meshStandardMaterial color={selected ? "#e8c4a8" : color}
          roughness={isMetal ? 0.3 : 0.7} metalness={isMetal ? 0.8 : 0.05}
          transparent={isGlass} opacity={isGlass ? 0.3 : 1} />
      </mesh>
      {selected && (
        <mesh position={panel.position} rotation={panelRotation as any}>
          {renderGeometry(true)}<meshBasicMaterial color="#C87D5A" wireframe />
        </mesh>
      )}
    </group>
  );
}
