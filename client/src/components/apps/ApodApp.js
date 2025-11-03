import React from 'react';
import useApi from '../../hooks/useApi';
import { getApod } from '../../services/api';
import { useApps } from '../../contexts/AppContext';

const ApodApp = () => {
    const { data, loading, error } = useApi(getApod);
    const { openApp } = useApps();

    if (loading) return <p className="p-2">Loading image...</p>;
    if (error) return <p className="p-2">Error: NASA APOD API may be temporarily down.</p>;
    if (!data) return null;

    return (
        <div className="font-geneva text-sm text-black p-2 flex flex-col h-full">
            <h2 className="font-bold text-base mb-2 shrink-0">{data.title}</h2>
            
            {data.media_type === 'image' ? (
                <div 
                    className="mb-2 shrink-0 cursor-pointer"
                    onClick={() => openApp('imageViewer', { hdurl: data.hdurl, title: data.title })}
                    title="Click to view in high definition"
                >
                    <img 
                        src={data.url} 
                        alt={data.title} 
                        className="w-full h-auto border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white"
                    />
                </div>
            ) : (
                <p className="mb-2 shrink-0">Today's APOD is a video. <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Watch here</a>.</p>
            )}

            {/* THIS IS THE FIX: flex-grow allows this div to take up remaining space, and overflow-y-auto makes it scrollable */}
            <div className="text-xs overflow-y-auto flex-grow mb-2">
                <p className="italic">Date: {data.date}</p>
                <p className="mt-2 text-justify">{data.explanation}</p>
            </div>
            
            {data.media_type === 'image' && (
                 <div className="text-xs border-t border-gray-400 pt-2 mt-auto shrink-0">
                    <p className="font-bold mb-1">Downloads:</p>
                    <a href={data.url} target="_blank" rel="noreferrer" className="text-blue-700 underline mr-4">Standard Quality</a>
                    <a href={data.hdurl} target="_blank" rel="noreferrer" className="text-blue-700 underline">High Definition</a>
                 </div>
            )}
        </div>
    );
};

export default ApodApp;
