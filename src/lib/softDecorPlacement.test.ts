import test from "node:test";
import assert from "node:assert/strict";
import type { PanelData } from "./furnitureData";
import type { GroupData } from "./furnitureData";
import { planSoftDecorPlacement, softDecorVariantCount, resolveFurnitureWorldContext } from "./softDecorPlacement";

function bedGroup(): GroupData {
  const mattress: PanelData = {
    id: "m1",
    type: "horizontal",
    shape: "mattress",
    label: "Mattress",
    position: [0, 0.55, 0],
    size: [1.6, 0.22, 2.0],
    materialId: "fabric_cream",
  };
  const headboard: PanelData = {
    id: "h1",
    type: "vertical",
    label: "Headboard",
    position: [0, 1.0, -1.0],
    size: [1.65, 1.1, 0.06],
    materialId: "oak",
  };
  return {
    id: "g-bed",
    name: "Queen Bed",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    panels: [mattress, headboard],
  };
}

test("resolveFurnitureWorldContext finds anchor in group", () => {
  const g = bedGroup();
  const ctx = resolveFurnitureWorldContext("m1", {
    groups: [g],
    ungroupedPanels: [],
    editingGroupId: null,
    editModePanels: null,
    furnitureTypeLabel: "Bed",
  });
  assert.ok(ctx);
  assert.equal(ctx!.groupName, "Queen Bed");
  assert.ok(ctx!.worldPanels.some((p) => p.id === "m1"));
});

test("bed blanket full spread stays on mattress footprint with margins", () => {
  const g = bedGroup();
  const plan = planSoftDecorPlacement({
    kind: "blanket",
    variantIndex: 0,
    anchorPanelId: "m1",
    groups: [g],
    ungroupedPanels: [],
    editingGroupId: null,
    editModePanels: null,
    furnitureTypeLabel: "Bed",
    defaultMaterialId: "fabric_taupe",
  });
  assert.ok(plan);
  assert.equal(plan!.softDecor.variantId, "bed_blanket_full_spread");
  assert.ok(plan!.size[0] < 1.6 && plan!.size[0] > 1.2);
  assert.ok(plan!.size[2] < 2.0 && plan!.size[2] > 1.5);
  assert.ok(plan!.position[1] > 0.55);
  assert.equal(plan!.shape, "cushion");
});

test("bed pillow variant index places near head (min Z side)", () => {
  const g = bedGroup();
  const left = planSoftDecorPlacement({
    kind: "pillow",
    variantIndex: 0,
    anchorPanelId: "m1",
    groups: [g],
    ungroupedPanels: [],
    editingGroupId: null,
    editModePanels: null,
    furnitureTypeLabel: "Bed",
    defaultMaterialId: "fabric_gray",
  });
  const right = planSoftDecorPlacement({
    kind: "pillow",
    variantIndex: 1,
    anchorPanelId: "m1",
    groups: [g],
    ungroupedPanels: [],
    editingGroupId: null,
    editModePanels: null,
    furnitureTypeLabel: "Bed",
    defaultMaterialId: "fabric_gray",
  });
  assert.ok(left && right);
  assert.ok(left!.position[0] < right!.position[0]);
});

test("sofa uses seat cluster for throw height", () => {
  const seatL: PanelData = {
    id: "s1",
    type: "horizontal",
    shape: "cushion_firm",
    label: "Seat cushion left",
    position: [-0.45, 0.42, 0.05],
    size: [0.85, 0.12, 0.88],
    materialId: "fabric_gray",
  };
  const seatR: PanelData = {
    id: "s2",
    type: "horizontal",
    shape: "cushion_firm",
    label: "Seat cushion right",
    position: [0.45, 0.42, 0.05],
    size: [0.85, 0.12, 0.88],
    materialId: "fabric_gray",
  };
  const back: PanelData = {
    id: "b1",
    type: "vertical",
    label: "Back cushion",
    position: [0, 0.72, -0.42],
    size: [1.9, 0.55, 0.18],
    materialId: "fabric_gray",
  };
  const g: GroupData = {
    id: "g-sofa",
    name: "3-Seater Sofa",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    panels: [seatL, seatR, back],
  };
  const plan = planSoftDecorPlacement({
    kind: "blanket",
    variantIndex: 0,
    anchorPanelId: "s1",
    groups: [g],
    ungroupedPanels: [],
    editingGroupId: null,
    editModePanels: null,
    furnitureTypeLabel: "Sofa",
    defaultMaterialId: "fabric_taupe",
  });
  assert.ok(plan);
  assert.ok(plan!.position[1] >= 0.42);
  assert.equal(plan!.shape, "cushion");
});

test("softDecorVariantCount matches planner branches", () => {
  assert.equal(softDecorVariantCount("bed", "blanket"), 2);
  assert.equal(softDecorVariantCount("bed", "pillow"), 4);
  assert.equal(softDecorVariantCount("sofa", "blanket"), 2);
  assert.equal(softDecorVariantCount("unknown", "blanket"), 1);
});
