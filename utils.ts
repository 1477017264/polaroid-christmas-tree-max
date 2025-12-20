import { Vector3, MathUtils } from 'three';

// Generate a random point inside a sphere
export const getRandomSpherePoint = (radius: number): Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const sinPhi = Math.sin(phi);
  return new Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
};

// Generate a point on a cone surface (Tree shape)
// y goes from 0 (bottom) to height (top)
export const getTreePoint = (
  height: number,
  baseRadius: number,
  yRatio: number // 0 to 1
): Vector3 => {
  const y = yRatio * height;
  const r = baseRadius * (1 - yRatio); // Radius decreases as we go up
  const theta = Math.random() * Math.PI * 2;
  
  // Add some noise for natural look
  const rNoise = MathUtils.randFloatSpread(0.5);
  const finalR = Math.max(0, r + rNoise);

  return new Vector3(
    finalR * Math.cos(theta),
    y - height / 2, // Center vertically
    finalR * Math.sin(theta)
  );
};

// Generate spiral points for photos
export const getSpiralPoint = (
  index: number,
  total: number,
  height: number,
  radiusBase: number
): { position: Vector3, rotationY: number } => {
  const yRatio = index / total;
  const y = (yRatio * height) - (height / 2);
  const r = (radiusBase * (1 - yRatio)) + 1.5; // Slightly outside the tree
  const loops = 4;
  const theta = (yRatio * Math.PI * 2 * loops);

  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);

  return {
    position: new Vector3(x, y, z),
    rotationY: -theta // Face outwards roughly
  };
};
