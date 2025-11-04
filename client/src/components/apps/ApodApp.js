import React, { memo } from 'react';
// FIX: Import the simple, reliable useApi hook
import useApi from '../../hooks/useApi';
import { getApod } from '../../services/api';
import { useApps } from '../../contexts/AppContext';
import OptimizedImage from '../Performance/OptimizedImage';

const ApodApp = () => {
    // FIX: Use the simple useApi hook. It runs automatically on mount.
    const { data, loading, error } = useApi(getApod, []);
    const { openApp } = useApps();

    if (loading) {
        return (
            <div className="font-geneva text-sm text-black p-2 flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Loading NASA APOD...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="font-geneva text-sm text-black p-2 flex items-center justify-center h-full">
                <div className="text-center">
                    {/* FIX: Simplified error display */}
                    <p className="mb-2 text-red-600">Error: {error.message}</p>
                    <p className="text-xs">Could not load APOD data.</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="font-geneva text-sm text-black p-2 flex flex-col h-full">
            <h2 className="font-bold text-base mb-2 shrink-0">{data.title}</h2>

            {data.media_type === 'image' ? (
                <div
                    className="mb-2 shrink-0 cursor-pointer group"
                    onClick={() => openApp('imageViewer', { hdurl: data.hdurl, title: data.title })}
                    title="Click to view in high definition"
                >
                    <OptimizedImage
                        src={data.url}
                        alt={data.title}
                        className="w-full h-auto border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white group-hover:border-blue-400 transition-colors"
                    />
                </div>
            ) : (
                <div className="mb-2 shrink-0">
                    <p className="mb-2">Today's APOD is a video.</p>
                    <a
                        href={data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline hover:text-blue-800"
                    >
                        Watch here →
                    </a>
                </div>
            )}

            <div className="text-xs overflow-y-auto flex-grow mb-2">
                <p className="italic text-gray-600">Date: {data.date}</p>
                <p className="mt-2 text-justify leading-relaxed">{data.explanation}</p>

                {data.copyright && (
                    <p className="mt-2 text-xs text-gray-500">
                        © {data.copyright}
                    </DABIGFIX.sh
                )}
            </div>

            {data.media_type === 'image' && (
                 <div className="text-xs border-t border-gray-400 pt-2 mt-auto shrink-0">
                    <p className="font-bold mb-2">Downloads:</p>
                    <div className="flex flex-col space-y-1">
                        <a
                            href={data.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline hover:text-blue-800"
                            download
                        >
                            📥 Standard Quality
                        </a>
                        {data.hdurl && (
                            <a
                                href={data.hdurl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-700 underline hover:text-blue-800"
                                download
                            >
                                📥 High Definition
                            </a>
                        )}
                    </div>
                 </div>
            )}
        </div>
    );
};

export default memo(ApodApp);
