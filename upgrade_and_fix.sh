#!/bin/bash

# ==================================================================================
# Upgrade and Fix Script for NASA System 7 Portal Client
# This script updates core dependencies to stable, modern versions to resolve
# the issues caused by 'npm audit fix --force'.
# ==================================================================================

echo "--- Starting Project Upgrade ---"

# --- 1. Overwrite package.json with modern dependencies ---
echo "Updating client/package.json..."
cat << 'EOF' > client/package.json
{
  "name": "nasa-system7-client",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "axios": "^1.0.0",
    "framer-motion": "^10.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.23",
    "tailwindcss": "^3.3.2"
  }
}
EOF

# --- 2. Overwrite tailwind.config.js for Tailwind CSS v3 compatibility ---
# The 'purge' key is replaced with 'content' in v3.
echo "Updating client/tailwind.config.js for Tailwind v3..."
cat << 'EOF' > client/tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        'chicago': ['Chicago', 'sans-serif'],
        'geneva': ['Geneva', 'sans-serif'],
      },
      colors: {
        's7-gray': {
          DEFAULT: '#c0c0c0',
          dark: '#808080',
          light: '#e0e0e0',
        },
        's7-blue': '#0000a0',
      },
      boxShadow: {
        's7-inset': 'inset 2px 2px 0px 0px #ffffff, inset -2px -2px 0px 0px #808080',
        's7-outset': 'inset -2px -2px 0px 0px #ffffff, inset 2px 2px 0px 0px #808080',
        's7-window': '4px 4px 0px 0px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        's7-stripes': 'repeating-linear-gradient(45deg, transparent, transparent 2px, #808080 2px, #808080 4px)',
        's7-pattern': 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVQIW2NkYGD4z0A4+QEAJAADfTPL36wAAAAASUVORK5CYII=")',
      }
    },
  },
  plugins: [],
}
EOF

echo ""
echo "----------------------------------------------------------------"
echo "✅ Upgrade complete. Your project files are now up-to-date."
echo ""
echo "FINAL INSTRUCTIONS:"
echo ""
echo "1. Navigate into the client directory:"
echo "   cd client"
echo ""
echo "2. Your old 'node_modules' folder is corrupted. Remove it completely:"
echo "   rm -rf node_modules package-lock.json"
echo ""
echo "3. Perform a fresh, clean installation:"
echo "   npm install"
echo ""
echo "4. Start the application (in one terminal):"
echo "   npm start"
echo ""
echo "5. Start the server (in a second terminal from the 'server' directory):"
echo "   npm start"
echo "----------------------------------------------------------------"