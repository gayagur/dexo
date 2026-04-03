import test from "node:test";
import assert from "node:assert/strict";

import type { FurnitureAnalysis } from "./ai";
import { panelsFromFurnitureAnalysis } from "./furnitureImageAnalysis";
import type { PanelData } from "./furnitureData";

function nextIdFactory() {
  let i = 0;
  return () => `test-panel-${++i}`;
}

function buildPanels(analysis: FurnitureAnalysis): PanelData[] {
  return panelsFromFurnitureAnalysis(analysis, nextIdFactory());
}

function getByLabel(panels: PanelData[], pattern: RegExp): PanelData[] {
  return panels.filter((panel) => pattern.test(panel.label));
}

function singleByLabel(panels: PanelData[], pattern: RegExp): PanelData {
  const match = getByLabel(panels, pattern)[0];
  assert.ok(match, `Expected to find panel matching ${pattern}`);
  return match;
}

test("lays out collapsed dining table panels into top and corner legs", () => {
  const panels = buildPanels({
    name: "dining_table",
    estimatedDims: { w: 1600, h: 760, d: 900 },
    panels: [
      { label: "Tabletop", type: "horizontal", shape: "rounded_rect", position: [0, 0.4, 0], size: [1.5, 0.08, 0.85], materialId: "oak" },
      { label: "Front Left Leg", type: "vertical", shape: "cylinder", position: [0, 0.2, 0], size: [0.05, 0.72, 0.05], materialId: "black_metal" },
      { label: "Front Right Leg", type: "vertical", shape: "cylinder", position: [0, 0.2, 0], size: [0.05, 0.72, 0.05], materialId: "black_metal" },
      { label: "Back Left Leg", type: "vertical", shape: "cylinder", position: [0, 0.2, 0], size: [0.05, 0.72, 0.05], materialId: "black_metal" },
      { label: "Back Right Leg", type: "vertical", shape: "cylinder", position: [0, 0.2, 0], size: [0.05, 0.72, 0.05], materialId: "black_metal" },
    ],
  });

  const top = singleByLabel(panels, /tabletop/i);
  const legs = getByLabel(panels, /\bleg\b/i);

  assert.equal(legs.length, 4);
  assert.ok(top.position[1] > 0.65, "tabletop should be near final table height");
  assert.ok(new Set(legs.map((leg) => Math.sign(leg.position[0]))).size >= 2, "legs should be spread left/right");
  assert.ok(new Set(legs.map((leg) => Math.sign(leg.position[2]))).size >= 2, "legs should be spread front/back");
});

test("lays out collapsed cabinet panels into side, back, shelf, and front drawer planes", () => {
  const panels = buildPanels({
    name: "dresser",
    estimatedDims: { w: 1200, h: 850, d: 500 },
    panels: [
      { label: "Top", type: "horizontal", shape: "box", position: [0, 0.4, 0], size: [1.2, 0.03, 0.5], materialId: "oak" },
      { label: "Bottom", type: "horizontal", shape: "box", position: [0, 0.4, 0], size: [1.2, 0.03, 0.5], materialId: "oak" },
      { label: "Left Side", type: "vertical", shape: "box", position: [0, 0.4, 0], size: [0.03, 0.8, 0.5], materialId: "oak" },
      { label: "Right Side", type: "vertical", shape: "box", position: [0, 0.4, 0], size: [0.03, 0.8, 0.5], materialId: "oak" },
      { label: "Back", type: "back", shape: "box", position: [0, 0.4, 0], size: [1.12, 0.76, 0.02], materialId: "oak" },
      { label: "Shelf 1", type: "horizontal", shape: "box", position: [0, 0.4, 0], size: [1.1, 0.02, 0.45], materialId: "oak" },
      { label: "Drawer 1", type: "vertical", shape: "drawer_box", position: [0, 0.4, 0], size: [1.1, 0.22, 0.03], materialId: "oak" },
      { label: "Drawer 2", type: "vertical", shape: "drawer_box", position: [0, 0.4, 0], size: [1.1, 0.22, 0.03], materialId: "oak" },
    ],
  });

  const leftSide = singleByLabel(panels, /left side/i);
  const rightSide = singleByLabel(panels, /right side/i);
  const back = singleByLabel(panels, /^back$/i);
  const drawers = getByLabel(panels, /drawer/i);
  const shelves = getByLabel(panels, /shelf/i);

  assert.ok(leftSide.position[0] < 0 && rightSide.position[0] > 0, "cabinet sides should occupy opposite X planes");
  assert.ok(back.position[2] < 0, "cabinet back should be behind the body center");
  assert.ok(drawers.every((drawer) => drawer.position[2] > 0), "drawers should sit on the front plane");
  assert.ok(shelves.every((shelf) => Math.abs(shelf.position[2]) < 0.1), "shelves should sit inside the cabinet depth");
});

test("lays out collapsed wardrobe panels with door fronts and interior rail zones", () => {
  const panels = buildPanels({
    name: "wardrobe",
    estimatedDims: { w: 1800, h: 2200, d: 600 },
    panels: [
      { label: "Top", type: "horizontal", shape: "box", position: [0, 1, 0], size: [1.8, 0.03, 0.6], materialId: "oak" },
      { label: "Bottom", type: "horizontal", shape: "box", position: [0, 1, 0], size: [1.8, 0.03, 0.6], materialId: "oak" },
      { label: "Left Side", type: "vertical", shape: "box", position: [0, 1, 0], size: [0.03, 2.1, 0.6], materialId: "oak" },
      { label: "Right Side", type: "vertical", shape: "box", position: [0, 1, 0], size: [0.03, 2.1, 0.6], materialId: "oak" },
      { label: "Back", type: "back", shape: "box", position: [0, 1, 0], size: [1.74, 2.04, 0.02], materialId: "oak" },
      { label: "Left Door", type: "vertical", shape: "shaker_door", position: [0, 1, 0], size: [0.86, 2.0, 0.03], materialId: "oak" },
      { label: "Right Door", type: "vertical", shape: "shaker_door", position: [0, 1, 0], size: [0.86, 2.0, 0.03], materialId: "oak" },
      { label: "Hanging Rail", type: "horizontal", shape: "rod", position: [0, 1, 0], size: [1.1, 0.03, 0.03], materialId: "chrome" },
    ],
  });

  const doors = getByLabel(panels, /\bdoor\b/i);
  const rail = singleByLabel(panels, /hanging rail/i);
  const back = singleByLabel(panels, /^back$/i);

  assert.equal(doors.length, 2);
  assert.ok(doors.every((door) => door.position[2] > 0), "wardrobe doors should sit on the front face");
  assert.ok(Math.abs(doors[0].position[0] - doors[1].position[0]) > 0.2, "wardrobe doors should split across the width");
  assert.ok(Math.abs(rail.position[2]) < 0.1, "hanging rail should remain in the interior zone");
  assert.ok(back.position[2] < 0, "wardrobe back should be on the rear plane");
});

test("lays out collapsed shelving panels with separated shelf heights", () => {
  const panels = buildPanels({
    name: "bookcase",
    estimatedDims: { w: 900, h: 1800, d: 320 },
    panels: [
      { label: "Left Side", type: "vertical", shape: "box", position: [0, 0.8, 0], size: [0.03, 1.8, 0.32], materialId: "oak" },
      { label: "Right Side", type: "vertical", shape: "box", position: [0, 0.8, 0], size: [0.03, 1.8, 0.32], materialId: "oak" },
      { label: "Shelf 1", type: "horizontal", shape: "box", position: [0, 0.8, 0], size: [0.84, 0.02, 0.28], materialId: "oak" },
      { label: "Shelf 2", type: "horizontal", shape: "box", position: [0, 0.8, 0], size: [0.84, 0.02, 0.28], materialId: "oak" },
      { label: "Shelf 3", type: "horizontal", shape: "box", position: [0, 0.8, 0], size: [0.84, 0.02, 0.28], materialId: "oak" },
      { label: "Back", type: "back", shape: "box", position: [0, 0.8, 0], size: [0.84, 1.76, 0.02], materialId: "oak" },
    ],
  });

  const shelves = getByLabel(panels, /shelf/i).sort((a, b) => a.position[1] - b.position[1]);

  assert.equal(shelves.length, 3);
  assert.ok(shelves[1].position[1] - shelves[0].position[1] > 0.1, "shelves should have clear vertical spacing");
  assert.ok(shelves[2].position[1] - shelves[1].position[1] > 0.1, "upper shelves should have clear vertical spacing");
});

test("lays out collapsed reception counter panels into front, sides, and top footprint", () => {
  const panels = buildPanels({
    name: "reception_desk",
    estimatedDims: { w: 1800, h: 1100, d: 700 },
    panels: [
      { label: "Top", type: "horizontal", shape: "rounded_rect", position: [0, 0.5, 0], size: [1.8, 0.04, 0.7], materialId: "oak" },
      { label: "Left Side", type: "vertical", shape: "box", position: [0, 0.5, 0], size: [0.03, 1.0, 0.7], materialId: "oak" },
      { label: "Right Side", type: "vertical", shape: "box", position: [0, 0.5, 0], size: [0.03, 1.0, 0.7], materialId: "oak" },
      { label: "Front Panel", type: "vertical", shape: "rounded_rect", position: [0, 0.5, 0], size: [1.74, 1.0, 0.04], materialId: "oak" },
      { label: "Base", type: "horizontal", shape: "box", position: [0, 0.5, 0], size: [1.8, 0.04, 0.7], materialId: "oak" },
    ],
  });

  const front = singleByLabel(panels, /front panel/i);
  const sides = getByLabel(panels, /side/i);
  const top = singleByLabel(panels, /^top$/i);

  assert.equal(sides.length, 2);
  assert.ok(sides[0].position[0] * sides[1].position[0] < 0, "counter sides should be on opposite X sides");
  assert.ok(Math.abs(front.position[2]) > 0.15, "front panel should be offset to a front plane");
  assert.ok(top.position[1] > 0.9, "counter top should remain near final standing desk height");
});

test("maps kitchen island imports to the table-desk archetype", () => {
  const panels = buildPanels({
    name: "kitchen_island",
    estimatedDims: { w: 1400, h: 900, d: 700 },
    panels: [
      { label: "Countertop", type: "horizontal", shape: "rounded_rect", position: [0, 0.45, 0], size: [1.4, 0.04, 0.7], materialId: "oak" },
      { label: "Left Side", type: "vertical", shape: "box", position: [0, 0.45, 0], size: [0.04, 0.86, 0.7], materialId: "oak" },
      { label: "Right Side", type: "vertical", shape: "box", position: [0, 0.45, 0], size: [0.04, 0.86, 0.7], materialId: "oak" },
      { label: "Front Panel", type: "vertical", shape: "box", position: [0, 0.45, 0], size: [1.32, 0.82, 0.03], materialId: "oak" },
      { label: "Back Panel", type: "back", shape: "box", position: [0, 0.45, 0], size: [1.32, 0.82, 0.02], materialId: "oak" },
    ],
  });

  const countertop = singleByLabel(panels, /countertop/i);
  const front = singleByLabel(panels, /front panel/i);
  const back = singleByLabel(panels, /back panel/i);

  assert.ok(countertop.position[1] > 0.75, "countertop should be placed near island height");
  assert.ok(front.position[2] > 0.15, "front panel should be placed on the front plane");
  assert.ok(back.position[2] < -0.15, "back panel should be placed on the rear plane");
});

test("corrects swapped width/depth on upholstered sofa back cushions", () => {
  const panels = buildPanels({
    name: "sectional sofa",
    estimatedDims: { w: 2200, h: 850, d: 950 },
    panels: [
      {
        label: "Back cushion",
        type: "vertical",
        shape: "box",
        position: [0, 0.55, -0.35],
        size: [0.12, 0.42, 0.62],
        materialId: "fabric_cream",
      },
    ],
  });

  const back = singleByLabel(panels, /back cushion/i);
  assert.ok(back.size[0] > back.size[2], "back should span along X (width) not Z");
  assert.ok(back.size[2] < 0.22, "back depth on Z should stay cushion-thin");
});

test("clears spurious ±90° Y rotation on correctly sized upholstered backs", () => {
  const panels = buildPanels({
    name: "sofa",
    estimatedDims: { w: 2000, h: 820, d: 900 },
    panels: [
      {
        label: "Back rest",
        type: "vertical",
        shape: "cushion_firm",
        position: [0, 0.5, -0.32],
        size: [0.65, 0.4, 0.12],
        rotation: [0, Math.PI / 2, 0],
        materialId: "fabric_gray",
      },
    ],
  });

  const back = singleByLabel(panels, /back rest/i);
  assert.ok(
    !back.rotation || back.rotation.every((r) => Math.abs(r) < 0.01),
    "near-axis 90° Y on a wide-thin back should be stripped",
  );
});

test("places desk legs at corners even when a center pedestal is present", () => {
  const panels = buildPanels({
    name: "executive desk",
    estimatedDims: { w: 1600, h: 750, d: 800 },
    panels: [
      { label: "Desktop", type: "horizontal", shape: "box", position: [0, 0.4, 0], size: [1.5, 0.035, 0.75], materialId: "oak" },
      { label: "Pedestal", type: "vertical", shape: "box", position: [0, 0.25, 0], size: [0.35, 0.6, 0.45], materialId: "oak" },
      { label: "Leg 1", type: "vertical", shape: "box", position: [0, 0.25, 0], size: [0.05, 0.65, 0.05], materialId: "oak" },
      { label: "Leg 2", type: "vertical", shape: "box", position: [0, 0.25, 0], size: [0.05, 0.65, 0.05], materialId: "oak" },
    ],
  });

  const legs = getByLabel(panels, /\bleg\b/i);
  assert.equal(legs.length, 2);
  assert.ok(new Set(legs.map((l) => Math.sign(l.position[0]))).size >= 2, "legs should sit on opposite left/right");
  assert.ok(legs.every((l) => Math.abs(l.position[1] - l.size[1] / 2) < 0.08), "legs should meet the floor");
});

test("classifies generic thin verticals on desks as legs for corner placement", () => {
  const panels = buildPanels({
    name: "writing desk",
    estimatedDims: { w: 1200, h: 730, d: 600 },
    panels: [
      { label: "Top surface", type: "horizontal", shape: "box", position: [0, 0.38, 0], size: [1.15, 0.03, 0.55], materialId: "oak" },
      { label: "Part A", type: "vertical", shape: "box", position: [0, 0.2, 0], size: [0.055, 0.66, 0.055], materialId: "oak" },
      { label: "Part B", type: "vertical", shape: "box", position: [0, 0.2, 0], size: [0.055, 0.66, 0.055], materialId: "oak" },
    ],
  });

  const partA = singleByLabel(panels, /^part a$/i);
  const partB = singleByLabel(panels, /^part b$/i);
  assert.ok(Math.abs(partA.position[0]) > 0.2 && Math.abs(partB.position[0]) > 0.2, "thin verticals should move to footprint corners");
  assert.ok(Math.sign(partA.position[0]) !== Math.sign(partB.position[0]), "supports should be on opposite sides");
});

test("maps storage rack imports to the shelving archetype", () => {
  const panels = buildPanels({
    name: "storage_rack",
    estimatedDims: { w: 1200, h: 2000, d: 500 },
    panels: [
      { label: "Left Side", type: "vertical", shape: "box", position: [0, 1, 0], size: [0.03, 2.0, 0.5], materialId: "steel" },
      { label: "Right Side", type: "vertical", shape: "box", position: [0, 1, 0], size: [0.03, 2.0, 0.5], materialId: "steel" },
      { label: "Shelf 1", type: "horizontal", shape: "box", position: [0, 1, 0], size: [1.14, 0.02, 0.46], materialId: "steel" },
      { label: "Shelf 2", type: "horizontal", shape: "box", position: [0, 1, 0], size: [1.14, 0.02, 0.46], materialId: "steel" },
      { label: "Shelf 3", type: "horizontal", shape: "box", position: [0, 1, 0], size: [1.14, 0.02, 0.46], materialId: "steel" },
      { label: "Shelf 4", type: "horizontal", shape: "box", position: [0, 1, 0], size: [1.14, 0.02, 0.46], materialId: "steel" },
    ],
  });

  const shelves = getByLabel(panels, /shelf/i).sort((a, b) => a.position[1] - b.position[1]);

  assert.equal(shelves.length, 4);
  assert.ok(shelves[3].position[1] - shelves[0].position[1] > 0.8, "rack shelves should be distributed across the full height");
});
