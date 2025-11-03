import React from 'react';

const DesktopIcon = ({ name, IconComponent, onDoubleClick }) => {
    return (
        <div 
            className="flex flex-col items-center w-24 text-center cursor-pointer"
            onDoubleClick={onDoubleClick}
        >
            <div className="w-12 h-12">
                <IconComponent />
            </div>
            <span className="mt-2 text-white bg-s7-blue px-1 select-none">{name}</span>
        </div>
    );
};

export default DesktopIcon;
