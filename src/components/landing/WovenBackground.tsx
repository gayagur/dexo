import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Aurora shader background — warm DEXO palette, subtle and flowing, follows mouse. */
const AuroraPlane = ({ mouse }: { mouse: React.RefObject<[number, number]> }) => {
  const { scene } = useThree();
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(200, 200);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 mouse;
        varying vec2 vUv;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                             -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          vec2 uv = vUv;

          // Mouse influence — shift the noise field toward the cursor
          vec2 m = mouse * 0.3;
          float flow1 = snoise(vec2(uv.x * 2.0 + time * 0.08 + m.x, uv.y * 0.5 + time * 0.04 + m.y));
          float flow2 = snoise(vec2(uv.x * 1.5 + time * 0.06 - m.x * 0.5, uv.y * 0.8 + time * 0.025 + m.y * 0.5));
          float flow3 = snoise(vec2(uv.x * 3.0 + time * 0.1 + m.x * 0.7, uv.y * 0.3 + time * 0.05 - m.y * 0.3));

          // Mouse-attracted glow — brighter near cursor
          float mouseDist = distance(uv, vec2(mouse.x * 0.5 + 0.5, mouse.y * 0.5 + 0.5));
          float mouseGlow = smoothstep(0.5, 0.0, mouseDist) * 0.15;

          float streaks = sin((uv.x + flow1 * 0.3) * 8.0 + time * 0.15) * 0.5 + 0.5;
          streaks *= sin((uv.y + flow2 * 0.2) * 12.0 + time * 0.1) * 0.5 + 0.5;

          float aurora = (flow1 + flow2 + flow3) * 0.33 + 0.5;
          aurora = pow(aurora, 2.0);

          // DEXO warm palette
          vec3 base      = vec3(0.969, 0.953, 0.937);  // #F7F3EF cream background
          vec3 warmTan   = vec3(0.898, 0.820, 0.722);  // light tan
          vec3 warmBrown = vec3(0.788, 0.522, 0.373);  // #C9845F
          vec3 accent    = vec3(0.788, 0.416, 0.239);  // #C96A3D orange
          vec3 deep      = vec3(0.753, 0.337, 0.129);  // #C05621

          vec3 color = base;

          float tanFlow = smoothstep(0.25, 0.65, aurora + streaks * 0.2);
          color = mix(color, warmTan, tanFlow * 0.5);

          float brownFlow = smoothstep(0.5, 0.85, aurora + flow1 * 0.3);
          color = mix(color, warmBrown, brownFlow * 0.3);

          float accentFlow = smoothstep(0.75, 0.95, streaks + aurora * 0.4);
          color = mix(color, accent, accentFlow * 0.2);

          float deepFlow = smoothstep(0.85, 1.0, flow3 + streaks * 0.15);
          color = mix(color, deep, deepFlow * 0.15);

          // Mouse glow — warm accent near cursor
          color = mix(color, accent, mouseGlow);

          float noise = snoise(uv * 80.0) * 0.008;
          color += noise;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
    matRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -50;
    scene.add(mesh);

    return () => {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    };
  }, [scene]);

  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.time.value += 0.01;
      if (mouse.current) {
        matRef.current.uniforms.mouse.value.set(mouse.current[0], mouse.current[1]);
      }
    }
  });

  return null;
};

const CameraController = () => {
  const { camera } = useThree();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    camera.position.x = Math.sin(t * 0.04) * 2;
    camera.position.y = Math.cos(t * 0.05) * 1.5;
    camera.position.z = 30;
    camera.lookAt(0, 0, -30);
  });
  return null;
};

export function WovenBackground() {
  const mouse = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = [
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      ];
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ background: '#F7F3EF' }}
      >
        <AuroraPlane mouse={mouse} />
        <CameraController />
      </Canvas>
    </div>
  );
}
