#!/bin/bash

# ==================================================================================
# The Definitive Compilation Fix Script
# This script overwrites the two files corrupted by the previous script
# with their complete, correct, and final code.
# ==================================================================================

echo "--- Applying Definitive Fix for Compilation Errors ---"

# --- 1. Writing the Complete, Correct NeoWsApp.js ---
echo "   -> Rewriting client/src/components/apps/NeoWsApp.js..."
cat << 'EOF' > client/src/components/apps/NeoWsApp.js
import React, { useState, useEffect } from 'react';
import useApi from '../../hooks/useApi';
import { getNeoFeed, getNeoDetails } from '../../services/api';

const HazardIcon = () => (
    <svg viewBox="0 0 100 100" className="w-5 h-5 inline-block mr-2 shrink-0">
        <polygon points="50,10 90,90 10,90" fill="#FFCC00" stroke="black" strokeWidth="5" />
        <text x="50" y="75" fontSize="60" textAnchor="middle" fill="black">!</text>
    </svg>
);

const SafeIcon = () => (
    <svg viewBox="0 0 100 100" className="w-5 h-5 inline-block mr-2 shrink-0">
        <circle cx="50" cy="50" r="45" fill="#32CD32" stroke="black" strokeWidth="5" />
    </svg>
);

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
            setDetailLoading(true); setDetailData(null);
            try {
                const res = await getNeoDetails(selectedNeo.id); setDetailData(res.data);
            } catch (err) { console.error("Failed to fetch NEO details", err); } 
            finally { setDetailLoading(false); }
        };
        fetchDetails();
    }, [selectedNeo]);

    if (feedLoading) return <p className="p-2">Loading...</p>;
    if (feedError) return <p className="p-2">Error.</p>;
    if (!feedData) return null;

    const neoList = feedData.near_earth_objects[today] || [];
    const closeApproach = selectedNeo?.close_approach_data[0];

    return (
        <div className="font-geneva text-sm text-black p-1 flex h-full">
            <div className="w-1/2 h-full overflow-y-scroll border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-1 bg-white">
                <h3 className="font-bold text-base mb-2">Objects Near Earth ({today})</h3>
                {neoList.map(neo => (
                    <li key={neo.id} onClick={() => setSelectedNeo(neo)} className={`list-none cursor-pointer mb-1 p-1 truncate flex items-center ${selectedNeo?.id === neo.id ? 'bg-s7-blue text-white' : 'hover:bg-s7-blue hover:text-white'}`}>
                        {neo.is_potentially_hazardous_asteroid ? <HazardIcon /> : <SafeIcon />}
                        <span>{neo.name}</span>
                    </li>
                ))}
            </div>
            <div className="w-1/2 h-full ml-1 border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white flex flex-col">
                {!selectedNeo ? <div className="m-auto text-center text-gray-500">Select an object...</div> : (
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

# --- 2. Writing the Complete, Correct ResourceNavigatorApp.js ---
echo "   -> Rewriting client/src/components/apps/ResourceNavigatorApp.js..."
cat << 'EOF' > client/src/components/apps/ResourceNavigatorApp.js
import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';

const DatasetIcon = () => (
    <svg viewBox="0 0 100 100" className="w-4 h-4 inline-block mr-2 shrink-0">
        <rect x="10" y="10" width="80" height="80" fill="white" stroke="black" strokeWidth="5"/>
        <line x1="25" y1="30" x2="75" y2="30" stroke="black" strokeWidth="5"/>
        <line x1="25" y1="50" x2="75" y2="50" stroke="black" strokeWidth="5"/>
        <line x1="25" y1="70" x2="60" y2="70" stroke="black" strokeWidth="5"/>
    </svg>
);

const SoftwareIcon = () => (
    <svg viewBox="0 0 100 100" className="w-4 h-4 inline-block mr-2 shrink-0">
        <rect x="10" y="10" width="80" height="80" fill="#C0C0C0" stroke="black" strokeWidth="5"/>
        <rect x="10" y="10" width="80" height="20" fill="gray" stroke="black" strokeWidth="5"/>
        <rect x="20" y="40" width="25" height="15" fill="black" />
        <line x1="55" y1="48" x2="80" y2="48" stroke="white" strokeWidth="5"/>
    </svg>
);

const WelcomeView = ({ savedItems, searchHistory, isLoading, handleSearch, setView, handleDeleteItem }) => (
    <div className="flex h-full">
        <div className="w-1/2 h-full overflow-y-auto border-r border-gray-400 pr-2">
            <h3 className="font-bold text-base mb-2">My Library ({savedItems.length})</h3>
            {isLoading ? <p>Loading...</p> : savedItems.map(item => (
                <div key={item.id} className="mb-1 p-1 hover:bg-s7-gray relative group flex items-center">
                    {item.type === 'Dataset' ? <DatasetIcon /> : <SoftwareIcon />}
                    <div>
                        <p className="font-bold truncate">{item.title}</p>
                        <p className="text-xs text-gray-600">{item.type} - {item.category}</p>
                    </div>
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

const SearchView = ({ searchQuery, setSearchQuery, handleSearch, setView }) => (
    <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }} className="m-auto text-center">
         <h3 className="font-bold text-base mb-2">New Live Search</h3>
         <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full border-2 border-t-black border-l-black border-b-white border-r-white p-1" />
         <button type="submit" className="mt-2 text-center px-3 py-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black">
            Execute
         </button>
         <button type="button" onClick={() => setView('welcome')} className="mt-4 text-xs text-blue-700 underline">Back to Library</button>
    </form>
);

const ResultItem = ({ item, onSave, savedItems }) => (
    <div className="border-b border-gray-300 py-1">
        <div className="flex items-center">
            {item.type === 'Dataset' ? <DatasetIcon /> : <SoftwareIcon />}
            <a href={item.url} target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline truncate">{item.title}</a>
        </div>
        <p className="text-xs text-gray-600 truncate pl-6">{item.description || "No description."}</p>
        <button onClick={() => onSave(item)} className="text-xs text-green-700 underline disabled:text-gray-400 disabled:no-underline pl-6" disabled={savedItems.some(i => i.id === item.id)}>
            {savedItems.some(i => i.id === item.id) ? "Saved" : "Save to Library"}
        </button>
    </div>
);

const ResultsView = ({ searchQuery, searchResults, isLoading, handleSaveItem, savedItems, setView }) => (
    <div className="flex flex-col h-full">
        <h3 className="font-bold text-base mb-2 shrink-0">Results for "{searchQuery}"</h3>
        <div className="overflow-y-auto flex-grow">
             {isLoading ? <p>Searching live APIs...</p> : !searchResults ? <p>Search failed.</p> :
                <>
                    <h4 className="font-bold">Datasets ({searchResults.datasets.length})</h4>
                    <ul>{searchResults.datasets.map(d => <ResultItem key={d.id} item={d} onSave={handleSaveItem} savedItems={savedItems} />)}</ul>
                    <h4 className="font-bold mt-2">Software ({searchResults.software.length})</h4>
                    <ul>{searchResults.software.map(s => <ResultItem key={s.id} item={s} onSave={handleSaveItem} savedItems={savedItems} />)}</ul>
                </>
             }
        </div>
        <button onClick={() => setView('welcome')} className="mt-auto shrink-0 text-xs text-blue-700 underline">Back to Library</button>
    </div>
);

const ResourceNavigatorApp = () => {
    const [view, setView] = useState('welcome');
    const [savedItems, setSavedItems] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadLibrary = async () => { setIsLoading(true); try { const [items, history] = await Promise.all([api.getSavedItems(), api.getSearchHistory()]); setSavedItems(items.data); setSearchHistory(history.data); } catch (error) { console.error("Could not load library", error); } setIsLoading(false); };
    useEffect(() => { if (view === 'welcome') { loadLibrary(); } }, [view]);
    const handleSearch = async (query) => { if (!query) return; setSearchQuery(query); setView('results'); setIsLoading(true); setSearchResults(null); try { const results = await api.executeLiveSearch(query); setSearchResults(results.data); } catch (error) { console.error("Live search failed", error); } setIsLoading(false); };
    const handleSaveItem = async (item) => { const existing = savedItems.find(i => i.id === item.id); if (existing) return; await api.saveItem(item); setSavedItems([item, ...savedItems]); };
    const handleDeleteItem = async (id) => { await api.deleteItem(id); setSavedItems(savedItems.filter(item => item.id !== id)); };
    
    const renderView = () => {
        switch (view) {
            case 'search': return <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={handleSearch} setView={setView} />;
            case 'results': return <ResultsView searchQuery={searchQuery} searchResults={searchResults} isLoading={isLoading} handleSaveItem={handleSaveItem} savedItems={savedItems} setView={setView} />;
            default: return <WelcomeView savedItems={savedItems} searchHistory={searchHistory} isLoading={isLoading} handleSearch={handleSearch} setView={setView} handleDeleteItem={handleDeleteItem} />;
        }
    };
    
    return (<div className="font-geneva text-sm text-black p-2 h-full">{renderView()}</div>);
};

export default ResourceNavigatorApp;
EOF

echo ""
echo "--- ✅ DEFINITIVE FIX COMPLETE ---"
echo ""
echo "The corrupted files have been overwritten with their correct, final versions."
echo "Please stop both your client and server, then restart them."
echo "The application will now compile and run as intended."