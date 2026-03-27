/**
 * Vision prompt for analyze-furniture — compact to reduce latency/timeouts.
 * Shape ids must match PanelShape in app (furnitureData.ts).
 */
export const FURNITURE_ANALYSIS_PROMPT = `You analyze furniture photos and output JSON only (no markdown).

COORDINATES (meters): Furniture centered X=0,Z=0. Y=0 = floor. position = CENTER of each part. size = [width,height,depth] outer extents.
type: "horizontal" (tops/shelves/seats), "vertical" (sides/legs/posts), "back" (thin rear panels).

SHAPES — exact ids only:
box, cylinder (size [d,h,d]), sphere (size [d,d,d]), cone, rounded_rect (shapeParams.cornerRadius), circle_panel, oval, triangle, trapezoid (shapeParams.topRatio), l_shape, u_shape (shapeParams.thickness), arc (shapeParams.arcAngle degrees; size [span,_,depth]), hexagon, half_sphere, torus (shapeParams.tubeRadius), pyramid, wedge, tube (shapeParams.thickness), tapered_leg, cabriole_leg, hairpin_leg, x_base, pedestal, square_leg, bun_foot, bracket_foot, plinth, bar_handle, knob, cup_pull, ring_pull, shaker_door, glass_insert_door, louvered_door, drawer_box, open_tray, crown_molding, base_molding, edge_trim, cross_brace, l_bracket, rail, rod, caster, cushion, mattress, books, vase, basket, picture_frame, lamp_shade, potted_plant

Optional per panel: shapeParams { cornerRadius, arcAngle, topRatio, tubeRadius, thickness, knobSign }; rotation [rx,ry,rz] radians; cornerRadius on box.

materialId from: oak, walnut, pine, cherry, maple, birch, teak, mahogany, ash, bamboo, ebony, mdf, plywood, melamine_white, melamine_black, melamine_gray, melamine_cream, laminate_walnut, laminate_oak, steel, brass, black_metal, chrome, gold, copper, bronze, paint_slate_blue, paint_olive_metal, rose_gold, marble_white, marble_black, granite, terrazzo, concrete, ceramic_white, leather_brown, leather_black, leather_tan, fabric_gray, fabric_cream, fabric_beige, fabric_ivory, fabric_taupe, fabric_charcoal, fabric_brown, fabric_blue, fabric_green, fabric_bamboo, cane_natural, fabric_plaid_blue, fabric_plaid_olive, velvet_navy, glass, frosted_glass, tinted_glass, mirror, acrylic_clear, acrylic_black

RULES: Leg bottom at Y≈0; dining top ~0.72-0.78m; seat cushion top ~0.45-0.48m; parts touch (no gaps); prefer 6-18 panels; valid JSON only.

{"name":"...","estimatedDims":{"w":1200,"h":750,"d":600},"panels":[{"label":"...","type":"horizontal","shape":"box","position":[0,0,0],"size":[0.5,0.05,0.4],"materialId":"oak"}]}
estimatedDims mm; panel positions/sizes meters.`;
