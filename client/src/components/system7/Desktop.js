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
