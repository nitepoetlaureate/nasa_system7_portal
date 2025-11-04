#!/bin/bash

# ==================================================================================
# "Flesh It Out" Script for the Resource Navigator Frontend
# This overhauls the UI to be a much richer, more interactive explorer.
# ==================================================================================

echo "--- Overhauling the Resource Navigator Frontend ---"

cat << 'EOF' > client/src/components/apps/ResourceNavigatorApp.js
import React, { useState } from 'react';
import { searchResources } from '../../services/api';
import { ApodIcon, NeoWsIcon } from '../../assets/icons'; // Using generic icons for view

const ResourceNavigatorApp = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;

        setLoading(true);
        setError(null);
        setResults(null);
        setSelectedItem(null);

        try {
            const response = await searchResources(query);
            setResults(response.data);
        } catch (err) {
            setError('Failed to fetch resources from live APIs.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="font-geneva text-sm text-black p-1 flex flex-col h-full">
            {/* --- Search Bar --- */}
            <form onSubmit={handleSearch} className="flex mb-1 shrink-0">
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-grow border-2 border-t-black border-l-black border-b-white border-r-white p-1"
                    placeholder="Search for 'Juno', 'Earth', 'Python'..."
                />
                <button type="submit" className="ml-2 px-3 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black">
                    Search
                </button>
            </form>

            {/* --- Main Content Area --- */}
            <div className="flex-grow flex h-0">
                {/* --- Results List --- */}
                <div className="w-1/2 h-full overflow-y-scroll border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-1 bg-white">
                    {loading && <p>Searching live APIs...</p>}
                    {error && <p className="text-red-600">{error}</p>}
                    
                    {results && (
                        <>
                            <h3 className="font-bold">Datasets ({results.datasets.length})</h3>
                            <ul className="pl-2">
                                {results.datasets.map(d => (
                                   <li key={d.id} onClick={() => setSelectedItem({type: 'Dataset', ...d})} className={`cursor-pointer hover:bg-s7-blue hover:text-white ${selectedItem?.id === d.id ? 'bg-s7-blue text-white' : ''}`}>
                                       {d.title}
                                   </li> 
                                ))}
                            </ul>
                            <h3 className="font-bold mt-2">Software ({results.software.length})</h3>
                            <ul className="pl-2">
                                 {results.software.map(s => (
                                   <li key={s.id} onClick={() => setSelectedItem({type: 'Software', ...s})} className={`cursor-pointer hover:bg-s7-blue hover:text-white ${selectedItem?.id === s.id ? 'bg-s7-blue text-white' : ''}`}>
                                       {s.name}
                                   </li> 
                                ))}
                            </ul>
                        </>
                    )}
                </div>

                {/* --- Preview Pane --- */}
                <div className="w-1/2 h-full ml-1 border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white flex flex-col">
                    {selectedItem ? (
                        <>
                            <h3 className="font-bold text-base mb-2 shrink-0">{selectedItem.title || selectedItem.name}</h3>
                            <div className="text-xs mb-2 shrink-0">
                                <p><span className="font-bold">Type:</span> {selectedItem.type}</p>
                                <p><span className="font-bold">Category:</span> {selectedItem.category}</p>
                            </div>
                            <p className="text-xs text-justify italic overflow-y-auto mb-2 flex-grow">
                                {selectedItem.description || "No description provided."}
                            </p>
                            <a 
                                href={selectedItem.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-center w-full block mt-auto shrink-0 px-3 py-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black"
                            >
                                View Resource
                            </a>
                        </>
                    ) : (
                        <div className="m-auto text-center text-gray-500">
                            <p>Select an item to see details.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Status Bar --- */}
            <div className="shrink-0 mt-1 text-xs border-t border-gray-400 pt-1">
                {results ? `Found ${results.datasets.length} datasets and ${results.software.length} software packages.` : 'Ready.'}
            </div>
        </div>
    );
};

export default ResourceNavigatorApp;
EOF

# --- Also patch the live API backend to include descriptions ---
echo "Patching backend to fetch and return descriptions..."
cat << 'EOF' > server/routes/resourceNavigator.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const jplUrlBuilder = require('../services/jplUrlBuilder');

router.get('/search', async (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    if (!query) {
        return res.status(400).json({ message: 'A search query is required.' });
    }

    console.log(`Performing LIVE search for: "${query}"`);

    const dataNasaGovUrl = `https://data.nasa.gov/api/catalog/v1?search_context=data.nasa.gov&q=${query}`;
    const githubApiUrl = `https://api.github.com/search/repositories?q=org:nasa+${query}`;

    try {
        const [dataGovResponse, githubResponse] = await Promise.all([
            axios.get(dataNasaGovUrl),
            axios.get(githubApiUrl, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            })
        ]);

        // --- Transform the Live Data (NOW WITH DESCRIPTIONS) ---
        const datasets = dataGovResponse.data.results.map(item => ({
            id: item.resource.id,
            title: item.resource.name,
            url: item.permalink,
            category: item.resource.category || 'Uncategorized',
            description: item.resource.description // <-- ADDED
        }));

        const software = githubResponse.data.items.map(item => ({
            id: item.id,
            name: item.name,
            url: item.html_url,
            category: item.language || 'Code',
            description: item.description // <-- ADDED
        }));

        res.json({ datasets, software });

    } catch (error) {
        console.error("LIVE API SEARCH FAILED:", error.message);
        res.status(500).json({ message: 'Failed to fetch data from live APIs.' });
    }
});

router.post('/build-url', (req, res) => {
    const { tool, params } = req.body;
    const url = jplUrlBuilder(tool, params);
    if (url) {
        res.json({ url });
    } else {
        res.status(400).json({ message: 'Invalid tool or parameters.' });
    }
});

module.exports = router;
EOF


echo ""
echo "✅ Frontend Overhaul Complete."
echo "INSTRUCTIONS: Stop and restart both your client and server for changes to take effect."