#!/bin/bash

# ==================================================================================
# The True Final Script
# This script contains the missing components from the previous failed script.
# It will complete the upgrade to the "NASA Encarta" system.
# ==================================================================================

echo "--- Completing the System Upgrade ---"

# --- 1. UPGRADING Missed Frontend Components ---

# Upgrade ApodApp
echo "   -> Patching ApodApp.js..."
cat << 'EOF' > client/src/components/apps/ApodApp.js
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
                <div className="mb-2 shrink-0">
                    <img 
                        src={data.url} 
                        alt={data.title} 
                        className="w-full h-auto border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white cursor-pointer"
                        onClick={() => openApp('imageViewer', { hdurl: data.hdurl, title: data.title })}
                        title="Click to view in high definition"
                    />
                </div>
            ) : (
                <p className="mb-2 shrink-0">Today's APOD is a video. <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Watch here</a>.</p>
            )}
            <div className="text-xs overflow-y-auto mb-2 flex-grow">
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
EOF

# Fix and upgrade NeoWsApp
echo "   -> Patching NeoWsApp.js..."
cat << 'EOF' > client/src/components/apps/NeoWsApp.js
import React, { useState, useEffect } from 'react';
import useApi from '../../hooks/useApi';
import { getNeoFeed, getNeoDetails } from '../../services/api';

const DetailRow = ({ label, value }) => (
    <div className="flex justify-between border-b border-gray-300 py-0.5 text-xs">
        <span className="font-bold shrink-0 pr-2">{label}:</span>
        <span className="truncate text-right">{value}</span>
    </div>
);

const NeoWsApp = () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: feedData, loading: feedLoading, error: feedError } = useApi(getNeoFeed, [today, today]);
    
    const [selectedNeo, setSelectedNeo] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        if (!selectedNeo) return;

        const fetchDetails = async () => {
            setDetailLoading(true);
            setDetailData(null);
            try {
                const res = await getNeoDetails(selectedNeo.id);
                setDetailData(res.data);
            } catch (err) {
                console.error("Failed to fetch NEO details", err);
            } finally {
                setDetailLoading(false);
            }
        };
        fetchDetails();
    }, [selectedNeo]);

    if (feedLoading) return <p className="p-2">Loading Near Earth Objects...</p>;
    if (feedError) return <p className="p-2">Error: Could not fetch NEO data.</p>;
    if (!feedData) return null;

    const neoList = feedData.near_earth_objects[today] || [];
    const closeApproach = selectedNeo?.close_approach_data[0];

    return (
        <div className="font-geneva text-sm text-black p-1 flex h-full">
            {/* List Pane */}
            <div className="w-1/2 h-full overflow-y-scroll border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-1 bg-white">
                <h3 className="font-bold text-base mb-2">Objects Near Earth ({today})</h3>
                {neoList.map(neo => (
                    <li key={neo.id} onClick={() => setSelectedNeo(neo)} className={`list-none cursor-pointer mb-1 p-1 truncate ${selectedNeo?.id === neo.id ? 'bg-s7-blue text-white' : 'hover:bg-s7-blue hover:text-white'}`}>
                        {neo.name}
                    </li>
                ))}
            </div>

            {/* Detail Pane */}
            <div className="w-1/2 h-full ml-1 border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white flex flex-col">
                {!selectedNeo ? (
                    <div className="m-auto text-center text-gray-500">Select an object...</div>
                ) : (
                    <>
                        <h3 className="font-bold text-base mb-2 shrink-0 truncate">{selectedNeo.name}</h3>
                        <div className="text-xs overflow-y-auto">
                            <DetailRow label="Potentially Hazardous" value={selectedNeo.is_potentially_hazardous_asteroid ? 'Yes' : 'No'} />
                            <DetailRow label="Est. Diameter (Max)" value={`${Math.round(selectedNeo.estimated_diameter.meters.estimated_diameter_max)} meters`} />
                            {closeApproach && <>
                                <h4 className="font-bold mt-3 mb-1">Closest Approach Today</h4>
                                <DetailRow label="Velocity" value={`${parseFloat(closeApproach.relative_velocity.kilometers_per_second).toFixed(2)} km/s`} />
                                <DetailRow label="Miss Distance" value={`${parseInt(closeApproach.miss_distance.kilometers).toLocaleString()} km`} />
                            </>}
                            <h4 className="font-bold mt-3 mb-1">Full Orbital Data</h4>
                            {detailLoading ? <p>Loading details...</p> : detailData ? <>
                                <DetailRow label="Orbital Period" value={`${parseFloat(detailData.orbital_data.orbital_period).toFixed(0)} days`} />
                                <DetailRow label="First Observation" value={detailData.orbital_data.first_observation_date} />
                                <DetailRow label="Last Observation" value={detailData.orbital_data.last_observation_date} />
                                <DetailRow label="Orbit Class" value={detailData.orbital_data.orbit_class.orbit_class_type} />
                            </> : <p>Could not load details.</p>}
                        </div>
                        <a href={selectedNeo.nasa_jpl_url} target="_blank" rel="noreferrer" className="text-center w-full block mt-auto shrink-0 px-3 py-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black">
                            View Orbit in JPL DB
                        </a>
                    </>
                )}
            </div>
        </div>
    );
};

export default NeoWsApp;
EOF

# Rewrite ResourceNavigatorApp
echo "   -> Patching ResourceNavigatorApp.js..."
cat << 'EOF' > client/src/components/apps/ResourceNavigatorApp.js
import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';

const ResourceNavigatorApp = () => {
    const [view, setView] = useState('welcome'); // 'welcome', 'search', 'results'
    const [savedItems, setSavedItems] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Start loading initially

    const loadLibrary = async () => {
        setIsLoading(true);
        try {
            const [items, history] = await Promise.all([api.getSavedItems(), api.getSearchHistory()]);
            setSavedItems(items.data);
            setSearchHistory(history.data);
        } catch (error) {
            console.error("Could not load library", error);
        }
        setIsLoading(false);
    };

    // Fetch library data on component mount
    useEffect(() => {
        loadLibrary();
    }, []);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        setView('results');
        setIsLoading(true);
        setSearchResults(null);
        try {
            const results = await api.executeLiveSearch(query);
            setSearchResults(results.data);
        } catch (error) {
            console.error("Live search failed", error);
        }
        setIsLoading(false);
    };

    const handleSaveItem = async (item) => {
        const existing = savedItems.find(i => i.id === item.id);
        if (existing) return; // Don't save duplicates
        await api.saveItem(item);
        setSavedItems([item, ...savedItems]);
    };
    
    const handleDeleteItem = async (id) => {
        await api.deleteItem(id);
        setSavedItems(savedItems.filter(item => item.id !== id));
    };

    const WelcomeView = () => (
        <div className="flex h-full">
            <div className="w-1/2 h-full overflow-y-auto border-r border-gray-400 pr-2">
                <h3 className="font-bold text-base mb-2">My Library ({savedItems.length})</h3>
                {isLoading ? <p>Loading...</p> : savedItems.map(item => (
                    <div key={item.id} className="mb-1 p-1 hover:bg-s7-gray relative group">
                        <p className="font-bold truncate">{item.title}</p>
                        <p className="text-xs text-gray-600">{item.type} - {item.category}</p>
                        <button onClick={() => handleDeleteItem(item.id)} className="absolute top-1 right-1 text-red-500 font-bold hidden group-hover:block">X</button>
                    </div>
                ))}
            </div>
            <div className="w-1/2 h-full pl-2 flex flex-col">
                <h3 className="font-bold text-base mb-2">Recent Searches</h3>
                <ul>
                    {searchHistory.map((s, i) => (
                        <li key={i} onClick={() => handleSearch(s.query_string)} className="text-blue-700 underline cursor-pointer truncate">{s.query_string}</li>
                    ))}
                </ul>
                <button onClick={() => setView('search')} className="w-full mt-auto text-center px-3 py-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black">
                    New Search
                </button>
            </div>
        </div>
    );

    const SearchView = () => (
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }} className="m-auto text-center">
             <h3 className="font-bold text-base mb-2">New Live Search</h3>
             <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full border-2 border-t-black border-l-black border-b-white border-r-white p-1" />
             <button type="submit" className="mt-2 text-center px-3 py-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black">
                Execute
             </button>
             <button onClick={() => { setView('welcome'); loadLibrary(); }} className="mt-4 text-xs text-blue-700 underline">Back to Library</button>
        </form>
    );

    const ResultsView = () => (
        <div className="flex flex-col h-full">
            <h3 className="font-bold text-base mb-2 shrink-0">Results for "{searchQuery}"</h3>
            <div className="overflow-y-auto flex-grow">
                 {isLoading ? <p>Searching live APIs...</p> : !searchResults ? <p>Search failed.</p> :
                    <>
                        <h4 className="font-bold">Datasets ({searchResults.datasets.length})</h4>
                        <ul>{searchResults.datasets.map(d => <ResultItem key={d.id} item={d} />)}</ul>
                        <h4 className="font-bold mt-2">Software ({searchResults.software.length})</h4>
                        <ul>{searchResults.software.map(s => <ResultItem key={s.id} item={s} />)}</ul>
                    </>
                 }
            </div>
            <button onClick={() => { setView('welcome'); loadLibrary(); }} className="mt-auto shrink-0 text-xs text-blue-700 underline">Back to Library</button>
        </div>
    );
    
    const ResultItem = ({ item }) => (
        <div className="border-b border-gray-300 py-1">
            <a href={item.url} target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline truncate">{item.title}</a>
            <p className="text-xs text-gray-600 truncate">{item.description || "No description."}</p>
            <button onClick={() => handleSaveItem(item)} className="text-xs text-green-700 underline disabled:text-gray-400 disabled:no-underline" disabled={savedItems.some(i => i.id === item.id)}>
                {savedItems.some(i => i.id === item.id) ? "Saved" : "Save to Library"}
            </button>
        </div>
    );

    return (
        <div className="font-geneva text-sm text-black p-2 h-full">
            {view === 'welcome' && <WelcomeView />}
            {view === 'search' && <SearchView />}
            {view === 'results' && <ResultsView />}
        </div>
    );
};

export default ResourceNavigatorApp;
EOF
echo "   -> Resource Navigator rewritten into the 'Encarta' interface."
echo "✅ Frontend Upgrade Complete."
echo ""
echo "--- 🚀 UPGRADE SCRIPT HAS FULLY COMPLETED 🚀 ---"
echo ""
echo "The previous failure has been corrected. Please follow the final steps:"
echo ""
echo "1. STOP both your client and server processes."
echo ""
echo "2. Navigate to the SERVER directory:"
echo "   cd server"
echo ""
echo "3. Initialize the new database schema (THIS WILL DELETE OLD DATA):"
echo "   npm run db:init"
echo ""
echo "4. Start the server:"
echo "   npm start"
echo ""
echo "5. Navigate to the CLIENT directory in a NEW terminal:"
echo "   cd client"
echo ""
echo "6. Start the client:"
echo "   npm start"
