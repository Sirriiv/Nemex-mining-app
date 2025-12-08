// server.js - FIXED CORS VERSION
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// 🎯 CORS SETUP - FIXED WITH YOUR DOMAINS
// =============================================
const allowedOrigins = [
    // Your production domains
    'https://nemexcoin.it.com',
    'https://www.nemexcoin.it.com',
    'http://nemexcoin.it.com',
    'http://www.nemexcoin.it.com',
    
    // Render backend
    'https://nemex-backend.onrender.com',
    'http://nemex-backend.onrender.com',
    
    // Local development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:8080'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`🚫 CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'X-Session-Token',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Content-Length', 'X-Response-Time'],
    maxAge: 86400 // 24 hours
}));

// Handle preflight requests
app.options('*', cors());

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Session-Token');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, 'frontend'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js') || path.endsWith('.css')) {
            res.set('Cache-Control', 'public, max-age=3600');
        }
    }
}));

// Request logging with origin
app.use((req, res, next) => {
    console.log(`🌐 ${new Date().toLocaleTimeString()} ${req.method} ${req.path} [Origin: ${req.headers.origin || 'none'}]`);
    next();
});

// =============================================
// 🎯 LOAD WALLET ROUTES
// =============================================
console.log('\n🔄 LOADING WALLET ROUTES...');

const walletRoutesPath = path.join(__dirname, 'backend', 'wallet-routes.js');
let walletRoutes = null;

if (fs.existsSync(walletRoutesPath)) {
    try {
        console.log(`✅ Found wallet routes at: ${walletRoutesPath}`);
        
        // Clear require cache
        const modulePath = require.resolve(walletRoutesPath);
        delete require.cache[modulePath];
        
        walletRoutes = require(walletRoutesPath);
        
        // Mount the routes
        app.use('/api/wallet', walletRoutes);
        console.log('✅ Wallet routes mounted at /api/wallet');
        
        console.log('\n📋 AVAILABLE WALLET ENDPOINTS:');
        console.log('   POST   /api/wallet/create            - Create wallet');
        console.log('   POST   /api/wallet/login             - Login to wallet');
        console.log('   POST   /api/wallet/check             - Check wallet');
        console.log('   POST   /api/wallet/session/create    - Create session');
        console.log('   POST   /api/wallet/session/check     - Check session');
        console.log('   POST   /api/wallet/session/destroy   - Destroy session');
        console.log('   POST   /api/wallet/store-encrypted   - Legacy: Store encrypted');
        console.log('   POST   /api/wallet/check-wallet      - Legacy: Check wallet');
        console.log('   GET    /api/wallet/prices            - Get token prices');
        console.log('   GET    /api/wallet/health            - Health check');
        console.log('   GET    /api/wallet/test              - Test endpoint');
        
    } catch (error) {
        console.error('❌ FAILED to load wallet routes:', error.message);
        console.error('Stack trace:', error.stack);
        walletRoutes = null;
    }
}

// If wallet routes failed to load, create emergency routes
if (!walletRoutes) {
    console.log('\n⚠️ CREATING EMERGENCY WALLET ROUTES');
    
    const emergencyRouter = express.Router();
    
    emergencyRouter.get('/test', (req, res) => {
        res.json({
            success: true,
            message: 'Emergency wallet API is working',
            mode: 'emergency',
            timestamp: new Date().toISOString()
        });
    });
    
    emergencyRouter.post('/create', (req, res) => {
        res.json({
            success: true,
            message: 'Emergency mode - Wallet created',
            wallet: {
                id: `emergency_${Date.now()}`,
                address: 'UQ' + Date.now().toString(36).toUpperCase(),
                format: 'UQ',
                createdAt: new Date().toISOString(),
                source: 'emergency'
            }
        });
    });
    
    emergencyRouter.post('/check', (req, res) => {
        res.json({
            success: true,
            hasWallet: false,
            message: 'Emergency mode - No wallet found'
        });
    });
    
    app.use('/api/wallet', emergencyRouter);
    console.log('⚠️ Emergency routes mounted at /api/wallet');
}

// =============================================
// 🎯 API TEST ENDPOINTS
// =============================================
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        serverTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        walletMode: walletRoutes ? 'normal' : 'emergency',
        allowedOrigins: allowedOrigins
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        walletRoutes: walletRoutes ? 'loaded' : 'emergency',
        server: 'NemexCoin Wallet API',
        cors: 'enabled'
    });
});

// =============================================
// 🎯 DEBUG CORS ENDPOINT
// =============================================
app.get('/api/cors-test', (req, res) => {
    console.log('🔍 CORS Test - Headers:', req.headers);
    
    res.json({
        success: true,
        message: 'CORS test successful',
        origin: req.headers.origin,
        host: req.headers.host,
        timestamp: new Date().toISOString(),
        yourIp: req.ip,
        allowedOrigins: allowedOrigins
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
app.use((req, res) => {
    console.log(`❌ 404: ${req.method} ${req.path} [Origin: ${req.headers.origin || 'none'}]`);
    
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            path: req.path,
            method: req.method
        });
    }
    
    res.redirect('/wallet');
});

// =============================================
// 🎯 ERROR HANDLER
// =============================================
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.message);
    
    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: 'CORS error: Origin not allowed',
            origin: req.headers.origin,
            allowedOrigins: allowedOrigins
        });
    }
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Please try again later',
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 START SERVER
// =============================================
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ============================================
    🚀 NEMEX COIN WALLET SERVER v4.0
    ============================================
    
    📍 Port: ${PORT}
    🔧 Environment: ${process.env.NODE_ENV || 'development'}
    🕐 Started: ${new Date().toLocaleString()}
    
    ✅ Allowed Origins:
       ${allowedOrigins.map(origin => `       • ${origin}`).join('\n')}
    
    ✅ Wallet System: ${walletRoutes ? 'NORMAL' : 'EMERGENCY'}
    
    ============================================
    `);
    
    // Test endpoints
    setTimeout(() => {
        fetch(`http://localhost:${PORT}/api/health`)
            .then(res => res.json())
            .then(data => console.log('✅ Health check:', data.status))
            .catch(err => console.log('❌ Health check failed:', err.message));
            
        fetch(`http://localhost:${PORT}/api/cors-test`)
            .then(res => res.json())
            .then(data => console.log('✅ CORS test:', data.message))
            .catch(err => console.log('❌ CORS test failed:', err.message));
    }, 1000);
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