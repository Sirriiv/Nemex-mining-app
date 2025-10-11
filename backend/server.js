// server.js

// 1. Load environment variables from .env file
require('dotenv').config();

// 2. Import packages
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// Serve static files from frontend - UPDATED FOR PRODUCTION
const frontendPath = path.join(__dirname, '..', 'frontend', 'public');
console.log('Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

// ---
// 3. Import and Connect Routes
// ---

// Import the new user routes file
const userRoutes = require('./routes/userRoutes');

// Set up the base path for user-related API requests
app.use('/api/users', userRoutes);

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
  });

  // A simple test route for the root path
  app.get('/api', (req, res) => {
    res.json({ message: 'Server Root is Alive! API is working.' });
    });

    // Serve the main frontend file for the root route
    app.get('/', (req, res) => {
      const indexPath = path.join(frontendPath, 'index.html');
        console.log('Serving index from:', indexPath);
          res.sendFile(indexPath);
          });

          // Serve frontend files for common routes
          app.get('/login', (req, res) => {
            res.sendFile(path.join(frontendPath, 'login.html'));
            });

            app.get('/register', (req, res) => {
              res.sendFile(path.join(frontendPath, 'register.html'));
              });

              app.get('/dashboard', (req, res) => {
                res.sendFile(path.join(frontendPath, 'dashboard.html'));
                });

                // Start server
                app.listen(PORT, () => {
                  console.log(`Server running on port ${PORT}`);
                    console.log(`Current directory: ${__dirname}`);
                      console.log(`Frontend path: ${frontendPath}`);
                      });