import React, { createContext, useState, useContext, useCallback } from 'react';
import ApodApp from '../components/apps/ApodApp';
import NeoWsApp from '../components/apps/NeoWsApp';
import ResourceNavigatorApp from '../components/apps/ResourceNavigatorApp';
import ImageViewerApp from '../components/apps/ImageViewerApp';

const AppContext = createContext();

const initialApps = {
  'apod': { id: 'apod', name: 'Picture of the Day', component: ApodApp, isOpen: false, zIndex: 10, pos: { x: 50, y: 50 } },
  'neows': { id: 'neows', name: 'Near Earth Objects', component: NeoWsApp, isOpen: false, zIndex: 10, pos: { x: 100, y: 100 } },
  'resources': { id: 'resources', name: 'Resource Navigator', component: ResourceNavigatorApp, isOpen: false, zIndex: 10, pos: { x: 150, y: 150 } },
  'imageViewer': { id: 'imageViewer', name: 'HD Image Viewer', component: ImageViewerApp, isOpen: false, zIndex: 10, pos: { x: 200, y: 200 }, data: null },
};

export const AppProvider = ({ children }) => {
  const [apps, setApps] = useState(initialApps);
  const [activeApp, setActiveApp] = useState(null);

  const openApp = useCallback((appId, data = null) => {
    setApps(prevApps => {
      const newApps = { ...prevApps };
      const maxZ = Math.max(0, ...Object.values(newApps).map(app => app.zIndex));
      
      newApps[appId] = { ...newApps[appId], isOpen: true, zIndex: maxZ + 1, data };
      
      return newApps;
    });
    setActiveApp(appId);
  }, []);

  const closeApp = useCallback((appId) => {
    setApps(prevApps => ({
      ...prevApps,
      [appId]: { ...prevApps[appId], isOpen: false },
    }));
    if (activeApp === appId) setActiveApp(null);
  }, [activeApp]);

  const bringToFront = useCallback((appId) => {
    if (activeApp === appId) return;
    setApps(prevApps => {
      const newApps = { ...prevApps };
      const maxZ = Math.max(0, ...Object.values(newApps).map(app => app.zIndex));
      newApps[appId] = { ...newApps[appId], zIndex: maxZ + 1 };
      return newApps;
    });
    setActiveApp(appId);
  }, [activeApp]);
  
  const updateAppPosition = useCallback((appId, newPos) => {
    setApps(prevApps => ({ ...prevApps, [appId]: { ...prevApps[appId], pos: newPos }}));
  }, []);

  const value = { apps, openApp, closeApp, bringToFront, updateAppPosition, activeApp };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApps = () => useContext(AppContext);
