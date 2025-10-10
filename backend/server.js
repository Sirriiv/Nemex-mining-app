// SIMPLE WORKING SERVER
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 FINALLY WORKING!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    serverTime: new Date().toLocaleString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Server running on http://localhost:' + PORT);
  console.log('✅ Try it: curl http://localhost:3000/');
});
