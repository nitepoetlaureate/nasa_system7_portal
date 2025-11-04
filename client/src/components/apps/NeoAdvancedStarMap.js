import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const NeoAdvancedStarMap = ({ neoData }) => {
    const ref = useRef();
    const [viewMode, setViewMode] = useState('2d'); // 2d, 3d, trajectory
    const [showLabels, setShowLabels] = useState(true);
    const [animationSpeed, setAnimationSpeed] = useState(1);
    const [selectedView, setSelectedView] = useState('top'); // top, side, perspective

    useEffect(() => {
        if (!neoData) return;

        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();

        const width = 400;
        const height = 400;
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const centerX = width / 2;
        const centerY = height / 2;

        // Background
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', '#000814');

        // Stars background
        const starsData = Array.from({ length: 100 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2,
            brightness: Math.random()
        }));

        svg.selectAll('.star')
            .data(starsData)
            .enter()
            .append('circle')
            .attr('class', 'star')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.size)
            .attr('fill', 'white')
            .attr('opacity', d => d.brightness);

        // Orbital mechanics data
        const orbits = [
            { name: 'Mercury', radius: 50, color: '#8C7853', period: 88, size: 3 },
            { name: 'Venus', radius: 80, color: '#FFC649', period: 225, size: 6 },
            { name: 'Earth', radius: 120, color: '#4169E1', period: 365, size: 6 },
            { name: 'Mars', radius: 160, color: '#CD5C5C', period: 687, size: 4 },
        ];

        // Draw orbital paths
        orbits.forEach(orbit => {
            svg.append('circle')
                .attr('cx', centerX)
                .attr('cy', centerY)
                .attr('r', orbit.radius)
                .attr('stroke', orbit.color)
                .attr('stroke-opacity', 0.3)
                .attr('stroke-dasharray', '5,5')
                .attr('fill', 'none')
                .attr('class', 'orbit-path');
        });

        // Draw Sun
        const sunGradient = svg.append('defs')
            .append('radialGradient')
            .attr('id', 'sun-gradient');

        sunGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#FDB813');

        sunGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#FFA000');

        svg.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', 20)
            .attr('fill', 'url(#sun-gradient)')
            .attr('stroke', '#FFA000')
            .attr('stroke-width', 2);

        // Sun glow effect
        svg.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', 25)
            .attr('fill', 'none')
            .attr('stroke', '#FDB813')
            .attr('stroke-opacity', 0.3)
            .attr('stroke-width', 5);

        // Draw planets with animations
        orbits.forEach((orbit, index) => {
            const planetGroup = svg.append('g').attr('class', `planet-${orbit.name.toLowerCase()}`);

            // Planet
            planetGroup.append('circle')
                .attr('cx', centerX)
                .attr('cy', centerY - orbit.radius)
                .attr('r', orbit.size)
                .attr('fill', orbit.color)
                .attr('stroke', 'white')
                .attr('stroke-width', 1);

            // Planet label
            if (showLabels) {
                planetGroup.append('text')
                    .attr('x', centerX)
                    .attr('y', centerY - orbit.radius - orbit.size - 5)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .attr('font-size', '10px')
                    .text(orbit.name);
            }

            // Animate planet orbit
            planetGroup.append('animateTransform')
                .attr('attributeName', 'transform')
                .attr('type', 'rotate')
                .attr('from', `0 ${centerX} ${centerY}`)
                .attr('to', `360 ${centerX} ${centerY}`)
                .attr('dur', `${orbit.period / animationSpeed}s`)
                .attr('repeatCount', 'indefinite');
        });

        // Enhanced NEO trajectory calculation
        const missDistanceKm = parseFloat(neoData.close_approach_data[0].miss_distance.kilometers);
        const velocityKmps = parseFloat(neoData.close_approach_data[0].relative_velocity.kilometers_per_second);
        const diameterM = parseFloat(neoData.estimated_diameter.meters.estimated_diameter_max);

        // Scale calculations for visualization
        const auToKm = 149597870.7; // 1 AU in kilometers
        const earthRadius = 120; // Earth's orbital radius in our visualization
        const scaleFactor = earthRadius / auToKm;

        // Calculate NEO trajectory parameters
        const missDistanceScaled = Math.max(10, missDistanceKm * scaleFactor);
        const neoRadius = Math.max(3, Math.min(10, diameterM / 100)); // Scale based on actual diameter

        // Determine NEO trajectory angle based on approach data
        const approachAngle = Math.random() * Math.PI * 2; // Simplified - would use actual orbital parameters

        // Calculate NEO orbital path (elliptical)
        const semiMajorAxis = 200 + Math.random() * 100; // Varied orbital sizes
        const eccentricity = 0.2 + Math.random() * 0.6; // Varied eccentricity
        const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);

        // Draw NEO orbital path
        const ellipsePath = svg.append('ellipse')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('rx', semiMajorAxis)
            .attr('ry', semiMinorAxis)
            .attr('stroke', neoData.is_potentially_hazardous_asteroid ? '#FF4444' : '#44FF44')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-dasharray', '10,5')
            .attr('fill', 'none')
            .attr('transform', `rotate(${approachAngle * 180 / Math.PI} ${centerX} ${centerY})`);

        // NEO group for animation
        const neoGroup = svg.append('g').attr('class', 'neo-object');

        // NEO trail
        const trailPath = `M ${centerX - semiMajorAxis}, ${centerY}
                          A ${semiMajorAxis},${semiMinorAxis} 0 1,1 ${centerX + semiMajorAxis},${centerY}`;

        // Create trail effect
        for (let i = 0; i < 5; i++) {
            neoGroup.append('circle')
                .attr('r', neoRadius * (1 - i * 0.15))
                .attr('fill', neoData.is_potentially_hazardous_asteroid ? '#FF4444' : '#44FF44')
                .attr('opacity', 0.3 - i * 0.05)
                .append('animateMotion')
                .attr('path', trailPath)
                .attr('dur', `${15 / animationSpeed}s`)
                .attr('begin', `${i * 0.5}s`)
                .attr('repeatCount', 'indefinite');
        }

        // Main NEO object
        const neoCircle = neoGroup.append('circle')
            .attr('r', neoRadius)
            .attr('fill', neoData.is_potentially_hazardous_asteroid ? '#FF0000' : '#00FF00')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('filter', 'url(#neo-glow)');

        // Add glow effect for NEO
        const defs = svg.append('defs');
        const glowFilter = defs.append('filter')
            .attr('id', 'neo-glow');

        glowFilter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');

        const feMerge = glowFilter.append('feMerge');
        feMerge.append('feMergeNode')
            .attr('in', 'coloredBlur');
        feMerge.append('feMergeNode')
            .attr('in', 'SourceGraphic');

        // Animate NEO along its orbital path
        neoCircle.append('animateMotion')
            .attr('path', trailPath)
            .attr('dur', `${15 / animationSpeed}s`)
            .attr('repeatCount', 'indefinite');

        // NEO label
        if (showLabels) {
            const neoLabel = neoGroup.append('text')
                .attr('fill', 'white')
                .attr('font-size', '10px')
                .attr('font-weight', 'bold')
                .text(neoData.name.split(' ')[0]); // Shortened name

            neoLabel.append('animateMotion')
                .attr('path', trailPath)
                .attr('dur', `${15 / animationSpeed}s`)
                .attr('repeatCount', 'indefinite');
        }

        // Close approach indicator
        if (missDistanceKm < 5000000) { // Within 5 million km
            const approachIndicator = svg.append('g')
                .attr('class', 'approach-indicator');

            approachIndicator.append('circle')
                .attr('cx', centerX + 120) // Earth position
                .attr('cy', centerY)
                .attr('r', 30)
                .attr('fill', 'none')
                .attr('stroke', '#FFFF00')
                .attr('stroke-width', 2)
                .attr('opacity', 0.8)
                .append('animate')
                .attr('attributeName', 'r')
                .attr('values', '30;40;30')
                .attr('dur', '2s')
                .attr('repeatCount', 'indefinite');

            approachIndicator.append('text')
                .attr('x', centerX + 120)
                .attr('y', centerY + 50)
                .attr('text-anchor', 'middle')
                .attr('fill', '#FFFF00')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .text('CLOSE APPROACH');
        }

        // Scale indicator
        const scaleGroup = svg.append('g').attr('class', 'scale-indicator');
        scaleGroup.append('line')
            .attr('x1', 20)
            .attr('y1', height - 20)
            .attr('x2', 120)
            .attr('y2', height - 20)
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        scaleGroup.append('text')
            .attr('x', 70)
            .attr('y', height - 10)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .text('1 AU');

        // Legend
        const legendGroup = svg.append('g').attr('class', 'legend');
        const legendY = 20;

        legendGroup.append('rect')
            .attr('x', width - 150)
            .attr('y', legendY)
            .attr('width', 140)
            .attr('height', 100)
            .attr('fill', 'black')
            .attr('fill-opacity', 0.7)
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        legendGroup.append('text')
            .attr('x', width - 145)
            .attr('y', legendY + 15)
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text('Legend');

        const legendItems = [
            { color: '#4169E1', label: 'Earth' },
            { color: neoData.is_potentially_hazardous_asteroid ? '#FF0000' : '#00FF00', label: 'NEO' },
            { color: '#FFFF00', label: 'Close Approach' },
        ];

        legendItems.forEach((item, index) => {
            const yPos = legendY + 30 + index * 20;
            legendGroup.append('circle')
                .attr('cx', width - 135)
                .attr('cy', yPos)
                .attr('r', 5)
                .attr('fill', item.color);

            legendGroup.append('text')
                .attr('x', width - 125)
                .attr('y', yPos + 4)
                .attr('fill', 'white')
                .attr('font-size', '10px')
                .text(item.label);
        });

    }, [neoData, showLabels, animationSpeed, selectedView]);

    return (
        <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-1 bg-black h-full flex flex-col">
            {/* Advanced Controls */}
            <div className="bg-gray-900 p-2 border-b border-gray-600 flex justify-between items-center">
                <div className="text-white text-xs font-bold">Advanced Orbital Tracking</div>
                <div className="flex space-x-2">
                    <label className="text-white text-xs flex items-center">
                        <input
                            type="checkbox"
                            checked={showLabels}
                            onChange={(e) => setShowLabels(e.target.checked)}
                            className="mr-1"
                        />
                        Labels
                    </label>
                    <select
                        value={animationSpeed}
                        onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                        className="text-xs bg-gray-800 text-white px-1"
                    >
                        <option value="0.5">0.5x</option>
                        <option value="1">1x</option>
                        <option value="2">2x</option>
                        <option value="5">5x</option>
                    </select>
                </div>
            </div>

            {/* Visualization Area */}
            <div className="flex-grow">
                <svg ref={ref} className="w-full h-full"></svg>
            </div>

            {/* Information Panel */}
            <div className="bg-gray-900 p-2 border-t border-gray-600">
                <div className="text-white text-xs grid grid-cols-2 gap-2">
                    <div>
                        <span className="font-bold">Miss Distance:</span> {parseFloat(neoData?.close_approach_data[0]?.miss_distance?.kilometers || 0).toLocaleString()} km
                    </div>
                    <div>
                        <span className="font-bold">Velocity:</span> {parseFloat(neoData?.close_approach_data[0]?.relative_velocity?.kilometers_per_second || 0).toFixed(2)} km/s
                    </div>
                    <div>
                        <span className="font-bold">Diameter:</span> {Math.round(neoData?.estimated_diameter?.meters?.estimated_diameter_max || 0)} m
                    </div>
                    <div>
                        <span className="font-bold">Status:</span> {neoData?.is_potentially_hazardous_asteroid ? 'HAZARDOUS' : 'SAFE'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NeoAdvancedStarMap;