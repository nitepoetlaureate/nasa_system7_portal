import React, { useState } from 'react';

const NeoEducationalPanel = () => {
    const [activeTab, setActiveTab] = useState('basics'); // basics, history, defense, research

    const TabContent = () => {
        switch(activeTab) {
            case 'basics':
                return <NeoBasicsContent />;
            case 'history':
                return <ImpactHistoryContent />;
            case 'defense':
                return <PlanetaryDefenseContent />;
            case 'research':
                return <ResearchContent />;
            default:
                return <NeoBasicsContent />;
        }
    };

    return (
        <div className="font-geneva text-sm text-black p-1 flex flex-col h-full">
            {/* Header */}
            <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white mb-1 shrink-0">
                <h3 className="font-bold text-lg mb-2">NEO Educational Center</h3>

                {/* Tab Navigation */}
                <div className="flex space-x-1">
                    {['basics', 'history', 'defense', 'research'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-2 py-1 text-xs capitalize ${
                                activeTab === tab
                                    ? 'bg-s7-blue text-white'
                                    : 'hover:bg-gray-100'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white">
                <TabContent />
            </div>
        </div>
    );
};

const NeoBasicsContent = () => (
    <div className="space-y-4">
        <div>
            <h4 className="font-bold text-base mb-2">What are Near-Earth Objects?</h4>
            <p className="text-xs mb-3">
                Near-Earth Objects (NEOs) are comets and asteroids that have been nudged by the gravitational attraction of nearby planets into orbits that allow them to enter Earth's neighborhood.
            </p>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">Classification</h4>
            <div className="space-y-2 ml-4">
                <div className="text-xs">
                    <span className="font-bold">NECs (Near-Earth Comets):</span> Comets with orbits bringing them within 1.3 AU of the Sun
                </div>
                <div className="text-xs">
                    <span className="font-bold">NEAs (Near-Earth Asteroids):</span> Asteroids with orbits bringing them within 1.3 AU of Earth
                </div>
                <div className="text-xs ml-4">
                    <div>• <span className="font-bold">Atiras:</span> Entirely within Earth's orbit (a < 0.983 AU)</div>
                    <div>• <span className="font-bold">Atens:</span> Earth-crossing with a < 1.0 AU and Q > 0.983 AU</div>
                    <div>• <span className="font-bold">Apollos:</span> Earth-crossing with a > 1.0 AU and q < 1.017 AU</div>
                    <div>• <span className="font-bold">Amors:</span> Earth-approaching with 1.017 < q < 1.3 AU</div>
                </div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">Size Categories</h4>
            <div className="space-y-1 ml-4">
                <div className="text-xs">
                    <span className="font-bold text-green-600">Small (&lt;50m):</span> Burn up in atmosphere, pose little threat
                </div>
                <div className="text-xs">
                    <span className="font-bold text-yellow-600">Medium (50-500m):</span> Regional damage potential
                </div>
                <div className="text-xs">
                    <span className="font-bold text-orange-600">Large (500m-1km):</span> Continental damage possible
                </div>
                <div className="text-xs">
                    <span className="font-bold text-red-600">Huge (&gt;1km):</span> Global catastrophe potential
                </div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">Detection Methods</h4>
            <div className="space-y-2 ml-4 text-xs">
                <div><span className="font-bold">Optical Telescopes:</span> Track reflected sunlight, work best at night</div>
                <div><span className="font-bold">Radar Systems:</span> Active detection, precise orbit determination</div>
                <div><span className="font-bold">Infrared Observations:</span> Detect heat signatures, size estimation</div>
                <div><span className="font-bold">Space-based Telescopes:</span> No atmospheric interference, continuous coverage</div>
            </div>
        </div>

        <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <h4 className="font-bold text-sm mb-2">Did You Know?</h4>
            <ul className="text-xs space-y-1 ml-4">
                <li>• Over 90% of NEOs larger than 1km have been discovered</li>
                <li>• NASA's goal is to find 90% of NEOs larger than 140m by 2028</li>
                <li>• About 100 tons of space debris enters Earth's atmosphere daily</li>
                <li>• The first NEO was discovered in 1898 (433 Eros)</li>
            </ul>
        </div>
    </div>
);

const ImpactHistoryContent = () => (
    <div className="space-y-4">
        <div>
            <h4 className="font-bold text-base mb-2">Major Impact Events</h4>
            <div className="space-y-3">
                <div className="border-l-4 border-red-600 pl-3">
                    <div className="font-bold text-sm">Chicxulub Impact (66 million years ago)</div>
                    <div className="text-xs text-gray-600">Diameter: ~10km | Location: Yucatán Peninsula, Mexico</div>
                    <div className="text-xs">Caused dinosaur extinction, 180km crater, global devastation</div>
                </div>

                <div className="border-l-4 border-orange-600 pl-3">
                    <div className="font-bold text-sm">Tunguska Event (1908)</div>
                    <div className="text-xs text-gray-600">Diameter: ~50-60m | Location: Siberia, Russia</div>
                    <div className="text-xs">Airburst at 5-10km altitude, 2,000km² forest destruction</div>
                </div>

                <div className="border-l-4 border-yellow-600 pl-3">
                    <div className="font-bold text-sm">Chelyabinsk Meteor (2013)</div>
                    <div className="text-xs text-gray-600">Diameter: ~20m | Location: Chelyabinsk, Russia</div>
                    <div className="text-xs">Airburst at 29km altitude, 1,500 injuries, broken windows</div>
                </div>

                <div className="border-l-4 border-green-600 pl-3">
                    <div className="font-bold text-sm">Meteor Crater (50,000 years ago)</div>
                    <div className="text-xs text-gray-600">Diameter: ~50m | Location: Arizona, USA</div>
                    <div className="text-xs">1.2km diameter crater, well-preserved impact site</div>
                </div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">Impact Frequency</h4>
            <div className="space-y-1 ml-4 text-xs">
                <div><span className="font-bold">Daily:</span> Microscopic particles (dust)</div>
                <div><span className="font-bold">Yearly:</span> Basketball-sized objects (harmless)</div>
                <div><span className="font-bold">Century:</span> Tunguska-sized events (regional damage)</div>
                <div><span className="font-bold">Millennia:</span> City-destroying impacts</div>
                <div><span className="font-bold">Millions of years:</span> Extinction-level events</div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">Historical Significance</h4>
            <div className="space-y-2 text-xs">
                <div>• impacts have shaped Earth's geological and biological evolution</div>
                <div>• Impact delivery of water and organic compounds may have seeded life</div>
                <div>• Major extinctions created opportunities for new species to evolve</div>
                <div>• Impact craters provide valuable geological and mineral resources</div>
            </div>
        </div>

        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
            <h4 className="font-bold text-sm mb-2">Scientific Value</h4>
            <p className="text-xs">
                Impact craters are natural laboratories for studying planetary processes.
                They provide insights into Earth's history, planetary formation, and offer clues about potential future impacts.
            </p>
        </div>
    </div>
);

const PlanetaryDefenseContent = () => (
    <div className="space-y-4">
        <div>
            <h4 className="font-bold text-base mb-2">Planetary Defense Strategies</h4>
            <div className="space-y-3">
                <div className="bg-green-50 p-3 rounded">
                    <div className="font-bold text-sm mb-1">🎯 Kinetic Impactor</div>
                    <div className="text-xs">
                        High-speed spacecraft collision to change asteroid trajectory.
                        Most mature technology, demonstrated by NASA's DART mission.
                    </div>
                </div>

                <div className="bg-blue-50 p-3 rounded">
                    <div className="font-bold text-sm mb-1">💥 Nuclear Deflection</div>
                    <div className="text-xs">
                        Nuclear detonation near or on asteroid surface.
                        Most effective for large objects with short warning times.
                    </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded">
                    <div className="font-bold text-sm mb-1">🚀 Gravity Tractor</div>
                    <div className="text-xs">
                        Spacecraft hovers near asteroid, using gravity to gradually alter orbit.
                        Slow but precise, useful for smaller objects.
                    </div>
                </div>

                <div className="bg-purple-50 p-3 rounded">
                    <div className="font-bold text-sm mb-1">⚡ Ion Beam Shepherd</div>
                    <div className="text-xs">
                        Directed ion beam pushes asteroid continuously.
                        Low thrust but highly controllable over long periods.
                    </div>
                </div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">Early Warning Systems</h4>
            <div className="space-y-2 ml-4 text-xs">
                <div><span className="font-bold">CATALINA Sky Survey:</span> University of Arizona program since 1998</div>
                <div><span className="font-bold">Pan-STARRS:</span> Hawaiian telescopes, wide-field imaging</div>
                <div><span className="font-bold">LINEAR:</span> MIT Lincoln Laboratory, early pioneer</div>
                <div><span className="font-bold">NEOWISE:</span> NASA's infrared space telescope</div>
                <div><span className="font-bold">ATLAS:</span> Asteroid Terrestrial-impact Last Alert System</div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">International Cooperation</h4>
            <div className="space-y-2 text-xs">
                <div>• <span className="font-bold">IAU MPC:</span> Minor Planet Center coordinates global observations</div>
                <div>• <span className="font-bold">UN COPUOS:</span> Committee on Peaceful Uses of Outer Space</div>
                <div>• <span className="font-bold">Space Mission Planning Advisory Group:</span> International response coordination</div>
                <div>• <span className="font-bold">International Asteroid Warning Network:</span> Global monitoring system</div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">Recent Achievements</h4>
            <div className="space-y-2 ml-4 text-xs">
                <div><span className="font-bold">2022:</span> NASA's DART successfully impacts Dimorphos asteroid</div>
                <div><span className="font-bold">2021:</span> Lucy mission launched to study Trojan asteroids</div>
                <div><span className="font-bold">2020:</span> OSIRIS-REx sample return from asteroid Bennu</div>
                <div><span className="font-bold">2019:</span> Hayabusa2 samples from asteroid Ryugu</div>
            </div>
        </div>

        <div className="bg-red-50 p-3 rounded border border-red-200">
            <h4 className="font-bold text-sm mb-2">Response Timeline</h4>
            <div className="text-xs space-y-1">
                <div>• <span className="font-bold">Years+ warning:</span> Multiple deflection options available</div>
                <div>• <span className="font-bold">Months warning:</span> Limited options, evacuation planning</div>
                <div>• <span className="font-bold">Weeks warning:</span> Evacuation and emergency response only</div>
                <div>• <span className="font-bold">Days warning:</span> Local sheltering, minimal preparation</div>
            </div>
        </div>
    </div>
);

const ResearchContent = () => (
    <div className="space-y-4">
        <div>
            <h4 className="font-bold text-base mb-2">Current Research Areas</h4>
            <div className="space-y-2 ml-4 text-xs">
                <div><span className="font-bold">Composition Analysis:</span> Understanding asteroid makeup for deflection</div>
                <div><span className="font-bold">Orbit Determination:</span> Precise trajectory calculations and predictions</div>
                <div><span className="font-bold">Impact Modeling:</span> Computer simulations of collision effects</div>
                <div><span className="font-bold">Deflection Technology:</span> Testing various interception methods</div>
                <div><span className="font-bold">Detection Improvement:</span> Finding smaller, fainter objects</div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">Sample Return Missions</h4>
            <div className="space-y-3">
                <div className="border-l-4 border-blue-600 pl-3">
                    <div className="font-bold text-sm">Hayabusa2 (JAXA)</div>
                    <div className="text-xs">Samples from Ryugu (2014-2020) • Organic compounds discovered</div>
                </div>
                <div className="border-l-4 border-green-600 pl-3">
                    <div className="font-bold text-sm">OSIRIS-REx (NASA)</div>
                    <div className="text-xs">Samples from Bennu (2016-2023) • Water-bearing minerals found</div>
                </div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2Upcoming Missions</h4>
            <div className="space-y-2 ml-4 text-xs">
                <div><span className="font-bold">2024:</span> Hera (ESA) - DART impact assessment</div>
                <div><span className="font-bold">2027:</span> Psyche (NASA) - Metal asteroid study</div>
                <div><span className="font-bold">2028:</span> NEO Surveyor (NASA) - Infrared space telescope</div>
                <div><span className="font-bold">2030s:</span> Multiple asteroid mining missions planned</div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">Scientific Discoveries</h4>
            <div className="space-y-2 text-xs">
                <div>• Asteroids contain organic compounds and water ice</div>
                <div>• Some asteroids have moons or are binary systems</div>
                <div>• Rubble pile structure common in larger asteroids</div>
                <div>• Metallic asteroids may be cores of ancient protoplanets</div>
                <div>• NEAs could provide resources for space exploration</div>
            </div>
        </div>

        <div>
            <h4 className="font-bold text-base mb-2">Technology Development</h4>
            <div className="space-y-2 ml-4 text-xs">
                <div><span className="font-bold">Advanced Propulsion:</span> Solar sails, ion drives for intercept missions</div>
                <div><span className="font-bold">Autonomous Systems:</span> AI-powered navigation and targeting</div>
                <div><span className="font-bold">Advanced Sensors:</span> Next-generation detection and tracking</div>
                <div><span className="font-bold">Material Science:</span> Better understanding of asteroid properties</div>
            </div>
        </div>

        <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <h4 className="font-bold text-sm mb-2">Get Involved</h4>
            <div className="text-xs space-y-1">
                <div>• Citizen science programs help discover new asteroids</div>
                <div>• Amateur astronomers contribute to tracking efforts</div>
                <div>• Educational programs for students and teachers</div>
                <div>• Public awareness events like Asteroid Day (June 30)</div>
            </div>
        </div>
    </div>
);

export default NeoEducationalPanel;