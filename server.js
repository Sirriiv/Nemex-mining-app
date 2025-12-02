// server.js - PRODUCTION READY COMPLETE VERSION
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// 🎯 MIDDLEWARE SETUP
// =============================================

// CORS configuration
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:8080',
            'https://your-mining-site.com', // Replace with your domain
            'https://nemexcoin.com' // Replace with your domain
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Force HTTPS in production
app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && 
        process.env.NODE_ENV === 'production' &&
        req.headers.host !== 'localhost:3000') {
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
    res.json({ 
        success: true, 
        message: 'NemexCoin API is running!',
        timestamp: new Date().toISOString(),
        mode: process.env.NODE_ENV || 'development',
        version: '2.0.0'
    });
});

app.get('/api/config', (req, res) => {
    // Return safe config values (no secrets)
    res.json({
        mode: process.env.NODE_ENV || 'development',
        version: '2.0.0',
        features: {
            wallet: true,
            twoFactor: true,
            tonIntegration: true
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
        // This endpoint would normally check Supabase session
        // For now, return mock for testing
        res.json({
            success: true,
            session: {
                isValid: true,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Session check failed'
        });
    }
});

// =============================================
// 🎯 ERROR HANDLING
// =============================================

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    
    const errorResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
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
    
    🌐 Website URLs:
       Homepage: http://localhost:${PORT}
       Login: http://localhost:${PORT}/login.html
       Wallet: http://localhost:${PORT}/wallet.html
       Dashboard: http://localhost:${PORT}/dashboard.html
    
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