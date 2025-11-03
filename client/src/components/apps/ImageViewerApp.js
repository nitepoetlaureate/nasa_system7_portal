import React from 'react';
import { useApps } from '../../contexts/AppContext';

const ImageViewerApp = () => {
    const { apps } = useApps();
    const { hdurl, title } = apps.imageViewer.data || {};

    if (!hdurl) return <div className="p-4">No image to display.</div>;

    return (
        <div className="w-full h-full bg-black flex items-center justify-center overflow-auto">
            <img src={hdurl} alt={`High-resolution view of ${title}`} className="max-w-full max-h-full object-contain"/>
        </div>
    );
};

export default ImageViewerApp;
