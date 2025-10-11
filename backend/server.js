// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// API routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
    });

    app.get('/api', (req, res) => {
        res.json({ message: 'Nemex Mining API' });
        });

        // Frontend routes
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
            });

            app.get('/login', (req, res) => {
                res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
                });

                app.get('/register', (req, res) => {
                    res.sendFile(path.join(__dirname, '../frontend/public/register.html'));
                    });

                    app.get('/dashboard', (req, res) => {
                        res.sendFile(path.join(__dirname, '../frontend/public/dashboard.html'));
                        });

                        app.get('/admin', (req, res) => {
                            res.sendFile(path.join(__dirname, '../frontend/public/admin.html'));
                            });

                            // Start server
                            app.listen(PORT, () => {
                                console.log(`Server running on port ${PORT}`);
                                });