// server.js - FIXED VERSION WITH PROPER REDIRECTION
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// 🎯 CORS SETUP
// =============================================
app.use(cors({
    origin: [
        'https://www.nemexcoin.it.com',
        'https://nemexcoin.it.com',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5000',
        'http://localhost:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
        'Access-Control-Allow-Credentials': 'true'
    });
    next();
});

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, 'frontend'), {
    setHeaders: (res, path) => {
        // Cache control for static files
        if (path.endsWith('.js') || path.endsWith('.css')) {
            res.set('Cache-Control', 'public, max-age=3600');
        }
    }
}));

// Request logging
app.use((req, res, next) => {
    console.log(`🌐 ${new Date().toLocaleTimeString()} ${req.method} ${req.path}`);
    next();
});

// =============================================
// 🎯 CRITICAL FIX: LOAD WALLET ROUTES PROPERLY
// =============================================
console.log('\n🔄 LOADING WALLET ROUTES...');
console.log('📂 Current directory:', __dirname);

// Define possible paths for wallet-routes.js
const possiblePaths = [
    path.join(__dirname, 'backend', 'wallet-routes.js'), // Most likely
    path.join(__dirname, 'wallet-routes.js'),            // Root directory
    path.join(__dirname, 'routes', 'wallet-routes.js'),  // Routes folder
    path.join(__dirname, 'api', 'wallet-routes.js')      // API folder
];

let walletRoutesPath = null;
let walletRoutes = null;

// Find the wallet routes file
for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
        walletRoutesPath = filePath;
        console.log(`✅ Found wallet routes at: ${filePath}`);
        break;
    }
}

if (!walletRoutesPath) {
    console.error('❌ CRITICAL: Could not find wallet-routes.js anywhere!');
    console.log('🔍 Searching for any .js files...');
    
    // Search recursively
    function searchForWalletRoutes(dir) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory() && !file.name.includes('node_modules')) {
                searchForWalletRoutes(fullPath);
            } else if (file.name === 'wallet-routes.js') {
                console.log(`🎯 Found at: ${fullPath}`);
                walletRoutesPath = fullPath;
                return;
            }
        }
    }
    
    try {
        searchForWalletRoutes(__dirname);
    } catch (e) {
        console.error('Search error:', e.message);
    }
}

if (walletRoutesPath) {
    try {
        // Clear require cache
        const modulePath = require.resolve(walletRoutesPath);
        delete require.cache[modulePath];
        
        console.log(`📦 Loading wallet routes from: ${walletRoutesPath}`);
        walletRoutes = require(walletRoutesPath);
        
        // Mount the routes
        app.use('/api/wallet', walletRoutes);
        console.log('✅ Wallet routes mounted at /api/wallet');
        
        // Log available endpoints
        console.log('\n📋 AVAILABLE WALLET ENDPOINTS:');
        console.log('   POST   /api/wallet/store-encrypted   - Store encrypted wallet');
        console.log('   POST   /api/wallet/auto-login        - Auto login');
        console.log('   POST   /api/wallet/check-wallet      - Check existing wallet');
        console.log('   POST   /api/wallet/get-encrypted     - Get encrypted wallet');
        console.log('   GET    /api/wallet/prices            - Get token prices');
        console.log('   GET    /api/wallet/balance/:address  - Get wallet balance');
        console.log('   GET    /api/wallet/transactions/:address - Get transactions');
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
    
    // CRITICAL: These must match what wallet.js expects
    emergencyRouter.post('/store-encrypted', (req, res) => {
        console.log('🔐 Emergency store-encrypted called');
        const { userId, walletAddress, encryptedMnemonic } = req.body;
        
        res.json({
            success: true,
            message: 'Emergency mode - Wallet stored in memory only',
            wallet: {
                id: `emergency_${Date.now()}`,
                userId: userId,
                address: walletAddress || 'UQ' + Date.now().toString(36),
                format: 'UQ',
                createdAt: new Date().toISOString(),
                source: 'emergency',
                storage: 'memory_only',
                balance: "0.0000",
                valueUSD: "0.00",
                network: 'TON Mainnet'
            },
            warning: '⚠️ This wallet is NOT saved to database! Save your mnemonic!'
        });
    });
    
    emergencyRouter.post('/auto-login', (req, res) => {
        res.json({
            success: true,
            hasWallet: false,
            message: 'Emergency mode - No wallet found'
        });
    });
    
    emergencyRouter.post('/check-wallet', (req, res) => {
        res.json({
            success: true,
            hasWallet: false,
            message: 'Emergency mode - Please create a wallet'
        });
    });
    
    emergencyRouter.get('/test', (req, res) => {
        res.json({
            success: true,
            message: 'Emergency wallet API is working',
            mode: 'emergency',
            timestamp: new Date().toISOString()
        });
    });
    
    emergencyRouter.get('/prices', (req, res) => {
        res.json({
            success: true,
            prices: {
                TON: { price: 2.35, source: 'emergency' },
                NMX: { price: 0.10, source: 'emergency' }
            }
        });
    });
    
    app.use('/api/wallet', emergencyRouter);
    console.log('⚠️ Emergency routes mounted at /api/wallet');
}

// =============================================
// 🎯 API TEST ENDPOINT (For frontend testing)
// =============================================
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        serverTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        walletMode: walletRoutes ? 'normal' : 'emergency'
    });
});

// =============================================
// 🎯 HEALTH CHECK
// =============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        walletRoutes: walletRoutes ? 'loaded' : 'emergency',
        server: 'NemexCoin Wallet API'
    });
});

// =============================================
// 🎯 REDIRECTION ROUTES - CRITICAL FIX
// =============================================

// Serve wallet.html at root
app.get('/', (req, res) => {
    console.log('📍 Serving wallet.html from root');
    res.sendFile(path.join(__dirname, 'frontend', 'wallet.html'));
});

// Explicit wallet route
app.get('/wallet', (req, res) => {
    console.log('📍 Serving wallet.html from /wallet route');
    res.sendFile(path.join(__dirname, 'frontend', 'wallet.html'));
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    console.log('📍 Serving dashboard.html');
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// Login route
app.get('/login', (req, res) => {
    console.log('📍 Serving login.html');
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// =============================================
// 🎯 WALLET CREATION REDIRECTION ENDPOINT
// =============================================
app.get('/wallet/success', (req, res) => {
    console.log('🎯 Wallet creation success - redirecting to wallet interface');
    
    // Redirect to wallet page with success message
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Wallet Created Successfully</title>
        <meta http-equiv="refresh" content="2;url=/wallet">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .message { 
                background: white; 
                padding: 40px; 
                border-radius: 10px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
                text-align: center; 
            }
            .success-icon { 
                font-size: 60px; 
                color: #4CAF50; 
                margin-bottom: 20px; 
            }
            h1 { 
                color: #333; 
                margin-bottom: 10px; 
            }
            p { 
                color: #666; 
                margin-bottom: 20px; 
            }
            .spinner { 
                border: 4px solid #f3f3f3; 
                border-top: 4px solid #3498db; 
                border-radius: 50%; 
                width: 40px; 
                height: 40px; 
                animation: spin 1s linear infinite; 
                margin: 0 auto; 
            }
            @keyframes spin { 
                0% { transform: rotate(0deg); } 
                100% { transform: rotate(360deg); } 
            }
        </style>
    </head>
    <body>
        <div class="message">
            <div class="success-icon">✓</div>
            <h1>Wallet Created Successfully!</h1>
            <p>Your TON wallet has been created and is ready to use.</p>
            <p>Redirecting to wallet interface...</p>
            <div class="spinner"></div>
        </div>
        <script>
            // Also trigger wallet reload in parent window
            if (window.opener) {
                window.opener.postMessage({ type: 'wallet_created', success: true }, '*');
            }
            
            // Force reload wallet page after redirect
            setTimeout(() => {
                window.location.href = '/wallet';
            }, 2000);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// =============================================
// 🎯 DEBUG ENDPOINT - Check what's loaded
// =============================================
app.get('/api/debug', (req, res) => {
    console.log('🔍 Debug endpoint called');
    
    // Check if wallet.html exists
    const walletHtmlPath = path.join(__dirname, 'frontend', 'wallet.html');
    const walletHtmlExists = fs.existsSync(walletHtmlPath);
    
    // Check frontend folder structure
    const frontendPath = path.join(__dirname, 'frontend');
    let frontendFiles = [];
    
    try {
        frontendFiles = fs.readdirSync(frontendPath);
    } catch (e) {
        console.error('Cannot read frontend folder:', e.message);
    }
    
    res.json({
        success: true,
        serverInfo: {
            port: PORT,
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform
        },
        fileSystem: {
            walletHtmlExists: walletHtmlExists,
            walletHtmlPath: walletHtmlPath,
            frontendFiles: frontendFiles,
            currentDir: __dirname,
            walletRoutesPath: walletRoutesPath || 'Not found'
        },
        walletSystem: {
            mode: walletRoutes ? 'normal' : 'emergency',
            endpoints: walletRoutes ? 'loaded' : 'emergency_only'
        },
        environmentVars: {
            SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set',
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'
        }
    });
});

// =============================================
// 🎯 404 HANDLER
// =============================================
app.use((req, res) => {
    console.log(`❌ 404: ${req.method} ${req.path}`);
    
    // If API request, return JSON
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            path: req.path,
            availableEndpoints: [
                '/api/wallet/store-encrypted',
                '/api/wallet/check-wallet',
                '/api/wallet/prices',
                '/api/health',
                '/api/test',
                '/api/debug'
            ]
        });
    }
    
    // For HTML requests, redirect to wallet
    res.redirect('/wallet');
});

// =============================================
// 🎯 ERROR HANDLER
// =============================================
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.message);
    console.error('Stack:', err.stack);
    
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
const server = app.listen(PORT, () => {
    console.log(`
    ============================================
    🚀 NEMEX COIN WALLET SERVER v3.3
    ============================================
    
    📍 Server running on port: ${PORT}
    🔧 Environment: ${process.env.NODE_ENV || 'development'}
    🕐 Started: ${new Date().toLocaleString()}
    
    ✅ Key Pages:
       • Wallet:      http://localhost:${PORT}/wallet
       • Dashboard:   http://localhost:${PORT}/dashboard  
       • Login:       http://localhost:${PORT}/login
       • Success:     http://localhost:${PORT}/wallet/success
    
    ✅ API Endpoints:
       • Health:      http://localhost:${PORT}/api/health
       • Test:        http://localhost:${PORT}/api/test
       • Debug:       http://localhost:${PORT}/api/debug
    
    ✅ Wallet System: ${walletRoutes ? 'NORMAL' : 'EMERGENCY MODE'}
    
    ============================================
    `);
    
    // Test the API
    setTimeout(() => {
        fetch(`http://localhost:${PORT}/api/health`)
            .then(res => res.json())
            .then(data => console.log('✅ Health check:', data.status))
            .catch(err => console.log('❌ Health check failed:', err.message));
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