// server.js - UPDATED CORS CONFIGURATION
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// 🎯 MIDDLEWARE SETUP - FIXED CORS
// =============================================

// ✅ FIXED CORS configuration - Add your actual domains
const allowedOrigins = [
    // Your actual domains
    'https://www.nemexcoin.it.com',
    'https://nemexcoin.it.com',
    'http://www.nemexcoin.it.com',
    'http://nemexcoin.it.com',
    
    // Render domains (your backend)
    'https://nemex-backend.onrender.com',
    'http://nemex-backend.onrender.com',
    
    // Local development
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5500',
];

// CORS middleware with detailed logging
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) {
            console.log('🌐 CORS: No origin (server request) - Allowing');
            return callback(null, true);
        }

        console.log('🌐 CORS Checking origin:', origin);
        
        // Check if origin is in allowed list
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin === origin) return true;
            // Also allow subdomains
            if (origin.endsWith('.nemexcoin.it.com') && allowedOrigin.includes('nemexcoin.it.com')) {
                return true;
            }
            return false;
        });

        if (isAllowed) {
            console.log('✅ CORS Allowed:', origin);
            callback(null, true);
        } else {
            console.log('❌ CORS Blocked:', origin);
            console.log('📋 Allowed origins:', allowedOrigins);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID', 'Accept'],
    exposedHeaders: ['Content-Length', 'X-Request-ID'],
    maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Force HTTPS in production (but be careful with CORS)
app.use((req, res, next) => {
    // Skip HTTPS redirect for API calls to avoid CORS issues
    if (req.path.startsWith('/api')) {
        return next();
    }
    
    if (req.headers['x-forwarded-proto'] !== 'https' && 
        process.env.NODE_ENV === 'production' &&
        !req.headers.host.includes('localhost')) {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});

// Add cache control headers for API
app.use((req, res, next) => {
    // Prevent caching for API routes
    if (req.path.startsWith('/api')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Access-Control-Allow-Origin', req.headers.origin || '*'); // Explicit CORS header
    } else {
        // Cache static assets
        res.set('Cache-Control', 'public, max-age=3600'); // 1 hour for static files
    }
    next();
});

// Security headers
app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    next();
});

// =============================================
// 🎯 SERVE STATIC FILES
// =============================================

app.use(express.static(path.join(__dirname, 'frontend'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0',
    setHeaders: (res, filePath) => {
        // Don't cache HTML files
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        }
    }
}));

// =============================================
// 🎯 BASIC API ENDPOINTS
// =============================================

app.get('/api/health', (req, res) => {
    console.log('🩺 Health check called');
    res.json({ 
        success: true, 
        message: 'NemexCoin API is running!',
        timestamp: new Date().toISOString(),
        mode: process.env.NODE_ENV || 'development',
        version: '2.0.0',
        cors: {
            allowedOrigins: allowedOrigins.filter(o => !o.includes('localhost')),
            yourOrigin: req.headers.origin || 'Not specified'
        }
    });
});

app.get('/api/config', (req, res) => {
    console.log('⚙️ Config endpoint called');
    // Return safe config values (no secrets)
    res.json({
        mode: process.env.NODE_ENV || 'development',
        version: '2.0.0',
        features: {
            wallet: true,
            twoFactor: true,
            tonIntegration: true
        },
        cors: {
            enabled: true,
            allowedDomains: allowedOrigins.filter(o => !o.includes('localhost'))
        },
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 LOAD WALLET ROUTES
// =============================================

let walletRoutes;
try {
    console.log('🔄 Loading wallet routes...');

    // Check if file exists
    const walletRoutesPath = path.join(__dirname, 'backend', 'wallet-routes.js');
    if (!fs.existsSync(walletRoutesPath)) {
        console.error('❌ Wallet routes file not found:', walletRoutesPath);
        throw new Error('Wallet routes file not found');
    }

    walletRoutes = require(walletRoutesPath);
    console.log('✅ Wallet routes loaded successfully');

    // Test the routes are working
    console.log('🔧 Testing wallet routes structure...');
    if (typeof walletRoutes === 'function' || 
        (walletRoutes.router && typeof walletRoutes.router === 'function')) {
        console.log('✅ Wallet routes structure is valid');
    }
} catch (error) {
    console.error('❌ ERROR loading wallet routes:', error.message);
    console.error('Stack trace:', error.stack);

    // Create emergency fallback routes
    const express = require('express');
    const emergencyRouter = express.Router();

    emergencyRouter.get('/test', (req, res) => {
        res.json({ 
            success: false, 
            error: 'Wallet system is under maintenance',
            message: 'Please try again later',
            emergency: true
        });
    });

    emergencyRouter.get('/health', (req, res) => {
        res.json({ 
            success: false, 
            error: 'Wallet system unavailable',
            emergency: true
        });
    });

    walletRoutes = emergencyRouter;
    console.log('⚠️ Using emergency wallet routes');
}

// =============================================
// 🎯 MOUNT ALL ROUTES
// =============================================

// Mount wallet routes
app.use('/api/wallet', walletRoutes);
console.log('✅ Wallet API routes mounted at /api/wallet');

// =============================================
// 🎯 USER SESSION API (For wallet integration)
// =============================================

app.get('/api/user/session', async (req, res) => {
    try {
        console.log('👤 Session check called');
        // This endpoint would normally check Supabase session
        // For now, return mock for testing
        res.json({
            success: true,
            session: {
                isValid: true,
                timestamp: new Date().toISOString()
            },
            cors: {
                origin: req.headers.origin || 'Not specified'
            }
        });
    } catch (error) {
        console.error('❌ Session check error:', error);
        res.status(500).json({
            success: false,
            error: 'Session check failed'
        });
    }
});

// =============================================
// 🎯 ERROR HANDLING
// =============================================

// CORS error handler
app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        console.error('❌ CORS Error:', {
            origin: req.headers.origin,
            method: req.method,
            path: req.path,
            allowedOrigins: allowedOrigins
        });
        
        return res.status(403).json({
            success: false,
            error: 'CORS Error: Request blocked',
            message: `Origin '${req.headers.origin || 'unknown'}' not allowed`,
            allowedOrigins: allowedOrigins.filter(o => !o.includes('localhost')),
            fix: 'Add your domain to CORS allowedOrigins in server.js'
        });
    }
    next(err);
});

// 404 handler
app.use((req, res, next) => {
    console.log('❌ 404 Not Found:', req.method, req.path);
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/config',
            'GET /api/wallet/test',
            'POST /api/wallet/get-user-wallet',
            'POST /api/wallet/create-wallet'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);

    const errorResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    };

    if (process.env.NODE_ENV === 'development') {
        errorResponse.message = err.message;
        errorResponse.stack = err.stack;
    }

    res.status(500).json(errorResponse);
});

// =============================================
// 🎯 START SERVER
// =============================================

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', err);
    console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION at:', promise);
    console.error('Reason:', reason);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    const host = server.address().address;
    const port = server.address().port;

    console.log(`
    ============================================
    🚀 NEMEX COIN WALLET SERVER STARTED
    ============================================
    
    📍 Server running at:
       Local: http://localhost:${PORT}
       Network: http://${host}:${port}
    
    🌐 CORS ALLOWED DOMAINS:
       Production: https://www.nemexcoin.it.com
       Production: https://nemexcoin.it.com
       Backend: https://nemex-backend.onrender.com
       Local: http://localhost:3000
       Local: http://localhost:8080
    
    🔧 API Endpoints:
       Health: http://localhost:${PORT}/api/health
       Config: http://localhost:${PORT}/api/config
       Wallet Test: http://localhost:${PORT}/api/wallet/test
    
    ⚙️ Environment: ${process.env.NODE_ENV || 'development'}
    📦 Version: 2.0.0
    🕐 Started: ${new Date().toISOString()}
    
    ============================================
    `);

    // Test database connection
    console.log('🔍 Testing system connectivity...');

    // Log environment status
    console.log('📋 Environment Check:');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('   PORT:', PORT);
    console.log('   Supabase URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not Set');
    console.log('   Supabase Key:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set');
    console.log('   CORS Domains:', allowedOrigins.length, 'domains configured');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = app;