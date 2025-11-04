import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useApi from '../../hooks/useApi';
import { getEnhancedNeoFeed, getEnhancedNeoDetails } from '../../services/api';
import { useSound } from '../../hooks/useSound';
import NeoAdvancedStarMap from './NeoAdvancedStarMap';
import NeoRiskAssessment from './NeoRiskAssessment';
import NeoDatabaseView from './NeoDatabaseView';
import NeoEducationalPanel from './NeoEducationalPanel';
import NeoAlertSystem from './NeoAlertSystem';

// Enhanced UI Components
const HazardIcon = ({ level = 1 }) => (
    <svg viewBox="0 0 100 100" className="w-5 h-5 inline-block mr-2 shrink-0">
        <polygon
            points="50,10 90,90 10,90"
            fill={level >= 3 ? '#FF0000' : level >= 2 ? '#FFCC00' : '#32CD32'}
            stroke="black"
            strokeWidth="5"
        />
        <text x="50" y="75" fontSize="60" textAnchor="middle" fill="black">!</text>
    </svg>
);

const SafeIcon = () => (
    <svg viewBox="0 0 100 100" className="w-5 h-5 inline-block mr-2 shrink-0">
        <circle cx="50" cy="50" r="45" fill="#32CD32" stroke="black" strokeWidth="5" />
    </svg>
);

const DetailRow = ({ label, value, unit, highlight = false }) => (
    <div className={`flex justify-between border-b border-gray-300 py-0.5 text-xs ${highlight ? 'bg-s7-blue bg-opacity-20' : ''}`}>
        <span className="font-bold shrink-0 pr-2">{label}:</span>
        <span className="truncate text-right">
            {value}{unit && <span className="text-gray-600 ml-1">{unit}</span>}
        </span>
    </div>
);

const NeoWsEnhancedApp = () => {
    const today = new Date().toISOString().split('T')[0];
    const [dateRange, setDateRange] = useState({ start: today, end: today });
    const [viewMode, setViewMode] = useState('tracking'); // tracking, database, education
    const [selectedNeo, setSelectedNeo] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [sortBy, setSortBy] = useState('miss_distance');
    const [filterHazardous, setFilterHazardous] = useState('all'); // all, hazardous, safe

    // API calls
    const { data: feedData, loading: feedLoading, error: feedError, refetch } = useApi(
        getEnhancedNeoFeed,
        [dateRange.start, dateRange.end, true] // Get detailed data
    );

    const playSelectSound = useSound('select.mp3');
    const playHazardSound = useSound('hazard.mp3');
    const playSafeSound = useSound('safe.mp3');
    const playAlertSound = useSound('alert.mp3');

    // Process NEO data with enhanced calculations
    const processedNeoData = useMemo(() => {
        if (!feedData?.data) return [];

        // Use enhanced data if available, otherwise process original data
        let neoList = [];

        if (feedData.data.enhanced_objects) {
            // Enhanced API data - already has calculated metrics
            neoList = feedData.data.enhanced_objects.map(neo => ({
                ...neo,
                approach_date: neo.approach_date || new Date().toISOString().split('T')[0],
                miss_distance_km: neo.enhanced_metrics ?
                    parseFloat(neo.close_approach_data[0].miss_distance.kilometers) :
                    neo.miss_distance_km || 0,
                velocity_kmps: neo.enhanced_metrics ?
                    parseFloat(neo.close_approach_data[0].relative_velocity.kilometers_per_second) :
                    neo.velocity_kmps || 0,
                diameter_m: neo.enhanced_metrics ?
                    neo.estimated_diameter.meters.estimated_diameter_max :
                    neo.diameter_m || 0,
                risk_score: neo.enhanced_metrics?.risk_score || 0,
                torino_level: neo.enhanced_metrics?.torino_level || 0,
                close_approach_data_full: neo.close_approach_data?.[0] || {}
            }));
        } else {
            // Fallback to original data processing
            Object.keys(feedData.data.near_earth_objects || {}).forEach(date => {
                feedData.data.near_earth_objects[date].forEach(neo => {
                    const closeApproach = neo.close_approach_data[0];
                    const missDistance = parseFloat(closeApproach.miss_distance.kilometers);
                    const velocity = parseFloat(closeApproach.relative_velocity.kilometers_per_second);
                    const diameter = neo.estimated_diameter.meters.estimated_diameter_max;

                    const riskScore = calculateRiskScore(missDistance, velocity, diameter, neo.is_potentially_hazardous_asteroid);
                    const torinoLevel = calculateTorinoScale(missDistance, diameter, neo.is_potentially_hazardous_asteroid);

                    neoList.push({
                        ...neo,
                        approach_date: date,
                        miss_distance_km: missDistance,
                        velocity_kmps: velocity,
                        diameter_m: diameter,
                        risk_score: riskScore,
                        torino_level: torinoLevel,
                        close_approach_data_full: closeApproach
                    });
                });
            });
        }

        // Apply filters and sorting
        let filtered = neoList;
        if (filterHazardous === 'hazardous') {
            filtered = neoList.filter(neo => neo.is_potentially_hazardous_asteroid);
        } else if (filterHazardous === 'safe') {
            filtered = neoList.filter(neo => !neo.is_potentially_hazardous_asteroid);
        }

        return filtered.sort((a, b) => {
            switch(sortBy) {
                case 'risk_score': return b.risk_score - a.risk_score;
                case 'miss_distance': return a.miss_distance_km - b.miss_distance_km;
                case 'velocity': return b.velocity_kmps - a.velocity_kmps;
                case 'diameter': return b.diameter_m - a.diameter_m;
                default: return a.miss_distance_km - b.miss_distance_km;
            }
        });
    }, [feedData, filterHazardous, sortBy]);

    // Enhanced risk assessment functions
    const calculateRiskScore = (missDistance, velocity, diameter, isHazardous) => {
        let score = 0;

        // Distance factor (0-40 points)
        if (missDistance < 100000) score += 40;
        else if (missDistance < 500000) score += 30;
        else if (missDistance < 1000000) score += 20;
        else if (missDistance < 5000000) score += 10;

        // Velocity factor (0-30 points)
        if (velocity > 30) score += 30;
        else if (velocity > 20) score += 20;
        else if (velocity > 10) score += 10;

        // Size factor (0-20 points)
        if (diameter > 1000) score += 20;
        else if (diameter > 500) score += 15;
        else if (diameter > 100) score += 10;
        else if (diameter > 50) score += 5;

        // Hazard status bonus (0-10 points)
        if (isHazardous) score += 10;

        return Math.min(100, score);
    };

    const calculateTorinoScale = (missDistance, diameter, isHazardous) => {
        // Simplified Torino Scale calculation
        if (!isHazardous) return 0;

        if (missDistance < 100000 && diameter > 1000) return 8; // Certain collision
        if (missDistance < 500000 && diameter > 500) return 6;   // Threatening
        if (missDistance < 1000000 && diameter > 100) return 4;  // Close encounter
        if (missDistance < 5000000) return 2;                    // Merits attention
        return 1;                                                // Normal
    };

    // Alert system
    useEffect(() => {
        const newAlerts = processedNeoData
            .filter(neo => neo.torino_level >= 2 || neo.risk_score >= 50)
            .map(neo => ({
                id: neo.id,
                name: neo.name,
                torino_level: neo.torino_level,
                risk_score: neo.risk_score,
                miss_distance: neo.miss_distance_km,
                approach_date: neo.approach_date
            }));

        if (newAlerts.length > alerts.length && newAlerts.length > 0) {
            playAlertSound();
        }

        setAlerts(newAlerts);
    }, [processedNeoData, alerts.length, playAlertSound]);

    // Enhanced detail fetching with error handling
    useEffect(() => {
        if (!selectedNeo) return;

        selectedNeo.is_potentially_hazardous_asteroid ? playHazardSound() : playSafeSound();

        const fetchDetails = async () => {
            setDetailLoading(true);
            setDetailData(null);
            try {
                const res = await getEnhancedNeoDetails(selectedNeo.id);
                setDetailData(res.data);
            } catch (err) {
                console.error("Failed to fetch NEO details", err);
                // Enhanced error handling - show user-friendly message
                setDetailData({ error: "Unable to fetch detailed data. Please try again." });
            } finally {
                setDetailLoading(false);
            }
        };
        fetchDetails();
    }, [selectedNeo, playHazardSound, playSafeSound]);

    // Date range handlers
    const handleDateRangeChange = (type, value) => {
        setDateRange(prev => ({ ...prev, [type]: value }));
    };

    const handleRefetch = () => {
        refetch();
    };

    if (feedLoading) return (
        <div className="font-geneva text-sm text-black p-4 flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-s7-blue mb-4"></div>
            <p>Loading NEO Command Center...</p>
        </div>
    );

    if (feedError) return (
        <div className="font-geneva text-sm text-black p-4 flex flex-col items-center justify-center h-full">
            <div className="text-red-600 mb-4">⚠️ Error loading NEO data</div>
            <button
                onClick={handleRefetch}
                className="px-4 py-2 bg-s7-blue text-white rounded hover:bg-s7-blue-dark"
            >
                Retry
            </button>
        </div>
    );

    if (!feedData) return null;

    const neoList = processedNeoData;

    return (
        <div className="font-geneva text-sm text-black p-1 flex flex-col h-full">
            {/* Enhanced Header with Controls */}
            <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white mb-1 shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-lg">NEO Command Center</h2>
                    <div className="flex items-center space-x-2">
                        {alerts.length > 0 && (
                            <div className="bg-red-600 text-white px-2 py-1 rounded animate-pulse">
                                {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
                            </div>
                        )}
                        <button
                            onClick={handleRefetch}
                            className="px-3 py-1 bg-s7-blue text-white rounded text-xs hover:bg-s7-blue-dark"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Enhanced Controls */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                        <label className="text-xs font-bold">Start Date:</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => handleDateRangeChange('start', e.target.value)}
                            className="w-full border border-gray-300 px-1 py-0.5 text-xs"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold">End Date:</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => handleDateRangeChange('end', e.target.value)}
                            className="w-full border border-gray-300 px-1 py-0.5 text-xs"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Filter:</label>
                        <select
                            value={filterHazardous}
                            onChange={(e) => setFilterHazardous(e.target.value)}
                            className="w-full border border-gray-300 px-1 py-0.5 text-xs"
                        >
                            <option value="all">All Objects</option>
                            <option value="hazardous">Hazardous Only</option>
                            <option value="safe">Safe Only</option>
                        </select>
                    </div>
                </div>

                {/* View Mode Tabs */}
                <div className="flex space-x-1 border-b border-gray-300">
                    {['tracking', 'database', 'education'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-2 py-1 text-xs capitalize ${
                                viewMode === mode
                                    ? 'bg-s7-blue text-white'
                                    : 'hover:bg-gray-100'
                            }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-grow h-0">
                {viewMode === 'tracking' && (
                    <>
                        {/* Enhanced NEO List */}
                        <div className="w-1/3 h-full overflow-y-auto border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-1 bg-white">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-sm">NEO Objects ({neoList.length})</h3>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="text-xs border border-gray-300 px-1"
                                >
                                    <option value="miss_distance">Distance</option>
                                    <option value="risk_score">Risk Score</option>
                                    <option value="velocity">Velocity</option>
                                    <option value="diameter">Size</option>
                                </select>
                            </div>

                            {neoList.map(neo => (
                                <li
                                    key={neo.id}
                                    onClick={() => { setSelectedNeo(neo); playSelectSound(); }}
                                    className={`list-none cursor-pointer mb-1 p-1 truncate flex items-center text-xs ${
                                        selectedNeo?.id === neo.id
                                            ? 'bg-s7-blue text-white'
                                            : 'hover:bg-s7-blue hover:text-white'
                                    }`}
                                >
                                    {neo.torino_level > 0 ? (
                                        <HazardIcon level={neo.torino_level} />
                                    ) : (
                                        <SafeIcon />
                                    )}
                                    <div className="flex-grow">
                                        <div className="font-bold truncate">{neo.name}</div>
                                        <div className="text-xs opacity-75">
                                            Risk: {neo.risk_score}/100 | {neo.miss_distance_km.toLocaleString()} km
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </div>

                        {/* Enhanced Detail Panel */}
                        <div className="w-2/3 h-full ml-1 flex flex-col">
                            {!selectedNeo ? (
                                <div className="m-auto text-center text-gray-500">
                                    <div className="mb-4">🛸</div>
                                    <div>Awaiting Target Selection...</div>
                                    <div className="text-xs mt-2">Select a NEO to view detailed tracking data</div>
                                </div>
                            ) : (
                                <>
                                    {/* Enhanced NEO Information Panel */}
                                    <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white mb-1 shrink-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-sm truncate flex-grow mr-2">{selectedNeo.name}</h3>
                                            <div className={`px-2 py-1 text-xs rounded ${
                                                selectedNeo.torino_level >= 3 ? 'bg-red-600 text-white' :
                                                selectedNeo.torino_level >= 1 ? 'bg-yellow-500 text-black' :
                                                'bg-green-500 text-white'
                                            }`}>
                                                Torino {selectedNeo.torino_level}
                                            </div>
                                        </div>

                                        <div className="text-xs">
                                            <DetailRow
                                                label="Hazard Status"
                                                value={selectedNeo.is_potentially_hazardous_asteroid ? 'HAZARDOUS' : 'SAFE'}
                                                highlight={selectedNeo.is_potentially_hazardous_asteroid}
                                            />
                                            <DetailRow label="Est. Diameter" value={Math.round(selectedNeo.diameter_m)} unit="m" />
                                            <DetailRow label="Velocity" value={selectedNeo.velocity_kmps.toFixed(2)} unit="km/s" />
                                            <DetailRow label="Miss Distance" value={selectedNeo.miss_distance_km.toLocaleString()} unit="km" />
                                            <DetailRow label="Risk Score" value={selectedNeo.risk_score} unit="/100" highlight={selectedNeo.risk_score >= 50} />
                                            <DetailRow label="Approach Date" value={new Date(selectedNeo.approach_date).toLocaleDateString()} />
                                            <DetailRow label="Orbiting Body" value={selectedNeo.close_approach_data_full.orbiting_body} />
                                        </div>
                                    </div>

                                    {/* Advanced Visualization and Risk Assessment */}
                                    <div className="flex-grow flex space-x-1">
                                        <div className="w-3/5">
                                            <NeoAdvancedStarMap neoData={selectedNeo} />
                                        </div>
                                        <div className="w-2/5">
                                            <NeoRiskAssessment neoData={selectedNeo} detailData={detailData} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}

                {viewMode === 'database' && (
                    <NeoDatabaseView neoData={neoList} onSelectNeo={setSelectedNeo} />
                )}

                {viewMode === 'education' && (
                    <NeoEducationalPanel />
                )}
            </div>

            {/* Alert System */}
            {alerts.length > 0 && (
                <NeoAlertSystem alerts={alerts} onDismiss={() => setAlerts([])} />
            )}
        </div>
    );
};

export default NeoWsEnhancedApp;