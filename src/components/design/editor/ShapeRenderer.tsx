import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { PanelShape } from "@/lib/furnitureData";

// ─── Types ─────────────────────────────────────────────

interface ShapeRendererProps {
  shape: PanelShape;
  size: [number, number, number];
  shapeParams?: Record<string, number>;
  color: string;
  roughness: number;
  metalness: number;
  transparent: boolean;
  opacity: number;
  isOutline?: boolean;
}

// ─── Composite shape check ──────────────────────────────

const COMPOSITE_SHAPES: Set<PanelShape> = new Set([
  "hairpin_leg", "x_base", "shaker_door", "glass_insert_door", "louvered_door",
  "drawer_box", "open_tray", "cross_brace", "l_bracket", "books",
  "picture_frame", "basket", "bracket_foot",
]);

export function isCompositeShape(shape: PanelShape): boolean {
  return COMPOSITE_SHAPES.has(shape);
}

// ─── Main renderer ──────────────────────────────────────

export function ShapeRenderer({
  shape, size, shapeParams, color, roughness, metalness, transparent, opacity, isOutline,
}: ShapeRendererProps) {
  const matProps = {
    color: isOutline ? "#C87D5A" : color,
    roughness, metalness, transparent, opacity,
    wireframe: isOutline,
  };

  if (isCompositeShape(shape)) {
    return (
      <CompositeShapeRenderer
        shape={shape} size={size} shapeParams={shapeParams}
        matProps={matProps} isOutline={isOutline}
      />
    );
  }

  return (
    <mesh castShadow receiveShadow>
      <SingleGeometry shape={shape} size={size} shapeParams={shapeParams} isOutline={isOutline} />
      <meshStandardMaterial {...matProps} />
    </mesh>
  );
}

// ─── Single geometry component (can use hooks) ──────────

function SingleGeometry({
  shape, size, shapeParams, isOutline,
}: {
  shape: PanelShape;
  size: [number, number, number];
  shapeParams?: Record<string, number>;
  isOutline?: boolean;
}) {
  const [w, h, d] = size;
  const pad = isOutline ? 0.003 : 0;
  const radius = w / 2;

  switch (shape) {
    // ── Basic shapes ─────────────────────────────────
    case "box":
      return <boxGeometry args={[w + pad * 2, h + pad * 2, d + pad * 2]} />;

    case "cylinder":
      return <cylinderGeometry args={[radius + pad, radius + pad, h + pad * 2, 24]} />;

    case "sphere":
      return <sphereGeometry args={[radius + pad, 24, 24]} />;

    case "cone":
      return <coneGeometry args={[radius + pad, h + pad * 2, 24]} />;

    // ── 3D Solids ────────────────────────────────────
    case "half_sphere":
      return <sphereGeometry args={[radius + pad, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />;

    case "torus": {
      const tubeR = (shapeParams?.tubeRadius ?? 0.3) * radius;
      return <torusGeometry args={[radius - tubeR + pad, tubeR + pad, 16, 32]} />;
    }

    case "pyramid":
      return <coneGeometry args={[radius + pad, h + pad * 2, 4]} />;

    case "tube": {
      const thickness = shapeParams?.thickness ?? 0.1;
      const outerR = radius + pad;
      const innerR = Math.max(0.002, outerR - thickness * radius);
      return <TubeGeometry outerR={outerR} innerR={innerR} height={h + pad * 2} />;
    }

    case "wedge":
      return <WedgeGeometry w={w + pad * 2} h={h + pad * 2} d={d + pad * 2} />;

    // ── Panel shapes (extruded 2D) ───────────────────
    case "rounded_rect": {
      const cr = shapeParams?.cornerRadius ?? 0.01;
      return <RoundedRectGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} cornerRadius={cr} />;
    }

    case "circle_panel":
      return <cylinderGeometry args={[radius + pad, radius + pad, d + pad * 2, 32]} />;

    case "oval":
      return <OvalGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} />;

    case "triangle":
      return <TriangleGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} />;

    case "trapezoid":
      return <TrapezoidGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} topRatio={shapeParams?.topRatio ?? 0.6} />;

    case "l_shape":
      return <LShapeGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} thickness={shapeParams?.thickness ?? 0.3} />;

    case "u_shape":
      return <UShapeGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} thickness={shapeParams?.thickness ?? 0.25} />;

    case "arc": {
      const angle = shapeParams?.arcAngle ?? 90;
      return <ArcGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} angle={angle} />;
    }

    case "hexagon":
      return <cylinderGeometry args={[radius + pad, radius + pad, d + pad * 2, 6]} />;

    // ── Legs & feet ──────────────────────────────────
    case "tapered_leg": {
      const topR = (radius + pad) * (shapeParams?.topRatio ?? 0.6);
      return <cylinderGeometry args={[topR, radius + pad, h + pad * 2, 12]} />;
    }

    case "cabriole_leg":
      return <CabrioleLegGeometry radius={radius + pad} height={h + pad * 2} />;

    case "square_leg":
      return <boxGeometry args={[w + pad * 2, h + pad * 2, d + pad * 2]} />;

    case "pedestal":
      return <cylinderGeometry args={[radius + pad, radius * 1.3 + pad, h + pad * 2, 24]} />;

    case "bun_foot":
      return <BunFootGeometry radius={radius + pad} height={h + pad * 2} />;

    case "plinth":
      return <boxGeometry args={[w + pad * 2, h + pad * 2, d + pad * 2]} />;

    // ── Handles ──────────────────────────────────────
    case "bar_handle":
      return <cylinderGeometry args={[w / 6 + pad, w / 6 + pad, h + pad * 2, 8]} />;

    case "knob":
      return <sphereGeometry args={[radius + pad, 16, 16]} />;

    case "cup_pull":
      return <CupPullGeometry w={w + pad * 2} h={h + pad * 2} d={d + pad * 2} />;

    case "ring_pull":
      return <torusGeometry args={[radius * 0.7 + pad, radius * 0.15 + pad, 8, 24]} />;

    // ── Molding & trim ───────────────────────────────
    case "crown_molding":
      return <CrownMoldingGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} />;

    case "base_molding":
      return <BaseMoldingGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} />;

    case "edge_trim":
      return <boxGeometry args={[w + pad * 2, h + pad * 2, d + pad * 2]} />;

    // ── Structural ───────────────────────────────────
    case "rail":
    case "rod":
      return <cylinderGeometry args={[w / 4 + pad, w / 4 + pad, h + pad * 2, 12]} />;

    case "caster":
      return <CasterGeometry radius={radius + pad} />;

    // ── Decorative ───────────────────────────────────
    case "cushion":
      return <RoundedRectGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} cornerRadius={Math.min(w, h, d) * 0.3} />;

    case "mattress":
      return <RoundedRectGeometry w={w + pad * 2} h={h + pad * 2} depth={d + pad * 2} cornerRadius={0.02} />;

    case "vase":
      return <VaseGeometry radius={radius + pad} height={h + pad * 2} />;

    case "lamp_shade": {
      const topR = radius * (shapeParams?.topRatio ?? 0.5) + pad;
      return <cylinderGeometry args={[topR, radius + pad, h + pad * 2, 24, 1, true]} />;
    }

    default:
      return <boxGeometry args={[w + pad * 2, h + pad * 2, d + pad * 2]} />;
  }
}

// ─── Composite shape renderer ───────────────────────────

function CompositeShapeRenderer({
  shape, size, shapeParams, matProps, isOutline,
}: {
  shape: PanelShape;
  size: [number, number, number];
  shapeParams?: Record<string, number>;
  matProps: any;
  isOutline?: boolean;
}) {
  const [w, h, d] = size;

  switch (shape) {
    case "hairpin_leg":
      return <HairpinLeg w={w} h={h} d={d} matProps={matProps} />;
    case "x_base":
      return <XBase w={w} h={h} d={d} matProps={matProps} />;
    case "shaker_door":
      return <ShakerDoor w={w} h={h} d={d} matProps={matProps} />;
    case "glass_insert_door":
      return <GlassInsertDoor w={w} h={h} d={d} matProps={matProps} />;
    case "louvered_door":
      return <LouveredDoor w={w} h={h} d={d} matProps={matProps} />;
    case "drawer_box":
      return <DrawerBox w={w} h={h} d={d} matProps={matProps} />;
    case "open_tray":
      return <OpenTray w={w} h={h} d={d} matProps={matProps} />;
    case "cross_brace":
      return <CrossBrace w={w} h={h} d={d} matProps={matProps} />;
    case "l_bracket":
      return <LBracket w={w} h={h} d={d} matProps={matProps} />;
    case "books":
      return <Books w={w} h={h} d={d} matProps={matProps} />;
    case "picture_frame":
      return <PictureFrame w={w} h={h} d={d} matProps={matProps} />;
    case "basket":
      return <Basket w={w} h={h} d={d} matProps={matProps} />;
    case "bracket_foot":
      return <BracketFoot w={w} h={h} d={d} matProps={matProps} />;
    default:
      return (
        <mesh>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      );
  }
}

// ════════════════════════════════════════════════════════
// CUSTOM GEOMETRY COMPONENTS (using useMemo for THREE.Shape)
// ════════════════════════════════════════════════════════

// ─── Rounded Rectangle (ExtrudeGeometry) ────────────────

function RoundedRectGeometry({ w, h, depth, cornerRadius }: { w: number; h: number; depth: number; cornerRadius: number }) {
  const geo = useMemo(() => {
    const r = Math.min(cornerRadius, w / 2, h / 2);
    const shape = new THREE.Shape();
    const hw = w / 2, hh = h / 2;
    shape.moveTo(-hw + r, -hh);
    shape.lineTo(hw - r, -hh);
    shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
    shape.lineTo(hw, hh - r);
    shape.quadraticCurveTo(hw, hh, hw - r, hh);
    shape.lineTo(-hw + r, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
    shape.lineTo(-hw, -hh + r);
    shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }, [w, h, depth, cornerRadius]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Oval (ExtrudeGeometry) ─────────────────────────────

function OvalGeometry({ w, h, depth }: { w: number; h: number; depth: number }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    const hw = w / 2, hh = h / 2;
    shape.absellipse(0, 0, hw, hh, 0, Math.PI * 2, false, 0);
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }, [w, h, depth]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Triangle (ExtrudeGeometry) ─────────────────────────

function TriangleGeometry({ w, h, depth }: { w: number; h: number; depth: number }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(0, h / 2);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }, [w, h, depth]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Trapezoid (ExtrudeGeometry) ────────────────────────

function TrapezoidGeometry({ w, h, depth, topRatio }: { w: number; h: number; depth: number; topRatio: number }) {
  const geo = useMemo(() => {
    const topW = w * topRatio;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(topW / 2, h / 2);
    shape.lineTo(-topW / 2, h / 2);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }, [w, h, depth, topRatio]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── L-Shape (ExtrudeGeometry) ──────────────────────────

function LShapeGeometry({ w, h, depth, thickness }: { w: number; h: number; depth: number; thickness: number }) {
  const geo = useMemo(() => {
    const t = w * thickness;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2 + t);
    shape.lineTo(-w / 2 + t, -h / 2 + t);
    shape.lineTo(-w / 2 + t, h / 2);
    shape.lineTo(-w / 2, h / 2);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }, [w, h, depth, thickness]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── U-Shape (ExtrudeGeometry) ──────────────────────────

function UShapeGeometry({ w, h, depth, thickness }: { w: number; h: number; depth: number; thickness: number }) {
  const geo = useMemo(() => {
    const t = w * thickness;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(w / 2, h / 2);
    shape.lineTo(w / 2 - t, h / 2);
    shape.lineTo(w / 2 - t, -h / 2 + t);
    shape.lineTo(-w / 2 + t, -h / 2 + t);
    shape.lineTo(-w / 2 + t, h / 2);
    shape.lineTo(-w / 2, h / 2);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }, [w, h, depth, thickness]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Arc (ExtrudeGeometry) ──────────────────────────────

function ArcGeometry({ w, h, depth, angle }: { w: number; h: number; depth: number; angle: number }) {
  const geo = useMemo(() => {
    const r = w / 2;
    const innerR = r * 0.7;
    const rad = (angle / 180) * Math.PI;
    const shape = new THREE.Shape();
    // Outer arc
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * rad - rad / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    // Inner arc (reverse)
    for (let i = steps; i >= 0; i--) {
      const a = (i / steps) * rad - rad / 2;
      shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
  }, [w, depth, angle]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Wedge (ExtrudeGeometry) ────────────────────────────

function WedgeGeometry({ w, h, d }: { w: number; h: number; d: number }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(w / 2, h / 2);
    shape.lineTo(-w / 2, -h / 2);
    return new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  }, [w, h, d]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Tube (hollow cylinder via LatheGeometry) ────────────

function TubeGeometry({ outerR, innerR, height }: { outerR: number; innerR: number; height: number }) {
  const geo = useMemo(() => {
    const hh = height / 2;
    const points = [
      new THREE.Vector2(innerR, -hh),
      new THREE.Vector2(outerR, -hh),
      new THREE.Vector2(outerR, hh),
      new THREE.Vector2(innerR, hh),
    ];
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
    shape.closePath();
    return new THREE.LatheGeometry(
      [new THREE.Vector2(innerR, -hh), new THREE.Vector2(outerR, -hh),
       new THREE.Vector2(outerR, hh), new THREE.Vector2(innerR, hh)],
      32
    );
  }, [outerR, innerR, height]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Cabriole Leg (LatheGeometry with curved profile) ────

function CabrioleLegGeometry({ radius, height }: { radius: number; height: number }) {
  const geo = useMemo(() => {
    const r = radius;
    const h = height;
    const points: THREE.Vector2[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = -h / 2 + t * h;
      // S-curve profile: wide at top, narrow middle, wider foot
      const profile = r * (0.4 + 0.6 * (Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.3 + 0.7));
      points.push(new THREE.Vector2(profile, y));
    }
    return new THREE.LatheGeometry(points, 12);
  }, [radius, height]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Bun Foot (LatheGeometry) ────────────────────────────

function BunFootGeometry({ radius, height }: { radius: number; height: number }) {
  const geo = useMemo(() => {
    const r = radius;
    const h = height;
    const points: THREE.Vector2[] = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = -h / 2 + t * h;
      // Bun shape: narrow at top, bulges out, then flat bottom
      const profile = r * (0.3 + 0.7 * Math.sin(t * Math.PI * 0.9));
      points.push(new THREE.Vector2(Math.max(0.001, profile), y));
    }
    return new THREE.LatheGeometry(points, 16);
  }, [radius, height]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Cup Pull Handle ────────────────────────────────────

function CupPullGeometry({ w, h, d }: { w: number; h: number; d: number }) {
  const geo = useMemo(() => {
    // Half-torus shape
    const r = w / 2;
    const tubeR = Math.min(w, h) * 0.12;
    const points: THREE.Vector2[] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI;
      points.push(new THREE.Vector2(r - tubeR + Math.cos(a) * tubeR, Math.sin(a) * tubeR));
    }
    return new THREE.LatheGeometry(points, 16, 0, Math.PI);
  }, [w, h]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Vase (LatheGeometry) ────────────────────────────────

function VaseGeometry({ radius, height }: { radius: number; height: number }) {
  const geo = useMemo(() => {
    const r = radius;
    const h = height;
    const points: THREE.Vector2[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = -h / 2 + t * h;
      // Vase profile: wide bottom, narrow neck, flared top
      let profile: number;
      if (t < 0.4) {
        profile = r * (0.6 + 0.4 * Math.sin(t / 0.4 * Math.PI / 2));
      } else if (t < 0.7) {
        const nt = (t - 0.4) / 0.3;
        profile = r * (1.0 - 0.6 * nt);
      } else {
        const nt = (t - 0.7) / 0.3;
        profile = r * (0.4 + 0.3 * nt);
      }
      points.push(new THREE.Vector2(Math.max(0.001, profile), y));
    }
    return new THREE.LatheGeometry(points, 16);
  }, [radius, height]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Caster / Wheel ──────────────────────────────────────

function CasterGeometry({ radius }: { radius: number }) {
  const geo = useMemo(() => {
    // Wheel as a torus rotated
    return new THREE.TorusGeometry(radius * 0.6, radius * 0.35, 12, 24);
  }, [radius]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Crown Molding (ExtrudeGeometry) ─────────────────────

function CrownMoldingGeometry({ w, h, depth }: { w: number; h: number; depth: number }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(h, 0);
    shape.quadraticCurveTo(h * 0.8, h * 0.5, 0, h);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  }, [w, h]);

  return <primitive object={geo} attach="geometry" />;
}

// ─── Base Molding (ExtrudeGeometry) ──────────────────────

function BaseMoldingGeometry({ w, h, depth }: { w: number; h: number; depth: number }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(depth, 0);
    shape.lineTo(depth, h * 0.3);
    shape.quadraticCurveTo(depth * 0.5, h, 0, h);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  }, [w, h, depth]);

  return <primitive object={geo} attach="geometry" />;
}

// ════════════════════════════════════════════════════════
// COMPOSITE SHAPES (groups of meshes)
// ════════════════════════════════════════════════════════

interface CompProps {
  w: number; h: number; d: number;
  matProps: any;
}

// ─── Hairpin Leg ─────────────────────────────────────────

function HairpinLeg({ w, h, d, matProps }: CompProps) {
  const rodR = w * 0.08;
  const spread = w * 0.35;
  return (
    <group>
      {/* Two bent rods forming a V */}
      <mesh position={[-spread / 2, 0, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[rodR, rodR, h, 8]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[spread / 2, 0, 0]} rotation={[0, 0, -0.08]}>
        <cylinderGeometry args={[rodR, rodR, h, 8]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Top connector bar */}
      <mesh position={[0, h / 2 - rodR, 0]}>
        <boxGeometry args={[spread + rodR * 2, rodR * 2, rodR * 2]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}

// ─── X-Base ──────────────────────────────────────────────

function XBase({ w, h, d, matProps }: CompProps) {
  const barW = w * 0.08;
  const diag = Math.sqrt(w * w + d * d);
  const angle = Math.atan2(d, w);
  return (
    <group>
      <mesh rotation={[0, angle, 0]}>
        <boxGeometry args={[diag, h, barW]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh rotation={[0, -angle, 0]}>
        <boxGeometry args={[diag, h, barW]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}

// ─── Shaker Door (frame + recessed panel) ────────────────

function ShakerDoor({ w, h, d, matProps }: CompProps) {
  const frameW = Math.min(w * 0.12, 0.04);
  const panelD = d * 0.4;
  return (
    <group>
      {/* Frame — 4 bars */}
      <mesh position={[0, h / 2 - frameW / 2, 0]}>
        <boxGeometry args={[w, frameW, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, -h / 2 + frameW / 2, 0]}>
        <boxGeometry args={[w, frameW, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[-w / 2 + frameW / 2, 0, 0]}>
        <boxGeometry args={[frameW, h - frameW * 2, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[w / 2 - frameW / 2, 0, 0]}>
        <boxGeometry args={[frameW, h - frameW * 2, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Center panel (recessed) */}
      <mesh position={[0, 0, d * 0.15]}>
        <boxGeometry args={[w - frameW * 2 - 0.004, h - frameW * 2 - 0.004, panelD]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}

// ─── Glass Insert Door ──────────────────────────────────

function GlassInsertDoor({ w, h, d, matProps }: CompProps) {
  const frameW = Math.min(w * 0.12, 0.04);
  return (
    <group>
      {/* Frame */}
      <mesh position={[0, h / 2 - frameW / 2, 0]}>
        <boxGeometry args={[w, frameW, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, -h / 2 + frameW / 2, 0]}>
        <boxGeometry args={[w, frameW, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[-w / 2 + frameW / 2, 0, 0]}>
        <boxGeometry args={[frameW, h - frameW * 2, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[w / 2 - frameW / 2, 0, 0]}>
        <boxGeometry args={[frameW, h - frameW * 2, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Glass panel */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w - frameW * 2 - 0.004, h - frameW * 2 - 0.004, 0.004]} />
        <meshStandardMaterial color="#d4e8f0" transparent opacity={0.3} roughness={0.05} metalness={0.1} />
      </mesh>
    </group>
  );
}

// ─── Louvered Door (frame + horizontal slats) ────────────

function LouveredDoor({ w, h, d, matProps }: CompProps) {
  const frameW = Math.min(w * 0.1, 0.035);
  const innerH = h - frameW * 2;
  const slatCount = Math.max(3, Math.floor(innerH / 0.03));
  const slatGap = innerH / slatCount;
  const slatH = slatGap * 0.6;

  return (
    <group>
      {/* Frame */}
      <mesh position={[-w / 2 + frameW / 2, 0, 0]}>
        <boxGeometry args={[frameW, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[w / 2 - frameW / 2, 0, 0]}>
        <boxGeometry args={[frameW, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, h / 2 - frameW / 2, 0]}>
        <boxGeometry args={[w - frameW * 2, frameW, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, -h / 2 + frameW / 2, 0]}>
        <boxGeometry args={[w - frameW * 2, frameW, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Slats */}
      {Array.from({ length: slatCount }).map((_, i) => {
        const y = -innerH / 2 + slatGap * (i + 0.5);
        return (
          <mesh key={i} position={[0, y, 0]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[w - frameW * 2 - 0.004, slatH, d * 0.5]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Drawer Box (5-sided open box) ───────────────────────

function DrawerBox({ w, h, d, matProps }: CompProps) {
  const t = Math.min(0.012, w * 0.04);
  return (
    <group>
      {/* Bottom */}
      <mesh position={[0, -h / 2 + t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Left */}
      <mesh position={[-w / 2 + t / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Right */}
      <mesh position={[w / 2 - t / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0, d / 2 - t / 2]}>
        <boxGeometry args={[w - t * 2, h, t]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Front */}
      <mesh position={[0, 0, -d / 2 + t / 2]}>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}

// ─── Open Tray ───────────────────────────────────────────

function OpenTray({ w, h, d, matProps }: CompProps) {
  const t = Math.min(0.008, w * 0.03);
  return (
    <group>
      {/* Bottom */}
      <mesh position={[0, -h / 2 + t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* 4 low sides */}
      <mesh position={[-w / 2 + t / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[w / 2 - t / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, 0, -d / 2 + t / 2]}>
        <boxGeometry args={[w - t * 2, h, t]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, 0, d / 2 - t / 2]}>
        <boxGeometry args={[w - t * 2, h, t]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}

// ─── Cross Brace (X shape) ──────────────────────────────

function CrossBrace({ w, h, d, matProps }: CompProps) {
  const barT = Math.min(w * 0.06, 0.02);
  const diagLen = Math.sqrt(w * w + h * h);
  const angle = Math.atan2(h, w);
  return (
    <group>
      <mesh rotation={[0, 0, angle]}>
        <boxGeometry args={[diagLen, barT, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh rotation={[0, 0, -angle]}>
        <boxGeometry args={[diagLen, barT, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}

// ─── L-Bracket ──────────────────────────────────────────

function LBracket({ w, h, d, matProps }: CompProps) {
  const t = Math.min(w * 0.15, 0.008);
  return (
    <group>
      {/* Vertical arm */}
      <mesh position={[0, h / 4, 0]}>
        <boxGeometry args={[w, h / 2, t]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Horizontal arm */}
      <mesh position={[0, 0, d / 4]}>
        <boxGeometry args={[w, t, d / 2]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}

// ─── Books (stack of thin boxes) ─────────────────────────

function Books({ w, h, d, matProps }: CompProps) {
  const bookColors = ["#8B4513", "#2F4F4F", "#8B0000", "#191970", "#556B2F", "#4A0E4E"];
  const count = Math.max(3, Math.min(8, Math.round(w / 0.025)));
  const bookW = (w / count) * 0.9;
  const gap = w / count;

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const x = -w / 2 + gap * (i + 0.5);
        const bookH = h * (0.7 + Math.random() * 0.3);
        const color = bookColors[i % bookColors.length];
        return (
          <mesh key={i} position={[x, (bookH - h) / 2, 0]}>
            <boxGeometry args={[bookW, bookH, d * 0.95]} />
            <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Picture Frame ──────────────────────────────────────

function PictureFrame({ w, h, d, matProps }: CompProps) {
  const frameW = Math.min(w * 0.08, 0.025);
  return (
    <group>
      {/* Frame bars */}
      <mesh position={[0, h / 2 - frameW / 2, 0]}>
        <boxGeometry args={[w, frameW, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, -h / 2 + frameW / 2, 0]}>
        <boxGeometry args={[w, frameW, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[-w / 2 + frameW / 2, 0, 0]}>
        <boxGeometry args={[frameW, h - frameW * 2, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[w / 2 - frameW / 2, 0, 0]}>
        <boxGeometry args={[frameW, h - frameW * 2, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Glass/image backing */}
      <mesh position={[0, 0, d * 0.3]}>
        <boxGeometry args={[w - frameW * 2, h - frameW * 2, 0.002]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

// ─── Basket ──────────────────────────────────────────────

function Basket({ w, h, d, matProps }: CompProps) {
  const t = Math.min(0.006, w * 0.03);
  // Slightly tapered basket using a wider top
  return (
    <group>
      {/* Bottom */}
      <mesh position={[0, -h / 2 + t / 2, 0]}>
        <boxGeometry args={[w * 0.85, t, d * 0.85]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, 0, -d / 2 + t / 2]} rotation={[-0.05, 0, 0]}>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 0, d / 2 - t / 2]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-w / 2 + t / 2, 0, 0]} rotation={[0, 0, 0.05]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Right wall */}
      <mesh position={[w / 2 - t / 2, 0, 0]} rotation={[0, 0, -0.05]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}

// ─── Bracket Foot ────────────────────────────────────────

function BracketFoot({ w, h, d, matProps }: CompProps) {
  const t = Math.min(w * 0.3, 0.015);
  return (
    <group>
      {/* Two side brackets forming an ogee-like foot */}
      <mesh position={[0, 0, -d / 2 + t / 2]}>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[-w / 2 + t / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}
