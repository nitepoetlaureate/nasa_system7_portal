import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useApps } from '../../contexts/AppContext';

const Window = ({ children, title, appId, initialPos }) => {
    const { apps, closeApp, bringToFront, updateAppPosition } = useApps();
    const constraintsRef = useRef(null);
    const appState = apps[appId];

    const handleDragEnd = (event, info) => {
        updateAppPosition(appId, { x: info.point.x, y: info.point.y });
    };

    return (
        <>
            <div ref={constraintsRef} className="absolute top-6 left-0 right-0 bottom-0 pointer-events-none" />
            <motion.div
                drag
                dragMomentum={false}
                dragConstraints={constraintsRef}
                dragHandle=".drag-handle"
                onDragEnd={handleDragEnd}
                onMouseDown={() => bringToFront(appId)}
                initial={{ x: initialPos.x, y: initialPos.y }}
                className="absolute flex flex-col w-[550px] min-w-[300px] h-[450px] min-h-[200px] bg-s7-gray border-2 border-t-white border-l-white border-r-black border-b-black shadow-s7-window"
                style={{ zIndex: appState.zIndex, overflow: 'hidden', resize: 'both' }} // <-- THE FIX: CSS resize enabled
            >
                <header className="drag-handle h-6 border-b-2 border-b-black p-1 flex items-center cursor-move select-none shrink-0">
                    <button 
                        onClick={() => closeApp(appId)}
                        className="w-4 h-4 border-t-black border-l-black border-r-white border-b-white border-2 mr-2 bg-s7-gray shadow-s7-outset active:shadow-s7-inset"
                    />
                    <div className="flex-grow font-chicago text-black bg-s7-stripes h-full" />
                    <span className="absolute left-8 font-chicago text-black">{title}</span>
                </header>
                <main className="flex-grow p-1 m-1 overflow-hidden bg-white border-t-black border-l-black border-r-white border-b-white border-2">
                    {children}
                </main>
                {/* THIS IS THE FIX: A visible resize handle in the classic Mac style */}
                <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-s7-stripes" />
            </motion.div>
        </>
    );
};

export default Window;
