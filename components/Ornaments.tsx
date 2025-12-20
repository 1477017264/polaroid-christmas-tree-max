import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types.ts';
import { getRandomSpherePoint, getTreePoint } from '../utils.ts';

interface OrnamentsProps {
  treeState: TreeState;
  type: 'ball' | 'box' | 'light';
  count: number;
  colorPalette: string[];
}

const tempObject = new THREE.Object3D();

const Ornaments: React.FC<OrnamentsProps> = ({ treeState, type, count, colorPalette }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Generate data
  const { chaosData, targetData, speeds, initialRotations } = useMemo(() => {
    const chaos = [];
    const target = [];
    const spds = [];
    const rots = [];

    for (let i = 0; i < count; i++) {
      // Chaos position
      chaos.push(getRandomSpherePoint(20));

      // Tree position (slightly offset radius to sit ON the foliage)
      // Use power > 1 (e.g., 1.8) to bias distribution towards bottom (yRatio 0)
      // This reduces clustering at the cone tip (top)
      const yBias = Math.pow(Math.random(), 1.8);
      const tPos = getTreePoint(14, 5, yBias);
      
      // Push it slightly out based on type
      const offset = type === 'box' ? 0.5 : (type === 'ball' ? 0.3 : 0.6);
      const direction = new THREE.Vector3(tPos.x, 0, tPos.z).normalize();
      tPos.add(direction.multiplyScalar(offset));
      target.push(tPos);

      // Random speed for organic movement
      spds.push(1 + Math.random() * 2);

      // Initial random rotation
      rots.push(new THREE.Euler(
        Math.random() * Math.PI, 
        Math.random() * Math.PI, 
        Math.random() * Math.PI
      ));
    }
    return { chaosData: chaos, targetData: target, speeds: spds, initialRotations: rots };
  }, [count, type]);

  // Current actual positions (for manual animation state)
  const currentPositions = useMemo(() => {
    return chaosData.map(v => v.clone());
  }, [chaosData]);

  // Set initial colors and expand bounding box
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    
    // 1. Set Colors
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      color.set(colorPalette[Math.floor(Math.random() * colorPalette.length)]);
      meshRef.current.setColorAt(i, color);
    }
    meshRef.current.instanceColor!.needsUpdate = true;

    // 2. Expand Bounding Box for Culling Safety
    // Setting to Infinity ensures the object is never considered "out of view" by the frustum culler.
    meshRef.current.geometry.boundingBox = new THREE.Box3(
        new THREE.Vector3(-Infinity, -Infinity, -Infinity),
        new THREE.Vector3(Infinity, Infinity, Infinity)
    );
    meshRef.current.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0,0,0), Infinity);
    
    // Override compute methods to prevent automatic shrinking
    meshRef.current.geometry.computeBoundingBox = () => {};
    meshRef.current.geometry.computeBoundingSphere = () => {};

  }, [count, colorPalette]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const targetIsTree = treeState === TreeState.FORMED;

    for (let i = 0; i < count; i++) {
      const target = targetIsTree ? targetData[i] : chaosData[i];
      const current = currentPositions[i];
      const speed = speeds[i];

      // Lerp position
      current.lerp(target, speed * delta);

      // Update instance matrix
      tempObject.position.copy(current);
      
      // Rotation logic
      if (type === 'box') {
         // Static rotation for boxes (no animation)
         tempObject.rotation.copy(initialRotations[i]);
      } else {
         // Continuous rotation for balls/lights
         tempObject.rotation.set(0, 0, 0);
         tempObject.rotation.y = state.clock.elapsedTime * 0.1 * speed;
      }

      // Scale pulse for lights
      if (type === 'light') {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 5 + i) * 0.2;
        tempObject.scale.setScalar(scale);
      } else {
        tempObject.scale.setScalar(1);
      }
      
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Geometry & Material Selection
  let Geometry = <sphereGeometry args={[0.3, 32, 32]} />; // Increased segments for smoother reflections
  if (type === 'box') Geometry = <boxGeometry args={[0.5, 0.5, 0.5]} />;
  if (type === 'light') Geometry = <sphereGeometry args={[0.08, 16, 16]} />;

  const emissive = type === 'light' ? new THREE.Color('#ffaa00') : new THREE.Color('#000000');
  const emissiveIntensity = type === 'light' ? 2 : 0;
  
  // RESTORED REFLECTION SETTINGS
  // To get that "indoor scene" look:
  // 1. High metalness (for balls) -> chrome/metallic look
  // 2. Low roughness -> sharp reflections
  // 3. High envMapIntensity -> explicitly reflect the HDRI environment
  
  const roughness = type === 'box' ? 0.2 : 0.05; // Very smooth
  const metalness = type === 'box' ? 0.4 : 1.0;  // Fully metallic for balls
  const envMapIntensity = 1.5;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      {Geometry}
      <meshStandardMaterial
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        envMapIntensity={envMapIntensity}
      />
    </instancedMesh>
  );
};

export default Ornaments;