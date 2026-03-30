/**
 * Vision prompt for analyze-furniture — exhaustive decomposition.
 * Shape ids must match PanelShape in app (furnitureData.ts).
 */
export const FURNITURE_ANALYSIS_PROMPT = `You are a furniture decomposition engine. Look at this furniture image VERY CAREFULLY. Break it down into EVERY visible component — do NOT simplify.

If you see 12 slats, return 12 slat panels. If you see handles on drawers, return each handle separately. If you see mesh/rattan texture, use the correct material. If you see curved edges, set cornerRadius. If parts are angled/tilted, set rotation values.

The goal is to reproduce this EXACT piece of furniture as closely as possible. More parts = better result. Minimum 10 components for simple furniture, 15+ for complex pieces.

IMPORTANT: If multiple furniture pieces are visible, analyze ONLY the main/largest one.

Output one JSON object only — no markdown fences, no commentary.

== OUTPUT FORMAT ==
{ "name": "string", "estimatedDims": { "w": mm, "h": mm, "d": mm }, "panels": [...] }

== COORDINATES — METERS ONLY (most common failure = using mm) ==
Furniture centered at X=0, Z=0. Y=0 = floor. position = CENTER of each part. size = [width, height, depth] in meters.
- WRONG: size [1800, 40, 900] or position [0, 450, 0]  (those are millimeters)
- RIGHT: size [1.8, 0.04, 0.9] or position [0, 0.45, 0]
- A 40mm-thick slat: size about [0.045, 0.02, 1.85] — never use hundreds for thin parts.
- Round leg diameter 50mm: cylinder size [0.05, 0.72, 0.05] not [50, 720, 50]

estimatedDims {w,h,d} are in MILLIMETERS for UI only. Panel position/size are ALWAYS meters.

type: "horizontal" (tops/shelves/seats), "vertical" (sides/legs/posts), "back" (thin rear panels).

== EDITOR 3D AXES — placement & rotation (read carefully) ==
- World: Y is UP, floor is Y=0. X = left/right, Z = depth (negative Z = toward back of typical product photo).
- Furniture group is centered near X=0,Z=0. Parts must TOUCH (no floating); align backs toward -Z, fronts toward +Z when the photo is a front 3/4 view.
- Box size is ALWAYS [width along X, height along Y, depth along Z] BEFORE rotation.
- type "horizontal" = board lying flat in the XZ plane (tabletop, shelf board, slat). Its VERTICAL thickness is size[1] (the middle number) and MUST be thin: real wood shelves/slats/aprons use ~0.016–0.045m (16–45mm). NEVER use 0.12–0.40m for a flat shelf — that is a common mistake (looks like a fat block).
- type "vertical" = panel standing on the floor, tall along Y. Side panels: thin thickness along X OR Z only (~0.018–0.05m for sheet goods), height = size[1].
- type "back" = thin panel across the back; smallest size component is depth (often Z), typically 0.012–0.028m.
- rotation [rx,ry,rz] is radians around local X then Y then Z. Default [0,0,0] for almost all parts. Use SMALL tilts only when the photo clearly shows lean (e.g. back cushion rx ≈ -0.12 to -0.22). Do NOT apply huge rotations to compensate for wrong sizes — fix size axes instead.
- Legs/cylinders: vertical, rotation [0,0,0] unless clearly splayed in the image.

== SHAPES (use the best match for what you SEE) ==
BASIC: box, cylinder (size [d,h,d]), sphere, cone (tapered legs!), rounded_rect (shapeParams.cornerRadius — USE THIS for panels with visible rounded edges)
PANELS: circle_panel, oval, triangle, trapezoid (shapeParams.topRatio), arc (shapeParams.arcAngle — for arched tops), hexagon
SOLIDS: half_sphere, torus (shapeParams.tubeRadius — ring handles!), pyramid, wedge (angled/sloped parts!), tube (shapeParams.thickness — hollow pipes, metal frames!)
LEGS: tapered_leg (mid-century!), cabriole_leg, hairpin_leg, x_base, pedestal, square_leg, bun_foot, bracket_foot, plinth
UPHOLSTERY: cushion (puffy/pillow-like), cushion_firm (structured seats), padded_block (boxy padded arms), cushion_bolster (cylindrical rolls), mattress
HARDWARE: bar_handle, knob, cup_pull, ring_pull, caster
DOORS: shaker_door, glass_insert_door, louvered_door, drawer_box, open_tray
TRIM: crown_molding, base_molding, edge_trim, cross_brace, l_bracket, l_shape, u_shape
STRUCTURE: rail (thin connecting rod), rod (round bar)

Optional per panel: shapeParams { cornerRadius (0-0.05m for rounded edges), arcAngle, topRatio, tubeRadius, thickness }; rotation [rx,ry,rz] radians (e.g. -0.17 = ~10° tilt back); cornerRadius on box panels.

== MATERIALS — detect from the IMAGE per part ==
Wood: oak, walnut, pine, cherry, maple, birch, teak, mahogany, ash, bamboo, ebony
Engineered: mdf, plywood, melamine_white, melamine_black, melamine_gray, melamine_cream, laminate_walnut, laminate_oak
Metal: steel, brass, black_metal, chrome, gold, copper, bronze, rose_gold
Stone: marble_white, marble_black, granite, terrazzo, concrete, ceramic_white
Fabric: leather_brown, leather_black, leather_tan, fabric_gray, fabric_cream, fabric_beige, fabric_ivory, fabric_taupe, fabric_charcoal, fabric_brown, fabric_blue, fabric_green, fabric_sage, fabric_mustard, fabric_blush, fabric_terracotta
Woven: cane_natural (rattan/wicker/mesh panels), fabric_bamboo
Accent: velvet_navy, fabric_plaid_blue, fabric_plaid_olive
Glass: glass, frosted_glass, tinted_glass, mirror, acrylic_clear, acrylic_black

EACH PART gets its OWN material based on what you see. Headboard=oak, legs=black_metal, cushion=fabric_cream — detect from image!

== CRITICAL RULES ==

1. COUNT EVERYTHING: If you see 4 legs, output 4 legs. 3 drawers = 3 drawer_box panels + 3 handles. 10 slats = 10 thin horizontal boxes. Do NOT merge repeated parts into one.

2. DETECT SHAPES: Round legs = cylinder or tapered_leg. Square legs = square_leg or box. Arched headboard = arc shape. Mesh/rattan panel = thin box with cane_natural. Metal tube frame = tube shape. Ring handle = torus. Tapered leg = cone or tapered_leg.

3. DETECT SOFTNESS: Puffy loose cushions = "cushion". Firm structured seats = "cushion_firm". Boxy padded arms = "padded_block". Hard surfaces = "box" or "rounded_rect".

4. DETECT CURVES: If edges look rounded in the image, use rounded_rect with shapeParams.cornerRadius (0.01-0.05m). Sharp edges = plain box.

5. DETECT ANGLES: Back cushions leaning = rotation [-0.10 to -0.25, 0, 0]. Chair back angled = rotation on x-axis. Splayed legs = rotation on x and z.

6. SEPARATE LAYERS: If a seat has a frame + cushion on top, output BOTH as separate panels. If a headboard has an outer frame + inner panel, output BOTH.

7. MATERIALS PER PART: Don't use one material for everything. Look at each part — wood frame gets wood, metal legs get metal, fabric cushion gets fabric, rattan panel gets cane_natural.

== SOFA POSITIONING ==
- Include a rigid back: at least one vertical "box" or "rounded_rect" frame/rail behind seat cushions (wood or same fabric as sides) connecting seat level to back cushions — do NOT leave back cushions floating with no support structure.
- Base/plinth: Y ~0.04m. Full width/depth.
- Seat cushions: horizontal, Y ~0.30-0.38m. Spread evenly on X axis between arms.
- Back cushions: vertical, Y ~0.55-0.70m. SAME X as matching seat cushion. Z just behind that frame. Tilted: rotation [-0.15, 0, 0].
- Arms: vertical at left/right edges. Full depth; use padded_block or rounded_rect with cornerRadius for soft arms.
- Throw pillows: small cushions ON TOP of seats, tilted casually.

== BED RULES ==
- Headboard: vertical at back. If arched, use "arc" shape.
- Side rails: horizontal "box" panels (NOT cross_brace!). ~0.10-0.15m height.
- EVERY SLAT: output each slat as a separate thin horizontal box. If you see 12 slats, output 12 panels.
- Mattress: horizontal "mattress" shape on top.
- Footboard: shorter vertical panel at front.

== CHAIR RULES ==
- Wood frame chairs: output EACH rail as separate cylinder (seat rails, stretchers, back frame).
- Office chairs: seat + backrest + headrest + arm supports + arm pads + gas lift + star base + 5 casters = 12+ parts.
- Detect if seat is padded (cushion) or hard wood (rounded_rect with wood material).

== TABLE RULES ==
- Coffee / side table: total height usually 0.35–0.52m. If you output estimatedDims, height must match — not dining-table or bed scale.
- Top: box/rounded_rect/circle_panel with appropriate material.
- EACH leg separate. Round legs in photo = shape "cylinder" (NOT box). Square legs = square_leg or box.
- Apron rails under top if visible: thin horizontal boxes between legs.
- Drawers: drawer_box + handle for each.

== CABINET/DRESSER RULES ==
- Body shell: left side + right side + top + bottom + back = 5 panels minimum.
- EACH shelf as separate horizontal box.
- EACH drawer front as drawer_box + EACH handle as knob/bar_handle/cup_pull.
- EACH door as shaker_door/glass_insert_door + handle.
- Legs or plinth at bottom.

== BOOKCASE / OPEN SHELVING / RACK (critical) ==
- Do NOT use one tall vertical "box" that pierces through every shelf in the middle unless the photo clearly shows a solid fixed partition there. Most bookcases: two SIDE vertical panels (left/right), optional thin BACK panel at the REAR (max Z), and shelves as separate thin horizontals only.
- Shelves need READABLE vertical spacing: at least ~0.22–0.35m between shelf centers for book storage (match the photo if visible). Never stack 5+ shelves in the height of a single book — that is wrong scale.
- A central upright that only holds shelf ends should STOP between shelf tiers OR be drawn as narrow posts at the front corners — not a full-height slab through all shelves (causes clipping/Z-fighting in 3D).
- Use shape "rounded_rect" + small cornerRadius on shelf fronts and verticals when edges look soft in the photo.

== BED — SLAT COUNT ==
- Count slats in the image. Queen/full frames usually show many narrow slats (often 10–16+). If you only output ~5 thin slats for a wide bed, the model is probably wrong unless the photo clearly shows ~5.

estimatedDims in mm; panel positions/sizes in meters. Output valid JSON only.`;
