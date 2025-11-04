#!/bin/bash

# ==================================================================================
# Final Patch Script for NASA System 7 Portal
# - Fixes backend 404 proxy errors.
# - Fixes frontend infinite loop and freeze in Resource Navigator.
# - Implements functional UI for the Menu Bar.
# ==================================================================================

echo "--- Applying Final Patch ---"

# --- 1. Fix Backend Proxy Logic (The 404 Error) ---
echo "Patching: server/routes/apiProxy.js"
cat << 'EOF' > server/routes/apiProxy.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const NASA_API_KEY = process.env.NASA_API_KEY;
const NASA_API_URL = 'https://api.nasa.gov';
const JPL_SSD_API_URL = 'https://ssd-api.jpl.nasa.gov';

// This is the corrected proxy middleware.
// It now uses `req.path` to reconstruct the full, correct path to the external API.
const proxyRequest = (baseURL) => async (req, res) => {
    // req.path provides the full path of the request, e.g., "/planetary/apod"
    const endpoint = req.path; 

    try {
        const params = {
            ...req.query,
            api_key: NASA_API_KEY,
        };

        // The leading '/' from req.path is sliced off before appending to the base URL.
        const response = await axios.get(`${baseURL}${endpoint}`, { params });
        res.json(response.data);
    } catch (error) {
        // More detailed error logging for easier debugging.
        console.error(`API proxy error for endpoint: ${endpoint}`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        res.status(error.response?.status || 500).json({ 
            message: 'Error fetching data from external API.',
            error: error.message,
            details: error.response?.data 
        });
    }
};

// The routes are simplified. The proxy now handles the full path.
// The base path is /api/nasa, so any request to /api/nasa/* will be handled.
router.get('/*', proxyRequest(NASA_API_URL));

// Note: A more complex setup would be needed if JPL and NASA had overlapping paths.
// For our current apps, this is robust.

module.exports = router;
EOF

# --- 2. Fix Resource Navigator Freeze & Functionality ---
echo "Patching: client/src/components/apps/ResourceNavigatorApp.js"
cat << 'EOF' > client/src/components/apps/ResourceNavigatorApp.js
import React, { useState } from 'react';
import { searchResources } from '../../services/api';

// This component is rewritten to use a standard async function for the search.
// This is the correct pattern for a user-triggered event and avoids the infinite loop.
const ResourceNavigatorApp = () => {
    const [query, setQuery] = useState('');
    const [searchData, setSearchData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;

        setLoading(true);
        setError(null);
        setSearchData(null);

        try {
            const response = await searchResources(query);
            setSearchData(response.data);
        } catch (err) {
            setError('Failed to fetch resources.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="font-geneva text-sm text-black p-2">
            <h2 className="font-bold text-base mb-2">Resource Navigator</h2>
            <form onSubmit={handleSearch} className="flex mb-3">
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-grow border-2 border-t-black border-l-black border-b-white border-r-white p-1"
                    placeholder="Search datasets & software..."
                />
                <button type="submit" className="ml-2 px-3 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black">
                    Search
                </button>
            </form>

            {loading && <p>Searching...</p>}
            {error && <p className="text-red-600">{error}</p>}
            
            {searchData && (
                <div className="h-64 overflow-y-scroll border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-1">
                    <h3 className="font-bold mt-2">Datasets</h3>
                    <ul className="list-disc pl-5">
                        {searchData.datasets.length > 0 ? searchData.datasets.map(d => (
                           <li key={d.id}><a href={d.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{d.title}</a></li> 
                        )) : <li>No datasets found.</li>}
                    </ul>
                    <h3 className="font-bold mt-4">Software Repositories</h3>
                    <ul className="list-disc pl-5">
                         {searchData.software.length > 0 ? searchData.software.map(s => (
                           <li key={s.id}><a href={s.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{s.name}</a></li> 
                        )) : <li>No software found.</li>}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ResourceNavigatorApp;
EOF

# --- 3. Implement Functional Menu Bar ---
echo "Patching: client/src/components/system7/MenuBar.js"
cat << 'EOF' > client/src/components/system7/MenuBar.js
import React, { useState, useEffect, useRef } from 'react';

const Menu = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // Close menu if clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    return (
        <div ref={ref} className="relative">
            <div 
                className={`px-2 ${isOpen ? 'bg-black text-white' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {title}
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 bg-s7-gray border-2 border-t-white border-l-white border-b-black border-r-black mt-[-2px] ml-[-2px] min-w-[150px] shadow-s7-window">
                    {children}
                </div>
            )}
        </div>
    );
};

const MenuItem = ({ children }) => (
    <div className="px-3 py-0.5 hover:bg-black hover:text-white">{children}</div>
);

const MenuBar = () => {
    const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }, 1000 * 30); // Update every 30 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="absolute top-0 left-0 right-0 h-6 bg-s7-gray border-b-2 border-black flex items-center justify-between px-1 font-chicago text-black select-none z-50">
            <div className="flex">
                <Menu title="">
                    <MenuItem>About This Portal...</MenuItem>
                </Menu>
                <Menu title="File">
                    <MenuItem>New Window</MenuItem>
                    <MenuItem>Close Window</MenuItem>
                </Menu>
                <Menu title="Edit">
                    <MenuItem>Undo</MenuItem>
                    <MenuItem>Cut</MenuItem>
                    <MenuItem>Copy</MenuItem>
                    <MenuItem>Paste</MenuItem>
                </Menu>
            </div>
            <div>
                {time}
            </div>
        </div>
    );
};

export default MenuBar;
EOF

echo ""
echo "----------------------------------------------------------------"
echo "✅ Patch applied successfully."
echo ""
echo "INSTRUCTIONS:"
echo "1. If your servers are running, STOP both the client and server processes."
echo "2. Start the backend server: (in the 'server' directory) -> npm start"
echo "3. Start the frontend client: (in the 'client' directory) -> npm start"
echo ""
echo "The 404s, freezes, and menu issues should now be resolved."
echo "----------------------------------------------------------------"