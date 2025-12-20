import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { TreeState } from '../types.ts';
import Foliage from './Foliage.tsx';
import Ornaments from './Ornaments.tsx';
import PhotoGallery from './PhotoGallery.tsx';
import Star from './Star.tsx';

interface SceneProps {
  treeState: TreeState;
  photos: string[];
  backPhoto: string | null;
  isClearing: boolean;
}

const BOX_PALETTE = ['#8B0000', '#D4AF37', '#ffffff'];
const BALL_PALETTE = ['#D4AF37', '#FF0000', '#C0C0C0', '#0F5132'];
const LIGHT_PALETTE = ['#FFD700'];

const Scene: React.FC<SceneProps> = ({ treeState, photos, backPhoto, isClearing }) => {
  const [isFocusing, setIsFocusing] = useState(false);

  const dpr = useMemo<[number, number]>(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? [1, 1.75] : [1, 2];
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 4, 20], fov: 45, near: 0.5, far: 200 }}
      dpr={dpr}
      gl={{ 
        antialias: true,
        alpha: false,
        stencil: false,
        depth: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        powerPreference: "high-performance"
      }}
    >
      <color attach="background" args={['#011510']} />
      
      {/* 
         Environment Lighting:
         Changed to cdn.jsdmirror.cn to ensure access in China.
         We use the 'files' prop to point to a specific HDRI on the mirror.
      */}
      <Environment files="https://cdn.jsdmirror.cn/gh/pmndrs/drei-assets/hdri/lebombo_1k.hdr" />

      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#FEDC56" />
      <pointLight position={[-10, 5, -10]} intensity={0.8} color="#043927" />
      <spotLight position={[0, 20, 0]} intensity={2.5} angle={0.3} penumbra={1} castShadow />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={150} scale={25} size={6} speed={0.4} opacity={0.6} color="#D4AF37" />

      <group position={[0, -2, 0]}>
        <Foliage treeState={treeState} />
        <Star treeState={treeState} />
        
        <Ornaments 
          treeState={treeState} 
          type="box" 
          count={30} 
          colorPalette={BOX_PALETTE} 
        />
        <Ornaments 
          treeState={treeState} 
          type="ball" 
          count={60} 
          colorPalette={BALL_PALETTE} 
        />
        <Ornaments 
            treeState={treeState}
            type="light"
            count={120}
            colorPalette={LIGHT_PALETTE}
        />

        <PhotoGallery 
          treeState={treeState} 
          photos={photos} 
          backPhoto={backPhoto} 
          onFocusChange={setIsFocusing}
          isClearing={isClearing}
        />

        <ContactShadows 
            position={[0, -7.5, 0]}
            opacity={0.6} 
            scale={80} 
            blur={2.5} 
            far={40} 
            resolution={256} 
            color="#000000" 
        />
      </group>

      <OrbitControls 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 1.7} 
        enablePan={false}
        maxDistance={25}
        minDistance={5}
        autoRotate={true}
        autoRotateSpeed={0.8} 
      />

      <EffectComposer enableNormalPass={false} multisampling={8}>
        <Bloom 
            luminanceThreshold={0.15} 
            mipmapBlur 
            intensity={1.5} 
            radius={0.5} 
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
};

export default Scene;