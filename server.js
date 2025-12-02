// server.js - SIMPLE WORKING VERSION
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Force HTTPS in production (Render requirement)
app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));

// =============================================
// 🎯 BASIC API ENDPOINTS
// =============================================

app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'NemexCoin API is running!',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Mock user for testing
        const mockUser = {
            user_id: 1,
            name: "Test User",
            email: "test@nemexcoin.com",
            balance: 12.5432
        };

        // Simple validation
        if (email === 'test@nemexcoin.com' && password === '123456') {
            res.json({
                success: true,
                user: mockUser,
                message: 'Login successful'
            });
        } else {
            res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// =============================================
// 🎯 WALLET API ROUTES
// =============================================

let walletRoutes;
try {
    console.log('🔄 Loading wallet routes...');
    walletRoutes = require('./backend/wallet-routes.js');
    console.log('✅ Wallet routes loaded successfully');
} catch (error) {
    console.error('❌ ERROR loading wallet routes:', error.message);
    
    // Create fallback routes
    const express = require('express');
    walletRoutes = express.Router();
    
    walletRoutes.get('/test', (req, res) => {
        res.json({ 
            success: true, 
            message: 'Wallet API fallback route'
        });
    });
}

// Mount wallet routes
app.use('/api/wallet', walletRoutes);
console.log('✅ Wallet API routes mounted at /api/wallet');

// Catch-all for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 NemexCoin app running on port ${PORT}`);
    console.log(`🏠 Homepage: http://localhost:${PORT}`);
    console.log(`🔑 Login: http://localhost:${PORT}/login`);
    console.log(`👛 Wallet: http://localhost:${PORT}/wallet`);
    console.log(`🩺 API Health: http://localhost:${PORT}/api/health`);
    console.log(`👛 Wallet Test: http://localhost:${PORT}/api/wallet/test`);
    console.log(`📧 Demo: test@nemexcoin.com / 123456`);
});