import React, { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { PhotoData, TreeState } from '../types.ts';
import { getRandomSpherePoint, getSpiralPoint } from '../utils.ts';
import PhotoFrame from './PhotoFrame.tsx';

interface PhotoGalleryProps {
  photos: string[]; // URLs
  backPhoto: string | null;
  treeState: TreeState;
  onFocusChange?: (isFocused: boolean) => void;
  isClearing: boolean;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, backPhoto, treeState, onFocusChange, isClearing }) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Notify parent of focus state
  useEffect(() => {
    if (onFocusChange) {
      onFocusChange(!!focusedId);
    }
  }, [focusedId, onFocusChange]);

  // Generate Photo Data objects
  const photoObjects = useMemo(() => {
    return photos.map((url, index) => {
      const { position, rotationY } = getSpiralPoint(index, photos.length, 12, 5.5);
      
      const rot = new THREE.Euler(0, rotationY, 0);
      const chaos = getRandomSpherePoint(18);

      return {
        id: `photo-${index}`,
        url,
        position,
        rotation: rot,
        chaosPos: chaos
      } as PhotoData;
    });
  }, [photos]);

  return (
    <group>
      {photoObjects.map((data) => (
        <PhotoFrame
          key={data.id}
          data={data}
          treeState={treeState}
          isFocused={focusedId === data.id}
          onFocus={setFocusedId}
          onBlur={() => setFocusedId(null)}
          backPhotoUrl={backPhoto}
          isClearing={isClearing}
        />
      ))}
    </group>
  );
};

export default PhotoGallery;