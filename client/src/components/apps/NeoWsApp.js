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
