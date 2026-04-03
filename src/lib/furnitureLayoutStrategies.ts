import type { PanelData } from "./furnitureData";

export type FurnitureCategory =
  | "unknown"
  | "seating"
  | "office_chair"
  | "bed"
  | "table_desk"
  | "casegoods"
  | "wardrobe"
  | "shelving";

export type PanelRole =
  | "unknown"
  | "seat"
  | "back"
  | "arm"
  | "top"
  | "bottom"
  | "base"
  | "side"
  | "front"
  | "back_panel"
  | "rail"
  | "leg"
  | "column"
  | "shelf"
  | "divider"
  | "drawer"
  | "door"
  | "headboard"
  | "footboard"
  | "mattress"
  | "hanging_rail";

/** Require chair/seat context so names like "executive desk" stay table_desk, not office_chair. */
const OFFICE_CHAIR_RE =
  /\b(office_chair|office chair|task chair|desk chair|executive chair|swivel chair|ergonomic chair|gaming chair|computer chair)\b/i;
const BED_RE = /\b(bed|bedframe|bed_frame|platform bed|platform_bed|headboard|footboard|bunk bed|kids bed)\b/i;
const WARDROBE_RE = /\b(wardrobe|armoire|closet|linen tower|pantry cabinet|tall pantry|clothing cabinet)\b/i;
const SHELVING_RE = /\b(bookcase|bookshelf|shelv|rack|etagere|étagère|display shelf|open shelf|storage shelf|wall shelf|clothing rack)\b/i;
const TABLE_DESK_RE = /\b(table|desk|console|counter|island|workbench|podium|stand|cart|bench)\b/i;
const CASEGOODS_RE = /\b(cabinet|dresser|nightstand|sideboard|buffet|credenza|tv unit|media console|vanity|chest|tool cabinet|shoe cabinet|medical cabinet|mirror cabinet|storage cabinet|reception|checkout|styling station)\b/i;
const SEATING_RE = /\b(sofa|couch|sectional|loveseat|divan|settee|chesterfield|recliner|armchair|chaise|ottoman|chair|stool|bench|booth seating|lounge chair|salon chair|waiting chair|outdoor chair)\b/i;

function labelText(panels: PanelData[]): string {
  return panels.map((panel) => panel.label.toLowerCase()).join(" ");
}

export function detectFurnitureCategory(name: string, panels: PanelData[]): FurnitureCategory {
  const text = `${name} ${labelText(panels)}`.toLowerCase();
  if (OFFICE_CHAIR_RE.test(text)) return "office_chair";
  if (BED_RE.test(text) && !/\b(daybed|sofa bed)\b/i.test(text)) return "bed";
  if (WARDROBE_RE.test(text)) return "wardrobe";
  if (SHELVING_RE.test(text)) return "shelving";
  if (CASEGOODS_RE.test(text)) return "casegoods";
  if (TABLE_DESK_RE.test(text)) return "table_desk";
  if (SEATING_RE.test(text)) return "seating";

  const doorCount = panels.filter((panel) => /\bdoor\b/i.test(panel.label)).length;
  const shelfCount = panels.filter((panel) => /\bshelf\b/i.test(panel.label)).length;
  const legCount = panels.filter((panel) => /\bleg\b/i.test(panel.label)).length;
  const topCount = panels.filter((panel) => /\b(top|tabletop|desktop|worktop)\b/i.test(panel.label)).length;
  if (doorCount >= 2) return "wardrobe";
  if (shelfCount >= 3) return "shelving";
  if (topCount > 0 && legCount >= 2) return "table_desk";
  return "unknown";
}

export function classifyPanelRole(panel: PanelData, category: FurnitureCategory): PanelRole {
  const label = panel.label.toLowerCase();
  const shape = panel.shape ?? "box";

  if (/\bmattress\b/.test(label) || shape === "mattress") return "mattress";
  if (/\bheadboard|head board\b/.test(label)) return "headboard";
  if (/\bfootboard|foot board\b/.test(label)) return "footboard";
  if (/\b(hanging rail|clothes rail|closet rod|rod)\b/.test(label) && category === "wardrobe") return "hanging_rail";
  if (/\bdrawer\b/.test(label) || shape === "drawer_box") return "drawer";
  if (/\bdoor\b/.test(label) || /door$/.test(shape)) return "door";
  if (/\bdivider|partition\b/.test(label)) return "divider";
  if (/\bshelf|tier|level\b/.test(label)) return "shelf";
  if (/\bleg|foot|feet|caster|wheel\b/.test(label) || shape === "caster") return "leg";
  if (/\b(column|pedestal|post|spindle|gas lift|center post)\b/.test(label) || shape === "pedestal") return "column";
  if (/\b(back|backrest|headrest)\b/.test(label) || panel.type === "back") return category === "casegoods" || category === "wardrobe" || category === "shelving" ? "back_panel" : "back";
  if (/\barm|armrest\b/.test(label)) return "arm";
  if (/\bseat|cushion\b/.test(label)) return "seat";
  if (/\b(top|tabletop|desktop|worktop|countertop|surface)\b/.test(label)) return "top";
  if (/\b(bottom|bottom panel)\b/.test(label)) return "bottom";
  if (/\b(front panel|front face|front)\b/.test(label) && !/\bleg\b/.test(label)) return "front";
  if (/\b(base|plinth|foundation)\b/.test(label)) return "base";
  if (/\b(left side|right side|side panel|end panel|upright|stile|side)\b/.test(label)) return "side";
  if (/\b(rail|apron|stretcher|support deck|bed rail)\b/.test(label)) return "rail";

  // Desk/table legs often arrive as generic vertical slabs or leg-shaped meshes without "leg" in the label.
  if (category === "table_desk") {
    const [w, h, d] = panel.size;
    const planMin = Math.min(w, d);
    const planMax = Math.max(w, d);
    const legShapes =
      shape === "cylinder" ||
      shape === "tapered_leg" ||
      shape === "square_leg" ||
      shape === "cabriole_leg" ||
      shape === "hairpin_leg" ||
      shape === "bun_foot" ||
      shape === "bracket_foot";
    const thinVertical =
      panel.type === "vertical" &&
      h >= 0.15 &&
      h <= 1.35 &&
      planMin <= 0.14 &&
      h >= planMax * 0.75;
    if (
      legShapes ||
      (thinVertical &&
        !/\b(side|end panel|side panel|partition|drawer|back|front|apron|rail|stretcher|door|shelf|hutch|modesty|panel)\b/i.test(
          label,
        ))
    ) {
      if (!/\b(apron|rail|stretcher)\b/i.test(label)) return "leg";
    }
  }

  if (category === "table_desk" && panel.type === "horizontal") return "top";
  if ((category === "casegoods" || category === "wardrobe" || category === "shelving") && panel.type === "horizontal") return "shelf";
  if ((category === "casegoods" || category === "wardrobe" || category === "shelving") && panel.type === "vertical") return "side";
  return "unknown";
}

function spreadEvenly<T>(items: T[], start: number, end: number, set: (item: T, value: number) => void): void {
  if (items.length === 0) return;
  if (items.length === 1) {
    set(items[0], (start + end) / 2);
    return;
  }
  const span = end - start;
  items.forEach((item, index) => {
    const t = index / (items.length - 1);
    set(item, start + span * t);
  });
}

function inferGenericPosition(
  role: PanelRole,
  panel: PanelData,
  dims: { w: number; h: number; d: number },
  index: number,
  count: number,
): [number, number, number] {
  const [pw, ph, pd] = panel.size;
  const frontZ = dims.d / 2 - pd / 2 - 0.02;
  const backZ = -dims.d / 2 + pd / 2 + 0.02;
  const leftX = -dims.w / 2 + pw / 2 + 0.02;
  const rightX = dims.w / 2 - pw / 2 - 0.02;

  switch (role) {
    case "leg": {
      const corners: [number, number][] = [
        [leftX, backZ],
        [rightX, backZ],
        [leftX, frontZ],
        [rightX, frontZ],
      ];
      const [x, z] = corners[index % corners.length] ?? [0, 0];
      return [x, ph / 2, z];
    }
    case "seat":
    case "mattress":
      return [0, Math.max(dims.h * 0.45, ph / 2), 0];
    case "back":
    case "headboard":
      return [0, Math.max(dims.h * 0.72, ph / 2), backZ];
    case "footboard":
      return [0, Math.max(dims.h * 0.3, ph / 2), frontZ];
    case "arm":
    case "side":
      return [index % 2 === 0 ? leftX : rightX, Math.max(dims.h * 0.5, ph / 2), 0];
    case "column":
      return [0, Math.max(dims.h * 0.35, ph / 2), 0];
    case "top":
      return [0, Math.max(dims.h - ph / 2, ph / 2), 0];
    case "front":
    case "door":
    case "drawer":
      return [count > 1 ? ((index / Math.max(count - 1, 1)) - 0.5) * dims.w * 0.5 : 0, Math.max(dims.h * 0.5, ph / 2), frontZ];
    case "back_panel":
      return [0, Math.max(dims.h * 0.5, ph / 2), backZ];
    case "shelf":
      return [0, Math.max(ph / 2 + dims.h * (0.2 + index * 0.18), ph / 2), 0];
    default:
      return [0, Math.max(ph / 2, 0.05), 0];
  }
}

function inferTableDeskPosition(
  role: PanelRole,
  panel: PanelData,
  dims: { w: number; h: number; d: number },
  index: number,
  count: number,
): [number, number, number] {
  const [pw, ph, pd] = panel.size;
  const frontZ = dims.d / 2 - pd / 2 - 0.03;
  const backZ = -dims.d / 2 + pd / 2 + 0.03;
  const leftX = -dims.w / 2 + pw / 2 + 0.04;
  const rightX = dims.w / 2 - pw / 2 - 0.04;

  switch (role) {
    case "top":
      return [0, Math.max(dims.h - ph / 2, ph / 2 + 0.4), 0];
    case "leg": {
      const corners: [number, number][] = [
        [leftX, backZ],
        [rightX, backZ],
        [leftX, frontZ],
        [rightX, frontZ],
      ];
      const [x, z] = corners[index % corners.length] ?? [0, 0];
      return [x, Math.max((dims.h - 0.04) / 2, ph / 2), z];
    }
    case "column":
      return [0, Math.max((dims.h - 0.05) / 2, ph / 2), 0];
    case "base":
      return [0, Math.max(ph / 2, 0.03), 0];
    case "rail":
      return [index % 2 === 0 ? 0 : 0, Math.max(dims.h * 0.72, ph / 2), index % 2 === 0 ? backZ : frontZ];
    case "shelf":
      return [0, Math.max(dims.h * 0.35, ph / 2), 0];
    case "drawer":
    case "front":
      return [count > 1 ? ((index / Math.max(count - 1, 1)) - 0.5) * dims.w * 0.4 : 0, Math.max(dims.h * 0.6, ph / 2), frontZ];
    case "side":
      return [index % 2 === 0 ? leftX : rightX, Math.max(dims.h * 0.55, ph / 2), 0];
    default:
      return inferGenericPosition(role, panel, dims, index, count);
  }
}

function inferCasegoodsPosition(
  role: PanelRole,
  panel: PanelData,
  dims: { w: number; h: number; d: number },
  index: number,
  count: number,
): [number, number, number] {
  const [pw, ph, pd] = panel.size;
  const frontZ = dims.d / 2 - pd / 2 - 0.01;
  const backZ = -dims.d / 2 + pd / 2 + 0.01;
  const leftX = -dims.w / 2 + pw / 2;
  const rightX = dims.w / 2 - pw / 2;

  switch (role) {
    case "top":
      return [0, dims.h - ph / 2, 0];
    case "bottom":
    case "base":
      return [0, ph / 2, 0];
    case "side":
      return [index % 2 === 0 ? leftX : rightX, dims.h / 2, 0];
    case "back_panel":
      return [0, dims.h / 2, backZ];
    case "front":
    case "door":
    case "drawer":
      return [count > 1 ? ((index / Math.max(count - 1, 1)) - 0.5) * dims.w * 0.55 : 0, Math.max(dims.h * 0.5, ph / 2), frontZ];
    case "divider":
      return [count > 1 ? ((index / Math.max(count - 1, 1)) - 0.5) * dims.w * 0.45 : 0, dims.h / 2, 0];
    case "shelf":
      return [0, dims.h * (0.2 + (index + 1) / (count + 1) * 0.6), 0];
    case "leg": {
      const corners: [number, number][] = [
        [-dims.w / 2 + 0.04, -dims.d / 2 + 0.04],
        [dims.w / 2 - 0.04, -dims.d / 2 + 0.04],
        [-dims.w / 2 + 0.04, dims.d / 2 - 0.04],
        [dims.w / 2 - 0.04, dims.d / 2 - 0.04],
      ];
      const [x, z] = corners[index % corners.length] ?? [0, 0];
      return [x, ph / 2, z];
    }
    default:
      return inferGenericPosition(role, panel, dims, index, count);
  }
}

function inferWardrobePosition(
  role: PanelRole,
  panel: PanelData,
  dims: { w: number; h: number; d: number },
  index: number,
  count: number,
): [number, number, number] {
  if (role === "hanging_rail") {
    return [0, dims.h * 0.72, 0];
  }
  return inferCasegoodsPosition(role, panel, dims, index, count);
}

export function inferPositionsFromCategory(
  panels: PanelData[],
  category: FurnitureCategory,
  furnitureDims: { w: number; h: number; d: number },
  inferMask?: boolean[],
): PanelData[] {
  const groupedCounts = new Map<PanelRole, number>();
  const groupedIndex = new Map<PanelRole, number>();

  panels.forEach((panel, index) => {
    if (inferMask && !inferMask[index]) return;
    const role = classifyPanelRole(panel, category);
    groupedCounts.set(role, (groupedCounts.get(role) ?? 0) + 1);
  });

  return panels.map((panel, index) => {
    if (inferMask && !inferMask[index]) return panel;
    const role = classifyPanelRole(panel, category);
    const roleIndex = groupedIndex.get(role) ?? 0;
    groupedIndex.set(role, roleIndex + 1);

    const position =
      category === "table_desk"
        ? inferTableDeskPosition(role, panel, furnitureDims, roleIndex, groupedCounts.get(role) ?? 1)
        : category === "casegoods" || category === "shelving"
          ? inferCasegoodsPosition(role, panel, furnitureDims, roleIndex, groupedCounts.get(role) ?? 1)
          : category === "wardrobe"
            ? inferWardrobePosition(role, panel, furnitureDims, roleIndex, groupedCounts.get(role) ?? 1)
            : inferGenericPosition(role, panel, furnitureDims, roleIndex, groupedCounts.get(role) ?? 1);
    return { ...panel, position };
  });
}

function topFootprint(top: PanelData | undefined, dims: { w: number; h: number; d: number }): { w: number; d: number } {
  return {
    w: top ? Math.max(top.size[0], dims.w * 0.85) : dims.w,
    d: top ? Math.max(top.size[2], dims.d * 0.85) : dims.d,
  };
}

export function repairTableDeskLayout(
  panels: PanelData[],
  dims: { w: number; h: number; d: number },
): PanelData[] {
  const result = [...panels];
  const roles = new Map(result.map((panel) => [panel.id, classifyPanelRole(panel, "table_desk")]));
  const tops = result.filter((panel) => roles.get(panel.id) === "top");
  const legs = result.filter((panel) => roles.get(panel.id) === "leg");
  const columns = result.filter((panel) => roles.get(panel.id) === "column");
  const bases = result.filter((panel) => roles.get(panel.id) === "base");
  const fronts = result.filter((panel) => roles.get(panel.id) === "front" || roles.get(panel.id) === "drawer");
  const rails = result.filter((panel) => roles.get(panel.id) === "rail");
  const shelves = result.filter((panel) => roles.get(panel.id) === "shelf");
  const sides = result.filter((panel) => roles.get(panel.id) === "side");

  const top = tops.sort((a, b) => b.size[0] * b.size[2] - a.size[0] * a.size[2])[0];
  const footprint = topFootprint(top, dims);
  const topThickness = top ? Math.min(Math.max(top.size[1], 0.025), 0.08) : 0.04;
  const topY = Math.max(dims.h - topThickness / 2, 0.45);

  if (top) {
    top.position = [0, topY, 0];
    top.size = [footprint.w, topThickness, footprint.d];
  }

  if (columns.length > 0) {
    columns.forEach((column) => {
      column.position = [0, (topY - topThickness / 2) / 2, 0];
      column.size = [Math.min(Math.max(column.size[0], 0.08), 0.18), topY - topThickness / 2, Math.min(Math.max(column.size[2], 0.08), 0.18)];
    });
  }
  // Always snap corner legs — do not use else-if: a mislabeled "pedestal/column" must not skip leg placement.
  if (legs.length > 0) {
    const insetX = Math.max(0.06, footprint.w * 0.08);
    const insetZ = Math.max(0.06, footprint.d * 0.08);
    const legHeight = Math.max(topY - topThickness / 2, 0.35);
    const corners: [number, number][] = [
      [-footprint.w / 2 + insetX, -footprint.d / 2 + insetZ],
      [footprint.w / 2 - insetX, -footprint.d / 2 + insetZ],
      [-footprint.w / 2 + insetX, footprint.d / 2 - insetZ],
      [footprint.w / 2 - insetX, footprint.d / 2 - insetZ],
    ];
    legs.forEach((leg, index) => {
      const [x, z] = corners[index % corners.length] ?? [0, 0];
      const thickness = Math.min(Math.max(Math.max(leg.size[0], leg.size[2]), 0.03), 0.09);
      leg.position = [x, legHeight / 2, z];
      leg.size = [thickness, legHeight, thickness];
    });
  }

  bases.forEach((base) => {
    base.position = [0, Math.max(base.size[1] / 2, 0.03), 0];
    base.size = [Math.max(base.size[0], footprint.w * 0.55), Math.min(Math.max(base.size[1], 0.03), 0.08), Math.max(base.size[2], footprint.d * 0.55)];
  });

  rails.forEach((rail, index) => {
    const isFront = /front/i.test(rail.label) || (!/back/i.test(rail.label) && index % 2 === 0);
    const z = isFront ? footprint.d / 2 - rail.size[2] / 2 - 0.04 : -footprint.d / 2 + rail.size[2] / 2 + 0.04;
    rail.position = [0, Math.max(topY - topThickness * 1.6, rail.size[1] / 2 + 0.08), z];
    rail.size = [Math.max(rail.size[0], footprint.w * 0.82), Math.min(Math.max(rail.size[1], 0.03), 0.08), Math.min(Math.max(rail.size[2], 0.025), 0.08)];
  });

  sides.forEach((side, index) => {
    side.position = [index % 2 === 0 ? -footprint.w / 2 + side.size[0] / 2 : footprint.w / 2 - side.size[0] / 2, Math.max(dims.h * 0.45, side.size[1] / 2), 0];
  });

  fronts.forEach((front, index) => {
    const x = fronts.length > 1 ? ((index / Math.max(fronts.length - 1, 1)) - 0.5) * footprint.w * 0.55 : 0;
    front.position = [x, Math.max(dims.h * 0.6, front.size[1] / 2), footprint.d / 2 - front.size[2] / 2];
  });

  shelves.forEach((shelf) => {
    shelf.position = [0, Math.max(dims.h * 0.38, shelf.size[1] / 2), 0];
  });

  return result;
}

export function repairCasegoodsLayout(
  panels: PanelData[],
  dims: { w: number; h: number; d: number },
): PanelData[] {
  const result = [...panels];
  const roles = new Map(result.map((panel) => [panel.id, classifyPanelRole(panel, "casegoods")]));
  const tops = result.filter((panel) => roles.get(panel.id) === "top");
  const bottoms = result.filter((panel) => roles.get(panel.id) === "bottom" || roles.get(panel.id) === "base");
  const sides = result.filter((panel) => roles.get(panel.id) === "side");
  const backs = result.filter((panel) => roles.get(panel.id) === "back_panel");
  const fronts = result.filter((panel) => roles.get(panel.id) === "front");
  const drawers = result.filter((panel) => roles.get(panel.id) === "drawer");
  const doors = result.filter((panel) => roles.get(panel.id) === "door");
  const shelves = result.filter((panel) => roles.get(panel.id) === "shelf");
  const dividers = result.filter((panel) => roles.get(panel.id) === "divider");
  const legs = result.filter((panel) => roles.get(panel.id) === "leg");

  const thickness = 0.02;
  tops.forEach((top) => {
    top.position = [0, dims.h - top.size[1] / 2, 0];
    top.size = [Math.max(top.size[0], dims.w), Math.min(Math.max(top.size[1], thickness), 0.05), Math.max(top.size[2], dims.d)];
  });
  bottoms.forEach((bottom) => {
    bottom.position = [0, bottom.size[1] / 2 + (legs.length > 0 ? 0.08 : 0), 0];
    bottom.size = [Math.max(bottom.size[0], dims.w), Math.min(Math.max(bottom.size[1], thickness), 0.05), Math.max(bottom.size[2], dims.d)];
  });
  sides.forEach((side, index) => {
    side.size = [Math.min(Math.max(side.size[0], 0.02), 0.06), Math.max(side.size[1], dims.h * 0.88), Math.max(side.size[2], dims.d)];
    side.position = [index % 2 === 0 ? -dims.w / 2 + side.size[0] / 2 : dims.w / 2 - side.size[0] / 2, side.size[1] / 2, 0];
  });
  backs.forEach((back) => {
    back.size = [Math.max(back.size[0], dims.w * 0.94), Math.max(back.size[1], dims.h * 0.9), Math.min(Math.max(back.size[2], 0.01), 0.03)];
    back.position = [0, back.size[1] / 2, -dims.d / 2 + back.size[2] / 2];
  });
  fronts.forEach((front, index) => {
    const x = fronts.length > 1 ? ((index / Math.max(fronts.length - 1, 1)) - 0.5) * dims.w * 0.65 : 0;
    front.position = [x, Math.max(dims.h * 0.5, front.size[1] / 2), dims.d / 2 - front.size[2] / 2];
  });
  doors.forEach((door, index) => {
    const x = doors.length > 1 ? ((index / Math.max(doors.length - 1, 1)) - 0.5) * dims.w * 0.5 : 0;
    door.position = [x, Math.max(dims.h * 0.5, door.size[1] / 2), dims.d / 2 - door.size[2] / 2];
  });
  drawers.forEach((drawer, index) => {
    const x = drawers.length > 1 ? ((index / Math.max(drawers.length - 1, 1)) - 0.5) * dims.w * 0.45 : 0;
    const y = dims.h * (0.2 + (index + 0.5) / Math.max(drawers.length, 1) * 0.6);
    drawer.position = [x, y, dims.d / 2 - drawer.size[2] / 2];
  });
  const innerLeft = -dims.w / 2 + 0.05;
  const innerRight = dims.w / 2 - 0.05;
  spreadEvenly(dividers, innerLeft, innerRight, (divider, x) => {
    divider.position = [x, Math.max(dims.h * 0.5, divider.size[1] / 2), 0];
  });
  const shelfMinY = dims.h * 0.2;
  const shelfMaxY = dims.h * 0.82;
  spreadEvenly(shelves, shelfMinY, shelfMaxY, (shelf, y) => {
    shelf.position = [0, y, 0];
  });
  const legPositions: [number, number][] = [
    [-dims.w / 2 + 0.05, -dims.d / 2 + 0.05],
    [dims.w / 2 - 0.05, -dims.d / 2 + 0.05],
    [-dims.w / 2 + 0.05, dims.d / 2 - 0.05],
    [dims.w / 2 - 0.05, dims.d / 2 - 0.05],
  ];
  legs.forEach((leg, index) => {
    const [x, z] = legPositions[index % legPositions.length] ?? [0, 0];
    const height = Math.min(Math.max(leg.size[1], 0.08), 0.18);
    const thicknessLeg = Math.min(Math.max(Math.max(leg.size[0], leg.size[2]), 0.025), 0.06);
    leg.position = [x, height / 2, z];
    leg.size = [thicknessLeg, height, thicknessLeg];
  });

  return result;
}

export function repairWardrobeLayout(
  panels: PanelData[],
  dims: { w: number; h: number; d: number },
): PanelData[] {
  const result = repairCasegoodsLayout(panels, dims);
  const doors = result.filter((panel) => classifyPanelRole(panel, "wardrobe") === "door");
  const rails = result.filter((panel) => classifyPanelRole(panel, "wardrobe") === "hanging_rail");
  const shelves = result.filter((panel) => classifyPanelRole(panel, "wardrobe") === "shelf");
  const backs = result.filter((panel) => classifyPanelRole(panel, "wardrobe") === "back_panel");

  spreadEvenly(doors, -dims.w * 0.28, dims.w * 0.28, (door, x) => {
    door.position = [x, Math.max(dims.h * 0.5, door.size[1] / 2), dims.d / 2 - door.size[2] / 2];
  });
  rails.forEach((rail) => {
    rail.position = [0, dims.h * 0.72, 0];
    rail.size = [Math.max(rail.size[0], dims.w * 0.65), Math.min(Math.max(rail.size[1], 0.02), 0.05), Math.min(Math.max(rail.size[2], 0.02), 0.05)];
  });
  if (shelves.length > 0 && rails.length > 0) {
    const lowerShelves = shelves.filter((_, index) => index % 2 === 0);
    spreadEvenly(lowerShelves, dims.h * 0.18, dims.h * 0.45, (shelf, y) => {
      shelf.position = [0, y, 0];
    });
  }
  backs.forEach((back) => {
    back.position = [0, Math.max(dims.h * 0.5, back.size[1] / 2), -dims.d / 2 + back.size[2] / 2];
  });
  return result;
}

export function repairShelvingLayout(
  panels: PanelData[],
  dims: { w: number; h: number; d: number },
): PanelData[] {
  const result = [...panels];
  const roles = new Map(result.map((panel) => [panel.id, classifyPanelRole(panel, "shelving")]));
  const sides = result.filter((panel) => roles.get(panel.id) === "side");
  const backs = result.filter((panel) => roles.get(panel.id) === "back_panel");
  const shelves = result.filter((panel) => roles.get(panel.id) === "shelf");
  const dividers = result.filter((panel) => roles.get(panel.id) === "divider");

  sides.forEach((side, index) => {
    side.size = [Math.min(Math.max(side.size[0], 0.02), 0.05), Math.max(side.size[1], dims.h), Math.max(side.size[2], dims.d)];
    side.position = [index % 2 === 0 ? -dims.w / 2 + side.size[0] / 2 : dims.w / 2 - side.size[0] / 2, side.size[1] / 2, 0];
  });
  backs.forEach((back) => {
    back.size = [Math.max(back.size[0], dims.w * 0.94), Math.max(back.size[1], dims.h * 0.96), Math.min(Math.max(back.size[2], 0.01), 0.03)];
    back.position = [0, back.size[1] / 2, -dims.d / 2 + back.size[2] / 2];
  });
  spreadEvenly(shelves, dims.h * 0.18, dims.h * 0.84, (shelf, y) => {
    shelf.position = [0, y, 0];
    shelf.size = [Math.max(shelf.size[0], dims.w * 0.9), Math.min(Math.max(shelf.size[1], 0.018), 0.05), Math.max(shelf.size[2], dims.d * 0.88)];
  });
  spreadEvenly(dividers, -dims.w * 0.28, dims.w * 0.28, (divider, x) => {
    divider.position = [x, Math.max(dims.h * 0.5, divider.size[1] / 2), 0];
  });
  return result;
}
