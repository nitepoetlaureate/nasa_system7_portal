import React, { useState, useMemo } from 'react';

const NeoDatabaseView = ({ neoData, onSelectNeo }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('miss_distance_km');
    const [sortDirection, setSortDirection] = useState('asc');
    const [filters, setFilters] = useState({
        hazardousOnly: false,
        closeApproachOnly: false,
        largeOnly: false,
        selectedSizeRange: 'all'
    });

    // Filter and sort data
    const processedData = useMemo(() => {
        let filtered = [...neoData];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(neo =>
                neo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                neo.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply hazard filter
        if (filters.hazardousOnly) {
            filtered = filtered.filter(neo => neo.is_potentially_hazardous_asteroid);
        }

        // Apply close approach filter
        if (filters.closeApproachOnly) {
            filtered = filtered.filter(neo => neo.miss_distance_km < 5000000); // Within 5 million km
        }

        // Apply size filter
        if (filters.largeOnly) {
            filtered = filtered.filter(neo => neo.diameter_m > 1000); // Larger than 1km
        }

        // Apply size range filter
        if (filters.selectedSizeRange !== 'all') {
            const ranges = {
                small: [0, 50],
                medium: [50, 500],
                large: [500, 1000],
                huge: [1000, Infinity]
            };
            const [min, max] = ranges[filters.selectedSizeRange];
            filtered = filtered.filter(neo => neo.diameter_m >= min && neo.diameter_m < max);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [neoData, searchTerm, sortField, sortDirection, filters]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIndicator = (field) => {
        if (sortField !== field) return '';
        return sortDirection === 'asc' ? ' ↑' : ' ↓';
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat().format(Math.round(num));
    };

    const getRiskColor = (riskScore) => {
        if (riskScore >= 70) return 'text-red-600 font-bold';
        if (riskScore >= 40) return 'text-orange-600 font-semibold';
        if (riskScore >= 20) return 'text-yellow-600';
        return 'text-green-600';
    };

    const getDiameterColor = (diameter) => {
        if (diameter >= 1000) return 'text-red-600 font-bold';
        if (diameter >= 500) return 'text-orange-600';
        if (diameter >= 100) return 'text-yellow-600';
        return 'text-green-600';
    };

    return (
        <div className="font-geneva text-sm text-black p-1 flex flex-col h-full">
            {/* Header with Controls */}
            <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white mb-1 shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">NEO Database</h3>
                    <div className="text-xs text-gray-600">
                        {processedData.length} of {neoData.length} objects
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                    <div className="col-span-2">
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border border-gray-300 px-2 py-1 text-xs"
                        />
                    </div>
                    <select
                        value={filters.selectedSizeRange}
                        onChange={(e) => setFilters(prev => ({ ...prev, selectedSizeRange: e.target.value }))}
                        className="border border-gray-300 px-2 py-1 text-xs"
                    >
                        <option value="all">All Sizes</option>
                        <option value="small">Small (&lt;50m)</option>
                        <option value="medium">Medium (50-500m)</option>
                        <option value="large">Large (500m-1km)</option>
                        <option value="huge">Huge (&gt;1km)</option>
                    </select>
                    <select
                        value={sortField}
                        onChange={(e) => setSortField(e.target.value)}
                        className="border border-gray-300 px-2 py-1 text-xs"
                    >
                        <option value="miss_distance_km">Miss Distance</option>
                        <option value="diameter_m">Diameter</option>
                        <option value="velocity_kmps">Velocity</option>
                        <option value="risk_score">Risk Score</option>
                        <option value="name">Name</option>
                        <option value="approach_date">Approach Date</option>
                    </select>
                </div>

                {/* Filter Toggles */}
                <div className="flex space-x-4 text-xs">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={filters.hazardousOnly}
                            onChange={(e) => setFilters(prev => ({ ...prev, hazardousOnly: e.target.checked }))}
                            className="mr-1"
                        />
                        Hazardous Only
                    </label>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={filters.closeApproachOnly}
                            onChange={(e) => setFilters(prev => ({ ...prev, closeApproachOnly: e.target.checked }))}
                            className="mr-1"
                        />
                        Close Approach (&lt;5M km)
                    </label>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={filters.largeOnly}
                            onChange={(e) => setFilters(prev => ({ ...prev, largeOnly: e.target.checked }))}
                            className="mr-1"
                        />
                        Large Only (&gt;1km)
                    </label>
                </div>
            </div>

            {/* Data Table */}
            <div className="flex-grow overflow-auto border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white bg-white">
                <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="border-b border-gray-300 p-1 text-left">
                                <button
                                    onClick={() => handleSort('name')}
                                    className="font-bold hover:text-s7-blue"
                                >
                                    Name{getSortIndicator('name')}
                                </button>
                            </th>
                            <th className="border-b border-gray-300 p-1 text-center">
                                <button
                                    onClick={() => handleSort('diameter_m')}
                                    className="font-bold hover:text-s7-blue"
                                >
                                    Diameter{getSortIndicator('diameter_m')}
                                </button>
                            </th>
                            <th className="border-b border-gray-300 p-1 text-center">
                                <button
                                    onClick={() => handleSort('velocity_kmps')}
                                    className="font-bold hover:text-s7-blue"
                                >
                                    Velocity{getSortIndicator('velocity_kmps')}
                                </button>
                            </th>
                            <th className="border-b border-gray-300 p-1 text-center">
                                <button
                                    onClick={() => handleSort('miss_distance_km')}
                                    className="font-bold hover:text-s7-blue"
                                >
                                    Miss Distance{getSortIndicator('miss_distance_km')}
                                </button>
                            </th>
                            <th className="border-b border-gray-300 p-1 text-center">
                                <button
                                    onClick={() => handleSort('risk_score')}
                                    className="font-bold hover:text-s7-blue"
                                >
                                    Risk{getSortIndicator('risk_score')}
                                </button>
                            </th>
                            <th className="border-b border-gray-300 p-1 text-center">Hazard</th>
                            <th className="border-b border-gray-300 p-1 text-center">
                                <button
                                    onClick={() => handleSort('approach_date')}
                                    className="font-bold hover:text-s7-blue"
                                >
                                    Date{getSortIndicator('approach_date')}
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.map((neo, index) => (
                            <tr
                                key={neo.id}
                                onClick={() => onSelectNeo(neo)}
                                className={`cursor-pointer hover:bg-s7-blue hover:text-white ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}
                            >
                                <td className="border-b border-gray-200 p-1">
                                    <div className="truncate font-semibold">{neo.name}</div>
                                    <div className="text-xs text-gray-500">{neo.id}</div>
                                </td>
                                <td className={`border-b border-gray-200 p-1 text-center ${getDiameterColor(neo.diameter_m)}`}>
                                    {formatNumber(neo.diameter_m)}m
                                </td>
                                <td className="border-b border-gray-200 p-1 text-center">
                                    {neo.velocity_kmps.toFixed(1)} km/s
                                </td>
                                <td className="border-b border-gray-200 p-1 text-center">
                                    {formatNumber(neo.miss_distance_km)} km
                                </td>
                                <td className={`border-b border-gray-200 p-1 text-center ${getRiskColor(neo.risk_score)}`}>
                                    {neo.risk_score}/100
                                </td>
                                <td className="border-b border-gray-200 p-1 text-center">
                                    {neo.is_potentially_hazardous_asteroid ? (
                                        <span className="text-red-600 font-bold">⚠️</span>
                                    ) : (
                                        <span className="text-green-600">✓</span>
                                    )}
                                </td>
                                <td className="border-b border-gray-200 p-1 text-center">
                                    {new Date(neo.approach_date).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {processedData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <div className="mb-2">🔍</div>
                        <div>No NEOs match your criteria</div>
                        <div className="text-xs mt-1">Try adjusting your filters or search term</div>
                    </div>
                )}
            </div>

            {/* Summary Statistics */}
            <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white shrink-0">
                <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                        <div className="font-bold text-red-600">
                            {processedData.filter(n => n.is_potentially_hazardous_asteroid).length}
                        </div>
                        <div className="text-gray-600">Hazardous</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-orange-600">
                            {processedData.filter(n => n.miss_distance_km < 5000000).length}
                        </div>
                        <div className="text-gray-600">Close Approach</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-blue-600">
                            {processedData.filter(n => n.diameter_m > 1000).length}
                        </div>
                        <div className="text-gray-600">Large (&gt;1km)</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-green-600">
                            {processedData.filter(n => n.risk_score >= 50).length}
                        </div>
                        <div className="text-gray-600">High Risk</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NeoDatabaseView;