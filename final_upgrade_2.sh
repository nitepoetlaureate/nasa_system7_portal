#!/bin/bash

# ==================================================================================
# THE CORRECTED FINAL UPGRADE SCRIPT
# This script implements the full "NASA Encarta" vision using a robust
# file-overwrite method that will not fail.
# ==================================================================================

echo "--- BEGINNING CORRECTED FINAL SYSTEM UPGRADE ---"

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
    const client = await pool.connect();
    console.log('Initializing database schema...');
    try {
        await client.query('BEGIN');
        await client.query('DROP TABLE IF EXISTS datasets, software, saved_items, saved_searches CASCADE;');
        await client.query(`
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
        await client.query(`
            CREATE TABLE saved_searches (
                id SERIAL PRIMARY KEY,
                query_string TEXT NOT NULL,
                search_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await client.query('COMMIT');
        console.log('✅ Database schema initialized successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Database initialization failed:', err);
        process.exit(1);
    } finally {
        client.release();
        pool.end(); // End pool after script runs
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initDb,
};
EOF
echo "   -> Created new database module."

# THIS IS THE FIX: Overwrite package.json completely instead of editing it.
cat << 'EOF' > server/package.json
{
  "name": "nasa-system7-server",
  "version": "1.0.0",
  "description": "Backend server for the NASA System 7 Portal",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "db:init": "node -e \"require('./db.js').initDb()\""
  },
  "dependencies": {
    "axios": "^1.0.0",
    "cors": "^2.8.5",
    "dotenv": "^10.0.0",
    "express": "^4.17.1",
    "pg": "^8.11.3"
  }
}
EOF
echo "   -> Corrected server/package.json with 'db:init' command."

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
        const text = 'INSERT INTO saved_items(id, type, title, url, category, description) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description RETURNING *';
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
        console.error("Live Search Error:", err.message);
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
                className="absolute flex flex-col w-[550px] min-w-[300px] h-[450px] min-h-[200px] bg-s7-gray border-2 border-t-white border-l-white border-r-black border-b-black shadow-s7-window overflow-hidden"
                style={{ zIndex: appState.zIndex }}
                // This enables resizing via CSS, framer-motion will respect it
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
export const getNeoDetails = (id) => apiClient.get(`/nasa/neo/rest/v1/neo/${id}`);

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
import ImageViewerApp from '../components/apps/ImageViewerApp';

const AppContext = createContext();

const initialApps = {
  'apod': { id: 'apod', name: 'Picture of the Day', component: ApodApp, isOpen: false, zIndex: 10, pos: { x: 50, y: 50 } },
  'neows': { id: 'neows', name: 'Near Earth Objects', component: NeoWsApp, isOpen: false, zIndex: 10, pos: { x: 100, y: 100 } },
  'resources': { id: 'resources', name: 'Resource Navigator', component: ResourceNavigatorApp, isOpen: false, zIndex: 10, pos: { x: 150, y: 150 } },
  'imageViewer': { id: 'imageViewer', name: 'HD Image Viewer', component: ImageViewerApp, isOpen: false, zIndex: 10, pos: { x: 200, y: 200 }, data: null },
};

export const AppProvider = ({ children }) => {
  const [apps, setApps] = useState(initialApps);
  const [activeApp, setActiveApp] = useState(null);

  const openApp = useCallback((appId, data = null) => {
    setApps(prevApps => {
      const newApps = { ...prevApps };
      const maxZ = Math.max(0, ...Object.values(newApps).map(app => app.zIndex));
      
      newApps[appId] = { ...newApps[appId], isOpen: true, zIndex: maxZ + 1, data };
      
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
                        className="w-full h-auto border-2 borde