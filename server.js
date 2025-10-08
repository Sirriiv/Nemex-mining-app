// server.js

// 1. Load environment variables from .env file (MUST be at the very top)
require('dotenv').config();

// 2. Import packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 3000; 

// MIDDLEWARE
app.use(cors()); 
app.use(express.json()); // For handling JSON data in requests (needed for registration)

// -------------------------------------------------------------
// 3. Import and Connect Routes
// -------------------------------------------------------------

// Import the new user routes file
const userRoutes = require('./routes/userRoutes'); 

// Set up the base path for user-related API requests: /api/users
app.use('/api/users', userRoutes);

// A simple test route for the root path
app.get('/', (req, res) => {
    res.json({ message: 'Server Root is Alive! API is ready at /api/users' });
    });


    // -------------------------------------------------------------
    // 4. Database Connection Logic
    // -------------------------------------------------------------

    // Get the connection string from the environment variable
    const uri = process.env.MONGO_URI; 

    // Connect to MongoDB
    if (uri) {
        mongoose.connect(uri)
                .then(() => {
                            console.log('🎉 MongoDB Connection Successful!');
                                        
                                                    // Start listening for web requests ONLY after the DB is connected
                                                                app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
                                                                        })
                                                                                .catch((error) => {
                                                                                            console.error('❌ MongoDB Connection Error. Check your MONGO_URI and Atlas settings:', error.message);
                                                                                                        // Exit the process if the database connection fails
                                                                                                                    process.exit(1); 
                                                                                                                            });
                                                                                                                            } else {
                                                                                                                                console.error('❌ MONGO_URI not found in .env file. Connection aborted.');
                                                                                                                                }