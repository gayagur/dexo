import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment } from "@react-three/drei";
import type { PanelData } from "@/lib/furnitureData";
import { MATERIALS } from "@/lib/furnitureData";
import { ShapeRenderer, isCompositeShape } from "./ShapeRenderer";
import * as THREE from "three";

// ─── Helpers ───────────────────────────────────────────

function isDoor(label: string) { return /door/i.test(label); }
function isLeftDoor(label: string) { return /left\s*door/i.test(label); }
function isRightDoor(label: string) { return /right\s*door/i.test(label); }
function isDrawer(label: string) { return /drawer/i.test(label); }
function isInteractive(label: string) { return isDoor(label) || isDrawer(label); }

function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

// ─── Types ─────────────────────────────────────────────

interface ContextMenuInfo {
  panelId: string;
  label: string;
  x: number;
  y: number;
  type: "door" | "drawer";
}

interface DragState {
  isDragging: boolean;
  panelId: string | null;
  startPoint: THREE.Vector3 | null;
  startPos: [number, number, number] | null;
  // Rotation drag fields
  startClientX: number;
  startRotY: number;
}

interface SnapGuide {
  axis: "x" | "z";
  position: number;
  from: number;
  to: number;
}

interface DragInfo {
  position: [number, number, number];
  rotationDeg?: number;
  resizeLabel?: string; // e.g. "Width: 600mm → 750mm"
}

// Axis colors: red=X, green=Y, blue=Z
const AXIS_COLORS: Record<number, string> = { 0: "#ef4444", 1: "#22c55e", 2: "#3b82f6" };
const AXIS_LABELS: Record<number, string> = { 0: "Width (X)", 1: "Height (Y)", 2: "Depth (Z)" };

// ─── Object-to-Object Snapping ─────────────────────────

const OBJECT_SNAP_THRESHOLD = 0.03; // 30mm

function computeObjectSnap(
  pos: [number, number, number],
  size: [number, number, number],
  allPanels: PanelData[],
  draggedId: string,
): { snappedPos: [number, number, number]; guides: SnapGuide[] } {
  const snapped = [...pos] as [number, number, number];
  const guides: SnapGuide[] = [];

  const dMinX = pos[0] - size[0] / 2;
  const dMaxX = pos[0] + size[0] / 2;
  const dMinZ = pos[2] - size[2] / 2;
  const dMaxZ = pos[2] + size[2] / 2;
  const dCenterX = pos[0];
  const dCenterZ = pos[2];

  let bestSnapX: { delta: number; newX: number; snapAt: number } | null = null;
  let bestSnapZ: { delta: number; newZ: number; snapAt: number } | null = null;
  let snapOtherX: PanelData | null = null;
  let snapOtherZ: PanelData | null = null;

  for (const other of allPanels) {
    if (other.id === draggedId) continue;

    const oMinX = other.position[0] - other.size[0] / 2;
    const oMaxX = other.position[0] + other.size[0] / 2;
    const oMinZ = other.position[2] - other.size[2] / 2;
    const oMaxZ = other.position[2] + other.size[2] / 2;
    const oCenterX = other.position[0];
    const oCenterZ = other.position[2];

    // X-axis snap checks
    const xChecks = [
      { delta: Math.abs(dMaxX - oMinX), newX: oMinX - size[0] / 2, snapAt: oMinX },
      { delta: Math.abs(dMinX - oMaxX), newX: oMaxX + size[0] / 2, snapAt: oMaxX },
      { delta: Math.abs(dCenterX - oCenterX), newX: oCenterX, snapAt: oCenterX },
      { delta: Math.abs(dMinX - oMinX), newX: oMinX + size[0] / 2, snapAt: oMinX },
      { delta: Math.abs(dMaxX - oMaxX), newX: oMaxX - size[0] / 2, snapAt: oMaxX },
    ];
    for (const check of xChecks) {
      if (check.delta < OBJECT_SNAP_THRESHOLD && (!bestSnapX || check.delta < bestSnapX.delta)) {
        bestSnapX = check;
        snapOtherX = other;
      }
    }

    // Z-axis snap checks
    const zChecks = [
      { delta: Math.abs(dMaxZ - oMinZ), newZ: oMinZ - size[2] / 2, snapAt: oMinZ },
      { delta: Math.abs(dMinZ - oMaxZ), newZ: oMaxZ + size[2] / 2, snapAt: oMaxZ },
      { delta: Math.abs(dCenterZ - oCenterZ), newZ: oCenterZ, snapAt: oCenterZ },
      { delta: Math.abs(dMinZ - oMinZ), newZ: oMinZ + size[2] / 2, snapAt: oMinZ },
      { delta: Math.abs(dMaxZ - oMaxZ), newZ: oMaxZ - size[2] / 2, snapAt: oMaxZ },
    ];
    for (const check of zChecks) {
      if (check.delta < OBJECT_SNAP_THRESHOLD && (!bestSnapZ || check.delta < bestSnapZ.delta)) {
        bestSnapZ = check;
        snapOtherZ = other;
      }
    }
  }

  if (bestSnapX && snapOtherX) {
    snapped[0] = bestSnapX.newX;
    const guideFrom = Math.min(pos[2] - size[2] / 2, snapOtherX.position[2] - snapOtherX.size[2] / 2) - 0.15;
    const guideTo = Math.max(pos[2] + size[2] / 2, snapOtherX.position[2] + snapOtherX.size[2] / 2) + 0.15;
    guides.push({ axis: "x", position: bestSnapX.snapAt, from: guideFrom, to: guideTo });
  }
  if (bestSnapZ && snapOtherZ) {
    snapped[2] = bestSnapZ.newZ;
    const guideFrom = Math.min(pos[0] - size[0] / 2, snapOtherZ.position[0] - snapOtherZ.size[0] / 2) - 0.15;
    const guideTo = Math.max(pos[0] + size[0] / 2, snapOtherZ.position[0] + snapOtherZ.size[0] / 2) + 0.15;
    guides.push({ axis: "z", position: bestSnapZ.snapAt, from: guideFrom, to: guideTo });
  }

  return { snappedPos: snapped, guides };
}

// ─── View Mode ─────────────────────────────────────────

export type ViewMode = "3d" | "front" | "top" | "side";

const VIEW_CAMERAS: Record<ViewMode, { position: [number, number, number]; up: [number, number, number] }> = {
  "3d":    { position: [2.5, 2, 3],   up: [0, 1, 0] },
  "front": { position: [0, 0.5, 5],   up: [0, 1, 0] },   // XY — looking from +Z
  "top":   { position: [0, 5, 0.001], up: [0, 0, -1] },   // XZ — looking from +Y
  "side":  { position: [5, 0.5, 0],   up: [0, 1, 0] },    // YZ — looking from +X
};

// ─── Main Component ────────────────────────────────────

interface EditorViewportProps {
  panels: PanelData[];
  selectedPanelId: string | null;
  snapEnabled: boolean;
  rotationMode: boolean;
  viewMode: ViewMode;
  onSelectPanel: (id: string | null) => void;
  onUpdatePanel: (id: string, updates: Partial<PanelData>) => void;
}

export function EditorViewport({
  panels,
  selectedPanelId,
  snapEnabled,
  rotationMode,
  viewMode,
  onSelectPanel,
  onUpdatePanel,
}: EditorViewportProps) {
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuInfo | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [interactionActive, setInteractionActive] = useState(false);

  const togglePanel = useCallback((id: string) => {
    setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;

  const dragStateRef = useRef<DragState>({
    isDragging: false,
    panelId: null,
    startPoint: null,
    startPos: null,
    startClientX: 0,
    startRotY: 0,
  });

  const startDrag = useCallback((panelId: string, intersectionPoint: THREE.Vector3, clientX: number) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;

    setInteractionActive(true);

    if (rotationMode) {
      dragStateRef.current = {
        isDragging: true,
        panelId,
        startPoint: null,
        startPos: [...panel.position] as [number, number, number],
        startClientX: clientX,
        startRotY: (panel.rotation ?? [0, 0, 0])[1],
      };
    } else {
      dragStateRef.current = {
        isDragging: true,
        panelId,
        startPoint: intersectionPoint.clone(),
        startPos: [...panel.position] as [number, number, number],
        startClientX: 0,
        startRotY: 0,
      };
    }
  }, [panels, rotationMode]);

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
            rotationMode={rotationMode}
            onClick={() => { onSelectPanel(panel.id); closeContextMenu(); }}
            onDoubleClick={() => { if (isInteractive(panel.label)) togglePanel(panel.id); }}
            onContextMenu={(x, y) => {
              if (isDoor(panel.label)) {
                setContextMenu({ panelId: panel.id, label: panel.label, x, y, type: "door" });
              } else if (isDrawer(panel.label)) {
                setContextMenu({ panelId: panel.id, label: panel.label, x, y, type: "drawer" });
              }
            }}
            onDragStart={(intersectionPoint, clientX) => startDrag(panel.id, intersectionPoint, clientX)}
          />
        ))}

        {/* Drag controller — handles move, object snap, and rotation */}
        <DragController
          dragStateRef={dragStateRef}
          snapEnabled={snapEnabled}
          rotationMode={rotationMode}
          panels={panels}
          onUpdatePanel={onUpdatePanel}
          onSnapGuidesChange={setSnapGuides}
          onDragInfoChange={setDragInfo}
          onInteractionEnd={() => setInteractionActive(false)}
        />

        {/* Snap guide lines (blue alignment guides) */}
        {snapGuides.map((guide, i) => (
          <SnapGuideLine key={i} guide={guide} />
        ))}

        {/* Selection handles for resize (hidden during rotation mode) */}
        {selectedPanel && !isDoor(selectedPanel.label) && !isDrawer(selectedPanel.label) && !rotationMode && (
          <SelectionHandles
            panel={selectedPanel}
            onUpdate={onUpdatePanel}
            snapEnabled={snapEnabled}
            onInteractionChange={setInteractionActive}
            onDragInfoChange={setDragInfo}
          />
        )}

        {/* Rotation ring when in rotation mode */}
        {rotationMode && selectedPanel && (
          <RotationRing panel={selectedPanel} />
        )}

        {/* Animate camera when viewMode changes */}
        <CameraController viewMode={viewMode} />

        <OrbitControls
          makeDefault
          enabled={!interactionActive}
          enableRotate={viewMode === "3d"}
          minPolarAngle={viewMode === "3d" ? 0.1 : undefined}
          maxPolarAngle={viewMode === "3d" ? Math.PI / 2 - 0.05 : undefined}
          minDistance={0.5}
          maxDistance={15}
        />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport />
        </GizmoHelper>
      </Canvas>

      {/* Drag info overlay — shows position or rotation angle */}
      {dragInfo && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg font-mono backdrop-blur-sm z-40 flex items-center gap-3 pointer-events-none">
          {dragInfo.resizeLabel ? (
            <span>{dragInfo.resizeLabel}</span>
          ) : dragInfo.rotationDeg != null ? (
            <span>Rotate: {dragInfo.rotationDeg.toFixed(1)}&deg;</span>
          ) : (
            <>
              <span>X: {(dragInfo.position[0] * 100).toFixed(1)}cm</span>
              <span className="text-gray-400">|</span>
              <span>Y: {(dragInfo.position[1] * 100).toFixed(1)}cm</span>
              <span className="text-gray-400">|</span>
              <span>Z: {(dragInfo.position[2] * 100).toFixed(1)}cm</span>
            </>
          )}
        </div>
      )}

      {/* View mode label */}
      {viewMode !== "3d" && (
        <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-medium z-40 pointer-events-none uppercase tracking-wider">
          {viewMode === "front" ? "Front View (XY)" : viewMode === "top" ? "Top View (XZ)" : "Side View (YZ)"}
        </div>
      )}

      {/* Rotation mode indicator */}
      {rotationMode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium z-40 pointer-events-none">
          Rotation Mode &mdash; drag object to rotate &middot; Press R or Esc to exit
        </div>
      )}

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
                  ? contextMenu.type === "door" ? "\uD83D\uDEAA" : "\uD83D\uDCE5"
                  : contextMenu.type === "door" ? "\uD83D\uDD13" : "\uD83D\uDCE4"}
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

// ─── Snap Guide Line (blue alignment indicator) ─────────

function SnapGuideLine({ guide }: { guide: SnapGuide }) {
  if (guide.axis === "x") {
    // Line along Z at a fixed X position
    const length = guide.to - guide.from;
    const centerZ = (guide.from + guide.to) / 2;
    return (
      <mesh position={[guide.position, 0.002, centerZ]}>
        <boxGeometry args={[0.002, 0.002, length]} />
        <meshBasicMaterial color="#3B82F6" transparent opacity={0.85} depthTest={false} />
      </mesh>
    );
  }
  // Line along X at a fixed Z position
  const length = guide.to - guide.from;
  const centerX = (guide.from + guide.to) / 2;
  return (
    <mesh position={[centerX, 0.002, guide.position]}>
      <boxGeometry args={[length, 0.002, 0.002]} />
      <meshBasicMaterial color="#3B82F6" transparent opacity={0.85} depthTest={false} />
    </mesh>
  );
}

// ─── Rotation Ring (visual affordance) ──────────────────

function RotationRing({ panel }: { panel: PanelData }) {
  const radius = Math.max(panel.size[0], panel.size[2]) * 0.8 + 0.05;
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <group position={panel.position}>
      <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius, radius + 0.008, 64]} />
        <meshBasicMaterial color="#3B82F6" transparent opacity={0.5} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </group>
  );
}

// ─── Camera Controller (animates camera for view modes) ──

function CameraController({ viewMode }: { viewMode: ViewMode }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(2.5, 2, 3));
  const targetUp = useRef(new THREE.Vector3(0, 1, 0));
  const isAnimating = useRef(false);

  useEffect(() => {
    const config = VIEW_CAMERAS[viewMode];
    targetPos.current.set(...config.position);
    targetUp.current.set(...config.up);
    isAnimating.current = true;
  }, [viewMode]);

  useFrame(() => {
    if (!isAnimating.current) return;

    camera.position.lerp(targetPos.current, 0.12);
    camera.up.lerp(targetUp.current, 0.12);
    camera.lookAt(0, 0.3, 0);
    camera.updateProjectionMatrix();

    if (camera.position.distanceTo(targetPos.current) < 0.01) {
      camera.position.copy(targetPos.current);
      camera.up.copy(targetUp.current);
      camera.lookAt(0, 0.3, 0);
      camera.updateProjectionMatrix();
      isAnimating.current = false;
    }
  });

  return null;
}

// ─── Drag Controller (move + rotation + object snap) ────

function DragController({
  dragStateRef,
  snapEnabled,
  rotationMode,
  panels,
  onUpdatePanel,
  onSnapGuidesChange,
  onDragInfoChange,
  onInteractionEnd,
}: {
  dragStateRef: React.RefObject<DragState>;
  snapEnabled: boolean;
  rotationMode: boolean;
  panels: PanelData[];
  onUpdatePanel: (id: string, updates: Partial<PanelData>) => void;
  onSnapGuidesChange: (guides: SnapGuide[]) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
  onInteractionEnd: () => void;
}) {
  const { camera, gl, raycaster } = useThree();
  const shiftHeld = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Shift") shiftHeld.current = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === "Shift") shiftHeld.current = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;

    const getIntersectionPoint = (e: PointerEvent): THREE.Vector3 | null => {
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);

      if (shiftHeld.current) {
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();
        if (camDir.lengthSq() < 0.001) camDir.set(0, 0, 1);
        const plane = new THREE.Plane(camDir, 0);
        const point = new THREE.Vector3();
        return raycaster.ray.intersectPlane(plane, point) ? point : null;
      } else {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const point = new THREE.Vector3();
        return raycaster.ray.intersectPlane(plane, point) ? point : null;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds || !ds.isDragging || !ds.panelId) return;

      // ── Rotation drag mode ──
      if (rotationMode && ds.startClientX !== 0) {
        const deltaX = e.clientX - ds.startClientX;
        // 200px = 90 degrees
        let newRotY = ds.startRotY + (deltaX / 200) * (Math.PI / 2);

        // Snap rotation to 15° increments when snap is enabled
        if (snapEnabled) {
          const snap15 = Math.PI / 12;
          newRotY = Math.round(newRotY / snap15) * snap15;
        }

        const panel = panels.find(p => p.id === ds.panelId);
        if (panel) {
          const rot = [...(panel.rotation ?? [0, 0, 0])] as [number, number, number];
          rot[1] = newRotY;
          onUpdatePanel(ds.panelId, { rotation: rot });

          let degDisplay = ((newRotY * 180 / Math.PI) % 360 + 360) % 360;
          if (degDisplay > 180) degDisplay -= 360;
          onDragInfoChange({ position: panel.position, rotationDeg: degDisplay });
        }
        return;
      }

      // ── Position drag mode ──
      if (!ds.startPoint || !ds.startPos) return;
      const point = getIntersectionPoint(e);
      if (!point) return;

      const delta = point.clone().sub(ds.startPoint);
      const startPos = ds.startPos;

      let newPos: [number, number, number];
      if (shiftHeld.current) {
        newPos = [startPos[0], startPos[1] + delta.y, startPos[2]];
      } else {
        newPos = [startPos[0] + delta.x, startPos[1], startPos[2] + delta.z];
      }

      // Grid snap
      if (snapEnabled) {
        const grid = 0.01;
        newPos = [snapToGrid(newPos[0], grid), snapToGrid(newPos[1], grid), snapToGrid(newPos[2], grid)];
      }

      // Object-to-object snap
      const panel = panels.find(p => p.id === ds.panelId);
      if (panel) {
        const { snappedPos, guides } = computeObjectSnap(newPos, panel.size, panels, ds.panelId);
        newPos = snappedPos;
        onSnapGuidesChange(guides);
      }

      onUpdatePanel(ds.panelId, { position: newPos });
      onDragInfoChange({ position: newPos });
    };

    const onPointerUp = () => {
      const ds = dragStateRef.current;
      if (ds) {
        ds.isDragging = false;
        ds.panelId = null;
        ds.startPoint = null;
        ds.startPos = null;
        ds.startClientX = 0;
        ds.startRotY = 0;
      }
      canvas.style.cursor = "";
      onInteractionEnd();
      onSnapGuidesChange([]);
      onDragInfoChange(null);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [camera, gl, raycaster, snapEnabled, rotationMode, panels, onUpdatePanel, onSnapGuidesChange, onDragInfoChange, onInteractionEnd, dragStateRef]);

  return null;
}

// ─── Selection Handles (Figma-style resize) ─────────────

function SelectionHandles({
  panel,
  onUpdate,
  snapEnabled,
  onInteractionChange,
  onDragInfoChange,
}: {
  panel: PanelData;
  onUpdate: (id: string, updates: Partial<PanelData>) => void;
  snapEnabled: boolean;
  onInteractionChange: (active: boolean) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
}) {
  const shape = panel.shape ?? "box";
  if (shape !== "box") return null;

  const [w, h, d] = panel.size;

  const handles: { id: string; label: string; offset: [number, number, number]; axis: 0 | 1 | 2; dir: 1 | -1 }[] = [
    { id: "right",  label: "Width",  offset: [w / 2, 0, 0],      axis: 0, dir: 1 },
    { id: "left",   label: "Width",  offset: [-w / 2, 0, 0],     axis: 0, dir: -1 },
    { id: "top",    label: "Height", offset: [0, h / 2, 0],      axis: 1, dir: 1 },
    { id: "bottom", label: "Height", offset: [0, -h / 2, 0],     axis: 1, dir: -1 },
    { id: "front",  label: "Depth",  offset: [0, 0, -d / 2],     axis: 2, dir: -1 },
    { id: "back",   label: "Depth",  offset: [0, 0, d / 2],      axis: 2, dir: 1 },
  ];

  const cornerAxes: [0 | 1 | 2, 1 | -1, 0 | 1 | 2, 1 | -1][] = [
    [0, 1, 2, 1],   [0, -1, 2, 1],  [0, 1, 2, -1],  [0, -1, 2, -1],
    [0, 1, 2, 1],   [0, -1, 2, 1],  [0, 1, 2, -1],  [0, -1, 2, -1],
  ];

  const cornerOffsets: [number, number, number][] = [
    [w / 2, h / 2, d / 2],     [-w / 2, h / 2, d / 2],
    [w / 2, h / 2, -d / 2],    [-w / 2, h / 2, -d / 2],
    [w / 2, -h / 2, d / 2],    [-w / 2, -h / 2, d / 2],
    [w / 2, -h / 2, -d / 2],   [-w / 2, -h / 2, -d / 2],
  ];

  return (
    <group position={panel.position} rotation={panel.rotation as any ?? [0, 0, 0]}>
      {/* Wireframe outline */}
      <mesh>
        <boxGeometry args={[w + 0.002, h + 0.002, d + 0.002]} />
        <meshBasicMaterial color="#C87D5A" wireframe transparent opacity={0.5} />
      </mesh>

      {/* Face-center handles (single-axis, color-coded) */}
      {handles.map((handle) => (
        <ResizeHandle
          key={handle.id}
          handleLabel={handle.label}
          panelId={panel.id}
          panelPos={panel.position}
          panelSize={panel.size}
          offset={handle.offset}
          axes={[{ axis: handle.axis, dir: handle.dir }]}
          onUpdate={onUpdate}
          snapEnabled={snapEnabled}
          onInteractionChange={onInteractionChange}
          onDragInfoChange={onDragInfoChange}
        />
      ))}

      {/* Corner handles (dual-axis) */}
      {cornerOffsets.map((offset, i) => (
        <ResizeHandle
          key={`corner-${i}`}
          handleLabel="W+D"
          panelId={panel.id}
          panelPos={panel.position}
          panelSize={panel.size}
          offset={offset}
          axes={[
            { axis: cornerAxes[i][0], dir: cornerAxes[i][1] },
            { axis: cornerAxes[i][2], dir: cornerAxes[i][3] },
          ]}
          onUpdate={onUpdate}
          snapEnabled={snapEnabled}
          onInteractionChange={onInteractionChange}
          onDragInfoChange={onDragInfoChange}
        />
      ))}
    </group>
  );
}

// ─── Resize Handle ──────────────────────────────────────

function ResizeHandle({
  handleLabel,
  panelId,
  panelPos,
  panelSize,
  offset,
  axes,
  onUpdate,
  snapEnabled,
  onInteractionChange,
  onDragInfoChange,
}: {
  handleLabel: string;
  panelId: string;
  panelPos: [number, number, number];
  panelSize: [number, number, number];
  offset: [number, number, number];
  axes: { axis: 0 | 1 | 2; dir: 1 | -1 }[];
  onUpdate: (id: string, updates: Partial<PanelData>) => void;
  snapEnabled: boolean;
  onInteractionChange: (active: boolean) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef<{ point: THREE.Vector3; size: [number, number, number]; pos: [number, number, number] } | null>(null);
  const shiftHeld = useRef(false);
  const { camera, raycaster, gl } = useThree();

  // Determine color from primary axis
  const primaryAxis = axes[0].axis;
  const isCorner = axes.length > 1;
  const axisColor = isCorner ? "#f59e0b" : (AXIS_COLORS[primaryAxis] ?? "#888");
  const cursorStyle = primaryAxis === 1 ? "ns-resize" : "ew-resize";

  // Track shift for fine-grain snap
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Shift") shiftHeld.current = true; };
    const up = (e: KeyboardEvent) => { if (e.key === "Shift") shiftHeld.current = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const axisVec = new THREE.Vector3(
      primaryAxis === 0 ? 1 : 0,
      primaryAxis === 1 ? 1 : 0,
      primaryAxis === 2 ? 1 : 0
    );

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const planeNormal = new THREE.Vector3().crossVectors(axisVec, camDir).cross(axisVec).normalize();
    if (planeNormal.lengthSq() < 0.001) planeNormal.copy(camDir);

    const worldHandlePos = new THREE.Vector3(
      panelPos[0] + offset[0],
      panelPos[1] + offset[1],
      panelPos[2] + offset[2],
    );
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(planeNormal, worldHandlePos);

    const onPointerMove = (e: PointerEvent) => {
      if (!dragStart.current) return;

      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);
      const intersection = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, intersection)) return;

      const delta = intersection.clone().sub(dragStart.current.point);

      let newSize = [...dragStart.current.size] as [number, number, number];
      let newPos = [...dragStart.current.pos] as [number, number, number];

      for (const { axis, dir } of axes) {
        const axisDelta = [delta.x, delta.y, delta.z][axis] * dir;
        newSize[axis] = Math.max(0.005, dragStart.current.size[axis] + axisDelta);
        newPos[axis] = dragStart.current.pos[axis] + (axisDelta / 2) * dir;
      }

      // Snap: 10mm default, 1mm with Shift
      const gridSize = shiftHeld.current ? 0.001 : 0.01;
      if (snapEnabled) {
        for (const { axis } of axes) {
          newSize[axis] = snapToGrid(newSize[axis], gridSize);
          newPos[axis] = snapToGrid(newPos[axis], gridSize / 2);
        }
      }

      onUpdate(panelId, { size: newSize, position: newPos });

      // Build resize label: "Width: 600mm → 750mm"
      const dimNames = ["Width", "Height", "Depth"];
      const labels = axes.map(({ axis }) => {
        const oldMm = Math.round(dragStart.current!.size[axis] * 1000);
        const newMm = Math.round(newSize[axis] * 1000);
        return `${dimNames[axis]}: ${oldMm}mm → ${newMm}mm`;
      });
      onDragInfoChange({ position: newPos, resizeLabel: labels.join("  |  ") });
    };

    const onPointerUp = () => {
      setDragging(false);
      dragStart.current = null;
      gl.domElement.style.cursor = "";
      onInteractionChange(false);
      onDragInfoChange(null);
    };

    gl.domElement.addEventListener("pointermove", onPointerMove);
    gl.domElement.addEventListener("pointerup", onPointerUp);
    return () => {
      gl.domElement.removeEventListener("pointermove", onPointerMove);
      gl.domElement.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging, axes, panelId, panelPos, panelSize, offset, camera, raycaster, gl, onUpdate, snapEnabled, onInteractionChange, onDragInfoChange, primaryAxis]);

  return (
    <mesh
      ref={meshRef}
      position={offset}
      onPointerDown={(e) => {
        e.stopPropagation();
        setDragging(true);
        onInteractionChange(true);
        dragStart.current = {
          point: e.point.clone(),
          size: [...panelSize] as [number, number, number],
          pos: [...panelPos] as [number, number, number],
        };
        gl.domElement.style.cursor = cursorStyle;
      }}
      onPointerEnter={() => { setHovered(true); gl.domElement.style.cursor = cursorStyle; }}
      onPointerLeave={() => { if (!dragging) { setHovered(false); gl.domElement.style.cursor = ""; } }}
    >
      <boxGeometry args={[0.015, 0.015, 0.015]} />
      <meshStandardMaterial
        color={dragging ? "#ffffff" : hovered ? axisColor : axisColor}
        emissive={dragging ? axisColor : hovered ? axisColor : axisColor}
        emissiveIntensity={dragging ? 0.8 : hovered ? 0.5 : 0.2}
        roughness={0.3}
        metalness={0.3}
        transparent={!hovered && !dragging}
        opacity={hovered || dragging ? 1 : 0.7}
      />
    </mesh>
  );
}

// ─── Individual Panel (with door/drawer animation + drag) ─

function FurniturePanel({
  panel,
  selected,
  isOpen,
  rotationMode,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
}: {
  panel: PanelData;
  selected: boolean;
  isOpen: boolean;
  rotationMode: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (screenX: number, screenY: number) => void;
  onDragStart: (intersectionPoint: THREE.Vector3, clientX: number) => void;
}) {
  const mat = MATERIALS.find((m) => m.id === panel.materialId);
  const color = mat?.color ?? "#C4A265";
  const isGlass = mat?.id === "glass";
  const isMetal = mat?.category === "Metal";
  const shape = panel.shape ?? "box";
  const panelRotation = panel.rotation ?? [0, 0, 0];

  const panelIsDoor = isDoor(panel.label);
  const panelIsDrawer = isDrawer(panel.label);

  const groupRef = useRef<THREE.Group>(null!);
  const animProgress = useRef(isOpen ? 1 : 0);

  // Door direction: detect if right door should swing the other way
  const isRight = isRightDoor(panel.label);
  const swingDirection = isRight ? 1 : -1; // +1 = clockwise (right hinge), -1 = counterclockwise (left hinge)

  useFrame((_, delta) => {
    const target = isOpen ? 1 : 0;
    const speed = 3.5;
    animProgress.current = THREE.MathUtils.lerp(
      animProgress.current, target, Math.min(speed * delta * 4, 1)
    );
    if (!groupRef.current) return;
    if (panelIsDoor) {
      groupRef.current.rotation.y = animProgress.current * (swingDirection * Math.PI / 2);
    } else if (panelIsDrawer) {
      const slideDistance = panel.size[2] + 0.25;
      groupRef.current.position.z = -animProgress.current * slideDistance;
    }
  });

  // Shared material props
  const shapeMatProps = {
    color: selected ? "#e8c4a8" : color,
    roughness: isMetal ? 0.3 : 0.7,
    metalness: isMetal ? 0.8 : 0.05,
    transparent: isGlass,
    opacity: isGlass ? 0.3 : 1,
  };

  const handleClick = (e: any) => { e.stopPropagation(); onClick(); };
  const handlePointerDown = (e: any) => {
    if (e.nativeEvent.button === 2 && (panelIsDoor || panelIsDrawer)) {
      e.stopPropagation();
      onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
      return;
    }
    // Left click: start drag/rotation for non-interactive panels
    if (e.nativeEvent.button === 0 && !panelIsDoor && !panelIsDrawer) {
      e.stopPropagation();
      onDragStart(e.point.clone(), e.nativeEvent.clientX);
    }
  };

  const cursorStyle = rotationMode ? "grab" : "move";

  // Door: pivot from left edge (or right edge for Right Door)
  if (panelIsDoor) {
    const halfW = panel.size[0] / 2;
    // Right door: pivot from right edge; Left/generic door: pivot from left edge
    const pivotX = isRight
      ? panel.position[0] + halfW
      : panel.position[0] - halfW;
    const meshOffsetX = isRight ? -halfW : halfW;
    const hingeX = isRight ? -0.005 : 0.005;

    return (
      <group position={[pivotX, panel.position[1], panel.position[2]]} rotation={panelRotation as any}>
        <group ref={groupRef}>
          <group position={[meshOffsetX, 0, 0]}
            onClick={handleClick}
            onDoubleClick={(e: any) => { e.stopPropagation(); onDoubleClick(); }}
            onPointerDown={handlePointerDown}
          >
            <ShapeRenderer shape={shape} size={panel.size} shapeParams={panel.shapeParams}
              {...shapeMatProps} />
          </group>
          {/* Hinge indicators */}
          <mesh position={[hingeX, panel.size[1] * 0.3, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.02, 8]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[hingeX, -panel.size[1] * 0.3, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.02, 8]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
          </mesh>
          {selected && (
            <group position={[meshOffsetX, 0, 0]}>
              <ShapeRenderer shape={shape} size={panel.size} shapeParams={panel.shapeParams}
                {...shapeMatProps} isOutline />
            </group>
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
          <group onClick={handleClick}
            onDoubleClick={(e: any) => { e.stopPropagation(); onDoubleClick(); }}
            onPointerDown={handlePointerDown}
          >
            <ShapeRenderer shape={shape} size={panel.size} shapeParams={panel.shapeParams}
              {...shapeMatProps} />
          </group>
          <mesh position={[0, 0, -panel.size[2] / 2 - 0.01]}>
            <boxGeometry args={[0.06, 0.012, 0.012]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
          </mesh>
          {selected && (
            <ShapeRenderer shape={shape} size={panel.size} shapeParams={panel.shapeParams}
              {...shapeMatProps} isOutline />
          )}
        </group>
      </group>
    );
  }

  // Regular panel (draggable + rotatable) — supports all shapes including composites
  return (
    <group position={panel.position} rotation={panelRotation as any}>
      <group
        onClick={handleClick} onPointerDown={handlePointerDown}
        onPointerEnter={(e: any) => { document.body.style.cursor = cursorStyle; }}
        onPointerLeave={(e: any) => { document.body.style.cursor = ""; }}
      >
        <ShapeRenderer shape={shape} size={panel.size} shapeParams={panel.shapeParams}
          {...shapeMatProps} />
      </group>
      {selected && (
        <ShapeRenderer shape={shape} size={panel.size} shapeParams={panel.shapeParams}
          {...shapeMatProps} isOutline />
      )}
    </group>
  );
}
