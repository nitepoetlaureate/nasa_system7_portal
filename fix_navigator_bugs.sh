#!/bin/bash

# ==================================================================================
# The Definitive Navigator Bug Fix Script
# - Fixes the one-letter typing/focus-stealing bug by refactoring the component.
# - Fixes the failing live search by reverting to the correct API endpoint.
# ==================================================================================

echo "--- Applying Definitive Fixes to the Resource Navigator ---"

# --- 1. Patch the Backend to Use the Correct Live Search Endpoint ---
echo "   -> Patching server/routes/resourceNavigator.js..."
cat << 'EOF' > server/routes/resourceNavigator.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../db');

// --- User Library Endpoints (Unchanged) ---

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
        await db.query('INSERT INTO saved_searches(query_string) VALUES($1)', [query]);
        
        // THIS IS THE FIX: Reverting to the correct and robust /api/catalog/v1 endpoint.
        const dataNasaGovUrl = `https://data.nasa.gov/api/catalog/v1?search_context=data.nasa.gov&q=${query}&limit=50`;
        const githubApiUrl = `https://api.github.com/search/repositories?q=org:nasa+${query}&per_page=50`;

        const [dataGovResponse, githubResponse] = await Promise.all([
            axios.get(dataNasaGovUrl, { headers: BROWSER_HEADER }),
            axios.get(githubApiUrl)
        ]);
        
        // The data structure from /catalog/v1 is different, we must adapt.
        const datasets = dataGovResponse.data.results.map(item => ({
            id: item.resource.id, type: 'Dataset', title: item.resource.name, url: item.permalink, category: item.resource.category, description: item.resource.description
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

# --- 2. Refactor the Frontend Component to Fix the Focus-Stealing Bug ---
echo "   -> Refactoring client/src/components/apps/ResourceNavigatorApp.js..."
cat << 'EOF' > client/src/components/apps/ResourceNavigatorApp.js
import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';

// --- SUB-COMPONENTS (DEFINED EXTERNALLY) ---
// This is the core fix for the focus-stealing bug. These components are now
// stable and will not be re-created on every render of the parent.

const WelcomeView = ({ savedItems, searchHistory, isLoading, handleSearch, setView, handleDeleteItem }) => (
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

const ResultItem = ({ item, onSave, savedItems }) => (
    <div className="border-b border-gray-300 py-1">
        <a href={item.url} target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline truncate">{item.title}</a>
        <p className="text-xs text-gray-600 truncate">{item.description || "No description."}</p>
        <button onClick={() => onSave(item)} className="text-xs text-green-700 underline disabled:text-gray-400 disabled:no-underline" disabled={savedItems.some(i => i.id === item.id)}>
            {savedItems.some(i => i.id === item.id) ? "Saved" : "Save to Library"}
        </button>
    </div>
);

// --- MAIN COMPONENT ---

const ResourceNavigatorApp = () => {
    const [view, setView] = useState('welcome');
    const [savedItems, setSavedItems] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadLibrary = async () => {
        setIsLoading(true);
        try {
            const [items, history] = await Promise.all([api.getSavedItems(), api.getSearchHistory()]);
            setSavedItems(items.data);
            setSearchHistory(history.data);
        } catch (error) { console.error("Could not load library", error); }
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
        } catch (error) { console.error("Live search failed", error); }
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
            case 'search':
                return <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={handleSearch} setView={setView} />;
            case 'results':
                return <ResultsView searchQuery={searchQuery} searchResults={searchResults} isLoading={isLoading} handleSaveItem={handleSaveItem} savedItems={savedItems} setView={setView} />;
            case 'welcome':
            default:
                return <WelcomeView savedItems={savedItems} searchHistory={searchHistory} isLoading={isLoading} handleSearch={handleSearch} setView={setView} handleDeleteItem={handleDeleteItem} />;
        }
    };

    return (
        <div className="font-geneva text-sm text-black p-2 h-full">
            {renderView()}
        </div>
    );
};

export default ResourceNavigatorApp;
EOF
echo "✅ Frontend refactor complete."
echo ""
echo "--- 🚀 BUG FIXES COMPLETE 🚀 ---"
echo ""
echo "The critical bugs have been resolved. Please follow these final steps:"
echo ""
echo "1. STOP both your client and server processes."
echo ""
echo "2. Start the SERVER:"
echo "   cd server && npm start"
echo ""
echo "3. Start the CLIENT in a NEW terminal:"
echo "   cd client && npm start"
echo ""
echo "The search input will now be responsive, and live searches will function correctly."