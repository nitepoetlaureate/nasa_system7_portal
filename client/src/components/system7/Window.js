import React, { useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApps } from '../../contexts/AppContext';
import { usePerformanceMonitor } from '../../hooks/usePerformanceOptimized';

const Window = ({ children, title, appId, initialPos }) => {
    const { apps, closeApp, bringToFront, updateAppPosition } = useApps();
    const constraintsRef = useRef(null);
    const appState = apps[appId];

    // Performance monitoring
    usePerformanceMonitor(`Window-${appId}`);

    // Optimized drag handler with throttling
    const handleDragEnd = useCallback((event, info) => {
        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
            updateAppPosition(appId, { x: info.point.x, y: info.point.y });
        });
    }, [appId, updateAppPosition]);

    // Optimized focus handler
    const handleFocus = useCallback(() => {
        requestAnimationFrame(() => {
            bringToFront(appId);
        });
    }, [appId, bringToFront]);

    // Optimized close handler
    const handleClose = useCallback((e) => {
        e.stopPropagation();
        closeApp(appId);
    }, [appId, closeApp]);

    if (!appState?.isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                key={appId}
                drag
                dragMomentum={false}
                dragConstraints={constraintsRef}
                dragHandle=".drag-handle"
                onDragEnd={handleDragEnd}
                onMouseDown={handleFocus}
                initial={{ x: initialPos.x, y: initialPos.y, opacity: 0, scale: 0.9 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        duration: 0.2
                    }
                }}
                exit={{
                    opacity: 0,
                    scale: 0.9,
                    transition: { duration: 0.15 }
                }}
                className="absolute flex flex-col w-[550px] min-w-[300px] h-[450px] min-h-[200px] bg-s7-gray border-2 border-t-white border-l-white border-r-black border-b-black shadow-s7-window will-change-transform"
                style={{
                    zIndex: appState.zIndex,
                    overflow: 'hidden',
                    resize: 'both',
                    // Hardware acceleration hints
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                }}
            >
                <header
                    className="drag-handle h-6 border-b-2 border-b-black p-1 flex items-center cursor-move select-none shrink-0 bg-s7-stripes"
                    style={{ willChange: 'transform' }}
                >
                    <button
                        onClick={handleClose}
                        className="w-4 h-4 border-t-black border-l-black border-r-white border-b-white border-2 mr-2 bg-s7-gray shadow-s7-outset active:shadow-s7-inset hover:bg-s7-gray-dark transition-colors"
                        aria-label="Close window"
                    />
                    <div className="flex-grow font-chicago text-black h-full flex items-center justify-center">
                        <span className="truncate px-2">{title}</span>
                    </div>
                </header>

                <main className="flex-grow p-1 m-1 overflow-hidden bg-white border-t-black border-l-black border-r-white border-b-white border-2">
                    <div className="w-full h-full overflow-auto">
                        {children}
                    </div>
                </main>

                {/* Resize handle */}
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-s7-stripes hover:bg-s7-gray-dark transition-colors"
                    style={{ zIndex: 10 }}
                />
            </motion.div>

            {/* Drag constraints container */}
            <div ref={constraintsRef} className="absolute top-6 left-0 right-0 bottom-0 pointer-events-none" />
        </AnimatePresence>
    );
};

// Memoize component to prevent unnecessary re-renders
export default memo(Window, (prevProps, nextProps) => {
    return (
        prevProps.appId === nextProps.appId &&
        prevProps.title === nextProps.title &&
        prevProps.children === nextProps.children &&
        JSON.stringify(prevProps.initialPos) === JSON.stringify(nextProps.initialPos)
    );
});