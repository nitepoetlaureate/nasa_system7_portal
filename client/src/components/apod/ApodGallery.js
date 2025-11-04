import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apodService } from '../../services/apodService';
import OptimizedImage from '../Performance/OptimizedImage';
import EnhancedImageViewer from './EnhancedImageViewer';

const ApodGallery = ({ initialDateRange, category, searchQuery }) => {
    const [apods, setApods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedApod, setSelectedApod] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' | 'masonry'
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'title' | 'popularity'
    const [filterOptions, setFilterOptions] = useState({
        mediaType: 'all', // 'all' | 'image' | 'video'
        hasCopyright: 'all', // 'all' | 'yes' | 'no'
        dateRange: 'all' // 'all' | 'week' | 'month' | 'year' | 'custom'
    });
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [favorites, setFavorites] = useState([]);
    const [searchTerm, setSearchTerm] = useState(searchQuery || '');

    const itemsPerPage = 20;

    // Load favorites from localStorage
    useEffect(() => {
        const savedFavorites = localStorage.getItem('apod-favorites');
        if (savedFavorites) {
            setFavorites(JSON.parse(savedFavorites));
        }
    }, []);

    // Fetch APOD data
    useEffect(() => {
        const fetchApods = async () => {
            setLoading(true);
            setError(null);

            try {
                let data = [];

                if (category) {
                    data = await apodService.getApodByCategory(category);
                } else if (searchTerm) {
                    data = await apodService.searchApods(searchTerm, 100);
                } else if (initialDateRange) {
                    data = await apodService.getApodRange(
                        initialDateRange.start,
                        initialDateRange.end
                    );
                } else {
                    // Default: last 30 days
                    const endDate = new Date();
                    const startDate = new Date();
                    startDate.setDate(endDate.getDate() - 30);
                    data = await apodService.getApodRange(
                        startDate.toISOString().split('T')[0],
                        endDate.toISOString().split('T')[0]
                    );
                }

                setApods(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchApods();
    }, [category, searchTerm, initialDateRange]);

    // Filter and sort APODs
    const filteredAndSortedApods = useMemo(() => {
        let filtered = [...apods];

        // Apply filters
        if (filterOptions.mediaType !== 'all') {
            filtered = filtered.filter(apod => apod.media_type === filterOptions.mediaType);
        }

        if (filterOptions.hasCopyright !== 'all') {
            filtered = filtered.filter(apod => {
                const hasCopyright = !!apod.copyright;
                return filterOptions.hasCopyright === 'yes' ? hasCopyright : !hasCopyright;
            });
        }

        if (filterOptions.dateRange !== 'all') {
            const now = new Date();
            let startDate = new Date();

            switch (filterOptions.dateRange) {
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                case 'custom':
                    if (customDateRange.start && customDateRange.end) {
                        startDate = new Date(customDateRange.start);
                        const endDate = new Date(customDateRange.end);
                        filtered = filtered.filter(apod => {
                            const apodDate = new Date(apod.date);
                            return apodDate >= startDate && apodDate <= endDate;
                        });
                        return filtered;
                    }
                    break;
            }

            if (filterOptions.dateRange !== 'custom') {
                filtered = filtered.filter(apod => new Date(apod.date) >= startDate);
            }
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.date) - new Date(a.date);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'popularity':
                    // This would need to be implemented based on actual usage data
                    return b.title.length - a.title.length; // Placeholder
                default:
                    return 0;
            }
        });

        return filtered;
    }, [apods, filterOptions, sortBy, customDateRange]);

    // Pagination
    const paginatedApods = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedApods.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedApods, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedApods.length / itemsPerPage);

    // Favorite management
    const toggleFavorite = useCallback((apod) => {
        const isFavorite = favorites.some(fav => fav.date === apod.date);
        let newFavorites;

        if (isFavorite) {
            newFavorites = favorites.filter(fav => fav.date !== apod.date);
        } else {
            newFavorites = [...favorites, { ...apod, savedAt: new Date().toISOString() }];
        }

        setFavorites(newFavorites);
        localStorage.setItem('apod-favorites', JSON.stringify(newFavorites));
    }, [favorites]);

    const isFavorite = useCallback((apod) => {
        return favorites.some(fav => fav.date === apod.date);
    }, [favorites]);

    // Gallery view modes
    const renderGridView = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {paginatedApods.map((apod) => (
                <div
                    key={apod.date}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => setSelectedApod(apod)}
                >
                    <div className="aspect-square relative overflow-hidden bg-gray-100">
                        {apod.media_type === 'image' ? (
                            <OptimizedImage
                                src={apod.url}
                                alt={apod.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <div className="text-center p-4">
                                    <div className="text-4xl mb-2">📹</div>
                                    <p className="text-xs text-gray-600">Video</p>
                                </div>
                            </div>
                        )}

                        {/* Overlay with quick actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(apod);
                                }}
                                className="bg-white/90 hover:bg-white text-red-600 p-2 rounded-full mx-1"
                            >
                                {isFavorite(apod) ? '❤️' : '🤍'}
                            </button>
                        </div>
                    </div>

                    <div className="p-3">
                        <h3 className="font-bold text-sm mb-1 line-clamp-2">{apod.title}</h3>
                        <p className="text-xs text-gray-600">{apod.date}</p>
                        {apod.copyright && (
                            <p className="text-xs text-gray-500 mt-1">© {apod.copyright}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderListView = () => (
        <div className="space-y-4">
            {paginatedApods.map((apod) => (
                <div
                    key={apod.date}
                    className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedApod(apod)}
                >
                    <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded overflow-hidden">
                            {apod.media_type === 'image' ? (
                                <OptimizedImage
                                    src={apod.url}
                                    alt={apod.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-2xl">📹</div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base mb-1">{apod.title}</h3>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{apod.explanation}</p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    <span>📅 {apod.date}</span>
                                    {apod.copyright && <span>© {apod.copyright}</span>}
                                    <span>{apod.media_type === 'image' ? '📷 Image' : '📹 Video'}</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(apod);
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    {isFavorite(apod) ? '❤️' : '🤍'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderMasonryView = () => {
        const columns = 4;
        const columnHeights = Array(columns).fill(0);
        const columnsArray = Array.from({ length: columns }, () => []);

        // Distribute items into columns
        paginatedApods.forEach((apod) => {
            const minHeightColumn = columnHeights.indexOf(Math.min(...columnHeights));
            columnsArray[minHeightColumn].push(apod);
            // Estimate height (would be more accurate with actual image dimensions)
            columnHeights[minHeightColumn] += apod.title.length > 30 ? 300 : 250;
        });

        return (
            <div className="flex space-x-4">
                {columnsArray.map((column, columnIndex) => (
                    <div key={columnIndex} className="flex-1 space-y-4">
                        {column.map((apod) => (
                            <div
                                key={apod.date}
                                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                                onClick={() => setSelectedApod(apod)}
                            >
                                <div className="relative">
                                    {apod.media_type === 'image' ? (
                                        <OptimizedImage
                                            src={apod.url}
                                            alt={apod.title}
                                            className="w-full object-cover"
                                            style={{ height: apod.title.length > 30 ? '250px' : '200px' }}
                                        />
                                    ) : (
                                        <div className="w-full bg-gray-200 flex items-center justify-center" style={{ height: '200px' }}>
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">📹</div>
                                                <p className="text-xs text-gray-600">Video</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(apod);
                                            }}
                                            className="bg-white/90 hover:bg-white text-red-600 p-2 rounded-full"
                                        >
                                            {isFavorite(apod) ? '❤️' : '🤍'}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-3">
                                    <h3 className="font-bold text-sm mb-1 line-clamp-2">{apod.title}</h3>
                                    <p className="text-xs text-gray-600">{apod.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading APOD Gallery...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center text-red-600">
                    <p className="mb-4">Error: {error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header with controls */}
            <div className="bg-white shadow-sm p-4 border-b border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-bold">APOD Gallery</h2>
                        <span className="text-sm text-gray-600">
                            {filteredAndSortedApods.length} items
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Search APODs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />

                        {/* View mode */}
                        <select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                        >
                            <option value="grid">Grid</option>
                            <option value="list">List</option>
                            <option value="masonry">Masonry</option>
                        </select>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                        >
                            <option value="date">Date (Newest)</option>
                            <option value="title">Title (A-Z)</option>
                            <option value="popularity">Popularity</option>
                        </select>

                        {/* Filters */}
                        <details className="relative">
                            <summary className="px-3 py-1 border border-gray-300 rounded text-sm cursor-pointer hover:bg-gray-50">
                                Filters
                            </summary>
                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">Media Type</label>
                                        <select
                                            value={filterOptions.mediaType}
                                            onChange={(e) => setFilterOptions(prev => ({ ...prev, mediaType: e.target.value }))}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="all">All</option>
                                            <option value="image">Images Only</option>
                                            <option value="video">Videos Only</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium mb-1">Copyright</label>
                                        <select
                                            value={filterOptions.hasCopyright}
                                            onChange={(e) => setFilterOptions(prev => ({ ...prev, hasCopyright: e.target.value }))}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="all">All</option>
                                            <option value="yes">With Copyright</option>
                                            <option value="no">No Copyright</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium mb-1">Date Range</label>
                                        <select
                                            value={filterOptions.dateRange}
                                            onChange={(e) => setFilterOptions(prev => ({ ...prev, dateRange: e.target.value }))}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="all">All Time</option>
                                            <option value="week">Last Week</option>
                                            <option value="month">Last Month</option>
                                            <option value="year">Last Year</option>
                                            <option value="custom">Custom</option>
                                        </select>
                                    </div>

                                    {filterOptions.dateRange === 'custom' && (
                                        <div className="space-y-2">
                                            <input
                                                type="date"
                                                value={customDateRange.start}
                                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                            <input
                                                type="date"
                                                value={customDateRange.end}
                                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            </div>

            {/* Gallery content */}
            <div className="flex-1 overflow-auto p-4">
                {paginatedApods.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600">No APODs found matching your criteria.</p>
                        <button
                            onClick={() => {
                                setFilterOptions({
                                    mediaType: 'all',
                                    hasCopyright: 'all',
                                    dateRange: 'all'
                                });
                                setSearchTerm('');
                            }}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' && renderGridView()}
                        {viewMode === 'list' && renderListView()}
                        {viewMode === 'masonry' && renderMasonryView()}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center space-x-2 mt-8">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>

                                <span className="px-3 py-1 text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Image viewer modal */}
            {selectedApod && (
                <EnhancedImageViewer
                    image={selectedApod}
                    title={selectedApod.title}
                    onClose={() => setSelectedApod(null)}
                    onPrevious={() => {
                        const currentIndex = paginatedApods.findIndex(a => a.date === selectedApod.date);
                        if (currentIndex > 0) {
                            setSelectedApod(paginatedApods[currentIndex - 1]);
                        }
                    }}
                    onNext={() => {
                        const currentIndex = paginatedApods.findIndex(a => a.date === selectedApod.date);
                        if (currentIndex < paginatedApods.length - 1) {
                            setSelectedApod(paginatedApods[currentIndex + 1]);
                        }
                    }}
                    hasPrevious={paginatedApods.findIndex(a => a.date === selectedApod.date) > 0}
                    hasNext={paginatedApods.findIndex(a => a.date === selectedApod.date) < paginatedApods.length - 1}
                />
            )}
        </div>
    );
};

export default ApodGallery;