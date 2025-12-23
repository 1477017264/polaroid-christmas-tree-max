import React, { useMemo, useState, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { PhotoData, TreeState } from '../types.ts';
import { getRandomSpherePoint, getSpiralPoint } from '../utils.ts';
import PhotoFrame from './PhotoFrame.tsx';

// Updated interface to match App.tsx structure
interface PhotoItem {
  url: string;
  height: number;
}

interface PhotoGalleryProps {
  photos: PhotoItem[]; 
  backPhotoUrl: string | null;
  backText: string;
  treeState: TreeState;
  onFocusChange?: (isFocused: boolean) => void;
  isClearing: boolean;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, backPhotoUrl, backText, treeState, onFocusChange, isClearing }) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Notify parent of focus state
  useEffect(() => {
    if (onFocusChange) {
      onFocusChange(!!focusedId);
    }
  }, [focusedId, onFocusChange]);

  // Generate Photo Data objects
  const photoObjects = useMemo(() => {
    return photos.map((item, index) => {
      const { position, rotationY } = getSpiralPoint(index, photos.length, 12, 5.5);
      
      const rot = new THREE.Euler(0, rotationY, 0);
      const chaos = getRandomSpherePoint(18);

      return {
        id: `photo-${index}`,
        url: item.url,
        position,
        rotation: rot,
        chaosPos: chaos,
        frameHeight: item.height // Pass the dynamic height
      } as PhotoData;
    });
  }, [photos]);

  return (
    <group>
      {photoObjects.map((data) => (
        <Suspense key={data.id} fallback={null}>
            <PhotoFrame
              data={data}
              treeState={treeState}
              isFocused={focusedId === data.id}
              onFocus={setFocusedId}
              onBlur={() => setFocusedId(null)}
              backPhotoUrl={backPhotoUrl}
              backText={backText}
              isClearing={isClearing}
            />
        </Suspense>
      ))}
    </group>
  );
};

export default PhotoGallery;