import type { PanelData, GroupData } from "./furnitureData";
import * as THREE from "three";

/**
 * World Y (meters) for the bottom of library-inserted furniture AABB.
 * Matches ~27 mm — typical editor floor contact above the grid plane.
 */
export const EDITOR_LIBRARY_FLOOR_Y = 0.027;

/** Lowest axis-aligned bottom Y among panels (world space); ignores panel rotation. */
export function computePanelsAxisAlignedMinY(panels: PanelData[]): number {
  if (panels.length === 0) return 0;
  let minY = Infinity;
  for (const p of panels) {
    const [, py] = p.position;
    const [, sy] = p.size;
    minY = Math.min(minY, py - sy / 2);
  }
  return Number.isFinite(minY) ? minY : 0;
}

/** Shift all panels along Y so the AABB bottom sits at `floorY`. */
export function alignPanelsBottomToWorldY(panels: PanelData[], floorY: number): PanelData[] {
  const minY = computePanelsAxisAlignedMinY(panels);
  const dy = floorY - minY;
  if (dy === 0) return panels;
  return panels.map((p) => ({
    ...p,
    position: [p.position[0], p.position[1] + dy, p.position[2]] as [number, number, number],
  }));
}

/** Compute axis-aligned bounding box center of a set of panels (world-space positions) */
export function computeBoundingBoxCenter(panels: PanelData[]): [number, number, number] {
  if (panels.length === 0) return [0, 0, 0];
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
  return [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
}

/** Convert panels from world-space to group-local (apply inverse group transform) */
export function panelsToRelative(
  panels: PanelData[],
  groupPos: [number, number, number],
  groupRot: [number, number, number] = [0, 0, 0],
  groupScale: [number, number, number] = [1, 1, 1]
): PanelData[] {
  const euler = new THREE.Euler(...groupRot);
  const invQuat = new THREE.Quaternion().setFromEuler(euler).invert();
  const origin = new THREE.Vector3(...groupPos);
  const invScale = new THREE.Vector3(
    groupScale[0] !== 0 ? 1 / groupScale[0] : 1,
    groupScale[1] !== 0 ? 1 / groupScale[1] : 1,
    groupScale[2] !== 0 ? 1 / groupScale[2] : 1
  );

  return panels.map((p) => {
    // Inverse of SRT: inv-translate → inv-rotate → inv-scale
    const worldPos = new THREE.Vector3(...p.position).sub(origin);
    worldPos.applyQuaternion(invQuat);
    worldPos.multiply(invScale);

    // Decompose rotation: remove group rotation from panel world rotation
    const panelQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rotation ?? [0, 0, 0])));
    const localQuat = invQuat.clone().multiply(panelQuat);
    const localEuler = new THREE.Euler().setFromQuaternion(localQuat);

    // Inverse-scale size
    const localSize: [number, number, number] = [
      p.size[0] * invScale.x,
      p.size[1] * invScale.y,
      p.size[2] * invScale.z,
    ];

    return {
      ...p,
      position: [worldPos.x, worldPos.y, worldPos.z] as [number, number, number],
      rotation: [localEuler.x, localEuler.y, localEuler.z] as [number, number, number],
      size: localSize,
    };
  });
}

/** Convert panels from group-local to world-space (apply group transform) */
export function panelsToWorldSpace(
  panels: PanelData[],
  groupPos: [number, number, number],
  groupRot: [number, number, number] = [0, 0, 0],
  groupScale: [number, number, number] = [1, 1, 1]
): PanelData[] {
  const euler = new THREE.Euler(...groupRot);
  const quat = new THREE.Quaternion().setFromEuler(euler);
  const origin = new THREE.Vector3(...groupPos);
  const scale = new THREE.Vector3(...groupScale);

  return panels.map((p) => {
    // SRT order (matching Three.js): Scale → Rotate → Translate
    const localPos = new THREE.Vector3(...p.position).multiply(scale);
    localPos.applyQuaternion(quat).add(origin);

    // Compose panel rotation with group rotation
    const panelEuler = new THREE.Euler(...(p.rotation ?? [0, 0, 0]));
    const panelQuat = new THREE.Quaternion().setFromEuler(panelEuler);
    const worldQuat = quat.clone().multiply(panelQuat);
    const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat);

    // Scale panel size by group scale
    const worldSize: [number, number, number] = [
      p.size[0] * scale.x,
      p.size[1] * scale.y,
      p.size[2] * scale.z,
    ];

    return {
      ...p,
      position: [localPos.x, localPos.y, localPos.z] as [number, number, number],
      rotation: [worldEuler.x, worldEuler.y, worldEuler.z] as [number, number, number],
      size: worldSize,
    };
  });
}

/** Create a GroupData from world-space panels (rotation is always [0,0,0] for new groups) */
export function createGroupFromPanels(
  name: string,
  panels: PanelData[]
): GroupData {
  const center = computeBoundingBoxCenter(panels);
  return {
    id: crypto.randomUUID(),
    name,
    position: center,
    rotation: [0, 0, 0],
    panels: panelsToRelative(panels, center, [0, 0, 0]),
  };
}

/** Migrate old PanelData[] format to new EditorSceneData */
export function migrateSceneData(
  data: PanelData[] | { groups: GroupData[]; ungroupedPanels: PanelData[] },
  furnitureName: string = "Furniture"
): { groups: GroupData[]; ungroupedPanels: PanelData[] } {
  if (Array.isArray(data)) {
    if (data.length === 0) return { groups: [], ungroupedPanels: [] };
    return { groups: [createGroupFromPanels(furnitureName, data)], ungroupedPanels: [] };
  }
  return data;
}

/** Compute X-offset so a new group doesn't overlap existing ones */
export function computeGroupXOffset(existingGroups: GroupData[]): number {
  if (existingGroups.length === 0) return 0;
  let maxX = -Infinity;
  for (const g of existingGroups) {
    for (const p of g.panels) {
      const worldX = p.position[0] + g.position[0] + p.size[0] / 2;
      if (worldX > maxX) maxX = worldX;
    }
  }
  return maxX + 0.5;
}

/**
 * World-space center of the top face of a panel (for placing cushions, vases, etc.).
 * `group` is null when `panel` is already in world space (ungrouped or edit mode).
 */
export function getWorldPointOnPanelTop(
  panel: PanelData,
  group: GroupData | null
): [number, number, number] {
  const rot = panel.rotation ?? [0, 0, 0];
  const offset = new THREE.Vector3(0, panel.size[1] / 2, 0);
  if (rot[0] || rot[1] || rot[2]) {
    offset.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)));
  }
  const localCenterTop = new THREE.Vector3(...panel.position).add(offset);
  if (!group) {
    return [localCenterTop.x, localCenterTop.y, localCenterTop.z];
  }
  localCenterTop.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...group.rotation)));
  localCenterTop.add(new THREE.Vector3(...group.position));
  return [localCenterTop.x, localCenterTop.y, localCenterTop.z];
}

/** Find the group that owns this panel id, if any */
export function findGroupContainingPanel(panelId: string, groups: GroupData[]): GroupData | null {
  for (const g of groups) {
    if (g.panels.some((p) => p.id === panelId)) return g;
  }
  return null;
}

/** Flatten all groups + ungrouped into a single PanelData[] (for legacy consumers) */
export function flattenScene(groups: GroupData[], ungroupedPanels: PanelData[]): PanelData[] {
  const result: PanelData[] = [];
  for (const g of groups) {
    result.push(...panelsToWorldSpace(g.panels, g.position, g.rotation, g.scale ?? [1, 1, 1]));
  }
  result.push(...ungroupedPanels);
  return result;
}
