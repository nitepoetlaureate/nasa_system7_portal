import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apodService } from '../../services/apodService';
import OptimizedImage from '../Performance/OptimizedImage';

const ApodTimeline = () => {
    const [apods, setApods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [hoveredApod, setHoveredApod] = useState(null);
    const [viewMode, setViewMode] = useState('year'); // 'year' | 'month' | 'decade'
    const [selectedApod, setSelectedApod] = useState(null);

    // Generate years from first APOD (1995) to current year
    const availableYears = useMemo(() => {
        const years = [];
        for (let year = 1995; year <= new Date().getFullYear(); year++) {
            years.push(year);
        }
        return years.reverse();
    }, []);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Fetch APOD data based on selected time period
    useEffect(() => {
        const fetchApods = async () => {
            setLoading(true);
            setError(null);

            try {
                let startDate, endDate;

                if (viewMode === 'decade') {
                    // Decade view - 10 years of data
                    const decadeStart = Math.floor(selectedYear / 10) * 10;
                    startDate = `${decadeStart}-01-01`;
                    endDate = `${decadeStart + 9}-12-31`;
                } else if (viewMode === 'year' && !selectedMonth) {
                    // Year view - full year
                    startDate = `${selectedYear}-01-01`;
                    endDate = `${selectedYear}-12-31`;
                } else if (viewMode === 'year' && selectedMonth !== null) {
                    // Month view
                    const monthStr = String(selectedMonth + 1).padStart(2, '0');
                    startDate = `${selectedYear}-${monthStr}-01`;
                    endDate = `${selectedYear}-${monthStr}-31`;
                }

                if (startDate && endDate) {
                    const data = await apodService.getApodRange(startDate, endDate);
                    setApods(data);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchApods();
    }, [selectedYear, selectedMonth, viewMode]);

    // Group APODs by time periods
    const groupedApods = useMemo(() => {
        if (viewMode === 'decade') {
            const groups = {};
            apods.forEach(apod => {
                const year = new Date(apod.date).getFullYear();
                if (!groups[year]) groups[year] = [];
                groups[year].push(apod);
            });
            return groups;
        } else if (viewMode === 'year' && !selectedMonth) {
            const groups = {};
            months.forEach((month, index) => {
                groups[index] = [];
            });
            apods.forEach(apod => {
                const month = new Date(apod.date).getMonth();
                groups[month].push(apod);
            });
            return groups;
        } else if (viewMode === 'year' && selectedMonth !== null) {
            const groups = {};
            apods.forEach(apod => {
                const day = new Date(apod.date).getDate();
                const weekNumber = Math.ceil(day / 7);
                if (!groups[weekNumber]) groups[weekNumber] = [];
                groups[weekNumber].push(apod);
            });
            return groups;
        }
        return {};
    }, [apods, viewMode, selectedMonth]);

    // Statistics for selected period
    const statistics = useMemo(() => {
        const totalApods = apods.length;
        const imageApods = apods.filter(apod => apod.media_type === 'image').length;
        const videoApods = apods.filter(apod => apod.media_type === 'video').length;
        const copyrightApods = apods.filter(apod => apod.copyright).length;

        // Find most common tags
        const allTags = apods.flatMap(apod => apod.enhanced?.tags || []);
        const tagFrequency = {};
        allTags.forEach(tag => {
            tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        });
        const topTags = Object.entries(tagFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag]) => tag);

        return {
            totalApods,
            imageApods,
            videoApods,
            copyrightApods,
            topTags,
            imagePercentage: totalApods > 0 ? Math.round((imageApods / totalApods) * 100) : 0,
            copyrightPercentage: totalApods > 0 ? Math.round((copyrightApods / totalApods) * 100) : 0
        };
    }, [apods]);

    const renderDecadeView = () => {
        const decadeStart = Math.floor(selectedYear / 10) * 10;
        const decadeEnd = decadeStart + 9;

        return (
            <div className="space-y-6">
                <h3 className="text-lg font-bold">
                    {decadeStart}s Timeline
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(groupedApods)
                        .sort((a, b) => b[0] - a[0])
                        .map(([year, yearApods]) => (
                            <div key={year} className="bg-white rounded-lg shadow-md p-4">
                                <h4 className="font-bold text-lg mb-3 text-blue-600">
                                    {year}
                                </h4>

                                {yearApods.length > 0 ? (
                                    <div className="space-y-3">
                                        {/* Show featured APODs from this year */}
                                        {yearApods
                                            .filter((_, index) => index % 4 === 0) // Show every 4th APOD
                                            .slice(0, 3)
                                            .map((apod) => (
                                                <div
                                                    key={apod.date}
                                                    className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                                                    onClick={() => setSelectedApod(apod)}
                                                    onMouseEnter={() => setHoveredApod(apod.date)}
                                                    onMouseLeave={() => setHoveredApod(null)}
                                                >
                                                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded overflow-hidden">
                                                        {apod.media_type === 'image' && (
                                                            <OptimizedImage
                                                                src={apod.url}
                                                                alt={apod.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-medium text-sm line-clamp-1">
                                                            {apod.title}
                                                        </h5>
                                                        <p className="text-xs text-gray-600">{apod.date}</p>
                                                    </div>
                                                </div>
                                            ))}

                                        {hoveredApod && yearApods.find(a => a.date === hoveredApod) && (
                                            <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                                <p className="font-medium">
                                                    {yearApods.find(a => a.date === hoveredApod).title}
                                                </p>
                                                <p className="text-gray-600 mt-1 line-clamp-2">
                                                    {yearApods.find(a => a.date === hoveredApod).explanation}
                                                </p>
                                            </div>
                                        )}

                                        <div className="text-xs text-gray-500 pt-2 border-t">
                                            {yearApods.length} APODs this year
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No APODs available</p>
                                )}
                            </div>
                        ))}
                </div>
            </div>
        );
    };

    const renderYearView = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{selectedYear} Calendar</h3>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setSelectedYear(prev => prev - 1)}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                    >
                        ← Previous Year
                    </button>
                    <button
                        onClick={() => setSelectedYear(prev => prev + 1)}
                        disabled={selectedYear >= new Date().getFullYear()}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm disabled:opacity-50"
                    >
                        Next Year →
                    </button>
                </div>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {months.map((month, monthIndex) => {
                    const monthApods = groupedApods[monthIndex] || [];
                    const isSelected = selectedMonth === monthIndex;

                    return (
                        <div
                            key={monthIndex}
                            className={`bg-white rounded-lg shadow-md p-3 cursor-pointer transition-all ${
                                isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-lg'
                            }`}
                            onClick={() => setSelectedMonth(isSelected ? null : monthIndex)}
                        >
                            <h4 className="font-bold text-sm mb-2 text-center">
                                {month.substring(0, 3)}
                            </h4>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600 mb-1">
                                    {monthApods.length}
                                </div>
                                <div className="text-xs text-gray-600">APODs</div>
                            </div>

                            {/* Show sample images from this month */}
                            <div className="mt-3 grid grid-cols-2 gap-1">
                                {monthApods
                                    .filter((_, index) => index % Math.ceil(monthApods.length / 4) === 0)
                                    .slice(0, 4)
                                    .map((apod) => (
                                        <div
                                            key={apod.date}
                                            className="aspect-square bg-gray-100 rounded overflow-hidden"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedApod(apod);
                                            }}
                                        >
                                            {apod.media_type === 'image' && (
                                                <OptimizedImage
                                                    src={apod.url}
                                                    alt={apod.title}
                                                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                                                />
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Month detail view */}
            {selectedMonth !== null && (
                <div className="mt-6">
                    <h4 className="text-lg font-bold mb-4">
                        {months[selectedMonth]} {selectedYear}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedApods[selectedMonth]?.map((apod) => (
                            <div
                                key={apod.date}
                                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => setSelectedApod(apod)}
                            >
                                <div className="aspect-video bg-gray-100">
                                    {apod.media_type === 'image' ? (
                                        <OptimizedImage
                                            src={apod.url}
                                            alt={apod.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-3xl mb-2">📹</div>
                                                <p className="text-xs text-gray-600">Video</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3">
                                    <h5 className="font-bold text-sm mb-1 line-clamp-2">
                                        {apod.title}
                                    </h5>
                                    <p className="text-xs text-gray-600">{apod.date}</p>
                                    {apod.copyright && (
                                        <p className="text-xs text-gray-500 mt-1">© {apod.copyright}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderStatistics = () => (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">Statistics for Selected Period</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                        {statistics.totalApods}
                    </div>
                    <div className="text-sm text-gray-600">Total APODs</div>
                </div>

                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                        {statistics.imagePercentage}%
                    </div>
                    <div className="text-sm text-gray-600">Images</div>
                </div>

                <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                        {statistics.copyrightPercentage}%
                    </div>
                    <div className="text-sm text-gray-600">With Copyright</div>
                </div>

                <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                        {statistics.topTags.length}
                    </div>
                    <div className="text-sm text-gray-600">Unique Tags</div>
                </div>
            </div>

            {statistics.topTags.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-medium text-sm mb-2">Most Common Tags:</h4>
                    <div className="flex flex-wrap gap-2">
                        {statistics.topTags.map((tag) => (
                            <span
                                key={tag}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading APOD Timeline...</p>
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
            {/* Header */}
            <div className="bg-white shadow-sm p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">📅 APOD Timeline</h2>

                    <div className="flex items-center space-x-4">
                        {/* View mode selector */}
                        <select
                            value={viewMode}
                            onChange={(e) => {
                                setViewMode(e.target.value);
                                setSelectedMonth(null);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                            <option value="year">Year View</option>
                            <option value="decade">Decade View</option>
                        </select>

                        {/* Year selector */}
                        <select
                            value={selectedYear}
                            onChange={(e) => {
                                setSelectedYear(Number(e.target.value));
                                setSelectedMonth(null);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {renderStatistics()}

                {viewMode === 'decade' ? renderDecadeView() : renderYearView()}
            </div>

            {/* APOD detail modal */}
            {selectedApod && (
                <div
                    className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedApod(null)}
                >
                    <div
                        className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold">{selectedApod.title}</h3>
                                <button
                                    onClick={() => setSelectedApod(null)}
                                    className="text-gray-500 hover:text-gray-700 text-xl"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mb-4">
                                {selectedApod.media_type === 'image' ? (
                                    <OptimizedImage
                                        src={selectedApod.hdurl || selectedApod.url}
                                        alt={selectedApod.title}
                                        className="w-full max-h-96 object-contain"
                                    />
                                ) : (
                                    <div className="bg-gray-100 p-8 text-center">
                                        <p className="text-lg mb-2">📹 Video Content</p>
                                        <a
                                            href={selectedApod.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            Watch Video
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm text-gray-600">
                                    <strong>Date:</strong> {selectedApod.date}
                                </p>
                                {selectedApod.copyright && (
                                    <p className="text-sm text-gray-600">
                                        <strong>Copyright:</strong> {selectedApod.copyright}
                                    </p>
                                )}
                                <p className="text-sm leading-relaxed">
                                    {selectedApod.explanation}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApodTimeline;