// server.js - SIMPLIFIED FIXED VERSION
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// 🎯 CORS SETUP (Simplified - allow all for now)
// =============================================
app.use(cors({
    origin: '*', // Allow all for now
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    });
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));

// =============================================
// 🎯 BASIC HEALTH ENDPOINTS
// =============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'NemexCoin API is running!',
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 LOAD WALLET ROUTES - SIMPLE & CORRECT
// =============================================
console.log('🔄 Loading wallet routes...');

let walletRouter;

try {
    // Check if file exists
    const walletRoutesPath = path.join(__dirname, 'backend', 'wallet-routes.js');
    if (!fs.existsSync(walletRoutesPath)) {
        throw new Error(`Wallet routes file not found: ${walletRoutesPath}`);
    }

    // Clear cache and load
    delete require.cache[require.resolve(walletRoutesPath)];
    walletRouter = require(walletRoutesPath);
    
    // Verify it's a valid router
    if (typeof walletRouter !== 'function' && 
        !(walletRouter.router && typeof walletRouter.router === 'function')) {
        throw new Error('Wallet routes file does not export a valid router');
    }
    
    console.log('✅ Wallet routes loaded successfully');
    
    // Mount the wallet routes
    app.use('/api/wallet', walletRouter);
    console.log('✅ Wallet API routes mounted at /api/wallet');
    
} catch (error) {
    console.error('❌ ERROR loading wallet routes:', error.message);
    console.error('Stack:', error.stack);
    
    // Create emergency fallback routes
    walletRouter = express.Router();
    
    // Test endpoint
    walletRouter.get('/test', (req, res) => {
        res.json({ 
            success: true, 
            message: 'Emergency wallet API - Full routes failed to load',
            timestamp: new Date().toISOString()
        });
    });
    
    // Critical endpoints
    walletRouter.post('/get-user-wallet', (req, res) => {
        res.json({
            success: true,
            hasWallet: false,
            message: 'Emergency mode - No wallet found',
            userId: req.body.userId || 'unknown'
        });
    });
    
    walletRouter.post('/create-wallet', (req, res) => {
        res.status(503).json({
            success: false,
            error: 'Wallet creation unavailable',
            message: 'Full wallet system failed to load',
            timestamp: new Date().toISOString()
        });
    });
    
    // Mount emergency routes
    app.use('/api/wallet', walletRouter);
    console.log('⚠️ Using emergency wallet routes');
}

// =============================================
// 🎯 TEST ALL WALLET ENDPOINTS (Debug)
// =============================================
app.get('/api/wallet/all-endpoints', (req, res) => {
    console.log('🔍 Listing all registered wallet endpoints...');
    
    // Check what routes are registered
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push(`${middleware.route.stack[0].method.toUpperCase()} ${middleware.route.path}`);
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    const method = handler.route.stack[0].method.toUpperCase();
                    const path = handler.route.path;
                    routes.push(`${method} /api/wallet${path}`);
                }
            });
        }
    });
    
    res.json({
        success: true,
        totalEndpoints: routes.length,
        endpoints: routes.filter(r => r.includes('/api/wallet')),
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 404 & ERROR HANDLING
// =============================================
app.use((req, res, next) => {
    console.log(`❌ 404: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        suggestion: 'Check /api/wallet/all-endpoints for available routes'
    });
});

app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// =============================================
// 🎯 START SERVER
// =============================================
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ============================================
    🚀 NEMEX COIN WALLET SERVER STARTED
    ============================================
    
    📍 Server: http://localhost:${PORT}
    🔧 Environment: ${process.env.NODE_ENV || 'development'}
    🕐 Started: ${new Date().toISOString()}
    
    🔗 Test Endpoints:
       Health: http://localhost:${PORT}/api/health
       Wallet Test: http://localhost:${PORT}/api/wallet/test
       All Endpoints: http://localhost:${PORT}/api/wallet/all-endpoints
    
    ============================================
    `);
    
    // Log environment status
    console.log('📋 Environment Check:');
    console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not Set');
    console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set');
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not Set');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down...');
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