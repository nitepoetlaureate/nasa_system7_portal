#!/bin/bash

# ==================================================================================
# Critical Patch for the NEO Window Crash
# This fixes the crash by correctly handling the data from the API summary.
# ==================================================================================

echo "--- Patching the NEO Window Crash ---"

cat << 'EOF' > client/src/components/apps/NeoWsApp.js
import React, { useState } from 'react';
import useApi from '../../hooks/useApi';
import { getNeoFeed } from '../../services/api';

const DetailRow = ({ label, value }) => (
    <div className="flex justify-between border-b border-gray-300 py-0.5 text-xs">
        <span className="font-bold">{label}:</span>
        <span className="truncate">{value}</span>
    </div>
);

const NeoWsApp = () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, loading, error } = useApi(getNeoFeed, [today, today]);
    const [selectedNeo, setSelectedNeo] = useState(null);

    if (loading) return <p className="p-2">Loading Near Earth Objects...</p>;
    if (error) return <p className="p-2">Error: Could not fetch NEO data.</p>;
    if (!data) return null;

    const neoList = data.near_earth_objects[today] || [];
    // The first close_approach data point is the one for today.
    const closeApproach = selectedNeo?.close_approach_data[0];

    return (
        <div className="font-geneva text-sm text-black p-1 flex h-full">
            {/* --- List Pane --- */}
            <div className="w-1/2 h-full overflow-y-scroll border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-1 bg-white">
                <h3 className="font-bold text-base mb-2">Objects Near Earth ({today})</h3>
                {neoList.length > 0 ? (
                    <ul>
                        {neoList.map(neo => (
                            <li 
                                key={neo.id}
                                onClick={() => setSelectedNeo(neo)}
                                className={`cursor-pointer mb-1 p-1 truncate ${selectedNeo?.id === neo.id ? 'bg-s7-blue text-white' : 'hover:bg-s7-blue hover:text-white'}`}
                            >
                                {neo.name}
                            </li>
                        ))}
                    </ul>
                ) : <p>No objects tracked for today.</p>}
            </div>

            {/* --- Detail Pane --- */}
            <div className="w-1/2 h-full ml-1 border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white flex flex-col">
                {selectedNeo && closeApproach ? (
                    <>
                        <h3 className="font-bold text-base mb-2 shrink-0 truncate">{selectedNeo.name}</h3>
                        <div className="text-xs overflow-y-auto">
                            <DetailRow label="Potentially Hazardous" value={selectedNeo.is_potentially_hazardous_asteroid ? 'Yes' : 'No'} />
                            <DetailRow label="Est. Diameter (Max)" value={`${Math.round(selectedNeo.estimated_diameter.meters.estimated_diameter_max)} meters`} />
                            <h4 className="font-bold mt-3 mb-1">Closest Approach Today</h4>
                            <DetailRow label="Time (UTC)" value={closeApproach.close_approach_date_full.split(' ')[1]} />
                            <DetailRow label="Velocity" value={`${parseFloat(closeApproach.relative_velocity.kilometers_per_second).toFixed(2)} km/s`} />
                            <DetailRow label="Miss Distance" value={`${parseInt(closeApproach.miss_distance.kilometers).toLocaleString()} km`} />
                             <h4 className="font-bold mt-3 mb-1">Orbital Data</h4>
                            <DetailRow label="Orbiting Body" value={closeApproach.orbiting_body} />
                            {/* 
                                THIS IS THE FIX: The 'orbital_data' object does not exist in the 'feed' endpoint.
                                We remove the lines that caused the crash. We will add them back in a more advanced way later.
                            */}
                            <p className="italic text-gray-500 mt-2 text-center">More detailed orbital data available via the JPL DB.</p>
                        </div>
                        <a href={selectedNeo.nasa_jpl_url} target="_blank" rel="noreferrer" className="text-center w-full block mt-auto shrink-0 px-3 py-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-s7-gray active:border-t-black active:border-l-black">
                            View Orbit in JPL DB
                        </a>
                    </>
                ) : (
                    <div className="m-auto text-center text-gray-500">
                        <p>Select an object from the list to see its details.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NeoWsApp;
EOF

echo ""
echo "✅ NEO Window crash has been patched. Restart your client to see the changes."