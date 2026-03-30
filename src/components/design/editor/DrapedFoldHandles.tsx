"use client";

import { useCallback, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { DrapedControlPoint, PanelData } from "@/lib/furnitureData";

export const DRAPED_MAX_FOLD_POINTS = 16;

type Props = {
  panel: PanelData;
  rootRef: React.RefObject<THREE.Group | null>;
  onLive: (updates: Partial<PanelData>) => void;
  onCommit: (updates: Partial<PanelData>) => void;
};

/**
 * Drag spheres on the blanket: move pinch on the surface; Shift+drag = adjust fold depth (lift).
 * Must render inside R3F Canvas. Normals on the draped mesh pick up directional lights → visible fold shadows.
 */
function DrapedFoldHandlesInner({ panel, rootRef, onLive, onCommit }: Props) {
  const { camera, gl } = useThree();
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const latestPointsRef = useRef<DrapedControlPoint[]>(panel.drapedControlPoints ?? []);

  const points = panel.drapedControlPoints ?? [];
  latestPointsRef.current = points;

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, index: number, pt: DrapedControlPoint) => {
      e.stopPropagation();
      const mesh = e.object as THREE.Mesh;
      mesh.setPointerCapture(e.pointerId);
      const shift = e.nativeEvent.shiftKey === true;
      const startLift = pt.lift;
      const startClientY = e.clientY;
      const pointerId = e.pointerId;

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const p = panelRef.current;
        const [w, h, d] = p.size;
        const list = [...(p.drapedControlPoints ?? [])];

        if (shift) {
          const dy = ev.clientY - startClientY;
          const lift = THREE.MathUtils.clamp(startLift - dy * 0.0022, -0.12, 0.14);
          const next = list.map((x, i) => (i === index ? { ...x, lift } : x));
          latestPointsRef.current = next;
          onLive({ drapedControlPoints: next });
          return;
        }

        const rect = gl.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((ev.clientX - rect.left) / rect.width) * 2 - 1,
          -((ev.clientY - rect.top) / rect.height) * 2 + 1,
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, camera);

        const root = rootRef.current;
        if (!root) return;
        const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
        const ray = raycaster.ray.clone();
        ray.applyMatrix4(inv);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -h / 2);
        const hit = new THREE.Vector3();
        if (!ray.intersectPlane(plane, hit)) return;
        const u = THREE.MathUtils.clamp(hit.x / w + 0.5, 0.02, 0.98);
        const v = THREE.MathUtils.clamp(hit.z / d + 0.5, 0.02, 0.98);
        const next = list.map((x, i) => (i === index ? { ...x, u, v } : x));
        latestPointsRef.current = next;
        onLive({ drapedControlPoints: next });
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        try {
          mesh.releasePointerCapture(pointerId);
        } catch {
          /* ignore */
        }
        onCommit({ drapedControlPoints: latestPointsRef.current });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [camera, gl, onLive, onCommit, rootRef],
  );

  if (points.length === 0) return null;

  const [w, h, d] = panel.size;
  const r = Math.max(0.011, Math.min(w, d) * 0.034);

  return (
    <>
      {points.map((pt, index) => {
        const x = (pt.u - 0.5) * w;
        const z = (pt.v - 0.5) * d;
        const y = h / 2 + r * 0.65;

        return (
          <mesh
            key={`${panel.id}-fold-${index}`}
            position={[x, y, z]}
            castShadow
            onPointerDown={(e) => handlePointerDown(e, index, pt)}
          >
            <sphereGeometry args={[r, 16, 16]} />
            <meshStandardMaterial
              color="#c9a06e"
              roughness={0.42}
              metalness={0.12}
              emissive="#4a3420"
              emissiveIntensity={0.08}
            />
          </mesh>
        );
      })}
    </>
  );
}

export function DrapedFoldHandles(props: Props) {
  return <DrapedFoldHandlesInner {...props} />;
}
