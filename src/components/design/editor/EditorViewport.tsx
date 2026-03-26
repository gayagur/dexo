import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect, Suspense } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment, Lightformer, RoundedBox, useGLTF, useTexture } from "@react-three/drei";
// postprocessing removed — @react-three/postprocessing@3 requires fiber@9, crashes on fiber@8
import type { PanelData, GroupData } from "@/lib/furnitureData";
import { MATERIALS } from "@/lib/furnitureData";
import { ShapeRenderer, isCompositeShape } from "./ShapeRenderer";
import { getMaterialTextures } from "@/lib/materialTextures";
import { applyDesignMaterialToGlbRoot } from "@/lib/glbMaterialOverride";
import * as THREE from "three";

// ─── Helpers ───────────────────────────────────────────

/** Whole word only — avoids matching "doormat", "indoor", etc. */
function isDoor(label: string) { return /\bdoor\b/i.test(label); }
function isLeftDoor(label: string) { return /left\s*door/i.test(label); }
function isRightDoor(label: string) { return /right\s*door/i.test(label); }
/** Only true for operable drawer fronts — not "Drawer Left Wall" or similar internals */
function isDrawer(label: string) {
  const s = label.trim();
  if (/^drawer$/i.test(s)) return true;
  if (/^drawer\s+\d+$/i.test(s)) return true;
  return /\bdrawer\s+front\b/i.test(label);
}
function isInteractive(label: string) { return isDoor(label) || isDrawer(label); }

function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/** World point for drag/resize; falls back to mesh position if R3F omits intersection data (avoids null.point crashes). */
function getWorldPointFromPointerEvent(
  e: ThreeEvent<PointerEvent>,
  object: THREE.Object3D | null | undefined
): THREE.Vector3 | null {
  const direct = e.point ?? e.intersections?.[0]?.point;
  if (direct) return direct.clone();
  if (object) {
    const v = new THREE.Vector3();
    object.getWorldPosition(v);
    return v;
  }
  return null;
}

// ─── Types ─────────────────────────────────────────────

interface ContextMenuInfo {
  panelId: string;
  label: string;
  x: number;
  y: number;
  type: "door" | "drawer" | "group";
  groupId?: string;
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

/** 3D canvas lighting preset (manual furniture editor) */
export type EditorLightMode = "day" | "night";

/** Floor / backdrop style — all presets stay bright (no dark void) */
export type EditorFloorPreset = "studio" | "parquet" | "tile" | "grass";

export const EDITOR_FLOOR_OPTIONS: { value: EditorFloorPreset; label: string }[] = [
  { value: "studio", label: "Bright studio" },
  { value: "parquet", label: "Parquet" },
  { value: "tile", label: "Light tile" },
  { value: "grass", label: "Grass" },
];

const FLOOR_STYLE: Record<
  EditorFloorPreset,
  {
    sky: string;
    floorHex: string;
    roughness: number;
    metalness: number;
    gridCell: string;
    gridSection: string;
    hasTexture: boolean;
    repeat: number;
  }
> = {
  studio: {
    sky: "#e4e8f0",
    floorHex: "#d4dae6",
    roughness: 0.88,
    metalness: 0,
    gridCell: "#9ca6b8",
    gridSection: "#7a8498",
    hasTexture: false,
    repeat: 1,
  },
  parquet: {
    sky: "#f3ece4",
    floorHex: "#dfc9ae",
    roughness: 0.88,
    metalness: 0,
    gridCell: "#9a7860",
    gridSection: "#6d5340",
    hasTexture: true,
    repeat: 8,
  },
  tile: {
    sky: "#eef3f9",
    floorHex: "#fafcff",
    roughness: 0.42,
    metalness: 0.06,
    gridCell: "#b0b8c4",
    gridSection: "#8892a4",
    hasTexture: true,
    repeat: 10,
  },
  grass: {
    sky: "#e8f4ea",
    floorHex: "#b8de8f",
    roughness: 0.98,
    metalness: 0,
    gridCell: "#5a8c3a",
    gridSection: "#3d6b28",
    hasTexture: true,
    repeat: 7,
  },
};

function createEditorFloorTexture(preset: EditorFloorPreset): THREE.CanvasTexture | null {
  const style = FLOOR_STYLE[preset];
  if (!style.hasTexture) return null;

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (preset === "parquet") {
    ctx.fillStyle = "#f4e8d8";
    ctx.fillRect(0, 0, size, size);
    const rows = 10;
    const h = size / rows;
    for (let r = 0; r < rows; r++) {
      const v = (r % 3) * 10;
      ctx.fillStyle = `rgb(${248 - v}, ${224 - v}, ${198 - v})`;
      ctx.fillRect(0, r * h, size, h);
      ctx.strokeStyle = "rgba(90, 60, 30, 0.07)";
      ctx.strokeRect(0, r * h, size, h);
    }
    ctx.strokeStyle = "rgba(65, 42, 22, 0.14)";
    for (let c = 0; c <= 20; c++) {
      const x = (c * size) / 20;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
  } else if (preset === "tile") {
    ctx.fillStyle = "#fafcff";
    ctx.fillRect(0, 0, size, size);
    const n = 12;
    const t = size / n;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(130, 142, 158, 0.32)";
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(i * t, 0);
      ctx.lineTo(i * t, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * t);
      ctx.lineTo(size, i * t);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3);
        }
      }
    }
  } else {
    /* grass */
    ctx.fillStyle = "#d4ecc4";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 7000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const lum = 95 + Math.random() * 75;
      ctx.fillStyle = `rgba(${28 + Math.random() * 45}, ${lum}, ${32 + Math.random() * 30}, 0.22)`;
      ctx.fillRect(x, y, 2, 5);
    }
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    for (let i = 0; i < 24; i++) {
      ctx.fillRect(Math.random() * (size - 48), Math.random() * (size - 48), 36, 36);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(style.repeat, style.repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Adaptive performance: reduce DPR when FPS drops below threshold */
function AdaptivePerformance() {
  const { gl } = useThree();
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    const elapsed = now - lastTime.current;
    if (elapsed >= 2000) {
      const fps = (frameCount.current / elapsed) * 1000;
      if (fps < 25) {
        gl.setPixelRatio(1);
      } else if (fps > 50) {
        gl.setPixelRatio(Math.min(2, window.devicePixelRatio));
      }
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return null;
}

/** Tone-mapping exposure follows day / night */
function EditorToneExposure({ lightMode }: { lightMode: EditorLightMode }) {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    gl.toneMappingExposure = lightMode === "night" ? 0.68 : 1.12;
  }, [gl, lightMode]);
  return null;
}

/** Sky color + floor under the grid */
function EditorFloorBackdrop({
  floorPreset,
  lightMode,
}: {
  floorPreset: EditorFloorPreset;
  lightMode: EditorLightMode;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const style = FLOOR_STYLE[floorPreset];
  const texture = useMemo(() => createEditorFloorTexture(floorPreset), [floorPreset]);
  const night = lightMode === "night";

  const skyColor = useMemo(() => {
    const c = new THREE.Color(style.sky);
    if (night) c.multiplyScalar(0.32);
    return `#${c.getHexString()}`;
  }, [style.sky, night]);

  const solidFloorColor = useMemo(() => {
    const c = new THREE.Color(style.floorHex);
    if (night) c.multiplyScalar(0.36);
    return `#${c.getHexString()}`;
  }, [style.floorHex, night]);

  const mapTint = night ? "#7a808a" : "#ffffff";

  /* CanvasTexture + Environment often miss the first draw; force upload & extra frames */
  useLayoutEffect(() => {
    if (texture) {
      const maxA = gl.capabilities.getMaxAnisotropy?.() ?? 1;
      if (maxA > 1) texture.anisotropy = Math.min(8, maxA);
      texture.needsUpdate = true;
    }
    invalidate();
    const id = requestAnimationFrame(() => invalidate());
    return () => cancelAnimationFrame(id);
  }, [gl, texture, floorPreset, lightMode, invalidate]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  /* Subtle emissive keeps the floor readable before IBL / lights fully contribute */
  const emissiveIntensity = night ? 0.045 : 0.07;

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <mesh
        key={`floor-${floorPreset}`}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.0025, 0]}
        receiveShadow
      >
        <planeGeometry args={[48, 48]} />
        {texture ? (
          <meshStandardMaterial
            map={texture}
            color={mapTint}
            roughness={style.roughness + (night ? 0.06 : 0)}
            metalness={style.metalness}
            emissive={solidFloorColor}
            emissiveIntensity={emissiveIntensity}
          />
        ) : (
          <meshStandardMaterial
            color={solidFloorColor}
            roughness={style.roughness + (night ? 0.06 : 0)}
            metalness={style.metalness}
            emissive={solidFloorColor}
            emissiveIntensity={emissiveIntensity}
          />
        )}
      </mesh>
    </>
  );
}

const VIEW_CAMERAS: Record<ViewMode, { position: [number, number, number]; up: [number, number, number] }> = {
  "3d":    { position: [2.5, 2, 3],   up: [0, 1, 0] },
  "front": { position: [0, 0.5, 5],   up: [0, 1, 0] },   // XY — looking from +Z
  "top":   { position: [0, 5, 0.001], up: [0, 0, -1] },   // XZ — looking from +Y
  "side":  { position: [5, 0.5, 0],   up: [0, 1, 0] },    // YZ — looking from +X
};

// ─── Main Component ────────────────────────────────────

export interface EditorViewportProps {
  groups: GroupData[];
  ungroupedPanels: PanelData[];
  editingGroupId: string | null;
  editingPanels: PanelData[] | null;
  selectedPanelId: string | null;
  selectedGroupId: string | null;
  snapEnabled: boolean;
  rotationMode: boolean;
  viewMode: ViewMode;
  onSelectPanel: (id: string | null) => void;
  onSelectGroup: (id: string | null) => void;
  onUpdatePanel: (id: string, updates: Partial<PanelData>) => void;
  onUpdatePanelLive?: (id: string, updates: Partial<PanelData>) => void;
  onUpdateGroup: (groupId: string, updates: Partial<GroupData>) => void;
  onUpdateGroupLive?: (groupId: string, updates: Partial<GroupData>) => void;
  onEnterEditMode: (groupId: string) => void;
  onExitEditMode: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onUngroupGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onScaleGroup: (groupId: string, scaleX: number, scaleY: number, scaleZ: number) => void;
  onContextMenu?: (x: number, y: number, panelId: string | null, groupId: string | null) => void;
  lightMode: EditorLightMode;
  floorPreset: EditorFloorPreset;
  /** Initial 3D orbit camera position (e.g. when resuming a saved design). */
  initialCameraPosition?: [number, number, number];
  onCameraMove?: (pos: [number, number, number]) => void;
  /* Legacy prop — kept for backward compatibility during migration */
  panels?: PanelData[];
}

export function EditorViewport({
  groups,
  ungroupedPanels,
  editingGroupId,
  editingPanels,
  selectedPanelId,
  selectedGroupId,
  snapEnabled,
  rotationMode,
  viewMode,
  onSelectPanel,
  onSelectGroup,
  onUpdatePanel,
  onUpdatePanelLive,
  onUpdateGroup,
  onUpdateGroupLive,
  onEnterEditMode,
  onExitEditMode,
  onRenameGroup,
  onUngroupGroup,
  onDeleteGroup,
  onScaleGroup,
  onContextMenu: onContextMenuProp,
  lightMode,
  floorPreset,
  initialCameraPosition,
  onCameraMove,
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

  // Collect all panels for lookups: editing panels (world-space) + ungrouped panels
  const allVisiblePanels = useMemo(() => {
    if (editingPanels) return [...editingPanels, ...ungroupedPanels];
    return [...ungroupedPanels, ...groups.flatMap(g => g.panels)];
  }, [editingPanels, ungroupedPanels, groups]);

  const selectedPanel = allVisiblePanels.find((p) => p.id === selectedPanelId) ?? null;

  const floorVisual = FLOOR_STYLE[floorPreset];
  const gridCell = useMemo(() => {
    if (lightMode !== "night") return floorVisual.gridCell;
    const c = new THREE.Color(floorVisual.gridCell);
    c.multiplyScalar(0.48);
    return `#${c.getHexString()}`;
  }, [floorVisual.gridCell, lightMode]);
  const gridSection = useMemo(() => {
    if (lightMode !== "night") return floorVisual.gridSection;
    const c = new THREE.Color(floorVisual.gridSection);
    c.multiplyScalar(0.48);
    return `#${c.getHexString()}`;
  }, [floorVisual.gridSection, lightMode]);

  // Panels used for snap calculations
  const snapPanels = useMemo(() => {
    if (editingGroupId && editingPanels) return editingPanels;
    return ungroupedPanels;
  }, [editingGroupId, editingPanels, ungroupedPanels]);

  const dragStateRef = useRef<DragState>({
    isDragging: false,
    panelId: null,
    startPoint: null,
    startPos: null,
    startClientX: 0,
    startRotY: 0,
  });

  const nudge = useCallback((dx: number, dy: number, dz: number) => {
    if (selectedPanelId) {
      const panel = allVisiblePanels.find(p => p.id === selectedPanelId);
      if (panel) {
        const newPos: [number, number, number] = [
          panel.position[0] + dx,
          Math.max(0, panel.position[1] + dy),
          panel.position[2] + dz,
        ];
        onUpdatePanel(selectedPanelId, { position: newPos });
      }
    } else if (selectedGroupId) {
      const group = groups.find(g => g.id === selectedGroupId);
      if (group) {
        const newPos: [number, number, number] = [
          group.position[0] + dx,
          Math.max(0, group.position[1] + dy),
          group.position[2] + dz,
        ];
        onUpdateGroup(selectedGroupId, { position: newPos });
      }
    }
  }, [selectedPanelId, selectedGroupId, allVisiblePanels, groups, onUpdatePanel, onUpdateGroup]);

  const startDrag = useCallback((panelId: string, intersectionPoint: THREE.Vector3, clientX: number) => {
    const panel = allVisiblePanels.find(p => p.id === panelId);
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
  }, [allVisiblePanels, rotationMode]);

  // Start drag for a group (drag the whole group by its position)
  const startGroupDrag = useCallback((groupId: string, intersectionPoint: THREE.Vector3, clientX: number) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    setInteractionActive(true);

    if (rotationMode) {
      dragStateRef.current = {
        isDragging: true,
        panelId: `__group__${groupId}`,
        startPoint: null,
        startPos: [...group.position] as [number, number, number],
        startClientX: clientX,
        startRotY: group.rotation[1],
      };
    } else {
      dragStateRef.current = {
        isDragging: true,
        panelId: `__group__${groupId}`,
        startPoint: intersectionPoint.clone(),
        startPos: [...group.position] as [number, number, number],
        startClientX: 0,
        startRotY: 0,
      };
    }
  }, [groups, rotationMode]);

  return (
    <div
      className={`w-full h-full rounded-xl overflow-hidden border relative ${
        lightMode === "night" ? "bg-[#0f0f16] border-gray-700" : "bg-[#eceff4] border-gray-200"
      }`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        frameloop="always"
        dpr={[1, 2]}
        camera={{ position: initialCameraPosition ?? [2.5, 2, 3], fov: 45 }}
        shadows
        gl={{
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
        }}
        onCreated={(state) => {
          requestAnimationFrame(() => state.invalidate());
        }}
        onPointerMissed={() => {
          if (editingGroupId) {
            onSelectPanel(null); // Deselect but stay in edit mode
          } else {
            onSelectPanel(null);
            onSelectGroup(null);
          }
          closeContextMenu();
        }}
      >
        <AdaptivePerformance />
        <EditorToneExposure lightMode={lightMode} />
        <EditorFloorBackdrop floorPreset={floorPreset} lightMode={lightMode} />

        {/* Lighting — night is intentionally dim (no fake dark floor plane) */}
        {lightMode === "night" ? (
          <>
            <Environment resolution={512} environmentIntensity={0.26}>
              <Lightformer form="rect" intensity={0.35} color="#2a2d48" scale={[10, 4]} position={[0, 6, -2]} rotation={[Math.PI / 2, 0, 0]} />
              <Lightformer form="circle" intensity={0.55} color="#ffd4a8" scale={2} position={[3, 2.5, -2]} />
              <Lightformer form="circle" intensity={0.35} color="#ffc9a0" scale={1.5} position={[-3, 2, 1]} />
            </Environment>
            <hemisphereLight skyColor="#1e1e2e" groundColor="#121018" intensity={0.22} />
            <directionalLight
              position={[-4, 8, 4]}
              intensity={0.28}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-bias={-0.0001}
              shadow-camera-left={-5}
              shadow-camera-right={5}
              shadow-camera-top={5}
              shadow-camera-bottom={-5}
              color="#a8b8d8"
            />
            <ambientLight intensity={0.06} color="#3a3f55" />
            <pointLight position={[1, 2.5, -1]} intensity={0.55} color="#ffd699" distance={7} decay={2} />
            <pointLight position={[-1.5, 2, 1]} intensity={0.4} color="#ffccaa" distance={6} decay={2} />
          </>
        ) : (
          <>
            <Environment resolution={512} environmentIntensity={0.95}>
              <Lightformer form="rect" intensity={2.2} color="white" scale={[10, 4]} position={[0, 6, -2]} rotation={[Math.PI / 2, 0, 0]} />
              <Lightformer form="rect" intensity={0.65} color="#eef4ff" scale={[5, 5]} position={[-6, 2, 2]} rotation={[0, Math.PI / 2, 0]} />
              <Lightformer form="circle" intensity={2.2} color="#fffaf0" scale={3} position={[4, 3, -4]} />
            </Environment>
            <hemisphereLight skyColor="#ffffff" groundColor="#e8eaef" intensity={0.38} />
            <directionalLight
              position={[-4, 8, 4]}
              intensity={1.35}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-bias={-0.0001}
              shadow-camera-left={-5}
              shadow-camera-right={5}
              shadow-camera-top={5}
              shadow-camera-bottom={-5}
              color="#ffffff"
            />
            <ambientLight intensity={0.42} color="#ffffff" />
          </>
        )}

        <Grid
          args={[10, 10]}
          cellSize={0.1}
          cellThickness={0.5}
          cellColor={gridCell}
          sectionSize={1}
          sectionThickness={1}
          sectionColor={gridSection}
          fadeDistance={lightMode === "night" ? 14 : 8}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />

        {/* ── Render groups ── */}
        {groups.map((g) => {
          const isEditing = editingGroupId === g.id;
          const isSelected = selectedGroupId === g.id;
          const isDimmed = editingGroupId !== null && !isEditing;

          if (isEditing && editingPanels) {
            // Edit mode: render panels at world-space (outside group transform)
            return (
              <React.Fragment key={g.id}>
                {editingPanels.map((panel) => (
                  <FurniturePanel
                    key={panel.id}
                    panel={panel}
                    lightMode={lightMode}
                    selected={panel.id === selectedPanelId}
                    opacity={panel.id === selectedPanelId ? 1 : 0.7}
                    isOpen={!!openPanels[panel.id]}
                    rotationMode={rotationMode}
                    onClick={() => { onSelectPanel(panel.id); closeContextMenu(); }}
                    onDoubleClick={() => { if (isInteractive(panel.label)) togglePanel(panel.id); }}
                    onContextMenu={(x, y) => {
                      if (isDoor(panel.label)) {
                        setContextMenu({ panelId: panel.id, label: panel.label, x, y, type: "door" });
                      } else if (isDrawer(panel.label)) {
                        setContextMenu({ panelId: panel.id, label: panel.label, x, y, type: "drawer" });
                      } else {
                        onContextMenuProp?.(x, y, panel.id, null);
                      }
                    }}
                    onDragStart={(intersectionPoint, clientX) => startDrag(panel.id, intersectionPoint, clientX)}
                  />
                ))}
              </React.Fragment>
            );
          }

          return (
            <group key={g.id} position={g.position} rotation={g.rotation} scale={g.scale ?? [1, 1, 1]}>
              {g.glbUrl ? (
                /* Imported GLB model — render original 3D geometry */
                <Suspense fallback={null}>
                  <GLBModelRenderer
                    url={g.glbUrl}
                    panels={g.panels}
                    preserveGlbDiffuseMaps={g.preserveGlbDiffuseMaps}
                    lightMode={lightMode}
                    dimmed={isDimmed}
                    onClick={(e) => { if (e) e.stopPropagation(); if (!isDimmed) { onSelectGroup(g.id); onSelectPanel(null); closeContextMenu(); } }}
                    onDoubleClick={(e) => { if (e) e.stopPropagation(); if (!isDimmed) onEnterEditMode(g.id); }}
                    onContextMenu={(x, y) => {
                      if (!isDimmed) {
                        onContextMenuProp?.(x, y, null, g.id);
                      }
                    }}
                    onPointerDown={(pt, clientX) => { if (!isDimmed) startGroupDrag(g.id, pt, clientX); }}
                  />
                </Suspense>
              ) : (
                /* Component-based template — render box panels */
                g.panels.map((panel) => (
                  <FurniturePanel
                    key={panel.id}
                    panel={panel}
                    lightMode={lightMode}
                    selected={false}
                    dimmed={isDimmed}
                    opacity={isDimmed ? 0.3 : 1}
                    isOpen={!!openPanels[panel.id]}
                    rotationMode={rotationMode}
                    onClick={(e) => { if (e) e.stopPropagation(); if (!isDimmed) { onSelectGroup(g.id); onSelectPanel(null); closeContextMenu(); } }}
                    onDoubleClick={(e) => { if (e) e.stopPropagation(); if (!isDimmed) onEnterEditMode(g.id); }}
                    onContextMenu={(x, y) => {
                      if (!isDimmed) {
                        onContextMenuProp?.(x, y, null, g.id);
                      } else if (isDoor(panel.label)) {
                        setContextMenu({ panelId: panel.id, label: panel.label, x, y, type: "door" });
                      } else if (isDrawer(panel.label)) {
                        setContextMenu({ panelId: panel.id, label: panel.label, x, y, type: "drawer" });
                      }
                    }}
                    onDragStart={(intersectionPoint, clientX) => { if (!isDimmed) startGroupDrag(g.id, intersectionPoint, clientX); }}
                  />
                ))
              )}
              {isSelected && <GroupBoundingBox panels={g.panels} color="#3b82f6" />}
            </group>
          );
        })}

        {/* ── Render ungrouped panels ── */}
        {ungroupedPanels.map((panel) => {
          const isDimmed = editingGroupId !== null;
          return (
            <FurniturePanel
              key={panel.id}
              panel={panel}
              lightMode={lightMode}
              selected={panel.id === selectedPanelId}
              dimmed={isDimmed}
              opacity={isDimmed ? 0.3 : 1}
              isOpen={!!openPanels[panel.id]}
              rotationMode={rotationMode}
              onClick={() => { if (!isDimmed) { onSelectPanel(panel.id); onSelectGroup(null); closeContextMenu(); } }}
              onDoubleClick={() => { if (!isDimmed && isInteractive(panel.label)) togglePanel(panel.id); }}
              onContextMenu={(x, y) => {
                if (!isDimmed) {
                  if (isDoor(panel.label)) {
                    setContextMenu({ panelId: panel.id, label: panel.label, x, y, type: "door" });
                  } else if (isDrawer(panel.label)) {
                    setContextMenu({ panelId: panel.id, label: panel.label, x, y, type: "drawer" });
                  } else {
                    onContextMenuProp?.(x, y, panel.id, null);
                  }
                }
              }}
              onDragStart={(intersectionPoint, clientX) => { if (!isDimmed) startDrag(panel.id, intersectionPoint, clientX); }}
            />
          );
        })}

        {/* ── Edit mode dashed border ── */}
        {editingGroupId && editingPanels && (
          <GroupBoundingBox panels={editingPanels} color="#f97316" dashed />
        )}

        {/* Drag controller — handles move, object snap, and rotation */}
        <DragController
          dragStateRef={dragStateRef}
          snapEnabled={snapEnabled}
          rotationMode={rotationMode}
          panels={snapPanels}
          groups={groups}
          onUpdatePanel={onUpdatePanel}
          onUpdatePanelLive={onUpdatePanelLive}
          onUpdateGroup={onUpdateGroup}
          onUpdateGroupLive={onUpdateGroupLive}
          onSnapGuidesChange={setSnapGuides}
          onDragInfoChange={setDragInfo}
          onInteractionEnd={() => setInteractionActive(false)}
        />

        {/* Snap guide lines (blue alignment guides) */}
        {snapGuides.map((guide, i) => (
          <SnapGuideLine key={i} guide={guide} />
        ))}

        {/* Selection handles for resize (only for ungrouped panels or panels in edit mode, not groups) */}
        {selectedPanel && !selectedGroupId && !rotationMode && (
          <SelectionHandles
            panel={selectedPanel}
            onUpdate={onUpdatePanel}
            onUpdateLive={onUpdatePanelLive}
            snapEnabled={snapEnabled}
            onInteractionChange={setInteractionActive}
            onDragInfoChange={setDragInfo}
          />
        )}

        {/* Y-axis vertical move handle */}
        {selectedPanel && !selectedGroupId && !rotationMode && (() => {
          const panel = selectedPanel;
          if (!panel) return null;
          return (
            <YAxisHandle
              panel={panel}
              onUpdateLive={onUpdatePanelLive ?? onUpdatePanel}
              onCommit={onUpdatePanel}
              onInteractionChange={setInteractionActive}
              onDragInfoChange={setDragInfo}
            />
          );
        })()}

        {/* Draggable rotation ring — always visible when a panel is selected */}
        {selectedPanel && !selectedGroupId && (
          <DraggableRotationRing
            panel={selectedPanel}
            onUpdateLive={onUpdatePanelLive ?? onUpdatePanel}
            onCommit={onUpdatePanel}
            onInteractionChange={setInteractionActive}
            onDragInfoChange={setDragInfo}
          />
        )}

        {/* Group resize handles (Scene Mode, group selected, not rotation mode) */}
        {selectedGroupId && !editingGroupId && !rotationMode && (() => {
          const group = groups.find(g => g.id === selectedGroupId);
          return group ? (
            <GroupSelectionHandles
              group={group}
              onScaleGroup={onScaleGroup}
              onInteractionChange={setInteractionActive}
              onDragInfoChange={setDragInfo}
            />
          ) : null;
        })()}

        {/* Y-axis handle for group vertical movement */}
        {selectedGroupId && !editingGroupId && !rotationMode && (() => {
          const group = groups.find(g => g.id === selectedGroupId);
          if (!group) return null;
          // Compute group bounding box height
          let maxY = -Infinity;
          for (const p of group.panels) {
            maxY = Math.max(maxY, p.position[1] + p.size[1] / 2);
          }
          const groupHeight = maxY > 0 ? maxY : 0.3;
          // Create a fake "panel" for YAxisHandle positioning
          const fakePanel = {
            id: `__group__${group.id}`,
            position: group.position as [number, number, number],
            size: [0.3, groupHeight * 2, 0.3] as [number, number, number],
            type: "horizontal" as const,
            label: group.name,
            materialId: "oak",
          };
          return (
            <YAxisHandle
              panel={fakePanel}
              onUpdateLive={(_, updates) => {
                if (updates.position) {
                  (onUpdateGroupLive ?? onUpdateGroup)(group.id, { position: updates.position });
                }
              }}
              onCommit={(_, updates) => {
                if (updates.position) {
                  onUpdateGroup(group.id, { position: updates.position });
                }
              }}
              onInteractionChange={setInteractionActive}
              onDragInfoChange={setDragInfo}
            />
          );
        })()}

        {/* Group rotation ring — always visible when a group is selected */}
        {selectedGroupId && !editingGroupId && (() => {
          const group = groups.find(g => g.id === selectedGroupId);
          return group ? (
            <GroupRotationRing
              group={group}
              onUpdateLive={onUpdateGroupLive ?? onUpdateGroup}
              onCommit={onUpdateGroup}
              onInteractionChange={setInteractionActive}
              onDragInfoChange={setDragInfo}
            />
          ) : null;
        })()}

        {/* Set camera when viewMode changes */}
        <ViewSetter viewMode={viewMode} />
        <CameraTracker onMove={onCameraMove} />

        <OrbitControls
          makeDefault
          enabled={!interactionActive}
          enableRotate={viewMode === "3d"}
          enablePan={true}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.PAN,
          }}
          minDistance={0.5}
          maxDistance={15}
        />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport />
        </GizmoHelper>

        {/* Post-processing removed — incompatible with fiber@8, crashes WebGL */}
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

      {/* Mode indicator */}
      {rotationMode ? (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium z-40 pointer-events-none">
          Rotation Mode &mdash; drag object to rotate &middot; Press R or Esc to exit
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 text-[10px] text-gray-400 z-40 pointer-events-none flex gap-3">
          <span>Drag: move X/Z</span>
          <span>Shift+Drag: move Y</span>
          <span>Right-click drag: pan camera</span>
          <span>Scroll: zoom</span>
        </div>
      )}

      {/* Context menu overlay */}
      {contextMenu && (
        <div className="absolute z-50" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]">
            <>
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
              </>
          </div>
        </div>
      )}

      {/* Navigation pad — bottom-left overlay */}
      {(selectedPanelId || selectedGroupId) && (
        <div className="absolute bottom-12 left-3 z-20 select-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200 p-1.5">
            {/* Top: Forward */}
            <div className="flex justify-center mb-0.5">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); nudge(0, 0, -0.01); }}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title="Move forward (Z-)"
              >
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1L11 8H1Z" fill="currentColor"/></svg>
              </button>
            </div>
            {/* Middle: Left, Up, Down, Right */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); nudge(-0.01, 0, 0); }}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title="Move left (X-)"
              >
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 6L8 1V11Z" fill="currentColor"/></svg>
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); nudge(0, 0.01, 0); }}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-green-50 text-green-500 hover:text-green-700 transition-colors"
                title="Move up (Y+)"
              >
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 0L10 7H0Z" fill="currentColor"/></svg>
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); nudge(0, -0.01, 0); }}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-green-50 text-green-500 hover:text-green-700 transition-colors"
                title="Move down (Y-)"
              >
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 10L0 3H10Z" fill="currentColor"/></svg>
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); nudge(0.01, 0, 0); }}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title="Move right (X+)"
              >
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M11 6L4 1V11Z" fill="currentColor"/></svg>
              </button>
            </div>
            {/* Bottom: Backward */}
            <div className="flex justify-center mt-0.5">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); nudge(0, 0, 0.01); }}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title="Move backward (Z+)"
              >
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 11L1 4H11Z" fill="currentColor"/></svg>
              </button>
            </div>
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

// ─── Draggable Rotation Ring ─────────────────────────────

function DraggableRotationRing({
  panel,
  onUpdateLive,
  onCommit,
  onInteractionChange,
  onDragInfoChange,
}: {
  panel: PanelData;
  onUpdateLive: (id: string, updates: Partial<PanelData>) => void;
  onCommit?: (id: string, updates: Partial<PanelData>) => void;
  onInteractionChange: (active: boolean) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
}) {
  const radius = Math.max(panel.size[0], panel.size[2]) * 0.7 + 0.06;
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef<{ clientX: number; startRotY: number } | null>(null);
  const { gl } = useThree();

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!dragStart.current) return;
      const deltaX = e.clientX - dragStart.current.clientX;
      // 200px = 90 degrees
      const deltaRad = (deltaX / 200) * (Math.PI / 2);
      const newRotY = dragStart.current.startRotY + deltaRad;
      const rot = [...(panel.rotation ?? [0, 0, 0])] as [number, number, number];
      rot[1] = newRotY;
      onUpdateLive(panel.id, { rotation: rot });

      const degrees = Math.round((newRotY * 180) / Math.PI) % 360;
      const startDeg = Math.round((dragStart.current.startRotY * 180) / Math.PI) % 360;
      onDragInfoChange({ position: panel.position, resizeLabel: `Y: ${startDeg}° → ${degrees}°` });
    };

    const onPointerUp = () => {
      setDragging(false);
      dragStart.current = null;
      gl.domElement.style.cursor = "";
      onInteractionChange(false);
      onDragInfoChange(null);
      if (onCommit) {
        onCommit(panel.id, { rotation: panel.rotation });
      }
    };

    gl.domElement.addEventListener("pointermove", onPointerMove);
    gl.domElement.addEventListener("pointerup", onPointerUp);
    return () => {
      gl.domElement.removeEventListener("pointermove", onPointerMove);
      gl.domElement.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging, panel, gl, onUpdateLive, onCommit, onInteractionChange, onDragInfoChange]);

  return (
    <group position={[panel.position[0], panel.position[1] + panel.size[1] / 2 + 0.04, panel.position[2]]}>
      {/* Draggable ring above the object */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setDragging(true);
          onInteractionChange(true);
          dragStart.current = {
            clientX: (e as any).nativeEvent?.clientX ?? e.clientX,
            startRotY: (panel.rotation ?? [0, 0, 0])[1],
          };
          gl.domElement.style.cursor = "ew-resize";
        }}
        onPointerEnter={() => { setHovered(true); gl.domElement.style.cursor = "ew-resize"; }}
        onPointerLeave={() => { if (!dragging) { setHovered(false); gl.domElement.style.cursor = ""; } }}
      >
        <torusGeometry args={[radius, 0.012, 8, 48, Math.PI * 1.5]} />
        <meshStandardMaterial
          color={dragging ? "#2563EB" : "#3B82F6"}
          emissive="#3B82F6"
          emissiveIntensity={dragging ? 0.8 : hovered ? 0.5 : 0.2}
          transparent
          opacity={dragging || hovered ? 0.9 : 0.6}
          depthTest={false}
        />
      </mesh>

      {/* Arrow tip at end of arc */}
      <mesh position={[0, 0, -radius]} rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[0.02, 0.04, 6]} />
        <meshStandardMaterial
          color="#3B82F6"
          emissive="#3B82F6"
          emissiveIntensity={0.3}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

// ─── View Setter (sets camera position for view modes) ──

function ViewSetter({ viewMode }: { viewMode: ViewMode }) {
  const { camera } = useThree();
  const prevMode = useRef<ViewMode>("3d");

  useEffect(() => {
    if (prevMode.current === viewMode) return;
    prevMode.current = viewMode;

    const config = VIEW_CAMERAS[viewMode];
    camera.position.set(...config.position);
    camera.up.set(...config.up);
    camera.lookAt(0, 0.3, 0);
    camera.updateProjectionMatrix();
  }, [viewMode, camera]);

  return null;
}

/** Reports camera position to parent on each frame (throttled) */
function CameraTracker({ onMove }: { onMove?: (pos: [number, number, number]) => void }) {
  const { camera } = useThree();
  const lastReport = useRef(0);
  useFrame(() => {
    if (!onMove) return;
    const now = Date.now();
    if (now - lastReport.current < 500) return; // throttle to 2Hz
    lastReport.current = now;
    onMove([camera.position.x, camera.position.y, camera.position.z]);
  });
  return null;
}

// ─── Drag Controller (move + rotation + object snap) ────

function DragController({
  dragStateRef,
  snapEnabled,
  rotationMode,
  panels,
  groups,
  onUpdatePanel,
  onUpdatePanelLive,
  onUpdateGroup,
  onUpdateGroupLive,
  onSnapGuidesChange,
  onDragInfoChange,
  onInteractionEnd,
}: {
  dragStateRef: React.RefObject<DragState>;
  snapEnabled: boolean;
  rotationMode: boolean;
  panels: PanelData[];
  groups: GroupData[];
  onUpdatePanel: (id: string, updates: Partial<PanelData>) => void;
  onUpdatePanelLive?: (id: string, updates: Partial<PanelData>) => void;
  onUpdateGroup: (groupId: string, updates: Partial<GroupData>) => void;
  onUpdateGroupLive?: (groupId: string, updates: Partial<GroupData>) => void;
  onSnapGuidesChange: (guides: SnapGuide[]) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
  onInteractionEnd: () => void;
}) {
  const { camera, gl, raycaster } = useThree();
  const shiftHeld = useRef(false);
  // Track the last committed update so we can write history once on pointerup
  const lastPanelUpdate = useRef<{ id: string; updates: Partial<PanelData> } | null>(null);
  const lastGroupUpdate = useRef<{ groupId: string; updates: Partial<GroupData> } | null>(null);

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

    // Helper aliases: use live (no-history) path during drag, fall back to commit path if live not provided
    const livePanel = onUpdatePanelLive ?? onUpdatePanel;
    const liveGroup = onUpdateGroupLive ?? onUpdateGroup;

    const onPointerMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds || !ds.isDragging || !ds.panelId) return;

      const isGroupDrag = ds.panelId.startsWith("__group__");
      const groupId = isGroupDrag ? ds.panelId.replace("__group__", "") : null;

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

        if (isGroupDrag && groupId) {
          const group = groups.find(g => g.id === groupId);
          if (group) {
            const rot = [...group.rotation] as [number, number, number];
            rot[1] = newRotY;
            liveGroup(groupId, { rotation: rot });
            lastGroupUpdate.current = { groupId, updates: { rotation: rot } };

            let degDisplay = ((newRotY * 180 / Math.PI) % 360 + 360) % 360;
            if (degDisplay > 180) degDisplay -= 360;
            onDragInfoChange({ position: group.position, rotationDeg: degDisplay });
          }
        } else {
          const panel = panels.find(p => p.id === ds.panelId);
          if (panel) {
            const rot = [...(panel.rotation ?? [0, 0, 0])] as [number, number, number];
            rot[1] = newRotY;
            livePanel(ds.panelId, { rotation: rot });
            lastPanelUpdate.current = { id: ds.panelId, updates: { rotation: rot } };

            let degDisplay = ((newRotY * 180 / Math.PI) % 360 + 360) % 360;
            if (degDisplay > 180) degDisplay -= 360;
            onDragInfoChange({ position: panel.position, rotationDeg: degDisplay });
          }
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

      if (isGroupDrag && groupId) {
        // Group position drag — no object-to-object snap for groups for now
        liveGroup(groupId, { position: newPos });
        lastGroupUpdate.current = { groupId, updates: { position: newPos } };
        onDragInfoChange({ position: newPos });
      } else {
        // Object-to-object snap
        const panel = panels.find(p => p.id === ds.panelId);
        if (panel) {
          const { snappedPos, guides } = computeObjectSnap(newPos, panel.size, panels, ds.panelId);
          newPos = snappedPos;
          onSnapGuidesChange(guides);
        }

        livePanel(ds.panelId, { position: newPos });
        lastPanelUpdate.current = { id: ds.panelId, updates: { position: newPos } };
        onDragInfoChange({ position: newPos });
      }
    };

    const onPointerUp = () => {
      const ds = dragStateRef.current;
      if (ds) {
        // Commit the final position/rotation to history (one entry for the whole drag)
        if (lastPanelUpdate.current) {
          onUpdatePanel(lastPanelUpdate.current.id, lastPanelUpdate.current.updates);
          lastPanelUpdate.current = null;
        }
        if (lastGroupUpdate.current) {
          onUpdateGroup(lastGroupUpdate.current.groupId, lastGroupUpdate.current.updates);
          lastGroupUpdate.current = null;
        }
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
  }, [camera, gl, raycaster, snapEnabled, rotationMode, panels, groups, onUpdatePanel, onUpdatePanelLive, onUpdateGroup, onUpdateGroupLive, onSnapGuidesChange, onDragInfoChange, onInteractionEnd, dragStateRef]);

  return null;
}

// ─── Selection Handles (Figma-style resize) ─────────────

function SelectionHandles({
  panel,
  onUpdate,
  onUpdateLive,
  snapEnabled,
  onInteractionChange,
  onDragInfoChange,
}: {
  panel: PanelData;
  onUpdate: (id: string, updates: Partial<PanelData>) => void;
  onUpdateLive?: (id: string, updates: Partial<PanelData>) => void;
  snapEnabled: boolean;
  onInteractionChange: (active: boolean) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
}) {
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
          onUpdateLive={onUpdateLive}
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
          onUpdateLive={onUpdateLive}
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
  onUpdateLive,
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
  onUpdateLive?: (id: string, updates: Partial<PanelData>) => void;
  snapEnabled: boolean;
  onInteractionChange: (active: boolean) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef<{ point: THREE.Vector3; size: [number, number, number]; pos: [number, number, number] } | null>(null);
  const lastResizeUpdate = useRef<{ size: [number, number, number]; pos: [number, number, number] } | null>(null);
  const shiftHeld = useRef(false);
  const { camera, raycaster, gl } = useThree();
  const liveUpdate = onUpdateLive ?? onUpdate;

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
        newSize[axis] = Math.max(0.01, dragStart.current.size[axis] + axisDelta);
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

      liveUpdate(panelId, { size: newSize, position: newPos });
      lastResizeUpdate.current = { size: newSize, pos: newPos };

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
      // Commit the final size/position to history once
      if (lastResizeUpdate.current) {
        onUpdate(panelId, { size: lastResizeUpdate.current.size, position: lastResizeUpdate.current.pos });
        lastResizeUpdate.current = null;
      }
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
  }, [dragging, axes, panelId, panelPos, panelSize, offset, camera, raycaster, gl, onUpdate, liveUpdate, snapEnabled, onInteractionChange, onDragInfoChange, primaryAxis]);

  return (
    <mesh
      ref={meshRef}
      position={offset}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const pt = getWorldPointFromPointerEvent(e, e.object);
        if (!pt) return;
        setDragging(true);
        onInteractionChange(true);
        dragStart.current = {
          point: pt,
          size: [...panelSize] as [number, number, number],
          pos: [...panelPos] as [number, number, number],
        };
        gl.domElement.style.cursor = cursorStyle;
      }}
      onPointerEnter={() => { setHovered(true); gl.domElement.style.cursor = cursorStyle; }}
      onPointerLeave={() => { if (!dragging) { setHovered(false); gl.domElement.style.cursor = ""; } }}
    >
      <boxGeometry args={[0.04, 0.04, 0.04]} />
      <meshStandardMaterial
        color={dragging ? "#3B82F6" : hovered ? "#ffffff" : "#ffffff"}
        emissive={dragging ? "#3B82F6" : hovered ? "#3B82F6" : "#93C5FD"}
        emissiveIntensity={dragging ? 0.8 : hovered ? 0.6 : 0.3}
        roughness={0.2}
        metalness={0.1}
        transparent={!hovered && !dragging}
        opacity={hovered || dragging ? 1 : 0.85}
      />
    </mesh>
  );
}

// ─── Group Rotation Ring (Draggable) ─────────────────────

function GroupRotationRing({
  group,
  onUpdateLive,
  onCommit,
  onInteractionChange,
  onDragInfoChange,
}: {
  group: GroupData;
  onUpdateLive: (groupId: string, updates: Partial<GroupData>) => void;
  onCommit?: (groupId: string, updates: Partial<GroupData>) => void;
  onInteractionChange: (active: boolean) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
}) {
  const panels = group.panels;
  let maxX = -Infinity, maxZ = -Infinity, maxY = -Infinity;
  for (const p of panels) {
    maxX = Math.max(maxX, Math.abs(p.position[0]) + p.size[0] / 2);
    maxZ = Math.max(maxZ, Math.abs(p.position[2]) + p.size[2] / 2);
    maxY = Math.max(maxY, p.position[1] + p.size[1] / 2);
  }
  const radius = Math.max(maxX, maxZ) * 0.7 + 0.06;
  const ringY = (maxY === -Infinity ? 0 : maxY) + 0.04;

  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef<{ clientX: number; startRotY: number } | null>(null);
  const { gl } = useThree();

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!dragStart.current) return;
      const deltaX = e.clientX - dragStart.current.clientX;
      const deltaRad = (deltaX / 200) * (Math.PI / 2);
      const newRotY = dragStart.current.startRotY + deltaRad;
      const rot = [...group.rotation] as [number, number, number];
      rot[1] = newRotY;
      onUpdateLive(group.id, { rotation: rot });

      const degrees = Math.round((newRotY * 180) / Math.PI) % 360;
      const startDeg = Math.round((dragStart.current.startRotY * 180) / Math.PI) % 360;
      onDragInfoChange({ position: group.position, resizeLabel: `Y: ${startDeg}° → ${degrees}°` });
    };

    const onPointerUp = () => {
      setDragging(false);
      dragStart.current = null;
      gl.domElement.style.cursor = "";
      onInteractionChange(false);
      onDragInfoChange(null);
      if (onCommit) {
        onCommit(group.id, { rotation: group.rotation });
      }
    };

    gl.domElement.addEventListener("pointermove", onPointerMove);
    gl.domElement.addEventListener("pointerup", onPointerUp);
    return () => {
      gl.domElement.removeEventListener("pointermove", onPointerMove);
      gl.domElement.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging, group, gl, onUpdateLive, onCommit, onInteractionChange, onDragInfoChange]);

  return (
    <group position={[group.position[0], group.position[1] + ringY, group.position[2]]}>
      {/* Draggable ring above the group */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setDragging(true);
          onInteractionChange(true);
          dragStart.current = {
            clientX: (e as any).nativeEvent?.clientX ?? e.clientX,
            startRotY: group.rotation[1],
          };
          gl.domElement.style.cursor = "ew-resize";
        }}
        onPointerEnter={() => { setHovered(true); gl.domElement.style.cursor = "ew-resize"; }}
        onPointerLeave={() => { if (!dragging) { setHovered(false); gl.domElement.style.cursor = ""; } }}
      >
        <torusGeometry args={[radius, 0.012, 8, 48, Math.PI * 1.5]} />
        <meshStandardMaterial
          color={dragging ? "#2563EB" : "#3B82F6"}
          emissive="#3B82F6"
          emissiveIntensity={dragging ? 0.8 : hovered ? 0.5 : 0.2}
          transparent
          opacity={dragging || hovered ? 0.9 : 0.6}
          depthTest={false}
        />
      </mesh>

      {/* Arrow tip at end of arc */}
      <mesh position={[0, 0, -radius]} rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[0.02, 0.04, 6]} />
        <meshStandardMaterial
          color="#3B82F6"
          emissive="#3B82F6"
          emissiveIntensity={0.3}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

// ─── Group Selection Handles ─────────────────────────────

function computeGroupBbox(panels: PanelData[]) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of panels) {
    const [px, py, pz] = p.position;
    const [sx, sy, sz] = p.size;
    minX = Math.min(minX, px - sx / 2);
    maxX = Math.max(maxX, px + sx / 2);
    minY = Math.min(minY, py - sy / 2);
    maxY = Math.max(maxY, py + sy / 2);
    minZ = Math.min(minZ, pz - sz / 2);
    maxZ = Math.max(maxZ, pz + sz / 2);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  const sx = maxX - minX, sy = maxY - minY, sz = maxZ - minZ;
  return { center: [cx, cy, cz] as [number, number, number], size: [sx, sy, sz] as [number, number, number] };
}

// ─── Y-Axis Handle (vertical elevation drag) ─────────────

function YAxisHandle({
  panel,
  onUpdateLive,
  onCommit,
  onInteractionChange,
  onDragInfoChange,
}: {
  panel: PanelData;
  onUpdateLive: (id: string, updates: Partial<PanelData>) => void;
  onCommit?: (id: string, updates: Partial<PanelData>) => void;
  onInteractionChange: (active: boolean) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef<{ clientY: number; startPosY: number } | null>(null);
  const { camera, gl } = useThree();

  const [w, h, d] = panel.size;
  const handleY = h / 2 + 0.07; // Above the top face

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!dragStart.current) return;

      // Convert screen Y delta to world Y delta
      // Use a simple scale factor based on camera distance
      const cameraDistance = camera.position.length();
      const sensitivity = cameraDistance * 0.002;
      const deltaScreen = dragStart.current.clientY - e.clientY; // inverted: up on screen = positive Y
      const newPosY = Math.max(0, dragStart.current.startPosY + deltaScreen * sensitivity);

      const newPos: [number, number, number] = [panel.position[0], newPosY, panel.position[2]];
      onUpdateLive(panel.id, { position: newPos });

      const mm = Math.round(newPosY * 1000);
      onDragInfoChange({ position: newPos, resizeLabel: `Elevation: ${mm}mm` });
    };

    const onPointerUp = () => {
      setDragging(false);
      dragStart.current = null;
      gl.domElement.style.cursor = "";
      onInteractionChange(false);
      onDragInfoChange(null);
      // Commit final position for undo history
      if (onCommit) onCommit(panel.id, { position: panel.position });
    };

    gl.domElement.addEventListener("pointermove", onPointerMove);
    gl.domElement.addEventListener("pointerup", onPointerUp);
    return () => {
      gl.domElement.removeEventListener("pointermove", onPointerMove);
      gl.domElement.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging, panel, camera, gl, onUpdateLive, onCommit, onInteractionChange, onDragInfoChange]);

  return (
    <group position={panel.position}>
      {/* Vertical connecting line */}
      <mesh position={[0, h / 2 + 0.035, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.07, 8]} />
        <meshStandardMaterial color="#22C55E" transparent opacity={hovered || dragging ? 0.9 : 0.5} />
      </mesh>

      {/* Draggable green sphere */}
      <mesh
        position={[0, handleY, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setDragging(true);
          onInteractionChange(true);
          dragStart.current = {
            clientY: e.clientY,
            startPosY: panel.position[1],
          };
          gl.domElement.style.cursor = "ns-resize";
        }}
        onPointerEnter={() => { setHovered(true); gl.domElement.style.cursor = "ns-resize"; }}
        onPointerLeave={() => { if (!dragging) { setHovered(false); gl.domElement.style.cursor = ""; } }}
      >
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial
          color={dragging ? "#16A34A" : "#22C55E"}
          emissive="#22C55E"
          emissiveIntensity={dragging ? 0.8 : hovered ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Up arrow indicator (small cone on top of sphere) */}
      <mesh position={[0, handleY + 0.035, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.012, 0.025, 8]} />
        <meshStandardMaterial
          color={dragging ? "#16A34A" : "#22C55E"}
          emissive="#22C55E"
          emissiveIntensity={dragging ? 0.8 : hovered ? 0.5 : 0.2}
        />
      </mesh>
    </group>
  );
}

function GroupSelectionHandles({
  group,
  onScaleGroup,
  onInteractionChange,
  onDragInfoChange,
}: {
  group: GroupData;
  onScaleGroup: (groupId: string, scaleX: number, scaleY: number, scaleZ: number) => void;
  onInteractionChange: (active: boolean) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
}) {
  const bbox = useMemo(() => computeGroupBbox(group.panels), [group.panels]);
  const [w, h, d] = bbox.size;
  const [cx, cy, cz] = bbox.center;

  const faceHandles: { id: string; offset: [number, number, number]; axis: 0 | 1 | 2; dir: 1 | -1; label: string }[] = [
    { id: "right",  offset: [cx + w / 2, cy, cz],       axis: 0, dir: 1,  label: "Width" },
    { id: "left",   offset: [cx - w / 2, cy, cz],       axis: 0, dir: -1, label: "Width" },
    { id: "top",    offset: [cx, cy + h / 2, cz],       axis: 1, dir: 1,  label: "Height" },
    { id: "bottom", offset: [cx, cy - h / 2, cz],       axis: 1, dir: -1, label: "Height" },
    { id: "front",  offset: [cx, cy, cz - d / 2],       axis: 2, dir: -1, label: "Depth" },
    { id: "back",   offset: [cx, cy, cz + d / 2],       axis: 2, dir: 1,  label: "Depth" },
  ];

  // Corner handles: scale W (axis 0) and D (axis 2) simultaneously
  const cornerHandles: { id: string; offset: [number, number, number]; axes: { axis: 0 | 1 | 2; dir: 1 | -1 }[] }[] = [
    { id: "c0", offset: [cx + w/2, cy + h/2, cz + d/2],   axes: [{ axis: 0, dir: 1 }, { axis: 2, dir: 1 }] },
    { id: "c1", offset: [cx - w/2, cy + h/2, cz + d/2],   axes: [{ axis: 0, dir: -1 }, { axis: 2, dir: 1 }] },
    { id: "c2", offset: [cx + w/2, cy + h/2, cz - d/2],   axes: [{ axis: 0, dir: 1 }, { axis: 2, dir: -1 }] },
    { id: "c3", offset: [cx - w/2, cy + h/2, cz - d/2],   axes: [{ axis: 0, dir: -1 }, { axis: 2, dir: -1 }] },
    { id: "c4", offset: [cx + w/2, cy - h/2, cz + d/2],   axes: [{ axis: 0, dir: 1 }, { axis: 2, dir: 1 }] },
    { id: "c5", offset: [cx - w/2, cy - h/2, cz + d/2],   axes: [{ axis: 0, dir: -1 }, { axis: 2, dir: 1 }] },
    { id: "c6", offset: [cx + w/2, cy - h/2, cz - d/2],   axes: [{ axis: 0, dir: 1 }, { axis: 2, dir: -1 }] },
    { id: "c7", offset: [cx - w/2, cy - h/2, cz - d/2],   axes: [{ axis: 0, dir: -1 }, { axis: 2, dir: -1 }] },
  ];

  return (
    <group position={group.position} rotation={group.rotation}>
      {/* Wireframe outline */}
      <mesh position={bbox.center}>
        <boxGeometry args={[w + 0.002, h + 0.002, d + 0.002]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.5} />
      </mesh>

      {/* Face-center handles (single-axis) */}
      {faceHandles.map((handle) => (
        <GroupResizeHandle
          key={handle.id}
          groupId={group.id}
          groupPanels={group.panels}
          offset={handle.offset}
          axis={handle.axis}
          dir={handle.dir}
          label={handle.label}
          onScaleGroup={onScaleGroup}
          onInteractionChange={onInteractionChange}
          onDragInfoChange={onDragInfoChange}
        />
      ))}

      {/* Corner handles (dual-axis: W + D) */}
      {cornerHandles.map((handle) => (
        <GroupCornerResizeHandle
          key={handle.id}
          groupId={group.id}
          groupPanels={group.panels}
          offset={handle.offset}
          axes={handle.axes}
          onScaleGroup={onScaleGroup}
          onInteractionChange={onInteractionChange}
          onDragInfoChange={onDragInfoChange}
        />
      ))}
    </group>
  );
}

// ─── Group Resize Handle (single axis) ───────────────────

function GroupResizeHandle({
  groupId,
  groupPanels,
  offset,
  axis,
  dir,
  label,
  onScaleGroup,
  onInteractionChange,
  onDragInfoChange,
}: {
  groupId: string;
  groupPanels: PanelData[];
  offset: [number, number, number];
  axis: 0 | 1 | 2;
  dir: 1 | -1;
  label: string;
  onScaleGroup: (groupId: string, scaleX: number, scaleY: number, scaleZ: number) => void;
  onInteractionChange: (active: boolean) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef<{ point: THREE.Vector3; bboxSize: [number, number, number] } | null>(null);
  const prevScale = useRef(1);
  const { camera, raycaster, gl } = useThree();

  const axisColor = AXIS_COLORS[axis] ?? "#888";
  const cursorStyle = axis === 1 ? "ns-resize" : "ew-resize";

  useEffect(() => {
    if (!dragging) return;

    const start = dragStart.current;
    if (!start?.point) {
      setDragging(false);
      gl.domElement.style.cursor = "";
      onInteractionChange(false);
      onDragInfoChange(null);
      return;
    }

    const axisVec = new THREE.Vector3(
      axis === 0 ? 1 : 0,
      axis === 1 ? 1 : 0,
      axis === 2 ? 1 : 0
    );
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const planeNormal = new THREE.Vector3().crossVectors(axisVec, camDir).cross(axisVec).normalize();
    if (planeNormal.lengthSq() < 0.001) planeNormal.copy(camDir);

    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(planeNormal, start.point);

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
      const axisDelta = [delta.x, delta.y, delta.z][axis] * dir;

      const originalSize = dragStart.current.bboxSize[axis];
      const newSize = Math.max(0.02, originalSize + axisDelta);
      const newTotal = newSize / originalSize;
      const increment = newTotal / prevScale.current;
      prevScale.current = newTotal;

      const scales: [number, number, number] = [1, 1, 1];
      scales[axis] = increment;
      onScaleGroup(groupId, scales[0], scales[1], scales[2]);

      const axisLabels = ["Width", "Height", "Depth"];
      onDragInfoChange({
        position: [0, 0, 0],
        resizeLabel: `${axisLabels[axis]}: ${Math.round(originalSize * 1000)}mm → ${Math.round(newSize * 1000)}mm`,
      });
    };

    const onPointerUp = () => {
      setDragging(false);
      dragStart.current = null;
      prevScale.current = 1;
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
  }, [dragging, axis, dir, groupId, camera, raycaster, gl, onScaleGroup, onInteractionChange, onDragInfoChange]);

  return (
    <mesh
      ref={meshRef}
      position={offset}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const pt = getWorldPointFromPointerEvent(e, e.object);
        if (!pt) return;
        const bbox = computeGroupBbox(groupPanels);
        setDragging(true);
        prevScale.current = 1;
        onInteractionChange(true);
        dragStart.current = {
          point: pt,
          bboxSize: [...bbox.size] as [number, number, number],
        };
        gl.domElement.style.cursor = cursorStyle;
      }}
      onPointerEnter={() => { setHovered(true); gl.domElement.style.cursor = cursorStyle; }}
      onPointerLeave={() => { if (!dragging) { setHovered(false); gl.domElement.style.cursor = ""; } }}
    >
      <boxGeometry args={[0.025, 0.025, 0.025]} />
      <meshStandardMaterial
        color={dragging ? "#ffffff" : axisColor}
        emissive={axisColor}
        emissiveIntensity={dragging ? 0.8 : hovered ? 0.5 : 0.2}
        roughness={0.3}
        metalness={0.3}
        transparent={!hovered && !dragging}
        opacity={hovered || dragging ? 1 : 0.7}
      />
    </mesh>
  );
}

// ─── Group Corner Resize Handle (dual axis) ──────────────

function GroupCornerResizeHandle({
  groupId,
  groupPanels,
  offset,
  axes,
  onScaleGroup,
  onInteractionChange,
  onDragInfoChange,
}: {
  groupId: string;
  groupPanels: PanelData[];
  offset: [number, number, number];
  axes: { axis: 0 | 1 | 2; dir: 1 | -1 }[];
  onScaleGroup: (groupId: string, scaleX: number, scaleY: number, scaleZ: number) => void;
  onInteractionChange: (active: boolean) => void;
  onDragInfoChange: (info: DragInfo | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef<{ point: THREE.Vector3; bboxSize: [number, number, number] } | null>(null);
  const prevScales = useRef<[number, number, number]>([1, 1, 1]);
  const { camera, raycaster, gl } = useThree();

  const primaryAxis = axes[0].axis;

  useEffect(() => {
    if (!dragging) return;

    const start = dragStart.current;
    if (!start?.point) {
      setDragging(false);
      gl.domElement.style.cursor = "";
      onInteractionChange(false);
      onDragInfoChange(null);
      return;
    }

    // Use XZ plane for corner handles (W+D)
    const planeNormal = new THREE.Vector3(0, 1, 0);
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(planeNormal, start.point);

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
      const scales: [number, number, number] = [1, 1, 1];
      const dimNames = ["Width", "Height", "Depth"];
      const labels: string[] = [];

      for (const { axis, dir } of axes) {
        const axisDelta = [delta.x, delta.y, delta.z][axis] * dir;
        const originalSize = dragStart.current.bboxSize[axis];
        const newSize = Math.max(0.02, originalSize + axisDelta);
        const newTotal = newSize / originalSize;
        const increment = newTotal / prevScales.current[axis];
        prevScales.current[axis] = newTotal;
        scales[axis] = increment;
        labels.push(`${dimNames[axis]}: ${Math.round(originalSize * 1000)}mm → ${Math.round(newSize * 1000)}mm`);
      }

      onScaleGroup(groupId, scales[0], scales[1], scales[2]);
      onDragInfoChange({
        position: [0, 0, 0],
        resizeLabel: labels.join("  |  "),
      });
    };

    const onPointerUp = () => {
      setDragging(false);
      dragStart.current = null;
      prevScales.current = [1, 1, 1];
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
  }, [dragging, axes, groupId, camera, raycaster, gl, onScaleGroup, onInteractionChange, onDragInfoChange]);

  return (
    <mesh
      ref={meshRef}
      position={offset}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const pt = getWorldPointFromPointerEvent(e, e.object);
        if (!pt) return;
        const bbox = computeGroupBbox(groupPanels);
        setDragging(true);
        prevScales.current = [1, 1, 1];
        onInteractionChange(true);
        dragStart.current = {
          point: pt,
          bboxSize: [...bbox.size] as [number, number, number],
        };
        gl.domElement.style.cursor = "nwse-resize";
      }}
      onPointerEnter={() => { setHovered(true); gl.domElement.style.cursor = "nwse-resize"; }}
      onPointerLeave={() => { if (!dragging) { setHovered(false); gl.domElement.style.cursor = ""; } }}
    >
      <boxGeometry args={[0.025, 0.025, 0.025]} />
      <meshStandardMaterial
        color={dragging ? "#ffffff" : "#f59e0b"}
        emissive="#f59e0b"
        emissiveIntensity={dragging ? 0.8 : hovered ? 0.5 : 0.2}
        roughness={0.3}
        metalness={0.3}
        transparent={!hovered && !dragging}
        opacity={hovered || dragging ? 1 : 0.7}
      />
    </mesh>
  );
}

// ─── Group Bounding Box ──────────────────────────────────

/** True when every part shares the same palette entry — then we replace GLB materials (e.g. after group material change). */
function glbPanelsMaterialUnified(panels: PanelData[]): boolean {
  if (panels.length === 0) return true;
  const f = panels[0];
  return panels.every(
    (p) =>
      p.materialId === f.materialId &&
      p.customColor === f.customColor &&
      (p.textureUrl ?? "") === (f.textureUrl ?? ""),
  );
}

function centerGlbCloneRoot(c: THREE.Object3D) {
  const bbox = new THREE.Box3().setFromObject(c);
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  c.position.set(-center.x, -center.y, -center.z);
}

type GlbMatMemoState =
  | {
      unified: true;
      materialId: string;
      customColor?: string;
      textureUrl?: string;
      signature: string;
    }
  | {
      unified: false;
      materialId: string;
      customColor?: string;
      signature: string;
    };

type GLBPrimitiveHandlers = {
  onClick?: (e?: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (e?: ThreeEvent<MouseEvent>) => void;
  onContextMenu?: (x: number, y: number) => void;
  onPointerDown?: (point: THREE.Vector3, clientX: number) => void;
};

function GLBPrimitiveWithHandlers({
  cloned,
  onClick,
  onDoubleClick,
  onContextMenu,
  onPointerDown,
}: { cloned: THREE.Object3D } & GLBPrimitiveHandlers) {
  return (
    <primitive
      object={cloned}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick?.(e); }}
      onDoubleClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onDoubleClick?.(e); }}
      onContextMenu={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const ne = e.nativeEvent ?? (e as unknown as { nativeEvent: MouseEvent }).nativeEvent;
        if (ne) { ne.preventDefault?.(); onContextMenu?.(ne.clientX, ne.clientY); }
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const pt = e.point ?? e.intersections?.[0]?.point;
        if (pt) onPointerDown?.(pt.clone(), e.nativeEvent.clientX);
      }}
    />
  );
}

/** GLB clone with SH3D image map (Suspense: loads texture). */
function GLBCloneWithSh3Texture({
  scene,
  textureUrl,
  lightMode,
  dimmed,
  ...handlers
}: {
  scene: THREE.Object3D;
  textureUrl: string;
  lightMode: EditorLightMode;
  dimmed?: boolean;
} & GLBPrimitiveHandlers) {
  const sh3dMap = useTexture(textureUrl);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    centerGlbCloneRoot(c);
    applyDesignMaterialToGlbRoot(c, {
      materialId: "fabric_cream",
      lightMode,
      dimmed: !!dimmed,
      sh3dColorMap: sh3dMap,
    });
    return c;
  }, [scene, sh3dMap, textureUrl, lightMode, dimmed]);
  return <GLBPrimitiveWithHandlers cloned={cloned} {...handlers} />;
}

/** GLB clone with palette PBR or original materials when mixed. */
function GLBClonePlain({
  scene,
  glbMatState,
  lightMode,
  dimmed,
  preserveOriginalDiffuseMaps,
  ...handlers
}: {
  scene: THREE.Object3D;
  glbMatState: GlbMatMemoState;
  lightMode: EditorLightMode;
  dimmed?: boolean;
  /** When true (default), keep per-mesh GLB colors / maps until user overrides group material */
  preserveOriginalDiffuseMaps?: boolean;
} & GLBPrimitiveHandlers) {
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    centerGlbCloneRoot(c);

    if (glbMatState.unified) {
      applyDesignMaterialToGlbRoot(c, {
        materialId: glbMatState.materialId,
        customColor: glbMatState.customColor,
        lightMode,
        dimmed: !!dimmed,
        preserveOriginalDiffuseMaps: preserveOriginalDiffuseMaps !== false,
      });
    } else if (dimmed) {
      c.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          const clonedMats = mats.map((m) => {
            const cm = m.clone();
            cm.transparent = true;
            cm.opacity = 0.3;
            return cm;
          });
          child.material = clonedMats.length === 1 ? clonedMats[0]! : clonedMats;
        }
      });
    }
    return c;
  }, [scene, dimmed, lightMode, glbMatState, preserveOriginalDiffuseMaps]);
  return <GLBPrimitiveWithHandlers cloned={cloned} {...handlers} />;
}

/** Renders an imported GLB model with its original geometry */
function GLBModelRenderer({
  url,
  panels,
  preserveGlbDiffuseMaps,
  lightMode,
  dimmed,
  onClick,
  onDoubleClick,
  onContextMenu,
  onPointerDown,
}: {
  url: string;
  panels: PanelData[];
  /** Undefined = preserve authored GLB colors/textures (imported models) */
  preserveGlbDiffuseMaps?: boolean;
  lightMode: EditorLightMode;
  dimmed?: boolean;
  onClick?: (e?: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (e?: ThreeEvent<MouseEvent>) => void;
  onContextMenu?: (x: number, y: number) => void;
  onPointerDown?: (point: THREE.Vector3, clientX: number) => void;
}) {
  const { scene } = useGLTF(url);
  const glbMatState = useMemo((): GlbMatMemoState => {
    const unified = glbPanelsMaterialUnified(panels);
    const p0 = panels[0];
    if (unified) {
      return {
        unified: true,
        materialId: p0?.materialId ?? "oak",
        customColor: p0?.customColor,
        textureUrl: p0?.textureUrl,
        signature: `u:${p0?.materialId ?? "oak"}|${p0?.customColor ?? ""}|${p0?.textureUrl ?? ""}`,
      };
    }
    return {
      unified: false,
      materialId: "oak",
      customColor: undefined,
      signature: `m:${panels.map((p) => `${p.materialId}|${p.customColor ?? ""}|${p.textureUrl ?? ""}`).join(";")}`,
    };
  }, [panels]);

  const sh3dTex =
    glbMatState.unified && glbMatState.textureUrl ? glbMatState.textureUrl : null;

  const handlers: GLBPrimitiveHandlers = {
    onClick,
    onDoubleClick,
    onContextMenu,
    onPointerDown,
  };

  return (
    <Suspense fallback={null}>
      {sh3dTex ? (
        <GLBCloneWithSh3Texture
          scene={scene}
          textureUrl={sh3dTex}
          lightMode={lightMode}
          dimmed={dimmed}
          {...handlers}
        />
      ) : (
        <GLBClonePlain
          scene={scene}
          glbMatState={glbMatState}
          lightMode={lightMode}
          dimmed={dimmed}
          preserveOriginalDiffuseMaps={preserveGlbDiffuseMaps}
          {...handlers}
        />
      )}
    </Suspense>
  );
}

function GroupBoundingBox({ panels, color = "#3b82f6", dashed = false }: {
  panels: PanelData[];
  color?: string;
  dashed?: boolean;
}) {
  const geometry = useMemo(() => {
    if (panels.length === 0) return null;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of panels) {
      const [px, py, pz] = p.position;
      const [sx, sy, sz] = p.size;
      minX = Math.min(minX, px - sx / 2);
      maxX = Math.max(maxX, px + sx / 2);
      minY = Math.min(minY, py - sy / 2);
      maxY = Math.max(maxY, py + sy / 2);
      minZ = Math.min(minZ, pz - sz / 2);
      maxZ = Math.max(maxZ, pz + sz / 2);
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    const sx = maxX - minX + 0.02, sy = maxY - minY + 0.02, sz = maxZ - minZ + 0.02;
    return { center: [cx, cy, cz] as [number, number, number], size: [sx, sy, sz] as [number, number, number] };
  }, [panels]);
  if (!geometry) return null;
  return (
    <lineSegments position={geometry.center}>
      <edgesGeometry args={[new THREE.BoxGeometry(...geometry.size)]} />
      <lineDashedMaterial color={color} dashSize={dashed ? 0.02 : 1000} gapSize={dashed ? 0.01 : 0} linewidth={1} />
    </lineSegments>
  );
}

// ─── Individual Panel (with door/drawer animation + drag) ─

function FurniturePanel({
  panel,
  lightMode,
  selected,
  isOpen,
  rotationMode,
  opacity = 1,
  dimmed = false,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
}: {
  panel: PanelData;
  lightMode: EditorLightMode;
  selected: boolean;
  isOpen?: boolean;
  rotationMode?: boolean;
  opacity?: number;
  dimmed?: boolean;
  onClick: (e?: any) => void;
  onDoubleClick: (e?: any) => void;
  onContextMenu: (screenX: number, screenY: number) => void;
  onDragStart: (intersectionPoint: THREE.Vector3, clientX: number) => void;
}) {
  const mat = MATERIALS.find((m) => m.id === panel.materialId);
  const color = panel.customColor ?? mat?.color ?? "#C4A265";
  const roughness = mat?.roughness ?? 0.7;
  const metalness = mat?.metalness ?? 0.05;
  const isGlass = mat?.id === "glass";
  const isMetal = mat?.category === "Metal";
  const isFabric = mat?.category === "Fabric";
  /** Metals reflect the env map; when night dims the env, boost so legs/chrome still read. */
  const envMetal = lightMode === "night" ? 4.75 : 2.5;
  const envDefault = lightMode === "night" ? 0.62 : 0.88;
  const envHardware = lightMode === "night" ? 3.1 : 1.85;
  const shape = panel.shape ?? "box";
  const panelRotation = panel.rotation ?? [0, 0, 0];

  /** Softer edges on wood / melamine (catalog-style); metals stay crisp */
  const boxBevelRadius =
    panel.cornerRadius ??
    (shape === "box" && mat
      ? mat.category === "Metal"
        ? 0.001
        : mat.category === "Glass"
          ? 0.002
          : mat.category === "Fabric"
            ? 0.002
            : mat.category === "Wood" || mat.category === "Engineered"
              ? 0.0048
              : mat.category === "Stone"
                ? 0.0032
                : 0.0035
      : 0.002);

  // SH3D external texture (loaded from URL)
  const sh3dTexture = useMemo(() => {
    if (!panel.textureUrl) return null;
    const tex = new THREE.TextureLoader().load(panel.textureUrl);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [panel.textureUrl]);

  // PBR textures (skip for custom colors, glass, and SH3D textures)
  const textures = useMemo(() => {
    if (panel.customColor || panel.textureUrl || !mat) return null;
    return getMaterialTextures(mat.id, mat.color, mat.category);
  }, [panel.customColor, panel.textureUrl, mat?.id, mat?.color, mat?.category]);

  // Configure texture tiling — fabric needs dense repeats so weave reads on large cushions
  useMemo(() => {
    if (!textures) return;
    const [w, h, d] = panel.size;
    const edge = Math.max(w, h, d);
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
  const effectiveOpacity = dimmed ? (opacity < 1 ? opacity : 0.3) : (isGlass ? 0.3 : opacity);
  const isTransparent = isGlass || dimmed || opacity < 1;
  const shapeMatProps = {
    color: selected ? "#e8c4a8" : color,
    roughness,
    metalness,
    transparent: isTransparent,
    opacity: effectiveOpacity,
    // SH3D texture takes priority over PBR textures and custom color
    ...(sh3dTexture ? { map: sh3dTexture, color: selected ? "#e8c4a8" : "#ffffff" } : {}),
    ...(textures && !sh3dTexture ? {
      map: textures.map,
      normalMap: textures.normalMap,
      normalScale,
      roughnessMap: textures.roughnessMap,
    } : {}),
  };

  // When dimmed, disable raycasting
  const noopRaycast = useCallback(() => {}, []);
  const raycastProp = dimmed ? { raycast: noopRaycast } : {};

  const handleClick = (e: any) => { e.stopPropagation(); onClick(); };
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button === 2) {
      e.stopPropagation();
      onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
      return;
    }
    // Left click: start drag/rotation — allow on ALL panels (doors/drawers too)
    if (e.nativeEvent.button === 0) {
      e.stopPropagation();
      const pt = getWorldPointFromPointerEvent(e, e.object);
      if (!pt) return;
      onDragStart(pt, e.nativeEvent.clientX);
    }
  };

  const cursorStyle = rotationMode ? "grab" : "move";

  // Regular panel (draggable + rotatable)
  // Use inline geometry for basic shapes (reliable), ShapeRenderer for advanced shapes
  const isBasicShape = shape === "box" || shape === "cylinder" || shape === "sphere" || shape === "cone";

  const renderBasicGeometry = (outline = false) => {
    const pad = outline ? 0.003 : 0;
    const r = panel.size[0] / 2;
    switch (shape) {
      case "cylinder": return <cylinderGeometry args={[r + pad, r + pad, panel.size[1] + pad * 2, 24]} />;
      case "sphere": return <sphereGeometry args={[r + pad, 24, 24]} />;
      case "cone": return <coneGeometry args={[r + pad, panel.size[1] + pad * 2, 24]} />;
      default: return <boxGeometry args={[panel.size[0] + pad * 2, panel.size[1] + pad * 2, panel.size[2] + pad * 2]} />;
    }
  };

  const doorOrDrawerUsesShapeRenderer = isCompositeShape(shape) || !isBasicShape;

  // Door: pivot from left edge (or right edge for Right Door)
  if (panelIsDoor) {
    const halfW = panel.size[0] / 2;
    const pivotX = isRight ? panel.position[0] + halfW : panel.position[0] - halfW;
    const meshOffsetX = isRight ? -halfW : halfW;
    const hingeX = isRight ? -0.005 : 0.005;

    return (
      <group position={[pivotX, panel.position[1], panel.position[2]]} rotation={panelRotation as any}>
        <group ref={groupRef}>
          {doorOrDrawerUsesShapeRenderer ? (
            <group
              position={[meshOffsetX, 0, 0]}
              onClick={handleClick}
              onDoubleClick={(e: any) => { e.stopPropagation(); onDoubleClick(); }}
              onPointerDown={handlePointerDown}
              castShadow
              receiveShadow
              {...raycastProp}
            >
              <ShapeRenderer
                shape={shape}
                size={panel.size}
                shapeParams={panel.shapeParams}
                color={shapeMatProps.color}
                roughness={shapeMatProps.roughness}
                metalness={shapeMatProps.metalness}
                transparent={shapeMatProps.transparent}
                opacity={shapeMatProps.opacity}
                map={sh3dTexture ?? undefined}
                envMapIntensity={isMetal ? envMetal : envDefault}
              />
            </group>
          ) : (
            <mesh position={[meshOffsetX, 0, 0]}
              onClick={handleClick}
              onDoubleClick={(e: any) => { e.stopPropagation(); onDoubleClick(); }}
              onPointerDown={handlePointerDown}
              castShadow receiveShadow
              {...raycastProp}
            >
              {renderBasicGeometry()}
              <meshStandardMaterial
                map={sh3dTexture ?? undefined}
                color={shapeMatProps.color} roughness={shapeMatProps.roughness}
                metalness={shapeMatProps.metalness} transparent={shapeMatProps.transparent}
                opacity={shapeMatProps.opacity}
                envMapIntensity={isMetal ? envMetal : envDefault}
              />
            </mesh>
          )}
          <mesh position={[hingeX, panel.size[1] * 0.3, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.02, 8]} />
            <meshStandardMaterial color="#a8a8a8" metalness={0.85} roughness={0.28} envMapIntensity={envHardware} />
          </mesh>
          <mesh position={[hingeX, -panel.size[1] * 0.3, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.02, 8]} />
            <meshStandardMaterial color="#a8a8a8" metalness={0.85} roughness={0.28} envMapIntensity={envHardware} />
          </mesh>
          {selected && (doorOrDrawerUsesShapeRenderer ? (
            <group position={[meshOffsetX, 0, 0]}>
              <ShapeRenderer
                shape={shape}
                size={panel.size}
                shapeParams={panel.shapeParams}
                color={shapeMatProps.color}
                roughness={shapeMatProps.roughness}
                metalness={shapeMatProps.metalness}
                transparent={shapeMatProps.transparent}
                opacity={shapeMatProps.opacity}
                isOutline
              />
            </group>
          ) : (
            <mesh position={[meshOffsetX, 0, 0]}>
              {renderBasicGeometry(true)}
              <meshBasicMaterial color="#C87D5A" wireframe />
            </mesh>
          ))}
        </group>
      </group>
    );
  }

  // Drawer: slide on Z
  if (panelIsDrawer) {
    return (
      <group position={panel.position} rotation={panelRotation as any}>
        <group ref={groupRef}>
          {doorOrDrawerUsesShapeRenderer ? (
            <group
              onClick={handleClick}
              onDoubleClick={(e: any) => { e.stopPropagation(); onDoubleClick(); }}
              onPointerDown={handlePointerDown}
              castShadow
              receiveShadow
              {...raycastProp}
            >
              <ShapeRenderer
                shape={shape}
                size={panel.size}
                shapeParams={panel.shapeParams}
                color={shapeMatProps.color}
                roughness={shapeMatProps.roughness}
                metalness={shapeMatProps.metalness}
                transparent={shapeMatProps.transparent}
                opacity={shapeMatProps.opacity}
                map={sh3dTexture ?? undefined}
                envMapIntensity={isMetal ? envMetal : envDefault}
              />
            </group>
          ) : (
            <mesh onClick={handleClick}
              onDoubleClick={(e: any) => { e.stopPropagation(); onDoubleClick(); }}
              onPointerDown={handlePointerDown}
              castShadow receiveShadow
              {...raycastProp}
            >
              {renderBasicGeometry()}
              <meshStandardMaterial
                map={sh3dTexture ?? undefined}
                color={shapeMatProps.color} roughness={shapeMatProps.roughness}
                metalness={shapeMatProps.metalness} transparent={shapeMatProps.transparent}
                opacity={shapeMatProps.opacity}
                envMapIntensity={isMetal ? envMetal : envDefault}
              />
            </mesh>
          )}
          <mesh position={[0, 0, -panel.size[2] / 2 - 0.01]}>
            <boxGeometry args={[0.06, 0.012, 0.012]} />
            <meshStandardMaterial color="#a8a8a8" metalness={0.85} roughness={0.28} envMapIntensity={envHardware} />
          </mesh>
          {selected && (doorOrDrawerUsesShapeRenderer ? (
            <ShapeRenderer
              shape={shape}
              size={panel.size}
              shapeParams={panel.shapeParams}
              color={shapeMatProps.color}
              roughness={shapeMatProps.roughness}
              metalness={shapeMatProps.metalness}
              transparent={shapeMatProps.transparent}
              opacity={shapeMatProps.opacity}
              isOutline
            />
          ) : (
            <mesh>
              {renderBasicGeometry(true)}
              <meshBasicMaterial color="#C87D5A" wireframe />
            </mesh>
          ))}
        </group>
      </group>
    );
  }

  if (isBasicShape) {
    const [w, h, d] = panel.size;

    // Box shape uses RoundedBox for soft edges
    if (shape === "box") {
      return (
        <group position={panel.position} rotation={panelRotation as any}>
          <RoundedBox
            args={[w, h, d]}
            radius={boxBevelRadius}
            smoothness={boxBevelRadius > 0.004 ? 5 : boxBevelRadius > 0.0025 ? 4 : 3}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => { document.body.style.cursor = cursorStyle; }}
            onPointerLeave={() => { document.body.style.cursor = ""; }}
            castShadow
            receiveShadow
            {...raycastProp}
          >
            {isGlass ? (
              <meshPhysicalMaterial
                transmission={0.9}
                thickness={0.5}
                roughness={0.05}
                ior={1.5}
                transparent
                opacity={shapeMatProps.opacity}
              />
            ) : sh3dTexture ? (
              <meshStandardMaterial
                map={sh3dTexture}
                color={shapeMatProps.color}
                roughness={shapeMatProps.roughness}
                metalness={shapeMatProps.metalness}
                transparent={shapeMatProps.transparent}
                opacity={shapeMatProps.opacity}
                envMapIntensity={isMetal ? envMetal : envDefault}
              />
            ) : textures && isFabric ? (
              <meshPhysicalMaterial
                map={textures.map}
                normalMap={textures.normalMap}
                normalScale={normalScale}
                roughnessMap={textures.roughnessMap}
                roughness={shapeMatProps.roughness}
                metalness={0}
                sheen={mat!.id.includes("velvet") ? 0.5 : mat!.id.includes("leather") ? 0.1 : 0.28}
                sheenRoughness={mat!.id.includes("velvet") ? 0.72 : 0.9}
                sheenColor={mat!.color}
                transparent={shapeMatProps.transparent}
                opacity={shapeMatProps.opacity}
                envMapIntensity={mat!.id.includes("velvet") ? 0.5 : 0.36}
              />
            ) : textures ? (
              <meshStandardMaterial
                map={textures.map}
                normalMap={textures.normalMap}
                normalScale={normalScale}
                roughnessMap={textures.roughnessMap}
                roughness={shapeMatProps.roughness}
                metalness={shapeMatProps.metalness}
                transparent={shapeMatProps.transparent}
                opacity={shapeMatProps.opacity}
                envMapIntensity={isMetal ? envMetal : envDefault}
              />
            ) : (
              <meshStandardMaterial
                color={shapeMatProps.color}
                roughness={shapeMatProps.roughness}
                metalness={shapeMatProps.metalness}
                transparent={shapeMatProps.transparent}
                opacity={shapeMatProps.opacity}
                envMapIntensity={isMetal ? envMetal : envDefault}
              />
            )}
          </RoundedBox>
          {selected && (
            <mesh>
              <boxGeometry args={[w + 0.006, h + 0.006, d + 0.006]} />
              <meshBasicMaterial color="#C87D5A" wireframe />
            </mesh>
          )}
        </group>
      );
    }

    // Non-box basic shapes (cylinder, sphere, cone)
    return (
      <group position={panel.position} rotation={panelRotation as any}>
        <mesh
          onClick={handleClick} onPointerDown={handlePointerDown}
          onPointerEnter={() => { document.body.style.cursor = cursorStyle; }}
          onPointerLeave={() => { document.body.style.cursor = ""; }}
          castShadow receiveShadow
          {...raycastProp}
        >
          {renderBasicGeometry()}
          {isGlass ? (
            <meshPhysicalMaterial
              transmission={0.9}
              thickness={0.5}
              roughness={0.05}
              ior={1.5}
              transparent
              opacity={shapeMatProps.opacity}
            />
          ) : sh3dTexture ? (
            <meshStandardMaterial
              map={sh3dTexture}
              color={shapeMatProps.color}
              roughness={shapeMatProps.roughness}
              metalness={shapeMatProps.metalness}
              transparent={shapeMatProps.transparent}
              opacity={shapeMatProps.opacity}
              envMapIntensity={isMetal ? envMetal : envDefault}
            />
          ) : textures && !isFabric ? (
            <meshStandardMaterial
              map={textures.map}
              normalMap={textures.normalMap}
              normalScale={normalScale}
              roughnessMap={textures.roughnessMap}
              roughness={shapeMatProps.roughness}
              metalness={shapeMatProps.metalness}
              transparent={shapeMatProps.transparent}
              opacity={shapeMatProps.opacity}
              envMapIntensity={isMetal ? envMetal : envDefault}
            />
          ) : textures && isFabric ? (
            <meshPhysicalMaterial
              map={textures.map}
              normalMap={textures.normalMap}
              normalScale={normalScale}
              roughnessMap={textures.roughnessMap}
              roughness={shapeMatProps.roughness}
              metalness={0}
              sheen={mat!.id.includes("velvet") ? 0.5 : mat!.id.includes("leather") ? 0.1 : 0.28}
              sheenRoughness={mat!.id.includes("velvet") ? 0.72 : 0.9}
              sheenColor={mat!.color}
              transparent={shapeMatProps.transparent}
              opacity={shapeMatProps.opacity}
              envMapIntensity={mat!.id.includes("velvet") ? 0.5 : 0.36}
            />
          ) : (
            <meshStandardMaterial
              color={shapeMatProps.color}
              roughness={shapeMatProps.roughness}
              metalness={shapeMatProps.metalness}
              transparent={shapeMatProps.transparent}
              opacity={shapeMatProps.opacity}
              envMapIntensity={isMetal ? envMetal : envDefault}
            />
          )}
        </mesh>
        {selected && (
          <mesh>
            {renderBasicGeometry(true)}
            <meshBasicMaterial color="#C87D5A" wireframe />
          </mesh>
        )}
      </group>
    );
  }

  // Advanced shapes — use ShapeRenderer
  return (
    <group position={panel.position} rotation={panelRotation as any}>
      <group
        onClick={handleClick} onPointerDown={handlePointerDown}
        onPointerEnter={() => { if (!dimmed) document.body.style.cursor = cursorStyle; }}
        onPointerLeave={() => { document.body.style.cursor = ""; }}
      >
        <ShapeRenderer
          shape={shape}
          size={panel.size}
          shapeParams={panel.shapeParams}
          {...shapeMatProps}
          envMapIntensity={isMetal ? envMetal : envDefault}
        />
      </group>
      {selected && (
        <ShapeRenderer
          shape={shape}
          size={panel.size}
          shapeParams={panel.shapeParams}
          {...shapeMatProps}
          isOutline
        />
      )}
    </group>
  );
}
