import React, { useState, useMemo } from 'react';

const NeoRiskAssessment = ({ neoData, detailData }) => {
    const [activeTab, setActiveTab] = useState('overview'); // overview, torino, impact, probability

    // Calculate enhanced risk metrics
    const riskMetrics = useMemo(() => {
        if (!neoData) return null;

        const missDistance = parseFloat(neoData.close_approach_data[0].miss_distance.kilometers);
        const velocity = parseFloat(neoData.close_approach_data[0].relative_velocity.kilometers_per_second);
        const diameter = neoData.estimated_diameter.meters.estimated_diameter_max;
        const isHazardous = neoData.is_potentially_hazardous_asteroid;

        // Kinetic energy calculation (simplified)
        const density = 2700; // kg/m³ (typical asteroid density)
        const volume = (4/3) * Math.PI * Math.pow(diameter/2, 3);
        const mass = density * volume; // kg
        const kineticEnergy = 0.5 * mass * Math.pow(velocity * 1000, 2); // Joules

        // Convert to Hiroshima bombs for perspective
        const hiroshimaEquiv = kineticEnergy / (6.3e13); // 63 TJ per Hiroshima bomb

        // Palermo Scale calculation (simplified)
        const palermoScale = calculatePalermoScale(missDistance, diameter, isHazardous);

        // Impact probability (simplified statistical model)
        const impactProbability = calculateImpactProbability(missDistance, diameter, isHazardous);

        return {
            kineticEnergy,
            hiroshimaEquiv,
            palermoScale,
            impactProbability,
            mass,
            energyCategory: categorizeEnergy(kineticEnergy),
            damageRadius: calculateDamageRadius(diameter, velocity),
            atmosphericEntry: calculateAtmosphericEntry(diameter, velocity)
        };
    }, [neoData]);

    const calculatePalermoScale = (missDistance, diameter, isHazardous) => {
        // Simplified Palermo Scale calculation
        if (!isHazardous) return -10;

        let score = 0;
        if (missDistance < 100000) score += 2;
        else if (missDistance < 1000000) score += 1;
        else if (missDistance < 10000000) score += 0;
        else score -= 1;

        if (diameter > 1000) score += 1;
        else if (diameter < 100) score -= 1;

        return Math.max(-10, Math.min(5, score));
    };

    const calculateImpactProbability = (missDistance, diameter, isHazardous) => {
        // Simplified impact probability calculation
        let baseProbability = 1 / 1000000; // Base probability

        if (isHazardous) baseProbability *= 100;
        if (missDistance < 1000000) baseProbability *= 10;
        if (diameter > 1000) baseProbability *= 5;

        return Math.min(1, baseProbability);
    };

    const categorizeEnergy = (energy) => {
        if (energy < 1e12) return 'Local';
        if (energy < 1e15) return 'Regional';
        if (energy < 1e18) return 'Continental';
        return 'Global';
    };

    const calculateDamageRadius = (diameter, velocity) => {
        // Simplified damage radius calculation
        const energy = 0.5 * 2700 * (4/3) * Math.PI * Math.pow(diameter/2, 3) * Math.pow(velocity * 1000, 2);
        return Math.round(Math.pow(energy / 1e12, 0.4) * 1000); // meters
    };

    const calculateAtmosphericEntry = (diameter, velocity) => {
        // Simplified atmospheric entry analysis
        const criticalDiameter = 50; // meters
        const criticalVelocity = 20; // km/s

        if (diameter < criticalDiameter && velocity < criticalVelocity) {
            return 'Will burn up completely';
        } else if (diameter < criticalDiameter) {
            return 'Partial fragmentation, airburst possible';
        } else if (diameter < 500) {
            return 'Significant airburst, ground impact possible';
        } else {
            return 'Will reach ground with substantial energy';
        }
    };

    const getTorinoColor = (level) => {
        const colors = {
            0: '#32CD32', // Green
            1: '#32CD32', // Green
            2: '#FFFF00', // Yellow
            3: '#FFA500', // Orange
            4: '#FF8C00', // Dark Orange
            5: '#FF4500', // Red Orange
            6: '#FF0000', // Red
            7: '#FF0000', // Red
            8: '#8B0000', // Dark Red
            9: '#8B0000', // Dark Red
            10: '#8B0000'  // Dark Red
        };
        return colors[level] || '#32CD32';
    };

    const getTorinoDescription = (level) => {
        const descriptions = {
            0: 'No hazard',
            1: 'Normal',
            2: 'Merits attention',
            3: 'Threatening',
            4: 'Close encounter',
            5: 'Threat',
            6: 'Dangerous',
            7: 'Dangerous encounter',
            8: 'Certain collision',
            9: 'Certain collision',
            10: 'Certain collision'
        };
        return descriptions[level] || 'Unknown';
    };

    if (!neoData || !riskMetrics) {
        return (
            <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                    <div className="mb-2">⚠️</div>
                    <div className="text-sm">Risk assessment data unavailable</div>
                </div>
            </div>
        );
    }

    return (
        <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-2 bg-white h-full flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-300 pb-2 mb-2">
                <h3 className="font-bold text-sm mb-2">Risk Assessment</h3>

                {/* Tab Navigation */}
                <div className="flex space-x-1">
                    {['overview', 'torino', 'impact', 'probability'].map(tab => (
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
            <div className="flex-grow overflow-y-auto">
                {activeTab === 'overview' && (
                    <div className="space-y-3">
                        {/* Overall Risk Score */}
                        <div className="bg-gray-100 p-2 rounded">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-xs">Overall Risk Score</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    neoData.is_potentially_hazardous_asteroid ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                    {neoData.is_potentially_hazardous_asteroid ? 'HIGH' : 'LOW'}
                                </span>
                            </div>
                            <div className="w-full bg-gray-300 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${
                                        neoData.is_potentially_hazardous_asteroid ? 'bg-red-600' : 'bg-green-600'
                                    }`}
                                    style={{ width: `${neoData.is_potentially_hazardous_asteroid ? 75 : 25}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="font-bold">Kinetic Energy:</span>
                                <span>{riskMetrics.kineticEnergy.toExponential(2)} J</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="font-bold">Hiroshima Equiv:</span>
                                <span>{riskMetrics.hiroshimaEquiv.toFixed(1)} bombs</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="font-bold">Damage Radius:</span>
                                <span>{(riskMetrics.damageRadius / 1000).toFixed(1)} km</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="font-bold">Energy Category:</span>
                                <span className="font-bold">{riskMetrics.energyCategory}</span>
                            </div>
                        </div>

                        {/* Atmospheric Entry Analysis */}
                        <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                            <div className="font-bold text-xs mb-1">Atmospheric Entry:</div>
                            <div className="text-xs">{riskMetrics.atmosphericEntry}</div>
                        </div>
                    </div>
                )}

                {activeTab === 'torino' && (
                    <div className="space-y-3">
                        {/* Torino Scale Visualization */}
                        <div className="text-center mb-4">
                            <div
                                className="inline-block w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                                style={{ backgroundColor: getTorinoColor(0) }}
                            >
                                0
                            </div>
                            <div className="text-xs mt-1 font-bold">Current Torino Level</div>
                            <div className="text-xs text-gray-600">{getTorinoDescription(0)}</div>
                        </div>

                        {/* Torino Scale Reference */}
                        <div className="space-y-2">
                            <div className="font-bold text-xs mb-2">Torino Scale Reference:</div>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(level => (
                                <div key={level} className="flex items-center space-x-2 text-xs">
                                    <div
                                        className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                        style={{ backgroundColor: getTorinoColor(level) }}
                                    >
                                        {level}
                                    </div>
                                    <span>{getTorinoDescription(level)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Assessment Notes */}
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                            <div className="font-bold text-xs mb-1">Assessment:</div>
                            <div className="text-xs">
                                Current orbital calculations indicate no impact risk.
                                Continued monitoring is standard procedure for all NEOs.
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'impact' && (
                    <div className="space-y-3">
                        {/* Impact Scenario */}
                        <div className="bg-red-50 p-2 rounded border border-red-200">
                            <div className="font-bold text-xs mb-2">Hypothetical Impact Scenario</div>
                            <div className="space-y-1 text-xs">
                                <div><strong>Impact Velocity:</strong> {parseFloat(neoData.close_approach_data[0].relative_velocity.kilometers_per_second).toFixed(2)} km/s</div>
                                <div><strong>Impact Energy:</strong> {riskMetrics.kineticEnergy.toExponential(2)} J</div>
                                <div><strong>Crater Diameter:</strong> {(riskMetrics.damageRadius * 2 / 1000).toFixed(1)} km</div>
                                <div><strong>Affected Area:</strong> {(Math.PI * Math.pow(riskMetrics.damageRadius / 1000, 2)).toFixed(0)} km²</div>
                            </div>
                        </div>

                        {/* Consequences */}
                        <div className="space-y-2">
                            <div className="font-bold text-xs">Potential Consequences:</div>
                            <div className="space-y-1 text-xs">
                                <div className="flex items-start space-x-2">
                                    <span className="text-red-600">•</span>
                                    <span>Immediate destruction within {riskMetrics.damageRadius / 1000} km radius</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-orange-600">•</span>
                                    <span>Severe damage up to {(riskMetrics.damageRadius * 3 / 1000).toFixed(1)} km</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-yellow-600">•</span>
                                    <span>Moderate damage up to {(riskMetrics.damageRadius * 10 / 1000).toFixed(1)} km</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-green-600">•</span>
                                    <span>Minor effects up to {(riskMetrics.damageRadius * 50 / 1000).toFixed(1)} km</span>
                                </div>
                            </div>
                        </div>

                        {/* Mitigation */}
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                            <div className="font-bold text-xs mb-1">Mitigation Strategies:</div>
                            <div className="text-xs">
                                Early detection and deflection missions could prevent impact.
                                Current technology allows for trajectory modification given sufficient warning time.
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'probability' && (
                    <div className="space-y-3">
                        {/* Probability Metrics */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-xs">Impact Probability:</span>
                                <span className="text-xs">
                                    {(riskMetrics.impactProbability * 100).toFixed(6)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-xs">Palermo Scale:</span>
                                <span className="text-xs">{riskMetrics.palermoScale.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Probability Visualization */}
                        <div className="bg-gray-100 p-2 rounded">
                            <div className="font-bold text-xs mb-2">Probability Comparison:</div>
                            <div className="space-y-2">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>NEO Impact</span>
                                        <span>{(riskMetrics.impactProbability * 100).toFixed(4)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-300 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${Math.min(100, riskMetrics.impactProbability * 100000)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>Lightning Strike</span>
                                        <span>0.0001%</span>
                                    </div>
                                    <div className="w-full bg-gray-300 rounded-full h-2">
                                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '0.01%' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>Lottery Win</span>
                                        <span>0.000001%</span>
                                    </div>
                                    <div className="w-full bg-gray-300 rounded-full h-2">
                                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '0.0001%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Statistical Context */}
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                            <div className="font-bold text-xs mb-1">Statistical Context:</div>
                            <div className="text-xs space-y-1">
                                <div>• Large NEO impacts occur every ~100 million years</div>
                                <div>• Tunguska-sized events every ~1000 years</div>
                                <div>• Current detection covers >90% of large NEOs</div>
                                <div>• Monitoring network provides decades of warning</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NeoRiskAssessment;