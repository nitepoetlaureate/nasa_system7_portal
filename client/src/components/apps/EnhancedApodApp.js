import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedApi } from '../../hooks/usePerformanceOptimized';
import { getApod, getApodForDate } from '../../services/api';
import { useApps } from '../../contexts/AppContext';
import OptimizedImage from '../Performance/OptimizedImage';

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
        const savedFavorites = localStorage.getItem('apod-favorites');
        if (savedFavorites) {
            setFavorites(JSON.parse(savedFavorites));
        }
    }, []);

    // Save favorites to localStorage
    const saveFavorite = useCallback((apodData) => {
        const newFavorites = [...favorites, { ...apodData, savedAt: new Date().toISOString() }];
        setFavorites(newFavorites);
        localStorage.setItem('apod-favorites', JSON.stringify(newFavorites));
    }, [favorites]);

    const removeFavorite = useCallback((date) => {
        const newFavorites = favorites.filter(fav => fav.date !== date);
        setFavorites(newFavorites);
        localStorage.setItem('apod-favorites', JSON.stringify(newFavorites));
    }, [favorites]);

    const isFavorite = useMemo(() => {
        return data && favorites.some(fav => fav.date === data.date);
    }, [data, favorites]);

    // CRITICAL FIX: Stabilize dependencies to prevent infinite re-renders
    const executeWithDate = useCallback(() => {
        execute();
    }, [execute]);

    useEffect(() => {
        executeWithDate();
        // CRITICAL FIX: Only selectedDate should trigger this effect
    }, [selectedDate, executeWithDate]);

    // Date navigation
    const navigateDate = useCallback((direction) => {
        const currentDate = new Date(selectedDate);
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + direction);

        // Don't allow future dates beyond today
        if (newDate <= new Date()) {
            setSelectedDate(newDate.toISOString().split('T')[0]);
        }
    }, [selectedDate]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'ArrowLeft') navigateDate(-1);
            if (e.key === 'ArrowRight') navigateDate(1);
            if (e.key === 'f' || e.key === 'F') setFullscreenImage(!fullscreenImage);
            if (e.key === 'm' || e.key === 'M') setShowMetadata(!showMetadata);
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [navigateDate, fullscreenImage, showMetadata]);

    // Image download functionality
    const downloadImage = useCallback(async (url, filename) => {
        setDownloadingImage(true);
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setDownloadingImage(false);
        }
    }, []);

    // Image zoom controls
    const zoomIn = useCallback(() => setImageZoom(prev => Math.min(prev + 0.25, 3)), []);
    const zoomOut = useCallback(() => setImageZoom(prev => Math.max(prev - 0.25, 0.5)), []);
    const resetZoom = useCallback(() => setImageZoom(1), []);

    if (loading && !data) {
        return (
            <div className="font-geneva text-sm text-black p-4 flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="mb-2">Loading NASA APOD...</p>
                    <div className="w-48 bg-gray-200 rounded-full h-2 mx-auto">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="font-geneva text-sm text-black p-4 flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                    <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
                    <p className="mb-4 text-red-700">{error.message}</p>
                    <div className="space-y-2">
                        <button
                            onClick={() => execute()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors w-full"
                        >
                            🔄 Retry
                        </button>
                        <button
                            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors w-full"
                        >
                            📅 Go to Today
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="font-geneva text-sm text-black flex flex-col h-full bg-gray-100">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center mb-3">
                    <h1 className="text-xl font-bold flex items-center">
                        🌌 Astronomy Picture of the Day
                    </h1>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setViewMode('single')}
                            className={`px-3 py-1 rounded text-xs ${viewMode === 'single' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}
                        >
                            📷 Single
                        </button>
                        <button
                            onClick={() => setViewMode('gallery')}
                            className={`px-3 py-1 rounded text-xs ${viewMode === 'gallery' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}
                        >
                            🖼️ Gallery
                        </button>
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={`px-3 py-1 rounded text-xs ${viewMode === 'timeline' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}
                        >
                            📅 Timeline
                        </button>
                    </div>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigateDate(-1)}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
                        disabled={selectedDate <= '1995-06-16'}
                    >
                        ← Previous
                    </button>

                    <div className="flex items-center space-x-3">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min="1995-06-16"
                            max={new Date().toISOString().split('T')[0]}
                            className="px-3 py-1 rounded border border-white/30 bg-white/10 text-white"
                        />
                        <button
                            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white transition-colors text-xs"
                        >
                            Today
                        </button>
                    </div>

                    <button
                        onClick={() => navigateDate(1)}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
                        disabled={selectedDate >= new Date().toISOString().split('T')[0]}
                    >
                        Next →
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'single' && (
                    <div className="h-full flex">
                        {/* Image Container */}
                        <div className="flex-1 p-4 flex items-center justify-center bg-black/5">
                            <div className="relative max-w-full max-h-full">
                                {data.media_type === 'image' ? (
                                    <>
                                        <div
                                            className="cursor-pointer transition-transform duration-300"
                                            style={{ transform: `scale(${imageZoom})` }}
                                            onClick={() => setFullscreenImage(true)}
                                        >
                                            <OptimizedImage
                                                src={imageZoom > 1 ? data.hdurl || data.url : data.url}
                                                alt={data.title}
                                                className="max-w-full max-h-[70vh] object-contain border-2 border-gray-600 shadow-lg"
                                            />
                                        </div>

                                        {/* Zoom Controls */}
                                        <div className="absolute bottom-4 right-4 bg-black/70 text-white p-2 rounded-lg space-x-2">
                                            <button onClick={zoomOut} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs">−</button>
                                            <span className="text-xs">{Math.round(imageZoom * 100)}%</span>
                                            <button onClick={zoomIn} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs">+</button>
                                            <button onClick={resetZoom} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs">Reset</button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-black/10 p-8 rounded-lg text-center">
                                        <p className="mb-4 text-lg">📹 Today's APOD is a video</p>
                                        <a
                                            href={data.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Watch Video →
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Information Panel */}
                        <div className="w-96 p-4 overflow-y-auto bg-white border-l border-gray-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-bold mb-2">{data.title}</h2>
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                                    <span>📅 {data.date}</span>
                                    <button
                                        onClick={() => isFavorite ? removeFavorite(data.date) : saveFavorite(data)}
                                        className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded transition-colors"
                                    >
                                        {isFavorite ? '❤️ Remove' : '🤍 Save'}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h3 className="font-bold mb-2 text-sm">📝 Explanation</h3>
                                <p className="text-xs leading-relaxed text-justify">{data.explanation}</p>
                            </div>

                            {data.copyright && (
                                <div className="mb-4">
                                    <h3 className="font-bold mb-1 text-sm">©️ Copyright</h3>
                                    <p className="text-xs text-gray-600">{data.copyright}</p>
                                </div>
                            )}

                            {/* Enhanced Metadata */}
                            <div className="mb-4">
                                <button
                                    onClick={() => setShowMetadata(!showMetadata)}
                                    className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-left font-bold text-sm transition-colors"
                                >
                                    📊 Technical Details {showMetadata ? '▼' : '▶'}
                                </button>

                                {showMetadata && (
                                    <div className="mt-2 p-3 bg-gray-50 rounded text-xs space-y-2">
                                        <div><strong>Media Type:</strong> {data.media_type}</div>
                                        <div><strong>Service Version:</strong> {data.service_version}</div>
                                        <div><strong>Date:</strong> {data.date}</div>
                                        {data.url && (
                                            <div>
                                                <strong>Standard URL:</strong>
                                                <a href={data.url} target="_blank" rel="noopener noreferrer" className="block ml-2 text-blue-600 hover:underline truncate">
                                                    {data.url}
                                                </a>
                                            </div>
                                        )}
                                        {data.hdurl && (
                                            <div>
                                                <strong>HD URL:</strong>
                                                <a href={data.hdurl} target="_blank" rel="noopener noreferrer" className="block ml-2 text-blue-600 hover:underline truncate">
                                                    {data.hdurl}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Download Options */}
                            {data.media_type === 'image' && (
                                <div className="mb-4">
                                    <h3 className="font-bold mb-2 text-sm">💾 Downloads</h3>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => downloadImage(data.url, `apod-${data.date}-standard.jpg`)}
                                            disabled={downloadingImage}
                                            className="w-full px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded text-xs transition-colors disabled:opacity-50"
                                        >
                                            📥 Standard Quality
                                        </button>
                                        {data.hdurl && (
                                            <button
                                                onClick={() => downloadImage(data.hdurl, `apod-${data.date}-hd.jpg`)}
                                                disabled={downloadingImage}
                                                className="w-full px-3 py-2 bg-green-100 hover:bg-green-200 rounded text-xs transition-colors disabled:opacity-50"
                                            >
                                                📥 High Definition
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Quick Actions */}
                            <div>
                                <h3 className="font-bold mb-2 text-sm">⚡ Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setFullscreenImage(true)}
                                        className="px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded text-xs transition-colors"
                                    >
                                        🔍 Fullscreen
                                    </button>
                                    <button
                                        onClick={() => openApp('imageViewer', { hdurl: data.hdurl, title: data.title })}
                                        className="px-3 py-2 bg-orange-100 hover:bg-orange-200 rounded text-xs transition-colors"
                                    >
                                        🖼️ Image Viewer
                                    </button>
                                    <button
                                        onClick={() => openApp('shareDialog', {
                                            title: data.title,
                                            url: data.url,
                                            date: data.date
                                        })}
                                        className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 rounded text-xs transition-colors"
                                    >
                                        📤 Share
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs transition-colors"
                                    >
                                        🖨️ Print
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'gallery' && (
                    <div className="p-4">
                        <div className="mb-4 flex justify-between items-center">
                            <h2 className="text-lg font-bold">🖼️ APOD Gallery</h2>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    placeholder="Search APODs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="px-3 py-1 border border-gray-300 rounded text-xs"
                                />
                                <select className="px-3 py-1 border border-gray-300 rounded text-xs">
                                    <option>All Time</option>
                                    <option>This Week</option>
                                    <option>This Month</option>
                                    <option>This Year</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                            {/* Gallery items would be loaded here */}
                            <div className="text-center text-gray-500 col-span-3 py-8">
                                Gallery view coming soon! Browse through beautiful space imagery.
                            </div>
                        </div>

                        <div className="flex justify-center space-x-2">
                            <button className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs">← Previous</button>
                            <span className="px-3 py-1 text-xs">Page {galleryPage}</span>
                            <button className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs">Next →</button>
                        </div>
                    </div>
                )}

                {viewMode === 'timeline' && (
                    <div className="p-4">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold mb-2">📅 APOD Timeline</h2>
                            <p className="text-xs text-gray-600">Explore APOD history and discover amazing space moments.</p>
                        </div>

                        <div className="text-center text-gray-500 py-8">
                            Timeline view coming soon! Journey through the history of astronomy.
                        </div>
                    </div>
                )}
            </div>

            {/* Fullscreen Image Modal */}
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