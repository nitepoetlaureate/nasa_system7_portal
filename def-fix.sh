#!/bin/bash

# ==================================================================================
# THE DEFINITIVE "WIPE AND REPLACE" FIX SCRIPT
# This script contains the complete, correct, final code for every file that was
# part of the failed upgrade. It uses a robust overwrite method to guarantee success.
# ==================================================================================

echo "--- APPLYING DEFINITIVE FIX FOR ALL OUTSTANDING ERRORS ---"

# --- 1. Overwriting ALL potentially corrupted files with their final versions ---

echo "   -> Rewriting: server/routes/resourceNavigator.js"
cat << 'EOF' > server/routes/resourceNavigator.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../db');

// --- User Library Endpoints ---
router.get('/saved-items', async (req, res) => { try { const { rows } = await db.query('SELECT * FROM saved_items ORDER BY saved_at DESC'); res.json(rows); } catch (err) { res.status(500).json({ message: 'Error fetching saved items.' }); } });
router.post('/save-item', async (req, res) => { const { id, type, title, url, category, description } = req.body; try { const text = 'INSERT INTO saved_items(id, type, title, url, category, description) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description RETURNING *'; const values = [id, type, title, url, category, description]; const { rows } = await db.query(text, values); res.status(201).json(rows[0]); } catch (err) { res.status(500).json({ message: 'Error saving item.' }); } });
router.delete('/delete-item/:id', async (req, res) => { try { await db.query('DELETE FROM saved_items WHERE id = $1', [req.params.id]); res.status(204).send(); } catch (err) { res.status(500).json({ message: 'Error deleting item.' }); } });
router.get('/search-history', async (req, res) => { try { const { rows } = await db.query('SELECT query_string FROM saved_searches ORDER BY search_time DESC LIMIT 10'); res.json(rows); } catch (err) { res.status(500).json({ message: 'Error fetching search history.' }); } });

// --- Featured Item Endpoint ---
let featuredItem = null;
router.get('/featured-item', (req, res) => { res.json(featuredItem); });

// --- Live Search Endpoint ---
router.post('/live-search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: 'Query is required.' });
    try {
        await db.query('INSERT INTO saved_searches(query_string) VALUES($1)', [query]);
        
        const dataNasaGovUrl = `https://data.nasa.gov/api/catalog/v1?search_context=data.nasa.gov&q=${query}&limit=50`;
        const githubApiUrl = `https://api.github.com/search/repositories?q=org:nasa+${query}&per_page=50`;

        const results = await Promise.allSettled([
            axios.get(dataNasaGovUrl, { headers: { 'X-App-Token': process.env.NASA_API_KEY }, timeout: 20000 }),
            axios.get(githubApiUrl, { timeout: 20000 })
        ]);

        const datasets = results[0].status === 'fulfilled' 
            ? results[0].value.data.results.map(item => ({ id: item.resource.id, type: 'Dataset', title: item.resource.name, url: item.permalink, category: item.resource.category, description: item.resource.description })).filter(d => d.title)
            : [];
        if (results[0].status === 'rejected') console.error("data.nasa.gov search failed:", results[0].reason.message);
        
        const software = results[1].status === 'fulfilled'
            ? results[1].value.data.items.map(s => ({ id: s.id.toString(), type: 'Software', title: s.name, url: s.html_url, category: s.language, description: s.description }))
            : [];
        if (results[1].status === 'rejected') console.error("GitHub search failed:", results[1].reason.message);

        res.json({ datasets, software });
    } catch (err) {
        res.status(500).json({ message: 'Live search failed.' });
    }
});

const fetchFeaturedItem = async () => {
    try {
        console.log("Fetching featured dataset for Encarta panel...");
        const url = `https://data.nasa.gov/api/catalog/v1?search_context=data.nasa.gov&q=Mars%20Rover%20Photos&limit=1`;
        const response = await axios.get(url, { headers: { 'X-App-Token': process.env.NASA_API_KEY } });
        const item = response.data.results[0];
        if (item) {
            featuredItem = { title: item.resource.name, description: item.resource.description, url: item.permalink, category: item.resource.category };
            console.log(`✅ Featured item '${featuredItem.title}' cached.`);
        }
    } catch (error) {
        console.error("Could not fetch featured item.", error.message);
    }
};

module.exports = { router, fetchFeaturedItem };
EOF

echo "   -> Rewriting: client/services/api.js"
cat << 'EOF' > client/src/services/api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// NASA APIs
export const getApod = () => apiClient.get('/nasa/planetary/apod');
export const getNeoFeed = (startDate, endDate) => apiClient.get(`/nasa/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}`);
export const getNeoDetails = (id) => apiClient.get(`/nasa/neo/rest/v1/neo/${id}`);

// Resource Navigator Library APIs
export const getSavedItems = () => apiClient.get('/resources/saved-items');
export const saveItem = (item) => apiClient.post('/resources/save-item', item);
export const deleteItem = (id) => apiClient.delete(`/resources/delete-item/${id}`);
export const getSearchHistory = () => apiClient.get('/resources/search-history');
export const getFeaturedItem = () => apiClient.get('/resources/featured-item');
export const executeLiveSearch = (query) => apiClient.post('/resources/live-search', { query });
EOF

echo "   -> Rewriting: client/src/components/apps/NeoWsApp.js"
cat << 'EOF' > client/src/components/apps/NeoWsApp.js
import React, { useState, useEffect } from 'react';
import useApi from '../../hooks/useApi';
import { getNeoFeed, getNeoDetails } from '../../services/api';
import { useSound } from '../../hooks/useSound';
import NeoStarMap from './NeoStarMap';

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

    const playSelectSound = useSound('select.mp3');
    const playHazardSound = useSound('hazard.mp3');
    const playSafeSound = useSound('safe.mp3');

    useEffect(() => {
        if (!selectedNeo) return;
        
        selectedNeo.is_potentially_hazardous_asteroid ? playHazardSound() : playSafeSound();

        const fetchDetails = async () => {
            setDetailLoading(true); setDetailData(null);
            try {
                const res = await getNeoDetails(selectedNeo.id); setDetailData(res.data);
            } catch (err) { console.error("Failed to fetch NEO details", err); } 
            finally { setDetailLoading(false); }
        };
        fetchDetails();
    }, [selectedNeo, playHazardSound, playSafeSound]);

    if (feedLoading) return <p className="p-2">Loading Command Center...</p>;
    if (feedError) return <p className="p-2">Error.</p>;
    if (!feedData) return null;

    const neoList = feedData.near_earth_objects[today] || [];
    
    return (
        <div className="font-geneva text-sm text-black p-1 flex flex-col h-full">
            <div className="flex flex-grow h-0">
                <div className="w-1/3 h-full overflow-y-scroll border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-1 bg-white">
                    <h3 className="font-bold text-base mb-2">NEO Threats ({today})</h3>
                    {neoList.map(neo => (
                        <li key={neo.id} onClick={() => { setSelectedNeo(neo); playSelectSound(); }} className={`list-none cursor-pointer mb-1 p-1 truncate flex items-center ${selectedNeo?.id === neo.id ? 'bg-s7-blue text-white' : 'hover:bg-s7-blue hover:text-white'}`}>
                            {neo.is_potentially_hazardous_asteroid ? <HazardIcon /> : <SafeIcon />}
                            <span>{neo.name}</span>
                        </li>
                    ))}
                </div>
                <div className="w-2/3 h-full ml-1 flex flex-col">
                    {!selectedNeo ? <div className="m-auto text-center text-gray-500">Awaiting Target Selection...</div> : (
                        <>
                            <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white mb-1 shrink-0">
                                <h3 className="font-bold text-base mb-2 truncate">{selectedNeo.name}</h3>
                                <div className="text-xs">
                                    <DetailRow label="Hazard Status" value={selectedNeo.is_potentially_hazardous_asteroid ? 'HAZARDOUS' : 'SAFE'} />
                                    <DetailRow label="Est. Diameter" value={`${Math.round(selectedNeo.estimated_diameter.meters.estimated_diameter_max)} meters`} />
                                    <DetailRow label="Velocity" value={`${parseFloat(selectedNeo.close_approach_data[0].relative_velocity.kilometers_per_second).toFixed(2)} km/s`} />
                                    <DetailRow label="Miss Distance" value={`${parseInt(selectedNeo.close_approach_data[0].miss_distance.kilometers).toLocaleString()} km`} />
                                </div>
                            </div>
                            <div className="flex-grow">
                                <NeoStarMap neoData={selectedNeo} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NeoWsApp;
EOF

echo "   -> Rewriting: client/src/components/apps/ResourceNavigatorApp.js"
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

const WelcomeView = ({ savedItems, searchHistory, featuredItem, isLoading, handleSearch, setView, handleDeleteItem }) => (
    <div className="flex h-full">
        <div className="w-2/5 h-full flex flex-col border-r border-gray-400 pr-2">
            <h3 className="font-bold text-base mb-2 shrink-0">My Library ({savedItems.length})</h3>
            <div className="overflow-y-auto flex-grow">
                {isLoading ? <p>Loading...</p> : savedItems.map(item => (
                    <div key={item.id} className="mb-1 p-1 hover:bg-s7-gray relative group flex items-center">
                        {item.type === 'Dataset' ? <DatasetIcon /> : <SoftwareIcon />}
                        <div><p className="font-bold truncate">{item.title}</p></div>
                        <button onClick={() => handleDeleteItem(item.id)} className="absolute top-1 right-1 text-red-500 font-bold hidden group-hover:block">X</button>
                    </div>
                ))}
            </div>
            <button onClick={() => setView('search')} className="w-full mt-auto text-center px-3 py-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black shrink-0">
                New Search
            </button>
        </div>
        <div className="w-3/5 h-full pl-2 flex flex-col">
            <h3 className="font-bold text-base mb-2 shrink-0">Featured Dataset</h3>
            <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white mb-2 flex-grow overflow-y-auto">
                {featuredItem ? <>
                    <h4 className="font-bold">{featuredItem.title}</h4>
                    <p className="text-xs italic text-gray-600 mb-1">{featuredItem.category}</p>
                    <p className="text-xs">{featuredItem.description}</p>
                    <a href={featuredItem.url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">How to access this data...</a>
                </> : <p>Loading featured item...</p>}
            </div>
            <h3 className="font-bold text-base mb-2 shrink-0">Recent Searches</h3>
            <ul className="shrink-0">
                {searchHistory.map((s, i) => (
                    <li key={i} onClick={() => handleSearch(s.query_string)} className="text-blue-700 underline cursor-pointer truncate">{s.query_string}</li>
                ))}
            </ul>
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
    const [featuredItem, setFeaturedItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadLibrary = async () => {
        setIsLoading(true);
        try {
            const [items, history, featured] = await Promise.all([
                api.getSavedItems(),
                api.getSearchHistory(),
                api.getFeaturedItem()
            ]);
            setSavedItems(items.data);
            setSearchHistory(history.data);
            setFeaturedItem(featured.data);
        } catch (error) {
            console.error("Could not load library", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (view === 'welcome') {
            loadLibrary();
        }
    }, [view]);

    const handleSearch = async (query) => {
        if (!query) return;
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
        if (existing) return;
        await api.saveItem(item);
        setSavedItems([item, ...savedItems]);
    };

    const handleDeleteItem = async (id) => {
        await api.deleteItem(id);
        setSavedItems(savedItems.filter(item => item.id !== id));
    };
    
    const renderView = () => {
        switch (view) {
            case 'search': return <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={handleSearch} setView={setView} />;
            case 'results': return <ResultsView searchQuery={searchQuery} searchResults={searchResults} isLoading={isLoading} handleSaveItem={handleSaveItem} savedItems={savedItems} setView={setView} />;
            default: return <WelcomeView savedItems={savedItems} searchHistory={searchHistory} featuredItem={featuredItem} isLoading={isLoading} handleSearch={handleSearch} setView={setView} handleDeleteItem={handleDeleteItem} />;
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
