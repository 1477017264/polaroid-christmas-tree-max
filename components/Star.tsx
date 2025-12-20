import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types.ts';

interface StarProps {
  treeState: TreeState;
}

// Custom shader-like particle system for "Three-Body" chaotic motion
const ChaoticSwarm = ({ opacity }: { opacity: number }) => {
  const count = 60;
  const pointsRef = useRef<THREE.Points>(null);

  // Generate static parameters for each particle
  // We need distinct frequencies for X, Y, Z to create chaotic Lissajous orbits
  const { initialPositions, params, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const par = []; // Stores [speed, radius, freqX, freqY, freqZ, offsetX, offsetY, offsetZ]
    const cols = new Float32Array(count * 3);
    const colorChoices = [
      new THREE.Color('#FEDC56'), // Gold Light
      new THREE.Color('#FFFFFF'), // White
      new THREE.Color('#D4AF37'), // Deep Gold
    ];

    for (let i = 0; i < count; i++) {
      // Initial positions (not strictly used as we override in useFrame, but good for bounding)
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      // Parameters for Chaos
      // 1. Base Radius (0.8 to 2.5)
      const radius = 0.8 + Math.random() * 1.7;
      // 2. Global Speed for this particle
      const speed = 0.5 + Math.random() * 1.0;
      // 3. Frequencies for X/Y/Z (Randomized to create non-repeating loops)
      const freqX = 1 + Math.random();
      const freqY = 1 + Math.random();
      const freqZ = 1 + Math.random();
      // 4. Phase Offsets
      const offX = Math.random() * Math.PI * 2;
      const offY = Math.random() * Math.PI * 2;
      const offZ = Math.random() * Math.PI * 2;

      par.push({ radius, speed, freqX, freqY, freqZ, offX, offY, offZ });

      // Colors
      const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    return { initialPositions: pos, params: par, colors: cols };
  }, []);

  useLayoutEffect(() => {
    if (pointsRef.current) {
        // Prevent culling for these moving particles
        pointsRef.current.geometry.boundingBox = new THREE.Box3(
            new THREE.Vector3(-Infinity, -Infinity, -Infinity),
            new THREE.Vector3(Infinity, Infinity, Infinity)
        );
        pointsRef.current.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
    }
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    
    // Animate opacity based on parent state
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = opacity;
    pointsRef.current.visible = opacity > 0.01;
    
    if (opacity <= 0.01) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const p = params[i];
      const i3 = i * 3;

      // Lissajous curve formula:
      // x = A * sin(at + d)
      // y = B * sin(bt + e) ...
      // This creates complex, chaotic "atom-like" or "three-body" orbits.
      
      const time = t * p.speed;

      positions[i3]     = p.radius * Math.sin(time * p.freqX + p.offX);
      positions[i3 + 1] = p.radius * Math.sin(time * p.freqY + p.offY);
      positions[i3 + 2] = p.radius * Math.sin(time * p.freqZ + p.offZ);
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={initialPositions}
          itemSize={3}
        />
        <bufferAttribute
            attach="attributes-color"
            count={count}
            array={colors}
            itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

const Star: React.FC<StarProps> = ({ treeState }) => {
  const groupRef = useRef<THREE.Group>(null);
  const progress = useRef(0); // 0 = Chaos (Dissipated), 1 = Formed (Gathered)

  // Reusable material
  const material = useMemo(() => new THREE.MeshStandardMaterial({
      color: new THREE.Color("#FFF"),
      emissive: new THREE.Color("#FEDC56"),
      emissiveIntensity: 2,
      roughness: 0.1,
      metalness: 1.0,
      toneMapped: false,
      transparent: true,
      opacity: 0, 
  }), []);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;

    // 1. Calculate Animation Progress (Linear 1.5 seconds)
    const speed = 1 / 1.5; 
    const target = treeState === TreeState.FORMED;
    // Fix: progress target logic was implicit in previous code, explicit here:
    const targetVal = target ? 1 : 0;
    
    // Move towards target
    const diff = targetVal - progress.current;
    if (Math.abs(diff) > 0.0001) {
        const step = Math.sign(diff) * delta * speed;
        progress.current = THREE.MathUtils.clamp(progress.current + step, 0, 1);
    } else {
        progress.current = targetVal;
    }

    // Easing for visual effect (Smoothstep)
    const p = THREE.MathUtils.smoothstep(progress.current, 0, 1);

    // 2. Animate Properties
    // Opacity: Fades in/out
    material.opacity = p;
    material.emissiveIntensity = 2 * p;
    
    // Visibility check
    groupRef.current.visible = p > 0.01;

    // Scale/Dissipate Effect
    const scale = 1.5 - (0.5 * p); 
    groupRef.current.scale.setScalar(scale);

    // 3. Bobbing & Rotation (Only active when visible)
    const t = clock.getElapsedTime();
    groupRef.current.position.y = 8.2 + (Math.sin(t) * 0.05 * p);
    groupRef.current.rotation.y = t * 0.2;
  });

  return (
    <group ref={groupRef} position={[0, 8.2, 0]}>
      {/* --- Star Geometry (Solid/Static Style) --- */}
      
      {/* Vertical Spike (Up) */}
      <mesh position={[0, 0.6, 0]} material={material}>
        <coneGeometry args={[0.15, 1.2, 4]} />
      </mesh>
      
      {/* Vertical Spike (Down) */}
      <mesh position={[0, -1.0, 0]} rotation={[Math.PI, 0, 0]} material={material}>
        <coneGeometry args={[0.15, 2.0, 4]} />
      </mesh>

      {/* Horizontal Spikes */}
      <mesh position={[0.6, 0, 0]} rotation={[0, 0, -Math.PI/2]} material={material}>
        <coneGeometry args={[0.12, 1.2, 4]} />
      </mesh>
      <mesh position={[-0.6, 0, 0]} rotation={[0, 0, Math.PI/2]} material={material}>
        <coneGeometry args={[0.12, 1.2, 4]} />
      </mesh>

      {/* Diagonal Spikes */}
      <group rotation={[0, 0, Math.PI/4]}>
         <mesh position={[0, 0.4, 0]} material={material}>
            <coneGeometry args={[0.08, 0.8, 4]} />
         </mesh>
         <mesh position={[0, -0.4, 0]} rotation={[Math.PI, 0, 0]} material={material}>
            <coneGeometry args={[0.08, 0.8, 4]} />
         </mesh>
         <mesh position={[0.4, 0, 0]} rotation={[0, 0, -Math.PI/2]} material={material}>
            <coneGeometry args={[0.08, 0.8, 4]} />
         </mesh>
         <mesh position={[-0.4, 0, 0]} rotation={[0, 0, Math.PI/2]} material={material}>
            <coneGeometry args={[0.08, 0.8, 4]} />
         </mesh>
      </group>
      
      {/* Center Core */}
      <mesh material={material}>
         <dodecahedronGeometry args={[0.25, 0]} />
      </mesh>

      {/* --- Effects --- */}
      <pointLight color="#FEDC56" intensity={2 * progress.current} distance={8} decay={2} />

      {/* Replaced Sparkles with ChaoticSwarm for Three-Body style orbits */}
      <ChaoticSwarm opacity={material.opacity} />
    </group>
  );
};

export default Star;