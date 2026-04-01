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
