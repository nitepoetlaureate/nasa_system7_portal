// A simple service to construct deep-link URLs for external NASA/JPL web tools.

const jplUrlBuilder = (tool, params) => {
    switch(tool) {
        case 'nasa_eyes':
            // Example params: { type: 'asteroid', id: 'A000433' }
            if (params.type && params.id) {
                return `https://eyes.nasa.gov/apps/solar-system/#/sc_${params.type}?id=${params.id}`;
            }
            return null;
        
        case 'skyview':
            // Example params: { position: 'Crab Nebula' }
            if (params.position) {
                return `https://skyview.gsfc.nasa.gov/current/cgi/query.pl?position=${encodeURIComponent(params.position)}`;
            }
            return null;

        default:
            return null;
    }
};

module.exports = jplUrlBuilder;
