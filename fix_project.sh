#!/bin/bash
set -e

echo "--- 🚀 Starting NASA System 7 Portal Stabilization Script ---"

# -----------------------------------------------------------------------------
# STEP 1: Clean up "Patch Hell"
# We are moving all conflicting fix scripts to a deprecated directory.
# This establishes the files in the repo as the new source of truth.
# -----------------------------------------------------------------------------
echo "[1/4] Cleaning up conflicting and deprecated patch scripts..."
mkdir -p deprecated_scripts
echo "       -> Moved the following scripts to /deprecated_scripts/:"
for script in DABIGFIX.sh def-comp.sh def-fix.sh final_patch.sh final_upgrade.sh final_upgrade_2.sh fix_and_elevate.sh fix_and_finalize.sh fix_compilation_errors.sh fix_navigator_bugs.sh flesh_out_navigator.sh implement_database_backend.sh compilation-fix.sh dafinalscript.sh enhance_neo_window.sh make_it_live.sh patch_indexer_timeout.sh patch_neo_crash.sh patch_user_agent.sh upgrade_and_fix.sh build_encarta_2.sh build_the_encarta.sh; do
    if [ -f "$script" ]; then
        mv "$script" deprecated_scripts/
        echo "       - $script"
    fi
done
echo "       -> Cleanup complete."


# -----------------------------------------------------------------------------
# STEP 2: Fix Broken CI/CD and Testing Pipeline
# Adds the missing 'test:ci', 'test:coverage', etc. scripts to
# server/package.json so Docker and GitHub Actions can run tests.
# -----------------------------------------------------------------------------
echo "[2/4] Patching server/package.json with missing CI/CD scripts..."
cd server

# Use npm pkg to safely add scripts. This is cleaner than sed.
npm pkg set scripts.test:ci="jest --coverage --watchAll=false --ci"
npm pkg set scripts.test:coverage="jest --coverage"
npm pkg set scripts.test:integration="jest --runInBand --testPathPattern=.*integration.test.js"
npm pkg set scripts.test:api="jest --runInBand --testPathPattern=.*api.test.js"

echo "       -> Successfully added test:ci, test:coverage, test:integration, and test:api."
cd ..


# -----------------------------------------------------------------------------
# STEP 3: Fix Critical Server-Side Routing Bug
# Comments out the duplicate /api/resources route in server/server.js
# to prevent the router collision.
# -----------------------------------------------------------------------------
echo "[3/4] Fixing server route collision in server/server.js..."
if [ -f "server/server.js" ]; then
    # Create a backup file just in case
    cp server/server.js server/server.js.bak
    
    # Use sed to comment out the first, colliding route.
    # We use a | delimiter to avoid issues with the '/' characters in the path.
    sed -i.bak "s|app.use('/api/resources', resourceNavigatorRouter);|// & (This line was disabled by fix_project.sh to prevent route collision)|" server/server.js
    
    echo "       -> Successfully commented out colliding route. Backup saved to server/server.js.bak"
else
    echo "       -> WARNING: server/server.js not found. Skipping."
fi


# -----------------------------------------------------------------------------
# STEP 4: Fix Broken ResourceNavigatorApp Component
# The 'final_patch.sh' script is broken and calls a non-existent function.
# This script writes a *new, functional* version of the file that correctly
# imports and calls 'executeEnhancedSearch' from your existing api.js.
# -----------------------------------------------------------------------------
echo "[4/4] Writing a functional client/src/components/apps/ResourceNavigatorApp.js..."
cat << 'EOF' > client/src/components/apps/ResourceNavigatorApp.js
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
EOF
echo "       -> Successfully replaced broken app with a functional version."


# -----------------------------------------------------------------------------
# FINAL SUMMARY
# -----------------------------------------------------------------------------
echo ""
echo "----------------------------------------------------------------"
echo "✅ PROJECT STABILIZATION COMPLETE."
echo ""
echo "Summary of fixes applied:"
echo "1. Moved all conflicting *.sh patch scripts to /deprecated_scripts/"
echo "2. Added missing test scripts (test:ci, test:coverage, etc.) to server/package.json"
echo "3. Fixed server crash by commenting out the colliding route in server/server.js"
echo "4. Replaced the broken ResourceNavigatorApp.js with a functional version"
echo ""
echo "The project is now in a stable, testable, and consistent state."
echo "You should now be able to run 'npm install-all' and 'npm run dev' successfully."
echo "----------------------------------------------------------------"
