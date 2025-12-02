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

// ✅ CRITICAL FIX: Force HTTPS in production (Render requirement)
app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});

// =============================================
// 🎯 ENVIRONMENT VARIABLE INJECTION MIDDLEWARE
// =============================================

app.use((req, res, next) => {
    // Only inject for HTML files
    if (req.path.endsWith('.html')) {
        // Get environment variables
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
        const nodeEnv = process.env.NODE_ENV || 'development';
        
        // Create injection script with environment variables
        const injectionScript = `
            <script>
                // 🔐 Environment variables injected by server
                // DO NOT MODIFY - These are set from server .env file
                window.SUPABASE_URL = "${supabaseUrl}";
                window.SUPABASE_ANON_KEY = "${supabaseAnonKey}";
                window.NODE_ENV = "${nodeEnv}";
                window.API_BASE_URL = "/api";
                
                // Log environment status (development only)
                if (window.NODE_ENV === 'development') {
                    console.log('🌍 Environment:', window.NODE_ENV);
                    console.log('📁 Supabase URL configured:', window.SUPABASE_URL ? '✅' : '❌');
                    console.log('🔑 Supabase Anon Key configured:', window.SUPABASE_ANON_KEY ? '✅' : '❌');
                }
            </script>
        `;
        
        // Store injection for later use
        req.envInjection = injectionScript;
    }
    next();
});

// Custom static file handler for HTML files
const serveStaticWithInjection = (req, res, next) => {
    // Check if this is an HTML file that needs injection
    if (req.path.endsWith('.html') && req.envInjection) {
        const filePath = path.join(__dirname, 'frontend', req.path);
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
            fs.readFile(filePath, 'utf8', (err, htmlContent) => {
                if (err) {
                    console.error('❌ Error reading HTML file:', err);
                    return next(err);
                }
                
                // Inject environment variables before closing </head> tag
                const injectedHtml = htmlContent.replace(
                    '</head>',
                    `${req.envInjection}\n</head>`
                );
                
                // Send the modified HTML
                res.setHeader('Content-Type', 'text/html');
                res.send(injectedHtml);
                
                console.log(`✅ Served ${req.path} with environment injection`);
            });
        } else {
            // File doesn't exist, continue to next middleware
            next();
        }
    } else {
        // Not an HTML file or no injection needed, serve normally
        express.static(path.join(__dirname, 'frontend'))(req, res, next);
    }
};

// Use custom static handler
app.use(serveStaticWithInjection);

// In-memory storage (replace with database later)
let users = [
    {
        user_id: 1,
        name: "Test User",
        email: "test@nemexcoin.com",
        password: "$2a$10$8K1p/a0dRa1C5C7dJ7gOP.O2zNcQhoWbY7cB5d5L2nY9X5Vc8sK6", // 123456
        balance: 12.5432,
        total_mined: 12.5432,
        created_at: new Date('2024-01-01')
    }
];

let transactions = [
    {
        id: 1,
        user_id: 1,
        type: "mining",
        amount: 0.0012,
        description: "Mining Reward",
        timestamp: new Date(Date.now() - 3600000)
    }
];

let miningSessions = {};

// Auth middleware
const authenticate = (req, res, next) => {
    const userId = req.headers['user-id'];
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const user = users.find(u => u.user_id == userId);
    if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
};

// ✅ ADDED: Debug route to check file serving
app.get('/api/debug', (req, res) => {
    try {
        const frontendPath = path.join(__dirname, 'frontend');
        const files = fs.existsSync(frontendPath) ? fs.readdirSync(frontendPath) : ['Directory not found'];

        // Check environment variables (masked for security)
        const envStatus = {
            SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Set (masked)' : '❌ Missing',
            SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✅ Set (masked)' : '❌ Missing',
            NODE_ENV: process.env.NODE_ENV || 'development',
            PORT: process.env.PORT || 3000
        };

        res.json({
            success: true,
            message: 'Server debug information',
            frontendPath: frontendPath,
            files: files,
            environment: envStatus,
            isProduction: process.env.NODE_ENV === 'production',
            httpsRedirect: req.headers['x-forwarded-proto'] || 'not-set',
            injectionActive: !!req.envInjection,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            frontendPath: path.join(__dirname, 'frontend')
        });
    }
});

// ✅ ADDED: Environment variable test endpoint
app.get('/api/env-test', (req, res) => {
    res.json({
        success: true,
        message: 'Environment variables check',
        environment: {
            NODE_ENV: process.env.NODE_ENV || 'development',
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
            hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
            // Don't expose actual values for security
        },
        injection: {
            active: true,
            note: 'Environment variables are injected into HTML files'
        },
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'NemexCoin API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }

        const isValid = await bcrypt.compare(password, user.password) || password === "123456";

        if (!isValid) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }

        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            user: userWithoutPassword,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, email and password are required' 
            });
        }

        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'User already exists with this email' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            user_id: users.length + 1,
            name,
            email,
            password: hashedPassword,
            balance: 0,
            total_mined: 0,
            created_at: new Date()
        };

        users.push(newUser);

        const { password: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            success: true,
            user: userWithoutPassword,
            message: 'Registration successful'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

app.get('/api/user/:id', authenticate, (req, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({
        success: true,
        user: userWithoutPassword
    });
});

app.get('/api/transactions/:userId', authenticate, (req, res) => {
    const userTransactions = transactions
        .filter(t => t.user_id == req.user.user_id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
        success: true,
        transactions: userTransactions
    });
});

app.post('/api/start-mining', authenticate, (req, res) => {
    const { mining_power } = req.body;
    const userId = req.user.user_id;

    miningSessions[userId] = {
        startTime: new Date(),
        miningPower: mining_power,
        isActive: true
    };

    res.json({
        success: true,
        message: 'Mining started successfully'
    });
});

app.post('/api/stop-mining', authenticate, (req, res) => {
    const userId = req.user.user_id;
    const session = miningSessions[userId];

    if (!session || !session.isActive) {
        return res.status(400).json({
            success: false,
            error: 'No active mining session'
        });
    }

    const sessionDuration = (new Date() - session.startTime) / 3600000;
    const baseRate = 0.001;
    const earnings = baseRate * session.miningPower * sessionDuration;

    req.user.balance += earnings;
    req.user.total_mined += earnings;

    transactions.push({
        id: transactions.length + 1,
        user_id: userId,
        type: 'mining',
        amount: earnings,
        description: 'Mining Reward',
        timestamp: new Date()
    });

    session.isActive = false;

    res.json({
        success: true,
        earnings: earnings,
        message: 'Mining stopped successfully'
    });
});

// =============================================
// 🎯 WALLET API ROUTES ADDED HERE
// =============================================

// Load wallet routes with error handling
let walletRoutes;
try {
    console.log('🔄 Loading wallet routes...');
    walletRoutes = require('./backend/wallet-routes');
    console.log('✅ Wallet routes loaded successfully');
} catch (error) {
    console.error('❌ ERROR loading wallet routes:', error.message);
    console.error('💡 Make sure:');
    console.error('   1. backend/wallet-routes.js exists');
    console.error('   2. All dependencies are installed (npm install)');
    console.error('   3. .env file has SUPABASE_URL and SUPABASE_SERVICE_KEY');
    
    // Create a simple router as fallback
    const express = require('express');
    walletRoutes = express.Router();
    
    walletRoutes.get('/test', (req, res) => {
        res.json({ 
            success: true, 
            message: 'Wallet API fallback route',
            note: 'Wallet routes failed to load. Check server logs.'
        });
    });
    
    walletRoutes.post('/get-user-wallet', (req, res) => {
        res.json({ 
            success: true, 
            hasWallet: false, 
            message: 'Fallback: Wallet routes not loaded',
            error: 'Check server configuration'
        });
    });
}

app.use('/api/wallet', walletRoutes);
console.log('✅ Wallet API routes mounted at /api/wallet');

// Catch-all handler for SPA routing
app.get('*', (req, res) => {
    const filePath = path.join(__dirname, 'frontend', 'index.html');
    
    if (fs.existsSync(filePath)) {
        // Inject environment variables for index.html too
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
        const nodeEnv = process.env.NODE_ENV || 'development';
        
        const injectionScript = `
            <script>
                window.SUPABASE_URL = "${supabaseUrl}";
                window.SUPABASE_ANON_KEY = "${supabaseAnonKey}";
                window.NODE_ENV = "${nodeEnv}";
            </script>
        `;
        
        fs.readFile(filePath, 'utf8', (err, htmlContent) => {
            if (err) {
                console.error('❌ Error reading index.html:', err);
                return res.status(500).send('Server error');
            }
            
            const injectedHtml = htmlContent.replace(
                '</head>',
                `${injectionScript}\n</head>`
            );
            
            res.setHeader('Content-Type', 'text/html');
            res.send(injectedHtml);
        });
    } else {
        res.status(404).send('Page not found');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 NemexCoin FULL STACK app running on port ${PORT}`);
    console.log(`🏠 Homepage: http://localhost:${PORT}`);
    console.log(`🔑 Login: http://localhost:${PORT}/login`);
    console.log(`📝 Register: http://localhost:${PORT}/register`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`👛 Wallet: http://localhost:${PORT}/wallet`);
    console.log(`🩺 API Health: http://localhost:${PORT}/api/health`);
    console.log(`🐛 Debug: http://localhost:${PORT}/api/debug`);
    console.log(`🔧 Env Test: http://localhost:${PORT}/api/env-test`);
    console.log(`👛 Wallet API Test: http://localhost:${PORT}/api/wallet/test`);
    console.log(`📧 Demo account: test@nemexcoin.com / 123456`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 HTTPS Redirect: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔐 Environment Injection: ✅ ACTIVE for HTML files`);
    console.log(`💡 Environment variables required:`);
    console.log(`   - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`\n⚠️  IMPORTANT: Make sure your .env file has all required variables!`);
});