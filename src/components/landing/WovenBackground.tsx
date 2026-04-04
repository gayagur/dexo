import { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * Subtle woven-light particle background for the hero section.
 * Uses DEXO's warm palette (browns, oranges, creams) with low opacity.
 */
export function WovenBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();

    // DEXO palette colors (warm browns, oranges, creams)
    const palette = [
      new THREE.Color('#C96A3D'), // accent orange
      new THREE.Color('#C9845F'), // warm brown
      new THREE.Color('#D4A574'), // light tan
      new THREE.Color('#E8D5C0'), // cream
      new THREE.Color('#C05621'), // deep orange
      new THREE.Color('#B8926A'), // muted gold
    ];

    const particleCount = 25000;
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const geometry = new THREE.BufferGeometry();
    const torusKnot = new THREE.TorusKnotGeometry(1.8, 0.6, 200, 32);

    for (let i = 0; i < particleCount; i++) {
      const vertexIndex = i % torusKnot.attributes.position.count;
      const x = torusKnot.attributes.position.getX(vertexIndex);
      const y = torusKnot.attributes.position.getY(vertexIndex);
      const z = torusKnot.attributes.position.getZ(vertexIndex);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    torusKnot.dispose();

    const material = new THREE.PointsMaterial({
      size: 0.015,
      vertexColors: true,
      blending: THREE.NormalBlending,
      transparent: true,
      opacity: 0.35,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const mouseWorld = new THREE.Vector3(mouse.x * 3, mouse.y * 3, 0);

      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        const dx = positions[ix] - mouseWorld.x;
        const dy = positions[iy] - mouseWorld.y;
        const dz = positions[iz] - mouseWorld.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 1.5) {
          const force = (1.5 - dist) * 0.008;
          const invDist = 1 / Math.max(dist, 0.01);
          velocities[ix] += dx * invDist * force;
          velocities[iy] += dy * invDist * force;
          velocities[iz] += dz * invDist * force;
        }

        // Return to original position
        velocities[ix] += (originalPositions[ix] - positions[ix]) * 0.001;
        velocities[iy] += (originalPositions[iy] - positions[iy]) * 0.001;
        velocities[iz] += (originalPositions[iz] - positions[iz]) * 0.001;

        // Damping
        velocities[ix] *= 0.95;
        velocities[iy] *= 0.95;
        velocities[iz] *= 0.95;

        positions[ix] += velocities[ix];
        positions[iy] += velocities[iy];
        positions[iz] += velocities[iz];
      }
      geometry.attributes.position.needsUpdate = true;

      points.rotation.y = elapsedTime * 0.03;
      points.rotation.x = Math.sin(elapsedTime * 0.02) * 0.1;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" />;
}
