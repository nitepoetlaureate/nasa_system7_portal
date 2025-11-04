import React, { useState, useEffect } from 'react';

const NeoAlertSystem = ({ alerts, onDismiss }) => {
    const [expandedAlert, setExpandedAlert] = useState(null);
    const [alertHistory, setAlertHistory] = useState([]);

    useEffect(() => {
        // Add new alerts to history
        if (alerts.length > 0) {
            setAlertHistory(prev => {
                const newHistory = [...prev];
                alerts.forEach(alert => {
                    if (!newHistory.find(h => h.id === alert.id)) {
                        newHistory.push({
                            ...alert,
                            timestamp: new Date(),
                            acknowledged: false
                        });
                    }
                });
                return newHistory.slice(-50); // Keep last 50 alerts
            });
        }
    }, [alerts]);

    const getAlertSeverity = (torinoLevel, riskScore) => {
        if (torinoLevel >= 3) return { level: 'critical', color: 'red', icon: '🚨' };
        if (torinoLevel >= 1) return { level: 'high', color: 'orange', icon: '⚠️' };
        if (riskScore >= 50) return { level: 'medium', color: 'yellow', icon: '⚡' };
        return { level: 'low', color: 'blue', icon: 'ℹ️' };
    };

    const getAlertMessage = (alert) => {
        const severity = getAlertSeverity(alert.torino_level, alert.risk_score);

        switch(severity.level) {
            case 'critical':
                return `CRITICAL: ${alert.name} poses significant impact threat (Torino ${alert.torino_level})`;
            case 'high':
                return `ALERT: ${alert.name} requires monitoring (Torino ${alert.torino_level})`;
            case 'medium':
                return `WARNING: ${alert.name} shows elevated risk factors`;
            default:
                return `NOTICE: ${alert.name} requires standard observation`;
        }
    };

    const acknowledgeAlert = (alertId) => {
        setAlertHistory(prev =>
            prev.map(alert =>
                alert.id === alertId ? { ...alert, acknowledged: true } : alert
            )
        );
    };

    if (alerts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
            {/* Active Alerts */}
            {alerts.map((alert, index) => {
                const severity = getAlertSeverity(alert.torino_level, alert.risk_score);
                const isExpanded = expandedAlert === alert.id;

                return (
                    <div
                        key={alert.id}
                        className={`bg-white border-2 rounded-lg shadow-lg transform transition-all duration-300 ${
                            severity.level === 'critical' ? 'border-red-600 animate-pulse' :
                            severity.level === 'high' ? 'border-orange-500' :
                            severity.level === 'medium' ? 'border-yellow-500' :
                            'border-blue-500'
                        }`}
                        style={{
                            animation: `slideInUp 0.3s ease-out ${index * 0.1}s both`
                        }}
                    >
                        {/* Alert Header */}
                        <div
                            className={`p-3 cursor-pointer flex items-center justify-between ${
                                severity.level === 'critical' ? 'bg-red-50' :
                                severity.level === 'high' ? 'bg-orange-50' :
                                severity.level === 'medium' ? 'bg-yellow-50' :
                                'bg-blue-50'
                            }`}
                            onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                        >
                            <div className="flex items-center space-x-2">
                                <span className="text-xl">{severity.icon}</span>
                                <div>
                                    <div className={`font-bold text-xs ${
                                        severity.level === 'critical' ? 'text-red-800' :
                                        severity.level === 'high' ? 'text-orange-800' :
                                        severity.level === 'medium' ? 'text-yellow-800' :
                                        'text-blue-800'
                                    }`}>
                                        NEO Alert {index + 1}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {new Date().toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs font-bold rounded ${
                                    severity.level === 'critical' ? 'bg-red-600 text-white' :
                                    severity.level === 'high' ? 'bg-orange-500 text-white' :
                                    severity.level === 'medium' ? 'bg-yellow-500 text-black' :
                                    'bg-blue-500 text-white'
                                }`}>
                                    {severity.level.toUpperCase()}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        acknowledgeAlert(alert.id);
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Alert Content */}
                        <div className="p-3">
                            <div className="text-xs font-bold mb-2">
                                {getAlertMessage(alert)}
                            </div>

                            <div className="text-xs space-y-1 mb-3">
                                <div><span className="font-bold">Object:</span> {alert.name}</div>
                                <div><span className="font-bold">Miss Distance:</span> {alert.miss_distance.toLocaleString()} km</div>
                                <div><span className="font-bold">Approach Date:</span> {new Date(alert.approach_date).toLocaleDateString()}</div>
                                <div><span className="font-bold">Risk Score:</span> {alert.risk_score}/100</div>
                                <div><span className="font-bold">Torino Level:</span> {alert.torino_level}</div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="border-t pt-3 mt-3">
                                    <div className="text-xs space-y-2">
                                        <div className="font-bold">Recommended Actions:</div>
                                        <div className="ml-4 space-y-1">
                                            {alert.torino_level >= 3 && (
                                                <>
                                                    <div>• Initiate emergency response protocols</div>
                                                    <div>• Contact international space agencies</div>
                                                    <div>• Prepare public notification systems</div>
                                                </>
                                            )}
                                            {alert.torino_level >= 1 && alert.torino_level < 3 && (
                                                <>
                                                    <div>• Increase observation frequency</div>
                                                    <div>• Refine orbital calculations</div>
                                                    <div>• Assess deflection mission requirements</div>
                                                </>
                                            )}
                                            {alert.torino_level === 0 && alert.risk_score >= 50 && (
                                                <>
                                                    <div>• Enhanced monitoring schedule</div>
                                                    <div>• Update trajectory predictions</div>
                                                    <div>• Review historical observation data</div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex space-x-2 mt-3">
                                        <button
                                            onClick={() => setExpandedAlert(null)}
                                            className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Open detailed tracking view
                                                console.log('Open tracking for', alert.name);
                                            }}
                                            className="px-3 py-1 bg-s7-blue text-white text-xs rounded hover:bg-s7-blue-dark"
                                        >
                                            Track Object
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!isExpanded && (
                                <button
                                    onClick={() => setExpandedAlert(alert.id)}
                                    className="text-xs text-s7-blue hover:text-s7-blue-dark font-semibold"
                                >
                                    View Details →
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Alert Summary Bar */}
            {alerts.length > 1 && (
                <div className="bg-gray-900 text-white p-2 rounded-lg flex items-center justify-between">
                    <div className="text-xs">
                        {alerts.length} Active NEO Alert{alerts.length > 1 ? 's' : ''}
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                    >
                        Dismiss All
                    </button>
                </div>
            )}

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes slideInUp {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

// Alert Configuration Component
export const NeoAlertConfiguration = ({ onConfigChange }) => {
    const [config, setConfig] = useState({
        torinoThreshold: 1,
        riskThreshold: 50,
        distanceThreshold: 5000000, // 5 million km
        soundEnabled: true,
        desktopNotifications: false,
        emailAlerts: false,
        alertFrequency: 'immediate' // immediate, hourly, daily
    });

    const handleConfigChange = (key, value) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        onConfigChange(newConfig);
    };

    return (
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <h3 className="font-bold text-sm mb-3">Alert Configuration</h3>

            <div className="space-y-3">
                <div>
                    <label className="text-xs font-bold">Torino Scale Threshold</label>
                    <select
                        value={config.torinoThreshold}
                        onChange={(e) => handleConfigChange('torinoThreshold', parseInt(e.target.value))}
                        className="w-full border border-gray-300 px-2 py-1 text-xs mt-1"
                    >
                        <option value="0">All Objects</option>
                        <option value="1">Normal Objects</option>
                        <option value="2">Merits Attention</option>
                        <option value="3">Threatening</option>
                        <option value="4">Close Encounter</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-bold">Risk Score Threshold</label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={config.riskThreshold}
                        onChange={(e) => handleConfigChange('riskThreshold', parseInt(e.target.value))}
                        className="w-full mt-1"
                    />
                    <div className="text-xs text-gray-600">{config.riskThreshold}/100</div>
                </div>

                <div>
                    <label className="text-xs font-bold">Distance Threshold (km)</label>
                    <select
                        value={config.distanceThreshold}
                        onChange={(e) => handleConfigChange('distanceThreshold', parseInt(e.target.value))}
                        className="w-full border border-gray-300 px-2 py-1 text-xs mt-1"
                    >
                        <option value="1000000">1 million km</option>
                        <option value="5000000">5 million km</option>
                        <option value="10000000">10 million km</option>
                        <option value="50000000">50 million km</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="flex items-center text-xs">
                        <input
                            type="checkbox"
                            checked={config.soundEnabled}
                            onChange={(e) => handleConfigChange('soundEnabled', e.target.checked)}
                            className="mr-2"
                        />
                        Enable Sound Alerts
                    </label>

                    <label className="flex items-center text-xs">
                        <input
                            type="checkbox"
                            checked={config.desktopNotifications}
                            onChange={(e) => handleConfigChange('desktopNotifications', e.target.checked)}
                            className="mr-2"
                        />
                        Desktop Notifications
                    </label>

                    <label className="flex items-center text-xs">
                        <input
                            type="checkbox"
                            checked={config.emailAlerts}
                            onChange={(e) => handleConfigChange('emailAlerts', e.target.checked)}
                            className="mr-2"
                        />
                        Email Alerts
                    </label>
                </div>

                <div>
                    <label className="text-xs font-bold">Alert Frequency</label>
                    <select
                        value={config.alertFrequency}
                        onChange={(e) => handleConfigChange('alertFrequency', e.target.value)}
                        className="w-full border border-gray-300 px-2 py-1 text-xs mt-1"
                    >
                        <option value="immediate">Immediate</option>
                        <option value="hourly">Hourly Digest</option>
                        <option value="daily">Daily Summary</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default NeoAlertSystem;