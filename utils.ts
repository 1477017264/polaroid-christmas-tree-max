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

// Dynamic SVG Generator for Back Photo
export const createBackPhotoUri = (text: string, aspectRatio: number): string => {
    // aspectRatio = height / width
    // High-Res Reference Width (1024px for 2K quality text)
    const WIDTH = 1024;
    const HEIGHT = Math.round(WIDTH * aspectRatio);
    
    // Bottom strip for "Polaroid" logo
    const STRIP_RATIO = 0.15;
    const STRIP_HEIGHT = Math.max(160, Math.round(HEIGHT * STRIP_RATIO));
    const PHOTO_HEIGHT = HEIGHT - STRIP_HEIGHT;
    
    // Text Logic - Scaled for 1024px width
    const FONT_SIZE = 64;
    const LINE_HEIGHT = 88;
    const PADDING = 80;
    const MAX_LINE_WIDTH = WIDTH - (PADDING * 2);
    
    const lines: string[] = [];
    
    // Handle null/empty text
    const rawText = text || "Wish you\nwere here.";
    
    const paragraphs = rawText.split('\n');
    paragraphs.forEach(paragraph => {
        let currentLine = '';
        let currentWidth = 0;
        const chars = Array.from(paragraph);
        let wordBuffer = '';
        let wordWidth = 0;
        
        const flushWord = () => {
             if (!wordBuffer) return;
             if (currentWidth + wordWidth > MAX_LINE_WIDTH) {
                 if (currentLine.length > 0) {
                     lines.push(currentLine);
                     currentLine = wordBuffer;
                     currentWidth = wordWidth;
                 } else {
                     currentLine = wordBuffer;
                     currentWidth = wordWidth;
                 }
             } else {
                 currentLine += wordBuffer;
                 currentWidth += wordWidth;
             }
             wordBuffer = '';
             wordWidth = 0;
        };
        
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const isWide = char.match(/[^\x00-\xff]/);
            const charWidth = isWide ? FONT_SIZE : (FONT_SIZE * 0.55);
            
            if (isWide) {
                flushWord();
                if (currentWidth + charWidth > MAX_LINE_WIDTH) {
                    if (currentLine.length > 0) lines.push(currentLine);
                    currentLine = char;
                    currentWidth = charWidth;
                } else {
                    currentLine += char;
                    currentWidth += charWidth;
                }
            } else if (char === ' ') {
                flushWord();
                const spaceWidth = FONT_SIZE * 0.3;
                if (currentWidth + spaceWidth <= MAX_LINE_WIDTH) {
                    currentLine += char;
                    currentWidth += spaceWidth;
                }
            } else {
                wordBuffer += char;
                wordWidth += charWidth;
            }
        }
        flushWord();
        if (currentLine) lines.push(currentLine);
    });
    
    // Vertical Center in the black area (PHOTO_HEIGHT)
    const totalTextHeight = lines.length * LINE_HEIGHT;
    const startY = (PHOTO_HEIGHT - totalTextHeight) / 2 + (FONT_SIZE * 0.4);
    
    const textContent = lines.map((line, i) => {
        const safeLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const y = startY + (i * LINE_HEIGHT);
        return `<text x="50%" y="${y}" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold" font-size="${FONT_SIZE}">${safeLine}</text>`;
    }).join('');

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f0f0f0"/>
  <rect width="${WIDTH}" height="${PHOTO_HEIGHT}" fill="#111111"/>
  ${textContent}
  <text x="${WIDTH - 40}" y="${HEIGHT - (STRIP_HEIGHT/2) - 10}" text-anchor="end" fill="#333" font-family="sans-serif" font-weight="bold" font-size="48">Polaroid</text>
  <text x="${WIDTH - 40}" y="${HEIGHT - (STRIP_HEIGHT/2) + 50}" text-anchor="end" fill="#333" font-family="monospace" font-size="40">CapyPola</text>
</svg>
`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
};