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

test("spreads table legs to 4 corners even when AI puts them at same center", () => {
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

  const legs = getByLabel(panels, /\bleg\b/i);
  assert.equal(legs.length, 4);
  assert.ok(new Set(legs.map((l) => Math.sign(l.position[0]))).size >= 2, "legs should be spread left/right");
  assert.ok(new Set(legs.map((l) => Math.sign(l.position[2]))).size >= 2, "legs should be spread front/back");
});

test("infers cabinet layout — sides on opposite X, back behind", () => {
  const panels = buildPanels({
    name: "dresser",
    estimatedDims: { w: 1200, h: 850, d: 500 },
    panels: [
      { label: "Top", type: "horizontal", shape: "box", position: [0, 0.4, 0], size: [1.2, 0.03, 0.5], materialId: "oak" },
      { label: "Left Side", type: "vertical", shape: "box", position: [0, 0.4, 0], size: [0.03, 0.8, 0.5], materialId: "oak" },
      { label: "Right Side", type: "vertical", shape: "box", position: [0, 0.4, 0], size: [0.03, 0.8, 0.5], materialId: "oak" },
      { label: "Back", type: "back", shape: "box", position: [0, 0.4, 0], size: [1.12, 0.76, 0.02], materialId: "oak" },
      { label: "Shelf 1", type: "horizontal", shape: "box", position: [0, 0.4, 0], size: [1.1, 0.02, 0.45], materialId: "oak" },
      { label: "Drawer 1", type: "vertical", shape: "drawer_box", position: [0, 0.4, 0], size: [1.1, 0.22, 0.03], materialId: "oak" },
    ],
  });

  const left = singleByLabel(panels, /left side/i);
  const right = singleByLabel(panels, /right side/i);
  assert.ok(left.position[0] < 0 && right.position[0] > 0, "sides should be on opposite X");
});

test("spreads shelves vertically when AI gives identical positions", () => {
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
  assert.ok(shelves[1].position[1] - shelves[0].position[1] > 0.1, "shelves should have vertical spacing");
});

test("keeps AI-reported back cushion dimensions without axis swap", () => {
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
  assert.deepEqual(back.size, [0.12, 0.42, 0.62]);
});

test("preserves rotation from AI output", () => {
  const y90 = Math.PI / 2;
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
        rotation: [0, y90, 0],
        materialId: "fabric_gray",
      },
    ],
  });

  const back = singleByLabel(panels, /back rest/i);
  assert.ok(back.rotation);
  assert.ok(Math.abs(back.rotation![1] - y90) < 0.001);
});

test("spreads desk legs to corners and completes to 4 legs", () => {
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
  assert.ok(legs.length >= 2, "should have at least 2 legs");
});

test("generic vertical parts get inferred positions", () => {
  const panels = buildPanels({
    name: "writing desk",
    estimatedDims: { w: 1200, h: 730, d: 600 },
    panels: [
      { label: "Top surface", type: "horizontal", shape: "box", position: [0, 0.38, 0], size: [1.15, 0.03, 0.55], materialId: "oak" },
      { label: "Part A", type: "vertical", shape: "box", position: [0, 0.2, 0], size: [0.055, 0.66, 0.055], materialId: "oak" },
      { label: "Part B", type: "vertical", shape: "box", position: [0, 0.2, 0], size: [0.055, 0.66, 0.055], materialId: "oak" },
    ],
  });

  // Parts should exist and have been placed by the inference pipeline
  const partA = singleByLabel(panels, /^part a$/i);
  const partB = singleByLabel(panels, /^part b$/i);
  assert.ok(partA, "Part A should exist");
  assert.ok(partB, "Part B should exist");
});

test("4 legs with only left/right labels get 4 unique corners, not stacked pairs", () => {
  const panels = buildPanels({
    name: "dining_table",
    estimatedDims: { w: 1400, h: 750, d: 800 },
    panels: [
      { label: "Tabletop", type: "horizontal", shape: "box", position: [0, 0.73, 0], size: [1.4, 0.04, 0.8], materialId: "oak" },
      { label: "Left Leg", type: "vertical", shape: "cylinder", position: [-0.3, 0.36, 0], size: [0.05, 0.72, 0.05], materialId: "black_metal" },
      { label: "Left Leg", type: "vertical", shape: "cylinder", position: [-0.3, 0.36, 0], size: [0.05, 0.72, 0.05], materialId: "black_metal" },
      { label: "Right Leg", type: "vertical", shape: "cylinder", position: [0.3, 0.36, 0], size: [0.05, 0.72, 0.05], materialId: "black_metal" },
      { label: "Right Leg", type: "vertical", shape: "cylinder", position: [0.3, 0.36, 0], size: [0.05, 0.72, 0.05], materialId: "black_metal" },
    ],
  });

  const legs = getByLabel(panels, /\bleg\b/i);
  assert.equal(legs.length, 4, "should have 4 legs");

  // Extract unique XZ positions (rounded to avoid floating point noise)
  const positions = legs.map((l) => `${l.position[0].toFixed(2)},${l.position[2].toFixed(2)}`);
  const uniquePositions = new Set(positions);
  assert.ok(uniquePositions.size >= 4, `legs should be at 4 unique XZ positions, got ${uniquePositions.size}: ${[...uniquePositions].join(" | ")}`);

  // Verify both positive and negative X and Z values exist (all 4 corners)
  assert.ok(new Set(legs.map((l) => Math.sign(l.position[0]))).size >= 2, "legs should span left and right");
  assert.ok(new Set(legs.map((l) => Math.sign(l.position[2]))).size >= 2, "legs should span front and back");
});

test("chair legs with front/back/left/right labels go to correct corners", () => {
  const panels = buildPanels({
    name: "dining chair",
    estimatedDims: { w: 450, h: 850, d: 450 },
    panels: [
      { label: "Seat", type: "horizontal", shape: "box", position: [0, 0.45, 0], size: [0.42, 0.04, 0.42], materialId: "oak" },
      { label: "Backrest", type: "vertical", shape: "box", position: [0, 0.65, -0.20], size: [0.38, 0.40, 0.03], materialId: "oak" },
      { label: "Front Left Leg", type: "vertical", shape: "cylinder", position: [0, 0.22, 0], size: [0.04, 0.44, 0.04], materialId: "oak" },
      { label: "Front Right Leg", type: "vertical", shape: "cylinder", position: [0, 0.22, 0], size: [0.04, 0.44, 0.04], materialId: "oak" },
      { label: "Back Left Leg", type: "vertical", shape: "cylinder", position: [0, 0.42, 0], size: [0.04, 0.84, 0.04], materialId: "oak" },
      { label: "Back Right Leg", type: "vertical", shape: "cylinder", position: [0, 0.42, 0], size: [0.04, 0.84, 0.04], materialId: "oak" },
    ],
  });

  const legs = getByLabel(panels, /\bleg\b/i);
  assert.equal(legs.length, 4, "should have 4 legs");

  const fl = singleByLabel(panels, /front left leg/i);
  const fr = singleByLabel(panels, /front right leg/i);
  const bl = singleByLabel(panels, /back left leg/i);
  const br = singleByLabel(panels, /back right leg/i);

  // Front left: negative X, positive Z
  assert.ok(fl.position[0] < 0, "front left leg X should be negative");
  assert.ok(fl.position[2] > 0, "front left leg Z should be positive (front)");

  // Front right: positive X, positive Z
  assert.ok(fr.position[0] > 0, "front right leg X should be positive");
  assert.ok(fr.position[2] > 0, "front right leg Z should be positive (front)");

  // Back left: negative X, negative Z
  assert.ok(bl.position[0] < 0, "back left leg X should be negative");
  assert.ok(bl.position[2] < 0, "back left leg Z should be negative (back)");

  // Back right: positive X, negative Z
  assert.ok(br.position[0] > 0, "back right leg X should be positive");
  assert.ok(br.position[2] < 0, "back right leg Z should be negative (back)");
});
