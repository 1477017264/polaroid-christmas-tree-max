import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types.ts';
import { getRandomSpherePoint, getTreePoint } from '../utils.ts';

interface FoliageProps {
  treeState: TreeState;
}

const COUNT = 12000;
const TREE_HEIGHT = 14;
const TREE_RADIUS = 5;

const FoliageShader = {
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uSize: { value: 0.16 }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uProgress;
    uniform float uSize;
    attribute vec3 chaosPos;
    attribute vec3 targetPos;
    varying vec3 vColor;

    void main() {
      vColor = color;
      vec3 pos = mix(chaosPos, targetPos, uProgress);
      
      // Floating animation for elegance
      pos.x += sin(uTime * 0.8 + float(gl_VertexID) * 0.001) * 0.15 * (1.0 - uProgress);
      pos.z += cos(uTime * 0.8 + float(gl_VertexID) * 0.001) * 0.15 * (1.0 - uProgress);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = uSize * (400.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      float dist = distance(gl_PointCoord, vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.2, dist);
      gl_FragColor = vec4(vColor, alpha * 0.9);
    }
  `
};

const Foliage: React.FC<FoliageProps> = ({ treeState }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const progressRef = useRef(0);
  
  const { chaosPositions, targetPositions, colors } = useMemo(() => {
    const chaos = new Float32Array(COUNT * 3);
    const target = new Float32Array(COUNT * 3);
    const cols = new Float32Array(COUNT * 3);

    const color1 = new THREE.Color('#012115'); // Deep emerald
    const color2 = new THREE.Color('#0F5132'); // Leaf green
    const color3 = new THREE.Color('#D4AF37'); // Gold flecks

    for (let i = 0; i < COUNT; i++) {
      const tPos = getTreePoint(TREE_HEIGHT, TREE_RADIUS, Math.pow(Math.random(), 0.8));
      target[i * 3] = tPos.x;
      target[i * 3 + 1] = tPos.y;
      target[i * 3 + 2] = tPos.z;

      const cPos = getRandomSpherePoint(15);
      chaos[i * 3] = cPos.x;
      chaos[i * 3 + 1] = cPos.y;
      chaos[i * 3 + 2] = cPos.z;

      const choice = Math.random();
      const c = choice > 0.92 ? color3 : (choice > 0.4 ? color2 : color1);
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    return { chaosPositions: chaos, targetPositions: target, colors: cols };
  }, []);

  useFrame((state, delta) => {
    if (!shaderRef.current) return;
    const targetVal = treeState === TreeState.FORMED ? 1 : 0;
    progressRef.current = THREE.MathUtils.lerp(progressRef.current, targetVal, delta * 2.5);
    shaderRef.current.uniforms.uProgress.value = progressRef.current;
    shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-chaosPos" count={COUNT} array={chaosPositions} itemSize={3} />
        <bufferAttribute attach="attributes-targetPos" count={COUNT} array={targetPositions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={COUNT} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-position" count={COUNT} array={new Float32Array(COUNT * 3)} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[FoliageShader]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </points>
  );
};

export default Foliage;