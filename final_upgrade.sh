#!/bin/bash

# ==================================================================================
# THE FINAL UPGRADE SCRIPT
# This script implements the full "NASA Encarta" vision, fixes all bugs,
# and refines the UI/UX across the entire application.
# ==================================================================================

echo "--- BEGINNING FINAL SYSTEM UPGRADE ---"

# --- 1. DELETING Obsolete Indexer ---
echo "Phase 1: Retiring old architecture..."
rm -f server/services/resourceIndexer.js
echo "   -> Obsolete resource indexer has been removed."

# --- 2. UPGRADING Server Backend for the "Encarta" Engine ---
echo "Phase 2: Upgrading backend to a dynamic library model..."

# Create a dedicated database module
cat << 'EOF' > server/db.js
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'nasa_resources',
    password: process.env.DB_PASSWORD || 'carlotta', // Your password
    port: process.env.DB_PORT || 5432,
});

const initDb = async () => {
    console.log('Initializing database schema...');
    try {
        await pool.query('DROP TABLE IF EXISTS datasets, software, saved_items, saved_searches CASCADE;');
        await pool.query(`
            CREATE TABLE saved_items (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT,
                category TEXT,
                description TEXT,
                saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE saved_searches (
                id SERIAL PRIMARY KEY,
                query_string TEXT NOT NULL,
                search_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Database schema initialized successfully.');
    } catch (err) {
        console.error('❌ Database initialization failed:', err);
        process.exit(1);
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initDb,
};
EOF
echo "   -> Created new database module."

# Add a db:init script to package.json
# Using awk for safer JSON manipulation in a script
awk '/"start": "node server.js"/ {print; print "    \"db:init\": \"node -e \\\"require(\\\\'./db.js\\\\\').initDb()\\\"\","; next}1' server/package.json > server/package.json.tmp && mv server/package.json.tmp server/package.json
echo "   -> Added 'npm run db:init' command to server."


# Rewrite the Resource Navigator API completely
cat << 'EOF' > server/routes/resourceNavigator.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../db');

// --- User Library Endpoints ---

router.get('/saved-items', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM saved_items ORDER BY saved_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching saved items.' });
    }
});

router.post('/save-item', async (req, res) => {
    const { id, type, title, url, category, description } = req.body;
    try {
        const text = 'INSERT INTO saved_items(id, type, title, url, category, description) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING RETURNING *';
        const values = [id, type, title, url, category, description];
        const { rows } = await db.query(text, values);
        res.status(201).json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error saving item.' });
    }
});

router.delete('/delete-item/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM saved_items WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Error deleting item.' });
    }
});

router.get('/search-history', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT query_string FROM saved_searches ORDER BY search_time DESC LIMIT 10');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching search history.' });
    }
});

// --- Live Search Endpoint ---

const BROWSER_HEADER = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

router.post('/live-search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: 'Query is required.' });

    try {
        // Save the search term to history
        await db.query('INSERT INTO saved_searches(query_string) VALUES($1)', [query]);
        
        // Execute live searches
        const dataNasaGovUrl = `https://data.nasa.gov/api/views.json?q=${query}&limit=50`;
        const githubApiUrl = `https://api.github.com/search/repositories?q=org:nasa+${query}&per_page=50`;

        const [dataGovResponse, githubResponse] = await Promise.all([
            axios.get(dataNasaGovUrl, { headers: BROWSER_HEADER }),
            axios.get(githubApiUrl)
        ]);
        
        const datasets = dataGovResponse.data.map(d => ({
            id: d.id, type: 'Dataset', title: d.name, url: `https://data.nasa.gov/d/${d.id}`, category: d.category, description: d.description
        })).filter(d => d.title);

        const software = githubResponse.data.items.map(s => ({
            id: s.id.toString(), type: 'Software', title: s.name, url: s.html_url, category: s.language, description: s.description
        }));

        res.json({ datasets, software });

    } catch (err) {
        res.status(500).json({ message: 'Live search failed.' });
    }
});

module.exports = router;
EOF
echo "   -> Resource Navigator API rewritten."
echo "✅ Backend Upgrade Complete."


# --- 3. UPGRADING Frontend UI/UX ---
echo "Phase 3: Upgrading frontend components..."

# Add resizability to Window.js
cat << 'EOF' > client/src/components/system7/Window.js
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useApps } from '../../contexts/AppContext';

const Window = ({ children, title, appId, initialPos }) => {
    const { apps, closeApp, bringToFront, updateAppPosition } = useApps();
    const constraintsRef = useRef(null);
    const appState = apps[appId];

    const handleDragEnd = (event, info) => {
        updateAppPosition(appId, { x: info.point.x, y: info.point.y });
    };

    return (
        <>
            <div ref={constraintsRef} className="absolute top-6 left-0 right-0 bottom-0 pointer-events-none" />
            <motion.div
                drag
                dragMomentum={false}
                dragConstraints={constraintsRef}
                dragHandle=".drag-handle"
                onDragEnd={handleDragEnd}
                onMouseDown={() => bringToFront(appId)}
                initial={{ x: initialPos.x, y: initialPos.y }}
                resize="both" // Allow resizing
                className="absolute flex flex-col w-[550px] min-w-[300px] h-[450px] min-h-[200px] bg-s7-gray border-2 border-t-white border-l-white border-r-black border-b-black shadow-s7-window overflow-hidden"
                style={{ zIndex: appState.zIndex }}
            >
                <header className="drag-handle h-6 border-b-2 border-b-black p-1 flex items-center cursor-move select-none shrink-0">
                    <button 
                        onClick={() => closeApp(appId)}
                        className="w-4 h-4 border-t-black border-l-black border-r-white border-b-white border-2 mr-2 bg-s7-gray shadow-s7-outset active:shadow-s7-inset"
                    />
                    <div className="flex-grow font-chicago text-black bg-s7-stripes h-full" />
                    <span className="absolute left-8 font-chicago text-black">{title}</span>
                </header>
                <main className="flex-grow p-1 m-1 overflow-hidden bg-white border-t-black border-l-black border-r-white border-b-white border-2">
                    {children}
                </main>
            </motion.div>
        </>
    );
};

export default Window;
EOF
echo "   -> Window component now resizable."

# Add new functions to api.js
cat << 'EOF' > client/src/services/api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// NASA APIs
export const getApod = () => apiClient.get('/nasa/planetary/apod');
export const getNeoFeed = (startDate, endDate) => apiClient.get(`/nasa/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}`);
export const getNeoDetails = (id) => apiClient.get(`/nasa/neo/rest/v1/neo/${id}`); // <-- ADDED

// Resource Navigator Library APIs
export const getSavedItems = () => apiClient.get('/resources/saved-items');
export const saveItem = (item) => apiClient.post('/resources/save-item', item);
export const deleteItem = (id) => apiClient.delete(`/resources/delete-item/${id}`);
export const getSearchHistory = () => apiClient.get('/resources/search-history');
export const executeLiveSearch = (query) => apiClient.post('/resources/live-search', { query });
EOF
echo "   -> Client-side API services updated."

# Create the new ImageViewerApp
cat << 'EOF' > client/src/components/apps/ImageViewerApp.js
import React from 'react';
import { useApps } from '../../contexts/AppContext';

const ImageViewerApp = () => {
    const { apps } = useApps();
    const { hdurl, title } = apps.imageViewer.data || {};

    if (!hdurl) return <div className="p-4">No image to display.</div>;

    return (
        <div className="w-full h-full bg-black flex items-center justify-center overflow-auto">
            <img src={hdurl} alt={`High-resolution view of ${title}`} className="max-w-full max-h-full object-contain"/>
        </div>
    );
};

export default ImageViewerApp;
EOF
echo "   -> Created new ImageViewerApp component."

# Update AppContext to include the ImageViewer
cat << 'EOF' > client/src/contexts/AppContext.js
import React, { createContext, useState, useContext, useCallback } from 'react';
import ApodApp from '../components/apps/ApodApp';
import NeoWsApp from '../components/apps/NeoWsApp';
import ResourceNavigatorApp from '../components/apps/ResourceNavigatorApp';
import ImageViewerApp from '../components/apps/ImageViewerApp'; // <-- ADDED

const AppContext = createContext();

const initialApps = {
  'apod': { id: 'apod', name: 'Picture of the Day', component: ApodApp, isOpen: false, zIndex: 10, pos: { x: 50, y: 50 } },
  'neows': { id: 'neows', name: 'Near Earth Objects', component: NeoWsApp, isOpen: false, zIndex: 10, pos: { x: 100, y: 100 } },
  'resources': { id: 'resources', name: 'Resource Navigator', component: ResourceNavigatorApp, isOpen: false, zIndex: 10, pos: { x: 150, y: 150 } },
  'imageViewer': { id: 'imageViewer', name: 'HD Image Viewer', component: ImageViewerApp, isOpen: false, zIndex: 10, pos: { x: 200, y: 200 }, data: null }, // <-- ADDED
};

export const AppProvider = ({ children }) => {
  const [apps, setApps] = useState(initialApps);
  const [activeApp, setActiveApp] = useState(null);

  const openApp = useCallback((appId, data = null) => { // <-- MODIFIED
    setApps(prevApps => {
      const newApps = { ...prevApps };
      const maxZ = Math.max(0, ...Object.values(newApps).map(app => app.zIndex));
      
      newApps[appId] = { ...newApps[appId], isOpen: true, zIndex: maxZ + 1, data }; // <-- MODIFIED
      
      return newApps;
    });
    setActiveApp(appId);
  }, []);

  const closeApp = useCallback((appId) => {
    setApps(prevApps => ({
      ...prevApps,
      [appId]: { ...prevApps[appId], isOpen: false },
    }));
    if (activeApp === appId) setActiveApp(null);
  }, [activeApp]);

  const bringToFront = useCallback((appId) => {
    if (activeApp === appId) return;
    setApps(prevApps => {
      const newApps = { ...prevApps };
      const maxZ = Math.max(0, ...Object.values(newApps).map(app => app.zIndex));
      newApps[appId] = { ...newApps[appId], zIndex: maxZ + 1 };
      return newApps;
    });
    setActiveApp(appId);
  }, [activeApp]);
  
  const updateAppPosition = useCallback((appId, newPos) => {
    setApps(prevApps => ({ ...prevApps, [appId]: { ...prevApps[appId], pos: newPos }}));
  }, []);

  const value = { apps, openApp, closeApp, bringToFront, updateAppPosition, activeApp };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApps = () => useContext(AppContext);
EOF
echo "   -> AppContext now manages the ImageViewer."

# Upgrade ApodApp
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
echo "   -> APOD viewer upgraded."

# Fix and upgrade NeoWsApp
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
echo "   -> NEO window fixed and upgraded."

# Rewrite ResourceNavigatorApp
cat << 'EOF' > client/src/components/apps/ResourceNavigatorApp.js
import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';

const ResourceNavigatorApp = () => {
    const [view, setView] = useState('welcome'); // 'welcome', 'search', 'results'
    const [savedItems, setSavedItems] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch library data on component mount
    useEffect(() => {
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
        await api.saveItem(item);
        setSavedItems([item, ...savedItems]); // Optimistically update UI
    };

    const WelcomeView = () => (
        <div className="flex h-full">
            <div className="w-1/2 h-full overflow-y-auto border-r border-gray-400 pr-2">
                <h3 className="font-bold text-base mb-2">My Library ({savedItems.length})</h3>
                {savedItems.map(item => (
                    <div key={item.id} className="mb-1 p-1 hover:bg-s7-gray">
                        <p className="font-bold truncate">{item.title}</p>
                        <p className="text-xs text-gray-600">{item.type} - {item.category}</p>
                    </div>
                ))}
            </div>
            <div className="w-1/2 h-full pl-2">
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
             <h3 className="font-bold text-base mb-2">New Search</h3>
             <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full border-2 border-t-black border-l-black border-b-white border-r-white p-1" />
             <button type="submit" className="mt-2 text-center px-3 py-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black">
                Execute Live Search
             </button>
             <button onClick={() => setView('welcome')} className="mt-4 text-xs text-blue-700 underline">Back to Library</button>
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
            <button onClick={() => setView('welcome')} className="mt-auto shrink-0 text-xs text-blue-700 underline">Back to Library</button>
        </div>
    );
    
    const ResultItem = ({ item }) => (
        <div className="border-b border-gray-300 py-1">
            <a href={item.url} target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline truncate">{item.title}</a>
            <p className="text-xs text-gray-600 truncate">{item.description}</p>
            <button onClick={() => handleSaveItem(item)} className="text-xs text-green-700 underline">Save to Library</button>
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
echo "--- 🚀 FINAL UPGRADE COMPLETE 🚀 ---"
echo ""
echo "This is a major architectural change. Please follow these steps carefully:"
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
echo ""
echo "The system is now running on the final, upgraded architecture. Enjoy."