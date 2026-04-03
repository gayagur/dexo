/**
 * Target-aware placement for soft decor (blankets, pillows) on beds and sofas.
 * Works from world-space panels + furniture name heuristics; extensible per profile.
 */

import * as THREE from "three";
import type { PanelData, PanelShape, DrapedControlPoint, SoftDecorMeta } from "./furnitureData";
import type { GroupData } from "./furnitureData";
import { panelsToWorldSpace } from "./groupUtils";
import { classifyPanelRole, detectFurnitureCategory, type FurnitureCategory } from "./furnitureLayoutStrategies";

const Z_FIGHT = 0.004;
/** Extra lift so cushion/dome geometry clears the surface below (see CushionGeometry crown). */
const CUSHION_SURFACE_CLEAR = 0.012;

export type SoftDecorKind = SoftDecorMeta["kind"];
export type SoftFurnitureProfile = "bed" | "sofa" | "compact_seat" | "unknown";

const SOFA_LIKE_RE =
  /\b(sectional|sofa|couch|loveseat|divan|settee|chesterfield|ottoman|booth|lobby sofa|l[-\s]?shape|corner sofa)\b/i;

function structuralPanels(panels: PanelData[]): PanelData[] {
  return panels.filter((p) => !p.softDecor);
}

function panelWorldCorners(panel: PanelData): THREE.Vector3[] {
  const half = new THREE.Vector3(panel.size[0] / 2, panel.size[1] / 2, panel.size[2] / 2);
  const center = new THREE.Vector3(...panel.position);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(panel.rotation ?? [0, 0, 0])));
  const out: THREE.Vector3[] = [];
  for (const sx of [-1, 1] as const) {
    for (const sy of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        const local = new THREE.Vector3(sx * half.x, sy * half.y, sz * half.z)
          .applyQuaternion(q)
          .add(center);
        out.push(local);
      }
    }
  }
  return out;
}

function panelWorldTopY(panel: PanelData): number {
  return Math.max(...panelWorldCorners(panel).map((c) => c.y));
}

function worldYawFromPanel(panel: PanelData): number {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(panel.rotation ?? [0, 0, 0]), "XYZ"));
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

function xzFootprint(panel: PanelData): { cx: number; cz: number; halfW: number; halfD: number; topY: number } {
  const corners = panelWorldCorners(panel);
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const c of corners) {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x);
    minZ = Math.min(minZ, c.z);
    maxZ = Math.max(maxZ, c.z);
  }
  return {
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    halfW: (maxX - minX) / 2,
    halfD: (maxZ - minZ) / 2,
    topY: panelWorldTopY(panel),
  };
}

function pickMattressPanel(worldPanels: PanelData[], category: FurnitureCategory): PanelData | null {
  if (category !== "bed") return null;
  const struct = structuralPanels(worldPanels);
  const scored = struct
    .filter((p) => {
      const role = classifyPanelRole(p, category);
      return (
        role === "mattress" ||
        p.shape === "mattress" ||
        /\bmattress\b/i.test(p.label)
      );
    })
    .filter((p) => p.type === "horizontal");
  if (scored.length > 0) {
    return scored.sort((a, b) => b.size[0] * b.size[2] - a.size[0] * a.size[2])[0] ?? null;
  }
  // Fallback: largest low-profile horizontal slab (sleep platform)
  const horiz = struct.filter(
    (p) =>
      p.type === "horizontal" &&
      p.size[1] < 0.42 &&
      p.size[0] > 0.65 &&
      p.size[2] > 1.0
  );
  if (horiz.length === 0) return null;
  return horiz.sort((a, b) => b.size[0] * b.size[2] - a.size[0] * a.size[2])[0] ?? null;
}

function pickSeatPanels(worldPanels: PanelData[], category: FurnitureCategory): PanelData[] {
  if (category !== "seating") return [];
  const struct = structuralPanels(worldPanels);
  return struct.filter((p) => {
    if (p.type !== "horizontal") return false;
    const role = classifyPanelRole(p, category);
    if (role === "seat") return true;
    const L = p.label.toLowerCase();
    if (/\bback\b/i.test(L)) return false;
    return /\bseat|cushion|pillow\b/i.test(L);
  });
}

function pickBackPanels(worldPanels: PanelData[], category: FurnitureCategory): PanelData[] {
  if (category !== "seating") return [];
  const struct = structuralPanels(worldPanels);
  return struct.filter((p) => {
    const role = classifyPanelRole(p, category);
    if (role === "back") return true;
    const L = p.label.toLowerCase();
    return /\bback|backrest\b/i.test(L) && !/\bseat\b/i.test(L);
  });
}

function detectSoftProfile(groupName: string, worldPanels: PanelData[]): SoftFurnitureProfile {
  const struct = structuralPanels(worldPanels);
  const category = detectFurnitureCategory(groupName, struct);
  const text = `${groupName} ${struct.map((p) => p.label).join(" ")}`.toLowerCase();

  if (category === "bed" && !/\b(daybed|sofa bed)\b/i.test(text)) return "bed";

  if (category === "seating") {
    const seats = pickSeatPanels(struct, "seating");
    const sofaLike = SOFA_LIKE_RE.test(text) || seats.length >= 2;
    const seatBBoxW = seatBBox(seats).width;
    if (sofaLike || seatBBoxW > 1.12) return "sofa";
    return "compact_seat";
  }

  return "unknown";
}

function seatBBox(seats: PanelData[]): { minX: number; maxX: number; minZ: number; maxZ: number; topY: number; width: number; depth: number; cx: number; cz: number } {
  if (seats.length === 0) {
    return { minX: 0, maxX: 0, minZ: 0, maxZ: 0, topY: 0, width: 0, depth: 0, cx: 0, cz: 0 };
  }
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity,
    topY = -Infinity;
  for (const s of seats) {
    const fp = xzFootprint(s);
    minX = Math.min(minX, fp.cx - fp.halfW);
    maxX = Math.max(maxX, fp.cx + fp.halfW);
    minZ = Math.min(minZ, fp.cz - fp.halfD);
    maxZ = Math.max(maxZ, fp.cz + fp.halfD);
    topY = Math.max(topY, fp.topY);
  }
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    topY,
    width: maxX - minX,
    depth: maxZ - minZ,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
  };
}

function isLShapedSeating(seats: PanelData[]): boolean {
  if (seats.length < 2) return false;
  const xs = seats.map((s) => s.position[0]);
  const zs = seats.map((s) => s.position[2]);
  const sx = stdDev(xs);
  const sz = stdDev(zs);
  return sx > 0.28 && sz > 0.28;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((acc, x) => acc + (x - m) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

/** Resolve world-space furniture context from an anchor panel id. */
export function resolveFurnitureWorldContext(
  anchorPanelId: string,
  options: {
    groups: GroupData[];
    ungroupedPanels: PanelData[];
    editingGroupId: string | null;
    editModePanels: PanelData[] | null;
    furnitureTypeLabel: string;
  }
): { worldPanels: PanelData[]; groupName: string; anchorWorldPanel: PanelData } | null {
  const { groups, ungroupedPanels, editingGroupId, editModePanels, furnitureTypeLabel } = options;

  if (editingGroupId && editModePanels?.some((p) => p.id === anchorPanelId)) {
    const anchorWorldPanel = editModePanels.find((p) => p.id === anchorPanelId)!;
    return { worldPanels: editModePanels, groupName: furnitureTypeLabel, anchorWorldPanel };
  }

  for (const g of groups) {
    if (!g.panels.some((p) => p.id === anchorPanelId)) continue;
    const worldPanels = panelsToWorldSpace(g.panels, g.position, g.rotation, g.scale ?? [1, 1, 1]);
    const anchorWorldPanel = worldPanels.find((p) => p.id === anchorPanelId);
    if (!anchorWorldPanel) return null;
    return { worldPanels, groupName: g.name, anchorWorldPanel };
  }

  const ung = ungroupedPanels.find((p) => p.id === anchorPanelId);
  if (ung) {
    return { worldPanels: ungroupedPanels, groupName: "Ungrouped", anchorWorldPanel: ung };
  }

  return null;
}

export function softDecorVariantCount(profile: SoftFurnitureProfile, kind: SoftDecorKind): number {
  if (kind === "blanket") {
    if (profile === "bed" || profile === "sofa") return 2;
    return 1;
  }
  if (kind === "pillow") {
    if (profile === "bed" || profile === "sofa") return 4;
    return 2;
  }
  return 1;
}

export interface SoftDecorPlacementPlan {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  type: PanelData["type"];
  shape?: PanelShape;
  shapeParams?: Record<string, number>;
  drapedControlPoints?: DrapedControlPoint[];
  label: string;
  softDecor: SoftDecorMeta;
}

function hashJitter(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export interface PlanSoftDecorInput {
  kind: SoftDecorKind;
  variantIndex: number;
  anchorPanelId: string;
  groups: GroupData[];
  ungroupedPanels: PanelData[];
  editingGroupId: string | null;
  editModePanels: PanelData[] | null;
  furnitureTypeLabel: string;
  defaultMaterialId: string;
}

/**
 * Compute world-space placement for a blanket or pillow on the furniture that owns `anchorPanelId`.
 */
export function planSoftDecorPlacement(input: PlanSoftDecorInput): SoftDecorPlacementPlan | null {
  const ctx = resolveFurnitureWorldContext(input.anchorPanelId, {
    groups: input.groups,
    ungroupedPanels: input.ungroupedPanels,
    editingGroupId: input.editingGroupId,
    editModePanels: input.editModePanels,
    furnitureTypeLabel: input.furnitureTypeLabel,
  });
  if (!ctx) return null;

  const struct = structuralPanels(ctx.worldPanels);
  const profile = detectSoftProfile(ctx.groupName, ctx.worldPanels);
  const vCount = softDecorVariantCount(profile, input.kind);
  const vi = ((input.variantIndex % vCount) + vCount) % vCount;
  const seed = vi * 17 + (input.kind === "blanket" ? 3 : 11);

  // Fallback: center on anchor top, preserve kind-appropriate defaults
  const anchorFp = xzFootprint(ctx.anchorWorldPanel);
  const anchorTop = panelWorldTopY(ctx.anchorWorldPanel);
  const ay = worldYawFromPanel(ctx.anchorWorldPanel);

  const fallback = (): SoftDecorPlacementPlan => ({
    position: [
      anchorFp.cx,
      anchorTop +
        (input.kind === "blanket" ? 0.036 / 2 + CUSHION_SURFACE_CLEAR : 0.09 / 2 + CUSHION_SURFACE_CLEAR) +
        Z_FIGHT,
      anchorFp.cz,
    ],
    rotation: [0, ay, 0],
    size: input.kind === "blanket" ? [0.75, 0.036, 0.55] : [0.4, 0.09, 0.4],
    type: "horizontal",
    shape: "cushion",
    shapeParams: { softness: input.kind === "blanket" ? 0.28 : 0.42 },
    label: input.kind === "blanket" ? "Throw blanket" : "Decorative pillow",
    softDecor: {
      kind: input.kind,
      variantIndex: vi,
      variantId: `${profile}_fallback`,
      anchorPanelId: input.anchorPanelId,
    },
  });

  if (profile === "bed" && input.kind === "blanket") {
    const mattress = pickMattressPanel(ctx.worldPanels, "bed") ?? ctx.anchorWorldPanel;
    const fp = xzFootprint(mattress);
    const topY = panelWorldTopY(mattress);
    const yaw = worldYawFromPanel(mattress);
    const j0 = (hashJitter(seed, 0) - 0.5) * 0.04;
    const j1 = (hashJitter(seed, 1) - 0.5) * 0.03;

    if (vi === 0) {
      // Full spread: flat cushion layer — "draped" shader uses min(width,depth) for wave amp and
      // breaks on bed-sized pieces (huge folds + wrong height). Cushion stays proportional.
      const w = fp.halfW * 2 * 0.96;
      const d = fp.halfD * 2 * 0.91;
      const thick = 0.04;
      const pos: [number, number, number] = [
        fp.cx + j0 * fp.halfW * 0.35,
        topY + thick / 2 + CUSHION_SURFACE_CLEAR + Z_FIGHT,
        fp.cz + fp.halfD * 0.04 + j1 * fp.halfD * 0.25,
      ];
      const rot: [number, number, number] = [0.012 + j0 * 0.015, yaw + j1 * 0.025, 0.008];
      return {
        position: pos,
        rotation: rot,
        size: [w, thick, d],
        type: "horizontal",
        shape: "cushion",
        shapeParams: { softness: 0.22 },
        label: "Bed blanket",
        softDecor: {
          kind: "blanket",
          variantIndex: vi,
          variantId: "bed_blanket_full_spread",
          anchorPanelId: input.anchorPanelId,
        },
      };
    }
    // Folded stack at foot — small cushion stack (avoid large-area draped amp bug)
    const corners = panelWorldCorners(mattress);
    const maxZ = Math.max(...corners.map((c) => c.z));
    const foldW = Math.min(fp.halfW * 2 * 0.55, 1.15);
    const foldD = Math.min(fp.halfD * 2 * 0.36, 0.85);
    const thick = 0.055;
    const pos: [number, number, number] = [
      fp.cx + fp.halfW * 0.1 + j0 * 0.03,
      topY + thick / 2 + CUSHION_SURFACE_CLEAR + Z_FIGHT,
      maxZ - foldD * 0.38 + j1 * 0.02,
    ];
    const rot: [number, number, number] = [0.08 + j0 * 0.03, yaw + 0.22 + j1 * 0.04, 0.05];
    return {
      position: pos,
      rotation: rot,
      size: [foldW, thick, foldD],
      type: "horizontal",
      shape: "cushion",
      shapeParams: { softness: 0.18 },
      label: "Bed blanket (folded)",
      softDecor: {
        kind: "blanket",
        variantIndex: vi,
        variantId: "bed_blanket_folded_foot",
        anchorPanelId: input.anchorPanelId,
      },
    };
  }

  if (profile === "bed" && input.kind === "pillow") {
    const mattress = pickMattressPanel(ctx.worldPanels, "bed") ?? ctx.anchorWorldPanel;
    const fp = xzFootprint(mattress);
    const topY = panelWorldTopY(mattress);
    const yaw = worldYawFromPanel(mattress);
    const corners = panelWorldCorners(mattress);
    const minZ = Math.min(...corners.map((c) => c.z));
    const headZ = minZ + fp.halfD * 0.35;
    const pw = Math.min(0.52, fp.halfW * 2 * 0.28);
    const pd = Math.min(0.42, fp.halfD * 2 * 0.22);
    const ph = 0.11;
    let px = fp.cx;
    let pz = headZ;
    if (vi === 0) px = fp.cx - fp.halfW * 0.52;
    else if (vi === 1) px = fp.cx + fp.halfW * 0.52;
    else if (vi === 2) px = fp.cx + (hashJitter(seed, 2) - 0.5) * 0.04;
    else {
      px = fp.cx - fp.halfW * 0.38;
      pz = headZ + 0.06;
    }
    const j = (hashJitter(seed, 3) - 0.5) * 0.06;
    return {
      position: [px + j, topY + ph / 2 + CUSHION_SURFACE_CLEAR + Z_FIGHT, pz],
      rotation: [0, yaw + (hashJitter(seed, 4) - 0.5) * 0.12, 0],
      size: [pw, ph, pd],
      type: "horizontal",
      shape: "cushion",
      shapeParams: { softness: 0.38 },
      label: vi === 3 ? "Bed pillow (corner)" : "Bed pillow",
      softDecor: {
        kind: "pillow",
        variantIndex: vi,
        variantId: ["bed_pillow_left", "bed_pillow_right", "bed_pillow_center", "bed_pillow_corner"][vi] ?? "bed_pillow",
        anchorPanelId: input.anchorPanelId,
      },
    };
  }

  if ((profile === "sofa" || profile === "compact_seat") && input.kind === "blanket") {
    const seats = pickSeatPanels(struct, "seating");
    const seatBox = seatBBox(seats.length ? seats : [ctx.anchorWorldPanel]);
    const yaw = seats.length ? worldYawFromPanel(seats[0]!) : ay;
    const j0 = (hashJitter(seed, 0) - 0.5) * 0.05;
    const j1 = (hashJitter(seed, 1) - 0.5) * 0.04;
    const lShape = profile === "sofa" && isLShapedSeating(seats);

    if (vi === 0) {
      // Casual throw on seat + toward arm — thin cushion reads as fabric, sits on seat plane
      const w = profile === "compact_seat" ? 0.44 : Math.min(0.58, seatBox.width * 0.72);
      const d = profile === "compact_seat" ? 0.5 : Math.min(0.68, seatBox.depth * 0.92);
      const thick = 0.034;
      const pos: [number, number, number] = [
        seatBox.minX + Math.min(w * 0.42, seatBox.width * 0.28) + j0,
        seatBox.topY + thick / 2 + CUSHION_SURFACE_CLEAR + Z_FIGHT,
        seatBox.cz + seatBox.depth * 0.06 + j1,
      ];
      const rot: [number, number, number] = [0.055 + j0 * 0.02, yaw - 0.38 - j1 * 0.08, 0.09];
      return {
        position: pos,
        rotation: rot,
        size: [w, thick, d],
        type: "horizontal",
        shape: "cushion",
        shapeParams: { softness: 0.3 },
        label: lShape ? "Sectional throw" : "Sofa throw",
        softDecor: {
          kind: "blanket",
          variantIndex: vi,
          variantId: lShape ? "sofa_blanket_corner_side" : "sofa_blanket_left",
          anchorPanelId: input.anchorPanelId,
        },
      };
    }
    const w = profile === "compact_seat" ? 0.42 : Math.min(0.56, seatBox.width * 0.7);
    const d = profile === "compact_seat" ? 0.48 : Math.min(0.65, seatBox.depth * 0.9);
    const thick = 0.034;
    const pos: [number, number, number] = [
      seatBox.maxX - Math.min(w * 0.42, seatBox.width * 0.28) - j0,
      seatBox.topY + thick / 2 + CUSHION_SURFACE_CLEAR + Z_FIGHT,
      seatBox.cz + seatBox.depth * 0.04 + j1,
    ];
    const rot: [number, number, number] = [0.05, yaw + 0.36 + j1 * 0.06, -0.08];
    return {
      position: pos,
      rotation: rot,
      size: [w, thick, d],
      type: "horizontal",
      shape: "cushion",
      shapeParams: { softness: 0.3 },
      label: "Sofa throw",
      softDecor: {
        kind: "blanket",
        variantIndex: vi,
        variantId: "sofa_blanket_right",
        anchorPanelId: input.anchorPanelId,
      },
    };
  }

  if ((profile === "sofa" || profile === "compact_seat") && input.kind === "pillow") {
    const seats = pickSeatPanels(struct, "seating");
    const backs = pickBackPanels(struct, "seating");
    const seatBox = seatBBox(seats.length ? seats : [ctx.anchorWorldPanel]);
    const backZ =
      backs.length > 0
        ? Math.min(...backs.map((b) => xzFootprint(b).cz - xzFootprint(b).halfD * 0.2))
        : seatBox.minZ - 0.08;
    const yaw = seats.length ? worldYawFromPanel(seats[0]!) : ay;
    const lShape = profile === "sofa" && isLShapedSeating(seats);
    const compact = profile === "compact_seat";
    const pw = compact ? 0.32 : 0.38;
    const ph = compact ? 0.36 : 0.4;
    const pdepth = 0.12;
    /** Inset from seat side toward center so the pillow tucks into the arm–back corner. */
    const cornerInsetX = compact ? 0.07 : 0.055;
    const cornerInsetZ = compact ? 0.11 : 0.13;
    const jx = (hashJitter(seed, 1) - 0.5) * (compact ? 0.02 : 0.028);
    const jz = (hashJitter(seed, 2) - 0.5) * (compact ? 0.02 : 0.025);

    let px = seatBox.cx;
    let pz = seatBox.cz - seatBox.depth * 0.28;
    let rot: [number, number, number] = [
      -0.11 - hashJitter(seed, 3) * 0.04,
      yaw + (hashJitter(seed, 4) - 0.5) * 0.06,
      (hashJitter(seed, 5) - 0.5) * 0.06,
    ];
    let variantId: string;

    if (vi === 0) {
      // Default: back-right corner — leans on backrest + right arm (natural throw-pillow pose)
      px = seatBox.maxX - seatBox.width * cornerInsetX + jx;
      pz = Math.min(
        seatBox.minZ + seatBox.depth * cornerInsetZ + jz,
        backZ + seatBox.depth * 0.34,
      );
      rot = [
        -0.24 - hashJitter(seed, 3) * 0.035,
        yaw - 0.1 + (hashJitter(seed, 4) - 0.5) * 0.05,
        0.13 + (hashJitter(seed, 5) - 0.5) * 0.05,
      ];
      variantId = "sofa_pillow_right_corner";
    } else if (vi === 1) {
      // Back-left corner (mirror)
      px = seatBox.minX + seatBox.width * cornerInsetX + jx;
      pz = Math.min(
        seatBox.minZ + seatBox.depth * cornerInsetZ + jz,
        backZ + seatBox.depth * 0.34,
      );
      rot = [
        -0.24 - hashJitter(seed, 3) * 0.035,
        yaw + 0.1 + (hashJitter(seed, 4) - 0.5) * 0.05,
        -0.13 + (hashJitter(seed, 5) - 0.5) * 0.05,
      ];
      variantId = "sofa_pillow_left_corner";
    } else if (vi === 2) {
      px = seatBox.cx + (hashJitter(seed, 1) - 0.5) * 0.05;
      pz = Math.min(seatBox.cz - seatBox.depth * 0.26 + jz, backZ + seatBox.depth * 0.28);
      rot = [
        -0.12 - hashJitter(seed, 3) * 0.04,
        yaw + (hashJitter(seed, 4) - 0.5) * 0.08,
        (hashJitter(seed, 5) - 0.5) * 0.07,
      ];
      variantId = "sofa_pillow_center";
    } else {
      px = lShape ? seatBox.minX + seatBox.width * 0.18 : seatBox.maxX - seatBox.width * 0.22;
      const leanX = lShape ? 0.05 : -0.04;
      px += leanX;
      pz = Math.min(seatBox.cz - seatBox.depth * 0.22 + jz, backZ + seatBox.depth * 0.3);
      rot = [
        -0.18 - hashJitter(seed, 3) * 0.04,
        yaw + (lShape ? 0.06 : -0.05) + (hashJitter(seed, 4) - 0.5) * 0.06,
        (lShape ? -0.08 : 0.07) + (hashJitter(seed, 5) - 0.5) * 0.05,
      ];
      variantId = lShape ? "sofa_pillow_sectional" : "sofa_pillow_alt";
    }

    const pos: [number, number, number] = [
      px,
      seatBox.topY + ph / 2 + CUSHION_SURFACE_CLEAR + Z_FIGHT,
      pz,
    ];
    return {
      position: pos,
      rotation: rot,
      size: [pw, ph, pdepth],
      type: "vertical",
      shape: "cushion",
      shapeParams: { softness: 0.4 },
      label: lShape && vi === 3 ? "Sectional pillow" : "Sofa pillow",
      softDecor: {
        kind: "pillow",
        variantIndex: vi,
        variantId,
        anchorPanelId: input.anchorPanelId,
      },
    };
  }

  return fallback();
}
