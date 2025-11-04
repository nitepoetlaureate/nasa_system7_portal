import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../../services/api';

// Enhanced Icons
const DatasetIcon = () => (
    <svg viewBox="0 0 100 100" className="w-5 h-5 inline-block mr-2 shrink-0">
        <rect x="10" y="10" width="80" height="80" fill="white" stroke="black" strokeWidth="5"/>
        <line x1="25" y1="30" x2="75" y2="30" stroke="black" strokeWidth="5"/>
        <line x1="25" y1="50" x2="75" y2="50" stroke="black" strokeWidth="5"/>
        <line x1="25" y1="70" x2="60" y2="70" stroke="black" strokeWidth="5"/>
    </svg>
);

const SoftwareIcon = () => (
    <svg viewBox="0 0 100 100" className="w-5 h-5 inline-block mr-2 shrink-0">
        <rect x="10" y="10" width="80" height="80" fill="#C0C0C0" stroke="black" strokeWidth="5"/>
        <rect x="10" y="10" width="80" height="20" fill="gray" stroke="black" strokeWidth="5"/>
        <rect x="20" y="40" width="25" height="15" fill="black" />
        <line x1="55" y1="48" x2="80" y2="48" stroke="white" strokeWidth="5"/>
    </svg>
);

const TutorialIcon = () => (
    <svg viewBox="0 0 100 100" className="w-5 h-5 inline-block mr-2 shrink-0">
        <rect x="10" y="10" width="80" height="80" fill="#FFE4B5" stroke="black" strokeWidth="5"/>
        <circle cx="35" cy="40" r="8" fill="black" />
        <circle cx="65" cy="40" r="8" fill="black" />
        <path d="M25 60 Q50 75 75 60" stroke="black" strokeWidth="5" fill="none"/>
    </svg>
);

const FilterIcon = () => (
    <svg viewBox="0 0 100 100" className="w-4 h-4 inline-block">
        <path d="M20 30 L80 30 L50 60 Z" fill="black" />
        <rect x="35" y="70" width="30" height="10" fill="black" />
    </svg>
);

const SearchIcon = () => (
    <svg viewBox="0 0 100 100" className="w-4 h-4 inline-block">
        <circle cx="40" cy="40" r="20" fill="none" stroke="black" strokeWidth="8"/>
        <line x1="55" y1="55" x2="75" y2="75" stroke="black" strokeWidth="8"/>
    </svg>
);

const DownloadIcon = () => (
    <svg viewBox="0 0 100 100" className="w-4 h-4 inline-block">
        <line x1="50" y1="20" x2="50" y2="70" stroke="black" strokeWidth="8"/>
        <path d="M30 50 L50 70 L70 50" stroke="black" strokeWidth="8" fill="none"/>
        <line x1="20" y1="80" x2="80" y2="80" stroke="black" strokeWidth="6"/>
    </svg>
);

const StarIcon = ({ filled = false }) => (
    <svg viewBox="0 0 100 100" className="w-4 h-4 inline-block">
        <path d="M50 15 L61 39 L87 39 L67 57 L78 81 L50 63 L22 81 L33 57 L13 39 L39 39 Z"
              fill={filled ? "gold" : "white"} stroke="black" strokeWidth="2"/>
    </svg>
);

// Categories for faceted search
const CATEGORIES = [
    'Earth Science',
    'Space Science',
    'Climate & Weather',
    'Planetary Data',
    'Astronomy',
    'Software Tools',
    'Image Processing',
    'Data Analysis',
    'Machine Learning',
    'Educational'
];

const DATA_FORMATS = [
    'CSV', 'JSON', 'XML', 'HDF5', 'NetCDF', 'GeoTIFF', 'PNG', 'JPG', 'TIFF', 'Other'
];

const USAGE_LEVELS = [
    'Beginner', 'Intermediate', 'Advanced', 'Research', 'Educational'
];

// Enhanced Welcome View with Quick Actions and Recommendations
const EnhancedWelcomeView = ({
    savedItems,
    searchHistory,
    featuredItem,
    recommendations,
    trendingItems,
    isLoading,
    handleSearch,
    setView,
    handleDeleteItem,
    handleQuickSearch
}) => (
    <div className="flex h-full">
        {/* Left Panel - Library & Quick Actions */}
        <div className="w-1/2 h-full flex flex-col border-r border-gray-400 pr-2">
            <h3 className="font-bold text-base mb-2 shrink-0">My Library ({savedItems.length})</h3>

            {/* Quick Search Bar */}
            <div className="mb-2 shrink-0">
                <div className="flex border-2 border-t-black border-l-black border-b-white border-r-white">
                    <input
                        type="text"
                        placeholder="Quick search NASA resources..."
                        className="flex-1 p-1 bg-white text-sm"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                                handleQuickSearch(e.target.value);
                                e.target.value = '';
                            }
                        }}
                    />
                    <button
                        className="px-2 bg-s7-gray border-l border-black"
                        onClick={() => {
                            const input = document.querySelector('input[placeholder="Quick search NASA resources..."]');
                            if (input && input.value.trim()) {
                                handleQuickSearch(input.value);
                                input.value = '';
                            }
                        }}
                    >
                        <SearchIcon />
                    </button>
                </div>
            </div>

            {/* Popular Categories */}
            <div className="mb-2 shrink-0">
                <h4 className="font-bold text-xs mb-1">Popular Categories:</h4>
                <div className="flex flex-wrap gap-1">
                    {['Mars Data', 'Earth Climate', 'Space Images', 'Software Tools'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleQuickSearch(cat)}
                            className="text-xs px-2 py-1 border border-black bg-white hover:bg-s7-gray"
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Library Items */}
            <div className="overflow-y-auto flex-grow border border-black bg-white p-1">
                {isLoading ? <p className="text-center">Loading library...</p> :
                    savedItems.length === 0 ?
                        <p className="text-center text-gray-600 text-xs">No saved items yet. Start searching!</p> :
                        savedItems.map(item => (
                            <div key={item.id} className="mb-2 p-2 hover:bg-s7-gray border border-gray-300 relative group">
                                <div className="flex items-start">
                                    {item.type === 'Dataset' ? <DatasetIcon /> :
                                     item.type === 'Tutorial' ? <TutorialIcon /> : <SoftwareIcon />}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate text-sm">{item.title}</p>
                                        <p className="text-xs text-gray-600">{item.category}</p>
                                        {item.description && (
                                            <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                                        )}
                                        {item.download_count && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                <DownloadIcon /> {item.download_count} downloads
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 ml-2">
                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="text-red-500 font-bold text-xs hidden group-hover:block"
                                        >
                                            X
                                        </button>
                                        {item.rating && (
                                            <div className="flex items-center text-xs">
                                                <StarIcon filled={item.rating >= 1} />
                                                <span className="ml-1">{item.rating.toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                }
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2 shrink-0">
                <button
                    onClick={() => setView('search')}
                    className="flex-1 text-center px-3 py-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black text-sm"
                >
                    Advanced Search
                </button>
                <button
                    onClick={() => setView('tutorials')}
                    className="flex-1 text-center px-3 py-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black text-sm"
                >
                    Tutorials
                </button>
            </div>
        </div>

        {/* Right Panel - Featured & Recommendations */}
        <div className="w-1/2 h-full pl-2 flex flex-col">
            {/* Featured Item */}
            <div className="mb-2 shrink-0">
                <h3 className="font-bold text-base mb-2">Featured NASA Resource</h3>
                <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white">
                    {featuredItem ? (
                        <>
                            <div className="flex items-center mb-2">
                                {featuredItem.type === 'Dataset' ? <DatasetIcon /> :
                                 featuredItem.type === 'Tutorial' ? <TutorialIcon /> : <SoftwareIcon />}
                                <h4 className="font-bold text-sm ml-2">{featuredItem.title}</h4>
                            </div>
                            <p className="text-xs italic text-gray-600 mb-1">{featuredItem.category}</p>
                            <p className="text-xs mb-2">{featuredItem.description}</p>
                            <div className="flex justify-between items-center">
                                <a href={featuredItem.url} target="_blank" rel="noreferrer"
                                   className="text-xs text-blue-700 underline">
                                    View Resource
                                </a>
                                {featuredItem.usage_level && (
                                    <span className="text-xs bg-green-100 px-2 py-1 border border-black">
                                        {featuredItem.usage_level}
                                    </span>
                                )}
                            </div>
                        </>
                    ) : <p className="text-xs">Loading featured resource...</p>}
                </div>
            </div>

            {/* Trending Items */}
            <div className="mb-2 shrink-0">
                <h3 className="font-bold text-sm mb-2">Trending This Week</h3>
                <div className="border border-black bg-white p-1 max-h-32 overflow-y-auto">
                    {trendingItems?.length > 0 ? trendingItems.slice(0, 3).map(item => (
                        <div key={item.id} className="mb-1 pb-1 border-b border-gray-200 last:border-b-0">
                            <div className="flex items-center">
                                {item.type === 'Dataset' ? <DatasetIcon /> : <SoftwareIcon />}
                                <button
                                    onClick={() => handleSearch(item.title)}
                                    className="text-xs text-blue-700 underline truncate ml-2 flex-1 text-left"
                                >
                                    {item.title}
                                </button>
                                <span className="text-xs text-gray-500 ml-2">
                                    <DownloadIcon /> {item.download_count}
                                </span>
                            </div>
                        </div>
                    )) : <p className="text-xs text-gray-500">No trending items available</p>}
                </div>
            </div>

            {/* Personalized Recommendations */}
            <div className="mb-2 shrink-0">
                <h3 className="font-bold text-sm mb-2">Recommended For You</h3>
                <div className="border border-black bg-white p-1 max-h-32 overflow-y-auto">
                    {recommendations?.length > 0 ? recommendations.slice(0, 3).map(item => (
                        <div key={item.id} className="mb-1 pb-1 border-b border-gray-200 last:border-b-0">
                            <div className="flex items-center">
                                {item.type === 'Dataset' ? <DatasetIcon /> : <SoftwareIcon />}
                                <button
                                    onClick={() => handleSearch(item.title)}
                                    className="text-xs text-blue-700 underline truncate ml-2 flex-1 text-left"
                                >
                                    {item.title}
                                </button>
                                <div className="flex items-center text-xs ml-2">
                                    <StarIcon filled={item.rating >= 3} />
                                    <span className="ml-1">{item.rating.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                    )) : <p className="text-xs text-gray-500">Search to get personalized recommendations</p>}
                </div>
            </div>

            {/* Recent Searches */}
            <div className="flex-grow flex flex-col">
                <h3 className="font-bold text-sm mb-2 shrink-0">Recent Searches</h3>
                <div className="overflow-y-auto flex-grow border border-black bg-white p-1">
                    {searchHistory.length > 0 ? searchHistory.map((s, i) => (
                        <li key={i} className="list-none">
                            <button
                                onClick={() => handleSearch(s.query_string)}
                                className="text-xs text-blue-700 underline cursor-pointer truncate w-full text-left block py-1 hover:bg-s7-gray"
                            >
                                {s.query_string}
                            </button>
                        </li>
                    )) : <p className="text-xs text-gray-500">No recent searches</p>}
                </div>
            </div>
        </div>
    </div>
);

// Enhanced Search View with Advanced Filters
const EnhancedSearchView = ({
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedFormat,
    setSelectedFormat,
    selectedUsage,
    setSelectedUsage,
    sortBy,
    setSortBy,
    handleSearch,
    setView,
    searchSuggestions,
    showSuggestions,
    setShowSuggestions
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

    return (
        <div className="h-full flex flex-col">
            <h3 className="font-bold text-base mb-2 shrink-0">Advanced NASA Resource Search</h3>

            {/* Search Bar */}
            <div className="mb-3 shrink-0">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(e.target.value.length > 2);
                        }}
                        onFocus={() => setShowSuggestions(searchQuery.length > 2)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Enter keywords, dataset names, or topics..."
                        className="w-full border-2 border-t-black border-l-black border-b-white border-r-white p-2 text-sm"
                    />
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="absolute right-2 top-2 text-xs px-2 py-1 border border-black bg-s7-gray hover:bg-gray-300"
                    >
                        <FilterIcon /> {showAdvanced ? 'Simple' : 'Advanced'}
                    </button>

                    {/* Search Suggestions */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-black border-t-0 z-10 max-h-32 overflow-y-auto">
                            {searchSuggestions.map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setSearchQuery(suggestion);
                                        setShowSuggestions(false);
                                    }}
                                    className="w-full text-left px-2 py-1 text-xs hover:bg-s7-gray border-b border-gray-200"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
                <div className="mb-3 p-2 border border-black bg-gray-50 shrink-0">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                            <label className="text-xs font-bold">Category:</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full border border-black p-1 text-xs"
                            >
                                <option value="">All Categories</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold">Data Format:</label>
                            <select
                                value={selectedFormat}
                                onChange={(e) => setSelectedFormat(e.target.value)}
                                className="w-full border border-black p-1 text-xs"
                            >
                                <option value="">All Formats</option>
                                {DATA_FORMATS.map(format => (
                                    <option key={format} value={format}>{format}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold">Usage Level:</label>
                            <select
                                value={selectedUsage}
                                onChange={(e) => setSelectedUsage(e.target.value)}
                                className="w-full border border-black p-1 text-xs"
                            >
                                <option value="">All Levels</option>
                                {USAGE_LEVELS.map(level => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold">Sort By:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full border border-black p-1 text-xs"
                            >
                                <option value="relevance">Relevance</option>
                                <option value="downloads">Most Downloaded</option>
                                <option value="rating">Highest Rated</option>
                                <option value="recent">Recently Added</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Category Pills */}
            <div className="mb-3 shrink-0">
                <p className="text-xs font-bold mb-1">Quick browse:</p>
                <div className="flex flex-wrap gap-1">
                    {['Mars', 'Climate', 'Earth Observation', 'Astronomy', 'Software', 'Tutorials'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => {
                                setSearchQuery(cat);
                                handleSearch(cat);
                            }}
                            className="text-xs px-2 py-1 border border-black bg-white hover:bg-s7-gray"
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Button */}
            <div className="flex gap-2 mb-3 shrink-0">
                <button
                    onClick={() => handleSearch(searchQuery)}
                    className="flex-1 text-center px-3 py-2 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black font-bold"
                >
                    <SearchIcon /> Search NASA Resources
                </button>
                <button
                    onClick={() => setView('welcome')}
                    className="px-3 py-2 text-xs text-blue-700 underline"
                >
                    Cancel
                </button>
            </div>

            {/* Search Tips */}
            <div className="flex-grow border border-black bg-gray-50 p-2">
                <h4 className="font-bold text-xs mb-1">Search Tips:</h4>
                <ul className="text-xs space-y-1">
                    <li>• Use specific terms like "Mars Rover" or "climate data"</li>
                    <li>• Try different formats: "CSV", "JSON", "GeoTIFF"</li>
                    <li>• Include usage level: "beginner", "research", "educational"</li>
                    <li>• Combine terms: "earth temperature CSV research"</li>
                </ul>
            </div>
        </div>
    );
};

// Enhanced Results View with Filtering and Sorting
const EnhancedResultItem = ({ item, onSave, savedItems, onPreview, onRate }) => (
    <div className="border-b border-gray-300 py-2 mb-2">
        <div className="flex items-start">
            <div className="mr-2 mt-1">
                {item.type === 'Dataset' ? <DatasetIcon /> :
                 item.type === 'Tutorial' ? <TutorialIcon /> : <SoftwareIcon />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm truncate">
                        <a href={item.url} target="_blank" rel="noreferrer"
                           className="text-blue-700 underline hover:text-blue-900">
                            {item.title}
                        </a>
                    </h4>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                        {item.rating && (
                            <div className="flex items-center">
                                {[1,2,3,4,5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => onRate(item.id, star)}
                                        className="hover:scale-110 transition-transform"
                                    >
                                        <StarIcon filled={star <= item.rating} />
                                    </button>
                                ))}
                                <span className="text-xs ml-1">({item.review_count || 0})</span>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-xs text-gray-600 mb-1">
                    <span className="bg-blue-100 px-1 py-0.5 border border-black">{item.category}</span>
                    {item.usage_level && (
                        <span className="ml-2 bg-green-100 px-1 py-0.5 border border-black">{item.usage_level}</span>
                    )}
                    {item.format && (
                        <span className="ml-2 bg-gray-100 px-1 py-0.5 border border-black">{item.format}</span>
                    )}
                </p>

                <p className="text-xs text-gray-700 mb-2 line-clamp-2">{item.description || "No description available."}</p>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                        {item.download_count && (
                            <span><DownloadIcon /> {item.download_count}</span>
                        )}
                        {item.file_size && (
                            <span>Size: {item.file_size}</span>
                        )}
                        {item.updated_at && (
                            <span>Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {item.preview_url && (
                            <button
                                onClick={() => onPreview(item)}
                                className="text-xs text-purple-700 underline hover:text-purple-900"
                            >
                                Preview
                            </button>
                        )}
                        <button
                            onClick={() => onSave(item)}
                            className="text-xs text-green-700 underline disabled:text-gray-400 disabled:no-underline"
                            disabled={savedItems.some(i => i.id === item.id)}
                        >
                            {savedItems.some(i => i.id === item.id) ? "✓ Saved" : "Save to Library"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const EnhancedResultsView = ({
    searchQuery,
    searchResults,
    isLoading,
    searchFilters,
    setFilter,
    handleSaveItem,
    savedItems,
    setView,
    onPreview,
    onRate
}) => {
    const [activeTab, setActiveTab] = useState('all');

    const filteredResults = useMemo(() => {
        if (!searchResults) return { datasets: [], software: [], tutorials: [] };

        const filterItems = (items) => {
            return items.filter(item => {
                if (searchFilters.category && item.category !== searchFilters.category) return false;
                if (searchFilters.format && item.format !== searchFilters.format) return false;
                if (searchFilters.usage_level && item.usage_level !== searchFilters.usage_level) return false;
                return true;
            });
        };

        return {
            datasets: filterItems(searchResults.datasets || []),
            software: filterItems(searchResults.software || []),
            tutorials: filterItems(searchResults.tutorials || [])
        };
    }, [searchResults, searchFilters]);

    const allItems = [
        ...filteredResults.datasets,
        ...filteredResults.software,
        ...filteredResults.tutorials
    ];

    const sortedItems = useMemo(() => {
        const sorted = [...allItems].sort((a, b) => {
            switch (searchFilters.sortBy) {
                case 'downloads':
                    return (b.download_count || 0) - (a.download_count || 0);
                case 'rating':
                    return (b.rating || 0) - (a.rating || 0);
                case 'recent':
                    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
                default:
                    return 0; // relevance - already sorted by API
            }
        });
        return sorted;
    }, [allItems, searchFilters.sortBy]);

    const renderTabContent = () => {
        if (isLoading) return <p className="text-center py-4">Searching NASA databases...</p>;

        if (!searchResults) {
            return <p className="text-center py-4 text-red-600">Search failed. Please try again.</p>;
        }

        const items = activeTab === 'all' ? sortedItems :
                     activeTab === 'datasets' ? filteredResults.datasets :
                     activeTab === 'software' ? filteredResults.software :
                     filteredResults.tutorials;

        if (items.length === 0) {
            return (
                <div className="text-center py-8">
                    <p className="text-gray-600 mb-2">No items found matching your criteria.</p>
                    <p className="text-sm">Try adjusting your filters or search terms.</p>
                </div>
            );
        }

        return items.map(item => (
            <EnhancedResultItem
                key={item.id}
                item={item}
                onSave={handleSaveItem}
                savedItems={savedItems}
                onPreview={onPreview}
                onRate={onRate}
            />
        ));
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="font-bold text-base">
                    Results for "{searchQuery}" ({allItems.length} found)
                </h3>
                <button
                    onClick={() => setView('welcome')}
                    className="text-xs text-blue-700 underline"
                >
                    Back to Library
                </button>
            </div>

            {/* Result Tabs */}
            <div className="flex gap-2 mb-2 shrink-0">
                {[
                    { id: 'all', label: `All (${allItems.length})` },
                    { id: 'datasets', label: `Datasets (${filteredResults.datasets.length})` },
                    { id: 'software', label: `Software (${filteredResults.software.length})` },
                    { id: 'tutorials', label: `Tutorials (${filteredResults.tutorials.length})` }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-2 py-1 text-xs border border-black ${
                            activeTab === tab.id ? 'bg-s7-gray' : 'bg-white'
                        } hover:bg-s7-gray`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Active Filters Display */}
            {searchFilters.category && (
                <div className="mb-2 p-2 bg-blue-50 border border-black text-xs shrink-0">
                    <span className="font-bold">Active Filters:</span>
                    {searchFilters.category && <span className="ml-2">Category: {searchFilters.category}</span>}
                    {searchFilters.format && <span className="ml-2">Format: {searchFilters.format}</span>}
                    {searchFilters.usage_level && <span className="ml-2">Level: {searchFilters.usage_level}</span>}
                    <button
                        onClick={() => setFilter('category', '')}
                        className="ml-4 text-red-600 underline"
                    >
                        Clear filters
                    </button>
                </div>
            )}

            {/* Results */}
            <div className="overflow-y-auto flex-grow border border-black bg-white p-2">
                {renderTabContent()}
            </div>
        </div>
    );
};

// Tutorial/Educational Content View
const TutorialsView = ({ setView, tutorials }) => (
    <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-2 shrink-0">
            <h3 className="font-bold text-base">NASA Data Tutorials & Guides</h3>
            <button
                onClick={() => setView('welcome')}
                className="text-xs text-blue-700 underline"
            >
                Back to Library
            </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2 shrink-0">
            <button className="p-2 border border-black bg-s7-gray text-xs font-bold">
                Getting Started
            </button>
            <button className="p-2 border border-black bg-white text-xs">
                Data Analysis
            </button>
            <button className="p-2 border border-black bg-white text-xs">
                Visualization
            </button>
            <button className="p-2 border border-black bg-white text-xs">
                API Usage
            </button>
        </div>

        <div className="overflow-y-auto flex-grow border border-black bg-white p-2">
            {tutorials?.length > 0 ? tutorials.map(tutorial => (
                <div key={tutorial.id} className="mb-3 p-2 border border-gray-300">
                    <div className="flex items-center mb-1">
                        <TutorialIcon />
                        <h4 className="font-bold text-sm ml-2">{tutorial.title}</h4>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{tutorial.category} • {tutorial.duration}</p>
                    <p className="text-xs mb-2">{tutorial.description}</p>
                    <div className="flex gap-2">
                        <a href={tutorial.url} target="_blank" rel="noreferrer"
                           className="text-xs text-blue-700 underline">
                            Start Tutorial
                        </a>
                        <button className="text-xs text-green-700 underline">
                            Save to Library
                        </button>
                    </div>
                </div>
            )) : (
                <div className="text-center py-8">
                    <p className="text-gray-600 mb-2">Loading tutorials...</p>
                </div>
            )}
        </div>
    </div>
);

// Data Preview Modal
const DataPreviewModal = ({ item, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white border-2 border-black w-4/5 h-4/5 flex flex-col">
            <div className="flex items-center justify-between p-2 border-b border-black bg-s7-gray">
                <h3 className="font-bold text-sm">Preview: {item.title}</h3>
                <button onClick={onClose} className="text-red-500 font-bold text-lg">X</button>
            </div>
            <div className="flex-1 p-2 overflow-y-auto">
                <div className="mb-4">
                    <h4 className="font-bold text-sm mb-2">Metadata</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><strong>Type:</strong> {item.type}</div>
                        <div><strong>Category:</strong> {item.category}</div>
                        <div><strong>Format:</strong> {item.format || 'N/A'}</div>
                        <div><strong>Size:</strong> {item.file_size || 'N/A'}</div>
                        <div><strong>Downloads:</strong> {item.download_count || 0}</div>
                        <div><strong>Rating:</strong> {item.rating || 'N/A'}/5</div>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-sm mb-2">Description</h4>
                    <p className="text-xs">{item.description || 'No description available.'}</p>
                </div>

                {item.preview_url && (
                    <div className="mt-4">
                        <h4 className="font-bold text-sm mb-2">Preview</h4>
                        <div className="border border-black p-2 bg-gray-50 text-center">
                            <p className="text-xs text-gray-600">Interactive preview would load here</p>
                            <a href={item.preview_url} target="_blank" rel="noreferrer"
                               className="text-xs text-blue-700 underline mt-2 inline-block">
                                Open Full Preview
                            </a>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-2 border-t border-black flex gap-2">
                <a href={item.url} target="_blank" rel="noreferrer"
                   className="px-3 py-1 border border-black bg-s7-gray text-sm">
                    View Full Resource
                </a>
                <button onClick={onClose}
                        className="px-3 py-1 border border-black bg-white text-sm">
                    Close
                </button>
            </div>
        </div>
    </div>
);

// Main Enhanced Resource Navigator Component
const EnhancedResourceNavigatorApp = () => {
    // View Management
    const [view, setView] = useState('welcome');

    // Library State
    const [savedItems, setSavedItems] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [featuredItem, setFeaturedItem] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [trendingItems, setTrendingItems] = useState([]);
    const [tutorials, setTutorials] = useState([]);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Search Filters
    const [searchFilters, setSearchFilters] = useState({
        category: '',
        format: '',
        usage_level: '',
        sortBy: 'relevance'
    });

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [previewItem, setPreviewItem] = useState(null);

    // Load library data
    const loadLibrary = useCallback(async () => {
        setIsLoading(true);
        try {
            const [items, history, featured, recommended, trending] = await Promise.all([
                api.getSavedItems(),
                api.getSearchHistory(),
                api.getFeaturedItem(),
                api.getRecommendations(),
                api.getTrendingItems()
            ]);

            setSavedItems(items.data || []);
            setSearchHistory(history.data || []);
            setFeaturedItem(featured.data);
            setRecommendations(recommended.data || []);
            setTrendingItems(trending.data || []);
        } catch (error) {
            console.error("Could not load library data", error);
        }
        setIsLoading(false);
    }, []);

    // Load tutorials
    const loadTutorials = useCallback(async () => {
        try {
            const tutorials = await api.getTutorials();
            setTutorials(tutorials.data || []);
        } catch (error) {
            console.error("Could not load tutorials", error);
        }
    }, []);

    // Handle search with suggestions
    const handleSearch = useCallback(async (query, filters = {}) => {
        if (!query || !query.trim()) return;

        setSearchQuery(query);
        setView('results');
        setIsLoading(true);
        setSearchResults(null);

        try {
            const searchParams = {
                query: query.trim(),
                ...filters,
                ...searchFilters
            };

            const results = await api.executeEnhancedSearch(searchParams);
            setSearchResults(results.data);

            // Load new recommendations based on search
            try {
                const recommended = await api.getRecommendations(query);
                setRecommendations(recommended.data || []);
            } catch (error) {
                console.error("Could not load recommendations", error);
            }
        } catch (error) {
            console.error("Enhanced search failed", error);
        } finally {
            setIsLoading(false);
        }
    }, [searchFilters]);

    // Quick search handler
    const handleQuickSearch = useCallback((query) => {
        handleSearch(query);
    }, [handleSearch]);

    // Load search suggestions
    useEffect(() => {
        if (searchQuery.length > 2) {
            const timer = setTimeout(async () => {
                try {
                    const suggestions = await api.getSearchSuggestions(searchQuery);
                    setSearchSuggestions(suggestions.data || []);
                } catch (error) {
                    console.error("Could not load suggestions", error);
                }
            }, 300);

            return () => clearTimeout(timer);
        } else {
            setSearchSuggestions([]);
        }
    }, [searchQuery]);

    // Save item handler
    const handleSaveItem = useCallback(async (item) => {
        const existing = savedItems.find(i => i.id === item.id);
        if (existing) return;

        try {
            await api.saveItem(item);
            setSavedItems(prev => [item, ...prev]);
        } catch (error) {
            console.error("Could not save item", error);
        }
    }, [savedItems]);

    // Delete item handler
    const handleDeleteItem = useCallback(async (id) => {
        try {
            await api.deleteItem(id);
            setSavedItems(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error("Could not delete item", error);
        }
    }, []);

    // Rate item handler
    const handleRateItem = useCallback(async (itemId, rating) => {
        try {
            await api.rateItem(itemId, rating);
            // Update local state
            setSavedItems(prev => prev.map(item =>
                item.id === itemId
                    ? { ...item, rating, review_count: (item.review_count || 0) + 1 }
                    : item
            ));
        } catch (error) {
            console.error("Could not rate item", error);
        }
    }, []);

    // Filter setter
    const setFilter = useCallback((filterName, value) => {
        setSearchFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);

    // Load data based on view
    useEffect(() => {
        if (view === 'welcome') {
            loadLibrary();
        } else if (view === 'tutorials') {
            loadTutorials();
        }
    }, [view, loadLibrary, loadTutorials]);

    // Main view renderer
    const renderView = useCallback(() => {
        switch (view) {
            case 'search':
                return (
                    <EnhancedSearchView
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedCategory={searchFilters.category}
                        setSelectedCategory={(value) => setFilter('category', value)}
                        selectedFormat={searchFilters.format}
                        setSelectedFormat={(value) => setFilter('format', value)}
                        selectedUsage={searchFilters.usage_level}
                        setSelectedUsage={(value) => setFilter('usage_level', value)}
                        sortBy={searchFilters.sortBy}
                        setSortBy={(value) => setFilter('sortBy', value)}
                        handleSearch={handleSearch}
                        setView={setView}
                        searchSuggestions={searchSuggestions}
                        showSuggestions={showSuggestions}
                        setShowSuggestions={setShowSuggestions}
                    />
                );

            case 'results':
                return (
                    <EnhancedResultsView
                        searchQuery={searchQuery}
                        searchResults={searchResults}
                        isLoading={isLoading}
                        searchFilters={searchFilters}
                        setFilter={setFilter}
                        handleSaveItem={handleSaveItem}
                        savedItems={savedItems}
                        setView={setView}
                        onPreview={setPreviewItem}
                        onRate={handleRateItem}
                    />
                );

            case 'tutorials':
                return (
                    <TutorialsView
                        setView={setView}
                        tutorials={tutorials}
                    />
                );

            default:
                return (
                    <EnhancedWelcomeView
                        savedItems={savedItems}
                        searchHistory={searchHistory}
                        featuredItem={featuredItem}
                        recommendations={recommendations}
                        trendingItems={trendingItems}
                        isLoading={isLoading}
                        handleSearch={handleSearch}
                        handleQuickSearch={handleQuickSearch}
                        setView={setView}
                        handleDeleteItem={handleDeleteItem}
                    />
                );
        }
    }, [
        view, searchQuery, searchResults, isLoading, searchFilters, searchSuggestions,
        showSuggestions, savedItems, searchHistory, featuredItem, recommendations,
        trendingItems, tutorials, handleSearch, handleQuickSearch, setFilter,
        handleSaveItem, handleDeleteItem, handleRateItem
    ]);

    return (
        <div className="font-geneva text-sm text-black p-2 h-full">
            {renderView()}

            {/* Preview Modal */}
            {previewItem && (
                <DataPreviewModal
                    item={previewItem}
                    onClose={() => setPreviewItem(null)}
                />
            )}
        </div>
    );
};

export default EnhancedResourceNavigatorApp;