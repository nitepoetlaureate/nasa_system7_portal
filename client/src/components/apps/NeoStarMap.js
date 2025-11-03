import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const NeoStarMap = ({ neoData }) => {
    const ref = useRef();

    useEffect(() => {
        if (!neoData) return;

        const svg = d3.select(ref.current);
        svg.selectAll("*").remove(); // Clear previous drawing

        const width = 300;
        const height = 300;
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const sunX = width / 2;
        const sunY = height / 2;

        const orbits = [
            { name: 'Mercury', radius: 40, color: 'gray' },
            { name: 'Venus', radius: 70, color: 'orange' },
            { name: 'Earth', radius: 100, color: '#3498db' },
            { name: 'Mars', radius: 140, color: '#e74c3c' },
        ];

        // Draw orbits
        orbits.forEach(orbit => {
            svg.append('circle')
                .attr('cx', sunX)
                .attr('cy', sunY)
                .attr('r', orbit.radius)
                .attr('stroke', orbit.color)
                .attr('stroke-opacity', 0.5)
                .attr('stroke-dasharray', '2,2')
                .attr('fill', 'none');
        });

        // Draw Sun
        svg.append('circle').attr('cx', sunX).attr('cy', sunY).attr('r', 15).attr('fill', 'yellow');

        // Draw Earth
        svg.append('circle').attr('cx', sunX).attr('cy', sunY - 100).attr('r', 5).attr('fill', '#3498db');

        // Simple representation of NEO
        const missDistanceKm = parseFloat(neoData.close_approach_data[0].miss_distance.kilometers);
        const missDistanceScaled = Math.max(5, missDistanceKm / 500000); // Scale down miss distance

        svg.append('path')
            .attr('d', `M ${sunX - 150}, ${sunY + missDistanceScaled} L ${sunX + 150}, ${sunY - missDistanceScaled}`)
            .attr('stroke', 'red')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');
            
        svg.append('circle').attr('cx', sunX + 20).attr('cy', sunY - missDistanceScaled).attr('r', 3).attr('fill', 'red')
            .append('animateMotion')
            .attr('path', `M ${sunX - 150}, ${sunY + missDistanceScaled} L ${sunX + 150}, ${sunY - missDistanceScaled}`)
            .attr('dur', '5s').attr('repeatCount', 'indefinite');


    }, [neoData]);

    return (
        <div className="bg-black border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white p-1">
            <svg ref={ref}></svg>
        </div>
    );
};

export default NeoStarMap;
