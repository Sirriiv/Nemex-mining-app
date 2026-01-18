// server.js - COMPLETE FIXED VERSION WITH PROPER CORS
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// 🎯 SIMPLIFIED CORS SETUP - ONE LAYER ONLY
// =============================================

// Enable compression for all responses (reduces egress by 70-80%)
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6 // Balanced compression (1=fastest, 9=best compression)
}));

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

// Serve static files with optimized caching
app.use(express.static(path.join(__dirname, 'frontend'), {
    setHeaders: (res, filePath) => {
        // ⚡ OPTIMIZED CACHING STRATEGY
        if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            // JS/CSS: Cache for 1 hour (3600s)
            res.set('Cache-Control', 'public, max-age=3600');
        } else if (filePath.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
            // Images: Cache for 7 days (604800s)
            res.set('Cache-Control', 'public, max-age=604800');
        } else if (filePath.endsWith('.html')) {
            // HTML: Cache for 5 minutes (300s), must revalidate
            res.set('Cache-Control', 'public, max-age=300, must-revalidate');
        } else {
            // Other files: Cache for 1 hour
            res.set('Cache-Control', 'public, max-age=3600');
        }
        
        // Add ETag for efficient caching
        res.set('ETag', 'true');
    },
    // Enable ETag generation
    etag: true,
    // Disable Last-Modified header (ETag is better)
    lastModified: true
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
// 🎯 LOAD AND MOUNT ADMIN ROUTES
// =============================================
console.log('\n🔄 LOADING ADMIN ROUTES...');

const adminRoutesPath = path.join(__dirname, 'backend', 'admin-routes.js');

if (fs.existsSync(adminRoutesPath)) {
    try {
        console.log(`✅ Found admin routes at: ${adminRoutesPath}`);
        
        // Initialize Supabase client for admin routes
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL || 'https://bjulifvbfogymoduxnzl.supabase.co';
        const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Middleware to inject supabase into requests
        app.use('/api/admin', (req, res, next) => {
            req.supabase = supabase;
            next();
        });
        
        const adminRoutes = require(adminRoutesPath);
        app.use('/api/admin', adminRoutes);
        console.log('✅ Admin routes mounted at /api/admin');
        
        console.log('\n📋 AVAILABLE ADMIN ENDPOINTS:');
        console.log('   GET    /api/admin/users              - Get all users');
        console.log('   GET    /api/admin/users/:userId      - Get user details');
        console.log('   GET    /api/admin/check-access       - Check admin access');
        console.log('   POST   /api/admin/orphan-referral    - Orphan a referral');
    } catch (error) {
        console.error('❌ FAILED to load admin routes:', error.message);
    }
} else {
    console.log('⚠️ Admin routes file not found (optional)');
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

// 🚦 Deploy info endpoint - helps verify deployed commit and env var presence
const { execSync } = require('child_process');
function getGitShortCommit() {
    try {
        return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch (e) {
        return 'unknown';
    }
}

app.get('/api/deploy-info', (req, res) => {
    const commit = getGitShortCommit();
    res.json({
        success: true,
        commit,
        env: {
            TONCENTER_API_KEY: !!process.env.TONCENTER_API_KEY,
            TON_CONSOLE_API_KEY: !!process.env.TON_CONSOLE_API_KEY,
            TONAPI_KEY: !!process.env.TONAPI_KEY,
            NODE_ENV: process.env.NODE_ENV || 'development'
        },
        timestamp: new Date().toISOString()
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
// 🎯 GLOBAL ERROR HANDLER (Ensures CORS on errors)
// =============================================
app.use((err, req, res, next) => {
    console.error('❌ Global error handler:', err.message);
    
    // Ensure CORS headers are present on error responses
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        details: err.toString()
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