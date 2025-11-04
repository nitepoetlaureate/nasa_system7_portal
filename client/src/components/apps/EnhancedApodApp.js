import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedApi } from '../../hooks/usePerformanceOptimized';
import { getApod, getApodForDate } from '../../services/api';
import { useApps } from '../../contexts/AppContext';
import OptimizedImage from '../Performance/OptimizedImage';

// Helper component
const DetailRow = ({ label, value }) => (
    <div className="flex justify-between border-b border-gray-300 py-0.5">
        <span className="font-bold shrink-0 pr-2">{label}:</span>
        <span className="truncate text-right">{value}</span>
    </div>
);

const EnhancedApodApp = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState('single'); // 'single' | 'gallery' | 'timeline'
    const [showMetadata, setShowMetadata] = useState(false);
    const [imageZoom, setImageZoom] = useState(1);
    const [fullscreenImage, setFullscreenImage] = useState(false);
    const [galleryPage, setGalleryPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState([]);
    const [downloadingImage, setDownloadingImage] = useState(false);

    // CRITICAL FIX: Memoize API function to prevent infinite re-renders
    const apiFunction = useMemo(() => {
        return selectedDate === new Date().toISOString().split('T')[0] ? getApod : () => getApodForDate(selectedDate);
    }, [selectedDate]);

    const { data, loading, error, execute } = useOptimizedApi(
        apiFunction,
        { retries: 3, retryDelay: 1000 }
    );

    const { openApp } = useApps();

    // Load favorites from localStorage
    useEffect(() => {
        const storedFavorites = localStorage.getItem('apodFavorites');
        if (storedFavorites) {
            setFavorites(JSON.parse(storedFavorites));
        }
    }, []);

    
    // ** THIS IS THE FIX **
    // The dependency array was incorrect, which prevented the API call
    // from re-running when the date (and thus apiFunction) changed.
    useEffect(() => {
        execute();
    }, [apiFunction, execute]); // This now correctly re-runs when the API function changes

    // Save favorites to localStorage
    const toggleFavorite = () => {
        let newFavorites = [...favorites];
        const existingIndex = newFavorites.findIndex(fav => fav.date === data.date);

        if (existingIndex > -1) {
            newFavorites.splice(existingIndex, 1);
        } else {
            newFavorites.push({ date: data.date, title: data.title, url: data.url });
        }
        setFavorites(newFavorites);
        localStorage.setItem('apodFavorites', JSON.stringify(newFavorites));
    };

    const isFavorite = useMemo(() => {
        return favorites.some(fav => fav.date === data?.date);
    }, [favorites, data]);


    // Keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (fullscreenImage) {
            if (e.key === 'Escape') setFullscreenImage(false);
            return;
        }

        if (e.key === 'ArrowLeft') {
            const prevDate = new Date(selectedDate);
            prevDate.setDate(prevDate.getDate() - 1);
            setSelectedDate(prevDate.toISOString().split('T')[0]);
        } else if (e.key === 'ArrowRight') {
            const nextDate = new Date(selectedDate);
            nextDate.setDate(nextDate.getDate() + 1);
            if (nextDate <= new Date()) { // Don't go to future
                setSelectedDate(nextDate.toISOString().split('T')[0]);
            }
        } else if (e.key.toLowerCase() === 'm') {
            setShowMetadata(prev => !prev);
        } else if (e.key.toLowerCase() === 'f') {
            setFullscreenImage(true);
        }
    }, [selectedDate, fullscreenImage]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);


    // Main render
    if (loading) {
        return (
            <div className="font-geneva text-sm text-black p-2 flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Loading APOD for {selectedDate}...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="font-geneva text-sm text-black p-2 flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="mb-2 text-red-600">Error: {error.message}</p>
                    <button
                        onClick={execute}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="font-geneva text-sm text-black p-2 flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-2 shrink-0">
                <h2 className="font-bold text-base truncate">{data.title}</h2>
                <div className="flex space-x-2">
                    <button onClick={toggleFavorite} className="text-xl">
                        {isFavorite ? '★' : '☆'}
                    </button>
                    <button onClick={() => setShowMetadata(prev => !prev)} className="text-xs px-2 py-1 bg-gray-200 border border-gray-400 rounded">
                        {showMetadata ? 'Hide' : 'Show'} Info
                    </button>
                </div>
            </div>

            {/* Date Navigation */}
            <div className="flex justify-between items-center mb-2 shrink-0">
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]} // Disable future dates
                    className="border border-gray-300 px-1 py-0.5 text-xs"
                />
            </div>

            {/* Content */}
            <div className="flex-grow flex h-0">
                {/* Image/Video */}
                <div className="w-2/3 h-full overflow-hidden flex items-center justify-center bg-black border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white">
                    {data.media_type === 'image' ? (
                        <OptimizedImage
                            src={data.url}
                            alt={data.title}
                            className="object-contain w-full h-full cursor-zoom-in"
                            onClick={() => setFullscreenImage(true)}
                        />
                    ) : (
                        <iframe
                            src={data.url}
                            title={data.title}
                            frameBorder="0"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            className="w-full h-full"
                        />
                    )}
                </div>

                {/* Metadata/Explanation */}
                <div className="w-1/3 h-full ml-1 overflow-y-auto text-xs p-2 border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white bg-white">
                    {showMetadata ? (
                        <>
                            <h3 className="font-bold mb-2">Metadata</h3>
                            <DetailRow label="Date" value={data.date} />
                            <DetailRow label="Media Type" value={data.media_type} />
                            <DetailRow label="Service Ver" value={data.service_version} />
                            {data.copyright && <DetailRow label="Copyright" value={data.copyright} />}
                            <a
                                href={data.hdurl || data.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-700 underline mt-2 block"
                            >
                                Download {data.hdurl ? 'HD' : 'SD'} Image
                            </a>
                        </>
                    ) : (
                        <>
                            <h3 className="font-bold mb-2">Explanation</h3>
                            <p className="text-justify leading-relaxed">{data.explanation}</p>
                        </>
                    )}
                </div>
            </div>

            {/* Fullscreen Image Viewer */}
            {fullscreenImage && data.media_type === 'image' && (
                <div
                    className="fixed inset-0 bg-black z-50 flex items-center justify-center"
                    onClick={() => setFullscreenImage(false)}
                >
                    <div className="relative max-w-full max-h-full p-4">
                        <img
                            src={data.hdurl || data.url}
                            alt={data.title}
                            className="max-w-full max-h-full object-contain"
                        />
                        <button
                            onClick={() => setFullscreenImage(false)}
                            className="absolute top-4 right-4 text-white bg-black/50 px-3 py-2 rounded hover:bg-black/70 transition-colors"
                        >
                            ✕ Close
                        </button>
                        <div className="absolute bottom-4 left-4 text-white bg-black/50 p-3 rounded max-w-md">
                            <h3 className="font-bold mb-1">{data.title}</h3>
                            <p className="text-sm">{data.date}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyboard Shortcuts Help */}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white p-2 rounded text-xs">
                <div className="font-bold mb-1">Keyboard Shortcuts:</div>
                <div>← → Navigate dates | F Fullscreen | M Metadata</div>
            </div>
        </div>
    );
};

export default EnhancedApodApp;
