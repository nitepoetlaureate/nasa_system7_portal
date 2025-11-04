import React, { useState, useRef, useEffect, useCallback } from 'react';

const EnhancedImageViewer = ({ image, title, onClose, onPrevious, onNext, hasNext, hasPrevious }) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showControls, setShowControls] = useState(true);
    const [imageMetadata, setImageMetadata] = useState(null);
    const [loadingMetadata, setLoadingMetadata] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [fullscreen, setFullscreen] = useState(false);

    const imageRef = useRef(null);
    const containerRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

    // Image analysis for metadata
    useEffect(() => {
        const analyzeImage = async () => {
            if (!image?.url) return;

            setLoadingMetadata(true);
            try {
                const img = new Image();
                img.onload = () => {
                    setImageMetadata({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2),
                        megapixels: ((img.naturalWidth * img.naturalHeight) / 1000000).toFixed(2),
                        fileSize: null // Would need to fetch this separately
                    });
                    setLoadingMetadata(false);
                };
                img.src = image.url;
            } catch (error) {
                console.error('Failed to analyze image:', error);
                setLoadingMetadata(false);
            }
        };

        analyzeImage();
    }, [image?.url]);

    // Auto-hide controls
    useEffect(() => {
        const resetControlsTimeout = () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        };

        resetControlsTimeout();

        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [showControls]);

    // Handle mouse movement
    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    }, []);

    // Zoom controls
    const handleZoomIn = useCallback(() => {
        setZoom(prev => Math.min(prev * 1.2, 5));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(prev => Math.max(prev / 1.2, 0.1));
    }, []);

    const handleZoomReset = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setRotation(0);
        setBrightness(100);
        setContrast(100);
    }, []);

    // Pan controls
    const handleMouseDown = useCallback((e) => {
        if (zoom <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        e.preventDefault();
    }, [zoom, pan]);

    const handleMouseMoveDrag = useCallback((e) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case '+':
                case '=':
                    handleZoomIn();
                    break;
                case '-':
                case '_':
                    handleZoomOut();
                    break;
                case '0':
                    handleZoomReset();
                    break;
                case 'ArrowLeft':
                    if (hasPrevious) onPrevious();
                    break;
                case 'ArrowRight':
                    if (hasNext) onNext();
                    break;
                case 'f':
                    setFullscreen(prev => !prev);
                    break;
                case 'r':
                    setRotation(prev => prev + 90);
                    break;
                case 'ArrowUp':
                    setBrightness(prev => Math.min(prev + 10, 200));
                    break;
                case 'ArrowDown':
                    setBrightness(prev => Math.max(prev - 10, 0));
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, handleZoomIn, handleZoomOut, handleZoomReset, hasPrevious, hasNext, onPrevious, onNext]);

    // Wheel zoom
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 5));
    }, []);

    // Download functionality
    const handleDownload = useCallback(async () => {
        try {
            const url = image?.hdurl || image?.url;
            if (!url) return;

            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `apod-${image?.date || 'image'}-${new Date().getTime()}.jpg`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Download failed:', error);
        }
    }, [image]);

    // Share functionality
    const handleShare = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title || 'NASA APOD',
                    text: image?.explanation || 'Check out this amazing astronomy picture!',
                    url: window.location.href
                });
            } catch (error) {
                console.log('Share failed:', error);
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
        }
    }, [title, image]);

    return (
        <div
            className={`fixed inset-0 bg-black z-50 flex items-center justify-center ${fullscreen ? '' : 'p-4'}`}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
        >
            {/* Main Image Container */}
            <div
                ref={containerRef}
                className={`relative ${fullscreen ? 'w-full h-full' : 'max-w-full max-h-full'} overflow-hidden`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMoveDrag}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default' }}
            >
                {image?.url && (
                    <img
                        ref={imageRef}
                        src={image.url}
                        alt={title || 'APOD Image'}
                        className={`max-w-full max-h-full object-contain transition-transform duration-200`}
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                            filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                            transformOrigin: 'center'
                        }}
                        draggable={false}
                    />
                )}

                {/* Loading Metadata Indicator */}
                {loadingMetadata && (
                    <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-xs">
                        Analyzing image...
                    </div>
                )}

                {/* Image Info Overlay */}
                {imageMetadata && (
                    <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded max-w-xs">
                        <h3 className="font-bold mb-2">{title || 'APOD Image'}</h3>
                        <div className="text-xs space-y-1">
                            <div>📐 {imageMetadata.width} × {imageMetadata.height} px</div>
                            <div>📊 {imageMetadata.megapixels} MP</div>
                            <div>📱 {imageMetadata.aspectRatio}:1 ratio</div>
                            {image?.date && <div>📅 {image.date}</div>}
                            {image?.copyright && <div>©️ {image.copyright}</div>}
                        </div>
                    </div>
                )}

                {/* Navigation Arrows */}
                {(hasPrevious || hasNext) && (
                    <>
                        {hasPrevious && (
                            <button
                                onClick={onPrevious}
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all"
                                aria-label="Previous image"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        {hasNext && (
                            <button
                                onClick={onNext}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all"
                                aria-label="Next image"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </>
                )}

                {/* Controls */}
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="flex items-center justify-between text-white">
                        <div className="flex items-center space-x-4">
                            {/* Zoom Controls */}
                            <div className="flex items-center space-x-2 bg-black/50 rounded-full px-3 py-2">
                                <button
                                    onClick={handleZoomOut}
                                    className="hover:bg-white/20 rounded-full p-1 transition-colors"
                                    aria-label="Zoom out"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </button>
                                <span className="text-xs min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                                <button
                                    onClick={handleZoomIn}
                                    className="hover:bg-white/20 rounded-full p-1 transition-colors"
                                    aria-label="Zoom in"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleZoomReset}
                                    className="hover:bg-white/20 rounded-full p-1 transition-colors"
                                    aria-label="Reset view"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>

                            {/* Rotation */}
                            <button
                                onClick={() => setRotation(prev => prev + 90)}
                                className="bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
                                aria-label="Rotate image"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>

                            {/* Fullscreen */}
                            <button
                                onClick={() => setFullscreen(prev => !prev)}
                                className="bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
                                aria-label="Toggle fullscreen"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            {/* Brightness/Contrast */}
                            <div className="flex items-center space-x-2 bg-black/50 rounded-full px-3 py-2">
                                <span className="text-xs">☀️</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    value={brightness}
                                    onChange={(e) => setBrightness(Number(e.target.value))}
                                    className="w-20"
                                />
                                <span className="text-xs">🔆</span>
                            </div>

                            {/* Action Buttons */}
                            <button
                                onClick={handleDownload}
                                className="bg-black/50 hover:bg-black/70 rounded-full px-3 py-2 text-xs transition-colors"
                            >
                                💾 Download
                            </button>
                            <button
                                onClick={handleShare}
                                className="bg-black/50 hover:bg-black/70 rounded-full px-3 py-2 text-xs transition-colors"
                            >
                                📤 Share
                            </button>
                            <button
                                onClick={onClose}
                                className="bg-red-600 hover:bg-red-700 rounded-full px-3 py-2 text-xs transition-colors"
                            >
                                ✕ Close
                            </button>
                        </div>
                    </div>

                    {/* Keyboard Shortcuts Help */}
                    <div className="text-xs text-gray-300 mt-2 text-center">
                        ESC: Close | ←→: Navigate | +/-: Zoom | R: Rotate | F: Fullscreen | ↑↓: Brightness
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedImageViewer;