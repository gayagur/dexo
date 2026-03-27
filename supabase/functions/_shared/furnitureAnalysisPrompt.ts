/**
 * Vision prompt for analyze-furniture — compact to reduce latency/timeouts.
 * Shape ids must match PanelShape in app (furnitureData.ts).
 */
export const FURNITURE_ANALYSIS_PROMPT = `You analyze furniture photos. Output one JSON object only — no markdown fences, no commentary. Top-level keys: name (string), estimatedDims { w, h, d in millimeters }, panels (array of parts).

COORDINATES (meters): Furniture centered X=0,Z=0. Y=0 = floor. position = CENTER of each part. size = [width,height,depth] outer extents.
type: "horizontal" (tops/shelves/seats), "vertical" (sides/legs/posts), "back" (thin rear panels).

DECOMPOSITION — most important:
- Do NOT merge unrelated masses into one box. Seat and backrest MUST be separate panels (different position, size, type). A single tall block for "seat+back" is WRONG.
- Chair with 4 legs: output FOUR leg panels (cylinder or square_leg), one seat (horizontal), one back (vertical or rotated), plus apron/stretchers if visible. Minimum ~6 panels for a typical chair; 3–4 panels is unacceptable unless it is a solid one-piece molded stool.
- Table: top + 4 legs + optional apron/rails.
- Round / pedestal table top: shape "cylinder" or "circle_panel", type "horizontal", rotation [0,0,0] only. size [diameter, thickness, diameter] meters (thickness smallest, ~0.02–0.05). Do NOT use rotation [π/2,0,0] on the top — that tips the disk vertical.
- Each physically separate part in the photo = its own panel with its own label (e.g. "Leg FL", "Seat", "Backrest", "Stretcher front").

SHAPES — exact ids only:
box, cylinder (size [d,h,d]), sphere (size [d,d,d]), cone, rounded_rect (shapeParams.cornerRadius), circle_panel, oval, triangle, trapezoid (shapeParams.topRatio), l_shape, u_shape (shapeParams.thickness), arc (shapeParams.arcAngle degrees; size [span,_,depth]), hexagon, half_sphere, torus (shapeParams.tubeRadius), pyramid, wedge, tube (shapeParams.thickness), tapered_leg, cabriole_leg, hairpin_leg, x_base, pedestal, square_leg, bun_foot, bracket_foot, plinth, bar_handle, knob, cup_pull, ring_pull, shaker_door, glass_insert_door, louvered_door, drawer_box, open_tray, crown_molding, base_molding, edge_trim, cross_brace, l_bracket, rail, rod, caster, cushion, mattress, books, vase, basket, picture_frame, lamp_shade, potted_plant

Optional per panel: shapeParams { cornerRadius, arcAngle, topRatio, tubeRadius, thickness, knobSign }; rotation [rx,ry,rz] as numeric radians only (e.g. 1.5708 for 90°) — never the π character or math expressions; cornerRadius on box.

materialId from: oak, walnut, pine, cherry, maple, birch, teak, mahogany, ash, bamboo, ebony, mdf, plywood, melamine_white, melamine_black, melamine_gray, melamine_cream, laminate_walnut, laminate_oak, steel, brass, black_metal, chrome, gold, copper, bronze, paint_slate_blue, paint_olive_metal, rose_gold, marble_white, marble_black, granite, terrazzo, concrete, ceramic_white, leather_brown, leather_black, leather_tan, fabric_gray, fabric_cream, fabric_beige, fabric_ivory, fabric_taupe, fabric_charcoal, fabric_brown, fabric_blue, fabric_green, fabric_bamboo, cane_natural, fabric_plaid_blue, fabric_plaid_olive, velvet_navy, glass, frosted_glass, tinted_glass, mirror, acrylic_clear, acrylic_black

RULES: Leg bottom at Y≈0; dining top ~0.72-0.78m; seat cushion top ~0.45-0.48m; parts touch (no gaps); target 8–20 panels for chairs/sofas/tables; valid JSON only.

CHAIRS (dining, office, accent, armchair): Seat is type "horizontal" (cushion or thin box/deck). Backrest is type "vertical" (cushion or panel), behind the seat, NOT the same mesh as the seat. Label "Seat", "Backrest", "Leg FL/FR/BL/BR". Pedestal chairs: seat + pedestal + base disc as separate panels.

UPHOLSTERED SEATING (sofa, sectional, loveseat, armchair, recliner): NEVER use plain "box" for visible foam or fabric cushions — use shape "cushion" with fabric_* or leather_* or velvet_*.

SOFA DECOMPOSITION — critical rules:
1. IDENTIFY SUBTYPE FIRST: Is it a 2-seater, 3-seater, L-sectional, chaise sofa, loveseat, or modular? This determines panel count and layout.
2. INDIVIDUAL SEAT CUSHIONS: Each seat cushion is a SEPARATE panel. A 3-seater has 3 seat cushions side by side, NOT one wide slab. Cushion width = sofa inner width / cushion count.
3. INDIVIDUAL BACK CUSHIONS: Each back cushion is SEPARATE. Match count to seat cushions. type "vertical", shape "cushion".
4. ARMS: Each arm is its own panel. Arms are type "vertical", shape "cushion" for padded arms or "rounded_rect" for hard arms. Arm height < total sofa height. Arm depth ≈ sofa depth.
5. PLINTH/BASE: The hidden base under cushions. Shape "plinth" or "rounded_rect" with shapeParams.cornerRadius ~0.02. Material: melamine_black or fabric matching the sofa. Height ~0.08-0.12m. This sits on the floor or on legs.
6. LEGS: If visible, 4-6 small cylinders or square_legs at corners. Height 0.04-0.12m. If hidden by a skirt/plinth, omit legs and let plinth touch floor.
7. DECORATIVE PILLOWS: Each throw pillow = separate "cushion" panel, type "vertical", smaller size (~0.35-0.50m). Position ON TOP of seat cushions (Y above seat top).
8. THROW BLANKET: If visible, one thin horizontal "cushion" draped on arm or seat. Very thin (h ~0.02-0.04m).

SOFA PROPORTIONS:
- Total height: 0.75-0.95m. Seat height (cushion top): 0.42-0.48m. Back cushion top: 0.70-0.90m.
- Seat cushion thickness: 0.10-0.18m. Back cushion thickness: 0.10-0.20m.
- Arm width: 0.08-0.20m. Arm height: 0.50-0.70m.
- Seat depth: 0.50-0.65m (front to back support).
- Plinth height: 0.06-0.12m.

L-SHAPED SECTIONAL RULES:
- Decompose into MAIN SECTION + CHAISE EXTENSION.
- Main section: seat cushions + back cushions + one arm.
- Chaise: longer depth, one seat cushion, one back cushion along the side (rotated), no arm on the open end.
- The plinth follows the L-shape footprint — use TWO plinth panels: one for main, one for chaise.
- Back cushions on chaise side: type "vertical", positioned along the outer edge.

Example 3-seater sofa (structure only): {"name":"3-Seater Sofa","estimatedDims":{"w":2200,"h":850,"d":900},"panels":[
{"label":"Plinth","type":"horizontal","shape":"plinth","position":[0,0.05,0],"size":[2.10,0.10,0.85],"materialId":"melamine_black"},
{"label":"Seat cushion L","type":"horizontal","shape":"cushion","position":[-0.62,0.38,0.04],"size":[0.60,0.14,0.58],"materialId":"fabric_beige"},
{"label":"Seat cushion C","type":"horizontal","shape":"cushion","position":[0,0.38,0.04],"size":[0.60,0.14,0.58],"materialId":"fabric_beige"},
{"label":"Seat cushion R","type":"horizontal","shape":"cushion","position":[0.62,0.38,0.04],"size":[0.60,0.14,0.58],"materialId":"fabric_beige"},
{"label":"Back cushion L","type":"vertical","shape":"cushion","position":[-0.62,0.64,-0.28],"size":[0.58,0.38,0.16],"materialId":"fabric_beige"},
{"label":"Back cushion C","type":"vertical","shape":"cushion","position":[0,0.64,-0.28],"size":[0.58,0.38,0.16],"materialId":"fabric_beige"},
{"label":"Back cushion R","type":"vertical","shape":"cushion","position":[0.62,0.64,-0.28],"size":[0.58,0.38,0.16],"materialId":"fabric_beige"},
{"label":"Left Arm","type":"vertical","shape":"cushion","position":[-1.01,0.34,0],"size":[0.16,0.56,0.85],"materialId":"fabric_beige"},
{"label":"Right Arm","type":"vertical","shape":"cushion","position":[1.01,0.34,0],"size":[0.16,0.56,0.85],"materialId":"fabric_beige"},
{"label":"Leg FL","type":"vertical","shape":"cylinder","position":[-0.98,0.03,0.36],"size":[0.04,0.06,0.04],"materialId":"black_metal"},
{"label":"Leg FR","type":"vertical","shape":"cylinder","position":[0.98,0.03,0.36],"size":[0.04,0.06,0.04],"materialId":"black_metal"},
{"label":"Leg BL","type":"vertical","shape":"cylinder","position":[-0.98,0.03,-0.36],"size":[0.04,0.06,0.04],"materialId":"black_metal"},
{"label":"Leg BR","type":"vertical","shape":"cylinder","position":[0.98,0.03,-0.36],"size":[0.04,0.06,0.04],"materialId":"black_metal"}]}

Example chair (structure only): {"name":"Dining Chair","estimatedDims":{"w":480,"h":900,"d":520},"panels":[
{"label":"Seat","type":"horizontal","shape":"cushion","position":[0,0.47,0.04],"size":[0.44,0.09,0.44],"materialId":"fabric_gray"},
{"label":"Backrest","type":"vertical","shape":"cushion","position":[0,0.74,-0.19],"size":[0.42,0.42,0.09],"materialId":"fabric_gray"},
{"label":"Leg FL","type":"vertical","shape":"cylinder","position":[-0.17,0.22,0.17],"size":[0.035,0.44,0.035],"materialId":"oak"},
{"label":"Leg FR","type":"vertical","shape":"cylinder","position":[0.17,0.22,0.17],"size":[0.035,0.44,0.035],"materialId":"oak"},
{"label":"Leg BL","type":"vertical","shape":"cylinder","position":[-0.17,0.22,-0.17],"size":[0.035,0.44,0.035],"materialId":"oak"},
{"label":"Leg BR","type":"vertical","shape":"cylinder","position":[0.17,0.22,-0.17],"size":[0.035,0.44,0.035],"materialId":"oak"}]}

estimatedDims mm; panel positions/sizes meters.`;
