// server.js - COMPLETE FIXED VERSION WITH PROPER CORS
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// 🎯 SIMPLIFIED CORS SETUP - ONE LAYER ONLY
// =============================================

// Use ONLY this CORS middleware - Remove ALL other manual CORS headers
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// REMOVED: Custom CORS headers middleware (CONFLICTING!)
// REMOVED: app.use((req, res, next) => { res.header(...) });

// REMOVED: app.options('*', (req, res) => { ... }) - Let cors handle it

// Serve static files WITHOUT manual CORS headers
app.use(express.static(path.join(__dirname, 'frontend'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.set('Cache-Control', 'public, max-age=3600');
        }
        // REMOVED: res.header('Access-Control-Allow-Origin', '*');
    }
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`🌐 ${new Date().toLocaleTimeString()} ${req.method} ${req.path} [Origin: ${req.headers.origin || 'none'}]`);
    next();
});

// =============================================
// 🎯 LOAD AND MOUNT WALLET ROUTES - NO CORS WRAPPER
// =============================================
console.log('\n🔄 LOADING WALLET ROUTES...');

const walletRoutesPath = path.join(__dirname, 'backend', 'wallet-routes.js');

if (fs.existsSync(walletRoutesPath)) {
    try {
        console.log(`✅ Found wallet routes at: ${walletRoutesPath}`);

        // Clear require cache to ensure fresh load
        const modulePath = require.resolve(walletRoutesPath);
        if (require.cache[modulePath]) {
            delete require.cache[modulePath];
        }

        // Load the wallet routes
        const walletRoutes = require(walletRoutesPath);

        // REMOVED: CORS wrapper - Let the main CORS middleware handle it
        // Mount the wallet routes WITHOUT cors wrapper
        app.use('/api/wallet', walletRoutes);
        console.log('✅ Wallet routes mounted at /api/wallet');

        console.log('\n📋 AVAILABLE WALLET ENDPOINTS:');
        console.log('   POST   /api/wallet/create            - Create TON wallet');
        console.log('   POST   /api/wallet/login             - Login to wallet');
        console.log('   POST   /api/wallet/check             - Check if wallet exists');
        console.log('   POST   /api/wallet/session/create    - Create session');
        console.log('   POST   /api/wallet/session/check     - Check session');
        console.log('   POST   /api/wallet/session/destroy   - Destroy session');
        console.log('   GET    /api/wallet/balance/:address  - Get balance');
        console.log('   GET    /api/wallet/price/ton         - Get TON price');
        console.log('   POST   /api/wallet/validate          - Validate address');
        console.log('   GET    /api/wallet/test/generate     - Test wallet generation');
        console.log('   GET    /api/wallet/health            - Health check');
        console.log('   GET    /api/wallet/test              - Test endpoint');
        console.log('   POST   /api/wallet/send              - Send TON transaction');

    } catch (error) {
        console.error('❌ FAILED to load wallet routes:', error.message);
        console.error('Stack trace:', error.stack);

        // Create emergency router
        const emergencyRouter = express.Router();

        emergencyRouter.get('/health', (req, res) => {
            res.json({
                status: 'emergency-mode',
                message: 'Wallet routes failed to load, using emergency mode',
                timestamp: new Date().toISOString()
            });
        });

        emergencyRouter.get('/test', (req, res) => {
            res.json({
                success: false,
                error: 'Wallet routes failed to load. Check server logs.',
                timestamp: new Date().toISOString()
            });
        });

        app.use('/api/wallet', emergencyRouter);
        console.log('⚠️ Emergency routes mounted at /api/wallet');
    }
} else {
    console.error(`❌ Wallet routes file not found: ${walletRoutesPath}`);

    // Create emergency router
    const emergencyRouter = express.Router();

    emergencyRouter.get('/health', (req, res) => {
        res.json({
            status: 'file-not-found',
            message: 'wallet-routes.js file not found',
            timestamp: new Date().toISOString()
        });
    });

    app.use('/api/wallet', emergencyRouter);
}

// =============================================
// 🎯 TEST ENDPOINTS
// =============================================
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Main API is working!',
        serverTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        origin: req.headers.origin
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: 'NemexCoin Wallet API',
        version: '1.0.0'
    });
});

// =============================================
// 🎯 CORS TEST ENDPOINT
// =============================================
app.get('/api/cors-test', (req, res) => {
    // Check CORS headers
    console.log('🧪 CORS Test - Headers:', {
        origin: req.headers.origin,
        method: req.method,
        path: req.path
    });

    res.json({
        success: true,
        message: 'CORS test successful',
        origin: req.headers.origin,
        host: req.headers.host,
        timestamp: new Date().toISOString(),
        yourIp: req.ip,
        note: 'If you see this, CORS is working!'
    });
});

// Test POST endpoint for CORS
app.post('/api/cors-test', (req, res) => {
    res.json({
        success: true,
        message: 'POST CORS test successful',
        body: req.body,
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 PAGE ROUTES
// =============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'wallet.html'));
});

app.get('/wallet', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'wallet.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// =============================================
// 🎯 404 HANDLER
// =============================================
app.use((req, res, next) => {
    console.log(`❌ 404: ${req.method} ${req.path}`);

    // NO MANUAL CORS HEADERS - Let cors middleware handle it
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    }

    res.redirect('/wallet');
});

// =============================================
// 🎯 ERROR HANDLER
// =============================================
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.message);
    console.error('Stack:', err.stack);

    // NO MANUAL CORS HEADERS - Let cors middleware handle it
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: 'CORS error: Origin not allowed',
            origin: req.headers.origin,
            timestamp: new Date().toISOString()
        });
    }

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Please try again later',
        timestamp: new Date().toISOString(),
        path: req.path
    });
});

// =============================================
// 🎯 START SERVER
// =============================================
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ============================================
    🚀 NEMEX COIN WALLET SERVER - FIXED CORS
    ============================================
    
    📍 Port: ${PORT}
    🔧 Environment: ${process.env.NODE_ENV || 'development'}
    🕐 Started: ${new Date().toLocaleString()}
    🌐 CORS: ENABLED (Single layer, no conflicts)
    
    ✅ Wallet API: /api/wallet/*
    ✅ Health Check: /api/health
    ✅ CORS Test: /api/cors-test (GET & POST)
    ✅ API Test: /api/test
    
    ============================================
    `);

    console.log('\n🔧 CORS Configuration (SIMPLE):');
    console.log('   - Using single cors() middleware');
    console.log('   - No manual headers (prevents conflicts)');
    console.log('   - Test CORS: curl -X GET https://nemex-backend.onrender.com/api/cors-test');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = app;