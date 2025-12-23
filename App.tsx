import React, { Component, useState, useCallback, Suspense, useEffect, useRef, ReactNode } from 'react';
import { useProgress } from '@react-three/drei';
import Scene from './components/Scene.tsx';
import { TreeState } from './types.ts';

const MAX_PHOTOS = 30;
// Constants for Frame sizing
const FRAME_WIDTH = 1.2;
const STANDARD_ASPECT = 8.9 / 10.8; 
const STANDARD_HEIGHT = FRAME_WIDTH / STANDARD_ASPECT; // ~1.456

// Photo State Interface
interface PhotoItem {
    url: string;
    height: number;
}

const processImage = (file: File): Promise<{ url: string; width: number; height: number }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1024; 
        let width = img.width;
        let height = img.height;
        
        // Calculate dimensions to fit MAX_SIZE while preserving aspect
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                resolve({ url, width, height });
              } else {
                resolve({ url: img.src, width, height });
              }
            }, 'image/jpeg', 0.85);
        } else {
            resolve({ url: img.src, width, height });
        }
      };
    };
  });
};

const IconUpload = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
    </svg>
);
const IconFreeRatio = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
    </svg>
);
const IconBackImage = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
);
const IconTrash = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const IconClose = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const IconInfo = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);
const IconMessage = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    <line x1="8" y1="9" x2="16" y2="9"></line>
    <line x1="8" y1="13" x2="14" y2="13"></line>
  </svg>
);
const IconRecord = ({ isRecording }: { isRecording: boolean }) => (
    <div className={`w-4 h-4 rounded-full border-2 border-[#D4AF37] flex items-center justify-center transition-all ${isRecording ? 'border-red-500' : ''}`}>
        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-[#D4AF37]'}`} />
    </div>
);
const IconChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
);
const IconChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);

const IconBethlehemStar = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 100 100" fill="none">
        <path d="M50 0 C 53 32, 68 47, 100 50 C 68 53, 53 68, 50 100 C 47 68, 32 53, 0 50 C 32 47, 47 32, 50 0 Z" fill="#D4AF37" />
        <path d="M50 20 L 58 42 L 80 50 L 58 58 L 50 80 L 42 58 L 20 50 L 42 42 Z" fill="#D4AF37" fillOpacity="0.5" />
    </svg>
);

const Loader = () => {
    const { active, progress } = useProgress();
    const [show, setShow] = useState(true);
    useEffect(() => {
        if (!active || progress === 100) {
            const timeout = setTimeout(() => setShow(false), 500);
            return () => clearTimeout(timeout);
        } else {
            setShow(true);
        }
    }, [active, progress]);
    return (
        <div 
            className={`fixed inset-0 z-[60] flex flex-col items-center justify-center backdrop-blur-xl transition-opacity duration-700 ease-in-out ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ background: 'radial-gradient(circle at center, rgba(1, 21, 16, 0.3), rgba(0, 0, 0, 0.6))', opacity: show ? 1 : 0 }}
        >
             <div className="text-luxury-gold animate-star-pulse drop-shadow-[0_0_20px_rgba(212,175,55,1)]">
                <IconBethlehemStar size={80} />
             </div>
        </div>
    );
};

const ProcessingOverlay = ({ isProcessing }: { isProcessing: boolean }) => (
    <div 
        className={`fixed inset-0 z-[60] flex flex-col items-center justify-center backdrop-blur-xl transition-opacity duration-500 ease-in-out ${isProcessing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'radial-gradient(circle at center, rgba(1, 21, 16, 0.3), rgba(0, 0, 0, 0.6))', opacity: isProcessing ? 1 : 0 }}
    >
        <div className="text-luxury-gold animate-star-pulse drop-shadow-[0_0_25px_rgba(212,175,55,1)]">
            <IconBethlehemStar size={80} />
        </div>
    </div>
);

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: string; }

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: '' };

    static getDerivedStateFromError(error: any): ErrorBoundaryState { 
        return { hasError: true, error: error.toString() }; 
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-red-500 mb-4 text-xl font-bold">Something went wrong</div>
                    <div className="text-gray-400 text-sm font-mono whitespace-pre-wrap">{this.state.error}</div>
                    <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 border border-luxury-gold text-luxury-gold rounded-full hover:bg-luxury-gold hover:text-black transition-colors">Reload App</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const HelpModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <div 
            className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-md transition-all duration-500 ease-in-out ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        >
            <div 
                className={`w-[85%] max-w-[360px] border-2 border-[#D4AF37] rounded-[24px] p-8 relative transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) text-center ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}`}
                style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                    backdropFilter: 'blur(32px) saturate(180%)', 
                    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                    boxShadow: '0 0 50px rgba(212, 175, 55, 0.3)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-5 right-5 text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors p-2">
                    <IconClose size={24} />
                </button>
                <div className="flex flex-col items-center mb-8">
                    <div className="drop-shadow-[0_0_15px_rgba(212,175,55,0.7)]">
                        <IconBethlehemStar size={52} />
                    </div>
                    <h2 className="text-[#D4AF37] text-3xl tracking-[0.3em] uppercase font-serif mt-4 font-extrabold">操作指南</h2>
                </div>
                <div className="space-y-8 text-left font-serif text-white text-sm leading-relaxed">
                    <div>
                        <span className="text-[#D4AF37] font-bold block mb-1 tracking-widest uppercase text-xl">长按屏幕</span>
                        <span className="text-white opacity-100 font-medium">凝聚或打散圣诞树，感受混沌与秩序的交织。</span>
                    </div>
                    <div>
                        <span className="text-[#D4AF37] font-bold block mb-1 tracking-widest uppercase text-xl">录制视频</span>
                        <span className="text-white opacity-100 font-medium">点击录制按钮开始捕捉 1080p 60fps 画面，再次点击停止并导出 MP4。</span>
                    </div>
                    <div>
                        <span className="text-[#D4AF37] font-bold block mb-1 tracking-widest uppercase text-xl">查看图片</span>
                        <span className="text-white opacity-100 font-medium">单击相框可聚焦查看细节；再次单击空白处退出。</span>
                    </div>
                    <div>
                        <span className="text-[#D4AF37] font-bold block mb-1 tracking-widest uppercase text-xl">翻转相框</span>
                        <span className="text-white opacity-100 font-medium">在聚焦状态下，双击相框可翻转查看背面的文字。</span>
                    </div>
                </div>
                <div className="mt-10 pt-5 border-t border-[#D4AF37]/40">
                    <p className="text-[12px] text-[#D4AF37] font-bold italic font-serif tracking-wider drop-shadow-sm">May your holidays be filled with luxury and joy.</p>
                </div>
            </div>
        </div>
    );
};

const MessageModal = ({ isOpen, onClose, onConfirm, onClear }: { isOpen: boolean; onClose: () => void; onConfirm: (text: string) => void; onClear: () => void }) => {
    const [text, setText] = useState('');

    const handleConfirm = () => {
        onConfirm(text);
        setText('');
    };

    const handleClear = () => {
        onClear();
        setText('');
    };

    return (
        <div 
            className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-md transition-all duration-500 ease-in-out ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        >
            <div 
                className={`w-[85%] max-w-[360px] border-2 border-[#D4AF37] rounded-[24px] p-8 relative transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) text-center ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}`}
                style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                    backdropFilter: 'blur(32px) saturate(180%)', 
                    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                    boxShadow: '0 0 50px rgba(212, 175, 55, 0.3)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-5 right-5 text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors p-2">
                    <IconClose size={24} />
                </button>
                <div className="flex flex-col items-center mb-6">
                    <h2 className="text-[#D4AF37] text-2xl tracking-[0.2em] uppercase font-serif font-extrabold">定制寄语</h2>
                    <p className="text-white/60 text-xs font-serif mt-2">Custom Message</p>
                </div>
                
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="在此输入您的祝福语..."
                    maxLength={140}
                    rows={4}
                    className="w-full bg-black/30 border border-[#D4AF37]/50 rounded-lg p-3 text-white font-serif placeholder-white/30 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] mb-6 resize-none"
                    style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                />

                <div className="flex gap-3">
                    <button 
                        onClick={handleClear}
                        className="flex-1 px-4 py-2 border border-[#D4AF37]/50 text-[#D4AF37] rounded-full font-serif text-sm hover:bg-[#D4AF37]/10 transition-colors"
                    >
                        清空恢复
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-full font-serif text-sm hover:bg-[#FEDC56] transition-colors shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                    >
                        确认生成
                    </button>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [treeState, setTreeState] = useState<TreeState>(TreeState.CHAOS);
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    
    // Split Back Photo State
    const [backImgUrl, setBackImgUrl] = useState<string | null>(null);
    const [backText, setBackText] = useState<string>("Wish you\nwere here.");

    const [isClearing, setIsClearing] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const pressTimer = useRef<number | null>(null);
    const startPos = useRef<{ x: number, y: number } | null>(null);
    const hasMoved = useRef(false);

    // Dynamic Document Title
    useEffect(() => {
        const focusTitle = "⛄ 圣诞快乐！🎄";
        const blurTitle = " 🌟Polaroid Grand Luxury Christmas Tree🎁";

        const handleFocus = () => { document.title = focusTitle; };
        const handleBlur = () => { document.title = blurTitle; };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        // Set initial title
        document.title = document.hasFocus() ? focusTitle : blurTitle;

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    const handleStart = useCallback((e: any) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startPos.current = { x: clientX, y: clientY };
        hasMoved.current = false;
        pressTimer.current = window.setTimeout(() => {
            if (!hasMoved.current) {
                setTreeState(prev => prev === TreeState.CHAOS ? TreeState.FORMED : TreeState.CHAOS);
            }
        }, 1800);
    }, []);

    const handleMove = useCallback((e: any) => {
        if (!startPos.current) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const distance = Math.sqrt(Math.pow(clientX - startPos.current.x, 2) + Math.pow(clientY - startPos.current.y, 2));
        if (distance > 10) {
            hasMoved.current = true;
            if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
        }
    }, []);

    const handleEnd = useCallback(() => {
        startPos.current = null;
        if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    }, []);

    const handleBackgroundClick = useCallback(() => {
        if (isMenuOpen) setIsMenuOpen(false);
    }, [isMenuOpen]);

    const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setIsProcessing(true);
        const newPhotos = [...photos];
        for (let i = 0; i < files.length; i++) {
            if (newPhotos.length >= MAX_PHOTOS) break;
            const { url } = await processImage(files[i]);
            newPhotos.push({ url, height: STANDARD_HEIGHT });
        }
        setPhotos(newPhotos);
        setIsProcessing(false);
        e.target.value = '';
    }, [photos]);

    const handleFreeRatioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setIsProcessing(true);
        const newPhotos = [...photos];
        for (let i = 0; i < files.length; i++) {
            if (newPhotos.length >= MAX_PHOTOS) break;
            const { url, width, height } = await processImage(files[i]);
            const aspectRatio = height / width;
            const dynamicHeight = FRAME_WIDTH * aspectRatio;
            newPhotos.push({ url, height: dynamicHeight });
        }
        setPhotos(newPhotos);
        setIsProcessing(false);
        e.target.value = '';
    }, [photos]);

    const handleBackPhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessing(true);
        const { url } = await processImage(file);
        
        if (backImgUrl && backImgUrl.startsWith('blob:')) {
            URL.revokeObjectURL(backImgUrl);
        }
        
        setBackImgUrl(url); // Set Image
        setIsProcessing(false);
        e.target.value = '';
    }, [backImgUrl]);

    const handleUpdateMessage = (text: string) => {
        setIsProcessing(true);
        setBackText(text); 
        // If updating text, we should probably clear the image so text shows?
        // Or keep image? Prompt says "adapt text". 
        // If image is set, usually we show image. If text is set, we show text.
        // Let's clear image to ensure text is visible.
        if (backImgUrl && backImgUrl.startsWith('blob:')) {
            URL.revokeObjectURL(backImgUrl);
        }
        setBackImgUrl(null);
        setIsMessageOpen(false);
        setTimeout(() => setIsProcessing(false), 500);
    };

    const handleClearMessage = () => {
        setIsProcessing(true);
        setBackText(""); // Default fallback
        if (backImgUrl && backImgUrl.startsWith('blob:')) {
             URL.revokeObjectURL(backImgUrl);
        }
        setBackImgUrl(null);
        setIsMessageOpen(false);
        setTimeout(() => setIsProcessing(false), 500);
    };

    const clearPhotos = useCallback(() => {
        setIsClearing(true);
        setTimeout(() => { 
            photos.forEach(item => {
                if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
            });
            setPhotos([]); 
            setIsClearing(false); 
        }, 800);
    }, [photos]);

    // Record toggle handler
    const toggleRecording = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRecording(prev => !prev);
    }, []);

    // Stable handler for stopping recording to prevent unnecessary effect cleanup in Recorder
    const handleRecordStop = useCallback(() => {
        setIsRecording(false);
    }, []);

    return (
        <ErrorBoundary>
            <div 
                className="fixed inset-0 bg-[#011510] select-none touch-none overflow-hidden"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                onClick={handleBackgroundClick}
            >
                {/* 
                  Removed outer Suspense to prevent Scene (and thus Recorder) 
                  from unmounting when internal assets load (e.g., new photos).
                  Suspense is now handled inside Scene.tsx.
                */}
                <Scene 
                    treeState={treeState} 
                    photos={photos} 
                    backPhotoUrl={backImgUrl} 
                    backText={backText}
                    isClearing={isClearing} 
                    isRecording={isRecording}
                    onRecordStop={handleRecordStop}
                />

                <Loader />
                <ProcessingOverlay isProcessing={isProcessing} />
                <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
                <MessageModal 
                    isOpen={isMessageOpen} 
                    onClose={() => setIsMessageOpen(false)} 
                    onConfirm={handleUpdateMessage}
                    onClear={handleClearMessage}
                />

                {/* Recording Indicator - Shows when menu is closed but recording is active */}
                {isRecording && !isMenuOpen && (
                    <div className="fixed top-6 right-6 z-[50] flex items-center gap-2 animate-pulse">
                         <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(255,0,0,0.8)]"></div>
                         <span className="text-red-500 font-mono text-xs tracking-widest uppercase font-bold">REC</span>
                    </div>
                )}

                <div 
                    className="absolute right-4 sm:right-8 z-[55] flex items-center justify-end overflow-visible"
                    style={{ bottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
                >
                    <div 
                        className={`absolute right-0 flex items-center gap-2 sm:gap-4 p-1 bg-black/80 backdrop-blur-3xl border border-luxury-gold rounded-full px-4 sm:px-6 py-2 shadow-[0_10px_50px_rgba(0,0,0,0.8)] transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1) overflow-x-auto no-scrollbar ${isMenuOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-[110%] opacity-0 scale-95 pointer-events-none'}`}
                        style={{ 
                            whiteSpace: 'nowrap', 
                            maxWidth: 'calc(100vw - 2.5rem)',
                            color: '#D4AF37',
                            transform: 'translateZ(0)',
                            backfaceVisibility: 'hidden',
                            scrollbarWidth: 'none'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={() => setIsMenuOpen(false)} className="hover:scale-110 transition-transform p-1 shrink-0">
                            <IconChevronRight />
                        </button>

                        <div className="w-[1px] h-4 bg-luxury-gold/40 shrink-0" />
                        
                        <button
                            onClick={toggleRecording}
                            className={`flex items-center gap-2 cursor-pointer transition-colors text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] px-1 font-serif shrink-0 ${isRecording ? 'text-red-500 hover:text-red-400' : 'text-luxury-gold hover:text-luxury-gold-light'}`}
                        >
                            <IconRecord isRecording={isRecording} />
                            <span className="shrink-0" style={{ transform: 'translateZ(0)' }}>
                                <span className="hidden sm:inline">{isRecording ? 'STOP' : 'REC'}</span>
                            </span>
                        </button>

                        <div className="w-[1px] h-4 bg-luxury-gold/40 shrink-0" />
                        
                        <label className="flex items-center gap-2 cursor-pointer text-luxury-gold hover:text-luxury-gold-light transition-colors text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] px-1 font-serif shrink-0">
                            <IconUpload />
                            <span className="text-luxury-gold shrink-0" style={{ transform: 'translateZ(0)' }}>
                                <span className="hidden sm:inline">STD</span>
                            </span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photos.length >= MAX_PHOTOS} />
                        </label>
                        
                        <div className="w-[1px] h-4 bg-luxury-gold/40 shrink-0" />

                        <label className="flex items-center gap-2 cursor-pointer text-luxury-gold hover:text-luxury-gold-light transition-colors text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] px-1 font-serif shrink-0">
                            <IconFreeRatio />
                            <span className="text-luxury-gold shrink-0" style={{ transform: 'translateZ(0)' }}>
                                <span className="hidden sm:inline">FREE</span>
                            </span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFreeRatioUpload} disabled={photos.length >= MAX_PHOTOS} />
                        </label>

                        <div className="w-[1px] h-4 bg-luxury-gold/40 shrink-0" />

                        <label className="flex items-center gap-2 cursor-pointer text-luxury-gold hover:text-luxury-gold-light transition-colors text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] px-1 font-serif shrink-0">
                            <IconBackImage />
                            <span className="text-luxury-gold shrink-0" style={{ transform: 'translateZ(0)' }}>
                                <span className="hidden sm:inline">BACK</span>
                            </span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleBackPhotoUpload} />
                        </label>

                        <div className="w-[1px] h-4 bg-luxury-gold/40 shrink-0" />

                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMessageOpen(true); }}
                            className="flex items-center gap-2 cursor-pointer text-luxury-gold hover:text-luxury-gold-light transition-colors text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] px-1 font-serif shrink-0"
                        >
                            <IconMessage size={16} />
                            <span className="text-luxury-gold shrink-0" style={{ transform: 'translateZ(0)' }}>
                                <span className="hidden sm:inline">TEXT</span>
                            </span>
                        </button>

                        <div className="w-[1px] h-4 bg-luxury-gold/40 shrink-0" />

                        <button
                            onClick={(e) => { e.stopPropagation(); setIsHelpOpen(true); }}
                            className="flex items-center gap-2 cursor-pointer text-luxury-gold hover:text-luxury-gold-light transition-colors text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] px-1 font-serif shrink-0"
                        >
                            <IconInfo size={16} />
                            <span className="text-luxury-gold shrink-0" style={{ transform: 'translateZ(0)' }}>
                                <span className="hidden sm:inline">INFO</span>
                            </span>
                        </button>

                        {photos.length > 0 && (
                            <>
                                <div className="w-[1px] h-4 bg-luxury-gold/40 shrink-0" />
                                <button onClick={clearPhotos} className="text-luxury-gold hover:text-red-500 transition-colors p-1 shrink-0">
                                    <IconTrash />
                                </button>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }}
                        className={`flex items-center justify-center p-3 rounded-full bg-black/60 border border-luxury-gold shadow-[0_0_20px_rgba(212,175,55,0.4)] backdrop-blur-xl transition-all duration-500 ${isMenuOpen ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100 active:scale-90 hover:bg-luxury-gold/20'}`}
                    >
                        <IconChevronLeft />
                    </button>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default App;