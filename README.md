# NASA System 7 Portal

This project is a full-stack web application designed to interact with NASA and JPL APIs, presented with a user interface inspired by Apple's classic System 7 operating system.

## Project Structure

- **/server**: Node.js & Express backend. It proxies API requests to NASA to securely handle the API key and serves data to the frontend.
- **/client**: React frontend. This is the System 7 user interface, built with Tailwind CSS.

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### 1. Configure API Key

Before you can run the application, you must add your NASA API key.

- Navigate to the `/server` directory.
- You will see a file named `.env`. Open it.
- Replace `YOUR_NASA_API_KEY` with your actual key obtained from [api.nasa.gov](https://api.nasa.gov).

# server/.env
NASA_API_KEY=YOUR_NASA_API_KEY
PORT=3001

### 2. Install Dependencies

You need to install dependencies for both the server and the client.

- **For the server:**
cd server
npm install

- **For the client:**
cd ../client
npm install

### 3. Run the Application

Both the frontend and backend servers need to be running concurrently.

- **To run the backend server:**
# From the /server directory
npm start
The server will start on http://localhost:3001.

- **To run the frontend client (in a new terminal):**
# From the /client directory
npm start
The React development server will start, and your browser should automatically open to http://localhost:3000.

### How It Works
- The React application (client) makes API requests to its own backend server (e.g., `/api/apod`).
- The Express server (backend) receives these requests. It attaches your secret NASA API key and forwards the request to the actual NASA API endpoint.
- This proxy approach ensures your NASA API key is never exposed to the user's browser, keeping it secure.
- The UI is built with Tailwind CSS, configured to replicate the fonts (Chicago, Geneva), colors, and window styles of System 7.
- Window dragging and management are handled by the React AppContext and framer-motion.
