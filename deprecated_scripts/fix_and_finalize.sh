#!/bin/bash

# ==================================================================================
# Finalization Script for NASA System 7 Portal
# This script corrects zero-byte files and implements assets as code.
# ==================================================================================

echo "Starting project finalization..."

# --- 1. Remove Redundant Files ---
echo "Removing redundant draggable components..."
rm -f client/src/components/system7/Draggable.js
rm -f client/src/hooks/useDraggable.js

# --- 2. Populate Server .gitignore ---
echo "Populating server/.gitignore..."
cat << 'EOF' > server/.gitignore
# Dependencies
/node_modules

# Environment files
.env

# Log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF

# --- 3. Overwrite DesktopIcon.js to use SVG components ---
echo "Updating DesktopIcon.js to handle SVG components..."
cat << 'EOF' > client/src/components/system7/DesktopIcon.js
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
EOF

# --- 4. Update Desktop.js to use the new Icon Components ---
echo "Updating Desktop.js to reference new icon components..."
cat << 'EOF' > client/src/components/system7/Desktop.js
import React from 'react';
import { useApps } from '../../contexts/AppContext';
import Window from './Window';
import DesktopIcon from './DesktopIcon';
import { ApodIcon, NeoWsIcon, NavigatorIcon } from '../../assets/icons';

const Desktop = () => {
    const { apps, openApp } = useApps();
    const openWindows = Object.values(apps).filter(app => app.isOpen);

    return (
        <main className="p-4 h-full pt-8">
            <div className="inline-block m-4">
                <DesktopIcon name="Picture of the Day" IconComponent={ApodIcon} onDoubleClick={() => openApp('apod')} />
            </div>
            <div className="inline-block m-4">
                <DesktopIcon name="Near Earth Objects" IconComponent={NeoWsIcon} onDoubleClick={() => openApp('neows')} />
            </div>
            <div className="inline-block m-4">
                <DesktopIcon name="Resource Navigator" IconComponent={NavigatorIcon} onDoubleClick={() => openApp('resources')} />
            </div>
            
            {openWindows.map(app => {
                const AppComponent = app.component;
                return (
                    <Window 
                        key={app.id} 
                        appId={app.id} 
                        title={app.name} 
                        initialPos={app.pos}
                    >
                        <AppComponent />
                    </Window>
                );
            })}
        </main>
    );
};

export default Desktop;
EOF


# --- 5. Create SVG Icon Components as Code ---
echo "Creating icon files as SVG components..."

# First, remove the old placeholder directory and create a new one.
rm -rf client/src/assets/icons
mkdir -p client/src/assets/icons

# Create ApodIcon.js
cat << 'EOF' > client/src/assets/icons/ApodIcon.js
import React from 'react';
export const ApodIcon = () => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="black"/>
        <circle cx="16" cy="16" r="8" fill="#C0C0C0"/>
        <circle cx="17" cy="15" r="7" fill="black"/>
        <path d="M24 6L25.0607 8.93934L28 10L25.0607 11.0607L24 14L22.9393 11.0607L20 10L22.9393 8.93934L24 6Z" fill="#C0C0C0"/>
    </svg>
);
EOF

# Create NeoWsIcon.js
cat << 'EOF' > client/src/assets/icons/NeoWsIcon.js
import React from 'react';
export const NeoWsIcon = () => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="black"/>
        <path d="M3 29L29 3" stroke="#C0C0C0" strokeWidth="2" strokeDasharray="4 2"/>
        <path d="M18 10L19 8L22 7L20 10L22 13L19 12L18 14L17 12L14 13L16 10L14 7L17 8L18 10Z" fill="#C0C0C0"/>
    </svg>
);
EOF

# Create NavigatorIcon.js
cat << 'EOF' > client/src/assets/icons/NavigatorIcon.js
import React from 'react';
export const NavigatorIcon = () => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="24" height="24" fill="#C0C0C0"/>
        <rect x="4" y="4" width="24" height="24" stroke="black" strokeWidth="2"/>
        <rect x="7" y="11" width="18" height="2" fill="black"/>
        <rect x="7" y="17" width="18" height="2" fill="black"/>
        <rect x="7" y="23" width="18" height="2" fill="black"/>
        <rect x="10" y="6" width="12" height="3" fill="white" stroke="black" strokeWidth="1"/>
    </svg>
);
EOF

# Create an index.js file for easy exporting
cat << 'EOF' > client/src/assets/icons/index.js
export * from './ApodIcon';
export * from './NeoWsIcon';
export * from './NavigatorIcon';
EOF

# --- 6. Clean up old public icon directory ---
echo "Cleaning up old placeholder icon directory..."
rm -rf client/public/icons

echo "--------------------------------------------------------"
echo "✅ Project files corrected."
echo "The project is now internally consistent and ready for the final step."
echo "--------------------------------------------------------"