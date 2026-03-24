import type { PanelData, GroupData } from "./furnitureData";
import * as THREE from "three";

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
  groupRot: [number, number, number] = [0, 0, 0]
): PanelData[] {
  const euler = new THREE.Euler(...groupRot);
  const invQuat = new THREE.Quaternion().setFromEuler(euler).invert();
  const origin = new THREE.Vector3(...groupPos);

  return panels.map((p) => {
    const worldPos = new THREE.Vector3(...p.position).sub(origin);
    worldPos.applyQuaternion(invQuat);
    return {
      ...p,
      position: [worldPos.x, worldPos.y, worldPos.z] as [number, number, number],
    };
  });
}

/** Convert panels from group-local to world-space (apply group transform) */
export function panelsToWorldSpace(
  panels: PanelData[],
  groupPos: [number, number, number],
  groupRot: [number, number, number] = [0, 0, 0]
): PanelData[] {
  const euler = new THREE.Euler(...groupRot);
  const quat = new THREE.Quaternion().setFromEuler(euler);
  const origin = new THREE.Vector3(...groupPos);

  return panels.map((p) => {
    const localPos = new THREE.Vector3(...p.position);
    localPos.applyQuaternion(quat).add(origin);
    return {
      ...p,
      position: [localPos.x, localPos.y, localPos.z] as [number, number, number],
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
    result.push(...panelsToWorldSpace(g.panels, g.position));
  }
  result.push(...ungroupedPanels);
  return result;
}
