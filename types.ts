
import { Vector3, Euler } from 'three';

/**
 * Define the Three.js elements used in JSX for reference.
 * Note: We've removed the global JSX augmentation because it was shadowing 
 * standard DOM elements (div, svg, button, etc.), causing widespread TS errors.
 * React Three Fiber typically handles these intrinsic types automatically.
 */
export interface ThreeElements {
  ambientLight: any;
  pointLight: any;
  spotLight: any;
  color: any;
  group: any;
  mesh: any;
  instancedMesh: any;
  primitive: any;
  points: any;
  bufferGeometry: any;
  bufferAttribute: any;
  boxGeometry: any;
  sphereGeometry: any;
  planeGeometry: any;
  coneGeometry: any;
  dodecahedronGeometry: any;
  meshStandardMaterial: any;
  pointsMaterial: any;
}

export enum TreeState {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED'
}

export interface DualPosition {
  chaosPos: Vector3;
  targetPos: Vector3;
  chaosRot?: Euler;
  targetRot?: Euler;
}

export interface PhotoData {
  id: string;
  url: string;
  position: Vector3;
  rotation: Euler;
  chaosPos: Vector3;
}
