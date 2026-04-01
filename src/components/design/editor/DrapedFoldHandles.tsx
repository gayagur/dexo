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
  /** While dragging a fold handle, disable OrbitControls (same pattern as panel drag). */
  onPointerInteractionLock?: (locked: boolean) => void;
};

/**
 * Drag spheres: move pinch on fabric top; Shift+drag = lift.
 * Uses canvas pointer capture + world-space plane hit so orbit camera does not steal drags.
 */
function DrapedFoldHandlesInner({ panel, rootRef, onLive, onCommit, onPointerInteractionLock }: Props) {
  const { camera, gl } = useThree();
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const latestPointsRef = useRef<DrapedControlPoint[]>(panel.drapedControlPoints ?? []);

  const points = panel.drapedControlPoints ?? [];
  latestPointsRef.current = points;

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, index: number, pt: DrapedControlPoint) => {
      e.stopPropagation();
      e.nativeEvent.preventDefault?.();

      const canvas = gl.domElement;
      const pointerId = e.pointerId;
      try {
        canvas.setPointerCapture(pointerId);
      } catch {
        /* some browsers */
      }
      onPointerInteractionLock?.(true);

      const shift = e.nativeEvent.shiftKey === true;
      const startLift = pt.lift;
      const startClientY = e.clientY;

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

        const root = rootRef.current;
        if (!root) return;

        const rect = canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((ev.clientX - rect.left) / rect.width) * 2 - 1,
          -((ev.clientY - rect.top) / rect.height) * 2 + 1,
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, camera);

        const mw = root.matrixWorld;
        const topWorld = new THREE.Vector3(0, h / 2, 0).applyMatrix4(mw);
        const normal = new THREE.Vector3(0, 1, 0).transformDirection(mw).normalize();
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, topWorld);
        const hit = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(plane, hit)) return;

        const inv = new THREE.Matrix4().copy(mw).invert();
        const local = hit.clone().applyMatrix4(inv);
        const u = THREE.MathUtils.clamp(local.x / w + 0.5, 0.02, 0.98);
        const v = THREE.MathUtils.clamp(local.z / d + 0.5, 0.02, 0.98);
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
          canvas.releasePointerCapture(pointerId);
        } catch {
          /* ignore */
        }
        onPointerInteractionLock?.(false);
        onCommit({ drapedControlPoints: latestPointsRef.current });
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [camera, gl, onLive, onCommit, rootRef, onPointerInteractionLock],
  );

  if (points.length === 0) return null;

  const [w, h, d] = panel.size;
  const r = Math.max(0.014, Math.min(w, d) * 0.038);
  const y = h / 2 + Math.max(r * 2.2, 0.028);

  return (
    <>
      {points.map((pt, index) => {
        const x = (pt.u - 0.5) * w;
        const z = (pt.v - 0.5) * d;

        return (
          <mesh
            key={`${panel.id}-fold-${index}`}
            position={[x, y, z]}
            castShadow
            renderOrder={1000}
            onPointerDown={(e) => handlePointerDown(e, index, pt)}
          >
            <sphereGeometry args={[r, 20, 20]} />
            <meshStandardMaterial
              color="#c9a06e"
              roughness={0.42}
              metalness={0.12}
              emissive="#4a3420"
              emissiveIntensity={0.08}
              depthTest
              polygonOffset
              polygonOffsetFactor={-4}
              polygonOffsetUnits={-4}
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
