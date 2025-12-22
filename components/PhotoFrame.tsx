import React, { useRef, useState, useLayoutEffect, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { PhotoData, TreeState } from '../types.ts';
import { createBackPhotoUri } from '../utils.ts';

interface PhotoFrameProps {
  data: PhotoData;
  treeState: TreeState;
  isFocused: boolean;
  onFocus: (id: string) => void;
  onBlur: () => void;
  backPhotoUrl: string | null;
  backText: string;
  isClearing: boolean;
}

// Fixed Width
const FRAME_WIDTH = 1.2;
const GOLD_COLOR = new THREE.Color('#D4AF37');

// Helper to disable depth test/write conditionally
const getMaterialProps = (isFocused: boolean) => {
    return isFocused 
        ? { depthTest: false, depthWrite: false, transparent: true } 
        : { depthTest: true, depthWrite: true, transparent: false };
};

// Hook to handle "object-fit: cover" logic for textures on 3D planes
const useCoverTexture = (texture: THREE.Texture, frameWidth: number, frameHeight: number) => {
  const { gl } = useThree();
  useLayoutEffect(() => {
    if (!texture.image) return;

    // Enhance texture quality
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    // Fix: Cast image to HTMLImageElement to access width/height as it might be 'unknown'
    const img = texture.image as HTMLImageElement;
    const imageAspect = img.width / img.height;
    const frameAspect = frameWidth / frameHeight;

    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.center.set(0.5, 0.5); // Pivot from center

    if (imageAspect > frameAspect) {
      // Image is wider than frame -> scale height to match, crop width
      texture.repeat.set(frameAspect / imageAspect, 1);
    } else {
      // Image is taller than frame -> scale width to match, crop height
      texture.repeat.set(1, imageAspect / frameAspect);
    }
    
    // Key: SRGB Color Space for correct color representation
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture, frameWidth, frameHeight, gl]);

  return texture;
};

// Sub-component for Front Photo
const FrontPhotoFace = ({ url, width, height, isFocused }: { url: string, width: number, height: number, isFocused: boolean }) => {
    const texture = useTexture(url);
    useCoverTexture(texture, width, height);
    
    const matProps = useMemo(() => getMaterialProps(isFocused), [isFocused]);

    return (
        <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[width, height]} />
            {/* 
               Front Photo: Matte Photo Paper Look
               - roughness: 1.0 (Maximum Roughness = No specular reflection/gloss)
               - metalness: 0.0 (Non-metallic)
               - envMapIntensity: 1.2 (CRITICAL: Must be > 1.0 to reflect ambient light diffusely so it isn't dark)
            */}
            <meshStandardMaterial 
                map={texture} 
                side={THREE.FrontSide} 
                roughness={1.0}
                metalness={0.0}
                envMapIntensity={1.2}
                color="white"
                {...matProps} 
            />
        </mesh>
    );
}

// Sub-component for Back Photo
const BackPhotoFace = ({ url, width, height, isFocused }: { url: string, width: number, height: number, isFocused: boolean }) => {
  const texture = useTexture(url);
  useCoverTexture(texture, width, height);
  
  const matProps = useMemo(() => getMaterialProps(isFocused), [isFocused]);

  return (
    // Moved to z = -0.05 to ensure it is behind the box geometry
    <mesh position={[0, 0, -0.05]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial 
        map={texture} 
        side={THREE.FrontSide}
        roughness={0.25}
        metalness={0.0} 
        color={new THREE.Color(0.9, 0.9, 0.9)}
        {...matProps} 
      />
    </mesh>
  );
};

const PhotoFrame: React.FC<PhotoFrameProps> = ({ 
  data, treeState, isFocused, onFocus, onBlur, backPhotoUrl, backText, isClearing
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const [isFlipped, setIsFlipped] = useState(false);
  const { camera } = useThree();
  
  // Use the dynamic height from data, or fallback to standard ratio
  const currentHeight = data.frameHeight || (FRAME_WIDTH * (10.8 / 8.9));

  // Determine the texture for the back
  const backTextureUri = useMemo(() => {
      // If user uploaded an image, use it
      if (backPhotoUrl) return backPhotoUrl;
      // Otherwise generate SVG based on CURRENT frame dimensions
      const aspect = currentHeight / FRAME_WIDTH;
      return createBackPhotoUri(backText, aspect);
  }, [backPhotoUrl, backText, currentHeight]);

  // Animation progress: 0 (Resting) -> 1 (Focused)
  const progress = useRef(0);
  // Flip animation progress: 0 (Front) -> 1 (Back)
  const flipProgress = useRef(0);
  // Clearing animation: 1 (Visible) -> 0 (Cleared)
  const visibilityScale = useRef(1);

  // --- Smooth State Transition Refs ---
  const currentRestingPos = useRef(data.chaosPos.clone());
  const currentRestingRot = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(data.chaosPos.x, data.chaosPos.y, data.chaosPos.z)));

  // --- Double Click Logic Refs ---
  const clickTimeoutRef = useRef<number | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Handle interactions
  const handleDoubleClick = (e: any) => {
    e.stopPropagation();
    
    // Clear the pending single click (un-zoom) action
    if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
    }

    if (isFocused) {
      setIsFlipped(prev => !prev);
    }
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (isClearing) return;
    
    if (!isFocused) {
        // Zoom in immediately (no conflict needed)
        onFocus(data.id);
    } else {
        // If already focused, wait briefly to see if it's a double click
        // If double click happens, this timer is cleared in handleDoubleClick
        if (clickTimeoutRef.current === null) {
            clickTimeoutRef.current = window.setTimeout(() => {
                onBlur(); // Execute Un-zoom
                clickTimeoutRef.current = null;
            }, 250); // 250ms delay for double click detection
        }
    }
  };

  useFrame((state, delta) => {
    if (!groupRef.current || !groupRef.current.parent) return;

    // --- 0. Clearing Animation ---
    if (isClearing) {
        visibilityScale.current = THREE.MathUtils.lerp(visibilityScale.current, 0, delta * 3);
        if (isFocused) onBlur();
    } else {
        visibilityScale.current = 1;
    }

    // --- 1. Calculate Destination for Resting State ---
    const destRestingPos = new THREE.Vector3();
    const destRestingRot = new THREE.Quaternion();

    if (treeState === TreeState.FORMED) {
      destRestingPos.copy(data.position);
      
      const lookAtPos = new THREE.Vector3(0, data.position.y, 0);
      const dummyObj = new THREE.Object3D();
      dummyObj.position.copy(data.position);
      dummyObj.lookAt(lookAtPos); 
      dummyObj.rotateY(Math.PI);
      destRestingRot.copy(dummyObj.quaternion);
    } else {
      destRestingPos.copy(data.chaosPos);
      const dummy = new THREE.Object3D();
      dummy.rotation.set(data.chaosPos.x, data.chaosPos.y, data.chaosPos.z);
      destRestingRot.copy(dummy.quaternion);
    }

    // --- 2. Smoothly Interpolate Resting State ---
    const moveSpeed = 2.5;
    currentRestingPos.current.lerp(destRestingPos, delta * moveSpeed);
    currentRestingRot.current.slerp(destRestingRot, delta * moveSpeed);

    // --- 3. Calculate "Active" State ---
    const activePos = new THREE.Vector3();
    const activeRot = new THREE.Quaternion();
    let activeScale = 1;

    const dist = 5; 
    const worldTargetPos = new THREE.Vector3(0, 0, -dist);
    worldTargetPos.applyMatrix4(camera.matrixWorld);
    activePos.copy(groupRef.current.parent.worldToLocal(worldTargetPos));
    activeRot.copy(camera.quaternion);

    const targetFlip = isFlipped ? 1 : 0;
    flipProgress.current = THREE.MathUtils.lerp(flipProgress.current, targetFlip, delta * 2.0);
    
    if (flipProgress.current > 0.001) {
        const flipQ = new THREE.Quaternion();
        flipQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), flipProgress.current * Math.PI);
        activeRot.multiply(flipQ);
    }

    // Fix: cast camera to PerspectiveCamera to access fov and aspect
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const vFov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
    const viewHeight = 2 * Math.tan(vFov / 2) * dist;
    const viewWidth = viewHeight * perspectiveCamera.aspect;

    const objW = FRAME_WIDTH + 0.2; 
    const objH = currentHeight + 0.2;
    const SAFE_MARGIN = 0.85; 
    
    const scaleH = (viewHeight * SAFE_MARGIN) / objH;
    const scaleW = (viewWidth * SAFE_MARGIN) / objW;
    activeScale = Math.min(scaleH, scaleW);

    // --- 4. Update Focus Progress ---
    const zoomSpeed = 1.5; 
    if (isFocused) {
        progress.current = Math.min(1, progress.current + delta * zoomSpeed);
    } else {
        progress.current = Math.max(0, progress.current - delta * zoomSpeed);
        if (progress.current === 0 && isFlipped) {
            setIsFlipped(false);
        }
    }

    const p = progress.current;
    const t = 1 - Math.pow(1 - p, 3); 

    groupRef.current.position.lerpVectors(currentRestingPos.current, activePos, t);
    groupRef.current.quaternion.slerpQuaternions(currentRestingRot.current, activeRot, t);
    
    const finalScale = THREE.MathUtils.lerp(1, activeScale, t) * visibilityScale.current;
    groupRef.current.scale.setScalar(finalScale);

  }, -10);

  const matProps = useMemo(() => getMaterialProps(isFocused), [isFocused]);
  const renderOrder = isFocused || progress.current > 0 ? 9999 : 0;

  return (
    <group 
      ref={groupRef} 
      onClick={handleClick} 
      onPointerMissed={(e) => isFocused && onBlur()}
      onDoubleClick={handleDoubleClick}
      renderOrder={renderOrder}
    >
      <group>
        {/* Border */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[FRAME_WIDTH + 0.08, currentHeight + 0.08, 0.05]} />
          {/* Frame: High Metalness for Gold Reflection */}
          <meshStandardMaterial 
            color={GOLD_COLOR} 
            metalness={1.0} 
            roughness={0.15} 
            envMapIntensity={2.0}
            {...matProps}
          />
        </mesh>

        <FrontPhotoFace url={data.url} width={FRAME_WIDTH} height={currentHeight} isFocused={isFocused} />
        
        <BackPhotoFace url={backTextureUri} width={FRAME_WIDTH} height={currentHeight} isFocused={isFocused} />
      </group>
    </group>
  );
};

export default PhotoFrame;