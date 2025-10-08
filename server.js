// server.js - Backend for Nemex Mining App

// 1. IMPORT DEPENDENCIES
const express = require('express');
const cors = require('cors');

// 2. INITIALIZE EXPRESS
const app = express();
const PORT = 3000;

// 3. MIDDLEWARE
// Enable Cross-Origin Resource Sharing (CORS) for frontend requests
app.use(cors()); 
// Enable Express to read JSON data from the body of requests
app.use(express.json());

// 4. DATABASE CONNECTION (PLACEHOLDER - We'll add Mongo next)
// For now, we'll confirm the server is running before connecting to a database.

// 5. SAMPLE API ROUTE (Testing the connection)
app.get('/api/status', (req, res) => {
    res.json({ message: 'Nemex Backend is running!', status: 'OK' });
});

// 6. START THE SERVER
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access status at http://localhost:${PORT}/api/status`);
});