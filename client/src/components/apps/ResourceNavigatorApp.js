import React, { useState } from 'react';
// CORRECTED IMPORT: Imports 'executeEnhancedSearch' which exists in your api.js
import { executeEnhancedSearch } from '../../services/api';

// This component is a functional, simple search client.
// It fixes the crash from 'final_patch.sh' which called a non-existent function.
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
            // CORRECTED API CALL: Uses 'executeEnhancedSearch' with a valid params object
            const response = await executeEnhancedSearch({ 
                query, 
                filters: {}, 
                page: 1 
            });
            setSearchData(response.data);
        } catch (err) {
            setError('Failed to fetch resources.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Helper component for rendering results
    const renderResults = () => {
        if (!searchData) return null;
        
        const { datasets = [], software = [] } = searchData;

        return (
            <div className="h-64 overflow-y-scroll border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-1">
                <h3 className="font-bold mt-2">Datasets ({datasets.length})</h3>
                <ul className="list-disc pl-5">
                    {datasets.length > 0 ? datasets.map((d, i) => (
                       <li key={d.id || i}><a href={d.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{d.title}</a></li> 
                    )) : <li>No datasets found.</li>}
                </ul>
                <h3 className="font-bold mt-4">Software ({software.length})</h3>
                <ul className="list-disc pl-5">
                     {software.length > 0 ? software.map((s, i) => (
                       <li key={s.id || i}><a href={s.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{s.name || s.title}</a></li> 
                    )) : <li>No software found.</li>}
                </ul>
            </div>
        );
    };

    return (
        <div className="font-geneva text-sm text-black p-2 h-full flex flex-col">
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

            <div className="flex-grow">
                {loading && <p>Searching...</p>}
                {error && <p className="text-red-600">{error}</p>}
                {renderResults()}
            </div>
        </div>
    );
};

export default ResourceNavigatorApp;
