// server.js - FIXED VERSION WITH YOUR DOMAINS IN CORS
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// 🎯 CORS SETUP (WITH YOUR WEBSITE DOMAINS)
// =============================================
app.use(cors({
    origin: [
        // Your website domains
        'https://www.nemexcoin.it.com',
        'https://nemexcoin.it.com',
        'http://www.nemexcoin.it.com',
        'http://nemexcoin.it.com',
        'https://nemex-backend.onrender.com',
        'http://nemex-backend.onrender.com',
        
        // Local development
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        
        // Testing domains
        'https://nemexcoin-mining.onrender.com',
        'http://nemexcoin-mining.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
    exposedHeaders: ['Content-Length', 'X-Response-Time']
}));

// Preflight requests
app.options('*', cors());

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': req.headers.origin || '*'
    });
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`🌐 ${new Date().toISOString()} ${req.method} ${req.path} [Origin: ${req.headers.origin || 'none'}]`);
    next();
});

// =============================================
// 🎯 LOAD WALLET ROUTES - FIXED WITH PROPER MOUNTING
// =============================================
console.log('🔄 Loading wallet routes...');

// First, let's test if the file exists
const walletRoutesPath = path.join(__dirname, 'backend', 'wallet-routes.js');
console.log('📂 Looking for wallet routes at:', walletRoutesPath);

if (!fs.existsSync(walletRoutesPath)) {
    console.error('❌ CRITICAL: Wallet routes file not found!');
    console.error('   Expected location:', walletRoutesPath);
    console.error('   Current directory:', __dirname);

    // Show directory structure
    console.log('\n📁 Current backend directory contents:');
    try {
        const backendDir = path.join(__dirname, 'backend');
        if (fs.existsSync(backendDir)) {
            const files = fs.readdirSync(backendDir);
            files.forEach(file => console.log('   -', file));
        } else {
            console.log('   backend/ directory does not exist!');
        }
    } catch (dirError) {
        console.error('   Could not read directory:', dirError.message);
    }
}

try {
    // Clear any cached version
    const modulePath = require.resolve(walletRoutesPath);
    delete require.cache[modulePath];

    // Load the wallet routes
    const walletRoutes = require(walletRoutesPath);
    console.log('✅ Wallet routes module loaded successfully');
    
    // Check what's exported
    console.log('📦 Wallet routes exports:', Object.keys(walletRoutes));

    // Mount the wallet routes
    app.use('/api/wallet', walletRoutes);
    console.log('✅ Wallet router mounted at /api/wallet');

    // Test that endpoints are accessible
    console.log('\n🔍 Available wallet endpoints:');
    console.log('   POST   /api/wallet/store-encrypted');
    console.log('   POST   /api/wallet/auto-login');
    console.log('   POST   /api/wallet/check-wallet');
    console.log('   POST   /api/wallet/get-encrypted');
    console.log('   GET    /api/wallet/prices');
    console.log('   GET    /api/wallet/balance/:address');
    console.log('   GET    /api/wallet/transactions/:address');
    console.log('   GET    /api/wallet/health');
    console.log('   GET    /api/wallet/test');

} catch (error) {
    console.error('❌ FAILED to load wallet routes:', error.message);
    console.error('Stack:', error.stack);

    // Create emergency routes that match the expected endpoints
    const emergencyRouter = express.Router();

    // 🔥 CRITICAL: These endpoints must match what wallet.js expects
    emergencyRouter.get('/test', (req, res) => {
        console.log('🎯 Emergency /test endpoint called');
        res.json({ 
            success: true, 
            message: 'Emergency wallet API - Main routes failed to load',
            timestamp: new Date().toISOString(),
            status: 'emergency_mode'
        });
    });

    // These are the endpoints your wallet.js actually calls
    emergencyRouter.post('/store-encrypted', (req, res) => {
        console.log('🔐 Emergency store-encrypted called');
        res.json({
            success: true,
            message: 'Emergency mode - Store encrypted wallet',
            wallet: {
                id: `emergency_${Date.now()}`,
                userId: req.body.userId,
                address: 'UQEMERGENCY' + Array.from({length: 38}, () => 
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[Math.floor(Math.random() * 64)]
                ).join(''),
                format: 'UQ',
                createdAt: new Date().toISOString(),
                source: 'emergency',
                storage: 'memory_only'
            },
            warning: '⚠️ This wallet is not saved to database!'
        });
    });

    emergencyRouter.post('/auto-login', (req, res) => {
        console.log('🔐 Emergency auto-login called');
        res.json({
            success: true,
            hasWallet: false,
            message: 'Emergency mode - No wallet found',
            userId: req.body.miningAccountId || req.body.userId
        });
    });

    emergencyRouter.post('/check-wallet', (req, res) => {
        console.log('🔍 Emergency check-wallet called');
        res.json({
            success: true,
            hasWallet: false,
            message: 'Emergency mode - Wallet check',
            userId: req.body.userId
        });
    });

    emergencyRouter.get('/prices', (req, res) => {
        res.json({
            success: true,
            prices: {
                TON: { price: 2.35, source: 'emergency' },
                NMX: { price: 0.10, source: 'emergency' }
            },
            isFallback: true
        });
    });

    emergencyRouter.get('/balance/:address', (req, res) => {
        res.json({
            success: true,
            address: req.params.address,
            balance: "0.0000",
            valueUSD: "0.00",
            source: 'emergency'
        });
    });

    emergencyRouter.get('/health', (req, res) => {
        res.json({
            status: 'emergency',
            timestamp: new Date().toISOString()
        });
    });

    app.use('/api/wallet', emergencyRouter);
    console.log('⚠️ Using EMERGENCY wallet routes with proper endpoints');
}

// =============================================
// 🎯 ENHANCED DEBUG ENDPOINT
// =============================================
app.get('/api/debug/routes', (req, res) => {
    console.log('🔍 Debug endpoint called');

    const routes = [];

    function printRoutes(layer, prefix = '') {
        if (layer.route) {
            const path = prefix + (layer.route.path === '/' ? '' : layer.route.path);
            const methods = layer.route.methods;
            Object.keys(methods).forEach(method => {
                if (methods[method]) {
                    routes.push({
                        method: method.toUpperCase(),
                        path: path,
                        source: 'direct'
                    });
                }
            });
        } else if (layer.name === 'router' && layer.handle.stack) {
            const routerPrefix = prefix + (layer.regexp.toString() !== '/^\\/?(?=\\/|$)/i' ? 
                layer.regexp.toString().replace(/^\/\^\\\/?/, '').replace(/\\\/\?\(\?=\\\/\|\$\)\/i$/, '') : '');

            layer.handle.stack.forEach(sublayer => {
                printRoutes(sublayer, routerPrefix);
            });
        }
    }

    app._router.stack.forEach(layer => {
        printRoutes(layer);
    });

    // Filter wallet routes
    const walletRoutes = routes.filter(r => r.path.includes('/api/wallet'));

    res.json({
        success: true,
        totalRoutes: routes.length,
        walletRoutesCount: walletRoutes.length,
        walletRoutes: walletRoutes,
        serverInfo: {
            port: PORT,
            environment: process.env.NODE_ENV || 'development',
            time: new Date().toISOString(),
            allowedOrigins: [
                'https://www.nemexcoin.it.com',
                'https://nemexcoin.it.com',
                'https://nemex-backend.onrender.com'
            ]
        }
    });
});

// =============================================
// 🎯 API TESTING ENDPOINT
// =============================================
app.post('/api/test-connection', (req, res) => {
    console.log('🔌 Test connection called:', req.body);

    res.json({
        success: true,
        message: 'Server is responding!',
        receivedData: req.body,
        serverTime: new Date().toISOString(),
        endpoints: [
            'POST /api/wallet/store-encrypted',
            'POST /api/wallet/auto-login',
            'POST /api/wallet/check-wallet',
            'POST /api/wallet/get-encrypted',
            'GET  /api/wallet/prices',
            'GET  /api/wallet/balance/:address',
            'GET  /api/wallet/transactions/:address',
            'GET  /api/wallet/health',
            'GET  /api/wallet/test'
        ]
    });
});

// =============================================
// 🎯 BASIC HEALTH ENDPOINTS
// =============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'NemexCoin API is running!',
        timestamp: new Date().toISOString(),
        version: '3.2',
        walletSystem: 'Enhanced BIP-39',
        allowedDomains: [
            'https://www.nemexcoin.it.com',
            'https://nemexcoin.it.com',
            'https://nemex-backend.onrender.com'
        ]
    });
});

// Serve wallet.html as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'wallet.html'));
});

// Direct wallet page route
app.get('/wallet', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'wallet.html'));
});

// Serve mining dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// =============================================
// 🎯 404 & ERROR HANDLING
// =============================================
app.use((req, res, next) => {
    console.log(`❌ 404: ${req.method} ${req.path} [Origin: ${req.headers.origin || 'none'}]`);

    // If it's an API request, return JSON
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            path: req.path,
            method: req.method,
            suggestion: 'Check /api/debug/routes for available endpoints',
            timestamp: new Date().toISOString()
        });
    }

    // Otherwise, try to serve the file or show HTML error
    const filePath = path.join(__dirname, 'frontend', req.path);
    if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
        res.sendFile(filePath);
    } else {
        res.status(404).send(`
            <html>
                <head><title>404 - Not Found</title></head>
                <body style="font-family: Arial; padding: 20px;">
                    <h1>404 - Page Not Found</h1>
                    <p>Path: ${req.path}</p>
                    <p>Try going to <a href="/dashboard">/dashboard</a> for mining dashboard.</p>
                    <p>Or <a href="/wallet">/wallet</a> for the wallet interface.</p>
                    <p>API endpoints are available at <code>/api/wallet/*</code></p>
                </body>
            </html>
        `);
    }
});

app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.message);
    console.error('Stack:', err.stack);

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 START SERVER WITH ENHANCED LOGGING
// =============================================
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ============================================
    🚀 NEMEX COIN SERVER STARTED - WITH YOUR DOMAINS
    ============================================
    
    📍 Local URL: http://localhost:${PORT}
    📍 Network URL: http://0.0.0.0:${PORT}
    🔧 Environment: ${process.env.NODE_ENV || 'development'}
    🕐 Started: ${new Date().toISOString()}
    
    ✅ ALLOWED DOMAINS:
       - https://www.nemexcoin.it.com
       - https://nemexcoin.it.com
       - https://nemex-backend.onrender.com
    
    ✅ WALLET ENDPOINTS:
       Store Encrypted: POST   http://localhost:${PORT}/api/wallet/store-encrypted
       Auto Login:      POST   http://localhost:${PORT}/api/wallet/auto-login
       Check Wallet:    POST   http://localhost:${PORT}/api/wallet/check-wallet
       Get Encrypted:   POST   http://localhost:${PORT}/api/wallet/get-encrypted
       Prices:          GET    http://localhost:${PORT}/api/wallet/prices
       Balance:         GET    http://localhost:${PORT}/api/wallet/balance/:address
       Transactions:    GET    http://localhost:${PORT}/api/wallet/transactions/:address
       Health:          GET    http://localhost:${PORT}/api/wallet/health
       Test:            GET    http://localhost:${PORT}/api/wallet/test
    
    🎯 PAGES:
       Dashboard:  http://localhost:${PORT}/dashboard
       Wallet:     http://localhost:${PORT}/wallet
       Login:      http://localhost:${PORT}/login
       Health:     http://localhost:${PORT}/api/health
    
    ============================================
    `);

    // Log environment status
    console.log('📋 Environment Check:');
    console.log(`   PORT: ${PORT}`);
    console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Not Set'}`);
    console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set'}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not Set'}`);

    // Test the endpoints
    console.log('\n🔍 Testing endpoints...');

    // Test the test endpoint
    setTimeout(() => {
        const testUrl = `http://localhost:${PORT}/api/wallet/test`;
        fetch(testUrl)
            .then(res => res.json())
            .then(data => {
                console.log(`   ✅ /api/wallet/test: ${data.message}`);
            })
            .catch(err => {
                console.log(`   ❌ /api/wallet/test: ${err.message}`);
            });
    }, 500);
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